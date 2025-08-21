
import React from 'react';
import { Card, CardContent } from '@/components/ui/card';

export function DisciplinaryPanelManager() {
  return (
    <Card>
      <CardContent className="p-8 text-center">
        <h3 className="text-lg font-medium text-gray-900 mb-2">Disciplinary Panels</h3>
        <p className="text-gray-500">Manage disciplinary panels for employees with 3 failed attempts</p>
      </CardContent>
    </Card>
  );
}
