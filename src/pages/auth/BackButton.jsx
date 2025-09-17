// src/pages/auth/BackButton.jsx
import React from 'react';
import { useNavigate } from 'react-router-dom';


export default function BackButton({ to }) {
const navigate = useNavigate();
return (
<button
  onClick={() => (to ? navigate(to) : navigate(-1))}
  className="w-[78px] h-[27px] font-poppins font-normal tracking-tight text-[16px] flex items-center justify-center rounded-[7px] bg-white border border-zinc-300 shadow-sm"
>
  ←
</button>
);
}