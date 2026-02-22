import { listMonthlyReports } from '@/app/actions/attendance-reports';
import AttendanceReportsClient from './AttendanceReportsClient';

export default async function AttendanceReportsPage({
  params,
}: {
  params: Promise<{ orgSlug: string }> | { orgSlug: string };
}) {
  const { orgSlug } = await params;

  const now = new Date();
  const year = now.getMonth() === 0 ? now.getFullYear() - 1 : now.getFullYear();
  const month = now.getMonth() === 0 ? 12 : now.getMonth();

  let initialReports: Awaited<ReturnType<typeof listMonthlyReports>> = [];
  try {
    initialReports = await listMonthlyReports(orgSlug, { year, month });
  } catch (e) {
    console.error('[AttendanceReportsPage] listMonthlyReports failed:', e);
  }

  return (
    <AttendanceReportsClient
      orgSlug={orgSlug}
      initialReports={initialReports}
      initialYear={year}
      initialMonth={month}
    />
  );
}
