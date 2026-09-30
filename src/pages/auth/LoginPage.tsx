import React, { useState } from 'react';
import { ApiService } from '../../services/api.js';
import { useAuth } from '../../context/AuthContext.js';
import { ShieldCheck, LogIn, GraduationCap, Briefcase, Lock, AlertCircle, ArrowRight, Eye, EyeOff, KeyRound, Search } from 'lucide-react';
import { ForgotPasswordModal } from './ForgotPasswordModal.js';
import { ForgotUsernameModal } from './ForgotUsernameModal.js';

interface LoginPageProps {
  onSwitchToRegister: () => void;
}

export const LoginPage: React.FC<LoginPageProps> = ({ onSwitchToRegister }) => {
  const { login } = useAuth();
  const [role, setRole] = useState<'student' | 'faculty' | 'admin'>('student');
  const [email, setEmail] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [showForgotPassword, setShowForgotPassword] = useState<boolean>(false);
  const [showForgotUsername, setShowForgotUsername] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [successNotice, setSuccessNotice] = useState<string | null>(null);

  // OTP Login Verification Step
  const [step, setStep] = useState<'credentials' | 'otp'>('credentials');
  const [otpInput, setOtpInput] = useState<string>('');
  const [receivedOtp, setReceivedOtp] = useState<string | null>(null);
  const [otpNotice, setOtpNotice] = useState<string | null>(null);
  const [otpEmail, setOtpEmail] = useState<string>('');

  const handleRoleChange = (newRole: 'student' | 'faculty' | 'admin') => {
    setRole(newRole);
    setError(null);
    setSuccessNotice(null);
    setEmail('');
    setPassword('');
    setStep('credentials');
    setOtpInput('');
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setError('Please enter your email and password.');
      return;
    }

    setIsLoading(true);
    setError(null);
    setSuccessNotice(null);

    const res = await ApiService.login({ email: email.trim().toLowerCase(), password, role });
    setIsLoading(false);

    if (res.success) {
      if (res.requiresOtp) {
        setOtpEmail(res.email || email.trim().toLowerCase());
        setReceivedOtp(res.otp || null);
        setOtpNotice(res.message || `A 6-digit OTP security code was sent to ${res.email}.`);
        setStep('otp');
        setOtpInput(res.otp || ''); // auto-populate for frictionless testing while also allowing manual edit/paste
      } else if (res.token) {
        login({
          token: res.token,
          user: res.user,
          student: res.student,
          faculty: res.faculty,
        });
      }
    } else {
      setError(res.message || 'Login failed. Please verify your credentials.');
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!otpInput || otpInput.trim().length !== 6) {
      setError('Please enter the 6-digit OTP code sent to your email.');
      return;
    }

    setIsLoading(true);
    setError(null);

    const res = await ApiService.verifyOtp({
      email: otpEmail,
      otp: otpInput.trim(),
      purpose: 'login',
    });
    setIsLoading(false);

    if (res.success && res.token) {
      login({
        token: res.token,
        user: res.user,
        student: res.student,
        faculty: res.faculty,
      });
    } else {
      setError(res.message || 'Invalid or expired OTP code. Please check your email and try again.');
    }
  };

  const handleResendOtp = async () => {
    setIsLoading(true);
    setError(null);
    const res = await ApiService.resendOtp({ email: otpEmail, purpose: 'login' });
    setIsLoading(false);
    if (res.success) {
      if (res.otp) {
        setReceivedOtp(res.otp);
        setOtpInput(res.otp);
      }
      setSuccessNotice(`Fresh OTP sent to ${otpEmail}. Please check your Gmail Inbox.`);
    } else {
      setError(res.message || 'Failed to resend OTP. Please try again.');
    }
  };

  return (
    <div className="min-h-screen bg-[#FBF9F5] flex flex-col justify-center py-10 px-4 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center mb-6">
        <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-stone-900 text-emerald-400 shadow-md mb-3">
          <ShieldCheck className="w-8 h-8" />
        </div>
        <h1 className="text-3xl font-extrabold tracking-tight text-stone-900">
          AttendSecure
        </h1>
        <p className="mt-1 text-sm font-medium text-stone-600">
          Secure Attendance • Verified Physical Presence
        </p>
        <p className="text-[11px] text-stone-400 uppercase tracking-widest mt-1">
          Thakur Shyamnarayan Degree College (TSDC)
        </p>
      </div>

      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-6 sm:px-10 shadow-xs border border-stone-200/80 rounded-2xl">
          
          {step === 'otp' ? (
            <div className="space-y-4">
              <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-950 space-y-2">
                <div className="font-bold flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <ShieldCheck className="w-4 h-4 text-emerald-600" />
                    <span>2-Step OTP Security Verification</span>
                  </span>
                  <span className="text-[10px] font-mono px-1.5 py-0.5 bg-emerald-200/70 text-emerald-900 rounded-md">OTP Dispatched</span>
                </div>
                <p className="text-[11px] text-emerald-800">
                  A 6-digit verification code has been dispatched to <strong>{otpEmail}</strong>.
                </p>
                {receivedOtp && (
                  <div className="mt-2 pt-2 border-t border-emerald-200/60 flex items-center justify-between">
                    <div>
                      <span className="text-[10px] text-emerald-700 block">Gmail / Inbox Security Code:</span>
                      <span className="font-mono text-base font-bold tracking-widest text-emerald-900">{receivedOtp}</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setOtpInput(receivedOtp);
                        setError(null);
                      }}
                      className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-[11px] rounded-lg transition-colors cursor-pointer"
                    >
                      Paste / Auto-Fill OTP
                    </button>
                  </div>
                )}
              </div>

              {error && (
                <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-xl flex items-start gap-2.5 text-xs text-rose-800">
                  <AlertCircle className="w-4 h-4 shrink-0 text-rose-600 mt-0.5" />
                  <span>{error}</span>
                </div>
              )}

              {successNotice && (
                <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-xl flex items-start gap-2.5 text-xs text-emerald-800">
                  <ShieldCheck className="w-4 h-4 shrink-0 text-emerald-600 mt-0.5" />
                  <span>{successNotice}</span>
                </div>
              )}

              <form onSubmit={handleVerifyOtp} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-stone-700 mb-1">
                    Enter or Paste 6-Digit OTP Code
                  </label>
                  <input
                    type="text"
                    required
                    maxLength={6}
                    value={otpInput}
                    onChange={(e) => setOtpInput(e.target.value.replace(/\D/g, ''))}
                    placeholder="123456"
                    className="w-full px-3.5 py-3 bg-stone-50 border border-stone-200 rounded-xl text-center font-mono text-xl font-bold tracking-[0.5em] text-stone-900 focus:border-stone-900 focus:bg-white focus:outline-hidden transition-all"
                  />
                </div>

                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full py-3 px-4 bg-stone-900 hover:bg-black disabled:opacity-50 text-white font-semibold text-xs rounded-xl shadow-xs transition-all flex items-center justify-center gap-2 cursor-pointer"
                >
                  <ShieldCheck className="w-4 h-4 text-emerald-400" />
                  <span>{isLoading ? 'Verifying OTP...' : 'Verify OTP & Complete Login'}</span>
                </button>
              </form>

              <div className="pt-2 border-t border-stone-100 flex items-center justify-between text-xs">
                <button
                  type="button"
                  onClick={() => {
                    setStep('credentials');
                    setError(null);
                  }}
                  className="text-stone-500 hover:text-stone-900 font-medium cursor-pointer"
                >
                  ← Back to Login
                </button>
                <button
                  type="button"
                  onClick={handleResendOtp}
                  disabled={isLoading}
                  className="text-emerald-700 hover:text-emerald-900 font-semibold cursor-pointer disabled:opacity-50"
                >
                  Resend OTP Code
                </button>
              </div>
            </div>
          ) : (
            <>
              {/* Role Selection Tabs */}
          <div className="flex items-center gap-1.5 p-1 bg-stone-100/90 rounded-xl mb-5 border border-stone-200/60">
            <button
              type="button"
              onClick={() => handleRoleChange('student')}
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
              onClick={() => handleRoleChange('faculty')}
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
              onClick={() => handleRoleChange('admin')}
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

          {role === 'student' && (
            <div className="mb-5 p-3 bg-emerald-50/80 border border-emerald-200/80 rounded-xl text-xs text-emerald-950 space-y-1">
              <div className="font-bold flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <GraduationCap className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Student Attendance Portal</span>
                </span>
                <span className="text-[10px] uppercase font-mono px-1.5 py-0.5 bg-emerald-200/70 text-emerald-900 rounded-md">Student</span>
              </div>
              <p className="text-[11px] text-emerald-800">
                Sign in with your registered Student email ID and password to access your attendance portal.
              </p>
            </div>
          )}

          {role === 'faculty' && (
            <div className="mb-5 p-3 bg-amber-50/80 border border-amber-200/80 rounded-xl text-xs text-amber-950 space-y-1">
              <div className="font-bold flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <Briefcase className="w-3.5 h-3.5 text-amber-600" />
                  <span>Faculty Portal Sign In</span>
                </span>
                <span className="text-[10px] uppercase font-mono px-1.5 py-0.5 bg-amber-200/70 text-amber-900 rounded-md">Faculty</span>
              </div>
              <p className="text-[11px] text-amber-800">
                Please enter your registered Faculty institutional email address and password to manage attendance.
              </p>
            </div>
          )}

          {role === 'admin' && (
            <div className="mb-5 p-3 bg-rose-50/80 border border-rose-200/80 rounded-xl text-xs text-rose-900 space-y-1">
              <div className="font-bold flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <Lock className="w-3.5 h-3.5 text-rose-600" />
                  <span>College Administrator Portal</span>
                </span>
                <span className="text-[10px] uppercase font-mono px-1.5 py-0.5 bg-rose-200/70 text-rose-900 rounded-md">Restricted</span>
              </div>
              <p className="text-[11px] text-rose-800">
                Authorized college personnel only. Please enter your Administrator credentials to sign in.
              </p>
            </div>
          )}

          {error && (
            <div className="mb-5 p-3.5 bg-rose-50 border border-rose-200 rounded-xl flex items-start gap-2.5 text-xs text-rose-800">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-600 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1">
                Email Address
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Enter email address"
                className="w-full px-3.5 py-2.5 bg-stone-50 border border-stone-200 rounded-xl text-xs text-stone-900 focus:border-stone-900 focus:bg-white focus:outline-hidden transition-all font-mono"
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs font-semibold text-stone-700">
                  Password
                </label>
                <button
                  type="button"
                  onClick={() => setShowForgotPassword(true)}
                  className="text-[11px] font-semibold text-stone-500 hover:text-stone-900 hover:underline cursor-pointer"
                >
                  Forgot Password?
                </button>
              </div>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter password"
                  className="w-full pl-3.5 pr-10 py-2.5 bg-stone-50 border border-stone-200 rounded-xl text-xs text-stone-900 focus:border-stone-900 focus:bg-white focus:outline-hidden transition-all"
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

            <button
              type="submit"
              disabled={isLoading}
              className="w-full mt-2 py-3 px-4 bg-stone-900 hover:bg-black disabled:opacity-50 text-white font-semibold text-xs rounded-xl shadow-xs transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              <LogIn className="w-4 h-4 text-emerald-400" />
              <span>{isLoading ? 'Authenticating...' : `Sign in as ${role.charAt(0).toUpperCase() + role.slice(1)}`}</span>
            </button>
          </form>

          {/* Account Recovery Options */}
          <div className="mt-4 pt-3 border-t border-stone-100 flex items-center justify-center gap-4 text-[11px]">
            <button
              type="button"
              onClick={() => setShowForgotUsername(true)}
              className="text-stone-500 hover:text-stone-900 font-medium flex items-center gap-1 cursor-pointer"
            >
              <Search className="w-3 h-3 text-stone-400" />
              <span>Forgot Username / Roll No?</span>
            </button>
            <span className="text-stone-300">•</span>
            <button
              type="button"
              onClick={() => setShowForgotPassword(true)}
              className="text-stone-500 hover:text-stone-900 font-medium flex items-center gap-1 cursor-pointer"
            >
              <KeyRound className="w-3 h-3 text-stone-400" />
              <span>Reset Password</span>
            </button>
          </div>

          {/* Student / Faculty Register Option */}
          <div className="mt-4 pt-4 border-t border-stone-100 flex items-center justify-between text-xs">
            <span className="text-stone-500">Need an account?</span>
            <button
              onClick={onSwitchToRegister}
              className="font-semibold text-stone-900 hover:underline flex items-center gap-1 cursor-pointer"
            >
              <span>Create New Account</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
            </>
          )}
        </div>
      </div>

      {/* Forgot Password Modal */}
      {showForgotPassword && (
        <ForgotPasswordModal
          initialEmail={email}
          onClose={() => setShowForgotPassword(false)}
          onSuccess={(newEmail) => {
            setEmail(newEmail);
            setShowForgotPassword(false);
            setSuccessNotice('Password reset successfully! Please sign in with your new password.');
          }}
        />
      )}

      {/* Forgot Username Modal */}
      {showForgotUsername && (
        <ForgotUsernameModal
          onClose={() => setShowForgotUsername(false)}
          onSelectEmail={(foundEmail) => {
            setEmail(foundEmail);
            setShowForgotUsername(false);
          }}
        />
      )}
    </div>
  );
};
