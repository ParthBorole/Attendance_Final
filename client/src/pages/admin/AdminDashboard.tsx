import React, { useState, useEffect } from 'react';
import { ApiService } from '../../services/api.js';
import { AdminLocationTestTool } from '../../components/admin/AdminLocationTestTool.js';
import {
  ShieldCheck,
  Building,
  MapPin,
  Users,
  BookOpen,
  Layers,
  Settings,
  Mail,
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
  Plus,
  TrendingUp,
  Calendar,
  KeyRound,
  Copy,
  Check,
  RotateCcw,
  UserPlus,
  ShieldAlert,
  Clock,
  Trash2,
  Compass,
} from 'lucide-react';

type AdminTab =
  | 'overview'
  | 'timetable'
  | 'classrooms'
  | 'audit_logs'
  | 'location'
  | 'test_location'
  | 'classes'
  | 'subjects'
  | 'users'
  | 'sessions'
  | 'otp_logs'
  | 'faculty'
  | 'registration_activity';

export const AdminDashboard: React.FC = () => {
  const [currentTab, setCurrentTab] = useState<AdminTab>('overview');
  const [overview, setOverview] = useState<any | null>(null);
  const [settings, setSettings] = useState<any | null>(null);
  const [classes, setClasses] = useState<any[]>([]);
  const [subjects, setSubjects] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [sessions, setSessions] = useState<any[]>([]);
  const [otpLogs, setOtpLogs] = useState<any[]>([]);
  const [timetable, setTimetable] = useState<any[]>([]);
  const [classrooms, setClassrooms] = useState<any[]>([]);
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [auditFilter, setAuditFilter] = useState<string>('all');
  const [facultyList, setFacultyList] = useState<any[]>([]);
  const [registrationActivity, setRegistrationActivity] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Add Faculty Form State
  const [showAddFacultyModal, setShowAddFacultyModal] = useState<boolean>(false);
  const [newFacultyForm, setNewFacultyForm] = useState({
    name: '',
    email: '',
    employeeId: '',
    department: 'Computer Science',
    shortCode: '',
    status: 'active',
    classId: '',
    subjectId: '',
    temporaryPassword: `Faculty@${Math.floor(1000 + Math.random() * 9000)}`,
  });
  const [facultyMsg, setFacultyMsg] = useState<{ type: 'success' | 'error'; text: string; tempPass?: string } | null>(null);

  // Copied code feedback
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  // Cross-class enrollment modal
  const [showEnrollModal, setShowEnrollModal] = useState<boolean>(false);
  const [selectedClassroomIdForEnroll, setSelectedClassroomIdForEnroll] = useState<string>('');
  const [enrollStudentId, setEnrollStudentId] = useState<string>('');
  const [enrollMessage, setEnrollMessage] = useState<string | null>(null);

  // New Timetable entry form
  const [showNewSlotModal, setShowNewSlotModal] = useState<boolean>(false);
  const [newSlotForm, setNewSlotForm] = useState({
    classId: '',
    subjectId: '',
    facultyId: '',
    dayOfWeek: 'Monday',
    startTime: '08:00 AM',
    endTime: '09:00 AM',
    room: 'CR-101',
    isLab: false,
    batch: '',
  });

  // Settings form
  const [settingsForm, setSettingsForm] = useState({
    college_name: '',
    official_latitude: 19.213805,
    official_longitude: 72.864810,
    default_radius: 10,
    min_radius: 1,
    max_radius: 50,
    low_attendance_threshold: 75,
  });
  const [settingsSuccess, setSettingsSuccess] = useState<string | null>(null);
  const [settingsError, setSettingsError] = useState<string | null>(null);

  // New Class form
  const [newClassForm, setNewClassForm] = useState({
    courseName: '',
    className: '',
    division: 'A',
    academicYear: '2026-27',
  });
  const [classSuccess, setClassSuccess] = useState<string | null>(null);

  // New Subject form
  const [newSubjectForm, setNewSubjectForm] = useState({
    subjectName: '',
    subjectCode: '',
    classId: '',
  });
  const [subjectSuccess, setSubjectSuccess] = useState<string | null>(null);

  // Create User Modal (Direct Database User Provisioning)
  const [showCreateUserModal, setShowCreateUserModal] = useState<boolean>(false);
  const [newUserForm, setNewUserForm] = useState({
    role: 'faculty',
    name: '',
    email: '',
    password: '',
    studentId: '',
    rollNumber: '',
    classId: '',
    division: 'A',
    department: 'Computer Science',
    employeeId: '',
    shortCode: '',
    subjectId: '',
  });
  const [createUserMsg, setCreateUserMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const fetchOverview = async () => {
    setIsLoading(true);
    const res = await ApiService.getAdminOverview();
    setIsLoading(false);
    if (res.success && res.data) {
      setOverview(res.data);
      setSettings(res.data.settings);
      setSettingsForm(res.data.settings);
    }
  };

  const fetchTabData = async (tab: AdminTab) => {
    if (tab === 'timetable') {
      const [ttRes, clsRes, subRes] = await Promise.all([
        ApiService.getAdminTimetable(),
        ApiService.getAdminClasses(),
        ApiService.getAdminSubjects(),
      ]);
      if (ttRes.success && ttRes.data) setTimetable(ttRes.data);
      if (clsRes.success && clsRes.data) setClasses(clsRes.data);
      if (subRes.success && subRes.data) setSubjects(subRes.data);
    } else if (tab === 'classrooms') {
      const [crRes, uRes] = await Promise.all([
        ApiService.getAdminClassrooms(),
        ApiService.getAdminUsers('student'),
      ]);
      if (crRes.success && crRes.data) setClassrooms(crRes.data);
      if (uRes.success && uRes.data) setUsers(uRes.data);
    } else if (tab === 'audit_logs') {
      const res = await ApiService.getAdminAuditLogs(100);
      if (res.success && res.data) setAuditLogs(res.data);
    } else if (tab === 'classes') {
      const res = await ApiService.getAdminClasses();
      if (res.success && res.data) setClasses(res.data);
    } else if (tab === 'subjects') {
      const [subRes, clsRes] = await Promise.all([
        ApiService.getAdminSubjects(),
        ApiService.getAdminClasses(),
      ]);
      if (subRes.success && subRes.data) setSubjects(subRes.data);
      if (clsRes.success && clsRes.data) {
        setClasses(clsRes.data);
        if (clsRes.data.length > 0 && !newSubjectForm.classId) {
          setNewSubjectForm((prev) => ({ ...prev, classId: clsRes.data[0].id }));
        }
      }
    } else if (tab === 'users') {
      const res = await ApiService.getAdminUsers();
      if (res.success && res.data) setUsers(res.data);
    } else if (tab === 'sessions') {
      const res = await ApiService.getAdminSessions();
      if (res.success && res.data) setSessions(res.data);
    } else if (tab === 'otp_logs') {
      const res = await ApiService.getOtpLogs();
      if (res.success && res.data) setOtpLogs(res.data);
    } else if (tab === 'faculty') {
      const [facRes, clsRes, subRes] = await Promise.all([
        ApiService.getAdminFaculty(),
        ApiService.getAdminClasses(),
        ApiService.getAdminSubjects(),
      ]);
      if (facRes.success && facRes.data) setFacultyList(facRes.data);
      if (clsRes.success && clsRes.data) {
        setClasses(clsRes.data);
        if (clsRes.data.length > 0 && !newFacultyForm.classId) {
          setNewFacultyForm((prev) => ({ ...prev, classId: clsRes.data[0].id }));
        }
      }
      if (subRes.success && subRes.data) {
        setSubjects(subRes.data);
        if (subRes.data.length > 0 && !newFacultyForm.subjectId) {
          setNewFacultyForm((prev) => ({ ...prev, subjectId: subRes.data[0].id }));
        }
      }
    } else if (tab === 'registration_activity') {
      const res = await ApiService.getAdminRegistrationActivity();
      if (res.success && res.data) setRegistrationActivity(res.data);
    }
  };

  const handleCreateFaculty = async (e: React.FormEvent) => {
    e.preventDefault();
    setFacultyMsg(null);
    const res = await ApiService.createAdminFaculty(newFacultyForm);
    if (res.success) {
      setFacultyMsg({
        type: 'success',
        text: 'Faculty account created securely with credentials.',
        tempPass: res.data?.temporaryPassword,
      });
      fetchTabData('faculty');
    } else {
      setFacultyMsg({ type: 'error', text: res.message || 'Failed to create faculty.' });
    }
  };

  const handleUpdateFacultyStatus = async (id: string, newStatus: string) => {
    const res = await ApiService.updateAdminFaculty(id, { status: newStatus });
    if (res.success) {
      fetchTabData('faculty');
    }
  };

  const handleResetFacultySetup = async (id: string) => {
    const res = await ApiService.resetFacultySetup(id);
    if (res.success && res.data?.temporaryPassword) {
      alert(`Account setup reset! New temporary password: ${res.data.temporaryPassword}`);
      fetchTabData('faculty');
    }
  };

  useEffect(() => {
    fetchOverview();
  }, []);

  useEffect(() => {
    fetchTabData(currentTab);
  }, [currentTab]);

  const handleCopyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(null), 2500);
  };

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setSettingsSuccess(null);
    setSettingsError(null);

    const res = await ApiService.updateAdminSettings(settingsForm);
    if (res.success) {
      setSettingsSuccess('Institution parameters & radius configuration saved successfully.');
      fetchOverview();
    } else {
      setSettingsError(res.message || 'Failed to update settings.');
    }
  };

  const handleCreateClass = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newClassForm.courseName || !newClassForm.className) return;
    const res = await ApiService.createAdminClass(newClassForm);
    if (res.success) {
      setClassSuccess('Class created successfully.');
      setNewClassForm({ courseName: '', className: '', division: 'A', academicYear: '2026-27' });
      fetchTabData('classes');
    }
  };

  const handleCreateSubject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSubjectForm.subjectName || !newSubjectForm.subjectCode || !newSubjectForm.classId) return;
    const res = await ApiService.createAdminSubject(newSubjectForm);
    if (res.success) {
      setSubjectSuccess('Subject created and mapped successfully.');
      setNewSubjectForm({ subjectName: '', subjectCode: '', classId: classes[0]?.id || '' });
      fetchTabData('subjects');
    }
  };

  const handleAddTimetableSlot = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await ApiService.createAdminTimetableEntry(newSlotForm);
    if (res.success) {
      setShowNewSlotModal(false);
      fetchTabData('timetable');
    }
  };

  const handleDeleteTimetableSlot = async (id: string) => {
    if (!confirm('Are you sure you want to remove this timetable slot?')) return;
    const res = await ApiService.deleteAdminTimetableEntry(id);
    if (res.success) {
      fetchTabData('timetable');
    }
  };

  const handleEnrollStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedClassroomIdForEnroll || !enrollStudentId) return;
    setEnrollMessage(null);

    const res = await ApiService.enrollStudentIntoClassroom(selectedClassroomIdForEnroll, enrollStudentId);
    if (res.success) {
      setEnrollMessage(res.message || 'Student enrolled successfully.');
      setTimeout(() => {
        setShowEnrollModal(false);
        setEnrollMessage(null);
        fetchTabData('classrooms');
      }, 1500);
    } else {
      setEnrollMessage(res.message || 'Failed to enroll student.');
    }
  };

  const handleCreateUserSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreateUserMsg(null);
    const res = await ApiService.createAdminUser(newUserForm);
    if (res.success) {
      setCreateUserMsg({ type: 'success', text: res.message || 'User account saved to database!' });
      fetchTabData('users');
      setTimeout(() => {
        setShowCreateUserModal(false);
        setCreateUserMsg(null);
        setNewUserForm({
          role: 'faculty',
          name: '',
          email: '',
          password: '',
          studentId: '',
          rollNumber: '',
          classId: '',
          division: 'A',
          department: 'Computer Science',
          employeeId: '',
          shortCode: '',
          subjectId: '',
        });
      }, 1500);
    } else {
      setCreateUserMsg({ type: 'error', text: res.message || 'Failed to create user.' });
    }
  };

  const handleToggleUserStatus = async (userId: string, currentStatus: string) => {
    const newStatus = currentStatus === 'active' ? 'inactive' : 'active';
    const res = await ApiService.updateAdminUserStatus(userId, newStatus);
    if (res.success) {
      fetchTabData('users');
    }
  };

  const handleResetDatabase = async () => {
    if (window.confirm('Reset database to verified timetable, classrooms, and seed state?')) {
      await ApiService.resetDatabase();
      fetchOverview();
      fetchTabData(currentTab);
    }
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Top Banner */}
      <div className="bg-white rounded-2xl border border-stone-200/80 p-5 sm:p-6 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold tracking-tight text-stone-900">
              Institution Administration Console
            </h1>
            <span className="text-[10px] font-bold px-2 py-0.5 bg-rose-100 text-rose-800 rounded">
              Super Admin Level
            </span>
          </div>
          <p className="text-xs text-stone-500 mt-0.5">
            Thakur Shyamnarayan Degree College (TSDC) • Multi-Class Timetable, Classrooms & Audit Control
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleResetDatabase}
            className="px-3.5 py-2 text-xs font-semibold text-stone-700 bg-stone-100 hover:bg-stone-200 border border-stone-200 rounded-xl transition-colors cursor-pointer"
          >
            Reset Seed Data
          </button>
        </div>
      </div>

      {/* Admin Tab Navigation */}
      <div className="flex items-center gap-1.5 p-1 bg-stone-100/90 rounded-2xl border border-stone-200/60 overflow-x-auto">
        {[
          { id: 'overview', label: 'Overview Metrics' },
          { id: 'faculty', label: 'Faculty Management' },
          { id: 'registration_activity', label: 'Registration Activity' },
          { id: 'timetable', label: 'College Timetable' },
          { id: 'classrooms', label: 'Classrooms & Join Codes' },
          { id: 'audit_logs', label: 'Security Audit Logs' },
          { id: 'location', label: 'Location & Radius Settings' },
          { id: 'test_location', label: 'Location Diagnostic & Test Tool' },
          { id: 'classes', label: 'Class & Division' },
          { id: 'subjects', label: 'Subjects Mapping' },
          { id: 'users', label: 'User Management' },
          { id: 'sessions', label: 'Attendance Sessions' },
          { id: 'otp_logs', label: 'Dispatched OTPs' },
        ].map((t) => (
          <button
            key={t.id}
            onClick={() => setCurrentTab(t.id as AdminTab)}
            className={`px-3.5 py-2 text-xs font-semibold rounded-xl whitespace-nowrap transition-all cursor-pointer ${
              currentTab === t.id
                ? 'bg-white text-stone-900 shadow-xs border border-stone-200/80'
                : 'text-stone-600 hover:text-stone-900'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Cross-Class Enrollment Override Modal */}
      {showEnrollModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/70 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-2xl border border-stone-200 max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-stone-100">
              <h3 className="text-sm font-bold text-stone-900">Authorize Cross-Class Enrollment</h3>
              <button onClick={() => setShowEnrollModal(false)} className="text-stone-400 hover:text-stone-600">✕</button>
            </div>

            <form onSubmit={handleEnrollStudent} className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-stone-700 mb-1">Target Classroom</label>
                <select
                  value={selectedClassroomIdForEnroll}
                  onChange={(e) => setSelectedClassroomIdForEnroll(e.target.value)}
                  className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl"
                  required
                >
                  <option value="">Select Classroom...</option>
                  {classrooms.map((cr) => (
                    <option key={cr.id} value={cr.id}>
                      {cr.classroomName} ({cr.joinCode})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-semibold text-stone-700 mb-1">Select Student</label>
                <select
                  value={enrollStudentId}
                  onChange={(e) => setEnrollStudentId(e.target.value)}
                  className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl"
                  required
                >
                  <option value="">Select Student...</option>
                  {users.filter((u) => u.role === 'student').map((u) => (
                    <option key={u.id} value={u.studentId || u.id}>
                      {u.name} — {u.className} (Roll {u.rollNumber})
                    </option>
                  ))}
                </select>
              </div>

              {enrollMessage && (
                <p className="text-xs font-semibold text-emerald-800 bg-emerald-50 p-2 rounded-lg">{enrollMessage}</p>
              )}

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowEnrollModal(false)}
                  className="px-4 py-2 bg-stone-100 text-stone-700 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-stone-900 text-white font-bold rounded-xl"
                >
                  Enroll Student
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Direct User Creation Modal */}
      {showCreateUserModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/70 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-2xl border border-stone-200 max-w-lg w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-stone-100">
              <div>
                <h3 className="text-sm font-bold text-stone-900">Create New Database User Account</h3>
                <p className="text-[11px] text-stone-500">Add Teacher / Student / Admin with custom User ID and Password.</p>
              </div>
              <button onClick={() => setShowCreateUserModal(false)} className="text-stone-400 hover:text-stone-600">✕</button>
            </div>

            {createUserMsg && (
              <div className={`p-3 rounded-xl text-xs flex items-center gap-2 ${
                createUserMsg.type === 'success' ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' : 'bg-rose-50 text-rose-800 border border-rose-200'
              }`}>
                {createUserMsg.type === 'success' ? <CheckCircle2 className="w-4 h-4 text-emerald-600" /> : <AlertTriangle className="w-4 h-4 text-rose-600" />}
                <span>{createUserMsg.text}</span>
              </div>
            )}

            <form onSubmit={handleCreateUserSubmit} className="space-y-3 text-xs">
              <div className="grid grid-cols-3 gap-2">
                {(['student', 'faculty', 'admin'] as const).map((r) => (
                  <button
                    key={r}
                    type="button"
                    onClick={() => setNewUserForm({ ...newUserForm, role: r })}
                    className={`py-2 text-center rounded-xl font-bold uppercase text-[11px] border transition-all cursor-pointer ${
                      newUserForm.role === r
                        ? 'bg-stone-900 text-white border-stone-900 shadow-xs'
                        : 'bg-stone-50 text-stone-600 border-stone-200 hover:bg-stone-100'
                    }`}
                  >
                    {r === 'faculty' ? 'Teacher' : r}
                  </button>
                ))}
              </div>

              <div>
                <label className="block font-semibold text-stone-700 mb-1">
                  {newUserForm.role === 'faculty' ? 'Teacher / Faculty Name' : 'Full Name'}
                </label>
                <input
                  type="text"
                  required
                  placeholder={newUserForm.role === 'faculty' ? 'e.g. Prof. Rohit Sir' : 'e.g. Rahul Sharma'}
                  value={newUserForm.name}
                  onChange={(e) => setNewUserForm({ ...newUserForm, name: e.target.value })}
                  className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl"
                />
              </div>

              <div>
                <label className="block font-semibold text-stone-700 mb-1">User ID / Email Address</label>
                <input
                  type="email"
                  required
                  placeholder={
                    newUserForm.role === 'faculty'
                      ? 'rohit.faculty@tsdc.edu.in'
                      : newUserForm.role === 'admin'
                      ? 'admin2@tsdc.edu.in'
                      : 'rahul.student@tsdc.edu.in'
                  }
                  value={newUserForm.email}
                  onChange={(e) => setNewUserForm({ ...newUserForm, email: e.target.value })}
                  className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl font-mono"
                />
              </div>

              <div>
                <label className="block font-semibold text-stone-700 mb-1">Password (Directly Stored)</label>
                <input
                  type="text"
                  required
                  placeholder="Set account password (e.g. Rohit@2026)"
                  value={newUserForm.password}
                  onChange={(e) => setNewUserForm({ ...newUserForm, password: e.target.value })}
                  className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl font-mono"
                />
              </div>

              {newUserForm.role === 'student' && (
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block font-semibold text-stone-700 mb-1">Student ID</label>
                    <input
                      type="text"
                      placeholder="TSDC-2026-0155"
                      value={newUserForm.studentId}
                      onChange={(e) => setNewUserForm({ ...newUserForm, studentId: e.target.value })}
                      className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-stone-700 mb-1">Roll No</label>
                    <input
                      type="text"
                      placeholder="155"
                      value={newUserForm.rollNumber}
                      onChange={(e) => setNewUserForm({ ...newUserForm, rollNumber: e.target.value })}
                      className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl"
                    />
                  </div>
                </div>
              )}

              {newUserForm.role === 'faculty' && (
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block font-semibold text-stone-700 mb-1">Department</label>
                    <input
                      type="text"
                      placeholder="Computer Science"
                      value={newUserForm.department}
                      onChange={(e) => setNewUserForm({ ...newUserForm, department: e.target.value })}
                      className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-stone-700 mb-1">Short Code</label>
                    <input
                      type="text"
                      placeholder="RHS"
                      value={newUserForm.shortCode}
                      onChange={(e) => setNewUserForm({ ...newUserForm, shortCode: e.target.value })}
                      className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl uppercase font-mono"
                    />
                  </div>
                </div>
              )}

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowCreateUserModal(false)}
                  className="px-4 py-2 bg-stone-100 text-stone-700 rounded-xl cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-stone-900 hover:bg-stone-800 text-white font-bold rounded-xl shadow-xs cursor-pointer"
                >
                  Save Account to Database
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* TAB 1: OVERVIEW METRICS */}
      {currentTab === 'overview' && overview && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="bg-white p-5 rounded-2xl border border-stone-200 shadow-xs">
              <span className="text-xs font-semibold text-stone-500 block mb-1">Total Students</span>
              <span className="text-2xl font-bold font-mono text-stone-900">{overview.stats.totalStudents}</span>
            </div>
            <div className="bg-white p-5 rounded-2xl border border-stone-200 shadow-xs">
              <span className="text-xs font-semibold text-stone-500 block mb-1">Total Faculty</span>
              <span className="text-2xl font-bold font-mono text-stone-900">{overview.stats.totalFaculty}</span>
            </div>
            <div className="bg-white p-5 rounded-2xl border border-stone-200 shadow-xs">
              <span className="text-xs font-semibold text-stone-500 block mb-1">Classrooms Active</span>
              <span className="text-2xl font-bold font-mono text-stone-900">{overview.stats.totalClassrooms}</span>
            </div>
            <div className="bg-white p-5 rounded-2xl border border-stone-200 shadow-xs">
              <span className="text-xs font-semibold text-stone-500 block mb-1">Defaulters (&lt;75%)</span>
              <span className="text-2xl font-bold font-mono text-rose-600">{overview.stats.defaultersCount}</span>
            </div>
          </div>

          {/* Location Summary */}
          <div className="bg-white p-6 rounded-2xl border border-stone-200 shadow-xs">
            <div className="flex items-center gap-2 mb-3">
              <MapPin className="w-5 h-5 text-amber-600" />
              <h3 className="text-sm font-bold text-stone-900">Configured Institution Coordinates</h3>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
              <div className="p-3 bg-stone-50 rounded-xl">
                <span className="text-stone-500 block mb-0.5">Institution Name</span>
                <span className="font-bold text-stone-900">{overview.settings.college_name}</span>
              </div>
              <div className="p-3 bg-stone-50 rounded-xl">
                <span className="text-stone-500 block mb-0.5">Official GPS Center</span>
                <span className="font-mono font-bold text-stone-900">
                  {overview.settings.official_latitude}, {overview.settings.official_longitude}
                </span>
              </div>
              <div className="p-3 bg-stone-50 rounded-xl">
                <span className="text-stone-500 block mb-0.5">Attendance Radius Policy</span>
                <span className="font-mono font-bold text-emerald-800">
                  Default: {overview.settings.default_radius}m (Allowed: {overview.settings.min_radius}m - {overview.settings.max_radius}m)
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB: FACULTY MANAGEMENT */}
      {currentTab === 'faculty' && (
        <div className="bg-white p-6 rounded-2xl border border-stone-200 shadow-xs space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-stone-100">
            <div>
              <div className="flex items-center gap-2">
                <Users className="w-5 h-5 text-stone-900" />
                <h2 className="text-base font-bold text-stone-900">Faculty Management & Security Setup</h2>
              </div>
              <p className="text-xs text-stone-500">
                Create faculty accounts, assign subjects & classes securely, manage account status, and reset setup credentials.
              </p>
            </div>
            <button
              onClick={() => setShowAddFacultyModal(true)}
              className="px-4 py-2 bg-stone-900 hover:bg-black text-white text-xs font-bold rounded-xl flex items-center gap-2 cursor-pointer shadow-xs"
            >
              <UserPlus className="w-4 h-4 text-emerald-400" />
              <span>Add Faculty</span>
            </button>
          </div>

          {/* Add Faculty Modal */}
          {showAddFacultyModal && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/70 backdrop-blur-xs animate-in fade-in">
              <div className="bg-white rounded-3xl border border-stone-200 max-w-lg w-full p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
                <div className="flex items-center justify-between pb-3 border-b border-stone-100">
                  <div className="flex items-center gap-2">
                    <div className="w-9 h-9 rounded-xl bg-stone-900 text-emerald-400 flex items-center justify-center font-bold">
                      <UserPlus className="w-4 h-4" />
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-stone-900">Add New Faculty Member</h3>
                      <p className="text-[11px] text-stone-500">Generates secure encrypted credentials and audit log</p>
                    </div>
                  </div>
                  <button onClick={() => setShowAddFacultyModal(false)} className="text-stone-400 hover:text-stone-600 font-bold text-lg">✕</button>
                </div>

                {facultyMsg && (
                  <div className={`p-3 rounded-xl text-xs font-medium space-y-1 ${facultyMsg.type === 'success' ? 'bg-emerald-50 border border-emerald-200 text-emerald-900' : 'bg-rose-50 border border-rose-200 text-rose-900'}`}>
                    <div className="font-bold">{facultyMsg.text}</div>
                    {facultyMsg.tempPass && (
                      <div className="p-2 bg-white rounded border border-emerald-300 font-mono text-[11px] select-all">
                        Temporary Password: <strong>{facultyMsg.tempPass}</strong> (Give this to the professor)
                      </div>
                    )}
                  </div>
                )}

                <form onSubmit={handleCreateFaculty} className="space-y-3 text-xs">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block font-semibold text-stone-700 mb-1">Full Name *</label>
                      <input
                        type="text"
                        placeholder="e.g. Prof. Rahul Sharma"
                        value={newFacultyForm.name}
                        onChange={(e) => setNewFacultyForm({ ...newFacultyForm, name: e.target.value })}
                        className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl"
                        required
                      />
                    </div>
                    <div>
                      <label className="block font-semibold text-stone-700 mb-1">Official Email *</label>
                      <input
                        type="email"
                        placeholder="rahul.sharma@tsdc.edu.in"
                        value={newFacultyForm.email}
                        onChange={(e) => setNewFacultyForm({ ...newFacultyForm, email: e.target.value })}
                        className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl"
                        required
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <label className="block font-semibold text-stone-700 mb-1">Employee ID *</label>
                      <input
                        type="text"
                        placeholder="FAC001"
                        value={newFacultyForm.employeeId}
                        onChange={(e) => setNewFacultyForm({ ...newFacultyForm, employeeId: e.target.value.toUpperCase() })}
                        className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl font-mono"
                        required
                      />
                    </div>
                    <div>
                      <label className="block font-semibold text-stone-700 mb-1">Department *</label>
                      <input
                        type="text"
                        placeholder="Computer Science"
                        value={newFacultyForm.department}
                        onChange={(e) => setNewFacultyForm({ ...newFacultyForm, department: e.target.value })}
                        className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl"
                        required
                      />
                    </div>
                    <div>
                      <label className="block font-semibold text-stone-700 mb-1">Short Code</label>
                      <input
                        type="text"
                        placeholder="RHS"
                        value={newFacultyForm.shortCode}
                        onChange={(e) => setNewFacultyForm({ ...newFacultyForm, shortCode: e.target.value.toUpperCase() })}
                        className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl font-mono"
                        maxLength={5}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block font-semibold text-stone-700 mb-1">Assign Class</label>
                      <select
                        value={newFacultyForm.classId}
                        onChange={(e) => setNewFacultyForm({ ...newFacultyForm, classId: e.target.value })}
                        className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl"
                      >
                        <option value="">Select Class...</option>
                        {classes.map((cls) => (
                          <option key={cls.id} value={cls.id}>{cls.className} ({cls.courseName})</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block font-semibold text-stone-700 mb-1">Assign Subject</label>
                      <select
                        value={newFacultyForm.subjectId}
                        onChange={(e) => setNewFacultyForm({ ...newFacultyForm, subjectId: e.target.value })}
                        className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl"
                      >
                        <option value="">Select Subject...</option>
                        {subjects.map((sub) => (
                          <option key={sub.id} value={sub.id}>{sub.subjectName} ({sub.subjectCode})</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block font-semibold text-stone-700 mb-1">Account Status</label>
                      <select
                        value={newFacultyForm.status}
                        onChange={(e) => setNewFacultyForm({ ...newFacultyForm, status: e.target.value })}
                        className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl font-semibold"
                      >
                        <option value="active">Active (Full Access)</option>
                        <option value="pending">Pending Setup Verification</option>
                        <option value="suspended">Suspended</option>
                        <option value="disabled">Disabled</option>
                      </select>
                    </div>
                    <div>
                      <label className="block font-semibold text-stone-700 mb-1">Secure Temp Password</label>
                      <input
                        type="text"
                        value={newFacultyForm.temporaryPassword}
                        onChange={(e) => setNewFacultyForm({ ...newFacultyForm, temporaryPassword: e.target.value })}
                        className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl font-mono"
                        required
                      />
                    </div>
                  </div>

                  <div className="pt-3 flex items-center justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => setShowAddFacultyModal(false)}
                      className="px-4 py-2 bg-stone-100 hover:bg-stone-200 text-stone-700 rounded-xl font-semibold cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="px-5 py-2 bg-stone-900 hover:bg-black text-white font-bold rounded-xl cursor-pointer"
                    >
                      Create Faculty Account
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {/* Faculty Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="bg-stone-50 text-stone-600 font-semibold border-b border-stone-200">
                  <th className="py-3 px-3">Faculty ID</th>
                  <th className="py-3 px-3">Name & Email</th>
                  <th className="py-3 px-3">Department</th>
                  <th className="py-3 px-3">Assigned Subjects</th>
                  <th className="py-3 px-3">Status</th>
                  <th className="py-3 px-3">Created By</th>
                  <th className="py-3 px-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {facultyList.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-stone-500">No faculty members found.</td>
                  </tr>
                ) : (
                  facultyList.map((fac) => (
                    <tr key={fac.id} className="hover:bg-stone-50/60">
                      <td className="py-3 px-3 font-mono font-bold text-stone-900">{fac.employeeId}</td>
                      <td className="py-3 px-3">
                        <div className="font-bold text-stone-900">{fac.name}</div>
                        <div className="text-[11px] text-stone-500">{fac.email}</div>
                      </td>
                      <td className="py-3 px-3 font-medium text-stone-700">{fac.department}</td>
                      <td className="py-3 px-3">
                        <div className="flex flex-wrap gap-1">
                          {fac.assignedSubjects.length === 0 ? (
                            <span className="text-[10px] text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">No subjects assigned</span>
                          ) : (
                            fac.assignedSubjects.map((sub: any, idx: number) => (
                              <span key={`${sub.subjectId || sub.subjectCode || 'sub'}-${idx}`} className="text-[10px] font-medium bg-stone-100 text-stone-800 px-2 py-0.5 rounded border border-stone-200">
                                {sub.subjectName} ({sub.className})
                              </span>
                            ))
                          )}
                        </div>
                      </td>
                      <td className="py-3 px-3">
                        <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                          fac.status === 'active' ? 'bg-emerald-100 text-emerald-800' :
                          fac.status === 'pending' ? 'bg-amber-100 text-amber-800' :
                          'bg-rose-100 text-rose-800'
                        }`}>
                          {fac.status}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-stone-600 text-[11px]">{fac.createdBy}</td>
                      <td className="py-3 px-3 text-right space-x-1">
                        <button
                          onClick={() => handleResetFacultySetup(fac.id)}
                          className="px-2.5 py-1 bg-stone-100 hover:bg-stone-200 text-stone-700 rounded-lg text-[11px] font-semibold cursor-pointer"
                          title="Reset Setup / Credentials"
                        >
                          Reset Setup
                        </button>
                        {fac.status === 'active' ? (
                          <button
                            onClick={() => handleUpdateFacultyStatus(fac.id, 'suspended')}
                            className="px-2.5 py-1 bg-rose-50 hover:bg-rose-100 text-rose-700 rounded-lg text-[11px] font-semibold cursor-pointer border border-rose-200"
                          >
                            Suspend
                          </button>
                        ) : (
                          <button
                            onClick={() => handleUpdateFacultyStatus(fac.id, 'active')}
                            className="px-2.5 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 rounded-lg text-[11px] font-semibold cursor-pointer border border-emerald-200"
                          >
                            Activate
                          </button>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB: REGISTRATION ACTIVITY */}
      {currentTab === 'registration_activity' && (
        <div className="bg-white p-6 rounded-2xl border border-stone-200 shadow-xs space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-stone-100">
            <div>
              <h2 className="text-base font-bold text-stone-900">User Registration Activity & Provenance</h2>
              <p className="text-xs text-stone-500">
                Shows all registered users, account types, verification status, and whether created via public self-registration or admin invitation.
              </p>
            </div>
            <button
              onClick={() => fetchTabData('registration_activity')}
              className="px-3 py-1.5 bg-stone-100 hover:bg-stone-200 rounded-lg text-xs font-semibold cursor-pointer"
            >
              Refresh
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="bg-stone-50 text-stone-600 font-semibold border-b border-stone-200">
                  <th className="py-2.5 px-3">Name & Email</th>
                  <th className="py-2.5 px-3">Role</th>
                  <th className="py-2.5 px-3">ID / Code</th>
                  <th className="py-2.5 px-3">Additional Info</th>
                  <th className="py-2.5 px-3">Status</th>
                  <th className="py-2.5 px-3">Registration Date</th>
                  <th className="py-2.5 px-3">Created By (Provenance)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {registrationActivity.map((reg, idx) => (
                  <tr key={`${reg.id || reg.email || 'reg'}-${idx}`} className="hover:bg-stone-50/60">
                    <td className="py-2.5 px-3">
                      <div className="font-bold text-stone-900">{reg.name}</div>
                      <div className="text-[11px] text-stone-500">{reg.email}</div>
                    </td>
                    <td className="py-2.5 px-3">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                        reg.role === 'admin' ? 'bg-purple-100 text-purple-800' :
                        reg.role === 'faculty' ? 'bg-blue-100 text-blue-800' :
                        'bg-emerald-100 text-emerald-800'
                      }`}>
                        {reg.role}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 font-mono font-semibold">{reg.identifier}</td>
                    <td className="py-2.5 px-3 text-stone-600">{reg.additionalInfo}</td>
                    <td className="py-2.5 px-3 font-medium capitalize">{reg.accountStatus}</td>
                    <td className="py-2.5 px-3 font-mono text-[11px]">{new Date(reg.registeredAt).toLocaleString()}</td>
                    <td className="py-2.5 px-3 font-semibold text-stone-800">{reg.createdBy}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 2: TIMETABLE MANAGEMENT */}
      {currentTab === 'timetable' && (
        <div className="bg-white p-6 rounded-2xl border border-stone-200 shadow-xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-stone-100">
            <div>
              <h2 className="text-base font-bold text-stone-900">College Master Timetable</h2>
              <p className="text-xs text-stone-500">
                Determines multi-class lecture schedules, faculty assignments, rooms, and periods.
              </p>
            </div>
            <span className="text-xs font-mono text-stone-600">
              Total Slots: <strong>{timetable.length}</strong>
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="bg-stone-50 text-stone-600 font-semibold border-b border-stone-200">
                  <th className="py-2.5 px-3">Day</th>
                  <th className="py-2.5 px-3">Time</th>
                  <th className="py-2.5 px-3">Class</th>
                  <th className="py-2.5 px-3">Subject</th>
                  <th className="py-2.5 px-3">Faculty</th>
                  <th className="py-2.5 px-3">Room / Type</th>
                  <th className="py-2.5 px-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {timetable.map((slot) => (
                  <tr key={slot.id} className="hover:bg-stone-50/70">
                    <td className="py-2.5 px-3 font-bold text-stone-900">{slot.day_of_week}</td>
                    <td className="py-2.5 px-3 font-mono text-stone-700">{slot.start_time} - {slot.end_time}</td>
                    <td className="py-2.5 px-3 font-semibold text-stone-800">{slot.className}</td>
                    <td className="py-2.5 px-3">
                      <div className="font-semibold text-stone-900">{slot.subjectName}</div>
                      <div className="text-[10px] text-stone-500 font-mono">{slot.subjectCode}</div>
                    </td>
                    <td className="py-2.5 px-3">
                      <span className="font-medium text-stone-800">{slot.facultyName}</span>
                      {slot.facultyShortCode && (
                        <span className="ml-1 text-[10px] font-mono px-1 bg-stone-100 rounded">
                          {slot.facultyShortCode}
                        </span>
                      )}
                    </td>
                    <td className="py-2.5 px-3 text-stone-600">
                      {slot.room} {slot.is_lab && <span className="text-[10px] font-bold text-amber-700">(Lab)</span>}
                    </td>
                    <td className="py-2.5 px-3 text-right">
                      <button
                        onClick={() => handleDeleteTimetableSlot(slot.id)}
                        className="text-stone-400 hover:text-rose-600 p-1 cursor-pointer"
                        title="Delete slot"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 3: CLASSROOMS & JOIN CODES */}
      {currentTab === 'classrooms' && (
        <div className="bg-white p-6 rounded-2xl border border-stone-200 shadow-xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-stone-100">
            <div>
              <h2 className="text-base font-bold text-stone-900">Classrooms & Secure Join Codes</h2>
              <p className="text-xs text-stone-500">
                Manage subject join codes, faculty owners, and cross-class enrollment overrides.
              </p>
            </div>
            <button
              onClick={() => setShowEnrollModal(true)}
              className="px-3.5 py-2 bg-stone-900 text-white text-xs font-bold rounded-xl flex items-center gap-1.5 cursor-pointer shadow-xs"
            >
              <UserPlus className="w-3.5 h-3.5 text-emerald-400" />
              <span>Cross-Class Enroll Override</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {classrooms.map((cr) => (
              <div key={cr.id} className="p-4 rounded-xl border border-stone-200 bg-stone-50/60 space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <span className="text-[10px] font-mono font-bold text-stone-500 bg-white px-2 py-0.5 rounded border border-stone-200">
                      {cr.subjectCode} · {cr.className}
                    </span>
                    <h3 className="text-sm font-bold text-stone-900 mt-1">{cr.subjectName}</h3>
                    <p className="text-xs text-stone-500">Prof. {cr.facultyName} ({cr.facultyShortCode})</p>
                  </div>
                  <span className="text-[10px] font-bold px-2 py-0.5 bg-emerald-100 text-emerald-800 rounded-full">
                    {cr.status}
                  </span>
                </div>

                <div className="bg-stone-900 text-white rounded-lg p-2.5 text-center flex items-center justify-between px-3">
                  <div className="text-left">
                    <span className="text-[9px] uppercase tracking-wider text-emerald-400 block">JOIN CODE</span>
                    <span className="text-base font-mono font-bold">{cr.joinCode}</span>
                  </div>
                  <button
                    onClick={() => handleCopyCode(cr.joinCode)}
                    className="p-1.5 bg-white/10 hover:bg-white/20 text-white rounded-md text-xs cursor-pointer"
                    title="Copy code"
                  >
                    {copiedCode === cr.joinCode ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  </button>
                </div>

                <div className="text-[11px] text-stone-500 flex justify-between pt-1 border-t border-stone-200">
                  <span>Enrolled: <strong>{cr.enrolledCount}</strong> students</span>
                  <span>AY: {cr.academicYear}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 4: SECURITY & ACTIVITY AUDIT LOGS */}
      {currentTab === 'audit_logs' && (
        <div className="bg-white p-6 rounded-2xl border border-stone-200 shadow-xs space-y-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pb-3 border-b border-stone-100">
            <div>
              <div className="flex items-center gap-2">
                <ShieldAlert className="w-5 h-5 text-rose-600" />
                <h2 className="text-base font-bold text-stone-900">Comprehensive System & Security Audit Logs</h2>
              </div>
              <p className="text-xs text-stone-500">
                Tracks manual attendance overrides, subject additions, student management actions, and security events capturing actor, action type, and timestamp.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => fetchTabData('audit_logs')}
                className="px-3 py-1.5 bg-stone-100 hover:bg-stone-200 rounded-lg text-xs font-semibold cursor-pointer"
              >
                Refresh
              </button>
            </div>
          </div>

          {/* Audit Category Filter Tabs */}
          <div className="flex flex-wrap items-center gap-1.5 pb-2">
            {[
              { id: 'all', label: 'All Audit Logs' },
              { id: 'attendance', label: 'Manual Attendance Overrides' },
              { id: 'subjects', label: 'Subject Additions & Edits' },
              { id: 'students', label: 'Student Management Actions' },
              { id: 'security', label: 'Security & Warnings' },
            ].map((f) => (
              <button
                key={f.id}
                onClick={() => setAuditFilter(f.id)}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                  auditFilter === f.id
                    ? 'bg-stone-900 text-white shadow-xs'
                    : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="bg-stone-50 text-stone-600 font-semibold border-b border-stone-200">
                  <th className="py-2.5 px-3">Timestamp</th>
                  <th className="py-2.5 px-3">Action Type (Event)</th>
                  <th className="py-2.5 px-3">Actor</th>
                  <th className="py-2.5 px-3">Role</th>
                  <th className="py-2.5 px-3">Details / Target</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100 font-mono text-[11px]">
                {auditLogs
                  .filter((log) => {
                    if (auditFilter === 'all') return true;
                    if (auditFilter === 'attendance') {
                      return log.action.includes('ATTENDANCE_OVERRIDE') || log.action.includes('MANUAL_ATTENDANCE');
                    }
                    if (auditFilter === 'subjects') {
                      return log.action.includes('SUBJECT');
                    }
                    if (auditFilter === 'students') {
                      return log.action.includes('STUDENT');
                    }
                    if (auditFilter === 'security') {
                      return log.action.includes('FAILED') || log.action.includes('UNAUTHORIZED') || log.action.includes('OUT_OF_RADIUS') || log.action.includes('RATE_LIMIT') || log.action.includes('PROXY');
                    }
                    return true;
                  })
                  .map((log, idx) => {
                    const isWarning =
                      log.action.includes('FAILED') ||
                      log.action.includes('UNAUTHORIZED') ||
                      log.action.includes('OUT_OF_RADIUS') ||
                      log.action.includes('RATE_LIMIT') ||
                      log.action.includes('PROXY');

                    const isOverrideOrAdd =
                      log.action.includes('OVERRIDE') ||
                      log.action.includes('CREATED') ||
                      log.action.includes('SUCCESS');

                    return (
                      <tr key={`${log.id || 'log'}-${idx}`} className={isWarning ? 'bg-rose-50/30' : 'hover:bg-stone-50/70'}>
                        <td className="py-2.5 px-3 text-stone-500 whitespace-nowrap">{new Date(log.timestamp).toLocaleString()}</td>
                        <td className="py-2.5 px-3 font-bold">
                          <span className={`px-2 py-0.5 rounded text-[10px] uppercase font-semibold ${
                            isWarning ? 'bg-rose-100 text-rose-800' :
                            isOverrideOrAdd ? 'bg-emerald-100 text-emerald-800' :
                            'bg-stone-100 text-stone-800'
                          }`}>
                            {log.action}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 text-stone-700 font-semibold">{log.actorName || log.actor_id || 'System'}</td>
                        <td className="py-2.5 px-3 uppercase text-[10px] text-stone-500 font-bold">{log.actor_role || 'SYSTEM'}</td>
                        <td className="py-2.5 px-3 text-stone-600 max-w-xs truncate">
                          {log.details ? JSON.stringify(log.details) : '—'}
                        </td>
                      </tr>
                    );
                  })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 5: LOCATION & RADIUS CONFIGURATION */}
      {currentTab === 'location' && (
        <div className="bg-white rounded-2xl border border-stone-200/80 p-6 shadow-xs max-w-2xl">
          <div className="flex items-center gap-2 mb-4">
            <MapPin className="w-5 h-5 text-amber-600" />
            <div>
              <h2 className="text-base font-bold text-stone-900">College Location & Radius Settings</h2>
              <p className="text-xs text-stone-500">Configure institutional geolocation center and allowable radius ranges (1m to 50m).</p>
            </div>
          </div>

          {settingsSuccess && (
            <div className="mb-4 p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-800 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              <span>{settingsSuccess}</span>
            </div>
          )}

          {settingsError && (
            <div className="mb-4 p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-800 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-rose-600" />
              <span>{settingsError}</span>
            </div>
          )}

          <form onSubmit={handleSaveSettings} className="space-y-4 text-xs">
            <div>
              <label className="block font-semibold text-stone-700 mb-1">Institution / College Name</label>
              <input
                type="text"
                required
                value={settingsForm.college_name}
                onChange={(e) => setSettingsForm({ ...settingsForm, college_name: e.target.value })}
                className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl font-medium text-stone-900 focus:outline-hidden focus:border-stone-900"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block font-semibold text-stone-700 mb-1">Official Latitude</label>
                <input
                  type="number"
                  step="0.0000001"
                  required
                  value={settingsForm.official_latitude}
                  onChange={(e) => setSettingsForm({ ...settingsForm, official_latitude: parseFloat(e.target.value) })}
                  className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl font-mono text-stone-900 focus:outline-hidden focus:border-stone-900"
                />
              </div>
              <div>
                <label className="block font-semibold text-stone-700 mb-1">Official Longitude</label>
                <input
                  type="number"
                  step="0.0000001"
                  required
                  value={settingsForm.official_longitude}
                  onChange={(e) => setSettingsForm({ ...settingsForm, official_longitude: parseFloat(e.target.value) })}
                  className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl font-mono text-stone-900 focus:outline-hidden focus:border-stone-900"
                />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="block font-semibold text-stone-700 mb-1">Min Radius (m)</label>
                <input
                  type="number"
                  min="1"
                  max="50"
                  required
                  value={settingsForm.min_radius}
                  onChange={(e) => setSettingsForm({ ...settingsForm, min_radius: parseInt(e.target.value, 10) })}
                  className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl font-mono text-stone-900"
                />
              </div>

              <div>
                <label className="block font-semibold text-stone-700 mb-1">Max Radius (m)</label>
                <input
                  type="number"
                  min="1"
                  max="50"
                  required
                  value={settingsForm.max_radius}
                  onChange={(e) => setSettingsForm({ ...settingsForm, max_radius: parseInt(e.target.value, 10) })}
                  className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl font-mono text-stone-900"
                />
              </div>

              <div>
                <label className="block font-semibold text-stone-700 mb-1">Default Radius (m)</label>
                <input
                  type="number"
                  min="1"
                  max="50"
                  required
                  value={settingsForm.default_radius}
                  onChange={(e) => setSettingsForm({ ...settingsForm, default_radius: parseInt(e.target.value, 10) })}
                  className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl font-mono font-bold text-emerald-800"
                />
              </div>
            </div>

            <div>
              <label className="block font-semibold text-stone-700 mb-1">Low Attendance Threshold (%)</label>
              <input
                type="number"
                min="50"
                max="90"
                required
                value={settingsForm.low_attendance_threshold}
                onChange={(e) => setSettingsForm({ ...settingsForm, low_attendance_threshold: parseInt(e.target.value, 10) })}
                className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl font-mono font-bold text-rose-700"
              />
            </div>

            {settingsForm.default_radius <= 3 && (
              <div className="p-3 bg-amber-50 border border-amber-300 rounded-xl text-xs text-amber-900 flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <span>
                  <strong>Small Radius Warning ({settingsForm.default_radius}m):</strong> Very small radius (1-3m) may cause false rejection because normal smartphone GPS accuracy typically ranges from 4m to 15m indoors.
                </span>
              </div>
            )}

            <div className="pt-2">
              <button
                type="submit"
                className="px-5 py-2.5 bg-stone-900 hover:bg-stone-800 text-white font-bold rounded-xl shadow-xs transition-colors cursor-pointer"
              >
                Save Settings
              </button>
            </div>
          </form>
        </div>
      )}

      {/* TAB 5B: LOCATION DIAGNOSTIC & TEST TOOL */}
      {currentTab === 'test_location' && (
        <AdminLocationTestTool
          collegeLat={settingsForm.official_latitude || 19.213805}
          collegeLng={settingsForm.official_longitude || 72.864810}
          collegeName={settingsForm.college_name || 'Thakur Shyamnarayan Degree College (TSDC), Kandivali (East)'}
          defaultRadius={settingsForm.default_radius || 10}
        />
      )}

      {/* TAB 6: CLASS & DIVISION MANAGEMENT */}
      {currentTab === 'classes' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-1 bg-white p-5 rounded-2xl border border-stone-200 shadow-xs">
            <h3 className="text-sm font-bold text-stone-900 mb-3">Add New Class & Division</h3>
            {classSuccess && <div className="mb-3 p-2 bg-emerald-50 text-emerald-800 text-xs rounded-lg">{classSuccess}</div>}
            <form onSubmit={handleCreateClass} className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-stone-700 mb-1">Course Name</label>
                <input
                  type="text"
                  placeholder="e.g. Master of Computer Applications"
                  required
                  value={newClassForm.courseName}
                  onChange={(e) => setNewClassForm({ ...newClassForm, courseName: e.target.value })}
                  className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl"
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-semibold text-stone-700 mb-1">Class Code</label>
                  <input
                    type="text"
                    placeholder="MCA"
                    required
                    value={newClassForm.className}
                    onChange={(e) => setNewClassForm({ ...newClassForm, className: e.target.value })}
                    className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl uppercase font-mono"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-stone-700 mb-1">Division</label>
                  <input
                    type="text"
                    placeholder="A"
                    required
                    value={newClassForm.division}
                    onChange={(e) => setNewClassForm({ ...newClassForm, division: e.target.value })}
                    className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl uppercase font-mono"
                  />
                </div>
              </div>
              <button type="submit" className="w-full py-2 bg-stone-900 text-white font-semibold rounded-xl cursor-pointer">
                Create Class
              </button>
            </form>
          </div>

          <div className="lg:col-span-2 bg-white p-5 rounded-2xl border border-stone-200 shadow-xs">
            <h3 className="text-sm font-bold text-stone-900 mb-3">Active Institutional Classes</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="bg-stone-50 text-stone-600 font-semibold border-b border-stone-200">
                    <th className="py-2.5 px-3">Class Identifier</th>
                    <th className="py-2.5 px-3">Full Course Name</th>
                    <th className="py-2.5 px-3">Academic Year</th>
                    <th className="py-2.5 px-3 text-right">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100">
                  {classes.map((c) => (
                    <tr key={c.id}>
                      <td className="py-2.5 px-3 font-bold font-mono text-stone-900">{c.class_name}.{c.division}</td>
                      <td className="py-2.5 px-3 text-stone-700">{c.course_name}</td>
                      <td className="py-2.5 px-3 font-mono text-stone-500">{c.academic_year}</td>
                      <td className="py-2.5 px-3 text-right">
                        <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 font-bold rounded text-[10px]">Active</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 7: SUBJECTS MAPPING */}
      {currentTab === 'subjects' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-1 bg-white p-5 rounded-2xl border border-stone-200 shadow-xs">
            <h3 className="text-sm font-bold text-stone-900 mb-3">Add New Subject</h3>
            {subjectSuccess && <div className="mb-3 p-2 bg-emerald-50 text-emerald-800 text-xs rounded-lg">{subjectSuccess}</div>}
            <form onSubmit={handleCreateSubject} className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-stone-700 mb-1">Subject Name</label>
                <input
                  type="text"
                  placeholder="e.g. Cloud Computing Architecture"
                  required
                  value={newSubjectForm.subjectName}
                  onChange={(e) => setNewSubjectForm({ ...newSubjectForm, subjectName: e.target.value })}
                  className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl"
                />
              </div>
              <div>
                <label className="block font-semibold text-stone-700 mb-1">Subject Code</label>
                <input
                  type="text"
                  placeholder="CS-605"
                  required
                  value={newSubjectForm.subjectCode}
                  onChange={(e) => setNewSubjectForm({ ...newSubjectForm, subjectCode: e.target.value })}
                  className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl uppercase font-mono"
                />
              </div>
              <div>
                <label className="block font-semibold text-stone-700 mb-1">Assign to Class</label>
                <select
                  value={newSubjectForm.classId}
                  onChange={(e) => setNewSubjectForm({ ...newSubjectForm, classId: e.target.value })}
                  className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl"
                >
                  {classes.map((c) => (
                    <option key={c.id} value={c.id}>{c.class_name}.{c.division} — {c.course_name}</option>
                  ))}
                </select>
              </div>
              <button type="submit" className="w-full py-2 bg-stone-900 text-white font-semibold rounded-xl cursor-pointer">
                Create Subject
              </button>
            </form>
          </div>

          <div className="lg:col-span-2 bg-white p-5 rounded-2xl border border-stone-200 shadow-xs">
            <h3 className="text-sm font-bold text-stone-900 mb-3">Institutional Subjects List</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="bg-stone-50 text-stone-600 font-semibold border-b border-stone-200">
                    <th className="py-2.5 px-3">Subject Code</th>
                    <th className="py-2.5 px-3">Subject Name</th>
                    <th className="py-2.5 px-3">Assigned Class</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100">
                  {subjects.map((s) => (
                    <tr key={s.id}>
                      <td className="py-2.5 px-3 font-mono font-bold text-stone-800">{s.subject_code}</td>
                      <td className="py-2.5 px-3 font-semibold text-stone-900">{s.subject_name}</td>
                      <td className="py-2.5 px-3 font-mono text-stone-600">{s.className}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 8: USER MANAGEMENT */}
      {currentTab === 'users' && (
        <div className="bg-white p-5 rounded-2xl border border-stone-200 shadow-xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-stone-100">
            <div>
              <h3 className="text-sm font-bold text-stone-900">Institutional Users Roster</h3>
              <p className="text-xs text-stone-500">View and create database accounts for Students, Teachers/Faculty, and Admins.</p>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-xs text-stone-500">Total Users: <strong className="font-mono">{users.length}</strong></span>
              <button
                onClick={() => {
                  setCreateUserMsg(null);
                  setShowCreateUserModal(true);
                }}
                className="px-3.5 py-2 bg-stone-900 hover:bg-stone-800 text-white text-xs font-bold rounded-xl flex items-center gap-1.5 cursor-pointer shadow-xs"
              >
                <UserPlus className="w-3.5 h-3.5 text-emerald-400" />
                <span>+ Create User / Faculty Account</span>
              </button>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="bg-stone-50 text-stone-600 font-semibold border-b border-stone-200">
                  <th className="py-2.5 px-3">Name</th>
                  <th className="py-2.5 px-3">Email</th>
                  <th className="py-2.5 px-3">Role</th>
                  <th className="py-2.5 px-3">Class / Info</th>
                  <th className="py-2.5 px-3">Status</th>
                  <th className="py-2.5 px-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {users.map((u) => (
                  <tr key={u.id} className="hover:bg-stone-50/70">
                    <td className="py-2.5 px-3 font-semibold text-stone-900">{u.name}</td>
                    <td className="py-2.5 px-3 font-mono text-stone-600">{u.email}</td>
                    <td className="py-2.5 px-3 uppercase font-bold text-[10px]">{u.role}</td>
                    <td className="py-2.5 px-3 text-stone-600">
                      {u.className ? `${u.className} (Roll ${u.rollNumber})` : u.department || '—'}
                    </td>
                    <td className="py-2.5 px-3">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        u.status === 'active' ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                      }`}>
                        {u.status}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-right">
                      <button
                        onClick={() => handleToggleUserStatus(u.id, u.status)}
                        className="text-[11px] font-semibold text-stone-700 hover:text-stone-900 underline cursor-pointer"
                      >
                        {u.status === 'active' ? 'Deactivate' : 'Activate'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 9: ATTENDANCE SESSIONS AUDIT */}
      {currentTab === 'sessions' && (
        <div className="bg-white p-5 rounded-2xl border border-stone-200 shadow-xs space-y-4">
          <h3 className="text-sm font-bold text-stone-900">Institutional Attendance Sessions Audit</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="bg-stone-50 text-stone-600 font-semibold border-b border-stone-200">
                  <th className="py-2.5 px-3">Date</th>
                  <th className="py-2.5 px-3">Class</th>
                  <th className="py-2.5 px-3">Subject</th>
                  <th className="py-2.5 px-3">Faculty</th>
                  <th className="py-2.5 px-3">Topic</th>
                  <th className="py-2.5 px-3">Present</th>
                  <th className="py-2.5 px-3 text-right">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {sessions.map((sess) => (
                  <tr key={sess.id}>
                    <td className="py-2.5 px-3 font-mono">{sess.date}</td>
                    <td className="py-2.5 px-3 font-semibold">{sess.className}</td>
                    <td className="py-2.5 px-3">{sess.subjectName}</td>
                    <td className="py-2.5 px-3">{sess.facultyName} ({sess.facultyShortCode})</td>
                    <td className="py-2.5 px-3 max-w-xs truncate">{sess.topic}</td>
                    <td className="py-2.5 px-3 font-mono font-bold text-emerald-800">{sess.presentCount} / {sess.totalEnrolled}</td>
                    <td className="py-2.5 px-3 text-right">
                      <span className="px-2 py-0.5 bg-stone-100 font-bold rounded text-[10px]">{sess.status}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 10: DISPATCHED OTP LOGS */}
      {currentTab === 'otp_logs' && (
        <div className="bg-white p-5 rounded-2xl border border-stone-200 shadow-xs space-y-4">
          <div className="flex justify-between items-center">
            <div>
              <h3 className="text-sm font-bold text-stone-900">Live Dispatched OTP Verification Mailbox</h3>
              <p className="text-xs text-stone-500">Security audit trail of generated OTPs with rendered HTML templates.</p>
            </div>
            <button
              onClick={() => fetchTabData('otp_logs')}
              className="px-3 py-1.5 bg-stone-100 hover:bg-stone-200 rounded-lg text-xs font-semibold cursor-pointer"
            >
              Refresh Logs
            </button>
          </div>

          <div className="space-y-3">
            {otpLogs.length === 0 ? (
              <p className="py-12 text-center text-xs text-stone-500">No OTP emails dispatched yet in this runtime session.</p>
            ) : (
              otpLogs.map((log, idx) => (
                <div key={`${log.id || 'otp'}-${idx}`} className="p-4 bg-stone-50 rounded-xl border border-stone-200 space-y-2 text-xs">
                  <div className="flex justify-between items-start">
                    <div>
                      <span className="font-semibold text-stone-900">To: {log.to}</span>
                      <p className="text-stone-500 text-[11px] font-mono">{log.subject}</p>
                    </div>
                    <span className="font-mono font-bold text-base tracking-widest text-emerald-800 bg-emerald-100 px-3 py-1 rounded-lg">
                      {log.otp}
                    </span>
                  </div>
                  <div className="text-[10px] text-stone-400 font-mono">Dispatched at: {log.sentAt}</div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

    </div>
  );
};
