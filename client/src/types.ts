export type Role = 'student' | 'faculty' | 'admin';
export type UserStatus = 'active' | 'pending_verification' | 'inactive';
export type DayOfWeek = 'Monday' | 'Tuesday' | 'Wednesday' | 'Thursday' | 'Friday' | 'Saturday' | 'Sunday';

export interface User {
  id: string;
  name: string;
  email: string;
  role: Role;
  status: UserStatus;
  shortCode?: string;
  studentId?: string;
  rollNumber?: string;
  className?: string;
  division?: string;
  academicYear?: string;
}

export interface StudentProfile {
  id: string;
  user_id: string;
  student_id: string;
  roll_number: string;
  class_id: string;
  division: string;
  academic_year: string;
  className?: string;
  courseName?: string;
}

export interface FacultyProfile {
  id: string;
  user_id: string;
  department: string;
  employee_id: string;
  short_code: string;
}

export interface ClassItem {
  id: string;
  course_name: string;
  class_name: string;
  division: string;
  academic_year: string;
  is_active: boolean;
}

export interface SubjectItem {
  id: string;
  subject_name: string;
  subject_code: string;
  class_id: string;
  className?: string;
  courseName?: string;
}

export interface ClassroomItem {
  id: string;
  classroomName: string;
  joinCode: string;
  subjectId: string;
  subjectName: string;
  subjectCode: string;
  classId: string;
  className: string;
  courseName?: string;
  division?: string;
  academicYear: string;
  status: 'active' | 'disabled' | 'archived';
  enrolledCount?: number;
  facultyName?: string;
  facultyShortCode?: string;
  createdAt: string;
}

export interface JoinedClassroom {
  membershipId: string;
  classroomId: string;
  classroomName: string;
  joinCode: string;
  subjectId: string;
  subjectName: string;
  subjectCode: string;
  facultyName: string;
  facultyShortCode: string;
  facultyEmail: string;
  className: string;
  academicYear: string;
  joinedAt: string;
  membershipStatus: string;
  classroomStatus: string;
  attendanceStats: {
    total: number;
    attended: number;
    percentage: number;
    isDefaulter: boolean;
  };
}

export interface TimetableSlot {
  id: string;
  subjectId: string;
  subjectName: string;
  subjectCode: string;
  facultyName: string;
  facultyShortCode: string;
  startTime: string;
  endTime: string;
  room: string;
  isLab: boolean;
  batch: string | null;
  academicYear?: string;
  isJoined?: boolean;
  isActiveNow?: boolean;
  activeSessionId?: string | null;
}

export interface DayTimetable {
  day: DayOfWeek;
  isToday: boolean;
  slots: TimetableSlot[];
}

export interface NextLectureInfo {
  id: string;
  subjectName: string;
  subjectCode: string;
  facultyName: string;
  facultyShortCode: string;
  day: string;
  startTime: string;
  endTime: string;
  room: string;
  isLab: boolean;
  batch: string | null;
  isToday: boolean;
  isActiveNow: boolean;
  activeSessionId: string | null;
}

export interface TodayClassItem {
  id: string;
  subjectId: string;
  subjectName: string;
  subjectCode: string;
  facultyName: string;
  facultyShortCode: string;
  startTime: string;
  endTime: string;
  room: string;
  isLab: boolean;
  batch: string | null;
  timingStatus: 'UPCOMING' | 'IN_PROGRESS' | 'COMPLETED';
  isActiveSession: boolean;
  activeSessionId: string | null;
  attendanceStatus: string;
}

export interface ActiveSessionForStudent {
  id: string;
  subjectName: string;
  subjectCode: string;
  facultyName: string;
  lectureTopic: string;
  sessionDate: string;
  startTime: string;
  radiusMeters: number;
  centerLatitude: number;
  centerLongitude: number;
  alreadyMarked: boolean;
}

export interface StudentDashboardData {
  student: {
    id: string;
    name: string;
    email: string;
    studentId: string;
    rollNumber: string;
    className: string;
    division: string;
    academicYear: string;
    courseName: string;
  };
  stats: {
    overallPercentage: number;
    totalLectures: number;
    attendedCount: number;
    absentCount: number;
    threshold: number;
    isDefaulter: boolean;
    warningMessage: string | null;
  };
  subjectStats: Array<{
    subjectId: string;
    subjectName: string;
    subjectCode: string;
    facultyName: string;
    facultyShortCode: string;
    classroomId: string;
    classroomCode: string;
    totalLectures: number;
    present: number;
    absent: number;
    percentage: number;
    isLow: boolean;
    nextSlot: string;
  }>;
  nextLecture: NextLectureInfo | null;
  todayClasses: TodayClassItem[];
  activeSessions: ActiveSessionForStudent[];
  recentRecords: Array<{
    id: string;
    date: string;
    time: string;
    subjectName: string;
    topic: string;
    status: 'PRESENT' | 'ABSENT';
    distance: number;
    verificationStatus: string;
  }>;
  joinedClassroomsCount: number;
  institution: {
    collegeName: string;
    officialLatitude: number;
    officialLongitude: number;
    defaultRadius: number;
  };
}

export interface AttendanceHistoryItem {
  sessionId: string;
  recordId: string | null;
  date: string;
  time: string;
  subjectName: string;
  subjectCode: string;
  facultyName: string;
  facultyShortCode?: string;
  topic: string;
  status: 'PRESENT' | 'ABSENT';
  distance: number | null;
  latitude: number | null;
  longitude: number | null;
  accuracy: number | null;
  altitude: number | null;
  altitudeAccuracy: number | null;
  verificationStatus: string | null;
  cameraImagePath: string | null;
}

export interface AuditLogItem {
  id: string;
  action: string;
  actor_id: string;
  actor_role: string;
  actorName?: string;
  actorEmail?: string;
  target_id?: string;
  details?: any;
  timestamp: string;
}

export interface InstitutionSettings {
  id: string;
  college_name: string;
  official_latitude: number;
  official_longitude: number;
  default_radius: number;
  min_radius: number;
  max_radius: number;
  low_attendance_threshold: number;
  updated_at: string;
}
