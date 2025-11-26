import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Calendar, Play, Loader2, CheckCircle, AlertCircle, Clock } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';

export function AutomaticChargeCalculation() {
  const [loading, setLoading] = useState(false);
  const [targetDate, setTargetDate] = useState('');
  const [lastRun, setLastRun] = useState<{
    date: string;
    chargesCreated: number;
    errors?: string[];
  } | null>(null);

  const runCalculation = async (date?: string) => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('calculate-daily-charges', {
        body: date ? { targetDate: date } : {},
      });

      if (error) throw error;

      setLastRun({
        date: data.date,
        chargesCreated: data.chargesCreated,
        errors: data.errors,
      });

      toast.success(
        `Calculation complete! ${data.chargesCreated} charge${data.chargesCreated !== 1 ? 's' : ''} created.`
      );
    } catch (error) {
      console.error('Error running charge calculation:', error);
      toast.error('Failed to calculate charges');
    } finally {
      setLoading(false);
    }
  };

  const handleRunForDate = () => {
    if (!targetDate) {
      toast.error('Please select a date');
      return;
    }
    runCalculation(targetDate);
  };

  const handleRunForYesterday = () => {
    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const dateStr = yesterday.toISOString().split('T')[0];
    runCalculation(dateStr);
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Automatic Charge Calculation Engine
          </CardTitle>
          <CardDescription>
            Run daily charge calculations based on attendance logs, configured rules, and escalation
            multipliers
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              This engine automatically calculates and applies financial charges for late arrivals and
              absences based on your configured rules. Charges are calculated with escalation multipliers
              for repeated offenses.
            </AlertDescription>
          </Alert>

          <div className="space-y-4">
            <div>
              <h3 className="text-sm font-medium mb-3">Quick Actions</h3>
              <div className="flex gap-3">
                <Button
                  onClick={handleRunForYesterday}
                  disabled={loading}
                  className="flex-1"
                >
                  {loading ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Play className="h-4 w-4 mr-2" />
                  )}
                  Calculate for Yesterday
                </Button>
              </div>
            </div>

            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-background px-2 text-muted-foreground">Or</span>
              </div>
            </div>

            <div>
              <h3 className="text-sm font-medium mb-3">Calculate for Specific Date</h3>
              <div className="flex gap-3">
                <div className="flex-1">
                  <Label htmlFor="targetDate" className="sr-only">
                    Target Date
                  </Label>
                  <Input
                    id="targetDate"
                    type="date"
                    value={targetDate}
                    onChange={(e) => setTargetDate(e.target.value)}
                    max={new Date().toISOString().split('T')[0]}
                  />
                </div>
                <Button onClick={handleRunForDate} disabled={loading || !targetDate}>
                  {loading ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Calendar className="h-4 w-4 mr-2" />
                  )}
                  Run Calculation
                </Button>
              </div>
            </div>
          </div>

          {lastRun && (
            <div className="p-4 rounded-lg border bg-muted/50">
              <div className="flex items-start justify-between mb-2">
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-5 w-5 text-green-600" />
                  <h4 className="font-medium">Last Calculation Result</h4>
                </div>
                <Badge variant="secondary">{lastRun.date}</Badge>
              </div>
              <p className="text-sm text-muted-foreground mb-3">
                {lastRun.chargesCreated} charge{lastRun.chargesCreated !== 1 ? 's' : ''} created
                and notifications sent to affected employees.
              </p>
              {lastRun.errors && lastRun.errors.length > 0 && (
                <div className="space-y-1">
                  <p className="text-sm font-medium text-destructive">Errors:</p>
                  {lastRun.errors.map((error, idx) => (
                    <p key={idx} className="text-xs text-muted-foreground">
                      • {error}
                    </p>
                  ))}
                </div>
              )}
            </div>
          )}

          <div className="pt-4 border-t">
            <h4 className="text-sm font-medium mb-2">How It Works</h4>
            <ul className="text-sm text-muted-foreground space-y-1">
              <li>• Scans all attendance logs for the specified date</li>
              <li>• Checks for late arrivals exceeding grace period</li>
              <li>• Identifies absences (no clock-in records)</li>
              <li>• Applies escalation multipliers for repeated offenses</li>
              <li>• Creates charge records with audit trail</li>
              <li>• Sends automated notifications to employees</li>
            </ul>
          </div>

          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription className="text-xs">
              <strong>Tip:</strong> You can set up a daily cron job to automatically run this
              calculation every morning for the previous day's attendance.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    </div>
  );
}
