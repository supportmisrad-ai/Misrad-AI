/**
 * Push Notifications Helper
 * 
 * Handles browser push notifications for urgent leave requests
 */

export async function requestNotificationPermission(): Promise<boolean> {
    if (typeof window === 'undefined' || !('Notification' in window)) {
        return false;
    }

    if (Notification.permission === 'granted') {
        return true;
    }

    if (Notification.permission !== 'denied') {
        const permission = await Notification.requestPermission();
        return permission === 'granted';
    }

    return false;
}

export function showPushNotification(
    title: string,
    options: NotificationOptions = {}
): void {
    if (typeof window === 'undefined' || !('Notification' in window)) {
        return;
    }

    if (Notification.permission === 'granted') {
        const notification = new Notification(title, {
            icon: '/favicon.ico',
            badge: '/favicon.ico',
            tag: 'leave-request-urgent',
            requireInteraction: false,
            ...options
        });

        // Auto-close after 5 seconds
        setTimeout(() => {
            notification.close();
        }, 5000);

        // Handle click - focus window
        notification.onclick = () => {
            if (typeof window !== 'undefined') {
                window.focus();
            }
            notification.close();
        };
    }
}

export function showUrgentLeaveRequestNotification(
    employeeName: string,
    leaveType: string,
    startDate: string,
    endDate: string
): void {
    const leaveTypeLabels: Record<string, string> = {
        'vacation': 'חופשה',
        'sick': 'מחלה',
        'personal': 'יום אישי',
        'unpaid': 'חופשה ללא תשלום',
        'other': 'אחר'
    };
    const leaveTypeLabel = leaveTypeLabels[leaveType] || leaveType;

    showPushNotification('בקשת חופש דחופה!', {
        body: `${employeeName} - ${leaveTypeLabel} (${startDate} עד ${endDate})`,
        icon: '/favicon.ico',
        badge: '/favicon.ico',
        tag: `leave-request-urgent-${Date.now()}`,
        requireInteraction: true,
        vibrate: [200, 100, 200]
    });
}
