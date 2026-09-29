import React, { useState, useEffect } from 'react';
import { StudentDashboardData, ActiveSessionForStudent } from '../../types.js';
import { ApiService } from '../../services/api.js';
import { useAuth } from '../../context/AuthContext.js';
import { StudentAttendanceModal } from './StudentAttendanceModal.js';
import {
  ShieldCheck,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Calendar,
  Clock,
  MapPin,
  BookOpen,
  ArrowRight,
  TrendingUp,
  RefreshCw,
  Plus,
  KeyRound,
  Sparkles,
  UserCheck,
  GraduationCap,
  ChevronRight,
  School,
  LogOut,
} from 'lucide-react';

interface StudentDashboardProps {
  onNavigateToTab: (tab: string) => void;
}

export const StudentDashboard: React.FC<StudentDashboardProps> = ({ onNavigateToTab }) => {
  const { logout } = useAuth();
  const [data, setData] = useState<StudentDashboardData | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedActiveSession, setSelectedActiveSession] = useState<ActiveSessionForStudent | null>(null);

  // Classroom join state
  const [joinCodeInput, setJoinCodeInput] = useState<string>('');
  const [isJoining, setIsJoining] = useState<boolean>(false);
  const [joinMessage, setJoinMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [showJoinModal, setShowJoinModal] = useState<boolean>(false);

  const fetchDashboard = async () => {
    setIsLoading(true);
    setError(null);
    const res = await ApiService.getStudentDashboard();
    setIsLoading(false);

    if (res.success && res.data) {
      setData(res.data);
    } else {
      setError(res.message || 'Could not load student dashboard data.');
    }
  };

  useEffect(() => {
    fetchDashboard();
  }, []);

  const handleAttendanceSuccess = () => {
    fetchDashboard();
  };

  const handleJoinClassroom = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!joinCodeInput.trim()) return;

    setIsJoining(true);
    setJoinMessage(null);

    const res = await ApiService.joinClassroom(joinCodeInput.trim());
    setIsJoining(false);

    if (res.success) {
      setJoinMessage({
        type: 'success',
        text: res.message || 'Classroom joined successfully!',
      });
      setJoinCodeInput('');
      fetchDashboard();
      setTimeout(() => {
        setShowJoinModal(false);
        setJoinMessage(null);
      }, 2000);
    } else {
      setJoinMessage({
        type: 'error',
        text: res.message || 'Failed to join classroom.',
      });
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center">
        <RefreshCw className="w-8 h-8 text-stone-400 animate-spin mb-3" />
        <span className="text-xs text-stone-500 font-medium">Loading Timetable & Attendance Dashboard...</span>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="max-w-4xl mx-auto p-6 text-center">
        <div className="p-6 bg-rose-50 border border-rose-200 rounded-2xl max-w-md mx-auto">
          <AlertTriangle className="w-8 h-8 text-rose-600 mx-auto mb-2" />
          <p className="text-xs text-rose-800 font-medium">{error || 'Unable to load dashboard'}</p>
          <button
            onClick={fetchDashboard}
            className="mt-3 px-4 py-2 bg-rose-600 text-white text-xs font-semibold rounded-xl hover:bg-rose-700 cursor-pointer"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  const { student, stats, subjectStats, nextLecture, todayClasses, activeSessions, recentRecords, institution } = data;

  return (
    <div className="space-y-6 pb-12">
      {/* Attendance Modal when marking */}
      {selectedActiveSession && (
        <StudentAttendanceModal
          session={selectedActiveSession}
          onClose={() => setSelectedActiveSession(null)}
          onSuccess={handleAttendanceSuccess}
        />
      )}

      {/* Join Classroom Modal */}
      {showJoinModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl border border-stone-200 max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-stone-100">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-stone-900 text-emerald-400 flex items-center justify-center font-bold">
                  <KeyRound className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-stone-900">Join Subject Classroom</h3>
                  <p className="text-[11px] text-stone-500">Ask your professor for the 6-character code</p>
                </div>
              </div>
              <button
                onClick={() => {
                  setShowJoinModal(false);
                  setJoinMessage(null);
                }}
                className="text-stone-400 hover:text-stone-600 p-1 text-lg font-bold"
              >
                &times;
              </button>
            </div>

            <form onSubmit={handleJoinClassroom} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1">
                  Classroom Join Code
                </label>
                <input
                  type="text"
                  placeholder="e.g. AI-7K4P or EH6Q1V"
                  value={joinCodeInput}
                  onChange={(e) => setJoinCodeInput(e.target.value.toUpperCase())}
                  className="w-full px-4 py-3 bg-stone-50 border border-stone-300 rounded-xl text-center text-lg font-mono font-bold tracking-widest text-stone-900 focus:outline-hidden focus:ring-2 focus:ring-stone-900 uppercase placeholder:normal-case placeholder:tracking-normal placeholder:text-stone-400"
                  maxLength={12}
                  required
                />
              </div>

              {joinMessage && (
                <div
                  className={`p-3 rounded-xl text-xs font-medium flex items-start gap-2 ${
                    joinMessage.type === 'success'
                      ? 'bg-emerald-50 border border-emerald-200 text-emerald-900'
                      : 'bg-rose-50 border border-rose-200 text-rose-900'
                  }`}
                >
                  {joinMessage.type === 'success' ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  ) : (
                    <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                  )}
                  <span>{joinMessage.text}</span>
                </div>
              )}

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowJoinModal(false);
                    setJoinMessage(null);
                  }}
                  className="px-4 py-2.5 bg-stone-100 text-stone-700 text-xs font-semibold rounded-xl hover:bg-stone-200 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isJoining || !joinCodeInput.trim()}
                  className="px-5 py-2.5 bg-stone-900 hover:bg-black text-white text-xs font-bold rounded-xl flex items-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  {isJoining && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                  <span>{isJoining ? 'Verifying...' : 'Join Classroom'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Top Welcome & Profile Banner */}
      <div className="bg-white rounded-2xl border border-stone-200/80 p-5 sm:p-6 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-stone-900 text-emerald-400 font-extrabold text-xl flex items-center justify-center border border-stone-800 shadow-xs shrink-0">
            {student.name.charAt(0)}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold tracking-tight text-stone-900">{student.name}</h1>
              <span className="text-[11px] font-bold px-2 py-0.5 rounded-md bg-stone-100 text-stone-700 border border-stone-200">
                {student.className}.{student.division}
              </span>
            </div>
            <div className="text-xs text-stone-500 flex flex-wrap items-center gap-2 mt-0.5">
              <span>Roll: <strong className="text-stone-700 font-mono">{student.rollNumber}</strong></span>
              <span aria-hidden="true">·</span>
              <span>ID: <strong className="text-stone-700 font-mono">{student.studentId}</strong></span>
              <span aria-hidden="true">·</span>
              <span>{student.courseName}</span>
              <span aria-hidden="true">·</span>
              <span>AY: <strong className="text-stone-700 font-mono">{student.academicYear}</strong></span>
            </div>
          </div>
        </div>

        {/* Action Controls & Date Info */}
        <div className="flex flex-wrap items-center gap-2.5 pt-3 md:pt-0 border-t md:border-t-0 border-stone-100 text-xs">
          <button
            onClick={() => setShowJoinModal(true)}
            className="px-4 py-2 bg-stone-900 hover:bg-black text-white text-xs font-bold rounded-xl flex items-center gap-1.5 cursor-pointer shadow-xs"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Join Classroom</span>
          </button>
          <button
            onClick={logout}
            className="px-4 py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-bold rounded-xl flex items-center gap-1.5 cursor-pointer border border-rose-200 shadow-xs"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Logout</span>
          </button>
          <div className="flex items-center gap-1.5 bg-stone-50 border border-stone-200 px-3 py-2 rounded-xl text-stone-600">
            <Calendar className="w-4 h-4 text-stone-400" />
            <span className="font-medium">
              {new Date().toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
            </span>
          </div>
          <button
            onClick={fetchDashboard}
            className="p-2 text-stone-500 hover:text-stone-900 hover:bg-stone-100 rounded-xl transition-colors cursor-pointer border border-stone-200"
            title="Refresh dashboard"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Defaulter 75% Low Attendance Alert Banner */}
      {stats.isDefaulter && (
        <div className="p-4 bg-rose-50 border-2 border-rose-300 rounded-2xl flex items-start gap-3.5 shadow-xs animate-in fade-in">
          <div className="w-9 h-9 rounded-xl bg-rose-600 text-white flex items-center justify-center shrink-0 mt-0.5">
            <AlertTriangle className="w-5 h-5" />
          </div>
          <div className="flex-1">
            <h2 className="text-sm font-bold text-rose-950">
              Low Attendance Warning — Below {stats.threshold}% Mandatory Threshold
            </h2>
            <p className="text-xs text-rose-800 mt-0.5 leading-relaxed">
              {stats.warningMessage}
            </p>
          </div>
        </div>
      )}

      {/* NEXT LECTURE + TIMETABLE HERO (Requirement 13 & 14) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Next Lecture Highlight Card */}
        <div className="md:col-span-2 bg-gradient-to-br from-stone-900 to-stone-800 text-white rounded-2xl p-5 sm:p-6 shadow-sm flex flex-col justify-between relative overflow-hidden">
          <div className="absolute right-0 top-0 translate-x-4 -translate-y-4 opacity-10 pointer-events-none">
            <GraduationCap className="w-48 h-48 text-white" />
          </div>

          <div>
            <div className="flex items-center justify-between mb-3">
              <span className="text-[11px] font-bold tracking-wider uppercase text-emerald-400 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5" /> Next Scheduled Lecture
              </span>
              {nextLecture && (
                <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-white/10 text-stone-200 border border-white/10">
                  {nextLecture.isToday ? 'Today' : nextLecture.day}
                </span>
              )}
            </div>

            {nextLecture ? (
              <div className="space-y-2">
                <div className="flex items-baseline gap-2">
                  <h3 className="text-xl font-extrabold text-white">
                    {nextLecture.subjectName}
                  </h3>
                  <span className="text-xs font-mono text-emerald-300 font-semibold">
                    ({nextLecture.subjectCode})
                  </span>
                </div>

                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-stone-300">
                  <span className="flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5 text-stone-400" />
                    <strong>{nextLecture.startTime} – {nextLecture.endTime}</strong>
                  </span>
                  <span className="flex items-center gap-1">
                    <UserCheck className="w-3.5 h-3.5 text-stone-400" />
                    <span>Prof. {nextLecture.facultyName}</span>
                    {nextLecture.facultyShortCode && (
                      <span className="text-[10px] px-1 py-0.2 bg-white/10 rounded font-mono">
                        {nextLecture.facultyShortCode}
                      </span>
                    )}
                  </span>
                  {nextLecture.room && (
                    <span className="flex items-center gap-1">
                      <School className="w-3.5 h-3.5 text-stone-400" />
                      <span>{nextLecture.room}</span>
                      {nextLecture.isLab && <span className="text-[10px] text-amber-300">(Lab)</span>}
                    </span>
                  )}
                </div>
              </div>
            ) : (
              <p className="text-xs text-stone-400 py-2">
                No upcoming lectures found for your enrolled classes. Join subject classrooms to sync timetable.
              </p>
            )}
          </div>

          <div className="mt-5 pt-4 border-t border-white/10 flex items-center justify-between">
            <div className="text-[11px] text-stone-400">
              Timetable powered by official college scheduling
            </div>
            <button
              onClick={() => onNavigateToTab('timetable')}
              className="text-xs font-bold text-emerald-300 hover:text-emerald-200 flex items-center gap-1 cursor-pointer"
            >
              <span>View Full Weekly Timetable</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Quick Classroom Join Code Box */}
        <div className="bg-white rounded-2xl border border-stone-200/80 p-5 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 mb-2 text-stone-900 font-bold text-sm">
              <KeyRound className="w-4 h-4 text-emerald-600" />
              <span>Quick Join Classroom</span>
            </div>
            <p className="text-xs text-stone-500 mb-3 leading-relaxed">
              Enter your teacher's classroom code to unlock attendance marking for their subject.
            </p>

            <form onSubmit={handleJoinClassroom} className="space-y-2">
              <input
                type="text"
                placeholder="Code (e.g. AI-7K4P)"
                value={joinCodeInput}
                onChange={(e) => setJoinCodeInput(e.target.value.toUpperCase())}
                className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl text-xs font-mono font-bold tracking-wider text-stone-900 focus:outline-hidden focus:ring-1 focus:ring-stone-900 uppercase"
                maxLength={12}
              />
              <button
                type="submit"
                disabled={isJoining || !joinCodeInput.trim()}
                className="w-full py-2 bg-stone-900 hover:bg-black text-white text-xs font-bold rounded-xl flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50 shadow-xs"
              >
                {isJoining ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
                <span>Join Subject</span>
              </button>
            </form>

            {joinMessage && (
              <p className={`text-[11px] mt-2 font-medium ${joinMessage.type === 'success' ? 'text-emerald-700' : 'text-rose-600'}`}>
                {joinMessage.text}
              </p>
            )}
          </div>

          <div className="pt-3 border-t border-stone-100 flex items-center justify-between text-[11px] text-stone-500">
            <span>Enrolled Subjects:</span>
            <strong className="font-mono text-stone-900">{subjectStats.length}</strong>
          </div>
        </div>
      </div>

      {/* Main Metric Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Card 1: Overall Percentage */}
        <div className="bg-white rounded-2xl border border-stone-200/80 p-5 shadow-xs">
          <div className="flex items-center justify-between text-xs text-stone-500 font-medium mb-2">
            <span>Overall Attendance</span>
            <TrendingUp className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className={`text-3xl font-extrabold tracking-tight font-mono tabular-nums ${stats.overallPercentage >= stats.threshold ? 'text-emerald-700' : 'text-rose-600'}`}>
              {stats.overallPercentage}%
            </span>
            <span className="text-xs text-stone-500 font-medium">
              (Req: {stats.threshold}%)
            </span>
          </div>
          <div className="w-full bg-stone-100 rounded-full h-2 mt-3 overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-500 ${stats.overallPercentage >= stats.threshold ? 'bg-emerald-600' : 'bg-rose-500'}`}
              style={{ width: `${Math.min(100, stats.overallPercentage)}%` }}
            />
          </div>
        </div>

        {/* Card 2: Lectures Attended */}
        <div className="bg-white rounded-2xl border border-stone-200/80 p-5 shadow-xs">
          <div className="flex items-center justify-between text-xs text-stone-500 font-medium mb-2">
            <span>Lectures Attended</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-extrabold tracking-tight font-mono tabular-nums text-stone-900">
              {stats.attendedCount}
            </span>
            <span className="text-xs text-stone-500 font-medium">
              / {stats.totalLectures} total
            </span>
          </div>
          <p className="text-[11px] text-emerald-700 mt-3 font-medium">
            Physical presence verified
          </p>
        </div>

        {/* Card 3: Lectures Missed */}
        <div className="bg-white rounded-2xl border border-stone-200/80 p-5 shadow-xs">
          <div className="flex items-center justify-between text-xs text-stone-500 font-medium mb-2">
            <span>Lectures Missed</span>
            <XCircle className="w-4 h-4 text-rose-500" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-extrabold tracking-tight font-mono tabular-nums text-stone-900">
              {stats.absentCount}
            </span>
            <span className="text-xs text-stone-500 font-medium">lectures absent</span>
          </div>
          <p className="text-[11px] text-stone-500 mt-3 font-medium">
            Subject-wise breakdown available below
          </p>
        </div>
      </div>

      {/* ACTIVE ATTENDANCE SESSIONS */}
      <div className="bg-white rounded-2xl border-2 border-stone-900 p-5 sm:p-6 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-ping"></span>
            <h2 className="text-base font-bold text-stone-900 tracking-tight">
              Live Attendance Opportunities
            </h2>
          </div>
          <span className="text-xs font-semibold text-stone-500">
            {activeSessions.length} Active Lecture{activeSessions.length !== 1 ? 's' : ''}
          </span>
        </div>

        {activeSessions.length === 0 ? (
          <div className="text-center py-8 px-4 bg-stone-50/70 rounded-xl border border-dashed border-stone-200">
            <Clock className="w-8 h-8 text-stone-400 mx-auto mb-2" />
            <p className="text-xs font-semibold text-stone-700">No active attendance sessions currently open for your joined subjects.</p>
            <p className="text-[11px] text-stone-500 mt-0.5">
              Your professor will start an attendance window during lecture hours.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4">
            {activeSessions.map((sess) => (
              <div
                key={sess.id}
                className="bg-stone-50/80 rounded-xl border border-stone-200/90 p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-all hover:border-stone-400"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold px-2 py-0.5 rounded bg-stone-900 text-white font-mono">
                      {sess.subjectCode || 'LEC'}
                    </span>
                    <h3 className="text-sm font-bold text-stone-900">
                      {sess.subjectName}
                    </h3>
                  </div>
                  <p className="text-xs text-stone-700 font-medium">
                    Topic: <strong className="text-stone-900">{sess.lectureTopic}</strong>
                  </p>
                  <div className="flex flex-wrap items-center gap-3 text-[11px] text-stone-500 pt-1">
                    <span className="flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5" /> Started: {sess.startTime}
                    </span>
                    <span>·</span>
                    <span className="flex items-center gap-1">
                      <MapPin className="w-3.5 h-3.5 text-amber-600" /> Radius: {sess.radiusMeters}m
                    </span>
                    <span>·</span>
                    <span>{sess.facultyName}</span>
                  </div>
                </div>

                <div>
                  {sess.alreadyMarked ? (
                    <div className="px-4 py-2 bg-emerald-100 border border-emerald-300 text-emerald-800 text-xs font-bold rounded-xl flex items-center gap-1.5 shadow-xs">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                      <span>Already Marked (Present)</span>
                    </div>
                  ) : (
                    <button
                      onClick={() => setSelectedActiveSession(sess)}
                      className="w-full sm:w-auto px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-xs transition-all flex items-center justify-center gap-2 cursor-pointer"
                    >
                      <ShieldCheck className="w-4 h-4" />
                      <span>Verify & Mark Attendance</span>
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* TODAY'S TIMETABLE SCHEDULE (Requirement 14) */}
      <div className="bg-white rounded-2xl border border-stone-200/80 p-5 sm:p-6 shadow-xs">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-stone-700" />
            <h2 className="text-sm font-bold text-stone-900">Today's Schedule & Lectures</h2>
          </div>
          <button
            onClick={() => onNavigateToTab('timetable')}
            className="text-xs font-semibold text-stone-600 hover:text-stone-900 flex items-center gap-1 cursor-pointer"
          >
            <span>Weekly Timetable</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {todayClasses.length === 0 ? (
          <div className="p-6 text-center bg-stone-50 rounded-xl border border-dashed border-stone-200">
            <p className="text-xs text-stone-600 font-medium">No lectures scheduled for today in your enrolled classrooms.</p>
          </div>
        ) : (
          <div className="space-y-2.5">
            {todayClasses.map((item) => (
              <div
                key={item.id}
                className={`p-3.5 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs transition-all ${
                  item.isActiveSession
                    ? 'bg-emerald-50/60 border-emerald-300 ring-1 ring-emerald-300'
                    : 'bg-stone-50/70 border-stone-200/80'
                }`}
              >
                <div className="flex items-start gap-3">
                  <div className="w-16 font-mono font-bold text-stone-700 shrink-0 text-center py-1 bg-white rounded-lg border border-stone-200 shadow-2xs">
                    <div>{item.startTime}</div>
                    <div className="text-[10px] text-stone-400 font-normal">{item.endTime}</div>
                  </div>

                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-stone-900">{item.subjectName}</span>
                      <span className="text-[10px] font-mono font-semibold px-1.5 py-0.5 bg-stone-200 text-stone-800 rounded">
                        {item.subjectCode}
                      </span>
                      {item.isLab && (
                        <span className="text-[10px] font-bold px-1.5 py-0.5 bg-amber-100 text-amber-800 rounded">
                          Lab {item.batch ? `(${item.batch})` : ''}
                        </span>
                      )}
                    </div>
                    <div className="text-[11px] text-stone-500 mt-0.5 flex flex-wrap items-center gap-2">
                      <span>Prof. {item.facultyName} ({item.facultyShortCode})</span>
                      <span>·</span>
                      <span>Room: {item.room}</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                  {item.isActiveSession && (
                    <span className="px-2 py-0.5 bg-emerald-600 text-white text-[10px] font-bold rounded-full animate-pulse">
                      SESSION ACTIVE
                    </span>
                  )}
                  {item.attendanceStatus === 'PRESENT' && (
                    <span className="px-2.5 py-1 bg-emerald-100 text-emerald-800 text-xs font-bold rounded-lg flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5" /> Present
                    </span>
                  )}
                  {item.attendanceStatus === 'NOT_MARKED' && !item.isActiveSession && (
                    <span className="px-2.5 py-1 bg-stone-100 text-stone-500 text-xs font-medium rounded-lg">
                      {item.timingStatus === 'COMPLETED' ? 'Session Ended' : 'Scheduled'}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Two Column Layout: Subject Analytics & Recent Log */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Subject Breakdown Card */}
        <div className="bg-white rounded-2xl border border-stone-200/80 p-5 sm:p-6 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <BookOpen className="w-4 h-4 text-stone-700" />
              <h2 className="text-sm font-bold text-stone-900">My Enrolled Subjects</h2>
            </div>
            <button
              onClick={() => onNavigateToTab('subjects')}
              className="text-xs font-semibold text-stone-600 hover:text-stone-900 flex items-center gap-1 cursor-pointer"
            >
              <span>View Details</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="space-y-3">
            {subjectStats.map((sub) => (
              <div
                key={sub.subjectId}
                className="p-3 bg-stone-50/70 rounded-xl border border-stone-200/70 flex items-center justify-between gap-3 text-xs"
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-stone-900 truncate">
                      {sub.subjectName}
                    </span>
                    <span className="text-[10px] text-stone-500 font-mono">
                      ({sub.subjectCode})
                    </span>
                  </div>
                  <div className="text-[11px] text-stone-500 mt-0.5 flex flex-wrap items-center gap-1.5">
                    <span>Prof. {sub.facultyName}</span>
                    <span>·</span>
                    <span>Code: <strong className="font-mono text-stone-700">{sub.classroomCode}</strong></span>
                  </div>
                  <div className="text-[10px] text-stone-400 mt-0.5">
                    {sub.present} present · {sub.absent} absent · Next: {sub.nextSlot}
                  </div>
                </div>

                <div className="text-right shrink-0">
                  <span className={`text-sm font-bold font-mono tabular-nums block ${sub.percentage >= stats.threshold ? 'text-emerald-700' : 'text-rose-600'}`}>
                    {sub.percentage}%
                  </span>
                  {sub.isLow && (
                    <span className="text-[10px] font-bold text-rose-600 uppercase">
                      Defaulter
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Recent Attendance Activity */}
        <div className="bg-white rounded-2xl border border-stone-200/80 p-5 sm:p-6 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-stone-700" />
              <h2 className="text-sm font-bold text-stone-900">Recent Attendance Records</h2>
            </div>
            <button
              onClick={() => onNavigateToTab('history')}
              className="text-xs font-semibold text-stone-600 hover:text-stone-900 flex items-center gap-1 cursor-pointer"
            >
              <span>Full History</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="space-y-2.5">
            {recentRecords.length === 0 ? (
              <p className="text-xs text-stone-500 py-6 text-center">No attendance records logged yet.</p>
            ) : (
              recentRecords.map((rec) => (
                <div
                  key={rec.id}
                  className="p-3 bg-stone-50/70 rounded-xl border border-stone-200/70 flex items-center justify-between text-xs"
                >
                  <div className="min-w-0 pr-2">
                    <div className="font-semibold text-stone-900 truncate">
                      {rec.subjectName}
                    </div>
                    <div className="text-[11px] text-stone-500 truncate mt-0.5">
                      {rec.topic}
                    </div>
                  </div>

                  <div className="text-right shrink-0">
                    <div className="flex items-center justify-end gap-1.5 font-semibold text-emerald-700">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>{rec.distance}m</span>
                    </div>
                    <div className="text-[10px] text-stone-400 font-mono mt-0.5">
                      {rec.date}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

      </div>
    </div>
  );
};
