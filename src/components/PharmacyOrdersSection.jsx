import React, { useEffect, useState } from 'react';
import { collection, query, where, getDocs, doc, updateDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';

const STATUS_OPTIONS = ['fulfilled', 'processing', 'cancelled'];

export default function PharmacyOrdersSection({ pharmacyId }) {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    async function fetchOrders() {
      if (!pharmacyId) return;
      setLoading(true);
      const q = query(collection(db, 'orders'), where('pharmacyId', '==', pharmacyId));
      const snap = await getDocs(q);
      const ordersData = await Promise.all(snap.docs.map(async d => {
        const data = d.data();
        // Ensure all items are shown
        const items = Array.isArray(data.items) ? data.items : [];
        return {
          id: d.id,
          ...data,
          items,
        };
      }));
      setOrders(ordersData);
      setLoading(false);
    }
    fetchOrders();
  }, [pharmacyId]);

  const handleStatusChange = async (orderId, newStatus) => {
    setOrders(orders => orders.map(o => o.id === orderId ? { ...o, status: newStatus } : o));
    try {
      await updateDoc(doc(db, 'orders', orderId), { status: newStatus });
    } catch (err) {
      alert('Failed to update status');
    }
  };

  if (loading) return <div className="text-center text-zinc-400">Loading orders...</div>;
  if (!orders.length) return <div className="text-center text-zinc-400">No orders found.</div>;

  return (
    <div className="mt-10">
      <h2 className="text-lg font-bold text-green-700 mb-4">Orders</h2>
      <div className="space-y-4">
        {orders.map(order => (
          <div key={order.id} className="border rounded-xl p-4 bg-white shadow-sm">
            <div className="font-semibold text-orange-700">Order ID: {order.id}</div>
            <div className="text-sm text-zinc-600 mb-2">Date: {order.createdAt?.toDate ? order.createdAt.toDate().toLocaleString() : '-'}</div>
            <div className="font-medium text-zinc-800 mb-1">Items:</div>
            <ul className="ml-4 list-disc mb-2">
              {order.items.length ? order.items.map((item, idx) => (
                <li key={idx} className="text-sm text-zinc-700">
                  Name: {item.name || '-'} | Qty: {item.quantity || 1}
                </li>
              )) : <li className="text-sm text-zinc-400">No items</li>}
            </ul>
            <div className="mt-2">
              <label className="font-medium text-zinc-800 mr-2">Status:</label>
              <select
                value={order.status || 'processing'}
                onChange={e => handleStatusChange(order.id, e.target.value)}
                className="border rounded px-2 py-1 text-sm"
              >
                {STATUS_OPTIONS.map(opt => (
                  <option key={opt} value={opt}>{opt}</option>
                ))}
              </select>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
