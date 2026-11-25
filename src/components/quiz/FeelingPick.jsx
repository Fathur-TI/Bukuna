import React from 'react';
import { CheckCircle2, Sparkles } from 'lucide-react';

/**
 * Tipe Soal 6: Perasaan Tokoh (Wajah Emoji) (src/components/quiz/FeelingPick.jsx)
 * - Pilihan wajah ekspresi besar: Senang, Sedih, Takut, Marah (minimal 96x96px di HP)
 */
export default function FeelingPick({
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
      {/* Ilustrasi Adegan Perasaan */}
      {question.media && (
        <div className="mx-auto max-w-md bg-[#062D2C]/85 border-2 border-[#1FAFAA]/60 rounded-[26px] p-4 text-center shadow-inner">
          <div className="text-4xl sm:text-5xl mb-1 select-none">
            {question.media.emoji || '🐱💛'}
          </div>
          {question.media.label && (
            <p className="text-xs sm:text-sm font-extrabold text-[#FFE9B0]">
              {question.media.label}
            </p>
          )}
        </div>
      )}

      {/* Grid Pilihan Ekspresi Wajah */}
      <div
        role="group"
        aria-label="Pilihan ekspresi perasaan tokoh"
        className={`grid gap-4 sm:gap-5 ${
          options.length === 4 ? 'grid-cols-2 sm:grid-cols-4' : 'grid-cols-1 sm:grid-cols-3'
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
              aria-label={`Perasaan ${opt.label}`}
              onClick={() => {
                if (onSpeakText && opt.label) {
                  onSpeakText(opt.label);
                }
                onSelectOption(isCorrectOpt, opt.id);
              }}
              className={`relative min-h-[124px] min-w-[96px] p-4 sm:p-5 rounded-[28px] border-4 flex flex-col items-center justify-center gap-2 shadow-xl transition-all cursor-pointer ${
                highlightAsSolved
                  ? 'bg-[#1FAFAA] border-[#FFE9B0] text-[#052625] scale-105 ring-4 ring-[#FFE9B0]'
                  : highlightAsHint
                  ? 'bg-[#E07030] border-[#FFE9B0] text-white ring-4 ring-[#FFE9B0] scale-105 bukuna-hint-glow'
                  : wasTried
                  ? 'bg-[#062D2C]/50 border-white/15 text-white/50 opacity-40'
                  : 'bg-[#E07030] hover:bg-[#C95B1E] border-white/30 hover:border-[#FFE9B0] text-white active:scale-95'
              }`}
            >
              {highlightAsHint && (
                <span className="absolute -top-3 right-2 px-2.5 py-0.5 rounded-full bg-[#FFE9B0] text-[#052625] text-xs font-extrabold shadow-md inline-flex items-center gap-1">
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Ini!</span>
                </span>
              )}

              {highlightAsSolved && (
                <span className="absolute top-2.5 right-2.5 w-8 h-8 rounded-full bg-[#052625] text-[#FFE9B0] flex items-center justify-center">
                  <CheckCircle2 className="w-5 h-5" />
                </span>
              )}

              <span
                role="img"
                aria-label={opt.label}
                className="text-5xl sm:text-6xl leading-none select-none"
              >
                {opt.emoji || '😊'}
              </span>

              <span className="font-heading font-extrabold text-base sm:text-lg">
                {opt.label}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

