import { pb } from '$lib/pocketbase';
import { redirect, error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { normalizePhoneNumber } from '$lib/utils/phone';

export const load: PageServerLoad = async ({ params, locals }) => {
    const user = locals.user;

    if (!user) {
        throw redirect(303, '/login');
    }

    try {
        // Fetch profile (contact) by ID
        const profile = await pb.collection('contacts').getOne(params.id, {
            filter: `company = "${user.company}"`
        });

        // Normalize phone number for matching - extract just digits for comparison
        const profilePhoneDigits = profile.phone ? profile.phone.replace(/\D/g, '') : '';
        const normalizedPhone = profile.phone ? normalizePhoneNumber(profile.phone) : '';
        
        // Fetch communications by customer_id first
        let communications = await pb.collection('communication_logs').getList(1, 200, {
            filter: `customer_id = "${params.id}" && company_id = "${user.company}"`,
            sort: '-created',
            expand: 'customer_id'
        });

        // If no communications found by customer_id and we have a phone, fetch all and filter by phone
        if (communications.items.length === 0 && profilePhoneDigits) {
            // Fetch all communications for the company
            const allComms = await pb.collection('communication_logs').getList(1, 500, {
                filter: `company_id = "${user.company}"`,
                sort: '-created',
                expand: 'customer_id'
            });

            // Filter by phone number match in source or destination
            communications.items = allComms.items.filter((log: any) => {
                if (!log.source && !log.destination) return false;
                
                // Extract digits from source and destination
                const sourceDigits = log.source ? log.source.replace(/\D/g, '') : '';
                const destDigits = log.destination ? log.destination.replace(/\D/g, '') : '';
                
                if (!sourceDigits && !destDigits) return false;
                
                // Get last 10 digits for US numbers (handles country code variations)
                const profileLast10 = profilePhoneDigits.slice(-10);
                const sourceLast10 = sourceDigits.slice(-10);
                const destLast10 = destDigits.slice(-10);
                
                // Match if:
                // 1. Exact digit match
                // 2. Last 10 digits match (handles +1 vs no +1, etc.)
                // 3. For shorter numbers, check if they're contained (but be careful with this)
                const exactMatch = sourceDigits === profilePhoneDigits || destDigits === profilePhoneDigits;
                const last10Match = (sourceLast10 && sourceLast10 === profileLast10) || 
                                   (destLast10 && destLast10 === profileLast10);
                
                // For numbers that are at least 7 digits, check if last 7 match (handles area code variations)
                const profileLast7 = profilePhoneDigits.slice(-7);
                const sourceLast7 = sourceDigits.slice(-7);
                const destLast7 = destDigits.slice(-7);
                const last7Match = profileLast7.length >= 7 && 
                                 ((sourceLast7 && sourceLast7 === profileLast7) || 
                                  (destLast7 && destLast7 === profileLast7));
                
                return exactMatch || last10Match || last7Match;
            });
        }

        // Transform communications to match UI format
        const comms = communications.items.map((log: any) => {
            const dateObj = new Date(log.created);
            const date = dateObj.toLocaleDateString('en-US', {
                month: 'short',
                day: '2-digit',
                year: 'numeric'
            });
            const time = dateObj.toLocaleTimeString('en-US', { 
                hour: 'numeric', 
                minute: '2-digit',
                hour12: true 
            });

            // Map status colors
            let status: "red" | "green" | "blue" = "blue";
            if (log.status === 'success' || log.status === 'completed') {
                status = log.direction === 'inbound' ? 'green' : 'blue';
            } else if (log.status === 'failed' || log.status === 'missed') {
                status = 'red';
            }

            return {
                id: log.id,
                date,
                time,
                type: log.type as "email" | "sms" | "voice" | "web" | "facebook" | "chatbot" | "leadform",
                direction: log.direction === 'inbound' ? 'In' : 'Out' as "In" | "Out",
                source: log.source || 'Unknown',
                endpoint: log.destination || log.expand?.customer_id?.name || 'Unknown',
                purpose: log.metadata?.urgency || log.metadata?.purpose || null,
                summary: log.summary || log.content?.substring(0, 50) || null,
                commId: log.id,
                status
            };
        });

        return {
            profile,
            communications: comms
        };
    } catch (err: any) {
        if (err.status === 404) {
            throw error(404, 'Profile not found');
        }
        console.error('Error fetching profile:', err);
        throw error(500, 'Failed to fetch profile');
    }
};
