import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Bell, Eye, EyeOff, Save, TestTube, Loader2, ExternalLink, BellRing, CheckCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useOneSignal } from '@/hooks/useOneSignal';
export function OneSignalConfig() {
  const [appId, setAppId] = useState('');
  const [restApiKey, setRestApiKey] = useState('');
  const [showApiKey, setShowApiKey] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubscribing, setIsSubscribing] = useState(false);
  
  const { isInitialized, isSubscribed, requestPermission } = useOneSignal();

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const { data, error } = await supabase
        .from('attendance_settings')
        .select('*')
        .maybeSingle();

      const settings = data as Record<string, unknown> | null;
      if (settings?.onesignal_app_id) {
        setAppId(settings.onesignal_app_id as string);
      }
    } catch (error) {
      console.error('Error loading OneSignal settings:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async () => {
    if (!appId.trim()) {
      toast.error('Please enter OneSignal App ID');
      return;
    }

    setIsSaving(true);
    try {
      // Check if settings record exists
      const { data: existing } = await supabase
        .from('attendance_settings')
        .select('id')
        .limit(1)
        .maybeSingle();

      if (existing) {
        // Update existing record
        const { error: updateError } = await supabase
          .from('attendance_settings')
          .update({
            onesignal_app_id: appId.trim(),
            updated_at: new Date().toISOString(),
          })
          .eq('id', existing.id);

        if (updateError) throw updateError;
      } else {
        // Insert new record
        const { error: insertError } = await supabase
          .from('attendance_settings')
          .insert({
            onesignal_app_id: appId.trim(),
          });

        if (insertError) throw insertError;
      }

      toast.success('OneSignal App ID saved successfully');
    } catch (error: any) {
      console.error('Error saving OneSignal settings:', error);
      toast.error('Failed to save settings');
    } finally {
      setIsSaving(false);
    }
  };

  const handleTestNotification = async () => {
    setIsTesting(true);
    try {
      const { data, error } = await supabase.functions.invoke('send-push-notification', {
        body: {
          title: 'Test Notification',
          message: 'This is a test notification from the Smart Attendance System!',
          segments: ['All'],
        },
      });

      if (error) throw error;

      toast.success('Test notification sent! Check your devices.');
    } catch (error: any) {
      console.error('Error sending test notification:', error);
      toast.error(error.message || 'Failed to send test notification');
    } finally {
      setIsTesting(false);
    }
  };

  const handleSubscribe = async () => {
    setIsSubscribing(true);
    try {
      const granted = await requestPermission();
      if (granted) {
        toast.success('Successfully subscribed to push notifications!');
      } else {
        toast.error('Notification permission denied. Please enable notifications in your browser settings.');
      }
    } catch (error: any) {
      console.error('Error subscribing to notifications:', error);
      toast.error('Failed to subscribe to notifications');
    } finally {
      setIsSubscribing(false);
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Bell className="h-5 w-5 text-primary" />
          Push Notifications (OneSignal)
        </CardTitle>
        <CardDescription>
          Configure OneSignal for push notifications that work even when the app is closed
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="bg-muted/50 rounded-lg p-4 space-y-2">
          <h4 className="font-medium text-sm">Setup Instructions:</h4>
          <ol className="text-sm text-muted-foreground list-decimal list-inside space-y-1">
            <li>Sign up at <a href="https://onesignal.com" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline inline-flex items-center gap-1">OneSignal.com <ExternalLink className="h-3 w-3" /></a></li>
            <li>Create a new app and select "Web" platform</li>
            <li>Copy your App ID and REST API Key from Settings → Keys & IDs</li>
            <li>Enter the App ID below</li>
            <li>Add REST API Key as Supabase secret: <code className="bg-background px-1 py-0.5 rounded text-xs">ONESIGNAL_REST_API_KEY</code></li>
          </ol>
        </div>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="onesignal-app-id">OneSignal App ID</Label>
            <Input
              id="onesignal-app-id"
              value={appId}
              onChange={(e) => setAppId(e.target.value)}
              placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="onesignal-api-key">REST API Key (for reference only)</Label>
            <div className="relative">
              <Input
                id="onesignal-api-key"
                type={showApiKey ? 'text' : 'password'}
                value={restApiKey}
                onChange={(e) => setRestApiKey(e.target.value)}
                placeholder="Add this key as ONESIGNAL_REST_API_KEY secret in Supabase"
                className="pr-10"
              />
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="absolute right-0 top-0 h-full"
                onClick={() => setShowApiKey(!showApiKey)}
              >
                {showApiKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              This key must be added as a Supabase secret, not stored in the database
            </p>
          </div>
        </div>

        {/* Subscription Status */}
        <div className="bg-muted/50 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {isSubscribed ? (
                <CheckCircle className="h-5 w-5 text-green-500" />
              ) : (
                <BellRing className="h-5 w-5 text-yellow-500" />
              )}
              <div>
                <p className="font-medium text-sm">
                  {isSubscribed ? 'Subscribed to Notifications' : 'Not Subscribed'}
                </p>
                <p className="text-xs text-muted-foreground">
                  {isSubscribed 
                    ? 'You will receive push notifications on this device' 
                    : 'Subscribe to receive push notifications on this device'}
                </p>
              </div>
            </div>
            {!isSubscribed && (
              <Button 
                variant="default" 
                onClick={handleSubscribe} 
                disabled={isSubscribing || !isInitialized}
              >
                {isSubscribing ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <BellRing className="h-4 w-4 mr-2" />
                )}
                Subscribe
              </Button>
            )}
          </div>
        </div>

        <div className="flex gap-3">
          <Button onClick={handleSave} disabled={isSaving}>
            {isSaving ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Save className="h-4 w-4 mr-2" />
            )}
            Save App ID
          </Button>
          <Button variant="outline" onClick={handleTestNotification} disabled={isTesting || !appId}>
            {isTesting ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <TestTube className="h-4 w-4 mr-2" />
            )}
            Send Test
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
