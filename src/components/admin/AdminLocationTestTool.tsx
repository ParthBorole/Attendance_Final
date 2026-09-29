import React, { useState } from 'react';
import { GoogleLocationMap } from '../common/GoogleLocationMap.js';
import { calculateHaversineDistance } from '../student/MultiSampleGeolocationVerifier.js';
import {
  Compass,
  MapPin,
  Sliders,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Navigation,
  Info,
  Building,
} from 'lucide-react';

interface AdminLocationTestToolProps {
  collegeLat: number;
  collegeLng: number;
  collegeName?: string;
  defaultRadius?: number;
}

export const AdminLocationTestTool: React.FC<AdminLocationTestToolProps> = ({
  collegeLat,
  collegeLng,
  collegeName = 'Thakur Shyamnarayan Degree College (TSDC)',
  defaultRadius = 10,
}) => {
  const [testLat, setTestLat] = useState<number>(collegeLat + 0.000025);
  const [testLng, setTestLng] = useState<number>(collegeLng + 0.000015);
  const [radius, setRadius] = useState<number>(defaultRadius);
  const [testAccuracy, setTestAccuracy] = useState<number>(5);

  const calculatedDistance = calculateHaversineDistance(testLat, testLng, collegeLat, collegeLng);
  const isInside = calculatedDistance <= radius;

  // Preset location quick test scenarios
  const setPreset = (type: 'center' | 'inside_edge' | 'outside_near' | 'borivali_5km' | 'device_gps') => {
    if (type === 'center') {
      setTestLat(collegeLat + 0.000005);
      setTestLng(collegeLng + 0.000005);
      setTestAccuracy(4);
    } else if (type === 'inside_edge') {
      setTestLat(collegeLat + 0.000045);
      setTestLng(collegeLng + 0.000035);
      setTestAccuracy(6);
    } else if (type === 'outside_near') {
      setTestLat(collegeLat + 0.00022);
      setTestLng(collegeLng + 0.00018);
      setTestAccuracy(8);
    } else if (type === 'borivali_5km') {
      setTestLat(collegeLat + 0.045);
      setTestLng(collegeLng + 0.035);
      setTestAccuracy(12);
    } else if (type === 'device_gps') {
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          (pos) => {
            setTestLat(pos.coords.latitude);
            setTestLng(pos.coords.longitude);
            setTestAccuracy(Math.round(pos.coords.accuracy));
          },
          (err) => {
            alert(`GPS Error: ${err.message}`);
          },
          { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
        );
      }
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-stone-200 shadow-xs p-6 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-stone-100">
        <div>
          <div className="flex items-center gap-2">
            <Compass className="w-5 h-5 text-amber-600" />
            <h2 className="text-base font-bold text-stone-900">
              Location Verification & Radius Diagnostic Tool
            </h2>
          </div>
          <p className="text-xs text-stone-500 mt-0.5">
            Simulate and audit real-world GPS coordinates against Thakur Shyamnarayan Degree College (TSDC) attendance boundaries.
          </p>
        </div>

        <span className="text-[11px] font-mono font-bold px-2.5 py-1 bg-stone-100 rounded-lg text-stone-700">
          Admin Diagnostic Only
        </span>
      </div>

      {/* Warning for very small radius */}
      {radius <= 3 && (
        <div className="p-3.5 bg-amber-50 border border-amber-300 rounded-xl text-xs text-amber-900 flex items-start gap-2.5">
          <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
          <div>
            <span className="font-bold block">Small Radius Warning ({radius}m):</span>
            <span>
              Configuring 1m-3m is extremely strict. Typical smartphone GPS accuracy is between 4m and 20m. Indoor multi-story buildings may trigger false rejections if set under 5m.
            </span>
          </div>
        </div>
      )}

      {/* Preset Quick Buttons */}
      <div className="space-y-2">
        <span className="text-[11px] font-bold text-stone-500 uppercase tracking-wider block">
          Preset Coordinate Scenarios:
        </span>
        <div className="flex flex-wrap gap-1.5 text-xs">
          <button
            type="button"
            onClick={() => setPreset('center')}
            className="px-3 py-1.5 bg-stone-100 hover:bg-stone-200 text-stone-800 rounded-lg font-semibold cursor-pointer"
          >
            🏢 At TSDC Building (~0.7m)
          </button>
          <button
            type="button"
            onClick={() => setPreset('inside_edge')}
            className="px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 rounded-lg font-semibold cursor-pointer"
          >
            ✓ Near Radius Edge (~5.8m)
          </button>
          <button
            type="button"
            onClick={() => setPreset('outside_near')}
            className="px-3 py-1.5 bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 rounded-lg font-semibold cursor-pointer"
          >
            ✕ Outside Campus (~28m)
          </button>
          <button
            type="button"
            onClick={() => setPreset('borivali_5km')}
            className="px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-800 border border-rose-200 rounded-lg font-semibold cursor-pointer"
          >
            🚫 Far Away (~5.2km)
          </button>
          <button
            type="button"
            onClick={() => setPreset('device_gps')}
            className="px-3 py-1.5 bg-stone-900 text-white hover:bg-stone-800 rounded-lg font-bold flex items-center gap-1.5 cursor-pointer"
          >
            <Navigation className="w-3.5 h-3.5 text-emerald-400" />
            <span>My Live Device GPS</span>
          </button>
        </div>
      </div>

      {/* Interactive Controls Form */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
        <div>
          <label className="block font-semibold text-stone-700 mb-1">Simulated Latitude</label>
          <input
            type="number"
            step="0.0000001"
            value={testLat}
            onChange={(e) => setTestLat(parseFloat(e.target.value) || 0)}
            className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl font-mono text-stone-900"
          />
        </div>

        <div>
          <label className="block font-semibold text-stone-700 mb-1">Simulated Longitude</label>
          <input
            type="number"
            step="0.0000001"
            value={testLng}
            onChange={(e) => setTestLng(parseFloat(e.target.value) || 0)}
            className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl font-mono text-stone-900"
          />
        </div>

        <div>
          <div className="flex justify-between items-center mb-1">
            <label className="font-semibold text-stone-700">Test Radius (meters)</label>
            <span className="font-mono font-bold text-stone-900">{radius}m</span>
          </div>
          <input
            type="range"
            min="1"
            max="50"
            value={radius}
            onChange={(e) => setRadius(parseInt(e.target.value, 10))}
            className="w-full accent-stone-900 cursor-pointer"
          />
        </div>
      </div>

      {/* Result Metrics Card */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="p-3 bg-stone-50 rounded-xl border border-stone-200">
          <span className="text-[10px] text-stone-500 font-bold uppercase block">Calculated Distance</span>
          <span className={`text-lg font-extrabold font-mono ${isInside ? 'text-emerald-700' : 'text-rose-700'}`}>
            {calculatedDistance} meters
          </span>
        </div>

        <div className="p-3 bg-stone-50 rounded-xl border border-stone-200">
          <span className="text-[10px] text-stone-500 font-bold uppercase block">Radius Boundary</span>
          <span className="text-lg font-extrabold font-mono text-stone-900">
            {radius} meters
          </span>
        </div>

        <div className="p-3 bg-stone-50 rounded-xl border border-stone-200">
          <span className="text-[10px] text-stone-500 font-bold uppercase block">Simulated GPS Accuracy</span>
          <span className="text-lg font-extrabold font-mono text-stone-700">
            ±{testAccuracy} meters
          </span>
        </div>

        <div className="p-3 bg-stone-50 rounded-xl border border-stone-200">
          <span className="text-[10px] text-stone-500 font-bold uppercase block">Verification Verdict</span>
          <span className={`text-xs font-bold inline-block px-2 py-1 rounded-md mt-0.5 ${
            isInside ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
          }`}>
            {isInside ? '✓ PASS: INSIDE RADIUS' : '✕ FAIL: OUT OF RADIUS'}
          </span>
        </div>
      </div>

      {/* Google Map Visualization */}
      <GoogleLocationMap
        collegeLat={collegeLat}
        collegeLng={collegeLng}
        collegeName={collegeName}
        studentLat={testLat}
        studentLng={testLng}
        radiusMeters={radius}
        isInside={isInside}
        accuracy={testAccuracy}
        className="h-80 sm:h-96"
      />
    </div>
  );
};
