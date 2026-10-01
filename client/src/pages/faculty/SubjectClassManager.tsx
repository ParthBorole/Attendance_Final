import React, { useState, useEffect } from 'react';
import { ApiService } from '../../services/api.js';
import {
  BookOpen,
  School,
  Plus,
  Edit2,
  Trash2,
  RefreshCw,
  Check,
  X,
  AlertTriangle,
  Layers,
  Sparkles,
} from 'lucide-react';

interface SubjectClassManagerProps {
  initialTab?: 'subjects' | 'classes';
  onRefreshParent?: () => void;
}

export const SubjectClassManager: React.FC<SubjectClassManagerProps> = ({ initialTab = 'subjects', onRefreshParent }) => {
  const [subTab, setSubTab] = useState<'subjects' | 'classes'>(initialTab);
  const [classes, setClasses] = useState<any[]>([]);
  const [subjects, setSubjects] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [actionMessage, setActionMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    if (initialTab) {
      setSubTab(initialTab);
    }
  }, [initialTab]);

  // Subject Modals
  const [showSubjectModal, setShowSubjectModal] = useState<boolean>(false);
  const [editingSubject, setEditingSubject] = useState<any | null>(null);
  const [subName, setSubName] = useState<string>('');
  const [subCode, setSubCode] = useState<string>('');
  const [subClassId, setSubClassId] = useState<string>('');
  const [isSavingSubject, setIsSavingSubject] = useState<boolean>(false);

  // Class Modals
  const [showClassModal, setShowClassModal] = useState<boolean>(false);
  const [editingClass, setEditingClass] = useState<any | null>(null);
  const [courseName, setCourseName] = useState<string>('B.Sc. Computer Science');
  const [className, setClassName] = useState<string>('');
  const [division, setDivision] = useState<string>('A');
  const [academicYear, setAcademicYear] = useState<string>('2026-27');
  const [isSavingClass, setIsSavingClass] = useState<boolean>(false);

  // Delete Confirm Modal
  const [deleteTarget, setDeleteTarget] = useState<{ type: 'subject' | 'class'; id: string; title: string } | null>(null);
  const [isDeleting, setIsDeleting] = useState<boolean>(false);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const [clsRes, subRes] = await Promise.all([
        ApiService.getFacultyClasses(),
        ApiService.getFacultySubjects(),
      ]);

      if (clsRes.success && clsRes.data) {
        setClasses(clsRes.data);
        if (clsRes.data.length > 0 && !subClassId) {
          setSubClassId(clsRes.data[0].id);
        }
      }
      if (subRes.success && subRes.data) {
        setSubjects(subRes.data);
      }
    } catch (e) {
      console.error('Failed to fetch subjects/classes:', e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const openAddSubject = () => {
    setEditingSubject(null);
    setSubName('');
    setSubCode('');
    setSubClassId(classes[0]?.id || '');
    setShowSubjectModal(true);
  };

  const openEditSubject = (sub: any) => {
    setEditingSubject(sub);
    setSubName(sub.subject_name);
    setSubCode(sub.subject_code);
    setSubClassId(sub.class_id);
    setShowSubjectModal(true);
  };

  const handleSaveSubject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!subName.trim() || !subCode.trim() || !subClassId) {
      setActionMessage({ type: 'error', text: 'All fields are required.' });
      return;
    }

    setIsSavingSubject(true);
    setActionMessage(null);
    try {
      if (editingSubject) {
        const res = await ApiService.updateFacultySubject(editingSubject.id, {
          subject_name: subName,
          subject_code: subCode,
          class_id: subClassId,
        });
        if (res.success) {
          setActionMessage({ type: 'success', text: `Subject ${subName} updated successfully.` });
          setShowSubjectModal(false);
          fetchData();
          onRefreshParent?.();
        } else {
          setActionMessage({ type: 'error', text: res.message || 'Failed to update subject.' });
        }
      } else {
        const res = await ApiService.createFacultySubject({
          subject_name: subName,
          subject_code: subCode,
          class_id: subClassId,
        });
        if (res.success) {
          setActionMessage({ type: 'success', text: `Subject ${subName} created and assigned to you.` });
          setShowSubjectModal(false);
          fetchData();
          onRefreshParent?.();
        } else {
          setActionMessage({ type: 'error', text: res.message || 'Failed to create subject.' });
        }
      }
    } catch (err: any) {
      setActionMessage({ type: 'error', text: err.message || 'An error occurred.' });
    } finally {
      setIsSavingSubject(false);
    }
  };

  const openAddClass = () => {
    setEditingClass(null);
    setCourseName('B.Sc. Computer Science');
    setClassName('');
    setDivision('A');
    setAcademicYear('2026-27');
    setShowClassModal(true);
  };

  const openEditClass = (cls: any) => {
    setEditingClass(cls);
    setCourseName(cls.course_name);
    setClassName(cls.class_name);
    setDivision(cls.division);
    setAcademicYear(cls.academic_year);
    setShowClassModal(true);
  };

  const handleSaveClass = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!className.trim() || !division.trim()) {
      setActionMessage({ type: 'error', text: 'Class Name and Division are required.' });
      return;
    }

    setIsSavingClass(true);
    setActionMessage(null);
    try {
      if (editingClass) {
        const res = await ApiService.updateFacultyClass(editingClass.id, {
          course_name: courseName,
          class_name: className,
          division,
          academic_year: academicYear,
        });
        if (res.success) {
          setActionMessage({ type: 'success', text: `Class ${className}-${division} updated successfully.` });
          setShowClassModal(false);
          fetchData();
          onRefreshParent?.();
        } else {
          setActionMessage({ type: 'error', text: res.message || 'Failed to update class.' });
        }
      } else {
        const res = await ApiService.createFacultyClass({
          course_name: courseName,
          class_name: className,
          division,
          academic_year: academicYear,
        });
        if (res.success) {
          setActionMessage({ type: 'success', text: `Class ${className}-${division} created and added to your roster.` });
          setShowClassModal(false);
          fetchData();
          onRefreshParent?.();
        } else {
          setActionMessage({ type: 'error', text: res.message || 'Failed to create class.' });
        }
      }
    } catch (err: any) {
      setActionMessage({ type: 'error', text: err.message || 'An error occurred.' });
    } finally {
      setIsSavingClass(false);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return;
    setIsDeleting(true);
    setActionMessage(null);
    try {
      if (deleteTarget.type === 'subject') {
        const res = await ApiService.deleteFacultySubject(deleteTarget.id);
        if (res.success) {
          setActionMessage({ type: 'success', text: 'Subject deleted successfully.' });
          setDeleteTarget(null);
          fetchData();
          onRefreshParent?.();
        } else {
          setActionMessage({ type: 'error', text: res.message || 'Could not delete subject.' });
        }
      } else {
        const res = await ApiService.deleteFacultyClass(deleteTarget.id);
        if (res.success) {
          setActionMessage({ type: 'success', text: 'Class deleted successfully.' });
          setDeleteTarget(null);
          fetchData();
          onRefreshParent?.();
        } else {
          setActionMessage({ type: 'error', text: res.message || 'Could not delete class.' });
        }
      }
    } catch (err: any) {
      setActionMessage({ type: 'error', text: err.message || 'Failed to delete.' });
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner Alert */}
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

      {/* Header with Sub-tabs and Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white p-5 rounded-2xl border border-stone-200/80 shadow-xs">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <div className="w-8 h-8 rounded-lg bg-stone-900 text-emerald-400 flex items-center justify-center">
              <Layers className="w-4 h-4" />
            </div>
            <h2 className="text-base font-bold text-stone-900">Curriculum & Class Structure Management</h2>
          </div>
          <p className="text-xs text-stone-500">
            Create, modify, and manage your subjects, classes, and academic divisions directly.
          </p>
        </div>

        {/* Tab Toggle */}
        <div className="flex items-center gap-2">
          <div className="inline-flex bg-stone-100 p-1 rounded-xl border border-stone-200 text-xs font-semibold">
            <button
              onClick={() => setSubTab('subjects')}
              className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 cursor-pointer ${
                subTab === 'subjects' ? 'bg-white text-stone-900 shadow-xs' : 'text-stone-600 hover:text-stone-900'
              }`}
            >
              <BookOpen className="w-3.5 h-3.5 text-indigo-600" />
              <span>Subjects ({subjects.length})</span>
            </button>
            <button
              onClick={() => setSubTab('classes')}
              className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 cursor-pointer ${
                subTab === 'classes' ? 'bg-white text-stone-900 shadow-xs' : 'text-stone-600 hover:text-stone-900'
              }`}
            >
              <School className="w-3.5 h-3.5 text-emerald-600" />
              <span>Classes / Divisions ({classes.length})</span>
            </button>
          </div>

          {subTab === 'subjects' ? (
            <button
              onClick={openAddSubject}
              className="inline-flex items-center gap-1.5 px-3 py-2 bg-stone-900 hover:bg-stone-800 text-white rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer shrink-0"
            >
              <Plus className="w-3.5 h-3.5 text-emerald-400" />
              <span>Add Subject</span>
            </button>
          ) : (
            <button
              onClick={openAddClass}
              className="inline-flex items-center gap-1.5 px-3 py-2 bg-stone-900 hover:bg-stone-800 text-white rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer shrink-0"
            >
              <Plus className="w-3.5 h-3.5 text-emerald-400" />
              <span>Add Class / Div</span>
            </button>
          )}
        </div>
      </div>

      {/* Main Content View */}
      {isLoading ? (
        <div className="bg-white rounded-2xl border border-stone-200 p-12 text-center text-stone-500">
          <RefreshCw className="w-6 h-6 animate-spin mx-auto text-emerald-600 mb-2" />
          <p className="text-xs font-medium">Loading structure data...</p>
        </div>
      ) : subTab === 'subjects' ? (
        /* SUBJECTS TABLE */
        <div className="bg-white rounded-2xl border border-stone-200/80 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-stone-50/80 border-b border-stone-200/80 text-stone-500 uppercase tracking-wider font-semibold">
                <tr>
                  <th className="py-3 px-4">Subject Name</th>
                  <th className="py-3 px-4">Code</th>
                  <th className="py-3 px-4">Target Class</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100 font-medium">
                {subjects.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="py-8 text-center text-stone-400">
                      No subjects found. Click &quot;Add Subject&quot; to create your first subject.
                    </td>
                  </tr>
                ) : (
                  subjects.map((sub) => {
                    const cls = classes.find((c) => c.id === sub.class_id);
                    return (
                      <tr key={sub.id} className="hover:bg-stone-50/60 transition-colors">
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-2">
                            <div className="w-7 h-7 rounded-lg bg-indigo-50 text-indigo-700 font-bold flex items-center justify-center shrink-0">
                              <BookOpen className="w-3.5 h-3.5" />
                            </div>
                            <span className="font-bold text-stone-900">{sub.subject_name}</span>
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <span className="font-mono bg-stone-100 text-stone-700 px-2 py-0.5 rounded border border-stone-200">
                            {sub.subject_code}
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
                            {cls ? `${cls.class_name}.${cls.division}` : 'Class'} ({cls?.course_name || 'B.Sc. CS'})
                          </span>
                        </td>
                        <td className="py-3 px-4 text-right">
                          <div className="inline-flex items-center gap-1">
                            <button
                              onClick={() => openEditSubject(sub)}
                              title="Edit Subject"
                              className="p-1.5 text-stone-600 hover:text-stone-900 hover:bg-stone-100 rounded-lg transition-colors cursor-pointer"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => setDeleteTarget({ type: 'subject', id: sub.id, title: sub.subject_name })}
                              title="Delete Subject"
                              className="p-1.5 text-stone-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        /* CLASSES TABLE */
        <div className="bg-white rounded-2xl border border-stone-200/80 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-stone-50/80 border-b border-stone-200/80 text-stone-500 uppercase tracking-wider font-semibold">
                <tr>
                  <th className="py-3 px-4">Class & Division</th>
                  <th className="py-3 px-4">Course Program</th>
                  <th className="py-3 px-4">Academic Year</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100 font-medium">
                {classes.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-stone-400">
                      No classes found. Click &quot;Add Class / Div&quot; to configure your classes.
                    </td>
                  </tr>
                ) : (
                  classes.map((cls) => (
                    <tr key={cls.id} className="hover:bg-stone-50/60 transition-colors">
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded-lg bg-emerald-50 text-emerald-700 font-bold flex items-center justify-center shrink-0">
                            <School className="w-3.5 h-3.5" />
                          </div>
                          <span className="font-bold text-stone-900 text-sm">
                            {cls.class_name} - Division {cls.division}
                          </span>
                        </div>
                      </td>
                      <td className="py-3 px-4 text-stone-600">{cls.course_name}</td>
                      <td className="py-3 px-4 font-mono text-stone-600">{cls.academic_year}</td>
                      <td className="py-3 px-4">
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                          Active
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <div className="inline-flex items-center gap-1">
                          <button
                            onClick={() => openEditClass(cls)}
                            title="Edit Class"
                            className="p-1.5 text-stone-600 hover:text-stone-900 hover:bg-stone-100 rounded-lg transition-colors cursor-pointer"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => setDeleteTarget({ type: 'class', id: cls.id, title: `${cls.class_name}-${cls.division}` })}
                            title="Delete Class"
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

      {/* ADD / EDIT SUBJECT MODAL */}
      {showSubjectModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/60 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-2xl border border-stone-200 shadow-2xl max-w-md w-full p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-stone-100">
              <div className="flex items-center gap-2">
                <BookOpen className="w-5 h-5 text-indigo-600" />
                <h3 className="font-bold text-stone-900">
                  {editingSubject ? 'Edit Subject' : 'Add New Subject'}
                </h3>
              </div>
              <button onClick={() => setShowSubjectModal(false)} className="text-stone-400 hover:text-stone-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveSubject} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-stone-700 mb-1">Subject Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Artificial Intelligence"
                  value={subName}
                  onChange={(e) => setSubName(e.target.value)}
                  className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl text-xs font-medium focus:outline-none focus:border-stone-900"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-stone-700 mb-1">Subject Code *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. USCS501 or AI"
                  value={subCode}
                  onChange={(e) => setSubCode(e.target.value)}
                  className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl text-xs font-medium focus:outline-none focus:border-stone-900 font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-stone-700 mb-1">Class / Division *</label>
                <select
                  value={subClassId}
                  onChange={(e) => setSubClassId(e.target.value)}
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
                  onClick={() => setShowSubjectModal(false)}
                  className="px-4 py-2 text-xs font-semibold text-stone-600 hover:bg-stone-100 rounded-xl transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSavingSubject}
                  className="px-4 py-2 bg-stone-900 hover:bg-stone-800 text-white rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  {isSavingSubject && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                  <span>{editingSubject ? 'Save Changes' : 'Create Subject'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ADD / EDIT CLASS MODAL */}
      {showClassModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/60 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-2xl border border-stone-200 shadow-2xl max-w-md w-full p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-stone-100">
              <div className="flex items-center gap-2">
                <School className="w-5 h-5 text-emerald-600" />
                <h3 className="font-bold text-stone-900">
                  {editingClass ? 'Edit Class / Division' : 'Add New Class / Division'}
                </h3>
              </div>
              <button onClick={() => setShowClassModal(false)} className="text-stone-400 hover:text-stone-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveClass} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-stone-700 mb-1">Course / Program *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. B.Sc. Computer Science"
                  value={courseName}
                  onChange={(e) => setCourseName(e.target.value)}
                  className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl text-xs font-medium focus:outline-none focus:border-stone-900"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-stone-700 mb-1">Class Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. TYCS"
                    value={className}
                    onChange={(e) => setClassName(e.target.value)}
                    className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl text-xs font-medium focus:outline-none focus:border-stone-900 uppercase"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-stone-700 mb-1">Division *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. A"
                    value={division}
                    onChange={(e) => setDivision(e.target.value)}
                    className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl text-xs font-medium focus:outline-none focus:border-stone-900 uppercase"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-stone-700 mb-1">Academic Year</label>
                <input
                  type="text"
                  placeholder="2026-27"
                  value={academicYear}
                  onChange={(e) => setAcademicYear(e.target.value)}
                  className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl text-xs font-medium focus:outline-none focus:border-stone-900"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-stone-100">
                <button
                  type="button"
                  onClick={() => setShowClassModal(false)}
                  className="px-4 py-2 text-xs font-semibold text-stone-600 hover:bg-stone-100 rounded-xl transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSavingClass}
                  className="px-4 py-2 bg-stone-900 hover:bg-stone-800 text-white rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  {isSavingClass && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                  <span>{editingClass ? 'Save Changes' : 'Create Class'}</span>
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
              <h3 className="font-bold text-stone-900 text-sm">Delete {deleteTarget.type === 'subject' ? 'Subject' : 'Class'}?</h3>
              <p className="text-xs text-stone-500 mt-1">
                Are you sure you want to remove <strong>{deleteTarget.title}</strong>? This action cannot be undone.
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
                <span>Yes, Delete</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
