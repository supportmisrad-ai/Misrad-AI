import { NextRequest, NextResponse } from 'next/server';
import { apiError, apiSuccess } from '@/lib/server/api-response';
import { createServiceRoleStorageClient } from '@/lib/supabase';
import prisma from '@/lib/prisma';
import {
  getRetentionPolicy,
  shouldDeleteFile,
  shouldNotifyBeforeDelete,
} from '@/lib/storage/retention-policy';
import { cronGuard } from '@/lib/api-cron-guard';
import { sendStorageDeletionNotification } from '@/lib/email/storage-deletion-notification';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 300; // 5 minutes

interface ScanResult {
  bucket: string;
  totalFiles: number;
  filesToDelete: number;
  filesToNotify: number;
  deletedFiles: number;
  notifiedFiles: number;
  errors: number;
}

/**
 * Cron Job: Storage Cleanup
 * 
 * רצף:
 * 1. סורק את כל ה-buckets ב-Supabase Storage
 * 2. מזהה קבצים שצריך למחוק לפי retention policy
 * 3. שולח התראות למשתמשים לפני מחיקה (30-60 יום לפני)
 * 4. מוחק קבצים שחלף המועד + רושם ללוג
 * 
 * הרצה: יומי ב-02:00 (Vercel Cron)
 */
async function POSTHandler(req: NextRequest) {
  const supabase = createServiceRoleStorageClient({ reason: 'cron_storage_cleanup', allowUnscoped: true });

  const results: ScanResult[] = [];
  const buckets = ['media', 'call-recordings', 'meeting-recordings', 'operations-files', 'attachments'];
  
  // Track files to notify per organization
  const notificationsByOrg = new Map<string, Array<{
    fileName: string;
    bucket: string;
    path: string;
    uploadedAt: Date;
    sizeBytes: bigint;
    deleteScheduledAt: Date;
  }>>();

  for (const bucket of buckets) {
    const policy = getRetentionPolicy(bucket);
    if (!policy || policy.retentionDays === -1) {
      // Skip buckets with infinite retention
      continue;
    }

    const result: ScanResult = {
      bucket,
      totalFiles: 0,
      filesToDelete: 0,
      filesToNotify: 0,
      deletedFiles: 0,
      notifiedFiles: 0,
      errors: 0,
    };

    try {
      // Get all tracked files in this bucket
      const trackedFiles = await prisma.storageFile.findMany({
        where: { bucket },
        select: {
          id: true,
          organizationId: true,
          path: true,
          fileName: true,
          sizeBytes: true,
          uploadedAt: true,
          deletionNotifiedAt: true,
          deleteScheduledAt: true,
          isProtected: true,
        },
      });

      result.totalFiles = trackedFiles.length;

      for (const file of trackedFiles) {
        // Skip protected files
        if (file.isProtected) continue;

        const shouldDelete = shouldDeleteFile(file.uploadedAt, bucket);
        const shouldNotify = shouldNotifyBeforeDelete(file.uploadedAt, bucket);

        if (shouldDelete && !file.deleteScheduledAt) {
          result.filesToDelete++;

          try {
            // Delete from Supabase Storage
            const { error: deleteError } = await supabase.storage.from(bucket).remove([file.path]);

            if (deleteError) {
              console.error(`[storage-cleanup] Failed to delete ${bucket}/${file.path}:`, deleteError);
              result.errors++;
              continue;
            }

            // Log deletion
            await prisma.storageDeletionLog.create({
              data: {
                organizationId: file.organizationId,
                bucket,
                path: file.path,
                fileName: file.fileName,
                sizeBytes: file.sizeBytes,
                deletedBy: 'system',
                reason: 'retention_policy',
              },
            });

            // Remove from tracking
            await prisma.storageFile.delete({
              where: { id: file.id },
            });

            result.deletedFiles++;
          } catch (err) {
            console.error(`[storage-cleanup] Error deleting ${bucket}/${file.path}:`, err);
            result.errors++;
          }
        } else if (shouldNotify && !file.deletionNotifiedAt) {
          result.filesToNotify++;

          try {
            const deleteScheduledAt = new Date(
              file.uploadedAt.getTime() + policy.retentionDays * 24 * 60 * 60 * 1000
            );

            // Mark as notified in DB
            await prisma.storageFile.update({
              where: { id: file.id },
              data: {
                deletionNotifiedAt: new Date(),
                deleteScheduledAt,
              },
            });

            // Group files by organization for batch email sending
            if (!notificationsByOrg.has(file.organizationId)) {
              notificationsByOrg.set(file.organizationId, []);
            }
            notificationsByOrg.get(file.organizationId)!.push({
              fileName: file.fileName,
              bucket,
              path: file.path,
              uploadedAt: file.uploadedAt,
              sizeBytes: file.sizeBytes,
              deleteScheduledAt,
            });

            result.notifiedFiles++;
          } catch (err) {
            console.error(`[storage-cleanup] Error notifying ${bucket}/${file.path}:`, err);
            result.errors++;
          }
        }
      }
    } catch (err) {
      console.error(`[storage-cleanup] Error processing bucket ${bucket}:`, err);
      result.errors++;
    }

    results.push(result);
  }

  // Send batched email notifications
  let emailsSent = 0;
  let emailsFailed = 0;

  for (const [organizationId, files] of notificationsByOrg.entries()) {
    try {
      // Fetch organization details
      const org = await prisma.organization.findUnique({
        where: { id: organizationId },
        select: {
          name: true,
          slug: true,
          owner: {
            select: {
              email: true,
            },
          },
        },
      });

      if (!org || !org.owner?.email) {
        console.warn(`[storage-cleanup] No owner email for org ${organizationId}`);
        emailsFailed++;
        continue;
      }

      const result = await sendStorageDeletionNotification({
        organizationId,
        organizationName: org.name,
        ownerEmail: org.owner.email,
        files,
      });

      if (result.success) {
        emailsSent++;
      } else {
        emailsFailed++;
      }
    } catch (err) {
      console.error(`[storage-cleanup] Failed to send email for org ${organizationId}:`, err);
      emailsFailed++;
    }
  }

  const summary = {
    timestamp: new Date().toISOString(),
    totalBuckets: buckets.length,
    results,
    totals: {
      scanned: results.reduce((sum, r) => sum + r.totalFiles, 0),
      deleted: results.reduce((sum, r) => sum + r.deletedFiles, 0),
      notified: results.reduce((sum, r) => sum + r.notifiedFiles, 0),
      errors: results.reduce((sum, r) => sum + r.errors, 0),
    },
    emails: {
      sent: emailsSent,
      failed: emailsFailed,
      totalOrgs: notificationsByOrg.size,
    },
  };

  console.log('[storage-cleanup] Completed:', summary);

  return apiSuccess(summary);
}

export const POST = cronGuard(POSTHandler);
