import { Resend } from 'resend';
import { getRetentionPolicy } from '@/lib/storage/retention-policy';

const resend = new Resend(process.env.RESEND_API_KEY);

interface StorageDeletionNotificationData {
  organizationId: string;
  organizationName: string;
  ownerEmail: string;
  files: Array<{
    fileName: string;
    bucket: string;
    path: string;
    uploadedAt: Date;
    sizeBytes: bigint;
    deleteScheduledAt: Date;
  }>;
}

/**
 * שליחת התראה על מחיקה מתקרבת של קבצים
 * 
 * נשלח למנהלי הארגון כאשר קבצים מתקרבים למועד המחיקה האוטומטית,
 * כדי לאפשר להם להוריד ולגבות לפני שנמחק.
 */
export async function sendStorageDeletionNotification(data: StorageDeletionNotificationData) {
  const { organizationName, ownerEmail, files } = data;

  if (!files.length) return { success: true, skipped: true };

  // Group files by bucket
  const filesByBucket = files.reduce((acc, file) => {
    if (!acc[file.bucket]) acc[file.bucket] = [];
    acc[file.bucket].push(file);
    return acc;
  }, {} as Record<string, typeof files>);

  const bucketSummaries = Object.entries(filesByBucket).map(([bucket, bucketFiles]) => {
    const policy = getRetentionPolicy(bucket);
    const totalSize = bucketFiles.reduce((sum, f) => sum + Number(f.sizeBytes), 0);
    const totalSizeMB = (totalSize / (1024 * 1024)).toFixed(2);
    const deleteDate = bucketFiles[0]?.deleteScheduledAt;

    return `
      <div style="margin: 20px 0; padding: 20px; background: #f8fafc; border-radius: 12px; border-right: 4px solid #f59e0b;">
        <h3 style="margin: 0 0 10px 0; color: #1e293b; font-size: 16px; font-weight: 700;">
          ${bucket}
        </h3>
        <p style="margin: 5px 0; color: #64748b; font-size: 14px;">
          <strong>${bucketFiles.length}</strong> קבצים | 
          <strong>${totalSizeMB} MB</strong> | 
          מועד מחיקה: <strong style="color: #dc2626;">${deleteDate?.toLocaleDateString('he-IL')}</strong>
        </p>
        ${policy ? `<p style="margin: 10px 0 0 0; color: #475569; font-size: 13px;">${policy.description}</p>` : ''}
        <ul style="margin: 10px 0 0 0; padding-right: 20px; color: #64748b; font-size: 13px;">
          ${bucketFiles.slice(0, 5).map(f => `
            <li style="margin: 3px 0;">${f.fileName}</li>
          `).join('')}
          ${bucketFiles.length > 5 ? `<li style="color: #94a3b8;">ועוד ${bucketFiles.length - 5} קבצים...</li>` : ''}
        </ul>
      </div>
    `;
  }).join('');

  const htmlContent = `
    <!DOCTYPE html>
    <html dir="rtl" lang="he">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>התראה על מחיקת קבצים</title>
    </head>
    <body style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background: #ffffff; padding: 0; margin: 0;">
      <div style="max-width: 600px; margin: 40px auto; background: white; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
        
        <!-- Header -->
        <div style="background: linear-gradient(135deg, #6366f1 0%, #4f46e5 100%); padding: 30px; text-align: center;">
          <h1 style="margin: 0; color: white; font-size: 24px; font-weight: 800;">
            ⚠️ התראה על מחיקת קבצים
          </h1>
          <p style="margin: 10px 0 0 0; color: #e0e7ff; font-size: 14px;">
            קבצים מתקרבים למועד המחיקה האוטומטית
          </p>
        </div>

        <!-- Content -->
        <div style="padding: 30px;">
          <p style="margin: 0 0 20px 0; color: #1e293b; font-size: 15px; line-height: 1.6;">
            שלום לצוות <strong>${organizationName}</strong>,
          </p>
          
          <p style="margin: 0 0 20px 0; color: #475569; font-size: 14px; line-height: 1.6;">
            במסגרת מדיניות שמירת הקבצים של MISRAD AI, הקבצים הבאים עומדים להימחק בקרוב:
          </p>

          ${bucketSummaries}

          <!-- Action Required Box -->
          <div style="margin: 30px 0; padding: 20px; background: #fef3c7; border-radius: 12px; border: 2px solid #fbbf24;">
            <h3 style="margin: 0 0 10px 0; color: #92400e; font-size: 16px; font-weight: 700;">
              📥 פעולה נדרשת
            </h3>
            <p style="margin: 0; color: #78350f; font-size: 14px; line-height: 1.6;">
              <strong>הורידו וגבו את הקבצים החשובים לפני המועד.</strong><br>
              לאחר המחיקה, לא יהיה ניתן לשחזר את הקבצים.
            </p>
          </div>

          <!-- CTA Button -->
          <div style="text-align: center; margin: 30px 0;">
            <a href="${process.env.NEXT_PUBLIC_APP_URL}/w/${data.organizationId}/settings/storage" 
               style="display: inline-block; padding: 14px 32px; background: #4f46e5; color: white; text-decoration: none; border-radius: 8px; font-weight: 700; font-size: 15px;">
              צפייה בניהול אחסון →
            </a>
          </div>

          <!-- Info Box -->
          <div style="margin: 30px 0 0 0; padding: 15px; background: #f1f5f9; border-radius: 8px;">
            <p style="margin: 0; color: #475569; font-size: 13px; line-height: 1.5;">
              <strong style="color: #1e293b;">למה קבצים נמחקים?</strong><br>
              מדיניות השמירה נקבעה לפי תקנות הגנת הפרטיות ותקני אבטחת מידע. 
              לפרטים מלאים, ראו את <a href="${process.env.NEXT_PUBLIC_APP_URL}/terms" style="color: #4f46e5; text-decoration: underline;">תנאי השימוש</a>.
            </p>
          </div>
        </div>

        <!-- Footer -->
        <div style="background: #f8fafc; padding: 20px 30px; border-top: 1px solid #e2e8f0; text-align: center;">
          <p style="margin: 0; color: #94a3b8; font-size: 12px;">
            הודעה זו נשלחה אוטומטית ממערכת MISRAD AI<br>
            support@misrad-ai.com | misrad-ai.com
          </p>
        </div>

      </div>
    </body>
    </html>
  `;

  try {
    const { data: emailData, error } = await resend.emails.send({
      from: 'MISRAD AI <notifications@misrad-ai.com>',
      to: [ownerEmail],
      subject: `⚠️ התראה: ${files.length} קבצים עומדים להימחק`,
      html: htmlContent,
    });

    if (error) {
      console.error('[storage-deletion-notification] Failed to send email:', error);
      return { success: false, error };
    }

    return { success: true, emailId: emailData?.id };
  } catch (err) {
    console.error('[storage-deletion-notification] Exception:', err);
    return { success: false, error: err };
  }
}
