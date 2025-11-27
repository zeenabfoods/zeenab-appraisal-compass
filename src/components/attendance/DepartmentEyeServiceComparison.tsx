import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Building2, TrendingDown, TrendingUp } from 'lucide-react';
import { DepartmentEyeServiceSummary } from '@/utils/eyeServiceDetection';

interface DepartmentEyeServiceComparisonProps {
  departments: DepartmentEyeServiceSummary[];
}

export function DepartmentEyeServiceComparison({ departments }: DepartmentEyeServiceComparisonProps) {
  if (departments.length === 0) {
    return (
      <Card>
        <CardContent className="pt-6 text-center">
          <p className="text-muted-foreground">No department data available</p>
        </CardContent>
      </Card>
    );
  }

  const getRiskPercentage = (dept: DepartmentEyeServiceSummary, level: 'low' | 'medium' | 'high') => {
    const count = level === 'low' ? dept.lowRiskCount : 
                  level === 'medium' ? dept.mediumRiskCount : 
                  dept.highRiskCount;
    return Math.round((count / dept.totalEmployees) * 100);
  };

  // Sort departments by consistency score (descending)
  const sortedDepartments = [...departments].sort((a, b) => 
    b.avgConsistencyScore - a.avgConsistencyScore
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Building2 className="h-5 w-5" />
          Department Comparison
        </CardTitle>
        <CardDescription>
          Behavioral consistency analysis across departments
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          {sortedDepartments.map((dept, index) => {
            const isTopPerformer = index === 0;
            const isBottomPerformer = index === sortedDepartments.length - 1 && sortedDepartments.length > 1;

            return (
              <div key={dept.departmentId} className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <h4 className="font-semibold">{dept.departmentName}</h4>
                    {isTopPerformer && (
                      <Badge className="bg-green-500 text-white">
                        <TrendingUp className="h-3 w-3 mr-1" />
                        Best
                      </Badge>
                    )}
                    {isBottomPerformer && dept.avgConsistencyScore < 60 && (
                      <Badge variant="destructive">
                        <TrendingDown className="h-3 w-3 mr-1" />
                        Needs Attention
                      </Badge>
                    )}
                  </div>
                  <div className="text-right">
                    <div className="text-2xl font-bold">{dept.avgConsistencyScore}%</div>
                    <div className="text-xs text-muted-foreground">Avg Consistency</div>
                  </div>
                </div>

                <Progress value={dept.avgConsistencyScore} className="h-2" />

                <div className="grid grid-cols-4 gap-2 text-sm">
                  <div className="text-center p-2 bg-muted rounded">
                    <div className="font-semibold text-lg">{dept.totalEmployees}</div>
                    <div className="text-xs text-muted-foreground">Employees</div>
                  </div>
                  <div className="text-center p-2 bg-green-50 dark:bg-green-950/20 rounded">
                    <div className="font-semibold text-lg text-green-600">
                      {getRiskPercentage(dept, 'low')}%
                    </div>
                    <div className="text-xs text-muted-foreground">Low Risk</div>
                  </div>
                  <div className="text-center p-2 bg-yellow-50 dark:bg-yellow-950/20 rounded">
                    <div className="font-semibold text-lg text-yellow-600">
                      {getRiskPercentage(dept, 'medium')}%
                    </div>
                    <div className="text-xs text-muted-foreground">Medium</div>
                  </div>
                  <div className="text-center p-2 bg-red-50 dark:bg-red-950/20 rounded">
                    <div className="font-semibold text-lg text-red-600">
                      {getRiskPercentage(dept, 'high')}%
                    </div>
                    <div className="text-xs text-muted-foreground">High Risk</div>
                  </div>
                </div>

                {dept.topPatterns.length > 0 && (
                  <div className="pt-2">
                    <div className="text-xs font-semibold text-muted-foreground mb-1">
                      Top Patterns:
                    </div>
                    <div className="flex flex-wrap gap-1">
                      {dept.topPatterns.map((pattern, idx) => (
                        <Badge key={idx} variant="outline" className="text-xs">
                          {pattern.type} ({pattern.occurrences})
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                {index < sortedDepartments.length - 1 && (
                  <div className="border-b my-4" />
                )}
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
