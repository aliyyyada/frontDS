import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './hooks/useAuth';
import { ProtectedRoute } from './components/common/ProtectedRoute';
import LoginPage from './pages/auth/LoginPage';
import RegisterPage from './pages/auth/RegisterPage';
import VerifyPage from './pages/auth/VerifyPage';
import ForgotPasswordPage from './pages/auth/ForgotPasswordPage';
import ResetPasswordPage from './pages/auth/ResetPasswordPage';
import InstructorPage from './pages/instructor/InstructorPage';
import AdminPage from './pages/admin/AdminPage';
import './styles/global.css';

// Редирект с корневого пути: если сессия есть — в кабинет, иначе — на логин
function HomeRedirect() {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  if (user.role === 'admin') return <Navigate to="/admin" replace />;
  return <Navigate to="/instructor" replace />;
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          {/* Auth */}
          <Route path="/login"           element={<LoginPage />} />
          <Route path="/register"        element={<RegisterPage />} />
          <Route path="/verify"          element={<VerifyPage />} />
          <Route path="/forgot-password" element={<ForgotPasswordPage />} />
          <Route path="/reset-password"  element={<ResetPasswordPage />} />

          {/* Instructor — один компонент с внутренними табами */}
          <Route
            path="/instructor"
            element={
              <ProtectedRoute role="instructor">
                <InstructorPage />
              </ProtectedRoute>
            }
          />
          {/* Редирект со старых маршрутов */}
          <Route path="/instructor/*" element={<Navigate to="/instructor" replace />} />

          {/* Admin */}
          <Route
            path="/admin"
            element={
              <ProtectedRoute role="admin">
                <AdminPage />
              </ProtectedRoute>
            }
          />

          {/* Default: если сессия есть — в кабинет, иначе — логин */}
          <Route path="/"  element={<HomeRedirect />} />
          <Route path="*"  element={<HomeRedirect />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}