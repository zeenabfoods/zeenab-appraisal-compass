// Location spoofing detection utility
// Detects suspicious location patterns that may indicate GPS spoofing

interface LocationCheck {
  isSuspicious: boolean;
  suspicionReasons: string[];
  confidenceScore: number; // 0-100, higher = more confident it's real
  warnings: string[];
}

interface LocationHistory {
  latitude: number;
  longitude: number;
  timestamp: number;
  accuracy: number;
  altitude?: number;
  speed?: number;
}

const LOCATION_HISTORY_KEY = 'location_history';
const MAX_HISTORY_SIZE = 50;
const MAX_REALISTIC_SPEED = 150; // km/h - max realistic speed for commuting
const MIN_REALISTIC_ACCURACY = 100; // meters - suspiciously accurate locations
const RAPID_CHANGE_THRESHOLD = 1000; // meters in 1 second is suspicious

/**
 * Analyze location for spoofing indicators
 */
export async function detectLocationSpoofing(
  latitude: number,
  longitude: number,
  accuracy: number,
  altitude?: number,
  speed?: number
): Promise<LocationCheck> {
  const suspicionReasons: string[] = [];
  const warnings: string[] = [];
  let suspicionScore = 0;

  // Check 1: Unrealistic accuracy (too perfect)
  if (accuracy < 5) {
    suspicionReasons.push('Location accuracy is unrealistically perfect (<5m)');
    suspicionScore += 30;
  } else if (accuracy < 10) {
    warnings.push('Unusually high accuracy detected');
    suspicionScore += 10;
  }

  // Check 2: Location history analysis
  const history = getLocationHistory();
  if (history.length > 0) {
    const lastLocation = history[history.length - 1];
    const timeDiff = (Date.now() - lastLocation.timestamp) / 1000; // seconds
    const distance = calculateDistance(
      lastLocation.latitude,
      lastLocation.longitude,
      latitude,
      longitude
    );

    // Check for rapid location changes
    if (timeDiff < 60 && distance > RAPID_CHANGE_THRESHOLD) {
      const speedKmh = (distance / 1000) / (timeDiff / 3600);
      if (speedKmh > MAX_REALISTIC_SPEED) {
        suspicionReasons.push(`Impossible travel speed detected: ${speedKmh.toFixed(0)} km/h`);
        suspicionScore += 40;
      }
    }

    // Check for teleportation (location jumps)
    if (timeDiff < 10 && distance > 100) {
      suspicionReasons.push('Rapid location jump detected (possible teleportation)');
      suspicionScore += 35;
    }

    // Check for location pattern anomalies
    const patternCheck = analyzeLocationPattern(history, latitude, longitude);
    if (patternCheck.isAnomalous) {
      warnings.push(patternCheck.reason);
      suspicionScore += patternCheck.severity;
    }
  }

  // Check 3: Speed analysis
  if (speed !== undefined && speed > MAX_REALISTIC_SPEED / 3.6) {
    suspicionReasons.push(`Unrealistic speed reported: ${(speed * 3.6).toFixed(0)} km/h`);
    suspicionScore += 25;
  }

  // Check 4: Altitude consistency (if available)
  if (altitude !== undefined && history.length > 0) {
    const recentAltitudes = history
      .slice(-5)
      .filter(h => h.altitude !== undefined)
      .map(h => h.altitude!);
    
    if (recentAltitudes.length > 0) {
      const avgAltitude = recentAltitudes.reduce((a, b) => a + b, 0) / recentAltitudes.length;
      const altitudeDiff = Math.abs(altitude - avgAltitude);
      
      if (altitudeDiff > 100) {
        warnings.push(`Significant altitude change detected: ${altitudeDiff.toFixed(0)}m`);
        suspicionScore += 15;
      }
    }
  }

  // Check 5: Mock location API detection (Android/iOS specific)
  const mockLocationDetected = await detectMockLocationAPI();
  if (mockLocationDetected.isDetected) {
    suspicionReasons.push('Mock location API detected on device');
    suspicionScore += 50;
  }

  // Store current location in history
  storeLocationHistory({
    latitude,
    longitude,
    timestamp: Date.now(),
    accuracy,
    altitude,
    speed,
  });

  const isSuspicious = suspicionScore >= 40;
  const confidenceScore = Math.max(0, 100 - suspicionScore);

  return {
    isSuspicious,
    suspicionReasons,
    confidenceScore,
    warnings,
  };
}

/**
 * Analyze location pattern for anomalies
 */
function analyzeLocationPattern(
  history: LocationHistory[],
  newLat: number,
  newLon: number
): { isAnomalous: boolean; reason: string; severity: number } {
  if (history.length < 5) {
    return { isAnomalous: false, reason: '', severity: 0 };
  }

  // Check for zigzag pattern (back and forth movement)
  const recent = history.slice(-5);
  let directionChanges = 0;
  
  for (let i = 1; i < recent.length; i++) {
    const prev = recent[i - 1];
    const curr = recent[i];
    
    const bearing1 = calculateBearing(
      prev.latitude,
      prev.longitude,
      curr.latitude,
      curr.longitude
    );
    
    if (i < recent.length - 1) {
      const next = recent[i + 1];
      const bearing2 = calculateBearing(
        curr.latitude,
        curr.longitude,
        next.latitude,
        next.longitude
      );
      
      const angleDiff = Math.abs(bearing1 - bearing2);
      if (angleDiff > 150) {
        directionChanges++;
      }
    }
  }

  if (directionChanges >= 3) {
    return {
      isAnomalous: true,
      reason: 'Erratic movement pattern detected (zigzag)',
      severity: 20,
    };
  }

  // Check for stationary jumps (staying still then sudden jump)
  const distances = recent.map((loc, idx) => {
    if (idx === 0) return 0;
    return calculateDistance(
      recent[idx - 1].latitude,
      recent[idx - 1].longitude,
      loc.latitude,
      loc.longitude
    );
  });

  const stationaryCount = distances.filter(d => d < 10).length;
  const currentDistance = calculateDistance(
    recent[recent.length - 1].latitude,
    recent[recent.length - 1].longitude,
    newLat,
    newLon
  );

  if (stationaryCount >= 3 && currentDistance > 500) {
    return {
      isAnomalous: true,
      reason: 'Sudden jump after stationary period',
      severity: 25,
    };
  }

  return { isAnomalous: false, reason: '', severity: 0 };
}

/**
 * Detect mock location API (works on some browsers/devices)
 */
async function detectMockLocationAPI(): Promise<{ isDetected: boolean; method?: string }> {
  // Check if running in development mode
  if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
    return { isDetected: false };
  }

  // Check for common mock location indicators
  const indicators = [
    // Check if geolocation is being overridden
    (navigator.geolocation.constructor as any).name !== 'Geolocation',
    
    // Check for common spoofing extensions properties
    (window as any).mockGeolocation !== undefined,
    (window as any).fakeGPS !== undefined,
  ];

  if (indicators.some(indicator => indicator)) {
    return { isDetected: true, method: 'Browser extension detected' };
  }

  return { isDetected: false };
}

/**
 * Calculate distance between two coordinates (Haversine formula)
 */
function calculateDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371e3; // Earth's radius in meters
  const φ1 = (lat1 * Math.PI) / 180;
  const φ2 = (lat2 * Math.PI) / 180;
  const Δφ = ((lat2 - lat1) * Math.PI) / 180;
  const Δλ = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c;
}

/**
 * Calculate bearing between two coordinates
 */
function calculateBearing(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const φ1 = (lat1 * Math.PI) / 180;
  const φ2 = (lat2 * Math.PI) / 180;
  const Δλ = ((lon2 - lon1) * Math.PI) / 180;

  const y = Math.sin(Δλ) * Math.cos(φ2);
  const x =
    Math.cos(φ1) * Math.sin(φ2) -
    Math.sin(φ1) * Math.cos(φ2) * Math.cos(Δλ);
  const θ = Math.atan2(y, x);

  return ((θ * 180) / Math.PI + 360) % 360;
}

/**
 * Store location in history
 */
function storeLocationHistory(location: LocationHistory): void {
  try {
    const history = getLocationHistory();
    history.push(location);
    
    // Keep only recent history
    if (history.length > MAX_HISTORY_SIZE) {
      history.shift();
    }
    
    localStorage.setItem(LOCATION_HISTORY_KEY, JSON.stringify(history));
  } catch (error) {
    console.error('Failed to store location history:', error);
  }
}

/**
 * Get location history
 */
function getLocationHistory(): LocationHistory[] {
  try {
    const stored = localStorage.getItem(LOCATION_HISTORY_KEY);
    if (!stored) return [];
    
    const history = JSON.parse(stored);
    
    // Clean old entries (older than 24 hours)
    const dayAgo = Date.now() - 24 * 60 * 60 * 1000;
    return history.filter((loc: LocationHistory) => loc.timestamp > dayAgo);
  } catch (error) {
    console.error('Failed to retrieve location history:', error);
    return [];
  }
}

/**
 * Clear location history
 */
export function clearLocationHistory(): void {
  try {
    localStorage.removeItem(LOCATION_HISTORY_KEY);
  } catch (error) {
    console.error('Failed to clear location history:', error);
  }
}

/**
 * Get location confidence report
 */
export function getLocationConfidenceReport(): {
  totalChecks: number;
  suspiciousChecks: number;
  averageConfidence: number;
  recentSuspicions: string[];
} {
  const history = getLocationHistory();
  
  return {
    totalChecks: history.length,
    suspiciousChecks: 0, // Would need to store this separately
    averageConfidence: history.length > 0 ? 85 : 0, // Placeholder
    recentSuspicions: [],
  };
}
