import React from 'react';
import { Star } from 'lucide-react';

/**
 * Indikator Progres Kuis Berupa Bintang / Titik (src/components/quiz/StarProgress.jsx)
 * - Menampilkan deretan bintang visual untuk setiap soal (bukan angka pecahan yang kaku)
 */
export default function StarProgress({ total = 4, currentIndex = 0, isCurrentSolved = false }) {
  const items = Array.from({ length: total }, (_, idx) => idx);

  return (
    <div
      role="progressbar"
      aria-valuenow={currentIndex + (isCurrentSolved ? 1 : 0)}
      aria-valuemin={0}
      aria-valuemax={total}
      aria-label={`Progres kuis: bintang ${currentIndex + 1} dari ${total}`}
      className="flex items-center justify-center gap-2 sm:gap-3"
    >
      {items.map((idx) => {
        const isCompleted = idx < currentIndex || (idx === currentIndex && isCurrentSolved);
        const isActive = idx === currentIndex && !isCurrentSolved;

        return (
          <div
            key={idx}
            className={`w-9 h-9 sm:w-11 sm:h-11 rounded-full flex items-center justify-center transition-all border-2 ${
              isCompleted
                ? 'bg-[#E07030] border-[#FFE9B0] text-[#FFE9B0] scale-105 shadow-md'
                : isActive
                ? 'bg-[#FFE9B0] border-[#E07030] text-[#E07030] scale-110 shadow-lg'
                : 'bg-[#062D2C]/70 border-white/25 text-white/45'
            }`}
          >
            <Star
              className={`w-5 h-5 sm:w-6 sm:h-6 ${
                isCompleted ? 'fill-[#FFE9B0] text-[#FFE9B0]' : isActive ? 'fill-[#E07030] text-[#E07030]' : ''
              }`}
            />
          </div>
        );
      })}
    </div>
  );
}

