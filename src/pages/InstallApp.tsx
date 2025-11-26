import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Smartphone, Download, CheckCircle2 } from "lucide-react";

export default function InstallApp() {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isInstalled, setIsInstalled] = useState(false);

  useEffect(() => {
    // Check if app is already installed
    if (window.matchMedia('(display-mode: standalone)').matches) {
      setIsInstalled(true);
    }

    // Listen for install prompt
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;

    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    
    if (outcome === 'accepted') {
      setIsInstalled(true);
    }
    
    setDeferredPrompt(null);
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted p-4 flex items-center justify-center">
      <Card className="max-w-md w-full">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 w-16 h-16 bg-attendance-primary rounded-2xl flex items-center justify-center">
            <Smartphone className="w-8 h-8 text-white" />
          </div>
          <CardTitle className="text-2xl">Install Smart Attendance</CardTitle>
          <CardDescription>
            Get the best experience with our mobile app
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {isInstalled ? (
            <div className="text-center space-y-4">
              <CheckCircle2 className="w-16 h-16 mx-auto text-attendance-success" />
              <p className="text-lg font-medium">App is already installed!</p>
              <p className="text-sm text-muted-foreground">
                You can access it from your home screen
              </p>
            </div>
          ) : (
            <>
              <div className="space-y-4">
                <h3 className="font-semibold">Why install?</h3>
                <ul className="space-y-2 text-sm text-muted-foreground">
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="w-4 h-4 text-attendance-success mt-0.5 flex-shrink-0" />
                    <span>Works offline - clock in/out without internet</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="w-4 h-4 text-attendance-success mt-0.5 flex-shrink-0" />
                    <span>Faster loading and better performance</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="w-4 h-4 text-attendance-success mt-0.5 flex-shrink-0" />
                    <span>Quick access from your home screen</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="w-4 h-4 text-attendance-success mt-0.5 flex-shrink-0" />
                    <span>Full-screen experience like a native app</span>
                  </li>
                </ul>
              </div>

              {deferredPrompt ? (
                <Button 
                  onClick={handleInstallClick}
                  className="w-full bg-attendance-primary hover:bg-attendance-primary-hover"
                  size="lg"
                >
                  <Download className="w-4 h-4 mr-2" />
                  Install Now
                </Button>
              ) : (
                <div className="text-center space-y-2">
                  <p className="text-sm font-medium">To install this app:</p>
                  <div className="text-xs text-muted-foreground space-y-1">
                    <p><strong>iPhone:</strong> Tap Share → Add to Home Screen</p>
                    <p><strong>Android:</strong> Tap Menu → Install App</p>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
