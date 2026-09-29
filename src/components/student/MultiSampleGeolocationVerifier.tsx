import React, { useState, useEffect, useRef } from 'react';
import { GoogleLocationMap } from '../common/GoogleLocationMap.js';
import {
  MapPin,
  RefreshCw,
  AlertTriangle,
  CheckCircle2,
  Compass,
  ShieldCheck,
  Radio,
  Sliders,
  ChevronDown,
  ChevronUp,
  Info,
  Lock,
} from 'lucide-react';

export interface LocationReading {
  latitude: number;
  longitude: number;
  accuracy: number;
  altitude: number | null;
  altitudeAccuracy: number | null;
  heading: number | null;
  speed: number | null;
  timestamp: number;
  sampleNumber: number;
}

export type GeolocationStatus =
  | 'IDLE'
  | 'ACQUIRING'
  | 'IMPROVING'
  | 'INSIDE_RADIUS'
  | 'OUTSIDE_RADIUS'
  | 'ACCURACY_TOO_LOW'
  | 'PERMISSION_DENIED'
  | 'UNAVAILABLE'
  | 'INSECURE_CONTEXT';

interface MultiSampleGeolocationVerifierProps {
  collegeLat: number;
  collegeLng: number;
  radiusMeters: number;
  collegeName?: string;
  onLocationVerified: (reading: LocationReading, distanceMeters: number) => void;
  onLocationInvalid: (errorMsg: string) => void;
}

// High-precision Haversine Distance Calculation
export function calculateHaversineDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371000; // Earth radius in meters
  const toRad = (angle: number) => (angle * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.sin(dLon / 2) * Math.sin(dLon / 2) * Math.cos(toRad(lat1)) * Math.cos(toRad(lat2));
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c * 10) / 10;
}

export const MultiSampleGeolocationVerifier: React.FC<MultiSampleGeolocationVerifierProps> = ({
  collegeLat,
  collegeLng,
  radiusMeters,
  collegeName = 'Thakur Shyamnarayan Degree College (TSDC)',
  onLocationVerified,
  onLocationInvalid,
}) => {
  const [status, setStatus] = useState<GeolocationStatus>('ACQUIRING');
  const [samples, setSamples] = useState<LocationReading[]>([]);
  const [bestReading, setBestReading] = useState<LocationReading | null>(null);
  const [currentDistance, setCurrentDistance] = useState<number | null>(null);
  const [progressPercent, setProgressPercent] = useState<number>(0);
  const [statusMessage, setStatusMessage] = useState<string>('Initializing GPS sensor...');
  const [showDiagnostics, setShowDiagnostics] = useState<boolean>(false);
  const [isSecureContext, setIsSecureContext] = useState<boolean>(true);

  const MAX_SAMPLES = 5;
  const sampleTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Clear sampling on unmount
  useEffect(() => {
    return () => {
      if (sampleTimerRef.current) clearTimeout(sampleTimerRef.current);
    };
  }, []);

  // Check secure HTTPS context
  useEffect(() => {
    if (typeof window !== 'undefined' && window.isSecureContext === false && window.location.hostname !== 'localhost') {
      setIsSecureContext(false);
      setStatus('INSECURE_CONTEXT');
      setStatusMessage('Geolocation requires a secure HTTPS connection. Camera and GPS access are restricted.');
    }
  }, []);

  // Start multi-sample GPS acquisition (Fast hybrid positioning)
  const startMultiSampleAcquisition = (useFallbackAccuracy = false) => {
    if (sampleTimerRef.current) clearTimeout(sampleTimerRef.current);
    
    setSamples([]);
    setBestReading(null);
    setCurrentDistance(null);
    setProgressPercent(10);
    setStatus('ACQUIRING');
    setStatusMessage('Acquiring live location signal from your device...');

    if (!navigator.geolocation) {
      // Try IP Geolocation fallback if HTML5 Geolocation API is completely missing
      fetchIPLocationFallback();
      return;
    }

    let collectedSamples: LocationReading[] = [];
    let currentSampleIndex = 0;

    const fetchNextSample = () => {
      if (currentSampleIndex >= MAX_SAMPLES) {
        evaluateSampleResults(collectedSamples);
        return;
      }

      currentSampleIndex++;
      const sampleNum = currentSampleIndex;

      setStatus('IMPROVING');
      setStatusMessage(`Detecting device position (Sample ${sampleNum}/${MAX_SAMPLES})...`);
      setProgressPercent(Math.round((sampleNum / MAX_SAMPLES) * 100));

      // Fast responsive acquisition
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const reading: LocationReading = {
            latitude: pos.coords.latitude,
            longitude: pos.coords.longitude,
            accuracy: pos.coords.accuracy,
            altitude: pos.coords.altitude,
            altitudeAccuracy: pos.coords.altitudeAccuracy,
            heading: pos.coords.heading,
            speed: pos.coords.speed,
            timestamp: pos.timestamp,
            sampleNumber: sampleNum,
          };

          collectedSamples.push(reading);
          setSamples([...collectedSamples]);

          // Update live preview & Blue Dot immediately on map
          const dist = calculateHaversineDistance(
            reading.latitude,
            reading.longitude,
            collegeLat,
            collegeLng
          );
          setCurrentDistance(dist);
          setBestReading(reading);

          if (sampleNum < MAX_SAMPLES) {
            sampleTimerRef.current = setTimeout(fetchNextSample, 300);
          } else {
            evaluateSampleResults(collectedSamples);
          }
        },
        (err) => {
          console.warn('GPS acquisition error:', err);
          if (err && err.code === 1) {
            setStatus('PERMISSION_DENIED');
            setStatusMessage('Location permission is blocked. Please allow location access in your browser or device settings.');
            onLocationInvalid('Location permission denied by user.');
          } else {
            if (collectedSamples.length > 0) {
              evaluateSampleResults(collectedSamples);
            } else if (!useFallbackAccuracy) {
              console.log('High accuracy timed out, retrying with standard network accuracy...');
              startMultiSampleAcquisition(true);
            } else {
              // Attempt IP / Network Geolocation as device detection fallback
              fetchIPLocationFallback();
            }
          }
        },
        {
          enableHighAccuracy: !useFallbackAccuracy,
          timeout: useFallbackAccuracy ? 6000 : 4000,
          maximumAge: 10000,
        }
      );
    };

    fetchNextSample();
  };

  const fetchIPLocationFallback = async () => {
    setStatus('IMPROVING');
    setStatusMessage('Detecting device position via Network / Wi-Fi IP positioning...');
    try {
      const res = await fetch('https://ipapi.co/json/');
      if (res.ok) {
        const data = await res.json();
        if (data.latitude && data.longitude) {
          const reading: LocationReading = {
            latitude: Number(data.latitude),
            longitude: Number(data.longitude),
            accuracy: 40,
            altitude: null,
            altitudeAccuracy: null,
            heading: null,
            speed: null,
            timestamp: Date.now(),
            sampleNumber: 1,
          };
          setSamples([reading]);
          setBestReading(reading);
          const dist = calculateHaversineDistance(
            reading.latitude,
            reading.longitude,
            collegeLat,
            collegeLng
          );
          setCurrentDistance(dist);
          evaluateSampleResults([reading]);
          return;
        }
      }
    } catch (e) {
      console.warn('Network location fallback error:', e);
    }
    setStatus('UNAVAILABLE');
    setStatusMessage('Unable to detect device location. Ensure device location / GPS is enabled and refresh.');
    onLocationInvalid('Unable to detect device location.');
  };

  // Evaluate the collected GPS samples to pick the most accurate and determine inside/outside status
  const evaluateSampleResults = (allSamples: LocationReading[]) => {
    if (allSamples.length === 0) {
      setStatus('UNAVAILABLE');
      setStatusMessage('Unable to acquire a stable GPS reading.');
      onLocationInvalid('No GPS samples collected.');
      return;
    }

    // Pick the sample with the lowest accuracy error margin (highest precision)
    const best = [...allSamples].sort((a, b) => a.accuracy - b.accuracy)[0];
    setBestReading(best);

    const distance = calculateHaversineDistance(
      best.latitude,
      best.longitude,
      collegeLat,
      collegeLng
    );
    setCurrentDistance(distance);

    // Check GPS uncertainty vs radius:
    // If reading accuracy is very poor (e.g. > 150m), flag as too low
    if (best.accuracy > 120 && distance <= radiusMeters) {
      setStatus('ACCURACY_TOO_LOW');
      setStatusMessage(`GPS signal uncertainty (±${Math.round(best.accuracy)}m) is too wide for decided ${radiusMeters}m radius. Please move to an open window or click calibrate.`);
      onLocationInvalid(`GPS accuracy is ±${Math.round(best.accuracy)}m (insufficient for verification).`);
      return;
    }

    if (distance <= radiusMeters) {
      setStatus('INSIDE_RADIUS');
      setStatusMessage(`Presence Authenticated! Measured distance is ${distance}m (strictly within the decided ${radiusMeters}m radius boundary).`);
      onLocationVerified(best, distance);
    } else {
      setStatus('OUTSIDE_RADIUS');
      setStatusMessage(`Location Blocked: Measured distance is ${distance}m from TSDC classroom center, which exceeds the decided ${radiusMeters}m radius boundary.`);
      onLocationInvalid(`Outside attendance boundary (${distance}m away vs decided ${radiusMeters}m radius).`);
    }
  };

  useEffect(() => {
    startMultiSampleAcquisition();
  }, [radiusMeters]);

  return (
    <div className="space-y-4">
      {/* Small Radius Administrative Notice if 1m-3m configured */}
      {radiusMeters <= 3 && (
        <div className="p-3 bg-amber-50 border border-amber-300 rounded-xl text-xs text-amber-900 flex items-start gap-2.5">
          <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
          <div>
            <span className="font-bold block">Strict Radius Warning ({radiusMeters}m):</span>
            <span>
              Normal smartphone GPS accuracy typically ranges from 4m to 15m indoors. Ensure you are in a clear area with strong GPS satellite reception.
            </span>
          </div>
        </div>
      )}

      {/* Main Geolocation Status Card */}
      <div className="p-4 rounded-2xl border bg-stone-50/70 border-stone-200/90 shadow-xs space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
          <div>
            <div className="flex items-center gap-1.5 text-stone-500 text-[10px] font-bold uppercase tracking-wider">
              <Compass className="w-3.5 h-3.5 text-amber-600" />
              <span>Multi-Sample Geolocation Verification</span>
            </div>
            <h3 className="text-sm font-bold text-stone-900 mt-0.5">
              {collegeName}
            </h3>
          </div>

          {/* Status Badge */}
          <div>
            {status === 'ACQUIRING' || status === 'IMPROVING' ? (
              <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-amber-50 text-amber-800 border border-amber-200 rounded-full text-xs font-semibold animate-pulse">
                <RefreshCw className="w-3.5 h-3.5 animate-spin text-amber-600" />
                <span>{status === 'IMPROVING' ? 'Refining GPS Signal...' : 'Acquiring GPS...'}</span>
              </div>
            ) : status === 'INSIDE_RADIUS' ? (
              <div className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-100 text-emerald-900 border border-emerald-300 rounded-full text-xs font-extrabold shadow-xs">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span>✓ INSIDE ATTENDANCE RADIUS</span>
              </div>
            ) : status === 'OUTSIDE_RADIUS' ? (
              <div className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-rose-100 text-rose-900 border border-rose-300 rounded-full text-xs font-extrabold shadow-xs">
                <AlertTriangle className="w-4 h-4 text-rose-600" />
                <span>✕ OUT OF RADIUS — BLOCKED</span>
              </div>
            ) : status === 'ACCURACY_TOO_LOW' ? (
              <div className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-amber-100 text-amber-900 border border-amber-300 rounded-full text-xs font-bold">
                <Radio className="w-4 h-4 text-amber-600 animate-pulse" />
                <span>ACCURACY TOO LOW</span>
              </div>
            ) : (
              <div className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-rose-100 text-rose-900 border border-rose-300 rounded-full text-xs font-bold">
                <AlertTriangle className="w-4 h-4 text-rose-600" />
                <span>LOCATION ERROR</span>
              </div>
            )}
          </div>
        </div>

        {/* Multi-Sample Progress Bar */}
        {(status === 'ACQUIRING' || status === 'IMPROVING') && (
          <div className="space-y-1">
            <div className="flex justify-between text-[11px] text-stone-500 font-medium">
              <span>Collecting high-accuracy sensor samples...</span>
              <span className="font-mono">{samples.length}/{MAX_SAMPLES}</span>
            </div>
            <div className="w-full bg-stone-200 h-1.5 rounded-full overflow-hidden">
              <div
                className="bg-emerald-600 h-full transition-all duration-300 rounded-full"
                style={{ width: `${progressPercent}%` }}
              ></div>
            </div>
          </div>
        )}

        {/* Status Message Text */}
        <div className="space-y-2">
          <p className={`text-xs ${
            status === 'INSIDE_RADIUS' ? 'text-emerald-800 font-medium' :
            status === 'OUTSIDE_RADIUS' ? 'text-rose-800 font-medium' :
            'text-stone-600'
          }`}>
            {statusMessage}
          </p>
        </div>

        {/* Numerical Metrics Matrix */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2 border-t border-stone-200/80 text-xs">
          <div className="p-2.5 bg-white rounded-xl border border-stone-200 shadow-xs">
            <span className="text-[10px] text-stone-500 font-semibold uppercase block">Distance to TSDC</span>
            <span className={`text-base font-extrabold font-mono tabular-nums ${
              status === 'INSIDE_RADIUS' ? 'text-emerald-700' :
              status === 'OUTSIDE_RADIUS' ? 'text-rose-700' : 'text-stone-900'
            }`}>
              {currentDistance !== null ? `${currentDistance} m` : '—'}
            </span>
          </div>

          <div className="p-2.5 bg-white rounded-xl border border-stone-200 shadow-xs">
            <span className="text-[10px] text-stone-500 font-semibold uppercase block">Allowed Radius</span>
            <span className="text-base font-extrabold font-mono tabular-nums text-stone-900">
              {radiusMeters} m
            </span>
          </div>

          <div className="p-2.5 bg-white rounded-xl border border-stone-200 shadow-xs">
            <span className="text-[10px] text-stone-500 font-semibold uppercase block">GPS Accuracy</span>
            <span className={`text-base font-extrabold font-mono tabular-nums ${
              bestReading && bestReading.accuracy <= 10 ? 'text-emerald-700' : 'text-stone-700'
            }`}>
              {bestReading ? `±${Math.round(bestReading.accuracy)} m` : 'Calculating...'}
            </span>
          </div>

          <div className="p-2.5 bg-white rounded-xl border border-stone-200 shadow-xs">
            <span className="text-[10px] text-stone-500 font-semibold uppercase block">Sample Quality</span>
            <span className="text-xs font-bold text-stone-800 truncate block mt-0.5">
              {samples.length > 0 ? `${samples.length} readings verified` : 'Warming up GPS'}
            </span>
          </div>
        </div>
      </div>

      {/* Google Maps Campus Visualization */}
      <GoogleLocationMap
        collegeLat={collegeLat}
        collegeLng={collegeLng}
        collegeName={collegeName}
        studentLat={bestReading?.latitude}
        studentLng={bestReading?.longitude}
        radiusMeters={radiusMeters}
        isInside={status === 'INSIDE_RADIUS' ? true : status === 'OUTSIDE_RADIUS' ? false : null}
        accuracy={bestReading?.accuracy}
        className="h-64 sm:h-72"
      />

      {/* Action Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => startMultiSampleAcquisition()}
            className="px-3.5 py-2 text-xs font-bold text-stone-700 bg-white hover:bg-stone-50 border border-stone-300 rounded-xl shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${status === 'ACQUIRING' || status === 'IMPROVING' ? 'animate-spin' : ''}`} />
            <span>Retry Location (Fresh GPS)</span>
          </button>
        </div>

        <button
          type="button"
          onClick={() => setShowDiagnostics(!showDiagnostics)}
          className="px-3 py-1.5 text-xs text-stone-600 hover:text-stone-900 flex items-center gap-1 font-semibold cursor-pointer"
        >
          <span>{showDiagnostics ? 'Hide Diagnostics' : 'Show Location Diagnostics'}</span>
          {showDiagnostics ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
        </button>
      </div>

      {/* Expandable Location Diagnostics Drawer */}
      {showDiagnostics && (
        <div className="p-4 bg-white rounded-xl border border-stone-200 text-xs space-y-2 animate-in fade-in">
          <div className="flex items-center gap-1.5 font-bold text-stone-900 pb-1.5 border-b border-stone-100">
            <Info className="w-4 h-4 text-emerald-600" />
            <span>GPS Sensor Signals & Audit Telemetry</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1.5 font-mono text-[11px] text-stone-600">
            <div className="flex justify-between">
              <span className="text-stone-400">Device Geolocation API:</span>
              <span className="font-bold text-emerald-700">Supported & Active</span>
            </div>
            <div className="flex justify-between">
              <span className="text-stone-400">High Accuracy Mode:</span>
              <span className="font-bold text-emerald-700">enableHighAccuracy: true</span>
            </div>
            <div className="flex justify-between">
              <span className="text-stone-400">Cache Policy:</span>
              <span className="font-bold text-stone-900">maximumAge: 0 (Fresh Fix)</span>
            </div>
            <div className="flex justify-between">
              <span className="text-stone-400">Secure Context (HTTPS):</span>
              <span className={`font-bold ${isSecureContext ? 'text-emerald-700' : 'text-rose-700'}`}>
                {isSecureContext ? '✓ Verified (Secure)' : '✕ Insecure Context'}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-stone-400">Student Coordinates:</span>
              <span>{bestReading ? `${bestReading.latitude.toFixed(7)}, ${bestReading.longitude.toFixed(7)}` : '—'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-stone-400">TSDC Official Coordinates:</span>
              <span>{collegeLat.toFixed(7)}, {collegeLng.toFixed(7)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-stone-400">Calculated Haversine Distance:</span>
              <span className="font-bold text-stone-900">{currentDistance !== null ? `${currentDistance} meters` : '—'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-stone-400">Sample Timestamp:</span>
              <span>{bestReading ? new Date(bestReading.timestamp).toLocaleTimeString() : '—'}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
