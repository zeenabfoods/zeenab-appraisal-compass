
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { User, Building2, Users, Mail, Phone } from 'lucide-react';

interface Employee {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  role: string;
  position: string | null;
  department?: {
    name: string;
  };
  line_manager_id?: string;
}

interface EmployeeInfoCardProps {
  employee: Employee;
  lineManager?: Employee | null;
  showFullDetails?: boolean;
}

export function EmployeeInfoCard({ employee, lineManager, showFullDetails = true }: EmployeeInfoCardProps) {
  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case 'admin': return 'bg-gradient-to-r from-red-100 to-red-200 text-red-800 border-red-300';
      case 'hr': return 'bg-gradient-to-r from-purple-100 to-purple-200 text-purple-800 border-purple-300';
      case 'manager': return 'bg-gradient-to-r from-blue-100 to-blue-200 text-blue-800 border-blue-300';
      default: return 'bg-gradient-to-r from-gray-100 to-gray-200 text-gray-800 border-gray-300';
    }
  };

  return (
    <Card className="backdrop-blur-md bg-white/60 border-white/40 shadow-lg">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <User className="h-5 w-5" />
          Employee Information
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm font-medium text-gray-700">
              <User className="h-4 w-4" />
              Name
            </div>
            <p className="text-gray-900 font-semibold">
              {employee.first_name} {employee.last_name}
            </p>
            <Badge className={getRoleBadgeColor(employee.role)}>
              {employee.role.toUpperCase()}
            </Badge>
          </div>

          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm font-medium text-gray-700">
              <Mail className="h-4 w-4" />
              Email
            </div>
            <p className="text-gray-600 text-sm">{employee.email}</p>
          </div>

          {employee.department && (
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm font-medium text-gray-700">
                <Building2 className="h-4 w-4" />
                Department
              </div>
              <p className="text-gray-900">{employee.department.name}</p>
            </div>
          )}

          {employee.position && (
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm font-medium text-gray-700">
                <Badge className="h-4 w-4" />
                Position
              </div>
              <p className="text-gray-900">{employee.position}</p>
            </div>
          )}

          {lineManager && showFullDetails && (
            <div className="space-y-2 md:col-span-2">
              <div className="flex items-center gap-2 text-sm font-medium text-gray-700">
                <Users className="h-4 w-4" />
                Line Manager
              </div>
              <div className="bg-gray-50 p-3 rounded-lg">
                <p className="font-medium text-gray-900">
                  {lineManager.first_name} {lineManager.last_name}
                </p>
                <p className="text-sm text-gray-600">{lineManager.email}</p>
                {lineManager.position && (
                  <p className="text-sm text-gray-600">{lineManager.position}</p>
                )}
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
