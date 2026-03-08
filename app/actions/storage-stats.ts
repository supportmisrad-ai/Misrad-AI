'use server';

import { auth } from '@clerk/nextjs/server';
import prisma from '@/lib/prisma';
import { createServiceRoleStorageClient } from '@/lib/supabase';

export interface StorageStats {
  totalFiles: number;
  totalSizeBytes: bigint;
  totalSizeMB: string;
  filesToDelete: number;
  filesByBucket: Array<{
    bucket: string;
    count: number;
    sizeBytes: bigint;
    sizeMB: string;
  }>;
}

/**
 * קבלת סטטיסטיקות אחסון עבור ארגון
 */
export async function getStorageStats(organizationId: string): Promise<StorageStats> {
  const { userId } = await auth();
  if (!userId) throw new Error('Unauthorized');

  // Count all files
  const totalFiles = await prisma.storageFile.count({
    where: { organizationId },
  });

  // Get files scheduled for deletion
  const filesToDelete = await prisma.storageFile.count({
    where: {
      organizationId,
      deleteScheduledAt: {
        not: null,
      },
    },
  });

  // Aggregate by bucket
  const filesByBucket = await prisma.storageFile.groupBy({
    by: ['bucket'],
    where: { organizationId },
    _count: {
      id: true,
    },
    _sum: {
      sizeBytes: true,
    },
  });

  const totalSizeBytes = filesByBucket.reduce((sum, b) => sum + BigInt(b._sum.sizeBytes || 0), BigInt(0));

  return {
    totalFiles,
    totalSizeBytes,
    totalSizeMB: (Number(totalSizeBytes) / (1024 * 1024)).toFixed(2),
    filesToDelete,
    filesByBucket: filesByBucket.map(b => ({
      bucket: b.bucket,
      count: b._count.id,
      sizeBytes: BigInt(b._sum.sizeBytes || 0),
      sizeMB: (Number(b._sum.sizeBytes || 0) / (1024 * 1024)).toFixed(2),
    })),
  };
}
