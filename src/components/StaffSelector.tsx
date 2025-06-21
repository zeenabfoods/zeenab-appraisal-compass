
import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Users } from 'lucide-react';

interface Staff {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  role: string;
  position: string | null;
  department?: {
    name: string;
  };
}

interface StaffSelectorProps {
  staff: Staff[];
  selectedStaff: string;
  onStaffChange: (staffId: string) => void;
}

export function StaffSelector({ staff, selectedStaff, onStaffChange }: StaffSelectorProps) {
  const selectedEmployee = staff.find(s => s.id === selectedStaff);

  return (
    <Card className="backdrop-blur-md bg-white/60 border-white/40">
      <CardHeader>
        <CardTitle className="flex items-center">
          <Users className="h-5 w-5 mr-2" />
          Select Employee
        </CardTitle>
        <CardDescription>
          Choose a staff member to manage their appraisal questions
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <Select value={selectedStaff} onValueChange={onStaffChange}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Select an employee..." />
            </SelectTrigger>
            <SelectContent>
              {staff.map((employee) => (
                <SelectItem key={employee.id} value={employee.id}>
                  <div className="flex items-center justify-between w-full">
                    <span>{employee.first_name} {employee.last_name}</span>
                    <span className="text-sm text-gray-500 ml-2">
                      {employee.position} • {employee.department?.name}
                    </span>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          
          {selectedEmployee && (
            <div className="p-3 bg-blue-50 rounded-lg border">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-medium text-gray-900">
                    {selectedEmployee.first_name} {selectedEmployee.last_name}
                  </h4>
                  <p className="text-sm text-gray-600">{selectedEmployee.email}</p>
                </div>
                <div className="text-right text-sm text-gray-500">
                  <p>{selectedEmployee.position}</p>
                  <p>{selectedEmployee.department?.name}</p>
                </div>
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
