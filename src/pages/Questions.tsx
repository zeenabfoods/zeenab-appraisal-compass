
import { DashboardLayout } from '@/components/DashboardLayout';
import { QuestionTemplateManager } from '@/components/QuestionTemplateManager';

export default function Questions() {
  return (
    <DashboardLayout pageTitle="Questions">
      <QuestionTemplateManager />
    </DashboardLayout>
  );
}
