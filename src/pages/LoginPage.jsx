import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { ArrowLeft, Mail, Lock, AlertCircle, CheckCircle2 } from 'lucide-react';
import Logo from '../components/Logo';
import TextInput from '../components/TextInput';
import { useBukuna } from '../context/BukunaContext';

/**
 * Halaman 3: Masuk (sesuai File 1 Halaman 1 kanan)
 * - Masuk menggunakan Email + Kata Sandi melalui Supabase Auth (minimal 8 karakter)
 * - Mendukung fitur "Lupa kata sandi?" (mengirim tautan reset ke email)
 * - Mendukung pengaturan kata sandi baru jika pengguna membuka tautan recovery dari email
 * - Tombol "Akun Demo" hanya ditampilkan jika aplikasi berjalan di Mode Demo
 */
export default function LoginPage() {
  const navigate = useNavigate();
  const {
    login,
    loginDemo,
    isDemoMode,
    requestPasswordReset,
    isPasswordRecovery,
    confirmNewPassword,
  } = useBukuna();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [error, setError] = useState('');
  const [infoMessage, setInfoMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [forgotMode, setForgotMode] = useState(false);

  const validateAndSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setInfoMessage('');

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

    if (password.length < 8) {
      setError('Kata Sandi minimal terdiri dari 8 karakter.');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await login({ email: trimmedEmail, password });
      if (!res || !res.ok) {
        setError((res && res.error) || 'Gagal masuk ke akun. Silakan periksa email dan kata sandi Anda.');
        return;
      }
      navigate('/beranda');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleForgotPasswordSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setInfoMessage('');

    const trimmedEmail = email.trim();
    if (!trimmedEmail) {
      setError('Mohon isi alamat Email Anda untuk menerima tautan reset kata sandi.');
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(trimmedEmail)) {
      setError('Format alamat Email belum valid (contoh: nama@email.com).');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await requestPasswordReset(trimmedEmail);
      if (!res || !res.ok) {
        setError((res && res.error) || 'Gagal mengirim tautan reset kata sandi.');
        return;
      }
      setInfoMessage(
        res.message ||
          `Tautan untuk mengatur ulang kata sandi telah dikirim ke ${trimmedEmail}. Silakan periksa kotak masuk atau folder spam email Anda.`
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRecoveryNewPassword = async (e) => {
    e.preventDefault();
    setError('');
    setInfoMessage('');

    if (!newPassword || newPassword.length < 8) {
      setError('Kata Sandi baru minimal terdiri dari 8 karakter.');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await confirmNewPassword(newPassword);
      if (!res || !res.ok) {
        setError((res && res.error) || 'Gagal memperbarui kata sandi.');
        return;
      }
      navigate('/beranda');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleFillDemo = () => {
    setEmail('bukuna@gmail.com');
    setPassword('password123');
    setError('');
    setInfoMessage('');
  };

  return (
    <main className="bukuna-doodle-bg min-h-screen w-full flex flex-col items-center justify-center px-4 sm:px-6 py-8">
      <div className="w-full max-w-md bg-[#005E5C]/85 backdrop-blur-md border-2 border-[#1FAFAA]/50 rounded-[32px] px-5 sm:px-8 py-6 sm:py-8 shadow-2xl">
        {/* Tombol Kembali */}
        <div className="flex items-center justify-between mb-2">
          <button
            type="button"
            onClick={() => {
              if (forgotMode) {
                setForgotMode(false);
                setError('');
                setInfoMessage('');
              } else {
                navigate('/auth');
              }
            }}
            className="inline-flex items-center gap-1.5 min-h-[44px] px-3 py-1.5 rounded-full bg-white/10 hover:bg-white/20 text-sm font-bold text-white transition-colors cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>{forgotMode ? 'Kembali Masuk' : 'Kembali'}</span>
          </button>

          {isDemoMode && !forgotMode && (
            <button
              type="button"
              onClick={handleFillDemo}
              className="text-xs font-bold text-[#FFE9B0] hover:underline cursor-pointer min-h-[44px] px-2"
            >
              Isi Akun Demo
            </button>
          )}
        </div>

        {/* Logo resmi Bukuna di tengah atas */}
        <div className="flex flex-col items-center text-center">
          <Logo size="md" className="mb-4" />
          <h1 className="font-heading text-2xl sm:text-3xl font-extrabold text-[#FFE9B0]">
            {isPasswordRecovery
              ? 'Atur Kata Sandi Baru'
              : forgotMode
              ? 'Lupa Kata Sandi'
              : 'Masuk ke Bukuna'}
          </h1>
          <p className="sub-section mt-1 text-white/85">
            {isPasswordRecovery
              ? 'Masukkan kata sandi baru (minimal 8 karakter) untuk akun BUKUNA Anda'
              : forgotMode
              ? 'Masukkan alamat email akun Anda, kami akan mengirimkan tautan untuk mengatur ulang kata sandi'
              : 'Masukkan email dan kata sandi akun Guru atau Orang Tua untuk mulai membaca cerita seru'}
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

        {/* Pesan Sukses / Info (mis. email reset terkirim) */}
        {infoMessage && (
          <div
            role="status"
            className="sub-help mt-5 p-3.5 rounded-2xl bg-[#1FAFAA]/25 border-2 border-[#FFE9B0] text-white flex items-start gap-2.5 text-left"
          >
            <CheckCircle2 className="w-5 h-5 text-[#FFE9B0] shrink-0 mt-0.5" />
            <span>{infoMessage}</span>
          </div>
        )}

        {isPasswordRecovery ? (
          /* Form Pengaturan Kata Sandi Baru dari Tautan Email */
          <form onSubmit={handleRecoveryNewPassword} noValidate className="mt-6 flex flex-col gap-4 w-full">
            <TextInput
              id="recovery-new-password"
              name="newPassword"
              label="Kata Sandi Baru"
              type="password"
              inputMode="text"
              autoComplete="new-password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="Minimal 8 karakter"
              icon={Lock}
              showPasswordToggle={true}
            />

            <button
              type="submit"
              disabled={isSubmitting}
              className="mt-2 w-full min-h-[52px] py-3.5 px-6 rounded-full bg-[#E07030] hover:bg-[#C95B1E] text-white font-heading font-extrabold text-lg tracking-wider shadow-lg hover:shadow-xl transition-all cursor-pointer"
            >
              {isSubmitting ? 'MENYIMPAN...' : 'SIMPAN KATA SANDI BARU'}
            </button>
          </form>
        ) : forgotMode ? (
          /* Form Lupa Kata Sandi */
          <form onSubmit={handleForgotPasswordSubmit} noValidate className="mt-6 flex flex-col gap-4 w-full">
            <TextInput
              id="reset-email"
              name="email"
              label="Alamat Email Terdaftar"
              type="email"
              inputMode="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="nama@email.com"
              icon={Mail}
            />

            <button
              type="submit"
              disabled={isSubmitting}
              className="mt-2 w-full min-h-[52px] py-3.5 px-6 rounded-full bg-[#E07030] hover:bg-[#C95B1E] text-white font-heading font-extrabold text-lg tracking-wider shadow-lg hover:shadow-xl transition-all cursor-pointer"
            >
              {isSubmitting ? 'MENGIRIM TAUTAN...' : 'KIRIM TAUTAN RESET'}
            </button>

            <button
              type="button"
              onClick={() => {
                setForgotMode(false);
                setError('');
                setInfoMessage('');
              }}
              className="w-full min-h-[44px] py-2 text-center text-sm font-bold text-[#FFE9B0] hover:underline cursor-pointer"
            >
              Kembali ke Halaman Masuk
            </button>
          </form>
        ) : (
          /* Form Masuk Utama */
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

            <div>
              <TextInput
                id="login-password"
                name="password"
                label="Kata Sandi (Password)"
                type="password"
                inputMode="text"
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Minimal 8 karakter"
                icon={Lock}
                showPasswordToggle={true}
              />

              <div className="mt-1.5 flex justify-end">
                <button
                  type="button"
                  onClick={() => {
                    setForgotMode(true);
                    setError('');
                    setInfoMessage('');
                  }}
                  className="text-xs font-extrabold text-[#FFE9B0] hover:underline cursor-pointer py-1 px-1"
                >
                  Lupa kata sandi?
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="mt-1 w-full min-h-[52px] py-3.5 px-6 rounded-full bg-[#E07030] hover:bg-[#C95B1E] text-white font-heading font-extrabold text-lg tracking-wider shadow-lg hover:shadow-xl transition-all cursor-pointer"
            >
              {isSubmitting ? 'MEMPROSES...' : 'MASUK'}
            </button>
          </form>
        )}

        <div className="mt-6 text-center text-sm text-white/90">
          Belum punya akun?{' '}
          <Link to="/daftar" className="font-extrabold text-[#FFE9B0] hover:underline">
            Daftar Sekarang
          </Link>
        </div>

        {isDemoMode && (
          <div className="mt-3 text-center">
            <button
              type="button"
              onClick={() => {
                const res = loginDemo();
                if (res && res.ok) {
                  navigate('/beranda');
                }
              }}
              className="text-xs font-bold text-white/80 hover:text-[#FFE9B0] underline cursor-pointer py-2"
            >
              Lewati & Masuk dengan Akun Demo Bukuna Study
            </button>
          </div>
        )}
      </div>
    </main>
  );
}
