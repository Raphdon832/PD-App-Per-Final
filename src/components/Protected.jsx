// src/components/Protected.jsx
import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/lib/auth';

export function RequireAuth({ children }) {
  const { user, loading } = useAuth();

  // While auth initializes, don't navigate away — allow page to render / refresh
  if (loading) return null; // or return a spinner component

  if (!user) {
    return <Navigate to="/auth/landing" replace />;
  }

  return children;
}

export function RequireRole({ children, role }) {
  const { profile, loading } = useAuth();
  if (loading) {
    return <div className="p-6">Loading…</div>;
  }
  if (!profile || profile.role !== role) {
    return <div className="p-6">You need {role} access.</div>;
  }
  return children;
}
