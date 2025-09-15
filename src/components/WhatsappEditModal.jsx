import React, { useState } from 'react';

export default function WhatsappEditModal({ open, onClose, initialWhatsapp, onSave }) {
  const [whatsapp, setWhatsapp] = useState(initialWhatsapp || '');
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-2xl shadow-lg max-w-sm w-full p-6 relative">
        <button className="absolute top-3 right-3 text-zinc-400 hover:text-zinc-700" onClick={onClose}>&times;</button>
        <h2 className="text-lg font-bold mb-4">Edit WhatsApp Number</h2>
        <input
          className="w-full border rounded px-3 py-2 mb-4"
          placeholder="WhatsApp Number"
          value={whatsapp}
          onChange={e => setWhatsapp(e.target.value)}
        />
        <button
          className="w-full rounded bg-green-600 text-white py-2 font-semibold hover:bg-green-700"
          onClick={() => { onSave(whatsapp); onClose(); }}
        >
          Save
        </button>
      </div>
    </div>
  );
}
