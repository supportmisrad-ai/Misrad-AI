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

export const runtime = 'nodejs';
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
            // Mark as notified
            await prisma.storageFile.update({
              where: { id: file.id },
              data: {
                deletionNotifiedAt: new Date(),
                deleteScheduledAt: new Date(
                  file.uploadedAt.getTime() + policy.retentionDays * 24 * 60 * 60 * 1000
                ),
              },
            });

            // TODO: Send email notification
            // await sendStorageDeletionNotification(file.organizationId, file);

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
  };

  console.log('[storage-cleanup] Completed:', summary);

  return apiSuccess(summary);
}

export const POST = cronGuard(POSTHandler);
