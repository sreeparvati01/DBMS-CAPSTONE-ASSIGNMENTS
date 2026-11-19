import React from 'react';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ToastProvider } from './context/ToastContext';
import { LandingPage } from './pages/LandingPage';
import { PublicJobsPage } from './pages/PublicJobsPage';
import { PublicCompaniesPage } from './pages/PublicCompaniesPage';
import { LoginPage } from './pages/LoginPage';
import { RegisterPage } from './pages/RegisterPage';
import { AdminLayout } from './pages/admin/AdminLayout';
import { AdminOverview } from './pages/admin/AdminOverview';
import { AdminStudents } from './pages/admin/AdminStudents';
import { AdminCompanies } from './pages/admin/AdminCompanies';
import { AdminDrives } from './pages/admin/AdminDrives';
import { AdminJobs } from './pages/admin/AdminJobs';
import { AdminApplications } from './pages/admin/AdminApplications';
import { AdminInterviews } from './pages/admin/AdminInterviews';
import { AdminPlacements } from './pages/admin/AdminPlacements';
import { AdminReports } from './pages/admin/AdminReports';
import { StudentPortal } from './pages/student/StudentPortal';

function ProtectedRoute({
  allowedRole,
  children,
}: {
  allowedRole: 'admin' | 'student';
  children: React.ReactNode;
}) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F5F3EC] text-sm text-[#142B2A]">
        Verifying session...
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (user.role !== allowedRole) {
    return <Navigate to={user.role === 'admin' ? '/admin' : '/student'} replace />;
  }

  return <>{children}</>;
}

export default function App() {
  return (
    <BrowserRouter>
      <ToastProvider>
        <AuthProvider>
          <Routes>
            <Route path="/" element={<LandingPage />} />
            <Route path="/jobs" element={<PublicJobsPage />} />
            <Route path="/companies" element={<PublicCompaniesPage />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />

            <Route
              path="/admin"
              element={
                <ProtectedRoute allowedRole="admin">
                  <AdminLayout />
                </ProtectedRoute>
              }
            >
              <Route index element={<AdminOverview />} />
              <Route path="students" element={<AdminStudents />} />
              <Route path="companies" element={<AdminCompanies />} />
              <Route path="drives" element={<AdminDrives />} />
              <Route path="jobs" element={<AdminJobs />} />
              <Route path="applications" element={<AdminApplications />} />
              <Route path="interviews" element={<AdminInterviews />} />
              <Route path="placements" element={<AdminPlacements />} />
              <Route path="reports" element={<AdminReports />} />
            </Route>

            <Route
              path="/student"
              element={
                <ProtectedRoute allowedRole="student">
                  <StudentPortal />
                </ProtectedRoute>
              }
            />

            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </AuthProvider>
      </ToastProvider>
    </BrowserRouter>
  );
}
