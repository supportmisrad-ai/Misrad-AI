/**
 * Prisma Connection Lifecycle Manager
 *
 * שורש הבעיה: ב-serverless (Vercel), כל request יכול ליצור isolate חדש
 * עם PrismaClient חדש. ללא ניהול חיבורים, מגיעים ל-max connections במהירות.
 *
 * פתרון:
 * 1. Singleton עם globalThis (כבר קיים)
 * 2. Connection pool monitoring
 * 3. Explicit cleanup on process signals
 * 4. Health checks ל-connection exhaustion
 * 5. Auto-disconnect ב-development HMR
 */

import { PrismaClient } from '@prisma/client';

interface ConnectionStats {
  totalCreates: number;
  activeConnections: number;
  lastDisconnectAt: Date | null;
  errors: Array<{ message: string; timestamp: Date }>;
}

declare global {
  var __MISRAD_CONNECTION_STATS__: ConnectionStats | undefined;
}

function getStats(): ConnectionStats {
  if (!globalThis.__MISRAD_CONNECTION_STATS__) {
    globalThis.__MISRAD_CONNECTION_STATS__ = {
      totalCreates: 0,
      activeConnections: 0,
      lastDisconnectAt: null,
      errors: [],
    };
  }
  return globalThis.__MISRAD_CONNECTION_STATS__;
}

export function trackPrismaClientCreated(): void {
  const stats = getStats();
  stats.totalCreates++;
  stats.activeConnections++;

  // Log warning if too many clients created (indicates singleton failure)
  if (stats.totalCreates > 50 && stats.totalCreates % 10 === 0) {
    console.warn(
      `[Prisma] WARNING: ${stats.totalCreates} PrismaClient instances created. ` +
      `This indicates singleton pattern failure or memory leak.`
    );
  }
}

export function trackPrismaClientDisposed(): void {
  const stats = getStats();
  stats.activeConnections = Math.max(0, stats.activeConnections - 1);
  stats.lastDisconnectAt = new Date();
}

export function trackPrismaError(error: Error): void {
  const stats = getStats();
  stats.errors.push({
    message: error.message,
    timestamp: new Date(),
  });

  // Keep only last 20 errors
  if (stats.errors.length > 20) {
    stats.errors.shift();
  }
}

export function getConnectionHealth(): {
  status: 'healthy' | 'warning' | 'critical';
  stats: ConnectionStats;
  recommendation?: string;
} {
  const stats = getStats();

  // Critical: Too many total creates indicates leak
  if (stats.totalCreates > 100) {
    return {
      status: 'critical',
      stats,
      recommendation: 'PrismaClient leak detected. Check for non-singleton imports or HMR issues.',
    };
  }

  // Warning: Multiple active connections
  if (stats.activeConnections > 3) {
    return {
      status: 'warning',
      stats,
      recommendation: `${stats.activeConnections} active connections. Consider reducing connection_limit.`,
    };
  }

  // Check recent errors
  const recentErrors = stats.errors.filter(
    (e) => new Date().getTime() - e.timestamp.getTime() < 60000
  );
  if (recentErrors.length > 5) {
    return {
      status: 'critical',
      stats,
      recommendation: `${recentErrors.length} connection errors in last minute. Check database health.`,
    };
  }

  return { status: 'healthy', stats };
}

/**
 * Register process lifecycle hooks for graceful shutdown
 * Must be called once at app startup
 */
export function registerPrismaLifecycleHooks(prisma: PrismaClient): void {
  // Development: Handle HMR cleanup
  if (process.env.NODE_ENV === 'development') {
    const cleanup = () => {
      console.log('[Prisma] HMR cleanup - disconnecting...');
      prisma.$disconnect().catch(() => undefined);
    };

    // Next.js dev server signals
    process.on('SIGTERM', cleanup);
    process.on('SIGINT', cleanup);

    // Hot reload detection
    if ((module as unknown as { hot?: unknown }).hot) {
      (module as unknown as { hot?: { dispose?: (cb: () => void) => void } }).hot?.dispose?.(cleanup);
    }
  }

  // Production: Serverless function end
  if (process.env.NODE_ENV === 'production') {
    // Vercel sends SIGTERM before killing the container
    let isShuttingDown = false;

    const gracefulShutdown = async (signal: string) => {
      if (isShuttingDown) return;
      isShuttingDown = true;

      console.log(`[Prisma] Received ${signal}, disconnecting...`);

      try {
        await Promise.race([
          prisma.$disconnect(),
          new Promise((_, reject) =>
            setTimeout(() => reject(new Error('Disconnect timeout')), 5000)
          ),
        ]);
        console.log('[Prisma] Disconnected successfully');
      } catch (error) {
        console.error('[Prisma] Disconnect error:', error);
        // Force exit if needed
        process.exit(1);
      }
    };

    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
    process.on('SIGINT', () => gracefulShutdown('SIGINT'));

    // BeforeExit for non-SIGTERM environments
    process.on('beforeExit', () => gracefulShutdown('beforeExit'));
  }
}

/**
 * Emergency disconnect - use only in critical situations
 */
export async function emergencyDisconnect(prisma: PrismaClient): Promise<void> {
  console.warn('[Prisma] EMERGENCY DISCONNECT triggered');
  try {
    await prisma.$disconnect();
    trackPrismaClientDisposed();
  } catch {
    // Ignore errors in emergency
  }
}

/**
 * Check if connection limit is approaching and take action
 */
export function checkConnectionPressure(
  prisma: PrismaClient,
  maxConnections: number = 60
): { pressure: 'low' | 'medium' | 'high'; action?: string } {
  const health = getConnectionHealth();

  if (health.status === 'critical') {
    return {
      pressure: 'high',
      action: 'restart-required',
    };
  }

  if (health.stats.totalCreates > maxConnections * 0.8) {
    return {
      pressure: 'high',
      action: 'throttle-requests',
    };
  }

  if (health.stats.totalCreates > maxConnections * 0.6) {
    return {
      pressure: 'medium',
      action: 'monitor-closely',
    };
  }

  return { pressure: 'low' };
}
