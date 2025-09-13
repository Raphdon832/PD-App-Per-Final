// src/pages/auth/Landing.jsx
import React from 'react';
import { useNavigate } from 'react-router-dom';
import AuthLayout from './AuthLayout';


export default function Landing() {
const navigate = useNavigate();


return (
  <AuthLayout>
    <div className="font-poppins text-[32px] sm:text-[38px] md:text-[42px] lg:text-[54px] font-normal justify-center tracking-tight leading-[109%] text-center text-brand-primary">Welcome to Your Pharmacy</div>
    <p className="mt-4 text-zinc-500 text-[13px] sm:text-[14px] md:text-[16px] tracking-tight font-normal justify-center leading-[154%] font-poppins text-center">Order your medications and health essentials, delivered to your door.</p>
    <div className="flex justify-start w-full max-w-[350px] mx-0">
      <button
        onClick={()=> navigate('/auth')}
        className="mt-8 w-full h-[47px] rounded-[7px] border font-poppins text-[16px] font-medium border-brand-primary text-brand-primary bg-white hover:bg-brand-primary/10 flex items-center justify-center transition"
      >
        Sign In / Create Account
      </button>
    </div>
  </AuthLayout>
);
}