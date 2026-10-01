import React, { useState, useEffect } from 'react';
import { ApiService } from '../../services/api.js';
import {
  FileSpreadsheet,
  Download,
  Printer,
  Calendar,
  Filter,
  Search,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  BookOpen,
  School,
  User,
  Lock,
  Unlock,
  Eye,
} from 'lucide-react';

interface AttendanceReportViewProps {
  onOpenSessionSheet?: (sessionId: string) => void;
  onOpenStudentDetail?: (studentId: string) => void;
}

export const AttendanceReportView: React.FC<AttendanceReportViewProps> = ({
  onOpenSessionSheet,
  onOpenStudentDetail,
}) => {
  const [classes, setClasses] = useState<any[]>([]);
  const [subjects, setSubjects] = useState<any[]>([]);
  const [students, setStudents] = useState<any[]>([]);

  // Filter States
  const [selectedClassId, setSelectedClassId] = useState<string>('');
  const [selectedSubjectId, setSelectedSubjectId] = useState<string>('');
  const [selectedStudentId, setSelectedStudentId] = useState<string>('');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [searchStudent, setSearchStudent] = useState<string>('');

  // Report Data
  const [reportData, setReportData] = useState<any | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Initialize Filter Options
  useEffect(() => {
    const loadDropdowns = async () => {
      try {
        const [clsRes, subRes, stdRes] = await Promise.all([
          ApiService.getFacultyClasses(),
          ApiService.getFacultySubjects(),
          ApiService.getFacultyStudentsManage(),
        ]);

        if (clsRes.success && clsRes.data) setClasses(clsRes.data);
        if (subRes.success && subRes.data) setSubjects(subRes.data);
        if (stdRes.success && stdRes.data) setStudents(stdRes.data);
      } catch (e) {
        console.error('Failed to load filter dropdowns:', e);
      }
    };
    loadDropdowns();
  }, []);

  // Fetch Report Data based on active filters
  const fetchReport = async () => {
    setIsLoading(true);
    try {
      const res = await ApiService.getFacultyReports({
        classId: selectedClassId || undefined,
        subjectId: selectedSubjectId || undefined,
        studentId: selectedStudentId || undefined,
        startDate: startDate || undefined,
        endDate: endDate || undefined,
      });

      if (res.success && res.data) {
        setReportData(res.data);
      }
    } catch (e) {
      console.error('Failed to generate report:', e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchReport();
  }, [selectedClassId, selectedSubjectId, selectedStudentId, startDate, endDate]);

  const handleExportCSV = () => {
    if (!reportData || !reportData.students || reportData.students.length === 0) return;

    const headers = ['Roll Number', 'Student Name', 'Email', 'Class', 'Total Lectures', 'Attended', 'Absent', 'Percentage (%)', 'Status'];
    const rows = reportData.students.map((s: any) => [
      s.rollNumber,
      `"${s.name}"`,
      s.email,
      `"${s.className}"`,
      s.totalLectures,
      s.attendedCount,
      s.absentCount,
      `${s.percentage}%`,
      s.isDefaulter ? 'DEFAULTER (<75%)' : 'REGULAR',
    ]);

    const csvContent = [headers.join(','), ...rows.map((e: any[]) => e.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `TSDC_Attendance_Report_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handlePrint = () => {
    window.print();
  };

  const filteredStudentRows = (reportData?.students || []).filter((s: any) => {
    if (!searchStudent.trim()) return true;
    const q = searchStudent.toLowerCase();
    return s.name.toLowerCase().includes(q) || String(s.rollNumber).toLowerCase().includes(q);
  });

  return (
    <div className="space-y-6">
      {/* Header and Filter Controls */}
      <div className="bg-white p-5 rounded-2xl border border-stone-200/80 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-3 border-b border-stone-100">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <div className="w-8 h-8 rounded-lg bg-stone-900 text-emerald-400 flex items-center justify-center">
                <FileSpreadsheet className="w-4 h-4" />
              </div>
              <h2 className="text-base font-bold text-stone-900">Attendance Intelligence & Reports</h2>
            </div>
            <p className="text-xs text-stone-500">
              Generate detailed attendance statistics with dynamic multi-parameter filtering and export capabilities.
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={handlePrint}
              className="inline-flex items-center gap-1.5 px-3 py-2 bg-stone-100 hover:bg-stone-200 text-stone-800 rounded-xl text-xs font-bold transition-all cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print</span>
            </button>

            <button
              onClick={handleExportCSV}
              disabled={!reportData || reportData?.students?.length === 0}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-stone-900 hover:bg-stone-800 text-white rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer disabled:opacity-50"
            >
              <Download className="w-3.5 h-3.5 text-emerald-400" />
              <span>Export CSV</span>
            </button>
          </div>
        </div>

        {/* Dynamic Filters Bar */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-3 text-xs">
          {/* Class Filter */}
          <div>
            <label className="block font-bold text-stone-700 mb-1">Filter by Class</label>
            <select
              value={selectedClassId}
              onChange={(e) => setSelectedClassId(e.target.value)}
              className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl font-medium focus:outline-none focus:border-stone-900"
            >
              <option value="">All Classes</option>
              {classes.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.class_name} - Div {c.division}
                </option>
              ))}
            </select>
          </div>

          {/* Subject Filter */}
          <div>
            <label className="block font-bold text-stone-700 mb-1">Filter by Subject</label>
            <select
              value={selectedSubjectId}
              onChange={(e) => setSelectedSubjectId(e.target.value)}
              className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl font-medium focus:outline-none focus:border-stone-900"
            >
              <option value="">All Subjects</option>
              {subjects.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.subject_name} ({s.subject_code})
                </option>
              ))}
            </select>
          </div>

          {/* Student Filter */}
          <div>
            <label className="block font-bold text-stone-700 mb-1">Filter by Student</label>
            <select
              value={selectedStudentId}
              onChange={(e) => setSelectedStudentId(e.target.value)}
              className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl font-medium focus:outline-none focus:border-stone-900"
            >
              <option value="">All Students</option>
              {students.map((st) => (
                <option key={st.id} value={st.id}>
                  Roll {st.rollNumber} - {st.name}
                </option>
              ))}
            </select>
          </div>

          {/* Start Date */}
          <div>
            <label className="block font-bold text-stone-700 mb-1">From Date</label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl font-medium focus:outline-none focus:border-stone-900"
            />
          </div>

          {/* End Date */}
          <div>
            <label className="block font-bold text-stone-700 mb-1">To Date</label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl font-medium focus:outline-none focus:border-stone-900"
            />
          </div>
        </div>
      </div>

      {/* KPI Summary Cards */}
      {reportData?.summary && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="bg-white p-4 rounded-2xl border border-stone-200/80 shadow-xs">
            <span className="text-[11px] font-bold text-stone-400 uppercase tracking-wider">Total Lectures</span>
            <div className="text-2xl font-black text-stone-900 mt-1">{reportData.summary.totalLectures}</div>
            <span className="text-[11px] text-stone-500">Conducted Sessions</span>
          </div>

          <div className="bg-white p-4 rounded-2xl border border-stone-200/80 shadow-xs">
            <span className="text-[11px] font-bold text-stone-400 uppercase tracking-wider">Total Students</span>
            <div className="text-2xl font-black text-stone-900 mt-1">{reportData.summary.totalStudents}</div>
            <span className="text-[11px] text-stone-500">In Selected Filter</span>
          </div>

          <div className="bg-white p-4 rounded-2xl border border-stone-200/80 shadow-xs">
            <span className="text-[11px] font-bold text-stone-400 uppercase tracking-wider">Average Attendance</span>
            <div className="text-2xl font-black text-emerald-700 mt-1">{reportData.summary.averageAttendanceRate}%</div>
            <span className="text-[11px] text-stone-500">Class Overall Average</span>
          </div>

          <div className="bg-white p-4 rounded-2xl border border-stone-200/80 shadow-xs">
            <span className="text-[11px] font-bold text-stone-400 uppercase tracking-wider">Defaulters (&lt;75%)</span>
            <div className="text-2xl font-black text-red-600 mt-1">{reportData.summary.defaultersCount}</div>
            <span className="text-[11px] text-stone-500">Needs Attendance Action</span>
          </div>
        </div>
      )}

      {/* Student Roster Report Table */}
      <div className="bg-white rounded-2xl border border-stone-200/80 shadow-xs overflow-hidden">
        <div className="p-4 border-b border-stone-100 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <h3 className="text-sm font-bold text-stone-900">Student Attendance Breakdown</h3>
          <div className="relative w-full sm:w-64">
            <Search className="w-3.5 h-3.5 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search in table..."
              value={searchStudent}
              onChange={(e) => setSearchStudent(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 bg-stone-50 border border-stone-200 rounded-xl text-xs font-medium focus:outline-none focus:border-stone-900"
            />
          </div>
        </div>

        {isLoading ? (
          <div className="p-12 text-center text-stone-500">
            <RefreshCw className="w-6 h-6 animate-spin mx-auto text-emerald-600 mb-2" />
            <p className="text-xs font-medium">Computing report metrics...</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-stone-50 text-stone-500 font-semibold border-b border-stone-200">
                <tr>
                  <th className="py-3 px-4">Roll</th>
                  <th className="py-3 px-4">Student Name</th>
                  <th className="py-3 px-4">Class</th>
                  <th className="py-3 px-4 text-center">Lectures</th>
                  <th className="py-3 px-4 text-center">Attended</th>
                  <th className="py-3 px-4 text-center">Absent</th>
                  <th className="py-3 px-4">Percentage</th>
                  <th className="py-3 px-4 text-center">Status</th>
                  <th className="py-3 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100 font-medium">
                {filteredStudentRows.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="py-8 text-center text-stone-400">
                      No attendance data found for the selected filter parameters.
                    </td>
                  </tr>
                ) : (
                  filteredStudentRows.map((s: any) => (
                    <tr key={s.studentId} className="hover:bg-stone-50/60 transition-colors">
                      <td className="py-3 px-4 font-mono font-bold text-stone-900">{s.rollNumber}</td>
                      <td className="py-3 px-4">
                        <div className="flex flex-col">
                          <span className="font-bold text-stone-900">{s.name}</span>
                          <span className="text-[10px] text-stone-400 font-mono">{s.email}</span>
                        </div>
                      </td>
                      <td className="py-3 px-4 text-stone-600">{s.className}</td>
                      <td className="py-3 px-4 text-center font-mono">{s.totalLectures}</td>
                      <td className="py-3 px-4 text-center font-mono text-emerald-700 font-bold">{s.attendedCount}</td>
                      <td className="py-3 px-4 text-center font-mono text-red-600">{s.absentCount}</td>
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2">
                          <div className="w-16 bg-stone-200 rounded-full h-1.5 overflow-hidden">
                            <div
                              className={`h-full rounded-full ${s.isDefaulter ? 'bg-red-500' : 'bg-emerald-500'}`}
                              style={{ width: `${Math.min(100, s.percentage)}%` }}
                            />
                          </div>
                          <span className="font-mono font-bold text-stone-900">{s.percentage}%</span>
                        </div>
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span
                          className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            s.isDefaulter
                              ? 'bg-red-50 text-red-700 border border-red-200'
                              : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                          }`}
                        >
                          {s.isDefaulter ? 'DEFAULTER' : 'REGULAR'}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <button
                          type="button"
                          onClick={() => onOpenStudentDetail?.(s.studentId)}
                          className="px-2.5 py-1 text-stone-700 hover:text-stone-900 bg-stone-100 hover:bg-stone-200 rounded-lg text-xs font-semibold cursor-pointer transition-colors"
                        >
                          View Detail
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Lectures Conducted List */}
      {reportData?.lectures && reportData.lectures.length > 0 && (
        <div className="bg-white rounded-2xl border border-stone-200/80 shadow-xs overflow-hidden">
          <div className="p-4 border-b border-stone-100">
            <h3 className="text-sm font-bold text-stone-900">Lectures Conducted ({reportData.lectures.length})</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-stone-50 text-stone-500 font-semibold border-b border-stone-200">
                <tr>
                  <th className="py-3 px-4">Date & Time</th>
                  <th className="py-3 px-4">Lecture #</th>
                  <th className="py-3 px-4">Subject & Class</th>
                  <th className="py-3 px-4">Topic Covered</th>
                  <th className="py-3 px-4 text-center">Mode</th>
                  <th className="py-3 px-4 text-center">Attendees</th>
                  <th className="py-3 px-4 text-center">Security</th>
                  <th className="py-3 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100 font-medium">
                {reportData.lectures.map((l: any) => (
                  <tr key={l.id} className="hover:bg-stone-50/60 transition-colors">
                    <td className="py-3 px-4">
                      <div className="flex flex-col">
                        <span className="font-bold text-stone-900">{l.date}</span>
                        <span className="text-[10px] text-stone-500">{l.time}</span>
                      </div>
                    </td>
                    <td className="py-3 px-4 font-mono font-bold text-stone-700">
                      {l.lectureNumber ? `Lec #${l.lectureNumber}` : '—'}
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex flex-col">
                        <span className="font-bold text-stone-900">{l.subjectName}</span>
                        <span className="text-[10px] text-stone-500">{l.className}</span>
                      </div>
                    </td>
                    <td className="py-3 px-4 text-stone-700 max-w-[200px] truncate">{l.topic}</td>
                    <td className="py-3 px-4 text-center">
                      <span className="inline-block px-2 py-0.5 rounded text-[10px] font-bold bg-stone-100 text-stone-700 border border-stone-200">
                        {l.attendanceMode === 'MANUAL' ? 'Manual' : 'Smart GPS'}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-center font-mono font-bold text-emerald-700">
                      {l.presentCount}
                    </td>
                    <td className="py-3 px-4 text-center">
                      {l.isLocked ? (
                        <span className="inline-flex items-center gap-1 text-amber-700 font-bold text-[10px] bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                          <Lock className="w-3 h-3" /> Locked
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-stone-500 text-[10px] bg-stone-50 px-2 py-0.5 rounded border border-stone-200">
                          <Unlock className="w-3 h-3 text-stone-400" /> Open
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <button
                        type="button"
                        onClick={() => onOpenSessionSheet?.(l.id)}
                        className="px-2.5 py-1 text-stone-700 hover:text-stone-900 bg-stone-100 hover:bg-stone-200 rounded-lg text-xs font-semibold cursor-pointer transition-colors"
                      >
                        View Sheet
                      </button>
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
