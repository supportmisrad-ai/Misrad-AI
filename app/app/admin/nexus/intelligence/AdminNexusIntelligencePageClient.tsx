'use client';

import React from 'react';
import { BrainCircuit } from 'lucide-react';
import { useData } from '@/context/DataContext';
import { IntelligencePanel } from '@/components/saas/IntelligencePanel';
import { ReportDetailModal } from '@/components/saas/ReportDetailModal';
import type { GeneratedReport } from '@/types';
import AdminPageHeader from '@/components/admin/AdminPageHeader';

export default function AdminNexusIntelligencePageClient() {
  const { systemReports, feedbacks, markReportRead, addToast } = useData();
  const [selectedReport, setSelectedReport] = React.useState<GeneratedReport | null>(null);

  const handleDownloadReport = (report: GeneratedReport) => {
    try {
      if (typeof document === 'undefined') return;
      const element = document.createElement('a');
      const file = new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' });
      element.href = URL.createObjectURL(file);
      element.download = `Nexus_Report_${report.period}_${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(element);
      element.click();
      element.remove();
      URL.revokeObjectURL(element.href);
      addToast?.('הדוח ירד למחשב', 'success');
    } catch (error) {
      console.error('[Admin Nexus Intelligence] Error downloading report:', error);
      addToast?.('שגיאה בהורדת הדוח', 'error');
    }
  };

  const handleViewReport = (report: GeneratedReport) => {
    markReportRead?.(report.id);
    setSelectedReport(report);
  };

  const handleGenerateManualReport = (period: 'Quarterly' | 'Annual') => {
    addToast?.(`מפיק דוח ${period === 'Quarterly' ? 'רבעוני' : 'שנתי'}... (סימולציה)`, 'info');
  };

  return (
    <>
      <div className="space-y-6 pb-24" dir="rtl">
        <AdminPageHeader title="בינה" subtitle="בינה עסקית ודוחות" icon={BrainCircuit} />
        <IntelligencePanel
          systemReports={(systemReports || []) as any}
          feedbacks={(feedbacks || []) as any}
          onViewReport={handleViewReport}
          onGenerateReport={handleGenerateManualReport}
          hideHeader
        />
      </div>

      {selectedReport ? (
        <ReportDetailModal report={selectedReport as any} onClose={() => setSelectedReport(null)} onDownload={handleDownloadReport} />
      ) : null}
    </>
  );
}
