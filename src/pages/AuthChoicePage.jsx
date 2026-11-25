import React from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { LogIn, UserPlus, Sparkles } from 'lucide-react';
import Logo from '../components/Logo';
import { useBukuna } from '../context/BukunaContext';

/**
 * Halaman 2: Pilih Masuk / Daftar (sesuai File 1 Halaman 1 kiri)
 * Logo bulat di tengah, dua tombol besar: "Masuk" dan "Daftar".
 * Tombol "Masuk Cepat sebagai Akun Demo" HANYA ditampilkan jika berada di Mode Demo.
 */
export default function AuthChoicePage() {
  const navigate = useNavigate();
  const { loginDemo, isDemoMode } = useBukuna();

  const handleQuickDemo = () => {
    const res = loginDemo();
    if (res && res.ok) {
      navigate('/beranda');
    }
  };

  return (
    <main className="bukuna-doodle-bg min-h-screen w-full flex flex-col items-center justify-center px-5 py-10">
      <div className="w-full max-w-md bg-[#005E5C]/80 backdrop-blur-md border-2 border-[#1FAFAA]/50 rounded-[32px] p-7 sm:p-10 shadow-2xl flex flex-col items-center text-center">
        {/* Logo resmi Bukuna di tengah atas */}
        <div className="flex flex-col items-center justify-center mb-6">
          <Logo size="md" />
        </div>

        <h1 className="font-heading text-2xl sm:text-3xl font-extrabold text-[#FFE9B0]">
          Selamat Datang di Bukuna!
        </h1>
        <p className="sub-section mt-2 text-white/90">
          Platform cerita anak digital yang seru, mendidik, dan aman untuk mendampingi belajar di sekolah maupun di rumah.
        </p>

        {/* Dua Tombol Utama sesuai File 1: MASUK & DAFTAR */}
        <div className="w-full mt-8 flex flex-col gap-4">
          <button
            type="button"
            onClick={() => navigate('/masuk')}
            className="w-full min-h-[52px] py-3.5 px-6 rounded-full bg-[#E07030] hover:bg-[#C95B1E] text-white font-heading font-bold text-lg tracking-wide shadow-lg hover:shadow-xl transition-all flex items-center justify-center gap-2.5 cursor-pointer"
          >
            <LogIn className="w-5 h-5" />
            <span>MASUK</span>
          </button>

          <button
            type="button"
            onClick={() => navigate('/daftar')}
            className="w-full min-h-[52px] py-3.5 px-6 rounded-full bg-[#1FAFAA] hover:bg-[#179691] text-[#052625] font-heading font-extrabold text-lg tracking-wide shadow-lg hover:shadow-xl transition-all flex items-center justify-center gap-2.5 cursor-pointer"
          >
            <UserPlus className="w-5 h-5" />
            <span>DAFTAR</span>
          </button>
        </div>

        {/* Tautan Bawah (+ Opsi Cepat Masuk Mode Demo HANYA di Mode Demo) */}
        <div className="w-full mt-6 pt-5 border-t border-white/15">
          {isDemoMode && (
            <button
              type="button"
              onClick={handleQuickDemo}
              className="w-full mb-4 min-h-[46px] py-2.5 px-4 rounded-2xl bg-white/10 hover:bg-white/20 text-[#FFE9B0] text-sm font-bold transition-colors inline-flex items-center justify-center gap-2 cursor-pointer"
            >
              <Sparkles className="w-4 h-4" />
              <span>Masuk Cepat sebagai Akun Demo (Bukuna Study)</span>
            </button>
          )}

          <div className="flex items-center justify-center gap-4 text-xs text-white/80 font-semibold">
            <Link to="/beranda" className="hover:text-[#FFE9B0] underline">
              Lihat Beranda Langsung
            </Link>
            <span>•</span>
            <Link to="/tentang" className="hover:text-[#FFE9B0] underline">
              Tentang Bukuna
            </Link>
          </div>
        </div>
      </div>
    </main>
  );
}
