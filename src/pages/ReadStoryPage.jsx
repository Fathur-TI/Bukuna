import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Menu,
  ChevronLeft,
  ChevronRight,
  CheckCircle,
  Heart,
  Bookmark,
  Type,
  Home,
} from 'lucide-react';
import StoryIllustration, {
  resolvePublicStoryUrl,
  getSmallStoryUrl,
  isStaticStoryImagePath,
} from '../components/StoryIllustration';
import ParentReviewsSection from '../components/ParentReviewsSection';
import { useBukuna } from '../context/BukunaContext';

/**
 * Halaman 10: Halaman Membaca (sesuai File 1 Halaman 4 kanan)
 * - Tombol kembali (←) dan menu (☰) di atas
 * - Area gambar ilustrasi halaman di atas (atau kiri pada desktop 2 kolom)
 * - Kotak teks cerita di bawah (font besar dan nyaman dibaca anak)
 * - Navigasi "Sebelumnya", indikator "1/5", "Selanjutnya" (berubah jadi "Selesai" di halaman terakhir)
 * - Mendukung swipe kiri/kanan di layar sentuh & tombol panah keyboard
 * - Menyimpan progress ke Riwayat Bacaan
 */
export default function ReadStoryPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const {
    getAnyStoryById,
    updateReadingProgress,
    markStoryCompleted,
    isFavorite,
    toggleFavorite,
    isInCollection,
    toggleCollection,
    hasQuizForStory,
  } = useBukuna();

  const story = getAnyStoryById(id);
  const totalPages = story.pages.length;
  const hasQuiz = hasQuizForStory ? hasQuizForStory(story.id) : false;

  const [pageState, setPageState] = useState({ storyId: story.id, page: 0 });
  const currentPage = pageState.storyId === story.id ? pageState.page : 0;
  const setCurrentPage = (updater) => {
    setPageState((prev) => {
      const basePage = prev.storyId === story.id ? prev.page : 0;
      const nextPage = typeof updater === 'function' ? updater(basePage) : updater;
      return { storyId: story.id, page: nextPage };
    });
  };
  const [menuOpen, setMenuOpen] = useState(false);
  const [largeFont, setLargeFont] = useState(false);

  const touchStartX = useRef(null);
  const touchEndX = useRef(null);

  // Simpan progress ke Riwayat Bacaan setiap halaman berubah
  useEffect(() => {
    updateReadingProgress(story.id, currentPage + 1, totalPages, false);
  }, [story.id, currentPage, totalPages, updateReadingProgress]);

  const goPrev = () => {
    if (currentPage > 0) {
      setCurrentPage((prev) => prev - 1);
    }
  };

  const goNext = () => {
    if (currentPage < totalPages - 1) {
      setCurrentPage((prev) => prev + 1);
    } else {
      markStoryCompleted(story.id, totalPages);
      navigate(`/selesai/${story.id}`);
    }
  };

  // Dukungan tombol panah keyboard (ArrowLeft / ArrowRight)
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'ArrowLeft') {
        if (currentPage > 0) setCurrentPage((p) => p - 1);
      } else if (e.key === 'ArrowRight') {
        if (currentPage < totalPages - 1) {
          setCurrentPage((p) => p + 1);
        } else {
          markStoryCompleted(story.id, totalPages);
          navigate(`/selesai/${story.id}`);
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentPage, totalPages, story.id, markStoryCompleted, navigate]);

  // Dukungan swipe layar sentuh
  const handleTouchStart = (e) => {
    touchStartX.current = e.changedTouches[0].screenX;
  };

  const handleTouchEnd = (e) => {
    touchEndX.current = e.changedTouches[0].screenX;
    if (touchStartX.current === null || touchEndX.current === null) return;
    const diff = touchStartX.current - touchEndX.current;
    if (Math.abs(diff) > 45) {
      if (diff > 0) {
        // Swipe kiri -> halaman selanjutnya
        goNext();
      } else {
        // Swipe kanan -> halaman sebelumnya
        goPrev();
      }
    }
    touchStartX.current = null;
    touchEndX.current = null;
  };

  const safeIdx = Math.min(currentPage, totalPages - 1);
  const pageData = story.pages[safeIdx] || story.pages[0];
  const isLastPage = safeIdx === totalPages - 1;
  const fav = isFavorite(story.id);
  const inCol = isInCollection(story.id);

  // Preload gambar halaman berikutnya (dan sampul layar selesai saat di halaman terakhir)
  // agar perpindahan halaman mulus tanpa kedipan.
  useEffect(() => {
    const nextIdx = safeIdx + 1;
    const targetRaw =
      nextIdx < totalPages
        ? story.pages[nextIdx] && story.pages[nextIdx].gambar
        : story.cover;
    if (targetRaw && isStaticStoryImagePath(targetRaw)) {
      const lgUrl = resolvePublicStoryUrl(targetRaw);
      const smUrl = resolvePublicStoryUrl(getSmallStoryUrl(targetRaw));
      if (lgUrl) {
        const imgLg = new Image();
        imgLg.src = lgUrl;
      }
      if (smUrl && smUrl !== lgUrl) {
        const imgSm = new Image();
        imgSm.src = smUrl;
      }
    }
  }, [safeIdx, totalPages, story]);

  return (
    <div
      className="bukuna-doodle-bg min-h-screen flex flex-col justify-between px-4 sm:px-6 py-4 sm:py-6 select-none"
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      {/* Baris Atas: Judul Singkat & Menu Cepat */}
      <div className="w-full max-w-[1100px] mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 lg:gap-8 items-stretch">
          {/* AREA GAMBAR ILUSTRASI HALAMAN (Atas di Mobile, Kiri di Desktop) */}
          <div className="lg:col-span-6 relative rounded-[28px] overflow-hidden shadow-2xl border-4 border-[#1FAFAA]/60 bg-[#005E5C] aspect-[4/3.6] sm:aspect-[16/11] lg:aspect-auto lg:min-h-[480px]">
            {/* Tombol Kembali (←) dan Menu (☰) di atas area ilustrasi sesuai File 1 Hal 4 kanan */}
            <div className="absolute top-3.5 left-3.5 right-3.5 z-20 flex items-center justify-between">
              <button
                type="button"
                onClick={() => navigate(`/cerita/${story.id}`)}
                aria-label="Kembali ke Detail Cerita"
                className="w-11 h-11 rounded-full bg-black/45 hover:bg-black/65 backdrop-blur-xs text-white flex items-center justify-center transition-transform active:scale-95 cursor-pointer"
              >
                <ArrowLeft className="w-6 h-6" />
              </button>

              <span className="px-3.5 py-1 rounded-full bg-black/45 backdrop-blur-xs text-xs font-extrabold text-[#FFE9B0] truncate max-w-[60%]">
                {story.judul}
              </span>

              <div className="relative">
                <button
                  type="button"
                  onClick={() => setMenuOpen((prev) => !prev)}
                  aria-label="Menu Pengaturan Baca"
                  aria-expanded={menuOpen}
                  className="w-11 h-11 rounded-full bg-black/45 hover:bg-black/65 backdrop-blur-xs text-white flex items-center justify-center transition-transform active:scale-95 cursor-pointer"
                >
                  <Menu className="w-6 h-6" />
                </button>

                {menuOpen && (
                  <div className="absolute right-0 mt-2 w-60 rounded-2xl bg-[#005E5C] border-2 border-[#1FAFAA] shadow-2xl p-2 z-30 text-white">
                    <button
                      type="button"
                      onClick={() => {
                        setLargeFont((prev) => !prev);
                        setMenuOpen(false);
                      }}
                      className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-bold hover:bg-[#1FAFAA] hover:text-[#052625] transition-colors cursor-pointer text-left"
                    >
                      <Type className="w-4 h-4" />
                      <span>Ukuran Teks: {largeFont ? 'Sangat Besar' : 'Standar Anak'}</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        toggleFavorite(story.id);
                        setMenuOpen(false);
                      }}
                      className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-bold hover:bg-[#1FAFAA] hover:text-[#052625] transition-colors cursor-pointer text-left"
                    >
                      <Heart className={`w-4 h-4 ${fav ? 'fill-[#FFE9B0] text-[#FFE9B0]' : ''}`} />
                      <span>{fav ? 'Hapus dari Favorit' : 'Tambah ke Favorit'}</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        toggleCollection(story.id);
                        setMenuOpen(false);
                      }}
                      className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-bold hover:bg-[#1FAFAA] hover:text-[#052625] transition-colors cursor-pointer text-left"
                    >
                      <Bookmark className={`w-4 h-4 ${inCol ? 'fill-[#FFE9B0] text-[#FFE9B0]' : ''}`} />
                      <span>{inCol ? 'Hapus dari Koleksi' : 'Simpan ke Koleksi'}</span>
                    </button>

                    {hasQuiz && (
                      <button
                        type="button"
                        onClick={() => {
                          setMenuOpen(false);
                          navigate(`/kuis/${story.id}`);
                        }}
                        className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-bold hover:bg-[#FFE9B0] hover:text-[#052625] transition-colors cursor-pointer text-left"
                      >
                        <span className="text-base leading-none">🎯</span>
                        <span>Kerjakan Kuis Cerita Ini</span>
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={() => navigate('/beranda')}
                      className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-bold hover:bg-[#E07030] transition-colors cursor-pointer text-left border-t border-white/10 mt-1 pt-2"
                    >
                      <Home className="w-4 h-4" />
                      <span>Kembali ke Beranda</span>
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Ilustrasi Halaman Cerita (object-fit: contain di atas latar buram agar tidak terpotong) */}
            <StoryIllustration
              variant={pageData.gambar || story.cover}
              title=""
              alt={pageData.alt || story.judul}
              pageIndex={safeIdx}
              showCoverTitle={false}
              sizeVariant="lg"
              fit="contain-blur"
              loading={safeIdx === 0 ? 'eager' : 'lazy'}
              className="w-full h-full"
            />

            {/* Gambar halaman berikutnya (preload) & halaman lain yang belum tampil (loading="lazy") */}
            <div aria-hidden="true" className="hidden">
              {story.pages.map((p, idx) => {
                if (idx === safeIdx || !isStaticStoryImagePath(p.gambar)) return null;
                const isNextPage = idx === safeIdx + 1;
                return (
                  <img
                    key={`preload-page-${idx}`}
                    src={resolvePublicStoryUrl(p.gambar)}
                    alt=""
                    loading={isNextPage ? 'eager' : 'lazy'}
                    decoding="async"
                  />
                );
              })}
            </div>

            {/* Indikator Titik Halaman di Bawah Ilustrasi */}
            <div className="absolute bottom-3 left-0 right-0 flex items-center justify-center z-20 pointer-events-none">
              <div className="px-3 py-1.5 rounded-full bg-black/40 backdrop-blur-xs flex items-center gap-1.5 pointer-events-auto">
                {story.pages.map((p, idx) => (
                  <button
                    key={p.id || `read-dot-${idx}`}
                    type="button"
                    onClick={() => setCurrentPage(idx)}
                    aria-label={`Ke halaman ${idx + 1}`}
                    className={`h-2.5 rounded-full transition-all cursor-pointer ${
                      idx === safeIdx
                        ? 'w-7 bg-[#FFE9B0]'
                        : 'w-2.5 bg-white/60 hover:bg-white/90'
                    }`}
                  />
                ))}
              </div>
            </div>
          </div>

          {/* KOTAK TEKS CERITA & NAVIGASI HALAMAN (Bawah di Mobile, Kanan di Desktop, sesuai File 1 Hal 4 kanan) */}
          <div className="lg:col-span-6 flex flex-col justify-between bg-[#1FAFAA] text-[#052625] rounded-[28px] sm:rounded-[32px] p-4 sm:p-8 lg:p-10 shadow-2xl border-4 border-[#FFE9B0]/60 min-h-[270px] sm:min-h-[320px] lg:min-h-[480px]">
            <div>
              <div className="flex items-center justify-between gap-2 mb-3 sm:mb-4">
                <span className="sub-chip px-3 py-1 rounded-full bg-[#007A78] text-[#FFE9B0] shrink-0">
                  Halaman {safeIdx + 1} dari {totalPages}
                </span>
                <div className="flex items-center gap-2">
                  {hasQuiz && (
                    <button
                      type="button"
                      onClick={() => navigate(`/kuis/${story.id}`)}
                      className="sub-chip px-3 py-1 rounded-full bg-[#FFE9B0] hover:bg-white text-[#052625] border border-[#E07030] font-heading font-extrabold inline-flex items-center gap-1 shadow-xs transition-all cursor-pointer shrink-0"
                    >
                      <span>🎯</span>
                      <span>Main Kuis</span>
                    </button>
                  )}
                  <span className="sub-help text-[#052625]/80 truncate hidden sm:inline">
                    Geser atau tekan ← →
                  </span>
                </div>
              </div>

              {/* Teks Cerita Ramah Anak (Tetap Andika sesuai instruksi) */}
              <p
                className={`font-story font-bold text-[#042423] leading-[1.68] tracking-normal ${
                  largeFont
                    ? 'text-xl sm:text-2xl lg:text-3xl'
                    : 'text-base sm:text-xl lg:text-2xl'
                }`}
              >
                {pageData.teks}
              </p>
            </div>

            {/* Baris Navigasi Bawah: "Sebelumnya" — "1/5" — "Selanjutnya / Selesai" (Persis File 1 Hal 4 kanan) */}
            <div className="mt-6 sm:mt-8 pt-3.5 sm:pt-4 border-t-2 border-[#052625]/15 flex items-center justify-between gap-1.5 sm:gap-2">
              <button
                type="button"
                onClick={goPrev}
                disabled={safeIdx === 0}
                className={`min-h-[44px] sm:min-h-[48px] px-3 sm:px-5 py-2 sm:py-2.5 rounded-full font-heading font-extrabold text-xs sm:text-base inline-flex items-center gap-1 transition-all ${
                  safeIdx === 0
                    ? 'opacity-40 cursor-not-allowed bg-black/10 text-[#052625]'
                    : 'bg-[#007A78] hover:bg-[#005E5C] text-white shadow-md cursor-pointer'
                }`}
              >
                <ChevronLeft className="w-4 h-4 sm:w-5 sm:h-5 shrink-0" />
                <span>Sebelumnya</span>
              </button>

              {/* Indikator Halaman "1/5" */}
              <span
                aria-live="polite"
                className="font-heading font-extrabold text-sm sm:text-lg px-2.5 sm:px-3.5 py-1 sm:py-1.5 rounded-full bg-white/60 text-[#052625] shrink-0"
              >
                {safeIdx + 1}/{totalPages}
              </span>

              <button
                type="button"
                onClick={goNext}
                className={`min-h-[44px] sm:min-h-[48px] px-3.5 sm:px-6 py-2 sm:py-2.5 rounded-full font-heading font-extrabold text-xs sm:text-base inline-flex items-center gap-1 shadow-lg transition-all cursor-pointer ${
                  isLastPage
                    ? 'bg-[#E07030] hover:bg-[#C95B1E] text-white ring-2 ring-[#FFE9B0]'
                    : 'bg-[#E07030] hover:bg-[#C95B1E] text-white'
                }`}
              >
                {isLastPage ? (
                  <>
                    <span>Selesai</span>
                    <CheckCircle className="w-4 h-4 sm:w-5 sm:h-5 shrink-0" />
                  </>
                ) : (
                  <>
                    <span>Selanjutnya</span>
                    <ChevronRight className="w-4 h-4 sm:w-5 sm:h-5 shrink-0" />
                  </>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Bagian Paling Bawah Halaman Baca (Setelah Konten Utama Cerita): Catatan & Ulasan Orang Tua */}
        <ParentReviewsSection storyId={story.id} storyTitle={story.judul} />
      </div>
    </div>
  );
}
