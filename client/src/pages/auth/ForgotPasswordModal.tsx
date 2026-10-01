import React, { useState } from 'react';
import { ApiService } from '../../services/api.js';
import { X, KeyRound, Eye, EyeOff, CheckCircle2, AlertCircle, Mail, Send, ShieldCheck } from 'lucide-react';

interface ForgotPasswordModalProps {
  initialEmail?: string;
  onClose: () => void;
  onSuccess: (email: string) => void;
}

export const ForgotPasswordModal: React.FC<ForgotPasswordModalProps> = ({
  initialEmail = '',
  onClose,
  onSuccess,
}) => {
  const [step, setStep] = useState<'request_otp' | 'verify_and_reset'>('request_otp');
  const [identifier, setIdentifier] = useState<string>(initialEmail);
  const [otp, setOtp] = useState<string>('');
  const [newPassword, setNewPassword] = useState<string>('');
  const [confirmPassword, setConfirmPassword] = useState<string>('');
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [resolvedEmail, setResolvedEmail] = useState<string>('');
  const [receivedOtp, setReceivedOtp] = useState<string | null>(null);

  const handleRequestOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMessage(null);

    if (!identifier.trim()) {
      setError('Please enter your Registered Email, Roll Number, or Employee ID.');
      return;
    }

    setIsLoading(true);
    const res = await ApiService.requestResetOtp({ identifier: identifier.trim() });
    setIsLoading(false);

    if (res.success) {
      setResolvedEmail(res.email || identifier.trim());
      setSuccessMessage(res.message || `A 6-digit OTP code has been dispatched to ${res.email}.`);
      if (res.otp) {
        setReceivedOtp(res.otp);
        setOtp(res.otp);
      }
      setStep('verify_and_reset');
    } else {
      setError(res.message || 'No registered account found. Please check your details.');
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMessage(null);

    if (!otp || otp.trim().length !== 6) {
      setError('Please enter the 6-digit OTP code received in your Gmail.');
      return;
    }

    if (newPassword.length < 6) {
      setError('New password must be at least 6 characters long.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setIsLoading(true);
    const res = await ApiService.resetPassword({
      identifier: resolvedEmail || identifier.trim(),
      otp: otp.trim(),
      newPassword,
    });
    setIsLoading(false);

    if (res.success) {
      setSuccessMessage(res.message || 'Password reset successfully!');
      setTimeout(() => {
        onSuccess(resolvedEmail || identifier.trim());
      }, 1500);
    } else {
      setError(res.message || 'Failed to reset password. Invalid or expired OTP.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white w-full max-w-md rounded-2xl border border-stone-200 shadow-2xl p-6 relative">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 rounded-lg text-stone-400 hover:text-stone-700 hover:bg-stone-100 transition-colors cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-600">
            <KeyRound className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-bold text-stone-900">Reset Password (OTP Verification)</h2>
            <p className="text-xs text-stone-500">
              {step === 'request_otp'
                ? 'Enter your email or ID to receive a 6-digit Gmail OTP'
                : `Enter the OTP sent to ${resolvedEmail || identifier}`}
            </p>
          </div>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-800 flex items-start gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-600 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        {successMessage && (
          <div className="mb-4 p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-800 flex items-start gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600 mt-0.5" />
            <span>{successMessage}</span>
          </div>
        )}

        {step === 'request_otp' ? (
          <form onSubmit={handleRequestOtp} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1">
                Registered Email, Roll No., or Employee ID
              </label>
              <input
                type="text"
                required
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                placeholder="e.g. 101, TSDC-2026-0101, or rajesh@gmail.com"
                className="w-full px-3.5 py-2.5 bg-stone-50 border border-stone-200 rounded-xl text-xs text-stone-900 focus:border-stone-900 focus:bg-white focus:outline-hidden transition-all"
              />
            </div>

            <p className="text-[11px] text-stone-500">
              A 6-digit verification OTP will be sent directly to your registered Gmail address via Resend.
            </p>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-2.5 bg-stone-900 hover:bg-black text-white text-xs font-bold rounded-xl transition-all cursor-pointer disabled:opacity-50 flex items-center justify-center gap-2"
            >
              <Send className="w-4 h-4 text-emerald-400" />
              <span>{isLoading ? 'Sending OTP to Gmail...' : 'Send OTP to Gmail'}</span>
            </button>
          </form>
        ) : (
          <form onSubmit={handleResetPassword} className="space-y-3.5">
            {receivedOtp && (
              <div className="p-3 bg-gradient-to-r from-emerald-50 to-teal-50 border border-emerald-300 rounded-xl mb-2">
                <div className="flex items-center justify-between gap-2 mb-1.5">
                  <span className="text-xs font-bold text-emerald-950 flex items-center gap-1.5">
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                    Reset OTP Code:
                  </span>
                  <span className="font-mono text-base font-black tracking-widest text-emerald-950 bg-white px-2 py-0.5 rounded border border-emerald-300">
                    {receivedOtp}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setOtp(receivedOtp);
                    setError(null);
                  }}
                  className="w-full py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold transition-all shadow-xs flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <span>⚡ 1-Click Auto-Fill OTP ({receivedOtp})</span>
                </button>
              </div>
            )}

            <div className="p-3 bg-stone-50 border border-stone-200 rounded-xl text-xs text-stone-700 flex items-center gap-2 mb-2">
              <Mail className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>OTP sent to <strong>{resolvedEmail}</strong></span>
            </div>

            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1 uppercase tracking-wider">
                Enter 6-Digit Gmail OTP
              </label>
              <input
                type="text"
                required
                maxLength={6}
                value={otp}
                onChange={(e) => setOtp(e.target.value)}
                placeholder="e.g. 481920"
                className="w-full px-3.5 py-2.5 bg-stone-50 border border-stone-200 rounded-xl text-sm font-mono tracking-widest font-bold text-stone-900 focus:border-stone-900 focus:bg-white focus:outline-hidden transition-all text-center"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1">
                New Password
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="At least 6 characters"
                  className="w-full pl-3.5 pr-10 py-2.5 bg-stone-50 border border-stone-200 rounded-xl text-xs text-stone-900 focus:border-stone-900 focus:bg-white focus:outline-hidden transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-700 cursor-pointer"
                  title={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1">
                Confirm New Password
              </label>
              <div className="relative">
                <input
                  type={showConfirmPassword ? 'text' : 'password'}
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Re-enter new password"
                  className="w-full pl-3.5 pr-10 py-2.5 bg-stone-50 border border-stone-200 rounded-xl text-xs text-stone-900 focus:border-stone-900 focus:bg-white focus:outline-hidden transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-700 cursor-pointer"
                  title={showConfirmPassword ? 'Hide password' : 'Show password'}
                >
                  {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full mt-2 py-2.5 bg-stone-900 hover:bg-black text-white text-xs font-bold rounded-xl transition-all cursor-pointer disabled:opacity-50"
            >
              {isLoading ? 'Verifying OTP & Resetting...' : 'Verify OTP & Reset Password'}
            </button>

            <button
              type="button"
              onClick={() => setStep('request_otp')}
              className="w-full text-center text-xs text-stone-500 hover:text-stone-800 underline cursor-pointer mt-1"
            >
              Change Email / Resend OTP
            </button>
          </form>
        )}
      </div>
    </div>
  );
};
