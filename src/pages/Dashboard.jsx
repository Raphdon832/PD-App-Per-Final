import React, { useEffect, useState } from 'react';
import { useAuth } from '../lib/auth';
import AddProductModal from '@/components/AddProductModal';
import BulkUploadModal from '@/components/BulkUploadModal';
import LoadingSkeleton from '@/components/LoadingSkeleton';
import ProductEditModal from '@/components/ProductEditModal';
import PharmacyOrdersSection from '@/components/PharmacyOrdersSection';
import ProfileCompletionModal from '@/components/ProfileCompletionModal';
import DashboardSearchModal from '@/components/DashboardSearchModal';

import { collection, query, where, getDocs, updateDoc, doc, deleteDoc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';

export default function Dashboard() {
  const [loading, setLoading] = useState(true);
  const { profile } = useAuth();
  const [showAdd, setShowAdd] = useState(false);
  const [showBulk, setShowBulk] = useState(false);
  const [totalProducts, setTotalProducts] = useState(0);
  const [totalOrders, setTotalOrders] = useState(0);
  const [products, setProducts] = useState([]);
  const [showEdit, setShowEdit] = useState(false);
  const [editProduct, setEditProduct] = useState(null);
  const [showAll, setShowAll] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const [orders, setOrders] = useState([]);
  const [whatsapp, setWhatsapp] = useState('');
  

  useEffect(() => {
    async function fetchStats() {
      setLoading(true);
      try {
        if (!profile || profile.role !== 'pharmacy') {
          setTotalProducts(0);
          setTotalOrders(0);
          setProducts([]);
          setOrders([]);
          setLoading(false);
          return;
        }
        // Debug: log profile info before queries
        console.log('Dashboard: profile.uid', profile.uid, 'profile.role', profile.role);
        // Total products
        const productsSnap = await getDocs(query(collection(db, 'products'), where('pharmacyId', '==', profile.uid)));
        setTotalProducts(productsSnap.size);
        setProducts(productsSnap.docs.map(d => ({ id: d.id, ...d.data() })));
        // Orders
        const ordersSnap = await getDocs(query(collection(db, 'orders'), where('pharmacyId', '==', profile.uid)));
        setTotalOrders(ordersSnap.size);
        setOrders(ordersSnap.docs.map(d => ({ id: d.id, ...d.data() })));
        setLoading(false);
      } catch (err) {
        setLoading(false);
        setProducts([]);
        setOrders([]);
        setTotalProducts(0);
        setTotalOrders(0);
        window.dashboardFetchError = err; // For debugging in console
        // Debug: log error and profile
        console.error('Dashboard Firestore error:', err, 'profile:', profile);
      }
    }
    fetchStats();
  }, [profile]);

  useEffect(() => {
    if (profile && profile.role === 'pharmacy' && (!profile.phone || profile.phone === '' || !profile.address || profile.address === '')) {
      setShowProfileModal(true);
    }
  }, [profile]);

  useEffect(() => {
    async function fetchWhatsapp() {
      try {
        const cfg = await getDoc(doc(db, 'config', 'app'));
        if (cfg.exists()) {
          setWhatsapp(cfg.data().whatsapp || '');
        }
      } catch (e) {
        setWhatsapp('');
      }
    }
    fetchWhatsapp();
  }, []);

  const handleEdit = (product) => {
    setEditProduct(product);
    setShowEdit(true);
  };

  const handleSave = async (updated) => {
    if (!updated.id) return;
    await updateDoc(doc(db, 'products', updated.id), updated);
    setProducts((prods) => prods.map(p => p.id === updated.id ? updated : p));
  };

  const handleDelete = async (product) => {
    if (!product.id) return;
    await deleteDoc(doc(db, 'products', product.id));
    setProducts((prods) => prods.filter(p => p.id !== product.id));
  };

  const handleProfileSave = async ({ phone, address }) => {
    // Update Firestore user doc and pharmacy doc
    await updateDoc(doc(db, 'users', profile.uid), { phone, address });
    await updateDoc(doc(db, 'pharmacies', profile.uid), { phone, address });
    setShowProfileModal(false);
    window.location.reload();
  };

  if (loading) {
    return <LoadingSkeleton lines={6} className="my-8" />;
  }

  // Error fallback for failed Firestore queries
  if (!profile || (profile.role === 'pharmacy' && products.length === 0 && totalProducts === 0)) {
    return (
      <div className="pt-10 pb-28 w-full max-w-md mx-auto px-4 min-h-screen flex flex-col items-center justify-center">
        <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-center">
          {window.dashboardFetchError ? (
            <>
              <div className="text-red-600 font-bold text-lg mb-2">Error loading dashboard</div>
              <div className="text-red-500 text-sm mb-2">{window.dashboardFetchError.message}</div>
            </>
          ) : (
            <div className="text-red-600 font-bold text-lg mb-2">Error loading dashboard</div>
          )}
          <div className="text-zinc-500 text-xs">Check your Firestore rules and ensure your user document has <code>role: 'pharmacy'</code> set.</div>
        </div>
      </div>
    );
  }

  return (
    <div className="pt-10 pb-28 w-full max-w-md md:max-w-2xl lg:max-w-4xl xl:max-w-6xl mx-auto px-0 sm:px-5 md:px-8 lg:px-12 xl:px-0 min-h-screen flex flex-col">
      <ProfileCompletionModal
        open={showProfileModal}
        onClose={() => {}}
        onSave={handleProfileSave}
        isPharmacy={true}
        initialPhone={profile?.phone || ''}
        initialAddress={profile?.address || ''}
      />
      <header className="sticky top-0 z-20 bg-white/90 backdrop-blur-md pb-2 pt-4 -mx-auto sm:-mx-5 md:-mx-8 lg:-mx-12 xl:-mx-0 px-4 sm:px-5 md:px-8 lg:px-12 xl:px-0">
        <h1 className="text-[28px] font-bold text-green-700 leading-none tracking-tight">Pharmacy Dashboard</h1>
      </header>
      <main className="flex-1 px-3 sm:px-4 py-8 flex flex-col items-center justify-start relative w-full">
        <div className="w-full max-w-md flex flex-col gap-6">
          {/* Stats Card */}
          <div className="bg-white rounded-2xl border border-green-200 shadow p-6 flex flex-col gap-4">
            <div className="flex items-center gap-4">
              <div className="flex-1 flex flex-col items-center">
                <span className="text-xs text-zinc-500 mb-1">Total Products</span>
                <span className="text-2xl font-bold text-green-600">{totalProducts}</span>
              </div>
              <div className="w-px h-10 bg-zinc-200" />
              <div className="flex-1 flex flex-col items-center">
                <span className="text-xs text-zinc-500 mb-1">Total Orders</span>
                <span className="text-2xl font-bold text-orange-500">{totalOrders}</span>
              </div>
            </div>
          </div>

          {/* Floating Edit WhatsApp Button */}
        

          {/* Add Products Section */}
          <div className="flex gap-2 w-full">
            <button
              className="flex-1 rounded-[5px] bg-green-600 text-white text-[13px] font-semibold py-2 shadow hover:bg-green-700 transition"
              onClick={() => setShowAdd(true)}
            >
              + Add Product
            </button>
            <button
              className="flex-1 rounded-[5px] border border-orange-500 text-orange-600 text-[13px] font-semibold py-2 hover:bg-orange-50 transition"
              onClick={() => setShowBulk(true)}
            >
              Bulk Upload
            </button>
          </div>
          {showAdd && <AddProductModal pharmacyId={profile?.uid} onClose={() => setShowAdd(false)} />}
          {showBulk && <BulkUploadModal pharmacyId={profile?.uid} onClose={() => setShowBulk(false)} />}
          {/* Inventory Section */}
          <div className="mt-6">
            <h2 className="text-lg font-semibold text-green-700 mb-2">Inventory</h2>
            <div className="flex flex-col gap-3">
              {(showAll ? products : products.slice(0, 3)).map(product => (
                <div key={product.id} className="bg-white border border-zinc-200 rounded-xl p-4 flex items-center gap-4 cursor-pointer hover:shadow transition" onClick={() => handleEdit(product)}>
                  <img src={product.image} alt={product.name} className="w-16 h-16 object-cover rounded-lg border" />
                  <div className="flex-1">
                    <div className="font-semibold text-zinc-800 text-[13px]">{product.name}</div>
                    <div className="text-xs text-zinc-500">SKU: {product.sku || '-'}</div>
                    <div className="text-xs text-zinc-500">Stock: {product.stock ?? '-'}</div>
                  </div>
                  <div className="text-orange-600 font-bold text-[13px]">₦{Number(product.price).toLocaleString()}</div>
                </div>
              ))}
            </div>
            {products.length > 3 && (
              <button className="mt-3 text-[13px] text-green-700 font-semibold hover:underline" onClick={() => setShowAll(v => !v)}>
                {showAll ? 'See less' : 'See more'}
              </button>
            )}
          </div>
          {products.length > 0 && (
            <button
              className="mt-4 w-full rounded-[5px] bg-orange-500 text-white text-[13px] font-semibold py-2 shadow hover:bg-orange-600 transition"
              onClick={() => {
                const headers = [
                  'S/N', 'Name', 'Price', 'Description', 'Image', 'Category', 'Stock', 'SKU'
                ];
                const rows = products.map((p, i) => [
                  i + 1,
                  p.name,
                  p.price,
                  p.description,
                  p.image,
                  p.category,
                  p.stock,
                  p.sku
                ]);
                const csv = [headers.join(','), ...rows.map(r => r.map(x => `"${(x ?? '').toString().replace(/"/g, '""')}"`).join(',')).join('\n')];
                const blob = new Blob([csv.join('\n')], { type: 'text/csv;charset=utf-8;' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url; a.download = 'pharmacy_inventory.csv'; a.click();
                URL.revokeObjectURL(url);
              }}
            >
              Download Inventory (CSV)
            </button>
          )}
          {/* Pharmacy Orders Section - placed after Download Inventory button */}
          <PharmacyOrdersSection pharmacyId={profile?.uid} />
          {showEdit && editProduct && (
            <ProductEditModal
              product={editProduct}
              onClose={() => setShowEdit(false)}
              onSave={handleSave}
              onDelete={handleDelete}
            />
          )}
          <div className="flex items-center gap-2 mt-2">
            <span className="text-sm text-zinc-600">WhatsApp for customers:</span>
            <span className="font-semibold text-green-700">{whatsapp || 'Not set'}</span>
          </div>
        </div>
        
        {/* Floating Search Button */}
        <button
          className="fixed bottom-40 right-8 z-50 bg-white border border-green-500 text-green-600 rounded-full shadow-lg w-12 h-12 flex items-center justify-center text-2xl font-bold leading-none hover:bg-green-50 transition"
          aria-label="Search"
          onClick={() => setShowSearch(true)}
        >
          <span role="img" aria-label="Search">🔍</span>
        </button>
        {/* Floating Add Product Button */}
        <button
          className="fixed bottom-24 right-8 z-50 bg-green-500 text-white rounded-full shadow-lg w-12 h-12 flex items-center justify-center text-3xl font-bold leading-none hover:bg-green-600 transition disabled:opacity-0 disabled:cursor-not-allowed"
          aria-label="Add Product"
          onClick={() => setShowAdd(true)}
          disabled={showAdd}
        >
          <span>+</span>
        </button>
        <DashboardSearchModal
          open={showSearch}
          onClose={() => setShowSearch(false)}
          products={products}
          orders={orders}
          onEditProduct={handleEdit}
        />
      </main>
    </div>
  );
}
