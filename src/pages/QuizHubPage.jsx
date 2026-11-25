import React from 'react';
import { Link } from 'react-router-dom';
import { Play, Star, Sparkles, Volume2 } from 'lucide-react';
import Header from '../components/Header';
import Navigation from '../components/Navigation';
import StoryIllustration from '../components/StoryIllustration';
import ColorfulTitle from '../components/ColorfulTitle';
import Mascot from '../components/quiz/Mascot';
import useSpeech from '../hooks/useSpeech';
import { useBukuna } from '../context/BukunaContext';
import { STORY_QUIZZES, GENERAL_QUIZZES } from '../data/quizzes';

/**
 * Halaman Pusat Kuis Interaktif Anak (/kuis) (src/pages/QuizHubPage.jsx)
 * - Menampilkan daftar Kuis Cerita Bawaan (+ kuis cerita pengguna bila ada)
 * - Menampilkan daftar Kuis Umum Latihan Anak Usia Dini (Hewan, Warna, Bentuk, Angka 1-10)
 * - Menampilkan perolehan bintang terbaik (1-3 bintang) pada kuis yang pernah dimainkan
 */
export default function QuizHubPage() {
  const { speak } = useSpeech();
  const { myStories, getBestQuizStars } = useBukuna();

  // Gabungkan kuis cerita pengguna (untuk kesiapan Tahap 3) dengan kuis cerita bawaan
  const userStoryQuizzes = (myStories || [])
    .filter((s) => s.quiz && Array.isArray(s.quiz.questions) && s.quiz.questions.length > 0)
    .map((s) => ({
      id: `kuis-${s.id}`,
      storyId: s.id,
      judul: s.quiz.judul || `Kuis ${s.judul}`,
      kategori: 'Cerita Buatanku',
      usia: s.usia || '4-5 Tahun',
      cover: s.cover || 'cat-magic-forest',
      icon: '📖',
      deskripsi: `Mainkan kuis seru dari cerita "${s.judul}"!`,
      isGeneral: false,
      questions: s.quiz.questions,
    }));

  const allStoryQuizzes = [...userStoryQuizzes, ...STORY_QUIZZES];

  return (
    <div className="bukuna-doodle-bg min-h-screen flex flex-col pb-24 lg:pb-12">
      <Header />

      <main className="flex-1 w-full max-w-[1160px] mx-auto px-4 sm:px-6 pt-3 pb-10">
        {/* Banner Sambutan Maskot Rodri */}
        <section className="bg-[#005E5C]/95 border-2 border-[#1FAFAA] rounded-[32px] p-5 sm:p-7 mb-7 shadow-xl flex flex-col md:flex-row items-center justify-between gap-4">
          <Mascot
            mood="happy"
            size="md"
            message="Yuk bermain Kuis Gambar & Suara! Pilih permainan kesukaanmu di bawah ini ya!"
          />

          <button
            type="button"
            onClick={() =>
              speak(
                'Selamat datang di Kuis Interaktif Bukuna! Pilih kartu kuis bergambar untuk mulai bermain bersama Rodri.'
              )
            }
            className="min-h-[48px] px-5 py-2.5 rounded-full bg-[#1FAFAA] hover:bg-[#159A95] text-[#052625] font-heading font-extrabold text-sm inline-flex items-center gap-2 shadow-md transition-all shrink-0 cursor-pointer"
          >
            <Volume2 className="w-5 h-5" />
            <span>Dengarkan Petunjuk</span>
          </button>
        </section>

        {/* Bagian 1: Kuis dari Cerita BUKUNA */}
        <section className="mb-9">
          <div className="flex items-center gap-2.5 mb-4">
            <Sparkles className="w-6 h-6 text-[#FFE9B0]" />
            <ColorfulTitle
              as="h1"
              text="Kuis Cerita Seru"
              className="font-heading font-extrabold text-2xl sm:text-3xl text-[#FFE9B0]"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {allStoryQuizzes.map((quiz) => {
              const bestStars = getBestQuizStars ? getBestQuizStars(quiz.storyId) : 0;

              return (
                <div
                  key={quiz.id}
                  className="bg-[#005E5C]/95 border-2 border-[#1FAFAA]/60 rounded-[28px] overflow-hidden shadow-xl flex flex-col justify-between"
                >
                  <div>
                    <div className="relative aspect-[4/3.3] w-full bg-[#007A78] overflow-hidden">
                      <StoryIllustration
                        variant={quiz.cover}
                        title={quiz.judul}
                        alt={quiz.coverAlt || quiz.judul}
                        showCoverTitle={false}
                        sizeVariant="sm"
                        fit="cover"
                        loading="eager"
                        className="w-full h-full"
                      />

                      <div className="absolute top-3 left-3 right-3 flex items-center justify-between gap-2">
                        <span className="sub-chip px-3 py-1 rounded-full bg-[#062D2C]/90 text-[#FFE9B0] border border-[#FFE9B0]/40">
                          {quiz.icon} {quiz.questions.length} Soal
                        </span>

                        {bestStars > 0 && (
                          <span
                            aria-label={`Rekor terbaik: ${bestStars} bintang`}
                            className="sub-chip px-3 py-1 rounded-full bg-[#E07030] text-[#FFE9B0] shadow-md inline-flex items-center gap-1"
                          >
                            {Array.from({ length: bestStars }, (_, i) => (
                              <Star key={i} className="w-3.5 h-3.5 fill-[#FFE9B0]" />
                            ))}
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="p-4 sm:p-5">
                      <span className="sub-label text-[#1FAFAA] uppercase tracking-wider">
                        {quiz.kategori} • {quiz.usia}
                      </span>
                      <h2 className="mt-1 font-heading font-extrabold text-xl text-[#FFE9B0] leading-snug">
                        {quiz.judul}
                      </h2>
                      <p className="sub-section mt-1.5 text-white/90 line-clamp-2">
                        {quiz.deskripsi}
                      </p>
                    </div>
                  </div>

                  <div className="p-4 sm:p-5 pt-0">
                    <Link
                      to={`/kuis/${quiz.storyId}`}
                      className="w-full min-h-[52px] py-3 px-6 rounded-full bg-[#E07030] hover:bg-[#C95B1E] text-white font-heading font-extrabold text-base sm:text-lg border-2 border-[#FFE9B0] shadow-lg flex items-center justify-center gap-2 transition-all"
                    >
                      <Play className="w-5 h-5 fill-white" />
                      <span>Main Kuis</span>
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* Bagian 2: Kuis Umum Latihan Anak Usia Dini (Hewan, Warna, Bentuk, Angka 1-10) */}
        <section className="bg-[#1FAFAA] rounded-[34px] p-5 sm:p-7 shadow-xl border-4 border-[#FFE9B0]/60">
          <div className="mb-5 text-center sm:text-left">
            <h2 className="font-heading font-extrabold text-2xl sm:text-3xl text-[#052625]">
              🎯 Latihan Pintar Anak Usia Dini
            </h2>
            <p className="sub-section text-[#052625]/85 mt-0.5">
              Mengenal hewan, warna, bentuk, dan berhitung angka 1–10 dengan suara & gambar besar
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {GENERAL_QUIZZES.map((gQuiz) => {
              const bestStars = getBestQuizStars ? getBestQuizStars(gQuiz.storyId) : 0;

              return (
                <div
                  key={gQuiz.id}
                  className="bg-[#005E5C] border-2 border-[#FFE9B0]/60 rounded-[26px] p-4 sm:p-5 flex flex-col justify-between shadow-lg"
                >
                  <div>
                    <div className="flex items-center justify-between gap-2 mb-3">
                      <span className="w-14 h-14 rounded-2xl bg-[#FFE9B0] text-3xl flex items-center justify-center shadow">
                        {gQuiz.icon}
                      </span>

                      {bestStars > 0 && (
                        <span className="sub-chip px-2.5 py-1 rounded-full bg-[#E07030] text-[#FFE9B0] inline-flex items-center gap-0.5">
                          {Array.from({ length: bestStars }, (_, i) => (
                            <Star key={i} className="w-3.5 h-3.5 fill-[#FFE9B0]" />
                          ))}
                        </span>
                      )}
                    </div>

                    <span className="sub-label text-[#FFE9B0] uppercase tracking-wider">
                      {gQuiz.kategori}
                    </span>
                    <h3 className="mt-1 font-heading font-extrabold text-lg text-white leading-snug">
                      {gQuiz.judul}
                    </h3>
                    <p className="sub-label mt-1.5 text-white/85">
                      {gQuiz.deskripsi}
                    </p>
                  </div>

                  <Link
                    to={`/kuis/${gQuiz.storyId}`}
                    className="mt-4 w-full min-h-[48px] py-2.5 px-4 rounded-full bg-[#E07030] hover:bg-[#C95B1E] text-white font-heading font-extrabold text-sm sm:text-base border-2 border-[#FFE9B0] shadow-md flex items-center justify-center gap-2 transition-all"
                  >
                    <Play className="w-4 h-4 fill-white" />
                    <span>Main Sekarang</span>
                  </Link>
                </div>
              );
            })}
          </div>
        </section>
      </main>

      <Navigation />
    </div>
  );
}

