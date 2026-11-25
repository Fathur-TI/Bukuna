import React from 'react';
import { Star, RotateCcw, BookOpen, Home, Volume2 } from 'lucide-react';
import ConfettiEffect from '../ConfettiEffect';
import Mascot from './Mascot';

/**
 * Layar Hasil Kuis Interaktif (src/components/quiz/QuizResult.jsx)
 * - Menampilkan "HORE!", 1-3 bintang besar (tidak pernah 0 bintang),
 *   maskot Rodri merayakan, serta tombol "Main Lagi", "Cerita Lain", dan "Kembali ke Beranda".
 */
export default function QuizResult({
  quiz,
  stars = 3,
  onPlayAgain,
  onOtherStories,
  onGoHome,
  onSpeakResult,
}) {
  const safeStars = Math.max(1, Math.min(3, stars || 3));

  const praiseText =
    safeStars === 3
      ? 'Hore! Kamu hebat sekali menyelesaikan semua permainan dengan penuh semangat!'
      : safeStars === 2
      ? 'Hore! Kamu pintar dan tidak mudah menyerah menyelesaikan kuis ini!'
      : 'Hore! Terima kasih sudah berani mencoba dan belajar bersama Rodri hari ini!';

  return (
    <div className="relative w-full max-w-[720px] mx-auto bg-[#005E5C]/95 border-4 border-[#FFE9B0] rounded-[36px] p-6 sm:p-9 shadow-2xl text-center overflow-hidden">
      <ConfettiEffect />

      <div className="relative z-10 flex flex-col items-center">
        {/* Tombol Suara Hasil */}
        {onSpeakResult && (
          <button
            type="button"
            onClick={() => onSpeakResult(`Hore! Kamu mendapat ${safeStars} bintang emas! ${praiseText}`)}
            aria-label="Dengarkan ucapan selamat"
            className="mb-3 min-h-[44px] px-4 py-2 rounded-full bg-[#1FAFAA] hover:bg-[#159A95] text-[#052625] font-heading font-extrabold text-xs sm:text-sm inline-flex items-center gap-2 shadow-md cursor-pointer"
          >
            <Volume2 className="w-4 h-4" />
            <span>Dengarkan Ucapan Rodri</span>
          </button>
        )}

        {/* Judul Besar HORE! */}
        <h1 className="font-heading font-extrabold text-4xl sm:text-5xl text-[#FFE9B0] tracking-wide drop-shadow-sm">
          HORE! 🎉
        </h1>
        <p className="mt-1.5 font-heading font-bold text-lg sm:text-xl text-white">
          Kamu selesai bermain <span className="text-[#FFE9B0]">{quiz.judul}</span>
        </p>

        {/* Deretan 1-3 Bintang Besar (Tidak pernah 0) */}
        <div
          role="img"
          aria-label={`Hasil kuis: ${safeStars} dari 3 bintang`}
          className="my-6 flex items-center justify-center gap-3 sm:gap-5"
        >
          {[1, 2, 3].map((num) => {
            const earned = num <= safeStars;
            return (
              <div
                key={num}
                className={`w-20 h-20 sm:w-24 sm:h-24 rounded-3xl flex items-center justify-center border-4 transition-all ${
                  earned
                    ? 'bg-[#E07030] border-[#FFE9B0] shadow-xl scale-105'
                    : 'bg-[#062D2C]/60 border-white/20 opacity-45'
                }`}
              >
                <Star
                  className={`w-12 h-12 sm:w-14 sm:h-14 ${
                    earned ? 'fill-[#FFE9B0] text-[#FFE9B0]' : 'text-white/40'
                  }`}
                />
              </div>
            );
          })}
        </div>

        {/* Maskot Rodri Merayakan */}
        <Mascot mood="celebrate" size="md" message={praiseText} />

        {/* Tiga Tombol Aksi sesuai Spesifikasi: "Main Lagi", "Cerita Lain", "Kembali ke Beranda" */}
        <div className="mt-8 w-full flex flex-col sm:flex-row items-center justify-center gap-3">
          <button
            type="button"
            onClick={onPlayAgain}
            className="w-full sm:w-auto min-h-[54px] px-7 py-3.5 rounded-full bg-[#E07030] hover:bg-[#C95B1E] text-white font-heading font-extrabold text-base sm:text-lg border-2 border-[#FFE9B0] shadow-lg inline-flex items-center justify-center gap-2 transition-all cursor-pointer"
          >
            <RotateCcw className="w-5 h-5" />
            <span>Main Lagi</span>
          </button>

          <button
            type="button"
            onClick={onOtherStories}
            className="w-full sm:w-auto min-h-[54px] px-7 py-3.5 rounded-full bg-[#1FAFAA] hover:bg-[#159A95] text-[#052625] font-heading font-extrabold text-base sm:text-lg shadow-lg inline-flex items-center justify-center gap-2 transition-all cursor-pointer"
          >
            <BookOpen className="w-5 h-5" />
            <span>Cerita Lain</span>
          </button>

          <button
            type="button"
            onClick={onGoHome}
            className="w-full sm:w-auto min-h-[54px] px-6 py-3.5 rounded-full bg-white/15 hover:bg-white/25 text-white font-heading font-bold text-base sm:text-lg inline-flex items-center justify-center gap-2 transition-all cursor-pointer"
          >
            <Home className="w-5 h-5" />
            <span>Kembali ke Beranda</span>
          </button>
        </div>
      </div>
    </div>
  );
}

