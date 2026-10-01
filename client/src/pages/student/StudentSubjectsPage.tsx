import React, { useState, useEffect } from 'react';
import { ApiService } from '../../services/api.js';
import {
  BookOpen,
  AlertTriangle,
  CheckCircle2,
  RefreshCw,
  Plus,
  KeyRound,
  UserCheck,
  Calendar,
  Layers,
  Sparkles,
} from 'lucide-react';

export const StudentSubjectsPage: React.FC = () => {
  const [classrooms, setClassrooms] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [joinCode, setJoinCode] = useState<string>('');
  const [isJoining, setIsJoining] = useState<boolean>(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const fetchClassrooms = async () => {
    setIsLoading(true);
    const res = await ApiService.getStudentClassrooms();
    setIsLoading(false);
    if (res.success && res.data) {
      setClassrooms(res.data);
    }
  };

  useEffect(() => {
    fetchClassrooms();
  }, []);

  const handleJoin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!joinCode.trim()) return;

    setIsJoining(true);
    setMessage(null);
    const res = await ApiService.joinClassroom(joinCode.trim());
    setIsJoining(false);

    if (res.success) {
      setMessage({ type: 'success', text: res.message || 'Joined successfully!' });
      setJoinCode('');
      fetchClassrooms();
    } else {
      setMessage({ type: 'error', text: res.message || 'Failed to join classroom.' });
    }
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Header Banner */}
      <div className="bg-white rounded-2xl border border-stone-200/80 p-5 sm:p-6 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold tracking-tight text-stone-900">
              My Subjects & Classrooms
            </h1>
            <span className="text-xs font-bold px-2 py-0.5 rounded bg-stone-100 text-stone-700 border border-stone-200">
              {classrooms.length} Enrolled
            </span>
          </div>
          <p className="text-xs text-stone-500 mt-0.5">
            Subject membership, join codes, faculty mapping, and 75% attendance threshold monitoring.
          </p>
        </div>

        <button
          onClick={fetchClassrooms}
          className="px-3.5 py-2 text-xs font-semibold text-stone-700 bg-stone-100 hover:bg-stone-200 rounded-xl transition-colors flex items-center gap-1.5 cursor-pointer self-start md:self-auto border border-stone-200"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>Refresh</span>
        </button>
      </div>

      {/* Quick Join Banner */}
      <div className="bg-stone-900 text-white rounded-2xl p-5 sm:p-6 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-emerald-400 text-xs font-bold uppercase tracking-wider">
            <KeyRound className="w-4 h-4" />
            <span>Join a New Subject Classroom</span>
          </div>
          <p className="text-xs text-stone-300">
            Have a new Classroom Code from your faculty? Enter it below to unlock attendance marking.
          </p>
        </div>

        <form onSubmit={handleJoin} className="flex items-center gap-2 w-full md:w-auto">
          <input
            type="text"
            placeholder="e.g. AI-7K4P"
            value={joinCode}
            onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
            className="px-3.5 py-2 bg-stone-800 border border-stone-700 rounded-xl text-xs font-mono font-bold uppercase text-white focus:outline-hidden focus:ring-2 focus:ring-emerald-400 placeholder:text-stone-500 w-full md:w-44"
            maxLength={12}
          />
          <button
            type="submit"
            disabled={isJoining || !joinCode.trim()}
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl flex items-center gap-1.5 cursor-pointer disabled:opacity-50 shrink-0 shadow-xs"
          >
            {isJoining ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
            <span>Join</span>
          </button>
        </form>
      </div>

      {message && (
        <div
          className={`p-4 rounded-xl text-xs font-semibold flex items-center gap-2 ${
            message.type === 'success'
              ? 'bg-emerald-50 border border-emerald-200 text-emerald-900'
              : 'bg-rose-50 border border-rose-200 text-rose-900'
          }`}
        >
          {message.type === 'success' ? (
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          ) : (
            <AlertTriangle className="w-4 h-4 text-rose-600" />
          )}
          <span>{message.text}</span>
        </div>
      )}

      {isLoading ? (
        <div className="py-16 text-center text-xs text-stone-500 flex flex-col items-center">
          <RefreshCw className="w-6 h-6 animate-spin mb-2 text-stone-400" />
          <span>Loading subject classrooms...</span>
        </div>
      ) : classrooms.length === 0 ? (
        <div className="p-12 text-center bg-white rounded-2xl border border-dashed border-stone-200">
          <Layers className="w-10 h-10 text-stone-400 mx-auto mb-2" />
          <h3 className="text-sm font-bold text-stone-800">No Enrolled Classrooms Found</h3>
          <p className="text-xs text-stone-500 mt-1 max-w-sm mx-auto">
            Use the Join Classroom form above with codes provided by your professors to enroll into your classes.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {classrooms.map((cr) => {
            const stats = cr.attendanceStats;
            return (
              <div
                key={cr.membershipId}
                className={`bg-white rounded-2xl border p-5 shadow-xs transition-all ${
                  stats.isDefaulter ? 'border-rose-300 bg-rose-50/10' : 'border-stone-200/80'
                }`}
              >
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-stone-500 bg-stone-100 px-1.5 py-0.5 rounded border border-stone-200">
                        {cr.subjectCode}
                      </span>
                      <span className="text-[11px] font-semibold text-stone-600">
                        {cr.className}
                      </span>
                    </div>
                    <h3 className="text-base font-bold text-stone-900 mt-1">
                      {cr.subjectName}
                    </h3>
                  </div>

                  {stats.isDefaulter ? (
                    <span className="inline-flex items-center gap-1 text-[11px] font-bold text-rose-700 bg-rose-100 px-2 py-0.5 rounded-md border border-rose-200 shrink-0">
                      <AlertTriangle className="w-3.5 h-3.5" />
                      <span>Defaulter</span>
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-md border border-emerald-200 shrink-0">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>Compliant</span>
                    </span>
                  )}
                </div>

                <div className="text-xs text-stone-500 flex flex-wrap items-center gap-x-3 gap-y-1 mb-3 pt-1 border-t border-stone-100">
                  <span className="flex items-center gap-1">
                    <UserCheck className="w-3.5 h-3.5 text-stone-400" />
                    <strong>Prof. {cr.facultyName}</strong>
                    {cr.facultyShortCode && <span className="font-mono text-stone-400">({cr.facultyShortCode})</span>}
                  </span>
                  <span>·</span>
                  <span className="flex items-center gap-1">
                    <KeyRound className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Join Code: <strong className="font-mono text-stone-800">{cr.joinCode}</strong></span>
                  </span>
                </div>

                {/* Attendance Progress Bar */}
                <div className="space-y-1.5 mb-4">
                  <div className="flex justify-between text-xs font-semibold">
                    <span className="text-stone-500">Attendance Percentage</span>
                    <span className={`font-mono text-sm ${stats.percentage >= 75 ? 'text-emerald-700' : 'text-rose-600'}`}>
                      {stats.percentage}%
                    </span>
                  </div>
                  <div className="w-full bg-stone-100 rounded-full h-2 overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${stats.percentage >= 75 ? 'bg-emerald-600' : 'bg-rose-500'}`}
                      style={{ width: `${Math.min(100, stats.percentage)}%` }}
                    />
                  </div>
                </div>

                {/* Metrics Grid */}
                <div className="grid grid-cols-3 gap-2 pt-3 border-t border-stone-100 text-center text-xs">
                  <div className="p-2 bg-stone-50 rounded-lg">
                    <span className="text-[10px] text-stone-500 block">Total Lectures</span>
                    <span className="font-bold text-stone-900 font-mono text-xs">{stats.total}</span>
                  </div>
                  <div className="p-2 bg-emerald-50 rounded-lg">
                    <span className="text-[10px] text-emerald-700 block">Present</span>
                    <span className="font-bold text-emerald-800 font-mono text-xs">{stats.attended}</span>
                  </div>
                  <div className="p-2 bg-rose-50 rounded-lg">
                    <span className="text-[10px] text-rose-700 block">Absent</span>
                    <span className="font-bold text-rose-800 font-mono text-xs">{Math.max(0, stats.total - stats.attended)}</span>
                  </div>
                </div>

                {stats.isDefaulter && (
                  <p className="mt-3 text-[11px] text-rose-700 bg-rose-50 p-2 rounded-lg border border-rose-200/60 leading-relaxed">
                    Defaulter Alert: Attendance is currently below 75%. Please attend upcoming lectures to maintain compliance.
                  </p>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
