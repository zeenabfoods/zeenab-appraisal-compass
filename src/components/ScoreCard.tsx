
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

interface ScoreCardProps {
  title: string;
  value: string | number | null;
  trend?: 'up' | 'down' | 'stable' | null;
  maxValue?: number;
  description?: string;
  variant?: 'default' | 'pending' | 'completed';
}

export function ScoreCard({ 
  title, 
  value, 
  trend, 
  maxValue = 100, 
  description,
  variant = 'default' 
}: ScoreCardProps) {
  const getTrendIcon = () => {
    switch (trend) {
      case 'up': return <TrendingUp className="h-4 w-4 text-green-600" />;
      case 'down': return <TrendingDown className="h-4 w-4 text-red-600" />;
      case 'stable': return <Minus className="h-4 w-4 text-gray-600" />;
      default: return null;
    }
  };

  const getTrendColor = () => {
    switch (trend) {
      case 'up': return 'text-green-600';
      case 'down': return 'text-red-600';
      case 'stable': return 'text-gray-600';
      default: return '';
    }
  };

  const getVariantStyles = () => {
    switch (variant) {
      case 'pending': return 'border-l-4 border-l-orange-500 bg-orange-50';
      case 'completed': return 'border-l-4 border-l-green-500 bg-green-50';
      default: return 'border-l-4 border-l-blue-500 bg-blue-50';
    }
  };

  const formatValue = () => {
    if (value === null || value === undefined) {
      return 'Pending';
    }
    
    if (typeof value === 'number') {
      return `${value}/${maxValue}`;
    }
    
    return value;
  };

  return (
    <Card className={`hover:shadow-md transition-shadow ${getVariantStyles()}`}>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium text-gray-600">
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <span className="text-2xl font-bold text-gray-900">
              {formatValue()}
            </span>
            {trend && (
              <div className={`flex items-center space-x-1 ${getTrendColor()}`}>
                {getTrendIcon()}
              </div>
            )}
          </div>
          {value !== null && value !== undefined && typeof value === 'number' && (
            <Badge 
              variant={value >= 80 ? 'default' : value >= 60 ? 'secondary' : 'destructive'}
              className="ml-2"
            >
              {value >= 80 ? 'Excellent' : value >= 60 ? 'Good' : 'Needs Improvement'}
            </Badge>
          )}
        </div>
        {description && (
          <p className="text-sm text-gray-500 mt-2">{description}</p>
        )}
      </CardContent>
    </Card>
  );
}
