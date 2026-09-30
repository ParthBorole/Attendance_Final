import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext.js';
import { ApiService } from '../../services/api.js';
import { LogOut, User as UserIcon, ShieldCheck, ChevronDown, Check, Sparkles } from 'lucide-react';

interface HeaderProps {
  currentTab?: string;
  onTabChange?: (tab: string) => void;
  tabs?: Array<{ id: string; label: string; count?: number }>;
}

export const Header: React.FC<HeaderProps> = ({ currentTab, onTabChange, tabs = [] }) => {
  const { user, login, logout } = useAuth();
  const [showRoleSwitcher, setShowRoleSwitcher] = useState<boolean>(false);
  const [isSwitching, setIsSwitching] = useState<boolean>(false);

  const handleQuickSwitch = async (email: string) => {
    setIsSwitching(true);
    try {
      const res = await ApiService.login({ email, password: 'password123' });
      if (res.success && res.data) {
        login(res.data);
        setShowRoleSwitcher(false);
      }
    } catch (e) {
      console.error('Role switch failed:', e);
    } finally {
      setIsSwitching(false);
    }
  };

  return (
    <header className="sticky top-0 z-30 bg-[#FBF9F5]/95 backdrop-blur-md border-b border-stone-200/80 px-4 sm:px-8 py-3 transition-all">
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
        
        {/* Zone 1: Brand Wordmark */}
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-stone-900 flex items-center justify-center text-white shadow-sm shrink-0">
            <ShieldCheck className="w-5 h-5 text-emerald-400" />
          </div>
          <div className="flex flex-col">
            <span className="text-lg font-bold tracking-tight text-stone-900 leading-tight">
              AttendSecure
            </span>
            <span className="text-[10px] uppercase font-semibold tracking-wider text-stone-500 hidden sm:inline">
              TSDC Mumbai • Geolocation Attendance
            </span>
          </div>
        </div>

        {/* Zone 2: Navigation Links / Segmented Control */}
        {tabs.length > 0 && onTabChange && (
          <nav className="hidden md:flex items-center gap-1 bg-stone-200/60 p-1 rounded-xl border border-stone-300/40">
            {tabs.map((tab) => {
              const active = currentTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => onTabChange(tab.id)}
                  className={`px-3.5 py-1.5 text-xs font-semibold rounded-lg transition-all flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
                    active
                      ? 'bg-white text-stone-900 shadow-xs border border-stone-200/60'
                      : 'text-stone-600 hover:text-stone-900 hover:bg-stone-200/40'
                  }`}
                >
                  <span>{tab.label}</span>
                  {tab.count !== undefined && (
                    <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${active ? 'bg-stone-100 text-stone-800' : 'text-stone-500'}`}>
                      {tab.count}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>
        )}

        {/* Zone 3: Actions & Quick Role Switcher */}
        <div className="flex items-center gap-2 sm:gap-3">
          {user ? (
            <div className="flex items-center gap-2">
              {/* Quick Role Switcher Dropdown */}
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setShowRoleSwitcher(!showRoleSwitcher)}
                  className="flex items-center gap-2 px-2.5 py-1.5 bg-stone-100 hover:bg-stone-200 text-stone-900 rounded-xl border border-stone-300/80 text-xs font-bold transition-colors cursor-pointer shadow-xs"
                  title="Switch Demo Role"
                >
                  <span className={`w-2 h-2 rounded-full ${
                    user.role === 'admin' ? 'bg-amber-500' :
                    user.role === 'faculty' ? 'bg-indigo-500' : 'bg-emerald-500'
                  }`} />
                  <span className="capitalize">{user.role}</span>
                  <ChevronDown className="w-3.5 h-3.5 text-stone-500" />
                </button>

                {showRoleSwitcher && (
                  <div className="absolute right-0 mt-2 w-64 bg-white rounded-2xl border border-stone-200 shadow-2xl p-2 z-50 animate-in fade-in space-y-1">
                    <div className="px-2.5 py-1.5 text-[10px] uppercase font-bold text-stone-400 tracking-wider flex items-center gap-1">
                      <Sparkles className="w-3 h-3 text-amber-500" />
                      <span>Instant Role Switcher</span>
                    </div>

                    <button
                      type="button"
                      disabled={isSwitching}
                      onClick={() => handleQuickSwitch('admin@tsdc.edu.in')}
                      className={`w-full text-left p-2 rounded-xl text-xs flex items-center justify-between transition-colors cursor-pointer ${
                        user.role === 'admin' ? 'bg-amber-50 font-bold text-amber-900 border border-amber-200' : 'hover:bg-stone-50 text-stone-700'
                      }`}
                    >
                      <div className="flex flex-col">
                        <span className="font-bold">🛡️ College Administrator</span>
                        <span className="text-[10px] text-stone-400">admin@tsdc.edu.in</span>
                      </div>
                      {user.role === 'admin' && <Check className="w-4 h-4 text-amber-600" />}
                    </button>

                    <button
                      type="button"
                      disabled={isSwitching}
                      onClick={() => handleQuickSwitch('tuba@tsdc.edu.in')}
                      className={`w-full text-left p-2 rounded-xl text-xs flex items-center justify-between transition-colors cursor-pointer ${
                        user.role === 'faculty' ? 'bg-indigo-50 font-bold text-indigo-900 border border-indigo-200' : 'hover:bg-stone-50 text-stone-700'
                      }`}
                    >
                      <div className="flex flex-col">
                        <span className="font-bold">👨‍🏫 Faculty (Prof. Tuba)</span>
                        <span className="text-[10px] text-stone-400">tuba@tsdc.edu.in</span>
                      </div>
                      {user.role === 'faculty' && <Check className="w-4 h-4 text-indigo-600" />}
                    </button>

                    <button
                      type="button"
                      disabled={isSwitching}
                      onClick={() => handleQuickSwitch('aarav.sharma@tsdc.edu.in')}
                      className={`w-full text-left p-2 rounded-xl text-xs flex items-center justify-between transition-colors cursor-pointer ${
                        user.role === 'student' ? 'bg-emerald-50 font-bold text-emerald-900 border border-emerald-200' : 'hover:bg-stone-50 text-stone-700'
                      }`}
                    >
                      <div className="flex flex-col">
                        <span className="font-bold">👨‍🎓 Student (Aarav Sharma)</span>
                        <span className="text-[10px] text-stone-400">aarav.sharma@tsdc.edu.in</span>
                      </div>
                      {user.role === 'student' && <Check className="w-4 h-4 text-emerald-600" />}
                    </button>
                  </div>
                )}
              </div>

              <div className="hidden sm:flex flex-col text-right pl-1">
                <span className="text-xs font-semibold text-stone-900 leading-tight truncate max-w-[130px]">
                  {user.name}
                </span>
                <span className="text-[10px] text-stone-500 font-mono">
                  {user.email}
                </span>
              </div>

              <button
                onClick={logout}
                title="Log out"
                className="p-2 text-stone-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors border border-transparent hover:border-red-200 cursor-pointer"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <span className="text-xs text-stone-500 font-medium">Not logged in</span>
            </div>
          )}
        </div>
      </div>

      {/* Mobile Segmented Nav Bar */}
      {tabs.length > 0 && onTabChange && (
        <div className="flex md:hidden items-center gap-1 mt-3 pt-2 border-t border-stone-200/60 overflow-x-auto pb-1">
          {tabs.map((tab) => {
            const active = currentTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => onTabChange(tab.id)}
                className={`px-3 py-1 text-xs font-medium rounded-lg whitespace-nowrap shrink-0 transition-all ${
                  active
                    ? 'bg-stone-900 text-white shadow-xs'
                    : 'bg-stone-200/50 text-stone-600 hover:text-stone-900'
                }`}
              >
                {tab.label}
              </button>
            );
          })}
        </div>
      )}
    </header>
  );
};

