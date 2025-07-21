
import { DashboardLayout } from '@/components/DashboardLayout';
import { QuestionTemplateManager } from '@/components/QuestionTemplateManager';

export default function QuestionTemplates() {
  return (
    <DashboardLayout pageTitle="Question Templates">
      <QuestionTemplateManager />
    </DashboardLayout>
  );
}
