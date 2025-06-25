
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
  department_name?: string;
  line_manager_name?: string;
}

export function EmployeeProfileCard({ profile, onProfileUpdate }: EmployeeProfileCardProps) {
  const [currentProfile, setCurrentProfile] = useState<ExtendedProfile>(profile);
  const [refreshing, setRefreshing] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    console.log('🔄 Profile prop updated in EmployeeProfileCard:', profile);
    setCurrentProfile(profile);
  }, [profile]);

  const refreshProfile = async () => {
    setRefreshing(true);
    try {
      console.log('🔄 Refreshing profile data for user:', currentProfile.id);
      
      // Get the fresh profile data
      const { data: refreshedProfile, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', currentProfile.id)
        .single();

      if (profileError) {
        console.error('❌ Error fetching refreshed profile:', profileError);
        throw profileError;
      }

      console.log('✅ Fresh profile data from database:', refreshedProfile);

      // Resolve department name
      let departmentName = undefined;
      let departmentObject = null;
      if (refreshedProfile.department_id) {
        console.log('🏢 Fetching department for ID:', refreshedProfile.department_id);
        const { data: department, error: deptError } = await supabase
          .from('departments')
          .select('name')
          .eq('id', refreshedProfile.department_id)
          .single();
        
        if (!deptError && department) {
          departmentName = department.name;
          departmentObject = { name: department.name };
          console.log('✅ Department found:', departmentName);
        } else {
          console.log('⚠️ Department ID exists but name not found:', deptError);
        }
      }

      // Resolve line manager name
      let managerName = undefined;
      if (refreshedProfile.line_manager_id) {
        console.log('👤 Fetching manager for ID:', refreshedProfile.line_manager_id);
        const { data: manager, error: managerError } = await supabase
          .from('profiles')
          .select('first_name, last_name')
          .eq('id', refreshedProfile.line_manager_id)
          .single();
        
        if (!managerError && manager) {
          managerName = `${manager.first_name || ''} ${manager.last_name || ''}`.trim();
          console.log('✅ Manager found:', managerName);
        } else {
          console.log('⚠️ Manager ID exists but name not found:', managerError);
        }
      }

      // Create the updated profile with the fetched data
      const updatedProfile: ExtendedProfile = {
        id: refreshedProfile.id,
        email: refreshedProfile.email,
        first_name: refreshedProfile.first_name,
        last_name: refreshedProfile.last_name,
        role: refreshedProfile.role,
        position: refreshedProfile.position,
        department_id: refreshedProfile.department_id,
        line_manager_id: refreshedProfile.line_manager_id,
        is_active: refreshedProfile.is_active,
        created_at: refreshedProfile.created_at,
        department: departmentObject,
        last_login: refreshedProfile.last_login,
        department_name: departmentName,
        line_manager_name: managerName
      };

      console.log('✅ Complete refreshed profile with assignments:', {
        department_id: updatedProfile.department_id,
        department_name: updatedProfile.department_name,
        line_manager_id: updatedProfile.line_manager_id,
        line_manager_name: updatedProfile.line_manager_name
      });
      
      setCurrentProfile(updatedProfile);
      
      // Notify parent component of the update
      if (onProfileUpdate) {
        const baseProfile: Profile = {
          id: updatedProfile.id,
          email: updatedProfile.email,
          first_name: updatedProfile.first_name,
          last_name: updatedProfile.last_name,
          role: updatedProfile.role,
          position: updatedProfile.position,
          department_id: updatedProfile.department_id,
          line_manager_id: updatedProfile.line_manager_id,
          is_active: updatedProfile.is_active,
          created_at: updatedProfile.created_at,
          department: departmentObject,
          last_login: updatedProfile.last_login
        };
        onProfileUpdate(baseProfile);
      }

      const hasFullAssignments = updatedProfile.department_id && updatedProfile.line_manager_id;
      const hasNames = updatedProfile.department_name && updatedProfile.line_manager_name;
      
      if (hasFullAssignments && hasNames) {
        toast({
          title: "Profile Updated",
          description: "Your profile information has been refreshed successfully."
        });
      } else if (hasFullAssignments && !hasNames) {
        toast({
          title: "Profile Partially Updated",
          description: "Assignments found but names are still being resolved. Please try refreshing again in a moment."
        });
      } else {
        toast({
          title: "Profile Setup Pending",
          description: "Please contact HR to complete your department and manager assignment."
        });
      }

    } catch (error) {
      console.error('❌ Error refreshing profile:', error);
      toast({
        title: "Error",
        description: `Failed to refresh profile information: ${error.message}`,
        variant: "destructive"
      });
    } finally {
      setRefreshing(false);
    }
  };

  const getDepartmentDisplay = () => {
    if (currentProfile.department_name) {
      return currentProfile.department_name;
    }
    if (currentProfile.department_id) {
      return 'Assigned (Click refresh to see name)';
    }
    return 'Not assigned';
  };

  const getLineManagerDisplay = () => {
    if (currentProfile.line_manager_name) {
      return currentProfile.line_manager_name;
    }
    if (currentProfile.line_manager_id) {
      return 'Assigned (Click refresh to see name)';
    }
    return 'Not assigned';
  };

  const isProfileIncomplete = !currentProfile.department_id || !currentProfile.line_manager_id;
  const hasUnresolvedNames = (currentProfile.department_id && !currentProfile.department_name) || 
                            (currentProfile.line_manager_id && !currentProfile.line_manager_name);

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
            {hasUnresolvedNames && (
              <Badge variant="outline" className="text-blue-600 border-blue-200 bg-blue-50">
                <RefreshCw className="h-3 w-3 mr-1" />
                Refresh Needed
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
            <p className={`${!currentProfile.department_id ? 'text-amber-600 italic' : 
                          (currentProfile.department_name ? 'text-gray-900' : 'text-blue-600 italic')}`}>
              {getDepartmentDisplay()}
            </p>
          </div>

          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm font-medium text-gray-700">
              <Users className="h-4 w-4" />
              Line Manager
            </div>
            <p className={`${!currentProfile.line_manager_id ? 'text-amber-600 italic' : 
                          (currentProfile.line_manager_name ? 'text-gray-900' : 'text-blue-600 italic')}`}>
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

        {(isProfileIncomplete || hasUnresolvedNames) && (
          <div className="mt-4 p-3 bg-amber-50 border border-amber-200 rounded-lg">
            <div className="flex items-start gap-2">
              <AlertTriangle className="h-4 w-4 text-amber-600 mt-0.5" />
              <div className="text-sm">
                {isProfileIncomplete && (
                  <>
                    <p className="font-medium text-amber-800">Profile Setup Pending</p>
                    <p className="text-amber-700 mt-1">
                      Your department and line manager assignment is pending. Please contact HR to complete your profile setup.
                    </p>
                  </>
                )}
                {hasUnresolvedNames && !isProfileIncomplete && (
                  <>
                    <p className="font-medium text-blue-800">Names Need Refresh</p>
                    <p className="text-blue-700 mt-1">
                      Your assignments are in place but names haven't loaded yet. Click the refresh button to load them.
                    </p>
                  </>
                )}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={refreshProfile}
                  disabled={refreshing}
                  className="mt-2"
                >
                  <RefreshCw className={`h-3 w-3 mr-1 ${refreshing ? 'animate-spin' : ''}`} />
                  {refreshing ? 'Refreshing...' : 'Refresh Profile'}
                </Button>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
