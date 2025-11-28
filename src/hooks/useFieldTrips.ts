import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuthContext } from '@/components/AuthProvider';
import { toast } from 'sonner';

export interface FieldTrip {
  id: string;
  employee_id: string;
  purpose: string;
  start_time: string;
  expected_end_time: string;
  actual_end_time: string | null;
  vehicle_used: string | null;
  vehicle_registration: string | null;
  funds_allocated: number | null;
  status: 'active' | 'completed' | 'abandoned';
  start_location_lat: number | null;
  start_location_lng: number | null;
  end_location_lat: number | null;
  end_location_lng: number | null;
  total_distance_km: number | null;
  destination_address: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface LocationPoint {
  id: string;
  trip_id: string;
  timestamp: string;
  latitude: number;
  longitude: number;
  battery_level: number | null;
  network_type: string | null;
  speed_kmh: number | null;
  accuracy_meters: number | null;
}

export interface TripEvidence {
  id: string;
  trip_id: string;
  evidence_type: 'photo' | 'signature' | 'receipt' | 'document';
  file_url: string | null;
  description: string | null;
  location_lat: number | null;
  location_lng: number | null;
  location_verified: boolean;
  receipt_amount: number | null;
  vendor_name: string | null;
  captured_at: string;
}

export function useFieldTrips() {
  const { profile } = useAuthContext();
  const [trips, setTrips] = useState<FieldTrip[]>([]);
  const [activeTrip, setActiveTrip] = useState<FieldTrip | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (profile) {
      loadTrips();
      loadActiveTrip();
    }
  }, [profile]);

  const loadTrips = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('field_trips')
        .select('*')
        .eq('employee_id', profile?.id)
        .order('start_time', { ascending: false });

      if (error) throw error;
      setTrips((data || []) as FieldTrip[]);
    } catch (error) {
      console.error('Error loading trips:', error);
      toast.error('Failed to load trips');
    } finally {
      setLoading(false);
    }
  };

  const loadActiveTrip = async () => {
    try {
      const { data, error } = await supabase
        .from('field_trips')
        .select('*')
        .eq('employee_id', profile?.id)
        .eq('status', 'active')
        .maybeSingle();

      if (error) throw error;
      setActiveTrip(data as FieldTrip | null);
    } catch (error) {
      console.error('Error loading active trip:', error);
    }
  };

  const startTrip = async (tripData: {
    purpose: string;
    expected_end_time: string;
    vehicle_used?: string;
    vehicle_registration?: string;
    funds_allocated?: number;
    destination_address?: string;
    notes?: string;
  }) => {
    try {
      // Check today's sessions for one-transition-only rule
      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);

      const { data: todayFieldTrips } = await supabase
        .from('field_trips')
        .select('id')
        .eq('employee_id', profile?.id)
        .gte('start_time', todayStart.toISOString());

      // Block if already has a field session today
      if (todayFieldTrips && todayFieldTrips.length > 0) {
        toast.error('Field Session Already Exists', {
          description: 'You already have a field trip today. Only one field session per day is allowed.',
        });
        throw new Error('Field session already exists today');
      }

      // Check if already transitioned (has office session)
      const { data: officeSession } = await supabase
        .from('attendance_logs')
        .select('location_type, id, clock_out_time')
        .eq('employee_id', profile?.id)
        .eq('location_type', 'office')
        .gte('clock_in_time', todayStart.toISOString())
        .maybeSingle();

      if (officeSession && !officeSession.clock_out_time) {
        // Auto clock-out the active office session
        const clockOutTime = new Date().toISOString();
        const { data: logData } = await supabase
          .from('attendance_logs')
          .select('clock_in_time')
          .eq('id', officeSession.id)
          .single();

        if (logData) {
          const clockInTime = new Date(logData.clock_in_time);
          const diffMs = new Date(clockOutTime).getTime() - clockInTime.getTime();
          const totalHours = diffMs / (1000 * 60 * 60);

          await supabase
            .from('attendance_logs')
            .update({
              clock_out_time: clockOutTime,
              total_hours: Number(totalHours.toFixed(2)),
            })
            .eq('id', officeSession.id);
          
          toast.info('Office session auto-completed');
        }
      }

      // Get current location
      const position = await getCurrentPosition();
      
      const { data, error } = await supabase
        .from('field_trips')
        .insert({
          employee_id: profile?.id,
          ...tripData,
          start_location_lat: position.coords.latitude,
          start_location_lng: position.coords.longitude,
          status: 'active'
        })
        .select()
        .single();

      if (error) throw error;

      // Create a field attendance log entry
      await supabase
        .from('attendance_logs')
        .insert({
          employee_id: profile?.id,
          location_type: 'field',
          clock_in_latitude: position.coords.latitude,
          clock_in_longitude: position.coords.longitude,
          field_work_reason: tripData.purpose,
          field_work_location: tripData.destination_address || 'Field Location',
          device_timestamp: new Date().toISOString(),
        });
      
      setActiveTrip(data as FieldTrip);
      await loadTrips();
      
      toast.success('Field trip started successfully');
      return data;
    } catch (error: any) {
      console.error('Error starting trip:', error);
      
      // Show specific error message
      if (error.message?.includes('User denied')) {
        toast.error('Location permission denied. Please enable location access to start a field trip.');
      } else if (error.message?.includes('Geolocation')) {
        toast.error('Location services are not available. Please enable location on your device.');
      } else if (error.code === 'PGRST116') {
        toast.error('Database error: Cannot create field trip. Please contact support.');
      } else {
        toast.error(error.message || 'Failed to start trip. Please try again.');
      }
      throw error;
    }
  };

  const endTrip = async (tripId: string, notes?: string) => {
    try {
      let position: GeolocationPosition | null = null;

      // Try to get the current location, but don't block ending the trip if it fails
      try {
        position = await getCurrentPosition();
      } catch (geoError) {
        console.warn('Could not get current location when ending trip:', geoError);
      }

      const updatePayload: any = {
        status: 'completed',
        actual_end_time: new Date().toISOString(),
        notes: notes || null,
      };

      if (position) {
        updatePayload.end_location_lat = position.coords.latitude;
        updatePayload.end_location_lng = position.coords.longitude;
      }
      
      const { error } = await supabase
        .from('field_trips')
        .update(updatePayload)
        .eq('id', tripId);

      if (error) throw error;

      // Find and clock out the field attendance log
      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);

      const { data: fieldLog } = await supabase
        .from('attendance_logs')
        .select('id, clock_in_time')
        .eq('employee_id', profile?.id)
        .eq('location_type', 'field')
        .is('clock_out_time', null)
        .gte('clock_in_time', todayStart.toISOString())
        .maybeSingle();

      if (fieldLog) {
        const clockOutTime = new Date().toISOString();
        const clockInTime = new Date(fieldLog.clock_in_time);
        const diffMs = new Date(clockOutTime).getTime() - clockInTime.getTime();
        const totalHours = diffMs / (1000 * 60 * 60);

        await supabase
          .from('attendance_logs')
          .update({
            clock_out_time: clockOutTime,
            clock_out_latitude: position?.coords.latitude,
            clock_out_longitude: position?.coords.longitude,
            total_hours: Number(totalHours.toFixed(2)),
          })
          .eq('id', fieldLog.id);
      }
      
      setActiveTrip(null);
      await loadTrips();
      
      toast.success('Field trip completed successfully');
    } catch (error) {
      console.error('Error ending trip:', error);
      toast.error('Failed to end trip');
      throw error;
    }
  };

  const recordLocationPoint = async (tripId: string) => {
    try {
      const position = await getCurrentPosition();
      const battery = await getBatteryLevel();
      const connection = (navigator as any).connection;

      const { error } = await supabase
        .from('location_points')
        .insert({
          trip_id: tripId,
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          battery_level: battery,
          network_type: connection?.effectiveType || 'unknown',
          speed_kmh: position.coords.speed ? position.coords.speed * 3.6 : null,
          accuracy_meters: position.coords.accuracy
        });

      if (error) throw error;
    } catch (error) {
      console.error('Error recording location:', error);
    }
  };

  const uploadEvidence = async (
    tripId: string,
    file: File,
    evidenceType: 'photo' | 'signature' | 'receipt' | 'document',
    metadata: {
      description?: string;
      receipt_amount?: number;
      vendor_name?: string;
    }
  ) => {
    try {
      let position: GeolocationPosition | null = null;

      // Try to get the current location for verification, but don't block upload if it fails
      try {
        position = await getCurrentPosition();
      } catch (geoError) {
        console.warn('Could not get current location when uploading evidence:', geoError);
      }
      
      // Upload file to storage
      const fileExt = file.name.split('.').pop();
      const fileName = `${profile?.id}/${tripId}/${Date.now()}.${fileExt}`;
      
      const { error: uploadError } = await supabase.storage
        .from('field-evidence')
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('field-evidence')
        .getPublicUrl(fileName);

      const evidencePayload: any = {
        trip_id: tripId,
        evidence_type: evidenceType,
        file_url: publicUrl,
        location_lat: position?.coords.latitude ?? null,
        location_lng: position?.coords.longitude ?? null,
        location_verified: !!position,
        ...metadata,
      };

      // Record evidence
      const { error: insertError } = await supabase
        .from('trip_evidence')
        .insert(evidencePayload);

      if (insertError) throw insertError;
      
      toast.success('Evidence uploaded successfully');
    } catch (error) {
      console.error('Error uploading evidence:', error);
      toast.error('Failed to upload evidence');
      throw error;
    }
  };

  return {
    trips,
    activeTrip,
    loading,
    startTrip,
    endTrip,
    recordLocationPoint,
    uploadEvidence,
    refreshTrips: loadTrips
  };
}

async function getCurrentPosition(): Promise<GeolocationPosition> {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error('Geolocation is not supported by your browser'));
      return;
    }

    navigator.geolocation.getCurrentPosition(
      resolve,
      (error) => {
        switch (error.code) {
          case error.PERMISSION_DENIED:
            reject(new Error('User denied the request for Geolocation.'));
            break;
          case error.POSITION_UNAVAILABLE:
            reject(new Error('Location information is unavailable.'));
            break;
          case error.TIMEOUT:
            reject(new Error('The request to get user location timed out.'));
            break;
          default:
            reject(new Error('An unknown error occurred while getting location.'));
            break;
        }
      },
      {
        enableHighAccuracy: true,
        timeout: 30000,
        // Allow using a recent cached position (up to 5 minutes old)
        maximumAge: 300000
      }
    );
  });
}

async function getBatteryLevel(): Promise<number> {
  try {
    const battery = await (navigator as any).getBattery();
    return Math.round(battery.level * 100);
  } catch {
    return 100; // Default if not available
  }
}
