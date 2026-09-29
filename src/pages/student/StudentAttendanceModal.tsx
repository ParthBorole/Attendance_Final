import React, { useState } from 'react';
import { ActiveSessionForStudent } from '../../types.js';
import { ApiService } from '../../services/api.js';
import { getDeviceId } from '../../utils/device.js';
import { CameraVerification } from '../../components/common/CameraVerification.js';
import {
  MultiSampleGeolocationVerifier,
  LocationReading,
} from '../../components/student/MultiSampleGeolocationVerifier.js';
import confetti from 'canvas-confetti';
import {
  X,
  Camera,
  ShieldCheck,
  AlertTriangle,
  CheckCircle2,
  RefreshCw,
  Clock,
  Compass,
  Building,
  Check,
} from 'lucide-react';

interface StudentAttendanceModalProps {
  session: ActiveSessionForStudent;
  onClose: () => void;
  onSuccess: () => void;
}

type Step = 'LOCATION' | 'CAMERA' | 'CONFIRMATION' | 'SUCCESS';

export const StudentAttendanceModal: React.FC<StudentAttendanceModalProps> = ({
  session,
  onClose,
  onSuccess,
}) => {
  const [currentStep, setCurrentStep] = useState<Step>('LOCATION');

  // Location Verification Results
  const [verifiedReading, setVerifiedReading] = useState<LocationReading | null>(null);
  const [verifiedDistance, setVerifiedDistance] = useState<number | null>(null);
  const [isLocationValid, setIsLocationValid] = useState<boolean>(false);
  const [locationError, setLocationError] = useState<string | null>(null);

  // Camera State
  const [capturedImage, setCapturedImage] = useState<string | null>(null);

  // Submission State
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [attendanceReceipt, setAttendanceReceipt] = useState<any | null>(null);

  const handleLocationVerified = (reading: LocationReading, distanceMeters: number) => {
    setVerifiedReading(reading);
    setVerifiedDistance(distanceMeters);
    setIsLocationValid(true);
    setLocationError(null);
  };

  const handleLocationInvalid = (errorMsg: string) => {
    setIsLocationValid(false);
    setLocationError(errorMsg);
  };

  const handleCameraCapture = (imageBase64: string) => {
    setCapturedImage(imageBase64);
    setCurrentStep('CONFIRMATION');
  };

  const handleCameraRetake = () => {
    setCapturedImage(null);
  };

  const handleSubmitAttendance = async () => {
    if (!verifiedReading || !capturedImage) {
      setSubmitError('Both valid location coordinates and live selfie capture are mandatory.');
      return;
    }

    setIsSubmitting(true);
    setSubmitError(null);

    const payload = {
      sessionId: session.id,
      latitude: verifiedReading.latitude,
      longitude: verifiedReading.longitude,
      accuracy: verifiedReading.accuracy,
      altitude: verifiedReading.altitude,
      altitudeAccuracy: verifiedReading.altitudeAccuracy,
      locationTimestamp: verifiedReading.timestamp,
      cameraImageBase64: capturedImage,
      deviceId: getDeviceId(),
    };

    const res = await ApiService.submitAttendance(payload);
    setIsSubmitting(false);

    if (res.success && res.data) {
      setAttendanceReceipt(res.data);
      setCurrentStep('SUCCESS');
      confetti({
        particleCount: 80,
        spread: 70,
        origin: { y: 0.6 },
        colors: ['#10b981', '#f59e0b', '#0f172a'],
      });
      onSuccess();
    } else {
      setSubmitError(res.message || 'Failed to submit attendance. Please try again.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-stone-900/70 backdrop-blur-xs animate-in fade-in duration-200 overflow-hidden">
      <div className="w-full max-w-2xl bg-white rounded-2xl border border-stone-200 shadow-2xl flex flex-col max-h-[90vh] overflow-hidden">
        
        {/* Modal Top Bar (Pinned) */}
        <div className="shrink-0 bg-stone-900 text-white px-6 py-4 flex items-center justify-between shadow-md">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-stone-800 border border-stone-700 flex items-center justify-center text-emerald-400">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold tracking-tight">
                Attendance Verification
              </h2>
              <p className="text-[11px] text-stone-400">
                {session.subjectName} ({session.subjectCode}) • {session.lectureTopic}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="px-3 py-1.5 bg-stone-800 hover:bg-stone-700 text-white text-xs font-bold rounded-lg border border-stone-700 transition-colors flex items-center gap-1.5 cursor-pointer shadow-sm"
            title="Close modal"
          >
            <X className="w-4 h-4" />
            <span>Close</span>
          </button>
        </div>

        {/* Step Progression Tabs (Pinned) */}
        {currentStep !== 'SUCCESS' && (
          <div className="shrink-0 bg-stone-100/90 border-b border-stone-200 px-6 py-2.5 flex items-center justify-between text-xs font-semibold">
            <button
              type="button"
              onClick={() => setCurrentStep('LOCATION')}
              className={`flex items-center gap-2 py-1 px-2.5 rounded-lg transition-colors cursor-pointer ${
                currentStep === 'LOCATION'
                  ? 'bg-white text-stone-900 shadow-xs border border-stone-200'
                  : 'text-stone-500 hover:text-stone-800'
              }`}
            >
              <div
                className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] ${
                  isLocationValid ? 'bg-emerald-500 text-white' : 'bg-stone-300 text-stone-700'
                }`}
              >
                1
              </div>
              <span>Location Radius</span>
            </button>

            <span className="text-stone-300">→</span>

            <button
              type="button"
              disabled={!isLocationValid}
              onClick={() => isLocationValid && setCurrentStep('CAMERA')}
              className={`flex items-center gap-2 py-1 px-2.5 rounded-lg transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed ${
                currentStep === 'CAMERA'
                  ? 'bg-white text-stone-900 shadow-xs border border-stone-200'
                  : 'text-stone-500 hover:text-stone-800'
              }`}
            >
              <div
                className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] ${
                  capturedImage ? 'bg-emerald-500 text-white' : 'bg-stone-300 text-stone-700'
                }`}
              >
                2
              </div>
              <span>Live Camera</span>
            </button>

            <span className="text-stone-300">→</span>

            <button
              type="button"
              disabled={!isLocationValid || !capturedImage}
              onClick={() => isLocationValid && capturedImage && setCurrentStep('CONFIRMATION')}
              className={`flex items-center gap-2 py-1 px-2.5 rounded-lg transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed ${
                currentStep === 'CONFIRMATION'
                  ? 'bg-white text-stone-900 shadow-xs border border-stone-200'
                  : 'text-stone-500 hover:text-stone-800'
              }`}
            >
              <div className="w-5 h-5 rounded-full bg-stone-300 text-stone-700 flex items-center justify-center text-[10px]">
                3
              </div>
              <span>Submit</span>
            </button>
          </div>
        )}

        {/* Body Content (Scrollable) */}
        <div className="flex-1 overflow-y-auto p-6">
          
          {/* STEP 1: MULTI-SAMPLE LOCATION VERIFICATION */}
          {currentStep === 'LOCATION' && (
            <div className="space-y-4">
              <MultiSampleGeolocationVerifier
                collegeLat={session.centerLatitude}
                collegeLng={session.centerLongitude}
                radiusMeters={session.radiusMeters}
                collegeName="Thakur Shyamnarayan Degree College (TSDC)"
                onLocationVerified={handleLocationVerified}
                onLocationInvalid={handleLocationInvalid}
              />

              {/* Action Toolbar */}
              <div className="pt-3 flex items-center justify-between border-t border-stone-100">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 text-xs font-semibold text-stone-600 hover:text-stone-900 bg-stone-100 hover:bg-stone-200 rounded-xl cursor-pointer"
                >
                  Cancel
                </button>

                <button
                  type="button"
                  disabled={!isLocationValid}
                  onClick={() => setCurrentStep('CAMERA')}
                  className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-40 disabled:cursor-not-allowed text-white text-xs font-bold rounded-xl shadow-xs transition-all flex items-center gap-2 cursor-pointer"
                >
                  <Camera className="w-4 h-4" />
                  <span>Proceed to Camera Verification →</span>
                </button>
              </div>
            </div>
          )}

          {/* STEP 2: CAMERA IDENTITY VERIFICATION */}
          {currentStep === 'CAMERA' && (
            <div className="space-y-4">
              <div className="text-center max-w-md mx-auto mb-2">
                <h3 className="text-sm font-bold text-stone-900">
                  Front Camera Identity Verification
                </h3>
                <p className="text-xs text-stone-500 mt-0.5">
                  Align your face inside the oval frame and take a live snapshot. No gallery or pre-saved photos allowed.
                </p>
              </div>

              <CameraVerification
                onCapture={handleCameraCapture}
                onRetake={handleCameraRetake}
                capturedImage={capturedImage}
              />

              <div className="pt-3 flex items-center justify-between border-t border-stone-100">
                <button
                  type="button"
                  onClick={() => setCurrentStep('LOCATION')}
                  className="px-4 py-2 text-xs font-semibold text-stone-600 hover:text-stone-900 bg-stone-100 hover:bg-stone-200 rounded-xl cursor-pointer"
                >
                  ← Back to Location
                </button>

                <button
                  type="button"
                  disabled={!capturedImage}
                  onClick={() => setCurrentStep('CONFIRMATION')}
                  className="px-5 py-2.5 bg-stone-900 hover:bg-stone-800 disabled:opacity-40 disabled:cursor-not-allowed text-white text-xs font-bold rounded-xl shadow-xs transition-all flex items-center gap-2 cursor-pointer"
                >
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  <span>Review & Submit →</span>
                </button>
              </div>
            </div>
          )}

          {/* STEP 3: FINAL CONFIRMATION */}
          {currentStep === 'CONFIRMATION' && (
            <div className="space-y-4">
              <div className="p-4 bg-emerald-50/70 border border-emerald-200 rounded-xl flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-emerald-600 text-white flex items-center justify-center shrink-0">
                  <ShieldCheck className="w-6 h-6" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-emerald-950">
                    All Physical Presence Checks Authenticated
                  </h4>
                  <p className="text-xs text-emerald-800">
                    GPS location verified {verifiedDistance}m from TSDC center (Allowed radius: {session.radiusMeters}m) and live identity snapshot confirmed.
                  </p>
                </div>
              </div>

              {submitError && (
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-800 flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                  <span>{submitError}</span>
                </div>
              )}

              {/* Verification Summary Card */}
              <div className="border border-stone-200 rounded-xl overflow-hidden divide-y divide-stone-100 text-xs">
                <div className="p-3 bg-stone-50 flex items-center justify-between font-semibold text-stone-700">
                  <span>Lecture Information</span>
                  <span className="text-stone-500 font-mono">{session.sessionDate}</span>
                </div>
                <div className="p-3.5 space-y-2">
                  <div className="flex justify-between">
                    <span className="text-stone-500">Subject:</span>
                    <span className="font-semibold text-stone-900">{session.subjectName} ({session.subjectCode})</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-stone-500">Topic:</span>
                    <span className="font-semibold text-stone-900">{session.lectureTopic}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-stone-500">Distance to TSDC Center:</span>
                    <span className="font-mono font-bold text-emerald-700">{verifiedDistance} meters (Inside {session.radiusMeters}m)</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-stone-500">GPS Accuracy:</span>
                    <span className="font-mono text-stone-700">±{verifiedReading ? Math.round(verifiedReading.accuracy) : 5} meters</span>
                  </div>
                </div>
              </div>

              <div className="pt-2 flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => setCurrentStep('CAMERA')}
                  className="px-4 py-2 text-xs font-semibold text-stone-600 hover:text-stone-900 bg-stone-100 rounded-xl cursor-pointer"
                >
                  ← Edit Photo
                </button>

                <button
                  type="button"
                  disabled={isSubmitting}
                  onClick={handleSubmitAttendance}
                  className="px-6 py-3 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-xs font-bold rounded-xl shadow-md transition-all flex items-center gap-2 cursor-pointer"
                >
                  {isSubmitting ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>Validating & Submitting...</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="w-4 h-4" />
                      <span>SUBMIT VERIFIED ATTENDANCE</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          )}

          {/* STEP 4: SUCCESS RECEIPT */}
          {currentStep === 'SUCCESS' && attendanceReceipt && (
            <div className="text-center py-4 space-y-5">
              <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto shadow-sm">
                <CheckCircle2 className="w-10 h-10" />
              </div>

              <div>
                <h3 className="text-xl font-extrabold tracking-tight text-stone-900">
                  Attendance Marked Successfully
                </h3>
                <p className="text-xs text-stone-500 mt-1">
                  Your physical attendance is authenticated and permanently stored in the college database.
                </p>
              </div>

              <div className="max-w-md mx-auto bg-stone-50 rounded-2xl border border-stone-200 p-4 text-left text-xs space-y-2.5">
                <div className="flex justify-between pb-2 border-b border-stone-200/80">
                  <span className="text-stone-500">Student:</span>
                  <span className="font-bold text-stone-900">{attendanceReceipt.studentName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-stone-500">Subject:</span>
                  <span className="font-semibold text-stone-900">{attendanceReceipt.subjectName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-stone-500">Timestamp:</span>
                  <span className="font-mono text-stone-800">{attendanceReceipt.date} • {attendanceReceipt.time}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-stone-500">Verified Distance:</span>
                  <span className="font-mono font-bold text-emerald-700">{attendanceReceipt.distanceMeters} meters</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-stone-500">Status:</span>
                  <span className="font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded">PRESENT (VERIFIED)</span>
                </div>
              </div>

              <div className="pt-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-6 py-2.5 bg-stone-900 hover:bg-stone-800 text-white text-xs font-bold rounded-xl shadow-xs transition-colors cursor-pointer"
                >
                  Return to Dashboard
                </button>
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
};
