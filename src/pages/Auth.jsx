import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/lib/auth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { sendPasswordResetEmail } from 'firebase/auth';
import { auth } from '@/lib/firebase';

export default function Auth() {
  const { signIn, signUp } = useAuth();
  const [mode, setMode] = useState('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [displayName, setDisplayName] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [isPharmacy, setIsPharmacy] = useState(false);
  const [busy, setBusy] = useState(false);
  const [resetEmailSent, setResetEmailSent] = useState(false);
  const [resetBusy, setResetBusy] = useState(false);
  const navigate = useNavigate();

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    try {
      if (mode === 'signin') {
        await signIn(email, password);
        navigate('/');
      } else {
        await signUp({ email, password, displayName, phone, address });
        navigate('/');
      }
    } catch (e) {
      alert(e.message);
    } finally {
      setBusy(false);
    }
  };

  const handleForgotPassword = async () => {
    if (!email) {
      alert('Please enter your email address first');
      return;
    }
    
    setResetBusy(true);
    try {
      await sendPasswordResetEmail(auth, email);
      setResetEmailSent(true);
      alert('Password reset email sent! Check your inbox.');
    } catch (error) {
      alert(error.message || 'Failed to send reset email');
    } finally {
      setResetBusy(false);
    }
  };

  return (
    <div className="min-h-screen grid place-items-center px-5">
      <form onSubmit={submit} className="w-full max-w-sm rounded-3xl border border-zinc-200 p-6">
        {/* Back button */}
        <button
          type="button"
          onClick={() => navigate('/auth/landing')}
          className="flex items-center text-gray-500 hover:text-gray-700 mb-4 text-sm"
        >
          <span className="mr-1">←</span>
          Back
        </button>

        <div className="text-2xl font-semibold mb-2 text-brand-primary">{mode==='signin'?'Welcome back':'Create your account'}</div>
        <div className="text-zinc-500 mb-4">Sign in to {mode==='signin' ? 'your account' : 'get started with us'}.</div>

        {mode==='signup' && (
          <>
            <Input placeholder="Full name" value={displayName} onChange={(e)=>setDisplayName(e.target.value)} className="mb-3" />
            <Input placeholder="Phone Number" value={phone} onChange={(e)=>setPhone(e.target.value)} className="mb-3" />
            <Input placeholder="Address" value={address} onChange={e=>setAddress(e.target.value)} className="mb-3" />
          </>
        )}
        <Input type="email" placeholder="Email" value={email} onChange={(e)=>setEmail(e.target.value)} className="mb-3" />

        <div className="mb-4">
          <label className="block text-sm font-medium mb-1"></label>
          <div className="relative">
            <Input type={showPassword ? 'text' : 'password'} placeholder="Password" value={password} onChange={(e)=>setPassword(e.target.value)} className="w-full pr-12" />
            <button
              type="button"
              className="absolute inset-y-0 right-0 pr-3 flex items-center text-sm text-gray-500 hover:text-gray-700"
              onClick={() => setShowPassword(!showPassword)}
            >
              {showPassword ? 'Hide' : 'Show'}
            </button>
          </div>
        </div>

        <Button disabled={busy} className="w-full bg-brand-primary text-white hover:bg-brand-primary/90 rounded-[7px]">{busy?'Please wait…':(mode==='signin'?'Sign in':'Sign up')}</Button>
        
        {mode === 'signin' && (
          <div className="mt-3 text-center">
            <button
              type="button"
              onClick={handleForgotPassword}
              disabled={resetBusy}
              className="text-sm text-sky-500 hover:text-sky-600 disabled:opacity-50"
            >
              {resetBusy ? 'Sending...' : 'Forgot password?'}
            </button>
            {resetEmailSent && (
              <div className="text-xs text-green-600 mt-1">Reset email sent!</div>
            )}
          </div>
        )}

        {mode==='signup' && (
          <div className="flex items-center justify-center mt-4 mb-3">
            <input id="isPharmacy" type="checkbox" checked={isPharmacy} onChange={(e)=>setIsPharmacy(e.target.checked)} className="h-4 w-4 text-brand-primary border-zinc-300 rounded" />
            <label htmlFor="isPharmacy" className="ml-2 text-sm text-black">I'm a Pharmacy</label>
          </div>
        )}
        <div className="mt-4 text-sm text-center">
          {mode==='signin'? (
            <>No account? <button type="button" className="text-sky-500" onClick={()=>setMode('signup')}>Create one</button></>
          ): (
            <>Have an account? <button type="button" className="text-sky-500" onClick={()=>setMode('signin')}>Sign in</button></>
          )}
        </div>
        <div className="text-[10px] mt-10 text-center text-gray-400">Powered by Economic and Business Strategies (EBS)</div>
      </form>
    </div>
  );
}
