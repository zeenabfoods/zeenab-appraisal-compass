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
      const { data, error } = await supabase
        .from('appraisals')
        .select(`
          id,
          status,
          employee:profiles!appraisals_employee_id_fkey(
            id,
            first_name,
            last_name,
            line_manager_id,
            department:departments(name)
          ),
          cycle:appraisal_cycles(name, year, quarter)
        `)
        .eq('status', 'submitted')
        .order('employee_submitted_at', { ascending: true });

      if (error) throw error;
      
      // Now fetch manager details for each unique line_manager_id
      const managerIds = [...new Set(data?.map(a => a.employee?.line_manager_id).filter(Boolean))] as string[];
      const { data: managers } = await supabase
        .from('profiles')
        .select('id, first_name, last_name')
        .in('id', managerIds);
      
      const managerMap = new Map(managers?.map(m => [m.id, m]));
      
      return data?.map(appraisal => ({
        ...appraisal,
        manager: appraisal.employee?.line_manager_id ? managerMap.get(appraisal.employee.line_manager_id) : null
      })) || [];
    }
  });

  // Group pending manager reviews by manager
  const managerGroups = pendingManagers?.reduce((acc, appraisal: any) => {
    const managerId = appraisal.employee?.line_manager_id;
    if (!managerId) return acc;
    
    const managerName = `${appraisal.manager?.first_name || ''} ${appraisal.manager?.last_name || ''}`.trim() || 'Unknown Manager';
    
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
