import { pb } from '$lib/pocketbase';

export type CommunicationType = 'email' | 'sms' | 'voice' | 'web' | 'facebook' | 'chatbot' | 'leadform' | 'leadbox';
export type CommunicationDirection = 'inbound' | 'outbound';
export type CommunicationStatus = 'success' | 'failed' | 'pending' | 'missed' | 'completed';

export interface CommunicationLogEntry {
    type: CommunicationType;
    direction: CommunicationDirection;
    status: CommunicationStatus;
    source?: string;
    destination?: string;
    customer_id?: string;
    company_id?: string;
    user_id?: string;
    summary?: string;
    content?: string;
    duration?: number;
    metadata?: Record<string, any>;
}

/**
 * Logs a communication event to the database.
 * @param entry The communication log entry details
 * @returns The created record or null if logging failed
 */
export async function logCommunication(entry: CommunicationLogEntry) {
    try {
        const record = await pb.collection('communication_logs').create(entry);
        return record;
    } catch (err) {
        console.error('Failed to log communication:', err);
        // We don't want to throw here to prevent disrupting the main flow
        return null;
    }
}
