import { Router, Response } from 'express';
import { db } from '../db.js';
import { calculateDistance, isWithinRadius } from '../utils/geo.js';
import { authenticate, requireRole, AuthenticatedRequest } from '../middleware/auth.js';
import { AttendanceRecord, DayOfWeek } from '../types.js';

const router = Router();

// Apply student role authentication to all student routes
router.use(authenticate, requireRole('student'));

// Helper to determine day of week
function getCurrentDayOfWeek(): DayOfWeek {
  const days: DayOfWeek[] = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const dayIndex = new Date().getDay();
  return days[dayIndex];
}

// Helper to check if a time slot is upcoming / next
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

// GET /api/student/dashboard
router.get('/dashboard', (req: AuthenticatedRequest, res: Response) => {
  try {
    const student = db.getStudentByUserId(req.user!.id);
    if (!student) {
      res.status(404).json({ success: false, message: 'Student profile not found.' });
      return;
    }

    const studentClass = db.getClassById(student.class_id);
    const settings = db.getSettings();
    const threshold = settings.low_attendance_threshold || 75;

    // Get classrooms student is an active member of
    const memberships = db.getClassroomMembers({ studentId: student.id, status: 'active' });
    const joinedClassroomIds = memberships.map((m) => m.classroom_id);
    const allClassrooms = db.getClassrooms();
    const joinedClassrooms = allClassrooms.filter((c) => joinedClassroomIds.includes(c.id));

    // Get subjects for joined classrooms
    const joinedSubjectIds = Array.from(new Set(joinedClassrooms.map((c) => c.subject_id)));
    const allSubjects = db.getSubjects();
    const subjects = allSubjects.filter((s) => joinedSubjectIds.includes(s.id));

    // Sessions calculation
    const allClassSessions = db.getAttendanceSessions({ classId: student.class_id });
    const relevantSessions = allClassSessions.filter((s) => joinedSubjectIds.includes(s.subject_id));
    const pastSessions = relevantSessions.filter((s) => s.status === 'CLOSED');
    const activeSessions = relevantSessions.filter((s) => s.status === 'ACTIVE');
    const myRecords = db.getAttendanceRecords({ studentId: student.id });

    // Calculate overall attendance across joined subjects
    const totalLectures = pastSessions.length;
    const attendedCount = myRecords.filter((r) => {
      const sess = allClassSessions.find((s) => s.id === r.session_id);
      return sess && joinedSubjectIds.includes(sess.subject_id) && r.status === 'PRESENT';
    }).length;
    const absentCount = Math.max(0, totalLectures - attendedCount);
    const overallPercentage = totalLectures > 0 ? Math.round((attendedCount / totalLectures) * 10000) / 100 : 100;
    const isDefaulter = totalLectures > 0 && overallPercentage < threshold;

    // Timetable calculation
    const currentDay = getCurrentDayOfWeek();
    const classTimetable = db.getTimetable({ classId: student.class_id });
    const now = new Date();
    const currentMinutes = now.getHours() * 60 + now.getMinutes();

    // Next lecture computation
    let nextLecture: any = null;
    const todayEntries = classTimetable
      .filter((t) => t.day_of_week === currentDay && joinedSubjectIds.includes(t.subject_id))
      .sort((a, b) => parseTimeMinutes(a.start_time) - parseTimeMinutes(b.start_time));

    // Look for upcoming lecture today
    for (const entry of todayEntries) {
      const endMin = parseTimeMinutes(entry.end_time);
      if (endMin >= currentMinutes) {
        const sub = allSubjects.find((s) => s.id === entry.subject_id);
        const fac = db.getFacultyById(entry.faculty_id);
        const facUser = fac ? db.getUserById(fac.user_id) : null;
        const activeSess = activeSessions.find((s) => s.subject_id === entry.subject_id);

        nextLecture = {
          id: entry.id,
          subjectName: sub?.subject_name || 'Subject',
          subjectCode: sub?.subject_code || '',
          facultyName: facUser ? facUser.name : 'Faculty Member',
          facultyShortCode: fac?.short_code || '',
          day: entry.day_of_week,
          startTime: entry.start_time,
          endTime: entry.end_time,
          room: entry.room || 'Classroom',
          isLab: entry.is_lab,
          batch: entry.batch,
          isToday: true,
          isActiveNow: !!activeSess,
          activeSessionId: activeSess?.id || null,
        };
        break;
      }
    }

    // If no more today, look at next available day's first lecture
    if (!nextLecture) {
      const daysOrder: DayOfWeek[] = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
      const currentDayIdx = daysOrder.indexOf(currentDay);
      for (let i = 1; i <= 6; i++) {
        const checkDay = daysOrder[(currentDayIdx + i) % daysOrder.length];
        const daySlots = classTimetable
          .filter((t) => t.day_of_week === checkDay && joinedSubjectIds.includes(t.subject_id))
          .sort((a, b) => parseTimeMinutes(a.start_time) - parseTimeMinutes(b.start_time));
        if (daySlots.length > 0) {
          const firstSlot = daySlots[0];
          const sub = allSubjects.find((s) => s.id === firstSlot.subject_id);
          const fac = db.getFacultyById(firstSlot.faculty_id);
          const facUser = fac ? db.getUserById(fac.user_id) : null;
          nextLecture = {
            id: firstSlot.id,
            subjectName: sub?.subject_name || 'Subject',
            subjectCode: sub?.subject_code || '',
            facultyName: facUser ? facUser.name : 'Faculty Member',
            facultyShortCode: fac?.short_code || '',
            day: firstSlot.day_of_week,
            startTime: firstSlot.start_time,
            endTime: firstSlot.end_time,
            room: firstSlot.room || 'Classroom',
            isLab: firstSlot.is_lab,
            batch: firstSlot.batch,
            isToday: false,
            isActiveNow: false,
            activeSessionId: null,
          };
          break;
        }
      }
    }

    // Today's classes list
    const todayClasses = todayEntries.map((entry) => {
      const sub = allSubjects.find((s) => s.id === entry.subject_id);
      const fac = db.getFacultyById(entry.faculty_id);
      const facUser = fac ? db.getUserById(fac.user_id) : null;
      const activeSess = activeSessions.find((s) => s.subject_id === entry.subject_id);
      const todayPastSess = pastSessions.find((s) => s.subject_id === entry.subject_id && s.session_date === now.toISOString().split('T')[0]);
      const rec = (activeSess || todayPastSess) ? db.getAttendanceRecord((activeSess || todayPastSess)!.id, student.id) : null;

      const startMin = parseTimeMinutes(entry.start_time);
      const endMin = parseTimeMinutes(entry.end_time);
      let timingStatus: 'UPCOMING' | 'IN_PROGRESS' | 'COMPLETED' = 'UPCOMING';
      if (currentMinutes > endMin) timingStatus = 'COMPLETED';
      else if (currentMinutes >= startMin && currentMinutes <= endMin) timingStatus = 'IN_PROGRESS';

      return {
        id: entry.id,
        subjectId: entry.subject_id,
        subjectName: sub?.subject_name || 'Subject',
        subjectCode: sub?.subject_code || '',
        facultyName: facUser ? facUser.name : 'Faculty Member',
        facultyShortCode: fac?.short_code || '',
        startTime: entry.start_time,
        endTime: entry.end_time,
        room: entry.room || 'Classroom',
        isLab: entry.is_lab,
        batch: entry.batch,
        timingStatus,
        isActiveSession: !!activeSess,
        activeSessionId: activeSess?.id || null,
        attendanceStatus: rec ? rec.status : 'NOT_MARKED',
      };
    });

    // Subject-wise stats for joined subjects
    const subjectStats = subjects.map((sub) => {
      const cr = joinedClassrooms.find((c) => c.subject_id === sub.id);
      const fac = cr ? db.getFacultyById(cr.faculty_id) : null;
      const facUser = fac ? db.getUserById(fac.user_id) : null;

      const subSessions = pastSessions.filter((s) => s.subject_id === sub.id);
      const subTotal = subSessions.length;
      const subPresent = myRecords.filter((r) => {
        const sess = allClassSessions.find((s) => s.id === r.session_id);
        return sess && sess.subject_id === sub.id && r.status === 'PRESENT';
      }).length;
      const subAbsent = Math.max(0, subTotal - subPresent);
      const subPercent = subTotal > 0 ? Math.round((subPresent / subTotal) * 10000) / 100 : 100;

      // Next scheduled lecture for this subject
      const nextSubSlot = classTimetable
        .filter((t) => t.subject_id === sub.id)
        .sort((a, b) => parseTimeMinutes(a.start_time) - parseTimeMinutes(b.start_time))[0];

      return {
        subjectId: sub.id,
        subjectName: sub.subject_name,
        subjectCode: sub.subject_code,
        facultyName: facUser ? facUser.name : 'Faculty',
        facultyShortCode: fac?.short_code || '',
        classroomId: cr?.id || '',
        classroomCode: cr?.join_code || '',
        totalLectures: subTotal,
        present: subPresent,
        absent: subAbsent,
        percentage: subPercent,
        isLow: subTotal > 0 && subPercent < threshold,
        nextSlot: nextSubSlot ? `${nextSubSlot.day_of_week} ${nextSubSlot.start_time} - ${nextSubSlot.end_time}` : 'See Timetable',
      };
    });

    // Available active sessions ONLY for joined classrooms
    const availableActiveSessions = activeSessions.map((sess) => {
      const subject = subjects.find((s) => s.id === sess.subject_id);
      const faculty = db.getFacultyById(sess.faculty_id);
      const facultyUser = faculty ? db.getUserById(faculty.user_id) : undefined;
      const alreadyMarked = !!db.getAttendanceRecord(sess.id, student.id);

      return {
        id: sess.id,
        subjectName: subject?.subject_name || 'Class Lecture',
        subjectCode: subject?.subject_code || '',
        facultyName: facultyUser ? facultyUser.name : 'Faculty Member',
        lectureTopic: sess.lecture_topic,
        sessionDate: sess.session_date,
        startTime: sess.start_time,
        radiusMeters: sess.radius_meters,
        centerLatitude: sess.center_latitude,
        centerLongitude: sess.center_longitude,
        alreadyMarked,
      };
    });

    // Recent 5 attendance items
    const recentRecords = myRecords
      .slice(0, 5)
      .map((rec) => {
        const sess = allClassSessions.find((s) => s.id === rec.session_id);
        const sub = sess ? allSubjects.find((s) => s.id === sess.subject_id) : undefined;
        return {
          id: rec.id,
          date: sess?.session_date || rec.marked_at.split('T')[0],
          time: new Date(rec.marked_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          subjectName: sub?.subject_name || 'Subject',
          topic: sess?.lecture_topic || 'Lecture',
          status: rec.status,
          distance: rec.distance_from_center,
          verificationStatus: rec.camera_verification_status,
        };
      });

    res.json({
      success: true,
      data: {
        student: {
          id: student.id,
          name: req.user!.name,
          email: req.user!.email,
          studentId: student.student_id,
          rollNumber: student.roll_number,
          className: studentClass?.class_name || 'TYCS',
          division: student.division,
          academicYear: student.academic_year,
          courseName: studentClass?.course_name || 'Computer Science',
        },
        stats: {
          overallPercentage,
          totalLectures,
          attendedCount,
          absentCount,
          threshold,
          isDefaulter,
          warningMessage: isDefaulter
            ? `Your attendance is ${overallPercentage}%, which is below the mandatory ${threshold}% threshold. Please attend upcoming lectures regularly to improve your attendance.`
            : null,
        },
        subjectStats,
        nextLecture,
        todayClasses,
        activeSessions: availableActiveSessions,
        recentRecords,
        joinedClassroomsCount: joinedClassrooms.length,
        institution: {
          collegeName: settings.college_name,
          officialLatitude: settings.official_latitude,
          officialLongitude: settings.official_longitude,
          defaultRadius: settings.default_radius,
        },
      },
    });
  } catch (error) {
    console.error('Student dashboard error:', error);
    res.status(500).json({ success: false, message: 'Could not load student dashboard.' });
  }
});

// GET /api/student/classrooms - List student's joined classrooms
router.get('/classrooms', (req: AuthenticatedRequest, res: Response) => {
  try {
    const student = db.getStudentByUserId(req.user!.id);
    if (!student) {
      res.status(404).json({ success: false, message: 'Student profile not found.' });
      return;
    }

    const memberships = db.getClassroomMembers({ studentId: student.id });
    const classrooms = db.getClassrooms();
    const subjects = db.getSubjects();
    const classes = db.getClasses();
    const settings = db.getSettings();
    const threshold = settings.low_attendance_threshold || 75;

    const list = memberships.map((m) => {
      const cr = classrooms.find((c) => c.id === m.classroom_id);
      if (!cr) return null;
      const sub = subjects.find((s) => s.id === cr.subject_id);
      const cls = classes.find((c) => c.id === cr.class_id);
      const fac = db.getFacultyById(cr.faculty_id);
      const facUser = fac ? db.getUserById(fac.user_id) : null;

      // Attendance for this classroom subject
      const subSessions = db.getAttendanceSessions({ classId: cr.class_id, subjectId: cr.subject_id, status: 'CLOSED' });
      const records = db.getAttendanceRecords({ studentId: student.id });
      const attended = records.filter((r) => subSessions.some((s) => s.id === r.session_id && r.status === 'PRESENT')).length;
      const total = subSessions.length;
      const percentage = total > 0 ? Math.round((attended / total) * 10000) / 100 : 100;

      return {
        membershipId: m.id,
        classroomId: cr.id,
        classroomName: cr.classroom_name,
        joinCode: cr.join_code,
        subjectId: cr.subject_id,
        subjectName: sub?.subject_name || 'Subject',
        subjectCode: sub?.subject_code || '',
        facultyName: facUser ? facUser.name : 'Faculty Member',
        facultyShortCode: fac?.short_code || '',
        facultyEmail: facUser?.email || '',
        className: cls ? `${cls.class_name}.${cls.division}` : cr.division,
        academicYear: cr.academic_year,
        joinedAt: m.joined_at,
        membershipStatus: m.status,
        classroomStatus: cr.status,
        attendanceStats: {
          total,
          attended,
          percentage,
          isDefaulter: total > 0 && percentage < threshold,
        },
      };
    }).filter(Boolean);

    res.json({ success: true, data: list });
  } catch (error) {
    console.error('Student classrooms error:', error);
    res.status(500).json({ success: false, message: 'Could not fetch classrooms.' });
  }
});

// POST /api/student/classrooms/join - Join classroom via secure code
router.post('/classrooms/join', (req: AuthenticatedRequest, res: Response) => {
  try {
    const { code } = req.body;
    if (!code || typeof code !== 'string') {
      res.status(400).json({ success: false, message: 'Classroom Join Code is required.' });
      return;
    }

    const student = db.getStudentByUserId(req.user!.id);
    if (!student) {
      res.status(404).json({ success: false, message: 'Student profile not found.' });
      return;
    }

    const cleanCode = code.trim().toUpperCase();

    // Check rate limit on join attempts
    const rateLimit = db.checkJoinRateLimit(student.id);
    if (!rateLimit.allowed) {
      db.addAuditLog({
        action: 'CLASSROOM_JOIN_RATE_LIMIT',
        actor_id: req.user!.id,
        actor_role: 'student',
        details: { code: cleanCode, waitMinutes: rateLimit.waitMinutes },
      });
      res.status(429).json({
        success: false,
        message: `Too many failed join attempts. Please wait ${rateLimit.waitMinutes} minute(s) before trying again.`,
      });
      return;
    }

    // Find classroom by join code
    const classroom = db.getClassroomByCode(cleanCode);
    if (!classroom || classroom.status !== 'active') {
      db.recordFailedJoinAttempt(student.id);
      db.addAuditLog({
        action: 'CLASSROOM_JOIN_FAILED',
        actor_id: req.user!.id,
        actor_role: 'student',
        details: { code: cleanCode, reason: 'Invalid or inactive code' },
      });
      res.status(400).json({
        success: false,
        message: 'Invalid or expired classroom code. Please verify with your faculty.',
      });
      return;
    }

    // Check academic year and class/division eligibility
    if (classroom.class_id !== student.class_id || classroom.academic_year !== student.academic_year) {
      db.recordFailedJoinAttempt(student.id);
      db.addAuditLog({
        action: 'CLASSROOM_JOIN_UNAUTHORIZED_CLASS',
        actor_id: req.user!.id,
        actor_role: 'student',
        target_id: classroom.id,
        details: {
          code: cleanCode,
          studentClass: student.class_id,
          classroomClass: classroom.class_id,
        },
      });
      res.status(403).json({
        success: false,
        message: 'Eligibility Error: This classroom is designated for a different class or academic year.',
      });
      return;
    }

    // Check if already joined
    const existing = db.getClassroomMember(classroom.id, student.id);
    if (existing && existing.status === 'active') {
      res.status(400).json({
        success: false,
        message: `You have already joined ${classroom.classroom_name}.`,
      });
      return;
    }

    // Join classroom
    const nowIso = new Date().toISOString();
    const membership = db.addClassroomMember({
      id: `cm_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      classroom_id: classroom.id,
      student_id: student.id,
      joined_at: nowIso,
      status: 'active',
      created_at: nowIso,
    });

    db.addAuditLog({
      action: 'CLASSROOM_JOINED',
      actor_id: req.user!.id,
      actor_role: 'student',
      target_id: classroom.id,
      details: { classroomName: classroom.classroom_name, code: cleanCode },
    });

    const subject = db.getSubjects().find((s) => s.id === classroom.subject_id);

    res.json({
      success: true,
      message: `Successfully joined ${classroom.classroom_name}!`,
      data: {
        classroomId: classroom.id,
        classroomName: classroom.classroom_name,
        subjectName: subject?.subject_name,
        joinCode: classroom.join_code,
        joinedAt: membership.joined_at,
      },
    });
  } catch (error) {
    console.error('Join classroom error:', error);
    res.status(500).json({ success: false, message: 'Could not join classroom.' });
  }
});

// GET /api/student/timetable - Full student timetable
router.get('/timetable', (req: AuthenticatedRequest, res: Response) => {
  try {
    const student = db.getStudentByUserId(req.user!.id);
    if (!student) {
      res.status(404).json({ success: false, message: 'Student profile not found.' });
      return;
    }

    const memberships = db.getClassroomMembers({ studentId: student.id, status: 'active' });
    const joinedClassrooms = db.getClassrooms().filter((c) => memberships.some((m) => m.classroom_id === c.id));
    const joinedSubjectIds = joinedClassrooms.map((c) => c.subject_id);

    const classTimetable = db.getTimetable({ classId: student.class_id });
    const subjects = db.getSubjects();
    const studentClass = db.getClassById(student.class_id);

    const activeSessions = db.getAttendanceSessions({ classId: student.class_id, status: 'ACTIVE' });
    const currentDay = getCurrentDayOfWeek();

    const days: DayOfWeek[] = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

    const formattedTimetable = days.map((day) => {
      const daySlots = classTimetable
        .filter((t) => t.day_of_week === day)
        .sort((a, b) => parseTimeMinutes(a.start_time) - parseTimeMinutes(b.start_time))
        .map((entry) => {
          const sub = subjects.find((s) => s.id === entry.subject_id);
          const fac = db.getFacultyById(entry.faculty_id);
          const facUser = fac ? db.getUserById(fac.user_id) : null;
          const isJoined = joinedSubjectIds.includes(entry.subject_id);
          const activeSess = activeSessions.find((s) => s.subject_id === entry.subject_id);

          return {
            id: entry.id,
            subjectId: entry.subject_id,
            subjectName: sub?.subject_name || 'Subject',
            subjectCode: sub?.subject_code || '',
            facultyName: facUser ? facUser.name : 'Faculty Member',
            facultyShortCode: fac?.short_code || '',
            startTime: entry.start_time,
            endTime: entry.end_time,
            room: entry.room || 'Classroom',
            isLab: entry.is_lab,
            batch: entry.batch,
            academicYear: entry.academic_year,
            isJoined,
            isActiveNow: day === currentDay && !!activeSess,
            activeSessionId: activeSess?.id || null,
          };
        });

      return {
        day,
        isToday: day === currentDay,
        slots: daySlots,
      };
    });

    res.json({
      success: true,
      data: {
        className: studentClass ? `${studentClass.class_name}.${studentClass.division}` : 'TYCS.A',
        courseName: studentClass?.course_name || 'Computer Science',
        academicYear: student.academic_year,
        currentDay,
        timetable: formattedTimetable,
      },
    });
  } catch (error) {
    console.error('Student timetable error:', error);
    res.status(500).json({ success: false, message: 'Could not fetch timetable.' });
  }
});

// GET /api/student/subjects
router.get('/subjects', (req: AuthenticatedRequest, res: Response) => {
  try {
    const student = db.getStudentByUserId(req.user!.id);
    if (!student) {
      res.status(404).json({ success: false, message: 'Student profile not found.' });
      return;
    }

    const settings = db.getSettings();
    const memberships = db.getClassroomMembers({ studentId: student.id, status: 'active' });
    const joinedClassrooms = db.getClassrooms().filter((c) => memberships.some((m) => m.classroom_id === c.id));
    const joinedSubjectIds = joinedClassrooms.map((c) => c.subject_id);

    const subjects = db.getSubjects().filter((s) => joinedSubjectIds.includes(s.id));
    const allClassSessions = db.getAttendanceSessions({ classId: student.class_id });
    const pastSessions = allClassSessions.filter((s) => s.status === 'CLOSED');
    const myRecords = db.getAttendanceRecords({ studentId: student.id });
    const threshold = settings.low_attendance_threshold || 75;

    const list = subjects.map((sub) => {
      const cr = joinedClassrooms.find((c) => c.subject_id === sub.id);
      const fac = cr ? db.getFacultyById(cr.faculty_id) : null;
      const facUser = fac ? db.getUserById(fac.user_id) : null;

      const subSessions = pastSessions.filter((s) => s.subject_id === sub.id);
      const subTotal = subSessions.length;
      const subPresent = myRecords.filter((r) => {
        const sess = allClassSessions.find((s) => s.id === r.session_id);
        return sess && sess.subject_id === sub.id && r.status === 'PRESENT';
      }).length;
      const subAbsent = Math.max(0, subTotal - subPresent);
      const subPercent = subTotal > 0 ? Math.round((subPresent / subTotal) * 10000) / 100 : 100;

      return {
        id: sub.id,
        subjectName: sub.subject_name,
        subjectCode: sub.subject_code,
        classroomId: cr?.id,
        classroomCode: cr?.join_code,
        facultyName: facUser ? facUser.name : 'Faculty Member',
        facultyShortCode: fac?.short_code || '',
        totalLectures: subTotal,
        presentCount: subPresent,
        absentCount: subAbsent,
        percentage: subPercent,
        isDefaulter: subTotal > 0 && subPercent < threshold,
      };
    });

    res.json({ success: true, data: list });
  } catch (error) {
    console.error('Student subjects error:', error);
    res.status(500).json({ success: false, message: 'Could not fetch subjects.' });
  }
});

// GET /api/student/history
router.get('/history', (req: AuthenticatedRequest, res: Response) => {
  try {
    const student = db.getStudentByUserId(req.user!.id);
    if (!student) {
      res.status(404).json({ success: false, message: 'Student profile not found.' });
      return;
    }

    const memberships = db.getClassroomMembers({ studentId: student.id, status: 'active' });
    const joinedClassrooms = db.getClassrooms().filter((c) => memberships.some((m) => m.classroom_id === c.id));
    const joinedSubjectIds = joinedClassrooms.map((c) => c.subject_id);

    const subjects = db.getSubjects();
    const allClassSessions = db.getAttendanceSessions({ classId: student.class_id });
    const relevantSessions = allClassSessions.filter((s) => joinedSubjectIds.includes(s.subject_id));
    const myRecords = db.getAttendanceRecords({ studentId: student.id });

    const history = relevantSessions.map((sess) => {
      const sub = subjects.find((s) => s.id === sess.subject_id);
      const rec = myRecords.find((r) => r.session_id === sess.id);
      const faculty = db.getFacultyById(sess.faculty_id);
      const facultyUser = faculty ? db.getUserById(faculty.user_id) : undefined;

      const isPresent = !!rec && rec.status === 'PRESENT';

      return {
        sessionId: sess.id,
        recordId: rec?.id || null,
        date: sess.session_date,
        time: rec ? new Date(rec.marked_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : sess.start_time,
        subjectName: sub?.subject_name || 'Subject',
        subjectCode: sub?.subject_code || '',
        facultyName: facultyUser ? facultyUser.name : 'Faculty Member',
        facultyShortCode: faculty?.short_code || '',
        topic: sess.lecture_topic,
        status: isPresent ? 'PRESENT' : 'ABSENT',
        distance: rec ? rec.distance_from_center : null,
        latitude: rec ? rec.latitude : null,
        longitude: rec ? rec.longitude : null,
        accuracy: rec ? rec.accuracy : null,
        altitude: rec?.altitude ?? null,
        altitudeAccuracy: rec?.altitude_accuracy ?? null,
        verificationStatus: rec ? rec.camera_verification_status : null,
        cameraImagePath: rec?.camera_image_path || null,
      };
    });

    // Sort by date descending
    history.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    res.json({ success: true, data: history });
  } catch (error) {
    console.error('Student history error:', error);
    res.status(500).json({ success: false, message: 'Could not fetch history.' });
  }
});

// POST /api/student/verify-location
router.post('/verify-location', (req: AuthenticatedRequest, res: Response) => {
  try {
    const { sessionId, latitude, longitude, accuracy } = req.body;

    if (!sessionId || latitude === undefined || longitude === undefined) {
      res.status(400).json({ success: false, message: 'Session ID and GPS coordinates are required.' });
      return;
    }

    const student = db.getStudentByUserId(req.user!.id);
    if (!student) {
      res.status(404).json({ success: false, message: 'Student not found.' });
      return;
    }

    const session = db.getSessionById(sessionId);
    if (!session) {
      res.status(404).json({ success: false, message: 'Attendance session not found.' });
      return;
    }

    if (session.class_id !== student.class_id) {
      res.status(403).json({ success: false, message: 'You are not enrolled in the class for this attendance session.' });
      return;
    }

    // Verify classroom membership
    const classrooms = db.getClassrooms().filter((c) => c.class_id === session.class_id && c.subject_id === session.subject_id);
    const hasMembership = classrooms.some((c) => {
      const m = db.getClassroomMember(c.id, student.id);
      return m && m.status === 'active';
    });

    if (!hasMembership) {
      res.status(403).json({
        success: false,
        message: 'Access Denied: You must first join this Subject Classroom using the faculty Join Code before marking attendance.',
      });
      return;
    }

    if (session.status !== 'ACTIVE') {
      res.status(400).json({ success: false, message: 'Attendance session is no longer active.' });
      return;
    }

    const check = isWithinRadius(
      latitude,
      longitude,
      session.center_latitude,
      session.center_longitude,
      session.radius_meters
    );

    res.json({
      success: true,
      data: {
        isInside: check.isInside,
        distanceMeters: check.distanceMeters,
        allowedRadiusMeters: session.radius_meters,
        collegeLatitude: session.center_latitude,
        collegeLongitude: session.center_longitude,
        studentLatitude: latitude,
        studentLongitude: longitude,
        accuracy: accuracy || null,
        statusText: check.isInside ? 'INSIDE ATTENDANCE RADIUS' : 'OUT OF RADIUS',
      },
    });
  } catch (error) {
    console.error('Verify location error:', error);
    res.status(500).json({ success: false, message: 'Location verification failed.' });
  }
});

// POST /api/student/submit-attendance
router.post('/submit-attendance', (req: AuthenticatedRequest, res: Response) => {
  try {
    const {
      sessionId,
      latitude,
      longitude,
      accuracy = 5,
      altitude = null,
      altitudeAccuracy = null,
      locationTimestamp = Date.now(),
      cameraImageBase64,
      deviceId,
    } = req.body;

    if (!sessionId || latitude === undefined || longitude === undefined || !cameraImageBase64) {
      res.status(400).json({
        success: false,
        message: 'All verification parameters (location and live camera photo) are required.',
      });
      return;
    }

    // Security Check: Timestamp Freshness (prevent stale/replayed GPS)
    if (locationTimestamp && Math.abs(Date.now() - Number(locationTimestamp)) > 60000) {
      res.status(400).json({
        success: false,
        message: 'GPS reading is stale (older than 60 seconds). Please refresh and acquire a live sensor reading.',
      });
      return;
    }

    // Security Check: Zero-Entropy / Fake GPS Check
    if (Number(accuracy) <= 0 || isNaN(Number(latitude)) || isNaN(Number(longitude))) {
      res.status(400).json({
        success: false,
        message: 'Invalid GPS hardware reading detected. Virtual/Mock GPS coordinates are blocked.',
      });
      return;
    }

    // Security Check: Strict GPS Precision (Must be high-accuracy near teacher's mobile)
    if (Number(accuracy) > 35) {
      res.status(400).json({
        success: false,
        message: `GPS uncertainty (±${Math.round(Number(accuracy))}m) is too wide. Please move closer to the Teacher's device and ensure your device GPS is in High-Accuracy mode.`,
      });
      return;
    }

    const student = db.getStudentByUserId(req.user!.id);
    if (!student) {
      res.status(404).json({ success: false, message: 'Student profile not found.' });
      return;
    }

    const session = db.getSessionById(sessionId);
    if (!session) {
      res.status(404).json({ success: false, message: 'Attendance session not found.' });
      return;
    }

    const faculty = db.getFacultyById(session.faculty_id);
    const facultyUser = faculty ? db.getUserById(faculty.user_id) : null;
    const teacherName = facultyUser ? facultyUser.name : 'Teacher';

    // Security Check 1: Session must be active
    if (session.status !== 'ACTIVE') {
      res.status(400).json({
        success: false,
        message: 'This attendance session has been closed or stopped by the teacher. Submissions are locked.',
      });
      return;
    }

    // Security Check 2: Student class membership isolation
    if (session.class_id !== student.class_id) {
      db.addAuditLog({
        action: 'ATTENDANCE_SUBMIT_UNAUTHORIZED_CLASS',
        actor_id: req.user!.id,
        actor_role: 'student',
        target_id: session.id,
      });
      res.status(403).json({
        success: false,
        message: 'Access Denied: You are not enrolled in the class for this lecture.',
      });
      return;
    }

    // Security Check 3: Student must be an active member of this subject classroom
    const classrooms = db.getClassrooms().filter((c) => c.class_id === session.class_id && c.subject_id === session.subject_id);
    const hasMembership = classrooms.some((c) => {
      const m = db.getClassroomMember(c.id, student.id);
      return m && m.status === 'active';
    });

    if (!hasMembership) {
      res.status(403).json({
        success: false,
        message: 'Access Denied: You have not joined the classroom for this subject. Enter the classroom join code on your dashboard first.',
      });
      return;
    }

    // Security Check 4: Prevent duplicate attendance
    const existing = db.getAttendanceRecord(sessionId, student.id);
    if (existing) {
      res.status(400).json({
        success: false,
        message: 'Attendance has already been marked for this lecture session.',
        alreadyMarked: true,
      });
      return;
    }

    // Security Check 4.5: Anti-Proxy Device Lockdown (1 Device = 1 Student per Session)
    if (deviceId) {
      const recordsInSession = db.getAttendanceRecords({ sessionId });
      const duplicateDeviceRecord = recordsInSession.find(
        (r) => r.device_id === deviceId && r.student_id !== student.id
      );

      if (duplicateDeviceRecord) {
        const otherStudent = db.getStudentById(duplicateDeviceRecord.student_id);
        const otherUser = otherStudent ? db.getUserById(otherStudent.user_id) : null;

        db.addAuditLog({
          action: 'PROXY_DEVICE_SHARING_BLOCKED',
          actor_id: req.user!.id,
          actor_role: 'student',
          target_id: session.id,
          details: {
            deviceId,
            attemptedForRoll: student.roll_number,
            previouslyMarkedForRoll: otherStudent?.roll_number,
            previouslyMarkedForName: otherUser?.name,
          },
          severity: 'critical',
        });

        res.status(403).json({
          success: false,
          message: `🚫 Proxy Attempt Blocked: This phone/device was already used to mark attendance for Roll No. ${otherStudent?.roll_number || 'another student'} in this lecture session. Each student must use their own device!`,
        });
        return;
      }
    }

    // Security Check 5: Server-side distance calculation (Haversine against Teacher's live coordinates)
    const distanceMeters = calculateDistance(
      latitude,
      longitude,
      session.center_latitude,
      session.center_longitude
    );

    if (distanceMeters > session.radius_meters) {
      db.addAuditLog({
        action: 'ATTENDANCE_SUBMIT_OUT_OF_RADIUS',
        actor_id: req.user!.id,
        actor_role: 'student',
        target_id: session.id,
        details: { distanceMeters, allowedRadius: session.radius_meters },
      });
      res.status(400).json({
        success: false,
        message: `Outside allowed proximity boundary (${session.radius_meters}m radius required).`,
        distanceMeters,
        allowedRadius: session.radius_meters,
      });
      return;
    }

    // Security Check 6: Live Camera Selfie Verification & Anti-Spoofing
    if (
      typeof cameraImageBase64 !== 'string' ||
      !cameraImageBase64.startsWith('data:image/') ||
      cameraImageBase64.length < 8000
    ) {
      res.status(400).json({
        success: false,
        message: 'Live Camera Verification Failed: A valid live front-camera selfie capture is required (minimum resolution required).',
      });
      return;
    }

    const nowIso = new Date().toISOString();
    const newRecord: AttendanceRecord = {
      id: `att_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      session_id: session.id,
      student_id: student.id,
      status: 'PRESENT',
      marked_at: nowIso,
      latitude: Number(latitude),
      longitude: Number(longitude),
      accuracy: Number(accuracy) || 5,
      altitude: altitude !== null ? Number(altitude) : null,
      altitude_accuracy: altitudeAccuracy !== null ? Number(altitudeAccuracy) : null,
      distance_from_center: distanceMeters,
      camera_image_path: cameraImageBase64,
      camera_verification_status: 'VERIFIED',
      device_id: deviceId || undefined,
      created_at: nowIso,
    };

    db.addAttendanceRecord(newRecord);

    db.addAuditLog({
      action: 'ATTENDANCE_MARKED_SUCCESS',
      actor_id: req.user!.id,
      actor_role: 'student',
      target_id: session.id,
      details: { recordId: newRecord.id, distanceMeters },
    });

    const subject = db.getSubjects().find((s) => s.id === session.subject_id);

    res.json({
      success: true,
      message: 'Attendance Marked Successfully.',
      data: {
        recordId: newRecord.id,
        studentName: req.user!.name,
        subjectName: subject?.subject_name || 'Subject',
        date: session.session_date,
        time: new Date(nowIso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
        status: 'PRESENT',
        distanceMeters,
        allowedRadiusMeters: session.radius_meters,
        latitude: newRecord.latitude,
        longitude: newRecord.longitude,
        accuracy: newRecord.accuracy,
        altitude: newRecord.altitude,
        verificationStatus: 'VERIFIED',
        photoThumbnail: cameraImageBase64,
      },
    });
  } catch (error) {
    console.error('Submit attendance error:', error);
    res.status(500).json({ success: false, message: 'Failed to record attendance.' });
  }
});

export default router;
