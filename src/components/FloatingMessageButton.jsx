import { useEffect, useState } from 'react';
import { db } from '@/lib/firebase';
import { doc, getDoc } from 'firebase/firestore';
import { MessageCircle } from 'lucide-react';

function normalizePhone(raw) {
  if (!raw) return '';
  const s = String(raw).trim();
  // Keep leading + if present, strip all other non-digits
  if (s.startsWith('+')) return `+${s.slice(1).replace(/[^\d]/g, '')}`;
  return s.replace(/[^\d]/g, '');
}

function openWhatsApp({ phone, text }) {
  const p = normalizePhone(phone);
  if (!p) {
    alert('No WhatsApp number configured for this pharmacy.');
    return;
  }
  const msg = encodeURIComponent(text || 'Hi, I have a question about your pharmacy.');
  const appUrl = `whatsapp://send?phone=${p}&text=${msg}`;
  const webUrl = `https://wa.me/${p}?text=${msg}`;

  // Try app deep link first, then fall back to web
  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
  const open = (url) => (isIOS ? (window.location.href = url) : window.open(url, '_blank', 'noopener'));

  const t = setTimeout(() => open(webUrl), 700);
  try {
    if (isIOS) {
      window.location.href = appUrl;
    } else {
      const w = window.open(appUrl, '_blank');
      if (!w) {
        clearTimeout(t);
        window.open(webUrl, '_blank', 'noopener');
      }
    }
  } catch {
    clearTimeout(t);
    open(webUrl);
  }
}

export default function FloatingMessageButton() {
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let active = true;
    (async () => {
      setLoading(true);
      try {
        const cfg = await getDoc(doc(db, 'config', 'app'));
        if (!cfg.exists()) {
          console.warn('[FloatingMessageButton] config/app doc missing');
          if (active) setPhone('');
          return;
        }
        const data = cfg.data();
        // Accept common field names for WhatsApp number
        const found =
          data.whatsapp ||
          data.whatsappNumber ||
          data.phone ||
          data.phoneNumber ||
          (data.contact && data.contact.whatsapp) ||
          '';
        if (active) setPhone(found || '');
      } catch (e) {
        console.error('[FloatingMessageButton] fetch error', e);
        if (active) setPhone('');
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => { active = false; };
  }, []);

  const handleClick = () => {
    if (!phone) {
      alert('No WhatsApp number available for this pharmacy.');
      return;
    }
    openWhatsApp({
      phone,
      text: 'Hi! I have a question about a product/order.'
    });
  };

  return (
    <button
      onClick={handleClick}
      disabled={loading}
      className="fixed bottom-20 right-6 z-50 bg-brand-primary text-white rounded-full p-4 shadow-lg hover:bg-brand-primary/90 disabled:opacity-60 transition"
      aria-label="Message pharmacy on WhatsApp"
      title={phone ? `Chat on WhatsApp: ${phone}` : 'WhatsApp not configured'}
    >
      <MessageCircle className="w-7 h-7" />
    </button>
  );
}