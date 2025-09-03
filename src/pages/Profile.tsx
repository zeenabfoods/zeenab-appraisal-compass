
import { DashboardLayout } from '@/components/DashboardLayout';
import { EmployeeProfileCard } from '@/components/EmployeeProfileCard';
import { PasswordChangeForm } from '@/components/PasswordChangeForm';
import { useEnhancedProfile } from '@/hooks/useEnhancedProfile';

export default function Profile() {
  const { enhancedProfile, loading } = useEnhancedProfile();

  if (loading) {
    return (
      <DashboardLayout pageTitle="My Profile">
        <div className="flex items-center justify-center min-h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-600"></div>
        </div>
      </DashboardLayout>
    );
  }

  if (!enhancedProfile) {
    return (
      <DashboardLayout pageTitle="My Profile">
        <div className="text-center py-8">
          <p className="text-gray-600">Unable to load profile information.</p>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout pageTitle="My Profile">
      <div className="max-w-4xl mx-auto space-y-6">
        <EmployeeProfileCard 
          profile={enhancedProfile}
        />
        <PasswordChangeForm />
      </div>
    </DashboardLayout>
  );
}
