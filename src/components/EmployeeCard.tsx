
import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Edit, UserPlus, Building2, Users } from 'lucide-react';

interface EmployeeCardProps {
  employee: {
    id: string;
    first_name: string;
    last_name: string;
    email: string;
    position?: string;
    role: string;
    is_active: boolean;
    created_at: string;
    department?: { name: string };
  };
  onUpdate: () => void;
}

export default function EmployeeCard({ employee, onUpdate }: EmployeeCardProps) {
  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case 'admin': return 'bg-red-100 text-red-800';
      case 'hr': return 'bg-purple-100 text-purple-800';
      case 'manager': return 'bg-blue-100 text-blue-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const handleEdit = () => {
    // This would trigger an edit dialog
    console.log('Edit employee:', employee.id);
  };

  const handleToggleStatus = () => {
    // This would toggle the employee status
    console.log('Toggle status for:', employee.id);
    onUpdate();
  };

  return (
    <Card className="backdrop-blur-md bg-white/60 border-white/40 shadow-lg hover:shadow-xl transition-all">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-full bg-gradient-to-r from-orange-400 to-red-400 flex items-center justify-center text-white font-semibold">
              {employee.first_name[0]}{employee.last_name[0]}
            </div>
            <div>
              <CardTitle className="text-lg">
                {employee.first_name} {employee.last_name}
              </CardTitle>
              <CardDescription className="text-sm">
                {employee.email}
              </CardDescription>
            </div>
          </div>
          <Badge className={getRoleBadgeColor(employee.role)}>
            {employee.role.toUpperCase()}
          </Badge>
        </div>
      </CardHeader>
      
      <CardContent>
        <div className="space-y-2 text-sm">
          {employee.position && (
            <div className="flex items-center text-gray-600">
              <UserPlus className="h-4 w-4 mr-2" />
              {employee.position}
            </div>
          )}
          
          <div className="flex items-center">
            <Building2 className="h-4 w-4 mr-2" />
            <span className={employee.department?.name ? "text-gray-600" : "text-amber-600 italic"}>
              {employee.department?.name || "No Department Assigned"}
            </span>
          </div>
        </div>
        
        <div className="flex items-center justify-between mt-4 pt-3 border-t">
          <div className="flex items-center space-x-2">
            <Switch
              checked={employee.is_active}
              onCheckedChange={handleToggleStatus}
            />
            <span className="text-sm text-gray-600">
              {employee.is_active ? 'Active' : 'Inactive'}
            </span>
          </div>
          
          <Button
            size="sm"
            variant="ghost"
            onClick={handleEdit}
            className="hover:bg-orange-100"
          >
            <Edit className="h-4 w-4" />
          </Button>
        </div>
        
        <div className="mt-2 text-xs text-gray-500">
          Joined: {new Date(employee.created_at).toLocaleDateString()}
        </div>
      </CardContent>
    </Card>
  );
}
