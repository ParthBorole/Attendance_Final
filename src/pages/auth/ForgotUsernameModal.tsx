import React, { useState } from 'react';
import { ApiService } from '../../services/api.js';
import { X, Search, UserCheck, AlertCircle, ArrowRight } from 'lucide-react';

interface ForgotUsernameModalProps {
  onClose: () => void;
  onSelectEmail: (email: string) => void;
}

export const ForgotUsernameModal: React.FC<ForgotUsernameModalProps> = ({
  onClose,
  onSelectEmail,
}) => {
  const [query, setQuery] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<any | null>(null);

  const handleLookup = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setResult(null);

    if (!query.trim()) {
      setError('Please enter your Roll Number, Student ID, or Faculty Employee ID.');
      return;
    }

    setIsLoading(true);
    const res = await ApiService.findUsername({ query: query.trim() });
    setIsLoading(false);

    if (res.success && res.user) {
      setResult(res.user);
    } else {
      setError(res.message || 'No registered account found matching this identifier.');
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
          <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-600">
            <Search className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-bold text-stone-900">Find User ID / Username</h2>
            <p className="text-xs text-stone-500">Look up your institutional login email</p>
          </div>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-800 flex items-start gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-600 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleLookup} className="space-y-3.5 mb-4">
          <div>
            <label className="block text-xs font-semibold text-stone-700 mb-1">
              Roll Number, Student ID, or Employee ID
            </label>
            <input
              type="text"
              required
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="e.g. 101, TSDC-2026-0105, or EMP-CS-101"
              className="w-full px-3.5 py-2.5 bg-stone-50 border border-stone-200 rounded-xl text-xs text-stone-900 focus:border-stone-900 focus:bg-white focus:outline-hidden transition-all"
            />
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-2.5 bg-stone-900 hover:bg-black text-white text-xs font-bold rounded-xl transition-all cursor-pointer disabled:opacity-50"
          >
            {isLoading ? 'Searching...' : 'Find My Account'}
          </button>
        </form>

        {result && (
          <div className="p-4 bg-emerald-50/70 border border-emerald-200 rounded-xl space-y-2.5 animate-in fade-in duration-200">
            <div className="flex items-center gap-2 text-emerald-800 text-xs font-bold">
              <UserCheck className="w-4 h-4 text-emerald-600" />
              <span>Account Found: {result.name}</span>
            </div>

            <div className="p-3 bg-white rounded-lg border border-emerald-200/80 space-y-1">
              <div className="text-[11px] text-stone-500 font-medium">Your Login Email / User ID:</div>
              <div className="text-xs font-mono font-bold text-stone-900 select-all">{result.email}</div>
              {result.extraDetails && (
                <div className="text-[10px] text-stone-500 pt-0.5">{result.extraDetails}</div>
              )}
            </div>

            <button
              onClick={() => {
                onSelectEmail(result.email);
                onClose();
              }}
              className="w-full py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <span>Use This Email to Sign In</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
