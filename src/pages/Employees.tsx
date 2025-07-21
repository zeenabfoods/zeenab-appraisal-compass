
import { DashboardLayout } from '@/components/DashboardLayout';
import EmployeeCard from '@/components/EmployeeCard';
import { useEmployees } from '@/hooks/useEmployees';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';

export default function Employees() {
  const { data: employees, isLoading, error, refetch } = useEmployees();

  const handleEmployeeUpdate = () => {
    console.log('Employee updated, refetching data...');
    refetch();
  };

  if (isLoading) {
    return (
      <DashboardLayout pageTitle="Employees">
        <div className="space-y-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Employee Management</h1>
            <p className="text-gray-600">Manage your team members and their information</p>
          </div>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-48 w-full" />
            ))}
          </div>
        </div>
      </DashboardLayout>
    );
  }

  if (error) {
    return (
      <DashboardLayout pageTitle="Employees">
        <div className="space-y-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Employee Management</h1>
            <p className="text-gray-600">Manage your team members and their information</p>
          </div>
          <Alert>
            <AlertDescription>
              Error loading employees: {error.message}
            </AlertDescription>
          </Alert>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout pageTitle="Employees">
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Employee Management</h1>
          <p className="text-gray-600">Manage your team members and their information</p>
        </div>
        
        {employees && employees.length > 0 ? (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {employees.map((employee) => (
              <EmployeeCard
                key={employee.id}
                employee={employee}
                onUpdate={handleEmployeeUpdate}
              />
            ))}
          </div>
        ) : (
          <div className="text-center py-8">
            <p className="text-gray-500">No employees found</p>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
