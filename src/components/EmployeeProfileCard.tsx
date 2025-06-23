
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { User, Building2, Users, AlertTriangle, RefreshCw } from 'lucide-react';
import { Profile } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface EmployeeProfileCardProps {
  profile: Profile;
  onProfileUpdate?: (updatedProfile: Profile) => void;
}

interface ExtendedProfile extends Profile {
  department?: { name: string };
  line_manager?: { first_name: string; last_name: string };
}

export function EmployeeProfileCard({ profile, onProfileUpdate }: EmployeeProfileCardProps) {
  const [currentProfile, setCurrentProfile] = useState<ExtendedProfile>(profile);
  const [refreshing, setRefreshing] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    setCurrentProfile(profile);
  }, [profile]);

  const refreshProfile = async () => {
    setRefreshing(true);
    try {
      console.log('🔄 Refreshing profile data for user:', currentProfile.id);
      
      // Get the basic profile first
      const { data: basicProfile, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', currentProfile.id)
        .single();

      if (profileError) {
        console.error('Error fetching basic profile:', profileError);
        throw profileError;
      }

      console.log('✅ Basic profile fetched:', basicProfile);

      // Get department info if department_id exists
      let departmentInfo = null;
      if (basicProfile.department_id) {
        const { data: deptData, error: deptError } = await supabase
          .from('departments')
          .select('name')
          .eq('id', basicProfile.department_id)
          .single();

        if (!deptError && deptData) {
          departmentInfo = { name: deptData.name };
        }
      }

      // Get line manager info if line_manager_id exists
      let managerInfo = null;
      if (basicProfile.line_manager_id) {
        const { data: managerData, error: managerError } = await supabase
          .from('profiles')
          .select('first_name, last_name')
          .eq('id', basicProfile.line_manager_id)
          .single();

        if (!managerError && managerData) {
          managerInfo = {
            first_name: managerData.first_name,
            last_name: managerData.last_name
          };
        }
      }

      // Create the updated profile with additional info
      const updatedProfile: ExtendedProfile = {
        ...basicProfile,
        department: departmentInfo,
        line_manager: managerInfo
      };

      console.log('✅ Profile refreshed successfully:', updatedProfile);
      setCurrentProfile(updatedProfile);
      
      // Notify parent component of the update
      if (onProfileUpdate) {
        onProfileUpdate(updatedProfile);
      }

      toast({
        title: "Profile Updated",
        description: "Your profile information has been refreshed."
      });
    } catch (error) {
      console.error('Error refreshing profile:', error);
      toast({
        title: "Error",
        description: "Failed to refresh profile information.",
        variant: "destructive"
      });
    } finally {
      setRefreshing(false);
    }
  };

  const getDepartmentDisplay = () => {
    if (currentProfile.department?.name) {
      return currentProfile.department.name;
    }
    return 'Not assigned';
  };

  const getLineManagerDisplay = () => {
    if (currentProfile.line_manager) {
      return `${currentProfile.line_manager.first_name} ${currentProfile.line_manager.last_name}`;
    }
    if (currentProfile.line_manager_id) {
      // If we have line manager ID but no name data, show as assigned
      return 'Assigned';
    }
    return 'Not assigned';
  };

  const isProfileIncomplete = !currentProfile.department_id || !currentProfile.line_manager_id;

  return (
    <Card className="backdrop-blur-md bg-white/60 border-white/40 shadow-lg">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            My Profile
          </CardTitle>
          <div className="flex items-center gap-2">
            {isProfileIncomplete && (
              <Badge variant="outline" className="text-amber-600 border-amber-200 bg-amber-50">
                <AlertTriangle className="h-3 w-3 mr-1" />
                Pending Setup
              </Badge>
            )}
            <Button
              variant="ghost"
              size="sm"
              onClick={refreshProfile}
              disabled={refreshing}
              className="h-8 w-8 p-0"
            >
              <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
            </Button>
          </div>
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
              {currentProfile.first_name} {currentProfile.last_name}
            </p>
          </div>

          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm font-medium text-gray-700">
              <Badge className="h-4 w-4" />
              Role
            </div>
            <Badge variant="secondary" className="capitalize">
              {currentProfile.role}
            </Badge>
          </div>

          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm font-medium text-gray-700">
              <Building2 className="h-4 w-4" />
              Department
            </div>
            <p className={`${!currentProfile.department_id ? 'text-amber-600 italic' : 'text-gray-900'}`}>
              {getDepartmentDisplay()}
            </p>
          </div>

          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm font-medium text-gray-700">
              <Users className="h-4 w-4" />
              Line Manager
            </div>
            <p className={`${!currentProfile.line_manager_id ? 'text-amber-600 italic' : 'text-gray-900'}`}>
              {getLineManagerDisplay()}
            </p>
          </div>

          {currentProfile.position && (
            <div className="space-y-2 md:col-span-2">
              <div className="flex items-center gap-2 text-sm font-medium text-gray-700">
                <Badge className="h-4 w-4" />
                Position
              </div>
              <p className="text-gray-900">{currentProfile.position}</p>
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
                <Button
                  variant="outline"
                  size="sm"
                  onClick={refreshProfile}
                  disabled={refreshing}
                  className="mt-2"
                >
                  <RefreshCw className={`h-3 w-3 mr-1 ${refreshing ? 'animate-spin' : ''}`} />
                  Check for Updates
                </Button>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
