import { DashboardLayout } from '@/components/DashboardLayout';
import { PushNotificationBroadcast } from '@/components/PushNotificationBroadcast';

export default function PushBroadcast() {
  return (
    <DashboardLayout pageTitle="Push Notifications" showSearch={false}>
      <div className="max-w-2xl">
        <PushNotificationBroadcast />
      </div>
    </DashboardLayout>
  );
}
