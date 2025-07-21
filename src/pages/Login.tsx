
import { DashboardLayout } from '@/components/DashboardLayout';
import { SignInForm } from '@/components/auth/SignInForm';

export default function Login() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 via-white to-red-50">
      <div className="min-h-screen flex items-center justify-center">
        <div className="max-w-md w-full space-y-8">
          <div className="text-center">
            <h2 className="mt-6 text-3xl font-extrabold text-gray-900">
              Sign in to your account
            </h2>
          </div>
          <SignInForm />
        </div>
      </div>
    </div>
  );
}
