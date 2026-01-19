import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuthContext } from '@/components/AuthProvider';
import { toast } from 'sonner';

interface AttendanceAdmin {
  id: string;
  user_id: string;
  role: 'attendance_admin';
  assigned_by: string | null;
  assigned_at: string;
  is_active: boolean;
  profile?: {
    id: string;
    first_name: string;
    last_name: string;
    email: string;
    department: string | null;
    position: string | null;
  };
  assigner?: {
    first_name: string;
    last_name: string;
  };
}

export function useAttendanceRoles() {
  const { user, profile } = useAuthContext();
  const [attendanceAdmins, setAttendanceAdmins] = useState<AttendanceAdmin[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAttendanceAdmin, setIsAttendanceAdmin] = useState(false);
  const [canManageAttendance, setCanManageAttendance] = useState(false);

  const checkAttendancePermissions = useCallback(async () => {
    if (!user) {
      setIsAttendanceAdmin(false);
      setCanManageAttendance(false);
      return;
    }

    try {
      // Check if user has attendance_admin role
      const { data: roleData } = await supabase
        .from('attendance_user_roles')
        .select('*')
        .eq('user_id', user.id)
        .eq('role', 'attendance_admin')
        .eq('is_active', true)
        .maybeSingle();

      const hasAttendanceAdminRole = !!roleData;
      setIsAttendanceAdmin(hasAttendanceAdminRole);

      // Can manage if HR, admin, or attendance_admin
      const canManage = 
        profile?.role === 'hr' || 
        profile?.role === 'admin' || 
        hasAttendanceAdminRole;
      
      setCanManageAttendance(canManage);
    } catch (error) {
      console.error('Error checking attendance permissions:', error);
    }
  }, [user, profile]);

  const fetchAttendanceAdmins = useCallback(async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('attendance_user_roles')
        .select(`
          *,
          profile:profiles!attendance_user_roles_user_id_fkey(
            id,
            first_name,
            last_name,
            email,
            department,
            position
          ),
          assigner:profiles!attendance_user_roles_assigned_by_fkey(
            first_name,
            last_name
          )
        `)
        .eq('role', 'attendance_admin')
        .order('assigned_at', { ascending: false });

      if (error) throw error;
      setAttendanceAdmins((data as unknown as AttendanceAdmin[]) || []);
    } catch (error) {
      console.error('Error fetching attendance admins:', error);
      toast.error('Failed to load attendance admins');
    } finally {
      setLoading(false);
    }
  }, []);

  const assignAttendanceAdmin = useCallback(async (userId: string, reason?: string) => {
    if (!user) return { error: 'Not authenticated' };

    try {
      // First check if user already has an inactive role assignment
      const { data: existingRole } = await supabase
        .from('attendance_user_roles')
        .select('id, is_active')
        .eq('user_id', userId)
        .eq('role', 'attendance_admin')
        .maybeSingle();

      if (existingRole) {
        if (existingRole.is_active) {
          toast.error('This user already has the attendance admin role');
          return { error: 'Already has role' };
        }
        
        // Reactivate the existing role
        const { error: updateError } = await supabase
          .from('attendance_user_roles')
          .update({
            is_active: true,
            assigned_by: user.id,
            assigned_at: new Date().toISOString()
          })
          .eq('id', existingRole.id);

        if (updateError) throw updateError;
      } else {
        // Insert new role assignment
        const { error: insertError } = await supabase
          .from('attendance_user_roles')
          .insert({
            user_id: userId,
            role: 'attendance_admin',
            assigned_by: user.id,
            is_active: true
          });

        if (insertError) throw insertError;
      }

      // Log the action
      await logAuditAction('role_assigned', 'role_management', userId, null, null, {
        role: 'attendance_admin',
        reason
      });

      toast.success('Attendance admin role assigned successfully');
      await fetchAttendanceAdmins();
      return { error: null };
    } catch (error: any) {
      console.error('Error assigning attendance admin:', error);
      toast.error('Failed to assign attendance admin role');
      return { error };
    }
  }, [user, fetchAttendanceAdmins]);

  const revokeAttendanceAdmin = useCallback(async (roleId: string, userId: string, reason?: string) => {
    if (!user) return { error: 'Not authenticated' };

    try {
      const { error: updateError } = await supabase
        .from('attendance_user_roles')
        .update({ is_active: false })
        .eq('id', roleId);

      if (updateError) throw updateError;

      // Log the action
      await logAuditAction('role_revoked', 'role_management', userId, null, null, {
        role: 'attendance_admin',
        reason
      });

      toast.success('Attendance admin role revoked');
      await fetchAttendanceAdmins();
      return { error: null };
    } catch (error) {
      console.error('Error revoking attendance admin:', error);
      toast.error('Failed to revoke attendance admin role');
      return { error };
    }
  }, [user, fetchAttendanceAdmins]);

  const deleteAttendanceAdmin = useCallback(async (roleId: string, userId: string, reason?: string) => {
    if (!user) return { error: 'Not authenticated' };

    try {
      const { error: deleteError } = await supabase
        .from('attendance_user_roles')
        .delete()
        .eq('id', roleId);

      if (deleteError) throw deleteError;

      // Log the action
      await logAuditAction('role_deleted', 'role_management', userId, null, null, {
        role: 'attendance_admin',
        reason
      });

      toast.success('Attendance admin role deleted permanently');
      await fetchAttendanceAdmins();
      return { error: null };
    } catch (error) {
      console.error('Error deleting attendance admin:', error);
      toast.error('Failed to delete attendance admin role');
      return { error };
    }
  }, [user, fetchAttendanceAdmins]);

  const logAuditAction = async (
    actionType: string,
    actionCategory: string,
    targetEmployeeId?: string | null,
    targetRecordId?: string | null,
    targetTable?: string | null,
    newValues?: object | null,
    oldValues?: object | null,
    reason?: string
  ) => {
    if (!user) return;

    try {
      await supabase.from('attendance_audit_logs').insert([{
        action_type: actionType,
        action_category: actionCategory,
        performed_by: user.id,
        target_employee_id: targetEmployeeId || null,
        target_record_id: targetRecordId || null,
        target_table: targetTable || null,
        old_values: oldValues as any || null,
        new_values: newValues as any || null,
        reason: reason || null
      }]);
    } catch (error) {
      console.error('Error logging audit action:', error);
    }
  };

  useEffect(() => {
    checkAttendancePermissions();
  }, [checkAttendancePermissions]);

  useEffect(() => {
    if (profile?.role === 'hr' || profile?.role === 'admin') {
      fetchAttendanceAdmins();
    }
  }, [profile, fetchAttendanceAdmins]);

  return {
    attendanceAdmins,
    loading,
    isAttendanceAdmin,
    canManageAttendance,
    assignAttendanceAdmin,
    revokeAttendanceAdmin,
    deleteAttendanceAdmin,
    logAuditAction,
    refetch: fetchAttendanceAdmins
  };
}
