import { pb } from '$lib/pocketbase';
import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { PUBLIC_ENV } from '$env/static/public';
import { createOrUpdateContact } from '$lib/utils/contacts';
import { normalizePhoneNumber } from '$lib/utils/phone';
import { logCommunication, type CommunicationLogEntry } from '$lib/utils/communication-log';
import { getAutoReplyMessage, getDefaultAutoReplySettings } from '$lib/utils/auto-reply';



export const POST: RequestHandler = async ({ request, fetch }) => {
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type'
  };

  // Handle preflight requests
  if (request.method === 'OPTIONS') {
    return new Response(null, {
      headers: corsHeaders
    });
  }

  try {
    const messageData = await request.json();
    let record; // Declare record variable

    if (!messageData.company_id) {
      return json(
        { success: false, error: 'Company ID is required' },
        {
          status: 400,
          headers: corsHeaders
        }
      );
    }

    // Create or update contact if we have contact info
    if (messageData.customer_name || messageData.customer_email || messageData.customer_phone) {
      try {
        await createOrUpdateContact({
          company_id: messageData.company_id,
          name: messageData.customer_name,
          email: messageData.customer_email,
          phone: messageData.customer_phone
        });
      } catch (err) {
        console.error('Error creating/updating contact:', err);
        // Continue with message creation even if contact creation fails
      }
    }

    // Verify company exists
    try {
      await pb.collection('companies').getOne(messageData.company_id);
    } catch (err) {
      // If company doesn't exist and we have a valid user ID, try to create a default company
      if (messageData.company_id && messageData.company_id.length > 0) {
        try {
          const user = await pb.collection('users').getOne(messageData.company_id);
          const companyData = {
            name: `${user.name}'s Company`,
            owner: user.id,
            team_members: [user.id],
            settings: JSON.stringify({
              branding: {
                primary_color: '#3B5BDB',
                logo_url: ''
              },
              notifications: {
                email: true,
                web: true
              },
              autoReply: {
                textAutoReply: false,
                businessHoursMessage: 'Hello, thank you for messaging us. Our team will respond shortly.',
                afterHoursMessage: 'Hello, we are not available at the moment, but we will get in touch with you by {date}.',
                leadformBusinessHoursMessage: 'Hello, thank you for submitting the form. Our team will respond shortly.',
                leadformAfterHoursMessage: 'Hello, we are not available at the moment, but we will get in touch with you by {date}.',
                businessHours: {
                  sunday: { isOpen: false, hours: null },
                  monday: { isOpen: true, hours: '8:00 AM - 6:00 PM' },
                  tuesday: { isOpen: true, hours: '8:00 AM - 6:00 PM' },
                  wednesday: { isOpen: true, hours: '8:00 AM - 6:00 PM' },
                  thursday: { isOpen: true, hours: '8:00 AM - 6:00 PM' },
                  friday: { isOpen: true, hours: '8:00 AM - 6:00 PM' },
                  saturday: { isOpen: false, hours: null }
                }
              }
            })
          };

          const company = await pb.collection('companies').create(companyData);
          messageData.company_id = company.id;
        } catch (userErr) {
          return json(
            { success: false, error: 'Invalid company or user ID' },
            {
              status: 400,
              headers: corsHeaders
            }
          );
        }
      } else {
        return json(
          { success: false, error: 'Invalid company ID' },
          {
            status: 400,
            headers: corsHeaders
          }
        );
      }
    }

    // Normalize phone number if available
    if (messageData.customer_phone) {
      const normalizedPhone = normalizePhoneNumber(messageData.customer_phone);

      // Update both the thread_id and customer_phone for consistency
      if (normalizedPhone) {
        messageData.customer_phone = normalizedPhone;

        // If no thread_id is provided, use the phone number
        if (!messageData.thread_id) {
          messageData.thread_id = normalizedPhone;
        }
      }
    }

    // Create the message in PocketBase
    // Try to find existing thread by thread_id or customer_phone
    let existingThread = null;

    try {
      if (messageData.thread_id) {
        existingThread = await pb.collection('messages').getFirstListItem(`thread_id="${messageData.thread_id}"`).catch(() => null);
      }

      // If not found by thread_id and we have a phone number, try to find by phone
      if (!existingThread && messageData.customer_phone) {
        existingThread = await pb.collection('messages').getFirstListItem(`customer_phone="${messageData.customer_phone}"`).catch(() => null);

        // If found by phone, update the thread_id to match the phone for future consistency
        if (existingThread && !existingThread.thread_id.includes(messageData.customer_phone)) {
          await pb.collection('messages').update(existingThread.id, {
            thread_id: messageData.customer_phone
          });
          existingThread.thread_id = messageData.customer_phone;
        }
      }
    } catch (error) {
      console.error('Error finding existing thread:', error);
    }

    if (existingThread) {
      // Append to existing thread
      const updatedMessages = [...existingThread.messages, {
        content: messageData.message,
        timestamp: new Date().toISOString(),
        is_agent_reply: messageData.is_agent_reply || false,
        agent_id: messageData.is_agent_reply ? messageData.user_id : undefined,
        agent_name: messageData.is_agent_reply ? messageData.customer_name : undefined
      }];

      record = await pb.collection('messages').update(existingThread.id, {
        messages: updatedMessages,
        status: messageData.status,
        assigned_to: messageData.assigned_to,
        urgency: messageData.urgency // Add urgency
      });
    } else {
      // Create new thread
      // If we have a phone number, use it as the thread_id
      if (messageData.customer_phone && !messageData.thread_id) {
        messageData.thread_id = messageData.customer_phone;
      }

      record = await pb.collection('messages').create({
        ...messageData,
        messages: [{
          content: messageData.message,
          timestamp: new Date().toISOString(),
          is_agent_reply: messageData.is_agent_reply || false,
          agent_id: messageData.is_agent_reply ? messageData.user_id : undefined,
          agent_name: messageData.is_agent_reply ? messageData.customer_name : undefined
        }]
      });
    }

    // Log the communication
    // Determine type based on source
    let commType: 'email' | 'sms' | 'voice' | 'web' | 'facebook' | 'chatbot' | 'leadform' | 'leadbox' = 'web';
    if (messageData.source === 'leadform') {
      commType = 'leadform';
    } else if (messageData.source === 'leadbox') {
      commType = 'leadbox';
    } else if (messageData.source === 'sms') {
      commType = 'sms';
    } else if (messageData.source === 'email') {
      commType = 'email';
    } else if (messageData.source === 'voice') {
      commType = 'voice';
    } else if (messageData.source === 'facebook') {
      commType = 'facebook';
    } else if (messageData.source === 'chatbot') {
      commType = 'chatbot';
    }

    const logEntry: CommunicationLogEntry = {
      type: commType,
      direction: 'inbound', // Assuming mostly inbound here, or derive from is_agent_reply
      status: 'success',
      source: messageData.customer_email || messageData.customer_phone || 'Web',
      destination: 'Inbox',
      company_id: messageData.company_id,
      customer_id: record.customer_id || undefined, // Link to contact if created/updated
      summary: messageData.message.substring(0, 50) + '...',
      content: messageData.message,
      metadata: {
        thread_id: record.thread_id,
        urgency: messageData.urgency
      }
    };

    // If it is an agent reply, direction is outbound
    if (messageData.is_agent_reply) {
      logEntry.direction = 'outbound';
      logEntry.user_id = messageData.user_id;
    }

    await logCommunication(logEntry);

    // Check and send auto-reply if phone number exists
    if (messageData.customer_phone) {
      try {
        const TWILIO_ENABLED = process.env.TWILIO_ENABLED;
        console.log('Checking auto-reply...');
        console.log('PUBLIC_ENV:', PUBLIC_ENV);
        console.log('TWILIO_ENABLED:', TWILIO_ENABLED);
        console.log('Customer phone:', messageData.customer_phone);
        
        const company = await pb.collection('companies').getOne(messageData.company_id);
        console.log('Company settings:', company.settings);

        const autoReplySettings = typeof company.settings === 'string'
          ? JSON.parse(company.settings)?.autoReply || getDefaultAutoReplySettings()
          : company.settings?.autoReply || getDefaultAutoReplySettings();

        console.log('Auto reply settings:', JSON.stringify(autoReplySettings, null, 2));

        if (autoReplySettings) {
          const message = getAutoReplyMessage(
            messageData.source,
            autoReplySettings,
            new Date().getHours()
          );

          console.log('Auto reply message generated:', message);

          if (message) {
            // In development, always output to console
            if (PUBLIC_ENV === 'development') {
              console.log('\n========================================');
              console.log('📱 AUTO-REPLY (DEVELOPMENT MODE)');
              console.log('========================================');
              console.log('To:', messageData.customer_phone);
              console.log('Source:', messageData.source);
              console.log('Message:', message);
              console.log('========================================\n');
            } else {
              // Production: Try Twilio first, then fall back to Telnyx
              let sent = false;
              
              // Try Twilio if enabled
              if (TWILIO_ENABLED === 'true') {
                try {
                  console.log('Attempting to send auto-reply via Twilio to:', messageData.customer_phone);
                  const twilioResponse = await fetch('/api/twilio', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                      message,
                      phoneNumber: messageData.customer_phone,
                      threadId: messageData.thread_id
                    })
                  });

                  const twilioResult = await twilioResponse.json();
                  console.log('Twilio API response:', twilioResult);

                  if (twilioResult.success) {
                    console.log('✅ Auto-reply sent successfully via Twilio!');
                    sent = true;
                  } else {
                    console.error('Twilio API returned error:', twilioResult.error);
                    console.log('Falling back to Telnyx...');
                  }
                } catch (twilioError) {
                  console.error('Error sending via Twilio:', twilioError);
                  console.log('Falling back to Telnyx...');
                }
              }
              
              // Fall back to Telnyx if Twilio not enabled or failed
              if (!sent) {
                try {
                  const TELNYX_API_KEY = process.env.TELNYX_API_KEY;
                  if (TELNYX_API_KEY) {
                    console.log('Attempting to send auto-reply via Telnyx to:', messageData.customer_phone);
                    const telnyxResponse = await fetch('/api/telnyx', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({
                        message,
                        phoneNumber: messageData.customer_phone
                      })
                    });

                    const telnyxResult = await telnyxResponse.json();
                    console.log('Telnyx API response:', telnyxResult);

                    if (telnyxResult.success) {
                      console.log('✅ Auto-reply sent successfully via Telnyx!');
                      sent = true;
                    } else {
                      console.error('Telnyx API returned error:', telnyxResult.error);
                    }
                  } else {
                    console.log('TELNYX_API_KEY not configured - cannot send via Telnyx');
                  }
                } catch (telnyxError) {
                  console.error('Error sending via Telnyx:', telnyxError);
                }
              }
              
              if (!sent) {
                console.warn('⚠️ Auto-reply message generated but could not be sent via Twilio or Telnyx');
              }
            }
          } else {
            console.log('No auto-reply message generated (getAutoReplyMessage returned null)');
          }
        } else {
          console.log('No auto-reply settings found for company');
        }
      } catch (autoReplyError) {
        console.error('Error processing auto-reply:', autoReplyError);
        // Don't throw the error - just log it since auto-reply is not critical
      }
    } else {
      console.log('No customer_phone provided - skipping auto-reply check');
    }

    return json(
      { success: true, message: record },
      {
        headers: corsHeaders
      }
    );
  } catch (error) {
    console.error('Error creating message:', error);
    return json(
      { success: false, error: 'Failed to create message' },
      {
        status: 500,
        headers: corsHeaders
      }
    );
  }
};


// Add OPTIONS handler for CORS preflight
export const OPTIONS: RequestHandler = async () => {
  return new Response(null, {
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type'
    }
  });
};
