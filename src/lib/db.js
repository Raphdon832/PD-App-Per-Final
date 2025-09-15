// src/lib/db.js
import { db } from './firebase';
import {
  collection, query, orderBy, addDoc, doc, getDoc, getDocs, setDoc, updateDoc,
  deleteDoc, onSnapshot, serverTimestamp, writeBatch, increment, limit, runTransaction, startAfter
} from 'firebase/firestore';

// Helper to get the single pharmacy's ID from config/app
export const getPharmacyId = async () => {
  const cfg = await getDoc(doc(db, 'config', 'app'));
  if (!cfg.exists()) throw new Error('Pharmacy config missing');
  return cfg.data().pharmacyId || cfg.data().activePharmacyId || cfg.data().id;
};

/* -----------------------------
   PRODUCTS / CART / ORDERS (single-pharmacy model)
----------------------------------*/
export const listenProducts = (cb, pageSize = 50) => {
  const base = collection(db, 'products');
  const qy = query(base, orderBy('createdAt', 'desc'), limit(pageSize));
  return onSnapshot(qy,
    s => cb(s.docs.map(d => ({ id: d.id, ...d.data() }))),
    e => console.error('listenProducts error:', e)
  );
};

export const addProduct = async (data) => {
  const ref = collection(db, 'products');
  await addDoc(ref, { ...data, createdAt: serverTimestamp() });
};

export const bulkAddProducts = async (rows) => {
  const batch = writeBatch(db);
  rows.forEach((r) => {
    const ref = doc(collection(db, 'products'));
    batch.set(ref, {
      ...r,
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
 * - total: number
 *
 * Reads happen first (inside tx): product docs.
 * Writes happen second (inside tx): stock decrements + order doc.
 * Cart clearing happens AFTER tx (outside) in a separate batch.
 */
export const placeOrder = async ({ customerId, items, total }) => {
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
      items: snapshotItems,
      total: Number(total || 0),
      status: 'placed',
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      paymentMethod: arguments[0]?.paymentMethod || 'delivery',
      paymentRef: arguments[0]?.paymentRef || '',
      paid: arguments[0]?.paid || false
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
 * Fetch a page of products, ordered by createdAt descending.
 * @param {number} pageSize - Number of products per page
 * @param {object} [lastDoc] - The last document from the previous page (for pagination)
 * @returns { products, lastDoc } - Array of products and the last doc snapshot
 */
export const fetchProductsPage = async (pageSize = 20, lastDoc = null) => {
  let q = query(
    collection(db, 'products'),
    orderBy('createdAt', 'desc'),
    limit(pageSize)
  );
  if (lastDoc) {
    q = query(
      collection(db, 'products'),
      orderBy('createdAt', 'desc'),
      startAfter(lastDoc),
      limit(pageSize)
    );
  }
  const snap = await getDocs(q);
  const products = snap.docs.map(d => ({ id: d.id, ...d.data() }));
  return {
    products,
    lastDoc: snap.docs.length > 0 ? snap.docs[snap.docs.length - 1] : null
  };
};
