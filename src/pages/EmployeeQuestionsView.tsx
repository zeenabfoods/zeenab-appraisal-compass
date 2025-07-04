
import { DashboardLayout } from '@/components/DashboardLayout';
import { EmployeeAssignedQuestions } from '@/components/EmployeeAssignedQuestions';

export default function EmployeeQuestionsView() {
  return (
    <DashboardLayout>
      <EmployeeAssignedQuestions />
    </DashboardLayout>
  );
}
