import { useEffect, useState, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuthContext } from '@/components/AuthProvider';
import { toast } from 'sonner';
import { MapPin, AlertTriangle, CheckCircle } from 'lucide-react';

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

export function GeofenceMonitor() {
  const { profile } = useAuthContext();
  const [branches, setBranches] = useState<Branch[]>([]);
  const [isMonitoring, setIsMonitoring] = useState(false);
  const watchIdRef = useRef<number | null>(null);
  const previousStatusRef = useRef<Map<string, boolean>>(new Map());
  const audioRef = useRef<HTMLAudioElement | null>(null);

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

  // Create audio elements
  useEffect(() => {
    // Create audio context for beep sounds
    audioRef.current = new Audio();
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
    };
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

  const playAlert = async () => {
    try {
      // Fetch alert settings
      const { data: settings } = await supabase
        .from('attendance_settings')
        .select('*')
        .single();

      let soundUrl: string;
      
      if (settings?.alert_sound_url) {
        // Use uploaded custom sound
        const { data } = supabase.storage
          .from('alert-sounds')
          .getPublicUrl(settings.alert_sound_url);
        soundUrl = data.publicUrl;
      } else {
        // Generate default beep sound
        soundUrl = generateDefaultBeep();
      }
      
      const audio = new Audio(soundUrl);
      audio.volume = settings?.alert_volume || 0.8;
      await audio.play();
    } catch (error) {
      console.error('Error playing geofence alert:', error);
    }
  };

  const generateDefaultBeep = (): string => {
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    const sampleRate = audioContext.sampleRate;
    const duration = 0.5;
    const frequency = 880;
    
    const length = sampleRate * duration;
    const buffer = audioContext.createBuffer(1, length, sampleRate);
    const channelData = buffer.getChannelData(0);
    
    for (let i = 0; i < length; i++) {
      const t = i / sampleRate;
      const envelope = Math.exp(-t * 4);
      channelData[i] = Math.sin(2 * Math.PI * frequency * t) * envelope;
    }
    
    const wavData = encodeWAV(buffer);
    const blob = new Blob([wavData], { type: 'audio/wav' });
    return URL.createObjectURL(blob);
  };

  const encodeWAV = (buffer: AudioBuffer): ArrayBuffer => {
    const length = buffer.length * buffer.numberOfChannels * 2;
    const arrayBuffer = new ArrayBuffer(44 + length);
    const view = new DataView(arrayBuffer);
    const channels = [buffer.getChannelData(0)];
    const sampleRate = buffer.sampleRate;
    let pos = 0;

    const writeString = (str: string) => {
      for (let i = 0; i < str.length; i++) {
        view.setUint8(pos++, str.charCodeAt(i));
      }
    };

    writeString('RIFF');
    view.setUint32(pos, 36 + length, true); pos += 4;
    writeString('WAVE');
    writeString('fmt ');
    view.setUint32(pos, 16, true); pos += 4;
    view.setUint16(pos, 1, true); pos += 2;
    view.setUint16(pos, buffer.numberOfChannels, true); pos += 2;
    view.setUint32(pos, sampleRate, true); pos += 4;
    view.setUint32(pos, sampleRate * 2 * buffer.numberOfChannels, true); pos += 4;
    view.setUint16(pos, buffer.numberOfChannels * 2, true); pos += 2;
    view.setUint16(pos, 16, true); pos += 2;
    writeString('data');
    view.setUint32(pos, length, true); pos += 4;

    const volume = 0.9;
    for (let i = 0; i < buffer.length; i++) {
      for (let channel = 0; channel < buffer.numberOfChannels; channel++) {
        const sample = Math.max(-1, Math.min(1, channels[channel][i])) * volume;
        view.setInt16(pos, sample < 0 ? sample * 0x8000 : sample * 0x7FFF, true);
        pos += 2;
      }
    }

    return arrayBuffer;
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
      const wasInside = previousStatusRef.current.get(branch.id);

      // Entering geofence
      if (isInside && wasInside === false) {
        // Play alert sound
        playAlert();

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
        // Play alert sound
        playAlert();

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
