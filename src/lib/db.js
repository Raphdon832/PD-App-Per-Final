// src/lib/db.js
import { db } from './firebase';
import {
  collection, query, where, orderBy, addDoc, doc, getDoc, getDocs, setDoc, updateDoc,
  deleteDoc, onSnapshot, serverTimestamp, writeBatch, increment, limit, runTransaction
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
export const listenProducts = (cb, pharmacyId = null, pageSize = 50) => {
  const base = collection(db, 'products');
  const qy = pharmacyId
    ? query(base, where('pharmacyId', '==', pharmacyId), orderBy('createdAt', 'desc'), limit(pageSize))
    : query(base, orderBy('createdAt', 'desc'), limit(pageSize));
  return onSnapshot(qy,
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
  const ref = doc(db, 'users', uid, 'cart', productId);
  await setDoc(ref, { productId, qty: increment(qty) }, { merge: true });
};
export const listenCart = (uid, cb) =>
  onSnapshot(collection(db, 'users', uid, 'cart'),
    s => cb(s.docs.map(d => ({ id: d.id, ...d.data() }))),
    e => console.error('listenCart error:', e)
  );
export const removeFromCart = (uid, itemId) => deleteDoc(doc(db, 'users', uid, 'cart', itemId));

/**
 * placeOrder
 * - items: [{ productId, quantity }]
 * - customerId: string
 * - pharmacyId: string
 * - total: number
 *
 * Reads happen first (inside tx): product docs.
 * Writes happen second (inside tx): stock decrements + order doc.
 * Cart clearing happens AFTER tx (outside) in a separate batch.
 */
export const placeOrder = async ({ customerId, pharmacyId, items, total }) => {
  // Normalize incoming items early
  const normalized = (items || []).map(it => ({
    productId: String(it.productId || it.id),
    quantity: Number(it.quantity ?? it.qty ?? 0)
  })).filter(it => it.productId && it.quantity > 0);

  if (normalized.length === 0) throw new Error('No valid items to order.');

  // Build product refs once
  const productRefs = normalized.map(it => doc(db, 'products', it.productId));

  // TRANSACTION
  const result = await runTransaction(db, async (tx) => {
    // ----- READS (must be before any writes)
    const productSnaps = await Promise.all(productRefs.map(ref => tx.get(ref)));

    // Validate stock and prepare snapshot items
    const snapshotItems = [];
    for (let i = 0; i < normalized.length; i++) {
      const it = normalized[i];
      const snap = productSnaps[i];
      if (!snap.exists()) throw new Error('Product not found: ' + it.productId);
      const p = snap.data();

      const stock = Number(p.stock || 0);
      const qty = Number(it.quantity || 0);
      if (qty <= 0) throw new Error('Invalid quantity for ' + it.productId);
      if (stock < qty) throw new Error(`Insufficient stock for ${p.name || it.productId}`);

      snapshotItems.push({
        productId: productRefs[i].id,
        name: String(p.name || ''),
        priceAtOrder: Number(p.price || 0),
        quantity: qty,
        imageUrl: p.imageUrl || null
      });
    }

    // ----- WRITES (must be after reads; no new reads below)
    // 1) decrement stock / increment sold
    for (let i = 0; i < normalized.length; i++) {
      const qty = normalized[i].quantity;
      tx.update(productRefs[i], {
        stock: increment(-qty),
        sold: increment(qty)
      });
    }

    // 2) create order
    const orderRef = doc(collection(db, 'orders'));
    tx.set(orderRef, {
      customerId,
      pharmacyId,
      items: snapshotItems,
      total: Number(total || 0),
      status: 'placed',
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });

    return { orderId: orderRef.id };
  });

  // AFTER the transaction: clear cart in a separate batch (no reads after writes in tx)
  try {
    const cartCol = collection(db, 'users', customerId, 'cart');
    const cartSnap = await getDocs(cartCol);
    if (!cartSnap.empty) {
      const batch = writeBatch(db);
      cartSnap.forEach(docSnap => batch.delete(docSnap.ref));
      await batch.commit();
    }
  } catch (e) {
    // Non-fatal: order is placed; cart clear failed. You can toast a warning or retry.
    console.warn('Cart clear failed after order placement:', e);
  }

  return result; // { orderId }
};

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
};

/**
 * items: [{ productId, quantity }]
 * Saves order with item snapshots: { productId, name, priceAtOrder, quantity, imageUrl? }
 */
export const placeOrderWithSnapshot = async ({ customerId, pharmacyId, items, total }) => {
  return await runTransaction(db, async (tx) => {
    // Build refs & fetch product docs (read inside transaction)
    const productRefs = items.map(it => doc(db, 'products', it.productId));
    const productSnaps = await Promise.all(productRefs.map(ref => tx.get(ref)));

    // Validate, collect snapshots, and decrement stock
    const snapshotItems = [];
    for (let i = 0; i < items.length; i++) {
      const it = items[i];
      const snap = productSnaps[i];
      if (!snap.exists()) throw new Error('Product not found');

      const p = snap.data();
      const stock = Number(p.stock || 0);
      const qty = Number(items[i].quantity || items[i].qty || 0);
      if (qty <= 0) throw new Error('Invalid quantity');
      if (stock < qty) throw new Error(`Insufficient stock for ${p.name || it.productId}`);

      // decrement stock & bump sold
      tx.update(productRefs[i], {
        stock: stock - qty,
        sold: increment(qty)
      });

      snapshotItems.push({
        productId: productRefs[i].id,
        name: String(p.name || ''),
        priceAtOrder: Number(p.price || 0),
        quantity: qty,
        imageUrl: p.imageUrl || null
      });
    }

    // Write order (use your own doc id if needed)
    const orderRef = doc(collection(db, 'orders'));
    tx.set(orderRef, {
      customerId,
      pharmacyId,
      items: snapshotItems,
      total: Number(total || 0),
      status: 'placed',
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });

    // Optionally clear cart (if you store user carts)
    const cartSnap = await getDocs(collection(db, 'users', customerId, 'cart'));
    cartSnap.forEach(c => tx.delete(c.ref));

    return { id: orderRef.id };
  });
};
