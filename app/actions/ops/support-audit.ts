
import { prisma } from "@/lib/prisma";
import { auth } from "@clerk/nextjs/server";

export async function logSupportAccess(targetClientId: string, targetClientName: string, reason?: string) {
  try {
    const { userId, sessionClaims } = await auth();
    
    if (!userId) return { success: false, error: "Not authenticated" };

    // Get IP and User Agent from headers if possible (standard Next.js way)
    const { headers } = await import('next/headers');
    const headerList = await headers();
    const ip = headerList.get('x-forwarded-for') || headerList.get('x-real-ip');
    const ua = headerList.get('user-agent');

    await prisma.supportAccessLog.create({
      data: {
        adminUserId: userId,
        adminEmail: (sessionClaims?.email as string) || "unknown",
        targetClientId,
        targetClientName,
        reason: reason || "Support access via Admin Panel",
        ipAddress: ip,
        userAgent: ua,
      },
    });

    return { success: true };
  } catch (error) {
    console.error("Failed to log support access:", error);
    return { success: false, error: "Logging failed" };
  }
}
