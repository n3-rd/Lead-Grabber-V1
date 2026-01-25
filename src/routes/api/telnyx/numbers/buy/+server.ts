import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { TELNYX_API_KEY } from '$env/static/private';

export const POST: RequestHandler = async ({ request }) => {
  try {
    const { phone_numbers } = await request.json();

    if (!phone_numbers || !Array.isArray(phone_numbers) || phone_numbers.length === 0) {
      return json({
        success: false,
        error: 'phone_numbers array is required'
      }, { status: 400 });
    }

    // Create order for phone numbers
    const response = await fetch('https://api.telnyx.com/v2/phone_number_orders', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${TELNYX_API_KEY}`
      },
      body: JSON.stringify({
        phone_numbers: phone_numbers.map((num: string) => ({
          phone_number: num
        }))
      })
    });

    const data = await response.json();

    if (!response.ok) {
      console.error('Telnyx buy error:', data);
      return json({
        success: false,
        error: data.errors?.[0]?.detail || 'Failed to purchase numbers'
      }, { status: response.status });
    }

    return json({
      success: true,
      order: data.data,
      orderId: data.data?.id
    });

  } catch (error) {
    console.error('Error buying numbers:', error);
    return json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
};
