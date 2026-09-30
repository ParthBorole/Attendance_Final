import React, { useState, useEffect, useRef } from 'react';
import { GoogleLocationMap } from '../common/GoogleLocationMap.js';
import { GeofenceVisualizer } from '../common/GeofenceVisualizer.js';
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
  Smartphone,
  Navigation,
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
  collegeLat: number; // Teacher's Live Latitude
  collegeLng: number; // Teacher's Live Longitude
  radiusMeters: number;
  collegeName?: string;
  onLocationVerified: (reading: LocationReading, distanceMeters: number) => void;
  onLocationInvalid: (errorMsg: string) => void;
}

// High-precision Haversine Distance Calculation (Distance between Student Phone & Teacher Phone)
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
  collegeName = 'Faculty Live Beacon (TSDC Classroom)',
  onLocationVerified,
  onLocationInvalid,
}) => {
  const [status, setStatus] = useState<GeolocationStatus>('ACQUIRING');
  const [samples, setSamples] = useState<LocationReading[]>([]);
  const [bestReading, setBestReading] = useState<LocationReading | null>(null);
  const [currentDistance, setCurrentDistance] = useState<number | null>(null);
  const [progressPercent, setProgressPercent] = useState<number>(0);
  const [statusMessage, setStatusMessage] = useState<string>('Connecting to phone GPS sensors...');
  const [showDiagnostics, setShowDiagnostics] = useState<boolean>(false);
  const [isSecureContext, setIsSecureContext] = useState<boolean>(true);
  const [browserPermissionState, setBrowserPermissionState] = useState<string>('unknown');
  const [viewType, setViewType] = useState<'radar' | 'map'>('radar');

  const MAX_SAMPLES = 4;
  const sampleTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Clear sampling on unmount
  useEffect(() => {
    return () => {
      if (sampleTimerRef.current) clearTimeout(sampleTimerRef.current);
    };
  }, []);

  // Monitor Permissions API if available
  useEffect(() => {
    if (typeof navigator !== 'undefined' && 'permissions' in navigator) {
      try {
        navigator.permissions
          .query({ name: 'geolocation' as PermissionName })
          .then((perm) => {
            setBrowserPermissionState(perm.state);
            perm.onchange = () => {
              setBrowserPermissionState(perm.state);
              if (perm.state === 'granted') {
                startMultiSampleAcquisition();
              }
            };
          })
          .catch(() => {});
      } catch (e) {
        // Permissions query not supported
      }
    }
  }, []);

  // Check secure HTTPS context
  useEffect(() => {
    if (typeof window !== 'undefined' && window.isSecureContext === false && window.location.hostname !== 'localhost') {
      setIsSecureContext(false);
      setStatus('INSECURE_CONTEXT');
      setStatusMessage('Live Geolocation requires a secure HTTPS connection. Location access is restricted.');
    }
  }, []);

  // Start real-time multi-sample GPS acquisition against Teacher's phone
  const startMultiSampleAcquisition = (useFallbackAccuracy = false) => {
    if (sampleTimerRef.current) clearTimeout(sampleTimerRef.current);
    
    setSamples([]);
    setBestReading(null);
    setCurrentDistance(null);
    setProgressPercent(10);
    setStatus('ACQUIRING');
    setStatusMessage('Acquiring real-time GPS coordinates from your device...');

    if (!navigator.geolocation) {
      setStatus('UNAVAILABLE');
      setStatusMessage('Geolocation API is not supported on this device/browser.');
      onLocationInvalid('Geolocation API not supported.');
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
      setStatusMessage(`Locking satellite signal & measuring distance to Teacher (Sample ${sampleNum}/${MAX_SAMPLES})...`);
      setProgressPercent(Math.round((sampleNum / MAX_SAMPLES) * 100));

      // Query hardware GPS sensor
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

          // Calculate real-time distance from teacher's phone
          const dist = calculateHaversineDistance(
            reading.latitude,
            reading.longitude,
            collegeLat,
            collegeLng
          );
          setCurrentDistance(dist);
          setBestReading(reading);

          if (sampleNum < MAX_SAMPLES) {
            sampleTimerRef.current = setTimeout(fetchNextSample, 250);
          } else {
            evaluateSampleResults(collectedSamples);
          }
        },
        (err) => {
          console.warn('GPS sensor acquisition warning:', err);
          if (err && err.code === 1) {
            // Permission denied in browser / iframe
            if (!useFallbackAccuracy) {
              // Try standard accuracy once before throwing permission error
              startMultiSampleAcquisition(true);
            } else {
              setStatus('PERMISSION_DENIED');
              setStatusMessage(
                'Location access is blocked in your browser. Please tap the 🔒 icon in the address bar to allow location.'
              );
              onLocationInvalid('Location permission denied by browser.');
            }
          } else {
            if (collectedSamples.length > 0) {
              evaluateSampleResults(collectedSamples);
            } else if (!useFallbackAccuracy) {
              console.log('High-accuracy GPS timed out, retrying with standard sensor accuracy...');
              startMultiSampleAcquisition(true);
            } else {
              setStatus('UNAVAILABLE');
              setStatusMessage('Unable to acquire stable GPS position. Ensure phone Location/GPS is turned ON.');
              onLocationInvalid('GPS signal unavailable.');
            }
          }
        },
        {
          enableHighAccuracy: !useFallbackAccuracy,
          timeout: useFallbackAccuracy ? 7000 : 4000,
          maximumAge: 3000,
        }
      );
    };

    fetchNextSample();
  };

  // Re-request permission prompt explicitly from user action
  const requestPermissionPrompt = () => {
    setStatus('ACQUIRING');
    setStatusMessage('Requesting GPS sensor access from browser...');

    navigator.geolocation.getCurrentPosition(
      () => {
        startMultiSampleAcquisition();
      },
      (err) => {
        console.warn('Manual permission prompt error:', err);
        setStatus('PERMISSION_DENIED');
        setStatusMessage(
          'Location blocked. Please click the 🔒 Lock icon near the address bar, set Location to "Allow", and retry.'
        );
      },
      {
        enableHighAccuracy: false,
        timeout: 10000,
        maximumAge: 0,
      }
    );
  };

  // Evaluate the collected GPS samples against Teacher's phone
  const evaluateSampleResults = (allSamples: LocationReading[]) => {
    if (allSamples.length === 0) {
      setStatus('UNAVAILABLE');
      setStatusMessage('No GPS sensor readings collected from device.');
      onLocationInvalid('No GPS samples collected.');
      return;
    }

    // Pick highest precision reading (lowest uncertainty margin)
    const best = [...allSamples].sort((a, b) => a.accuracy - b.accuracy)[0];
    setBestReading(best);

    const distance = calculateHaversineDistance(
      best.latitude,
      best.longitude,
      collegeLat,
      collegeLng
    );
    setCurrentDistance(distance);

    // Security Check: GPS Uncertainty threshold (±35m max)
    if (best.accuracy > 35) {
      setStatus('ACCURACY_TOO_LOW');
      setStatusMessage(`GPS signal uncertainty (±${Math.round(best.accuracy)}m) is too wide. Please ensure phone location is set to High Accuracy mode and retry.`);
      onLocationInvalid(`GPS accuracy is ±${Math.round(best.accuracy)}m (must be within ±35m).`);
      return;
    }

    // Strict Teacher Proximity Check
    if (distance <= radiusMeters) {
      setStatus('INSIDE_RADIUS');
      setStatusMessage(`Physical Presence Authenticated: Inside the allowed ${radiusMeters}m radius.`);
      onLocationVerified(best, distance);
    } else {
      setStatus('OUTSIDE_RADIUS');
      setStatusMessage(`Outside allowed proximity boundary (${radiusMeters}m allowed). Move closer to class.`);
      onLocationInvalid(`Outside allowed proximity boundary.`);
    }
  };

  useEffect(() => {
    startMultiSampleAcquisition();
  }, [radiusMeters, collegeLat, collegeLng]);

  return (
    <div className="space-y-4">
      {/* Permission Blocked Guidance Card */}
      {status === 'PERMISSION_DENIED' && (
        <div className="p-4 bg-amber-50 border-2 border-amber-300 rounded-2xl text-xs space-y-3 animate-in fade-in shadow-xs">
          <div className="flex items-start gap-2.5">
            <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <h4 className="font-bold text-amber-950 text-sm">
                Browser Location Permission Required
              </h4>
              <p className="text-amber-800 mt-0.5 leading-relaxed">
                To prevent proxy attendance, your phone must share real-time GPS coordinates to verify physical proximity with the Teacher's mobile device.
              </p>
            </div>
          </div>

          <div className="bg-white/90 p-3 rounded-xl border border-amber-200 text-stone-700 space-y-1.5 text-[11px]">
            <div className="font-bold text-stone-900">How to Enable:</div>
            <div className="flex items-start gap-2">
              <span className="font-bold text-amber-700">1.</span>
              <span>Click the <strong>Lock / Tune icon (🔒)</strong> in your browser's address bar.</span>
            </div>
            <div className="flex items-start gap-2">
              <span className="font-bold text-amber-700">2.</span>
              <span>Set <strong>Location → Allow</strong>.</span>
            </div>
            <div className="flex items-start gap-2">
              <span className="font-bold text-amber-700">3.</span>
              <span>Click <strong>"Re-Scan GPS Location"</strong> below.</span>
            </div>
          </div>

          <div className="flex items-center gap-2 pt-1">
            <button
              type="button"
              onClick={requestPermissionPrompt}
              className="px-4 py-2 bg-stone-900 hover:bg-black text-white font-bold rounded-xl text-xs flex items-center gap-1.5 cursor-pointer shadow-xs transition-colors"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Re-Scan GPS Location</span>
            </button>
          </div>
        </div>
      )}

      {/* Main Geolocation Status Card */}
      <div className="p-4 rounded-2xl border bg-stone-50/70 border-stone-200/90 shadow-xs space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
          <div>
            <div className="flex items-center gap-1.5 text-stone-500 text-[10px] font-bold uppercase tracking-wider">
              <Smartphone className="w-3.5 h-3.5 text-emerald-600" />
              <span>Teacher Mobile Proximity Geofence</span>
            </div>
            <h3 className="text-sm font-bold text-stone-900 mt-0.5">
              Teacher's Live Anchor: <span className="font-mono text-xs text-stone-600">{collegeLat.toFixed(6)}, {collegeLng.toFixed(6)}</span>
            </h3>
          </div>

          {/* Status Badge */}
          <div>
            {status === 'ACQUIRING' || status === 'IMPROVING' ? (
              <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-amber-50 text-amber-800 border border-amber-200 rounded-full text-xs font-semibold animate-pulse">
                <RefreshCw className="w-3.5 h-3.5 animate-spin text-amber-600" />
                <span>{status === 'IMPROVING' ? 'Locking GPS...' : 'Acquiring GPS...'}</span>
              </div>
            ) : status === 'INSIDE_RADIUS' ? (
              <div className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-100 text-emerald-900 border border-emerald-300 rounded-full text-xs font-extrabold shadow-xs">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span>✓ WITHIN TEACHER'S RADIUS</span>
              </div>
            ) : status === 'OUTSIDE_RADIUS' ? (
              <div className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-rose-100 text-rose-900 border border-rose-300 rounded-full text-xs font-extrabold shadow-xs">
                <AlertTriangle className="w-4 h-4 text-rose-600" />
                <span>✕ OUT OF TEACHER'S RADIUS</span>
              </div>
            ) : status === 'ACCURACY_TOO_LOW' ? (
              <div className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-amber-100 text-amber-900 border border-amber-300 rounded-full text-xs font-bold">
                <Radio className="w-4 h-4 text-amber-600 animate-pulse" />
                <span>GPS ACCURACY TOO LOW</span>
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
              <span>Collecting live hardware GPS samples...</span>
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
          <p className={`text-xs font-medium ${
            status === 'INSIDE_RADIUS' ? 'text-emerald-800' :
            status === 'OUTSIDE_RADIUS' ? 'text-rose-800' :
            status === 'PERMISSION_DENIED' ? 'text-amber-800' :
            'text-stone-600'
          }`}>
            {statusMessage}
          </p>
        </div>

        {/* Numerical Metrics Matrix */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2 border-t border-stone-200/80 text-xs">
          <div className="p-2.5 bg-white rounded-xl border border-stone-200 shadow-xs">
            <span className="text-[10px] text-stone-500 font-semibold uppercase block">Distance to Teacher</span>
            <span className={`text-base font-extrabold font-mono tabular-nums ${
              status === 'INSIDE_RADIUS' ? 'text-emerald-700' :
              status === 'OUTSIDE_RADIUS' ? 'text-rose-700' : 'text-stone-900'
            }`}>
              {currentDistance !== null ? `${currentDistance} m` : '—'}
            </span>
          </div>

          <div className="p-2.5 bg-white rounded-xl border border-stone-200 shadow-xs">
            <span className="text-[10px] text-stone-500 font-semibold uppercase block">Allowed Proximity</span>
            <span className="text-base font-extrabold font-mono tabular-nums text-stone-900">
              {radiusMeters} m
            </span>
          </div>

          <div className="p-2.5 bg-white rounded-xl border border-stone-200 shadow-xs">
            <span className="text-[10px] text-stone-500 font-semibold uppercase block">GPS Accuracy</span>
            <span className={`text-base font-extrabold font-mono tabular-nums ${
              bestReading && bestReading.accuracy <= 15 ? 'text-emerald-700' : 'text-stone-700'
            }`}>
              {bestReading ? `±${Math.round(bestReading.accuracy)} m` : 'Calculating...'}
            </span>
          </div>

          <div className="p-2.5 bg-white rounded-xl border border-stone-200 shadow-xs">
            <span className="text-[10px] text-stone-500 font-semibold uppercase block">Sensor Quality</span>
            <span className="text-xs font-bold text-stone-800 truncate block mt-0.5">
              {samples.length > 0 ? `${samples.length} live fixes verified` : 'Acquiring GPS'}
            </span>
          </div>
        </div>
      </div>

      {/* Geofence Radar vs Google Map View Switcher */}
      <div className="flex items-center justify-between gap-2 pt-1">
        <div className="text-xs font-bold text-stone-700 flex items-center gap-1.5">
          <Navigation className="w-3.5 h-3.5 text-emerald-600" />
          <span>Proximity Radar Visualizer</span>
        </div>

        <div className="bg-stone-200/80 p-0.5 rounded-xl flex items-center gap-0.5 text-xs">
          <button
            type="button"
            onClick={() => setViewType('radar')}
            className={`px-3 py-1 rounded-lg font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
              viewType === 'radar'
                ? 'bg-stone-900 text-white shadow-xs'
                : 'text-stone-600 hover:text-stone-900'
            }`}
          >
            <Radio className="w-3.5 h-3.5 text-emerald-400" />
            <span>Live Radar Sonar</span>
          </button>
          <button
            type="button"
            onClick={() => setViewType('map')}
            className={`px-3 py-1 rounded-lg font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
              viewType === 'map'
                ? 'bg-stone-900 text-white shadow-xs'
                : 'text-stone-600 hover:text-stone-900'
            }`}
          >
            <MapPin className="w-3.5 h-3.5 text-blue-400" />
            <span>Satellite Map</span>
          </button>
        </div>
      </div>

      {viewType === 'radar' ? (
        <GeofenceVisualizer
          teacherLat={collegeLat}
          teacherLng={collegeLng}
          studentLat={bestReading?.latitude}
          studentLng={bestReading?.longitude}
          radiusMeters={radiusMeters}
          distanceMeters={currentDistance}
          teacherName={collegeName}
          studentLabel="Your Phone"
        />
      ) : (
        <GoogleLocationMap
          collegeLat={collegeLat}
          collegeLng={collegeLng}
          collegeName="Teacher's Live Mobile Location"
          studentLat={bestReading?.latitude}
          studentLng={bestReading?.longitude}
          radiusMeters={radiusMeters}
          isInside={status === 'INSIDE_RADIUS' ? true : status === 'OUTSIDE_RADIUS' ? false : null}
          accuracy={bestReading?.accuracy}
          className="h-64 sm:h-72"
        />
      )}

      {/* Action Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
        <button
          type="button"
          onClick={() => startMultiSampleAcquisition()}
          className="px-3.5 py-2 text-xs font-bold text-stone-700 bg-white hover:bg-stone-50 border border-stone-300 rounded-xl shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${status === 'ACQUIRING' || status === 'IMPROVING' ? 'animate-spin' : ''}`} />
          <span>Refresh GPS Reading (Live Sensor)</span>
        </button>

        <button
          type="button"
          onClick={() => setShowDiagnostics(!showDiagnostics)}
          className="px-3 py-1.5 text-xs text-stone-600 hover:text-stone-900 flex items-center gap-1 font-semibold cursor-pointer"
        >
          <span>{showDiagnostics ? 'Hide Diagnostics' : 'Show Sensor Telemetry'}</span>
          {showDiagnostics ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
        </button>
      </div>

      {/* Expandable Location Diagnostics Drawer */}
      {showDiagnostics && (
        <div className="p-4 bg-white rounded-xl border border-stone-200 text-xs space-y-2 animate-in fade-in">
          <div className="flex items-center gap-1.5 font-bold text-stone-900 pb-1.5 border-b border-stone-100">
            <Info className="w-4 h-4 text-emerald-600" />
            <span>Real-Time Sensor Signals & Distance Telemetry</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1.5 font-mono text-[11px] text-stone-600">
            <div className="flex justify-between">
              <span className="text-stone-400">Device Geolocation API:</span>
              <span className="font-bold text-emerald-700">Supported & Active</span>
            </div>
            <div className="flex justify-between">
              <span className="text-stone-400">Browser Permission:</span>
              <span className="font-bold text-stone-900">{browserPermissionState}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-stone-400">Student Phone Coordinates:</span>
              <span>{bestReading ? `${bestReading.latitude.toFixed(6)}, ${bestReading.longitude.toFixed(6)}` : '—'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-stone-400">Teacher Phone Anchor:</span>
              <span>{collegeLat.toFixed(6)}, {collegeLng.toFixed(6)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-stone-400">Haversine Distance:</span>
              <span className="font-bold text-stone-900">{currentDistance !== null ? `${currentDistance} meters` : '—'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-stone-400">Allowed Perimeter:</span>
              <span className="font-bold text-emerald-700">{radiusMeters} meters</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
