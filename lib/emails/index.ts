/**
 * MISRAD AI — Email System (barrel export)
 *
 * All email functions are split into domain-specific sub-modules:
 *   - core.ts              — shared utilities (Resend client, helpers)
 *   - support.ts           — support ticket emails
 *   - invitations.ts       — tenant + employee invitation emails
 *   - onboarding.ts        — welcome, first customer, abandoned signup
 *   - trial.ts             — trial expiry warning + expired
 *   - contact.ts           — contact form emails
 *   - admin-notifications.ts — admin signup + payment notifications
 *   - followup.ts          — day 2, day 7, day 45 follow-up emails
 */

export { sendSupportTicketReceivedEmail, sendSupportTicketReplyEmail, sendSupportTicketAdminNotificationEmail } from './support';
export { sendTenantInvitationEmail, sendEmployeeInvitationEmail } from './invitations';
export { sendFirstCustomerEmail, sendAbandonedSignupFollowupEmail, sendOrganizationWelcomeEmail, sendMisradWelcomeEmail } from './onboarding';
export { sendTrialExpiryWarningEmail, sendTrialExpiredEmail } from './trial';
export { sendContactFormReceivedEmail, sendContactFormAdminNotification } from './contact';
export { sendAdminNewSignupNotification, sendAdminPaymentReceivedNotification } from './admin-notifications';
export { sendDay2CheckinEmail, sendDay7CheckinEmail, sendDay45FeedbackEmail } from './follow-ups';
export { sendPartnerMonthlyReportEmail } from './partner-reports';
