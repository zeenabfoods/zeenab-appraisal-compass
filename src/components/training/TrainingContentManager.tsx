
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ArrowLeft, Plus, FileText, Users } from 'lucide-react';
import { CreateTrainingDialog } from './CreateTrainingDialog';
import { TrainingContentList } from './TrainingContentList';
import { BulkTrainingAssignment } from './BulkTrainingAssignment';

interface TrainingContentManagerProps {
  onBack: () => void;
}

export function TrainingContentManager({ onBack }: TrainingContentManagerProps) {
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  const handleTrainingCreated = () => {
    setRefreshTrigger(prev => prev + 1);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button onClick={onBack} variant="outline" size="sm">
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Training Content Management</h2>
          <p className="text-gray-600">Create, manage, and assign training content</p>
        </div>
        <div className="ml-auto">
          <CreateTrainingDialog onTrainingCreated={handleTrainingCreated} />
        </div>
      </div>

      <Tabs defaultValue="content" className="w-full">
        <TabsList>
          <TabsTrigger value="content" className="flex items-center gap-2">
            <FileText className="h-4 w-4" />
            Training Content
          </TabsTrigger>
          <TabsTrigger value="assignments" className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            Bulk Assignment
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="content" className="space-y-6">
          <TrainingContentList key={refreshTrigger} />
        </TabsContent>
        
        <TabsContent value="assignments" className="space-y-6">
          <BulkTrainingAssignment onAssignmentComplete={handleTrainingCreated} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
