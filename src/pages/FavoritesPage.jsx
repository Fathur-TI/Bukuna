import React from 'react';
import { Link } from 'react-router-dom';
import { Heart, BookOpen } from 'lucide-react';
import Header from '../components/Header';
import Navigation from '../components/Navigation';
import StoryCard from '../components/StoryCard';
import ColorfulTitle from '../components/ColorfulTitle';
import { useBukuna } from '../context/BukunaContext';

/**
 * Halaman 7: Favorit ("Cerita Favorit") sesuai File 2 Halaman 2 kiri & File 1 Halaman 3 kanan
 * Menampilkan grid kartu cerita yang diberi tanda favorit dan empty state ramah jika kosong.
 */
export default function FavoritesPage() {
  const { stories, favorites, isFavorite } = useBukuna();

  const favoriteStories = stories.filter((story) =>
    isFavorite
      ? isFavorite(story.id)
      : favorites.includes(story.id) || Boolean(story.slug && favorites.includes(story.slug))
  );

  return (
    <div className="bukuna-doodle-bg min-h-screen flex flex-col pb-24 lg:pb-12">
      <Header />

      <main className="flex-1 w-full max-w-[1200px] mx-auto px-4 sm:px-6 pt-4 pb-8">
        <div className="flex items-center justify-between gap-3 mb-5">
          <div>
            <ColorfulTitle
              as="h1"
              text="Cerita Favorit"
              className="font-heading font-extrabold text-2xl sm:text-3xl text-[#FFE9B0]"
            />
            <p className="sub-section text-white/90 mt-0.5">
              {favoriteStories.length > 0
                ? `${favoriteStories.length} cerita pilihan yang paling kamu sukai`
                : 'Simpan cerita kesukaanmu agar mudah dibaca kembali'}
            </p>
          </div>
        </div>

        {favoriteStories.length > 0 ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-5">
            {favoriteStories.map((story) => (
              <StoryCard key={story.id} story={story} showProgress={true} />
            ))}
          </div>
        ) : (
          <div className="mt-8 bg-[#005E5C]/90 border-2 border-[#1FAFAA]/50 rounded-[32px] p-8 sm:p-12 text-center max-w-lg mx-auto shadow-xl">
            <div className="w-20 h-20 rounded-full bg-[#E07030]/20 border-2 border-[#E07030] flex items-center justify-center mx-auto mb-4">
              <Heart className="w-10 h-10 text-[#FFE9B0]" />
            </div>
            <h2 className="font-heading text-2xl font-extrabold text-[#FFE9B0]">
              Belum Ada Cerita Favorit
            </h2>
            <p className="sub-section mt-2 text-white/90">
              Ketuk ikon hati pada kartu cerita atau di halaman detail cerita untuk menambahkan buku cerita kesukaanmu ke sini!
            </p>
            <Link
              to="/beranda"
              className="mt-6 inline-flex items-center justify-center gap-2 min-h-[48px] px-7 py-3 rounded-full bg-[#E07030] hover:bg-[#C95B1E] text-white font-heading font-bold text-base shadow-lg transition-all"
            >
              <BookOpen className="w-5 h-5" />
              <span>Jelajahi Pilihan Cerita</span>
            </Link>
          </div>
        )}
      </main>

      <Navigation />
    </div>
  );
}

