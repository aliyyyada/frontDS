import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';

export function ProtectedRoute({ children, role }) {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  if (role && user.role !== role) {
    // Redirect to correct dashboard
    if (user.role === 'admin') return <Navigate to="/admin" replace />;
    return <Navigate to="/instructor" replace />;
  }
  return children;
}
