import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/lib/auth';
import { placeOrder, listenCart, removeFromCart, getPharmacyId } from '@/lib/db';
import { db } from '@/lib/firebase';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import LoadingSkeleton from '@/components/LoadingSkeleton';
import { Dialog } from '@headlessui/react';
import { Fragment, useRef } from 'react';

export default function Checkout() {
  const { user, profile } = useAuth();
  const [cart, setCart] = useState([]);
  const [address, setAddress] = useState(profile?.address || '');
  const [phone, setPhone] = useState(profile?.phone || '');
  const [loading, setLoading] = useState(true);
  const [placing, setPlacing] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(null);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState('');
  const [paymentRef, setPaymentRef] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    if (!user) {
      navigate('/auth');
      return;
    }
    // Fetch cart items and attach product details
    const unsub = listenCart(user.uid, async (cartDocs) => {
      const rows = await Promise.all(cartDocs.map(async d => {
        const p = await getDoc(doc(db, 'products', d.productId));
        return {
          ...d,
          name: p.data()?.name || '',
          price: p.data()?.price || 0,
        };
      }));
      setCart(rows);
      setLoading(false);
    });
    return unsub;
  }, [user, navigate]);

  const total = cart.reduce((sum, item) => sum + (item.price || 0) * (item.qty || 1), 0);

  const handlePlaceOrder = async () => {
    setError('');
    if (!address.trim() || !phone.trim()) {
      setError('Please provide both address and phone number.');
      return;
    }
    if (cart.length === 0) {
      setError('Your cart is empty.');
      return;
    }
    // ensure a payment method is selected by default when opening the modal
    if (!paymentMethod) setPaymentMethod('delivery');
    setShowPaymentModal(true);
  };

  const handleConfirmPayment = async () => {
    setPlacing(true);
    try {
      if (profile?.address !== address || profile?.phone !== phone) {
        await updateDoc(doc(db, 'users', user.uid), { address, phone });
      }
      // Try to resolve the single pharmacy id so orders are tagged correctly
      let pharmacyId;
      try {
        pharmacyId = await getPharmacyId();
      } catch (err) {
        console.warn('Could not resolve pharmacyId while placing order:', err);
        pharmacyId = undefined; // fallback: still place order but dashboard won't pick it up until fixed
      }

      const items = cart.map(item => ({ productId: item.id, quantity: item.qty || 1 }));
      const orderData = {
        customerId: user.uid,
        items,
        total,
        paymentMethod,
        paymentRef: paymentMethod === 'transfer' ? paymentRef : '',
        paid: false, // will be set by pharmacy after confirmation
        address, // add address
        phone    // add phone
      };
      // Only attach pharmacyId if it was successfully resolved
      if (typeof pharmacyId !== 'undefined') {
        orderData.pharmacyId = pharmacyId;
      }

      const result = await placeOrder(orderData);
      setSuccess(result.orderId);
      setShowPaymentModal(false);
    } catch (e) {
      setError(e.message || 'Failed to place order.');
    } finally {
      setPlacing(false);
    }
  };

  if (loading) return <LoadingSkeleton lines={6} className="my-8" />;
  if (success) {
    return (
      <div className="max-w-md mx-auto mt-12 p-6 bg-white rounded shadow">
        <h2 className="text-xl font-bold mb-2">Order Placed!</h2>
        <p className="mb-4">Your order has been placed successfully. Order ID: <span className="font-mono">{success}</span></p>
        {paymentMethod === 'transfer' ? (
          <div className="mb-4 text-orange-700 font-medium">
            Payment not yet confirmed. You will be notified when the pharmacy confirms your payment.
          </div>
        ) : (
          <div className="mb-4 text-orange-700 font-medium">
            Order is pending.
          </div>
        )}
        <button className="px-4 py-2 bg-brand-primary text-white rounded" onClick={() => navigate('/')}>Go to Home</button>
      </div>
    );
  }

  return (
    <Fragment>
      <div className="max-w-3xl mx-auto mt-8 p-4 bg-white rounded shadow">
        <h1 className="text-2xl font-bold mb-4">Checkout</h1>
        <div className="mb-4">
          <label className="block text-[15px] font-medium mb-1">Delivery Address</label>
          <textarea
            className="w-full text-[13px] border rounded p-2"
            value={address}
            onChange={e => setAddress(e.target.value)}
            rows={2}
          />
        </div>
        <div className="mb-4">
          <label className="block text-[15px] font-medium mb-1">Phone Number</label>
          <input
            className="w-full text-[13px] border rounded p-2"
            value={phone}
            onChange={e => setPhone(e.target.value)}
            type="tel"
          />
        </div>
        <div className="mb-4">
          <label className="block text-[15px] font-medium mb-1">Order Summary</label>
          <ul className="divide-y">
            {cart.map(item => (
              <li key={item.id} className="py-2 flex text-[12px] justify-between items-center">
                <span>{item.name} x{item.qty || 1}</span>
                <span>₦{(item.price || 0) * (item.qty || 1)}</span>
                <button className="ml-2 text-red-500 text-xs" onClick={() => removeFromCart(user.uid, item.id)}>Remove</button>
              </li>
            ))}
          </ul>
          <div className="mt-2 font-semibold flex justify-between">
            <span>Total:</span>
            <span>₦{total}</span>
          </div>
        </div>
        {error && <div className="mb-2 text-red-600 text-sm">{error}</div>}
        <button
          className="w-full py-2 bg-brand-primary text-white rounded font-semibold mt-2 disabled:opacity-60"
          onClick={handlePlaceOrder}
          disabled={placing}
        >
          {placing ? 'Placing Order…' : 'Place Order'}
        </button>
      </div>
      {/* Payment Method Modal */}
      <Dialog open={showPaymentModal} onClose={() => setShowPaymentModal(false)} as={Fragment}>
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30">
          <div className="bg-white rounded-lg p-6 w-full max-w-md mx-auto">
            <Dialog.Title className="text-lg font-bold mb-2">Choose Payment Method</Dialog.Title>
            <div className="mb-4">
              <label className="flex items-center gap-2 mb-2">
                <input type="radio" name="paymethod" value="delivery" checked={paymentMethod==='delivery'} onChange={(e)=>setPaymentMethod(e.target.value)} />
                Pay on Delivery
              </label>
              <label className="flex items-center gap-2">
                <input type="radio" name="paymethod" value="transfer" checked={paymentMethod==='transfer'} onChange={(e)=>setPaymentMethod(e.target.value)} />
                Online Transfer
              </label>
            </div>
            {paymentMethod==='transfer' && (
              <div className="mb-4">
                <div className="text-sm font-medium mb-1">Bank Details</div>
                <div className="bg-zinc-100 rounded p-3 text-xs mb-2">
                  <div><b>Account number:</b> 0153232049</div>
                  <div><b>Bank:</b> GTB</div>
                  <div><b>Account name:</b> Economic and Business Strategies</div>
                </div>
                <label className="block text-xs mb-1">Payment Reference (optional)</label>
                <input
                  className="w-full border rounded p-2 text-xs"
                  value={paymentRef}
                  onChange={e => setPaymentRef(e.target.value)}
                  placeholder="Enter transfer reference or note"
                />
              </div>
            )}
            <div className="flex gap-2 mt-4">
              <button
                className="flex-1 py-2 rounded bg-zinc-200 text-zinc-700"
                onClick={()=>setShowPaymentModal(false)}
                disabled={placing}
              >Cancel</button>
              <button
                className="flex-1 py-2 rounded bg-brand-primary text-white font-semibold disabled:opacity-60"
                onClick={handleConfirmPayment}
                disabled={placing || !paymentMethod}
              >Confirm & Place Order</button>
            </div>
          </div>
        </div>
      </Dialog>
    </Fragment>
  );
}
