import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { supabase } from '@/integrations/supabase/client';
import { Users, CheckCircle, Clock, AlertCircle } from 'lucide-react';

interface AssignmentStats {
  totalEmployees: number;
  employeesWithQuestions: number;
  totalQuestionsAssigned: number;
  completedAppraisals: number;
}

interface EmployeeAssignment {
  employee_id: string;
  employee_name: string;
  email: string;
  department: string;
  questions_assigned: number;
  appraisal_status: string;
  assigned_date: string;
  line_manager: string;
}

export function QuestionAssignmentTracker() {
  const [stats, setStats] = useState<AssignmentStats>({
    totalEmployees: 0,
    employeesWithQuestions: 0,
    totalQuestionsAssigned: 0,
    completedAppraisals: 0
  });
  const [assignments, setAssignments] = useState<EmployeeAssignment[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAssignmentData();
  }, []);

  const fetchAssignmentData = async () => {
    try {
      setLoading(true);

      // Get assignment statistics
      const { data: employeeCount } = await supabase
        .from('profiles')
        .select('id')
        .eq('is_active', true);

      const { data: assignmentData } = await supabase
        .from('employee_appraisal_questions')
        .select(`
          employee_id,
          question_id,
          assigned_at,
          profiles!employee_appraisal_questions_employee_id_fkey (
            first_name,
            last_name,
            email,
            department,
            line_manager_id,
            line_manager:profiles!profiles_line_manager_id_fkey (
              first_name,
              last_name
            )
          )
        `)
        .eq('is_active', true);

      const { data: appraisalData } = await supabase
        .from('appraisals')
        .select('employee_id, status')
        .neq('status', 'draft');

      // Calculate stats
      const totalEmployees = employeeCount?.length || 0;
      const employeesWithQuestions = new Set(assignmentData?.map(a => a.employee_id)).size;
      const totalQuestionsAssigned = assignmentData?.length || 0;
      const completedAppraisals = appraisalData?.filter(a => a.status === 'completed').length || 0;

      setStats({
        totalEmployees,
        employeesWithQuestions,
        totalQuestionsAssigned,
        completedAppraisals
      });

      // Group assignments by employee
      const employeeAssignments = new Map();
      
      assignmentData?.forEach(assignment => {
        const empId = assignment.employee_id;
        const profile = assignment.profiles;
        
        if (!employeeAssignments.has(empId)) {
          // Handle line_manager which could be an object or null
          const lineManagerData = Array.isArray(profile.line_manager) 
            ? profile.line_manager[0] 
            : profile.line_manager;
          
          employeeAssignments.set(empId, {
            employee_id: empId,
            employee_name: `${profile.first_name} ${profile.last_name}`,
            email: profile.email,
            department: profile.department || 'N/A',
            questions_assigned: 0,
            appraisal_status: 'draft',
            assigned_date: assignment.assigned_at,
            line_manager: lineManagerData 
              ? `${lineManagerData.first_name} ${lineManagerData.last_name}`
              : 'N/A'
          });
        }
        
        employeeAssignments.get(empId).questions_assigned++;
      });

      // Add appraisal status
      appraisalData?.forEach(appraisal => {
        if (employeeAssignments.has(appraisal.employee_id)) {
          employeeAssignments.get(appraisal.employee_id).appraisal_status = appraisal.status;
        }
      });

      setAssignments(Array.from(employeeAssignments.values()));
    } catch (error) {
      console.error('Error fetching assignment data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'submitted':
      case 'manager_review':
      case 'hr_review':
        return <Clock className="h-4 w-4 text-yellow-600" />;
      default:
        return <AlertCircle className="h-4 w-4 text-red-600" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-green-100 text-green-800';
      case 'submitted':
        return 'bg-blue-100 text-blue-800';
      case 'manager_review':
        return 'bg-yellow-100 text-yellow-800';
      case 'hr_review':
        return 'bg-purple-100 text-purple-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <Users className="h-8 w-8 text-blue-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Total Employees</p>
                <p className="text-2xl font-bold">{stats.totalEmployees}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <CheckCircle className="h-8 w-8 text-green-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">With Questions</p>
                <p className="text-2xl font-bold">{stats.employeesWithQuestions}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <AlertCircle className="h-8 w-8 text-orange-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Questions Assigned</p>
                <p className="text-2xl font-bold">{stats.totalQuestionsAssigned}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <Clock className="h-8 w-8 text-purple-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Completed</p>
                <p className="text-2xl font-bold">{stats.completedAppraisals}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Assignment Table */}
      <Card>
        <CardHeader>
          <CardTitle>Employee Assignment Tracking</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Employee</TableHead>
                  <TableHead>Department</TableHead>
                  <TableHead>Line Manager</TableHead>
                  <TableHead>Questions Assigned</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Assigned Date</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {assignments.map((assignment) => (
                  <TableRow key={assignment.employee_id}>
                    <TableCell>
                      <div>
                        <p className="font-medium">{assignment.employee_name}</p>
                        <p className="text-sm text-gray-600">{assignment.email}</p>
                      </div>
                    </TableCell>
                    <TableCell>{assignment.department}</TableCell>
                    <TableCell>{assignment.line_manager}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{assignment.questions_assigned}</Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center space-x-2">
                        {getStatusIcon(assignment.appraisal_status)}
                        <Badge className={getStatusColor(assignment.appraisal_status)}>
                          {assignment.appraisal_status}
                        </Badge>
                      </div>
                    </TableCell>
                    <TableCell>
                      {new Date(assignment.assigned_date).toLocaleDateString()}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          
          {assignments.length === 0 && (
            <div className="text-center py-8">
              <p className="text-gray-500">No question assignments found.</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
