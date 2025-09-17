// src/App.jsx
import React, { useEffect, useState } from 'react';
import {
  Routes,
  Route,
  useLocation,
  useNavigate,
  Navigate,
  useParams,
  Outlet,
} from 'react-router-dom';
import { collection, query, onSnapshot, where, doc as firestoreDoc, getDoc } from 'firebase/firestore';

import BottomNav from '@/components/BottomNav';
import Home from '@/pages/Home';
import ProductDetail from '@/pages/ProductDetail';
import Cart from '@/pages/Cart';
import Orders from '@/pages/Orders';
import ProfileCustomer from '@/pages/ProfileCustomer';
import ProfilePharmacy from '@/pages/ProfilePharmacy';
import { AuthProvider, useAuth } from '@/lib/auth';
import { RequireAuth } from '@/components/Protected';
import { db } from '@/lib/firebase';
import Dashboard from '@/pages/Dashboard';
import SuperuserDashboard from '@/pages/SuperuserDashboard';
import Profile from '@/pages/Profile';

// Auth flow pages
import Landing from '@/pages/auth/Landing';
import AuthPage from '@/pages/Auth';
import VerifyEmail from '@/pages/VerifyEmail';
import ForgotPassword from '@/pages/auth/ForgotPassword';

// Extra
import ProductManager from '@/pages/ProductManager'; // New: simple product management UI for pharmacy
import Checkout from '@/pages/Checkout';

/* ---------------------------
   LAYOUTS
----------------------------*/

// Layout that shows BottomNav (for customers only)
function AppLayout() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, profile } = useAuth();
  const [tab, setTab] = useState(location.pathname);
  const [cartCount, setCartCount] = useState(0);

  useEffect(() => setTab(location.pathname), [location.pathname]);

  // Only show cart count for customers
  useEffect(() => {
    if (!user || (profile && profile.role !== 'customer')) return setCartCount(0);
    const q = query(collection(db, 'users', user.uid, 'cart'));
    const unsub = onSnapshot(q, (snap) => {
      let total = 0;
      snap.docs.forEach(doc => {
        const data = doc.data();
        total += data.qty || 0;
      });
      setCartCount(total);
    });
    return unsub;
  }, [user, profile]);

  // Detect “chat modal open” via query param
  const params = new URLSearchParams(location.search);
  const chatModalOpen = !!params.get('chat');

  // Show BottomNav for both customers and pharmacy users
  const showBottomNav = profile && (profile.role === 'customer' || profile.role === 'pharmacy') && !chatModalOpen;

  return (
    <div className={`min-h-screen bg-white w-full flex flex-col items-center px-2 md:px-8 lg:px-16 xl:px-32 ${chatModalOpen ? '' : 'pb-24'}`}>
      <div className="w-full max-w-md md:max-w-2xl lg:max-w-4xl xl:max-w-6xl mx-auto flex-1 flex flex-col">
        <Outlet />
      </div>
      {showBottomNav && (
        <BottomNav
          tab={tab}
          setTab={(k) => navigate(k)}
          cartCount={cartCount}
        />
      )}
    </div>
  );
}

// Layout without BottomNav (for auth pages and full-page chat route if you use it)
function BareLayout() {
  return (
    <div className="min-h-screen bg-white w-full flex flex-col items-center px-2 md:px-8 lg:px-16 xl:px-32">
      <div className="w-full max-w-md md:max-w-2xl lg:max-w-4xl xl:max-w-6xl mx-auto flex-1 flex flex-col">
        <Outlet />
      </div>
    </div>
  );
}

/* ---------------------------
   ROUTES
----------------------------*/

function ProductDetailRoute() {
  const { id } = useParams();
  const [product, setProduct] = useState(null);
  const [pharmacy, setPharmacy] = useState(null);

  useEffect(() => {
    async function fetchData() {
      const prodSnap = await getDoc(firestoreDoc(db, 'products', id));
      const prodData = prodSnap.data();
      setProduct(prodData ? { id, ...prodData } : null);
      if (prodData?.pharmacyId) {
        const pharmSnap = await getDoc(firestoreDoc(db, 'pharmacies', prodData.pharmacyId));
        setPharmacy(pharmSnap.data());
      }
    }
    fetchData();
  }, [id]);

  if (!product) return null;
  return <ProductDetail product={product} pharmacy={pharmacy} />;
}

function Shell() {
  console.log('Shell loaded');
  const { user, profile } = useAuth();
  const location = useLocation();
  const params = new URLSearchParams(location.search);
  const scrollTo = params.get('scrollTo') ? parseInt(params.get('scrollTo'), 10) : undefined;

  // If user is not logged in, force them to the auth landing page unless they're already visiting an /auth route
  if (!user && !location.pathname.startsWith('/auth')) {
    console.log('Unauthenticated — redirecting to /auth/landing');
    return <Navigate to="/auth/landing" replace />;
  }

  // Show loading until profile is loaded
  if (user && profile === undefined) {
    console.log('Loading profile...');
    return <LoadingSkeleton lines={4} className="my-8" />;
  }

  // Block unverified users
  if (user && !user.emailVerified) {
    console.log('User not verified, redirecting to /verify-email');
    return (
      <Routes>
        <Route path="/verify-email" element={<VerifyEmail />} />
        <Route path="*" element={<Navigate to="/verify-email" replace />} />
      </Routes>
    );
  }

  // Redirect superuser to /superuser ONLY if on root path
  if (profile && profile.role === 'superuser' && location.pathname === '/') {
    console.log('Superuser detected, redirecting to /superuser');
    return <Navigate to="/superuser" replace />;
  }

  console.log('Rendering main routes');
  return (
    <Routes>
      {/* Auth (no BottomNav) */}
      <Route element={<BareLayout />}>
        <Route path="/auth/landing" element={<Landing />} />
        <Route path="/auth" element={<AuthPage />} />
        <Route path="/auth/forgot-password" element={<ForgotPassword />} />
        <Route path="/verify-email" element={<VerifyEmail />} />
      </Route>
      {/* Superuser route - only for superuser role, uses BareLayout (no BottomNav) */}
      <Route element={<BareLayout />}>
        <Route path="/superuser" element={<RequireAuth><SuperuserDashboard /></RequireAuth>} />
      </Route>
      {/* Main app (with BottomNav for customers only) */}
      <Route element={<AppLayout />}> 
        {/* Customer home */}
        {profile && profile.role === 'customer' && <Route path="/" element={<Home />} />}
        {/* Pharmacy dashboard */}
        {profile && profile.role === 'pharmacy' && <Route path="/" element={<Dashboard />} />}
        {/* Product management for pharmacy */}
        {profile && profile.role === 'pharmacy' && <Route path="/products" element={<RequireAuth><ProductManager /></RequireAuth>} />}
        {/* Product detail (all users) */}
        <Route path="/product/:id" element={<ProductDetailRoute />} />
        {/* Cart (customers only) */}
        {profile && profile.role === 'customer' && <Route path="/cart" element={<RequireAuth><Cart /></RequireAuth>} />}
        {/* Checkout (customers only) */}
        {profile && profile.role === 'customer' && <Route path="/checkout" element={<RequireAuth><Checkout /></RequireAuth>} />}
        {/* Profile (all users) */}
        <Route path="/profile" element={<RequireAuth><Profile /></RequireAuth>} />
        {/* Fallback */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  );
}

export default function App() {
  console.log('App loaded');
  return (
    <AuthProvider>
      <Shell />
    </AuthProvider>
  );
}
