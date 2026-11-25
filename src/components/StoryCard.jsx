import React from 'react';
import { Link } from 'react-router-dom';
import { Heart } from 'lucide-react';
import StoryIllustration from './StoryIllustration';
import { useBukuna } from '../context/BukunaContext';

/**
 * Kartu Cerita Oranye Terang sesuai persis File 2 (Hal 2 kiri "Beranda"):
 * - Sudut sangat membulat (rounded-[24px])
 * - Warna latar oranye hangat (#E07030)
 * - Ilustrasi sampul persegi di atas
 * - Badge "Buatanku" jika cerita dibuat oleh pengguna (story.sumber === 'pengguna')
 * - Judul tebal warna krem/putih di kiri bawah + tombol hati (Favorit)
 * - Tag kategori & usia di bawah judul
 */
export default function StoryCard({ story, showProgress = false }) {
  const { isFavorite, toggleFavorite, getStoryProgress, hasQuizForStory } = useBukuna();
  const fav = isFavorite(story.id);
  const progress = getStoryProgress(story.id);
  const isUserStory = story.sumber === 'pengguna';
  const hasQuiz = hasQuizForStory ? hasQuizForStory(story.id) : false;

  const handleFavoriteClick = (e) => {
    e.preventDefault();
    e.stopPropagation();
    toggleFavorite(story.id);
  };

  return (
    <Link
      to={`/cerita/${story.id}`}
      className="bukuna-card-hover group block w-full max-w-[290px] bg-[#E07030] rounded-[24px] p-2.5 sm:p-3 shadow-[0_6px_16px_rgba(0,45,44,0.28)] border-2 border-white/15 focus:outline-none"
    >
      {/* Sampul Cerita */}
      <div className="relative aspect-[4/4.3] w-full rounded-[18px] overflow-hidden bg-[#005E5C] shadow-inner">
        <StoryIllustration
          variant={story.cover}
          title={story.judul}
          alt={story.coverAlt || story.judul}
          showCoverTitle={true}
          sizeVariant="sm"
          fit="cover"
          loading="eager"
          objectPosition={story.objectPosition || 'center center'}
        />

        {/* Badge "Buatanku" & "+Kuis" */}
        <div className="absolute top-2 left-2 right-2 z-20 flex items-center justify-between gap-1 pointer-events-none">
          {isUserStory ? (
            <span className="sub-chip px-2.5 py-0.5 rounded-full bg-[#062D2C]/90 border border-[#FFE9B0] text-[#FFE9B0] shadow-md">
              Buatanku
            </span>
          ) : (
            <span />
          )}

          {hasQuiz && (
            <span className="sub-chip px-2 py-0.5 rounded-full bg-[#1FAFAA]/95 text-[#052625] border border-[#FFE9B0] shadow-md">
              🎯 Kuis
            </span>
          )}
        </div>

        {/* Badge progres baca jika diminta */}
        {showProgress && progress && (
          <div className="sub-chip absolute bottom-2 left-2 right-2 px-2.5 py-1 rounded-full bg-black/65 backdrop-blur-xs text-[#FFE9B0] flex items-center justify-between">
            <span>
              {progress.completed
                ? '✓ Selesai Dibaca'
                : `Halaman ${progress.lastPage}/${progress.totalPages}`}
            </span>
          </div>
        )}
      </div>

      {/* Info Bawah Kartu Oranye */}
      <div className="pt-2.5 px-1 flex items-start justify-between gap-1.5">
        <div className="min-w-0 flex-1">
          <h3 className="font-heading font-extrabold text-white text-sm sm:text-base leading-snug line-clamp-1 group-hover:text-[#FFE9B0] transition-colors">
            {story.judul}
          </h3>
          <p className="sub-label text-[#FFE9B0] mt-0.5 truncate">
            {story.kategori} • {story.usia}
          </p>
        </div>

        <button
          type="button"
          onClick={handleFavoriteClick}
          aria-label={fav ? `Hapus ${story.judul} dari Favorit` : `Tambah ${story.judul} ke Favorit`}
          className="min-w-[36px] min-h-[36px] -mr-1 -mt-0.5 rounded-full flex items-center justify-center text-white hover:bg-black/15 active:scale-90 transition-transform cursor-pointer"
        >
          <Heart
            className={`w-5 h-5 transition-transform ${
              fav ? 'fill-[#FFE9B0] text-[#FFE9B0] scale-110' : 'text-white/90'
            }`}
          />
        </button>
      </div>
    </Link>
  );
}
