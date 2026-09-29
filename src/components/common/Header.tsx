import React from 'react';
import { useAuth } from '../../context/AuthContext.js';
import { LogOut, User as UserIcon, ShieldCheck } from 'lucide-react';

interface HeaderProps {
  currentTab?: string;
  onTabChange?: (tab: string) => void;
  tabs?: Array<{ id: string; label: string; count?: number }>;
}

export const Header: React.FC<HeaderProps> = ({ currentTab, onTabChange, tabs = [] }) => {
  const { user, logout } = useAuth();

  return (
    <header className="sticky top-0 z-30 bg-[#FBF9F5]/90 backdrop-blur-md border-b border-stone-200/80 px-4 sm:px-8 py-3.5 transition-all">
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
        
        {/* Zone 1: Brand Wordmark (Single text element) */}
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

        {/* Zone 3: Actions & Account Profile */}
        <div className="flex items-center gap-3">
          {user ? (
            <div className="flex items-center gap-3">
              <div className="hidden sm:flex flex-col text-right">
                <span className="text-xs font-semibold text-stone-900 leading-tight truncate max-w-[150px]">
                  {user.name}
                </span>
                <span className="text-[11px] text-stone-500 font-medium capitalize flex items-center justify-end gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                  {user.role}
                </span>
              </div>

              <div className="w-8 h-8 rounded-full bg-stone-200 border border-stone-300 flex items-center justify-center text-stone-700 font-bold text-xs uppercase shadow-xs">
                {user.name.charAt(0)}
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
