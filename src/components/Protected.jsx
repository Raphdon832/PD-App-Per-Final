// src/components/Protected.jsx
import React from 'react';
import { useAuth } from '@/lib/auth';

export function RequireAuth({ children }) {
  const { user, loading, profile } = useAuth();
  console.log('RequireAuth:', { user, loading, profile });
  if (loading) {
    console.log('RequireAuth: loading...');
    return <div className="p-6">Loading…</div>;
  }
  if (!user) {
    console.log('RequireAuth: No user, please sign in.');
    return <div className="p-6">Please sign in to continue.</div>;
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
