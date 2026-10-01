import React, { useState, useEffect } from 'react';
import { ApiService } from '../../services/api.js';
import {
  Users,
  Plus,
  Search,
  Edit2,
  Trash2,
  RefreshCw,
  Check,
  X,
  AlertTriangle,
  GraduationCap,
  Mail,
  School,
  ArrowRightLeft,
} from 'lucide-react';

interface StudentManagerProps {
  onSelectStudent?: (studentId: string) => void;
}

export const StudentManager: React.FC<StudentManagerProps> = ({ onSelectStudent }) => {
  const [students, setStudents] = useState<any[]>([]);
  const [classes, setClasses] = useState<any[]>([]);
  const [selectedClassId, setSelectedClassId] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [actionMessage, setActionMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Add / Edit Modal
  const [showModal, setShowModal] = useState<boolean>(false);
  const [editingStudent, setEditingStudent] = useState<any | null>(null);
  const [name, setName] = useState<string>('');
  const [email, setEmail] = useState<string>('');
  const [rollNumber, setRollNumber] = useState<string>('');
  const [studentId, setStudentId] = useState<string>('');
  const [classId, setClassId] = useState<string>('');
  const [division, setDivision] = useState<string>('A');
  const [isSaving, setIsSaving] = useState<boolean>(false);

  // Delete Confirm
  const [deleteTarget, setDeleteTarget] = useState<any | null>(null);
  const [isDeleting, setIsDeleting] = useState<boolean>(false);

  const fetchStudents = async () => {
    setIsLoading(true);
    try {
      const [stdRes, clsRes] = await Promise.all([
        ApiService.getFacultyStudentsManage(selectedClassId === 'all' ? undefined : selectedClassId),
        ApiService.getFacultyClasses(),
      ]);

      if (stdRes.success && stdRes.data) {
        setStudents(stdRes.data);
      }
      if (clsRes.success && clsRes.data) {
        setClasses(clsRes.data);
        if (clsRes.data.length > 0 && !classId) {
          setClassId(clsRes.data[0].id);
        }
      }
    } catch (e) {
      console.error('Failed to load students:', e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchStudents();
  }, [selectedClassId]);

  const openAddStudent = () => {
    setEditingStudent(null);
    setName('');
    setEmail('');
    setRollNumber('');
    setStudentId(`STU-${Math.floor(1000 + Math.random() * 9000)}`);
    setClassId(classes[0]?.id || '');
    setDivision('A');
    setShowModal(true);
  };

  const openEditStudent = (std: any) => {
    setEditingStudent(std);
    setName(std.name);
    setEmail(std.email);
    setRollNumber(std.rollNumber);
    setStudentId(std.studentId);
    setClassId(std.classId);
    setDivision(std.division || 'A');
    setShowModal(true);
  };

  const handleSaveStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !email.trim() || !rollNumber.trim() || !studentId.trim() || !classId) {
      setActionMessage({ type: 'error', text: 'All student details are required.' });
      return;
    }

    setIsSaving(true);
    setActionMessage(null);
    try {
      if (editingStudent) {
        const res = await ApiService.updateFacultyStudent(editingStudent.id, {
          name,
          email,
          rollNumber,
          studentId,
          classId,
          division,
        });
        if (res.success) {
          setActionMessage({ type: 'success', text: `Student ${name} updated successfully.` });
          setShowModal(false);
          fetchStudents();
        } else {
          setActionMessage({ type: 'error', text: res.message || 'Could not update student.' });
        }
      } else {
        const res = await ApiService.createFacultyStudent({
          name,
          email,
          rollNumber,
          studentId,
          classId,
          division,
        });
        if (res.success) {
          setActionMessage({ type: 'success', text: `Student ${name} (Roll: ${rollNumber}) enrolled successfully.` });
          setShowModal(false);
          fetchStudents();
        } else {
          setActionMessage({ type: 'error', text: res.message || 'Could not create student.' });
        }
      }
    } catch (err: any) {
      setActionMessage({ type: 'error', text: err.message || 'An error occurred.' });
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return;
    setIsDeleting(true);
    setActionMessage(null);
    try {
      const res = await ApiService.deleteFacultyStudent(deleteTarget.id);
      if (res.success) {
        setActionMessage({ type: 'success', text: `Student ${deleteTarget.name} removed successfully.` });
        setDeleteTarget(null);
        fetchStudents();
      } else {
        setActionMessage({ type: 'error', text: res.message || 'Failed to delete student.' });
      }
    } catch (err: any) {
      setActionMessage({ type: 'error', text: err.message || 'Error deleting student.' });
    } finally {
      setIsDeleting(false);
    }
  };

  const filteredStudents = students.filter((s) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      s.name.toLowerCase().includes(q) ||
      s.rollNumber.toLowerCase().includes(q) ||
      s.studentId.toLowerCase().includes(q) ||
      s.email.toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-6">
      {/* Alert Banner */}
      {actionMessage && (
        <div
          className={`p-3.5 rounded-xl border flex items-center justify-between text-xs sm:text-sm animate-in fade-in ${
            actionMessage.type === 'success'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
              : 'bg-red-50 border-red-200 text-red-900'
          }`}
        >
          <div className="flex items-center gap-2">
            {actionMessage.type === 'success' ? (
              <Check className="w-4 h-4 text-emerald-600 shrink-0" />
            ) : (
              <AlertTriangle className="w-4 h-4 text-red-600 shrink-0" />
            )}
            <span>{actionMessage.text}</span>
          </div>
          <button onClick={() => setActionMessage(null)} className="p-1 hover:opacity-75">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Header and Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white p-5 rounded-2xl border border-stone-200/80 shadow-xs">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <div className="w-8 h-8 rounded-lg bg-stone-900 text-emerald-400 flex items-center justify-center">
              <Users className="w-4 h-4" />
            </div>
            <h2 className="text-base font-bold text-stone-900">Student Enrollment & Directory</h2>
          </div>
          <p className="text-xs text-stone-500">
            Manually add, edit, or remove students and assign them to academic classes and divisions.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* Class Filter */}
          <select
            value={selectedClassId}
            onChange={(e) => setSelectedClassId(e.target.value)}
            className="px-3 py-2 bg-stone-100 border border-stone-200 rounded-xl text-xs font-bold text-stone-700 focus:outline-none"
          >
            <option value="all">All Classes ({students.length})</option>
            {classes.map((c) => (
              <option key={c.id} value={c.id}>
                {c.class_name} - Div {c.division}
              </option>
            ))}
          </select>

          <button
            onClick={openAddStudent}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-stone-900 hover:bg-stone-800 text-white rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer shrink-0"
          >
            <Plus className="w-3.5 h-3.5 text-emerald-400" />
            <span>Add Student</span>
          </button>
        </div>
      </div>

      {/* Search Bar */}
      <div className="relative">
        <Search className="w-4 h-4 text-stone-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
        <input
          type="text"
          placeholder="Search by student name, roll number, or student ID..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full pl-10 pr-4 py-2.5 bg-white border border-stone-200 rounded-xl text-xs font-medium text-stone-900 placeholder:text-stone-400 focus:outline-none focus:border-stone-900 shadow-xs"
        />
      </div>

      {/* Students Table */}
      {isLoading ? (
        <div className="bg-white rounded-2xl border border-stone-200 p-12 text-center text-stone-500">
          <RefreshCw className="w-6 h-6 animate-spin mx-auto text-emerald-600 mb-2" />
          <p className="text-xs font-medium">Loading enrolled students...</p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-stone-200/80 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-stone-50/80 border-b border-stone-200/80 text-stone-500 uppercase tracking-wider font-semibold">
                <tr>
                  <th className="py-3 px-4">Roll No</th>
                  <th className="py-3 px-4">Student Name & Email</th>
                  <th className="py-3 px-4">Student ID</th>
                  <th className="py-3 px-4">Class & Division</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100 font-medium">
                {filteredStudents.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-stone-400">
                      No students found matching your criteria.
                    </td>
                  </tr>
                ) : (
                  filteredStudents.map((std) => (
                    <tr key={std.id} className="hover:bg-stone-50/60 transition-colors">
                      <td className="py-3 px-4">
                        <span className="inline-block px-2.5 py-1 bg-stone-100 text-stone-900 font-mono font-bold text-xs rounded-lg border border-stone-200">
                          {std.rollNumber}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex flex-col">
                          <button
                            type="button"
                            onClick={() => onSelectStudent?.(std.id)}
                            className="font-bold text-stone-900 hover:text-emerald-700 hover:underline text-left cursor-pointer"
                          >
                            {std.name}
                          </button>
                          <span className="text-[11px] text-stone-500 font-mono">{std.email}</span>
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <span className="font-mono text-stone-600">{std.studentId}</span>
                      </td>
                      <td className="py-3 px-4">
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-indigo-50 text-indigo-800 border border-indigo-200">
                          {std.className}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <div className="inline-flex items-center gap-1">
                          <button
                            onClick={() => openEditStudent(std)}
                            title="Edit Student"
                            className="p-1.5 text-stone-600 hover:text-stone-900 hover:bg-stone-100 rounded-lg transition-colors cursor-pointer"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => setDeleteTarget(std)}
                            title="Delete Student"
                            className="p-1.5 text-stone-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ADD / EDIT STUDENT MODAL */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/60 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-2xl border border-stone-200 shadow-2xl max-w-md w-full p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-stone-100">
              <div className="flex items-center gap-2">
                <Users className="w-5 h-5 text-emerald-600" />
                <h3 className="font-bold text-stone-900">
                  {editingStudent ? 'Edit Student Details' : 'Enroll New Student'}
                </h3>
              </div>
              <button onClick={() => setShowModal(false)} className="text-stone-400 hover:text-stone-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveStudent} className="space-y-3.5">
              <div>
                <label className="block text-xs font-bold text-stone-700 mb-1">Full Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Rahul Sharma"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl text-xs font-medium focus:outline-none focus:border-stone-900"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-stone-700 mb-1">College Email Address *</label>
                <input
                  type="email"
                  required
                  placeholder="e.g. rahul@tsdc.edu.in"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl text-xs font-medium focus:outline-none focus:border-stone-900"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-stone-700 mb-1">Roll Number *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. 101"
                    value={rollNumber}
                    onChange={(e) => setRollNumber(e.target.value)}
                    className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl text-xs font-medium focus:outline-none focus:border-stone-900 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-stone-700 mb-1">Student ID Code *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. STU-1001"
                    value={studentId}
                    onChange={(e) => setStudentId(e.target.value)}
                    className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl text-xs font-medium focus:outline-none focus:border-stone-900 font-mono uppercase"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-stone-700 mb-1">Assign to Class *</label>
                <select
                  value={classId}
                  onChange={(e) => {
                    setClassId(e.target.value);
                    const selected = classes.find((c) => c.id === e.target.value);
                    if (selected) setDivision(selected.division);
                  }}
                  className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl text-xs font-medium focus:outline-none focus:border-stone-900"
                >
                  {classes.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.class_name} - Division {c.division} ({c.course_name})
                    </option>
                  ))}
                </select>
              </div>



              <div className="flex items-center justify-end gap-2 pt-2 border-t border-stone-100">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 text-xs font-semibold text-stone-600 hover:bg-stone-100 rounded-xl transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="px-4 py-2 bg-stone-900 hover:bg-stone-800 text-white rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  {isSaving && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                  <span>{editingStudent ? 'Save Changes' : 'Enroll Student'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* DELETE CONFIRMATION MODAL */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/60 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-2xl border border-stone-200 shadow-2xl max-w-sm w-full p-6 space-y-4">
            <div className="w-10 h-10 rounded-xl bg-red-50 text-red-600 flex items-center justify-center mx-auto">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div className="text-center">
              <h3 className="font-bold text-stone-900 text-sm">Remove Student?</h3>
              <p className="text-xs text-stone-500 mt-1">
                Are you sure you want to remove <strong>{deleteTarget.name}</strong> (Roll: {deleteTarget.rollNumber})?
              </p>
            </div>
            <div className="flex items-center justify-center gap-2 pt-2">
              <button
                type="button"
                onClick={() => setDeleteTarget(null)}
                className="px-4 py-2 text-xs font-semibold text-stone-600 hover:bg-stone-100 rounded-xl transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isDeleting}
                onClick={handleDeleteConfirm}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer"
              >
                {isDeleting && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                <span>Yes, Remove</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
