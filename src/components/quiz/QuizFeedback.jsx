import React from 'react';
import { Sparkles, ArrowRight, Volume2 } from 'lucide-react';
import Mascot from './Mascot';

/**
 * Komponen Umpan Balik Kuis Ramah Anak (src/components/quiz/QuizFeedback.jsx)
 * - Benar: bintang/konfeti kecil, pesan "Hebat!", maskot tersenyum, tombol besar lanjut ke soal berikutnya
 * - Belum tepat: goyangan lembut, pesan "Ayo coba lagi!", TANPA warna merah menyeramkan & TANPA kata "salah"
 */
export default function QuizFeedback({
  feedbackState,
  feedbackMessage,
  showHint,
  hintText,
  isLastQuestion,
  onNextQuestion,
  onSpeakFeedback,
}) {
  if (feedbackState === 'idle') return null;

  const isCorrect = feedbackState === 'correct';

  return (
    <div
      role="status"
      aria-live="polite"
      className={`mt-5 rounded-[28px] p-4 sm:p-5 border-4 shadow-xl transition-all ${
        isCorrect
          ? 'bg-[#1FAFAA] border-[#FFE9B0] text-[#052625]'
          : 'bg-[#005E5C] border-[#FFE9B0]/80 text-white bukuna-gentle-shake'
      }`}
    >
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-3.5 text-center sm:text-left flex-col sm:flex-row">
          <Mascot mood={isCorrect ? 'happy' : 'encouraging'} size="sm" />

          <div>
            <div className="inline-flex items-center gap-1.5 font-heading font-extrabold text-xl sm:text-2xl">
              <span>{isCorrect ? '🌟 Hebat!' : '💡 Ayo Coba Lagi!'}</span>
            </div>
            <p
              className={`sub-section mt-1 ${
                isCorrect ? 'text-[#052625]' : 'text-[#FFE9B0]'
              }`}
            >
              {feedbackMessage}
            </p>
            {!isCorrect && showHint && hintText && (
              <p className="sub-help mt-1.5 text-white bg-[#062D2C]/80 px-3 py-1.5 rounded-xl inline-block">
                ✨ Petunjuk Rodri: Pilihan yang bersinar kuning adalah jawabannya!
              </p>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2.5 w-full sm:w-auto justify-center">
          {onSpeakFeedback && (
            <button
              type="button"
              onClick={() => onSpeakFeedback(feedbackMessage)}
              aria-label="Dengarkan pesan Rodri"
              className="w-12 h-12 rounded-full bg-[#062D2C] hover:bg-[#052625] text-[#FFE9B0] flex items-center justify-center shadow-md shrink-0 cursor-pointer"
            >
              <Volume2 className="w-6 h-6" />
            </button>
          )}

          {isCorrect && (
            <button
              type="button"
              onClick={onNextQuestion}
              className="w-full sm:w-auto min-h-[56px] px-7 py-3 rounded-full bg-[#E07030] hover:bg-[#C95B1E] text-white font-heading font-extrabold text-lg sm:text-xl shadow-lg inline-flex items-center justify-center gap-2 border-2 border-[#FFE9B0] transition-all cursor-pointer"
            >
              <Sparkles className="w-5 h-5" />
              <span>{isLastQuestion ? 'Lihat Bintangmu!' : 'Lanjut Soal Berikutnya'}</span>
              <ArrowRight className="w-6 h-6" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

