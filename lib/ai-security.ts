import { asObject } from '@/lib/shared/unknown';
/**
 * AI Security & Data Filtering
 * 
 * Ensures sensitive data is never sent to AI services
 */

import { PermissionId } from '../types';
import { hasPermission, filterSensitiveData } from './auth';
import { logAuditEvent } from './audit';


// Fields that should NEVER be sent to AI
const SENSITIVE_FIELDS = [
    'hourlyRate',
    'monthlySalary',
    'commissionPct',
    'accumulatedBonus',
    'billingInfo',
    'email',
    'phone',
    'password',
    'creditCard',
    'ssn',
    'idNumber'
];

/**
 * Sanitize data before sending to AI
 */
export function sanitizeForAI<T extends Record<string, unknown>>(data: T): Partial<T> {
    const sanitized: Record<string, unknown> = {};
    
    for (const [key, value] of Object.entries(data)) {
        // Skip sensitive fields
        if (SENSITIVE_FIELDS.includes(key)) {
            continue;
        }
        
        // Recursively sanitize nested objects
        if (value && typeof value === 'object' && !Array.isArray(value) && !(value instanceof Date)) {
            sanitized[key] = sanitizeForAI(value as Record<string, unknown>);
        } else if (Array.isArray(value)) {
            sanitized[key] = value.map(item => 
                item && typeof item === 'object' && !Array.isArray(item) && !(item instanceof Date)
                    ? sanitizeForAI(item as Record<string, unknown>)
                    : item
            );
        } else {
            sanitized[key] = value;
        }
    }
    
    return sanitized as Partial<T>;
}

/**
 * Prepare safe context for AI based on user permissions
 */
export async function prepareAIContext(
    userRole: string,
    isManager: boolean,
    rawData: {
        users?: unknown[];
        tasks?: unknown[];
        clients?: unknown[];
        assets?: unknown[];
        financials?: unknown;
    }
): Promise<Record<string, unknown>> {
    // Log AI access
    await logAuditEvent('ai.query', 'intelligence', {
        details: {
            userRole,
            isManager,
            dataTypes: Object.keys(rawData)
        }
    });
    
    const context: Record<string, unknown> = {
        userRole,
        isManager,
        currentDate: new Date().toLocaleDateString('he-IL'),
    };
    
    // Fetch and filter users data from secure API
    // Note: In production, this should fetch from the secure users data source
    // For now, we'll use rawData.users if provided, but filter it
    if (rawData.users && rawData.users.length > 0) {
        const canViewFinancials = await hasPermission('view_financials');
        context.team = rawData.users.map((user) => {
            const userObj = asObject(user) ?? {};
            const safeUser: Record<string, unknown> = {
                id: userObj.id,
                name: userObj.name,
                role: userObj.role,
                capacity: userObj.capacity,
            };
            
            // Only include financial data if user has permission
            if (canViewFinancials) {
                safeUser.targets = userObj.targets;
            } else {
                // Remove all sensitive fields
                const sanitized = sanitizeForAI(userObj);
                Object.assign(safeUser, sanitized);
            }
            
            return safeUser;
        });
    } else if (isManager) {
        // If manager but no users in rawData, we'd fetch from API in production
        // For now, leave empty - will be handled by API route
        context.team = [];
    }
    
    // Filter tasks - only include what user can see
    if (rawData.tasks) {
        const canViewCrm = await hasPermission('view_crm');
        if (canViewCrm) {
            context.tasksStructure = rawData.tasks.slice(0, 50).map((task) => {
                const taskObj = asObject(task) ?? {};
                const assigneeIdsValue = taskObj.assigneeIds;
                const assigneeIds = Array.isArray(assigneeIdsValue) ? assigneeIdsValue : [];
                return {
                title: taskObj.title,
                status: taskObj.status,
                priority: taskObj.priority,
                // Don't include assignee details unless manager
                assignee: isManager ? assigneeIds[0] : 'Hidden'
                };
            });
        }
    }
    
    // Filter clients - only if has CRM permission
    if (rawData.clients) {
        const canViewCrm = await hasPermission('view_crm');
        if (canViewCrm) {
            context.clients = rawData.clients.map((client) => {
                const clientObj = asObject(client) ?? {};
                return {
                name: clientObj.companyName,
                status: clientObj.status,
                // Don't include contact details
                };
            });
        } else {
            context.clients = [];
        }
    }
    
    // Filter assets - sanitize URLs
    if (rawData.assets) {
        context.assets = rawData.assets.map((asset) => {
            const assetObj = asObject(asset) ?? {};
            return {
            title: assetObj.title,
            type: assetObj.type,
            tags: assetObj.tags,
            // Don't include actual URLs or credentials
            };
        });
    }
    
    // Financial data - only if manager
    if (rawData.financials && isManager) {
        const canViewFinancials = await hasPermission('view_financials');
        if (canViewFinancials) {
            const financialsObj = asObject(rawData.financials) ?? {};
            context.financials = {
                // Only include aggregated data, not individual salaries
                totalRevenue: financialsObj.totalRevenue,
                target: financialsObj.target,
                // Don't include individual employee salaries
            };
        }
    }
    
    // Final sanitization pass
    return sanitizeForAI(context);
}

/**
 * Validate AI response doesn't contain sensitive data.
 * Uses phrase-level patterns to avoid false positives on legitimate words
 * like "conversion rate", "bonus points", "credit score", etc.
 */
export function validateAIResponse(response: unknown): boolean {
    const responseStr = JSON.stringify(response).toLowerCase();
    
    const sensitivePatterns = [
        'monthly_salary',
        'monthlysalary',
        'hourly_rate',
        'hourlyrate',
        'commission_pct',
        'commissionpct',
        'accumulated_bonus',
        'accumulatedbonus',
        'credit_card',
        'creditcard',
        'card_number',
        'cardnumber',
        'social_security',
        'socialsecurity',
        'id_number',
        'idnumber',
        'bank_account',
        'bankaccount',
    ];
    
    for (const pattern of sensitivePatterns) {
        if (responseStr.includes(pattern)) {
            console.warn(`[AI SECURITY] Potential sensitive data in AI response: ${pattern}`);
            return false;
        }
    }
    
    return true;
}

