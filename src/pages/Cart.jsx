import { useEffect, useMemo, useState } from 'react';
import { collection, doc, getDoc, onSnapshot, query } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { removeFromCart } from '@/lib/db';
import { useAuth } from '@/lib/auth';
import { useNavigate } from 'react-router-dom';
import DeleteIcon from '@/icons/react/DeleteIcon';
import LoadingSkeleton from '@/components/LoadingSkeleton';

export default function Cart() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [items, setItems] = useState([]);

  useEffect(() => {
    if (!user) return;
    const q = query(collection(db, 'users', user.uid, 'cart'));
    return onSnapshot(q, async (snap) => {
      const rows = await Promise.all(snap.docs.map(async d => {
        const item = d.data();
        const p = await getDoc(doc(db, 'products', item.productId));
        return { id: d.id, ...item, product: { id: p.id, ...p.data() } };
      }));
      setItems(rows);
    });
  }, [user]);

  const total = useMemo(() => items.reduce((s, i) => s + (i.product?.price||0) * i.qty, 0), [items]);

  const checkout = () => {
    navigate('/checkout');
  };

  // Harmonize duplicate items by productId
  const harmonizedItems = useMemo(() => {
    const map = new Map();
    for (const i of items) {
      const pid = i.product?.id;
      if (!pid) continue;
      if (map.has(pid)) {
        const existing = map.get(pid);
        map.set(pid, { ...existing, qty: existing.qty + i.qty, ids: [...(existing.ids||[existing.id]), i.id] });
      } else {
        map.set(pid, { ...i, ids: [i.id] });
      }
    }
    return Array.from(map.values());
  }, [items]);

  if (!user) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-white">
        <div className="text-xl font-poppins font-light mb-6">Please sign in to continue</div>
        <button
          className="rounded-full bg-brand-primary text-white px-8 py-3 text-lg font-poppins font-medium shadow hover:bg-brand-primary/90 transition"
          onClick={() => navigate('/auth/landing')}
        >
          Sign In / Sign Up
        </button>
      </div>
    );
  }

  if (user && items.length === 0) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-white">
        <div className="text-brand-primary/40 font-light text-[18px] font-poppins text-center">Your cart is empty.</div>
      </div>
    );
  }

  return (
    <div className="pt-10 pb-28 w-full max-w-md md:max-w-2xl lg:max-w-4xl xl:max-w-6xl mx-auto px-4 sm:px-5 md:px-8 lg:px-12 xl:px-0 min-h-screen flex flex-col">
      {/* Sticky header */}
      <div className="sticky top-0 z-20 bg-white pb-2 pt-4 -mx-4 sm:-mx-5 md:-mx-8 lg:-mx-12 xl:-mx-0 px-4 sm:px-5 md:px-8 lg:px-12 xl:px-0 border-b border-brand-primary/10">
        <div className="text-[28px] sm:text-[35px] md:text-[42px] lg:text-[48px] font-bold font-poppins text-brand-primary tracking-tight">Cart</div>
      </div>
      <div className="mt-6 flex flex-col gap-3">
        {harmonizedItems.map((i) => (
          <div key={i.product?.id} className="relative rounded-2xl border border-brand-primary/10 bg-white p-3 flex items-center gap-4 min-w-0 shadow-sm">
            {/* Remove icon button at top right */}
            <button
              onClick={() => i.ids.forEach(id => removeFromCart(user.uid, id))}
              className="absolute top-2 right-2 z-10 p-1 rounded-full hover:bg-brand-accent/10 transition"
              aria-label="Remove"
            >
              <DeleteIcon className="w-5 h-5 text-brand-primary" />
            </button>
            <img src={i.product?.image} className="h-14 w-14 object-cover rounded-xl border border-brand-primary/10 bg-brand-primary/5"/>
            <div className="flex-1 min-w-0">
              <div className="font-semibold text-[13px] sm:text-[14px] md:text-[15px] lg:text-[16px] truncate text-brand-primary font-poppins">{i.product?.name}</div>
              <div className="text-brand-primary text-[11px] sm:text-[12px] md:text-[13px] lg:text-[14px] font-poppins">₦{Number(i.product?.price||0).toLocaleString()}</div>
              {/* Quantity selector */}
              <div className="flex items-center gap-2 mt-2">
                <button
                  className="w-7 h-7 rounded-[3px] border border-brand-primary/20 flex items-center justify-center text-[18px] font-light bg-brand-primary/5 text-brand-primary disabled:opacity-40 font-poppins"
                  onClick={async () => {
                    if (i.qty > 1) {
                      // Remove one instance (by id)
                      await removeFromCart(user.uid, i.ids[0]);
                    }
                  }}
                  disabled={i.qty <= 1}
                  aria-label="Decrease quantity"
                >
                  -
                </button>
                <span className="text-[14px] font-poppins w-7 text-center text-brand-primary">{i.qty}</span>
                <button
                  className="w-7 h-7 rounded-[3px] border border-brand-primary/20 flex items-center justify-center text-[18px] font-light bg-brand-primary/5 text-brand-primary font-poppins"
                  onClick={async () => {
                    // Add one more of this product
                    if (i.product?.id) {
                      const { addToCart } = await import('@/lib/db');
                      await addToCart(user.uid, i.product.id, 1);
                    }
                  }}
                  aria-label="Increase quantity"
                >
                  +
                </button>
              </div>
            </div>
          </div>
        ))}
        {harmonizedItems.length===0 && <div className="text-brand-primary/40 font-extralight text-[15px] sm:text-[16px] md:text-[18px] lg:text-[20px] font-poppins text-center">Your cart is empty.</div>}
      </div>
      {harmonizedItems.length>0 && (
        <div className="mt-6 rounded-2xl border border-brand-primary bg-brand-accent/5 p-4 shadow-sm">
          <div className="flex flex-col sm:flex-row items-center justify-between text-[15px] sm:text-[17px] md:text-[20px] lg:text-[24px] font-poppins">
            <span className="text-brand-primary font-semibold">Total</span>
            <span className="font-bold text-brand-primary text-[15px] sm:text-[18px]">₦{Number(total).toLocaleString()}</span>
          </div>
          <button onClick={checkout} className="mt-4 w-full rounded-full border-none bg-brand-primary text-white py-3 text-[15px] sm:text-[17px] lg:text-[19px] font-semibold font-poppins shadow hover:bg-brand-primary/90 transition">Proceed to Checkout</button>
        </div>
      )}
    </div>
  );
}