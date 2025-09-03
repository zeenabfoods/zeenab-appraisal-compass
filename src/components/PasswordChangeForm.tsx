import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Lock, Eye, EyeOff } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

export function PasswordChangeForm() {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const validatePassword = (password: string) => {
    const minLength = password.length >= 8;
    const hasUpperCase = /[A-Z]/.test(password);
    const hasLowerCase = /[a-z]/.test(password);
    const hasNumbers = /\d/.test(password);
    const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>]/.test(password);
    
    return {
      isValid: minLength && hasUpperCase && hasLowerCase && hasNumbers && hasSpecialChar,
      errors: {
        minLength: !minLength ? 'Password must be at least 8 characters long' : null,
        hasUpperCase: !hasUpperCase ? 'Password must contain at least one uppercase letter' : null,
        hasLowerCase: !hasLowerCase ? 'Password must contain at least one lowercase letter' : null,
        hasNumbers: !hasNumbers ? 'Password must contain at least one number' : null,
        hasSpecialChar: !hasSpecialChar ? 'Password must contain at least one special character' : null
      }
    };
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Validate inputs
      if (!currentPassword || !newPassword || !confirmPassword) {
        toast({
          title: "Validation Error",
          description: "All fields are required",
          variant: "destructive"
        });
        return;
      }

      if (newPassword !== confirmPassword) {
        toast({
          title: "Validation Error",
          description: "New passwords do not match",
          variant: "destructive"
        });
        return;
      }

      const passwordValidation = validatePassword(newPassword);
      if (!passwordValidation.isValid) {
        const errorMessage = Object.values(passwordValidation.errors)
          .filter(error => error !== null)
          .join('. ');
        toast({
          title: "Password Requirements Not Met",
          description: errorMessage,
          variant: "destructive"
        });
        return;
      }

      if (currentPassword === newPassword) {
        toast({
          title: "Validation Error",
          description: "New password must be different from current password",
          variant: "destructive"
        });
        return;
      }

      // First, verify current password by trying to sign in with it
      const { data: currentUser } = await supabase.auth.getUser();
      if (!currentUser.user?.email) {
        toast({
          title: "Authentication Error",
          description: "Unable to verify current user",
          variant: "destructive"
        });
        return;
      }

      // Verify current password
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: currentUser.user.email,
        password: currentPassword
      });

      if (signInError) {
        toast({
          title: "Authentication Error",
          description: "Current password is incorrect",
          variant: "destructive"
        });
        return;
      }

      // Update password
      const { error: updateError } = await supabase.auth.updateUser({
        password: newPassword
      });

      if (updateError) {
        console.error('Password update error:', updateError);
        toast({
          title: "Update Error",
          description: updateError.message || "Failed to update password",
          variant: "destructive"
        });
        return;
      }

      // Success
      toast({
        title: "Success",
        description: "Password updated successfully"
      });

      // Clear form
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');

    } catch (error) {
      console.error('Password change error:', error);
      toast({
        title: "Error",
        description: "An unexpected error occurred. Please try again.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const passwordValidation = validatePassword(newPassword);

  return (
    <Card className="backdrop-blur-md bg-white/60 border-white/40 shadow-lg">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Lock className="h-5 w-5" />
          Change Password
        </CardTitle>
        <CardDescription>
          Update your account password. Your new password must meet security requirements.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Current Password */}
          <div className="space-y-2">
            <Label htmlFor="currentPassword">Current Password</Label>
            <div className="relative">
              <Input
                id="currentPassword"
                type={showCurrentPassword ? "text" : "password"}
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                placeholder="Enter your current password"
                disabled={loading}
              />
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                onClick={() => setShowCurrentPassword(!showCurrentPassword)}
              >
                {showCurrentPassword ? (
                  <EyeOff className="h-4 w-4" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
              </Button>
            </div>
          </div>

          {/* New Password */}
          <div className="space-y-2">
            <Label htmlFor="newPassword">New Password</Label>
            <div className="relative">
              <Input
                id="newPassword"
                type={showNewPassword ? "text" : "password"}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Enter your new password"
                disabled={loading}
              />
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                onClick={() => setShowNewPassword(!showNewPassword)}
              >
                {showNewPassword ? (
                  <EyeOff className="h-4 w-4" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
              </Button>
            </div>
            
            {/* Password Requirements */}
            {newPassword && (
              <div className="space-y-1 text-xs">
                <div className={`flex items-center gap-1 ${passwordValidation.errors.minLength ? 'text-red-600' : 'text-green-600'}`}>
                  <span>{passwordValidation.errors.minLength ? '✗' : '✓'}</span>
                  <span>At least 8 characters</span>
                </div>
                <div className={`flex items-center gap-1 ${passwordValidation.errors.hasUpperCase ? 'text-red-600' : 'text-green-600'}`}>
                  <span>{passwordValidation.errors.hasUpperCase ? '✗' : '✓'}</span>
                  <span>One uppercase letter</span>
                </div>
                <div className={`flex items-center gap-1 ${passwordValidation.errors.hasLowerCase ? 'text-red-600' : 'text-green-600'}`}>
                  <span>{passwordValidation.errors.hasLowerCase ? '✗' : '✓'}</span>
                  <span>One lowercase letter</span>
                </div>
                <div className={`flex items-center gap-1 ${passwordValidation.errors.hasNumbers ? 'text-red-600' : 'text-green-600'}`}>
                  <span>{passwordValidation.errors.hasNumbers ? '✗' : '✓'}</span>
                  <span>One number</span>
                </div>
                <div className={`flex items-center gap-1 ${passwordValidation.errors.hasSpecialChar ? 'text-red-600' : 'text-green-600'}`}>
                  <span>{passwordValidation.errors.hasSpecialChar ? '✗' : '✓'}</span>
                  <span>One special character</span>
                </div>
              </div>
            )}
          </div>

          {/* Confirm Password */}
          <div className="space-y-2">
            <Label htmlFor="confirmPassword">Confirm New Password</Label>
            <div className="relative">
              <Input
                id="confirmPassword"
                type={showConfirmPassword ? "text" : "password"}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Confirm your new password"
                disabled={loading}
              />
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
              >
                {showConfirmPassword ? (
                  <EyeOff className="h-4 w-4" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
              </Button>
            </div>
            {confirmPassword && newPassword !== confirmPassword && (
              <p className="text-xs text-red-600">Passwords do not match</p>
            )}
          </div>

          {/* Submit Button */}
          <Button
            type="submit"
            disabled={loading || !passwordValidation.isValid || newPassword !== confirmPassword}
            className="w-full"
          >
            {loading ? "Updating Password..." : "Update Password"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}