import React, { useState } from 'react';
import Modal from './Modal';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

export default function ProfileCompletionModal({ open, onClose, onSave, isPharmacy, initialPhone = '', initialAddress = '' }) {
  const [phone, setPhone] = useState(initialPhone);
  const [address, setAddress] = useState(initialAddress);
  const [busy, setBusy] = useState(false);

  const handleSave = async (e) => {
    e.preventDefault();
    setBusy(true);
    await onSave({ phone, address: isPharmacy ? address : undefined });
    setBusy(false);
  };

  return (
    <Modal open={open} onClose={onClose}>
      <form onSubmit={handleSave} className="flex flex-col gap-4">
        <div className="text-lg font-semibold text-brand-primary mb-2">Complete your profile</div>
        <Input
          placeholder="WhatsApp Number"
          value={phone}
          onChange={e => setPhone(e.target.value)}
          className="mb-2"
          required
        />
        {isPharmacy && (
          <Input
            placeholder="Pharmacy Address"
            value={address}
            onChange={e => setAddress(e.target.value)}
            className="mb-2"
            required
          />
        )}
        <Button type="submit" disabled={busy} className="w-full bg-brand-primary text-white rounded">{busy ? 'Saving…' : 'Save'}</Button>
      </form>
    </Modal>
  );
}
