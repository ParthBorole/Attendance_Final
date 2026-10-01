import React, { useState, useEffect } from 'react';
import { ApiService } from '../../services/api.js';
import {
  ShieldAlert,
  Search,
  RefreshCw,
  Lock,
  Unlock,
  CheckCircle2,
  AlertTriangle,
  Clock,
  User,
  Filter,
} from 'lucide-react';

export const FacultyAuditLogsView: React.FC = () => {
  const [logs, setLogs] = useState<any[]>([]);
  const [search, setSearch] = useState<string>('');
  const [actionFilter, setActionFilter] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const fetchLogs = async () => {
    setIsLoading(true);
    try {
      const res = await ApiService.getFacultyAuditLogs({
        search: search || undefined,
        action: actionFilter || undefined,
        limit: 150,
      });

      if (res.success && res.data) {
        setLogs(res.data);
      }
    } catch (e) {
      console.error('Failed to load audit logs:', e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, [actionFilter]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchLogs();
  };

  return (
    <div className="space-y-6">
      {/* Header and Filter Controls */}
      <div className="bg-white p-5 rounded-2xl border border-stone-200/80 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-3 border-b border-stone-100">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <div className="w-8 h-8 rounded-lg bg-stone-900 text-amber-400 flex items-center justify-center">
                <ShieldAlert className="w-4 h-4" />
              </div>
              <h2 className="text-base font-bold text-stone-900">Attendance Audit Trail</h2>
            </div>
            <p className="text-xs text-stone-500">
              Immutable forensic log tracking who created, verified, modified, or locked attendance records and when.
            </p>
          </div>

          <button
            onClick={fetchLogs}
            className="inline-flex items-center gap-1.5 px-3 py-2 bg-stone-100 hover:bg-stone-200 text-stone-800 rounded-xl text-xs font-bold transition-all cursor-pointer shrink-0"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Refresh Logs</span>
          </button>
        </div>

        {/* Filter Toolbar */}
        <div className="flex flex-col sm:flex-row gap-3">
          <form onSubmit={handleSearchSubmit} className="relative flex-1">
            <Search className="w-3.5 h-3.5 text-stone-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search audit trail by actor, topic, or keyword..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-stone-50 border border-stone-200 rounded-xl text-xs font-medium text-stone-900 focus:outline-none focus:border-stone-900"
            />
          </form>

          <select
            value={actionFilter}
            onChange={(e) => setActionFilter(e.target.value)}
            className="px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl text-xs font-bold text-stone-700 focus:outline-none"
          >
            <option value="">All Action Types</option>
            <option value="ATTENDANCE">Attendance Submissions / Overrides</option>
            <option value="SESSION">Session Start / Stop / Locks</option>
            <option value="STUDENT">Student Management</option>
            <option value="SUBJECT">Subject Management</option>
            <option value="CLASS">Class Management</option>
          </select>
        </div>
      </div>

      {/* Audit Log Table */}
      <div className="bg-white rounded-2xl border border-stone-200/80 shadow-xs overflow-hidden">
        {isLoading ? (
          <div className="p-12 text-center text-stone-500">
            <RefreshCw className="w-6 h-6 animate-spin mx-auto text-emerald-600 mb-2" />
            <p className="text-xs font-medium">Loading audit logs...</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-stone-50 text-stone-500 font-semibold border-b border-stone-200">
                <tr>
                  <th className="py-3 px-4">Timestamp</th>
                  <th className="py-3 px-4">Event Action</th>
                  <th className="py-3 px-4">Actor</th>
                  <th className="py-3 px-4">Role</th>
                  <th className="py-3 px-4">Event Details & Metadata</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100 font-medium">
                {logs.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-stone-400">
                      No audit events recorded yet.
                    </td>
                  </tr>
                ) : (
                  logs.map((log, idx) => {
                    const isLock = log.action.includes('LOCK');
                    const isOverride = log.action.includes('OVERRIDE');
                    const isWarning = log.action.includes('UNAUTHORIZED') || log.action.includes('STOP');
                    const isSuccess = log.action.includes('START') || log.action.includes('RECORD');

                    return (
                      <tr key={`${log.id || 'flog'}-${idx}`} className="hover:bg-stone-50/60 transition-colors">
                        <td className="py-3 px-4 whitespace-nowrap text-stone-500 font-mono text-[11px]">
                          {new Date(log.timestamp).toLocaleString()}
                        </td>
                        <td className="py-3 px-4 whitespace-nowrap">
                          <span
                            className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold font-mono ${
                              isLock
                                ? 'bg-amber-50 text-amber-800 border border-amber-200'
                                : isOverride
                                ? 'bg-indigo-50 text-indigo-800 border border-indigo-200'
                                : isWarning
                                ? 'bg-red-50 text-red-800 border border-red-200'
                                : 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                            }`}
                          >
                            {isLock ? <Lock className="w-3 h-3" /> : null}
                            {log.action}
                          </span>
                        </td>
                        <td className="py-3 px-4 font-mono text-stone-800 font-bold">{log.actor_id}</td>
                        <td className="py-3 px-4">
                          <span className="capitalize text-stone-600 bg-stone-100 px-2 py-0.5 rounded text-[10px] font-bold">
                            {log.actor_role}
                          </span>
                        </td>
                        <td className="py-3 px-4 font-mono text-stone-600 text-[11px] max-w-md truncate">
                          {log.details ? JSON.stringify(log.details) : '—'}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
