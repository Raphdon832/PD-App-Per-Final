// src/components/Protected.jsx
import React from 'react';
import { useAuth } from '@/lib/auth';
import { Navigate } from 'react-router-dom';

export function RequireAuth({ children }) {
  const { user } = useAuth();

  if (!user) {
    return <Navigate to="/auth/landing" replace />;
  }

  return children;
}

export function RequireRole({ children, role }) {
  const { profile, loading } = useAuth();
  console.log('RequireRole:', { profile, loading, role });
  if (loading) {
    console.log('RequireRole: loading...');
    return <div className="p-6">Loading…</div>;
  }
  if (!profile || profile.role !== role) {
    console.log('RequireRole: Access denied for role', role);
    return <div className="p-6">You need {role} access.</div>;
  }
  return children;
}
