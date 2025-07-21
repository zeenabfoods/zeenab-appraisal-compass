
import { DashboardLayout } from '@/components/DashboardLayout';
import { AppraisalForm } from '@/components/AppraisalForm';
import { useParams } from 'react-router-dom';

export default function EmployeeAppraisal() {
  const { appraisalId } = useParams<{ appraisalId: string }>();

  if (!appraisalId) {
    return (
      <DashboardLayout pageTitle="Appraisal">
        <div className="flex items-center justify-center h-64">
          <p className="text-gray-600">Appraisal ID not provided</p>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout pageTitle="Employee Appraisal">
      <AppraisalForm appraisalId={appraisalId} />
    </DashboardLayout>
  );
}
