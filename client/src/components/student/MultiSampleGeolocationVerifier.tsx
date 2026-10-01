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
  KeyRound,
  Check,
  Target,
  Ruler,
  LocateFixed,
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
  | 'PERMISSION_REQUIRED'
  | 'ACQUIRING'
  | 'IMPROVING'
  | 'INSIDE_RADIUS'
  | 'OUTSIDE_RADIUS'
  | 'ACCURACY_TOO_LOW'
  | 'PERMISSION_DENIED'
  | 'UNAVAILABLE'
  | 'INSECURE_CONTEXT';

// Fixed TSDC Campus Coordinates (Thakur Shyamnarayan Degree College, 90 Feet Rd, Kandivali East)
export const TSDC_COORDINATES = {
  latitude: 19.213805,
  longitude: 72.864810,
  name: 'Thakur Shyamnarayan Degree College (TSDC)',
  address: 'Thakur Complex, 90 Feet Road, Kandivali (East), Mumbai',
};

// GPS Accuracy Threshold (in meters): readings with uncertainty > 45m are flagged as too low
export const GPS_ACCURACY_THRESHOLD_METERS = 45;

interface MultiSampleGeolocationVerifierProps {
  collegeLat?: number;
  collegeLng?: number;
  radiusMeters: number;
  collegeName?: string;
  onLocationVerified: (reading: LocationReading, distanceMeters: number) => void;
  onLocationInvalid: (errorMsg: string) => void;
}

// Haversine Distance Formula (Earth radius = 6,371,000 meters)
export function calculateHaversineDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371000;
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
  collegeLat = TSDC_COORDINATES.latitude,
  collegeLng = TSDC_COORDINATES.longitude,
  radiusMeters,
  collegeName = TSDC_COORDINATES.name,
  onLocationVerified,
  onLocationInvalid,
}) => {
  const [status, setStatus] = useState<GeolocationStatus>('PERMISSION_REQUIRED');
  const [samples, setSamples] = useState<LocationReading[]>([]);
  const [bestReading, setBestReading] = useState<LocationReading | null>(null);
  const [actualDistance, setActualDistance] = useState<number | null>(null);
  const [progressPercent, setProgressPercent] = useState<number>(0);
  const [statusMessage, setStatusMessage] = useState<string>('Grant location access to verify physical presence.');
  const [showDiagnostics, setShowDiagnostics] = useState<boolean>(false);
  const [isSecureContext, setIsSecureContext] = useState<boolean>(true);
  const [browserPermissionState, setBrowserPermissionState] = useState<string>('unknown');
  const [viewType, setViewType] = useState<'map' | 'radar'>('map');
  const [activeHelpTab, setActiveHelpTab] = useState<'chrome' | 'safari' | 'mobile'>('chrome');

  const MAX_SAMPLES = 4;
  const watchIdRef = useRef<number | null>(null);
  const sampleTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Clear timers/watchers on unmount
  useEffect(() => {
    return () => {
      if (sampleTimeoutRef.current) clearTimeout(sampleTimeoutRef.current);
      if (watchIdRef.current !== null && navigator.geolocation) {
        navigator.geolocation.clearWatch(watchIdRef.current);
      }
    };
  }, []);

  // Check Secure HTTPS context
  useEffect(() => {
    if (typeof window !== 'undefined' && window.isSecureContext === false && window.location.hostname !== 'localhost') {
      setIsSecureContext(false);
      setStatus('INSECURE_CONTEXT');
      setStatusMessage('Live Geolocation requires a secure HTTPS connection. Location access is restricted.');
    }
  }, []);

  // Check Permissions API
  useEffect(() => {
    if (typeof navigator !== 'undefined' && 'permissions' in navigator) {
      try {
        navigator.permissions
          .query({ name: 'geolocation' as PermissionName })
          .then((perm) => {
            setBrowserPermissionState(perm.state);
            if (perm.state === 'granted') {
              startHighAccuracyAcquisition();
            } else if (perm.state === 'denied') {
              setStatus('PERMISSION_DENIED');
              setStatusMessage('Location permission is blocked in your browser settings.');
              onLocationInvalid('Location permission is denied by browser.');
            } else {
              setStatus('PERMISSION_REQUIRED');
            }

            perm.onchange = () => {
              setBrowserPermissionState(perm.state);
              if (perm.state === 'granted') {
                startHighAccuracyAcquisition();
              } else if (perm.state === 'denied') {
                setStatus('PERMISSION_DENIED');
                setStatusMessage('Location permission is blocked in your browser settings.');
                onLocationInvalid('Location permission is denied.');
              }
            };
          })
          .catch(() => {
            setStatus('PERMISSION_REQUIRED');
          });
      } catch (e) {
        setStatus('PERMISSION_REQUIRED');
      }
    } else {
      setStatus('PERMISSION_REQUIRED');
    }
  }, []);

  // Start real-time high-accuracy GPS acquisition
  const startHighAccuracyAcquisition = () => {
    if (sampleTimeoutRef.current) clearTimeout(sampleTimeoutRef.current);
    if (watchIdRef.current !== null && navigator.geolocation) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }

    setSamples([]);
    setBestReading(null);
    setActualDistance(null);
    setProgressPercent(15);
    setStatus('ACQUIRING');
    setStatusMessage('Acquiring real-time GPS coordinates via navigator.geolocation...');

    if (!navigator.geolocation) {
      setStatus('UNAVAILABLE');
      setStatusMessage('Geolocation API is not supported on this device/browser.');
      onLocationInvalid('Geolocation API not supported.');
      return;
    }

    let collectedSamples: LocationReading[] = [];
    let sampleCounter = 0;

    // First: Perform immediate getCurrentPosition with high accuracy & fresh reading
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        sampleCounter++;
        const reading: LocationReading = {
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
          accuracy: pos.coords.accuracy, // GPS uncertainty margin only (±Xm)
          altitude: pos.coords.altitude,
          altitudeAccuracy: pos.coords.altitudeAccuracy,
          heading: pos.coords.heading,
          speed: pos.coords.speed,
          timestamp: pos.timestamp,
          sampleNumber: sampleCounter,
        };

        collectedSamples.push(reading);
        setSamples([...collectedSamples]);
        setBestReading(reading);

        // Calculate REAL distance from TSDC using Haversine
        const dist = calculateHaversineDistance(
          reading.latitude,
          reading.longitude,
          collegeLat,
          collegeLng
        );
        setActualDistance(dist);
        setProgressPercent(50);

        // Start watchPosition for continuous high-accuracy refinement
        startContinuousWatch(collectedSamples, dist);
      },
      (err) => {
        handleGeolocationError(err);
      },
      {
        enableHighAccuracy: true,
        maximumAge: 0,
        timeout: 15000,
      }
    );
  };

  const startContinuousWatch = (initialSamples: LocationReading[], firstDistance: number) => {
    let allSamples = [...initialSamples];
    let watchCount = allSamples.length;

    setStatus('IMPROVING');
    setStatusMessage('Refining GPS satellite fix for lowest uncertainty margin...');

    const watchId = navigator.geolocation.watchPosition(
      (pos) => {
        watchCount++;
        const reading: LocationReading = {
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
          accuracy: pos.coords.accuracy,
          altitude: pos.coords.altitude,
          altitudeAccuracy: pos.coords.altitudeAccuracy,
          heading: pos.coords.heading,
          speed: pos.coords.speed,
          timestamp: pos.timestamp,
          sampleNumber: watchCount,
        };

        allSamples.push(reading);
        setSamples([...allSamples]);

        // Pick best sample (lowest uncertainty margin)
        const best = [...allSamples].sort((a, b) => a.accuracy - b.accuracy)[0];
        setBestReading(best);

        // Calculate actual distance from TSDC
        const dist = calculateHaversineDistance(
          best.latitude,
          best.longitude,
          collegeLat,
          collegeLng
        );
        setActualDistance(dist);

        const currentProgress = Math.min(100, Math.round((allSamples.length / MAX_SAMPLES) * 100));
        setProgressPercent(currentProgress);

        if (allSamples.length >= MAX_SAMPLES || best.accuracy <= 15) {
          if (watchIdRef.current !== null) {
            navigator.geolocation.clearWatch(watchIdRef.current);
            watchIdRef.current = null;
          }
          evaluateFinalGeofence(best, dist);
        }
      },
      (err) => {
        console.warn('WatchPosition error:', err);
        if (allSamples.length > 0) {
          const best = [...allSamples].sort((a, b) => a.accuracy - b.accuracy)[0];
          const dist = calculateHaversineDistance(best.latitude, best.longitude, collegeLat, collegeLng);
          evaluateFinalGeofence(best, dist);
        } else {
          handleGeolocationError(err);
        }
      },
      {
        enableHighAccuracy: true,
        maximumAge: 0,
        timeout: 15000,
      }
    );

    watchIdRef.current = watchId;

    // Timeout safety fallback: evaluate after 5 seconds if not already completed
    sampleTimeoutRef.current = setTimeout(() => {
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
        watchIdRef.current = null;
      }
      if (allSamples.length > 0) {
        const best = [...allSamples].sort((a, b) => a.accuracy - b.accuracy)[0];
        const dist = calculateHaversineDistance(best.latitude, best.longitude, collegeLat, collegeLng);
        evaluateFinalGeofence(best, dist);
      }
    }, 5000);
  };

  const handleGeolocationError = (err: GeolocationPositionError) => {
    console.warn('GPS Sensor Error:', err);
    if (err.code === 1) {
      setStatus('PERMISSION_DENIED');
      setStatusMessage('Location permission was denied. Please allow location access in browser settings.');
      onLocationInvalid('Location permission denied by browser.');
    } else if (err.code === 2) {
      setStatus('UNAVAILABLE');
      setStatusMessage('GPS position unavailable. Ensure phone Location/GPS is turned ON and set to High Accuracy.');
      onLocationInvalid('GPS location unavailable on device.');
    } else if (err.code === 3) {
      setStatus('UNAVAILABLE');
      setStatusMessage('GPS signal acquisition timed out (15s). Move near a window or open area and retry.');
      onLocationInvalid('GPS acquisition timed out.');
    } else {
      setStatus('UNAVAILABLE');
      setStatusMessage('Unable to acquire GPS signal from device.');
      onLocationInvalid('GPS signal unavailable.');
    }
  };

  // Evaluate Final Geofencing vs Distance and Accuracy
  const evaluateFinalGeofence = (reading: LocationReading, distanceMeters: number) => {
    setBestReading(reading);
    setActualDistance(distanceMeters);

    // 1. Check GPS Uncertainty Accuracy Threshold
    if (reading.accuracy > GPS_ACCURACY_THRESHOLD_METERS) {
      setStatus('ACCURACY_TOO_LOW');
      setStatusMessage(
        `GPS accuracy is too low (±${Math.round(reading.accuracy)}m). Move to an open area and refresh your GPS location.`
      );
      onLocationInvalid(`GPS accuracy ±${Math.round(reading.accuracy)}m is too low (must be within ±${GPS_ACCURACY_THRESHOLD_METERS}m).`);
      return;
    }

    // 2. Check Physical Distance against Configured Radius
    if (distanceMeters <= radiusMeters) {
      setStatus('INSIDE_RADIUS');
      setStatusMessage(
        `Geofence Verified: You are ${distanceMeters}m from TSDC campus (within allowed ${radiusMeters}m radius).`
      );
      onLocationVerified(reading, distanceMeters);
    } else {
      setStatus('OUTSIDE_RADIUS');
      setStatusMessage(
        `Geofence Failed: You are ${distanceMeters >= 1000 ? `${(distanceMeters / 1000).toFixed(2)}km` : `${distanceMeters}m`} away from TSDC campus (Allowed: ${radiusMeters}m). Attendance blocked.`
      );
      onLocationInvalid(`Outside allowed proximity boundary (${distanceMeters}m away from TSDC).`);
    }
  };

  const handleExplicitPermissionRequest = () => {
    setStatus('ACQUIRING');
    setStatusMessage('Requesting GPS sensor access from browser...');
    startHighAccuracyAcquisition();
  };

  return (
    <div className="space-y-4">
      {/* 1. EXPLICIT PERMISSION REQUEST STATE */}
      {status === 'PERMISSION_REQUIRED' && (
        <div className="p-5 bg-gradient-to-br from-stone-900 to-stone-800 text-white rounded-2xl border border-stone-700 shadow-lg space-y-4 animate-in fade-in">
          <div className="flex items-start gap-3.5">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 flex items-center justify-center shrink-0 mt-0.5">
              <Navigation className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <h4 className="font-bold text-base text-white">
                Live GPS Location Verification Required
              </h4>
              <p className="text-xs text-stone-300 mt-1 leading-relaxed">
                AttendSecure requires real-time physical GPS coordinates from your device to verify that you are physically present at <strong>{collegeName}</strong> (Allowed Radius: <strong>{radiusMeters}m</strong>).
              </p>
            </div>
          </div>

          <div className="bg-stone-950/60 p-3.5 rounded-xl border border-stone-800 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
            <div className="flex items-center gap-2 text-stone-300">
              <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>Fixed Anchor: <strong>TSDC Kandivali East ({collegeLat.toFixed(6)}, {collegeLng.toFixed(6)})</strong></span>
            </div>
            <span className="font-mono text-emerald-400 font-bold">±{radiusMeters}m Allowed</span>
          </div>

          <button
            type="button"
            onClick={handleExplicitPermissionRequest}
            className="w-full py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-2 cursor-pointer shadow-lg transition-all"
          >
            <LocateFixed className="w-4 h-4" />
            <span>Allow Device GPS Location & Verify Distance</span>
          </button>
        </div>
      )}

      {/* 2. PERMISSION DENIED STATE */}
      {status === 'PERMISSION_DENIED' && (
        <div className="p-5 bg-rose-50 border-2 border-rose-300 rounded-2xl text-xs space-y-4 animate-in fade-in shadow-sm">
          <div className="flex items-start gap-3">
            <div className="w-9 h-9 rounded-xl bg-rose-600 text-white flex items-center justify-center shrink-0 mt-0.5 shadow-xs">
              <Lock className="w-5 h-5" />
            </div>
            <div>
              <h4 className="font-bold text-rose-950 text-sm">
                Location Access Blocked by Browser
              </h4>
              <p className="text-rose-800 mt-0.5 leading-relaxed">
                Your browser blocked device GPS access. Attendance cannot be recorded without verifying physical classroom presence.
              </p>
            </div>
          </div>

          <div className="bg-white p-3.5 rounded-xl border border-rose-200 text-stone-700 space-y-2.5">
            <div className="flex items-center justify-between border-b border-stone-100 pb-1.5">
              <span className="font-bold text-stone-900 text-xs">How to unblock location in your browser:</span>
              <div className="flex items-center gap-1 text-[10px] font-bold">
                <button
                  type="button"
                  onClick={() => setActiveHelpTab('chrome')}
                  className={`px-2 py-0.5 rounded cursor-pointer ${activeHelpTab === 'chrome' ? 'bg-stone-900 text-white' : 'text-stone-500 hover:bg-stone-100'}`}
                >
                  Chrome
                </button>
                <button
                  type="button"
                  onClick={() => setActiveHelpTab('safari')}
                  className={`px-2 py-0.5 rounded cursor-pointer ${activeHelpTab === 'safari' ? 'bg-stone-900 text-white' : 'text-stone-500 hover:bg-stone-100'}`}
                >
                  Safari iOS
                </button>
                <button
                  type="button"
                  onClick={() => setActiveHelpTab('mobile')}
                  className={`px-2 py-0.5 rounded cursor-pointer ${activeHelpTab === 'mobile' ? 'bg-stone-900 text-white' : 'text-stone-500 hover:bg-stone-100'}`}
                >
                  Android
                </button>
              </div>
            </div>

            {activeHelpTab === 'chrome' && (
              <div className="space-y-1.5 text-[11px] text-stone-600">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-rose-700 font-mono">1.</span>
                  <span>Click the <strong>Tune / Lock icon (🔒)</strong> on the left side of the address bar.</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-bold text-rose-700 font-mono">2.</span>
                  <span>Toggle <strong>Location</strong> to <strong>Allow</strong>.</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-bold text-rose-700 font-mono">3.</span>
                  <span>Click the button below to retry GPS acquisition.</span>
                </div>
              </div>
            )}

            {activeHelpTab === 'safari' && (
              <div className="space-y-1.5 text-[11px] text-stone-600">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-rose-700 font-mono">1.</span>
                  <span>Open iPhone <strong>Settings → Safari → Location</strong>.</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-bold text-rose-700 font-mono">2.</span>
                  <span>Set to <strong>Ask</strong> or <strong>Allow</strong>.</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-bold text-rose-700 font-mono">3.</span>
                  <span>Return here and tap <strong>"Re-Request Location"</strong>.</span>
                </div>
              </div>
            )}

            {activeHelpTab === 'mobile' && (
              <div className="space-y-1.5 text-[11px] text-stone-600">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-rose-700 font-mono">1.</span>
                  <span>Pull down notification shade and turn <strong>Location / GPS ON</strong>.</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-bold text-rose-700 font-mono">2.</span>
                  <span>Tap <strong>Lock (🔒)</strong> in Chrome bar → <strong>Site settings → Location → Allow</strong>.</span>
                </div>
              </div>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2 pt-1">
            <button
              type="button"
              onClick={handleExplicitPermissionRequest}
              className="px-4 py-2.5 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-xl text-xs flex items-center gap-1.5 cursor-pointer shadow-xs transition-colors"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Re-Request Location Permission</span>
            </button>
            <button
              type="button"
              onClick={() => startHighAccuracyAcquisition()}
              className="px-4 py-2.5 bg-stone-900 hover:bg-black text-white font-bold rounded-xl text-xs flex items-center gap-1.5 cursor-pointer shadow-xs transition-colors"
            >
              <span>Retry GPS Acquisition</span>
            </button>
          </div>
        </div>
      )}

      {/* 3. HARDWARE GPS UNAVAILABLE / TIMEOUT STATE */}
      {status === 'UNAVAILABLE' && (
        <div className="p-5 bg-amber-50 border-2 border-amber-300 rounded-2xl text-xs space-y-3 animate-in fade-in shadow-sm">
          <div className="flex items-start gap-3">
            <div className="w-9 h-9 rounded-xl bg-amber-600 text-white flex items-center justify-center shrink-0 mt-0.5">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div>
              <h4 className="font-bold text-amber-950 text-sm">
                GPS Hardware Signal Unavailable / Timed Out
              </h4>
              <p className="text-amber-800 mt-0.5 leading-relaxed">
                Could not establish a stable satellite fix within 15 seconds. Ensure your device&apos;s Location is enabled, set to <strong>High Accuracy</strong> mode, and retry in an open area.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 pt-1">
            <button
              type="button"
              onClick={() => startHighAccuracyAcquisition()}
              className="px-4 py-2.5 bg-stone-900 hover:bg-black text-white font-bold rounded-xl text-xs flex items-center gap-1.5 cursor-pointer shadow-xs transition-colors"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Retry GPS Satellite Lock</span>
            </button>
          </div>
        </div>
      )}

      {/* 4. ACCURACY TOO LOW ALERT */}
      {status === 'ACCURACY_TOO_LOW' && (
        <div className="p-4 bg-amber-50 border-2 border-amber-400 rounded-2xl text-xs space-y-2.5 animate-in fade-in shadow-xs">
          <div className="flex items-start gap-2.5">
            <Radio className="w-5 h-5 text-amber-600 shrink-0 mt-0.5 animate-pulse" />
            <div>
              <h4 className="font-bold text-amber-950 text-sm">
                GPS Accuracy is Too Low (±{bestReading ? Math.round(bestReading.accuracy) : 0}m)
              </h4>
              <p className="text-amber-800 mt-0.5 leading-relaxed font-medium">
                GPS accuracy is too low. Move to an open area and refresh your GPS location.
              </p>
            </div>
          </div>
          <p className="text-[11px] text-amber-700">
            Note: GPS uncertainty margin is ±{bestReading ? Math.round(bestReading.accuracy) : 0}m (must be within ±{GPS_ACCURACY_THRESHOLD_METERS}m for high-security attendance verification).
          </p>
          <button
            type="button"
            onClick={() => startHighAccuracyAcquisition()}
            className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-xl text-xs flex items-center gap-1.5 cursor-pointer shadow-xs"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Refresh GPS Reading</span>
          </button>
        </div>
      )}

      {/* 5. GEOFENCE FAILED (OUTSIDE RADIUS) ALERT */}
      {status === 'OUTSIDE_RADIUS' && actualDistance !== null && (
        <div className="p-4 bg-rose-50 border-2 border-rose-300 rounded-2xl text-xs space-y-2 animate-in fade-in shadow-xs">
          <div className="flex items-start gap-2.5">
            <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
            <div>
              <h4 className="font-bold text-rose-950 text-sm">
                Geofence Verification Failed — Outside Allowed Boundary
              </h4>
              <p className="text-rose-800 mt-0.5 leading-relaxed">
                You are physically <strong>{actualDistance >= 1000 ? `${(actualDistance / 1000).toFixed(2)} km (${actualDistance.toLocaleString()} m)` : `${actualDistance} m`}</strong> away from TSDC Kandivali Campus. Allowed perimeter is <strong>{radiusMeters} m</strong>.
              </p>
            </div>
          </div>
          <div className="text-[11px] text-rose-700 bg-rose-100/70 p-2.5 rounded-xl border border-rose-200">
            Attendance marking is strictly blocked because you are not present inside the college campus.
          </div>
        </div>
      )}

      {/* 6. GEOFENCE PASSED (INSIDE RADIUS) ALERT */}
      {status === 'INSIDE_RADIUS' && actualDistance !== null && (
        <div className="p-4 bg-emerald-50 border-2 border-emerald-400 rounded-2xl text-xs space-y-1.5 animate-in fade-in shadow-xs">
          <div className="flex items-center gap-2.5 text-emerald-900 font-bold text-sm">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
            <span>✓ Geofence Verification Passed</span>
          </div>
          <p className="text-emerald-800 leading-relaxed text-xs">
            You are physically present inside TSDC Kandivali Campus (Distance: <strong>{actualDistance} m</strong> ≤ Allowed Radius: <strong>{radiusMeters} m</strong>).
          </p>
        </div>
      )}

      {/* 7. PRECISE LOCATION & DISTANCE BREAKDOWN CARD (AS REQUESTED) */}
      {status !== 'PERMISSION_REQUIRED' && (
        <div className="bg-white rounded-2xl border border-stone-200 shadow-sm overflow-hidden">
          {/* Header */}
          <div className="bg-stone-900 text-white px-4 py-3 flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs font-bold">
              <Compass className="w-4 h-4 text-emerald-400" />
              <span>Real-Time Coordinates & Distance Verification</span>
            </div>
            {status === 'ACQUIRING' || status === 'IMPROVING' ? (
              <span className="text-[10px] font-mono px-2 py-0.5 bg-amber-500/20 text-amber-300 rounded-full border border-amber-500/30 animate-pulse">
                ACQUIRING SENSORS...
              </span>
            ) : status === 'INSIDE_RADIUS' ? (
              <span className="text-[10px] font-mono font-bold px-2 py-0.5 bg-emerald-500/20 text-emerald-400 rounded-full border border-emerald-500/30">
                GEOFENCE PASS
              </span>
            ) : status === 'OUTSIDE_RADIUS' ? (
              <span className="text-[10px] font-mono font-bold px-2 py-0.5 bg-rose-500/20 text-rose-300 rounded-full border border-rose-500/30">
                GEOFENCE FAILED
              </span>
            ) : (
              <span className="text-[10px] font-mono font-bold px-2 py-0.5 bg-amber-500/20 text-amber-300 rounded-full border border-amber-500/30">
                ACCURACY LOW
              </span>
            )}
          </div>

          {/* Location Details Grid */}
          <div className="p-4 space-y-3.5 text-xs">
            {/* Sampling Progress Bar if active */}
            {(status === 'ACQUIRING' || status === 'IMPROVING') && (
              <div className="space-y-1">
                <div className="flex justify-between text-[11px] text-stone-500 font-medium">
                  <span>Acquiring satellite lock ({samples.length}/{MAX_SAMPLES} fixes)...</span>
                  <span className="font-mono">{progressPercent}%</span>
                </div>
                <div className="w-full bg-stone-100 h-1.5 rounded-full overflow-hidden">
                  <div
                    className="bg-emerald-600 h-full transition-all duration-300 rounded-full"
                    style={{ width: `${progressPercent}%` }}
                  ></div>
                </div>
              </div>
            )}

            {/* Coordinates Two-Column Block */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* 📍 Your Location */}
              <div className="p-3.5 bg-blue-50/60 rounded-xl border border-blue-200 space-y-1">
                <div className="flex items-center gap-1.5 text-blue-900 font-bold text-xs">
                  <MapPin className="w-4 h-4 text-blue-600" />
                  <span>📍 Your Device Location</span>
                </div>
                <div className="font-mono text-[11px] text-stone-800 space-y-0.5 pt-1">
                  <div>Latitude: <strong className="text-blue-900">{bestReading ? bestReading.latitude.toFixed(6) : 'Acquiring...'}</strong></div>
                  <div>Longitude: <strong className="text-blue-900">{bestReading ? bestReading.longitude.toFixed(6) : 'Acquiring...'}</strong></div>
                </div>
              </div>

              {/* 🎯 TSDC Campus Fixed Coordinates */}
              <div className="p-3.5 bg-amber-50/60 rounded-xl border border-amber-200 space-y-1">
                <div className="flex items-center gap-1.5 text-amber-950 font-bold text-xs">
                  <Target className="w-4 h-4 text-amber-600" />
                  <span>🎯 TSDC Campus Anchor</span>
                </div>
                <div className="font-mono text-[11px] text-stone-800 space-y-0.5 pt-1">
                  <div>Latitude: <strong className="text-amber-950">{collegeLat.toFixed(6)}</strong></div>
                  <div>Longitude: <strong className="text-amber-950">{collegeLng.toFixed(6)}</strong></div>
                </div>
              </div>
            </div>

            {/* Metrics Breakdown (3-Grid) */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-1 border-t border-stone-100">
              {/* 📏 Distance from TSDC */}
              <div className="p-3 bg-stone-50 rounded-xl border border-stone-200">
                <div className="flex items-center gap-1 text-[11px] text-stone-500 font-semibold uppercase">
                  <Ruler className="w-3.5 h-3.5 text-indigo-600" />
                  <span>Distance from TSDC</span>
                </div>
                <div className={`text-lg font-extrabold font-mono tabular-nums mt-1 ${
                  status === 'INSIDE_RADIUS' ? 'text-emerald-700' :
                  status === 'OUTSIDE_RADIUS' ? 'text-rose-600' : 'text-stone-900'
                }`}>
                  {actualDistance !== null
                    ? actualDistance >= 1000
                      ? `${(actualDistance / 1000).toFixed(2)} km`
                      : `${actualDistance} m`
                    : 'Calculating...'}
                </div>
              </div>

              {/* 🎯 Allowed Radius */}
              <div className="p-3 bg-stone-50 rounded-xl border border-stone-200">
                <div className="flex items-center gap-1 text-[11px] text-stone-500 font-semibold uppercase">
                  <Target className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Allowed Radius</span>
                </div>
                <div className="text-lg font-extrabold font-mono tabular-nums text-stone-900 mt-1">
                  {radiusMeters} m
                </div>
              </div>

              {/* 📡 GPS Accuracy */}
              <div className="p-3 bg-stone-50 rounded-xl border border-stone-200">
                <div className="flex items-center gap-1 text-[11px] text-stone-500 font-semibold uppercase">
                  <Radio className="w-3.5 h-3.5 text-blue-600" />
                  <span>GPS Accuracy</span>
                </div>
                <div className={`text-lg font-extrabold font-mono tabular-nums mt-1 ${
                  bestReading && bestReading.accuracy <= GPS_ACCURACY_THRESHOLD_METERS ? 'text-emerald-700' : 'text-amber-700'
                }`}>
                  {bestReading ? `±${Math.round(bestReading.accuracy)} m` : 'Calculating...'}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 8. SATELLITE MAP VS RADAR VIEW SWITCHER */}
      <div className="flex items-center justify-between gap-2 pt-1">
        <div className="text-xs font-bold text-stone-700 flex items-center gap-1.5">
          <Navigation className="w-3.5 h-3.5 text-emerald-600" />
          <span>Campus Visualizer</span>
        </div>

        <div className="bg-stone-200/80 p-0.5 rounded-xl flex items-center gap-0.5 text-xs">
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
            <span>Radar Sonar</span>
          </button>
        </div>
      </div>

      {/* 9. MAP OR RADAR RENDERING */}
      {viewType === 'map' ? (
        <GoogleLocationMap
          collegeLat={collegeLat}
          collegeLng={collegeLng}
          collegeName="TSDC Kandivali East Campus"
          studentLat={bestReading?.latitude}
          studentLng={bestReading?.longitude}
          radiusMeters={radiusMeters}
          isInside={status === 'INSIDE_RADIUS' ? true : status === 'OUTSIDE_RADIUS' ? false : null}
          accuracy={bestReading?.accuracy}
          className="h-64 sm:h-72"
        />
      ) : (
        <GeofenceVisualizer
          teacherLat={collegeLat}
          teacherLng={collegeLng}
          studentLat={bestReading?.latitude}
          studentLng={bestReading?.longitude}
          radiusMeters={radiusMeters}
          distanceMeters={actualDistance}
          teacherName={collegeName}
          studentLabel="Your Device Location"
        />
      )}

      {/* 10. ACTION TOOLBAR */}
      <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
        <button
          type="button"
          onClick={() => startHighAccuracyAcquisition()}
          className="px-3.5 py-2 bg-stone-900 hover:bg-black text-white rounded-xl text-xs font-bold transition-colors flex items-center gap-1.5 cursor-pointer shadow-xs"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>Refresh GPS Location (Sensor Re-Scan)</span>
        </button>

        <button
          type="button"
          onClick={() => setShowDiagnostics(!showDiagnostics)}
          className="text-stone-500 hover:text-stone-900 text-xs font-semibold flex items-center gap-1 cursor-pointer transition-colors"
        >
          <span>{showDiagnostics ? 'Hide' : 'Show'} Sensor Telemetry</span>
          {showDiagnostics ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
        </button>
      </div>

      {/* 11. DEVELOPER / DEBUG INFORMATION (AS REQUESTED) */}
      {showDiagnostics && (
        <div className="p-4 bg-stone-900 text-white rounded-xl font-mono text-xs space-y-3 border border-stone-800 shadow-inner">
          <div className="text-emerald-400 font-bold border-b border-stone-800 pb-2 flex items-center justify-between">
            <span>DEVELOPER / GPS AUDIT TELEMETRY</span>
            <span className="text-[10px] px-2 py-0.5 bg-stone-800 text-emerald-300 rounded font-bold">
              SOURCE: BROWSER DEVICE GPS
            </span>
          </div>

          <div className="space-y-1 text-stone-300 text-[11px] leading-relaxed">
            <div>Device Latitude: <strong className="text-white">{bestReading ? bestReading.latitude.toFixed(6) : 'Acquiring...'}</strong></div>
            <div>Device Longitude: <strong className="text-white">{bestReading ? bestReading.longitude.toFixed(6) : 'Acquiring...'}</strong></div>
            <div>GPS Accuracy: <strong className="text-blue-400">±{bestReading ? Math.round(bestReading.accuracy) : 0} m</strong></div>
            
            <div className="pt-2 border-t border-stone-800">
              <div>TSDC Latitude: <strong className="text-amber-400">{collegeLat.toFixed(6)}</strong></div>
              <div>TSDC Longitude: <strong className="text-amber-400">{collegeLng.toFixed(6)}</strong></div>
            </div>

            <div className="pt-2 border-t border-stone-800">
              <div>Calculated Distance: <strong className={status === 'INSIDE_RADIUS' ? 'text-emerald-400' : 'text-rose-400'}>{actualDistance !== null ? `${actualDistance} m` : 'Calculating...'}</strong></div>
              <div>Allowed Radius: <strong className="text-white">{radiusMeters} m</strong></div>
              <div>Location Source: <strong className="text-emerald-300">Browser Device GPS (High Accuracy API)</strong></div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
