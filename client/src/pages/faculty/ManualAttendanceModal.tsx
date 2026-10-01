import React, { useState, useEffect } from 'react';
import { ApiService } from '../../services/api.js';
import {
  X,
  Check,
  CheckCircle2,
  XCircle,
  Lock,
  Unlock,
  AlertTriangle,
  RefreshCw,
  Calendar,
  Clock,
  BookOpen,
  School,
  FileSpreadsheet,
  Search,
  Sparkles,
} from 'lucide-react';

interface ManualAttendanceModalProps {
  existingSessionId?: string | null;
  initialClassId?: string;
  initialSubjectId?: string;
  onClose: () => void;
  onSuccess?: () => void;
}

export const ManualAttendanceModal: React.FC<ManualAttendanceModalProps> = ({
  existingSessionId,
  initialClassId,
  initialSubjectId,
  onClose,
  onSuccess,
}) => {
  const [classes, setClasses] = useState<any[]>([]);
  const [selectedClassId, setSelectedClassId] = useState<string>(initialClassId || '');
  const [subjects, setSubjects] = useState<any[]>([]);
  const [selectedSubjectId, setSelectedSubjectId] = useState<string>(initialSubjectId || '');

  // Session fields
  const [lectureTopic, setLectureTopic] = useState<string>('');
  const [lectureNumber, setLectureNumber] = useState<string>('1');
  const [sessionDate, setSessionDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [startTime, setStartTime] = useState<string>('09:00 AM');
  const [endTime, setEndTime] = useState<string>('10:00 AM');
  const [isLocked, setIsLocked] = useState<boolean>(false);

  // Student Attendance Sheet
  const [students, setStudents] = useState<any[]>([]);
  const [attendanceMap, setAttendanceMap] = useState<Record<string, 'PRESENT' | 'ABSENT'>>({});
  const [notesMap, setNotesMap] = useState<Record<string, string>>({});
  const [studentSearch, setStudentSearch] = useState<string>('');

  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [isTogglingLock, setIsTogglingLock] = useState<boolean>(false);
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Load existing session or fresh setup
  useEffect(() => {
    const initialize = async () => {
      setIsLoading(true);
      try {
        const [clsRes, subRes] = await Promise.all([
          ApiService.getFacultyClasses(),
          ApiService.getFacultySubjects(),
        ]);

        if (clsRes.success && clsRes.data) {
          setClasses(clsRes.data);
          if (!selectedClassId && clsRes.data.length > 0) {
            setSelectedClassId(clsRes.data[0].id);
          }
        }

        if (subRes.success && subRes.data) {
          setSubjects(subRes.data);
          if (!selectedSubjectId && subRes.data.length > 0) {
            setSelectedSubjectId(subRes.data[0].id);
          }
        }

        if (existingSessionId) {
          // Fetch existing sheet
          const sheetRes = await ApiService.getSessionAttendanceSheet(existingSessionId);
          if (sheetRes.success && sheetRes.data) {
            const s = sheetRes.data.session;
            setSelectedClassId(s.classId);
            setSelectedSubjectId(s.subjectId);
            setLectureTopic(s.lectureTopic || '');
            setLectureNumber(s.lectureNumber ? String(s.lectureNumber) : '1');
            setSessionDate(s.sessionDate || new Date().toISOString().split('T')[0]);
            setStartTime(s.startTime || '09:00 AM');
            setEndTime(s.endTime || '10:00 AM');
            setIsLocked(Boolean(s.isLocked));

            const stdList = sheetRes.data.students || [];
            setStudents(stdList);

            const attState: Record<string, 'PRESENT' | 'ABSENT'> = {};
            const noteState: Record<string, string> = {};
            stdList.forEach((st: any) => {
              attState[st.studentId] = st.status === 'PRESENT' ? 'PRESENT' : 'ABSENT';
            });
            setAttendanceMap(attState);
            setNotesMap(noteState);
          }
        }
      } catch (e) {
        console.error('Failed to initialize attendance sheet:', e);
      } finally {
        setIsLoading(false);
      }
    };

    initialize();
  }, [existingSessionId]);

  // When class changes in new session mode, load students
  useEffect(() => {
    if (existingSessionId || !selectedClassId) return;

    const loadClassStudents = async () => {
      try {
        const res = await ApiService.getFacultyStudentsManage(selectedClassId);
        if (res.success && res.data) {
          setStudents(res.data);
          // Default all to PRESENT
          const initialMap: Record<string, 'PRESENT' | 'ABSENT'> = {};
          res.data.forEach((s: any) => {
            initialMap[s.id] = 'PRESENT';
          });
          setAttendanceMap(initialMap);
        }
      } catch (e) {
        console.error('Failed to load class students:', e);
      }
    };

    loadClassStudents();
  }, [selectedClassId, existingSessionId]);

  const toggleStudent = (studentId: string) => {
    if (isLocked) {
      setStatusMessage({
        type: 'error',
        text: 'This session is locked against changes. Unlock it first to modify attendance.',
      });
      return;
    }
    setAttendanceMap((prev) => ({
      ...prev,
      [studentId]: prev[studentId] === 'PRESENT' ? 'ABSENT' : 'PRESENT',
    }));
  };

  const markAll = (status: 'PRESENT' | 'ABSENT') => {
    if (isLocked) {
      setStatusMessage({
        type: 'error',
        text: 'This session is locked. Unlock it first to modify attendance.',
      });
      return;
    }
    const updated: Record<string, 'PRESENT' | 'ABSENT'> = {};
    students.forEach((s) => {
      const id = s.studentId || s.id;
      updated[id] = status;
    });
    setAttendanceMap(updated);
  };

  const handleToggleLock = async () => {
    if (!existingSessionId) {
      setIsLocked(!isLocked);
      return;
    }

    setIsTogglingLock(true);
    setStatusMessage(null);
    try {
      const nextLock = !isLocked;
      const res = await ApiService.toggleSessionLock(existingSessionId, nextLock);
      if (res.success) {
        setIsLocked(nextLock);
        setStatusMessage({
          type: 'success',
          text: nextLock ? 'Session locked. No further modifications permitted.' : 'Session unlocked for editing.',
        });
        onSuccess?.();
      } else {
        setStatusMessage({ type: 'error', text: res.message || 'Could not update lock state.' });
      }
    } catch (err: any) {
      setStatusMessage({ type: 'error', text: err.message || 'Lock toggle failed.' });
    } finally {
      setIsTogglingLock(false);
    }
  };

  const handleSaveAttendance = async () => {
    if (!selectedClassId || !selectedSubjectId || !lectureTopic.trim()) {
      setStatusMessage({ type: 'error', text: 'Class, Subject, and Lecture Topic are required.' });
      return;
    }

    if (students.length === 0) {
      setStatusMessage({ type: 'error', text: 'No students enrolled in this class to mark.' });
      return;
    }

    setIsSaving(true);
    setStatusMessage(null);
    try {
      const attendances = students.map((s) => {
        const sId = s.studentId || s.id;
        return {
          studentId: sId,
          status: attendanceMap[sId] || 'ABSENT',
          notes: notesMap[sId] || '',
        };
      });

      const res = await ApiService.recordManualAttendance({
        existingSessionId: existingSessionId || undefined,
        classId: selectedClassId,
        subjectId: selectedSubjectId,
        lectureTopic,
        lectureNumber,
        sessionDate,
        startTime,
        endTime,
        attendances,
        lockSession: isLocked,
      });

      if (res.success) {
        setStatusMessage({ type: 'success', text: res.message || 'Attendance saved successfully!' });
        setTimeout(() => {
          onSuccess?.();
          onClose();
        }, 1200);
      } else {
        setStatusMessage({ type: 'error', text: res.message || 'Failed to save attendance.' });
      }
    } catch (err: any) {
      setStatusMessage({ type: 'error', text: err.message || 'An error occurred while saving.' });
    } finally {
      setIsSaving(false);
    }
  };

  const presentCount = Object.values(attendanceMap).filter((st) => st === 'PRESENT').length;
  const absentCount = students.length - presentCount;
  const attendanceRate = students.length > 0 ? Math.round((presentCount / students.length) * 100) : 0;

  const filteredStudents = students.filter((s) => {
    if (!studentSearch.trim()) return true;
    const q = studentSearch.toLowerCase();
    const name = (s.name || '').toLowerCase();
    const roll = String(s.rollNumber || '').toLowerCase();
    return name.includes(q) || roll.includes(q);
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-stone-900/75 backdrop-blur-xs overflow-y-auto animate-in fade-in">
      <div className="bg-white rounded-2xl border border-stone-200 shadow-2xl max-w-4xl w-full overflow-hidden my-6 flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="bg-stone-900 text-white px-6 py-4 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-stone-800 border border-stone-700 flex items-center justify-center text-emerald-400">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold tracking-tight">
                {existingSessionId ? 'Lecture Attendance Sheet' : 'Take Manual Lecture Attendance'}
              </h2>
              <p className="text-xs text-stone-400">
                {existingSessionId ? 'Review or modify attendance linked to lecture' : 'Direct teacher roll-call with lock protection'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-stone-400 hover:text-white hover:bg-stone-800 rounded-xl transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Status Message */}
        {statusMessage && (
          <div
            className={`px-6 py-3 border-b flex items-center justify-between text-xs font-semibold shrink-0 ${
              statusMessage.type === 'success'
                ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                : 'bg-red-50 border-red-200 text-red-900'
            }`}
          >
            <div className="flex items-center gap-2">
              {statusMessage.type === 'success' ? (
                <Check className="w-4 h-4 text-emerald-600" />
              ) : (
                <AlertTriangle className="w-4 h-4 text-red-600" />
              )}
              <span>{statusMessage.text}</span>
            </div>
            <button onClick={() => setStatusMessage(null)}>
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Scrollable Content */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1">
          {isLoading ? (
            <div className="py-16 text-center text-stone-500">
              <RefreshCw className="w-6 h-6 animate-spin mx-auto text-emerald-600 mb-2" />
              <p className="text-xs font-medium">Loading lecture details...</p>
            </div>
          ) : (
            <>
              {/* Lecture Metadata Configuration Panel */}
              <div className="bg-stone-50 p-4 rounded-2xl border border-stone-200 space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 text-xs">
                  {/* Class Selection */}
                  <div>
                    <label className="block font-bold text-stone-700 mb-1">Class / Division *</label>
                    <select
                      disabled={!!existingSessionId}
                      value={selectedClassId}
                      onChange={(e) => setSelectedClassId(e.target.value)}
                      className="w-full px-3 py-2 bg-white border border-stone-200 rounded-xl font-medium focus:outline-none focus:border-stone-900 disabled:bg-stone-100"
                    >
                      {classes.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.class_name} - Div {c.division}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Subject Selection */}
                  <div>
                    <label className="block font-bold text-stone-700 mb-1">Subject *</label>
                    <select
                      disabled={!!existingSessionId}
                      value={selectedSubjectId}
                      onChange={(e) => setSelectedSubjectId(e.target.value)}
                      className="w-full px-3 py-2 bg-white border border-stone-200 rounded-xl font-medium focus:outline-none focus:border-stone-900 disabled:bg-stone-100"
                    >
                      {subjects.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.subject_name} ({s.subject_code})
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Lecture Number */}
                  <div>
                    <label className="block font-bold text-stone-700 mb-1">Lecture Number *</label>
                    <input
                      type="text"
                      placeholder="e.g. 1"
                      value={lectureNumber}
                      onChange={(e) => setLectureNumber(e.target.value)}
                      className="w-full px-3 py-2 bg-white border border-stone-200 rounded-xl font-medium font-mono focus:outline-none focus:border-stone-900"
                    />
                  </div>

                  {/* Date */}
                  <div>
                    <label className="block font-bold text-stone-700 mb-1">Lecture Date *</label>
                    <input
                      type="date"
                      value={sessionDate}
                      onChange={(e) => setSessionDate(e.target.value)}
                      className="w-full px-3 py-2 bg-white border border-stone-200 rounded-xl font-medium focus:outline-none focus:border-stone-900"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                  {/* Topic */}
                  <div className="sm:col-span-2">
                    <label className="block font-bold text-stone-700 mb-1">Lecture Topic / Syllabus Covered *</label>
                    <input
                      type="text"
                      placeholder="e.g. Unit 3: Graph Search & A* Algorithm"
                      value={lectureTopic}
                      onChange={(e) => setLectureTopic(e.target.value)}
                      className="w-full px-3 py-2 bg-white border border-stone-200 rounded-xl font-medium focus:outline-none focus:border-stone-900"
                    />
                  </div>

                  {/* Lock Status Toggle Button */}
                  <div className="flex flex-col justify-end">
                    <label className="block font-bold text-stone-700 mb-1">Session Security</label>
                    <button
                      type="button"
                      onClick={handleToggleLock}
                      disabled={isTogglingLock}
                      className={`w-full py-2 px-3 rounded-xl border text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                        isLocked
                          ? 'bg-amber-500 border-amber-600 text-white shadow-xs'
                          : 'bg-white border-stone-200 text-stone-700 hover:bg-stone-100'
                      }`}
                    >
                      {isTogglingLock ? (
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      ) : isLocked ? (
                        <Lock className="w-3.5 h-3.5" />
                      ) : (
                        <Unlock className="w-3.5 h-3.5 text-stone-400" />
                      )}
                      <span>{isLocked ? 'Locked (Protected)' : 'Unlocked (Editable)'}</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* Tally & Quick Batch Toggles */}
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 bg-white p-3.5 rounded-xl border border-stone-200">
                <div className="flex items-center gap-4 text-xs font-bold">
                  <div className="flex items-center gap-1.5 text-stone-700">
                    <span>Enrolled:</span>
                    <span className="font-mono bg-stone-100 px-2 py-0.5 rounded text-stone-900">
                      {students.length}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5 text-emerald-700">
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Present:</span>
                    <span className="font-mono bg-emerald-50 px-2 py-0.5 rounded text-emerald-900">
                      {presentCount}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5 text-red-700">
                    <XCircle className="w-4 h-4" />
                    <span>Absent:</span>
                    <span className="font-mono bg-red-50 px-2 py-0.5 rounded text-red-900">
                      {absentCount}
                    </span>
                  </div>
                  <div className="hidden md:flex items-center gap-1.5 text-indigo-700">
                    <span>Rate:</span>
                    <span className="font-mono bg-indigo-50 px-2 py-0.5 rounded text-indigo-900">
                      {attendanceRate}%
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    disabled={isLocked}
                    onClick={() => markAll('PRESENT')}
                    className="px-2.5 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 rounded-lg text-xs font-bold transition-all disabled:opacity-50 cursor-pointer"
                  >
                    Mark All Present
                  </button>
                  <button
                    type="button"
                    disabled={isLocked}
                    onClick={() => markAll('ABSENT')}
                    className="px-2.5 py-1.5 bg-red-50 hover:bg-red-100 text-red-800 border border-red-200 rounded-lg text-xs font-bold transition-all disabled:opacity-50 cursor-pointer"
                  >
                    Mark All Absent
                  </button>
                </div>
              </div>

              {/* Student Filter Search */}
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Filter student list by roll number or name..."
                  value={studentSearch}
                  onChange={(e) => setStudentSearch(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 bg-stone-50 border border-stone-200 rounded-xl text-xs font-medium text-stone-900 focus:outline-none focus:border-stone-900"
                />
              </div>

              {/* Student Roster Sheet */}
              <div className="border border-stone-200 rounded-xl overflow-hidden shadow-xs">
                <div className="max-h-72 overflow-y-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-stone-50 border-b border-stone-200 text-stone-500 font-semibold sticky top-0 z-10">
                      <tr>
                        <th className="py-2.5 px-3">Roll No</th>
                        <th className="py-2.5 px-3">Student Name</th>
                        <th className="py-2.5 px-3 text-center">Status</th>
                        <th className="py-2.5 px-3">Remarks / Notes</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-stone-100 font-medium">
                      {filteredStudents.length === 0 ? (
                        <tr>
                          <td colSpan={4} className="py-8 text-center text-stone-400">
                            No students enrolled in this class yet.
                          </td>
                        </tr>
                      ) : (
                        filteredStudents.map((std) => {
                          const sId = std.studentId || std.id;
                          const currentStatus = attendanceMap[sId] || 'ABSENT';
                          const isPresent = currentStatus === 'PRESENT';

                          return (
                            <tr key={sId} className="hover:bg-stone-50/60 transition-colors">
                              <td className="py-2 px-3 font-mono font-bold text-stone-900">
                                {std.rollNumber}
                              </td>
                              <td className="py-2 px-3">
                                <div className="flex flex-col">
                                  <span className="font-bold text-stone-900">{std.name}</span>
                                  <span className="text-[10px] text-stone-400 font-mono">{std.email}</span>
                                </div>
                              </td>
                              <td className="py-2 px-3 text-center">
                                <button
                                  type="button"
                                  disabled={isLocked}
                                  onClick={() => toggleStudent(sId)}
                                  className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer inline-flex items-center gap-1.5 disabled:opacity-50 ${
                                    isPresent
                                      ? 'bg-emerald-600 text-white shadow-xs'
                                      : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
                                  }`}
                                >
                                  {isPresent ? (
                                    <>
                                      <CheckCircle2 className="w-3.5 h-3.5" />
                                      <span>PRESENT</span>
                                    </>
                                  ) : (
                                    <>
                                      <XCircle className="w-3.5 h-3.5 text-stone-400" />
                                      <span>ABSENT</span>
                                    </>
                                  )}
                                </button>
                              </td>
                              <td className="py-2 px-3">
                                <input
                                  type="text"
                                  disabled={isLocked}
                                  placeholder="e.g. Medical leave, Late"
                                  value={notesMap[sId] || ''}
                                  onChange={(e) => setNotesMap({ ...notesMap, [sId]: e.target.value })}
                                  className="w-full px-2 py-1 bg-stone-50 border border-stone-200 rounded text-[11px] focus:outline-none focus:border-stone-900 disabled:bg-stone-100"
                                />
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}
        </div>

        {/* Footer with Actions */}
        <div className="bg-stone-50 px-6 py-4 border-t border-stone-200 flex items-center justify-between shrink-0">
          <div className="text-xs text-stone-500 flex items-center gap-1.5">
            {isLocked ? (
              <span className="flex items-center gap-1 text-amber-700 font-semibold">
                <Lock className="w-3.5 h-3.5" />
                Session Locked: Submissions & modifications disabled.
              </span>
            ) : (
              <span>Review list and click &quot;Save Attendance Sheet&quot; to commit changes.</span>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-stone-600 hover:bg-stone-200/60 rounded-xl transition-colors cursor-pointer"
            >
              Close
            </button>
            <button
              type="button"
              disabled={isSaving || isLocked}
              onClick={handleSaveAttendance}
              className="px-5 py-2 bg-stone-900 hover:bg-stone-800 text-white rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50 shadow-xs"
            >
              {isSaving && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
              <span>Save Attendance Sheet</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
