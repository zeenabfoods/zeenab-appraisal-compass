import { useOneSignal } from '@/hooks/useOneSignal';

/**
 * This component exists solely to initialize OneSignal and trigger
 * the browser notification permission prompt for all authenticated users,
 * on every page — not just the attendance dashboard.
 */
export function OneSignalInitializer() {
  // Calling the hook here bootstraps OneSignal globally.
  // The auto-prompt logic lives inside useOneSignal itself.
  useOneSignal();
  return null;
}
