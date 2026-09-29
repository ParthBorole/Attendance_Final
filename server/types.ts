export type Role = 'student' | 'faculty' | 'admin';
export type UserStatus = 'active' | 'pending_verification' | 'inactive';
export type SessionStatus = 'ACTIVE' | 'CLOSED';
export type AttendanceStatus = 'PRESENT' | 'ABSENT';
export type DayOfWeek =
  | 'Monday'
  | 'Tuesday'
  | 'Wednesday'
  | 'Thursday'
  | 'Friday'
  | 'Saturday'
  | 'Sunday'
  | 'MON'
  | 'TUE'
  | 'WED'
  | 'THU'
  | 'FRI'
  | 'SAT';

export interface User {
  id: string;
  name: string;
  email: string;
  password_hash: string;
  role: Role;
  status: UserStatus;
  created_at: string;
  updated_at: string;
}

export interface Student {
  id: string;
  user_id: string;
  student_id: string;
  roll_number: string;
  class_id: string;
  division: string;
  academic_year: string;
}

export interface Faculty {
  id: string;
  user_id: string;
  department: string;
  employee_id: string;
  short_code: string; // e.g. "VAR", "CND", "RAR", "TMS", "AAS", "AGJ", "KVD"
  status?: 'active' | 'pending' | 'suspended' | 'disabled';
  created_by?: string;
  created_by_name?: string;
  created_at?: string;
}

export interface ClassEntity {
  id: string;
  course_name: string;
  class_name: string;
  division: string;
  academic_year: string;
  is_active: boolean;
}

export interface SubjectEntity {
  id: string;
  subject_name: string;
  subject_code: string;
  class_id: string;
}

export interface FacultyAssignment {
  id: string;
  faculty_id: string;
  subject_id: string;
  class_id: string;
}

export interface TimetableEntry {
  id: string;
  class_id: string;
  subject_id: string;
  faculty_id: string;
  day_of_week: DayOfWeek;
  start_time: string; // e.g. "07:00 AM"
  end_time: string;   // e.g. "07:48 AM"
  room: string;       // e.g. "701", "4th Floor Lab CC", "2nd Floor Lab 2"
  batch?: string | null;     // e.g. "A1", "A2", "ALL"
  is_lab?: boolean;
  academic_year: string;
  is_active?: boolean;
}

export interface ClassroomEntity {
  id: string;
  classroom_name: string;
  name?: string;
  subject_id: string;
  class_id: string;
  division: string;
  faculty_id: string;
  join_code: string; // e.g. "AI-7K4P"
  academic_year: string;
  status: 'active' | 'disabled' | 'archived';
  created_at: string;
}

export interface ClassroomMember {
  id: string;
  classroom_id: string;
  student_id: string;
  joined_at: string;
  status: 'active' | 'removed' | 'disabled';
  approved_by?: string;
  created_at: string;
}

export interface AuditLog {
  id: string;
  user_id?: string;
  user_name?: string;
  actor_id?: string;
  actor_role?: Role | 'system' | string;
  action: string;
  entity_type?: string;
  entity_id?: string;
  target_id?: string;
  timestamp: string;
  details?: any;
  severity?: 'info' | 'warning' | 'critical';
  metadata?: Record<string, any>;
}

export interface AttendanceSession {
  id: string;
  class_id: string;
  subject_id: string;
  classroom_id?: string;
  faculty_id: string;
  lecture_topic: string;
  session_date: string;
  start_time: string;
  end_time?: string;
  radius_meters: number;
  center_latitude: number;
  center_longitude: number;
  status: SessionStatus;
  created_at: string;
}

export interface AttendanceRecord {
  id: string;
  session_id: string;
  student_id: string;
  classroom_id?: string;
  status: AttendanceStatus;
  marked_at: string;
  latitude: number;
  longitude: number;
  accuracy: number;
  altitude: number | null;
  altitude_accuracy?: number | null;
  distance_from_center: number;
  camera_image_path: string;
  camera_verification_status: 'VERIFIED' | 'FAILED';
  device_id?: string;
  created_at: string;
}

export interface OtpVerification {
  id: string;
  email: string;
  otp_hash: string;
  expires_at: number;
  attempts: number;
  verified: boolean;
  purpose: 'registration' | 'login' | 'password_reset';
  created_at: string;
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

export interface DatabaseSchema {
  users: User[];
  students: Student[];
  faculty: Faculty[];
  classes: ClassEntity[];
  subjects: SubjectEntity[];
  faculty_assignments: FacultyAssignment[];
  timetables: TimetableEntry[];
  classrooms: ClassroomEntity[];
  classroom_members: ClassroomMember[];
  attendance_sessions: AttendanceSession[];
  attendance_records: AttendanceRecord[];
  otp_verifications: OtpVerification[];
  audit_logs: AuditLog[];
  institution_settings: InstitutionSettings;
}
