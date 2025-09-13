import React from 'react';
import { useAuth } from '@/lib/auth';
import { useNavigate } from 'react-router-dom';

export default function Messages() {
  const { user, profile } = useAuth();
  const navigate = useNavigate();

  if (!user) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-white">
        <div className="text-xl font-poppins font-light mb-6">Please sign in to continue</div>
        <button
          className="rounded-full bg-brand-primary text-white px-8 py-3 text-lg font-poppins font-medium shadow hover:bg-brand-primary/90 transition"
          onClick={() => navigate('/auth/landing')}
        >
          Sign In / Sign Up
        </button>
      </div>
    );
  }

  return null;
}
