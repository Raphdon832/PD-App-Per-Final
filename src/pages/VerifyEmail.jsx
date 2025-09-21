import { useAuth } from '@/lib/auth';
import { useEffect, useState } from 'react';
import { sendVerification } from '@/lib/email';
import { useNavigate } from 'react-router-dom';

export default function VerifyEmail() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const [resent, setResent] = useState(false);
  const [sending, setSending] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (user && !user.emailVerified) {
      // Optionally, could auto-send on mount
    }
  }, [user]);

  if (!user) return null;
  if (user.emailVerified) return null;

  const handleResend = async () => {
    setSending(true);
    await sendVerification(user);
    setResent(true);
    setSending(false);
  };

  const handleSignOut = async () => {
    try {
      setBusy(true);
      await signOut();
      navigate('/auth/landing');
    } catch (error) {
      console.error('Sign out error:', error);
    } finally {
      setBusy(false);
    }
  };

  const handleBack = async () => {
    console.log('Back button clicked'); // Debug log
    try {
      setBusy(true);
      // Sign out first to clear the unverified user state
      await signOut();
      // Then navigate to landing
      navigate('/auth/landing', { replace: true });
    } catch (error) {
      console.error('Back navigation error:', error);
      // Fallback: force page reload to landing
      window.location.href = '/auth/landing';
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-white">
      <div className="bg-white p-8 max-w-md w-full text-center">
        {/* Back button */}
        <button
          type="button"
          onClick={handleBack}
          disabled={busy}
          className="flex items-center text-gray-500 hover:text-gray-700 mb-4 text-sm cursor-pointer disabled:opacity-50"
        >
          <span className="mr-1">←</span>
          {busy ? 'Going back...' : 'Back'}
        </button>

        <h2 className="text-xl font-light mb-2">Verify your email</h2>
        <p className="mb-4 text-zinc-600 text-[14px] font-thin">A verification link has been sent to <b>{user.email}</b>.<br />Please check your inbox and click the link to activate your account.</p>
        <button
          className="px-4 py-2 bg-sky-600 text-white rounded-full text-[12px] font-light disabled:opacity-50"
          onClick={handleResend}
          disabled={sending || resent}
        >{resent ? 'Verification Sent!' : sending ? 'Sending...' : 'Resend Email'}</button>
        
        {/* Sign out button (fixed) */}
        <button
          className="block mt-4 mx-auto text-sm text-zinc-500 underline"
          onClick={handleSignOut}
          disabled={busy}
        >{busy ? '' : ''}</button>
      </div>
    </div>
  );
}
