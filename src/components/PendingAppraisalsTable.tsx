import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { AlertCircle, Clock } from 'lucide-react';

export function PendingAppraisalsTable() {
  // Fetch employees with draft appraisals (haven't submitted)
  const { data: pendingEmployees, isLoading: loadingEmployees } = useQuery({
    queryKey: ['pending-employee-appraisals'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('appraisals')
        .select(`
          id,
          status,
          employee:profiles!appraisals_employee_id_fkey(
            id,
            first_name,
            last_name,
            department:departments(name)
          ),
          cycle:appraisal_cycles(name, year, quarter)
        `)
        .eq('status', 'draft')
        .order('created_at', { ascending: true });

      if (error) throw error;
      return data || [];
    }
  });

  // Fetch appraisals awaiting manager review (submitted by employee)
  const { data: pendingManagers, isLoading: loadingManagers } = useQuery({
    queryKey: ['pending-manager-reviews'],
    queryFn: async () => {
      // First, get all submitted appraisals (employee submitted, awaiting manager review)
      const { data: appraisals, error: appraisalError } = await supabase
        .from('appraisals')
        .select('id, status, employee_id, cycle_id')
        .eq('status', 'submitted')
        .order('employee_submitted_at', { ascending: true });

      if (appraisalError) throw appraisalError;
      if (!appraisals || appraisals.length === 0) return [];

      // Get employee details for these appraisals
      const employeeIds = appraisals.map(a => a.employee_id);
      const { data: employees } = await supabase
        .from('profiles')
        .select('id, first_name, last_name, line_manager_id, department_id')
        .in('id', employeeIds);

      // Get unique manager IDs
      const managerIds = [...new Set(employees?.map(e => e.line_manager_id).filter(Boolean))] as string[];
      const { data: managers } = await supabase
        .from('profiles')
        .select('id, first_name, last_name')
        .in('id', managerIds);

      // Get department details
      const departmentIds = [...new Set(employees?.map(e => e.department_id).filter(Boolean))] as string[];
      const { data: departments } = await supabase
        .from('departments')
        .select('id, name')
        .in('id', departmentIds);

      // Create maps for easy lookup
      const employeeMap = new Map(employees?.map(e => [e.id, e]));
      const managerMap = new Map(managers?.map(m => [m.id, m]));
      const departmentMap = new Map(departments?.map(d => [d.id, d]));

      // Combine all the data
      return appraisals.map(appraisal => {
        const employee = employeeMap.get(appraisal.employee_id);
        const manager = employee?.line_manager_id ? managerMap.get(employee.line_manager_id) : null;
        const department = employee?.department_id ? departmentMap.get(employee.department_id) : null;

        return {
          ...appraisal,
          employee: {
            id: employee?.id,
            first_name: employee?.first_name,
            last_name: employee?.last_name,
            line_manager_id: employee?.line_manager_id,
            department: { name: department?.name || 'Not assigned' }
          },
          manager
        };
      });
    }
  });

  // Group pending manager reviews by manager (including those without assigned managers)
  const managerGroups = pendingManagers?.reduce((acc, appraisal: any) => {
    const managerId = appraisal.employee?.line_manager_id || 'unassigned';
    
    const managerName = managerId === 'unassigned' 
      ? 'No Manager Assigned' 
      : `${appraisal.manager?.first_name || ''} ${appraisal.manager?.last_name || ''}`.trim() || 'Unknown Manager';
    
    if (!acc[managerId]) {
      acc[managerId] = {
        managerName,
        department: appraisal.employee?.department?.name || 'Not assigned',
        count: 0
      };
    }
    acc[managerId].count++;
    return acc;
  }, {} as Record<string, { managerName: string; department: string; count: number }>);

  // Group employees by department
  const employeeGroups = pendingEmployees?.reduce((acc, appraisal) => {
    const employeeId = appraisal.employee?.id;
    if (!employeeId) return acc;
    
    if (!acc[employeeId]) {
      acc[employeeId] = {
        employeeName: `${appraisal.employee?.first_name || ''} ${appraisal.employee?.last_name || ''}`.trim(),
        department: appraisal.employee?.department?.name || 'Not assigned',
        count: 0
      };
    }
    acc[employeeId].count++;
    return acc;
  }, {} as Record<string, { employeeName: string; department: string; count: number }>);

  const isLoading = loadingEmployees || loadingManagers;

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <div className="flex flex-col items-center space-y-3">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-600"></div>
            <span className="text-gray-600">Loading pending appraisals...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  const totalPending = (pendingEmployees?.length || 0) + Object.keys(managerGroups || {}).length;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5 text-orange-600" />
            Pending Appraisals Summary
          </div>
          <Badge variant="destructive" className="text-lg px-4">
            {totalPending} Pending
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {totalPending === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <Clock className="h-12 w-12 text-gray-300 mb-3" />
            <p className="text-gray-500 font-medium">No pending appraisals</p>
            <p className="text-sm text-gray-400 mt-1">All employees have submitted and managers have reviewed</p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Pending Count</TableHead>
                <TableHead>Department</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {/* Employees who haven't submitted */}
              {Object.entries(employeeGroups || {}).map(([employeeId, data]) => (
                <TableRow key={`emp-${employeeId}`}>
                  <TableCell className="font-medium">{data.employeeName}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className="bg-blue-50 text-blue-700">
                      Employee
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <span className="text-sm text-gray-600">Employee Self-Appraisal</span>
                  </TableCell>
                  <TableCell>
                    <Badge variant="destructive">{data.count}</Badge>
                  </TableCell>
                  <TableCell>{data.department}</TableCell>
                </TableRow>
              ))}
              
              {/* Managers with pending reviews */}
              {Object.entries(managerGroups || {}).map(([managerId, data]) => (
                <TableRow key={`mgr-${managerId}`}>
                  <TableCell className="font-medium">{data.managerName}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className="bg-purple-50 text-purple-700">
                      Manager
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <span className="text-sm text-gray-600">Manager Review</span>
                  </TableCell>
                  <TableCell>
                    <Badge variant="destructive">{data.count}</Badge>
                  </TableCell>
                  <TableCell>{data.department}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}
