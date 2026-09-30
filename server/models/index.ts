/**
 * AttendSecure Data Models & Entity Schemas
 * Standard MERN / Node.js architecture format
 */

export interface IUser {
  id: string;
  name: string;
  email: string;
  role: 'student' | 'faculty' | 'admin';
  status: 'active' | 'suspended' | 'pending';
  created_at: string;
  updated_at: string;
  phone?: string;
  profile_photo?: string;
}

export interface IStudent {
  id: string;
  user_id: string;
  student_id: string;
  roll_number: string;
  class_id: string;
  division: string;
  academic_year: string;
  face_registered?: boolean;
  face_encoding_id?: string;
  face_photo_url?: string;
}

export interface IFaculty {
  id: string;
  user_id: string;
  department: string;
  employee_id: string;
  short_code: string;
  designation?: string;
}

export interface IClass {
  id: string;
  course_name: string;
  class_name: string;
  division: string;
  academic_year: string;
  is_active: boolean;
}

export interface ISubject {
  id: string;
  class_id: string;
  subject_code: string;
  subject_name: string;
  faculty_id: string;
  total_lectures_conducted?: number;
}

export interface IAttendanceSession {
  id: string;
  subject_id: string;
  faculty_id: string;
  class_id: string;
  session_date: string;
  session_time: string;
  token_hash: string;
  qr_expires_at: string;
  geofence_lat: number;
  geofence_lng: number;
  geofence_radius: number;
  status: 'active' | 'completed' | 'expired';
  created_at: string;
}

export interface IAttendanceRecord {
  id: string;
  session_id: string;
  student_id: string;
  timestamp: string;
  method: 'qr' | 'manual' | 'face' | 'ble';
  status: 'present' | 'absent' | 'late' | 'excused';
  distance_meters: number;
  is_verified: boolean;
  face_verified: boolean;
  marked_by?: string;
  remarks?: string;
}

export interface ILeaveRequest {
  id: string;
  student_id: string;
  start_date: string;
  end_date: string;
  reason: string;
  proof_file?: string;
  status: 'pending' | 'approved' | 'rejected';
  reviewed_by?: string;
  reviewed_at?: string;
  created_at: string;
}

export interface IAuditLog {
  id: string;
  user_id: string;
  action: string;
  details: string;
  ip_address?: string;
  created_at: string;
}
