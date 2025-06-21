
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { User, UserCheck, Building } from 'lucide-react';

interface Staff {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  role: string;
  position: string | null;
  line_manager_id?: string;
  department?: {
    name: string;
  };
}

interface StaffSelectorWithManagerProps {
  staff: Staff[];
  selectedStaff: string;
  onStaffChange: (staffId: string) => void;
}

export function StaffSelectorWithManager({
  staff,
  selectedStaff,
  onStaffChange
}: StaffSelectorWithManagerProps) {
  const selectedEmployee = staff.find(s => s.id === selectedStaff);
  const lineManager = selectedEmployee?.line_manager_id 
    ? staff.find(s => s.id === selectedEmployee.line_manager_id)
    : null;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center">
          <User className="h-5 w-5 mr-2" />
          Select Employee
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <label className="text-sm font-medium mb-2 block">Choose Employee:</label>
          <Select value={selectedStaff} onValueChange={onStaffChange}>
            <SelectTrigger>
              <SelectValue placeholder="Select an employee..." />
            </SelectTrigger>
            <SelectContent>
              {staff.map((employee) => (
                <SelectItem key={employee.id} value={employee.id}>
                  <div className="flex items-center space-x-2">
                    <span>{employee.first_name} {employee.last_name}</span>
                    <Badge variant="outline" className="text-xs">
                      {employee.role}
                    </Badge>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {selectedEmployee && (
          <div className="space-y-3 p-4 bg-gray-50 rounded-lg">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <h4 className="font-semibold text-gray-900 mb-2">Employee Details</h4>
                <div className="space-y-2">
                  <div className="flex items-center">
                    <User className="h-4 w-4 mr-2 text-gray-500" />
                    <span className="text-sm">
                      <strong>{selectedEmployee.first_name} {selectedEmployee.last_name}</strong>
                    </span>
                  </div>
                  {selectedEmployee.position && (
                    <div className="flex items-center">
                      <Badge variant="secondary" className="text-xs">
                        {selectedEmployee.position}
                      </Badge>
                    </div>
                  )}
                  {selectedEmployee.department && (
                    <div className="flex items-center">
                      <Building className="h-4 w-4 mr-2 text-gray-500" />
                      <span className="text-sm">{selectedEmployee.department.name}</span>
                    </div>
                  )}
                </div>
              </div>

              {lineManager && (
                <div>
                  <h4 className="font-semibold text-gray-900 mb-2">Line Manager</h4>
                  <div className="space-y-2">
                    <div className="flex items-center">
                      <UserCheck className="h-4 w-4 mr-2 text-blue-500" />
                      <span className="text-sm">
                        <strong>{lineManager.first_name} {lineManager.last_name}</strong>
                      </span>
                    </div>
                    <div className="flex items-center">
                      <Badge variant="outline" className="text-xs">
                        {lineManager.role}
                      </Badge>
                    </div>
                    {lineManager.position && (
                      <div className="text-sm text-gray-600">
                        {lineManager.position}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
