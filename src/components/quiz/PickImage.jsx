import React from 'react';
import { CheckCircle2, Sparkles, Volume2 } from 'lucide-react';
import StoryIllustration from '../StoryIllustration';

/**
 * Tipe Soal 1: Pilih Gambar yang Benar (src/components/quiz/PickImage.jsx)
 * - Tombol jawaban minimal 96x96px di HP, jarak lega, 2-4 pilihan
 * - Mendukung emoji/ikon besar maupun gambar ilustrasi halaman cerita (StoryIllustration)
 */
export default function PickImage({
  question,
  triedOptionIds = [],
  feedbackState = 'idle',
  showHint = false,
  onSelectOption,
  onSpeakText,
}) {
  const options = Array.isArray(question.options) ? question.options : [];
  const isSolved = feedbackState === 'correct';

  return (
    <div className="space-y-5">
      {/* Ilustrasi / Media Pendukung Soal jika ada */}
      {question.media && (
        <div className="mx-auto max-w-sm bg-[#062D2C]/80 border-2 border-[#1FAFAA]/60 rounded-[26px] p-4 flex flex-col items-center justify-center text-center shadow-inner">
          {question.media.gambar ? (
            <div className="w-40 h-32 rounded-2xl overflow-hidden border-2 border-[#FFE9B0]/60 mb-2">
              <StoryIllustration
                variant={question.media.gambar}
                title={question.media.label || ''}
                alt={question.media.label || 'Gambar soal'}
                showCoverTitle={false}
                className="w-full h-full"
              />
            </div>
          ) : (
            <div
              role="img"
              aria-label={question.media.label || 'Ilustrasi soal'}
              className="text-5xl sm:text-6xl mb-1.5 select-none"
            >
              {question.media.emoji || '✨'}
            </div>
          )}
          {question.media.label && (
            <span className="text-xs sm:text-sm font-extrabold text-[#FFE9B0]">
              {question.media.label}
            </span>
          )}
        </div>
      )}

      {/* Grid Pilihan Gambar Besar (minimal 96x96px di HP, jarak lega) */}
      <div
        role="group"
        aria-label="Pilihan gambar jawaban"
        className={`grid gap-4 sm:gap-5 ${
          options.length === 2
            ? 'grid-cols-2 max-w-lg mx-auto'
            : options.length === 4
            ? 'grid-cols-2 sm:grid-cols-4'
            : 'grid-cols-1 sm:grid-cols-3'
        }`}
      >
        {options.map((opt) => {
          const wasTried = triedOptionIds.includes(opt.id);
          const isCorrectOpt = Boolean(opt.isCorrect);
          const highlightAsHint = showHint && isCorrectOpt && !isSolved;
          const highlightAsSolved = isSolved && isCorrectOpt;

          return (
            <button
              key={opt.id}
              type="button"
              disabled={isSolved}
              aria-label={`Pilih jawaban: ${opt.label}`}
              onClick={() => {
                if (onSpeakText && opt.label) {
                  onSpeakText(opt.label);
                }
                onSelectOption(isCorrectOpt, opt.id);
              }}
              className={`relative min-h-[124px] min-w-[96px] p-4 sm:p-5 rounded-[28px] border-4 flex flex-col items-center justify-center gap-2.5 text-center transition-all shadow-xl cursor-pointer ${
                highlightAsSolved
                  ? 'bg-[#1FAFAA] border-[#FFE9B0] text-[#052625] scale-105 ring-4 ring-[#FFE9B0]'
                  : highlightAsHint
                  ? 'bg-[#E07030] border-[#FFE9B0] text-white ring-4 ring-[#FFE9B0] scale-105 bukuna-hint-glow'
                  : wasTried
                  ? 'bg-[#062D2C]/50 border-white/15 text-white/60 opacity-40'
                  : 'bg-[#E07030] hover:bg-[#C95B1E] border-white/30 hover:border-[#FFE9B0] text-white active:scale-95'
              }`}
            >
              {/* Lencana Petunjuk jika sudah 2x mencoba */}
              {highlightAsHint && (
                <span className="absolute -top-3 right-3 px-3 py-0.5 rounded-full bg-[#FFE9B0] text-[#052625] text-xs font-extrabold shadow-md inline-flex items-center gap-1">
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Pilih Ini!</span>
                </span>
              )}

              {/* Lencana Benar */}
              {highlightAsSolved && (
                <span className="absolute top-2.5 right-2.5 w-8 h-8 rounded-full bg-[#052625] text-[#FFE9B0] flex items-center justify-center shadow-md">
                  <CheckCircle2 className="w-5 h-5" />
                </span>
              )}

              {/* Gambar atau Emoji Besar */}
              {opt.gambar ? (
                <div className="w-full max-w-[160px] aspect-[4/3.2] rounded-2xl overflow-hidden border-2 border-white/30 bg-[#005E5C]">
                  <StoryIllustration
                    variant={opt.gambar}
                    title={opt.label}
                    alt={opt.label}
                    showCoverTitle={false}
                    className="w-full h-full"
                  />
                </div>
              ) : (
                <span
                  role="img"
                  aria-label={opt.label}
                  className="text-5xl sm:text-6xl leading-none select-none py-1"
                >
                  {opt.emoji || '🌟'}
                </span>
              )}

              <span className="font-heading font-extrabold text-base sm:text-lg leading-snug">
                {opt.label}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

