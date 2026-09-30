import React, { useState, useMemo } from 'react';
import {
  Maximize2,
  Minimize2,
  Radio,
  Crosshair,
  RotateCw,
  Compass,
  Smartphone,
  ShieldCheck,
  AlertTriangle,
} from 'lucide-react';

interface GeofenceVisualizerProps {
  teacherLat: number;
  teacherLng: number;
  studentLat?: number | null;
  studentLng?: number | null;
  radiusMeters?: number;
  distanceMeters?: number | null;
  teacherName?: string;
  studentLabel?: string;
  interactive?: boolean;
  onPositionChange?: (newLat: number, newLng: number, distanceMeters: number) => void;
  className?: string;
}

export const GeofenceVisualizer: React.FC<GeofenceVisualizerProps> = ({
  teacherLat,
  teacherLng,
  studentLat = null,
  studentLng = null,
  radiusMeters = 10,
  distanceMeters = null,
  teacherName = "Teacher's Live Mobile Beacon",
  studentLabel = 'Your Phone',
  interactive = false,
  onPositionChange,
  className = '',
}) => {
  // Zoom modes: 'close' (focus on classroom perimeter) or 'extended' (overview)
  const [zoomMode, setZoomMode] = useState<'close' | 'extended'>('close');
  const [sweepActive, setSweepActive] = useState<boolean>(true);

  // SVG canvas dimensions
  const viewBoxSize = 500;
  const center = viewBoxSize / 2;

  // Max distance mapped to edge of radar
  const maxDistance = useMemo(() => {
    if (zoomMode === 'close') {
      return Math.max(radiusMeters * 2, 25);
    }
    return Math.max(radiusMeters * 6, 120);
  }, [zoomMode, radiusMeters]);

  const pixelsPerMeter = (center - 35) / maxDistance;

  // Calculate actual distance if not passed
  const currentDistance = useMemo(() => {
    if (distanceMeters !== null && distanceMeters !== undefined) {
      return distanceMeters;
    }
    if (studentLat !== null && studentLat !== undefined && studentLng !== null && studentLng !== undefined) {
      const R = 6371000;
      const toRad = (angle: number) => (angle * Math.PI) / 180;
      const dLat = toRad(studentLat - teacherLat);
      const dLon = toRad(studentLng - teacherLng);
      const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.sin(dLon / 2) * Math.sin(dLon / 2) * Math.cos(toRad(teacherLat)) * Math.cos(toRad(studentLat));
      const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
      return Math.round(R * c * 10) / 10;
    }
    return 0;
  }, [distanceMeters, studentLat, studentLng, teacherLat, teacherLng]);

  const isInside = currentDistance <= radiusMeters;

  // Calculate bearing angle from Teacher to Student (clockwise in degrees from North)
  const bearingFromTeacher = useMemo(() => {
    if (studentLat === null || studentLat === undefined || studentLng === null || studentLng === undefined) {
      return 45; // Default 45 deg angle if no live coords yet
    }
    const toRad = (angle: number) => (angle * Math.PI) / 180;
    const toDeg = (angle: number) => (angle * 180) / Math.PI;

    const lat1 = toRad(teacherLat);
    const lat2 = toRad(studentLat);
    const dLng = toRad(studentLng - teacherLng);

    const y = Math.sin(dLng) * Math.cos(lat2);
    const x = Math.cos(lat1) * Math.sin(lat2) - Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLng);
    const brng = toDeg(Math.atan2(y, x));
    return (brng + 360) % 360;
  }, [studentLat, studentLng, teacherLat, teacherLng]);

  // Concentric ring definitions tailored to the active geofence radius
  const rings = useMemo(() => {
    const fenceR = radiusMeters;
    if (zoomMode === 'close') {
      const step1 = Math.round(fenceR * 0.4);
      const step2 = Math.round(fenceR * 0.7);
      const stepOuter = Math.round(fenceR * 1.5);
      return [
        { radius: step1, label: `${step1}m`, isFence: false },
        { radius: step2, label: `${step2}m`, isFence: false },
        { radius: fenceR, label: `${fenceR}m Teacher Perimeter`, isFence: true },
        { radius: stepOuter, label: `${stepOuter}m`, isFence: false },
      ];
    }
    const r1 = Math.round(fenceR * 0.5);
    const r2 = fenceR;
    const r3 = Math.round(fenceR * 2.5);
    const r4 = Math.round(fenceR * 4.5);
    return [
      { radius: r1, label: `${r1}m`, isFence: false },
      { radius: r2, label: `${r2}m Geofence`, isFence: true },
      { radius: r3, label: `${r3}m`, isFence: false },
      { radius: r4, label: `${r4}m`, isFence: false },
    ];
  }, [zoomMode, radiusMeters]);

  // Calculate student user position on SVG canvas
  const userPos = useMemo(() => {
    const clampedDist = Math.min(currentDistance, maxDistance * 1.05);
    const pixelDist = clampedDist * pixelsPerMeter;
    const rad = (bearingFromTeacher * Math.PI) / 180;

    const x = center + pixelDist * Math.sin(rad);
    const y = center - pixelDist * Math.cos(rad);

    return { x, y, pixelDist };
  }, [currentDistance, bearingFromTeacher, pixelsPerMeter, center, maxDistance]);

  // Interactive click on radar to test/move coordinates
  const handleSvgClick = (e: React.MouseEvent<SVGSVGElement>) => {
    if (!interactive || !onPositionChange) return;

    const rect = e.currentTarget.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const clickY = e.clientY - rect.top;

    // Convert to SVG coordinates
    const svgX = (clickX / rect.width) * viewBoxSize;
    const svgY = (clickY / rect.height) * viewBoxSize;

    const dx = svgX - center;
    const dy = svgY - center;

    const clickPixelDist = Math.sqrt(dx * dx + dy * dy);
    const clickMeters = clickPixelDist / pixelsPerMeter;

    // Calculate angle in radians clockwise from North
    const rad = Math.atan2(dx, -dy);

    // Approximate conversion to Lat/Lng offsets around Mumbai (19.2138, 72.8648)
    // 1 deg lat ~ 111,000 meters. 1 deg lng ~ 111,000 * cos(19.21 deg) ~ 104,800 meters
    const deltaLat = (clickMeters * Math.cos(rad)) / 111000;
    const deltaLng = (clickMeters * Math.sin(rad)) / 104800;

    const newLat = teacherLat + deltaLat;
    const newLng = teacherLng + deltaLng;

    onPositionChange(newLat, newLng, Math.round(clickMeters * 10) / 10);
  };

  return (
    <div className={`bg-stone-950 rounded-2xl border border-stone-800 p-4 sm:p-5 text-stone-100 shadow-xl overflow-hidden relative ${className}`}>
      {/* Top Controls Bar */}
      <div className="flex items-center justify-between gap-2 pb-3.5 border-b border-stone-800/80 mb-3 z-10 relative">
        <div className="flex items-center gap-2">
          <div className="p-1.5 bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 rounded-lg">
            <Radio className="w-4 h-4 animate-pulse" />
          </div>
          <div>
            <h3 className="text-xs sm:text-sm font-bold text-white flex items-center gap-1.5">
              <span>Teacher Proximity Radar</span>
              <span className={`text-[10px] font-mono px-2 py-0.5 rounded-full border ${
                isInside
                  ? 'bg-emerald-950/80 text-emerald-300 border-emerald-700'
                  : 'bg-rose-950/80 text-rose-300 border-rose-700'
              }`}>
                {radiusMeters}m Geofence Lock
              </span>
            </h3>
            <p className="text-[11px] text-stone-400">
              Polar sonar projection centered at {teacherName}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          {/* Zoom Toggle */}
          <button
            type="button"
            onClick={() => setZoomMode(zoomMode === 'close' ? 'extended' : 'close')}
            className="flex items-center gap-1 text-[11px] px-2.5 py-1.5 rounded-lg bg-stone-800/90 hover:bg-stone-700 border border-stone-700 text-stone-200 transition-colors cursor-pointer"
            title="Toggle Radar Zoom"
          >
            {zoomMode === 'close' ? (
              <>
                <Maximize2 className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Overview</span>
              </>
            ) : (
              <>
                <Minimize2 className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Close-up</span>
              </>
            )}
          </button>

          {/* Sweep Animation Toggle */}
          <button
            type="button"
            onClick={() => setSweepActive(!sweepActive)}
            className={`p-1.5 rounded-lg border text-xs transition-colors cursor-pointer ${
              sweepActive
                ? 'bg-emerald-600/30 border-emerald-500/50 text-emerald-300'
                : 'bg-stone-800 border-stone-700 text-stone-400'
            }`}
            title="Toggle Sweep Animation"
          >
            <RotateCw className={`w-3.5 h-3.5 ${sweepActive ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Main Radar SVG Display */}
      <div className="relative w-full aspect-square max-w-[420px] sm:max-w-[460px] mx-auto flex items-center justify-center">
        <svg
          viewBox={`0 0 ${viewBoxSize} ${viewBoxSize}`}
          className={`w-full h-full select-none ${interactive ? 'cursor-crosshair' : ''}`}
          onClick={handleSvgClick}
        >
          <defs>
            {/* Radar Background Radial Gradient */}
            <radialGradient id="radarBg" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#0c1222" />
              <stop offset="70%" stopColor="#060913" />
              <stop offset="100%" stopColor="#02040a" />
            </radialGradient>

            {/* Sweep Beam Gradient */}
            <radialGradient id="sweepGradient" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="rgba(16, 185, 129, 0.45)" />
              <stop offset="60%" stopColor="rgba(16, 185, 129, 0.12)" />
              <stop offset="100%" stopColor="transparent" />
            </radialGradient>

            {/* Allowed Perimeter Emerald Glow */}
            <filter id="emeraldGlow" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="3.5" result="blur" />
              <feComposite in="SourceGraphic" in2="blur" operator="over" />
            </filter>
          </defs>

          {/* Radar base circle */}
          <circle cx={center} cy={center} r={center - 10} fill="url(#radarBg)" stroke="#1e293b" strokeWidth="2" />

          {/* Compass Axes Lines */}
          <line x1={center} y1={20} x2={center} y2={viewBoxSize - 20} stroke="#1e293b" strokeWidth="1" strokeDasharray="3,3" />
          <line x1={20} y1={center} x2={viewBoxSize - 20} y2={center} stroke="#1e293b" strokeWidth="1" strokeDasharray="3,3" />
          <line x1={center - 140} y1={center - 140} x2={center + 140} y2={center + 140} stroke="#1e293b" strokeWidth="0.7" strokeDasharray="2,4" />
          <line x1={center - 140} y1={center + 140} x2={center + 140} y2={center - 140} stroke="#1e293b" strokeWidth="0.7" strokeDasharray="2,4" />

          {/* Concentric Distance Rings */}
          {rings.map((ring) => {
            const r = ring.radius * pixelsPerMeter;
            return (
              <g key={ring.radius}>
                <circle
                  cx={center}
                  cy={center}
                  r={r}
                  fill={ring.isFence ? 'rgba(16, 185, 129, 0.06)' : 'none'}
                  stroke={ring.isFence ? '#10b981' : '#1e293b'}
                  strokeWidth={ring.isFence ? '2.5' : '1'}
                  strokeDasharray={ring.isFence ? '6,3' : '2,2'}
                  filter={ring.isFence ? 'url(#emeraldGlow)' : undefined}
                />
                <text
                  x={center + 6}
                  y={center - r + 12}
                  fill={ring.isFence ? '#34d399' : '#64748b'}
                  fontSize="10"
                  fontFamily="monospace"
                  fontWeight={ring.isFence ? 'bold' : 'normal'}
                >
                  {ring.label}
                </text>
              </g>
            );
          })}

          {/* Sweeping Radar Beam */}
          {sweepActive && (
            <g className="animate-radar-sweep">
              <path
                d={`M ${center} ${center} L ${center} 20 A ${center - 20} ${center - 20} 0 0 1 ${center + (center - 20) * 0.707} ${center - (center - 20) * 0.707} Z`}
                fill="url(#sweepGradient)"
              />
              <line
                x1={center}
                y1={center}
                x2={center}
                y2={20}
                stroke="#10b981"
                strokeWidth="2"
                strokeLinecap="round"
                opacity="0.95"
              />
            </g>
          )}

          {/* Radial Vector Line from Teacher Center to Student */}
          <line
            x1={center}
            y1={center}
            x2={userPos.x}
            y2={userPos.y}
            stroke={isInside ? '#34d399' : '#f43f5e'}
            strokeWidth="2"
            strokeDasharray="4,3"
          />

          {/* Distance Indicator Floating Badge */}
          <g transform={`translate(${(center + userPos.x) / 2}, ${(center + userPos.y) / 2})`}>
            <rect
              x="-26"
              y="-10"
              width="52"
              height="20"
              rx="5"
              fill="#090d16"
              stroke={isInside ? '#10b981' : '#f43f5e'}
              strokeWidth="1.2"
            />
            <text
              x="0"
              y="3.5"
              textAnchor="middle"
              fill={isInside ? '#a7f3d0' : '#fecdd3'}
              fontSize="9.5"
              fontFamily="monospace"
              fontWeight="bold"
            >
              {currentDistance}m
            </text>
          </g>

          {/* Teacher Benchmark Center Pin */}
          <g>
            <circle cx={center} cy={center} r="8" fill="#10b981" stroke="#ffffff" strokeWidth="2.5" />
            <circle cx={center} cy={center} r="16" fill="none" stroke="#10b981" strokeWidth="1.2" opacity="0.6" className="animate-ping-slow" />
            <text
              x={center}
              y={center + 24}
              textAnchor="middle"
              fill="#a7f3d0"
              fontSize="10"
              fontWeight="bold"
              fontFamily="sans-serif"
            >
              TEACHER BEACON
            </text>
          </g>

          {/* Live Student Phone Marker */}
          <g transform={`translate(${userPos.x}, ${userPos.y})`}>
            {/* Pulsing ring */}
            <circle
              cx="0"
              cy="0"
              r="16"
              fill="none"
              stroke={isInside ? '#10b981' : '#f43f5e'}
              strokeWidth="1.5"
              className="animate-ping-slow opacity-80"
            />
            {/* Core marker */}
            <circle
              cx="0"
              cy="0"
              r="7.5"
              fill={isInside ? '#10b981' : '#f43f5e'}
              stroke="#ffffff"
              strokeWidth="2"
            />
            {/* Marker Label */}
            <text
              x="0"
              y="-12"
              textAnchor="middle"
              fill={isInside ? '#34d399' : '#fb7185'}
              fontSize="10"
              fontWeight="bold"
              fontFamily="sans-serif"
            >
              {studentLabel} ({currentDistance}m)
            </text>
          </g>

          {/* Cardinal Points */}
          <text x={center} y="15" textAnchor="middle" fill="#64748b" fontSize="10" fontWeight="bold">N</text>
          <text x={viewBoxSize - 12} y={center + 4} textAnchor="middle" fill="#64748b" fontSize="10" fontWeight="bold">E</text>
          <text x={center} y={viewBoxSize - 6} textAnchor="middle" fill="#64748b" fontSize="10" fontWeight="bold">S</text>
          <text x="12" y={center + 4} textAnchor="middle" fill="#64748b" fontSize="10" fontWeight="bold">W</text>
        </svg>
      </div>

      {/* Radar Telemetry Footer */}
      <div className="mt-3.5 pt-3 border-t border-stone-800/80 flex flex-wrap items-center justify-between gap-2.5 text-xs">
        <div className="flex items-center gap-2">
          <span
            className={`w-2.5 h-2.5 rounded-full shrink-0 ${
              isInside ? 'bg-emerald-500 animate-pulse' : 'bg-rose-500'
            }`}
          />
          <span className="font-semibold text-stone-200">
            {isInside ? `Inside ${radiusMeters}m Allowed Perimeter` : `Outside ${radiusMeters}m Geofence Perimeter`}
          </span>
          <span className="text-stone-600">|</span>
          <span className="text-stone-400 font-mono text-[11px]">Bearing: {bearingFromTeacher.toFixed(1)}°</span>
        </div>

        {interactive && (
          <span className="text-[11px] text-stone-400 flex items-center gap-1">
            <Crosshair className="w-3.5 h-3.5 text-emerald-400" />
            Click anywhere on radar to relocate test position
          </span>
        )}
      </div>
    </div>
  );
};
export default GeofenceVisualizer;
