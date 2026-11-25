import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { ArrowLeft, User, Mail, Lock, AlertCircle, CheckCircle2, ShieldCheck } from 'lucide-react';
import Logo from '../components/Logo';
import TextInput from '../components/TextInput';
import { useBukuna } from '../context/BukunaContext';

/**
 * Halaman 4: Daftar (sesuai File 1 Halaman 2)
 * - Menggunakan komponen reusable <TextInput /> di level atas (Nama Akun, Email, Password)
 * - Validasi: email valid, kata sandi minimal 8 karakter
 * - Keterangan bahwa akun ditujukan untuk guru dan orang tua, bukan anak
 * - Kotak centang wajib "Saya menyetujui Kebijakan BUKUNA"
 */
export default function RegisterPage() {
  const navigate = useNavigate();
  const { register } = useBukuna();

  const [nama, setNama] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [agreedPolicy, setAgreedPolicy] = useState(false);
  const [error, setError] = useState('');
  const [confirmationMessage, setConfirmationMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setConfirmationMessage('');

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

    if (!password || password.length < 8) {
      setError('Kata Sandi minimal terdiri dari 8 karakter agar akunmu aman.');
      return;
    }

    if (!agreedPolicy) {
      setError('Mohon centang persetujuan "Saya menyetujui Kebijakan BUKUNA" terlebih dahulu.');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await register({ nama: nama.trim(), email: trimmedEmail, password });
      if (!res || !res.ok) {
        setError((res && res.error) || 'Pendaftaran belum berhasil. Silakan coba lagi.');
        return;
      }

      if (res.needsEmailConfirmation) {
        setConfirmationMessage(
          res.message ||
            `Pendaftaran berhasil! Silakan periksa kotak masuk email ${trimmedEmail} untuk mengonfirmasi akun Anda sebelum masuk.`
        );
        return;
      }

      navigate('/beranda');
    } finally {
      setIsSubmitting(false);
    }
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

        {/* Pemberitahuan: Akun ditujukan untuk guru dan orang tua, bukan anak */}
        <div className="mt-4 rounded-2xl bg-[#062D2C]/85 border border-[#1FAFAA]/60 p-3.5 flex items-start gap-2.5 text-left">
          <ShieldCheck className="w-5 h-5 text-[#FFE9B0] shrink-0 mt-0.5" />
          <p className="sub-help text-white/95">
            Akun ditujukan untuk <strong className="text-[#FFE9B0]">guru dan orang tua</strong>, bukan anak. Pendamping dewasa mengelola akun untuk membacakan cerita bersama anak.
          </p>
        </div>

        {/* Pesan Error Validasi */}
        {error && (
          <div
            role="alert"
            className="sub-help mt-4 p-3.5 rounded-2xl bg-red-500/20 border-2 border-red-300 text-white flex items-start gap-2.5 text-left"
          >
            <AlertCircle className="w-5 h-5 text-[#FFE9B0] shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        {/* Pesan Konfirmasi Email Jika Email Confirmation Aktif di Supabase */}
        {confirmationMessage ? (
          <div className="mt-5 p-5 rounded-3xl bg-[#062D2C]/90 border-2 border-[#FFE9B0] text-center space-y-4">
            <CheckCircle2 className="w-12 h-12 text-[#1FAFAA] mx-auto" />
            <h2 className="font-heading font-extrabold text-xl text-[#FFE9B0]">
              Cek Email Konfirmasi Anda
            </h2>
            <p className="sub-section text-white/95">
              {confirmationMessage}
            </p>
            <button
              type="button"
              onClick={() => navigate('/masuk')}
              className="w-full min-h-[50px] py-3 px-6 rounded-full bg-[#E07030] hover:bg-[#C95B1E] text-white font-heading font-extrabold text-base shadow-lg cursor-pointer"
            >
              Ke Halaman Masuk
            </button>
          </div>
        ) : (
          /* Form Daftar menggunakan komponen reusable TextInput */
          <form onSubmit={handleSubmit} noValidate className="mt-5 flex flex-col gap-4 w-full">
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
              placeholder="Minimal 8 karakter"
              icon={Lock}
              showPasswordToggle={true}
            />

            {/* Kotak Centang Persetujuan Kebijakan BUKUNA */}
            <label
              htmlFor="reg-policy-checkbox"
              className="mt-1 flex items-start gap-3 p-3 rounded-2xl bg-white/10 hover:bg-white/15 border border-white/20 cursor-pointer select-none text-left transition-colors"
            >
              <input
                id="reg-policy-checkbox"
                name="agreedPolicy"
                type="checkbox"
                checked={agreedPolicy}
                onChange={(e) => setAgreedPolicy(e.target.checked)}
                className="mt-0.5 w-5 h-5 rounded accent-[#E07030] shrink-0 cursor-pointer"
              />
              <span className="sub-help text-white/95">
                Saya adalah guru atau orang tua/wali dan{' '}
                <strong className="text-[#FFE9B0]">Saya menyetujui Kebijakan BUKUNA</strong>.
              </span>
            </label>

            <button
              type="submit"
              disabled={isSubmitting}
              className="mt-1 w-full min-h-[52px] py-3.5 px-6 rounded-full bg-[#E07030] hover:bg-[#C95B1E] text-white font-heading font-extrabold text-lg tracking-wider shadow-lg hover:shadow-xl transition-all cursor-pointer"
            >
              {isSubmitting ? 'MENDAFTARKAN...' : 'DAFTAR'}
            </button>
          </form>
        )}

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
