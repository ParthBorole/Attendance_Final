import React, { useState, useEffect } from 'react';
import { ApiService } from '../../services/api.js';
import { FacultyStudentDetailModal } from './FacultyStudentDetailModal.js';
import { GeofenceVisualizer } from '../../components/common/GeofenceVisualizer.js';
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
  Maximize2,
  Download,
  UserCheck,
  UserX,
  FileSpreadsheet,
  GraduationCap,
  Radio,
  Navigation,
} from 'lucide-react';

export const FacultyDashboard: React.FC = () => {
  const [dashboardData, setDashboardData] = useState<any | null>(null);
  const [classes, setClasses] = useState<any[]>([]);
  const [selectedClassId, setSelectedClassId] = useState<string>('cls_tycs_a');
  const [subjects, setSubjects] = useState<any[]>([]);
  const [selectedSubjectId, setSelectedSubjectId] = useState<string>('');

  // Tab within Faculty Console: 'timetable' | 'classrooms' | 'roster' | 'history'
  const [activeTab, setActiveTab] = useState<'timetable' | 'classrooms' | 'roster' | 'history'>('timetable');

  // Classrooms
  const [classrooms, setClassrooms] = useState<any[]>([]);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const [selectedClassroomMembers, setSelectedClassroomMembers] = useState<any | null>(null);
  const [isLoadingMembers, setIsLoadingMembers] = useState<boolean>(false);

  // Timetable
  const [facultyTimetable, setFacultyTimetable] = useState<any | null>(null);
  const [selectedTimetableDay, setSelectedTimetableDay] = useState<string>('Wednesday');
  const [timetableScope, setTimetableScope] = useState<'my_subject' | 'full_class'>('my_subject');
  const [selectedTimetableSubject, setSelectedTimetableSubject] = useState<string>('all');

  // Student Roster
  const [students, setStudents] = useState<any[]>([]);
  const [studentSearch, setStudentSearch] = useState<string>('');
  const [selectedStudentForModal, setSelectedStudentForModal] = useState<string | null>(null);

  // Active Session Live Data
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [liveSessionData, setLiveSessionData] = useState<any | null>(null);
  const [showRadarModal, setShowRadarModal] = useState<boolean>(false);

  // Manual Override in Progress
  const [overridingStudentId, setOverridingStudentId] = useState<string | null>(null);

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
      if (dashRes.data.activeSessions && dashRes.data.activeSessions.length > 0) {
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
      if (ttRes.data.currentDay && ttRes.data.currentDay !== 'Sunday') {
        setSelectedTimetableDay(ttRes.data.currentDay);
      }
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

  // Live session auto-refresh polling
  useEffect(() => {
    let timer: any;
    if (activeSessionId) {
      fetchLiveSession(activeSessionId);
      timer = setInterval(() => {
        fetchLiveSession(activeSessionId);
      }, 3000);
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

  const handleManualOverride = async (studentId: string, currentStatus: string) => {
    if (!activeSessionId) return;
    const nextStatus = currentStatus === 'PRESENT' ? 'ABSENT' : 'PRESENT';
    setOverridingStudentId(studentId);

    const res = await (ApiService as any).overrideAttendance(
      activeSessionId,
      studentId,
      nextStatus,
      'Manual faculty attendance override from live console'
    );

    setOverridingStudentId(null);
    if (res.success) {
      fetchLiveSession(activeSessionId);
    } else {
      alert(res.message || 'Failed to update attendance status');
    }
  };

  const handleExportRosterCSV = () => {
    if (students.length === 0) return;
    const selectedClass = classes.find((c) => c.id === selectedClassId);
    const className = selectedClass ? `${selectedClass.class_name}.${selectedClass.division}` : 'Class';

    const headers = ['Roll No', 'Student ID', 'Student Name', 'Attendance %', 'Attended', 'Total Lectures', 'Defaulter Status'];
    const rows = students.map((s) => [
      s.rollNumber,
      s.studentId,
      `"${s.name}"`,
      `${s.percentage}%`,
      s.presentCount,
      s.totalLectures,
      s.isDefaulter ? 'DEFAULTER (<75%)' : 'COMPLIANT',
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Attendance_Report_${className}_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
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
      setShowRadarModal(false);
      fetchInitialData();
      fetchLectures();
      fetchClassDetails(selectedClassId);
    }
  };

  const handleStartFromTimetable = (tt: any) => {
    setSelectedClassId(tt.classId);
    setSelectedSubjectId(tt.subjectId);
    setLectureTopic(`${tt.subjectName} Lecture`);
    setShowCreateModal(true);
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
        <span className="text-xs text-stone-500 font-medium">Loading Faculty Console & Schedule...</span>
      </div>
    );
  }

  const { faculty, assignedClasses, assignedSubjects, todayTimetable, stats } = dashboardData;

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
                className="text-stone-400 hover:text-white p-1 text-lg font-bold cursor-pointer"
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

      {/* FULLSCREEN CLASSROOM PROXIMITY RADAR HUD MODAL */}
      {showRadarModal && liveSessionData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-stone-950/95 backdrop-blur-md animate-in fade-in">
          <div className="bg-stone-900 border border-stone-800 rounded-3xl max-w-3xl w-full p-6 sm:p-8 text-center shadow-2xl space-y-5 text-white relative max-h-[90vh] overflow-y-auto">
            <button
              onClick={() => setShowRadarModal(false)}
              className="absolute top-4 right-4 text-stone-400 hover:text-white p-2 rounded-xl bg-stone-800 text-xs font-bold cursor-pointer"
            >
              ✕ Close Radar
            </button>

            <div>
              <span className="px-3 py-1 bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 rounded-full text-xs font-bold uppercase tracking-wider inline-flex items-center gap-1.5 mx-auto">
                <Radio className="w-3.5 h-3.5 text-emerald-400 animate-pulse" />
                <span>Live Geofence Radar HUD</span>
              </span>
              <h2 className="text-xl sm:text-2xl font-black mt-2 tracking-tight">
                {liveSessionData.session.className} — {liveSessionData.session.subjectName}
              </h2>
              <p className="text-xs text-stone-400 mt-1">
                Teacher Anchor: <strong>{liveSessionData.session.centerLatitude?.toFixed(6) || '19.213805'}, {liveSessionData.session.centerLongitude?.toFixed(6) || '72.864869'}</strong> • Allowed Radius: <strong>{liveSessionData.session.radiusMeters}m</strong>
              </p>
            </div>

            {/* Main Radar View */}
            <div className="flex justify-center">
              <GeofenceVisualizer
                teacherLat={liveSessionData.session.centerLatitude || 19.213805}
                teacherLng={liveSessionData.session.centerLongitude || 72.864869}
                radiusMeters={liveSessionData.session.radiusMeters}
                teacherName="Teacher's Live Mobile Beacon"
                studentLabel="Students Area"
                className="w-full max-w-lg border-stone-700 bg-stone-950"
              />
            </div>

            {/* Attendance Progress Counter */}
            <div className="bg-stone-800/80 rounded-2xl p-4 flex items-center justify-around border border-stone-700">
              <div>
                <div className="text-2xl sm:text-3xl font-mono font-black text-emerald-400">
                  {liveSessionData.stats.presentCount}
                </div>
                <div className="text-[11px] text-stone-400 font-medium">Verified Present</div>
              </div>

              <div className="h-8 w-px bg-stone-700"></div>

              <div>
                <div className="text-2xl sm:text-3xl font-mono font-black text-stone-300">
                  {liveSessionData.stats.totalEnrolled}
                </div>
                <div className="text-[11px] text-stone-400 font-medium">Total Enrolled</div>
              </div>

              <div className="h-8 w-px bg-stone-700"></div>

              <div>
                <div className="text-2xl sm:text-3xl font-mono font-black text-emerald-400">
                  {liveSessionData.stats.attendanceRate}%
                </div>
                <div className="text-[11px] text-stone-400 font-medium">Attendance Rate</div>
              </div>
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
                  className="px-4 py-2 text-xs font-semibold text-stone-600 hover:text-stone-900 bg-stone-100 rounded-xl cursor-pointer"
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

      {/* Top Welcome Bar with Faculty Profile & Stats */}
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
          {activeSessionId && (
            <button
              onClick={() => setShowRadarModal(true)}
              className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-xs transition-all flex items-center gap-2 cursor-pointer"
            >
              <Radio className="w-4 h-4 text-white animate-pulse" />
              <span>Live Proximity Radar</span>
            </button>
          )}

          <button
            onClick={() => setShowCreateModal(true)}
            className="px-4 py-2.5 bg-stone-900 hover:bg-black text-white text-xs font-bold rounded-xl shadow-xs transition-all flex items-center gap-2 cursor-pointer"
          >
            <Play className="w-3.5 h-3.5 fill-emerald-400 text-emerald-400" />
            <span>Start Attendance Window</span>
          </button>
        </div>
      </div>

      {/* Overview Stat Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
        <div className="bg-white p-4 rounded-2xl border border-stone-200/80 shadow-xs">
          <div className="flex items-center justify-between text-stone-500 text-xs font-medium">
            <span>Classes</span>
            <School className="w-4 h-4 text-stone-400" />
          </div>
          <div className="text-2xl font-bold text-stone-900 mt-1.5">{assignedClasses.length}</div>
          <div className="text-[10px] text-stone-400 mt-0.5 font-medium">Assigned Divisions</div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-stone-200/80 shadow-xs">
          <div className="flex items-center justify-between text-stone-500 text-xs font-medium">
            <span>Classrooms</span>
            <KeyRound className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="text-2xl font-bold text-stone-900 mt-1.5">{classrooms.length}</div>
          <div className="text-[10px] text-emerald-600 mt-0.5 font-semibold">Active Join Codes</div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-stone-200/80 shadow-xs">
          <div className="flex items-center justify-between text-stone-500 text-xs font-medium">
            <span>Students Roster</span>
            <Users className="w-4 h-4 text-blue-500" />
          </div>
          <div className="text-2xl font-bold text-stone-900 mt-1.5">{students.length}</div>
          <div className="text-[10px] text-stone-400 mt-0.5 font-medium">Enrolled in Class</div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-stone-200/80 shadow-xs">
          <div className="flex items-center justify-between text-stone-500 text-xs font-medium">
            <span>Lectures Taught</span>
            <BookOpen className="w-4 h-4 text-indigo-500" />
          </div>
          <div className="text-2xl font-bold text-stone-900 mt-1.5">{lectureHistory.length}</div>
          <div className="text-[10px] text-stone-400 mt-0.5 font-medium">Sessions Recorded</div>
        </div>
      </div>

      {/* Navigation Sub-Tabs */}
      <div className="flex items-center gap-2 border-b border-stone-200 pb-2 overflow-x-auto">
        <button
          onClick={() => setActiveTab('timetable')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 shrink-0 ${
            activeTab === 'timetable'
              ? 'bg-stone-900 text-white shadow-xs'
              : 'bg-white text-stone-600 border border-stone-200 hover:bg-stone-50'
          }`}
        >
          <Calendar className="w-3.5 h-3.5 text-amber-400" />
          <span>Today & Weekly Timetable</span>
        </button>

        <button
          onClick={() => setActiveTab('classrooms')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 shrink-0 ${
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
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 shrink-0 ${
            activeTab === 'roster'
              ? 'bg-stone-900 text-white shadow-xs'
              : 'bg-white text-stone-600 border border-stone-200 hover:bg-stone-50'
          }`}
        >
          <Users className="w-3.5 h-3.5 text-stone-400" />
          <span>Student Roster & Defaulters ({students.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('history')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 shrink-0 ${
            activeTab === 'history'
              ? 'bg-stone-900 text-white shadow-xs'
              : 'bg-white text-stone-600 border border-stone-200 hover:bg-stone-50'
          }`}
        >
          <BookOpen className="w-3.5 h-3.5 text-stone-400" />
          <span>Curriculum Topics Log ({lectureHistory.length})</span>
        </button>
      </div>

      {/* ACTIVE LIVE ATTENDANCE MONITORING WITH PROXIMITY TELEMETRY & MANUAL OVERRIDE */}
      {liveSessionData && (
        <div className="bg-white rounded-2xl border-2 border-emerald-600 p-5 sm:p-6 shadow-md space-y-5 animate-in fade-in">
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
                Topic: <strong>{liveSessionData.session.lectureTopic}</strong> • Radius: <strong>{liveSessionData.session.radiusMeters}m from your mobile</strong>
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowRadarModal(true)}
                className="px-3 py-2 bg-stone-900 hover:bg-black text-white text-xs font-bold rounded-xl transition-colors flex items-center gap-1.5 cursor-pointer"
              >
                <Radio className="w-3.5 h-3.5 text-emerald-400 animate-pulse" />
                <span>Sonar Radar HUD</span>
              </button>

              <button
                onClick={() => handleStopSession(liveSessionData.session.id)}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-xl transition-colors flex items-center gap-1.5 cursor-pointer shadow-xs"
              >
                <Square className="w-3.5 h-3.5 fill-white" />
                <span>Stop Attendance</span>
              </button>
            </div>
          </div>

          {/* Teacher Anchor & Live Verification Showcase */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 bg-stone-50 p-4 rounded-xl border border-stone-200">
            <div className="lg:col-span-1 bg-white p-3.5 rounded-xl border border-stone-200 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold uppercase text-stone-500 tracking-wider">Teacher Anchor</span>
                <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping"></span>
                  GPS Active
                </span>
              </div>
              <div className="font-mono text-xs text-stone-800 bg-stone-50 p-2.5 rounded-lg border border-stone-100 space-y-1">
                <div className="flex justify-between">
                  <span className="text-stone-400">Anchor Lat:</span>
                  <span className="font-bold">{liveSessionData.session.centerLatitude?.toFixed(6) || '19.213805'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-stone-400">Anchor Lng:</span>
                  <span className="font-bold">{liveSessionData.session.centerLongitude?.toFixed(6) || '72.864869'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-stone-400">Allowed Perimeter:</span>
                  <span className="font-bold text-emerald-700">{liveSessionData.session.radiusMeters}m Proximity</span>
                </div>
              </div>
              <p className="text-[10px] text-stone-500">
                🔒 <strong>Zero QR Policy:</strong> Students verify via real-time GPS proximity + Live Camera Face Recognition.
              </p>
            </div>

            <div className="lg:col-span-2 flex flex-col justify-center space-y-2.5 bg-white p-4 rounded-xl border border-stone-200">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-stone-800">Live Attendance Tally</span>
                <span className="font-mono text-sm font-bold text-emerald-800">
                  {liveSessionData.stats.presentCount} / {liveSessionData.stats.totalEnrolled} Verified ({liveSessionData.stats.attendanceRate}%)
                </span>
              </div>
              <div className="w-full bg-stone-100 rounded-full h-3 overflow-hidden border border-stone-200">
                <div
                  className="bg-emerald-600 h-3 rounded-full transition-all duration-500"
                  style={{ width: `${liveSessionData.stats.attendanceRate}%` }}
                ></div>
              </div>
              <div className="grid grid-cols-3 gap-2 text-center text-xs pt-1">
                <div className="p-2 bg-emerald-50 rounded-lg border border-emerald-100">
                  <span className="text-[10px] text-emerald-700 font-bold uppercase block">Verified Present</span>
                  <span className="text-base font-extrabold text-emerald-800 font-mono">{liveSessionData.stats.presentCount}</span>
                </div>
                <div className="p-2 bg-stone-50 rounded-lg border border-stone-200">
                  <span className="text-[10px] text-stone-500 font-bold uppercase block">Remaining</span>
                  <span className="text-base font-extrabold text-stone-700 font-mono">{liveSessionData.stats.totalEnrolled - liveSessionData.stats.presentCount}</span>
                </div>
                <div className="p-2 bg-indigo-50 rounded-lg border border-indigo-100">
                  <span className="text-[10px] text-indigo-700 font-bold uppercase block">GPS + Face Lock</span>
                  <span className="text-base font-extrabold text-indigo-800 font-mono">100%</span>
                </div>
              </div>
            </div>
          </div>

          {/* Live Roster with Manual Override */}
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-stone-50 text-stone-600 uppercase font-semibold text-[10px] tracking-wider border-b border-stone-200">
                  <th className="py-2.5 px-3">Roll</th>
                  <th className="py-2.5 px-3">Student Name</th>
                  <th className="py-2.5 px-3">Status</th>
                  <th className="py-2.5 px-3">Verified Time</th>
                  <th className="py-2.5 px-3">Distance</th>
                  <th className="py-2.5 px-3">Photo Evidence</th>
                  <th className="py-2.5 px-3 text-right">Faculty Override</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {liveSessionData.students.map((std: any) => (
                  <tr key={std.studentId} className="hover:bg-stone-50/70 transition-colors">
                    <td className="py-2.5 px-3 font-mono font-bold text-stone-700">{std.rollNumber}</td>
                    <td className="py-2.5 px-3 font-semibold text-stone-900">{std.name}</td>
                    <td className="py-2.5 px-3">
                      {std.status === 'PRESENT' ? (
                        <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded">
                          <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                          <span>Present</span>
                        </span>
                      ) : (
                        <span className="text-[11px] text-stone-400 font-medium">Not marked</span>
                      )}
                    </td>
                    <td className="py-2.5 px-3 font-mono text-[11px] text-stone-600">{std.markedAt || '—'}</td>
                    <td className="py-2.5 px-3 font-mono text-[11px] text-stone-600">
                      {std.distanceMeters !== null ? `${std.distanceMeters}m` : '—'}
                    </td>
                    <td className="py-2.5 px-3">
                      {std.photoThumbnail ? (
                        <button
                          onClick={() => setSelectedStudentForModal(std.studentId)}
                          className="inline-flex items-center gap-1 text-[10px] font-semibold text-stone-700 bg-stone-100 hover:bg-stone-200 px-2 py-0.5 rounded cursor-pointer border border-stone-200"
                        >
                          <Eye className="w-3 h-3" />
                          <span>Inspect</span>
                        </button>
                      ) : (
                        <span className="text-stone-300 text-[10px]">No Photo</span>
                      )}
                    </td>
                    <td className="py-2.5 px-3 text-right">
                      <button
                        onClick={() => handleManualOverride(std.studentId, std.status)}
                        disabled={overridingStudentId === std.studentId}
                        className={`px-2.5 py-1 text-[10px] font-bold rounded-lg border transition-colors cursor-pointer ${
                          std.status === 'PRESENT'
                            ? 'bg-rose-50 text-rose-700 border-rose-200 hover:bg-rose-100'
                            : 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100'
                        }`}
                      >
                        {std.status === 'PRESENT' ? 'Mark Absent' : 'Mark Present'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 1: TODAY & WEEKLY TIMETABLE */}
      {activeTab === 'timetable' && (
        <div className="space-y-6">
          {/* Timetable View Switcher & Controls */}
          <div className="bg-white rounded-2xl border border-stone-200 p-4 sm:p-5 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <Calendar className="w-5 h-5 text-emerald-600" />
                <h2 className="text-base font-bold text-stone-900">Academic Lecture Timetable</h2>
                <span className="text-[11px] font-mono font-bold px-2 py-0.5 bg-stone-100 text-stone-700 rounded-md">
                  TYCS.A · AY 2026-27
                </span>
              </div>
              <p className="text-xs text-stone-500 mt-1">
                Synchronized with official college schedule and student dashboards.
              </p>
            </div>

            {/* Scope Toggle: My Subject vs Full Class */}
            <div className="flex flex-wrap items-center gap-2">
              <div className="bg-stone-100 p-1 rounded-xl flex items-center gap-1 border border-stone-200">
                <button
                  onClick={() => {
                    setTimetableScope('my_subject');
                    setSelectedTimetableSubject('all');
                  }}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                    timetableScope === 'my_subject'
                      ? 'bg-white text-stone-900 shadow-xs border border-stone-200'
                      : 'text-stone-600 hover:text-stone-900'
                  }`}
                >
                  <Sparkles className="w-3.5 h-3.5 text-emerald-500" />
                  <span>My Subject ({assignedSubjects.map((s: any) => s.subject_code).join(', ')})</span>
                </button>

                <button
                  onClick={() => setTimetableScope('full_class')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                    timetableScope === 'full_class'
                      ? 'bg-white text-stone-900 shadow-xs border border-stone-200'
                      : 'text-stone-600 hover:text-stone-900'
                  }`}
                >
                  <GraduationCap className="w-3.5 h-3.5 text-indigo-500" />
                  <span>Full Class Schedule</span>
                </button>
              </div>

              {/* Subject Filter Dropdown (Active when in Full Class mode) */}
              {timetableScope === 'full_class' && (
                <select
                  value={selectedTimetableSubject}
                  onChange={(e) => setSelectedTimetableSubject(e.target.value)}
                  className="px-3 py-1.5 bg-stone-50 border border-stone-200 rounded-xl text-xs font-semibold text-stone-800 focus:outline-hidden focus:border-stone-900"
                >
                  <option value="all">All Subjects (Master)</option>
                  <option value="sub_cis">Cyber & Info Security (CIS)</option>
                  <option value="sub_stqa">Software Testing (STQA)</option>
                  <option value="sub_ai">Artificial Intelligence (AI)</option>
                  <option value="sub_eth">Ethical Hacking (ETH)</option>
                  <option value="sub_dv">Data Visualization (DV)</option>
                  <option value="sub_aba">Advanced Business Analytics (ABA)</option>
                  <option value="sub_mp">Mini Project (MP)</option>
                  <option value="sub_iks">Indian Knowledge System (IKS)</option>
                  <option value="sub_cep">Continuous Evaluation (CEP)</option>
                </select>
              )}
            </div>
          </div>

          {/* Today's Lectures Card */}
          <div className="bg-white rounded-2xl border border-stone-200 p-5 sm:p-6 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-base font-bold text-stone-900 flex items-center gap-2">
                  <Clock className="w-4 h-4 text-emerald-600" />
                  <span>
                    Today's Lectures ({facultyTimetable?.currentDay || 'Today'})
                  </span>
                  {todayTimetable && todayTimetable.length > 0 && (
                    <span className="text-[10px] font-bold px-2 py-0.5 bg-emerald-100 text-emerald-800 rounded-full font-mono">
                      {todayTimetable.length} {todayTimetable.length === 1 ? 'Lecture' : 'Lectures'}
                    </span>
                  )}
                </h2>
                <p className="text-xs text-stone-500">
                  {timetableScope === 'my_subject'
                    ? 'Your assigned subject lectures scheduled for today with 1-click attendance launch.'
                    : 'Showing lectures scheduled for today across the entire class.'}
                </p>
              </div>
            </div>

            {(!todayTimetable || todayTimetable.length === 0) ? (
              <div className="p-8 text-center text-xs text-stone-500 bg-stone-50 rounded-xl border border-dashed border-stone-200">
                <Calendar className="w-6 h-6 text-stone-400 mx-auto mb-2" />
                <p className="font-semibold text-stone-700">No lectures scheduled for your subject today.</p>
                <p className="text-[11px] text-stone-400 mt-0.5">
                  Check the weekly schedule below to see your scheduled days and timings.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                {todayTimetable.map((tt: any) => {
                  const isAssignedToMe = assignedSubjects.some((s: any) => s.id === tt.subjectId);
                  return (
                    <div
                      key={tt.id}
                      className={`p-4 rounded-xl border flex items-center justify-between gap-3 transition-colors ${
                        isAssignedToMe
                          ? 'border-emerald-300 bg-emerald-50/40 hover:bg-emerald-50/70'
                          : 'border-stone-200 bg-stone-50/60 hover:bg-stone-50'
                      }`}
                    >
                      <div>
                        <div className="flex flex-wrap items-center gap-1.5">
                          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-stone-200 text-stone-700 font-mono">
                            {tt.className}
                          </span>
                          <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-stone-800 text-white">
                            {tt.subjectCode}
                          </span>
                          {tt.isLab ? (
                            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-purple-100 text-purple-700">
                              Practical Lab {tt.batch ? `(${tt.batch})` : ''}
                            </span>
                          ) : (
                            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-blue-100 text-blue-700">
                              Theory
                            </span>
                          )}
                          {isAssignedToMe && (
                            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800">
                              Your Subject
                            </span>
                          )}
                        </div>

                        <h4 className="text-sm font-bold text-stone-900 mt-1.5">{tt.subjectName}</h4>

                        <div className="text-[11px] text-stone-500 font-mono mt-1 flex flex-wrap items-center gap-2">
                          <span className="flex items-center gap-1 text-stone-700 font-semibold">
                            <Clock className="w-3 h-3 text-stone-400" />
                            <span>{tt.startTime} – {tt.endTime}</span>
                          </span>
                          <span>·</span>
                          <span>Room: <strong>{tt.room}</strong></span>
                        </div>
                      </div>

                      <button
                        onClick={() => handleStartFromTimetable(tt)}
                        className="px-3.5 py-2 bg-stone-900 hover:bg-black text-white text-xs font-bold rounded-xl transition-all flex items-center gap-1.5 cursor-pointer shrink-0 shadow-xs"
                      >
                        <Play className="w-3 h-3 fill-emerald-400 text-emerald-400" />
                        <span>Start</span>
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Weekly Schedule Browser (Mon to Sat) */}
          <div className="bg-white rounded-2xl border border-stone-200 p-5 sm:p-6 shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-stone-100">
              <div>
                <h3 className="text-sm font-bold text-stone-900 flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-stone-700" />
                  <span>
                    {timetableScope === 'my_subject'
                      ? `Weekly Schedule — ${assignedSubjects.map((s: any) => s.subject_name).join(', ')}`
                      : 'Full Weekly Class Schedule (TYCS.A)'}
                  </span>
                </h3>
                <p className="text-xs text-stone-500">
                  {timetableScope === 'my_subject'
                    ? 'Showing all days when your assigned subject lectures are scheduled.'
                    : 'Showing the complete semester schedule matching the Student Dashboard timetable.'}
                </p>
              </div>

              {/* Day Selector Pills */}
              <div className="flex flex-wrap gap-1">
                {['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'].map((day) => {
                  const isToday = facultyTimetable?.currentDay === day;
                  const isSelected = selectedTimetableDay === day;
                  
                  // Count slots on this day
                  const source = timetableScope === 'my_subject'
                    ? (facultyTimetable?.weeklySchedule || {})
                    : (facultyTimetable?.fullWeeklySchedule || {});
                  const count = (source[day] || []).length;

                  return (
                    <button
                      key={day}
                      onClick={() => setSelectedTimetableDay(day)}
                      className={`px-3 py-1.5 text-xs font-semibold rounded-xl transition-all cursor-pointer flex items-center gap-1.5 ${
                        isSelected
                          ? 'bg-stone-900 text-white font-bold shadow-xs'
                          : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
                      }`}
                    >
                      <span>{day.substring(0, 3)}</span>
                      {count > 0 && (
                        <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono font-bold ${
                          isSelected ? 'bg-stone-700 text-emerald-300' : 'bg-stone-200 text-stone-700'
                        }`}>
                          {count}
                        </span>
                      )}
                      {isToday && (
                        <span className={`w-1.5 h-1.5 rounded-full ${isSelected ? 'bg-emerald-400' : 'bg-emerald-600'}`} />
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Render Day's Entries */}
            {(() => {
              const source = timetableScope === 'my_subject'
                ? (facultyTimetable?.weeklySchedule || {})
                : (facultyTimetable?.fullWeeklySchedule || {});

              let slots = source[selectedTimetableDay] || [];

              // Apply subject filter if in full class mode
              if (timetableScope === 'full_class' && selectedTimetableSubject !== 'all') {
                slots = slots.filter((s: any) => s.subjectId === selectedTimetableSubject);
              }

              if (slots.length === 0) {
                return (
                  <div className="p-8 text-center bg-stone-50 rounded-xl border border-dashed border-stone-200">
                    <p className="text-xs text-stone-500 font-medium">
                      No lectures scheduled for {selectedTimetableDay}{' '}
                      {timetableScope === 'my_subject' ? 'for your assigned subject' : ''}.
                    </p>
                  </div>
                );
              }

              return (
                <div className="space-y-3">
                  {slots.map((item: any) => {
                    const isMyLecture = item.isMySubject || assignedSubjects.some((s: any) => s.id === item.subjectId);

                    return (
                      <div
                        key={item.id}
                        className={`p-4 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition-colors ${
                          isMyLecture
                            ? 'border-emerald-300 bg-emerald-50/40 hover:bg-emerald-50/70'
                            : 'border-stone-200 bg-white hover:bg-stone-50'
                        }`}
                      >
                        <div className="space-y-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="font-bold text-stone-900 text-sm">{item.subjectName}</span>
                            <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 bg-stone-200 text-stone-800 rounded">
                              {item.subjectCode}
                            </span>
                            <span className="text-[10px] font-mono px-1.5 py-0.5 bg-stone-100 rounded text-stone-600">
                              {item.className}
                            </span>
                            {item.isLab ? (
                              <span className="text-[10px] font-bold px-1.5 py-0.5 bg-purple-100 text-purple-700 rounded">
                                Practical Lab {item.batch ? `(${item.batch})` : ''}
                              </span>
                            ) : (
                              <span className="text-[10px] font-bold px-1.5 py-0.5 bg-blue-100 text-blue-700 rounded">
                                Theory
                              </span>
                            )}
                            {isMyLecture && (
                              <span className="text-[10px] font-bold px-1.5 py-0.5 bg-emerald-100 text-emerald-800 rounded">
                                ★ Your Subject
                              </span>
                            )}
                          </div>

                          <div className="text-[11px] text-stone-500 flex flex-wrap items-center gap-2">
                            {item.facultyName && (
                              <>
                                <span>Prof. <strong>{item.facultyName}</strong> ({item.facultyShortCode})</span>
                                <span>·</span>
                              </>
                            )}
                            <span>Room: <strong>{item.room}</strong></span>
                            {item.joinCode && (
                              <>
                                <span>·</span>
                                <span className="font-mono">Join Code: <strong className="text-stone-800">{item.joinCode}</strong></span>
                              </>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center gap-3 self-end sm:self-center shrink-0">
                          <div className="text-right font-mono font-bold text-stone-800 text-xs">
                            {item.startTime} – {item.endTime}
                          </div>

                          <button
                            onClick={() => handleStartFromTimetable(item)}
                            className="px-3 py-1.5 bg-stone-900 hover:bg-black text-white text-xs font-bold rounded-xl transition-all flex items-center gap-1.5 cursor-pointer shadow-xs"
                          >
                            <Play className="w-3 h-3 fill-emerald-400 text-emerald-400" />
                            <span>Start</span>
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              );
            })()}
          </div>
        </div>
      )}

      {/* TAB 2: CLASSROOMS & JOIN CODES */}
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

      {/* TAB 3: STUDENT ROSTER & DEFAULTERS */}
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

            <div className="flex items-center gap-2">
              <button
                onClick={handleExportRosterCSV}
                className="px-3 py-1.5 bg-stone-100 hover:bg-stone-200 text-stone-800 text-xs font-semibold rounded-xl border border-stone-200 flex items-center gap-1.5 cursor-pointer"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Export CSV</span>
              </button>

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

      {/* TAB 4: LECTURE TOPICS LOG */}
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
