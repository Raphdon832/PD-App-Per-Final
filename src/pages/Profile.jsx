import { Dialog } from '@headlessui/react';
import { useEffect, useState } from 'react';
import { useAuth } from '@/lib/auth';
import { collection, doc, getDoc, onSnapshot, query, updateDoc, where } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { User, Package } from 'lucide-react';
import { ensureItemNames } from '@/lib/orders-view';
import WhatsappEditModal from '@/components/WhatsappEditModal';
import FloatingMessageButton from '@/components/FloatingMessageButton';

export default function Profile() {
  const { user, logout, profile } = useAuth();
  const [orders, setOrders] = useState([]);
  const [showAllOrders, setShowAllOrders] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [showWhatsappEdit, setShowWhatsappEdit] = useState(false);
  const [whatsapp, setWhatsapp] = useState('');

  useEffect(() => {
    if (!user) return;
    const q = query(collection(db, 'orders'), where('customerId', '==', user.uid));
    const unsub = onSnapshot(q, (snap) => {
      const loadedOrders = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      async function hydrate() {
        const hydrated = await Promise.all(loadedOrders.map(o => ensureItemNames(o)));
        setOrders(hydrated);
      }
      hydrate();
    });
    return () => unsub();
  }, [user]);

  useEffect(() => {
    async function fetchWhatsapp() {
      try {
        const cfg = await getDoc(doc(db, 'config', 'app'));
        if (cfg.exists()) setWhatsapp(cfg.data().whatsapp || '');
      } catch { setWhatsapp(''); }
    }
    fetchWhatsapp();
  }, []);

  const handleWhatsappSave = async (newWhatsapp) => {
    setWhatsapp(newWhatsapp);
    await updateDoc(doc(db, 'config', 'app'), { whatsapp: newWhatsapp });
  };

  // Sort orders by createdAt descending
  const sortedOrders = [...orders].sort((a, b) => {
    const aTime = a.createdAt?.toDate ? a.createdAt.toDate().getTime() : (a.createdAt?.seconds ? a.createdAt.seconds * 1000 : 0);
    const bTime = b.createdAt?.toDate ? b.createdAt.toDate().getTime() : (b.createdAt?.seconds ? b.createdAt.seconds * 1000 : 0);
    return bTime - aTime;
  });
  const visibleOrders = showAllOrders ? sortedOrders : sortedOrders.slice(0, 3);

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
            <div className="text-sm text-zinc-500 mb-1">{user.email}</div>
            {(profile?.address || profile?.phone) && (
              <div className="text-sm text-zinc-700 mb-2 text-center">
                {profile?.address && (<><b></b> {profile.address}<br/></>)}
                {profile?.phone && (<><b></b> {profile.phone}</>)}
              </div>
            )}
          </div>
          <button
            onClick={async () => { await logout(); window.location.href = '/auth/landing'; }}
            className="mt-4 rounded-full border border-red-200 text-red-600 px-4 py-2 text-[14px] font-medium hover:bg-red-50 transition"
          >
            Log Out
          </button>
        </div>

        {/* Floating Edit WhatsApp Button */}
        {profile?.role === 'pharmacy' && (
          <div className="flex items-center gap-2 mb-4">
            <span className="text-sm text-zinc-600">WhatsApp for customers:</span>
            <span className="font-semibold text-green-700">{whatsapp || 'Not set'}</span>
            <button className="ml-2 px-2 py-1 rounded bg-green-100 text-green-700 text-xs font-semibold hover:bg-green-200" onClick={()=>setShowWhatsappEdit(true)}>Edit</button>
          </div>
        )}
        <WhatsappEditModal
          open={showWhatsappEdit}
          onClose={() => setShowWhatsappEdit(false)}
          initialWhatsapp={whatsapp}
          onSave={handleWhatsappSave}
        />

        {/* Orders Section */}
        {profile?.role !== 'pharmacy' ? (
          <div className="rounded-3xl bg-white shadow px-6 py-6 border border-brand-accent/10">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Package className="h-5 w-5 text-brand-accent" />
                <div className="text-lg font-semibold text-brand-accent">Your Orders <span className="ml-1 text-xs font-normal text-brand-primary/70">({orders.length})</span></div>
              </div>
              {sortedOrders.length > 3 && (
                <button className="text-xs text-brand-primary underline" onClick={() => setShowAllOrders(a => !a)}>
                  {showAllOrders ? 'See less' : 'See more'}
                </button>
              )}
            </div>
            <div className="space-y-4">
              {visibleOrders.length === 0 && (
                <div className="text-sm text-zinc-400 text-center">No orders yet.</div>
              )}
              {visibleOrders.map(order => (
                <div key={order.id} className="rounded-xl border border-brand-primary/10 bg-brand-primary/5 px-4 py-3 flex flex-col gap-1">
                  <div className="flex items-center justify-between">
                    <div className="text-sm font-semibold text-brand-primary">Order #{order.id.slice(0,8)}</div>
                    <div className="text-xs text-zinc-500">
                      {order.createdAt ? (order.createdAt.toDate ? order.createdAt.toDate().toLocaleString() : new Date(order.createdAt.seconds*1000).toLocaleString()) : ''}
                    </div>
                  </div>
                  <ul className="mt-2 text-[12px] space-y-1">
                    {order.items?.slice(0,3).map((it, idx) => (
                      <li key={idx}>Name: {it.name || '(unknown)'} | Qty: {it.quantity}</li>
                    ))}
                    {order.items?.length > 3 && (
                      <li className="text-[12px] opacity-70">+{order.items.length - 3} more…</li>
                    )}
                  </ul>
                  <div className="mt-1 text-xs font-medium text-brand-accent">
                    {order.status ? order.status : 'Processing'}
                  </div>
                  <div className="mt-1 text-xs">
                    <b>Payment:</b> {order.paymentMethod || 'N/A'} | <b>Status:</b> {order.paymentMethod === 'Transfer' ? (order.paid ? 'Payment confirmed' : 'Payment not confirmed') : (order.paid ? 'Paid' : 'Unpaid')}
                  </div>
                  <button
                    className="mt-2 self-end text-xs text-brand-primary underline"
                    onClick={() => { setSelectedOrder(order); setDetailsOpen(true); }}
                  >
                    View Details
                  </button>
                </div>
              ))}
            </div>
          </div>
        ) : null}

        {/* Order Details Modal */}
        <Dialog open={detailsOpen} onClose={() => setDetailsOpen(false)} className="fixed z-50 inset-0 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen px-4">
            <div className="fixed inset-0 bg-black opacity-30" aria-hidden="true" />
            <div className="relative bg-white rounded-2xl max-w-md w-full mx-auto p-6 z-10">
              <Dialog.Title className="text-lg font-bold mb-2">Order Details</Dialog.Title>
              {selectedOrder && (
                <div className="space-y-2 text-[12px]">
                  <div><b>Order ID:</b> {selectedOrder.id}</div>
                  <div><b>Date:</b> {selectedOrder.createdAt ? (selectedOrder.createdAt.toDate ? selectedOrder.createdAt.toDate().toLocaleString() : new Date(selectedOrder.createdAt.seconds*1000).toLocaleString()) : ''}</div>
                  <div><b>Status:</b> {selectedOrder.status || 'Processing'}</div>
                  <div><b>Payment Method:</b> {selectedOrder.paymentMethod || 'N/A'}</div>
                  <div><b>Payment Status:</b> {selectedOrder.paymentMethod === 'Transfer' ? (selectedOrder.paid ? 'Payment confirmed' : 'Payment not confirmed') : (selectedOrder.paid ? 'Paid' : 'Unpaid')}</div>
                  <div><b>Payment Reference:</b> {selectedOrder.paymentReference || 'N/A'}</div>
                  <div><b>Delivery Address:</b> {selectedOrder.address || 'N/A'}</div>
                  <div><b>Phone:</b> {selectedOrder.phone || 'N/A'}</div>
                  <div><b>Items:</b>
                    <ul className="list-disc ml-5">
                      {selectedOrder.items?.map((it, idx) => (
                        <li key={idx}>{it.name || '(unknown)'} x {it.quantity}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              )}
              <button
                className="mt-4 w-full rounded-lg bg-brand-primary text-white text-[12px] py-2 font-semibold hover:bg-brand-primary/90"
                onClick={() => setDetailsOpen(false)}
              >
                Close
              </button>
            </div>
          </div>
        </Dialog>

      </div>
    </div>
  );
}
