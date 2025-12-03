import { useEffect, useState, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuthContext } from '@/components/AuthProvider';
import { toast } from 'sonner';
import { MapPin, AlertTriangle, CheckCircle } from 'lucide-react';
import { useVoiceGuides } from '@/hooks/useVoiceGuides';

interface Branch {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  geofence_radius: number;
}

interface GeofenceStatus {
  branchId: string;
  branchName: string;
  isInside: boolean;
  distance: number;
}

const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
  const R = 6371000; // Earth radius in meters
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return Math.round(R * c);
};

// Helper to get today's date key
const getTodayKey = () => new Date().toISOString().split('T')[0];

export function GeofenceMonitor() {
  const { profile } = useAuthContext();
  const { playVoiceGuide } = useVoiceGuides();
  const [branches, setBranches] = useState<Branch[]>([]);
  const [isMonitoring, setIsMonitoring] = useState(false);
  const watchIdRef = useRef<number | null>(null);
  const previousStatusRef = useRef<Map<string, boolean>>(new Map());

  // Check if voice guide already played today for a specific event type
  const hasPlayedToday = (eventType: string): boolean => {
    const key = `geofence_voice_${eventType}_${getTodayKey()}`;
    return localStorage.getItem(key) === 'true';
  };

  // Mark voice guide as played for today
  const markAsPlayedToday = (eventType: string) => {
    const key = `geofence_voice_${eventType}_${getTodayKey()}`;
    localStorage.setItem(key, 'true');
  };

  // Request notification permission on mount
  useEffect(() => {
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }
  }, []);

  // Fetch active branches
  useEffect(() => {
    fetchBranches();
  }, []);

  const fetchBranches = async () => {
    try {
      const { data, error } = await supabase
        .from('attendance_branches')
        .select('*')
        .eq('is_active', true);

      if (error) throw error;
      setBranches(data || []);
    } catch (error) {
      console.error('Error fetching branches:', error);
    }
  };

  const showNotification = (title: string, body: string, icon?: string) => {
    // Browser notification
    if ('Notification' in window && Notification.permission === 'granted') {
      const notification = new Notification(title, {
        body,
        icon: icon || '/favicon.ico',
        badge: '/favicon.ico',
        tag: 'geofence-alert'
      });

      // Vibrate device if supported
      if ('vibrate' in navigator) {
        navigator.vibrate([200, 100, 200]);
      }

      // Auto-close after 5 seconds
      setTimeout(() => notification.close(), 5000);
    }
  };

  const logGeofenceAlert = async (
    branchId: string,
    alertType: 'entering' | 'exiting',
    latitude: number,
    longitude: number,
    distance: number
  ) => {
    try {
      await supabase
        .from('attendance_geofence_alerts')
        .insert({
          employee_id: profile?.id,
          branch_id: branchId,
          alert_type: alertType,
          latitude,
          longitude,
          distance_from_branch: distance
        });
    } catch (error) {
      console.error('Error logging geofence alert:', error);
    }
  };

  const checkGeofence = (latitude: number, longitude: number) => {
    branches.forEach((branch) => {
      const distance = calculateDistance(latitude, longitude, branch.latitude, branch.longitude);
      const isInside = distance <= branch.geofence_radius;
      const wasInside = previousStatusRef.current.get(branch.id) ?? false;

      // Entering geofence
      if (isInside && wasInside === false) {
        // Play voice guide for entering geofence - only once per day
        if (!hasPlayedToday('geofence_entry')) {
          playVoiceGuide('geofence_entry');
          markAsPlayedToday('geofence_entry');
        }

        showNotification(
          '📍 Entered Office Zone',
          `You are now within ${branch.name} geofence (${distance}m from center)`
        );

        toast.success(
          <div className="flex items-center gap-2">
            <CheckCircle className="h-5 w-5 text-green-500" />
            <div>
              <div className="font-semibold">Entered Office Boundary</div>
              <div className="text-sm">{branch.name} • {distance}m away</div>
            </div>
          </div>,
          { duration: 5000 }
        );

        logGeofenceAlert(branch.id, 'entering', latitude, longitude, distance);
      }

      // Exiting geofence
      if (!isInside && wasInside === true) {
        // Play voice guide for exiting geofence - only once per day
        if (!hasPlayedToday('geofence_exit')) {
          playVoiceGuide('geofence_exit');
          markAsPlayedToday('geofence_exit');
        }

        showNotification(
          '⚠️ Left Office Zone',
          `You have left ${branch.name} geofence boundary (${distance}m from center)`
        );

        toast.warning(
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-orange-500" />
            <div>
              <div className="font-semibold">Left Office Boundary</div>
              <div className="text-sm">{branch.name} • {distance}m away</div>
            </div>
          </div>,
          { duration: 5000 }
        );

        logGeofenceAlert(branch.id, 'exiting', latitude, longitude, distance);
      }

      // Update previous status
      previousStatusRef.current.set(branch.id, isInside);
    });
  };

  const startMonitoring = () => {
    if (!navigator.geolocation) {
      toast.error('Geolocation is not supported by your browser');
      return;
    }

    // Request notification permission
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }

    setIsMonitoring(true);

    // Get initial position
    navigator.geolocation.getCurrentPosition(
      (position) => {
        checkGeofence(position.coords.latitude, position.coords.longitude);
      },
      (error) => {
        console.error('Error getting location:', error);
        toast.error('Could not access your location');
      },
      {
        enableHighAccuracy: true,
        maximumAge: 0
      }
    );

    // Watch position continuously
    watchIdRef.current = navigator.geolocation.watchPosition(
      (position) => {
        checkGeofence(position.coords.latitude, position.coords.longitude);
      },
      (error) => {
        console.error('Error watching location:', error);
        toast.error('Cannot track location. Please allow location access and keep GPS turned on.');
      },
      {
        enableHighAccuracy: true,
        maximumAge: 5000, // Accept cached position up to 5 seconds old
        timeout: 10000
      }
    );

    toast.success(
      <div className="flex items-center gap-2">
        <MapPin className="h-5 w-5 text-blue-500" />
        <div>
          <div className="font-semibold">Geofence Monitoring Active</div>
          <div className="text-sm">You'll be alerted when crossing office boundaries</div>
        </div>
      </div>
    );
  };

  const stopMonitoring = () => {
    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }
    setIsMonitoring(false);
    previousStatusRef.current.clear();

    toast.info('Geofence monitoring stopped');
  };

  useEffect(() => {
    // Auto-start monitoring when component mounts
    if (branches.length > 0) {
      startMonitoring();
    }

    return () => {
      stopMonitoring();
    };
  }, [branches]);

  return null; // This is a background monitor with no UI
}
