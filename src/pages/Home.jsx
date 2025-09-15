import { useEffect, useMemo, useState } from 'react';
import { Search } from 'lucide-react';
import { listenProducts, addToCart } from '@/lib/db';
import { useAuth } from '@/lib/auth';
import ProductCard from '@/components/ProductCard';
import { useNavigate } from 'react-router-dom';
import LoadingSkeleton from '@/components/LoadingSkeleton';
import FloatingMessageButton from '@/components/FloatingMessageButton';
import ProfileCompletionModal from '@/components/ProfileCompletionModal';
import { doc, updateDoc, getDocs, collection } from 'firebase/firestore';
import { db } from '@/lib/firebase';

export default function Home() {
  const [products, setProducts] = useState([]);
  const [q, setQ] = useState('');
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [pharmacyPhone, setPharmacyPhone] = useState('');

  useEffect(() => {
    listenProducts(setProducts);
  }, []);

  useEffect(() => {
    if (user && profile && (!profile.phone || profile.phone === '')) {
      setShowProfileModal(true);
    }
  }, [user, profile]);

  useEffect(() => {
    // Fetch the first pharmacy's WhatsApp number
    async function fetchPharmacyPhone() {
      const snap = await getDocs(collection(db, 'pharmacies'));
      if (!snap.empty) {
        const data = snap.docs[0].data();
        setPharmacyPhone(data.phone || '');
      }
    }
    fetchPharmacyPhone();
  }, []);

  const filtered = useMemo(() => {
    const query = q.toLowerCase();
    return products.filter((p) => {
      const text = ((p.name || '') + ' ' + (p.category || '')).toLowerCase();
      const tagHit = Array.isArray(p.tags) && p.tags.some((t) => (t || '').toLowerCase().includes(query));
      return text.includes(query) || tagHit;
    });
  }, [products, q]);

  const popularProducts = useMemo(() => {
    return [...filtered]
      .filter((p) => p.stock === undefined || p.stock > 0)
      .sort((a, b) => ((b.viewCount || 0) + (b.sold || 0)) - ((a.viewCount || 0) + (a.sold || 0)));
  }, [filtered]);

  const handleProductOpen = (productId) => navigate(`/product/${productId}`);

  const handleProfileSave = async ({ phone }) => {
    // Update Firestore user doc
    await updateDoc(doc(db, 'users', user.uid), { phone });
    setShowProfileModal(false);
    window.location.reload();
  };

  if (!products.length) return <LoadingSkeleton lines={6} className="my-8" />;

  return (
    <div className="min-h-screen w-full px-0 pb-28">
      <ProfileCompletionModal
        open={showProfileModal}
        onClose={() => {}}
        onSave={handleProfileSave}
        isPharmacy={false}
        initialPhone={profile?.phone || ''}
      />
      {/* Top bar */}
      <div className="sticky top-0 z-30 w-full bg-white border-b px-3">
        <div className="w-full mx-auto py-4">
          <div className="text-[18px] md:text-[22px] font-medium text-brand-primary">
            {user ? `Welcome, ${user.displayName?.split(' ')[0] || 'Friend'}` : 'Welcome'}
          </div>
        </div>
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto w-full mx-auto flex flex-col pt-3 pb-28 px-3">
        {/* Search */}
        <div className="flex items-center gap-3 border-b border-zinc-300 pb-2">
          <Search className="h-5 w-5 md:h-6 md:w-6 text-zinc-400" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search medicines"
            className="w-full outline-none placeholder:text-[13px] md:placeholder:text-[14px] placeholder:text-zinc-400"
          />
        </div>

        {/* Popular */}
        <div className="mt-6">
          <div className="flex items-center justify-between mb-3">
            <div className="text-[16px] md:text-[20px] font-semibold text-brand-primary">
              Popular Products
            </div>
          </div>

          <div className="grid grid-cols-3 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-3 md:gap-6">
            {popularProducts.map((p) => (
              <div className="flex justify-center relative" key={p.id || p.sku}>
                <ProductCard
                  product={p}
                  onOpen={() => handleProductOpen(p.id)}
                  onAdd={() => (user ? addToCart(user.uid, p.id, 1) : alert('Please sign in'))}
                  cardWidth="128px"
                  cardHeight="120px"
                  nameSize="12px"
                  nameWeight="semibold"
                  nameTracking="-0.5px"
                  priceSize="11px"
                  priceColor="#6B7280"
                  priceWeight="medium"
                  addColor="#10B981"
                  addSize="10px"
                  borderRadius="12px"
                />
              </div>
            ))}
          </div>
        </div>
      </div>
      {/* Floating message button for customer */}
      <FloatingMessageButton pharmacyPhone={pharmacyPhone} />
    </div>
  );
}