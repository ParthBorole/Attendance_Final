/// <reference types="@types/google.maps" />
import React, { useEffect, useState, useRef } from 'react';
import { Map, AdvancedMarker, useMap } from '@vis.gl/react-google-maps';
import { Building2, Navigation, MapPin, ZoomIn, ZoomOut, Compass, UserCheck } from 'lucide-react';

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

// Map helper to draw circle and polyline using google.maps geometry and adjust bounds
const MapOverlayHelper: React.FC<{
  collegeLat: number;
  collegeLng: number;
  studentLat?: number | null;
  studentLng?: number | null;
  radiusMeters: number;
  isInside?: boolean | null;
  accuracy?: number | null;
}> = ({ collegeLat, collegeLng, studentLat, studentLng, radiusMeters, isInside, accuracy }) => {
  const map = useMap();
  const circleRef = useRef<google.maps.Circle | null>(null);
  const accuracyCircleRef = useRef<google.maps.Circle | null>(null);
  const lineRef = useRef<google.maps.Polyline | null>(null);

  useEffect(() => {
    if (!map) return;

    const collegePos = { lat: collegeLat, lng: collegeLng };
    const circleColor = isInside === true ? '#10B981' : isInside === false ? '#EF4444' : '#F59E0B';

    // 1. Draw Attendance Radius Circle around College
    if (!circleRef.current) {
      circleRef.current = new google.maps.Circle({
        map,
        center: collegePos,
        radius: radiusMeters,
        fillColor: circleColor,
        fillOpacity: 0.18,
        strokeColor: circleColor,
        strokeOpacity: 0.9,
        strokeWeight: 2,
        clickable: false,
      });
    } else {
      circleRef.current.setCenter(collegePos);
      circleRef.current.setRadius(radiusMeters);
      circleRef.current.setOptions({
        fillColor: circleColor,
        strokeColor: circleColor,
      });
    }

    // 2. Draw Accuracy Ring around Student Blue Dot
    if (studentLat && studentLng && accuracy && accuracy > 0) {
      const studentPos = { lat: studentLat, lng: studentLng };
      if (!accuracyCircleRef.current) {
        accuracyCircleRef.current = new google.maps.Circle({
          map,
          center: studentPos,
          radius: Math.min(accuracy, 100),
          fillColor: '#2563EB',
          fillOpacity: 0.12,
          strokeColor: '#3B82F6',
          strokeOpacity: 0.6,
          strokeWeight: 1.5,
          clickable: false,
        });
      } else {
        accuracyCircleRef.current.setCenter(studentPos);
        accuracyCircleRef.current.setRadius(Math.min(accuracy, 100));
      }
    } else if (accuracyCircleRef.current) {
      accuracyCircleRef.current.setMap(null);
      accuracyCircleRef.current = null;
    }

    // 3. Draw Connecting Distance Line
    if (studentLat && studentLng) {
      const studentPos = { lat: studentLat, lng: studentLng };
      const path = [collegePos, studentPos];
      if (!lineRef.current) {
        lineRef.current = new google.maps.Polyline({
          map,
          path,
          geodesic: true,
          strokeColor: '#2563EB',
          strokeOpacity: 0.8,
          strokeWeight: 2,
          icons: [
            {
              icon: {
                path: 'M 0,-1 0,1',
                strokeOpacity: 1,
                scale: 3,
              },
              offset: '0',
              repeat: '15px',
            },
          ],
        });
      } else {
        lineRef.current.setPath(path);
      }

      // Auto-fit bounds to include college and student
      const bounds = new google.maps.LatLngBounds();
      bounds.extend(collegePos);
      bounds.extend(studentPos);
      map.fitBounds(bounds, { top: 40, bottom: 40, left: 40, right: 40 });
    } else {
      if (lineRef.current) {
        lineRef.current.setMap(null);
        lineRef.current = null;
      }
      map.setCenter(collegePos);
      map.setZoom(19);
    }

    return () => {
      if (circleRef.current) {
        circleRef.current.setMap(null);
        circleRef.current = null;
      }
      if (accuracyCircleRef.current) {
        accuracyCircleRef.current.setMap(null);
        accuracyCircleRef.current = null;
      }
      if (lineRef.current) {
        lineRef.current.setMap(null);
        lineRef.current = null;
      }
    };
  }, [map, collegeLat, collegeLng, studentLat, studentLng, radiusMeters, isInside, accuracy]);

  return null;
};

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
  const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
  const [mapType, setMapType] = useState<'roadmap' | 'hybrid'>('roadmap');

  return (
    <div className={`relative w-full rounded-2xl overflow-hidden border border-stone-200 shadow-inner bg-stone-900 ${className}`}>
      {apiKey ? (
        <Map
          defaultCenter={{ lat: collegeLat, lng: collegeLng }}
          defaultZoom={19}
          mapId="attendsecure_campus_map"
          mapTypeId={mapType}
          disableDefaultUI={true}
          gestureHandling="cooperative"
          internalUsageAttributionIds={["gmp_mcp_codeassist_v1_aistudio"]}
          className="w-full h-full"
        >
          {/* Overlays (Radius Circle, Accuracy Ring, Polyline) */}
          <MapOverlayHelper
            collegeLat={collegeLat}
            collegeLng={collegeLng}
            studentLat={studentLat}
            studentLng={studentLng}
            radiusMeters={radiusMeters}
            isInside={isInside}
            accuracy={accuracy}
          />

          {/* Official College Pin */}
          <AdvancedMarker
            position={{ lat: collegeLat, lng: collegeLng }}
            title={`${collegeName} — Official Attendance Center`}
          >
            <div className="flex flex-col items-center group cursor-pointer animate-bounce-subtle">
              <div className="bg-stone-900 text-amber-400 p-2 rounded-2xl shadow-xl border-2 border-amber-400 flex items-center justify-center">
                <Building2 className="w-5 h-5 text-amber-400" />
              </div>
              <div className="bg-stone-900/90 backdrop-blur-xs text-white text-[10px] font-bold px-2 py-0.5 rounded-md mt-1 shadow-md border border-stone-700 whitespace-nowrap">
                TSDC Center
              </div>
            </div>
          </AdvancedMarker>

          {/* Student Live GPS Marker - PROMINENT GLOWING BLUE DOT */}
          {studentLat && studentLng && (
            <AdvancedMarker
              position={{ lat: studentLat, lng: studentLng }}
              title="Your Live GPS Position (Blue Dot)"
            >
              <div className="flex flex-col items-center">
                {/* Glowing Blue Dot Marker */}
                <div className="relative flex items-center justify-center">
                  <span className="animate-ping absolute inline-flex h-9 w-9 rounded-full bg-blue-500 opacity-75"></span>
                  <div className="relative w-6 h-6 rounded-full bg-blue-600 border-2 border-white shadow-2xl ring-4 ring-blue-400/50 flex items-center justify-center">
                    <div className="w-2.5 h-2.5 rounded-full bg-white shadow-inner"></div>
                  </div>
                </div>
                
                {/* Live Blue Dot Tag */}
                <div className="bg-blue-600 text-white text-[10px] font-extrabold px-2.5 py-0.5 rounded-full mt-1.5 shadow-md border border-blue-300 flex items-center gap-1 whitespace-nowrap tracking-wide">
                  <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse"></span>
                  <span>🔵 YOU (Device Position)</span>
                </div>
              </div>
            </AdvancedMarker>
          )}
        </Map>
      ) : (
        /* Rich Interactive Vector Fallback Map showing College Pin & Blue Dot */
        <div className="relative w-full h-full bg-slate-900 text-white flex flex-col items-center justify-center p-4 overflow-hidden">
          {/* Grid lines background */}
          <div className="absolute inset-0 bg-[linear-gradient(to_right,#1e293b_1px,transparent_1px),linear-gradient(to_bottom,#1e293b_1px,transparent_1px)] bg-[size:24px_24px] opacity-40"></div>

          {/* College Center Node */}
          <div className="relative z-10 flex flex-col items-center mb-6">
            <div className="w-12 h-12 rounded-2xl bg-amber-500 text-stone-950 flex items-center justify-center shadow-lg border-2 border-amber-300">
              <Building2 className="w-6 h-6" />
            </div>
            <span className="text-xs font-bold text-amber-200 mt-1 bg-stone-900/90 px-2.5 py-0.5 rounded-md border border-stone-700">
              {collegeName} Center
            </span>
          </div>

          {/* Student Blue Dot Node if active */}
          {studentLat && studentLng && (
            <div className="relative z-10 flex flex-col items-center animate-in fade-in">
              <div className="relative flex items-center justify-center">
                <span className="animate-ping absolute inline-flex h-10 w-10 rounded-full bg-blue-500 opacity-75"></span>
                <div className="relative w-7 h-7 rounded-full bg-blue-600 border-2 border-white shadow-2xl ring-4 ring-blue-400/60 flex items-center justify-center">
                  <div className="w-3 h-3 rounded-full bg-white shadow-inner"></div>
                </div>
              </div>
              <div className="bg-blue-600 text-white text-[11px] font-extrabold px-3 py-1 rounded-full mt-2 shadow-lg border border-blue-300 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-white animate-pulse"></span>
                <span>🔵 YOU (Device Live GPS Position)</span>
              </div>
              <div className="text-[10px] text-blue-200 font-mono mt-1 bg-slate-800/90 px-2 py-0.5 rounded border border-blue-900/50">
                Lat: {studentLat.toFixed(5)} | Lng: {studentLng.toFixed(5)}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Floating Map Info Overlay */}
      <div className="absolute bottom-3 left-3 z-10 bg-stone-900/90 text-stone-100 backdrop-blur-md px-3.5 py-1.5 rounded-xl shadow-lg border border-stone-700 text-[11px] font-medium flex items-center gap-2">
        <span
          className={`w-2.5 h-2.5 rounded-full ${
            isInside ? 'bg-emerald-400' : isInside === false ? 'bg-rose-400' : 'bg-amber-400'
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

      {/* Blue Dot Legend Indicator */}
      <div className="absolute top-3 left-3 z-10 bg-blue-900/90 text-blue-100 backdrop-blur-md px-3 py-1 rounded-xl shadow-md border border-blue-700 text-[10px] font-extrabold flex items-center gap-1.5">
        <span className="w-2.5 h-2.5 rounded-full bg-blue-400 animate-ping"></span>
        <span>🔵 Live Device Blue Dot</span>
      </div>

      {/* Map Style Toggle */}
      {apiKey && (
        <div className="absolute top-3 right-3 z-10 flex items-center gap-1 bg-stone-900/90 backdrop-blur-md p-1 rounded-xl shadow-md border border-stone-700 text-[10px] font-bold text-stone-300">
          <button
            type="button"
            onClick={() => setMapType('roadmap')}
            className={`px-2 py-1 rounded-lg transition-colors cursor-pointer ${
              mapType === 'roadmap' ? 'bg-blue-600 text-white' : 'text-stone-400 hover:text-white'
            }`}
          >
            Map
          </button>
          <button
            type="button"
            onClick={() => setMapType('hybrid')}
            className={`px-2 py-1 rounded-lg transition-colors cursor-pointer ${
              mapType === 'hybrid' ? 'bg-blue-600 text-white' : 'text-stone-400 hover:text-white'
            }`}
          >
            Satellite
          </button>
        </div>
      )}
    </div>
  );
};
