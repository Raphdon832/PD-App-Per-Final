import React, { useState } from 'react';

export default function DashboardSearchModal({ open, onClose, products, orders, onEditProduct }) {
  const [query, setQuery] = useState('');
  const [tab, setTab] = useState('products');

  const filteredProducts = products.filter(p =>
    p.name.toLowerCase().includes(query.toLowerCase()) ||
    (p.sku && p.sku.toLowerCase().includes(query.toLowerCase()))
  );
  const filteredOrders = orders.filter(o =>
    o.id.toLowerCase().includes(query.toLowerCase()) ||
    (o.customerName && o.customerName.toLowerCase().includes(query.toLowerCase())) ||
    (o.items && o.items.some(i => i.name && i.name.toLowerCase().includes(query.toLowerCase())))
  );

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-2xl shadow-lg max-w-lg w-full p-6 relative">
        <button className="absolute top-3 right-3 text-zinc-400 hover:text-zinc-700" onClick={onClose}>&times;</button>
        <div className="mb-4 flex gap-2">
          <button className={`px-3 py-1 rounded ${tab==='products'?'bg-green-600 text-white':'bg-zinc-100 text-zinc-700'}`} onClick={()=>setTab('products')}>Products</button>
          <button className={`px-3 py-1 rounded ${tab==='orders'?'bg-green-600 text-white':'bg-zinc-100 text-zinc-700'}`} onClick={()=>setTab('orders')}>Orders</button>
        </div>
        <input
          autoFocus
          className="w-full border rounded px-3 py-2 mb-4"
          placeholder={`Search ${tab}...`}
          value={query}
          onChange={e => setQuery(e.target.value)}
        />
        {tab === 'products' ? (
          <div className="max-h-60 overflow-y-auto">
            {filteredProducts.length === 0 && <div className="text-zinc-400 text-sm">No products found.</div>}
            {filteredProducts.map(product => (
              <div key={product.id} className="p-2 border-b flex items-center justify-between hover:bg-green-50 cursor-pointer" onClick={()=>{onEditProduct(product);onClose();}}>
                <div>
                  <div className="font-semibold text-zinc-800">{product.name}</div>
                  <div className="text-xs text-zinc-500">SKU: {product.sku || '-'}</div>
                </div>
                <div className="text-green-700 font-bold text-sm">₦{Number(product.price).toLocaleString()}</div>
              </div>
            ))}
          </div>
        ) : (
          <div className="max-h-60 overflow-y-auto">
            {filteredOrders.length === 0 && <div className="text-zinc-400 text-sm">No orders found.</div>}
            {filteredOrders.map(order => (
              <div key={order.id} className="p-2 border-b hover:bg-green-50 cursor-pointer">
                <div className="font-semibold text-zinc-800">Order #{order.id.slice(0,8)}</div>
                <div className="text-xs text-zinc-500">Customer: {order.customerName || order.customerId || '-'}</div>
                <div className="text-xs text-zinc-500">Items: {(order.items||[]).map(i=>i.name).join(', ')}</div>
                <div className="text-xs text-zinc-500">Status: {order.status}</div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
