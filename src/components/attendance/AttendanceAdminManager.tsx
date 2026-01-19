import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { 
  Shield, 
  UserPlus, 
  UserMinus, 
  Search,
  Loader2,
  Calendar,
  Building2,
  Trash2
} from 'lucide-react';
import { useAttendanceRoles } from '@/hooks/attendance/useAttendanceRoles';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { format } from 'date-fns';

interface Profile {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  department: string | null;
  position: string | null;
}

export function AttendanceAdminManager() {
  const { 
    attendanceAdmins, 
    loading, 
    assignAttendanceAdmin, 
    revokeAttendanceAdmin,
    deleteAttendanceAdmin,
    refetch 
  } = useAttendanceRoles();
  
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Profile[]>([]);
  const [searching, setSearching] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState<Profile | null>(null);
  const [assignReason, setAssignReason] = useState('');
  const [revokeReason, setRevokeReason] = useState('');
  const [deleteReason, setDeleteReason] = useState('');
  const [isAssigning, setIsAssigning] = useState(false);
  const [isDeleting, setIsDeleting] = useState<string | null>(null);
  const [isRevoking, setIsRevoking] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  const searchEmployees = async (query: string) => {
    if (query.length < 2) {
      setSearchResults([]);
      return;
    }

    setSearching(true);
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, first_name, last_name, email, department, position')
        .eq('is_active', true)
        .or(`first_name.ilike.%${query}%,last_name.ilike.%${query}%,email.ilike.%${query}%`)
        .limit(10);

      if (error) throw error;

      // Filter out users who already have the role
      const existingAdminIds = attendanceAdmins
        .filter(a => a.is_active)
        .map(a => a.user_id);
      
      const filtered = (data || []).filter(p => !existingAdminIds.includes(p.id));
      setSearchResults(filtered);
    } catch (error) {
      console.error('Error searching employees:', error);
    } finally {
      setSearching(false);
    }
  };

  const handleAssign = async () => {
    if (!selectedEmployee) return;
    
    setIsAssigning(true);
    const { error } = await assignAttendanceAdmin(selectedEmployee.id, assignReason);
    setIsAssigning(false);
    
    if (!error) {
      setDialogOpen(false);
      setSelectedEmployee(null);
      setAssignReason('');
      setSearchQuery('');
      setSearchResults([]);
    }
  };

  const handleRevoke = async (roleId: string, userId: string) => {
    setIsRevoking(roleId);
    await revokeAttendanceAdmin(roleId, userId, revokeReason);
    setRevokeReason('');
    setIsRevoking(null);
  };

  const handleDelete = async (roleId: string, userId: string) => {
    setIsDeleting(roleId);
    await deleteAttendanceAdmin(roleId, userId, deleteReason);
    setDeleteReason('');
    setIsDeleting(null);
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5 text-primary" />
              Attendance Administrators
            </CardTitle>
            <CardDescription>
              Manage staff who can administer the attendance system
            </CardDescription>
          </div>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <UserPlus className="h-4 w-4 mr-2" />
                Assign Admin
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>Assign Attendance Admin Role</DialogTitle>
                <DialogDescription>
                  Search for an employee to grant attendance administration privileges
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Search Employee</Label>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search by name or email..."
                      value={searchQuery}
                      onChange={(e) => {
                        setSearchQuery(e.target.value);
                        searchEmployees(e.target.value);
                      }}
                      className="pl-10"
                    />
                  </div>
                </div>

                {searching && (
                  <div className="flex items-center justify-center py-4">
                    <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                  </div>
                )}

                {searchResults.length > 0 && (
                  <div className="border rounded-lg divide-y max-h-48 overflow-y-auto">
                    {searchResults.map((profile) => (
                      <button
                        key={profile.id}
                        onClick={() => {
                          setSelectedEmployee(profile);
                          setSearchResults([]);
                          setSearchQuery(`${profile.first_name} ${profile.last_name}`);
                        }}
                        className="w-full px-3 py-2 text-left hover:bg-muted/50 transition-colors"
                      >
                        <p className="font-medium text-sm">
                          {profile.first_name} {profile.last_name}
                        </p>
                        <p className="text-xs text-muted-foreground">{profile.email}</p>
                      </button>
                    ))}
                  </div>
                )}

                {selectedEmployee && (
                  <div className="bg-muted/50 rounded-lg p-3">
                    <p className="font-medium">
                      {selectedEmployee.first_name} {selectedEmployee.last_name}
                    </p>
                    <p className="text-sm text-muted-foreground">{selectedEmployee.email}</p>
                    {selectedEmployee.position && (
                      <p className="text-sm text-muted-foreground">{selectedEmployee.position}</p>
                    )}
                  </div>
                )}

                <div className="space-y-2">
                  <Label>Reason (Optional)</Label>
                  <Textarea
                    placeholder="Reason for assigning this role..."
                    value={assignReason}
                    onChange={(e) => setAssignReason(e.target.value)}
                    rows={2}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setDialogOpen(false)}>
                  Cancel
                </Button>
                <Button 
                  onClick={handleAssign} 
                  disabled={!selectedEmployee || isAssigning}
                >
                  {isAssigning ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Assigning...
                    </>
                  ) : (
                    'Assign Role'
                  )}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : attendanceAdmins.filter(a => a.is_active).length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Shield className="h-12 w-12 mx-auto mb-3 opacity-50" />
            <p>No attendance administrators assigned yet</p>
            <p className="text-sm">Click "Assign Admin" to add one</p>
          </div>
        ) : (
          <div className="space-y-3">
            {attendanceAdmins.filter(a => a.is_active).map((admin) => (
              <div 
                key={admin.id}
                className="flex items-center justify-between p-4 border rounded-lg bg-card hover:bg-muted/30 transition-colors"
              >
                <div className="flex items-center gap-4">
                  <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                    <Shield className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <p className="font-medium">
                      {admin.profile?.first_name} {admin.profile?.last_name}
                    </p>
                    <p className="text-sm text-muted-foreground">{admin.profile?.email}</p>
                    <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                      {admin.profile?.department && (
                        <span className="flex items-center gap-1">
                          <Building2 className="h-3 w-3" />
                          {admin.profile.department}
                        </span>
                      )}
                      <span className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        Assigned {format(new Date(admin.assigned_at), 'MMM d, yyyy')}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="secondary">Attendance Admin</Badge>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="ghost" size="sm" className="text-amber-600 hover:text-amber-700">
                        <UserMinus className="h-4 w-4" />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Revoke Attendance Admin Role</AlertDialogTitle>
                        <AlertDialogDescription>
                          Are you sure you want to revoke the attendance admin role from{' '}
                          <strong>{admin.profile?.first_name} {admin.profile?.last_name}</strong>?
                          They will no longer be able to manage attendance settings. The role can be reassigned later.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <div className="py-2">
                        <Label>Reason (Optional)</Label>
                        <Textarea
                          placeholder="Reason for revoking this role..."
                          value={revokeReason}
                          onChange={(e) => setRevokeReason(e.target.value)}
                          rows={2}
                          className="mt-2"
                        />
                      </div>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={() => handleRevoke(admin.id, admin.user_id)}
                          disabled={isRevoking === admin.id}
                          className="bg-amber-600 text-white hover:bg-amber-700"
                        >
                          {isRevoking === admin.id ? (
                            <>
                              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                              Revoking...
                            </>
                          ) : (
                            'Revoke Role'
                          )}
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive">
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Delete Attendance Admin Role</AlertDialogTitle>
                        <AlertDialogDescription>
                          Are you sure you want to permanently delete the attendance admin role for{' '}
                          <strong>{admin.profile?.first_name} {admin.profile?.last_name}</strong>?
                          This action cannot be undone.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <div className="py-2">
                        <Label>Reason (Optional)</Label>
                        <Textarea
                          placeholder="Reason for deleting this role..."
                          value={deleteReason}
                          onChange={(e) => setDeleteReason(e.target.value)}
                          rows={2}
                          className="mt-2"
                        />
                      </div>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={() => handleDelete(admin.id, admin.user_id)}
                          disabled={isDeleting === admin.id}
                          className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        >
                          {isDeleting === admin.id ? (
                            <>
                              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                              Deleting...
                            </>
                          ) : (
                            'Delete Permanently'
                          )}
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
