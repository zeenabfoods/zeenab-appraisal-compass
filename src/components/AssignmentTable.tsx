
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { CheckCircle, Clock, AlertCircle } from 'lucide-react';
import { EmployeeAssignment } from '@/hooks/useQuestionAssignmentData';

interface AssignmentTableProps {
  assignments: EmployeeAssignment[];
}

export function AssignmentTable({ assignments }: AssignmentTableProps) {
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

  return (
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
  );
}
