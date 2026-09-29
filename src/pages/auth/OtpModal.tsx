import React, { useState, useEffect } from 'react';
import { ApiService } from '../../services/api.js';
import { ShieldCheck, Mail, RefreshCw, AlertCircle, CheckCircle2, Inbox, Terminal } from 'lucide-react';

interface OtpModalProps {
  email: string;
  onSuccess: (data: any) => void;
  onClose?: () => void;
  purpose?: string;
  emailDelivered?: boolean;
  deliveryNotice?: string;
}

export const OtpModal: React.FC<OtpModalProps> = ({
  email,
  onSuccess,
  onClose,
  purpose = 'registration',
  emailDelivered = false,
  deliveryNotice,
}) => {
  const [otp, setOtp] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [isVerifying, setIsVerifying] = useState<boolean>(false);
  const [resendCooldown, setResendCooldown] = useState<number>(60);
  const [isResending, setIsResending] = useState<boolean>(false);
  const [hasRealEmail, setHasRealEmail] = useState<boolean>(emailDelivered);

  useEffect(() => {
    let timer: any;
    if (resendCooldown > 0) {
      timer = setInterval(() => {
        setResendCooldown((prev) => prev - 1);
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [resendCooldown]);

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    if (otp.length !== 6) {
      setError('Please enter the complete 6-digit OTP code sent to your Gmail.');
      return;
    }

    setIsVerifying(true);
    setError(null);

    const res = await ApiService.verifyOtp({ email, otp, purpose });
    setIsVerifying(false);

    if (res.success) {
      setSuccessMsg('Account verified successfully! Activating session...');
      setTimeout(() => {
        onSuccess(res);
      }, 700);
    } else {
      setError(res.message || 'Invalid or expired OTP code. Please check your Gmail.');
    }
  };

  const handleResend = async () => {
    if (resendCooldown > 0 || isResending) return;
    setIsResending(true);
    setError(null);
    setSuccessMsg(null);

    const res = await ApiService.resendOtp({ email, purpose });
    setIsResending(false);

    if (res.success) {
      setResendCooldown(60);
      if (res.emailDelivered) {
        setHasRealEmail(true);
      }
      setSuccessMsg(res.message || 'A new verification code has been dispatched to your Gmail.');
    } else {
      setError(res.message || 'Failed to resend OTP.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="w-full max-w-md bg-white rounded-2xl border border-stone-200 shadow-xl overflow-hidden">
        
        {/* Header */}
        <div className="bg-stone-900 text-white p-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-stone-800 border border-stone-700 flex items-center justify-center text-emerald-400 shrink-0">
              <Mail className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold tracking-tight">Check Your Gmail</h2>
              <p className="text-xs text-stone-400">AttendSecure Account Verification</p>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="p-6">
          <p className="text-xs text-stone-600 mb-3">
            A 6-digit One-Time Password has been dispatched to{' '}
            <strong className="text-stone-900 font-semibold">{email}</strong>.
          </p>

          {/* Real Email vs SMTP Notice */}
          {hasRealEmail ? (
            <div className="mb-4 p-3 bg-emerald-50 border border-emerald-200 rounded-xl flex items-start gap-2.5 text-xs text-emerald-900">
              <Inbox className="w-4 h-4 shrink-0 text-emerald-600 mt-0.5" />
              <div>
                <span className="font-semibold block">Email Sent to Gmail</span>
                <span>Please check your inbox. If delayed, check your <strong>Spam or Junk</strong> folder.</span>
              </div>
            </div>
          ) : (
            <div className="mb-4 p-3 bg-amber-50/80 border border-amber-200/90 rounded-xl flex items-start gap-2.5 text-xs text-amber-900">
              <Terminal className="w-4 h-4 shrink-0 text-amber-600 mt-0.5" />
              <div>
                <span className="font-semibold block">Live Gmail Delivery Setup</span>
                <span>
                  To deliver real emails directly to Gmail inboxes, configure your Gmail App Password in <code className="bg-amber-100 px-1 py-0.5 rounded font-mono text-[11px]">.env</code> (<code className="font-mono text-[11px]">SMTP_USER</code> & <code className="font-mono text-[11px]">SMTP_PASS</code>). The dispatched code is logged in the server console.
                </span>
              </div>
            </div>
          )}

          {error && (
            <div className="mb-4 p-3 bg-rose-50 border border-rose-200 rounded-xl flex items-center gap-2 text-xs text-rose-800">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
              <span>{error}</span>
            </div>
          )}

          {successMsg && (
            <div className="mb-4 p-3 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center gap-2 text-xs text-emerald-800">
              <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
              <span>{successMsg}</span>
            </div>
          )}

          <form onSubmit={handleVerify}>
            <div className="mb-5">
              <label className="block text-xs font-semibold text-stone-700 uppercase tracking-wider mb-2">
                Enter 6-Digit OTP From Gmail
              </label>
              <input
                type="text"
                maxLength={6}
                value={otp}
                onChange={(e) => setOtp(e.target.value.replace(/[^0-9]/g, ''))}
                placeholder="• • • • • •"
                className="w-full text-center tracking-[12px] font-mono text-2xl font-bold py-3 bg-stone-50 border-2 border-stone-200 rounded-xl focus:border-stone-900 focus:bg-white focus:outline-hidden transition-all placeholder:text-stone-300"
                autoFocus
              />
            </div>

            <button
              type="submit"
              disabled={isVerifying || otp.length !== 6}
              className="w-full py-3 bg-stone-900 hover:bg-black disabled:opacity-50 text-white font-semibold text-sm rounded-xl shadow-xs transition-all flex items-center justify-center gap-2 cursor-pointer disabled:cursor-not-allowed"
            >
              {isVerifying ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Verifying Code...</span>
                </>
              ) : (
                <>
                  <ShieldCheck className="w-4 h-4 text-emerald-400" />
                  <span>Verify & Activate Account</span>
                </>
              )}
            </button>
          </form>

          {/* Resend Cooldown */}
          <div className="mt-4 pt-4 border-t border-stone-100 flex items-center justify-between text-xs text-stone-500">
            <span>Didn't receive email in Gmail?</span>
            {resendCooldown > 0 ? (
              <span className="font-medium text-stone-400 font-mono">
                Resend in {resendCooldown}s
              </span>
            ) : (
              <button
                type="button"
                onClick={handleResend}
                disabled={isResending}
                className="font-semibold text-stone-900 hover:underline cursor-pointer disabled:opacity-50"
              >
                {isResending ? 'Sending...' : 'Resend Code'}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
