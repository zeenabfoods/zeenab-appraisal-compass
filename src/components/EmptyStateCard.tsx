
import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';

interface EmptyStateCardProps {
  title: string;
  buttonText: string;
  onButtonClick: () => void;
}

export function EmptyStateCard({ title, buttonText, onButtonClick }: EmptyStateCardProps) {
  return (
    <Card>
      <CardContent className="p-12 text-center">
        <p className="text-gray-500 mb-4">{title}</p>
        <Button onClick={onButtonClick}>
          <Plus className="h-4 w-4 mr-2" />
          {buttonText}
        </Button>
      </CardContent>
    </Card>
  );
}
