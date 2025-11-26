/**
 * Feature Flags Configuration
 * Central control for enabling/disabling features without code changes
 */

export const FEATURES = {
  // Attendance Module Feature Flags
  ATTENDANCE_MODULE: true, // Master switch
  ATTENDANCE_GEOFENCE: true,
  ATTENDANCE_OFFLINE_MODE: true,
  ATTENDANCE_BREAK_TRACKING: true,
  ATTENDANCE_FINANCIAL_CHARGES: true,
  ATTENDANCE_ANALYTICS: true,
  ATTENDANCE_EYE_SERVICE_DETECTION: true,
  ATTENDANCE_BIOMETRIC: false, // Future enhancement
  
  // Safety switches
  ATTENDANCE_WRITE_TO_DB: true, // Can disable to test UI without DB writes
  ATTENDANCE_GPS_REQUIRED: true,
} as const;

export type FeatureFlag = keyof typeof FEATURES;

/**
 * Check if a feature is enabled
 */
export function isFeatureEnabled(feature: FeatureFlag): boolean {
  return FEATURES[feature];
}
