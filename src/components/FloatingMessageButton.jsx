import { useAuth } from '@/lib/auth';
import { MessageCircle } from 'lucide-react';

export default function FloatingMessageButton({ pharmacyPhone }) {
  const { user } = useAuth();

  const openWhatsapp = () => {
    if (!pharmacyPhone) {
      alert('No WhatsApp number available for this pharmacy.');
      return;
    }
    // Remove non-digits for wa.me link
    const phone = pharmacyPhone.replace(/[^0-9]/g, '');
    const url = `https://wa.me/${phone}?text=Hi%20I%20have%20a%20question%20about%20your%20pharmacy`;
    window.open(url, '_blank');
  };

  return (
    <button
      onClick={openWhatsapp}
      className="fixed bottom-20 right-6 z-50 bg-brand-primary text-white rounded-full p-4 shadow-lg hover:bg-brand-primary/90 transition"
      aria-label="Message pharmacy on WhatsApp"
    >
      <MessageCircle className="w-7 h-7" />
    </button>
  );
}
