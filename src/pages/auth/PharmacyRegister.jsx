// src/pages/auth/PharmacyRegister.jsx
import React, { useState, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import AuthLayout from './AuthLayout';
import BackButton from './BackButton';
import { useAuth } from '@/lib/auth';
import { auth, db } from '@/lib/firebase';
import { doc, setDoc } from 'firebase/firestore';
import SuccessScreen from './SuccessScreen';


export default function PharmacyRegister(){
const { signUp } = useAuth();
const [form, setForm] = useState({ name:'', email:'', phone:'', address:'', password:'' });
const [busy, setBusy] = useState(false);
const [showPassword, setShowPassword] = useState(false);
const [addressSuggestions, setAddressSuggestions] = useState([]);
const [selectedAddress, setSelectedAddress] = useState(null);
const [success, setSuccess] = useState(null);
const addressTimeout = useRef();
const navigate = useNavigate();


const fetchAddressSuggestions = async (query) => {
  if (!query) return setAddressSuggestions([]);
  const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&addressdetails=1&limit=5`);
  const data = await res.json();
  setAddressSuggestions(data);
};

const handleAddressChange = (e) => {
  const value = e.target.value;
  setForm({ ...form, address: value });
  setSelectedAddress(null);
  clearTimeout(addressTimeout.current);
  addressTimeout.current = setTimeout(() => fetchAddressSuggestions(value), 400);
};

const handleSelectSuggestion = (s) => {
  setForm({ ...form, address: s.display_name });
  setSelectedAddress(s);
  setAddressSuggestions([]);
};

const submit = async (e)=>{
  e.preventDefault();
  setBusy(true);
  try{
    await signUp({ email: form.email, password: form.password, displayName: form.name, role: 'pharmacy', phone: form.phone });
    const uid = auth.currentUser?.uid;
    if (uid) {
      await setDoc(doc(db, 'pharmacies', uid), {
        id: uid,
        name: form.name,
        email: form.email,
        address: form.address,
        lat: selectedAddress?.lat || null,
        lon: selectedAddress?.lon || null,
        etaMins: 25,
        phone: form.phone
      });
    }
    setSuccess(form.email);
  }catch(err){
    alert(err.message);
  }finally{ setBusy(false); }
}

if (success) return <SuccessScreen email={success} />;


return (
  <AuthLayout>
    <BackButton to="/auth/landing" className="w-[78px] h-[27px] font-poppins font-extralight tracking-tight text-[14px] sm:text-[16px]" />
    <div className="font-poppins text-[32px] sm:text-[42px] md:text-[54px] lg:text-[64px] font-thin tracking-tight leading-[109%] text-left">I'm a<br/>Pharmacy</div>
    <form onSubmit={submit} className="mt-8 w-full max-w-md md:max-w-xl lg:max-w-2xl mx-auto font-poppins">
      <input className="w-full mb-4 px-4 py-2 border-b border-zinc-300 bg-transparent font-thin text-[13px] sm:text-[14px] md:text-[16px] lg:text-[18px] font-poppins placeholder:text-left focus:outline-none focus:border-[#36A5FF]" placeholder="Pharmacy Name" value={form.name} onChange={e=>setForm({...form,name:e.target.value})} />
      <input type="email" className="w-full mb-4 px-4 py-2 border-b border-zinc-300 bg-transparent font-thin text-[13px] sm:text-[14px] md:text-[16px] lg:text-[18px] font-poppins placeholder:text-left focus:outline-none focus:border-[#36A5FF]" placeholder="Email Address" value={form.email} onChange={e=>setForm({...form,email:e.target.value})} />
      <input className="w-full mb-4 px-4 py-2 border-b border-zinc-300 bg-transparent font-thin text-[13px] sm:text-[14px] md:text-[16px] lg:text-[18px] font-poppins placeholder:text-left focus:outline-none focus:border-[#36A5FF]" placeholder="WhatsApp Number" value={form.phone} onChange={e=>setForm({...form,phone:e.target.value})} />
      <input className="w-full mb-4 px-4 py-2 border-b border-zinc-300 bg-transparent font-thin text-[13px] sm:text-[14px] md:text-[16px] lg:text-[18px] font-poppins placeholder:text-left focus:outline-none focus:border-[#36A5FF]" placeholder="Address" value={form.address} onChange={handleAddressChange} />
      <div className="relative mb-4">
        <input
          type={showPassword ? 'text' : 'password'}
          className="w-full px-4 py-2 border-b border-zinc-300 bg-transparent font-thin text-[13px] sm:text-[14px] md:text-[16px] lg:text-[18px] font-poppins placeholder:text-left focus:outline-none focus:border-[#36A5FF]"
          placeholder="Choose a password"
          value={form.password}
          onChange={e=>setForm({...form,password:e.target.value})}
        />
        <button type="button" onClick={()=>setShowPassword(s=>!s)} className="absolute right-3 top-1/2 -translate-y-1/2 text-sky-600 text-sm">{showPassword ? 'Hide' : 'Show'}</button>
      </div>
      <div className="flex items-center mb-3">
        <input id="isPharmacyPharmacy" type="checkbox" className="h-4 w-4 text-brand-primary border-zinc-300 rounded" />
        <label htmlFor="isPharmacyPharmacy" className="ml-2 text-sm text-black">I'm a Pharmacy</label>
      </div>
      <div className="flex justify-center w-full">
        <button disabled={busy} className="w-full sm:w-[359px] h-[47px] rounded-full border font-poppins text-[14px] sm:text-[16px] lg:text-[18px] font-light border-[#36A5FF] text-[#36A5FF] bg-white mt-4 flex items-center justify-center">{busy?'Registering…':'Register'}</button>
      </div>
    </form>
    <div className="mt-6 text-center text-zinc-500 text-[13px] sm:text-[14px] md:text-[16px] font-light">Already have an account? <Link to="/auth/pharmacy/signin" className="text-sky-600 font-medium">Sign In</Link></div>
  </AuthLayout>
);
}