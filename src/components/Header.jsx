import React, { useState, useRef, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Search, MoreVertical, Info, BookOpen, Heart, User, LogOut, Sparkles, ShieldCheck } from 'lucide-react';
import Logo from './Logo';
import { useBukuna } from '../context/BukunaContext';

/**
 * Header BUKUNA sesuai File 1 & File 2:
 * Logo di kiri, ikon Cari (Q) dan menu titik tiga (⋮) di kanan.
 * Menampilkan tombol/link "Dashboard Admin" khusus apabila user yang login memiliki role === 'ADMIN'.
 */
export default function Header({ showSearch = true, showMenu = true }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef(null);
  const navigate = useNavigate();
  const { user, isAdmin, logout } = useBukuna();

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleLogout = () => {
    setMenuOpen(false);
    logout();
    navigate('/auth');
  };

  return (
    <header className="sticky top-0 z-30 w-full bg-[#007A78]/95 backdrop-blur-md border-b border-white/10">
      <div className="max-w-[1200px] mx-auto px-4 sm:px-6 h-16 sm:h-18 flex items-center justify-between gap-3">
        {/* Logo Kiri */}
        <Link
          to="/beranda"
          className="inline-flex items-center py-1 rounded-xl focus:outline-none"
          aria-label="Kembali ke Beranda Bukuna"
        >
          <Logo size="sm" />
        </Link>

        {/* Navigasi Desktop (tampil di layar besar >1024px) */}
        <nav aria-label="Navigasi Utama Desktop" className="hidden lg:flex items-center gap-2">
          <Link
            to="/beranda"
            className="sub-top-nav px-4 py-2 rounded-full text-sm text-white hover:bg-[#1FAFAA]/40 transition-colors"
          >
            Beranda
          </Link>
          <Link
            to="/koleksi"
            className="sub-top-nav px-4 py-2 rounded-full text-sm text-white hover:bg-[#1FAFAA]/40 transition-colors"
          >
            Koleksi Cerita
          </Link>
          <Link
            to="/favorit"
            className="sub-top-nav px-4 py-2 rounded-full text-sm text-white hover:bg-[#1FAFAA]/40 transition-colors"
          >
            Cerita Favorit
          </Link>
          <Link
            to="/kuis"
            className="sub-top-nav px-4 py-2 rounded-full text-sm text-[#FFE9B0] hover:bg-[#1FAFAA]/40 transition-colors inline-flex items-center gap-1.5"
          >
            <Sparkles className="w-4 h-4" />
            <span>Main Kuis</span>
          </Link>
          <Link
            to="/tentang"
            className="sub-top-nav px-4 py-2 rounded-full text-sm text-white hover:bg-[#1FAFAA]/40 transition-colors"
          >
            Tentang Kami
          </Link>
          {isAdmin && (
            <Link
              to="/admin"
              className="sub-top-nav px-4 py-2 rounded-full text-sm font-extrabold text-white bg-[#E07030] hover:bg-[#C95B1E] border-2 border-[#FFE9B0] shadow-md transition-all inline-flex items-center gap-1.5"
            >
              <ShieldCheck className="w-4 h-4" />
              <span>Dashboard Admin</span>
            </Link>
          )}
          <Link
            to="/akun"
            className="sub-top-nav px-4 py-2 rounded-full text-sm text-[#FFE9B0] bg-[#005E5C] hover:bg-[#1FAFAA] hover:text-[#062D2C] transition-colors"
          >
            {user ? user.nama : 'Akun Saya'}
          </Link>
        </nav>

        {/* Ikon Kanan: Tombol Cepat Dashboard Admin (di mobile jika Admin), Cari (Q) & Menu Titik Tiga (⋮) */}
        <div className="flex items-center gap-1.5 sm:gap-2" ref={menuRef}>
          {isAdmin && (
            <Link
              to="/admin"
              className="lg:hidden min-h-[38px] px-3 py-1.5 rounded-full bg-[#E07030] hover:bg-[#C95B1E] border border-[#FFE9B0] text-white font-heading font-extrabold text-xs inline-flex items-center gap-1 shadow-md"
            >
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>Dashboard Admin</span>
            </Link>
          )}
          {showSearch && (
            <button
              type="button"
              onClick={() => navigate('/pencarian')}
              aria-label="Cari cerita"
              className="w-11 h-11 rounded-full flex items-center justify-center text-white hover:bg-white/15 transition-colors cursor-pointer"
            >
              <Search className="w-6 h-6 stroke-[2.5]" />
            </button>
          )}

          {showMenu && (
            <div className="relative">
              <button
                type="button"
                onClick={() => setMenuOpen((prev) => !prev)}
                aria-label="Menu lainnya"
                aria-expanded={menuOpen}
                className="w-11 h-11 rounded-full flex items-center justify-center text-white hover:bg-white/15 transition-colors cursor-pointer"
              >
                <MoreVertical className="w-6 h-6 stroke-[2.5]" />
              </button>

              {menuOpen && (
                <div className="absolute right-0 mt-2 w-60 rounded-2xl bg-[#005E5C] border-2 border-[#1FAFAA] shadow-2xl py-2 z-50 text-white overflow-hidden">
                  <div className="px-4 py-2.5 border-b border-white/15">
                    <p className="text-xs text-[#FFE9B0] font-bold uppercase tracking-wider">
                      Menu Bukuna
                    </p>
                    <p className="text-sm font-bold truncate mt-0.5">
                      {user ? user.nama : 'Tamu Bukuna'}
                    </p>
                  </div>

                  {isAdmin && (
                    <Link
                      to="/admin"
                      onClick={() => setMenuOpen(false)}
                      className="flex items-center gap-3 px-4 py-3 text-sm font-extrabold bg-[#E07030] text-white hover:bg-[#C95B1E] transition-colors border-b border-white/15"
                    >
                      <ShieldCheck className="w-4 h-4 text-[#FFE9B0]" />
                      <span>Dashboard Admin</span>
                    </Link>
                  )}

                  <Link
                    to="/kuis"
                    onClick={() => setMenuOpen(false)}
                    className="flex items-center gap-3 px-4 py-3 text-sm font-extrabold text-[#FFE9B0] hover:bg-[#1FAFAA] hover:text-[#062D2C] transition-colors"
                  >
                    <Sparkles className="w-4 h-4 text-[#FFE9B0]" />
                    <span>Main Kuis Interaktif</span>
                  </Link>

                  <Link
                    to="/tentang"
                    onClick={() => setMenuOpen(false)}
                    className="flex items-center gap-3 px-4 py-3 text-sm font-semibold hover:bg-[#1FAFAA] hover:text-[#062D2C] transition-colors"
                  >
                    <Info className="w-4 h-4" />
                    <span>Tentang Kami</span>
                  </Link>

                  <Link
                    to="/koleksi"
                    onClick={() => setMenuOpen(false)}
                    className="flex items-center gap-3 px-4 py-3 text-sm font-semibold hover:bg-[#1FAFAA] hover:text-[#062D2C] transition-colors"
                  >
                    <BookOpen className="w-4 h-4" />
                    <span>Semua Cerita & Koleksi</span>
                  </Link>

                  <Link
                    to="/favorit"
                    onClick={() => setMenuOpen(false)}
                    className="flex items-center gap-3 px-4 py-3 text-sm font-semibold hover:bg-[#1FAFAA] hover:text-[#062D2C] transition-colors"
                  >
                    <Heart className="w-4 h-4" />
                    <span>Cerita Favorit</span>
                  </Link>

                  <Link
                    to="/akun"
                    onClick={() => setMenuOpen(false)}
                    className="flex items-center gap-3 px-4 py-3 text-sm font-semibold hover:bg-[#1FAFAA] hover:text-[#062D2C] transition-colors"
                  >
                    <User className="w-4 h-4" />
                    <span>Profil & Riwayat Bacaan</span>
                  </Link>

                  <Link
                    to="/splash"
                    onClick={() => setMenuOpen(false)}
                    className="flex items-center gap-3 px-4 py-3 text-sm font-semibold hover:bg-[#1FAFAA] hover:text-[#062D2C] transition-colors border-t border-white/10"
                  >
                    <Sparkles className="w-4 h-4 text-[#FFE9B0]" />
                    <span>Lihat Splash Screen</span>
                  </Link>

                  <button
                    type="button"
                    onClick={handleLogout}
                    className="w-full flex items-center gap-3 px-4 py-3 text-sm font-bold text-[#FFE9B0] hover:bg-[#E07030] hover:text-white transition-colors border-t border-white/10 cursor-pointer text-left"
                  >
                    <LogOut className="w-4 h-4" />
                    <span>{user ? 'Keluar Akun' : 'Masuk / Daftar'}</span>
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </header>
  );
}

