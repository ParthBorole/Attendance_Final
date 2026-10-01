import { Router, Response } from 'express';
import bcrypt from 'bcryptjs';
import { db } from '../db.js';
import { authenticate, requireRole, AuthenticatedRequest } from '../middleware/auth.js';
import { AttendanceSession, ClassroomEntity, DayOfWeek, Student, User } from '../types.js';

const router = Router();

// Apply faculty role authorization
router.use(authenticate, requireRole('faculty', 'admin'));

// Helper to determine day of week
function getCurrentDayOfWeek(): DayOfWeek {
  const days: DayOfWeek[] = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const dayIndex = new Date().getDay();
  return days[dayIndex];
}

function parseTimeMinutes(timeStr: string): number {
  if (!timeStr) return 0;
  const match = timeStr.match(/(\d+):(\d+)\s*(AM|PM)?/i);
  if (!match) return 0;
  let hours = parseInt(match[1], 10);
  const minutes = parseInt(match[2], 10);
  const meridiem = match[3]?.toUpperCase();
  if (meridiem === 'PM' && hours < 12) hours += 12;
  if (meridiem === 'AM' && hours === 12) hours = 0;
  return hours * 60 + minutes;
}

// GET /api/faculty/dashboard
router.get('/dashboard', (req: AuthenticatedRequest, res: Response) => {
  try {
    const isFaculty = req.user!.role === 'faculty';
    const faculty = isFaculty ? db.getFacultyByUserId(req.user!.id) : null;
    const assignments = db.getFacultyAssignments(faculty ? faculty.id : undefined);

    const classIds = Array.from(new Set(assignments.map((a) => a.class_id)));
    const assignedSubjectIds = Array.from(new Set(assignments.map((a) => a.subject_id)));

    const classes = db.getClasses().filter((c) => classIds.length === 0 || classIds.includes(c.id));
    const subjects = db.getSubjects().filter((s) => assignedSubjectIds.includes(s.id) || !isFaculty);

    // Faculty classrooms
    const classrooms = faculty
      ? db.getClassrooms({ facultyId: faculty.id })
      : db.getClassrooms();

    // Sessions strictly filtered by faculty
    const allSessions = faculty
      ? db.getAttendanceSessions({ facultyId: faculty.id })
      : db.getAttendanceSessions();

    const activeSessions = allSessions.filter((s) => s.status === 'ACTIVE');
    const todayStr = new Date().toISOString().split('T')[0];
    const todaySessions = allSessions.filter((s) => s.session_date === todayStr);

    const settings = db.getSettings();

    // Faculty Timetable
    const facultyTimetable = faculty
      ? db.getTimetable({ facultyId: faculty.id })
      : db.getTimetable();

    const currentDay = getCurrentDayOfWeek();
    const todayTimetableSlots = facultyTimetable
      .filter((t) => t.day_of_week === currentDay)
      .sort((a, b) => parseTimeMinutes(a.start_time) - parseTimeMinutes(b.start_time))
      .map((t) => {
        const sub = subjects.find((s) => s.id === t.subject_id);
        const cls = classes.find((c) => c.id === t.class_id);
        const cr = classrooms.find((c) => c.subject_id === t.subject_id && c.class_id === t.class_id);
        const activeSess = activeSessions.find((s) => s.subject_id === t.subject_id && s.class_id === t.class_id);

        return {
          id: t.id,
          classId: t.class_id,
          className: cls ? `${cls.class_name}.${cls.division}` : 'TYCS.A',
          subjectId: t.subject_id,
          subjectName: sub?.subject_name || 'Subject',
          subjectCode: sub?.subject_code || '',
          room: t.room || 'Classroom',
          isLab: t.is_lab,
          batch: t.batch,
          startTime: t.start_time,
          endTime: t.end_time,
          joinCode: cr?.join_code || '',
          isActiveNow: !!activeSess,
          activeSessionId: activeSess?.id || null,
        };
      });

    res.json({
      success: true,
      data: {
        faculty: faculty
          ? {
              id: faculty.id,
              name: req.user!.name,
              email: req.user!.email,
              department: faculty.department,
              employeeId: faculty.employee_id,
              shortCode: faculty.short_code,
            }
          : {
              id: 'admin_faculty',
              name: req.user!.name,
              email: req.user!.email,
              department: 'Administration',
              employeeId: 'ADMIN-01',
              shortCode: 'ADM',
            },
        assignedClasses: classes,
        assignedSubjects: subjects,
        classrooms: classrooms.map((cr) => {
          const sub = subjects.find((s) => s.id === cr.subject_id);
          const cls = classes.find((c) => c.id === cr.class_id);
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
            academicYear: cr.academic_year,
            status: cr.status,
            enrolledStudentsCount: members.length,
            createdAt: cr.created_at,
          };
        }),
        todayTimetable: todayTimetableSlots,
        activeSessions: activeSessions.map((sess) => {
          const cls = db.getClassById(sess.class_id);
          const sub = db.getSubjects().find((s) => s.id === sess.subject_id);
          const records = db.getAttendanceRecords({ sessionId: sess.id });
          const crMembers = db.getClassroomMembers({ classroomId: undefined });
          const relatedCr = db.getClassrooms().find((c) => c.class_id === sess.class_id && c.subject_id === sess.subject_id);
          const enrolledInCr = relatedCr ? db.getClassroomMembers({ classroomId: relatedCr.id, status: 'active' }).length : 0;

          return {
            id: sess.id,
            classId: sess.class_id,
            className: cls ? `${cls.class_name}.${cls.division}` : 'Class',
            courseName: cls?.course_name,
            subjectId: sess.subject_id,
            subjectName: sub?.subject_name || 'Subject',
            lectureTopic: sess.lecture_topic,
            sessionDate: sess.session_date,
            startTime: sess.start_time,
            radiusMeters: sess.radius_meters,
            centerLatitude: sess.center_latitude,
            centerLongitude: sess.center_longitude,
            presentCount: records.length,
            totalEnrolled: enrolledInCr || db.getStudentsByClass(sess.class_id).length,
            status: sess.status,
          };
        }),
        stats: {
          totalClasses: classes.length,
          totalSubjects: subjects.length,
          totalClassrooms: classrooms.length,
          todaySessionsCount: todaySessions.length,
          activeSessionsCount: activeSessions.length,
          defaultRadius: settings.default_radius,
          minRadius: settings.min_radius,
          maxRadius: settings.max_radius,
        },
      },
    });
  } catch (error) {
    console.error('Faculty dashboard error:', error);
    res.status(500).json({ success: false, message: 'Could not load faculty dashboard.' });
  }
});

// GET /api/faculty/classrooms - Manage classrooms & join codes
router.get('/classrooms', (req: AuthenticatedRequest, res: Response) => {
  try {
    const isFaculty = req.user!.role === 'faculty';
    const faculty = isFaculty ? db.getFacultyByUserId(req.user!.id) : null;
    const classrooms = faculty ? db.getClassrooms({ facultyId: faculty.id }) : db.getClassrooms();
    const subjects = db.getSubjects();
    const classes = db.getClasses();

    const data = classrooms.map((cr) => {
      const sub = subjects.find((s) => s.id === cr.subject_id);
      const cls = classes.find((c) => c.id === cr.class_id);
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
        division: cr.division,
        academicYear: cr.academic_year,
        status: cr.status,
        enrolledCount: members.length,
        createdAt: cr.created_at,
      };
    });

    res.json({ success: true, data });
  } catch (error) {
    console.error('Faculty classrooms error:', error);
    res.status(500).json({ success: false, message: 'Could not fetch classrooms.' });
  }
});

// POST /api/faculty/classrooms - Create new classroom
router.post('/classrooms', (req: AuthenticatedRequest, res: Response) => {
  try {
    const { subjectId, classId, academicYear = '2026-27' } = req.body;
    if (!subjectId || !classId) {
      res.status(400).json({ success: false, message: 'Subject and Class are required.' });
      return;
    }

    const isFaculty = req.user!.role === 'faculty';
    let facultyId = 'fac_var';
    if (isFaculty) {
      const faculty = db.getFacultyByUserId(req.user!.id);
      if (!faculty) {
        res.status(403).json({ success: false, message: 'Faculty profile not found.' });
        return;
      }
      facultyId = faculty.id;

      // Backend security: Faculty can ONLY create classrooms for assigned subjects & classes
      const assignments = db.getFacultyAssignments(faculty.id);
      const isAssigned = assignments.some((a) => a.subject_id === subjectId && a.class_id === classId);
      if (!isAssigned) {
        db.addAuditLog({
          action: 'CLASSROOM_CREATE_UNAUTHORIZED',
          actor_id: req.user!.id,
          actor_role: 'faculty',
          details: { subjectId, classId },
        });
        res.status(403).json({
          success: false,
          message: 'Security Policy Violation: You can only create classrooms for subjects and classes assigned to you.',
        });
        return;
      }
    }

    const sub = db.getSubjects().find((s) => s.id === subjectId);
    const cls = db.getClassById(classId);
    if (!sub || !cls) {
      res.status(404).json({ success: false, message: 'Subject or Class not found.' });
      return;
    }

    // Generate unique secure join code
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
      action: 'CLASSROOM_CREATED',
      actor_id: req.user!.id,
      actor_role: isFaculty ? 'faculty' : 'admin',
      target_id: newClassroom.id,
      details: { joinCode, classroomName: newClassroom.classroom_name },
    });

    res.json({
      success: true,
      message: `Classroom created! Join Code: ${joinCode}`,
      data: newClassroom,
    });
  } catch (error) {
    console.error('Create classroom error:', error);
    res.status(500).json({ success: false, message: 'Failed to create classroom.' });
  }
});

// POST /api/faculty/classrooms/:id/regenerate-code - Regenerate classroom join code
router.post('/classrooms/:id/regenerate-code', (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const classroom = db.getClassrooms().find((c) => c.id === id);
    if (!classroom) {
      res.status(404).json({ success: false, message: 'Classroom not found.' });
      return;
    }

    const isFaculty = req.user!.role === 'faculty';
    if (isFaculty) {
      const faculty = db.getFacultyByUserId(req.user!.id);
      if (!faculty || classroom.faculty_id !== faculty.id) {
        db.addAuditLog({
          action: 'CLASSROOM_REGEN_CODE_UNAUTHORIZED',
          actor_id: req.user!.id,
          actor_role: 'faculty',
          target_id: id,
        });
        res.status(403).json({ success: false, message: 'Access Denied: You do not manage this classroom.' });
        return;
      }
    }

    const sub = db.getSubjects().find((s) => s.id === classroom.subject_id);
    const prefix = sub?.subject_code ? sub.subject_code.substring(0, 3).toUpperCase() : 'CLS';
    const oldCode = classroom.join_code;
    const newCode = db.generateUniqueJoinCode(prefix);

    db.updateClassroom(id, { join_code: newCode });

    db.addAuditLog({
      action: 'CLASSROOM_CODE_REGENERATED',
      actor_id: req.user!.id,
      actor_role: isFaculty ? 'faculty' : 'admin',
      target_id: id,
      details: { oldCode, newCode },
    });

    res.json({
      success: true,
      message: `New Classroom Join Code generated: ${newCode}. The previous code ${oldCode} is now invalid.`,
      data: { joinCode: newCode },
    });
  } catch (error) {
    console.error('Regenerate code error:', error);
    res.status(500).json({ success: false, message: 'Failed to regenerate join code.' });
  }
});

// PUT /api/faculty/classrooms/:id/status - Enable/Disable classroom
router.put('/classrooms/:id/status', (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    if (!['active', 'disabled', 'archived'].includes(status)) {
      res.status(400).json({ success: false, message: 'Invalid status value.' });
      return;
    }

    const classroom = db.getClassrooms().find((c) => c.id === id);
    if (!classroom) {
      res.status(404).json({ success: false, message: 'Classroom not found.' });
      return;
    }

    const isFaculty = req.user!.role === 'faculty';
    if (isFaculty) {
      const faculty = db.getFacultyByUserId(req.user!.id);
      if (!faculty || classroom.faculty_id !== faculty.id) {
        res.status(403).json({ success: false, message: 'Access Denied: You do not manage this classroom.' });
        return;
      }
    }

    db.updateClassroom(id, { status });

    db.addAuditLog({
      action: 'CLASSROOM_STATUS_CHANGED',
      actor_id: req.user!.id,
      actor_role: isFaculty ? 'faculty' : 'admin',
      target_id: id,
      details: { newStatus: status },
    });

    res.json({
      success: true,
      message: `Classroom status updated to ${status}.`,
    });
  } catch (error) {
    console.error('Update classroom status error:', error);
    res.status(500).json({ success: false, message: 'Failed to update classroom status.' });
  }
});

// GET /api/faculty/classrooms/:id/members - View enrolled students in this classroom
router.get('/classrooms/:id/members', (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const classroom = db.getClassrooms().find((c) => c.id === id);
    if (!classroom) {
      res.status(404).json({ success: false, message: 'Classroom not found.' });
      return;
    }

    const isFaculty = req.user!.role === 'faculty';
    if (isFaculty) {
      const faculty = db.getFacultyByUserId(req.user!.id);
      if (!faculty || classroom.faculty_id !== faculty.id) {
        res.status(403).json({ success: false, message: 'Access Denied: You do not manage this classroom.' });
        return;
      }
    }

    const members = db.getClassroomMembers({ classroomId: id });
    const students = db.getStudents();
    const users = db.getUsers();
    const sessions = db.getAttendanceSessions({ classId: classroom.class_id, subjectId: classroom.subject_id, status: 'CLOSED' });
    const totalSubjectLectures = sessions.length;

    const data = members.map((m) => {
      const std = students.find((s) => s.id === m.student_id);
      if (!std) return null;
      const u = users.find((usr) => usr.id === std.user_id);
      const records = db.getAttendanceRecords({ studentId: std.id });
      const presentCount = records.filter((r) => sessions.some((s) => s.id === r.session_id && r.status === 'PRESENT')).length;
      const percentage = totalSubjectLectures > 0 ? Math.round((presentCount / totalSubjectLectures) * 10000) / 100 : 100;

      return {
        membershipId: m.id,
        studentId: std.id,
        studentCode: std.student_id,
        rollNumber: std.roll_number,
        name: u ? u.name : 'Student',
        email: u ? u.email : '',
        joinedAt: m.joined_at,
        status: m.status,
        attendance: {
          presentCount,
          totalSubjectLectures,
          percentage,
          isDefaulter: totalSubjectLectures > 0 && percentage < 75,
        },
      };
    }).filter(Boolean);

    res.json({
      success: true,
      data: {
        classroom,
        members: data,
        totalEnrolled: data.length,
      },
    });
  } catch (error) {
    console.error('Classroom members error:', error);
    res.status(500).json({ success: false, message: 'Could not fetch classroom members.' });
  }
});

// GET /api/faculty/timetable - Timetable for this faculty member
router.get('/timetable', (req: AuthenticatedRequest, res: Response) => {
  try {
    const isFaculty = req.user!.role === 'faculty';
    const faculty = isFaculty ? db.getFacultyByUserId(req.user!.id) : null;

    const myTimetable = faculty
      ? db.getTimetable({ facultyId: faculty.id })
      : db.getTimetable();

    const allTimetable = db.getTimetable({ classId: 'cls_tycs_a' });

    const subjects = db.getSubjects();
    const classes = db.getClasses();
    const classrooms = db.getClassrooms();
    const faculties = db.getFaculty();
    const users = db.getUsers();
    const activeSessions = db.getAttendanceSessions({ status: 'ACTIVE' });
    const currentDay = getCurrentDayOfWeek();

    const days: DayOfWeek[] = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

    // 1. My subject slots
    const formattedMyTimetable = days.map((day) => {
      const slots = myTimetable
        .filter((t) => t.day_of_week === day)
        .sort((a, b) => parseTimeMinutes(a.start_time) - parseTimeMinutes(b.start_time))
        .map((entry) => {
          const sub = subjects.find((s) => s.id === entry.subject_id);
          const cls = classes.find((c) => c.id === entry.class_id);
          const cr = classrooms.find((c) => c.subject_id === entry.subject_id && c.class_id === entry.class_id);
          const activeSess = activeSessions.find((s) => s.subject_id === entry.subject_id && s.class_id === entry.class_id);

          return {
            id: entry.id,
            subjectId: entry.subject_id,
            subjectName: sub?.subject_name || 'Subject',
            subjectCode: sub?.subject_code || '',
            classId: entry.class_id,
            className: cls ? `${cls.class_name}.${cls.division}` : 'TYCS.A',
            room: entry.room || 'Classroom',
            isLab: entry.is_lab,
            batch: entry.batch,
            startTime: entry.start_time,
            endTime: entry.end_time,
            joinCode: cr?.join_code || '',
            isActiveNow: day === currentDay && !!activeSess,
            activeSessionId: activeSess?.id || null,
            isMySubject: true,
          };
        });

      return {
        day,
        isToday: day === currentDay,
        slots,
      };
    });

    // 2. Full class timetable (matching Student Dashboard)
    const formattedFullTimetable = days.map((day) => {
      const slots = allTimetable
        .filter((t) => t.day_of_week === day)
        .sort((a, b) => parseTimeMinutes(a.start_time) - parseTimeMinutes(b.start_time))
        .map((entry) => {
          const sub = subjects.find((s) => s.id === entry.subject_id);
          const cls = classes.find((c) => c.id === entry.class_id);
          const fac = faculties.find((f) => f.id === entry.faculty_id);
          const facUser = fac ? users.find((u) => u.id === fac.user_id) : null;
          const cr = classrooms.find((c) => c.subject_id === entry.subject_id && c.class_id === entry.class_id);
          const activeSess = activeSessions.find((s) => s.subject_id === entry.subject_id && s.class_id === entry.class_id);
          const isMySubject = faculty ? entry.faculty_id === faculty.id : true;

          return {
            id: entry.id,
            subjectId: entry.subject_id,
            subjectName: sub?.subject_name || 'Subject',
            subjectCode: sub?.subject_code || '',
            facultyName: facUser ? facUser.name : 'Faculty',
            facultyShortCode: fac?.short_code || '',
            classId: entry.class_id,
            className: cls ? `${cls.class_name}.${cls.division}` : 'TYCS.A',
            room: entry.room || 'Classroom',
            isLab: entry.is_lab,
            batch: entry.batch,
            startTime: entry.start_time,
            endTime: entry.end_time,
            joinCode: cr?.join_code || '',
            isActiveNow: day === currentDay && !!activeSess,
            activeSessionId: activeSess?.id || null,
            isMySubject,
          };
        });

      return {
        day,
        isToday: day === currentDay,
        slots,
      };
    });

    // Weekly schedule keyed by day
    const weeklySchedule: Record<string, any[]> = {};
    formattedMyTimetable.forEach((d) => {
      weeklySchedule[d.day] = d.slots;
    });

    const fullWeeklySchedule: Record<string, any[]> = {};
    formattedFullTimetable.forEach((d) => {
      fullWeeklySchedule[d.day] = d.slots;
    });

    res.json({
      success: true,
      data: {
        facultyName: req.user!.name,
        shortCode: faculty?.short_code || 'ADM',
        currentDay,
        timetable: formattedMyTimetable,
        weeklySchedule,
        fullClassTimetable: formattedFullTimetable,
        fullWeeklySchedule,
      },
    });
  } catch (error) {
    console.error('Faculty timetable error:', error);
    res.status(500).json({ success: false, message: 'Could not load timetable.' });
  }
});

// GET /api/faculty/classes - Only assigned classes
router.get('/classes', (req: AuthenticatedRequest, res: Response) => {
  try {
    const isFaculty = req.user!.role === 'faculty';
    const faculty = isFaculty ? db.getFacultyByUserId(req.user!.id) : null;
    const assignments = db.getFacultyAssignments(faculty ? faculty.id : undefined);
    const assignedClassIds = Array.from(new Set(assignments.map((a) => a.class_id)));

    // Return classes that the teacher is assigned to, or all classes if not restricted
    const allClasses = db.getClasses();
    const classes = isFaculty && assignedClassIds.length > 0 
      ? allClasses.filter((c) => assignedClassIds.includes(c.id))
      : allClasses;
    res.json({ success: true, data: classes, allClasses });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Could not fetch classes.' });
  }
});

// POST /api/faculty/classes - Create new class/division
router.post('/classes', (req: AuthenticatedRequest, res: Response) => {
  try {
    const { course_name, class_name, division, academic_year = '2026-27' } = req.body;
    if (!class_name || !division) {
      res.status(400).json({ success: false, message: 'Class name (e.g. TYCS) and division (e.g. A) are required.' });
      return;
    }

    const cleanClass = class_name.trim().toUpperCase();
    const cleanDiv = division.trim().toUpperCase();
    const cleanCourse = course_name ? course_name.trim() : 'B.Sc. Computer Science';

    const classId = `cls_${cleanClass.toLowerCase()}_${cleanDiv.toLowerCase()}_${Date.now().toString(36).substring(2, 6)}`;
    const newClass = {
      id: classId,
      course_name: cleanCourse,
      class_name: cleanClass,
      division: cleanDiv,
      academic_year,
      is_active: true,
    };

    db.addClass(newClass);

    // Auto assign to faculty if faculty role
    const isFaculty = req.user!.role === 'faculty';
    if (isFaculty) {
      const faculty = db.getFacultyByUserId(req.user!.id);
      if (faculty) {
        // Also auto-assign so they can create sessions for it
        db.addFacultyAssignment({
          id: `fa_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
          faculty_id: faculty.id,
          class_id: classId,
          subject_id: '',
        });
      }
    }

    db.addAuditLog({
      action: 'CLASS_CREATED',
      actor_id: req.user!.id,
      actor_role: req.user!.role,
      target_id: classId,
      details: { class_name: cleanClass, division: cleanDiv, course_name: cleanCourse },
    });

    res.json({ success: true, message: `Class ${cleanClass}-${cleanDiv} created successfully.`, data: newClass });
  } catch (error) {
    console.error('Create class error:', error);
    res.status(500).json({ success: false, message: 'Could not create class.' });
  }
});

// PUT /api/faculty/classes/:id - Update class/division
router.put('/classes/:id', (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { course_name, class_name, division, academic_year, is_active } = req.body;
    const existing = db.getClassById(id);
    if (!existing) {
      res.status(404).json({ success: false, message: 'Class not found.' });
      return;
    }

    const updates: any = {};
    if (course_name !== undefined) updates.course_name = course_name.trim();
    if (class_name !== undefined) updates.class_name = class_name.trim().toUpperCase();
    if (division !== undefined) updates.division = division.trim().toUpperCase();
    if (academic_year !== undefined) updates.academic_year = academic_year.trim();
    if (is_active !== undefined) updates.is_active = Boolean(is_active);

    db.updateClass(id, updates);

    db.addAuditLog({
      action: 'CLASS_UPDATED',
      actor_id: req.user!.id,
      actor_role: req.user!.role,
      target_id: id,
      details: updates,
    });

    res.json({ success: true, message: 'Class updated successfully.', data: { ...existing, ...updates } });
  } catch (error) {
    console.error('Update class error:', error);
    res.status(500).json({ success: false, message: 'Could not update class.' });
  }
});

// DELETE /api/faculty/classes/:id - Delete class/division
router.delete('/classes/:id', (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const existing = db.getClassById(id);
    if (!existing) {
      res.status(404).json({ success: false, message: 'Class not found.' });
      return;
    }

    db.deleteClass(id);

    db.addAuditLog({
      action: 'CLASS_DELETED',
      actor_id: req.user!.id,
      actor_role: req.user!.role,
      target_id: id,
      details: { class_name: existing.class_name, division: existing.division },
    });

    res.json({ success: true, message: `Class ${existing.class_name}-${existing.division} deleted successfully.` });
  } catch (error) {
    console.error('Delete class error:', error);
    res.status(500).json({ success: false, message: 'Could not delete class.' });
  }
});

// GET /api/faculty/subjects - Only assigned subjects
router.get('/subjects', (req: AuthenticatedRequest, res: Response) => {
  try {
    const { classId } = req.query;
    const isFaculty = req.user!.role === 'faculty';
    const faculty = isFaculty ? db.getFacultyByUserId(req.user!.id) : null;
    const assignments = db.getFacultyAssignments(faculty ? faculty.id : undefined);
    const assignedSubjectIds = Array.from(new Set(assignments.map((a) => a.subject_id).filter(Boolean)));

    let subjects = db.getSubjects();
    if (isFaculty && assignedSubjectIds.length > 0) {
      subjects = subjects.filter((s) => assignedSubjectIds.includes(s.id));
    }

    if (classId) {
      subjects = subjects.filter((s) => s.class_id === classId);
    }

    res.json({ success: true, data: subjects, allSubjects: db.getSubjects() });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Could not fetch subjects.' });
  }
});

// POST /api/faculty/subjects - Create new subject
router.post('/subjects', (req: AuthenticatedRequest, res: Response) => {
  try {
    const { subject_name, subject_code, class_id } = req.body;
    if (!subject_name || !subject_code || !class_id) {
      res.status(400).json({ success: false, message: 'Subject name, subject code, and class ID are required.' });
      return;
    }

    const cls = db.getClassById(class_id);
    if (!cls) {
      res.status(400).json({ success: false, message: 'Invalid class ID provided.' });
      return;
    }

    const cleanName = subject_name.trim();
    const cleanCode = subject_code.trim().toUpperCase();
    const subjectId = `sub_${cleanCode.toLowerCase().replace(/[^a-z0-9]/g, '_')}_${Date.now().toString(36).substring(2, 6)}`;

    const newSubject = {
      id: subjectId,
      subject_name: cleanName,
      subject_code: cleanCode,
      class_id,
    };

    db.addSubject(newSubject);

    // Auto assign to faculty if faculty role
    const isFaculty = req.user!.role === 'faculty';
    if (isFaculty) {
      const faculty = db.getFacultyByUserId(req.user!.id);
      if (faculty) {
        db.addFacultyAssignment({
          id: `fa_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
          faculty_id: faculty.id,
          class_id,
          subject_id: subjectId,
        });
      }
    }

    db.addAuditLog({
      action: 'SUBJECT_CREATED',
      actor_id: req.user!.id,
      actor_role: req.user!.role,
      target_id: subjectId,
      details: { subject_name: cleanName, subject_code: cleanCode, class_id },
    });

    res.json({ success: true, message: `Subject ${cleanName} (${cleanCode}) created successfully.`, data: newSubject });
  } catch (error) {
    console.error('Create subject error:', error);
    res.status(500).json({ success: false, message: 'Could not create subject.' });
  }
});

// PUT /api/faculty/subjects/:id - Update subject
router.put('/subjects/:id', (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { subject_name, subject_code, class_id } = req.body;
    const existing = db.getSubjectById(id);
    if (!existing) {
      res.status(404).json({ success: false, message: 'Subject not found.' });
      return;
    }

    const updates: any = {};
    if (subject_name !== undefined) updates.subject_name = subject_name.trim();
    if (subject_code !== undefined) updates.subject_code = subject_code.trim().toUpperCase();
    if (class_id !== undefined) updates.class_id = class_id;

    db.updateSubject(id, updates);

    db.addAuditLog({
      action: 'SUBJECT_UPDATED',
      actor_id: req.user!.id,
      actor_role: req.user!.role,
      target_id: id,
      details: updates,
    });

    res.json({ success: true, message: 'Subject updated successfully.', data: { ...existing, ...updates } });
  } catch (error) {
    console.error('Update subject error:', error);
    res.status(500).json({ success: false, message: 'Could not update subject.' });
  }
});

// DELETE /api/faculty/subjects/:id - Delete subject
router.delete('/subjects/:id', (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const existing = db.getSubjectById(id);
    if (!existing) {
      res.status(404).json({ success: false, message: 'Subject not found.' });
      return;
    }

    db.deleteSubject(id);

    db.addAuditLog({
      action: 'SUBJECT_DELETED',
      actor_id: req.user!.id,
      actor_role: req.user!.role,
      target_id: id,
      details: { subject_name: existing.subject_name, subject_code: existing.subject_code },
    });

    res.json({ success: true, message: `Subject ${existing.subject_name} deleted successfully.` });
  } catch (error) {
    console.error('Delete subject error:', error);
    res.status(500).json({ success: false, message: 'Could not delete subject.' });
  }
});

// POST /api/faculty/sessions - Create and start attendance session
router.post('/sessions', (req: AuthenticatedRequest, res: Response) => {
  try {
    const classId = req.body.classId || req.body.class_id;
    const subjectId = req.body.subjectId || req.body.subject_id;
    const lectureTopic = req.body.lectureTopic || req.body.lecture_topic;
    const lectureNumber = req.body.lectureNumber || req.body.lecture_number;
    const radiusMeters = req.body.radiusMeters || req.body.radius_meters;
    const sessionDate = req.body.sessionDate || req.body.session_date;
    const startTime = req.body.startTime || req.body.start_time;
    const attendanceMode = req.body.attendanceMode || req.body.attendance_mode || 'SMART_GEOFENCE';

    if (!classId || !subjectId || !lectureTopic) {
      res.status(400).json({
        success: false,
        message: 'Class, Subject, and Lecture Topic ("What was taught today?") are required.',
      });
      return;
    }

    const isFaculty = req.user!.role === 'faculty';
    let facultyId = 'fac_var';
    if (isFaculty) {
      const faculty = db.getFacultyByUserId(req.user!.id);
      if (!faculty) {
        res.status(403).json({ success: false, message: 'Faculty profile not found.' });
        return;
      }
      facultyId = faculty.id;

      // STRICT BACKEND SECURITY CHECK: Verify faculty is assigned to this class and subject
      const assignments = db.getFacultyAssignments(faculty.id);
      const hasAssignment = assignments.some((a) => a.class_id === classId && (!a.subject_id || a.subject_id === subjectId));
      if (!hasAssignment) {
        db.addAuditLog({
          action: 'SESSION_CREATE_UNAUTHORIZED',
          actor_id: req.user!.id,
          actor_role: 'faculty',
          details: { classId, subjectId },
        });
        res.status(403).json({
          success: false,
          message: 'Security Policy Violation: You are not authorized to start attendance for a subject or class not assigned to you.',
        });
        return;
      }
    }

    const settings = db.getSettings();
    const radius = Number(radiusMeters) || settings.default_radius || 10;

    if (radius < settings.min_radius || radius > settings.max_radius) {
      res.status(400).json({
        success: false,
        message: `Radius must be between ${settings.min_radius}m and ${settings.max_radius}m.`,
      });
      return;
    }

    const now = new Date();
    const startTimeFormatted = startTime || now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    // Official fixed TSDC Kandivali Campus Geofence Anchor (Thakur Shyamnarayan Degree College)
    const collegeLat = settings.official_latitude || 19.213805;
    const collegeLng = settings.official_longitude || 72.864810;

    const newSession: AttendanceSession = {
      id: `sess_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      class_id: classId,
      subject_id: subjectId,
      faculty_id: facultyId,
      lecture_topic: lectureTopic.trim(),
      lecture_number: lectureNumber || undefined,
      session_date: sessionDate || now.toISOString().split('T')[0],
      start_time: startTimeFormatted,
      radius_meters: radius,
      center_latitude: collegeLat,
      center_longitude: collegeLng,
      status: 'ACTIVE',
      is_locked: false,
      attendance_mode: attendanceMode,
      created_at: now.toISOString(),
    };

    db.createSession(newSession);

    db.addAuditLog({
      action: 'SESSION_STARTED',
      actor_id: req.user!.id,
      actor_role: isFaculty ? 'faculty' : 'admin',
      target_id: newSession.id,
      details: { topic: newSession.lecture_topic, lectureNumber: newSession.lecture_number, radius, mode: attendanceMode },
    });

    const cls = db.getClassById(classId);
    const sub = db.getSubjects().find((s) => s.id === subjectId);

    res.json({
      success: true,
      message: `Attendance Session started for ${cls?.class_name}.${cls?.division} - ${sub?.subject_name}.`,
      data: newSession,
    });
  } catch (error) {
    console.error('Create session error:', error);
    res.status(500).json({ success: false, message: 'Failed to create attendance session.' });
  }
});

// POST /api/faculty/sessions/manual-record - Record bulk manual attendance sheet
router.post('/sessions/manual-record', (req: AuthenticatedRequest, res: Response) => {
  try {
    const existingSessionId = req.body.existingSessionId || req.body.sessionId || req.body.session_id;
    const classId = req.body.classId || req.body.class_id;
    const subjectId = req.body.subjectId || req.body.subject_id;
    const lectureTopic = req.body.lectureTopic || req.body.lecture_topic;
    const lectureNumber = req.body.lectureNumber || req.body.lecture_number;
    const sessionDate = req.body.sessionDate || req.body.session_date;
    const startTime = req.body.startTime || req.body.start_time;
    const endTime = req.body.endTime || req.body.end_time;
    const rawList = req.body.attendances || req.body.records || [];
    const lockSession = req.body.lockSession !== undefined ? req.body.lockSession : req.body.lock_session;

    if (!classId || !subjectId || !lectureTopic) {
      res.status(400).json({ success: false, message: 'Class ID, Subject ID, and Lecture Topic are required.' });
      return;
    }

    if (!Array.isArray(rawList)) {
      res.status(400).json({ success: false, message: 'Attendances or records array is required.' });
      return;
    }

    const attendances = rawList.map((item: any) => ({
      studentId: item.studentId || item.student_id,
      status: item.status === 'PRESENT' ? 'PRESENT' : 'ABSENT',
      notes: item.notes || '',
    }));

    const isFaculty = req.user!.role === 'faculty';
    let facultyId = 'fac_var';
    if (isFaculty) {
      const faculty = db.getFacultyByUserId(req.user!.id);
      if (!faculty) {
        res.status(403).json({ success: false, message: 'Faculty profile not found.' });
        return;
      }
      facultyId = faculty.id;
    }

    const now = new Date();
    let session = existingSessionId ? db.getSessionById(existingSessionId) : null;

    if (session && session.is_locked) {
      res.status(403).json({
        success: false,
        message: 'This attendance session is locked. Please unlock it before making changes.',
      });
      return;
    }

    const sessionId = session ? session.id : `sess_man_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;

    if (!session) {
      session = {
        id: sessionId,
        class_id: classId,
        subject_id: subjectId,
        faculty_id: facultyId,
        lecture_topic: lectureTopic.trim(),
        lecture_number: lectureNumber || undefined,
        session_date: sessionDate || now.toISOString().split('T')[0],
        start_time: startTime || now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        end_time: endTime || now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        radius_meters: 50,
        center_latitude: 19.213805,
        center_longitude: 72.864810,
        status: 'CLOSED',
        is_locked: Boolean(lockSession),
        locked_at: lockSession ? now.toISOString() : undefined,
        locked_by: lockSession ? req.user!.name : undefined,
        attendance_mode: 'MANUAL',
        created_at: now.toISOString(),
      };
      db.createSession(session);
    } else {
      db.updateSession(session.id, {
        lecture_topic: lectureTopic.trim(),
        lecture_number: lectureNumber || session.lecture_number,
        session_date: sessionDate || session.session_date,
        start_time: startTime || session.start_time,
        end_time: endTime || session.end_time || now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        is_locked: Boolean(lockSession),
        locked_at: lockSession ? now.toISOString() : session.locked_at,
        locked_by: lockSession ? req.user!.name : session.locked_by,
      });
    }

    // Process attendance records
    for (const item of attendances) {
      if (item.studentId) {
        db.overrideAttendance(
          sessionId,
          item.studentId,
          item.status as any,
          facultyId,
          item.notes || 'Manual Attendance by Teacher'
        );
      }
    }

    db.addAuditLog({
      action: 'MANUAL_ATTENDANCE_RECORDED',
      actor_id: req.user!.id,
      actor_role: req.user!.role,
      target_id: sessionId,
      details: {
        classId,
        subjectId,
        lectureTopic,
        lectureNumber,
        totalMarked: attendances.length,
        presentCount: attendances.filter((a: any) => a.status === 'PRESENT').length,
        locked: lockSession,
      },
    });

    res.json({
      success: true,
      message: `Manual Attendance saved successfully for ${attendances.length} students.${lockSession ? ' Session locked.' : ''}`,
      data: { sessionId, isLocked: Boolean(lockSession), markedCount: attendances.length },
    });
  } catch (error) {
    console.error('Manual attendance error:', error);
    res.status(500).json({ success: false, message: 'Failed to record manual attendance.' });
  }
});

// POST /api/faculty/sessions/:id/lock - Lock/Unlock session to prevent accidental changes
router.post('/sessions/:id/lock', (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const lock = req.body.lock !== undefined
      ? Boolean(req.body.lock)
      : req.body.is_locked !== undefined
      ? Boolean(req.body.is_locked)
      : req.body.isLocked !== undefined
      ? Boolean(req.body.isLocked)
      : true;

    const session = db.getSessionById(id);

    if (!session) {
      res.status(404).json({ success: false, message: 'Session not found.' });
      return;
    }

    const updated = db.toggleSessionLock(id, lock, req.user!.name);

    db.addAuditLog({
      action: lock ? 'ATTENDANCE_SESSION_LOCKED' : 'ATTENDANCE_SESSION_UNLOCKED',
      actor_id: req.user!.id,
      actor_role: req.user!.role,
      target_id: id,
      details: { sessionTopic: session.lecture_topic, locked: lock },
    });

    res.json({
      success: true,
      message: lock ? 'Session has been locked against changes.' : 'Session unlocked for editing.',
      data: {
        ...updated,
        isLocked: lock,
        is_locked: lock,
      },
    });
  } catch (error) {
    console.error('Session lock error:', error);
    res.status(500).json({ success: false, message: 'Could not change session lock state.' });
  }
});

// GET /api/faculty/sessions/:id/attendance-sheet - Full attendance sheet with student details
router.get('/sessions/:id/attendance-sheet', (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const session = db.getSessionById(id);

    if (!session) {
      res.status(404).json({ success: false, message: 'Session not found.' });
      return;
    }

    const cls = db.getClassById(session.class_id);
    const sub = db.getSubjects().find((s) => s.id === session.subject_id);
    const students = db.getStudentsByClass(session.class_id);
    const records = db.getAttendanceRecords({ sessionId: id });

    const sheet = students.map((std) => {
      const u = db.getUserById(std.user_id);
      const rec = records.find((r) => r.student_id === std.id);
      return {
        studentId: std.id,
        userId: std.user_id,
        name: u ? u.name : 'Student',
        email: u ? u.email : '',
        rollNumber: std.roll_number,
        studentCode: std.student_id,
        status: rec ? rec.status : 'ABSENT',
        markedAt: rec ? rec.marked_at : null,
        method: rec?.device_id?.includes('faculty') ? 'MANUAL_FACULTY' : 'SMART_GEOLOCATION',
        photoThumbnail: rec?.camera_image_path || null,
        verificationStatus: rec?.camera_verification_status || null,
      };
    });

    // Sort by roll number numerically or alphabetically
    sheet.sort((a, b) => {
      const numA = parseInt(a.rollNumber, 10);
      const numB = parseInt(b.rollNumber, 10);
      if (!isNaN(numA) && !isNaN(numB)) return numA - numB;
      return a.rollNumber.localeCompare(b.rollNumber);
    });

    const presentCount = sheet.filter((s) => s.status === 'PRESENT').length;
    const absentCount = sheet.length - presentCount;

    res.json({
      success: true,
      data: {
        session: {
          id: session.id,
          classId: session.class_id,
          className: cls ? `${cls.class_name}.${cls.division}` : 'Class',
          subjectId: session.subject_id,
          subjectName: sub ? sub.subject_name : 'Subject',
          subjectCode: sub?.subject_code || '',
          lectureTopic: session.lecture_topic,
          lectureNumber: session.lecture_number,
          sessionDate: session.session_date,
          startTime: session.start_time,
          endTime: session.end_time,
          status: session.status,
          isLocked: session.is_locked,
          lockedAt: session.locked_at,
          lockedBy: session.locked_by,
          attendanceMode: session.attendance_mode,
        },
        stats: {
          totalEnrolled: sheet.length,
          presentCount,
          absentCount,
          attendanceRate: sheet.length > 0 ? Math.round((presentCount / sheet.length) * 100) : 0,
        },
        students: sheet,
      },
    });
  } catch (error) {
    console.error('Fetch attendance sheet error:', error);
    res.status(500).json({ success: false, message: 'Could not fetch attendance sheet.' });
  }
});

// POST /api/faculty/sessions/:id/stop - Stop session
router.post('/sessions/:id/stop', (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const session = db.getSessionById(id);

    if (!session) {
      res.status(404).json({ success: false, message: 'Session not found.' });
      return;
    }

    const isFaculty = req.user!.role === 'faculty';
    if (isFaculty) {
      const faculty = db.getFacultyByUserId(req.user!.id);
      if (!faculty || session.faculty_id !== faculty.id) {
        db.addAuditLog({
          action: 'SESSION_STOP_UNAUTHORIZED',
          actor_id: req.user!.id,
          actor_role: 'faculty',
          target_id: id,
        });
        res.status(403).json({ success: false, message: 'Access Denied: You cannot stop another faculty member\'s session.' });
        return;
      }
    }

    const now = new Date();
    const endTimeFormatted = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    db.updateSession(id, {
      status: 'CLOSED',
      end_time: endTimeFormatted,
    });

    db.addAuditLog({
      action: 'SESSION_STOPPED',
      actor_id: req.user!.id,
      actor_role: isFaculty ? 'faculty' : 'admin',
      target_id: id,
    });

    res.json({
      success: true,
      message: 'Attendance Session has been stopped and finalized.',
      data: { id, status: 'CLOSED', end_time: endTimeFormatted },
    });
  } catch (error) {
    console.error('Stop session error:', error);
    res.status(500).json({ success: false, message: 'Failed to stop session.' });
  }
});

// GET /api/faculty/sessions/:id/live - Live monitoring (Strictly checked)
router.get('/sessions/:id/live', (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const session = db.getSessionById(id);

    if (!session) {
      res.status(404).json({ success: false, message: 'Session not found.' });
      return;
    }

    const isFaculty = req.user!.role === 'faculty';
    if (isFaculty) {
      const faculty = db.getFacultyByUserId(req.user!.id);
      if (!faculty || session.faculty_id !== faculty.id) {
        db.addAuditLog({
          action: 'SESSION_LIVE_UNAUTHORIZED_ACCESS',
          actor_id: req.user!.id,
          actor_role: 'faculty',
          target_id: id,
        });
        res.status(403).json({ success: false, message: 'Access Denied: You do not have permission to view attendance for another faculty member\'s lecture.' });
        return;
      }
    }

    const cls = db.getClassById(session.class_id);
    const sub = db.getSubjects().find((s) => s.id === session.subject_id);
    const cr = db.getClassrooms().find((c) => c.class_id === session.class_id && c.subject_id === session.subject_id);
    const crMembers = cr ? db.getClassroomMembers({ classroomId: cr.id, status: 'active' }) : [];
    const enrolledStudents = db.getStudentsByClass(session.class_id);
    const attendanceRecords = db.getAttendanceRecords({ sessionId: id });

    const studentList = enrolledStudents.map((std) => {
      const u = db.getUserById(std.user_id);
      const rec = attendanceRecords.find((r) => r.student_id === std.id);
      const isPresent = !!rec && rec.status === 'PRESENT';
      const isMember = crMembers.some((m) => m.student_id === std.id);

      return {
        studentId: std.id,
        rollNumber: std.roll_number,
        studentCode: std.student_id,
        name: u ? u.name : 'Student',
        email: u ? u.email : '',
        isClassroomMember: isMember,
        status: isPresent ? 'PRESENT' : 'NOT_MARKED',
        markedAt: rec ? new Date(rec.marked_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }) : null,
        distanceMeters: rec ? rec.distance_from_center : null,
        latitude: rec ? rec.latitude : null,
        longitude: rec ? rec.longitude : null,
        accuracy: rec ? rec.accuracy : null,
        altitude: rec?.altitude ?? null,
        photoThumbnail: rec ? rec.camera_image_path : null,
        verificationStatus: rec ? rec.camera_verification_status : null,
      };
    });

    const presentCount = attendanceRecords.filter((r) => r.status === 'PRESENT').length;
    const totalEnrolled = crMembers.length > 0 ? crMembers.length : enrolledStudents.length;
    const absentCount = Math.max(0, totalEnrolled - presentCount);

    res.json({
      success: true,
      data: {
        session: {
          id: session.id,
          className: cls ? `${cls.class_name}.${cls.division}` : 'Class',
          courseName: cls?.course_name,
          subjectName: sub?.subject_name || 'Subject',
          lectureTopic: session.lecture_topic,
          sessionDate: session.session_date,
          startTime: session.start_time,
          endTime: session.end_time || null,
          radiusMeters: session.radius_meters,
          centerLatitude: session.center_latitude,
          centerLongitude: session.center_longitude,
          status: session.status,
          joinCode: cr?.join_code || null,
        },
        stats: {
          totalEnrolled,
          presentCount,
          absentCount,
          attendanceRate: totalEnrolled > 0 ? Math.round((presentCount / totalEnrolled) * 100) : 0,
        },
        students: studentList,
      },
    });
  } catch (error) {
    console.error('Live session monitoring error:', error);
    res.status(500).json({ success: false, message: 'Could not fetch live session data.' });
  }
});

// POST /api/faculty/sessions/:sessionId/override - Manual faculty attendance override
router.post('/sessions/:sessionId/override', (req: AuthenticatedRequest, res: Response) => {
  try {
    const { sessionId } = req.params;
    const { studentId, status, reason } = req.body;

    if (!studentId || !status) {
      res.status(400).json({ success: false, message: 'Student ID and status (PRESENT/ABSENT) are required.' });
      return;
    }

    const session = db.getSessionById(sessionId);
    if (!session) {
      res.status(404).json({ success: false, message: 'Session not found.' });
      return;
    }

    if (session.is_locked) {
      res.status(403).json({
        success: false,
        message: 'This attendance session is locked to prevent accidental changes. Please unlock the session first.',
      });
      return;
    }

    const faculty = db.getFacultyByUserId(req.user!.id);
    if (!faculty) {
      res.status(403).json({ success: false, message: 'Only faculty can override attendance.' });
      return;
    }

    db.overrideAttendance(sessionId, studentId, status === 'PRESENT' ? 'PRESENT' : 'ABSENT', faculty.id, reason);

    db.addAuditLog({
      action: 'ATTENDANCE_OVERRIDE',
      actor_id: req.user!.id,
      actor_role: req.user!.role,
      target_id: sessionId,
      details: { studentId, status, reason },
    });

    res.json({
      success: true,
      message: `Student status successfully updated to ${status}.`,
    });
  } catch (error) {
    console.error('Attendance override error:', error);
    res.status(500).json({ success: false, message: 'Failed to update student attendance status.' });
  }
});

// GET /api/faculty/students - Class student roster with subject-filtered attendance
router.get('/students', (req: AuthenticatedRequest, res: Response) => {
  try {
    const { classId, subjectId } = req.query;
    const isFaculty = req.user!.role === 'faculty';
    const faculty = isFaculty ? db.getFacultyByUserId(req.user!.id) : null;
    const assignments = db.getFacultyAssignments(faculty ? faculty.id : undefined);

    const targetClassId = (classId as string) || assignments[0]?.class_id || 'cls_tycs_a';
    const targetSubjectId = (subjectId as string) || assignments[0]?.subject_id;

    // Security check: Verify faculty is assigned to this class
    if (isFaculty && !assignments.some((a) => a.class_id === targetClassId)) {
      res.status(403).json({ success: false, message: 'Access Denied: You are not assigned to teach this class.' });
      return;
    }

    const students = db.getStudentsByClass(targetClassId);
    const facultySessions = faculty
      ? db.getAttendanceSessions({ facultyId: faculty.id, classId: targetClassId, subjectId: targetSubjectId, status: 'CLOSED' })
      : db.getAttendanceSessions({ classId: targetClassId, subjectId: targetSubjectId, status: 'CLOSED' });

    const totalLectures = facultySessions.length;
    const settings = db.getSettings();
    const threshold = settings.low_attendance_threshold || 75;

    const roster = students.map((std) => {
      const u = db.getUserById(std.user_id);
      const records = db.getAttendanceRecords({ studentId: std.id });
      const attended = records.filter((r) => facultySessions.some((s) => s.id === r.session_id && r.status === 'PRESENT')).length;
      const absent = Math.max(0, totalLectures - attended);
      const percentage = totalLectures > 0 ? Math.round((attended / totalLectures) * 10000) / 100 : 100;

      return {
        id: std.id,
        userId: std.user_id,
        name: u ? u.name : 'Student',
        email: u ? u.email : '',
        rollNumber: std.roll_number,
        studentId: std.student_id,
        division: std.division,
        academicYear: std.academic_year,
        totalLectures,
        presentCount: attended,
        absentCount: absent,
        percentage,
        isDefaulter: totalLectures > 0 && percentage < threshold,
      };
    });

    res.json({
      success: true,
      data: {
        students: roster,
        totalLectures,
        threshold,
      },
    });
  } catch (error) {
    console.error('Faculty students error:', error);
    res.status(500).json({ success: false, message: 'Could not fetch student roster.' });
  }
});

// GET /api/faculty/students/:id - Individual student analysis for authorized subjects only
router.get('/students/:id', (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const student = db.getStudentById(id);

    if (!student) {
      res.status(404).json({ success: false, message: 'Student not found.' });
      return;
    }

    const isFaculty = req.user!.role === 'faculty';
    const faculty = isFaculty ? db.getFacultyByUserId(req.user!.id) : null;
    const assignments = db.getFacultyAssignments(faculty ? faculty.id : undefined);

    // Faculty subject restriction
    const assignedSubjectIds = Array.from(new Set(assignments.map((a) => a.subject_id)));
    if (isFaculty && !assignments.some((a) => a.class_id === student.class_id)) {
      db.addAuditLog({
        action: 'FACULTY_UNAUTHORIZED_STUDENT_ACCESS',
        actor_id: req.user!.id,
        actor_role: 'faculty',
        target_id: id,
      });
      res.status(403).json({ success: false, message: 'Access Denied: You do not teach this student\'s class.' });
      return;
    }

    const u = db.getUserById(student.user_id);
    const cls = db.getClassById(student.class_id);
    const subjects = db.getSubjectsByClass(student.class_id).filter((s) => !isFaculty || assignedSubjectIds.includes(s.id));
    const facultySessions = faculty
      ? db.getAttendanceSessions({ facultyId: faculty.id, classId: student.class_id })
      : db.getAttendanceSessions({ classId: student.class_id });

    const records = db.getAttendanceRecords({ studentId: student.id });
    const settings = db.getSettings();
    const threshold = settings.low_attendance_threshold || 75;

    const pastSessions = facultySessions.filter((s) => s.status === 'CLOSED');
    const totalLectures = pastSessions.length;
    const attendedCount = records.filter((r) => pastSessions.some((s) => s.id === r.session_id && r.status === 'PRESENT')).length;
    const overallPercentage = totalLectures > 0 ? Math.round((attendedCount / totalLectures) * 10000) / 100 : 100;

    // Subject breakdown (only assigned subjects)
    const subjectStats = subjects.map((sub) => {
      const subSessions = pastSessions.filter((s) => s.subject_id === sub.id);
      const subTotal = subSessions.length;
      const subPresent = records.filter((r) => {
        const sess = facultySessions.find((s) => s.id === r.session_id);
        return sess && sess.subject_id === sub.id && r.status === 'PRESENT';
      }).length;
      const subPercent = subTotal > 0 ? Math.round((subPresent / subTotal) * 10000) / 100 : 100;

      return {
        subjectId: sub.id,
        subjectName: sub.subject_name,
        subjectCode: sub.subject_code,
        totalLectures: subTotal,
        presentCount: subPresent,
        absentCount: Math.max(0, subTotal - subPresent),
        percentage: subPercent,
        isDefaulter: subTotal > 0 && subPercent < threshold,
      };
    });

    // History for this faculty's sessions only
    const attendanceHistory = facultySessions.map((sess) => {
      const sub = subjects.find((s) => s.id === sess.subject_id);
      const rec = records.find((r) => r.session_id === sess.id);
      const isPresent = !!rec && rec.status === 'PRESENT';

      return {
        sessionId: sess.id,
        date: sess.session_date,
        time: rec ? new Date(rec.marked_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : sess.start_time,
        subjectName: sub?.subject_name || 'Subject',
        topic: sess.lecture_topic,
        status: isPresent ? 'PRESENT' : 'ABSENT',
        distanceMeters: rec ? rec.distance_from_center : null,
        latitude: rec ? rec.latitude : null,
        longitude: rec ? rec.longitude : null,
        accuracy: rec ? rec.accuracy : null,
        altitude: rec?.altitude ?? null,
        altitudeAccuracy: rec?.altitude_accuracy ?? null,
        verificationStatus: rec ? rec.camera_verification_status : null,
        cameraImagePath: rec?.camera_image_path || null,
      };
    });

    attendanceHistory.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    res.json({
      success: true,
      data: {
        student: {
          id: student.id,
          name: u ? u.name : 'Student',
          email: u ? u.email : '',
          studentId: student.student_id,
          rollNumber: student.roll_number,
          className: cls?.class_name,
          division: student.division,
          courseName: cls?.course_name,
          academicYear: student.academic_year,
        },
        stats: {
          overallPercentage,
          totalLectures,
          attendedCount,
          absentCount: Math.max(0, totalLectures - attendedCount),
          isDefaulter: totalLectures > 0 && overallPercentage < threshold,
          threshold,
        },
        subjectStats,
        attendanceHistory,
      },
    });
  } catch (error) {
    console.error('Faculty student detail error:', error);
    res.status(500).json({ success: false, message: 'Could not fetch student details.' });
  }
});

// GET /api/faculty/lecture-history - Only topics taught by this faculty member
router.get('/lecture-history', (req: AuthenticatedRequest, res: Response) => {
  try {
    const isFaculty = req.user!.role === 'faculty';
    const faculty = isFaculty ? db.getFacultyByUserId(req.user!.id) : null;

    const sessions = faculty
      ? db.getAttendanceSessions({ facultyId: faculty.id })
      : db.getAttendanceSessions();

    const result = sessions.map((sess) => {
      const cls = db.getClassById(sess.class_id);
      const sub = db.getSubjects().find((s) => s.id === sess.subject_id);
      const records = db.getAttendanceRecords({ sessionId: sess.id });
      const totalEnrolled = db.getStudentsByClass(sess.class_id).length;

      return {
        id: sess.id,
        date: sess.session_date,
        time: `${sess.start_time}${sess.end_time ? ' - ' + sess.end_time : ''}`,
        className: cls ? `${cls.class_name}.${cls.division}` : 'Class',
        classId: sess.class_id,
        subjectName: sub?.subject_name || 'Subject',
        subjectId: sess.subject_id,
        subjectCode: sub?.subject_code || '',
        topic: sess.lecture_topic,
        lectureNumber: sess.lecture_number || null,
        radiusMeters: sess.radius_meters,
        presentCount: records.filter((r) => r.status === 'PRESENT').length,
        totalEnrolled,
        status: sess.status,
        isLocked: Boolean(sess.is_locked),
        lockedAt: sess.locked_at || null,
        lockedBy: sess.locked_by || null,
        attendanceMode: sess.attendance_mode || 'SMART_GEOFENCE',
      };
    });

    result.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    res.json({ success: true, data: result });
  } catch (error) {
    console.error('Lecture history error:', error);
    res.status(500).json({ success: false, message: 'Could not fetch lecture history.' });
  }
});

// GET /api/faculty/students-manage - List students for manual management
router.get('/students-manage', (req: AuthenticatedRequest, res: Response) => {
  try {
    const { classId } = req.query;
    let students = db.getStudents();
    if (classId) {
      students = students.filter((s) => s.class_id === classId);
    }

    const data = students.map((std) => {
      const u = db.getUserById(std.user_id);
      const cls = db.getClassById(std.class_id);
      return {
        id: std.id,
        userId: std.user_id,
        name: u ? u.name : 'Student',
        email: u ? u.email : '',
        rollNumber: std.roll_number,
        studentId: std.student_id,
        classId: std.class_id,
        className: cls ? `${cls.class_name}-${cls.division}` : 'Class',
        courseName: cls?.course_name || 'B.Sc. Computer Science',
        division: std.division,
        academicYear: std.academic_year,
        status: u?.status || 'active',
      };
    });

    // Sort by roll number
    data.sort((a, b) => {
      const numA = parseInt(a.rollNumber, 10);
      const numB = parseInt(b.rollNumber, 10);
      if (!isNaN(numA) && !isNaN(numB)) return numA - numB;
      return a.rollNumber.localeCompare(b.rollNumber);
    });

    res.json({ success: true, data });
  } catch (error) {
    console.error('Students manage error:', error);
    res.status(500).json({ success: false, message: 'Could not fetch students.' });
  }
});

// POST /api/faculty/students-manage - Teacher manually adds a student
router.post('/students-manage', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const {
      name,
      email,
      rollNumber,
      studentId,
      classId,
      division,
      academicYear = '2026-27',
      password = 'Student@2026',
    } = req.body;

    if (!name || !email || !rollNumber || !studentId || !classId) {
      res.status(400).json({
        success: false,
        message: 'Name, Email, Roll Number, Student ID, and Class are required.',
      });
      return;
    }

    const cleanEmail = email.trim().toLowerCase();
    const existingUser = db.getUserByEmail(cleanEmail);
    if (existingUser) {
      res.status(400).json({ success: false, message: 'A user account with this email address already exists.' });
      return;
    }

    const allStudents = db.getStudents();
    const duplicateRoll = allStudents.find((s) => s.class_id === classId && s.roll_number === rollNumber.trim());
    if (duplicateRoll) {
      res.status(400).json({ success: false, message: `Roll number ${rollNumber} already exists in this class.` });
      return;
    }

    const cls = db.getClassById(classId);
    const assignedDiv = division ? division.trim().toUpperCase() : (cls?.division || 'A');

    const now = new Date().toISOString();
    const userId = `usr_std_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const studentEntityId = `std_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const passwordHash = await bcrypt.hash(password, 10);

    const newUser: User = {
      id: userId,
      name: name.trim(),
      email: cleanEmail,
      password_hash: passwordHash,
      role: 'student',
      status: 'active',
      created_at: now,
      updated_at: now,
    };

    const newStudent: Student = {
      id: studentEntityId,
      user_id: userId,
      student_id: studentId.trim().toUpperCase(),
      roll_number: rollNumber.trim(),
      class_id: classId,
      division: assignedDiv,
      academic_year: academicYear,
    };

    db.addUser(newUser);
    db.addStudent(newStudent);

    // Auto join active classrooms for this class
    const classrooms = db.getClassrooms().filter((c) => c.class_id === classId);
    for (const c of classrooms) {
      db.addClassroomMember({
        id: `cm_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        classroom_id: c.id,
        student_id: studentEntityId,
        status: 'active',
        approved_by: req.user!.id,
        joined_at: now,
        created_at: now,
      });
    }

    db.addAuditLog({
      action: 'STUDENT_CREATED',
      actor_id: req.user!.id,
      actor_role: req.user!.role,
      target_id: studentEntityId,
      details: { name: newUser.name, email: newUser.email, roll: newStudent.roll_number, class: cls?.class_name },
    });

    res.json({
      success: true,
      message: `Student ${newUser.name} (Roll: ${newStudent.roll_number}) added successfully.`,
      data: {
        id: newStudent.id,
        userId: newUser.id,
        name: newUser.name,
        email: newUser.email,
        rollNumber: newStudent.roll_number,
        studentId: newStudent.student_id,
        classId: newStudent.class_id,
        className: cls ? `${cls.class_name}-${cls.division}` : 'Class',
        division: newStudent.division,
      },
    });
  } catch (error) {
    console.error('Create student error:', error);
    res.status(500).json({ success: false, message: 'Could not create student.' });
  }
});

// PUT /api/faculty/students-manage/:id - Edit student details
router.put('/students-manage/:id', (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { name, email, rollNumber, studentId, classId, division } = req.body;

    const student = db.getStudentById(id);
    if (!student) {
      res.status(404).json({ success: false, message: 'Student not found.' });
      return;
    }

    const user = db.getUserById(student.user_id);
    if (user) {
      const userUpdates: any = {};
      if (name) userUpdates.name = name.trim();
      if (email) userUpdates.email = email.trim().toLowerCase();
      db.updateUser(user.id, userUpdates);
    }

    const studentUpdates: any = {};
    if (rollNumber) studentUpdates.roll_number = rollNumber.trim();
    if (studentId) studentUpdates.student_id = studentId.trim().toUpperCase();
    if (classId) studentUpdates.class_id = classId;
    if (division) studentUpdates.division = division.trim().toUpperCase();

    db.updateStudent(id, studentUpdates);

    db.addAuditLog({
      action: 'STUDENT_UPDATED',
      actor_id: req.user!.id,
      actor_role: req.user!.role,
      target_id: id,
      details: { name, rollNumber, studentId, classId },
    });

    res.json({ success: true, message: 'Student updated successfully.' });
  } catch (error) {
    console.error('Update student error:', error);
    res.status(500).json({ success: false, message: 'Could not update student.' });
  }
});

// DELETE /api/faculty/students-manage/:id - Delete student
router.delete('/students-manage/:id', (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const student = db.getStudentById(id);
    if (!student) {
      res.status(404).json({ success: false, message: 'Student not found.' });
      return;
    }

    const u = db.getUserById(student.user_id);
    db.deleteStudent(id);

    db.addAuditLog({
      action: 'STUDENT_DELETED',
      actor_id: req.user!.id,
      actor_role: req.user!.role,
      target_id: id,
      details: { name: u?.name, roll: student.roll_number },
    });

    res.json({ success: true, message: `Student ${u?.name || 'record'} removed successfully.` });
  } catch (error) {
    console.error('Delete student error:', error);
    res.status(500).json({ success: false, message: 'Could not delete student.' });
  }
});

// POST /api/faculty/students-manage/:id/assign - Assign student to class / classroom
router.post('/students-manage/:id/assign', (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { classId, classroomId } = req.body;

    const student = db.getStudentById(id);
    if (!student) {
      res.status(404).json({ success: false, message: 'Student not found.' });
      return;
    }

    if (classId) {
      db.updateStudent(id, { class_id: classId });
    }

    if (classroomId) {
      const existing = db.getClassroomMember(classroomId, id);
      if (!existing) {
        db.addClassroomMember({
          id: `cm_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
          classroom_id: classroomId,
          student_id: id,
          status: 'active',
          approved_by: req.user!.id,
          joined_at: new Date().toISOString(),
          created_at: new Date().toISOString(),
        });
      }
    }

    db.addAuditLog({
      action: 'STUDENT_ASSIGNED',
      actor_id: req.user!.id,
      actor_role: req.user!.role,
      target_id: id,
      details: { classId, classroomId },
    });

    res.json({ success: true, message: 'Student assignment updated successfully.' });
  } catch (error) {
    console.error('Assign student error:', error);
    res.status(500).json({ success: false, message: 'Could not update student assignment.' });
  }
});

// GET /api/faculty/audit-logs - Faculty audit logs
router.get('/audit-logs', (req: AuthenticatedRequest, res: Response) => {
  try {
    const { limit = '100', action, search } = req.query;
    let logs = db.getAuditLogs(parseInt(limit as string, 10) || 100);

    if (action) {
      logs = logs.filter((l) => l.action.toLowerCase().includes((action as string).toLowerCase()));
    }

    if (search) {
      const q = (search as string).toLowerCase();
      logs = logs.filter((l) =>
        l.action.toLowerCase().includes(q) ||
        JSON.stringify(l.details || {}).toLowerCase().includes(q)
      );
    }

    res.json({ success: true, data: logs });
  } catch (error) {
    console.error('Audit logs error:', error);
    res.status(500).json({ success: false, message: 'Could not fetch audit logs.' });
  }
});

// GET /api/faculty/reports - Comprehensive Attendance Reports
router.get('/reports', (req: AuthenticatedRequest, res: Response) => {
  try {
    const { subjectId, classId, studentId, startDate, endDate } = req.query;
    const isFaculty = req.user!.role === 'faculty';
    const faculty = isFaculty ? db.getFacultyByUserId(req.user!.id) : null;

    // Filter sessions
    let sessions = faculty
      ? db.getAttendanceSessions({ facultyId: faculty.id })
      : db.getAttendanceSessions();

    if (classId) {
      sessions = sessions.filter((s) => s.class_id === classId);
    }
    if (subjectId) {
      sessions = sessions.filter((s) => s.subject_id === subjectId);
    }
    if (startDate) {
      sessions = sessions.filter((s) => s.session_date >= (startDate as string));
    }
    if (endDate) {
      sessions = sessions.filter((s) => s.session_date <= (endDate as string));
    }

    const pastSessions = sessions.filter((s) => s.status === 'CLOSED');
    const totalLectures = pastSessions.length;

    // Filter students
    let students = db.getStudents();
    if (classId) {
      students = students.filter((s) => s.class_id === classId);
    }
    if (studentId) {
      students = students.filter((s) => s.id === studentId);
    }

    const settings = db.getSettings();
    const threshold = settings.low_attendance_threshold || 75;

    const studentRows = students.map((std) => {
      const u = db.getUserById(std.user_id);
      const cls = db.getClassById(std.class_id);
      const records = db.getAttendanceRecords({ studentId: std.id });
      
      const attended = records.filter((r) =>
        r.status === 'PRESENT' && pastSessions.some((s) => s.id === r.session_id)
      ).length;

      const absent = Math.max(0, totalLectures - attended);
      const percentage = totalLectures > 0 ? Math.round((attended / totalLectures) * 10000) / 100 : 100;

      return {
        studentId: std.id,
        rollNumber: std.roll_number,
        studentCode: std.student_id,
        name: u ? u.name : 'Student',
        email: u ? u.email : '',
        className: cls ? `${cls.class_name}.${cls.division}` : 'Class',
        division: std.division,
        totalLectures,
        attendedCount: attended,
        absentCount: absent,
        percentage,
        isDefaulter: totalLectures > 0 && percentage < threshold,
      };
    });

    studentRows.sort((a, b) => {
      const numA = parseInt(a.rollNumber, 10);
      const numB = parseInt(b.rollNumber, 10);
      if (!isNaN(numA) && !isNaN(numB)) return numA - numB;
      return a.rollNumber.localeCompare(b.rollNumber);
    });

    const defaulters = studentRows.filter((s) => s.isDefaulter);
    const avgPercentage = studentRows.length > 0
      ? Math.round(studentRows.reduce((acc, s) => acc + s.percentage, 0) / studentRows.length)
      : 100;

    const lecturesList = pastSessions.map((s) => {
      const cls = db.getClassById(s.class_id);
      const sub = db.getSubjects().find((sub) => sub.id === s.subject_id);
      const recs = db.getAttendanceRecords({ sessionId: s.id });
      const presentCount = recs.filter((r) => r.status === 'PRESENT').length;
      return {
        id: s.id,
        date: s.session_date,
        time: s.start_time,
        topic: s.lecture_topic,
        lectureNumber: s.lecture_number || null,
        className: cls ? `${cls.class_name}.${cls.division}` : 'Class',
        subjectName: sub ? sub.subject_name : 'Subject',
        subjectCode: sub?.subject_code || '',
        presentCount,
        isLocked: Boolean(s.is_locked),
        attendanceMode: s.attendance_mode || 'SMART_GEOFENCE',
      };
    });

    res.json({
      success: true,
      data: {
        summary: {
          totalLectures,
          totalStudents: studentRows.length,
          averageAttendanceRate: avgPercentage,
          defaultersCount: defaulters.length,
          threshold,
        },
        students: studentRows,
        lectures: lecturesList,
      },
    });
  } catch (error) {
    console.error('Reports error:', error);
    res.status(500).json({ success: false, message: 'Could not generate report.' });
  }
});

export default router;
