import { useEffect, useState } from 'react';
import { Shield, AlertTriangle, CheckCircle, Smartphone, MapPin, Activity } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { generateDeviceFingerprint, compareDeviceFingerprint, checkBiometricAvailability } from '@/utils/deviceFingerprinting';
import { getLocationConfidenceReport } from '@/utils/locationSpoofingDetection';

export function SecurityMonitor() {
  const [deviceMatch, setDeviceMatch] = useState<any>(null);
  const [biometricAvailable, setBiometricAvailable] = useState<any>(null);
  const [locationReport, setLocationReport] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    initializeSecurityChecks();
  }, []);

  const initializeSecurityChecks = async () => {
    try {
      // Check device fingerprint
      const fingerprint = await generateDeviceFingerprint();
      const comparison = await compareDeviceFingerprint();
      setDeviceMatch(comparison);

      // Check biometric availability
      const biometric = await checkBiometricAvailability();
      setBiometricAvailable(biometric);

      // Get location confidence report
      const report = getLocationConfidenceReport();
      setLocationReport(report);
    } catch (error) {
      console.error('Security check failed:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Security Status
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="h-4 bg-muted animate-pulse rounded" />
            <div className="h-4 bg-muted animate-pulse rounded" />
            <div className="h-4 bg-muted animate-pulse rounded w-3/4" />
          </div>
        </CardContent>
      </Card>
    );
  }

  const getSecurityScore = (): number => {
    let score = 0;
    
    // Device match score (40 points)
    if (deviceMatch?.isMatch) {
      score += 40;
    } else if (deviceMatch?.similarityScore >= 50) {
      score += 20;
    }

    // Location confidence (40 points)
    if (locationReport?.averageConfidence >= 80) {
      score += 40;
    } else if (locationReport?.averageConfidence >= 60) {
      score += 25;
    } else if (locationReport?.averageConfidence >= 40) {
      score += 15;
    }

    // Biometric availability (20 points)
    if (biometricAvailable?.available) {
      score += 20;
    }

    return Math.min(100, score);
  };

  const securityScore = getSecurityScore();
  const getSecurityLevel = () => {
    if (securityScore >= 80) return { label: 'High', color: 'text-green-500', bg: 'bg-green-500' };
    if (securityScore >= 60) return { label: 'Medium', color: 'text-yellow-500', bg: 'bg-yellow-500' };
    return { label: 'Low', color: 'text-red-500', bg: 'bg-red-500' };
  };

  const securityLevel = getSecurityLevel();

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Security Status
          </CardTitle>
          <CardDescription>Real-time security monitoring and anti-fraud protection</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Overall Security Score */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Security Level</span>
              <Badge variant={securityScore >= 80 ? 'default' : securityScore >= 60 ? 'secondary' : 'destructive'}>
                {securityLevel.label}
              </Badge>
            </div>
            <Progress value={securityScore} className="h-2" />
            <p className="text-xs text-muted-foreground">
              Security Score: {securityScore}/100
            </p>
          </div>

          {/* Device Fingerprint Status */}
          <div className="space-y-2 p-3 border rounded-lg">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Smartphone className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium">Device Verification</span>
              </div>
              {deviceMatch?.isMatch ? (
                <CheckCircle className="h-4 w-4 text-green-500" />
              ) : (
                <AlertTriangle className="h-4 w-4 text-yellow-500" />
              )}
            </div>
            
            {deviceMatch && (
              <>
                <div className="text-xs text-muted-foreground">
                  Similarity: {deviceMatch.similarityScore}%
                </div>
                {deviceMatch.changes.length > 0 && (
                  <div className="mt-2">
                    <Alert variant="default" className="py-2">
                      <AlertDescription className="text-xs">
                        <strong>Changes detected:</strong>
                        <ul className="mt-1 ml-4 list-disc">
                          {deviceMatch.changes.slice(0, 3).map((change: string, idx: number) => (
                            <li key={idx}>{change}</li>
                          ))}
                        </ul>
                      </AlertDescription>
                    </Alert>
                  </div>
                )}
              </>
            )}
          </div>

          {/* Location Security */}
          <div className="space-y-2 p-3 border rounded-lg">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <MapPin className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium">Location Security</span>
              </div>
              {locationReport?.averageConfidence >= 80 ? (
                <CheckCircle className="h-4 w-4 text-green-500" />
              ) : (
                <Activity className="h-4 w-4 text-yellow-500" />
              )}
            </div>
            
            {locationReport && (
              <div className="space-y-1">
                <div className="text-xs text-muted-foreground">
                  Confidence: {locationReport.averageConfidence}%
                </div>
                <div className="text-xs text-muted-foreground">
                  Total Checks: {locationReport.totalChecks}
                </div>
              </div>
            )}
          </div>

          {/* Biometric Capability */}
          <div className="space-y-2 p-3 border rounded-lg">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Shield className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium">Biometric Authentication</span>
              </div>
              {biometricAvailable?.available ? (
                <CheckCircle className="h-4 w-4 text-green-500" />
              ) : (
                <AlertTriangle className="h-4 w-4 text-muted-foreground" />
              )}
            </div>
            
            {biometricAvailable && (
              <div className="text-xs text-muted-foreground">
                {biometricAvailable.available ? (
                  <>
                    <div>Available: {biometricAvailable.types.join(', ')}</div>
                    <div className="text-green-600 mt-1">Ready for future enhancement</div>
                  </>
                ) : (
                  <div>Not available on this device</div>
                )}
              </div>
            )}
          </div>

          {/* Security Warnings */}
          {securityScore < 60 && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription className="text-xs">
                <strong>Security Warning:</strong> Your device or location may have security concerns.
                Please ensure you're using the same device and not using location spoofing apps.
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
