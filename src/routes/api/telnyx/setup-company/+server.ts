import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { prisma } from '$lib/server/prisma';
import {
    setupCompanyPhoneNumbers,
    orderPhoneNumbers,
    ensureBillingGroup,
    listPhoneNumbersByBillingGroup
} from '$lib/server/telnyx';

/**
 * POST /api/telnyx/setup-company
 * 
 * Setup phone numbers for a company
 * 
 * Request body:
 * {
 *   companyId: string;
 *   phoneCount: number;
 *   country_iso?: string;  // Default: 'US'
 *   phone_number_type?: 'local' | 'toll_free' | 'national' | 'mobile';  // Default: 'local'
 *   area_code?: string;
 *   state?: string;
 * }
 */
export const POST: RequestHandler = async ({ request, locals }) => {
    try {
        // Ensure user is authenticated
        if (!locals.user) {
            throw error(401, 'Unauthorized');
        }

        const body = await request.json();
        const { companyId, phoneCount, country_iso, phone_number_type, area_code, state } = body;

        // Validate required fields
        if (!companyId || !phoneCount) {
            throw error(400, 'Missing required fields: companyId, phoneCount');
        }

        if (phoneCount < 1 || phoneCount > 100) {
            throw error(400, 'Phone count must be between 1 and 100');
        }

        // Get company from database
        const company = await prisma.company.findUnique({
            where: { id: companyId }
        });

        if (!company) {
            throw error(404, 'Company not found');
        }

        // Verify user has access to this company
        const hasAccess =
            company.ownerId === locals.user.id ||
            locals.user.companyId === companyId;

        if (!hasAccess) {
            throw error(403, 'You do not have access to this company');
        }

        // Ensure company has a name
        if (!company.name) {
            throw error(400, 'Company must have a name before ordering phone numbers');
        }

        // Setup phone numbers with Telnyx
        const result = await setupCompanyPhoneNumbers(
            company.name,
            company.id,
            phoneCount,
            {
                country_iso,
                phone_number_type,
                area_code,
                state
            }
        );

        // Return success response
        return json({
            success: true,
            billingGroup: {
                id: result.billingGroup.id,
                name: result.billingGroup.name
            },
            order: {
                id: result.order.id,
                status: result.order.status,
                orderingGroups: result.order.ordering_groups
            },
            message: `Successfully ordered ${phoneCount} phone number(s) for ${company.name}`
        });

    } catch (err) {
        console.error('Error setting up company phone numbers:', err);

        if (err instanceof Error) {
            throw error(500, err.message);
        }

        throw error(500, 'Failed to setup company phone numbers');
    }
};

/**
 * GET /api/telnyx/setup-company?companyId=xxx
 * 
 * Get billing group and phone numbers for a company
 */
export const GET: RequestHandler = async ({ url, locals }) => {
    try {
        // Ensure user is authenticated
        if (!locals.user) {
            throw error(401, 'Unauthorized');
        }

        const companyId = url.searchParams.get('companyId');

        if (!companyId) {
            throw error(400, 'Missing required parameter: companyId');
        }

        // Get company from database
        const company = await prisma.company.findUnique({
            where: { id: companyId }
        });

        if (!company) {
            throw error(404, 'Company not found');
        }

        // Verify user has access to this company
        const hasAccess =
            company.ownerId === locals.user.id ||
            locals.user.companyId === companyId;

        if (!hasAccess) {
            throw error(403, 'You do not have access to this company');
        }

        if (!company.name) {
            throw error(400, 'Company must have a name');
        }

        // Get or create billing group
        const billingGroup = await ensureBillingGroup(company.name, company.id);

        // Get phone numbers in billing group
        const phoneNumbers = await listPhoneNumbersByBillingGroup(billingGroup.id);

        return json({
            success: true,
            billingGroup: {
                id: billingGroup.id,
                name: billingGroup.name
            },
            phoneNumbers: phoneNumbers.map(pn => ({
                id: pn.id,
                phoneNumber: pn.phone_number,
                status: pn.status
            })),
            totalNumbers: phoneNumbers.length
        });

    } catch (err) {
        console.error('Error getting company billing info:', err);

        if (err instanceof Error) {
            throw error(500, err.message);
        }

        throw error(500, 'Failed to get company billing info');
    }
};
