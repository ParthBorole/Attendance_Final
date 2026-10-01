const API_BASE = '/api';

export interface ApiResponse<T = any> {
  success: boolean;
  message?: string;
  data?: T;
  token?: string;
  user?: any;
  student?: any;
  faculty?: any;
  requiresVerification?: boolean;
  requiresOtp?: boolean;
  role?: string;
  email?: string;
  alreadyMarked?: boolean;
  otp?: string;
  emailDelivered?: boolean;
  deliveryNotice?: string;
}

export class ApiService {
  private static getToken(): string | null {
    return localStorage.getItem('attendsecure_token');
  }

  public static setToken(token: string) {
    localStorage.setItem('attendsecure_token', token);
  }

  public static clearToken() {
    localStorage.removeItem('attendsecure_token');
  }

  private static async request<T = any>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<ApiResponse<T>> {
    const token = this.getToken();
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(options.headers as Record<string, string>),
    };

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    try {
      const response = await fetch(`${API_BASE}${endpoint}`, {
        ...options,
        headers,
      });

      let data: any = null;
      const text = await response.text();

      try {
        data = JSON.parse(text);
        // If parsed JSON has a message and response is not ok, ensure we return data.message
        if (!response.ok) {
          return {
            success: false,
            message: data?.message || (response.status === 403 ? 'Access Denied: Administrator privileges required.' : `Request failed with status ${response.status}`),
            ...data,
          };
        }
        return data;
      } catch {
        // Non-JSON response (e.g., HTML during server restart or proxy error)
        let fallbackMessage = 'An unexpected response was received from the server.';
        if (response.status === 403) {
          if (endpoint.includes('/auth/')) {
            fallbackMessage = 'Authentication failed. Please check your credentials and try again.';
          } else {
            fallbackMessage = 'Access Denied: You do not have permission for this action. Please log in with the appropriate account.';
          }
        } else if (response.status === 401) {
          fallbackMessage = 'Authentication required or session expired. Please sign in again.';
        } else if (response.status === 404) {
          fallbackMessage = `API endpoint ${endpoint} not found.`;
        } else if (response.status >= 500) {
          fallbackMessage = 'Server is currently reconnecting. Please wait a moment and try again.';
        }

        return {
          success: false,
          message: fallbackMessage,
        };
      }
    } catch (error: any) {
      return {
        success: false,
        message: error.message || 'Network error. Please check your connection.',
      };
    }
  }

  // Auth Endpoints
  public static async getPublicClasses() {
    return this.request('/auth/classes-public');
  }

  public static async register(payload: any) {
    return this.request('/auth/register', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  public static async verifyOtp(payload: { email: string; otp: string; purpose?: string }) {
    return this.request('/auth/verify-otp', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  public static async resendOtp(payload: { email: string; purpose?: string }) {
    return this.request('/auth/resend-otp', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  public static async login(payload: { email: string; password: string; role?: string }) {
    return this.request('/auth/login', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  public static async requestResetOtp(payload: { identifier: string }) {
    return this.request('/auth/request-reset-otp', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  public static async resetPassword(payload: { identifier: string; otp?: string; newPassword: string }) {
    return this.request('/auth/reset-password', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  public static async findUsername(payload: { query: string }) {
    return this.request('/auth/find-username', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  public static async getMe() {
    return this.request('/auth/me');
  }

  // Student Endpoints
  public static async getStudentDashboard() {
    return this.request('/student/dashboard');
  }

  public static async getStudentClassrooms() {
    return this.request('/student/classrooms');
  }

  public static async joinClassroom(code: string) {
    return this.request('/student/classrooms/join', {
      method: 'POST',
      body: JSON.stringify({ code }),
    });
  }

  public static async getStudentTimetable() {
    return this.request('/student/timetable');
  }

  public static async getStudentSubjects() {
    return this.request('/student/subjects');
  }

  public static async getStudentHistory() {
    return this.request('/student/history');
  }

  public static async verifyLocation(payload: {
    sessionId: string;
    latitude: number;
    longitude: number;
    accuracy?: number;
  }) {
    return this.request('/student/verify-location', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  public static async submitAttendance(payload: {
    sessionId: string;
    latitude: number;
    longitude: number;
    accuracy: number;
    altitude?: number | null;
    altitudeAccuracy?: number | null;
    cameraImageBase64: string;
    locationTimestamp?: number;
    deviceId?: string;
  }) {
    return this.request('/student/submit-attendance', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  // Faculty Endpoints
  public static async getFacultyDashboard() {
    return this.request('/faculty/dashboard');
  }

  public static async getFacultyClassrooms() {
    return this.request('/faculty/classrooms');
  }

  public static async createFacultyClassroom(payload: { subjectId: string; classId: string; academicYear?: string }) {
    return this.request('/faculty/classrooms', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  public static async regenerateClassroomCode(classroomId: string) {
    return this.request(`/faculty/classrooms/${classroomId}/regenerate-code`, {
      method: 'POST',
    });
  }

  public static async updateClassroomStatus(classroomId: string, status: 'active' | 'disabled' | 'archived') {
    return this.request(`/faculty/classrooms/${classroomId}/status`, {
      method: 'PUT',
      body: JSON.stringify({ status }),
    });
  }

  public static async getClassroomMembers(classroomId: string) {
    return this.request(`/faculty/classrooms/${classroomId}/members`);
  }

  public static async getFacultyTimetable() {
    return this.request('/faculty/timetable');
  }

  public static async getFacultyClasses() {
    return this.request('/faculty/classes');
  }

  public static async createFacultyClass(payload: { course_name?: string; class_name: string; division: string; academic_year?: string }) {
    return this.request('/faculty/classes', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  public static async updateFacultyClass(id: string, payload: any) {
    return this.request(`/faculty/classes/${id}`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    });
  }

  public static async deleteFacultyClass(id: string) {
    return this.request(`/faculty/classes/${id}`, {
      method: 'DELETE',
    });
  }

  public static async getFacultySubjects(classId?: string) {
    const query = classId ? `?classId=${classId}` : '';
    return this.request(`/faculty/subjects${query}`);
  }

  public static async createFacultySubject(payload: { subject_name: string; subject_code: string; class_id: string }) {
    return this.request('/faculty/subjects', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  public static async updateFacultySubject(id: string, payload: any) {
    return this.request(`/faculty/subjects/${id}`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    });
  }

  public static async deleteFacultySubject(id: string) {
    return this.request(`/faculty/subjects/${id}`, {
      method: 'DELETE',
    });
  }

  public static async getFacultyStudentsManage(classId?: string) {
    const query = classId ? `?classId=${classId}` : '';
    return this.request(`/faculty/students-manage${query}`);
  }

  public static async createFacultyStudent(payload: {
    name: string;
    email: string;
    rollNumber: string;
    studentId: string;
    classId: string;
    division?: string;
    academicYear?: string;
    password?: string;
  }) {
    return this.request('/faculty/students-manage', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  public static async updateFacultyStudent(id: string, payload: any) {
    return this.request(`/faculty/students-manage/${id}`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    });
  }

  public static async deleteFacultyStudent(id: string) {
    return this.request(`/faculty/students-manage/${id}`, {
      method: 'DELETE',
    });
  }

  public static async assignFacultyStudent(id: string, payload: { classId?: string; classroomId?: string }) {
    return this.request(`/faculty/students-manage/${id}/assign`, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  public static async createAttendanceSession(payload: {
    classId: string;
    subjectId: string;
    lectureTopic: string;
    lectureNumber?: number | string;
    radiusMeters?: number;
    sessionDate?: string;
    startTime?: string;
    attendanceMode?: 'SMART_GEOFENCE' | 'MANUAL';
    latitude?: number;
    longitude?: number;
  }) {
    return this.request('/faculty/sessions', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  public static async recordManualAttendance(payload: {
    existingSessionId?: string;
    classId: string;
    subjectId: string;
    lectureTopic: string;
    lectureNumber?: number | string;
    sessionDate?: string;
    startTime?: string;
    endTime?: string;
    attendances: Array<{ studentId: string; status: 'PRESENT' | 'ABSENT'; notes?: string }>;
    lockSession?: boolean;
  }) {
    return this.request('/faculty/sessions/manual-record', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  public static async toggleSessionLock(sessionId: string, lock: boolean) {
    return this.request(`/faculty/sessions/${sessionId}/lock`, {
      method: 'POST',
      body: JSON.stringify({ lock }),
    });
  }

  public static async getSessionAttendanceSheet(sessionId: string) {
    return this.request(`/faculty/sessions/${sessionId}/attendance-sheet`);
  }

  public static async stopAttendanceSession(sessionId: string) {
    return this.request(`/faculty/sessions/${sessionId}/stop`, {
      method: 'POST',
    });
  }

  public static async getLiveSessionData(sessionId: string) {
    return this.request(`/faculty/sessions/${sessionId}/live`);
  }

  public static async overrideAttendance(sessionId: string, studentId: string, status: 'PRESENT' | 'ABSENT', reason?: string) {
    return this.request(`/faculty/sessions/${sessionId}/override`, {
      method: 'POST',
      body: JSON.stringify({ studentId, status, reason }),
    });
  }

  public static async getFacultyStudents(classId?: string, subjectId?: string) {
    const params = new URLSearchParams();
    if (classId) params.append('classId', classId);
    if (subjectId) params.append('subjectId', subjectId);
    const query = params.toString() ? `?${params.toString()}` : '';
    return this.request(`/faculty/students${query}`);
  }

  public static async getFacultyStudentDetail(studentId: string) {
    return this.request(`/faculty/students/${studentId}`);
  }

  public static async getLectureHistory() {
    return this.request('/faculty/lecture-history');
  }

  public static async getFacultyAuditLogs(params?: { limit?: number; action?: string; search?: string }) {
    const q = new URLSearchParams();
    if (params?.limit) q.append('limit', params.limit.toString());
    if (params?.action) q.append('action', params.action);
    if (params?.search) q.append('search', params.search);
    const query = q.toString() ? `?${q.toString()}` : '';
    return this.request(`/faculty/audit-logs${query}`);
  }

  public static async getFacultyReports(params?: {
    subjectId?: string;
    classId?: string;
    studentId?: string;
    startDate?: string;
    endDate?: string;
  }) {
    const q = new URLSearchParams();
    if (params?.subjectId) q.append('subjectId', params.subjectId);
    if (params?.classId) q.append('classId', params.classId);
    if (params?.studentId) q.append('studentId', params.studentId);
    if (params?.startDate) q.append('startDate', params.startDate);
    if (params?.endDate) q.append('endDate', params.endDate);
    const query = q.toString() ? `?${q.toString()}` : '';
    return this.request(`/faculty/reports${query}`);
  }

  // Admin Endpoints
  public static async getAdminOverview() {
    return this.request('/admin/overview');
  }

  public static async getAdminTimetable() {
    return this.request('/admin/timetable');
  }

  public static async createAdminTimetableEntry(payload: any) {
    return this.request('/admin/timetable', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  public static async deleteAdminTimetableEntry(id: string) {
    return this.request(`/admin/timetable/${id}`, {
      method: 'DELETE',
    });
  }

  public static async getAdminClassrooms() {
    return this.request('/admin/classrooms');
  }

  public static async createAdminClassroom(payload: any) {
    return this.request('/admin/classrooms', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  public static async enrollStudentIntoClassroom(classroomId: string, studentId: string) {
    return this.request(`/admin/classrooms/${classroomId}/members`, {
      method: 'POST',
      body: JSON.stringify({ studentId }),
    });
  }

  public static async getAdminAuditLogs(limit = 100) {
    return this.request(`/admin/audit-logs?limit=${limit}`);
  }

  public static async getAdminSettings() {
    return this.request('/admin/settings');
  }

  public static async updateAdminSettings(settings: any) {
    return this.request('/admin/settings', {
      method: 'PUT',
      body: JSON.stringify(settings),
    });
  }

  public static async getAdminClasses() {
    return this.request('/admin/classes');
  }

  public static async createAdminClass(payload: any) {
    return this.request('/admin/classes', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  public static async updateAdminClass(id: string, payload: any) {
    return this.request(`/admin/classes/${id}`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    });
  }

  public static async getAdminSubjects() {
    return this.request('/admin/subjects');
  }

  public static async createAdminSubject(payload: any) {
    return this.request('/admin/subjects', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  public static async getAdminUsers(role?: string) {
    const query = role ? `?role=${role}` : '';
    return this.request(`/admin/users${query}`);
  }

  public static async createAdminUser(payload: any) {
    return this.request('/admin/users', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  public static async updateAdminUserStatus(id: string, status: string) {
    return this.request(`/admin/users/${id}/status`, {
      method: 'PUT',
      body: JSON.stringify({ status }),
    });
  }

  public static async getAdminSessions() {
    return this.request('/admin/sessions');
  }

  public static async getAdminFaculty() {
    return this.request('/admin/faculty');
  }

  public static async createAdminFaculty(payload: any) {
    return this.request('/admin/faculty', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  public static async updateAdminFaculty(id: string, payload: any) {
    return this.request(`/admin/faculty/${id}`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    });
  }

  public static async updateAdminFacultyAssignments(id: string, subjectIds: any[]) {
    return this.request(`/admin/faculty/${id}/assignments`, {
      method: 'POST',
      body: JSON.stringify({ subjectIds }),
    });
  }

  public static async resetFacultySetup(id: string) {
    return this.request(`/admin/faculty/${id}/reset-setup`, {
      method: 'POST',
    });
  }

  public static async getAdminRegistrationActivity() {
    return this.request('/admin/registration-activity');
  }

  public static async getOtpLogs() {
    return this.request('/admin/otp-logs');
  }

  public static async resetDatabase() {
    return this.request('/admin/reset-data', {
      method: 'POST',
    });
  }
}
