import React, { useEffect, useState } from 'react';
import { processOrderAndReserveStock, updateOrderPaid, updateOrderStatus } from '@/lib/orders';
import { collection, query, getDocs, where, orderBy, onSnapshot } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { getPharmacyId } from '@/lib/db';
import { saveAs } from 'file-saver';
import * as XLSX from 'xlsx';

const STATUS_OPTIONS = ['fulfilled', 'processing', 'cancelled', 'shipped', 'completed', 'placed'];

function formatDate(date) {
  if (!date) return '';
  if (typeof date.toDate === 'function') date = date.toDate();
  return date.toLocaleString();
}

function ordersToCSV(orders) {
  const headers = [
    'Order ID', 'Date', 'Customer', 'Phone', 'Total', 'Payment Method', 'Payment Ref', 'Paid', 'Status', 'Items'
  ];
  const rows = orders.map(o => [
    o.id,
    formatDate(o.createdAt),
    o.customerName || o.customerId || '',
    o.phone || o.customerPhone || '-',
    o.total,
    o.paymentMethod === 'transfer' ? 'Online Transfer' : 'Pay on Delivery',
    o.paymentRef || '',
    o.paid ? 'Yes' : 'No',
    o.status || '',
    (o.items || []).map(i => `${i.name || i.productId} x${i.quantity || i.qty || 1}`).join('; ')
  ]);
  return [headers, ...rows].map(r => r.map(f => `"${String(f).replace(/"/g, '""')}"`).join(',')).join('\n');
}

function ordersToXLSX(orders) {
  const headers = [
    'Order ID', 'Date', 'Customer', 'Phone', 'Total', 'Payment Method', 'Payment Ref', 'Paid', 'Status', 'Items'
  ];
  const rows = orders.map(o => [
    o.id,
    formatDate(o.createdAt),
    o.customerName || o.customerId || '',
    o.phone || o.customerPhone || '-',
    o.total,
    o.paymentMethod === 'transfer' ? 'Online Transfer' : 'Pay on Delivery',
    o.paymentRef || '',
    o.paid ? 'Yes' : 'No',
    o.status || '',
    (o.items || []).map(i => `${i.name || i.productId} x${i.quantity || i.qty || 1}`).join('; ')
  ]);
  const ws = XLSX.utils.aoa_to_sheet([headers, ...rows]);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Orders');
  return XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
}

export default function PharmacyOrdersSection() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showAll, setShowAll] = useState(false);
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  useEffect(() => {
    // Subscribe to orders in real-time. Filter by pharmacyId so updates propagate immediately.
    let unsub = null;
    (async () => {
      setLoading(true);
      try {
        const pharmacyId = await getPharmacyId();
        const q = query(collection(db, 'orders'), where('pharmacyId', '==', pharmacyId), orderBy('createdAt', 'desc'));
        unsub = onSnapshot(q, (snap) => {
          const ordersData = snap.docs.map(d => {
            const data = d.data();
            return { id: d.id, ...data, items: Array.isArray(data.items) ? data.items : [] };
          });
          setOrders(ordersData);
          setLoading(false);
        }, (err) => {
          console.error('orders onSnapshot error:', err);
          setLoading(false);
        });
      } catch (e) {
        // Fallback: listen to all orders if pharmacyId cannot be resolved
        console.warn('Could not resolve pharmacyId for real-time orders subscription, falling back to all orders listener', e);
        const qAll = query(collection(db, 'orders'), orderBy('createdAt', 'desc'));
        unsub = onSnapshot(qAll, (snap) => {
          const ordersData = snap.docs.map(d => {
            const data = d.data();
            return { id: d.id, ...data, items: Array.isArray(data.items) ? data.items : [] };
          });
          setOrders(ordersData);
          setLoading(false);
        }, (err) => {
          console.error('orders fallback onSnapshot error:', err);
          setLoading(false);
        });
      }
    })();

    return () => {
      if (typeof unsub === 'function') unsub();
    };
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

  // Sort orders by createdAt descending
  const sortedOrders = [...orders].sort((a, b) => {
    const aTime = a.createdAt?.toDate ? a.createdAt.toDate().getTime() : 0;
    const bTime = b.createdAt?.toDate ? b.createdAt.toDate().getTime() : 0;
    return bTime - aTime;
  });
  const visibleOrders = showAll ? sortedOrders : sortedOrders.slice(0, 3);

  // Date filtering for download
  const filteredForDownload = sortedOrders.filter(o => {
    const t = o.createdAt?.toDate ? o.createdAt.toDate().getTime() : 0;
    const from = dateFrom ? new Date(dateFrom).getTime() : null;
    const to = dateTo ? new Date(dateTo).getTime() : null;
    if (from && t < from) return false;
    if (to && t > to + 24*60*60*1000) return false; // include end day
    return true;
  });

  const handleDownload = (type = 'csv') => {
    if (type === 'xlsx') {
      const xlsxData = ordersToXLSX(filteredForDownload);
      const blob = new Blob([xlsxData], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      saveAs(blob, 'orders.xlsx');
    } else {
      const csv = ordersToCSV(filteredForDownload);
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      saveAs(blob, 'orders.csv');
    }
  };

  if (loading) return <div className="text-center text-zinc-400">Loading orders...</div>;
  if (!orders.length) return <div className="text-center text-zinc-400">No orders found.</div>;

  return (
    <div className="mt-10">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-bold text-black">Orders</h2>
        {orders.length > 3 && (
          <button
            className="text-xs text-brand-primary underline"
            onClick={() => setShowAll(a => !a)}
          >
            {showAll ? 'See less' : 'See more'}
          </button>
        )}
      </div>
      <div className="space-y-4">
        {visibleOrders.map(order => (
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
            <div className="mb-2 text-sm">
              <b>Payment Method:</b> {order.paymentMethod === 'transfer' ? 'Online Transfer' : 'Pay on Delivery'}
              {order.paymentRef && (
                <span className="ml-2"><b>Ref:</b> {order.paymentRef}</span>
              )}
            </div>
            <div className="mb-2 text-sm">
              <b>Status:</b> <span className="font-semibold">{order.paid ? 'Paid' : 'Unpaid'}</span>
              {!order.paid && (
                <button
                  className="ml-3 px-2 py-1 rounded bg-green-600 text-white text-xs font-semibold"
                  onClick={async () => {
                    await updateOrderPaid(order.id);
                    setOrders(orders => orders.map(o => o.id === order.id ? { ...o, paid: true } : o));
                  }}
                >Mark as Paid</button>
              )}
            </div>
            <div className="mb-2 text-sm">
              <b>Delivery Address:</b> {order.address || order.deliveryAddress || '-'}
            </div>
            <div className="mb-2 text-sm">
              <b>Phone Number:</b> {order.phone || order.customerPhone || '-'}
            </div>
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
            {orders.length > 3 && (
        <div className="mt-2 flex justify-start">
          <button
            className="text-xs text-brand-primary underline"
            onClick={() => setShowAll(a => !a)}
          >
            {showAll ? 'See less' : 'See more'}
          </button>
        </div>
      )}
      {/* Download and filter controls moved below orders */}
      <div className="flex flex-wrap gap-2 mt-6 mb-4 items-end">
        <div>
          <label className="block text-xs font-medium mb-1">From</label>
          <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} className="border rounded px-2 py-1 text-xs" />
        </div>
        <div>
          <label className="block text-xs font-medium mb-1">To</label>
          <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} className="border rounded px-2 py-1 text-xs" />
        </div>
        <button
          className="px-4 py-2 justify-left block rounded bg-brand-primary text-white text-xs font-semibold shadow hover:bg-brand-primary/90"
          onClick={() => handleDownload('csv')}
        >
          Download Orders (CSV)
        </button>
        <button
          className="px-4 py-2 justify-left rounded bg-green-700 text-white text-xs font-semibold shadow hover:bg-green-800"
          onClick={() => handleDownload('xlsx')}
        >
          Download Orders (XLSX)
        </button>
      </div>

    </div>
  );
}
