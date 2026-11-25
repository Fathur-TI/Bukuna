import React from 'react';
import { CheckCircle2, Sparkles } from 'lucide-react';

function ShapeSvg({ shape = 'circle', colorHex = '#F97316', pattern = 'dots', label = '' }) {
  return (
    <svg
      viewBox="0 0 110 110"
      role="img"
      aria-label={`Bentuk ${label}`}
      className="w-20 h-20 sm:w-24 sm:h-24 drop-shadow-md"
    >
      {shape === 'square' ? (
        <rect
          x="14"
          y="14"
          width="82"
          height="82"
          rx="18"
          fill={colorHex}
          stroke="#FFFFFF"
          strokeWidth="5"
        />
      ) : shape === 'triangle' ? (
        <polygon
          points="55,10 100,94 10,94"
          fill={colorHex}
          stroke="#FFFFFF"
          strokeWidth="5"
          strokeLinejoin="round"
        />
      ) : shape === 'star' ? (
        <polygon
          points="55,8 69,38 102,42 77,65 84,98 55,81 26,98 33,65 8,42 41,38"
          fill={colorHex}
          stroke="#FFFFFF"
          strokeWidth="5"
          strokeLinejoin="round"
        />
      ) : (
        <circle
          cx="55"
          cy="55"
          r="42"
          fill={colorHex}
          stroke="#FFFFFF"
          strokeWidth="5"
        />
      )}

      {/* Pola internal agar aksesibel dan tidak mengandalkan warna saja */}
      {pattern === 'dots' && (
        <g fill="#FFFFFF" opacity="0.55">
          <circle cx="42" cy="45" r="4.5" />
          <circle cx="68" cy="45" r="4.5" />
          <circle cx="55" cy="66" r="4.5" />
        </g>
      )}
      {pattern === 'stripes' && (
        <g stroke="#FFFFFF" strokeWidth="4" strokeLinecap="round" opacity="0.5">
          <line x1="36" y1="44" x2="74" y2="44" />
          <line x1="36" y1="58" x2="74" y2="58" />
          <line x1="36" y1="72" x2="74" y2="72" />
        </g>
      )}
      {pattern === 'waves' && (
        <path
          d="M35 58 Q45 48 55 58 T75 58"
          stroke="#FFFFFF"
          strokeWidth="4.5"
          fill="none"
          strokeLinecap="round"
          opacity="0.55"
        />
      )}
    </svg>
  );
}

/**
 * Tipe Soal 4: Warna & Bentuk (src/components/quiz/ColorShape.jsx)
 * - Mengombinasikan warna cerah, bentuk geometri jelas (lingkaran, persegi, segitiga, bintang),
 *   dan pola internal + label agar tidak mengandalkan warna saja.
 */
export default function ColorShape({
  question,
  triedOptionIds = [],
  feedbackState = 'idle',
  showHint = false,
  onSelectOption,
  onSpeakText,
}) {
  const options = Array.isArray(question.options) ? question.options : [];
  const isSolved = feedbackState === 'correct';
  const target = question.targetVisual || null;

  return (
    <div className="space-y-5">
      {/* Kartu Contoh / Target Warna & Bentuk */}
      {target && (
        <div className="mx-auto max-w-sm bg-[#062D2C]/85 border-2 border-[#1FAFAA]/60 rounded-[26px] p-4 flex items-center justify-center gap-4 shadow-inner">
          <span className="text-4xl sm:text-5xl select-none">{target.emoji || '🎨'}</span>
          <div className="text-left">
            <span className="block text-xs font-bold text-white/80">Cari yang seperti ini:</span>
            <span className="font-heading font-extrabold text-lg sm:text-xl text-[#FFE9B0]">
              {target.colorName}
            </span>
          </div>
        </div>
      )}

      {/* Pilihan Bentuk & Warna (minimal 96x96px di HP) */}
      <div
        role="group"
        aria-label="Pilihan warna dan bentuk"
        className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-5"
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
              aria-label={`Pilih ${opt.label}`}
              onClick={() => {
                if (onSpeakText && opt.label) {
                  onSpeakText(opt.label);
                }
                onSelectOption(isCorrectOpt, opt.id);
              }}
              className={`relative min-h-[128px] min-w-[96px] p-4 sm:p-5 rounded-[28px] border-4 flex flex-col items-center justify-center gap-2 shadow-xl transition-all cursor-pointer ${
                highlightAsSolved
                  ? 'bg-[#1FAFAA] border-[#FFE9B0] text-[#052625] scale-105 ring-4 ring-[#FFE9B0]'
                  : highlightAsHint
                  ? 'bg-[#005E5C] border-[#FFE9B0] text-white ring-4 ring-[#FFE9B0] scale-105 bukuna-hint-glow'
                  : wasTried
                  ? 'bg-[#062D2C]/50 border-white/15 text-white/50 opacity-40'
                  : 'bg-[#062D2C]/90 hover:bg-[#062D2C] border-white/30 hover:border-[#FFE9B0] text-white active:scale-95'
              }`}
            >
              {highlightAsHint && (
                <span className="absolute -top-3 right-3 px-3 py-0.5 rounded-full bg-[#FFE9B0] text-[#052625] text-xs font-extrabold shadow-md inline-flex items-center gap-1">
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Pilih Ini!</span>
                </span>
              )}

              {highlightAsSolved && (
                <span className="absolute top-2.5 right-2.5 w-8 h-8 rounded-full bg-[#052625] text-[#FFE9B0] flex items-center justify-center">
                  <CheckCircle2 className="w-5 h-5" />
                </span>
              )}

              <ShapeSvg
                shape={opt.shape}
                colorHex={opt.colorHex}
                pattern={opt.pattern}
                label={opt.label}
              />

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

