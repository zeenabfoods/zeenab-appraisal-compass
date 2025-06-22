
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { AlertCircle, CheckCircle, Loader2 } from 'lucide-react';

interface EmployeeProfileFixerProps {
  onFixCompleted?: () => void;
}

export function EmployeeProfileFixer({ onFixCompleted }: EmployeeProfileFixerProps) {
  const { toast } = useToast();
  const [fixing, setFixing] = useState(false);
  const [status, setStatus] = useState<'idle' | 'checking' | 'fixing' | 'success' | 'error'>('idle');

  const fixEmployeeProfile = async () => {
    try {
      setFixing(true);
      setStatus('checking');
      
      console.log('🔧 Starting employee profile fix...');
      
      // First, check current profile state
      const { data: currentProfile, error: profileCheckError } = await supabase
        .from('profiles')
        .select('id, first_name, last_name, department_id, line_manager_id')
        .eq('id', '14085962-62dd-4d01-a9ed-d4dc43cfc7e5')
        .single();

      if (profileCheckError) {
        console.error('❌ Error checking current profile:', profileCheckError);
        throw profileCheckError;
      }

      console.log('👤 Current profile state:', currentProfile);

      // Get or create HR department
      let { data: hrDept, error: deptError } = await supabase
        .from('departments')
        .select('id, name')
        .ilike('name', '%human%resource%')
        .maybeSingle();

      if (deptError && deptError.code !== 'PGRST116') {
        console.error('❌ Error checking HR department:', deptError);
        throw deptError;
      }

      if (!hrDept) {
        console.log('🏢 Creating HR department...');
        const { data: newDept, error: createDeptError } = await supabase
          .from('departments')
          .insert([{
            name: 'Human Resources',
            description: 'Human Resources Department',
            is_active: true
          }])
          .select()
          .single();

        if (createDeptError) {
          console.error('❌ Error creating HR department:', createDeptError);
          throw createDeptError;
        }
        
        hrDept = newDept;
        console.log('✅ Created HR department:', hrDept);
      } else {
        console.log('✅ HR department found:', hrDept);
      }

      // Get HR manager
      const { data: hrManager, error: managerError } = await supabase
        .from('profiles')
        .select('id, first_name, last_name, role')
        .eq('role', 'hr')
        .eq('first_name', 'Human')
        .eq('last_name', 'Resource')
        .maybeSingle();

      if (managerError) {
        console.error('❌ Error finding HR manager:', managerError);
        throw managerError;
      }

      if (!hrManager) {
        toast({
          title: "Error",
          description: "HR manager (Human Resource) not found. Please ensure this user exists.",
          variant: "destructive"
        });
        setStatus('error');
        return;
      }

      console.log('👔 HR manager found:', hrManager);
      setStatus('fixing');

      // Update Ebenezer Ise's profile
      const { data: updatedProfile, error: updateError } = await supabase
        .from('profiles')
        .update({
          department_id: hrDept.id,
          line_manager_id: hrManager.id
        })
        .eq('id', '14085962-62dd-4d01-a9ed-d4dc43cfc7e5')
        .select('id, first_name, last_name, department_id, line_manager_id')
        .single();

      if (updateError) {
        console.error('❌ Error updating employee profile:', updateError);
        throw updateError;
      }

      console.log('✅ Successfully updated employee profile:', updatedProfile);
      
      // Verify the update by fetching fresh data
      const { data: verificationProfile, error: verifyError } = await supabase
        .from('profiles')
        .select(`
          id, 
          first_name, 
          last_name, 
          department_id, 
          line_manager_id,
          departments!profiles_department_id_fkey(name),
          line_manager:profiles!profiles_line_manager_id_fkey(first_name, last_name)
        `)
        .eq('id', '14085962-62dd-4d01-a9ed-d4dc43cfc7e5')
        .single();

      if (verifyError) {
        console.error('❌ Error verifying profile update:', verifyError);
      } else {
        console.log('🔍 Verification - Profile with relations:', verificationProfile);
      }
      
      setStatus('success');
      toast({
        title: "Success",
        description: "Employee profile updated successfully! Department and line manager have been assigned.",
      });

      // Trigger refresh callback with a longer delay to ensure data propagation
      if (onFixCompleted) {
        setTimeout(() => {
          console.log('🔄 Triggering data refresh after profile fix...');
          onFixCompleted();
        }, 2000); // Increased delay to ensure database propagation
      }

    } catch (error) {
      console.error('❌ Error in fixEmployeeProfile:', error);
      setStatus('error');
      toast({
        title: "Error",
        description: `Failed to fix employee profile: ${error.message}`,
        variant: "destructive"
      });
    } finally {
      setFixing(false);
    }
  };

  const getStatusIcon = () => {
    switch (status) {
      case 'checking':
      case 'fixing':
        return <Loader2 className="h-5 w-5 animate-spin text-blue-600" />;
      case 'success':
        return <CheckCircle className="h-5 w-5 text-green-600" />;
      case 'error':
        return <AlertCircle className="h-5 w-5 text-red-600" />;
      default:
        return <AlertCircle className="h-5 w-5 text-orange-600" />;
    }
  };

  const getStatusMessage = () => {
    switch (status) {
      case 'checking':
        return 'Checking current profile and department data...';
      case 'fixing':
        return 'Updating employee profile with department and manager...';
      case 'success':
        return 'Employee profile successfully updated with HR department and manager!';
      case 'error':
        return 'Failed to update employee profile.';
      default:
        return 'Employee profile needs department and line manager assignment to show correctly in tracking.';
    }
  };

  return (
    <Card className="border-orange-200">
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          {getStatusIcon()}
          <span>Fix Profile Assignment Issue</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-gray-600">
          {getStatusMessage()}
        </p>
        
        {status !== 'success' && (
          <Button 
            onClick={fixEmployeeProfile}
            disabled={fixing}
            className="bg-orange-600 hover:bg-orange-700"
          >
            {fixing ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Fixing Profile...
              </>
            ) : (
              'Fix Employee Profile'
            )}
          </Button>
        )}
        
        {status === 'success' && (
          <div className="space-y-2">
            <p className="text-sm text-green-600 font-medium">
              ✅ Profile fixed! The assignment tracking should now show proper department and manager.
            </p>
            <Button 
              onClick={() => onFixCompleted?.()}
              variant="outline"
              size="sm"
            >
              Refresh Assignment Data
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
