import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  Heart,
  List,
  Clock,
  LogOut,
  ChevronRight,
  BookOpen,
  CheckCircle2,
  Play,
  Plus,
  Edit3,
  Star,
  Sparkles,
} from 'lucide-react';
import Header from '../components/Header';
import Navigation from '../components/Navigation';
import CatAvatar from '../components/CatAvatar';
import StoryIllustration from '../components/StoryIllustration';
import { useBukuna } from '../context/BukunaContext';

function formatQuizDate(isoStr) {
  try {
    const d = new Date(isoStr);
    if (Number.isNaN(d.getTime())) return 'Baru saja';
    return d.toLocaleDateString('id-ID', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  } catch {
    return 'Baru saja';
  }
}

/**
 * Halaman 8: Akun / Profil Pengguna (sesuai File 1 Hal 3 kanan & File 2 Hal 2 tengah)
 * - Avatar ilustrasi kucing lucu di lingkaran tengah atas
 * - Nama pengguna & email di bawah avatar
 * - Panel kontainer membulat berisi menu:
 *   • Cerita Saya (/cerita-saya) + tombol "+ Buat Cerita"
 *   • Hasil Kuis (perkembangan bintang kuis anak)
 *   • Cerita Favorit
 *   • Koleksi
 *   • Riwayat Bacaan (menyimpan halaman terakhir yang dibaca)
 *   • Keluar Akun
 */
export default function ProfilePage() {
  const navigate = useNavigate();
  const {
    user,
    stories,
    myStories,
    favorites,
    collections,
    readingHistory,
    quizResults = [],
    logout,
  } = useBukuna();

  const [activeSection, setActiveSection] = useState('riwayat'); // 'riwayat' | 'kuis'

  const historyItems = Object.values(readingHistory)
    .sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt))
    .map((item) => {
      const story =
        stories.find((s) => s.id === item.storyId) ||
        myStories.find((s) => s.id === item.storyId);
      return story ? { ...item, story } : null;
    })
    .filter(Boolean);

  const handleLogout = () => {
    logout();
    navigate('/auth');
  };

  const handleCreateNewStory = () => {
    try {
      sessionStorage.removeItem('bukuna_working_draft_id_v1');
    } catch {
      // Abaikan
    }
    navigate('/cerita/buat');
  };

  return (
    <div className="bukuna-doodle-bg min-h-screen flex flex-col pb-24 lg:pb-12">
      <Header />

      <main className="flex-1 w-full max-w-[960px] mx-auto px-4 sm:px-6 pt-2 pb-8">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-start">
          {/* KARTU PROFIL & MENU UTAMA (Persis File 2 Hal 2 tengah) */}
          <section className="md:col-span-5 bg-[#005E5C]/80 backdrop-blur-md border-2 border-[#1FAFAA]/50 rounded-[32px] p-6 text-center shadow-2xl flex flex-col items-center">
            {/* Avatar Kucing Oranye di Lingkaran Tengah Atas */}
            <CatAvatar size="lg" className="mt-1" />

            <h1 className="mt-4 font-heading font-extrabold text-2xl text-[#FFE9B0]">
              {user ? user.name : 'Tamu Bukuna'}
            </h1>
            <p className="sub-label text-white/85 mt-0.5">
              {user ? user.email : 'Belum masuk akun'}
            </p>

            {/* Tombol Cepat "+ Buat Cerita" */}
            <button
              type="button"
              onClick={handleCreateNewStory}
              className="mt-4 w-full min-h-[48px] px-5 py-2.5 rounded-full bg-[#E07030] hover:bg-[#C95B1E] text-white font-heading font-extrabold text-sm sm:text-base shadow-lg flex items-center justify-center gap-2 transition-all cursor-pointer"
            >
              <Plus className="w-5 h-5" />
              <span>+ Buat Cerita Sendiri</span>
            </button>

            {/* Panel Kontainer Teal Terang (#1FAFAA) Berisi Menu dengan Garis Pemisah Tipis */}
            <div className="w-full mt-5 bg-[#1FAFAA] rounded-[26px] overflow-hidden shadow-inner border-2 border-white/20 divide-y-2 divide-white/50 text-[#052625]">
              {/* Menu 0: Cerita Saya (Fitur Tahap 1) */}
              <button
                type="button"
                onClick={() => navigate('/cerita-saya')}
                className="w-full min-h-[54px] px-5 py-3.5 flex items-center justify-between font-heading font-extrabold text-base hover:bg-[#159A95] transition-colors cursor-pointer bg-[#FFE9B0]/25"
              >
                <span className="flex items-center gap-3.5">
                  <Edit3 className="w-5 h-5 stroke-[2.4]" />
                  <span>Cerita Saya</span>
                </span>
                <span className="flex items-center gap-1 text-sm font-bold">
                  <span className="px-2.5 py-0.5 rounded-full bg-[#062D2C] text-[#FFE9B0] text-xs font-extrabold">
                    {myStories.length}
                  </span>
                  <ChevronRight className="w-4 h-4" />
                </span>
              </button>

              {/* Menu 1: Hasil Kuis (Fitur Tahap 2) */}
              <button
                type="button"
                onClick={() => setActiveSection('kuis')}
                className={`w-full min-h-[54px] px-5 py-3.5 flex items-center justify-between font-heading font-extrabold text-base hover:bg-[#159A95] transition-colors cursor-pointer ${
                  activeSection === 'kuis' ? 'bg-black/15' : 'bg-[#FFE9B0]/15'
                }`}
              >
                <span className="flex items-center gap-3.5">
                  <Star className="w-5 h-5 stroke-[2.4] fill-[#E07030] text-[#052625]" />
                  <span>Hasil Kuis</span>
                </span>
                <span className="flex items-center gap-1 text-sm font-bold">
                  <span className="px-2.5 py-0.5 rounded-full bg-[#E07030] text-white text-xs font-extrabold">
                    {quizResults.length}
                  </span>
                  <ChevronRight className="w-4 h-4" />
                </span>
              </button>

              {/* Menu 2: Cerita Favorit */}
              <button
                type="button"
                onClick={() => navigate('/favorit')}
                className="w-full min-h-[54px] px-5 py-3.5 flex items-center justify-between font-heading font-extrabold text-base hover:bg-[#159A95] transition-colors cursor-pointer"
              >
                <span className="flex items-center gap-3.5">
                  <Heart className="w-5 h-5 stroke-[2.4]" />
                  <span>Cerita Favorit</span>
                </span>
                <span className="flex items-center gap-1 text-sm font-bold">
                  <span className="px-2 py-0.5 rounded-full bg-[#062D2C]/15">
                    {favorites.length}
                  </span>
                  <ChevronRight className="w-4 h-4" />
                </span>
              </button>

              {/* Menu 3: Koleksi */}
              <button
                type="button"
                onClick={() => navigate('/koleksi')}
                className="w-full min-h-[54px] px-5 py-3.5 flex items-center justify-between font-heading font-extrabold text-base hover:bg-[#159A95] transition-colors cursor-pointer"
              >
                <span className="flex items-center gap-3.5">
                  <List className="w-5 h-5 stroke-[2.4]" />
                  <span>Koleksi</span>
                </span>
                <span className="flex items-center gap-1 text-sm font-bold">
                  <span className="px-2 py-0.5 rounded-full bg-[#062D2C]/15">
                    {collections.length}
                  </span>
                  <ChevronRight className="w-4 h-4" />
                </span>
              </button>

              {/* Menu 4: Riwayat Bacaan */}
              <button
                type="button"
                onClick={() => setActiveSection('riwayat')}
                className={`w-full min-h-[54px] px-5 py-3.5 flex items-center justify-between font-heading font-extrabold text-base hover:bg-[#159A95] transition-colors cursor-pointer ${
                  activeSection === 'riwayat' ? 'bg-black/15' : ''
                }`}
              >
                <span className="flex items-center gap-3.5">
                  <Clock className="w-5 h-5 stroke-[2.4]" />
                  <span>Riwayat Bacaan</span>
                </span>
                <span className="flex items-center gap-1 text-sm font-bold">
                  <span className="px-2 py-0.5 rounded-full bg-[#062D2C]/15">
                    {historyItems.length}
                  </span>
                  <ChevronRight className="w-4 h-4" />
                </span>
              </button>

              {/* Menu 5: Keluar Akun */}
              <button
                type="button"
                onClick={handleLogout}
                className="w-full min-h-[54px] px-5 py-3.5 flex items-center justify-between font-heading font-extrabold text-base text-[#062D2C] hover:bg-[#E07030] hover:text-white transition-colors cursor-pointer"
              >
                <span className="flex items-center gap-3.5">
                  <LogOut className="w-5 h-5 stroke-[2.4]" />
                  <span>Keluar Akun</span>
                </span>
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </section>

          {/* PANEL KANAN: DETAIL HASIL KUIS ATAU RIWAYAT BACAAN */}
          <section className="md:col-span-7 bg-[#005E5C]/80 backdrop-blur-md border-2 border-[#1FAFAA]/50 rounded-[32px] p-5 sm:p-6 shadow-2xl">
            {/* Tab Switcher Cepat di Atas Panel Kanan */}
            <div className="flex flex-wrap items-center gap-2 mb-5">
              <button
                type="button"
                onClick={() => setActiveSection('riwayat')}
                className={`min-h-[42px] px-4 py-2 rounded-full font-heading font-extrabold text-xs sm:text-sm inline-flex items-center gap-1.5 transition-all cursor-pointer ${
                  activeSection === 'riwayat'
                    ? 'bg-[#E07030] text-white shadow-md'
                    : 'bg-[#062D2C]/70 text-[#FFE9B0] hover:bg-[#062D2C]'
                }`}
              >
                <Clock className="w-4 h-4" />
                <span>Riwayat Bacaan ({historyItems.length})</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveSection('kuis')}
                className={`min-h-[42px] px-4 py-2 rounded-full font-heading font-extrabold text-xs sm:text-sm inline-flex items-center gap-1.5 transition-all cursor-pointer ${
                  activeSection === 'kuis'
                    ? 'bg-[#E07030] text-white shadow-md'
                    : 'bg-[#062D2C]/70 text-[#FFE9B0] hover:bg-[#062D2C]'
                }`}
              >
                <Star className="w-4 h-4 fill-current" />
                <span>Hasil Kuis ({quizResults.length})</span>
              </button>
            </div>

            {activeSection === 'kuis' ? (
              <div>
                <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
                  <div>
                    <h2 className="font-heading font-extrabold text-xl sm:text-2xl text-[#FFE9B0]">
                      Hasil Kuis Interaktif Anak
                    </h2>
                    <p className="sub-section text-white/85">
                      Pantau perolehan bintang dan perkembangan belajar anak
                    </p>
                  </div>

                  <Link
                    to="/kuis"
                    className="min-h-[42px] px-4 py-2 rounded-full bg-[#1FAFAA] hover:bg-[#159A95] text-[#052625] font-heading font-extrabold text-xs sm:text-sm inline-flex items-center gap-1.5 shadow-md"
                  >
                    <Sparkles className="w-4 h-4" />
                    <span>Main Kuis</span>
                  </Link>
                </div>

                {quizResults.length > 0 ? (
                  <div className="flex flex-col gap-3">
                    {quizResults.map((res) => {
                      const starsCount = Math.max(1, Math.min(3, res.bintang || 3));
                      return (
                        <div
                          key={res.id}
                          className="bg-[#007A78] border border-[#1FAFAA]/50 rounded-2xl p-4 flex flex-wrap items-center justify-between gap-3 shadow-md"
                        >
                          <div className="min-w-0 flex-1">
                            <h3 className="font-heading font-extrabold text-base sm:text-lg text-[#FFE9B0] truncate">
                              {res.judul}
                            </h3>
                            <p className="sub-label text-white/85 mt-0.5">
                              Tanggal: {formatQuizDate(res.tanggal)} • {starsCount} dari 3 Bintang
                            </p>
                          </div>

                          <div className="flex items-center gap-3">
                            <div
                              role="img"
                              aria-label={`${starsCount} bintang`}
                              className="flex items-center gap-1 px-3 py-1.5 rounded-full bg-[#062D2C] border border-[#FFE9B0]/50"
                            >
                              {[1, 2, 3].map((n) => (
                                <Star
                                  key={n}
                                  className={`w-4 h-4 sm:w-5 sm:h-5 ${
                                    n <= starsCount
                                      ? 'fill-[#FFE9B0] text-[#FFE9B0]'
                                      : 'text-white/30'
                                  }`}
                                />
                              ))}
                            </div>

                            <Link
                              to={`/kuis/${res.storyId}`}
                              className="min-h-[40px] px-3.5 py-1.5 rounded-full bg-[#E07030] hover:bg-[#C95B1E] text-white font-bold text-xs sm:text-sm inline-flex items-center gap-1 shadow-sm"
                            >
                              <Play className="w-3.5 h-3.5 fill-white" />
                              <span>Ulangi</span>
                            </Link>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="py-10 text-center">
                    <Star className="w-12 h-12 text-[#FFE9B0] mx-auto mb-2" />
                    <p className="font-heading font-bold text-lg text-[#FFE9B0]">
                      Belum Ada Hasil Kuis
                    </p>
                    <p className="sub-section text-white/85 mt-1 mb-4">
                      Ayo ajak anak bermain kuis bergambar & bersuara bersama kucing kecil Rodri!
                    </p>
                    <Link
                      to="/kuis"
                      className="min-h-[46px] px-6 py-2.5 rounded-full bg-[#E07030] hover:bg-[#C95B1E] text-white font-heading font-extrabold text-sm inline-flex items-center gap-2 shadow-lg"
                    >
                      <Play className="w-4 h-4 fill-white" />
                      <span>Mulai Main Kuis</span>
                    </Link>
                  </div>
                )}
              </div>
            ) : (
              <div>
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h2 className="font-heading font-extrabold text-xl sm:text-2xl text-[#FFE9B0]">
                      Riwayat Bacaan Anak
                    </h2>
                    <p className="sub-section text-white/85">
                      Lanjutkan membaca dari halaman terakhir yang dibuka
                    </p>
                  </div>
                  <Clock className="w-7 h-7 text-[#FFE9B0]" />
                </div>

                {historyItems.length > 0 ? (
                  <div className="flex flex-col gap-3.5">
                    {historyItems.map(({ story, lastPage, totalPages, completed }) => {
                      const percent = Math.round((lastPage / totalPages) * 100);
                      return (
                        <div
                          key={story.id}
                          className="bg-[#007A78] border border-[#1FAFAA]/50 rounded-2xl p-3.5 flex items-center gap-3.5 shadow-md"
                        >
                          <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-xl overflow-hidden shrink-0 border border-white/20">
                            <StoryIllustration
                              variant={story.cover}
                              title={story.judul}
                              alt={story.coverAlt || story.judul}
                              showCoverTitle={false}
                              sizeVariant="sm"
                              fit="cover"
                              loading="lazy"
                            />
                          </div>

                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-1.5">
                              <h3 className="font-heading font-extrabold text-base sm:text-lg text-[#FFE9B0] truncate">
                                {story.judul}
                              </h3>
                              {completed && (
                                <CheckCircle2
                                  className="w-4 h-4 text-[#1FAFAA] shrink-0"
                                  title="Selesai dibaca"
                                />
                              )}
                            </div>
                            <p className="sub-label text-white/85 mt-0.5">
                              {completed
                                ? `Selesai dibaca (${totalPages} halaman)`
                                : `Halaman terakhir: ${lastPage} dari ${totalPages}`}
                            </p>

                            {/* Progress Bar */}
                            <div className="mt-2 w-full h-2 bg-black/35 rounded-full overflow-hidden">
                              <div
                                className="h-full bg-[#E07030] rounded-full transition-all"
                                style={{ width: `${percent}%` }}
                              />
                            </div>
                          </div>

                          <Link
                            to={`/baca/${story.id}`}
                            className="min-h-[42px] px-3.5 py-2 rounded-full bg-[#E07030] hover:bg-[#C95B1E] text-white font-bold text-xs sm:text-sm flex items-center gap-1.5 shrink-0 shadow-sm"
                          >
                            <Play className="w-3.5 h-3.5 fill-white" />
                            <span>{completed ? 'Baca Lagi' : 'Lanjut'}</span>
                          </Link>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="py-10 text-center">
                    <BookOpen className="w-12 h-12 text-[#FFE9B0] mx-auto mb-2" />
                    <p className="font-heading font-bold text-lg text-[#FFE9B0]">
                      Belum Ada Riwayat Bacaan
                    </p>
                    <p className="sub-section text-white/85 mt-1">
                      Pilih cerita di Beranda untuk mulai membaca bersama anak!
                    </p>
                  </div>
                )}
              </div>
            )}
          </section>
        </div>
      </main>

      <Navigation />
    </div>
  );
}
