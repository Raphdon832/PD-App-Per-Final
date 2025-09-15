import React, { useEffect, useState } from 'react';
import { processOrderAndReserveStock, updateOrderStatus } from '@/lib/orders';
import { collection, query, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { getPharmacyId } from '@/lib/db';

const STATUS_OPTIONS = ['fulfilled', 'processing', 'cancelled'];

export default function PharmacyOrdersSection() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    async function fetchOrders() {
      setLoading(true);
      const pharmacyId = await getPharmacyId();
      const q = query(collection(db, 'orders'));
      const snap = await getDocs(q);
      // Only show orders for this pharmacy (if you still store pharmacyId on order)
      const ordersData = await Promise.all(snap.docs.map(async d => {
        const data = d.data();
        // If you want to filter by pharmacyId, uncomment below:
        // if (data.pharmacyId && data.pharmacyId !== pharmacyId) return null;
        const items = Array.isArray(data.items) ? data.items : [];
        return {
          id: d.id,
          ...data,
          items,
        };
      }));
      setOrders(ordersData.filter(Boolean));
      setLoading(false);
    }
    fetchOrders();
  }, []);

  async function onChangeStatus(order, value) {
    try {
      const next = String(value).trim();
      if (order.status === 'placed' && next === 'processing') {
        await processOrderAndReserveStock(order.id); // reserves stock + sets status
      } else {
        await updateOrderStatus(order.id, next);     // simple status change
      }
    } catch (e) {
      console.error('Status change failed:', e);
      alert(e.message || 'Failed to change status');
    }
  }

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
                value={order.status || 'placed'}
                onChange={e => onChangeStatus(order, e.target.value)}
                className="border rounded px-2 py-1 text-sm"
              >
                <option value="placed">placed</option>
                <option value="processing">processing</option>
                <option value="shipped">shipped</option>
                <option value="completed">completed</option>
                <option value="cancelled">cancelled</option>
              </select>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
