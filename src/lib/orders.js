// src/lib/orders.js
import {
  doc, getDoc, runTransaction, updateDoc,
  serverTimestamp, increment, addDoc, collection, writeBatch, getDocs
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

    // Validate stock
    for (let i = 0; i < items.length; i++) {
      const it = items[i];
      const pSnap = productSnaps[i];
      if (!pSnap.exists()) throw new Error(`Product not found: ${it.productId}`);
      const p = pSnap.data();
      const stock = Number(p.stock || 0);
      const qty = Number(it.quantity ?? it.qty ?? 0);
      if (qty <= 0) throw new Error(`Invalid qty for ${it.productId}`);
      if (stock < qty) throw new Error(`Insufficient stock for ${p.name || it.productId}`);
    }

    /* -------- WRITES (only after all reads) -------- */
    // Decrement stock / increment sold
    for (let i = 0; i < items.length; i++) {
      const it = items[i];
      const ref = productRefs[i];
      tx.update(ref, {
        stock: increment(-Number(it.quantity ?? it.qty ?? 0)),
        sold: increment(Number(it.quantity ?? it.qty ?? 0))
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
export async function checkoutAsCustomer({ user, pharmacyId, cartItems }) {
  if (!user?.uid) throw new Error('Not signed in');

  const items = (cartItems || [])
    .map(it => ({
      productId: String(it.id || ''),
      name: String(it.name || ''),          // <-- snapshot for display
      priceAtOrder: Number(it.price || 0),  // <-- snapshot for history
      imageUrl: it.imageUrl || null,        // <-- optional
      quantity: Number(it.qty || it.quantity || 0),
    }))
    .filter(it => it.productId && it.quantity > 0);

  if (!items.length) throw new Error('Cart is empty');

  const total = items.reduce((s, it) => s + it.priceAtOrder * it.quantity, 0);

  const orderRef = await addDoc(collection(db, 'orders'), {
    customerId: user.uid,
    pharmacyId: String(pharmacyId),
    items,
    total,
    status: 'placed',
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });

  // clear cart (batch)
  const snap = await getDocs(collection(db, 'users', user.uid, 'cart'));
  if (!snap.empty) {
    const batch = writeBatch(db);
    snap.forEach(d => batch.delete(d.ref));
    await batch.commit();
  }

  return { orderId: orderRef.id };
}

export async function updateOrderPaid(orderId) {
  await updateDoc(doc(db, 'orders', orderId), { paid: true });
}