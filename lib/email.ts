/**
 * MISRAD AI — Email System (barrel re-export)
 *
 * All email logic has been split into domain-specific sub-modules under lib/emails/:
 *   - core.ts, support.ts, invitations.ts, onboarding.ts,
 *     trial.ts, contact.ts, admin-notifications.ts, follow-ups.ts
 */

export {
    sendSupportTicketReceivedEmail,
    sendSupportTicketReplyEmail,
    sendSupportTicketAdminNotificationEmail,
} from './emails/support';

export {
    sendTenantInvitationEmail,
    sendEmployeeInvitationEmail,
} from './emails/invitations';

export {
    sendFirstCustomerEmail,
    sendAbandonedSignupFollowupEmail,
    sendOrganizationWelcomeEmail,
    sendMisradWelcomeEmail,
} from './emails/onboarding';

export {
    sendTrialExpiryWarningEmail,
    sendTrialExpiredEmail,
} from './emails/trial';

export {
    sendContactFormReceivedEmail,
    sendContactFormAdminNotification,
} from './emails/contact';

export {
    sendAdminNewSignupNotification,
    sendAdminPaymentReceivedNotification,
} from './emails/admin-notifications';

export {
    sendDay2CheckinEmail,
    sendDay7CheckinEmail,
    sendDay45FeedbackEmail,
} from './emails/follow-ups';

export {
    sendNewLeadNotificationEmail,
} from './emails/leads';

export {
    sendBookingReminderEmail,
} from './emails/booking-reminders';
