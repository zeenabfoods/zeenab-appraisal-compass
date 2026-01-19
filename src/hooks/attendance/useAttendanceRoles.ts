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
    // Only HR/Admin should fetch the list of attendance admins
    if (!profile || (profile.role !== 'hr' && profile.role !== 'admin')) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);

      // 1) Fetch role assignments (no relational selects to avoid FK naming/relationship issues)
      const { data: roles, error: rolesError } = await supabase
        .from('attendance_user_roles')
        .select('id, user_id, role, assigned_by, assigned_at, is_active')
        .eq('role', 'attendance_admin')
        .order('assigned_at', { ascending: false });

      if (rolesError) {
        console.error('Fetch attendance admins roles error:', rolesError);
        throw rolesError;
      }

      const roleRows = (roles || []) as unknown as AttendanceAdmin[];
      if (roleRows.length === 0) {
        setAttendanceAdmins([]);
        return;
      }

      // 2) Fetch user profiles for the assigned users
      const userIds = Array.from(new Set(roleRows.map((r) => r.user_id).filter(Boolean)));
      const assignerIds = Array.from(
        new Set(roleRows.map((r) => r.assigned_by).filter((v): v is string => !!v))
      );

      const [{ data: userProfiles, error: userProfilesError }, { data: assignerProfiles, error: assignerProfilesError }] =
        await Promise.all([
          supabase
            .from('profiles')
            .select('id, first_name, last_name, email, department, position')
            .in('id', userIds),
          assignerIds.length
            ? supabase
                .from('profiles')
                .select('id, first_name, last_name')
                .in('id', assignerIds)
            : Promise.resolve({ data: [], error: null } as any),
        ]);

      if (userProfilesError) {
        console.error('Fetch attendance admins profiles error:', userProfilesError);
        throw userProfilesError;
      }
      if (assignerProfilesError) {
        console.error('Fetch attendance admins assigners error:', assignerProfilesError);
        throw assignerProfilesError;
      }

      const userProfileMap = new Map<string, NonNullable<AttendanceAdmin['profile']>>(
        (userProfiles || []).map((p: any) => [p.id as string, p as NonNullable<AttendanceAdmin['profile']>])
      );
      const assignerMap = new Map<string, { id: string; first_name: string; last_name: string }>(
        (assignerProfiles || []).map((p: any) => [p.id as string, p as { id: string; first_name: string; last_name: string }])
      );

      const merged: AttendanceAdmin[] = roleRows.map((r) => {
        const assigner = r.assigned_by ? assignerMap.get(r.assigned_by) : undefined;
        return {
          ...r,
          profile: userProfileMap.get(r.user_id),
          assigner: assigner ? { first_name: assigner.first_name, last_name: assigner.last_name } : undefined,
        };
      });

      setAttendanceAdmins(merged);
    } catch (error) {
      console.error('Error fetching attendance admins:', error);
      toast.error('Failed to load attendance admins');
    } finally {
      setLoading(false);
    }
  }, [profile]);

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

      // Optimistic UI update (safe) + refetch for truth
      setAttendanceAdmins((prev) =>
        prev.map((a) => (a.id === roleId ? { ...a, is_active: false } : a))
      );

      // Log the action
      await logAuditAction('role_revoked', 'role_management', userId, null, null, {
        role: 'attendance_admin',
        reason,
      });

      toast.success('Attendance admin role revoked');
      await fetchAttendanceAdmins();
      return { error: null };
    } catch (error: any) {
      console.error('Error revoking attendance admin:', error);
      toast.error(error?.message || 'Failed to revoke attendance admin role');
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

      // Optimistic UI update (safe) + refetch for truth
      setAttendanceAdmins((prev) => prev.filter((a) => a.id !== roleId));

      // Log the action
      await logAuditAction('role_deleted', 'role_management', userId, null, null, {
        role: 'attendance_admin',
        reason,
      });

      toast.success('Attendance admin role deleted permanently');
      await fetchAttendanceAdmins();
      return { error: null };
    } catch (error: any) {
      console.error('Error deleting attendance admin:', error);
      toast.error(error?.message || 'Failed to delete attendance admin role');
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
    if (profile) {
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
