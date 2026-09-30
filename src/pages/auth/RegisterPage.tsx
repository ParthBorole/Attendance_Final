import React, { useState, useEffect } from 'react';
import { ApiService } from '../../services/api.js';
import { useAuth } from '../../context/AuthContext.js';
import { OtpModal } from './OtpModal.js';
import {
  ShieldCheck,
  UserPlus,
  ArrowLeft,
  AlertCircle,
  GraduationCap,
  Briefcase,
  Lock,
  CheckCircle2,
  BookOpen,
  Eye,
  EyeOff,
} from 'lucide-react';

interface RegisterPageProps {
  onSwitchToLogin: () => void;
}

export const RegisterPage: React.FC<RegisterPageProps> = ({ onSwitchToLogin }) => {
  const { login } = useAuth();
  const [role, setRole] = useState<'student' | 'faculty' | 'admin'>('student');
  const [classes, setClasses] = useState<any[]>([]);

  // Form State
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
    // Student specific
    studentId: '',
    rollNumber: '',
    classId: '',
    division: 'A',
    academicYear: '2026-27',
    // Faculty specific
    department: 'Computer Science',
    employeeId: '',
    shortCode: '',
    subjectName: '',
    // Admin specific
    adminPasscode: '',
  });

  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // OTP Modal State
  const [showOtpModal, setShowOtpModal] = useState<boolean>(false);
  const [registeredEmail, setRegisteredEmail] = useState<string>('');
  const [emailDelivered, setEmailDelivered] = useState<boolean>(false);
  const [deliveryNotice, setDeliveryNotice] = useState<string>('');
  const [receivedOtp, setReceivedOtp] = useState<string | null>(null);

  useEffect(() => {
    const fetchClasses = async () => {
      const res = await ApiService.getPublicClasses();
      if (res.success && res.data) {
        setClasses(res.data);
        if (res.data.length > 0) {
          setFormData((prev) => ({ ...prev, classId: res.data[0].id }));
        }
      }
    };
    fetchClasses();
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleRoleTabChange = (newRole: 'student' | 'faculty' | 'admin') => {
    setRole(newRole);
    setError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!formData.name.trim() || !formData.email.trim() || !formData.password) {
      setError('Please fill in your Name, Email ID, and Password.');
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    if (formData.password.length < 6) {
      setError('Password must contain at least 6 characters.');
      return;
    }

    if (role === 'student' && (!formData.studentId || !formData.rollNumber || !formData.classId)) {
      setError('Student ID, Roll Number, and Enrolled Class are required.');
      return;
    }

    if (role === 'faculty' && (!formData.department || !formData.employeeId)) {
      setError('Department and Employee ID are required for faculty registration.');
      return;
    }

    if (role === 'admin' && (!formData.adminPasscode || formData.adminPasscode.trim().length !== 4)) {
      setError('A valid 4-digit secret Admin Passcode is required to register an Administrator account.');
      return;
    }

    setIsLoading(true);
    const payload = {
      ...formData,
      role,
      email: formData.email.trim().toLowerCase(),
    };

    const res = await ApiService.register(payload);
    setIsLoading(false);

    if (res.success) {
      if (res.requiresOtp) {
        setRegisteredEmail(res.email || formData.email.trim().toLowerCase());
        setEmailDelivered(!!res.emailDelivered);
        setDeliveryNotice(res.message || 'OTP dispatched to your Gmail.');
        setReceivedOtp(res.otp || null);
        setShowOtpModal(true);
      } else if (res.token) {
        login({
          token: res.token,
          user: res.user,
          student: res.student,
          faculty: res.faculty,
        });
      }
    } else {
      setError(res.message || 'Registration failed. Please verify the information entered.');
    }
  };

  return (
    <div className="min-h-screen bg-[#FBF9F5] flex flex-col justify-center py-10 px-4 sm:px-6 lg:px-8">

      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center mb-6">
        <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-stone-900 text-emerald-400 shadow-sm mb-3">
          <ShieldCheck className="w-7 h-7" />
        </div>
        <h1 className="text-2xl font-bold tracking-tight text-stone-900">
          Create AttendSecure Account
        </h1>
        <p className="mt-1 text-xs text-stone-500">
          Thakur Shyamnarayan Degree College • Direct Database Registration
        </p>
      </div>

      <div className="sm:mx-auto sm:w-full sm:max-w-xl">
        <div className="bg-white py-8 px-6 sm:px-10 shadow-xs border border-stone-200/80 rounded-2xl">
          {/* Role selector tabs */}
          <div className="flex items-center gap-1.5 p-1 bg-stone-100 rounded-xl mb-6 border border-stone-200/60">
            <button
              type="button"
              onClick={() => handleRoleTabChange('student')}
              className={`flex-1 py-2 text-xs font-semibold rounded-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                role === 'student'
                  ? 'bg-white text-stone-900 shadow-xs border border-stone-200/60'
                  : 'text-stone-600 hover:text-stone-900'
              }`}
            >
              <GraduationCap className="w-4 h-4 text-emerald-600" />
              <span>Student</span>
            </button>

            <button
              type="button"
              onClick={() => handleRoleTabChange('faculty')}
              className={`flex-1 py-2 text-xs font-semibold rounded-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                role === 'faculty'
                  ? 'bg-white text-stone-900 shadow-xs border border-stone-200/60'
                  : 'text-stone-600 hover:text-stone-900'
              }`}
            >
              <Briefcase className="w-4 h-4 text-amber-600" />
              <span>Faculty</span>
            </button>

            <button
              type="button"
              onClick={() => handleRoleTabChange('admin')}
              className={`flex-1 py-2 text-xs font-semibold rounded-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                role === 'admin'
                  ? 'bg-white text-stone-900 shadow-xs border border-stone-200/60'
                  : 'text-stone-600 hover:text-stone-900'
              }`}
            >
              <Lock className="w-4 h-4 text-rose-600" />
              <span>Admin</span>
            </button>
          </div>

          {error && (
            <div className="mb-5 p-3.5 bg-rose-50 border border-rose-200 rounded-xl flex items-start gap-2.5 text-xs text-rose-800">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-600 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Common Name Field */}
            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1">
                {role === 'faculty' ? 'Teacher / Faculty Name' : 'Full Name'}
              </label>
              <input
                type="text"
                name="name"
                required
                value={formData.name}
                onChange={handleChange}
                placeholder="Enter your full name"
                className="w-full px-3.5 py-2.5 bg-stone-50 border border-stone-200 rounded-xl text-xs text-stone-900 focus:border-stone-900 focus:bg-white focus:outline-none transition-all"
              />
            </div>

            {/* Common Email Field */}
            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1">
                Email Address
              </label>
              <input
                type="email"
                name="email"
                required
                value={formData.email}
                onChange={handleChange}
                placeholder="Enter email address"
                className="w-full px-3.5 py-2.5 bg-stone-50 border border-stone-200 rounded-xl text-xs text-stone-900 focus:border-stone-900 focus:bg-white focus:outline-none transition-all font-mono"
              />
            </div>

            {/* STUDENT SPECIFIC FIELDS */}
            {role === 'student' && (
              <>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-stone-700 mb-1">
                      Student ID Number
                    </label>
                    <input
                      type="text"
                      name="studentId"
                      required={role === 'student'}
                      value={formData.studentId}
                      onChange={handleChange}
                      placeholder="Enter student ID number"
                      className="w-full px-3.5 py-2.5 bg-stone-50 border border-stone-200 rounded-xl text-xs text-stone-900 focus:border-stone-900 focus:bg-white focus:outline-none transition-all"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-stone-700 mb-1">
                      Roll Number
                    </label>
                    <input
                      type="text"
                      name="rollNumber"
                      required={role === 'student'}
                      value={formData.rollNumber}
                      onChange={handleChange}
                      placeholder="Enter roll number"
                      className="w-full px-3.5 py-2.5 bg-stone-50 border border-stone-200 rounded-xl text-xs text-stone-900 focus:border-stone-900 focus:bg-white focus:outline-none transition-all"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="sm:col-span-2">
                    <label className="block text-xs font-semibold text-stone-700 mb-1">
                      Enrolled Class
                    </label>
                    <select
                      name="classId"
                      value={formData.classId}
                      onChange={handleChange}
                      className="w-full px-3.5 py-2.5 bg-stone-50 border border-stone-200 rounded-xl text-xs text-stone-900 focus:border-stone-900 focus:bg-white focus:outline-none transition-all cursor-pointer"
                    >
                      {classes.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.class_name}.{c.division} — {c.course_name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-stone-700 mb-1">
                      Division
                    </label>
                    <select
                      name="division"
                      value={formData.division}
                      onChange={handleChange}
                      className="w-full px-3.5 py-2.5 bg-stone-50 border border-stone-200 rounded-xl text-xs text-stone-900 focus:border-stone-900 focus:bg-white focus:outline-none transition-all cursor-pointer"
                    >
                      <option value="A">Div A</option>
                      <option value="B">Div B</option>
                      <option value="C">Div C</option>
                    </select>
                  </div>
                </div>
              </>
            )}

            {/* FACULTY SPECIFIC FIELDS */}
            {role === 'faculty' && (
              <>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="sm:col-span-2">
                    <label className="block text-xs font-semibold text-stone-700 mb-1">
                      Department
                    </label>
                    <input
                      type="text"
                      name="department"
                      required={role === 'faculty'}
                      value={formData.department}
                      onChange={handleChange}
                      placeholder="Enter department name"
                      className="w-full px-3.5 py-2.5 bg-stone-50 border border-stone-200 rounded-xl text-xs text-stone-900 focus:border-stone-900 focus:bg-white focus:outline-none transition-all"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-stone-700 mb-1">
                      Short Code
                    </label>
                    <input
                      type="text"
                      name="shortCode"
                      value={formData.shortCode}
                      onChange={handleChange}
                      placeholder="Short code"
                      maxLength={4}
                      className="w-full px-3.5 py-2.5 bg-stone-50 border border-stone-200 rounded-xl text-xs text-stone-900 focus:border-stone-900 focus:bg-white focus:outline-none transition-all uppercase"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-stone-700 mb-1">
                      Employee ID
                    </label>
                    <input
                      type="text"
                      name="employeeId"
                      required={role === 'faculty'}
                      value={formData.employeeId}
                      onChange={handleChange}
                      placeholder="Enter employee ID"
                      className="w-full px-3.5 py-2.5 bg-stone-50 border border-stone-200 rounded-xl text-xs text-stone-900 focus:border-stone-900 focus:bg-white focus:outline-none transition-all"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-stone-700 mb-1">
                      Primary Assigned Class
                    </label>
                    <select
                      name="classId"
                      value={formData.classId}
                      onChange={handleChange}
                      className="w-full px-3.5 py-2.5 bg-stone-50 border border-stone-200 rounded-xl text-xs text-stone-900 focus:border-stone-900 focus:bg-white focus:outline-none transition-all cursor-pointer"
                    >
                      {classes.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.class_name}.{c.division} — {c.course_name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-stone-700 mb-1">
                    Assigned Teaching Subject
                  </label>
                  <input
                    type="text"
                    name="subjectName"
                    value={formData.subjectName}
                    onChange={handleChange}
                    placeholder="Enter teaching subject name"
                    className="w-full px-3.5 py-2.5 bg-stone-50 border border-stone-200 rounded-xl text-xs text-stone-900 focus:border-stone-900 focus:bg-white focus:outline-none transition-all"
                  />
                </div>
              </>
            )}

            {/* ADMIN SPECIFIC FIELDS */}
            {role === 'admin' && (
              <div className="p-4 bg-rose-50/80 border border-rose-200 rounded-xl space-y-3">
                <div className="flex items-center gap-2 text-xs font-bold text-rose-900">
                  <Lock className="w-4 h-4 text-rose-600" />
                  <span>Administrator Security Passcode Required</span>
                </div>
                <p className="text-[11px] text-rose-800 leading-relaxed">
                  Administrator registration requires the secret 4-digit Admin Passcode provided privately by the College Directorate / Developer.
                </p>
                <div>
                  <label className="block text-xs font-semibold text-rose-900 mb-1">
                    Secret 4-Digit Admin Passcode
                  </label>
                  <input
                    type="password"
                    name="adminPasscode"
                    maxLength={4}
                    required={role === 'admin'}
                    value={formData.adminPasscode}
                    onChange={handleChange}
                    placeholder="••••"
                    className="w-full px-3.5 py-2.5 bg-white border border-rose-300 rounded-xl text-center font-mono text-xl font-bold tracking-[0.5em] text-rose-950 focus:border-rose-600 focus:outline-none transition-all"
                  />
                </div>
              </div>
            )}

            {/* PASSWORD FIELDS */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1">
                  Password
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    name="password"
                    required
                    value={formData.password}
                    onChange={handleChange}
                    placeholder="••••••••"
                    className="w-full pl-3.5 pr-10 py-2.5 bg-stone-50 border border-stone-200 rounded-xl text-xs text-stone-900 focus:border-stone-900 focus:bg-white focus:outline-none transition-all"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-700 cursor-pointer p-1"
                    title={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1">
                  Confirm Password
                </label>
                <div className="relative">
                  <input
                    type={showConfirmPassword ? 'text' : 'password'}
                    name="confirmPassword"
                    required
                    value={formData.confirmPassword}
                    onChange={handleChange}
                    placeholder="••••••••"
                    className="w-full pl-3.5 pr-10 py-2.5 bg-stone-50 border border-stone-200 rounded-xl text-xs text-stone-900 focus:border-stone-900 focus:bg-white focus:outline-none transition-all"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-700 cursor-pointer p-1"
                    title={showConfirmPassword ? 'Hide password' : 'Show password'}
                  >
                    {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
            </div>

            <div className="p-3 bg-amber-50/60 border border-amber-200/60 rounded-xl text-[11px] text-amber-900 flex items-start gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0 text-amber-600 mt-0.5" />
              <span>
                Your entered User ID (Email) & Password will be hashed with bcrypt and permanently saved into the college database.
              </span>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full mt-2 py-3 px-4 bg-stone-900 hover:bg-stone-800 disabled:opacity-50 text-white font-semibold text-xs rounded-xl shadow-xs transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              <UserPlus className="w-4 h-4 text-emerald-400" />
              <span>{isLoading ? 'Creating Account in Database...' : `Register as ${role.toUpperCase()} & Verify`}</span>
            </button>
          </form>

          <div className="mt-6 pt-5 border-t border-stone-100 flex items-center justify-between text-xs">
            <span className="text-stone-500">Already have an account?</span>
            <button
              onClick={onSwitchToLogin}
              className="font-semibold text-stone-900 hover:underline flex items-center gap-1 cursor-pointer"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back to Login</span>
            </button>
          </div>
        </div>
      </div>

      {showOtpModal && (
        <OtpModal
          email={registeredEmail}
          emailDelivered={emailDelivered}
          deliveryNotice={deliveryNotice}
          initialOtp={receivedOtp || undefined}
          purpose="registration"
          onClose={() => setShowOtpModal(false)}
          onSuccess={(res) => {
            setShowOtpModal(false);
            login({
              token: res.token,
              user: res.user,
              student: res.student,
              faculty: res.faculty,
            });
          }}
        />
      )}
    </div>
  );
};
