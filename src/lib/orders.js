// src/lib/orders.js
import {
  doc,
  getDoc,
  runTransaction,
  updateDoc,
  serverTimestamp,
  increment,
  addDoc,
  collection,
  writeBatch,
  getDocs
} from 'firebase/firestore';
import { db } from '@/lib/firebase';

// Idempotent: if stockProcessed is already true, it won't double-decrement.
export async function processOrderAndReserveStock(orderId) {
  const orderRef = doc(db, 'orders', orderId);

  await runTransaction(db, async (tx) => {
    /* -------- READS (all reads happen first) -------- */
    const orderSnap = await tx.get(orderRef);
    if (!orderSnap.exists()) throw new Error('Order not found');
    const order = orderSnap.data();

    if (order.stockProcessed === true) {
      // Already reserved; ensure status is at least processing and exit
      tx.update(orderRef, {
        status: 'processing',
        updatedAt: serverTimestamp()
      });
      return;
    }
    if (order.status !== 'placed') {
      throw new Error('Order must be in "placed" status to reserve stock.');
    }

    const items = Array.isArray(order.items) ? order.items : [];
    if (items.length === 0) throw new Error('Order has no items.');

    // Preload product snapshots (reads) BEFORE any writes
    const productRefs = items.map(it => doc(db, 'products', String(it.productId)));
    const productSnaps = [];
    for (const ref of productRefs) {
      productSnaps.push(await tx.get(ref)); // READ
    }

    // debug store (inspect from console after failure)
    if (typeof window !== 'undefined') {
      window.orderReserveDebug = window.orderReserveDebug || [];
    }

    // Validate stock with stricter checks and clearer error messages
    for (let i = 0; i < items.length; i++) {
      const it = items[i];
      const pSnap = productSnaps[i];
      if (!pSnap.exists()) {
        const msg = `Product not found: ${it.productId}`;
        if (typeof window !== 'undefined') window.orderReserveDebug.push({ orderId, item: it, error: msg, time: Date.now() });
        throw new Error(msg);
      }
      const p = pSnap.data();

      const stockRaw = p.stock;
      const stock = Number(stockRaw);
      const qty = Number(it.quantity ?? it.qty ?? 0);

      // record debug
      if (typeof window !== 'undefined') {
        window.orderReserveDebug.push({
          orderId,
          productId: it.productId,
          productName: p.name || null,
          stockRaw,
          stock,
          requestedRaw: it.quantity ?? it.qty,
          requested: qty,
          time: Date.now()
        });
      }

      if (!Number.isFinite(stock)) {
        throw new Error(`Invalid stock value for ${it.productId} (${p.name || ''}): ${String(stockRaw)}`);
      }
      if (!Number.isFinite(qty) || qty <= 0) {
        throw new Error(`Invalid requested qty for ${it.productId}: ${String(it.quantity ?? it.qty)}`);
      }
      if (stock < qty) {
        throw new Error(`Insufficient stock for ${p.name || it.productId} (id:${it.productId}) — stock=${stock}, requested=${qty}`);
      }
    }

    /* -------- WRITES (only after all reads) -------- */
    // Decrement stock / increment sold (use computed new values to be explicit)
    for (let i = 0; i < items.length; i++) {
      const it = items[i];
      const ref = productRefs[i];
      const pSnap = productSnaps[i];
      const p = pSnap.data();

      const stock = Number(p.stock || 0);
      const qty = Number(it.quantity ?? it.qty ?? 0);
      const newStock = stock - qty;
      const newSold = Number(p.sold || 0) + qty;

      tx.update(ref, {
        stock: newStock,
        sold: newSold
      });
    }

    // Mark reserved & advance status
    tx.update(orderRef, {
      stockProcessed: true,
      status: 'processing',
      updatedAt: serverTimestamp()
    });
  });
}

export async function updateOrderStatus(orderId, nextStatus) {
  const status = String(nextStatus || '').trim();
  const allowed = ['placed','processing','shipped','completed','cancelled'];
  if (!allowed.includes(status)) throw new Error('Invalid status');

  // If moving to processing, reserve stock first
  if (status === 'processing') {
    await processOrderAndReserveStock(orderId);
    // processOrderAndReserveStock already sets status to 'processing'
    return;
  }

  // For other status changes, just update status
  await updateDoc(doc(db, 'orders', orderId), {
    status,
    updatedAt: serverTimestamp()
  });
}

/**
 * cartItems: [{ id, name, price, imageUrl?, qty }]
 * user: firebase user (must be signed in)
 * pharmacyId: string
 */
export async function checkoutAsCustomer({ user, pharmacyId, cartItems, address, phone }) {
  if (!user?.uid) throw new Error('Not signed in');

  const items = (cartItems || [])
    .map(it => ({
      productId: String(it.id || ''),
      name: String(it.name || ''),          // snapshot for history
      priceAtOrder: Number(it.price || 0),
      imageUrl: it.imageUrl || null,
      quantity: Number(it.qty || it.quantity || 0),
    }))
    .filter(it => it.productId && it.quantity > 0);

  if (!items.length) throw new Error('Cart is empty');

  const total = items.reduce((s, it) => s + it.priceAtOrder * it.quantity, 0);

  // Create order document only. Do NOT decrement product stock here.
  const orderRef = await addDoc(collection(db, 'orders'), {
    customerId: user.uid,
    pharmacyId: String(pharmacyId),
    items: items.map(i => ({
      productId: i.productId,
      quantity: Number(i.quantity),
      price: Number(i.priceAtOrder),
      name: i.name,
      imageUrl: i.imageUrl
    })),
    total,
    address: address || '',
    phone: phone || '',
    status: 'placed',
    stockProcessed: false, // will be set true by pharmacy when reserving stock
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });

  // clear cart after successful order creation (best-effort)
  try {
    const snap = await getDocs(collection(db, 'users', user.uid, 'cart'));
    if (!snap.empty) {
      const batch = writeBatch(db);
      snap.forEach(d => batch.delete(d.ref));
      await batch.commit();
    }
  } catch (e) {
    console.error('Failed to clear cart after checkout', e);
  }

  return { orderId: orderRef.id };
}

export async function updateOrderPaid(orderId) {
  await updateDoc(doc(db, 'orders', orderId), { paid: true });
}

// atomic decrement
export async function decrementProductStock(productId, qty = 1) {
  if (!productId) throw new Error('productId required');
  const q = Number(qty) || 0;
  if (q <= 0) throw new Error('invalid qty');
  // atomic update
  await updateDoc(doc(db, 'products', productId), { stock: increment(-q) });
}

/**
 * Create an order and decrement stock atomically.
 * items = [{ productId, quantity, price }, ...]
 * returns created order id
 */
export async function createOrderWithStockCheck(userId, items = [], orderMeta = {}) {
  if (!userId) throw new Error('userId required');
  if (!items.length) throw new Error('no items');

  return await runTransaction(db, async (tx) => {
    const productUpdates = [];

    for (const it of items) {
      const pRef = doc(db, 'products', it.productId);
      const pSnap = await tx.get(pRef);
      if (!pSnap.exists()) throw new Error(`Product ${it.productId} not found`);
      const stockRaw = pSnap.data().stock;
      const stock = Number(stockRaw ?? 0);
      if (stock < it.quantity) throw new Error(`Insufficient stock for ${it.productId}`);
      productUpdates.push({ ref: pRef, newStock: stock - it.quantity });
    }

    // create order doc in transaction
    const ordersCol = collection(db, 'orders');
    const orderRef = doc(ordersCol); // new doc ref
    tx.set(orderRef, {
      userId,
      items: items.map(i => ({ productId: i.productId, quantity: Number(i.quantity), price: Number(i.price) })),
      status: 'placed',
      createdAt: serverTimestamp(),
      ...orderMeta
    });

    // apply stock updates
    for (const u of productUpdates) {
      tx.update(u.ref, { stock: u.newStock });
    }

    return orderRef.id;
  });
}