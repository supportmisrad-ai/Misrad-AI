/**
 * Audit Logging System
 * 
 * Tracks all sensitive operations for security and compliance
 */

import { getAuthenticatedUser } from './auth';

export type AuditAction = 
    | 'user.login'
    | 'user.logout'
    | 'user.create'
    | 'user.update'
    | 'user.delete'
    | 'data.read'
    | 'data.write'
    | 'data.delete'
    | 'permission.check'
    | 'ai.query'
    | 'client.access'
    | 'financial.access'
    | 'security.unauthorized'
    | 'role.create'
    | 'role.update'
    | 'role.delete';

export interface AuditLog {
    id: string;
    userId: string;
    userEmail: string;
    action: AuditAction;
    resourceType: string;
    resourceId?: string;
    details?: Record<string, any>;
    ipAddress?: string;
    userAgent?: string;
    timestamp: string;
    success: boolean;
    error?: string;
}

/**
 * Log an audit event
 * In production, this should write to a secure database
 */
export async function logAuditEvent(
    action: AuditAction,
    resourceType: string,
    options: {
        resourceId?: string;
        details?: Record<string, any>;
        success?: boolean;
        error?: string;
    } = {}
): Promise<void> {
    try {
        let user;
        try {
            user = await getAuthenticatedUser();
        } catch (authError) {
            // If user is not authenticated, use system user
            user = {
                id: 'system',
                email: 'support@misrad-ai.com',
                firstName: 'System',
                lastName: '',
                imageUrl: '',
                role: 'system',
                isSuperAdmin: false
            };
        }
        
        const headers = await import('next/headers').then(m => m.headers()).catch(() => null);
        
        const auditLog: AuditLog = {
            id: `audit-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            userId: user.id,
            userEmail: user.email || 'unknown',
            action,
            resourceType,
            resourceId: options.resourceId,
            details: options.details,
            ipAddress: headers?.get('x-forwarded-for') || headers?.get('x-real-ip') || 'unknown',
            userAgent: headers?.get('user-agent') || 'unknown',
            timestamp: new Date().toISOString(),
            success: options.success !== false,
            error: options.error
        };
        
        // In production, save to database
        // For development, log to console
        if (process.env.NODE_ENV === 'production') {
            // TODO: Save to database when audit table is ready
            // await db.auditLogs.create({ data: auditLog });
        } else {
            console.log('[AUDIT]', JSON.stringify(auditLog, null, 2));
        }
        
    } catch (error) {
        // Don't throw - audit failures shouldn't break the app
        console.error('Failed to log audit event:', error);
    }
}

/**
 * Check if user accessed sensitive data
 */
export async function logSensitiveAccess(
    resourceType: 'financial' | 'user' | 'client',
    resourceId: string,
    dataAccessed: string[]
): Promise<void> {
    await logAuditEvent(
        'data.read' as AuditAction,
        resourceType,
        {
            resourceId,
            details: {
                sensitiveFields: dataAccessed,
                warning: 'Sensitive data accessed'
            }
        }
    );
}

/**
 * Log audit event for external integrations (no authenticated user)
 * Used for webhooks, API integrations, etc.
 */
export async function logIntegrationEvent(
    action: AuditAction,
    resourceType: string,
    options: {
        resourceId?: string;
        details?: Record<string, any>;
        success?: boolean;
        error?: string;
        ipAddress?: string;
        userAgent?: string;
    } = {}
): Promise<void> {
    try {
        const headers = await import('next/headers').then(m => m.headers()).catch(() => null);
        
        const auditLog: AuditLog = {
            id: `audit-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            userId: 'integration',
            userEmail: 'support@misrad-ai.com',
            action,
            resourceType,
            resourceId: options.resourceId,
            details: options.details,
            ipAddress: options.ipAddress || headers?.get('x-forwarded-for') || headers?.get('x-real-ip') || 'unknown',
            userAgent: options.userAgent || headers?.get('user-agent') || 'unknown',
            timestamp: new Date().toISOString(),
            success: options.success !== false,
            error: options.error
        };
        
        // In production, save to database
        // For development, log to console
        if (process.env.NODE_ENV === 'production') {
            // TODO: Save to database when audit table is ready
            // await db.auditLogs.create({ data: auditLog });
        } else {
            console.log('[AUDIT]', JSON.stringify(auditLog, null, 2));
        }
        
    } catch (error) {
        // Don't throw - audit failures shouldn't break the app
        console.error('Failed to log integration event:', error);
    }
}

