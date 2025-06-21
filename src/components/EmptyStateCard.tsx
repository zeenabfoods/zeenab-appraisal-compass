
import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { FileText } from 'lucide-react';

interface EmptyStateCardProps {
  title: string;
  description?: string;
  buttonText: string;
  onButtonClick: () => void;
}

export function EmptyStateCard({
  title,
  description,
  buttonText,
  onButtonClick
}: EmptyStateCardProps) {
  return (
    <Card className="backdrop-blur-md bg-white/60 border-white/40">
      <CardContent className="flex flex-col items-center justify-center py-12">
        <FileText className="h-12 w-12 text-gray-400 mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">{title}</h3>
        {description && (
          <p className="text-gray-600 text-center mb-4">{description}</p>
        )}
        <Button onClick={onButtonClick}>
          {buttonText}
        </Button>
      </CardContent>
    </Card>
  );
}
