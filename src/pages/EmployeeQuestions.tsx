
import { DashboardLayout } from '@/components/DashboardLayout';
import { EmployeeQuestionManager } from '@/components/EmployeeQuestionManager';

export default function EmployeeQuestions() {
  return (
    <DashboardLayout pageTitle="Employee Questions">
      <EmployeeQuestionManager />
    </DashboardLayout>
  );
}
