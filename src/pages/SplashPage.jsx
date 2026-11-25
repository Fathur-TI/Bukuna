import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Logo from '../components/Logo';
import { useBukuna } from '../context/BukunaContext';

/**
 * Halaman 1: Splash Screen (sesuai File 2 Halaman 1 kiri)
 * Background teal berpola doodle, logo BUKUNA di tengah,
 * otomatis lanjut setelah ±2 detik ke halaman pilih Masuk/Daftar (jika belum login) atau Beranda (jika sudah login).
 */
export default function SplashPage() {
  const navigate = useNavigate();
  const { user, authLoading } = useBukuna();

  useEffect(() => {
    if (authLoading) return undefined;
    const timer = setTimeout(() => {
      if (user) {
        navigate('/beranda', { replace: true });
      } else {
        navigate('/auth', { replace: true });
      }
    }, 2000);

    return () => clearTimeout(timer);
  }, [navigate, user, authLoading]);

  const handleSkip = () => {
    if (authLoading) return;
    navigate(user ? '/beranda' : '/auth', { replace: true });
  };

  return (
    <main
      onClick={handleSkip}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && handleSkip()}
      aria-label="Halaman Pembuka Bukuna, ketuk untuk melanjutkan"
      className="bukuna-doodle-bg min-h-screen w-full flex flex-col items-center justify-center px-6 text-center cursor-pointer relative overflow-hidden"
    >
      {/* Efek lingkaran cahaya lembut di belakang logo */}
      <div className="w-72 h-72 sm:w-96 sm:h-96 rounded-full bg-[#1FAFAA]/20 blur-3xl absolute pointer-events-none" />

      <div className="relative z-10 flex flex-col items-center animate-bounce">
        <Logo size="lg" />
      </div>

      <p className="sub-hero relative z-10 mt-6 text-[#FFE9B0] tracking-wide">
        Cerita Seru Untuk Dunia Kecilnya
      </p>

      {/* Indikator loading titik tiga */}
      <div className="relative z-10 mt-8 flex items-center gap-2" aria-hidden="true">
        <span className="w-3 h-3 rounded-full bg-[#FFE9B0] animate-ping" />
        <span className="w-3 h-3 rounded-full bg-[#E07030]" />
        <span className="w-3 h-3 rounded-full bg-[#1FAFAA]" />
      </div>

      <span className="sub-help relative z-10 mt-6 text-white/85">
        Ketuk layar untuk langsung mulai →
      </span>
    </main>
  );
}
