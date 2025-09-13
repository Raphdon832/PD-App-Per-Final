// src/lib/db.js
import { db } from './firebase';
import {
  collection, query, where, orderBy, addDoc, doc, getDoc, getDocs, setDoc, updateDoc,
  deleteDoc, onSnapshot, serverTimestamp, writeBatch, increment, limit
} from 'firebase/firestore';

// For single-pharmacy, use the actual pharmacy UID
export const PHARMACY_UID = 'qYk8CMeTLMNPMtSQCwKZi73jIpo1';

/* -----------------------------
   PHARMACIES (needed by Home.jsx)
----------------------------------*/
export const getAllPharmacies = async () => {
  const snap = await getDocs(collection(db, 'pharmacies'));
  const pharmacies = await Promise.all(snap.docs.map(async d => {
    const data = { id: d.id, ...d.data() };
    // Prefer lat/lon fields if present
    if (data.lat && data.lon) {
      data.coordinates = { latitude: Number(data.lat), longitude: Number(data.lon) };
    } else if (data.address) {
      // Fallback: geocode address (OpenStreetMap)
      try {
        const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(data.address)}&limit=1`);
        const geo = await res.json();
        if (geo && geo[0]) {
          data.coordinates = { latitude: Number(geo[0].lat), longitude: Number(geo[0].lon) };
        }
      } catch {}
    }
    return data;
  }));
  return pharmacies;
};

/* -----------------------------
   PRODUCTS / CART / ORDERS (unchanged)
----------------------------------*/
export const listenProducts = (cb, pharmacyId = null) => {
  const base = collection(db, 'products');
  const q = pharmacyId
    ? query(base, where('pharmacyId', '==', pharmacyId), orderBy('createdAt', 'desc'))
    : query(base, orderBy('createdAt', 'desc'));
  return onSnapshot(
    q,
    s => cb(s.docs.map(d => ({ id: d.id, ...d.data() }))),
    e => console.error('listenProducts error:', e)
  );
};

export const addProduct = async (data) => {
  const ref = collection(db, 'products');
  await addDoc(ref, { ...data, createdAt: serverTimestamp() });
};

export const bulkAddProducts = async (rows, pharmacyId) => {
  const batch = writeBatch(db);
  rows.forEach((r) => {
    const ref = doc(collection(db, 'products'));
    batch.set(ref, {
      ...r,
      pharmacyId,
      price: Number(r.price),
      stock: Number(r.stock || 0),
      createdAt: serverTimestamp()
    });
  });
  await batch.commit();
};

export const removeProduct = (id) => deleteDoc(doc(db, 'products', id));

export const addToCart = async (uid, productId, qty = 1) => {
  const ref = doc(collection(db, 'users', uid, 'cart'));
  await setDoc(ref, { productId, qty });
};
export const listenCart = (uid, cb) =>
  onSnapshot(collection(db, 'users', uid, 'cart'),
    s => cb(s.docs.map(d => ({ id: d.id, ...d.data() }))),
    e => console.error('listenCart error:', e)
  );
export const removeFromCart = (uid, itemId) => deleteDoc(doc(db, 'users', uid, 'cart', itemId));

export const placeOrder = async ({ customerId, pharmacyId, items, total }) =>
  addDoc(collection(db, 'orders'), { customerId, pharmacyId, items, total, createdAt: serverTimestamp() });

export const listenOrders = (uid, cb) => {
  const q = query(collection(db, 'orders'), where('customerId', '==', uid), orderBy('createdAt', 'desc'));
  return onSnapshot(
    q,
    s => cb(s.docs.map(d => ({ id: d.id, ...d.data() }))),
    e => console.error('listenOrders error:', e)
  );
};

/**
 * Get the top N best-selling products for the current pharmacy, sorted by sold count (desc), then dateAdded (desc).
 * Assumes products have { id, name, pharmacyId, dateAdded } and orders have { items: [{ productId, quantity }], pharmacyId }
 */
export const getBestSellingProducts = async (limitCount = 5, pharmacyId) => {
  if (!pharmacyId) return [];
  // 1. Get all products for this pharmacy
  const productsSnap = await getDocs(query(collection(db, 'products'), where('pharmacyId', '==', pharmacyId)));
  const products = productsSnap.docs.map(d => ({ id: d.id, ...d.data() }));
  if (products.length === 0) return [];

  // 2. Get all orders for this pharmacy
  const ordersSnap = await getDocs(query(collection(db, 'orders'), where('pharmacyId', '==', pharmacyId)));
  const salesMap = {};
  ordersSnap.forEach(orderDoc => {
    const order = orderDoc.data();
    (order.items || []).forEach(item => {
      if (!salesMap[item.productId]) salesMap[item.productId] = 0;
      salesMap[item.productId] += item.quantity || 1;
    });
  });

  // 3. Merge sales count into products
  const productsWithSales = products.map(p => ({
    ...p,
    sold: salesMap[p.id] || 0
  }));

  // 4. Sort by sold desc, then dateAdded desc
  productsWithSales.sort((a, b) => {
    if (b.sold !== a.sold) return b.sold - a.sold;
    return (b.dateAdded?.toMillis?.() || 0) - (a.dateAdded?.toMillis?.() || 0);
  });

  // 5. Return top N
  return productsWithSales.slice(0, limitCount).map(p => ({
    id: p.id,
    name: p.name,
    sold: p.sold,
    dateAdded: p.dateAdded
  }));
}
