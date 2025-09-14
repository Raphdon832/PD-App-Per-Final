// src/lib/orders-view.js
import { collection, getDocs, query, where } from 'firebase/firestore';
import { db } from '@/lib/firebase';

// Firestore 'in' supports up to 10 ids; chunk if needed.
async function fetchProductsMap(ids) {
  const m = new Map();
  for (let i = 0; i < ids.length; i += 10) {
    const slice = ids.slice(i, i + 10);
    const q = query(collection(db, 'products'), where('__name__', 'in', slice));
    const snap = await getDocs(q);
    snap.forEach(d => m.set(d.id, d.data()));
  }
  return m;
}

/** Ensure every item has a display name (uses snapshot if present, else joins on read) */
export async function ensureItemNames(order) {
  const needsJoin = !Array.isArray(order?.items) || order.items.some(i => !i?.name);
  if (!needsJoin) return order;

  const ids = order.items.map(i => i.productId).filter(Boolean);
  if (!ids.length) return order;

  const map = await fetchProductsMap(ids);
  const items = order.items.map(it => ({
    ...it,
    name: it.name || map.get(it.productId)?.name || '(unknown)',
    priceAtOrder:
      it.priceAtOrder ?? map.get(it.productId)?.price ?? null,
    imageUrl: it.imageUrl ?? map.get(it.productId)?.imageUrl ?? null
  }));
  return { ...order, items };
}