import React from 'react';
import { NavLink } from 'react-router-dom';
import { Home, BookMarked, Heart, User } from 'lucide-react';

/**
 * Bottom Navigation Bar BUKUNA sesuai File 1 & File 2:
 * Menu utama: Beranda, Koleksi, Favorit, Akun (ikon gelap + label).
 * Tampil tetap di bawah pada layar mobile & tablet (<1024px).
 */
export default function Navigation() {
  const navItems = [
    { to: '/beranda', label: 'Beranda', icon: Home },
    { to: '/koleksi', label: 'Koleksi', icon: BookMarked },
    { to: '/favorit', label: 'Favorit', icon: Heart },
    { to: '/akun', label: 'Akun', icon: User },
  ];

  return (
    <nav
      aria-label="Navigasi Bawah"
      className="fixed bottom-0 left-0 right-0 z-30 lg:hidden bg-[#159A95] border-t-2 border-[#25C4BE]/50 shadow-[0_-6px_20px_rgba(0,40,39,0.35)] rounded-t-[24px]"
    >
      <div className="max-w-md mx-auto px-3 py-1.5 grid grid-cols-4 gap-1">
        {navItems.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              `flex flex-col items-center justify-center min-h-[52px] py-1 px-2 rounded-2xl transition-all ${
                isActive
                  ? 'bg-[#007A78]/35 text-[#FFE9B0] font-extrabold scale-105'
                  : 'text-white/95 hover:bg-white/10 font-semibold'
              }`
            }
          >
            {({ isActive }) => (
              <>
                <Icon
                  className={`w-6 h-6 mb-0.5 transition-transform ${
                    isActive
                      ? 'text-[#052625] fill-[#052625] stroke-[2.3]'
                      : 'text-[#052625] stroke-[2]'
                  }`}
                />
                <span className="sub-nav tracking-tight text-white">{label}</span>
              </>
            )}
          </NavLink>
        ))}
      </div>
    </nav>
  );
}

