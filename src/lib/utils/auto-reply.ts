export interface BusinessHoursDay {
    isOpen: boolean;
    hours: string | null;
}

export type BusinessHoursConfig = Record<string, BusinessHoursDay>;

export interface AutoReplySettings {
    textAutoReply: boolean;
    businessHoursMessage: string;
    afterHoursMessage: string;
    leadformBusinessHoursMessage: string;
    leadformAfterHoursMessage: string;
    businessHours: BusinessHoursConfig;
}

export function isBusinessHours(currentHour: number, businessHours: BusinessHoursConfig) {
    // Get current day name in lowercase
    const day = new Date().toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase();
    const daySettings = businessHours?.[day];

    // If the day is marked as closed (not open or no hours), return false
    if (!daySettings?.isOpen || !daySettings.hours) {
        return {
            isOpen: false,
            isClosed: true  // Explicitly indicate it's a closed day
        };
    }

    const [start, end] = daySettings.hours.split(' - ').map(time => {
        const [hour, period] = time.split(' ');
        const [h] = hour.split(':');
        return period === 'PM' ? (parseInt(h) % 12) + 12 : parseInt(h);
    });

    return {
        isOpen: currentHour >= start && currentHour < end,
        isClosed: false
    };
}

export function getAutoReplyMessage(
    source: string,
    autoReplySettings: AutoReplySettings,
    currentHour: number
): string | null {
    if (!autoReplySettings?.textAutoReply || !autoReplySettings?.businessHours) {
        return null;
    }

    try {
        const hours = isBusinessHours(currentHour, autoReplySettings.businessHours);
        const day = new Date().toLocaleDateString('en-US', { weekday: 'long' });

        if (source === 'leadform') {
            if (hours.isClosed) {
                return `${autoReplySettings.leadformAfterHoursMessage} We are closed on ${day}s.`;
            }
            return hours.isOpen
                ? autoReplySettings.leadformBusinessHoursMessage
                : autoReplySettings.leadformAfterHoursMessage;
        }

        if (hours.isClosed) {
            return `${autoReplySettings.afterHoursMessage} We are closed on ${day}s.`;
        }
        return hours.isOpen
            ? autoReplySettings.businessHoursMessage
            : autoReplySettings.afterHoursMessage;
    } catch (error) {
        console.error('Error in getAutoReplyMessage:', error);
        return null;
    }
}

export function getDefaultAutoReplySettings(): AutoReplySettings {
    return {
        textAutoReply: false,
        businessHoursMessage: 'Thanks for contacting us. Our team will respond shortly.',
        afterHoursMessage: 'Thanks for contacting us. We are currently closed but will respond during business hours.',
        leadformBusinessHoursMessage: 'Thanks for submitting the form. Our team will respond shortly.',
        leadformAfterHoursMessage: 'Thanks for submitting the form. We are currently closed but will respond during business hours.',
        businessHours: {
            sunday: { isOpen: false, hours: null },
            monday: { isOpen: true, hours: '8:00 AM - 6:00 PM' },
            tuesday: { isOpen: true, hours: '8:00 AM - 6:00 PM' },
            wednesday: { isOpen: true, hours: '8:00 AM - 6:00 PM' },
            thursday: { isOpen: true, hours: '8:00 AM - 6:00 PM' },
            friday: { isOpen: true, hours: '8:00 AM - 6:00 PM' },
            saturday: { isOpen: false, hours: null }
        }
    };
}
