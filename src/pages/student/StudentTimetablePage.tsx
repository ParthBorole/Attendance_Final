import React, { useState, useEffect } from 'react';
import { DayTimetable, DayOfWeek } from '../../types.js';
import { ApiService } from '../../services/api.js';
import {
  Calendar,
  Clock,
  School,
  UserCheck,
  RefreshCw,
  Sparkles,
  BookOpen,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react';

export const StudentTimetablePage: React.FC = () => {
  const [timetableData, setTimetableData] = useState<{
    className: string;
    courseName: string;
    academicYear: string;
    currentDay: DayOfWeek;
    timetable: DayTimetable[];
  } | null>(null);

  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedDay, setSelectedDay] = useState<DayOfWeek>('Monday');

  const fetchTimetable = async () => {
    setIsLoading(true);
    setError(null);
    const res = await ApiService.getStudentTimetable();
    setIsLoading(false);

    if (res.success && res.data) {
      setTimetableData(res.data);
      if (res.data.currentDay && res.data.currentDay !== 'Sunday') {
        setSelectedDay(res.data.currentDay);
      }
    } else {
      setError(res.message || 'Could not load timetable data.');
    }
  };

  useEffect(() => {
    fetchTimetable();
  }, []);

  if (isLoading) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center">
        <RefreshCw className="w-8 h-8 text-stone-400 animate-spin mb-3" />
        <span className="text-xs text-stone-500 font-medium">Loading College Timetable...</span>
      </div>
    );
  }

  if (error || !timetableData) {
    return (
      <div className="p-8 text-center bg-white rounded-2xl border border-stone-200">
        <AlertCircle className="w-8 h-8 text-rose-500 mx-auto mb-2" />
        <p className="text-xs text-stone-700 font-medium">{error || 'Failed to load timetable'}</p>
        <button
          onClick={fetchTimetable}
          className="mt-3 px-4 py-2 bg-stone-900 text-white text-xs font-semibold rounded-xl"
        >
          Retry
        </button>
      </div>
    );
  }

  const days: DayOfWeek[] = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const activeDaySchedule = timetableData.timetable.find((d) => d.day === selectedDay);

  return (
    <div className="space-y-6 pb-12">
      {/* Header Banner */}
      <div className="bg-white rounded-2xl border border-stone-200/80 p-5 sm:p-6 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold tracking-tight text-stone-900">Academic Timetable</h1>
            <span className="text-xs font-bold px-2.5 py-0.5 rounded-md bg-stone-900 text-emerald-400">
              {timetableData.className}
            </span>
          </div>
          <p className="text-xs text-stone-500 mt-1">
            Official Course Schedule · {timetableData.courseName} · AY {timetableData.academicYear}
          </p>
        </div>

        <button
          onClick={fetchTimetable}
          className="p-2 text-stone-500 hover:text-stone-900 hover:bg-stone-100 rounded-xl transition-colors cursor-pointer border border-stone-200 self-start sm:self-auto"
          title="Refresh timetable"
        >
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>

      {/* Day Selector Tabs (Mobile & Quick Navigation) */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
        {days.map((day) => {
          const isToday = timetableData.currentDay === day;
          const isSelected = selectedDay === day;
          return (
            <button
              key={day}
              onClick={() => setSelectedDay(day)}
              className={`px-4 py-2.5 rounded-xl text-xs font-bold tracking-wide transition-all shrink-0 cursor-pointer flex items-center gap-1.5 ${
                isSelected
                  ? 'bg-stone-900 text-white shadow-xs'
                  : 'bg-white text-stone-600 border border-stone-200 hover:bg-stone-50'
              }`}
            >
              <span>{day}</span>
              {isToday && (
                <span className={`w-2 h-2 rounded-full ${isSelected ? 'bg-emerald-400' : 'bg-emerald-600'}`} />
              )}
            </button>
          );
        })}
      </div>

      {/* Day Schedule View (Card list for the selected day) */}
      <div className="bg-white rounded-2xl border border-stone-200/80 p-5 sm:p-6 shadow-xs">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-stone-700" />
            <h2 className="text-sm font-bold text-stone-900">{selectedDay}'s Schedule</h2>
            {timetableData.currentDay === selectedDay && (
              <span className="text-[10px] font-bold px-2 py-0.5 bg-emerald-100 text-emerald-800 rounded-full">
                Today
              </span>
            )}
          </div>
          <span className="text-xs text-stone-500 font-mono">
            {activeDaySchedule?.slots.length || 0} Lecture Slots
          </span>
        </div>

        {!activeDaySchedule || activeDaySchedule.slots.length === 0 ? (
          <div className="p-8 text-center bg-stone-50 rounded-xl border border-dashed border-stone-200">
            <p className="text-xs text-stone-500 font-medium">No lectures scheduled for {selectedDay}.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {activeDaySchedule.slots.map((slot) => (
              <div
                key={slot.id}
                className={`p-4 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-all ${
                  slot.isActiveNow
                    ? 'bg-emerald-50/70 border-emerald-300 ring-1 ring-emerald-300'
                    : 'bg-stone-50/70 border-stone-200/80'
                }`}
              >
                <div className="flex items-start gap-3.5">
                  <div className="w-20 font-mono font-bold text-stone-800 shrink-0 text-center py-2 bg-white rounded-xl border border-stone-200 shadow-2xs">
                    <div className="text-xs">{slot.startTime}</div>
                    <div className="text-[10px] text-stone-400 font-normal">{slot.endTime}</div>
                  </div>

                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="text-sm font-bold text-stone-900">{slot.subjectName}</h3>
                      <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 bg-stone-200 text-stone-800 rounded">
                        {slot.subjectCode}
                      </span>
                      {slot.isLab && (
                        <span className="text-[10px] font-bold px-2 py-0.5 bg-amber-100 text-amber-800 rounded">
                          Practical Lab {slot.batch ? `(${slot.batch})` : ''}
                        </span>
                      )}
                    </div>

                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-stone-500 mt-1">
                      <span className="flex items-center gap-1">
                        <UserCheck className="w-3.5 h-3.5 text-stone-400" />
                        <span>Prof. {slot.facultyName}</span>
                        {slot.facultyShortCode && (
                          <span className="text-[10px] font-mono font-semibold px-1 bg-stone-200 text-stone-700 rounded">
                            {slot.facultyShortCode}
                          </span>
                        )}
                      </span>
                      <span className="flex items-center gap-1">
                        <School className="w-3.5 h-3.5 text-stone-400" />
                        <span>Room: {slot.room}</span>
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                  {slot.isActiveNow && (
                    <span className="px-2.5 py-1 bg-emerald-600 text-white text-[11px] font-bold rounded-lg animate-pulse">
                      ACTIVE NOW
                    </span>
                  )}
                  {slot.isJoined ? (
                    <span className="px-2 py-1 bg-emerald-50 border border-emerald-200 text-emerald-800 text-[11px] font-semibold rounded-lg flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                      <span>Classroom Joined</span>
                    </span>
                  ) : (
                    <span className="px-2 py-1 bg-stone-100 text-stone-500 text-[11px] rounded-lg">
                      Not Enrolled
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Full Weekly Grid (Desktop View) */}
      <div className="hidden lg:block bg-white rounded-2xl border border-stone-200/80 p-6 shadow-xs">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <BookOpen className="w-4 h-4 text-stone-700" />
            <h2 className="text-sm font-bold text-stone-900">Weekly Timetable Matrix</h2>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-stone-200 bg-stone-50/80">
                <th className="py-3 px-3 font-bold text-stone-700 w-28">Day</th>
                <th className="py-3 px-3 font-bold text-stone-700">Scheduled Slots & Faculties</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              {timetableData.timetable.map((dayItem) => (
                <tr
                  key={dayItem.day}
                  className={`hover:bg-stone-50/50 transition-colors ${
                    dayItem.isToday ? 'bg-emerald-50/30 font-semibold' : ''
                  }`}
                >
                  <td className="py-3.5 px-3 font-bold text-stone-900 align-top">
                    <div className="flex items-center gap-1.5">
                      <span>{dayItem.day}</span>
                      {dayItem.isToday && (
                        <span className="w-2 h-2 rounded-full bg-emerald-500" />
                      )}
                    </div>
                  </td>
                  <td className="py-3.5 px-3">
                    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-2">
                      {dayItem.slots.map((slot) => (
                        <div
                          key={slot.id}
                          className="p-2.5 rounded-lg border border-stone-200/80 bg-white space-y-0.5"
                        >
                          <div className="flex items-center justify-between">
                            <span className="font-bold text-stone-900">{slot.subjectCode}</span>
                            <span className="text-[10px] font-mono text-stone-500">
                              {slot.startTime}
                            </span>
                          </div>
                          <div className="text-[11px] text-stone-700 truncate">{slot.subjectName}</div>
                          <div className="text-[10px] text-stone-400 flex items-center justify-between pt-0.5">
                            <span>{slot.facultyShortCode}</span>
                            <span>{slot.room}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
