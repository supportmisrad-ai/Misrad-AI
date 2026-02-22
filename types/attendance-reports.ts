export type DailySummaryEntry = {
  date: string;
  dayOfWeek: string;
  dayHebrew: string;
  startTime: string | null;
  endTime: string | null;
  totalMinutes: number;
  breakMinutes: number;
  netMinutes: number;
  regularMinutes: number;
  overtime125: number;
  overtime150: number;
  overtime175: number;
  overtime200: number;
  note: string | null;
  event: string | null;
};

export type MonthlyReportData = {
  id: string;
  year: number;
  month: number;
  employeeName: string;
  employeeNumber: string | null;
  department: string | null;
  standardDailyHours: number;
  totalPresenceDays: number;
  totalStandardDays: number;
  totalPresenceMinutes: number;
  totalStandardMinutes: number;
  totalBreakMinutes: number;
  paidBreakMinutes: number;
  totalPayableMinutes: number;
  regularMinutes: number;
  overtime100Minutes: number;
  overtime125Minutes: number;
  overtime150Minutes: number;
  overtime175Minutes: number;
  overtime200Minutes: number;
  absenceMinutes: number;
  dailyBreakdown: DailySummaryEntry[];
  events: Record<string, string> | null;
  pdfUrl: string | null;
  sentAt: string | null;
  createdAt: string | null;
};

export type SalaryConfig = {
  standardDailyHours: number;
  breakMinutesPerDay: number;
  paidBreakMinutes: number;
  overtimeThresholdMinutes: number;
};
