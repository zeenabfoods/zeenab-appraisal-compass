
import { DashboardLayout } from '@/components/DashboardLayout';
import { AppraisalCycleManager } from '@/components/AppraisalCycleManager';

export default function AppraisalCycles() {
  return (
    <DashboardLayout pageTitle="Appraisal Cycles">
      <AppraisalCycleManager />
    </DashboardLayout>
  );
}
