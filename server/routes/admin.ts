import { Router, Response } from 'express';
import bcrypt from 'bcryptjs';
import { db } from '../db.js';
import { getRecentEmails } from '../utils/email.js';
import { authenticate, requireRole, AuthenticatedRequest } from '../middleware/auth.js';
import { ClassEntity, SubjectEntity, FacultyAssignment, TimetableEntry, ClassroomEntity } from '../types.js';

const router = Router();

// Require admin role
router.use(authenticate, requireRole('admin'));

// GET /api/admin/overview
router.get('/overview', (_req: AuthenticatedRequest, res: Response) => {
  try {
    const users = db.getUsers();
    const students = users.filter((u) => u.role === 'student');
    const faculty = users.filter((u) => u.role === 'faculty');
    const classes = db.getClasses();
    const subjects = db.getSubjects();
    const classrooms = db.getClassrooms();
    const timetable = db.getTimetable();
    const settings = db.getSettings();
    const sessions = db.getAttendanceSessions();
    const todayStr = new Date().toISOString().split('T')[0];
    const todaySessions = sessions.filter((s) => s.session_date === todayStr);

    const activeSessions = sessions.filter((s) => s.status === 'ACTIVE');

    // Defaulters calculation
    const threshold = settings.low_attendance_threshold || 75;
    let defaultersCount = 0;

    const allStudents = students.map((u) => {
      const std = db.getStudentByUserId(u.id);
      if (!std) return null;
      const classSessions = sessions.filter((s) => s.class_id === std.class_id && s.status === 'CLOSED');
      const records = db.getAttendanceRecords({ studentId: std.id, sessionId: undefined });
      const attended = records.filter((r) => r.status === 'PRESENT').length;
      const total = classSessions.length;
      const percentage = total > 0 ? Math.round((attended / total) * 100) : 100;
      if (total > 0 && percentage < threshold) defaultersCount++;
      return { id: std.id, percentage, isDefaulter: total > 0 && percentage < threshold };
    }).filter(Boolean);

    res.json({
      success: true,
      data: {
        stats: {
          totalStudents: students.length,
          totalFaculty: faculty.length,
          totalClasses: classes.length,
          totalSubjects: subjects.length,
          totalClassrooms: classrooms.length,
          totalTimetableSlots: timetable.length,
          todaySessionsCount: todaySessions.length,
          activeSessionsCount: activeSessions.length,
          totalSessionsAllTime: sessions.length,
          defaultersCount,
          totalEnrolledStudents: allStudents.length,
        },
        settings,
        activeSessions: activeSessions.map((sess) => {
          const cls = db.getClassById(sess.class_id);
          const sub = db.getSubjects().find((s) => s.id === sess.subject_id);
          const fac = db.getFacultyById(sess.faculty_id);
          const facUser = fac ? db.getUserById(fac.user_id) : null;
          const records = db.getAttendanceRecords({ sessionId: sess.id });

          return {
            id: sess.id,
            className: cls ? `${cls.class_name}.${cls.division}` : 'Class',
            subjectName: sub?.subject_name || 'Subject',
            facultyName: facUser ? facUser.name : 'Faculty Member',
            lectureTopic: sess.lecture_topic,
            startTime: sess.start_time,
            radiusMeters: sess.radius_meters,
            presentCount: records.length,
          };
        }),
      },
    });
  } catch (error) {
    console.error('Admin overview error:', error);
    res.status(500).json({ success: false, message: 'Could not load admin overview.' });
  }
});

// GET /api/admin/timetable - Full college timetable
router.get('/timetable', (_req: AuthenticatedRequest, res: Response) => {
  try {
    const timetable = db.getTimetable();
    const classes = db.getClasses();
    const subjects = db.getSubjects();
    const facultyList = db.getFaculty();
    const users = db.getUsers();

    const result = timetable.map((t) => {
      const cls = classes.find((c) => c.id === t.class_id);
      const sub = subjects.find((s) => s.id === t.subject_id);
      const fac = facultyList.find((f) => f.id === t.faculty_id);
      const facUser = fac ? users.find((u) => u.id === fac.user_id) : null;

      return {
        ...t,
        className: cls ? `${cls.class_name}.${cls.division}` : 'Class',
        courseName: cls?.course_name,
        subjectName: sub?.subject_name || 'Subject',
        subjectCode: sub?.subject_code || '',
        facultyName: facUser ? facUser.name : 'Faculty Member',
        facultyShortCode: fac?.short_code || '',
      };
    });

    res.json({ success: true, data: result });
  } catch (error) {
    console.error('Admin timetable error:', error);
    res.status(500).json({ success: false, message: 'Could not load timetable.' });
  }
});

// POST /api/admin/timetable - Create timetable entry
router.post('/timetable', (req: AuthenticatedRequest, res: Response) => {
  try {
    const { classId, subjectId, facultyId, dayOfWeek, startTime, endTime, room, isLab, batch, academicYear } = req.body;
    if (!classId || !subjectId || !facultyId || !dayOfWeek || !startTime || !endTime) {
      res.status(400).json({ success: false, message: 'All slot schedule fields are required.' });
      return;
    }

    const newEntry: TimetableEntry = {
      id: `tt_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      class_id: classId,
      subject_id: subjectId,
      faculty_id: facultyId,
      day_of_week: dayOfWeek,
      start_time: startTime,
      end_time: endTime,
      room: room || 'Classroom',
      is_lab: Boolean(isLab),
      batch: batch || null,
      academic_year: academicYear || '2026-27',
    };

    db.addTimetableEntry(newEntry);

    db.addAuditLog({
      action: 'TIMETABLE_ENTRY_CREATED',
      actor_id: req.user!.id,
      actor_role: 'admin',
      target_id: newEntry.id,
      details: { day: dayOfWeek, time: `${startTime}-${endTime}` },
    });

    res.json({ success: true, message: 'Timetable entry added successfully.', data: newEntry });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to create timetable slot.' });
  }
});

// DELETE /api/admin/timetable/:id
router.delete('/timetable/:id', (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    db.deleteTimetableEntry(id);
    db.addAuditLog({
      action: 'TIMETABLE_ENTRY_DELETED',
      actor_id: req.user!.id,
      actor_role: 'admin',
      target_id: id,
    });
    res.json({ success: true, message: 'Timetable slot deleted.' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to delete timetable slot.' });
  }
});

// GET /api/admin/classrooms - All college classrooms & join codes
router.get('/classrooms', (_req: AuthenticatedRequest, res: Response) => {
  try {
    const classrooms = db.getClassrooms();
    const subjects = db.getSubjects();
    const classes = db.getClasses();
    const facultyList = db.getFaculty();
    const users = db.getUsers();

    const data = classrooms.map((cr) => {
      const sub = subjects.find((s) => s.id === cr.subject_id);
      const cls = classes.find((c) => c.id === cr.class_id);
      const fac = facultyList.find((f) => f.id === cr.faculty_id);
      const facUser = fac ? users.find((u) => u.id === fac.user_id) : null;
      const members = db.getClassroomMembers({ classroomId: cr.id, status: 'active' });

      return {
        id: cr.id,
        classroomName: cr.classroom_name,
        joinCode: cr.join_code,
        subjectId: cr.subject_id,
        subjectName: sub?.subject_name || 'Subject',
        subjectCode: sub?.subject_code || '',
        classId: cr.class_id,
        className: cls ? `${cls.class_name}.${cls.division}` : cr.division,
        courseName: cls?.course_name,
        facultyName: facUser ? facUser.name : 'Faculty Member',
        facultyShortCode: fac?.short_code || '',
        academicYear: cr.academic_year,
        status: cr.status,
        enrolledCount: members.length,
        createdAt: cr.created_at,
      };
    });

    res.json({ success: true, data });
  } catch (error) {
    console.error('Admin classrooms error:', error);
    res.status(500).json({ success: false, message: 'Could not fetch classrooms.' });
  }
});

// POST /api/admin/classrooms - Create classroom
router.post('/classrooms', (req: AuthenticatedRequest, res: Response) => {
  try {
    const { subjectId, classId, facultyId, academicYear = '2026-27' } = req.body;
    if (!subjectId || !classId || !facultyId) {
      res.status(400).json({ success: false, message: 'Subject, Class, and Faculty are required.' });
      return;
    }

    const sub = db.getSubjects().find((s) => s.id === subjectId);
    const cls = db.getClassById(classId);
    if (!sub || !cls) {
      res.status(404).json({ success: false, message: 'Subject or Class not found.' });
      return;
    }

    const prefix = sub.subject_code ? sub.subject_code.substring(0, 3).toUpperCase() : 'CLS';
    const joinCode = db.generateUniqueJoinCode(prefix);

    const newClassroom: ClassroomEntity = {
      id: `cr_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      classroom_name: `${sub.subject_name} — ${cls.class_name}.${cls.division}`,
      join_code: joinCode,
      subject_id: subjectId,
      class_id: classId,
      division: cls.division,
      faculty_id: facultyId,
      academic_year: academicYear,
      status: 'active',
      created_at: new Date().toISOString(),
    };

    db.addClassroom(newClassroom);

    db.addAuditLog({
      action: 'ADMIN_CLASSROOM_CREATED',
      actor_id: req.user!.id,
      actor_role: 'admin',
      target_id: newClassroom.id,
      details: { joinCode, name: newClassroom.classroom_name },
    });

    res.json({
      success: true,
      message: `Classroom created! Join Code: ${joinCode}`,
      data: newClassroom,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to create classroom.' });
  }
});

// POST /api/admin/classrooms/:id/members - Admin cross-class student enrollment override
router.post('/classrooms/:id/members', (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { studentId } = req.body;

    const classroom = db.getClassrooms().find((c) => c.id === id);
    if (!classroom) {
      res.status(404).json({ success: false, message: 'Classroom not found.' });
      return;
    }

    const student = db.getStudentById(studentId);
    if (!student) {
      res.status(404).json({ success: false, message: 'Student not found.' });
      return;
    }

    const existing = db.getClassroomMember(id, student.id);
    if (existing && existing.status === 'active') {
      res.status(400).json({ success: false, message: 'Student is already a member of this classroom.' });
      return;
    }

    const nowIso = new Date().toISOString();
    const newMember = db.addClassroomMember({
      id: `cm_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      classroom_id: id,
      student_id: student.id,
      joined_at: nowIso,
      status: 'active',
      approved_by: req.user!.id,
      created_at: nowIso,
    });

    db.addAuditLog({
      action: 'ADMIN_CROSS_CLASS_ENROLLMENT',
      actor_id: req.user!.id,
      actor_role: 'admin',
      target_id: id,
      details: { studentId: student.id, classroomName: classroom.classroom_name },
    });

    res.json({
      success: true,
      message: `Student enrolled into ${classroom.classroom_name} by Admin override.`,
      data: newMember,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to enroll student.' });
  }
});

// GET /api/admin/audit-logs - Security audit logs
router.get('/audit-logs', (req: AuthenticatedRequest, res: Response) => {
  try {
    const { limit = 100 } = req.query;
    const logs = db.getAuditLogs(Number(limit));
    const users = db.getUsers();

    const data = logs.map((log) => {
      const actor = users.find((u) => u.id === log.actor_id);
      return {
        ...log,
        actorName: actor ? actor.name : log.actor_id,
        actorEmail: actor ? actor.email : '',
      };
    });

    res.json({ success: true, data });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Could not fetch audit logs.' });
  }
});

// GET /api/admin/settings
router.get('/settings', (_req: AuthenticatedRequest, res: Response) => {
  res.json({ success: true, data: db.getSettings() });
});

// PUT /api/admin/settings
router.put('/settings', (req: AuthenticatedRequest, res: Response) => {
  try {
    const {
      college_name,
      official_latitude,
      official_longitude,
      default_radius,
      min_radius,
      max_radius,
      low_attendance_threshold,
    } = req.body;

    const lat = Number(official_latitude);
    const lng = Number(official_longitude);
    const defRad = Number(default_radius);
    const minRad = Number(min_radius);
    const maxRad = Number(max_radius);
    const threshold = Number(low_attendance_threshold);

    if (isNaN(lat) || isNaN(lng) || isNaN(defRad)) {
      res.status(400).json({ success: false, message: 'Invalid latitude, longitude, or radius values.' });
      return;
    }

    if (defRad < minRad || defRad > maxRad) {
      res.status(400).json({
        success: false,
        message: `Default radius (${defRad}m) must be between minimum (${minRad}m) and maximum (${maxRad}m).`,
      });
      return;
    }

    db.updateSettings({
      college_name: college_name ? college_name.trim() : undefined,
      official_latitude: lat,
      official_longitude: lng,
      default_radius: defRad,
      min_radius: minRad,
      max_radius: maxRad,
      low_attendance_threshold: threshold,
    });

    res.json({
      success: true,
      message: 'Institution settings and location parameters saved successfully.',
      data: db.getSettings(),
    });
  } catch (error) {
    console.error('Update settings error:', error);
    res.status(500).json({ success: false, message: 'Could not update settings.' });
  }
});

// GET /api/admin/classes
router.get('/classes', (_req: AuthenticatedRequest, res: Response) => {
  res.json({ success: true, data: db.getClasses() });
});

// POST /api/admin/classes
router.post('/classes', (req: AuthenticatedRequest, res: Response) => {
  try {
    const { courseName, className, division, academicYear } = req.body;
    if (!courseName || !className || !division) {
      res.status(400).json({ success: false, message: 'Course Name, Class Name, and Division are required.' });
      return;
    }

    const newClass: ClassEntity = {
      id: `cls_${className.toLowerCase().replace(/[^a-z0-9]/g, '')}_${division.toLowerCase()}_${Date.now().toString(36)}`,
      course_name: courseName.trim(),
      class_name: className.trim().toUpperCase(),
      division: division.trim().toUpperCase(),
      academic_year: academicYear || '2026-27',
      is_active: true,
    };

    db.addClass(newClass);
    res.json({ success: true, message: `Class ${newClass.class_name}.${newClass.division} created successfully.`, data: newClass });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to create class.' });
  }
});

// PUT /api/admin/classes/:id
router.put('/classes/:id', (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { is_active, course_name, class_name, division, academic_year } = req.body;
    db.updateClass(id, {
      is_active: is_active !== undefined ? Boolean(is_active) : undefined,
      course_name,
      class_name,
      division,
      academic_year,
    });
    res.json({ success: true, message: 'Class updated successfully.', data: db.getClassById(id) });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to update class.' });
  }
});

// GET /api/admin/subjects
router.get('/subjects', (_req: AuthenticatedRequest, res: Response) => {
  const subjects = db.getSubjects().map((s) => {
    const cls = db.getClassById(s.class_id);
    return {
      ...s,
      className: cls ? `${cls.class_name}.${cls.division}` : 'Unassigned',
      courseName: cls?.course_name,
    };
  });
  res.json({ success: true, data: subjects });
});

// POST /api/admin/subjects
router.post('/subjects', (req: AuthenticatedRequest, res: Response) => {
  try {
    const { subjectName, subjectCode, classId, facultyId } = req.body;
    if (!subjectName || !subjectCode || !classId) {
      res.status(400).json({ success: false, message: 'Subject name, code, and target class are required.' });
      return;
    }

    const newSubject: SubjectEntity = {
      id: `sub_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      subject_name: subjectName.trim(),
      subject_code: subjectCode.trim().toUpperCase(),
      class_id: classId,
    };

    db.addSubject(newSubject);

    if (facultyId) {
      const newFa: FacultyAssignment = {
        id: `fa_${Date.now()}`,
        faculty_id: facultyId,
        subject_id: newSubject.id,
        class_id: classId,
      };
      db.addFacultyAssignment(newFa);
    }

    res.json({ success: true, message: 'Subject created and mapped successfully.', data: newSubject });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to create subject.' });
  }
});

// GET /api/admin/users
router.get('/users', (req: AuthenticatedRequest, res: Response) => {
  try {
    const { role } = req.query;
    let users = db.getUsers();

    if (role) {
      users = users.filter((u) => u.role === role);
    }

    const settings = db.getSettings();
    const threshold = settings.low_attendance_threshold || 75;

    const data = users.map((u) => {
      let extra: any = {};
      if (u.role === 'student') {
        const std = db.getStudentByUserId(u.id);
        if (std) {
          const cls = db.getClassById(std.class_id);
          const sessions = db.getAttendanceSessions({ classId: std.class_id, status: 'CLOSED' });
          const records = db.getAttendanceRecords({ studentId: std.id });
          const attended = records.filter((r) => r.status === 'PRESENT').length;
          const total = sessions.length;
          const percentage = total > 0 ? Math.round((attended / total) * 10000) / 100 : 100;
          const joinedCrCount = db.getClassroomMembers({ studentId: std.id, status: 'active' }).length;

          extra = {
            studentId: std.student_id,
            rollNumber: std.roll_number,
            className: cls ? `${cls.class_name}.${cls.division}` : 'TYCS.A',
            academicYear: std.academic_year,
            joinedClassroomsCount: joinedCrCount,
            totalLectures: total,
            attendedCount: attended,
            attendancePercentage: percentage,
            isDefaulter: total > 0 && percentage < threshold,
          };
        }
      } else if (u.role === 'faculty') {
        const fac = db.getFacultyByUserId(u.id);
        if (fac) {
          const assignments = db.getFacultyAssignments(fac.id);
          const classrooms = db.getClassrooms({ facultyId: fac.id });
          extra = {
            department: fac.department,
            employeeId: fac.employee_id,
            shortCode: fac.short_code,
            assignedCount: assignments.length,
            classroomsCount: classrooms.length,
          };
        }
      }

      return {
        id: u.id,
        name: u.name,
        email: u.email,
        role: u.role,
        status: u.status,
        createdAt: u.created_at,
        ...extra,
      };
    });

    res.json({ success: true, data });
  } catch (error) {
    console.error('Admin users error:', error);
    res.status(500).json({ success: false, message: 'Could not fetch user list.' });
  }
});

// POST /api/admin/users - Admin directly creates user (Student, Faculty, Admin)
router.post('/users', (req: AuthenticatedRequest, res: Response) => {
  try {
    const {
      role = 'student',
      name,
      email,
      password,
      // student
      studentId,
      rollNumber,
      classId,
      division,
      academicYear = '2026-27',
      // faculty
      department,
      employeeId,
      shortCode,
      subjectId,
    } = req.body;

    if (!name || !email || !password) {
      res.status(400).json({ success: false, message: 'Name, email, and password are required.' });
      return;
    }

    const emailClean = email.trim().toLowerCase();
    const existingUser = db.getUserByEmail(emailClean);
    if (existingUser) {
      res.status(400).json({ success: false, message: 'An account with this email already exists.' });
      return;
    }

    const password_hash = bcrypt.hashSync(password, 10);
    const userId = `usr_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;

    const newUser = {
      id: userId,
      name: name.trim(),
      email: emailClean,
      password_hash,
      role: role as any,
      status: 'active' as any,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    db.addUser(newUser);

    if (role === 'student') {
      const newStudent = {
        id: `std_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        user_id: userId,
        student_id: (studentId || `TSDC-${Date.now().toString().slice(-4)}`).trim().toUpperCase(),
        roll_number: rollNumber || '101',
        class_id: classId || 'cls_tycs_a',
        division: division || 'A',
        academic_year: academicYear,
      };
      db.addStudent(newStudent);
    } else if (role === 'faculty') {
      const facId = `fac_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
      const code = (shortCode || name.trim().replace(/[^a-zA-Z]/g, '').substring(0, 3)).toUpperCase();
      
      db.addFaculty({
        id: facId,
        user_id: userId,
        department: (department || 'Computer Science').trim(),
        employee_id: (employeeId || `EMP-${Date.now().toString().slice(-4)}`).trim().toUpperCase(),
        short_code: code,
      });

      if (classId && subjectId) {
        db.addFacultyAssignment({
          id: `fa_${Date.now()}`,
          faculty_id: facId,
          subject_id: subjectId,
          class_id: classId,
        });

        const cls = db.getClassById(classId);
        const sub = db.getSubjectById(subjectId);
        if (cls && sub) {
          const joinCode = db.generateUniqueJoinCode(sub.subject_code || code);
          db.addClassroom({
            id: `cr_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
            classroom_name: `${sub.subject_name} — ${cls.class_name}.${cls.division}`,
            name: `${sub.subject_name} — ${cls.class_name}.${cls.division}`,
            join_code: joinCode,
            subject_id: sub.id,
            class_id: cls.id,
            division: cls.division,
            faculty_id: facId,
            academic_year: academicYear,
            status: 'active',
            created_at: new Date().toISOString(),
          });
        }
      }
    }

    db.addAuditLog({
      action: 'ADMIN_USER_CREATED',
      actor_id: req.user!.id,
      actor_role: 'admin',
      target_id: userId,
      details: { email: emailClean, role, name: name.trim() },
    });

    res.json({
      success: true,
      message: `${role.toUpperCase()} account for ${name} (${emailClean}) created and stored in database successfully!`,
      data: newUser,
    });
  } catch (error) {
    console.error('Admin create user error:', error);
    res.status(500).json({ success: false, message: 'Failed to create user.' });
  }
});

// PUT /api/admin/users/:id/status
router.put('/users/:id/status', (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!['active', 'inactive', 'pending_verification'].includes(status)) {
      res.status(400).json({ success: false, message: 'Invalid status value.' });
      return;
    }

    db.updateUser(id, { status });
    res.json({ success: true, message: `User status changed to ${status}.` });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to update user status.' });
  }
});

// GET /api/admin/sessions
router.get('/sessions', (_req: AuthenticatedRequest, res: Response) => {
  try {
    const sessions = db.getAttendanceSessions();
    const result = sessions.map((sess) => {
      const cls = db.getClassById(sess.class_id);
      const sub = db.getSubjects().find((s) => s.id === sess.subject_id);
      const fac = db.getFacultyById(sess.faculty_id);
      const facUser = fac ? db.getUserById(fac.user_id) : null;
      const records = db.getAttendanceRecords({ sessionId: sess.id });
      const totalEnrolled = db.getStudentsByClass(sess.class_id).length;

      return {
        id: sess.id,
        date: sess.session_date,
        startTime: sess.start_time,
        endTime: sess.end_time || null,
        className: cls ? `${cls.class_name}.${cls.division}` : 'Class',
        courseName: cls?.course_name,
        subjectName: sub?.subject_name || 'Subject',
        subjectCode: sub?.subject_code || '',
        facultyName: facUser ? facUser.name : 'Faculty Member',
        facultyShortCode: fac?.short_code || '',
        topic: sess.lecture_topic,
        radiusMeters: sess.radius_meters,
        centerLatitude: sess.center_latitude,
        centerLongitude: sess.center_longitude,
        presentCount: records.length,
        totalEnrolled,
        status: sess.status,
      };
    });

    res.json({ success: true, data: result });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to fetch sessions.' });
  }
});

// GET /api/admin/otp-logs
router.get('/otp-logs', (_req: AuthenticatedRequest, res: Response) => {
  res.json({ success: true, data: getRecentEmails() });
});

// --- FACULTY MANAGEMENT ---

// GET /api/admin/faculty - List all faculty members with details, assignments, and audit info
router.get('/faculty', (_req: AuthenticatedRequest, res: Response) => {
  try {
    const facultyList = db.getFaculty();
    const users = db.getUsers();
    const subjects = db.getSubjects();
    const classes = db.getClasses();
    const assignments = db.getFacultyAssignments();

    const result = facultyList.map((f) => {
      const user = users.find((u) => u.id === f.user_id);
      const facAssignments = assignments.filter((a) => a.faculty_id === f.id);
      const assignedSubjects = facAssignments.map((fa) => {
        const sub = subjects.find((s) => s.id === fa.subject_id);
        const cls = classes.find((c) => c.id === fa.class_id);
        return {
          assignmentId: fa.id,
          subjectId: fa.subject_id,
          subjectName: sub?.subject_name || 'Subject',
          subjectCode: sub?.subject_code || '',
          classId: fa.class_id,
          className: cls ? `${cls.class_name}.${cls.division}` : 'Class',
        };
      });

      return {
        id: f.id,
        userId: f.user_id,
        name: user?.name || 'Faculty Member',
        email: user?.email || '',
        employeeId: f.employee_id,
        department: f.department,
        shortCode: f.short_code,
        status: f.status || user?.status || 'active',
        createdBy: f.created_by_name || 'System / Seed',
        createdAt: f.created_at || user?.created_at || new Date().toISOString(),
        assignedSubjects,
      };
    });

    res.json({ success: true, data: result });
  } catch (error) {
    console.error('Fetch faculty error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch faculty list.' });
  }
});

// POST /api/admin/faculty - Admin creates a new faculty account securely
router.post('/faculty', (req: AuthenticatedRequest, res: Response) => {
  try {
    const {
      name,
      email,
      employeeId,
      department,
      shortCode,
      status = 'active',
      subjectIds = [], // Array of { subjectId, classId } or single
      classId,
      subjectId,
      temporaryPassword,
    } = req.body;

    if (!name || !email || !employeeId || !department) {
      res.status(400).json({ success: false, message: 'Name, email, employee ID, and department are required.' });
      return;
    }

    const emailClean = email.trim().toLowerCase();
    const existingUser = db.getUserByEmail(emailClean);
    if (existingUser) {
      res.status(400).json({ success: false, message: 'A user account with this email already exists.' });
      return;
    }

    const rawPassword = temporaryPassword || `Faculty@${Math.floor(1000 + Math.random() * 9000)}`;
    const passwordHash = bcrypt.hashSync(rawPassword, 10);
    const userId = `usr_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const facultyId = `fac_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const code = (shortCode || name.trim().replace(/[^a-zA-Z]/g, '').substring(0, 3)).toUpperCase();

    // 1. Create User
    const newUser = {
      id: userId,
      name: name.trim(),
      email: emailClean,
      password_hash: passwordHash,
      role: 'faculty' as any,
      status: status === 'pending' ? ('pending_verification' as any) : ('active' as any),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    db.addUser(newUser);

    // 2. Create Faculty Profile
    const newFaculty = {
      id: facultyId,
      user_id: userId,
      department: department.trim(),
      employee_id: employeeId.trim().toUpperCase(),
      short_code: code,
      status: status as any,
      created_by: req.user!.id,
      created_by_name: req.user!.name,
      created_at: new Date().toISOString(),
    };
    db.addFaculty(newFaculty);

    // 3. Assign Subjects & Classes
    const assignmentsList = Array.isArray(subjectIds) ? subjectIds : [];
    if (classId && subjectId) {
      assignmentsList.push({ subjectId, classId });
    }

    assignmentsList.forEach((item: any, idx: number) => {
      if (item.subjectId && item.classId) {
        db.addFacultyAssignment({
          id: `fa_${Date.now()}_${idx}_${Math.random().toString(36).substring(2, 4)}`,
          faculty_id: facultyId,
          subject_id: item.subjectId,
          class_id: item.classId,
        });
      }
    });

    // 4. Audit Log
    db.addAuditLog({
      action: 'FACULTY_CREATED',
      actor_id: req.user!.id,
      actor_role: 'admin',
      target_id: facultyId,
      details: `Admin ${req.user!.name} created faculty account for ${name} (${employeeId})`,
      severity: 'info',
    });

    res.json({
      success: true,
      message: 'Faculty account created successfully with secure credentials.',
      data: {
        facultyId,
        temporaryPassword: rawPassword, // returned securely once to admin for sharing
      },
    });
  } catch (error) {
    console.error('Create faculty error:', error);
    res.status(500).json({ success: false, message: 'Failed to create faculty account.' });
  }
});

// PUT /api/admin/faculty/:id - Update faculty profile or status
router.put('/faculty/:id', (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { name, email, employeeId, department, shortCode, status } = req.body;

    const facultyList = db.getFaculty();
    const fac = facultyList.find((f) => f.id === id);
    if (!fac) {
      res.status(404).json({ success: false, message: 'Faculty member not found.' });
      return;
    }

    const user = db.getUserById(fac.user_id);

    if (user && (name || email || status)) {
      db.updateUser(fac.user_id, {
        ...(name && { name: name.trim() }),
        ...(email && { email: email.trim().toLowerCase() }),
        ...(status && { status: status === 'pending' ? 'pending_verification' : status === 'active' ? 'active' : 'inactive' }),
      });
    }

    db.updateFaculty(id, {
      ...(employeeId && { employee_id: employeeId.trim().toUpperCase() }),
      ...(department && { department: department.trim() }),
      ...(shortCode && { short_code: shortCode.trim().toUpperCase() }),
      ...(status && { status }),
    });

    db.addAuditLog({
      action: 'FACULTY_UPDATED',
      actor_id: req.user!.id,
      actor_role: 'admin',
      target_id: id,
      details: `Admin ${req.user!.name} updated faculty ${name || fac.employee_id} status to ${status || 'updated'}`,
      severity: 'info',
    });

    res.json({ success: true, message: 'Faculty updated successfully.' });
  } catch (error) {
    console.error('Update faculty error:', error);
    res.status(500).json({ success: false, message: 'Failed to update faculty.' });
  }
});

// POST /api/admin/faculty/:id/assignments - Assign or remove subjects/classes
router.post('/faculty/:id/assignments', (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { subjectIds } = req.body; // Array of { subjectId, classId }

    const fac = db.getFacultyById(id);
    if (!fac) {
      res.status(404).json({ success: false, message: 'Faculty not found.' });
      return;
    }

    // Replace assignments
    db.removeFacultyAssignmentsByFacultyId(id);

    if (Array.isArray(subjectIds)) {
      subjectIds.forEach((item: any, idx: number) => {
        if (item.subjectId && item.classId) {
          db.addFacultyAssignment({
            id: `fa_${Date.now()}_${idx}_${Math.random().toString(36).substring(2, 4)}`,
            faculty_id: id,
            subject_id: item.subjectId,
            class_id: item.classId,
          });
        }
      });
    }

    db.addAuditLog({
      action: 'FACULTY_ASSIGNMENTS_UPDATED',
      actor_id: req.user!.id,
      actor_role: 'admin',
      target_id: id,
      details: `Admin ${req.user!.name} updated subject assignments for faculty ID ${id}`,
      severity: 'info',
    });

    res.json({ success: true, message: 'Faculty subject assignments updated successfully.' });
  } catch (error) {
    console.error('Faculty assignment error:', error);
    res.status(500).json({ success: false, message: 'Failed to update assignments.' });
  }
});

// POST /api/admin/faculty/:id/reset-setup - Reset credentials & resend setup
router.post('/faculty/:id/reset-setup', (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const fac = db.getFacultyById(id);
    if (!fac) {
      res.status(404).json({ success: false, message: 'Faculty not found.' });
      return;
    }

    const newTempPass = `Reset@${Math.floor(1000 + Math.random() * 9000)}`;
    const passHash = bcrypt.hashSync(newTempPass, 10);
    db.updateUser(fac.user_id, {
      password_hash: passHash,
      status: 'active',
    });
    db.updateFaculty(id, { status: 'active' });

    db.addAuditLog({
      action: 'FACULTY_SETUP_RESET',
      actor_id: req.user!.id,
      actor_role: 'admin',
      target_id: id,
      details: `Admin ${req.user!.name} reset setup and generated new credentials for faculty ID ${id}`,
      severity: 'warning',
    });

    res.json({
      success: true,
      message: 'Faculty account setup reset successfully.',
      data: { temporaryPassword: newTempPass },
    });
  } catch (error) {
    console.error('Reset faculty setup error:', error);
    res.status(500).json({ success: false, message: 'Failed to reset setup.' });
  }
});

// GET /api/admin/registration-activity - Registration activity log showing who registered and created by
router.get('/registration-activity', (_req: AuthenticatedRequest, res: Response) => {
  try {
    const users = db.getUsers();
    const students = db.getStudents();
    const facultyList = db.getFaculty();

    const activity = users.map((u) => {
      let identifier = '-';
      let additionalInfo = '-';
      let createdBy = 'Self Registration';

      if (u.role === 'student') {
        const std = students.find((s) => s.user_id === u.id);
        identifier = std ? std.student_id : '-';
        additionalInfo = std ? `Roll: ${std.roll_number}` : '-';
        createdBy = 'Self Registration (Public)';
      } else if (u.role === 'faculty') {
        const fac = facultyList.find((f) => f.user_id === u.id);
        identifier = fac ? fac.employee_id : '-';
        additionalInfo = fac ? `Dept: ${fac.department}` : '-';
        createdBy = fac?.created_by_name ? `Admin / ${fac.created_by_name}` : 'Admin / Administrator';
      } else if (u.role === 'admin') {
        createdBy = 'Secure System Seed / Admin Setup';
      }

      return {
        userId: u.id,
        name: u.name,
        email: u.email,
        role: u.role,
        identifier,
        additionalInfo,
        accountStatus: u.status,
        registeredAt: u.created_at,
        otpVerified: u.status === 'active',
        createdBy,
      };
    });

    res.json({ success: true, data: activity });
  } catch (error) {
    console.error('Registration activity error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch registration activity.' });
  }
});

// GET /api/admin/audit-logs - Audit logs
router.get('/audit-logs', (_req: AuthenticatedRequest, res: Response) => {
  try {
    const logs = db.getAuditLogs(150);
    res.json({ success: true, data: logs });
  } catch (error) {
    console.error('Audit logs error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch audit logs.' });
  }
});

// POST /api/admin/reset-data
router.post('/reset-data', (_req: AuthenticatedRequest, res: Response) => {
  db.resetToSeed();
  res.json({ success: true, message: 'Database reset to initial verified TSDC seed state with timetable & classrooms.' });
});

export default router;
