
import { DashboardLayout } from '@/components/DashboardLayout';
import { EmployeeAssignedQuestions } from '@/components/EmployeeAssignedQuestions';
import { useParams } from 'react-router-dom';

export default function EmployeeQuestionsView() {
  const { employeeId } = useParams<{ employeeId: string }>();

  if (!employeeId) {
    return (
      <DashboardLayout pageTitle="Employee Questions">
        <div className="flex items-center justify-center h-64">
          <p className="text-gray-600">Employee ID not provided</p>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout pageTitle="Employee Questions">
      <EmployeeAssignedQuestions employeeId={employeeId} />
    </DashboardLayout>
  );
}
