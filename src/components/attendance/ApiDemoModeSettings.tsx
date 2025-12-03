import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { AlertTriangle, Wifi, WifiOff } from 'lucide-react';
import { useApiDemoMode } from '@/hooks/attendance/useApiDemoMode';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

export function ApiDemoModeSettings() {
  const { apiDemoMode, loading, toggleApiDemoMode } = useApiDemoMode();

  return (
    <Card className="border-orange-500/30">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          {apiDemoMode ? (
            <WifiOff className="h-5 w-5 text-destructive" />
          ) : (
            <Wifi className="h-5 w-5 text-green-500" />
          )}
          API Demo Mode
        </CardTitle>
        <CardDescription>
          Toggle to simulate disconnected APIs for management demonstration
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between">
          <Label htmlFor="api-demo-mode" className="text-sm font-medium">
            Enable API Demo Mode
          </Label>
          <Switch
            id="api-demo-mode"
            checked={apiDemoMode}
            onCheckedChange={toggleApiDemoMode}
            disabled={loading}
          />
        </div>

        {apiDemoMode && (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>API Demo Mode Active</AlertTitle>
            <AlertDescription>
              The following features are simulated as disconnected:
              <ul className="list-disc list-inside mt-2 text-sm">
                <li>Location detection shows "Connect to API"</li>
                <li>Clock In/Out button displays API connection popup</li>
                <li>Distance calculations show "Connect to API"</li>
                <li>View Map button is disabled</li>
              </ul>
            </AlertDescription>
          </Alert>
        )}

        <p className="text-xs text-muted-foreground">
          Use this to demonstrate the need for Google Maps API and OneSignal 
          push notification services to management before purchasing.
        </p>
      </CardContent>
    </Card>
  );
}
