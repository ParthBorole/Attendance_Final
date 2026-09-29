import React, { useState, useEffect } from 'react';
import { ApiService } from '../../services/api.js';
import { FacultyStudentDetailModal } from './FacultyStudentDetailModal.js';
import {
  ShieldCheck,
  Play,
  Square,
  Users,
  BookOpen,
  Calendar,
  Clock,
  MapPin,
  RefreshCw,
  Eye,
  AlertTriangle,
  CheckCircle2,
  KeyRound,
  Copy,
  Check,
  Plus,
  RotateCcw,
  School,
  Search,
  ChevronRight,
  Sparkles,
  Layers,
} from 'lucide-react';

export const FacultyDashboard: React.FC = () => {
  const [dashboardData, setDashboardData] = useState<any | null>(null);
  const [classes, setClasses] = useState<any[]>([]);
  const [selectedClassId, setSelectedClassId] = useState<string>('cls_tycs_a');
  const [subjects, setSubjects] = useState<any[]>([]);
  const [selectedSubjectId, setSelectedSubjectId] = useState<string>('');
  
  // Tab within Faculty Console: 'classrooms' | 'roster' | 'history'
  const [activeTab, setActiveTab] = useState<'classrooms' | 'roster' | 'history'>('classrooms');

  // Classrooms
  const [classrooms, setClassrooms] = useState<any[]>([]);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const [selectedClassroomMembers, setSelectedClassroomMembers] = useState<any | null>(null);
  const [isLoadingMembers, setIsLoadingMembers] = useState<boolean>(false);

  // Timetable
  const [facultyTimetable, setFacultyTimetable] = useState<any | null>(null);

  // Student Roster
  const [students, setStudents] = useState<any[]>([]);
  const [studentSearch, setStudentSearch] = useState<string>('');
  const [selectedStudentForModal, setSelectedStudentForModal] = useState<string | null>(null);

  // Active Session Live Data
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [liveSessionData, setLiveSessionData] = useState<any | null>(null);

  // Lecture History
  const [lectureHistory, setLectureHistory] = useState<any[]>([]);

  // Create Session Modal State
  const [showCreateModal, setShowCreateModal] = useState<boolean>(false);
  const [lectureTopic, setLectureTopic] = useState<string>('');
  const [radiusMeters, setRadiusMeters] = useState<number>(10);
  const [isCreatingSession, setIsCreatingSession] = useState<boolean>(false);
  const [createError, setCreateError] = useState<string | null>(null);

  // Create Classroom Modal State
  const [showCreateClassroomModal, setShowCreateClassroomModal] = useState<boolean>(false);
  const [crSubjectId, setCrSubjectId] = useState<string>('');
  const [crClassId, setCrClassId] = useState<string>('');
  const [isCreatingCr, setIsCreatingCr] = useState<boolean>(false);
  const [crError, setCrError] = useState<string | null>(null);

  const [isLoading, setIsLoading] = useState<boolean>(true);

  const fetchInitialData = async () => {
    setIsLoading(true);
    const [dashRes, clsRes, crRes, ttRes] = await Promise.all([
      ApiService.getFacultyDashboard(),
      ApiService.getFacultyClasses(),
      ApiService.getFacultyClassrooms(),
      ApiService.getFacultyTimetable(),
    ]);

    if (dashRes.success && dashRes.data) {
      setDashboardData(dashRes.data);
      if (dashRes.data.activeSessions.length > 0) {
        setActiveSessionId(dashRes.data.activeSessions[0].id);
      }
    }

    if (clsRes.success && clsRes.data && clsRes.data.length > 0) {
      setClasses(clsRes.data);
      setSelectedClassId(clsRes.data[0].id);
      setCrClassId(clsRes.data[0].id);
    }

    if (crRes.success && crRes.data) {
      setClassrooms(crRes.data);
    }

    if (ttRes.success && ttRes.data) {
      setFacultyTimetable(ttRes.data);
    }

    setIsLoading(false);
  };

  const fetchClassDetails = async (classId: string) => {
    const [subRes, stdRes] = await Promise.all([
      ApiService.getFacultySubjects(classId),
      ApiService.getFacultyStudents(classId),
    ]);

    if (subRes.success && subRes.data) {
      setSubjects(subRes.data);
      if (subRes.data.length > 0) {
        setSelectedSubjectId(subRes.data[0].id);
        setCrSubjectId(subRes.data[0].id);
      }
    }

    if (stdRes.success && stdRes.data) {
      setStudents(stdRes.data.students || []);
    }
  };

  const fetchLiveSession = async (sessionId: string) => {
    const res = await ApiService.getLiveSessionData(sessionId);
    if (res.success && res.data) {
      setLiveSessionData(res.data);
    }
  };

  const fetchLectures = async () => {
    const res = await ApiService.getLectureHistory();
    if (res.success && res.data) {
      setLectureHistory(res.data);
    }
  };

  useEffect(() => {
    fetchInitialData();
    fetchLectures();
  }, []);

  useEffect(() => {
    if (selectedClassId) {
      fetchClassDetails(selectedClassId);
    }
  }, [selectedClassId]);

  useEffect(() => {
    let timer: any;
    if (activeSessionId) {
      fetchLiveSession(activeSessionId);
      timer = setInterval(() => {
        fetchLiveSession(activeSessionId);
      }, 3500);
    } else {
      setLiveSessionData(null);
    }
    return () => clearInterval(timer);
  }, [activeSessionId]);

  const handleCopyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(null), 2500);
  };

  const handleRegenerateCode = async (classroomId: string) => {
    if (!confirm('Are you sure you want to regenerate this Join Code? The current code will immediately stop working.')) return;
    const res = await ApiService.regenerateClassroomCode(classroomId);
    if (res.success) {
      const crRes = await ApiService.getFacultyClassrooms();
      if (crRes.success && crRes.data) setClassrooms(crRes.data);
    } else {
      alert(res.message || 'Failed to regenerate code');
    }
  };

  const handleToggleClassroomStatus = async (classroomId: string, currentStatus: string) => {
    const nextStatus = currentStatus === 'active' ? 'disabled' : 'active';
    const res = await ApiService.updateClassroomStatus(classroomId, nextStatus);
    if (res.success) {
      const crRes = await ApiService.getFacultyClassrooms();
      if (crRes.success && crRes.data) setClassrooms(crRes.data);
    }
  };

  const handleViewMembers = async (classroomId: string) => {
    setIsLoadingMembers(true);
    const res = await ApiService.getClassroomMembers(classroomId);
    setIsLoadingMembers(false);
    if (res.success && res.data) {
      setSelectedClassroomMembers(res.data);
    }
  };

  const handleCreateClassroom = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!crSubjectId || !crClassId) return;

    setIsCreatingCr(true);
    setCrError(null);
    const res = await ApiService.createFacultyClassroom({
      subjectId: crSubjectId,
      classId: crClassId,
    });
    setIsCreatingCr(false);

    if (res.success) {
      setShowCreateClassroomModal(false);
      const crRes = await ApiService.getFacultyClassrooms();
      if (crRes.success && crRes.data) setClassrooms(crRes.data);
    } else {
      setCrError(res.message || 'Failed to create classroom.');
    }
  };

  const handleStartSession = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedClassId || !selectedSubjectId || !lectureTopic.trim()) {
      setCreateError('Class, Subject, and Lecture Topic ("What was taught today?") are required.');
      return;
    }

    setIsCreatingSession(true);
    setCreateError(null);

    // Get faculty live device location to center the attendance session
    if (!navigator.geolocation) {
      // Fallback if geolocation unsupported
      sendSessionCreation();
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        sendSessionCreation(latitude, longitude);
      },
      (error) => {
        console.warn('Faculty GPS location acquisition warning:', error.message);
        // Fallback to official coordinates if GPS fails or denied
        sendSessionCreation();
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0,
      }
    );
  };

  const sendSessionCreation = async (lat?: number, lng?: number) => {
    const res = await ApiService.createAttendanceSession({
      classId: selectedClassId,
      subjectId: selectedSubjectId,
      lectureTopic: lectureTopic.trim(),
      radiusMeters: Number(radiusMeters),
      latitude: lat,
      longitude: lng,
    });

    setIsCreatingSession(false);

    if (res.success && res.data) {
      setShowCreateModal(false);
      setLectureTopic('');
      setActiveSessionId(res.data.id);
      fetchInitialData();
      fetchLectures();
    } else {
      setCreateError(res.message || 'Failed to start attendance session.');
    }
  };

  const handleStopSession = async (sessionId: string) => {
    const res = await ApiService.stopAttendanceSession(sessionId);
    if (res.success) {
      setActiveSessionId(null);
      setLiveSessionData(null);
      fetchInitialData();
      fetchLectures();
      fetchClassDetails(selectedClassId);
    }
  };

  const filteredStudents = students.filter((s) => {
    if (!studentSearch) return true;
    const q = studentSearch.toLowerCase();
    return s.name.toLowerCase().includes(q) || s.studentId.toLowerCase().includes(q) || s.rollNumber.includes(q);
  });

  if (isLoading || !dashboardData) {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center">
        <RefreshCw className="w-8 h-8 text-stone-400 animate-spin mb-3" />
        <span className="text-xs text-stone-500 font-medium">Loading Faculty Console & Subjects...</span>
      </div>
    );
  }

  const { faculty, assignedClasses, assignedSubjects } = dashboardData;

  return (
    <div className="space-y-6 pb-12">
      {/* Student Profile Audit Modal */}
      {selectedStudentForModal && (
        <FacultyStudentDetailModal
          studentId={selectedStudentForModal}
          onClose={() => setSelectedStudentForModal(null)}
        />
      )}

      {/* Classroom Enrolled Members Modal */}
      {selectedClassroomMembers && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/70 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-2xl border border-stone-200 max-w-2xl w-full max-h-[85vh] flex flex-col shadow-2xl overflow-hidden">
            <div className="bg-stone-900 text-white px-6 py-4 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold">{selectedClassroomMembers.classroom.classroom_name}</h3>
                <p className="text-[11px] text-stone-400 font-mono">
                  Join Code: {selectedClassroomMembers.classroom.join_code} · {selectedClassroomMembers.totalEnrolled} Enrolled Students
                </p>
              </div>
              <button
                onClick={() => setSelectedClassroomMembers(null)}
                className="text-stone-400 hover:text-white p-1 text-lg font-bold"
              >
                &times;
              </button>
            </div>

            <div className="p-6 overflow-y-auto flex-1 space-y-3">
              {selectedClassroomMembers.members.length === 0 ? (
                <p className="text-xs text-stone-500 py-8 text-center">No students have joined this classroom yet.</p>
              ) : (
                <div className="divide-y divide-stone-100 border border-stone-200 rounded-xl overflow-hidden">
                  {selectedClassroomMembers.members.map((m: any) => (
                    <div key={m.membershipId} className="p-3.5 flex items-center justify-between bg-white hover:bg-stone-50 text-xs">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-stone-900">{m.name}</span>
                          <span className="text-[10px] font-mono px-1.5 py-0.2 bg-stone-100 rounded text-stone-600">
                            Roll {m.rollNumber}
                          </span>
                        </div>
                        <div className="text-[11px] text-stone-500 mt-0.5">
                          Joined: {new Date(m.joinedAt).toLocaleDateString()} · ID: {m.studentCode}
                        </div>
                      </div>

                      <div className="text-right">
                        <span className={`font-mono font-bold text-sm block ${m.attendance.percentage >= 75 ? 'text-emerald-700' : 'text-rose-600'}`}>
                          {m.attendance.percentage}%
                        </span>
                        <span className="text-[10px] text-stone-400">
                          {m.attendance.presentCount} / {m.attendance.totalSubjectLectures} lectures
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Create Attendance Session Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/70 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-2xl border border-stone-200 max-w-lg w-full overflow-hidden shadow-2xl">
            <div className="bg-stone-900 text-white px-6 py-4 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <Play className="w-5 h-5 text-emerald-400 fill-emerald-400" />
                <h3 className="text-sm font-bold tracking-tight">Start Attendance Session</h3>
              </div>
              <button onClick={() => setShowCreateModal(false)} className="text-stone-400 hover:text-white cursor-pointer">
                ✕
              </button>
            </div>

            <form onSubmit={handleStartSession} className="p-6 space-y-4">
              {createError && (
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-800 flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                  <span>{createError}</span>
                </div>
              )}

              {/* Class */}
              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1">Target Assigned Class</label>
                <select
                  value={selectedClassId}
                  onChange={(e) => setSelectedClassId(e.target.value)}
                  className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl text-xs font-semibold text-stone-900 focus:outline-hidden focus:border-stone-900"
                >
                  {classes.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.class_name}.{c.division} — {c.course_name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Subject */}
              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1">Assigned Subject</label>
                <select
                  value={selectedSubjectId}
                  onChange={(e) => setSelectedSubjectId(e.target.value)}
                  className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl text-xs font-semibold text-stone-900 focus:outline-hidden focus:border-stone-900"
                >
                  {subjects.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.subject_name} ({s.subject_code})
                    </option>
                  ))}
                </select>
              </div>

              {/* Lecture Topic */}
              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1">
                  What was taught today? (Lecture Topic)
                </label>
                <input
                  type="text"
                  required
                  value={lectureTopic}
                  onChange={(e) => setLectureTopic(e.target.value)}
                  placeholder="e.g. Heuristic Search Algorithms & A* Pathfinding"
                  className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl text-xs text-stone-900 focus:outline-hidden focus:border-stone-900"
                />
              </div>

              {/* Attendance Radius Selector */}
              <div>
                <div className="flex justify-between items-center mb-1.5">
                  <label className="text-xs font-semibold text-stone-700">
                    Attendance Geolocation Radius
                  </label>
                  <span className="font-mono text-xs font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                    {radiusMeters} meters
                  </span>
                </div>
                
                <input
                  type="range"
                  min="1"
                  max="50"
                  step="1"
                  value={radiusMeters}
                  onChange={(e) => setRadiusMeters(parseInt(e.target.value, 10))}
                  className="w-full accent-stone-900 cursor-pointer"
                />

                {/* Radius Presets */}
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {[2, 5, 10, 15, 20, 30, 50].map((preset) => (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => setRadiusMeters(preset)}
                      className={`px-2 py-0.5 text-[10px] font-semibold rounded border transition-colors cursor-pointer ${
                        radiusMeters === preset
                          ? 'bg-stone-900 text-white border-stone-900'
                          : 'bg-stone-100 text-stone-700 border-stone-200 hover:bg-stone-200'
                      }`}
                    >
                      {preset}m
                    </button>
                  ))}
                </div>
              </div>

              <div className="pt-3 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 text-xs font-semibold text-stone-600 hover:text-stone-900 bg-stone-100 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isCreatingSession}
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-xs flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  <Play className="w-3.5 h-3.5 fill-white" />
                  <span>{isCreatingSession ? 'Starting...' : 'Start Attendance Window'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Top Welcome Bar with Faculty Profile Isolation */}
      <div className="bg-white rounded-2xl border border-stone-200/80 p-5 sm:p-6 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold tracking-tight text-stone-900">
              Prof. {faculty.name}
            </h1>
            <span className="text-[10px] uppercase font-bold px-2 py-0.5 bg-stone-900 text-emerald-400 rounded font-mono">
              Code: {faculty.shortCode}
            </span>
          </div>
          <div className="text-xs text-stone-500 mt-1 flex flex-wrap items-center gap-2">
            <span>Department: <strong>{faculty.department}</strong></span>
            <span>·</span>
            <span>Emp ID: <strong>{faculty.employeeId}</strong></span>
            <span>·</span>
            <span>Assigned: <strong className="text-stone-800">{assignedSubjects.map((s: any) => s.subject_name).join(', ')}</strong></span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowCreateModal(true)}
            className="px-4 py-2.5 bg-stone-900 hover:bg-black text-white text-xs font-bold rounded-xl shadow-xs transition-all flex items-center gap-2 cursor-pointer"
          >
            <Play className="w-3.5 h-3.5 fill-emerald-400 text-emerald-400" />
            <span>Start Attendance Window</span>
          </button>
        </div>
      </div>

      {/* Navigation Sub-Tabs */}
      <div className="flex items-center gap-2 border-b border-stone-200 pb-2">
        <button
          onClick={() => setActiveTab('classrooms')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
            activeTab === 'classrooms'
              ? 'bg-stone-900 text-white shadow-xs'
              : 'bg-white text-stone-600 border border-stone-200 hover:bg-stone-50'
          }`}
        >
          <KeyRound className="w-3.5 h-3.5 text-emerald-400" />
          <span>Classrooms & Join Codes ({classrooms.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('roster')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
            activeTab === 'roster'
              ? 'bg-stone-900 text-white shadow-xs'
              : 'bg-white text-stone-600 border border-stone-200 hover:bg-stone-50'
          }`}
        >
          <Users className="w-3.5 h-3.5 text-stone-400" />
          <span>Student Roster & Defaulters</span>
        </button>

        <button
          onClick={() => setActiveTab('history')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
            activeTab === 'history'
              ? 'bg-stone-900 text-white shadow-xs'
              : 'bg-white text-stone-600 border border-stone-200 hover:bg-stone-50'
          }`}
        >
          <BookOpen className="w-3.5 h-3.5 text-stone-400" />
          <span>Topics Log ({lectureHistory.length})</span>
        </button>
      </div>

      {/* ACTIVE LIVE ATTENDANCE MONITORING */}
      {liveSessionData && (
        <div className="bg-white rounded-2xl border-2 border-emerald-600 p-5 sm:p-6 shadow-md space-y-4 animate-in fade-in">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-stone-200">
            <div>
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-ping"></span>
                <span className="text-xs font-bold text-emerald-700 uppercase tracking-wider">
                  ACTIVE ATTENDANCE SESSION IN PROGRESS
                </span>
                {liveSessionData.session.joinCode && (
                  <span className="text-xs font-mono font-bold px-2 py-0.5 bg-stone-900 text-emerald-400 rounded">
                    Code: {liveSessionData.session.joinCode}
                  </span>
                )}
              </div>
              <h2 className="text-base font-bold text-stone-900 mt-1">
                {liveSessionData.session.className} — {liveSessionData.session.subjectName}
              </h2>
              <p className="text-xs text-stone-600">
                Topic: <strong>{liveSessionData.session.lectureTopic}</strong> • Radius: <strong>{liveSessionData.session.radiusMeters}m</strong>
              </p>
            </div>

            <div className="flex items-center gap-3">
              <div className="text-right">
                <div className="text-xl font-mono font-extrabold text-emerald-800">
                  {liveSessionData.stats.presentCount} / {liveSessionData.stats.totalEnrolled}
                </div>
                <div className="text-[11px] text-stone-500 font-medium">Students Verified Present</div>
              </div>

              <button
                onClick={() => handleStopSession(liveSessionData.session.id)}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-xl transition-colors flex items-center gap-1.5 cursor-pointer shadow-xs"
              >
                <Square className="w-3.5 h-3.5 fill-white" />
                <span>Stop Attendance</span>
              </button>
            </div>
          </div>

          {/* Live Roster of Marked Students */}
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-stone-50 text-stone-600 uppercase font-semibold text-[10px] tracking-wider border-b border-stone-200">
                  <th className="py-2.5 px-3">Roll</th>
                  <th className="py-2.5 px-3">Student Name</th>
                  <th className="py-2.5 px-3">Classroom Member</th>
                  <th className="py-2.5 px-3">Status</th>
                  <th className="py-2.5 px-3">Marked Time</th>
                  <th className="py-2.5 px-3">Verified Distance</th>
                  <th className="py-2.5 px-3 text-right">Photo Evidence</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {liveSessionData.students.map((std: any) => (
                  <tr key={std.studentId} className="hover:bg-stone-50/70 transition-colors">
                    <td className="py-2.5 px-3 font-mono font-bold text-stone-700">{std.rollNumber}</td>
                    <td className="py-2.5 px-3 font-semibold text-stone-900">{std.name}</td>
                    <td className="py-2.5 px-3">
                      {std.isClassroomMember ? (
                        <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">
                          Joined
                        </span>
                      ) : (
                        <span className="text-[10px] text-stone-400">Not joined</span>
                      )}
                    </td>
                    <td className="py-2.5 px-3">
                      {std.status === 'PRESENT' ? (
                        <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded">
                          <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                          <span>Present</span>
                        </span>
                      ) : (
                        <span className="text-[11px] text-stone-400 font-medium">Not marked yet</span>
                      )}
                    </td>
                    <td className="py-2.5 px-3 font-mono text-stone-600 text-[11px]">
                      {std.markedAt || '—'}
                    </td>
                    <td className="py-2.5 px-3">
                      {std.distanceMeters !== null ? (
                        <span className="font-mono font-bold text-emerald-700">
                          {std.distanceMeters} m
                        </span>
                      ) : '—'}
                    </td>
                    <td className="py-2.5 px-3 text-right">
                      {std.photoThumbnail ? (
                        <button
                          onClick={() => setSelectedStudentForModal(std.studentId)}
                          className="inline-flex items-center gap-1 text-[11px] font-semibold text-stone-700 bg-stone-100 hover:bg-stone-200 px-2 py-0.5 rounded cursor-pointer border border-stone-200"
                        >
                          <Eye className="w-3 h-3" />
                          <span>Inspect</span>
                        </button>
                      ) : (
                        <span className="text-stone-300 text-[10px]">No Photo</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 1: CLASSROOMS & JOIN CODES */}
      {activeTab === 'classrooms' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-stone-900">Assigned Subject Classrooms</h2>
              <p className="text-xs text-stone-500">
                Share these unique classroom join codes with students to allow them to mark attendance for your subjects.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {classrooms.map((cr) => (
              <div
                key={cr.id}
                className="bg-white rounded-2xl border border-stone-200 p-5 shadow-xs space-y-4 hover:border-stone-400 transition-colors"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-stone-500 bg-stone-100 px-2 py-0.5 rounded">
                      {cr.subjectCode} · {cr.className}
                    </span>
                    <h3 className="text-base font-bold text-stone-900 mt-1">
                      {cr.subjectName}
                    </h3>
                    <p className="text-xs text-stone-500">{cr.courseName || 'Computer Science'}</p>
                  </div>

                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${cr.status === 'active' ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'}`}>
                    {cr.status.toUpperCase()}
                  </span>
                </div>

                {/* Prominent Classroom Join Code Display */}
                <div className="bg-stone-900 rounded-xl p-4 text-center text-white space-y-1">
                  <span className="text-[10px] font-bold uppercase tracking-widest text-emerald-400">
                    CLASSROOM JOIN CODE
                  </span>
                  <div className="text-2xl font-mono font-black tracking-widest text-white">
                    {cr.joinCode}
                  </div>
                  <div className="pt-2 flex items-center justify-center gap-2">
                    <button
                      onClick={() => handleCopyCode(cr.joinCode)}
                      className="px-3 py-1 bg-white/10 hover:bg-white/20 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 cursor-pointer transition-colors"
                    >
                      {copiedCode === cr.joinCode ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                      <span>{copiedCode === cr.joinCode ? 'Copied!' : 'Copy Code'}</span>
                    </button>
                    <button
                      onClick={() => handleRegenerateCode(cr.id)}
                      className="px-3 py-1 bg-white/10 hover:bg-white/20 text-stone-300 hover:text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 cursor-pointer transition-colors"
                      title="Generate a new code and invalidate current code"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      <span>Regenerate</span>
                    </button>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-stone-100 text-xs text-stone-600">
                  <span>Enrolled: <strong>{cr.enrolledCount}</strong> students</span>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleToggleClassroomStatus(cr.id, cr.status)}
                      className="text-[11px] font-semibold text-stone-600 hover:text-stone-900 cursor-pointer"
                    >
                      {cr.status === 'active' ? 'Disable Code' : 'Enable Code'}
                    </button>
                    <span>·</span>
                    <button
                      onClick={() => handleViewMembers(cr.id)}
                      className="text-[11px] font-bold text-emerald-700 hover:text-emerald-800 cursor-pointer flex items-center gap-1"
                    >
                      <span>View Roster</span>
                      <ChevronRight className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 2: STUDENT ROSTER & DEFAULTERS */}
      {activeTab === 'roster' && (
        <div className="bg-white rounded-2xl border border-stone-200/80 p-5 sm:p-6 shadow-xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-stone-100">
            <div>
              <h2 className="text-base font-bold text-stone-900 tracking-tight">
                Class Roster & Defaulter Analysis
              </h2>
              <p className="text-xs text-stone-500">
                Attendance compliance for your assigned subjects (75% minimum university requirement).
              </p>
            </div>

            {/* Class Selector Dropdown */}
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-stone-600">Class:</span>
              <select
                value={selectedClassId}
                onChange={(e) => setSelectedClassId(e.target.value)}
                className="px-3 py-1.5 bg-stone-50 border border-stone-200 rounded-xl text-xs font-bold text-stone-900 focus:outline-hidden focus:border-stone-900 cursor-pointer"
              >
                {classes.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.class_name}.{c.division} — {c.course_name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Search Bar */}
          <div className="flex items-center justify-between gap-3">
            <div className="relative w-full sm:w-64">
              <Search className="w-4 h-4 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search student by name or roll..."
                value={studentSearch}
                onChange={(e) => setStudentSearch(e.target.value)}
                className="w-full pl-9 pr-3 py-2 bg-stone-50 border border-stone-200 rounded-xl text-xs text-stone-900 focus:outline-hidden focus:border-stone-900"
              />
            </div>

            <div className="text-xs text-stone-500 font-medium">
              Enrolled: <strong className="text-stone-900 font-mono">{filteredStudents.length}</strong> students
            </div>
          </div>

          {/* Student Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-stone-50 text-stone-600 uppercase font-semibold text-[10px] tracking-wider border-b border-stone-200">
                  <th className="py-3 px-3">Roll</th>
                  <th className="py-3 px-3">Student Name</th>
                  <th className="py-3 px-3">Student ID</th>
                  <th className="py-3 px-3">Subject Attendance %</th>
                  <th className="py-3 px-3">Present / Total</th>
                  <th className="py-3 px-3">Defaulter Status</th>
                  <th className="py-3 px-3 text-right">Audit Profile</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {filteredStudents.map((std) => (
                  <tr key={std.id} className="hover:bg-stone-50/70 transition-colors">
                    <td className="py-3 px-3 font-mono font-bold text-stone-700">{std.rollNumber}</td>
                    <td className="py-3 px-3 font-semibold text-stone-900">{std.name}</td>
                    <td className="py-3 px-3 font-mono text-stone-500 text-[11px]">{std.studentId}</td>
                    <td className="py-3 px-3">
                      <span className={`font-mono font-bold text-sm ${std.percentage >= 75 ? 'text-emerald-700' : 'text-rose-600'}`}>
                        {std.percentage}%
                      </span>
                    </td>
                    <td className="py-3 px-3 font-mono text-stone-600">
                      {std.presentCount} / {std.totalLectures}
                    </td>
                    <td className="py-3 px-3">
                      {std.isDefaulter ? (
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold text-rose-700 bg-rose-100 px-2 py-0.5 rounded border border-rose-200">
                          <AlertTriangle className="w-3 h-3" />
                          <span>Defaulter (&lt;75%)</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                          <CheckCircle2 className="w-3 h-3" />
                          <span>Compliant</span>
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-3 text-right">
                      <button
                        onClick={() => setSelectedStudentForModal(std.id)}
                        className="px-3 py-1 bg-stone-100 hover:bg-stone-200 text-stone-800 font-semibold rounded-lg border border-stone-200 text-xs transition-colors cursor-pointer inline-flex items-center gap-1"
                      >
                        <span>View Profile</span>
                        <ChevronRight className="w-3 h-3" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 3: LECTURE TOPICS LOG */}
      {activeTab === 'history' && (
        <div className="bg-white rounded-2xl border border-stone-200/80 p-5 sm:p-6 shadow-xs space-y-4">
          <div>
            <h2 className="text-base font-bold text-stone-900 tracking-tight">
              Lecture Topics Log & Curriculum Progress
            </h2>
            <p className="text-xs text-stone-500">
              Historical records of topics taught during previous lecture sessions for your assigned subjects.
            </p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-stone-50 text-stone-600 uppercase font-semibold text-[10px] tracking-wider border-b border-stone-200">
                  <th className="py-2.5 px-3">Date & Time</th>
                  <th className="py-2.5 px-3">Class</th>
                  <th className="py-2.5 px-3">Subject</th>
                  <th className="py-2.5 px-3">Topic Taught</th>
                  <th className="py-2.5 px-3">Attendance Ratio</th>
                  <th className="py-2.5 px-3 text-right">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {lectureHistory.map((lec) => (
                  <tr key={lec.id} className="hover:bg-stone-50/70 transition-colors">
                    <td className="py-2.5 px-3 font-mono whitespace-nowrap">
                      <div className="font-semibold text-stone-900">{lec.date}</div>
                      <div className="text-[10px] text-stone-500">{lec.time}</div>
                    </td>
                    <td className="py-2.5 px-3 font-semibold text-stone-800">{lec.className}</td>
                    <td className="py-2.5 px-3">
                      <div className="font-semibold text-stone-900">{lec.subjectName}</div>
                      <div className="text-[10px] text-stone-500 font-mono">{lec.subjectCode}</div>
                    </td>
                    <td className="py-2.5 px-3 font-medium text-stone-800 max-w-sm">{lec.topic}</td>
                    <td className="py-2.5 px-3 font-mono font-bold text-stone-800">
                      {lec.presentCount} / {lec.totalEnrolled}
                    </td>
                    <td className="py-2.5 px-3 text-right">
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${lec.status === 'ACTIVE' ? 'bg-emerald-100 text-emerald-800' : 'bg-stone-100 text-stone-700'}`}>
                        {lec.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
