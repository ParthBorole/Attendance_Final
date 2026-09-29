import React, { useState, useEffect } from 'react';
import { APIProvider } from '@vis.gl/react-google-maps';
import { AuthProvider, useAuth } from './context/AuthContext.js';
import { Header } from './components/common/Header.js';
import { LoginPage } from './pages/auth/LoginPage.js';
import { RegisterPage } from './pages/auth/RegisterPage.js';
import { StudentDashboard } from './pages/student/StudentDashboard.js';
import { StudentTimetablePage } from './pages/student/StudentTimetablePage.js';
import { StudentHistoryPage } from './pages/student/StudentHistoryPage.js';
import { StudentSubjectsPage } from './pages/student/StudentSubjectsPage.js';
import { FacultyDashboard } from './pages/faculty/FacultyDashboard.js';
import { AdminDashboard } from './pages/admin/AdminDashboard.js';
import { RefreshCw } from 'lucide-react';

const GOOGLE_MAPS_API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY || '';

const MainApp: React.FC = () => {
  const { user, isLoading } = useAuth();
  const [authView, setAuthView] = useState<'login' | 'register'>('login');
  const [quotaExceeded, setQuotaExceeded] = useState<boolean>(false);
  
  // Student navigation tabs
  const [studentTab, setStudentTab] = useState<string>('dashboard');

  useEffect(() => {
    const handleQuota = () => setQuotaExceeded(true);
    window.addEventListener('gmp-quota-exceeded', handleQuota);
    return () => window.removeEventListener('gmp-quota-exceeded', handleQuota);
  }, []);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#FBF9F5] flex flex-col items-center justify-center p-4">
        <div className="w-12 h-12 rounded-2xl bg-stone-900 flex items-center justify-center text-white mb-4 shadow-sm">
          <RefreshCw className="w-6 h-6 animate-spin text-emerald-400" />
        </div>
        <h1 className="text-base font-bold text-stone-900 tracking-tight">AttendSecure</h1>
        <p className="text-xs text-stone-500 mt-1">Authenticating session...</p>
      </div>
    );
  }

  // Unauthenticated Flow
  if (!user) {
    if (authView === 'register') {
      return <RegisterPage onSwitchToLogin={() => setAuthView('login')} />;
    }
    return <LoginPage onSwitchToRegister={() => setAuthView('register')} />;
  }

  // Student Role Tabs
  const studentTabs = [
    { id: 'dashboard', label: 'My Dashboard' },
    { id: 'timetable', label: 'My Timetable' },
    { id: 'subjects', label: 'My Subjects & Classrooms' },
    { id: 'history', label: 'Attendance History' },
  ];

  return (
    <div className="min-h-screen bg-[#FBF9F5] flex flex-col">
      {/* Google Maps Quota Exceeded Banner (if triggered) */}
      {quotaExceeded && (
        <div className="bg-amber-50 border-b border-amber-200 text-amber-900 px-4 py-2 text-xs md:text-sm text-center sticky top-0 z-50 shadow-sm">
          <span>
            Google Maps Platform quota reached. If you are the app owner, visit{' '}
            <a
              href="https://developers.google.com/maps/ai/ai-studio?utm_campaign=gmp_mcp_codeassist_v1_aistudio#quota_exceeded_errors"
              target="_blank"
              rel="noopener noreferrer"
              className="underline font-semibold text-amber-950 hover:text-amber-800"
            >
              maps developer site
            </a>{' '}
            for instructions to update your account.
          </span>
        </div>
      )}

      {/* Top Bar Header */}
      {user.role === 'student' ? (
        <Header
          currentTab={studentTab}
          onTabChange={setStudentTab}
          tabs={studentTabs}
        />
      ) : (
        <Header />
      )}

      {/* Main Content Viewport */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-8 pt-6 pb-12">
        {user.role === 'student' && (
          <>
            {studentTab === 'dashboard' && (
              <StudentDashboard onNavigateToTab={setStudentTab} />
            )}
            {studentTab === 'timetable' && <StudentTimetablePage />}
            {studentTab === 'subjects' && <StudentSubjectsPage />}
            {studentTab === 'history' && <StudentHistoryPage />}
          </>
        )}

        {user.role === 'faculty' && <FacultyDashboard />}

        {user.role === 'admin' && <AdminDashboard />}
      </main>

      {/* Minimal Footer */}
      <footer className="border-t border-stone-200/60 py-4 px-4 text-center text-xs text-stone-400">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2">
          <span>AttendSecure • Smart Location-Based College Attendance Management System</span>
          <span>Thakur Shyamnarayan Degree College (TSDC) • Mumbai</span>
        </div>
      </footer>
    </div>
  );
};

export function App() {
  return (
    <APIProvider apiKey={GOOGLE_MAPS_API_KEY} solutionChannel="gmp_mcp_codeassist_v1_aistudio">
      <AuthProvider>
        <MainApp />
      </AuthProvider>
    </APIProvider>
  );
}

export default App;
