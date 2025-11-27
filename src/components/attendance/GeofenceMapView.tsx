import { useEffect, useState, useCallback } from 'react';
import { GoogleMap, LoadScript, Marker, Circle } from '@react-google-maps/api';
import { X, Navigation, MapPin } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useGeolocation } from '@/hooks/attendance/useGeolocation';
import { useBranches } from '@/hooks/attendance/useBranches';
import { cn } from '@/lib/utils';

interface GeofenceMapViewProps {
  onClose: () => void;
}

const mapContainerStyle = {
  width: '100%',
  height: '100%',
};

const mapOptions = {
  disableDefaultUI: false,
  zoomControl: true,
  streetViewControl: false,
  mapTypeControl: false,
  fullscreenControl: false,
};

export function GeofenceMapView({ onClose }: GeofenceMapViewProps) {
  const [googleMapsApiKey, setGoogleMapsApiKey] = useState<string>('');
  const [mapInstance, setMapInstance] = useState<google.maps.Map | null>(null);
  
  const { branches } = useBranches();
  const { latitude, longitude, error: locationError } = useGeolocation(
    branches?.[0] ? {
      latitude: branches[0].latitude,
      longitude: branches[0].longitude,
      radius: branches[0].geofence_radius,
    } : undefined
  );

  const [nearestBranch, setNearestBranch] = useState<{
    name: string;
    distance: number;
    isWithin: boolean;
  } | null>(null);

  const center = {
    lat: latitude || 6.5244, // Lagos, Nigeria default
    lng: longitude || 3.3792,
  };

  useEffect(() => {
    // Calculate nearest branch
    if (latitude && longitude && branches) {
      let minDistance = Infinity;
      let closestBranch = null;

      branches.forEach(branch => {
        const distance = calculateDistance(
          latitude,
          longitude,
          branch.latitude,
          branch.longitude
        );
        if (distance < minDistance) {
          minDistance = distance;
          closestBranch = {
            name: branch.name,
            distance: Math.round(distance),
            isWithin: distance <= branch.geofence_radius,
          };
        }
      });

      setNearestBranch(closestBranch);
    }
  }, [latitude, longitude, branches]);

  const onMapLoad = useCallback((map: google.maps.Map) => {
    setMapInstance(map);
  }, []);

  const handleRecenter = () => {
    if (latitude && longitude && mapInstance) {
      mapInstance.panTo({ lat: latitude, lng: longitude });
      mapInstance.setZoom(16);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-background">
      {/* Header */}
      <div className="absolute top-0 left-0 right-0 z-10 bg-white/95 backdrop-blur-sm border-b shadow-sm">
        <div className="flex items-center justify-between p-4">
          <div className="flex-1">
            <h2 className="text-lg font-semibold">Geofence Map</h2>
            <p className="text-sm text-muted-foreground">Your location & branch boundaries</p>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            className="rounded-full"
          >
            <X className="h-5 w-5" />
          </Button>
        </div>
      </div>

      {/* Map Container */}
      {!googleMapsApiKey ? (
        <div className="flex flex-col items-center justify-center h-full p-6">
          <MapPin className="h-16 w-16 text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold mb-2">Google Maps API Key Required</h3>
          <p className="text-sm text-muted-foreground text-center mb-4">
            Please enter your Google Maps API key to view the geofence map
          </p>
          <input
            type="text"
            placeholder="AIzaSy..."
            value={googleMapsApiKey}
            onChange={(e) => setGoogleMapsApiKey(e.target.value)}
            className="w-full max-w-md px-4 py-2 border rounded-lg"
          />
          <p className="text-xs text-muted-foreground mt-2">
            Get your API key from{' '}
            <a
              href="https://console.cloud.google.com/google/maps-apis"
              target="_blank"
              rel="noopener noreferrer"
              className="text-attendance-primary hover:underline"
            >
              Google Cloud Console
            </a>
          </p>
        </div>
      ) : (
        <div className="absolute inset-0 pt-[73px]">
          <LoadScript googleMapsApiKey={googleMapsApiKey}>
            <GoogleMap
              mapContainerStyle={mapContainerStyle}
              center={center}
              zoom={15}
              options={mapOptions}
              onLoad={onMapLoad}
            >
              {/* User Location Marker */}
              {latitude && longitude && (
                <Marker
                  position={{ lat: latitude, lng: longitude }}
                  icon={{
                    path: google.maps.SymbolPath.CIRCLE,
                    scale: 10,
                    fillColor: '#FF6B35',
                    fillOpacity: 1,
                    strokeColor: '#ffffff',
                    strokeWeight: 3,
                  }}
                  title="Your Location"
                />
              )}

              {/* Branch Markers and Geofence Circles */}
              {branches?.map((branch, index) => (
                <div key={index}>
                  {/* Geofence Circle */}
                  <Circle
                    center={{ lat: branch.latitude, lng: branch.longitude }}
                    radius={branch.geofence_radius}
                    options={{
                      fillColor: '#FF6B35',
                      fillOpacity: 0.2,
                      strokeColor: '#FF6B35',
                      strokeWeight: 2,
                      strokeOpacity: 0.8,
                    }}
                  />
                  
                  {/* Branch Marker */}
                  <Marker
                    position={{ lat: branch.latitude, lng: branch.longitude }}
                    title={branch.name}
                    label={{
                      text: branch.name,
                      className: 'font-semibold',
                    }}
                    icon={{
                      url: 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(`
                        <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 32 32">
                          <circle cx="16" cy="16" r="14" fill="#FF6B35" stroke="white" stroke-width="2"/>
                          <path d="M16 10c-2.2 0-4 1.8-4 4 0 3 4 8 4 8s4-5 4-8c0-2.2-1.8-4-4-4zm0 5.5c-.8 0-1.5-.7-1.5-1.5s.7-1.5 1.5-1.5 1.5.7 1.5 1.5-.7 1.5-1.5 1.5z" fill="white"/>
                        </svg>
                      `),
                      scaledSize: new google.maps.Size(32, 32),
                    }}
                  />
                </div>
              ))}
            </GoogleMap>
          </LoadScript>
        </div>
      )}

      {/* Distance Indicator Card */}
      {googleMapsApiKey && nearestBranch && (
        <div className="absolute bottom-24 left-4 right-4 z-10">
          <div className={cn(
            "bg-white rounded-2xl shadow-lg p-4 border-2 transition-colors",
            nearestBranch.isWithin ? "border-green-500" : "border-orange-500"
          )}>
            <div className="flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <div className={cn(
                    "w-3 h-3 rounded-full",
                    nearestBranch.isWithin ? "bg-green-500" : "bg-orange-500"
                  )} />
                  <span className="font-semibold text-sm">
                    {nearestBranch.isWithin ? 'Within Geofence' : 'Outside Geofence'}
                  </span>
                </div>
                <p className="text-2xl font-bold text-attendance-primary">
                  {nearestBranch.distance}m
                </p>
                <p className="text-sm text-muted-foreground">
                  from {nearestBranch.name}
                </p>
              </div>
              <Button
                onClick={handleRecenter}
                size="icon"
                className="rounded-full bg-attendance-primary hover:bg-attendance-primary-hover"
              >
                <Navigation className="h-5 w-5" />
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Location Error */}
      {locationError && (
        <div className="absolute top-20 left-4 right-4 z-10">
          <div className="bg-red-50 border border-red-200 rounded-lg p-3">
            <p className="text-sm text-red-800">{locationError}</p>
          </div>
        </div>
      )}
    </div>
  );
}

function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371e3;
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
