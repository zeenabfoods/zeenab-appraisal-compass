
import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Users, Plus } from 'lucide-react';

interface EmployeeEmptyStateProps {
  hasEmployees: boolean;
  isFiltered: boolean;
}

export default function EmployeeEmptyState({
  hasEmployees,
  isFiltered
}: EmployeeEmptyStateProps) {
  return (
    <Card className="backdrop-blur-md bg-white/60 border-white/40">
      <CardContent className="flex flex-col items-center justify-center py-12">
        <Users className="h-12 w-12 text-gray-400 mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">
          {isFiltered ? 'No employees found' : 'No employees yet'}
        </h3>
        <p className="text-gray-600 text-center mb-4">
          {isFiltered 
            ? 'Try adjusting your search or filter criteria'
            : 'Get started by adding your first employee'
          }
        </p>
        {!hasEmployees && (
          <Button className="bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600">
            <Plus className="h-4 w-4 mr-2" />
            Add First Employee
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
