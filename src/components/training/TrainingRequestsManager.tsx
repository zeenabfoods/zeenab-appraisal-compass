
import React from 'react';
import { Card, CardContent } from '@/components/ui/card';

export function TrainingRequestsManager() {
  return (
    <Card>
      <CardContent className="p-8 text-center">
        <h3 className="text-lg font-medium text-gray-900 mb-2">Training Requests</h3>
        <p className="text-gray-500">Committee training requests will be managed here</p>
      </CardContent>
    </Card>
  );
}
