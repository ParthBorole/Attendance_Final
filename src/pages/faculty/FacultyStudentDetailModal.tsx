import React, { useState, useEffect } from 'react';
import { ApiService } from '../../services/api.js';
import {
  X,
  User,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Calendar,
  Clock,
  MapPin,
  Camera,
  RefreshCw,
  Eye,
} from 'lucide-react';

interface FacultyStudentDetailModalProps {
  studentId: string;
  onClose: () => void;
}

export const FacultyStudentDetailModal: React.FC<FacultyStudentDetailModalProps> = ({
  studentId,
  onClose,
}) => {
  const [data, setData] = useState<any | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [selectedPhoto, setSelectedPhoto] = useState<string | null>(null);

  useEffect(() => {
    const fetchDetail = async () => {
      setIsLoading(true);
      const res = await ApiService.getFacultyStudentDetail(studentId);
      setIsLoading(false);
      if (res.success && res.data) {
        setData(res.data);
      }
    };
    fetchDetail();
  }, [studentId]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-stone-900/75 backdrop-blur-xs overflow-y-auto animate-in fade-in">
      <div className="bg-white rounded-2xl border border-stone-200 shadow-2xl max-w-3xl w-full overflow-hidden my-6">
        
        {/* Top Header */}
        <div className="bg-stone-900 text-white px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-stone-800 border border-stone-700 flex items-center justify-center text-emerald-400 font-bold">
              {data?.student?.name?.charAt(0) || 'S'}
            </div>
            <div>
              <h2 className="text-base font-bold tracking-tight">{data?.student?.name || 'Student Profile'}</h2>
              <p className="text-xs text-stone-400">
                Roll: {data?.student?.rollNumber} • ID: {data?.student?.studentId} • {data?.student?.className}.{data?.student?.division}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-stone-400 hover:text-white rounded-lg hover:bg-stone-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 max-h-[80vh] overflow-y-auto space-y-6">
          {isLoading ? (
            <div className="py-16 text-center text-xs text-stone-500 flex flex-col items-center">
              <RefreshCw className="w-6 h-6 animate-spin mb-2 text-stone-400" />
              <span>Loading student record...</span>
            </div>
          ) : !data ? (
            <p className="text-center py-10 text-stone-500 text-xs">Student record could not be loaded.</p>
          ) : (
            <>
              {/* Overall Summary Stats */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                <div className="p-3 bg-stone-50 rounded-xl border border-stone-200">
                  <span className="text-[10px] text-stone-500 block">Overall Attendance</span>
                  <span className={`text-lg font-bold font-mono ${data.stats.overallPercentage >= 75 ? 'text-emerald-700' : 'text-rose-600'}`}>
                    {data.stats.overallPercentage}%
                  </span>
                </div>
                <div className="p-3 bg-stone-50 rounded-xl border border-stone-200">
                  <span className="text-[10px] text-stone-500 block">Total Lectures</span>
                  <span className="text-lg font-bold font-mono text-stone-900">{data.stats.totalLectures}</span>
                </div>
                <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-200">
                  <span className="text-[10px] text-emerald-700 block">Present</span>
                  <span className="text-lg font-bold font-mono text-emerald-800">{data.stats.attendedCount}</span>
                </div>
                <div className="p-3 bg-rose-50 rounded-xl border border-rose-200">
                  <span className="text-[10px] text-rose-700 block">Absent</span>
                  <span className="text-lg font-bold font-mono text-rose-800">{data.stats.absentCount}</span>
                </div>
              </div>

              {/* Defaulter warning */}
              {data.stats.isDefaulter && (
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl flex items-center gap-2 text-xs text-rose-800">
                  <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                  <span>Student is on the Defaulters List (Attendance below {data.stats.threshold}%).</span>
                </div>
              )}

              {/* Subject Breakdown */}
              <div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-stone-500 mb-3">
                  Subject-Wise Breakdown
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {data.subjectStats.map((sub: any) => (
                    <div key={sub.subjectId} className="p-3 bg-stone-50/70 border border-stone-200 rounded-xl text-xs">
                      <div className="flex justify-between items-start mb-2">
                        <span className="font-semibold text-stone-900">{sub.subjectName}</span>
                        <span className={`font-mono font-bold ${sub.percentage >= 75 ? 'text-emerald-700' : 'text-rose-600'}`}>
                          {sub.percentage}%
                        </span>
                      </div>
                      <div className="flex justify-between text-[11px] text-stone-500">
                        <span>{sub.presentCount} present / {sub.totalLectures} total</span>
                        <span>{sub.isDefaulter ? '⚠️ Defaulter' : '✓ Normal'}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Attendance Evidence Audit Trail */}
              <div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-stone-500 mb-3">
                  Cryptographic Attendance & Photo Verification Log
                </h3>
                <div className="border border-stone-200 rounded-xl overflow-hidden divide-y divide-stone-100 text-xs">
                  {data.attendanceHistory.map((item: any) => (
                    <div key={item.sessionId} className="p-3.5 hover:bg-stone-50/70 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-stone-900">{item.subjectName}</span>
                          <span className="text-[11px] text-stone-500 font-mono">{item.date}</span>
                        </div>
                        <p className="text-stone-600 text-[11px]">{item.topic}</p>
                        {item.status === 'PRESENT' && (
                          <div className="flex flex-wrap items-center gap-2 text-[10px] text-stone-500 pt-0.5">
                            <span>GPS: {item.latitude?.toFixed(6)}, {item.longitude?.toFixed(6)}</span>
                            <span>·</span>
                            <span className="font-bold text-emerald-700">Dist: {item.distanceMeters}m</span>
                            <span>·</span>
                            <span>Alt: {item.altitude !== null ? `${Math.round(item.altitude)}m` : 'N/A'}</span>
                          </div>
                        )}
                      </div>

                      <div className="flex items-center gap-2 self-start sm:self-auto">
                        {item.status === 'PRESENT' ? (
                          <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 font-bold rounded text-[10px]">
                            PRESENT
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 bg-rose-100 text-rose-800 font-bold rounded text-[10px]">
                            ABSENT
                          </span>
                        )}

                        {item.cameraImagePath && (
                          <button
                            onClick={() => setSelectedPhoto(item.cameraImagePath)}
                            className="px-2 py-1 bg-stone-100 hover:bg-stone-200 text-stone-700 text-[10px] font-semibold rounded border border-stone-300 flex items-center gap-1 cursor-pointer"
                          >
                            <Eye className="w-3 h-3" />
                            <span>Photo</span>
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>

        {/* Photo Modal */}
        {selectedPhoto && (
          <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-stone-900/80 backdrop-blur-xs">
            <div className="bg-white rounded-2xl max-w-xs w-full overflow-hidden shadow-2xl">
              <div className="bg-stone-900 text-white px-3 py-2 flex justify-between items-center text-xs">
                <span>Live Verification Frame</span>
                <button onClick={() => setSelectedPhoto(null)} className="cursor-pointer">✕</button>
              </div>
              <img src={selectedPhoto} alt="Student Snapshot" className="w-full h-64 object-cover" />
            </div>
          </div>
        )}

      </div>
    </div>
  );
};
