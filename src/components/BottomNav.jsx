import { Home, ShoppingCart, User as UserIcon, LayoutDashboard } from 'lucide-react';
import { useAuth } from '@/lib/auth';

export default function BottomNav({ tab, setTab, cartCount = 0 }) {
  const { profile } = useAuth();
  const isPharmacy = profile && profile.role === 'pharmacy';
  const items = [
    isPharmacy
      ? { key: '/', label: 'Dashboard', icon: LayoutDashboard }
      : { key: '/', label: 'Home', icon: Home },
    ...(!isPharmacy ? [{ key: '/cart', label: 'Cart', icon: ShoppingCart }] : []),
    { key: '/profile', label: 'Profile', icon: UserIcon },
  ];
  return (
    <div className="fixed bottom-0 left-0 right-0 flex justify-center z-40">
      <div className="mx-auto max-w-md w-full px-2 py-2 shadow-sm flex-1 bg-white border border-brand-primary rounded-t-[35px]">
        <div className="flex items-center justify-between">
          {items.map((it) => {
            const isActive = tab === it.key;
            const IconComponent = it.icon;
            const iconColor = isActive ? 'text-white' : 'text-zinc-400';
            const isCart = it.key === '/cart';
            return (
              <button
                key={it.key}
                onClick={() => setTab(it.key)}
                className={`relative flex flex-col items-center text-xs focus:outline-none w-full`}
              >
                <span className="relative">
                  <span className={`flex items-center justify-center ${isActive ? 'bg-brand-primary text-white w-10 h-10 rounded-full' : ''}`}>
                    <IconComponent className={`h-6 w-6 ${isActive ? 'text-white' : 'text-zinc-400'}`} />
                  </span>
                  {isCart && cartCount > 0 ? (
                    <span className="absolute -top-1.5 -right-2 bg-brand-primary text-white text-[10px] min-w-[18px] h-[18px] flex items-center justify-center rounded-full px-1 font-bold border-2 border-white shadow">
                      {cartCount}
                    </span>
                  ) : null}
                </span>
                <span className={`mt-1 ${isActive ? 'text-black font-bold' : 'text-zinc-400 font-medium'}`}>{it.label}</span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}