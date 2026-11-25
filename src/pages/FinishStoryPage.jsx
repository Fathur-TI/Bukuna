import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Heart, List, Share2, BookOpen, RotateCcw, Download } from 'lucide-react';
import Logo from '../components/Logo';
import StoryIllustration from '../components/StoryIllustration';
import ConfettiEffect from '../components/ConfettiEffect';
import { useBukuna } from '../context/BukunaContext';

/**
 * Halaman 11: Selesai Membaca (sesuai File 1 Halaman 5 kiri)
 * - Logo bukuna di kiri atas
 * - Teks besar "HORE!"
 * - Subteks "Kamu sudah menyelesaikan cerita [judul]"
 * - Gambar / sampul cerita di tengah
 * - Tombol "Kembali Ke Daftar Cerita"
 * - Tombol "Bagikan Cerita" (Web Share API + fallback salin link / ekspor .json untuk cerita pengguna)
 * - Dua tombol bawah: "Favorit" dan "Koleksi"
 * - Animasi konfeti ringan
 */
export default function FinishStoryPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const {
    getAnyStoryById,
    isFavorite,
    toggleFavorite,
    isInCollection,
    toggleCollection,
    hasQuizForStory,
    exportUserStory,
    showToast,
  } = useBukuna();

  const story = getAnyStoryById(id);
  const fav = isFavorite(story.id);
  const inCol = isInCollection(story.id);
  const isUserStory = story.sumber === 'pengguna';
  const hasQuiz = hasQuizForStory ? hasQuizForStory(story.id) : false;

  const handleShare = async () => {
    const shareUrl = `${window.location.origin}/cerita/${story.id}`;
    const shareData = {
      title: `Bukuna: ${story.judul}`,
      text: `Aku baru saja menyelesaikan cerita "${story.judul}" di BUKUNA! Yuk baca bersama!`,
      url: shareUrl,
    };

    if (navigator.share) {
      try {
        await navigator.share(shareData);
        showToast('Cerita berhasil dibagikan!');
        return;
      } catch {
        // Jika pengguna membatalkan dialog share atau gagal, lanjutkan fallback
      }
    }

    try {
      await navigator.clipboard.writeText(`${shareData.text} ${shareUrl}`);
      showToast('Tautan cerita berhasil disalin ke papan klip!');
    } catch {
      showToast(`Tautan cerita: ${shareUrl}`);
    }
  };

  const handleExportJson = async () => {
    try {
      const jsonStr = await exportUserStory(story.id);
      window.__LAST_EXPORTED_STORY_JSON__ = jsonStr;
      const blob = new Blob([jsonStr], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${story.id}.bukuna.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(() => {
        try {
          URL.revokeObjectURL(url);
        } catch {
          // Abaikan
        }
      }, 1500);
      showToast('File cadangan cerita (.json) berhasil diunduh!');
    } catch {
      showToast('Gagal mengekspor file cerita.');
    }
  };

  return (
    <div className="bukuna-doodle-bg min-h-screen flex flex-col items-center justify-between px-4 sm:px-6 py-6 relative overflow-hidden">
      <ConfettiEffect />

      {/* Header Logo Kiri Atas sesuai File 1 Hal 5 kiri */}
      <header className="w-full max-w-md flex items-center justify-between z-10">
        <button
          type="button"
          onClick={() => navigate('/beranda')}
          className="cursor-pointer focus:outline-none"
          aria-label="Ke Beranda Bukuna"
        >
          <Logo size="md" />
        </button>

        <button
          type="button"
          onClick={() => navigate(`/baca/${story.id}`)}
          className="min-h-[44px] px-3.5 py-1.5 rounded-full bg-white/15 hover:bg-white/25 text-xs font-bold text-[#FFE9B0] inline-flex items-center gap-1.5 cursor-pointer"
        >
          <RotateCcw className="w-4 h-4" />
          <span>Baca Ulang</span>
        </button>
      </header>

      {/* Konten Utama Selesai Membaca */}
      <main className="w-full max-w-md bg-[#005E5C]/85 backdrop-blur-md border-2 border-[#1FAFAA]/50 rounded-[34px] p-6 sm:p-8 my-4 text-center shadow-2xl z-10 flex flex-col items-center">
        <h1 className="font-heading font-extrabold text-4xl sm:text-5xl text-[#FFE9B0] tracking-wider drop-shadow-sm">
          HORE!
        </h1>

        <p className="sub-section mt-2 text-white">
          Kamu sudah menyelesaikan cerita
          <br />
          <span className="text-[#FFE9B0] text-base sm:text-lg font-extrabold">
            {story.judul}
          </span>
        </p>

        {/* Gambar / Sampul Cerita di Tengah */}
        <div className="mt-5 w-52 h-52 sm:w-60 sm:h-60 rounded-[26px] overflow-hidden shadow-xl border-4 border-[#E07030]">
          <StoryIllustration
            variant={story.cover}
            title={story.judul}
            alt={story.coverAlt || story.judul}
            showCoverTitle={true}
            sizeVariant="lg"
            fit="cover"
            loading="eager"
            objectPosition={story.objectPosition || 'center center'}
          />
        </div>

        {/* Tombol Besar Bergambar "Main Kuis", "Kembali Ke Daftar Cerita" & "Bagikan Cerita" */}
        <div className="w-full mt-6 flex flex-col gap-3">
          {hasQuiz && (
            <button
              type="button"
              onClick={() => navigate(`/kuis/${story.id}`)}
              className="w-full min-h-[60px] py-3.5 px-6 rounded-full bg-[#FFE9B0] hover:bg-white text-[#052625] border-4 border-[#E07030] font-heading font-extrabold text-lg sm:text-xl shadow-xl transition-all flex items-center justify-center gap-3 cursor-pointer"
            >
              <span className="text-2xl leading-none">🐱🎯</span>
              <span>Main Kuis</span>
            </button>
          )}

          <button
            type="button"
            onClick={() => navigate('/beranda')}
            className="w-full min-h-[50px] py-3 px-6 rounded-full bg-[#E07030] hover:bg-[#C95B1E] text-white font-heading font-extrabold text-base sm:text-lg shadow-lg transition-all flex items-center justify-center gap-2 cursor-pointer"
          >
            <BookOpen className="w-5 h-5" />
            <span>Kembali Ke Daftar Cerita</span>
          </button>

          <button
            type="button"
            onClick={handleShare}
            className="w-full min-h-[50px] py-3 px-6 rounded-full bg-[#1FAFAA] hover:bg-[#179691] text-[#052625] font-heading font-extrabold text-base sm:text-lg shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer"
          >
            <Share2 className="w-5 h-5" />
            <span>Bagikan Cerita</span>
          </button>

          {isUserStory && (
            <button
              type="button"
              onClick={handleExportJson}
              className="w-full min-h-[46px] py-2.5 px-5 rounded-full bg-white/15 hover:bg-white/25 text-[#FFE9B0] font-heading font-bold text-sm flex items-center justify-center gap-2 cursor-pointer"
            >
              <Download className="w-4 h-4" />
              <span>Unduh Cadangan Cerita (.json)</span>
            </button>
          )}
        </div>

        {/* Dua Tombol Bawah: "Favorit" & "Koleksi" (Persis File 1 Hal 5 kiri) */}
        <div className="w-full mt-4 grid grid-cols-2 gap-3">
          <button
            type="button"
            onClick={() => toggleFavorite(story.id)}
            className={`min-h-[48px] py-2.5 px-4 rounded-full font-heading font-bold text-sm sm:text-base flex items-center justify-center gap-2 border-2 transition-all cursor-pointer ${
              fav
                ? 'bg-[#E07030] border-[#FFE9B0] text-white'
                : 'bg-[#062D2C]/80 border-white/25 text-white hover:bg-[#062D2C]'
            }`}
          >
            <Heart className={`w-5 h-5 ${fav ? 'fill-white' : ''}`} />
            <span>{fav ? 'Favorit ✓' : 'Favorit'}</span>
          </button>

          <button
            type="button"
            onClick={() => toggleCollection(story.id)}
            className={`min-h-[48px] py-2.5 px-4 rounded-full font-heading font-bold text-sm sm:text-base flex items-center justify-center gap-2 border-2 transition-all cursor-pointer ${
              inCol
                ? 'bg-[#1FAFAA] border-[#FFE9B0] text-[#052625]'
                : 'bg-[#062D2C]/80 border-white/25 text-white hover:bg-[#062D2C]'
            }`}
          >
            <List className="w-5 h-5" />
            <span>{inCol ? 'Koleksi ✓' : 'Koleksi'}</span>
          </button>
        </div>
      </main>

      <div className="h-2" />
    </div>
  );
}
