import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { User, StudentProfile, FacultyProfile } from '../types.js';
import { ApiService } from '../services/api.js';

interface AuthContextType {
  user: User | null;
  student: StudentProfile | null;
  faculty: FacultyProfile | null;
  token: string | null;
  isLoading: boolean;
  login: (userData: { token: string; user: User; student?: StudentProfile; faculty?: FacultyProfile }) => void;
  logout: () => void;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [student, setStudent] = useState<StudentProfile | null>(null);
  const [faculty, setFaculty] = useState<FacultyProfile | null>(null);
  const [token, setToken] = useState<string | null>(localStorage.getItem('attendsecure_token'));
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const fetchCurrentUser = async () => {
    const savedToken = localStorage.getItem('attendsecure_token');
    if (!savedToken) {
      setUser(null);
      setStudent(null);
      setFaculty(null);
      setIsLoading(false);
      return;
    }

    try {
      const res = await ApiService.getMe();
      if (res.success && res.user) {
        setUser(res.user);
        setStudent(res.student || null);
        setFaculty(res.faculty || null);
      } else {
        ApiService.clearToken();
        setToken(null);
        setUser(null);
      }
    } catch {
      ApiService.clearToken();
      setToken(null);
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchCurrentUser();
  }, []);

  const login = (data: { token: string; user: User; student?: StudentProfile; faculty?: FacultyProfile }) => {
    ApiService.setToken(data.token);
    setToken(data.token);
    setUser(data.user);
    setStudent(data.student || null);
    setFaculty(data.faculty || null);
  };

  const logout = () => {
    ApiService.clearToken();
    setToken(null);
    setUser(null);
    setStudent(null);
    setFaculty(null);
  };

  const refreshUser = async () => {
    await fetchCurrentUser();
  };

  return (
    <AuthContext.Provider value={{ user, student, faculty, token, isLoading, login, logout, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
