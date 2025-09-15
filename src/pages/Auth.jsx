import React, { useState } from 'react';
import { useAuth } from '@/lib/auth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useNavigate } from 'react-router-dom';

export default function AuthPage() {
  const { signIn, signUp } = useAuth();
  const [mode, setMode] = useState('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [busy, setBusy] = useState(false);
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

  return (
    <div className="min-h-screen grid place-items-center px-5">
      <form onSubmit={submit} className="w-full max-w-sm rounded-3xl border border-zinc-200 p-6">
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
        <Input type="password" placeholder="Password" value={password} onChange={(e)=>setPassword(e.target.value)} className="mb-4" />

        <Button disabled={busy} className="w-full bg-brand-primary text-white hover:bg-brand-primary/90 rounded-[7px]">{busy?'Please wait…':(mode==='signin'?'Sign in':'Sign up')}</Button>
        <div className="mt-4 text-sm text-center">
          {mode==='signin'? (
            <>No account? <button type="button" className="text-brand-accent" onClick={()=>setMode('signup')}>Create one</button></>
          ): (
            <>Have an account? <button type="button" className="text-brand-accent" onClick={()=>setMode('signin')}>Sign in</button></>
          )}
        </div>
      </form>
    </div>
  );
}
