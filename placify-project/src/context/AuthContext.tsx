import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import type { Student, User } from '../types';
import { apiFetch, clearStoredToken, getStoredToken, setStoredToken } from '../lib/api';

interface AuthContextValue {
  user: User | null;
  student: Student | null;
  loading: boolean;
  login: (params: { email: string; password: string; role?: 'admin' | 'student'; rememberMe?: boolean }) => Promise<User>;
  register: (payload: Record<string, unknown>) => Promise<User>;
  logout: () => Promise<void>;
  refreshSession: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [student, setStudent] = useState<Student | null>(null);
  const [loading, setLoading] = useState(true);

  const refreshSession = useCallback(async () => {
    const token = getStoredToken();
    if (!token) {
      setUser(null);
      setStudent(null);
      setLoading(false);
      return;
    }
    try {
      const data = await apiFetch<{ user: User; student: Student | null }>('/api/auth/me');
      setUser(data.user);
      setStudent(data.student);
    } catch {
      clearStoredToken();
      setUser(null);
      setStudent(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshSession();
  }, [refreshSession]);

  const login = async ({
    email,
    password,
    role,
    rememberMe = false,
  }: {
    email: string;
    password: string;
    role?: 'admin' | 'student';
    rememberMe?: boolean;
  }) => {
    const data = await apiFetch<{ token: string; user: User; student: Student | null }>('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password, role, rememberMe }),
    });
    setStoredToken(data.token, rememberMe);
    setUser(data.user);
    setStudent(data.student);
    return data.user;
  };

  const register = async (payload: Record<string, unknown>) => {
    const data = await apiFetch<{ token: string; user: User; student: Student | null }>('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    setStoredToken(data.token, false);
    setUser(data.user);
    setStudent(data.student);
    return data.user;
  };

  const logout = async () => {
    try {
      await apiFetch('/api/auth/logout', { method: 'POST' });
    } catch {
      // Clear local session regardless
    }
    clearStoredToken();
    setUser(null);
    setStudent(null);
  };

  return (
    <AuthContext.Provider value={{ user, student, loading, login, register, logout, refreshSession }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}
