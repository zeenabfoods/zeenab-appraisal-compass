import { useEffect, useRef, useState } from 'react';
import { Card } from '@/components/ui/card';
import { Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

interface FieldTripMapTrackerProps {
  tripId: string;
  showRoute?: boolean;
}

export function FieldTripMapTracker({ tripId, showRoute = true }: FieldTripMapTrackerProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [map, setMap] = useState<google.maps.Map | null>(null);
  const [apiKey, setApiKey] = useState<string | null>(null);

  useEffect(() => {
    // Load Google Maps API key
    const loadApiKey = async () => {
      try {
        const { data, error: keyError } = await supabase.functions.invoke('get-google-maps-key');
        if (keyError) throw keyError;
        setApiKey(data.apiKey);
      } catch (err) {
        console.error('Error loading API key:', err);
        setError('Failed to load map configuration');
      }
    };
    loadApiKey();
  }, []);

  useEffect(() => {
    if (!apiKey || !mapRef.current) return;

    // Load Google Maps script
    const script = document.createElement('script');
    script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=geometry`;
    script.async = true;
    script.onload = initializeMap;
    document.head.appendChild(script);

    return () => {
      document.head.removeChild(script);
    };
  }, [apiKey]);

  const initializeMap = async () => {
    if (!mapRef.current) return;

    try {
      // Fetch trip data and location points
      const { data: trip, error: tripError } = await supabase
        .from('field_trips')
        .select('*')
        .eq('id', tripId)
        .single();

      if (tripError) throw tripError;

      const { data: points, error: pointsError } = await supabase
        .from('location_points')
        .select('*')
        .eq('trip_id', tripId)
        .order('timestamp', { ascending: true });

      if (pointsError) throw pointsError;

      // Initialize map
      const mapInstance = new google.maps.Map(mapRef.current, {
        zoom: 13,
        center: { 
          lat: trip.start_location_lat || 0, 
          lng: trip.start_location_lng || 0 
        },
        mapTypeControl: true,
        streetViewControl: false,
        fullscreenControl: true,
      });

      setMap(mapInstance);

      // Add start marker
      if (trip.start_location_lat && trip.start_location_lng) {
        new google.maps.Marker({
          position: { lat: trip.start_location_lat, lng: trip.start_location_lng },
          map: mapInstance,
          title: 'Start Location',
          icon: {
            path: google.maps.SymbolPath.CIRCLE,
            scale: 10,
            fillColor: '#10b981',
            fillOpacity: 1,
            strokeColor: '#fff',
            strokeWeight: 2,
          },
          label: {
            text: 'S',
            color: '#fff',
            fontWeight: 'bold',
          },
        });
      }

      // Add end marker if trip is completed
      if (trip.status === 'completed' && trip.end_location_lat && trip.end_location_lng) {
        new google.maps.Marker({
          position: { lat: trip.end_location_lat, lng: trip.end_location_lng },
          map: mapInstance,
          title: 'End Location',
          icon: {
            path: google.maps.SymbolPath.CIRCLE,
            scale: 10,
            fillColor: '#ef4444',
            fillOpacity: 1,
            strokeColor: '#fff',
            strokeWeight: 2,
          },
          label: {
            text: 'E',
            color: '#fff',
            fontWeight: 'bold',
          },
        });
      }

      // Draw route if requested
      if (showRoute && points && points.length > 0) {
        const path = points.map(p => ({
          lat: Number(p.latitude),
          lng: Number(p.longitude)
        }));

        new google.maps.Polyline({
          path,
          geodesic: true,
          strokeColor: '#f97316',
          strokeOpacity: 0.8,
          strokeWeight: 4,
          map: mapInstance,
        });

        // Add markers for each location point
        points.forEach((point, index) => {
          new google.maps.Marker({
            position: { lat: Number(point.latitude), lng: Number(point.longitude) },
            map: mapInstance,
            title: `Point ${index + 1}`,
            icon: {
              path: google.maps.SymbolPath.CIRCLE,
              scale: 5,
              fillColor: '#f97316',
              fillOpacity: 0.8,
              strokeColor: '#fff',
              strokeWeight: 1,
            },
          });
        });

        // Fit bounds to show all points
        const bounds = new google.maps.LatLngBounds();
        path.forEach(p => bounds.extend(p));
        if (trip.start_location_lat && trip.start_location_lng) {
          bounds.extend({ lat: trip.start_location_lat, lng: trip.start_location_lng });
        }
        if (trip.end_location_lat && trip.end_location_lng) {
          bounds.extend({ lat: trip.end_location_lat, lng: trip.end_location_lng });
        }
        mapInstance.fitBounds(bounds);
      }

      setLoading(false);
    } catch (err) {
      console.error('Error initializing map:', err);
      setError('Failed to load trip data');
      setLoading(false);
    }
  };

  if (error) {
    return (
      <Card className="p-6 text-center text-red-600">
        {error}
      </Card>
    );
  }

  return (
    <Card className="relative overflow-hidden">
      {loading && (
        <div className="absolute inset-0 flex items-center justify-center bg-white/90 dark:bg-gray-900/90 z-10">
          <Loader2 className="h-8 w-8 animate-spin text-orange-500" />
        </div>
      )}
      <div ref={mapRef} className="w-full h-[500px]" />
    </Card>
  );
}
