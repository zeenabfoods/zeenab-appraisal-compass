
import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { User, Building2, Users, AlertTriangle } from 'lucide-react';
import { Profile } from '@/hooks/useAuth';

interface EmployeeProfileCardProps {
  profile: Profile;
}

export function EmployeeProfileCard({ profile }: EmployeeProfileCardProps) {
  const getDepartmentDisplay = () => {
    if (profile.department?.name) {
      return profile.department.name;
    }
    return 'Not assigned';
  };

  const getLineManagerDisplay = async () => {
    // For now, we'll show a placeholder since we don't have the line manager info in the profile
    // This would be enhanced to fetch line manager details
    return profile.line_manager_id ? 'Assigned' : 'Not assigned';
  };

  const isProfileIncomplete = !profile.department_id || !profile.line_manager_id;

  return (
    <Card className="backdrop-blur-md bg-white/60 border-white/40 shadow-lg">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            My Profile
          </CardTitle>
          {isProfileIncomplete && (
            <Badge variant="outline" className="text-amber-600 border-amber-200 bg-amber-50">
              <AlertTriangle className="h-3 w-3 mr-1" />
              Pending Setup
            </Badge>
          )}
        </div>
        <CardDescription>
          Your current profile and organizational information
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm font-medium text-gray-700">
              <User className="h-4 w-4" />
              Name
            </div>
            <p className="text-gray-900">
              {profile.first_name} {profile.last_name}
            </p>
          </div>

          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm font-medium text-gray-700">
              <Badge className="h-4 w-4" />
              Role
            </div>
            <Badge variant="secondary" className="capitalize">
              {profile.role}
            </Badge>
          </div>

          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm font-medium text-gray-700">
              <Building2 className="h-4 w-4" />
              Department
            </div>
            <p className={`${!profile.department_id ? 'text-amber-600 italic' : 'text-gray-900'}`}>
              {getDepartmentDisplay()}
            </p>
          </div>

          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm font-medium text-gray-700">
              <Users className="h-4 w-4" />
              Line Manager
            </div>
            <p className={`${!profile.line_manager_id ? 'text-amber-600 italic' : 'text-gray-900'}`}>
              {profile.line_manager_id ? 'Assigned' : 'Not assigned'}
            </p>
          </div>

          {profile.position && (
            <div className="space-y-2 md:col-span-2">
              <div className="flex items-center gap-2 text-sm font-medium text-gray-700">
                <Badge className="h-4 w-4" />
                Position
              </div>
              <p className="text-gray-900">{profile.position}</p>
            </div>
          )}
        </div>

        {isProfileIncomplete && (
          <div className="mt-4 p-3 bg-amber-50 border border-amber-200 rounded-lg">
            <div className="flex items-start gap-2">
              <AlertTriangle className="h-4 w-4 text-amber-600 mt-0.5" />
              <div className="text-sm">
                <p className="font-medium text-amber-800">Profile Setup Pending</p>
                <p className="text-amber-700 mt-1">
                  Your department and line manager assignment is pending. Please contact HR to complete your profile setup.
                </p>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
