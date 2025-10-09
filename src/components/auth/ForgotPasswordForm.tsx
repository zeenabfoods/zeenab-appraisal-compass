import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { CheckCircle2 } from 'lucide-react';

interface ForgotPasswordFormProps {
  onSubmit: (email: string) => Promise<void>;
  onBack: () => void;
  loading: boolean;
}

export function ForgotPasswordForm({ onSubmit, onBack, loading }: ForgotPasswordFormProps) {
  const [email, setEmail] = useState('');
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await onSubmit(email);
    setSubmitted(true);
  };

  if (submitted) {
    return (
      <div className="space-y-4">
        <Alert className="bg-green-50 border-green-200">
          <CheckCircle2 className="h-4 w-4 text-green-600" />
          <AlertDescription className="text-green-800">
            Password reset email sent! Check your inbox and click the link to reset your password.
          </AlertDescription>
        </Alert>
        <Button
          type="button"
          onClick={onBack}
          variant="outline"
          className="w-full"
        >
          Back to Sign In
        </Button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="reset-email">Email Address</Label>
        <Input
          id="reset-email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="Enter your email"
          className="backdrop-blur-sm bg-white/70 border-white/40"
          required
        />
        <p className="text-sm text-muted-foreground">
          We'll send you a link to reset your password
        </p>
      </div>
      <Button 
        type="submit" 
        className="w-full bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 shadow-lg" 
        disabled={loading}
      >
        {loading ? 'Sending...' : 'Send Reset Link'}
      </Button>
      <Button
        type="button"
        onClick={onBack}
        variant="ghost"
        className="w-full"
        disabled={loading}
      >
        Back to Sign In
      </Button>
    </form>
  );
}
