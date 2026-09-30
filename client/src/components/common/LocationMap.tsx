import React, { useEffect, useRef } from 'react';
import L from 'leaflet';

interface LocationMapProps {
  collegeLat: number;
  collegeLng: number;
  collegeName?: string;
  studentLat?: number | null;
  studentLng?: number | null;
  radiusMeters: number;
  isInside?: boolean;
  accuracy?: number | null;
}

export const LocationMap: React.FC<LocationMapProps> = ({
  collegeLat,
  collegeLng,
  collegeName = 'Thakur Shyamnarayan Degree College',
  studentLat,
  studentLng,
  radiusMeters,
  isInside,
  accuracy,
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const circleLayerRef = useRef<L.Circle | null>(null);
  const collegeMarkerRef = useRef<L.Marker | null>(null);
  const studentMarkerRef = useRef<L.Marker | null>(null);
  const lineLayerRef = useRef<L.Polyline | null>(null);

  useEffect(() => {
    if (!mapContainerRef.current) return;

    if (!mapInstanceRef.current) {
      const map = L.map(mapContainerRef.current, {
        center: [collegeLat, collegeLng],
        zoom: 19,
        zoomControl: true,
        attributionControl: false,
      });

      // CartoDB Positron clean map tiles (clean, light, perfect for campus maps)
      L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
        maxZoom: 20,
        subdomains: 'abcd',
      }).addTo(map);

      mapInstanceRef.current = map;
    }

    const map = mapInstanceRef.current;

    // College Building Icon
    const collegeIcon = L.divIcon({
      className: 'college-pin',
      html: `
        <div style="background-color: #1c1917; color: #fff; width: 34px; height: 34px; border-radius: 50%; display: flex; align-items: center; justify-content: center; border: 3px solid #f59e0b; box-shadow: 0 4px 8px rgba(0,0,0,0.3);">
          <svg style="width: 18px; height: 18px;" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"></path>
          </svg>
        </div>
      `,
      iconSize: [34, 34],
      iconAnchor: [17, 17],
    });

    if (collegeMarkerRef.current) {
      collegeMarkerRef.current.setLatLng([collegeLat, collegeLng]);
    } else {
      collegeMarkerRef.current = L.marker([collegeLat, collegeLng], { icon: collegeIcon })
        .addTo(map)
        .bindPopup(`<b>${collegeName}</b><br>Official Attendance Center`);
    }

    // Attendance Radius Circle
    const circleColor = isInside ? '#10b981' : isInside === false ? '#ef4444' : '#f59e0b';
    if (circleLayerRef.current) {
      circleLayerRef.current.setLatLng([collegeLat, collegeLng]);
      circleLayerRef.current.setRadius(radiusMeters);
      circleLayerRef.current.setStyle({
        color: circleColor,
        fillColor: circleColor,
        fillOpacity: 0.18,
        weight: 2,
        dashArray: isInside ? undefined : '4, 4',
      });
    } else {
      circleLayerRef.current = L.circle([collegeLat, collegeLng], {
        radius: radiusMeters,
        color: circleColor,
        fillColor: circleColor,
        fillOpacity: 0.18,
        weight: 2,
      }).addTo(map);
    }

    // Student GPS Marker
    if (studentLat && studentLng) {
      const studentColor = isInside ? '#10b981' : '#ef4444';
      const studentIcon = L.divIcon({
        className: 'student-pin',
        html: `
          <div class="pulsing-marker" style="background-color: ${studentColor}; color: #fff; width: 28px; height: 28px; border-radius: 50%; display: flex; align-items: center; justify-content: center; border: 3px solid #fff; box-shadow: 0 4px 10px rgba(0,0,0,0.35);">
            <div style="width: 8px; height: 8px; border-radius: 50%; background-color: #ffffff;"></div>
          </div>
        `,
        iconSize: [28, 28],
        iconAnchor: [14, 14],
      });

      if (studentMarkerRef.current) {
        studentMarkerRef.current.setLatLng([studentLat, studentLng]);
      } else {
        studentMarkerRef.current = L.marker([studentLat, studentLng], { icon: studentIcon })
          .addTo(map)
          .bindPopup(`<b>Your Current Location</b><br>Accuracy: ±${accuracy || 5}m`);
      }

      // Connecting line
      if (lineLayerRef.current) {
        lineLayerRef.current.setLatLngs([
          [collegeLat, collegeLng],
          [studentLat, studentLng],
        ]);
        lineLayerRef.current.setStyle({
          color: studentColor,
          weight: 2,
          dashArray: '5, 5',
        });
      } else {
        lineLayerRef.current = L.polyline(
          [
            [collegeLat, collegeLng],
            [studentLat, studentLng],
          ],
          {
            color: studentColor,
            weight: 2,
            dashArray: '5, 5',
          }
        ).addTo(map);
      }

      // Fit bounds to show both college & student
      const bounds = L.latLngBounds([
        [collegeLat, collegeLng],
        [studentLat, studentLng],
      ]);
      map.fitBounds(bounds.pad(0.3));
    } else {
      map.setView([collegeLat, collegeLng], 19);
      if (studentMarkerRef.current) {
        map.removeLayer(studentMarkerRef.current);
        studentMarkerRef.current = null;
      }
      if (lineLayerRef.current) {
        map.removeLayer(lineLayerRef.current);
        lineLayerRef.current = null;
      }
    }
  }, [collegeLat, collegeLng, collegeName, studentLat, studentLng, radiusMeters, isInside, accuracy]);

  const handleRecenter = () => {
    if (!mapInstanceRef.current) return;
    if (studentLat && studentLng) {
      const bounds = L.latLngBounds([
        [collegeLat, collegeLng],
        [studentLat, studentLng],
      ]);
      mapInstanceRef.current.fitBounds(bounds.pad(0.3));
    } else {
      mapInstanceRef.current.setView([collegeLat, collegeLng], 19);
    }
  };

  return (
    <div className="relative w-full h-64 sm:h-72 rounded-xl overflow-hidden border border-stone-200 shadow-inner bg-stone-100">
      <div ref={mapContainerRef} className="w-full h-full" />
      
      {/* Map floating control badge */}
      <div className="absolute bottom-3 left-3 z-[1000] bg-white/95 backdrop-blur-xs px-3 py-1.5 rounded-lg shadow-sm border border-stone-200/80 text-[11px] font-medium text-stone-700 flex items-center gap-2">
        <span className="w-2.5 h-2.5 rounded-full bg-amber-500"></span>
        <span>Radius: <strong className="font-mono tabular-nums">{radiusMeters}m</strong></span>
        {accuracy !== undefined && accuracy !== null && (
          <>
            <span className="text-stone-300">|</span>
            <span>GPS: <strong className="font-mono tabular-nums">±{Math.round(accuracy)}m</strong></span>
          </>
        )}
      </div>

      <button
        onClick={handleRecenter}
        type="button"
        className="absolute top-3 right-3 z-[1000] bg-white/95 hover:bg-white text-stone-700 p-2 rounded-lg shadow-sm border border-stone-200 text-xs font-semibold cursor-pointer transition-colors"
        title="Re-center map"
      >
        Center
      </button>
    </div>
  );
};
