import React, { useState } from 'react';
import { CheckCircle2, Sparkles } from 'lucide-react';

const INDONESIAN_NUMBERS = [
  '',
  'Satu',
  'Dua',
  'Tiga',
  'Empat',
  'Lima',
  'Enam',
  'Tujuh',
  'Delapan',
  'Sembilan',
  'Sepuluh',
];

/**
 * Tipe Soal 2: Hitung Benda (src/components/quiz/CountObjects.jsx)
 * - Menampilkan kumpulan objek visual yang bisa diketuk satu per satu untuk dihitung dengan suara
 * - Tombol pilihan angka besar berwarna (minimal 96x96px di HP)
 */
export default function CountObjects({
  question,
  triedOptionIds = [],
  feedbackState = 'idle',
  showHint = false,
  onSelectOption,
  onSpeakText,
}) {
  const targetCount = question.targetCount || 3;
  const objectEmoji = (question.objectItem && question.objectItem.emoji) || '🌟';
  const objectName = (question.objectItem && question.objectItem.name) || 'Benda';
  const options = Array.isArray(question.options) ? question.options : [];
  const isSolved = feedbackState === 'correct';

  const [countedIndices, setCountedIndices] = useState([]);

  const handleTapObject = (idx) => {
    const numberWord = INDONESIAN_NUMBERS[idx + 1] || String(idx + 1);
    if (onSpeakText) {
      onSpeakText(numberWord);
    }
    setCountedIndices((prev) => (prev.includes(idx) ? prev : [...prev, idx]));
  };

  return (
    <div className="space-y-5">
      {/* Papan Objek untuk Dihitung */}
      <div className="bg-[#062D2C]/85 border-2 border-[#1FAFAA]/60 rounded-[28px] p-4 sm:p-6 text-center shadow-inner">
        <p className="text-xs sm:text-sm font-extrabold text-[#FFE9B0] mb-3">
          👆 Ketuk setiap {objectName.toLowerCase()} untuk menghitung bersama!
        </p>

        <div
          role="group"
          aria-label={`Kumpulan ${targetCount} ${objectName}`}
          className="flex flex-wrap items-center justify-center gap-3 sm:gap-4"
        >
          {Array.from({ length: targetCount }, (_, idx) => {
            const isCounted = countedIndices.includes(idx);
            return (
              <button
                key={idx}
                type="button"
                onClick={() => handleTapObject(idx)}
                aria-label={`${objectName} ke-${idx + 1}`}
                className={`relative w-16 h-16 sm:w-20 sm:h-20 rounded-2xl border-2 flex flex-col items-center justify-center transition-all cursor-pointer ${
                  isCounted
                    ? 'bg-[#1FAFAA]/35 border-[#FFE9B0] scale-105 shadow-md'
                    : 'bg-[#005E5C] border-white/25 hover:border-[#FFE9B0]'
                }`}
              >
                <span className="text-3xl sm:text-4xl select-none">{objectEmoji}</span>
                <span className="mt-0.5 text-[11px] font-extrabold text-[#FFE9B0]">
                  {idx + 1}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Pilihan Angka Besar Berwarna (minimal 96x96px) */}
      <div
        role="group"
        aria-label="Pilihan jawaban angka"
        className="grid grid-cols-3 gap-4 sm:gap-5 max-w-xl mx-auto"
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
              aria-label={`Angka ${opt.label}`}
              onClick={() => {
                if (onSpeakText) {
                  onSpeakText(`Angka ${opt.label}`);
                }
                onSelectOption(isCorrectOpt, opt.id);
              }}
              className={`relative min-h-[104px] min-w-[96px] p-4 rounded-[28px] border-4 flex flex-col items-center justify-center gap-1 shadow-xl transition-all cursor-pointer ${
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
                <span className="absolute -top-3 right-2 px-2.5 py-0.5 rounded-full bg-[#FFE9B0] text-[#052625] text-[11px] font-extrabold shadow-md inline-flex items-center gap-1">
                  <Sparkles className="w-3 h-3" />
                  <span>Ini!</span>
                </span>
              )}

              {highlightAsSolved && (
                <span className="absolute top-2 right-2 w-7 h-7 rounded-full bg-[#052625] text-[#FFE9B0] flex items-center justify-center">
                  <CheckCircle2 className="w-4 h-4" />
                </span>
              )}

              <span className="font-heading font-extrabold text-4xl sm:text-5xl leading-none">
                {opt.label}
              </span>
              <span className="text-xs font-extrabold opacity-90">
                {INDONESIAN_NUMBERS[Number(opt.value)] || opt.label}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

