import React, { useEffect, useState } from 'react';
import { db } from '@/lib/firebase';
import { collection, addDoc, getDocs, deleteDoc, doc } from 'firebase/firestore';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

export default function ProductManager() {
  const [products, setProducts] = useState([]);
  const [name, setName] = useState('');
  const [price, setPrice] = useState('');
  const [image, setImage] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    async function fetchProducts() {
      const snap = await getDocs(collection(db, 'products'));
      setProducts(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    }
    fetchProducts();
  }, [loading]);

  const addProduct = async (e) => {
    e.preventDefault();
    setLoading(true);
    await addDoc(collection(db, 'products'), {
      name,
      price: Number(price),
      image,
      createdAt: new Date(),
      // Optionally add pharmacyId if you want to restrict
    });
    setName('');
    setPrice('');
    setImage('');
    setLoading(false);
  };

  const removeProduct = async (id) => {
    setLoading(true);
    await deleteDoc(doc(db, 'products', id));
    setLoading(false);
  };

  return (
    <div className="max-w-xl mx-auto py-8">
      <h2 className="text-2xl font-bold mb-4 text-brand-primary">Product Management</h2>
      <form onSubmit={addProduct} className="flex flex-col gap-3 mb-8">
        <Input placeholder="Product name" value={name} onChange={e => setName(e.target.value)} required />
        <Input placeholder="Price" type="number" value={price} onChange={e => setPrice(e.target.value)} required />
        <Input placeholder="Image URL" value={image} onChange={e => setImage(e.target.value)} />
        <Button type="submit" disabled={loading} className="bg-brand-primary text-white">{loading ? 'Adding...' : 'Add Product'}</Button>
      </form>
      <div className="space-y-4">
        {products.map(p => (
          <div key={p.id} className="flex items-center justify-between border rounded-lg p-3 bg-white shadow-sm">
            <div>
              <div className="font-semibold text-brand-primary">{p.name}</div>
              <div className="text-brand-accent">₦{Number(p.price).toLocaleString()}</div>
            </div>
            <div className="flex items-center gap-2">
              {p.image && <img src={p.image} alt="" className="h-10 w-10 object-cover rounded" />}
              <Button size="sm" variant="destructive" onClick={() => removeProduct(p.id)} disabled={loading}>Delete</Button>
            </div>
          </div>
        ))}
        {products.length === 0 && <div className="text-zinc-400 text-center">No products yet.</div>}
      </div>
    </div>
  );
}
