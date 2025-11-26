// Device fingerprinting utility for attendance security
// Generates a unique identifier for each device to prevent multi-device fraud

interface DeviceFingerprint {
  id: string;
  timestamp: number;
  userAgent: string;
  screenResolution: string;
  timezone: string;
  language: string;
  platform: string;
  hardwareConcurrency: number;
  deviceMemory?: number;
  colorDepth: number;
  pixelRatio: number;
  touchSupport: boolean;
  vendor: string;
}

/**
 * Generate a unique device fingerprint
 * Combines multiple device characteristics to create a unique identifier
 */
export async function generateDeviceFingerprint(): Promise<DeviceFingerprint> {
  const fingerprint: DeviceFingerprint = {
    id: '',
    timestamp: Date.now(),
    userAgent: navigator.userAgent,
    screenResolution: `${screen.width}x${screen.height}`,
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    language: navigator.language,
    platform: navigator.platform,
    hardwareConcurrency: navigator.hardwareConcurrency || 0,
    deviceMemory: (navigator as any).deviceMemory,
    colorDepth: screen.colorDepth,
    pixelRatio: window.devicePixelRatio,
    touchSupport: 'ontouchstart' in window,
    vendor: navigator.vendor,
  };

  // Generate unique ID from fingerprint data
  fingerprint.id = await hashFingerprint(fingerprint);
  
  return fingerprint;
}

/**
 * Hash the fingerprint data to create a unique identifier
 */
async function hashFingerprint(fingerprint: DeviceFingerprint): Promise<string> {
  const fingerprintString = JSON.stringify({
    userAgent: fingerprint.userAgent,
    screenResolution: fingerprint.screenResolution,
    timezone: fingerprint.timezone,
    platform: fingerprint.platform,
    hardwareConcurrency: fingerprint.hardwareConcurrency,
    deviceMemory: fingerprint.deviceMemory,
    colorDepth: fingerprint.colorDepth,
    pixelRatio: fingerprint.pixelRatio,
    touchSupport: fingerprint.touchSupport,
    vendor: fingerprint.vendor,
  });

  // Use SubtleCrypto API for hashing
  const encoder = new TextEncoder();
  const data = encoder.encode(fingerprintString);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  
  return hashHex;
}

/**
 * Store device fingerprint in localStorage
 */
export function storeDeviceFingerprint(fingerprint: DeviceFingerprint): void {
  try {
    localStorage.setItem('device_fingerprint', JSON.stringify(fingerprint));
    localStorage.setItem('device_id', fingerprint.id);
  } catch (error) {
    console.error('Failed to store device fingerprint:', error);
  }
}

/**
 * Get stored device fingerprint
 */
export function getStoredDeviceFingerprint(): DeviceFingerprint | null {
  try {
    const stored = localStorage.getItem('device_fingerprint');
    return stored ? JSON.parse(stored) : null;
  } catch (error) {
    console.error('Failed to retrieve device fingerprint:', error);
    return null;
  }
}

/**
 * Compare current device with stored fingerprint
 * Returns similarity score (0-100)
 */
export async function compareDeviceFingerprint(): Promise<{
  isMatch: boolean;
  similarityScore: number;
  changes: string[];
}> {
  const stored = getStoredDeviceFingerprint();
  if (!stored) {
    return { isMatch: false, similarityScore: 0, changes: ['No stored fingerprint'] };
  }

  const current = await generateDeviceFingerprint();
  const changes: string[] = [];
  let matchingFields = 0;
  const totalFields = 11;

  // Compare each field
  if (stored.userAgent !== current.userAgent) changes.push('User Agent changed');
  else matchingFields++;

  if (stored.screenResolution !== current.screenResolution) changes.push('Screen resolution changed');
  else matchingFields++;

  if (stored.timezone !== current.timezone) changes.push('Timezone changed');
  else matchingFields++;

  if (stored.platform !== current.platform) changes.push('Platform changed');
  else matchingFields++;

  if (stored.hardwareConcurrency !== current.hardwareConcurrency) changes.push('CPU cores changed');
  else matchingFields++;

  if (stored.deviceMemory !== current.deviceMemory) changes.push('Device memory changed');
  else matchingFields++;

  if (stored.colorDepth !== current.colorDepth) changes.push('Color depth changed');
  else matchingFields++;

  if (stored.pixelRatio !== current.pixelRatio) changes.push('Pixel ratio changed');
  else matchingFields++;

  if (stored.touchSupport !== current.touchSupport) changes.push('Touch support changed');
  else matchingFields++;

  if (stored.vendor !== current.vendor) changes.push('Vendor changed');
  else matchingFields++;

  if (stored.language !== current.language) changes.push('Language changed');
  else matchingFields++;

  const similarityScore = Math.round((matchingFields / totalFields) * 100);
  const isMatch = similarityScore >= 70; // 70% similarity threshold

  return { isMatch, similarityScore, changes };
}

/**
 * Check if biometric authentication is available
 */
export async function checkBiometricAvailability(): Promise<{
  available: boolean;
  types: string[];
}> {
  if (!('PublicKeyCredential' in window)) {
    return { available: false, types: [] };
  }

  try {
    const available = await (window as any).PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
    
    if (available) {
      // Check what types are available
      const types: string[] = [];
      
      // Check for fingerprint (most common on mobile)
      if ('ontouchstart' in window) {
        types.push('fingerprint');
      }
      
      // Check for face recognition
      if ((navigator as any).credentials) {
        types.push('face');
      }
      
      return { available: true, types };
    }
  } catch (error) {
    console.error('Error checking biometric availability:', error);
  }

  return { available: false, types: [] };
}
