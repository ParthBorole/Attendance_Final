import fs from 'fs';
import path from 'path';
import bcrypt from 'bcryptjs';
import {
  DatabaseSchema,
  User,
  Student,
  Faculty,
  ClassEntity,
  SubjectEntity,
  FacultyAssignment,
  TimetableEntry,
  ClassroomEntity,
  ClassroomMember,
  AuditLog,
  AttendanceSession,
  AttendanceRecord,
  OtpVerification,
  InstitutionSettings,
  DayOfWeek,
} from './types.js';

const DATA_DIR = path.resolve(process.cwd(), 'data');
const DB_FILE = path.resolve(DATA_DIR, 'attendsecure.json');

const DEFAULT_SETTINGS: InstitutionSettings = {
  id: 'inst_tsdc_01',
  college_name: 'Thakur Shyamnarayan Degree College (TSDC), Kandivali (East)',
  official_latitude: 19.213805,
  official_longitude: 72.864810,
  default_radius: 10,
  min_radius: 1,
  max_radius: 50,
  low_attendance_threshold: 75,
  updated_at: new Date().toISOString(),
};

// Rate limiter storage for failed join attempts (memory based)
const failedJoinAttempts = new Map<string, { count: number; lockUntil: number }>();

class DatabaseManager {
  private db: DatabaseSchema = {
    users: [],
    students: [],
    faculty: [],
    classes: [],
    subjects: [],
    faculty_assignments: [],
    timetables: [],
    classrooms: [],
    classroom_members: [],
    attendance_sessions: [],
    attendance_records: [],
    otp_verifications: [],
    audit_logs: [],
    institution_settings: DEFAULT_SETTINGS,
  };

  private isLoaded = false;

  constructor() {
    this.init();
  }

  private init() {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }

    if (fs.existsSync(DB_FILE)) {
      try {
        const raw = fs.readFileSync(DB_FILE, 'utf-8');
        const parsed = JSON.parse(raw);
        this.db = {
          users: parsed.users || [],
          students: parsed.students || [],
          faculty: parsed.faculty || [],
          classes: parsed.classes || [],
          subjects: parsed.subjects || [],
          faculty_assignments: parsed.faculty_assignments || [],
          timetables: parsed.timetables || [],
          classrooms: parsed.classrooms || [],
          classroom_members: parsed.classroom_members || [],
          attendance_sessions: parsed.attendance_sessions || [],
          attendance_records: parsed.attendance_records || [],
          otp_verifications: parsed.otp_verifications || [],
          audit_logs: parsed.audit_logs || [],
          institution_settings: parsed.institution_settings || DEFAULT_SETTINGS,
        };

        const hasCleanName = this.db.users.some((u) => u.name === 'Tuba Ma\'am' || u.name === 'Vijay Sir');
        const hasStudents = this.db.students && this.db.students.length > 0;
        if (!hasCleanName || this.db.timetables.length === 0 || this.db.classrooms.length === 0 || !hasStudents) {
          this.seedDatabase();
        }

        this.isLoaded = true;
        return;
      } catch (err) {
        console.error('Failed to read database file, seeding new database:', err);
      }
    }

    this.seedDatabase();
    this.isLoaded = true;
  }

  private save() {
    try {
      const tempFile = DB_FILE + '.tmp';
      fs.writeFileSync(tempFile, JSON.stringify(this.db, null, 2), 'utf-8');
      fs.renameSync(tempFile, DB_FILE);
    } catch (err) {
      console.error('Database write error:', err);
    }
  }

  private seedDatabase() {
    const adminPassHash = bcrypt.hashSync('Admin@2026', 10);
    const tubaPassHash = bcrypt.hashSync('Tuba@2026', 10);
    const ajitPassHash = bcrypt.hashSync('Ajit@2026', 10);
    const vijayPassHash = bcrypt.hashSync('Vijay@2026', 10);
    const dsouzaPassHash = bcrypt.hashSync('Dsouza@2026', 10);
    const aparnaPassHash = bcrypt.hashSync('Aparna@2026', 10);
    const rajeshPassHash = bcrypt.hashSync('Rajesh@2026', 10);
    const abhaPassHash = bcrypt.hashSync('Abha@2026', 10);
    const kajalPassHash = bcrypt.hashSync('Kajal@2026', 10);
    const studentPassHash = bcrypt.hashSync('Student@2026', 10);

    const now = new Date().toISOString();

    // 1. Users (Exact clean names requested without any extra surnames)
    const users: User[] = [
      {
        id: 'usr_admin',
        name: 'Admin',
        email: 'admin@tsdc.edu.in',
        password_hash: adminPassHash,
        role: 'admin',
        status: 'active',
        created_at: now,
        updated_at: now,
      },
      // 1. ABA -> Tuba maam
      {
        id: 'usr_fac_tuba',
        name: 'Tuba Ma\'am',
        email: 'tuba@tsdc.edu.in',
        password_hash: tubaPassHash,
        role: 'faculty',
        status: 'active',
        created_at: now,
        updated_at: now,
      },
      // 2. DV -> Ajit sir
      {
        id: 'usr_fac_ajit',
        name: 'Ajit Sir',
        email: 'ajit@tsdc.edu.in',
        password_hash: ajitPassHash,
        role: 'faculty',
        status: 'active',
        created_at: now,
        updated_at: now,
      },
      // 3. AI -> Vijay sir
      {
        id: 'usr_fac_vijay',
        name: 'Vijay Sir',
        email: 'vijay@tsdc.edu.in',
        password_hash: vijayPassHash,
        role: 'faculty',
        status: 'active',
        created_at: now,
        updated_at: now,
      },
      // 4. STQA -> Dsouza maam
      {
        id: 'usr_fac_dsouza',
        name: 'Dsouza Ma\'am',
        email: 'dsouza@tsdc.edu.in',
        password_hash: dsouzaPassHash,
        role: 'faculty',
        status: 'active',
        created_at: now,
        updated_at: now,
      },
      // 5. ETH -> Aparna maam
      {
        id: 'usr_fac_aparna',
        name: 'Aparna Ma\'am',
        email: 'aparna@tsdc.edu.in',
        password_hash: aparnaPassHash,
        role: 'faculty',
        status: 'active',
        created_at: now,
        updated_at: now,
      },
      // 6. CIS -> Rajesh sir
      {
        id: 'usr_fac_rajesh',
        name: 'Rajesh Sir',
        email: 'rajesh@tsdc.edu.in',
        password_hash: rajeshPassHash,
        role: 'faculty',
        status: 'active',
        created_at: now,
        updated_at: now,
      },
      // 7. MP -> Abha maam
      {
        id: 'usr_fac_abha',
        name: 'Abha Ma\'am',
        email: 'abha@tsdc.edu.in',
        password_hash: abhaPassHash,
        role: 'faculty',
        status: 'active',
        created_at: now,
        updated_at: now,
      },
      // 8. IKS -> Kajal maam
      {
        id: 'usr_fac_kajal',
        name: 'Kajal Ma\'am',
        email: 'kajal@tsdc.edu.in',
        password_hash: kajalPassHash,
        role: 'faculty',
        status: 'active',
        created_at: now,
        updated_at: now,
      },
      // Students
      {
        id: 'usr_std_01',
        name: 'Aarav Sharma',
        email: 'student@tsdc.edu.in',
        password_hash: studentPassHash,
        role: 'student',
        status: 'active',
        created_at: now,
        updated_at: now,
      },
      {
        id: 'usr_std_02',
        name: 'Rohan Mehta',
        email: 'rohan.mehta@tsdc.edu.in',
        password_hash: studentPassHash,
        role: 'student',
        status: 'active',
        created_at: now,
        updated_at: now,
      },
      {
        id: 'usr_std_03',
        name: 'Priya Patel',
        email: 'priya.patel@tsdc.edu.in',
        password_hash: studentPassHash,
        role: 'student',
        status: 'active',
        created_at: now,
        updated_at: now,
      },
      {
        id: 'usr_std_04',
        name: 'Sneha Verma',
        email: 'sneha.verma@tsdc.edu.in',
        password_hash: studentPassHash,
        role: 'student',
        status: 'active',
        created_at: now,
        updated_at: now,
      },
    ];

    // 2. Faculty Profiles
    const faculty: Faculty[] = [
      { id: 'fac_tuba', user_id: 'usr_fac_tuba', department: 'Computer Science', employee_id: 'TSDC-FAC-TUBA', short_code: 'TUBA' },
      { id: 'fac_ajit', user_id: 'usr_fac_ajit', department: 'Computer Science', employee_id: 'TSDC-FAC-AJIT', short_code: 'AJIT' },
      { id: 'fac_vijay', user_id: 'usr_fac_vijay', department: 'Computer Science', employee_id: 'TSDC-FAC-VIJAY', short_code: 'VIJAY' },
      { id: 'fac_dsouza', user_id: 'usr_fac_dsouza', department: 'Computer Science', employee_id: 'TSDC-FAC-DSOUZA', short_code: 'DSOUZA' },
      { id: 'fac_aparna', user_id: 'usr_fac_aparna', department: 'Computer Science', employee_id: 'TSDC-FAC-APARNA', short_code: 'APARNA' },
      { id: 'fac_rajesh', user_id: 'usr_fac_rajesh', department: 'Computer Science', employee_id: 'TSDC-FAC-RAJESH', short_code: 'RAJESH' },
      { id: 'fac_abha', user_id: 'usr_fac_abha', department: 'Computer Science', employee_id: 'TSDC-FAC-ABHA', short_code: 'ABHA' },
      { id: 'fac_kajal', user_id: 'usr_fac_kajal', department: 'Computer Science', employee_id: 'TSDC-FAC-KAJAL', short_code: 'KAJAL' },
    ];

    // 3. Classes
    const classes: ClassEntity[] = [
      { id: 'cls_tycs_a', course_name: 'B.Sc. Computer Science', class_name: 'TYCS', division: 'A', academic_year: '2026-27', is_active: true },
      { id: 'cls_tycs_b', course_name: 'B.Sc. Computer Science', class_name: 'TYCS', division: 'B', academic_year: '2026-27', is_active: true },
      { id: 'cls_sycs_a', course_name: 'B.Sc. Computer Science', class_name: 'SYCS', division: 'A', academic_year: '2026-27', is_active: true },
      { id: 'cls_tyit_a', course_name: 'B.Sc. Information Technology', class_name: 'TYIT', division: 'A', academic_year: '2026-27', is_active: true },
    ];

    // 4. Students
    const students: Student[] = [
      { id: 'std_01', user_id: 'usr_std_01', student_id: 'TSDC-TYCS-101', roll_number: '101', class_id: 'cls_tycs_a', division: 'A', academic_year: '2026-27' },
      { id: 'std_02', user_id: 'usr_std_02', student_id: 'TSDC-TYCS-102', roll_number: '102', class_id: 'cls_tycs_a', division: 'A', academic_year: '2026-27' },
      { id: 'std_03', user_id: 'usr_std_03', student_id: 'TSDC-TYCS-103', roll_number: '103', class_id: 'cls_tycs_a', division: 'A', academic_year: '2026-27' },
      { id: 'std_04', user_id: 'usr_std_04', student_id: 'TSDC-TYCS-104', roll_number: '104', class_id: 'cls_tycs_a', division: 'A', academic_year: '2026-27' },
    ];

    // 5. Subjects
    const subjects: SubjectEntity[] = [
      { id: 'sub_ai', subject_name: 'Artificial Intelligence', subject_code: 'CS-601', class_id: 'cls_tycs_a' },
      { id: 'sub_stqa', subject_name: 'Software Testing & Quality Assurance', subject_code: 'CS-602', class_id: 'cls_tycs_a' },
      { id: 'sub_eth', subject_name: 'Ethical Hacking (ETH)', subject_code: 'CS-603', class_id: 'cls_tycs_a' },
      { id: 'sub_dv', subject_name: 'Data Visualization (DV)', subject_code: 'CS-604', class_id: 'cls_tycs_a' },
      { id: 'sub_aba', subject_name: 'Advanced Business Analytics (ABA)', subject_code: 'CS-605', class_id: 'cls_tycs_a' },
      { id: 'sub_cis', subject_name: 'Cyber & Information Security (CIS)', subject_code: 'CS-606', class_id: 'cls_tycs_a' },
      { id: 'sub_mp', subject_name: 'Mini Project (MP)', subject_code: 'CS-607', class_id: 'cls_tycs_a' },
      { id: 'sub_iks', subject_name: 'Indian Knowledge System (IKS)', subject_code: 'CS-608', class_id: 'cls_tycs_a' },
      { id: 'sub_cep', subject_name: 'Continuous Evaluation Project (CEP)', subject_code: 'CS-609', class_id: 'cls_tycs_a' },
    ];

    // 6. Faculty Assignments
    const faculty_assignments: FacultyAssignment[] = [
      { id: 'fa_01', faculty_id: 'fac_vijay', subject_id: 'sub_ai', class_id: 'cls_tycs_a' },
      { id: 'fa_02', faculty_id: 'fac_dsouza', subject_id: 'sub_stqa', class_id: 'cls_tycs_a' },
      { id: 'fa_03', faculty_id: 'fac_aparna', subject_id: 'sub_eth', class_id: 'cls_tycs_a' },
      { id: 'fa_04', faculty_id: 'fac_ajit', subject_id: 'sub_dv', class_id: 'cls_tycs_a' },
      { id: 'fa_05', faculty_id: 'fac_tuba', subject_id: 'sub_aba', class_id: 'cls_tycs_a' },
      { id: 'fa_06', faculty_id: 'fac_rajesh', subject_id: 'sub_cis', class_id: 'cls_tycs_a' },
      { id: 'fa_07', faculty_id: 'fac_abha', subject_id: 'sub_mp', class_id: 'cls_tycs_a' },
      { id: 'fa_08', faculty_id: 'fac_kajal', subject_id: 'sub_iks', class_id: 'cls_tycs_a' },
    ];

    // 7. Classrooms with Unique Secure Join Codes
    const classrooms: ClassroomEntity[] = [
      {
        id: 'cr_ai_tycsa',
        classroom_name: 'Artificial Intelligence — TYCS.A',
        name: 'Artificial Intelligence — TYCS.A',
        subject_id: 'sub_ai',
        class_id: 'cls_tycs_a',
        division: 'A',
        faculty_id: 'fac_vijay',
        join_code: 'AI-7K4P',
        academic_year: '2026-27',
        status: 'active',
        created_at: now,
      },
      {
        id: 'cr_stqa_tycsa',
        classroom_name: 'Software Testing & QA — TYCS.A',
        name: 'Software Testing & QA — TYCS.A',
        subject_id: 'sub_stqa',
        class_id: 'cls_tycs_a',
        division: 'A',
        faculty_id: 'fac_dsouza',
        join_code: 'ST-9M2X',
        academic_year: '2026-27',
        status: 'active',
        created_at: now,
      },
      {
        id: 'cr_eth_tycsa',
        classroom_name: 'Ethical Hacking — TYCS.A',
        name: 'Ethical Hacking — TYCS.A',
        subject_id: 'sub_eth',
        class_id: 'cls_tycs_a',
        division: 'A',
        faculty_id: 'fac_aparna',
        join_code: 'EH-6Q1V',
        academic_year: '2026-27',
        status: 'active',
        created_at: now,
      },
      {
        id: 'cr_dv_tycsa',
        classroom_name: 'Data Visualization — TYCS.A',
        name: 'Data Visualization — TYCS.A',
        subject_id: 'sub_dv',
        class_id: 'cls_tycs_a',
        division: 'A',
        faculty_id: 'fac_ajit',
        join_code: 'DV-3R8P',
        academic_year: '2026-27',
        status: 'active',
        created_at: now,
      },
      {
        id: 'cr_aba_tycsa',
        classroom_name: 'Advanced Business Analytics — TYCS.A',
        name: 'Advanced Business Analytics — TYCS.A',
        subject_id: 'sub_aba',
        class_id: 'cls_tycs_a',
        division: 'A',
        faculty_id: 'fac_tuba',
        join_code: 'AB-8W2T',
        academic_year: '2026-27',
        status: 'active',
        created_at: now,
      },
      {
        id: 'cr_cis_tycsa',
        classroom_name: 'Cyber & Info Security — TYCS.A',
        name: 'Cyber & Info Security — TYCS.A',
        subject_id: 'sub_cis',
        class_id: 'cls_tycs_a',
        division: 'A',
        faculty_id: 'fac_rajesh',
        join_code: 'CI-4L9R',
        academic_year: '2026-27',
        status: 'active',
        created_at: now,
      },
      {
        id: 'cr_mp_tycsa',
        classroom_name: 'Mini Project — TYCS.A',
        name: 'Mini Project — TYCS.A',
        subject_id: 'sub_mp',
        class_id: 'cls_tycs_a',
        division: 'A',
        faculty_id: 'fac_abha',
        join_code: 'MP-2V5A',
        academic_year: '2026-27',
        status: 'active',
        created_at: now,
      },
      {
        id: 'cr_iks_tycsa',
        classroom_name: 'Indian Knowledge System — TYCS.A',
        name: 'Indian Knowledge System — TYCS.A',
        subject_id: 'sub_iks',
        class_id: 'cls_tycs_a',
        division: 'A',
        faculty_id: 'fac_kajal',
        join_code: 'IK-5L3N',
        academic_year: '2026-27',
        status: 'active',
        created_at: now,
      },
    ];

    // 8. Classroom Members
    const classroom_members: ClassroomMember[] = [
      { id: 'cm_01', classroom_id: 'cr_ai_tycsa', student_id: 'std_01', joined_at: now, status: 'active', created_at: now },
      { id: 'cm_02', classroom_id: 'cr_stqa_tycsa', student_id: 'std_01', joined_at: now, status: 'active', created_at: now },
      { id: 'cm_03', classroom_id: 'cr_eth_tycsa', student_id: 'std_01', joined_at: now, status: 'active', created_at: now },
      { id: 'cm_04', classroom_id: 'cr_dv_tycsa', student_id: 'std_01', joined_at: now, status: 'active', created_at: now },
      { id: 'cm_05', classroom_id: 'cr_aba_tycsa', student_id: 'std_01', joined_at: now, status: 'active', created_at: now },
      { id: 'cm_06', classroom_id: 'cr_iks_tycsa', student_id: 'std_01', joined_at: now, status: 'active', created_at: now },

      { id: 'cm_07', classroom_id: 'cr_ai_tycsa', student_id: 'std_02', joined_at: now, status: 'active', created_at: now },
      { id: 'cm_08', classroom_id: 'cr_stqa_tycsa', student_id: 'std_02', joined_at: now, status: 'active', created_at: now },

      { id: 'cm_09', classroom_id: 'cr_ai_tycsa', student_id: 'std_03', joined_at: now, status: 'active', created_at: now },
      { id: 'cm_10', classroom_id: 'cr_eth_tycsa', student_id: 'std_03', joined_at: now, status: 'active', created_at: now },
    ];

    // 9. Full Timetable (Configured exactly to Official T.Y.B.Sc. CS-A Timetable Image w.e.f. 01/07/2026)
    const timetables: TimetableEntry[] = [
      // MONDAY
      { id: 'tt_mon_1a', class_id: 'cls_tycs_a', subject_id: 'sub_aba', faculty_id: 'fac_tuba', day_of_week: 'Monday', start_time: '08:00 AM', end_time: '10:00 AM', room: '2nd Floor Lab 2', is_lab: true, batch: 'A1', academic_year: '2026-27', is_active: true },
      { id: 'tt_mon_1b', class_id: 'cls_tycs_a', subject_id: 'sub_dv', faculty_id: 'fac_ajit', day_of_week: 'Monday', start_time: '08:00 AM', end_time: '10:00 AM', room: '2nd Floor Lab 1', is_lab: true, batch: 'A2', academic_year: '2026-27', is_active: true },
      { id: 'tt_mon_2', class_id: 'cls_tycs_a', subject_id: 'sub_ai', faculty_id: 'fac_vijay', day_of_week: 'Monday', start_time: '10:15 AM', end_time: '11:15 AM', room: '701', academic_year: '2026-27', is_active: true },
      { id: 'tt_mon_3', class_id: 'cls_tycs_a', subject_id: 'sub_stqa', faculty_id: 'fac_dsouza', day_of_week: 'Monday', start_time: '11:15 AM', end_time: '12:15 PM', room: '701', academic_year: '2026-27', is_active: true },
      { id: 'tt_mon_4', class_id: 'cls_tycs_a', subject_id: 'sub_aba', faculty_id: 'fac_tuba', day_of_week: 'Monday', start_time: '12:45 PM', end_time: '01:45 PM', room: '701', academic_year: '2026-27', is_active: true },
      { id: 'tt_mon_5', class_id: 'cls_tycs_a', subject_id: 'sub_eth', faculty_id: 'fac_aparna', day_of_week: 'Monday', start_time: '01:45 PM', end_time: '02:45 PM', room: '701', academic_year: '2026-27', is_active: true },

      // TUESDAY
      { id: 'tt_tue_1', class_id: 'cls_tycs_a', subject_id: 'sub_iks', faculty_id: 'fac_kajal', day_of_week: 'Tuesday', start_time: '08:00 AM', end_time: '09:00 AM', room: '701', academic_year: '2026-27', is_active: true },
      { id: 'tt_tue_2', class_id: 'cls_tycs_a', subject_id: 'sub_ai', faculty_id: 'fac_vijay', day_of_week: 'Tuesday', start_time: '09:00 AM', end_time: '10:00 AM', room: '701', academic_year: '2026-27', is_active: true },
      { id: 'tt_tue_3', class_id: 'cls_tycs_a', subject_id: 'sub_stqa', faculty_id: 'fac_dsouza', day_of_week: 'Tuesday', start_time: '10:15 AM', end_time: '11:15 AM', room: '701', academic_year: '2026-27', is_active: true },
      { id: 'tt_tue_4', class_id: 'cls_tycs_a', subject_id: 'sub_cis', faculty_id: 'fac_rajesh', day_of_week: 'Tuesday', start_time: '11:15 AM', end_time: '12:15 PM', room: '701', academic_year: '2026-27', is_active: true },
      { id: 'tt_tue_5', class_id: 'cls_tycs_a', subject_id: 'sub_mp', faculty_id: 'fac_abha', day_of_week: 'Tuesday', start_time: '12:45 PM', end_time: '02:45 PM', room: '701', is_lab: true, academic_year: '2026-27', is_active: true },

      // WEDNESDAY
      { id: 'tt_wed_1', class_id: 'cls_tycs_a', subject_id: 'sub_stqa', faculty_id: 'fac_dsouza', day_of_week: 'Wednesday', start_time: '08:00 AM', end_time: '10:00 AM', room: '4th Floor Lab CC', is_lab: true, academic_year: '2026-27', is_active: true },
      { id: 'tt_wed_2', class_id: 'cls_tycs_a', subject_id: 'sub_stqa', faculty_id: 'fac_dsouza', day_of_week: 'Wednesday', start_time: '10:15 AM', end_time: '11:15 AM', room: '701', academic_year: '2026-27', is_active: true },
      { id: 'tt_wed_3', class_id: 'cls_tycs_a', subject_id: 'sub_cis', faculty_id: 'fac_rajesh', day_of_week: 'Wednesday', start_time: '11:15 AM', end_time: '12:15 PM', room: '701', academic_year: '2026-27', is_active: true },
      { id: 'tt_wed_4', class_id: 'cls_tycs_a', subject_id: 'sub_ai', faculty_id: 'fac_vijay', day_of_week: 'Wednesday', start_time: '12:45 PM', end_time: '02:45 PM', room: '4th Floor Lab CC', is_lab: true, academic_year: '2026-27', is_active: true },

      // THURSDAY
      { id: 'tt_thu_1', class_id: 'cls_tycs_a', subject_id: 'sub_dv', faculty_id: 'fac_ajit', day_of_week: 'Thursday', start_time: '08:00 AM', end_time: '10:00 AM', room: '2nd Floor Lab CC', is_lab: true, academic_year: '2026-27', is_active: true },
      { id: 'tt_thu_2', class_id: 'cls_tycs_a', subject_id: 'sub_cis', faculty_id: 'fac_rajesh', day_of_week: 'Thursday', start_time: '10:15 AM', end_time: '12:15 PM', room: '4th Floor Lab CC', is_lab: true, academic_year: '2026-27', is_active: true },
      { id: 'tt_thu_3', class_id: 'cls_tycs_a', subject_id: 'sub_stqa', faculty_id: 'fac_dsouza', day_of_week: 'Thursday', start_time: '12:45 PM', end_time: '01:45 PM', room: '701', academic_year: '2026-27', is_active: true },
      { id: 'tt_thu_4', class_id: 'cls_tycs_a', subject_id: 'sub_iks', faculty_id: 'fac_kajal', day_of_week: 'Thursday', start_time: '01:45 PM', end_time: '02:45 PM', room: '701', academic_year: '2026-27', is_active: true },

      // FRIDAY
      { id: 'tt_fri_1a', class_id: 'cls_tycs_a', subject_id: 'sub_aba', faculty_id: 'fac_tuba', day_of_week: 'Friday', start_time: '08:00 AM', end_time: '10:00 AM', room: '2nd Floor Lab 2', is_lab: true, batch: 'A2', academic_year: '2026-27', is_active: true },
      { id: 'tt_fri_1b', class_id: 'cls_tycs_a', subject_id: 'sub_dv', faculty_id: 'fac_ajit', day_of_week: 'Friday', start_time: '08:00 AM', end_time: '10:00 AM', room: '2nd Floor Lab 1', is_lab: true, batch: 'A1', academic_year: '2026-27', is_active: true },
      { id: 'tt_fri_2', class_id: 'cls_tycs_a', subject_id: 'sub_eth', faculty_id: 'fac_aparna', day_of_week: 'Friday', start_time: '10:15 AM', end_time: '12:15 PM', room: '4th Floor Lab CC', is_lab: true, academic_year: '2026-27', is_active: true },
      { id: 'tt_fri_3', class_id: 'cls_tycs_a', subject_id: 'sub_eth', faculty_id: 'fac_aparna', day_of_week: 'Friday', start_time: '12:45 PM', end_time: '01:45 PM', room: '701', academic_year: '2026-27', is_active: true },
      { id: 'tt_fri_4', class_id: 'cls_tycs_a', subject_id: 'sub_aba', faculty_id: 'fac_tuba', day_of_week: 'Friday', start_time: '01:45 PM', end_time: '02:45 PM', room: '701', academic_year: '2026-27', is_active: true },

      // SATURDAY
      { id: 'tt_sat_1', class_id: 'cls_tycs_a', subject_id: 'sub_cep', faculty_id: 'fac_vijay', day_of_week: 'Saturday', start_time: '08:00 AM', end_time: '10:00 AM', room: '603', academic_year: '2026-27', is_active: true },
    ];

    // 10. Initial Sessions and Records
    const attendance_sessions: AttendanceSession[] = [
      {
        id: 'sess_live_01',
        class_id: 'cls_tycs_a',
        subject_id: 'sub_ai',
        classroom_id: 'cr_ai_tycsa',
        faculty_id: 'fac_vijay',
        lecture_topic: 'Heuristic Search & A* Algorithm Implementation',
        session_date: new Date().toISOString().split('T')[0],
        start_time: '08:00 AM',
        radius_meters: 10,
        center_latitude: DEFAULT_SETTINGS.official_latitude,
        center_longitude: DEFAULT_SETTINGS.official_longitude,
        status: 'ACTIVE',
        created_at: now,
      },
      {
        id: 'sess_past_01',
        class_id: 'cls_tycs_a',
        subject_id: 'sub_ai',
        classroom_id: 'cr_ai_tycsa',
        faculty_id: 'fac_vijay',
        lecture_topic: 'Introduction to Artificial Intelligence & Agents',
        session_date: '2026-09-28',
        start_time: '08:00 AM',
        end_time: '09:00 AM',
        radius_meters: 10,
        center_latitude: DEFAULT_SETTINGS.official_latitude,
        center_longitude: DEFAULT_SETTINGS.official_longitude,
        status: 'CLOSED',
        created_at: '2026-09-28T08:00:00Z',
      },
      {
        id: 'sess_past_02',
        class_id: 'cls_tycs_a',
        subject_id: 'sub_stqa',
        classroom_id: 'cr_stqa_tycsa',
        faculty_id: 'fac_dsouza',
        lecture_topic: 'Boundary Value Analysis & Equivalence Partitioning',
        session_date: '2026-09-28',
        start_time: '10:15 AM',
        end_time: '11:15 AM',
        radius_meters: 10,
        center_latitude: DEFAULT_SETTINGS.official_latitude,
        center_longitude: DEFAULT_SETTINGS.official_longitude,
        status: 'CLOSED',
        created_at: '2026-09-28T10:15:00Z',
      },
    ];

    const attendance_records: AttendanceRecord[] = [
      {
        id: 'rec_01',
        session_id: 'sess_past_01',
        student_id: 'std_01',
        classroom_id: 'cr_ai_tycsa',
        status: 'PRESENT',
        marked_at: '2026-09-28T07:05:00Z',
        latitude: DEFAULT_SETTINGS.official_latitude,
        longitude: DEFAULT_SETTINGS.official_longitude,
        accuracy: 3.5,
        altitude: 24.2,
        distance_from_center: 2.1,
        camera_image_path: 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100"><rect fill="%2310b981" width="100" height="100"/><text fill="white" x="50%" y="55%" text-anchor="middle" font-size="12">VERIFIED</text></svg>',
        camera_verification_status: 'VERIFIED',
        created_at: '2026-09-28T07:05:00Z',
      },
      {
        id: 'rec_02',
        session_id: 'sess_past_02',
        student_id: 'std_01',
        classroom_id: 'cr_stqa_tycsa',
        status: 'PRESENT',
        marked_at: '2026-09-28T08:58:00Z',
        latitude: DEFAULT_SETTINGS.official_latitude,
        longitude: DEFAULT_SETTINGS.official_longitude,
        accuracy: 4.1,
        altitude: 24.0,
        distance_from_center: 3.4,
        camera_image_path: 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100"><rect fill="%2310b981" width="100" height="100"/><text fill="white" x="50%" y="55%" text-anchor="middle" font-size="12">VERIFIED</text></svg>',
        camera_verification_status: 'VERIFIED',
        created_at: '2026-09-28T08:58:00Z',
      },
    ];

    const audit_logs: AuditLog[] = [
      {
        id: 'log_01',
        actor_id: 'usr_admin',
        actor_role: 'admin',
        action: 'SYSTEM_INITIALIZED',
        entity_type: 'system',
        timestamp: now,
        details: 'AttendSecure database initialized with exact faculty names and timetable',
        severity: 'info',
      },
    ];

    this.db = {
      users,
      students,
      faculty,
      classes,
      subjects,
      faculty_assignments,
      timetables,
      classrooms,
      classroom_members,
      attendance_sessions,
      attendance_records,
      otp_verifications: [],
      audit_logs,
      institution_settings: DEFAULT_SETTINGS,
    };
  }

  // --- QUERY GETTERS ---

  public getUsers(): User[] {
    return this.db.users;
  }

  public getUserById(id: string): User | undefined {
    return this.db.users.find((u) => u.id === id);
  }

  public getUserByEmail(email: string): User | undefined {
    return this.db.users.find((u) => u.email.toLowerCase() === email.toLowerCase());
  }

  public getStudents(): Student[] {
    return this.db.students;
  }

  public getStudentById(id: string): Student | undefined {
    return this.db.students.find((s) => s.id === id);
  }

  public getStudentByUserId(userId: string): Student | undefined {
    return this.db.students.find((s) => s.user_id === userId);
  }

  public getStudentByStudentId(studentId: string): Student | undefined {
    return this.db.students.find((s) => s.student_id === studentId);
  }

  public getFaculty(): Faculty[] {
    return this.db.faculty;
  }

  public getFacultyById(id: string): Faculty | undefined {
    return this.db.faculty.find((f) => f.id === id);
  }

  public getFacultyByUserId(userId: string): Faculty | undefined {
    return this.db.faculty.find((f) => f.user_id === userId);
  }

  public getClasses(): ClassEntity[] {
    return this.db.classes;
  }

  public getClassById(id: string): ClassEntity | undefined {
    return this.db.classes.find((c) => c.id === id);
  }

  public getSubjects(): SubjectEntity[] {
    return this.db.subjects;
  }

  public getSubjectById(id: string): SubjectEntity | undefined {
    return this.db.subjects.find((s) => s.id === id);
  }

  public getSubjectsByClass(classId: string): SubjectEntity[] {
    return this.db.subjects.filter((s) => s.class_id === classId);
  }

  public getFacultyAssignments(facultyId?: string): FacultyAssignment[] {
    if (facultyId) {
      return this.db.faculty_assignments.filter((fa) => fa.faculty_id === facultyId);
    }
    return this.db.faculty_assignments;
  }

  public getStudentsByClass(classId: string): Student[] {
    return this.db.students.filter((s) => s.class_id === classId);
  }

  // --- TIMETABLE OPERATIONS ---

  public getTimetable(filter?: { classId?: string; facultyId?: string; day?: string }): TimetableEntry[] {
    return this.db.timetables.filter((t) => {
      if (filter?.classId && t.class_id !== filter.classId) return false;
      if (filter?.facultyId && t.faculty_id !== filter.facultyId) return false;
      if (filter?.day && t.day_of_week !== filter.day) return false;
      return true;
    });
  }

  public getTimetables(): TimetableEntry[] {
    return this.db.timetables;
  }

  public addTimetableEntry(entry: TimetableEntry) {
    this.db.timetables.push(entry);
    this.save();
  }

  public deleteTimetableEntry(id: string) {
    this.db.timetables = this.db.timetables.filter((t) => t.id !== id);
    this.save();
  }

  // --- CLASSROOM OPERATIONS ---

  public getClassrooms(filter?: { facultyId?: string; classId?: string }): ClassroomEntity[] {
    return this.db.classrooms.filter((c) => {
      if (filter?.facultyId && c.faculty_id !== filter.facultyId) return false;
      if (filter?.classId && c.class_id !== filter.classId) return false;
      return true;
    });
  }

  public getClassroomById(id: string): ClassroomEntity | undefined {
    return this.db.classrooms.find((c) => c.id === id);
  }

  public getClassroomByCode(code: string): ClassroomEntity | undefined {
    const normalized = code.trim().toUpperCase();
    return this.db.classrooms.find((c) => c.join_code.toUpperCase() === normalized);
  }

  public getClassroomByJoinCode(code: string): ClassroomEntity | undefined {
    return this.getClassroomByCode(code);
  }

  public addClassroom(classroom: ClassroomEntity) {
    this.db.classrooms.push(classroom);
    this.save();
  }

  public updateClassroom(id: string, updates: Partial<ClassroomEntity>) {
    const idx = this.db.classrooms.findIndex((c) => c.id === id);
    if (idx !== -1) {
      this.db.classrooms[idx] = { ...this.db.classrooms[idx], ...updates };
      this.save();
    }
  }

  public generateUniqueJoinCode(prefix: string = 'TSDC'): string {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let code = '';
    let isUnique = false;
    while (!isUnique) {
      let randomPart = '';
      for (let i = 0; i < 4; i++) {
        randomPart += chars.charAt(Math.floor(Math.random() * chars.length));
      }
      code = `${prefix.substring(0, 3).toUpperCase()}-${randomPart}`;
      isUnique = !this.db.classrooms.some((c) => c.join_code.toUpperCase() === code);
    }
    return code;
  }

  // --- CLASSROOM MEMBERSHIP ---

  public getClassroomMembers(filter?: string | { classroomId?: string; studentId?: string; status?: string }): ClassroomMember[] {
    if (typeof filter === 'string') {
      return this.db.classroom_members.filter((cm) => cm.classroom_id === filter && cm.status === 'active');
    }
    return this.db.classroom_members.filter((cm) => {
      if (filter?.classroomId && cm.classroom_id !== filter.classroomId) return false;
      if (filter?.studentId && cm.student_id !== filter.studentId) return false;
      if (filter?.status && cm.status !== filter.status) return false;
      return true;
    });
  }

  public getClassroomMember(classroomId: string, studentId: string): ClassroomMember | undefined {
    return this.db.classroom_members.find(
      (cm) => cm.classroom_id === classroomId && cm.student_id === studentId
    );
  }

  public addClassroomMember(member: ClassroomMember): ClassroomMember {
    const idx = this.db.classroom_members.findIndex(
      (cm) => cm.student_id === member.student_id && cm.classroom_id === member.classroom_id
    );
    if (idx !== -1) {
      this.db.classroom_members[idx].status = 'active';
      this.db.classroom_members[idx].joined_at = member.joined_at;
      this.save();
      return this.db.classroom_members[idx];
    } else {
      this.db.classroom_members.push(member);
      this.save();
      return member;
    }
  }

  // --- BRUTE-FORCE RATE LIMITING ---

  public checkJoinRateLimit(studentId: string): { allowed: boolean; waitMinutes: number } {
    const now = Date.now();
    const record = failedJoinAttempts.get(studentId);
    if (!record) return { allowed: true, waitMinutes: 0 };
    if (record.lockUntil > now) {
      const waitMinutes = Math.ceil((record.lockUntil - now) / 60000);
      return { allowed: false, waitMinutes };
    }
    return { allowed: true, waitMinutes: 0 };
  }

  public recordFailedJoinAttempt(studentId: string) {
    const now = Date.now();
    const record = failedJoinAttempts.get(studentId) || { count: 0, lockUntil: 0 };
    record.count += 1;
    if (record.count >= 5) {
      record.lockUntil = now + 5 * 60 * 1000;
      record.count = 0;
    }
    failedJoinAttempts.set(studentId, record);
  }

  // --- ATTENDANCE SESSIONS & RECORDS ---

  public getAttendanceSessions(filter?: { classId?: string; facultyId?: string; subjectId?: string; classroomId?: string; status?: string }): AttendanceSession[] {
    return this.db.attendance_sessions.filter((s) => {
      if (filter?.classId && s.class_id !== filter.classId) return false;
      if (filter?.facultyId && s.faculty_id !== filter.facultyId) return false;
      if (filter?.subjectId && s.subject_id !== filter.subjectId) return false;
      if (filter?.classroomId && s.classroom_id !== filter.classroomId) return false;
      if (filter?.status && s.status !== filter.status) return false;
      return true;
    });
  }

  public getSessionById(id: string): AttendanceSession | undefined {
    return this.db.attendance_sessions.find((s) => s.id === id);
  }

  public getAttendanceRecords(filter?: { sessionId?: string; studentId?: string; classroomId?: string }): AttendanceRecord[] {
    return this.db.attendance_records.filter((r) => {
      if (filter?.sessionId && r.session_id !== filter.sessionId) return false;
      if (filter?.studentId && r.student_id !== filter.studentId) return false;
      if (filter?.classroomId && r.classroom_id !== filter.classroomId) return false;
      return true;
    });
  }

  public getAttendanceRecord(sessionId: string, studentId: string): AttendanceRecord | undefined {
    return this.db.attendance_records.find((r) => r.session_id === sessionId && r.student_id === studentId);
  }

  public getSettings(): InstitutionSettings {
    return this.db.institution_settings || DEFAULT_SETTINGS;
  }

  // --- AUDIT LOGS ---

  public addAuditLog(log: Partial<AuditLog>) {
    const fullLog: AuditLog = {
      id: `audit_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      action: log.action || 'SECURITY_EVENT',
      actor_id: log.actor_id,
      actor_role: log.actor_role,
      target_id: log.target_id,
      details: typeof log.details === 'object' ? JSON.stringify(log.details) : log.details,
      timestamp: new Date().toISOString(),
      severity: log.severity || 'info',
    };
    this.db.audit_logs.unshift(fullLog);
    if (this.db.audit_logs.length > 200) this.db.audit_logs.pop();
    this.save();
  }

  public getAuditLogs(limit: number = 100): AuditLog[] {
    return this.db.audit_logs.slice(0, limit);
  }

  // --- MUTATIONS ---

  public addUser(user: User) {
    this.db.users.push(user);
    this.save();
  }

  public updateUser(id: string, updates: Partial<User>) {
    const idx = this.db.users.findIndex((u) => u.id === id);
    if (idx !== -1) {
      this.db.users[idx] = { ...this.db.users[idx], ...updates, updated_at: new Date().toISOString() };
      this.save();
    }
  }

  public addStudent(student: Student) {
    this.db.students.push(student);
    this.save();
  }

  public updateStudent(id: string, updates: Partial<Student>) {
    const idx = this.db.students.findIndex((s) => s.id === id);
    if (idx !== -1) {
      this.db.students[idx] = { ...this.db.students[idx], ...updates };
      this.save();
    }
  }

  public deleteStudent(id: string) {
    const student = this.db.students.find((s) => s.id === id);
    if (student) {
      this.db.students = this.db.students.filter((s) => s.id !== id);
      this.db.users = this.db.users.filter((u) => u.id !== student.user_id);
      this.db.classroom_members = this.db.classroom_members.filter((cm) => cm.student_id !== id);
      this.db.attendance_records = this.db.attendance_records.filter((ar) => ar.student_id !== id);
      this.save();
    }
  }

  public addFaculty(faculty: Faculty) {
    this.db.faculty.push(faculty);
    this.save();
  }

  public updateFaculty(id: string, updates: Partial<Faculty>) {
    const idx = this.db.faculty.findIndex((f) => f.id === id);
    if (idx !== -1) {
      this.db.faculty[idx] = { ...this.db.faculty[idx], ...updates };
      this.save();
    }
  }

  public removeFacultyAssignmentsByFacultyId(facultyId: string) {
    this.db.faculty_assignments = this.db.faculty_assignments.filter((fa) => fa.faculty_id !== facultyId);
    this.save();
  }

  public deleteFacultyAssignment(id: string) {
    this.db.faculty_assignments = this.db.faculty_assignments.filter((fa) => fa.id !== id);
    this.save();
  }

  public addClass(cls: ClassEntity) {
    this.db.classes.push(cls);
    this.save();
  }

  public updateClass(id: string, updates: Partial<ClassEntity>) {
    const idx = this.db.classes.findIndex((c) => c.id === id);
    if (idx !== -1) {
      this.db.classes[idx] = { ...this.db.classes[idx], ...updates };
      this.save();
    }
  }

  public deleteClass(id: string) {
    this.db.classes = this.db.classes.filter((c) => c.id !== id);
    this.db.faculty_assignments = this.db.faculty_assignments.filter((fa) => fa.class_id !== id);
    this.save();
  }

  public addSubject(subject: SubjectEntity) {
    this.db.subjects.push(subject);
    this.save();
  }

  public updateSubject(id: string, updates: Partial<SubjectEntity>) {
    const idx = this.db.subjects.findIndex((s) => s.id === id);
    if (idx !== -1) {
      this.db.subjects[idx] = { ...this.db.subjects[idx], ...updates };
      this.save();
    }
  }

  public deleteSubject(id: string) {
    this.db.subjects = this.db.subjects.filter((s) => s.id !== id);
    this.db.faculty_assignments = this.db.faculty_assignments.filter((fa) => fa.subject_id !== id);
    this.save();
  }

  public toggleSessionLock(sessionId: string, isLocked: boolean, lockedBy: string) {
    const idx = this.db.attendance_sessions.findIndex((s) => s.id === sessionId);
    if (idx !== -1) {
      this.db.attendance_sessions[idx].is_locked = isLocked;
      this.db.attendance_sessions[idx].locked_at = isLocked ? new Date().toISOString() : undefined;
      this.db.attendance_sessions[idx].locked_by = isLocked ? lockedBy : undefined;
      this.save();
      return this.db.attendance_sessions[idx];
    }
    return undefined;
  }

  public addFacultyAssignment(fa: FacultyAssignment) {
    this.db.faculty_assignments.push(fa);
    this.save();
  }

  public createSession(session: AttendanceSession) {
    this.db.attendance_sessions.unshift(session);
    this.save();
  }

  public updateSession(id: string, updates: Partial<AttendanceSession>) {
    const idx = this.db.attendance_sessions.findIndex((s) => s.id === id);
    if (idx !== -1) {
      this.db.attendance_sessions[idx] = { ...this.db.attendance_sessions[idx], ...updates };
      this.save();
    }
  }

  public addAttendanceRecord(record: AttendanceRecord) {
    this.db.attendance_records.unshift(record);
    this.save();
  }

  public overrideAttendance(
    sessionId: string,
    studentId: string,
    status: 'PRESENT' | 'ABSENT',
    facultyId: string,
    reason?: string
  ) {
    const existingIdx = this.db.attendance_records.findIndex(
      (r) => r.session_id === sessionId && r.student_id === studentId
    );
    const now = new Date().toISOString();
    if (existingIdx !== -1) {
      this.db.attendance_records[existingIdx].status = status;
      this.db.attendance_records[existingIdx].marked_at = now;
    } else {
      this.db.attendance_records.unshift({
        id: `att_rec_ov_${Date.now()}`,
        session_id: sessionId,
        student_id: studentId,
        marked_at: now,
        distance_from_center: 0,
        latitude: 0,
        longitude: 0,
        accuracy: 0,
        altitude: null,
        camera_image_path: '',
        camera_verification_status: 'VERIFIED',
        device_id: 'faculty_manual_override',
        status: status,
        created_at: now,
      });
    }
    this.save();
  }

  public updateSettings(updates: Partial<InstitutionSettings>) {
    this.db.institution_settings = {
      ...this.db.institution_settings,
      ...updates,
      updated_at: new Date().toISOString(),
    };
    this.save();
  }

  public createOtp(otp: OtpVerification) {
    this.db.otp_verifications = this.db.otp_verifications.filter(
      (o) => !(o.email.toLowerCase() === otp.email.toLowerCase() && o.purpose === otp.purpose && !o.verified)
    );
    this.db.otp_verifications.push(otp);
    this.save();
  }

  public getLatestOtp(email: string, purpose: string): OtpVerification | undefined {
    return this.db.otp_verifications
      .filter((o) => o.email.toLowerCase() === email.toLowerCase() && o.purpose === purpose && !o.verified)
      .sort((a, b) => b.expires_at - a.expires_at)[0];
  }

  public markOtpVerified(id: string) {
    const idx = this.db.otp_verifications.findIndex((o) => o.id === id);
    if (idx !== -1) {
      this.db.otp_verifications[idx].verified = true;
      this.save();
    }
  }

  public incrementOtpAttempts(id: string) {
    const idx = this.db.otp_verifications.findIndex((o) => o.id === id);
    if (idx !== -1) {
      this.db.otp_verifications[idx].attempts += 1;
      this.save();
    }
  }

  public cleanDatabaseForProduction() {
    // Keep only admin and faculty users
    this.db.users = this.db.users.filter((u) => u.role === 'admin' || u.role === 'faculty');
    this.db.students = [];
    this.db.attendance_sessions = [];
    this.db.attendance_records = [];
    this.db.classroom_members = [];
    this.db.otp_verifications = [];
    this.db.audit_logs = [];
    this.save();
    console.log('[AttendSecure DB] Cleaned all test student and attendance records for fresh hosting!');
  }

  public resetToSeed() {
    this.seedDatabase();
    this.cleanDatabaseForProduction();
    this.save();
  }
}

export const db = new DatabaseManager();
