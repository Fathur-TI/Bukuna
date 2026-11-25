import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { BukunaProvider, useBukuna } from './context/BukunaContext';

import SplashPage from './pages/SplashPage';
import AuthChoicePage from './pages/AuthChoicePage';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import HomePage from './pages/HomePage';
import CollectionPage from './pages/CollectionPage';
import FavoritesPage from './pages/FavoritesPage';
import ProfilePage from './pages/ProfilePage';
import StoryDetailPage from './pages/StoryDetailPage';
import ReadStoryPage from './pages/ReadStoryPage';
import FinishStoryPage from './pages/FinishStoryPage';
import AboutPage from './pages/AboutPage';
import SearchPage from './pages/SearchPage';
import MyStories from './pages/MyStories';
import CreateStory from './pages/CreateStory';
import EditStory from './pages/EditStory';
import QuizHubPage from './pages/QuizHubPage';
import QuizPlayPage from './pages/QuizPlayPage';

function ToastNotification() {
  const { toastMessage } = useBukuna();
  if (!toastMessage) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed top-4 left-1/2 -translate-x-1/2 z-50 px-5 py-2.5 rounded-full bg-[#004A48] border-2 border-[#FFE9B0] text-[#FFE9B0] font-heading font-bold text-sm shadow-2xl flex items-center gap-2"
    >
      <span>✨</span>
      <span>{toastMessage}</span>
    </div>
  );
}

function DemoModeBanner() {
  const { isDemoMode } = useBukuna();
  if (!isDemoMode) return null;

  return (
    <div
      role="status"
      aria-label="Mode demo aktif"
      className="w-full bg-[#062D2C] border-b border-[#1FAFAA]/40 px-4 py-1.5 text-center text-xs font-heading font-bold text-[#FFE9B0] flex items-center justify-center gap-2 z-40"
    >
      <span className="px-2 py-0.5 rounded-full bg-[#E07030] text-white text-[11px] font-extrabold uppercase tracking-wider">
        Mode demo
      </span>
      <span className="text-white/90">
        Berjalan dengan simulasi akun lokal (tanpa koneksi server Supabase).
      </span>
    </div>
  );
}

export default function App() {
  return (
    <BukunaProvider>
      <DemoModeBanner />
      <ToastNotification />
      <Routes>
        {/* 1. Splash Screen */}
        <Route path="/" element={<SplashPage />} />

        {/* 2. Pilih Masuk / Daftar */}
        <Route path="/auth" element={<AuthChoicePage />} />

        {/* 3. Halaman Masuk */}
        <Route path="/masuk" element={<LoginPage />} />

        {/* 4. Halaman Daftar */}
        <Route path="/daftar" element={<RegisterPage />} />

        {/* 5. Beranda */}
        <Route path="/beranda" element={<HomePage />} />

        {/* 6. Koleksi / Daftar Cerita */}
        <Route path="/koleksi" element={<CollectionPage />} />

        {/* 7. Cerita Favorit */}
        <Route path="/favorit" element={<FavoritesPage />} />

        {/* 8. Akun / Profil Pengguna */}
        <Route path="/akun" element={<ProfilePage />} />

        {/* Fitur A (Tahap 1): Buat & Unggah Cerita Sendiri */}
        <Route path="/cerita-saya" element={<MyStories />} />
        <Route path="/cerita/buat" element={<CreateStory />} />
        <Route path="/cerita/:id/edit" element={<EditStory />} />

        {/* Fitur B (Tahap 2): Kuis Interaktif Anak Usia Dini */}
        <Route path="/kuis" element={<QuizHubPage />} />
        <Route path="/kuis/:storyId" element={<QuizPlayPage />} />

        {/* 9. Detail Cerita (Sinopsis) */}
        <Route path="/cerita/:id" element={<StoryDetailPage />} />

        {/* 10. Halaman Membaca */}
        <Route path="/baca/:id" element={<ReadStoryPage />} />

        {/* 11. Selesai Membaca */}
        <Route path="/selesai/:id" element={<FinishStoryPage />} />

        {/* 12. Tentang Kami */}
        <Route path="/tentang" element={<AboutPage />} />

        {/* 13. Pencarian Cerita */}
        <Route path="/pencarian" element={<SearchPage />} />

        {/* Fallback ke Beranda */}
        <Route path="*" element={<Navigate to="/beranda" replace />} />
      </Routes>
    </BukunaProvider>
  );
}
