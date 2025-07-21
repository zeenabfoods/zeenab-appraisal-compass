
import { DashboardLayout } from '@/components/DashboardLayout';
import { EmployeeCard } from '@/components/EmployeeCard';

export default function Employees() {
  return (
    <DashboardLayout pageTitle="Employees">
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Employee Management</h1>
          <p className="text-gray-600">Manage your team members and their information</p>
        </div>
        <EmployeeCard />
      </div>
    </DashboardLayout>
  );
}
