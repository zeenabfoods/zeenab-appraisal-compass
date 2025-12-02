import React, { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Key, Copy, Eye, EyeOff } from 'lucide-react';

interface PasswordResetDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  employeeId: string;
  employeeName: string;
}

export function PasswordResetDialog({
  open,
  onOpenChange,
  employeeId,
  employeeName
}: PasswordResetDialogProps) {
  const [tempPassword, setTempPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [resetting, setResetting] = useState(false);
  const { toast } = useToast();

  const generateTempPassword = () => {
    const length = 10;
    const charset = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%';
    let password = '';
    for (let i = 0; i < length; i++) {
      password += charset.charAt(Math.floor(Math.random() * charset.length));
    }
    setTempPassword(password);
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(tempPassword);
    toast({
      title: "Copied!",
      description: "Temporary password copied to clipboard"
    });
  };

  const handleResetPassword = async () => {
    if (!tempPassword || tempPassword.length < 6) {
      toast({
        title: "Invalid Password",
        description: "Password must be at least 6 characters long",
        variant: "destructive"
      });
      return;
    }

    setResetting(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        throw new Error('No active session');
      }

      const response = await supabase.functions.invoke('admin-reset-password', {
        body: {
          employee_id: employeeId,
          new_password: tempPassword
        }
      });

      if (response.error) {
        throw response.error;
      }

      if (response.data?.error) {
        throw new Error(response.data.error);
      }

      toast({
        title: "Password Reset Successful",
        description: `Temporary password set for ${employeeName}. Share this password securely with the employee.`,
      });

      // Keep dialog open so HR can copy the password
      setTimeout(() => {
        const shouldClose = window.confirm(
          `Password reset successful!\n\nTemporary Password: ${tempPassword}\n\nHave you shared this password with ${employeeName}?\n\nClick OK to close this dialog, or Cancel to keep it open.`
        );
        if (shouldClose) {
          onOpenChange(false);
          setTempPassword('');
        }
      }, 500);

    } catch (error: any) {
      console.error('Error resetting password:', error);
      toast({
        title: "Password Reset Failed",
        description: error.message || "Failed to reset employee password",
        variant: "destructive"
      });
    } finally {
      setResetting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Key className="h-5 w-5 text-orange-600" />
            Reset Password
          </DialogTitle>
          <DialogDescription>
            Set a temporary password for <strong>{employeeName}</strong>
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="temp_password">Temporary Password</Label>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Input
                  id="temp_password"
                  type={showPassword ? "text" : "password"}
                  value={tempPassword}
                  onChange={(e) => setTempPassword(e.target.value)}
                  placeholder="Enter temporary password"
                  className="pr-10"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4 text-gray-400" />
                  ) : (
                    <Eye className="h-4 w-4 text-gray-400" />
                  )}
                </Button>
              </div>
              <Button
                type="button"
                variant="outline"
                onClick={generateTempPassword}
                className="shrink-0"
              >
                Generate
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              Minimum 6 characters. Click "Generate" for a random secure password.
            </p>
          </div>

          {tempPassword && (
            <div className="flex items-center gap-2 p-3 bg-orange-50 rounded-md border border-orange-200">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={copyToClipboard}
                className="hover:bg-orange-100"
              >
                <Copy className="h-4 w-4" />
              </Button>
              <span className="text-sm font-mono flex-1 break-all">
                {showPassword ? tempPassword : '••••••••••'}
              </span>
            </div>
          )}

          <div className="bg-amber-50 border border-amber-200 rounded-md p-3 space-y-1">
            <p className="text-sm font-medium text-amber-900">⚠️ Important:</p>
            <ul className="text-xs text-amber-800 space-y-1 list-disc list-inside">
              <li>Share this temporary password securely with the employee</li>
              <li>Employee should change this password after logging in</li>
              <li>Copy the password before closing this dialog</li>
            </ul>
          </div>
        </div>
        
        <div className="flex gap-2 pt-2">
          <Button 
            onClick={handleResetPassword}
            disabled={resetting || !tempPassword}
            className="flex-1 bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600"
          >
            {resetting ? 'Resetting...' : 'Reset Password'}
          </Button>
          <Button 
            type="button" 
            variant="outline" 
            onClick={() => {
              onOpenChange(false);
              setTempPassword('');
            }}
            disabled={resetting}
          >
            Cancel
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
