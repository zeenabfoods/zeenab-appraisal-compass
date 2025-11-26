import { useEffect, useRef, useState } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { X, Navigation, MapPin } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useGeolocation } from '@/hooks/attendance/useGeolocation';
import { useBranches } from '@/hooks/attendance/useBranches';
import { cn } from '@/lib/utils';

interface GeofenceMapViewProps {
  onClose: () => void;
}

export function GeofenceMapView({ onClose }: GeofenceMapViewProps) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const userMarker = useRef<mapboxgl.Marker | null>(null);
  const [mapboxToken, setMapboxToken] = useState<string>('');
  
  const { branches } = useBranches();
  const { latitude, longitude, isWithinGeofence, distanceFromOffice, error: locationError } = useGeolocation(
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

  useEffect(() => {
    if (!mapContainer.current || !mapboxToken) return;

    // Initialize map
    mapboxgl.accessToken = mapboxToken;
    
    const initialCenter: [number, number] = latitude && longitude 
      ? [longitude, latitude]
      : [3.3792, 6.5244]; // Lagos, Nigeria default

    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: 'mapbox://styles/mapbox/streets-v12',
      center: initialCenter,
      zoom: 15,
    });

    map.current.addControl(new mapboxgl.NavigationControl(), 'top-right');

    // Add user location marker
    if (latitude && longitude) {
      const el = document.createElement('div');
      el.className = 'user-location-marker';
      el.style.width = '20px';
      el.style.height = '20px';
      el.style.borderRadius = '50%';
      el.style.backgroundColor = '#FF6B35';
      el.style.border = '3px solid white';
      el.style.boxShadow = '0 0 10px rgba(255, 107, 53, 0.5)';

      userMarker.current = new mapboxgl.Marker(el)
        .setLngLat([longitude, latitude])
        .addTo(map.current);
    }

    // Wait for map to load before adding circles
    map.current.on('load', () => {
      if (!map.current || !branches) return;

      // Add geofence circles for each branch
      branches.forEach((branch, index) => {
        const sourceId = `geofence-${index}`;
        const layerId = `geofence-layer-${index}`;

        // Create circle coordinates
        const circleCoords = createCircleCoordinates(
          [branch.longitude, branch.latitude],
          branch.geofence_radius
        );

        // Add source
        map.current!.addSource(sourceId, {
          type: 'geojson',
          data: {
            type: 'Feature',
            geometry: {
              type: 'Polygon',
              coordinates: [circleCoords],
            },
            properties: {},
          },
        });

        // Add fill layer
        map.current!.addLayer({
          id: layerId,
          type: 'fill',
          source: sourceId,
          paint: {
            'fill-color': '#FF6B35',
            'fill-opacity': 0.2,
          },
        });

        // Add outline layer
        map.current!.addLayer({
          id: `${layerId}-outline`,
          type: 'line',
          source: sourceId,
          paint: {
            'line-color': '#FF6B35',
            'line-width': 2,
            'line-dasharray': [2, 2],
          },
        });

        // Add branch marker
        const markerEl = document.createElement('div');
        markerEl.innerHTML = `<div class="flex items-center justify-center w-8 h-8 bg-attendance-primary rounded-full shadow-lg">
          <svg class="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 20 20">
            <path fill-rule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clip-rule="evenodd" />
          </svg>
        </div>`;

        new mapboxgl.Marker(markerEl)
          .setLngLat([branch.longitude, branch.latitude])
          .setPopup(
            new mapboxgl.Popup({ offset: 25 })
              .setHTML(`<div class="font-semibold">${branch.name}</div><div class="text-sm text-muted-foreground">${branch.geofence_radius}m radius</div>`)
          )
          .addTo(map.current!);
      });
    });

    return () => {
      map.current?.remove();
    };
  }, [mapboxToken, branches, latitude, longitude]);

  // Update user marker position
  useEffect(() => {
    if (userMarker.current && latitude && longitude) {
      userMarker.current.setLngLat([longitude, latitude]);
      map.current?.flyTo({
        center: [longitude, latitude],
        zoom: 16,
        duration: 1000,
      });
    }
  }, [latitude, longitude]);

  const handleRecenter = () => {
    if (latitude && longitude && map.current) {
      map.current.flyTo({
        center: [longitude, latitude],
        zoom: 16,
        duration: 1000,
      });
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
      {!mapboxToken ? (
        <div className="flex flex-col items-center justify-center h-full p-6">
          <MapPin className="h-16 w-16 text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold mb-2">Mapbox Token Required</h3>
          <p className="text-sm text-muted-foreground text-center mb-4">
            Please enter your Mapbox public token to view the geofence map
          </p>
          <input
            type="text"
            placeholder="pk.eyJ1..."
            value={mapboxToken}
            onChange={(e) => setMapboxToken(e.target.value)}
            className="w-full max-w-md px-4 py-2 border rounded-lg"
          />
          <p className="text-xs text-muted-foreground mt-2">
            Get your token from{' '}
            <a
              href="https://mapbox.com"
              target="_blank"
              rel="noopener noreferrer"
              className="text-attendance-primary hover:underline"
            >
              mapbox.com
            </a>
          </p>
        </div>
      ) : (
        <div ref={mapContainer} className="absolute inset-0 pt-[73px]" />
      )}

      {/* Distance Indicator Card */}
      {mapboxToken && nearestBranch && (
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

function createCircleCoordinates(center: [number, number], radiusInMeters: number): number[][] {
  const points = 64;
  const coords: number[][] = [];
  const distanceX = radiusInMeters / (111320 * Math.cos((center[1] * Math.PI) / 180));
  const distanceY = radiusInMeters / 110574;

  for (let i = 0; i < points; i++) {
    const theta = (i / points) * (2 * Math.PI);
    const x = distanceX * Math.cos(theta);
    const y = distanceY * Math.sin(theta);
    coords.push([center[0] + x, center[1] + y]);
  }
  coords.push(coords[0]);

  return coords;
}
