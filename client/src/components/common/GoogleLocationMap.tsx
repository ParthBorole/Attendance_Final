import React, { useEffect, useState, useRef } from 'react';
import L from 'leaflet';
import { Building2, Navigation, MapPin, Layers, Crosshair, ZoomIn, ZoomOut, CheckCircle2, AlertTriangle } from 'lucide-react';

interface GoogleLocationMapProps {
  collegeLat: number;
  collegeLng: number;
  collegeName?: string;
  studentLat?: number | null;
  studentLng?: number | null;
  radiusMeters: number;
  isInside?: boolean | null;
  accuracy?: number | null;
  className?: string;
}

export const GoogleLocationMap: React.FC<GoogleLocationMapProps> = ({
  collegeLat,
  collegeLng,
  collegeName = 'Thakur Shyamnarayan Degree College',
  studentLat,
  studentLng,
  radiusMeters,
  isInside,
  accuracy,
  className = 'h-64 sm:h-72',
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const tileLayerRef = useRef<L.TileLayer | null>(null);
  const circleLayerRef = useRef<L.Circle | null>(null);
  const accuracyCircleRef = useRef<L.Circle | null>(null);
  const collegeMarkerRef = useRef<L.Marker | null>(null);
  const studentMarkerRef = useRef<L.Marker | null>(null);
  const lineLayerRef = useRef<L.Polyline | null>(null);

  // Map view style: 'satellite' (Hybrid Aerial with roads/labels) vs 'street' (Roadmap)
  const [mapStyle, setMapStyle] = useState<'satellite' | 'street'>('satellite');

  // Tile URL definitions
  const getTileConfig = (style: 'satellite' | 'street') => {
    if (style === 'satellite') {
      // Google Hybrid Satellite Tiles (High-resolution aerial photography + roads + building names)
      return {
        url: 'https://mt1.google.com/vt/lyrs=y&x={x}&y={y}&z={z}',
        attribution: '&copy; Google Maps Satellite Imagery',
        maxZoom: 20,
        subdomains: ['mt0', 'mt1', 'mt2', 'mt3'],
      };
    } else {
      // Clean CartoDB Voyager street map
      return {
        url: 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png',
        attribution: '&copy; OpenStreetMap &copy; CARTO',
        maxZoom: 20,
        subdomains: 'abcd',
      };
    }
  };

  // Initialize Leaflet Map
  useEffect(() => {
    if (!mapContainerRef.current) return;

    if (!mapInstanceRef.current) {
      const map = L.map(mapContainerRef.current, {
        center: [collegeLat, collegeLng],
        zoom: 19,
        zoomControl: false,
        attributionControl: false,
      });

      const config = getTileConfig(mapStyle);
      const layer = L.tileLayer(config.url, {
        maxZoom: config.maxZoom,
        subdomains: config.subdomains,
      }).addTo(map);

      tileLayerRef.current = layer;
      mapInstanceRef.current = map;
    }

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, []);

  // Update Tile Layer when mapStyle changes
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    if (tileLayerRef.current) {
      map.removeLayer(tileLayerRef.current);
    }

    const config = getTileConfig(mapStyle);
    const layer = L.tileLayer(config.url, {
      maxZoom: config.maxZoom,
      subdomains: config.subdomains,
    }).addTo(map);

    tileLayerRef.current = layer;
  }, [mapStyle]);

  // Update Map Markers, Circles, and Bounds
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    const collegePos: L.LatLngExpression = [collegeLat, collegeLng];

    // 1. College Anchor Marker
    const collegeIcon = L.divIcon({
      className: 'college-satellite-pin',
      html: `
        <div style="display: flex; flex-direction: column; align-items: center; cursor: pointer; transform: translate(-50%, -50%);">
          <div style="background-color: #0f172a; color: #fbbf24; width: 36px; height: 36px; border-radius: 12px; display: flex; align-items: center; justify-content: center; border: 2.5px solid #fbbf24; box-shadow: 0 4px 12px rgba(0,0,0,0.5);">
            <svg style="width: 20px; height: 20px;" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"></path>
            </svg>
          </div>
          <div style="background-color: rgba(15, 23, 42, 0.9); color: #fff; font-size: 10px; font-weight: 800; padding: 2px 6px; border-radius: 6px; margin-top: 4px; border: 1px solid #334155; white-space: nowrap; box-shadow: 0 2px 6px rgba(0,0,0,0.4);">
            TSDC Center
          </div>
        </div>
      `,
      iconSize: [36, 56],
      iconAnchor: [0, 0],
    });

    if (collegeMarkerRef.current) {
      collegeMarkerRef.current.setLatLng(collegePos);
    } else {
      collegeMarkerRef.current = L.marker(collegePos, { icon: collegeIcon })
        .addTo(map)
        .bindPopup(`<b>${collegeName}</b><br>Official Attendance Center`);
    }

    // 2. Geofence Radius Circle
    const circleColor = isInside === true ? '#10b981' : isInside === false ? '#ef4444' : '#f59e0b';
    if (circleLayerRef.current) {
      circleLayerRef.current.setLatLng(collegePos);
      circleLayerRef.current.setRadius(radiusMeters);
      circleLayerRef.current.setStyle({
        color: circleColor,
        fillColor: circleColor,
        fillOpacity: 0.18,
        weight: 2.5,
        dashArray: isInside ? undefined : '5, 5',
      });
    } else {
      circleLayerRef.current = L.circle(collegePos, {
        radius: radiusMeters,
        color: circleColor,
        fillColor: circleColor,
        fillOpacity: 0.18,
        weight: 2.5,
        dashArray: isInside ? undefined : '5, 5',
      }).addTo(map);
    }

    // 3. Student Live GPS Blue Dot Marker
    if (studentLat && studentLng) {
      const studentPos: L.LatLngExpression = [studentLat, studentLng];
      const studentColor = isInside ? '#10b981' : '#3b82f6';

      const studentIcon = L.divIcon({
        className: 'student-satellite-pin',
        html: `
          <div style="display: flex; flex-direction: column; align-items: center; cursor: pointer; transform: translate(-50%, -50%);">
            <div style="position: relative; display: flex; align-items: center; justify-content: center;">
              <div style="position: absolute; width: 34px; height: 34px; border-radius: 50%; background-color: rgba(59, 130, 246, 0.4); animation: ping 1.5s cubic-bezier(0, 0, 0.2, 1) infinite;"></div>
              <div style="width: 22px; height: 22px; border-radius: 50%; background-color: #2563eb; border: 3px solid #ffffff; box-shadow: 0 4px 12px rgba(0,0,0,0.6); display: flex; align-items: center; justify-content: center;">
                <div style="width: 6px; height: 6px; border-radius: 50%; background-color: #ffffff;"></div>
              </div>
            </div>
            <div style="background-color: #2563eb; color: #ffffff; font-size: 10px; font-weight: 800; padding: 2px 8px; border-radius: 12px; margin-top: 4px; border: 1.5px solid #93c5fd; white-space: nowrap; box-shadow: 0 2px 8px rgba(0,0,0,0.4); display: flex; align-items: center; gap: 4px;">
              <span>🔵 YOU (Device GPS)</span>
            </div>
          </div>
        `,
        iconSize: [34, 52],
        iconAnchor: [0, 0],
      });

      if (studentMarkerRef.current) {
        studentMarkerRef.current.setLatLng(studentPos);
      } else {
        studentMarkerRef.current = L.marker(studentPos, { icon: studentIcon })
          .addTo(map)
          .bindPopup(`<b>Your Device Location</b><br>Accuracy: ±${accuracy || 5}m`);
      }

      // Accuracy ring
      if (accuracy && accuracy > 0) {
        if (accuracyCircleRef.current) {
          accuracyCircleRef.current.setLatLng(studentPos);
          accuracyCircleRef.current.setRadius(Math.min(accuracy, 80));
        } else {
          accuracyCircleRef.current = L.circle(studentPos, {
            radius: Math.min(accuracy, 80),
            color: '#3b82f6',
            fillColor: '#60a5fa',
            fillOpacity: 0.15,
            weight: 1.5,
          }).addTo(map);
        }
      }

      // Connecting Polyline
      if (lineLayerRef.current) {
        lineLayerRef.current.setLatLngs([collegePos, studentPos]);
        lineLayerRef.current.setStyle({ color: studentColor });
      } else {
        lineLayerRef.current = L.polyline([collegePos, studentPos], {
          color: studentColor,
          weight: 2.5,
          dashArray: '6, 6',
          opacity: 0.85,
        }).addTo(map);
      }

      // Fit bounds to show college & student
      const bounds = L.latLngBounds([collegePos, studentPos]);
      map.fitBounds(bounds.pad(0.35), { maxZoom: 19, padding: [30, 30] });
    } else {
      if (studentMarkerRef.current) {
        map.removeLayer(studentMarkerRef.current);
        studentMarkerRef.current = null;
      }
      if (accuracyCircleRef.current) {
        map.removeLayer(accuracyCircleRef.current);
        accuracyCircleRef.current = null;
      }
      if (lineLayerRef.current) {
        map.removeLayer(lineLayerRef.current);
        lineLayerRef.current = null;
      }
      map.setView(collegePos, 19);
    }
  }, [collegeLat, collegeLng, studentLat, studentLng, radiusMeters, isInside, accuracy]);

  // Recenter actions
  const handleRecenterCollege = () => {
    if (mapInstanceRef.current) {
      mapInstanceRef.current.setView([collegeLat, collegeLng], 19);
    }
  };

  const handleRecenterStudent = () => {
    if (mapInstanceRef.current && studentLat && studentLng) {
      mapInstanceRef.current.setView([studentLat, studentLng], 19);
    }
  };

  const handleZoomIn = () => {
    if (mapInstanceRef.current) {
      mapInstanceRef.current.zoomIn();
    }
  };

  const handleZoomOut = () => {
    if (mapInstanceRef.current) {
      mapInstanceRef.current.zoomOut();
    }
  };

  return (
    <div className={`relative w-full rounded-2xl overflow-hidden border border-stone-800 shadow-xl bg-stone-950 ${className}`}>
      {/* Real Leaflet Satellite / Street Map Container */}
      <div ref={mapContainerRef} className="w-full h-full z-0" />

      {/* Top Left: Live Blue Dot Banner */}
      <div className="absolute top-3 left-3 z-10 bg-slate-900/90 text-white backdrop-blur-md px-3 py-1 rounded-xl shadow-lg border border-slate-700 text-[10px] font-extrabold flex items-center gap-1.5 pointer-events-none">
        <span className="w-2 h-2 rounded-full bg-blue-400 animate-ping"></span>
        <span>🛰️ HD Satellite Imagery</span>
      </div>

      {/* Top Right: Satellite / Street Map Switcher */}
      <div className="absolute top-3 right-3 z-10 flex items-center gap-1 bg-stone-900/90 backdrop-blur-md p-1 rounded-xl shadow-lg border border-stone-700 text-xs font-bold text-stone-200">
        <button
          type="button"
          onClick={() => setMapStyle('satellite')}
          className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer flex items-center gap-1 text-[11px] ${
            mapStyle === 'satellite'
              ? 'bg-blue-600 text-white shadow-xs'
              : 'text-stone-400 hover:text-white'
          }`}
          title="Switch to Real Satellite Aerial Imagery"
        >
          <span>🛰️ Satellite</span>
        </button>
        <button
          type="button"
          onClick={() => setMapStyle('street')}
          className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer flex items-center gap-1 text-[11px] ${
            mapStyle === 'street'
              ? 'bg-blue-600 text-white shadow-xs'
              : 'text-stone-400 hover:text-white'
          }`}
          title="Switch to Street Map"
        >
          <span>🗺️ Street</span>
        </button>
      </div>

      {/* Bottom Right: Map Zoom & Recenter Controls */}
      <div className="absolute bottom-3 right-3 z-10 flex flex-col gap-1.5">
        <button
          type="button"
          onClick={handleZoomIn}
          className="w-7 h-7 bg-stone-900/90 hover:bg-black text-white rounded-lg border border-stone-700 flex items-center justify-center text-sm font-bold shadow-md cursor-pointer transition-colors"
          title="Zoom In"
        >
          +
        </button>
        <button
          type="button"
          onClick={handleZoomOut}
          className="w-7 h-7 bg-stone-900/90 hover:bg-black text-white rounded-lg border border-stone-700 flex items-center justify-center text-sm font-bold shadow-md cursor-pointer transition-colors"
          title="Zoom Out"
        >
          -
        </button>
        <button
          type="button"
          onClick={studentLat && studentLng ? handleRecenterStudent : handleRecenterCollege}
          className="w-7 h-7 bg-blue-600 hover:bg-blue-700 text-white rounded-lg border border-blue-500 flex items-center justify-center text-xs shadow-md cursor-pointer transition-colors"
          title={studentLat && studentLng ? 'Center on My GPS Location' : 'Center on College'}
        >
          <Crosshair className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Bottom Left: Floating Metric Chip */}
      <div className="absolute bottom-3 left-3 z-10 bg-stone-950/90 text-stone-100 backdrop-blur-md px-3 py-1.5 rounded-xl shadow-lg border border-stone-800 text-[11px] font-medium flex items-center gap-2 pointer-events-none">
        <span
          className={`w-2.5 h-2.5 rounded-full ${
            isInside === true
              ? 'bg-emerald-400'
              : isInside === false
              ? 'bg-rose-400'
              : 'bg-amber-400'
          }`}
        ></span>
        <span>
          Allowed Radius: <strong className="font-mono text-emerald-400">{radiusMeters}m</strong>
        </span>
        {accuracy !== undefined && accuracy !== null && (
          <>
            <span className="text-stone-600">|</span>
            <span>
              GPS Accuracy: <strong className="font-mono text-blue-400">±{Math.round(accuracy)}m</strong>
            </span>
          </>
        )}
      </div>
    </div>
  );
};
