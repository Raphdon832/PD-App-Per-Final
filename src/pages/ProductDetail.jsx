import { Clock, Phone, ArrowLeft } from 'lucide-react';
import { addToCart } from '@/lib/db';
import { useAuth } from '@/lib/auth';
import { useNavigate } from 'react-router-dom';
import LoadingSkeleton from '@/components/LoadingSkeleton';
import { db } from '@/lib/firebase';
import { doc, getDoc } from 'firebase/firestore';
import { useEffect, useState } from 'react';

export default function ProductDetail({ product, pharmacy }) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [pharmacyPhone, setPharmacyPhone] = useState('');

  useEffect(() => {
    async function fetchPhone() {
      try {
        const cfg = await getDoc(doc(db, 'config', 'app'));
        if (cfg.exists()) {
          setPharmacyPhone(cfg.data().phone || cfg.data().whatsapp || cfg.data().whatsappNumber || cfg.data().phoneNumber || '');
        }
      } catch {
        setPharmacyPhone('');
      }
    }
    fetchPhone();
  }, []);

  if (!product) return <LoadingSkeleton lines={5} className="my-8" />;

  const price = Number(product.price || 0);

  // Optional: gate by auth, as in your original
  if (!user) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-white">
        <div className="text-xl font-poppins font-light mb-6">Please sign in to continue</div>
        <button
          className="rounded-full bg-sky-600 text-white px-6 py-2 text-lg font-poppins font-medium shadow hover:bg-sky-700 transition"
          onClick={() => navigate('/auth/landing')}
        >
          Sign In / Sign Up
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      {/* Page container */}
      <div className="w-full max-w-md md:max-w-2xl lg:max-w-4xl xl:max-w-6xl mx-auto px-5 md:px-8 lg:px-12 xl:px-0">
        {/* Sticky back button */}
        <div className="pt-6 sticky top-0 z-20 bg-white border-b border-brand-primary/10 pb-2">
          <button
            onClick={() => navigate(-1)}
            className="w-[34px] h-[34px] font-poppins font-light tracking-tight text-[15px] flex items-center justify-center rounded-full bg-white border border-brand-primary/20 text-brand-primary"
          >
            <ArrowLeft className="h-4 w-4 mr-1" />
          </button>
        </div>

        {/* Hero image */}
        <div className="mt-6 flex items-center justify-center">
          <div className="relative w-full" style={{ height: '260px' }}>
            <div className="absolute inset-0 flex items-center justify-center">
              <img
                src={product.image}
                alt={product.name}
                className="h-44 md:h-56 lg:h-64 object-contain mx-auto rounded-2xl border border-brand-primary/10 bg-brand-primary/5"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Details sheet */}
      <div className="mt-8 bg-[#F8FAF9] rounded-t-3xl border-t border-brand-primary/10 shadow-[0_-8px_24px_rgba(0,0,0,0.04)]">
        <div className="w-full max-w-md md:max-w-2xl lg:max-w-4xl xl:max-w-6xl mx-auto px-5 md:px-8 lg:px-12 xl:px-0 pt-6 pb-36">
          {/* Title & price */}
          <div className="flex items-start justify-between">
            <h1 className="text-[22px] leading-none font-poppins font-bold tracking-tight text-brand-primary">{product.name}</h1>
            <div className="text-[19px] font-poppins font-semibold text-brand-accent">₦{price.toLocaleString()}</div>
          </div>

          {/* Description */}
          <div className="mt-8">
            <div className="text-[15px] font-poppins font-semibold text-brand-primary">Product Description</div>
            <p className="mt-1 text-zinc-600 leading-7 font-poppins text-[14px] font-light">
              {product.description}
            </p>
          </div>
        </div>
      </div>

      {/* Bottom CTA bar (floats above tab bar) */}
      <div className="fixed left-0 right-0 bottom-24 z-30">
        <div className="w-full max-w-md md:max-w-2xl lg:max-w-4xl xl:max-w-6xl mx-auto px-5 md:px-8 lg:px-12 xl:px-0">
          <div className="flex gap-4">
            <button
              onClick={async () => {
                if (!user) return alert('Please sign in');
                if (!product.id) return alert('Product unavailable. Please try again.');
                try { await addToCart(user.uid, product.id, 1); } catch { alert('Failed to add to cart.'); }
              }}
              className="flex-1 h-[30px] rounded-[7px] bg-brand-primary text-white text-[13px] font-poppins font-semibold shadow-sm active:scale-[0.99] hover:bg-brand-primary/90 transition"
            >
              Add to Cart
            </button>
            <a
              href={pharmacyPhone ? `tel:${pharmacyPhone}` : undefined}
              className="flex-1 h-[30px] rounded-[7px] border border-brand-accent text-brand-accent text-[13px] font-poppins font-semibold flex items-center justify-center gap-2 bg-white active:scale-95 hover:bg-brand-accent/10 transition"
              disabled={!pharmacyPhone}
              style={!pharmacyPhone ? { pointerEvents: 'none', opacity: 0.5 } : {}}
            >
              <Phone className="h-4 w-4" /> Call to Order
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
