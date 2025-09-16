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
  const [isPharmacy, setIsPharmacy] = useState(false);
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
