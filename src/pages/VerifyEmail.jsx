import { useAuth } from '@/lib/auth';
import { useEffect, useState } from 'react';
import { sendVerification } from '@/lib/email';
import BackButton from './auth/BackButton';
import { useNavigate } from 'react-router-dom';

export default function VerifyEmail() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [resent, setResent] = useState(false);
  const [sending, setSending] = useState(false);

  useEffect(() => {
    if (user && user.emailVerified) {
      // If email is verified, redirect back to auth page
      navigate('/auth');
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

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-white">
      <div className="bg-white p-8 max-w-md w-full text-center">
        <div className="flex mt-1 justify-start">
          <BackButton to="/auth" />
        </div>
        <h2 className="text-xl font-normal mt-5 mb-2">Verify your email</h2>
        <p className="mb-4 text-zinc-600 text-[14px] font-normal">A verification link has been sent to <b>{user.email}</b>.<br />Please check your inbox and click the link to activate your account.</p>
        <button
          className="px-4 py-2 bg-black text-white rounded-[7px] text-[12px] font-light disabled:opacity-50"
          onClick={handleResend}
          disabled={sending || resent}
        >{resent ? 'Verification Sent!' : sending ? 'Sending...' : 'Resend Email'}</button>
        <button
          className="block mt-4 mx-auto text-sm text-zinc-500 underline"
          onClick={logout}
        >Log out</button>
      </div>
    </div>
  );
}
