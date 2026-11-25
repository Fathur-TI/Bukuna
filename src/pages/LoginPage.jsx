import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { ArrowLeft, Mail, Lock, AlertCircle } from 'lucide-react';
import Logo from '../components/Logo';
import TextInput from '../components/TextInput';
import { useBukuna } from '../context/BukunaContext';

/**
 * Halaman 3: Masuk (sesuai File 1 Halaman 1 kanan)
 * Menggunakan komponen top-level <TextInput /> dengan state lokal yang stabil,
 * autoComplete & inputMode yang tepat, serta padding horizontal yang proporsional.
 */
export default function LoginPage() {
  const navigate = useNavigate();
  const { login, loginDemo } = useBukuna();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const validateAndSubmit = (e) => {
    e.preventDefault();
    setError('');

    const trimmedEmail = email.trim();
    if (!trimmedEmail) {
      setError('Mohon isi alamat Email terlebih dahulu.');
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(trimmedEmail)) {
      setError('Format alamat Email belum valid (contoh: nama@email.com).');
      return;
    }

    if (!password) {
      setError('Mohon isi Kata Sandi (Password) terlebih dahulu.');
      return;
    }

    if (password.length < 6) {
      setError('Kata Sandi minimal terdiri dari 6 karakter.');
      return;
    }

    const res = login({ email: trimmedEmail, password });
    if (!res.ok) {
      setError(res.error);
      return;
    }

    navigate('/beranda');
  };

  const handleFillDemo = () => {
    setEmail('bukuna@gmail.com');
    setPassword('password123');
    setError('');
  };

  return (
    <main className="bukuna-doodle-bg min-h-screen w-full flex flex-col items-center justify-center px-4 sm:px-6 py-8">
      <div className="w-full max-w-md bg-[#005E5C]/85 backdrop-blur-md border-2 border-[#1FAFAA]/50 rounded-[32px] px-5 sm:px-8 py-6 sm:py-8 shadow-2xl">
        {/* Tombol Kembali */}
        <div className="flex items-center justify-between mb-2">
          <button
            type="button"
            onClick={() => navigate('/auth')}
            className="inline-flex items-center gap-1.5 min-h-[44px] px-3 py-1.5 rounded-full bg-white/10 hover:bg-white/20 text-sm font-bold text-white transition-colors cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Kembali</span>
          </button>

          <button
            type="button"
            onClick={handleFillDemo}
            className="text-xs font-bold text-[#FFE9B0] hover:underline cursor-pointer min-h-[44px] px-2"
          >
            Isi Akun Demo
          </button>
        </div>

        {/* Logo resmi Bukuna di tengah atas */}
        <div className="flex flex-col items-center text-center">
          <Logo size="md" className="mb-4" />
          <h1 className="font-heading text-2xl sm:text-3xl font-extrabold text-[#FFE9B0]">
            Masuk ke Bukuna
          </h1>
          <p className="sub-section mt-1 text-white/85">
            Masukkan email dan kata sandi untuk mulai membaca cerita seru
          </p>
        </div>

        {/* Pesan Error Validasi */}
        {error && (
          <div
            role="alert"
            className="sub-help mt-5 p-3.5 rounded-2xl bg-red-500/20 border-2 border-red-300 text-white flex items-start gap-2.5 text-left"
          >
            <AlertCircle className="w-5 h-5 text-[#FFE9B0] shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        {/* Form Masuk menggunakan komponen reusable TextInput */}
        <form onSubmit={validateAndSubmit} noValidate className="mt-6 flex flex-col gap-4 w-full">
          <TextInput
            id="login-email"
            name="email"
            label="Alamat Email"
            type="email"
            inputMode="email"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="nama@email.com"
            icon={Mail}
          />

          <TextInput
            id="login-password"
            name="password"
            label="Kata Sandi (Password)"
            type="password"
            inputMode="text"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Minimal 6 karakter"
            icon={Lock}
            showPasswordToggle={true}
          />

          <button
            type="submit"
            className="mt-2 w-full min-h-[52px] py-3.5 px-6 rounded-full bg-[#E07030] hover:bg-[#C95B1E] text-white font-heading font-extrabold text-lg tracking-wider shadow-lg hover:shadow-xl transition-all cursor-pointer"
          >
            MASUK
          </button>
        </form>

        <div className="mt-6 text-center text-sm text-white/90">
          Belum punya akun?{' '}
          <Link to="/daftar" className="font-extrabold text-[#FFE9B0] hover:underline">
            Daftar Sekarang
          </Link>
        </div>

        <div className="mt-3 text-center">
          <button
            type="button"
            onClick={() => {
              loginDemo();
              navigate('/beranda');
            }}
            className="text-xs font-bold text-white/80 hover:text-[#FFE9B0] underline cursor-pointer py-2"
          >
            Lewati & Masuk dengan Akun Demo Bukuna Study
          </button>
        </div>
      </div>
    </main>
  );
}
