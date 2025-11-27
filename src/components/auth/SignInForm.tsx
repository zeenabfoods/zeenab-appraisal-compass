
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useAuthContext } from '@/components/AuthProvider';

interface SignInFormProps {
  onSubmit: (e: React.FormEvent<HTMLFormElement>) => Promise<void>;
  loading: boolean;
}

export function SignInForm({ onSubmit, loading }: SignInFormProps) {
  const { resetPassword } = useAuthContext();
  const [forgotPasswordOpen, setForgotPasswordOpen] = useState(false);
  const [resetEmail, setResetEmail] = useState('');
  const [resetLoading, setResetLoading] = useState(false);

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setResetLoading(true);
    await resetPassword(resetEmail);
    setResetLoading(false);
    setForgotPasswordOpen(false);
    setResetEmail('');
  };

  return (
    <>
      <form onSubmit={onSubmit} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            name="email"
            type="email"
            placeholder="Enter your email"
            className="backdrop-blur-sm bg-white/70 border-white/40"
            required
          />
        </div>
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label htmlFor="password">Password</Label>
            <Dialog open={forgotPasswordOpen} onOpenChange={setForgotPasswordOpen}>
              <DialogTrigger asChild>
                <button
                  type="button"
                  className="text-sm text-orange-600 hover:text-orange-700 font-medium"
                >
                  Forgot Password?
                </button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Reset Password</DialogTitle>
                  <DialogDescription>
                    Enter your email address and we'll send you a link to reset your password.
                  </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleForgotPassword} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="reset-email">Email</Label>
                    <Input
                      id="reset-email"
                      type="email"
                      placeholder="Enter your email"
                      value={resetEmail}
                      onChange={(e) => setResetEmail(e.target.value)}
                      required
                    />
                  </div>
                  <Button
                    type="submit"
                    className="w-full bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600"
                    disabled={resetLoading}
                  >
                    {resetLoading ? 'Sending...' : 'Send Reset Link'}
                  </Button>
                </form>
              </DialogContent>
            </Dialog>
          </div>
          <Input
            id="password"
            name="password"
            type="password"
            placeholder="Enter your password"
            className="backdrop-blur-sm bg-white/70 border-white/40"
            required
          />
        </div>
        <Button type="submit" className="w-full bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 shadow-lg" disabled={loading}>
          {loading ? 'Signing in...' : 'Sign In'}
        </Button>
      </form>
    </>
  );
}
