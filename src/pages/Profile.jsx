import { useEffect, useState } from 'react';
import { useAuth } from '@/lib/auth';
import { collection, onSnapshot, query, where } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { User, Package } from 'lucide-react';

export default function Profile() {
  const { user, logout } = useAuth();
  const [orders, setOrders] = useState([]);

  useEffect(() => {
    if (!user) return;
    const q = query(collection(db, 'orders'), where('customerId', '==', user.uid));
    const unsub = onSnapshot(q, (snap) => {
      setOrders(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });
    return () => unsub();
  }, [user]);

  if (!user) {
    return (
      <div className="p-6">
        <div className="text-brand-primary text-lg">Please sign in</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen w-full flex flex-col items-center bg-[#F8FAF9] px-2 pb-28">
      <div className="w-full max-w-lg mx-auto mt-8">
        {/* Profile Card */}
        <div className="rounded-3xl bg-white shadow-md px-6 py-8 flex flex-col items-center mb-8 border border-brand-primary/10">
          <div className="flex flex-col items-center gap-2">
            <div className="w-20 h-20 rounded-full bg-brand-primary/10 flex items-center justify-center mb-2">
              <User className="h-10 w-10 text-brand-primary" />
            </div>
            <div className="text-xl font-bold text-brand-primary mb-1">{user.displayName || user.email}</div>
            <div className="text-sm text-zinc-500 mb-2">{user.email}</div>
          </div>
          <button
            onClick={async () => { await logout(); window.location.href = '/auth/landing'; }}
            className="mt-4 rounded-full border border-red-200 text-red-600 px-4 py-2 text-[14px] font-medium hover:bg-red-50 transition"
          >
            Log Out
          </button>
        </div>

        {/* Orders Section */}
        <div className="rounded-3xl bg-white shadow px-6 py-6 border border-brand-accent/10">
          <div className="flex items-center gap-2 mb-4">
            <Package className="h-5 w-5 text-brand-accent" />
            <div className="text-lg font-semibold text-brand-accent">Your Orders</div>
          </div>
          <div className="space-y-4">
            {orders.length === 0 && (
              <div className="text-sm text-zinc-400 text-center">No orders yet.</div>
            )}
            {orders.map(order => (
              <div key={order.id} className="rounded-xl border border-brand-primary/10 bg-brand-primary/5 px-4 py-3 flex flex-col gap-1">
                <div className="flex items-center justify-between">
                  <div className="text-sm font-semibold text-brand-primary">Order #{order.id.slice(0,8)}</div>
                  <div className="text-xs text-zinc-500">
                    {order.createdAt ? new Date(order.createdAt.seconds*1000).toLocaleString() : ''}
                  </div>
                </div>
                <div className="mt-1 text-xs text-zinc-600">
                  {Array.isArray(order.products)
                    ? order.products.map(p => p.name).join(', ')
                    : '—'}
                </div>
                <div className="mt-1 text-xs font-medium text-brand-accent">
                  {order.status ? order.status : 'Processing'}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
