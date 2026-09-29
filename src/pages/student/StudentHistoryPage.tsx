import React, { useState, useEffect } from 'react';
import { AttendanceHistoryItem } from '../../types.js';
import { ApiService } from '../../services/api.js';
import {
  Calendar,
  Filter,
  CheckCircle2,
  XCircle,
  MapPin,
  Camera,
  Search,
  RefreshCw,
  Eye,
  X,
} from 'lucide-react';

export const StudentHistoryPage: React.FC = () => {
  const [history, setHistory] = useState<AttendanceHistoryItem[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [selectedPhoto, setSelectedPhoto] = useState<string | null>(null);

  // Filters
  const [subjectFilter, setSubjectFilter] = useState<string>('ALL');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'PRESENT' | 'ABSENT'>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');

  const fetchHistory = async () => {
    setIsLoading(true);
    const res = await ApiService.getStudentHistory();
    setIsLoading(false);
    if (res.success && res.data) {
      setHistory(res.data);
    }
  };

  useEffect(() => {
    fetchHistory();
  }, []);

  const subjectsList = Array.from(new Set(history.map((h) => h.subjectName)));

  const filteredHistory = history.filter((item) => {
    if (subjectFilter !== 'ALL' && item.subjectName !== subjectFilter) return false;
    if (statusFilter !== 'ALL' && item.status !== statusFilter) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      const matchTopic = item.topic.toLowerCase().includes(q);
      const matchSub = item.subjectName.toLowerCase().includes(q);
      const matchDate = item.date.includes(q);
      if (!matchTopic && !matchSub && !matchDate) return false;
    }
    return true;
  });

  return (
    <div className="space-y-6 pb-12">
      
      {/* Evidence Photo Preview Modal */}
      {selectedPhoto && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/75 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-2xl border border-stone-200 overflow-hidden max-w-sm w-full shadow-2xl">
            <div className="bg-stone-900 text-white px-4 py-3 flex items-center justify-between">
              <span className="text-xs font-bold">Verified Attendance Photo</span>
              <button
                onClick={() => setSelectedPhoto(null)}
                className="p-1 text-stone-400 hover:text-white rounded cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-4 bg-stone-100 flex items-center justify-center">
              <img
                src={selectedPhoto}
                alt="Verification Snapshot"
                className="w-full rounded-xl border border-stone-300 shadow-xs"
              />
            </div>
            <div className="p-3 text-center text-stone-500 text-[11px]">
              Captured live at Thakur Shyamnarayan Degree College
            </div>
          </div>
        </div>
      )}

      {/* Page Header */}
      <div className="bg-white rounded-2xl border border-stone-200/80 p-5 sm:p-6 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-stone-900">
            Attendance History & Lecture Log
          </h1>
          <p className="text-xs text-stone-500 mt-0.5">
            Complete cryptographic audit trail of all lectures, topics taught, and verified attendance records.
          </p>
        </div>

        <button
          onClick={fetchHistory}
          className="px-3.5 py-2 text-xs font-semibold text-stone-700 bg-stone-100 hover:bg-stone-200 rounded-xl transition-colors flex items-center gap-1.5 cursor-pointer self-start sm:self-auto border border-stone-200"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>Refresh Records</span>
        </button>
      </div>

      {/* Filter Bar */}
      <div className="bg-white rounded-2xl border border-stone-200/80 p-4 shadow-xs flex flex-col md:flex-row items-center gap-3">
        {/* Search */}
        <div className="relative w-full md:w-64">
          <Search className="w-4 h-4 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search topic or date..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-2 bg-stone-50 border border-stone-200 rounded-xl text-xs text-stone-900 focus:outline-none focus:border-stone-900"
          />
        </div>

        {/* Subject Filter */}
        <div className="w-full md:w-auto flex items-center gap-2">
          <label className="text-xs text-stone-500 font-medium whitespace-nowrap">Subject:</label>
          <select
            value={subjectFilter}
            onChange={(e) => setSubjectFilter(e.target.value)}
            className="w-full md:w-auto px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl text-xs text-stone-900 focus:outline-none focus:border-stone-900 cursor-pointer"
          >
            <option value="ALL">All Subjects</option>
            {subjectsList.map((sub) => (
              <option key={sub} value={sub}>{sub}</option>
            ))}
          </select>
        </div>

        {/* Status Filter Segmented Button */}
        <div className="w-full md:w-auto md:ml-auto flex items-center gap-1 p-1 bg-stone-100 rounded-xl">
          <button
            onClick={() => setStatusFilter('ALL')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${
              statusFilter === 'ALL' ? 'bg-white text-stone-900 shadow-xs' : 'text-stone-600 hover:text-stone-900'
            }`}
          >
            All ({history.length})
          </button>
          <button
            onClick={() => setStatusFilter('PRESENT')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${
              statusFilter === 'PRESENT' ? 'bg-emerald-600 text-white shadow-xs' : 'text-stone-600 hover:text-stone-900'
            }`}
          >
            Present ({history.filter((h) => h.status === 'PRESENT').length})
          </button>
          <button
            onClick={() => setStatusFilter('ABSENT')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${
              statusFilter === 'ABSENT' ? 'bg-rose-600 text-white shadow-xs' : 'text-stone-600 hover:text-stone-900'
            }`}
          >
            Absent ({history.filter((h) => h.status === 'ABSENT').length})
          </button>
        </div>
      </div>

      {/* History Table */}
      <div className="bg-white rounded-2xl border border-stone-200/80 shadow-xs overflow-hidden">
        {isLoading ? (
          <div className="py-16 text-center text-xs text-stone-500 flex flex-col items-center">
            <RefreshCw className="w-6 h-6 animate-spin mb-2 text-stone-400" />
            <span>Loading attendance records...</span>
          </div>
        ) : filteredHistory.length === 0 ? (
          <div className="py-16 text-center text-stone-500 text-xs">
            No attendance records match your filter criteria.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-stone-50/80 border-b border-stone-200/80 text-stone-600 font-semibold uppercase tracking-wider text-[10px]">
                  <th className="py-3 px-4">Date & Time</th>
                  <th className="py-3 px-4">Subject</th>
                  <th className="py-3 px-4">Lecture Topic Taught</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Verified Distance</th>
                  <th className="py-3 px-4 text-right">Photo Evidence</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {filteredHistory.map((item) => (
                  <tr key={item.sessionId} className="hover:bg-stone-50/60 transition-colors">
                    <td className="py-3 px-4 whitespace-nowrap">
                      <div className="font-semibold text-stone-900">{item.date}</div>
                      <div className="text-[11px] text-stone-500 font-mono">{item.time}</div>
                    </td>

                    <td className="py-3 px-4">
                      <div className="font-semibold text-stone-900">{item.subjectName}</div>
                      <div className="text-[10px] text-stone-500 font-mono">{item.subjectCode}</div>
                    </td>

                    <td className="py-3 px-4 max-w-xs">
                      <div className="font-medium text-stone-800 line-clamp-2">
                        {item.topic}
                      </div>
                      <div className="text-[10px] text-stone-400 mt-0.5">
                        Faculty: {item.facultyName}
                      </div>
                    </td>

                    <td className="py-3 px-4 whitespace-nowrap">
                      {item.status === 'PRESENT' ? (
                        <span className="inline-flex items-center gap-1 font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-md text-[11px]">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                          <span>Present</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 font-bold text-rose-700 bg-rose-50 border border-rose-200 px-2 py-0.5 rounded-md text-[11px]">
                          <XCircle className="w-3.5 h-3.5 text-rose-600" />
                          <span>Absent</span>
                        </span>
                      )}
                    </td>

                    <td className="py-3 px-4 whitespace-nowrap">
                      {item.distance !== null ? (
                        <div>
                          <span className="font-mono font-bold text-stone-800 text-xs">
                            {item.distance} m
                          </span>
                          <span className="text-[10px] text-emerald-600 block font-medium">
                            ✓ Radius Verified
                          </span>
                        </div>
                      ) : (
                        <span className="text-stone-400 text-[11px]">—</span>
                      )}
                    </td>

                    <td className="py-3 px-4 text-right whitespace-nowrap">
                      {item.cameraImagePath ? (
                        <button
                          onClick={() => setSelectedPhoto(item.cameraImagePath)}
                          className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-semibold text-stone-700 bg-stone-100 hover:bg-stone-200 border border-stone-200 rounded-lg transition-colors cursor-pointer"
                        >
                          <Eye className="w-3.5 h-3.5 text-stone-600" />
                          <span>View Photo</span>
                        </button>
                      ) : (
                        <span className="text-stone-400 text-[11px]">N/A</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
