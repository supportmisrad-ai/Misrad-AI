/**
 * MISRAD AI — Email HTML Generators
 * All NEW email types that don't exist in email.ts yet.
 * Each function returns raw HTML string via generateBaseEmailTemplate.
 *
 * Naming: generate{EmailTypeId}EmailHTML
 */

import { render } from '@react-email/render';
import { WelcomeEmail } from '@/components/emails/WelcomeEmail';
import { PaymentSuccessEmail } from '@/components/emails/PaymentSuccessEmail';
import { InvoiceCreatedEmail } from '@/components/emails/InvoiceCreatedEmail';
import { PaymentFailedEmail } from '@/components/emails/PaymentFailedEmail';
import { PlanChangedEmail } from '@/components/emails/PlanChangedEmail';
import { TrialExpiredEmail } from '@/components/emails/TrialExpiredEmail';
import { TrialExpiredEmailExtended } from '@/components/emails/TrialExpiredEmailExtended';
import { TrialExpiryWarningEmail } from '@/components/emails/TrialExpiryWarningEmail';
import { SubscriptionCancelledEmail } from '@/components/emails/SubscriptionCancelledEmail';
import { OrgClosedEmail } from '@/components/emails/OrgClosedEmail';
import { TeamMemberRemovedEmail } from '@/components/emails/TeamMemberRemovedEmail';
import { TeamRoleChangedEmail } from '@/components/emails/TeamRoleChangedEmail';
import { TeamMemberJoinedEmail } from '@/components/emails/TeamMemberJoinedEmail';
import { SecurityNewDeviceEmail } from '@/components/emails/SecurityNewDeviceEmail';
import { PasswordChangedEmail } from '@/components/emails/PasswordChangedEmail';
import { WeeklyReportEmail } from '@/components/emails/WeeklyReportEmail';
import { AiCreditsLowEmail } from '@/components/emails/AiCreditsLowEmail';
import { MaintenanceEmail } from '@/components/emails/MaintenanceEmail';
import { VersionUpdateEmail } from '@/components/emails/VersionUpdateEmail';
import { TicketResolvedEmail } from '@/components/emails/TicketResolvedEmail';
import { SatisfactionSurveyEmail } from '@/components/emails/SatisfactionSurveyEmail';
import { NewsletterEmail } from '@/components/emails/NewsletterEmail';
import { WebinarInviteEmail } from '@/components/emails/WebinarInviteEmail';
import { NewFeatureEmail } from '@/components/emails/NewFeatureEmail';
import { ReengagementEmail } from '@/components/emails/ReengagementEmail';
import { AiMonthlyReportEmail } from '@/components/emails/AiMonthlyReportEmail';
import { AdminOrgCreatedEmail } from '@/components/emails/AdminOrgCreatedEmail';
import { AdminOrgClosedEmail } from '@/components/emails/AdminOrgClosedEmail';
import { ContactFormReceivedEmail } from '@/components/emails/ContactFormReceivedEmail';
import { ContactFormAdminNotificationEmail } from '@/components/emails/ContactFormAdminNotificationEmail';
import { InvitationEmail } from '@/components/emails/InvitationEmail';
import { EmployeeInvitationEmail } from '@/components/emails/EmployeeInvitationEmail';
import { getEmailAssets } from './email-assets';
import * as React from 'react';

// ══════════════════════════════════════════════════════════════════════
// NEW REACT EMAIL GENERATORS
// ══════════════════════════════════════════════════════════════════════

export async function generateWelcomeEmailHTML(params: {
    ownerName: string;
    organizationName: string;
    portalUrl: string;
}) {
    return await render(React.createElement(WelcomeEmail, params));
}

export async function generatePaymentSuccessEmailHTML(params: {
    ownerName?: string | null;
    organizationName: string;
    amount: number;
    currency?: string;
    invoiceNumber?: string;
    invoiceUrl?: string;
    portalUrl: string;
}) {
    return await render(React.createElement(PaymentSuccessEmail, params));
}

export async function generateInvoiceCreatedEmailHTML(params: {
    ownerName?: string | null;
    organizationName: string;
    amount: number;
    currency?: string;
    invoiceNumber: string;
    pdfUrl?: string;
    invoiceUrl?: string;
    paymentUrl?: string;
    portalUrl: string;
    description?: string;
    dueDate?: string;
}) {
    return await render(React.createElement(InvoiceCreatedEmail, params));
}

export async function generatePaymentFailedEmailHTML(params: {
    ownerName?: string | null;
    organizationName: string;
    amount: number;
    reason?: string;
    retryUrl: string;
}) {
    return await render(React.createElement(PaymentFailedEmail, params));
}

export async function generatePlanChangedEmailHTML(params: {
    ownerName?: string | null;
    organizationName: string;
    oldPlan: string;
    newPlan: string;
    newPrice: number;
    effectiveDate: string;
    portalUrl: string;
}) {
    return await render(React.createElement(PlanChangedEmail, params));
}

export async function generateTrialExpiredEmailHTML(params: {
    ownerName?: string | null;
    organizationName: string;
    checkoutUrl?: string;
    portalUrl?: string;
}) {
    if (params.portalUrl) {
        return await render(React.createElement(TrialExpiredEmailExtended, {
            organizationName: params.organizationName,
            ownerName: params.ownerName,
            portalUrl: params.portalUrl,
        }));
    }
    return await render(React.createElement(TrialExpiredEmail, {
        ownerName: params.ownerName,
        organizationName: params.organizationName,
        checkoutUrl: params.checkoutUrl || '',
    }));
}

export async function generateTrialExpiryWarningEmailHTML(params: {
    organizationName: string;
    ownerName?: string | null;
    daysRemaining: number;
    portalUrl: string;
}) {
    return await render(React.createElement(TrialExpiryWarningEmail, params));
}

export async function generateSubscriptionCancelledEmailHTML(params: {
    ownerName?: string | null;
    organizationName: string;
    accessEndDate: string;
    reactivateUrl: string;
}) {
    return await render(React.createElement(SubscriptionCancelledEmail, params));
}

export async function generateOrgClosedEmailHTML(params: {
    ownerName?: string | null;
    organizationName: string;
    dataRetentionDays: number;
    reactivateUrl: string;
}) {
    return await render(React.createElement(OrgClosedEmail, params));
}

export async function generateTeamMemberRemovedEmailHTML(params: {
    memberName?: string | null;
    organizationName: string;
    removedByName?: string | null;
}) {
    return await render(React.createElement(TeamMemberRemovedEmail, params));
}

export async function generateTeamRoleChangedEmailHTML(params: {
    memberName?: string | null;
    organizationName: string;
    oldRole: string;
    newRole: string;
    changedByName?: string | null;
    portalUrl: string;
}) {
    return await render(React.createElement(TeamRoleChangedEmail, params));
}

export async function generateTeamMemberJoinedEmailHTML(params: {
    ownerName?: string | null;
    memberName: string;
    memberEmail: string;
    role: string;
    organizationName: string;
    portalUrl: string;
}) {
    return await render(React.createElement(TeamMemberJoinedEmail, params));
}

export async function generateSecurityNewDeviceEmailHTML(params: {
    userName?: string | null;
    device: string;
    location: string;
    time: string;
    ip: string;
    securityUrl: string;
}) {
    return await render(React.createElement(SecurityNewDeviceEmail, params));
}

export async function generatePasswordChangedEmailHTML(params: {
    userName?: string | null;
    time: string;
    securityUrl: string;
}) {
    return await render(React.createElement(PasswordChangedEmail, params));
}

export async function generateWeeklyReportEmailHTML(params: {
    ownerName?: string | null;
    organizationName: string;
    weekRange: string;
    stats: {
        activeUsers: number;
        newClients: number;
        tasksCompleted: number;
        aiCreditsUsed: number;
        aiCreditsTotal: number;
    };
    portalUrl: string;
    chartImageUrl?: string;
    topAchievement?: string;
}) {
    return await render(React.createElement(WeeklyReportEmail, params));
}

export async function generateAiCreditsLowEmailHTML(params: {
    ownerName?: string | null;
    organizationName: string;
    usedPercent: number;
    upgradeUrl: string;
}) {
    return await render(React.createElement(AiCreditsLowEmail, params));
}

export async function generateMaintenanceEmailHTML(params: {
    startTime: string;
    endTime: string;
    description: string;
    affectedServices: string[];
}) {
    return await render(React.createElement(MaintenanceEmail, params));
}

export async function generateVersionUpdateEmailHTML(params: {
    version: string;
    highlights: Array<{ title: string; desc: string }>;
    changelogUrl: string;
    heroImageUrl?: string;
}) {
    return await render(React.createElement(VersionUpdateEmail, params));
}

export async function generateTicketResolvedEmailHTML(params: {
    name?: string | null;
    ticketNumber: string;
    subject: string;
    orgSlug: string;
}) {
    return await render(React.createElement(TicketResolvedEmail, params));
}

export async function generateSatisfactionSurveyEmailHTML(params: {
    name?: string | null;
    ticketNumber: string;
    surveyUrl: string;
}) {
    return await render(React.createElement(SatisfactionSurveyEmail, params));
}

export async function generateNewsletterEmailHTML(params: {
    title: string;
    preheader: string;
    bannerImageUrl?: string;
    sections: Array<{
        heading: string;
        body: string;
        imageUrl?: string;
        ctaText?: string;
        ctaUrl?: string;
    }>;
    testimonial?: {
        quote: string;
        authorName: string;
        authorTitle?: string;
        authorPhotoUrl?: string;
    };
}) {
    return await render(React.createElement(NewsletterEmail, params));
}

export async function generateWebinarInviteEmailHTML(params: {
    title: string;
    date: string;
    time: string;
    speaker: string;
    speakerPhotoUrl?: string;
    description: string;
    bannerImageUrl?: string;
    registerUrl: string;
}) {
    return await render(React.createElement(WebinarInviteEmail, params));
}

export async function generateNewFeatureEmailHTML(params: {
    featureName: string;
    description: string;
    screenshotUrl?: string;
    learnMoreUrl: string;
    highlights?: Array<{ title: string; desc?: string }>;
}) {
    return await render(React.createElement(NewFeatureEmail, params));
}

export async function generateReengagementEmailHTML(params: {
    userName?: string | null;
    daysSinceLastLogin: number;
    portalUrl: string;
    newFeatures?: string[];
}) {
    const assets = getEmailAssets();
    return await render(React.createElement(ReengagementEmail, {
        ...params,
        reengagementHeroUrl: assets.reengagementHero,
        welcomeDashboardScreenshotUrl: assets.welcomeDashboardScreenshot,
    }));
}

export async function generateAiMonthlyReportReadyEmailHTML(params: {
    adminName?: string | null;
    organizationName: string;
    periodLabel: string;
    score: number;
    summary: string;
    insightCount: number;
    recommendationCount: number;
    reportUrl: string;
}) {
    return await render(React.createElement(AiMonthlyReportEmail, params));
}

export async function generateAdminOrgCreatedEmailHTML(params: {
    organizationName: string;
    ownerEmail: string;
    ownerName?: string | null;
    plan: string;
    adminUrl: string;
}) {
    return await render(React.createElement(AdminOrgCreatedEmail, params));
}

export async function generateAdminOrgClosedEmailHTML(params: {
    organizationName: string;
    ownerEmail: string;
    ownerName?: string | null;
    adminUrl: string;
}) {
    return await render(React.createElement(AdminOrgClosedEmail, params));
}

export async function generateContactFormReceivedEmailHTML(params: {
    name: string;
    message: string;
}) {
    return await render(React.createElement(ContactFormReceivedEmail, params));
}

export async function generateContactFormAdminNotificationHTML(params: {
    name: string;
    email: string;
    message: string;
}) {
    return await render(React.createElement(ContactFormAdminNotificationEmail, params));
}

export async function generateInvitationEmailHTML(params: {
    tenantName: string;
    ownerName: string | null;
    signupUrl: string;
    subdomain?: string;
}) {
    return await render(React.createElement(InvitationEmail, params));
}

export async function generateEmployeeInvitationEmailHTML(params: {
    employeeName: string | null;
    employeeEmail: string;
    department: string;
    role: string;
    invitationUrl: string;
    createdByName?: string | null;
}) {
    return await render(React.createElement(EmployeeInvitationEmail, params));
}
