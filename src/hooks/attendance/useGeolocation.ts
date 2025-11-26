import { useState, useEffect } from 'react';

export interface GeolocationState {
  latitude: number | null;
  longitude: number | null;
  accuracy: number | null;
  loading: boolean;
  error: string | null;
  isWithinGeofence: boolean;
  distanceFromOffice: number | null; // in meters
}

interface GeofenceConfig {
  latitude: number;
  longitude: number;
  radius: number; // in meters
}

/**
 * Custom hook for geolocation tracking with geofence detection
 */
export function useGeolocation(geofence?: GeofenceConfig) {
  const [state, setState] = useState<GeolocationState>({
    latitude: null,
    longitude: null,
    accuracy: null,
    loading: true,
    error: null,
    isWithinGeofence: false,
    distanceFromOffice: null,
  });

  useEffect(() => {
    if (!('geolocation' in navigator)) {
      setState(prev => ({
        ...prev,
        loading: false,
        error: 'Geolocation is not supported by your device',
      }));
      return;
    }

    const options: PositionOptions = {
      enableHighAccuracy: true,
      timeout: 10000,
      maximumAge: 0,
    };

    const handleSuccess = (position: GeolocationPosition) => {
      const { latitude, longitude, accuracy } = position.coords;
      
      let isWithinGeofence = false;
      let distanceFromOffice = null;

      if (geofence) {
        distanceFromOffice = calculateDistance(
          latitude,
          longitude,
          geofence.latitude,
          geofence.longitude
        );
        isWithinGeofence = distanceFromOffice <= geofence.radius;
      }

      setState({
        latitude,
        longitude,
        accuracy,
        loading: false,
        error: null,
        isWithinGeofence,
        distanceFromOffice,
      });
    };

    const handleError = (error: GeolocationPositionError) => {
      let errorMessage = 'Unable to get your location';
      
      switch (error.code) {
        case error.PERMISSION_DENIED:
          errorMessage = 'Location permission denied. Please enable location access.';
          break;
        case error.POSITION_UNAVAILABLE:
          errorMessage = 'Location information unavailable.';
          break;
        case error.TIMEOUT:
          errorMessage = 'Location request timed out.';
          break;
      }

      setState(prev => ({
        ...prev,
        loading: false,
        error: errorMessage,
      }));
    };

    // Get initial position
    const watchId = navigator.geolocation.watchPosition(
      handleSuccess,
      handleError,
      options
    );

    // Cleanup
    return () => {
      navigator.geolocation.clearWatch(watchId);
    };
  }, [geofence]);

  return state;
}

/**
 * Calculate distance between two coordinates using Haversine formula
 * Returns distance in meters
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

  return R * c; // Distance in meters
}
