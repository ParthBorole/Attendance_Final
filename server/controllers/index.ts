/**
 * AttendSecure Backend Controllers
 * Modular business logic layer corresponding to routes
 */

export const AuthController = {
  description: 'Handles registration, login, OTP dispatch, password reset, and session verification',
};

export const StudentController = {
  description: 'Handles student attendance view, QR scan verification, leave applications, and profile',
};

export const FacultyController = {
  description: 'Handles lecture session creation, dynamic rolling QR generation, live attendance monitoring, and manual overrides',
};

export const AdminController = {
  description: 'Handles institution dashboard statistics, faculty & student management, audit logs, and reports',
};
