import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { ArrowLeft, User, Mail, Lock, AlertCircle } from 'lucide-react';
import Logo from '../components/Logo';
import TextInput from '../components/TextInput';
import { useBukuna } from '../context/BukunaContext';

/**
 * Halaman 4: Daftar (sesuai File 1 Halaman 2)
 * Menggunakan komponen reusable <TextInput /> di level atas, padding horizontal memadai
 * (px-4 di mobile, px-6 di tablet/desktop), label sejajar dengan tepi kiri input,
 * dan placeholder natural (tidak huruf kapital semua).
 */
export default function RegisterPage() {
  const navigate = useNavigate();
  const { register } = useBukuna();

  const [nama, setNama] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    setError('');

    if (!nama.trim() || nama.trim().length < 2) {
      setError('Mohon isi Nama Akun minimal 2 karakter.');
      return;
    }

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

    if (!password || password.length < 6) {
      setError('Kata Sandi minimal terdiri dari 6 karakter agar akunmu aman.');
      return;
    }

    const res = register({ nama: nama.trim(), email: trimmedEmail, password });
    if (!res.ok) {
      setError(res.error);
      return;
    }

    navigate('/beranda');
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
        </div>

        {/* Logo resmi Bukuna di tengah atas */}
        <div className="flex flex-col items-center text-center">
          <Logo size="md" className="mb-4" />
          <h1 className="font-heading text-2xl sm:text-3xl font-extrabold text-[#FFE9B0]">
            Daftar Akun Baru
          </h1>
          <p className="sub-section mt-1 text-white/85">
            Buat akun untuk menyimpan koleksi dan cerita favorit pilihanmu
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

        {/* Form Daftar menggunakan komponen reusable TextInput */}
        <form onSubmit={handleSubmit} noValidate className="mt-6 flex flex-col gap-4 w-full">
          <TextInput
            id="reg-nama"
            name="nama"
            label="Nama Akun"
            type="text"
            inputMode="text"
            autoComplete="name"
            value={nama}
            onChange={(e) => setNama(e.target.value)}
            placeholder="Contoh: Ibu Guru Rini"
            icon={User}
          />

          <TextInput
            id="reg-email"
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
            id="reg-password"
            name="password"
            label="Kata Sandi (Password)"
            type="password"
            inputMode="text"
            autoComplete="new-password"
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
            DAFTAR
          </button>
        </form>

        <div className="mt-6 text-center text-sm text-white/90">
          Sudah punya akun?{' '}
          <Link to="/masuk" className="font-extrabold text-[#FFE9B0] hover:underline">
            Masuk di sini
          </Link>
        </div>
      </div>
    </main>
  );
}
