
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Users } from 'lucide-react';

interface Profile {
  id: string;
  first_name: string;
  last_name: string;
  role: string;
}

interface StaffSelectorProps {
  staff: Profile[];
  selectedStaff: string;
  onStaffChange: (staffId: string) => void;
}

export function StaffSelector({ staff, selectedStaff, onStaffChange }: StaffSelectorProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center">
          <Users className="h-5 w-5 mr-2" />
          Select Staff Member
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Select value={selectedStaff} onValueChange={onStaffChange}>
          <SelectTrigger className="w-full">
            <SelectValue placeholder="Choose a staff member to manage their questions" />
          </SelectTrigger>
          <SelectContent>
            {staff.map((member) => (
              <SelectItem key={member.id} value={member.id}>
                {member.first_name} {member.last_name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </CardContent>
    </Card>
  );
}
