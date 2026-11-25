import React from 'react';

/**
 * Maskot Ramah Kucing Kecil Rodri (src/components/quiz/Mascot.jsx)
 * - SVG kucing kecil oranye dengan ekspresi wajah yang berubah sesuai mood:
 *   'idle' | 'thinking' | 'encouraging' | 'happy' | 'celebrate'
 * - Menghormati prefers-reduced-motion
 */
export default function Mascot({ mood = 'idle', message = '', size = 'md', className = '' }) {
  const sizeClass =
    size === 'lg'
      ? 'w-28 h-28 sm:w-32 sm:h-32'
      : size === 'sm'
      ? 'w-16 h-16 sm:w-20 sm:h-20'
      : 'w-20 h-20 sm:w-24 sm:h-24';

  const moodLabel =
    mood === 'happy' || mood === 'celebrate'
      ? 'Maskot Kucing Rodri tersenyum gembira'
      : mood === 'encouraging'
      ? 'Maskot Kucing Rodri menyemangati'
      : 'Maskot Kucing Rodri ramah';

  return (
    <div className={`inline-flex items-center gap-3 ${className}`}>
      <div
        role="img"
        aria-label={moodLabel}
        className={`relative shrink-0 rounded-full bg-[#FFE9B0] border-4 border-[#E07030] shadow-lg flex items-center justify-center p-1.5 bukuna-mascot-float ${sizeClass}`}
      >
        <svg viewBox="0 0 120 120" className="w-full h-full">
          {/* Telinga Kucing */}
          <polygon points="22,46 30,14 52,34" fill="#E07030" />
          <polygon points="27,42 32,21 47,34" fill="#FDE68A" />
          <polygon points="98,46 90,14 68,34" fill="#E07030" />
          <polygon points="93,42 88,21 73,34" fill="#FDE68A" />

          {/* Kepala Kucing Rodri */}
          <circle cx="60" cy="64" r="38" fill="#F97316" />
          <ellipse cx="60" cy="72" rx="28" ry="22" fill="#FFEDD5" />

          {/* Garis Dahi Kucing */}
          <path d="M52 33 Q60 40 68 33" stroke="#C2410C" strokeWidth="3.5" fill="none" strokeLinecap="round" />
          <path d="M60 28 L60 39" stroke="#C2410C" strokeWidth="3.5" strokeLinecap="round" />

          {/* Mata sesuai mood */}
          {mood === 'happy' || mood === 'celebrate' ? (
            <>
              <path
                d="M38 58 Q45 48 52 58"
                stroke="#052625"
                strokeWidth="4.5"
                fill="none"
                strokeLinecap="round"
              />
              <path
                d="M68 58 Q75 48 82 58"
                stroke="#052625"
                strokeWidth="4.5"
                fill="none"
                strokeLinecap="round"
              />
            </>
          ) : mood === 'encouraging' ? (
            <>
              <circle cx="45" cy="57" r="5.5" fill="#052625" />
              <circle cx="43.5" cy="55" r="2" fill="#FFFFFF" />
              <circle cx="75" cy="57" r="5.5" fill="#052625" />
              <circle cx="73.5" cy="55" r="2" fill="#FFFFFF" />
              <path d="M37 47 L51 50" stroke="#9A3412" strokeWidth="3" strokeLinecap="round" />
              <path d="M83 47 L69 50" stroke="#9A3412" strokeWidth="3" strokeLinecap="round" />
            </>
          ) : (
            <>
              <circle cx="45" cy="57" r="6" fill="#052625" />
              <circle cx="43" cy="54.5" r="2.2" fill="#FFFFFF" />
              <circle cx="75" cy="57" r="6" fill="#052625" />
              <circle cx="73" cy="54.5" r="2.2" fill="#FFFFFF" />
            </>
          )}

          {/* Pipi Merona */}
          <ellipse cx="34" cy="68" rx="6" ry="3.5" fill="#FB7185" opacity="0.65" />
          <ellipse cx="86" cy="68" rx="6" ry="3.5" fill="#FB7185" opacity="0.65" />

          {/* Hidung Segitiga */}
          <polygon points="56,64 64,64 60,70" fill="#E11D48" />

          {/* Mulut sesuai mood */}
          {mood === 'happy' || mood === 'celebrate' ? (
            <path
              d="M48 73 Q60 88 72 73 Z"
              fill="#E11D48"
              stroke="#052625"
              strokeWidth="2.5"
            />
          ) : mood === 'encouraging' ? (
            <path
              d="M51 75 Q60 81 69 75"
              stroke="#052625"
              strokeWidth="3.5"
              fill="none"
              strokeLinecap="round"
            />
          ) : (
            <>
              <path
                d="M52 74 Q56 79 60 74 Q64 79 68 74"
                stroke="#052625"
                strokeWidth="3"
                fill="none"
                strokeLinecap="round"
              />
            </>
          )}

          {/* Kumis Kucing */}
          <line x1="18" y1="64" x2="32" y2="66" stroke="#7C2D12" strokeWidth="2.2" strokeLinecap="round" />
          <line x1="18" y1="71" x2="32" y2="71" stroke="#7C2D12" strokeWidth="2.2" strokeLinecap="round" />
          <line x1="88" y1="66" x2="102" y2="64" stroke="#7C2D12" strokeWidth="2.2" strokeLinecap="round" />
          <line x1="88" y1="71" x2="102" y2="71" stroke="#7C2D12" strokeWidth="2.2" strokeLinecap="round" />

          {/* Bintang Kecil di Atas bila Celebrate / Happy */}
          {(mood === 'happy' || mood === 'celebrate') && (
            <polygon
              points="60,4 63,12 71,12 65,17 67,25 60,20 53,25 55,17 49,12 57,12"
              fill="#FACC15"
              stroke="#B45309"
              strokeWidth="1.5"
            />
          )}
        </svg>
      </div>

      {message && (
        <div className="bg-[#FFE9B0] text-[#052625] border-2 border-[#E07030] rounded-2xl px-4 py-2.5 shadow-md max-w-xs sm:max-w-md text-left">
          <p className="font-story font-bold text-sm sm:text-base leading-snug">
            {message}
          </p>
        </div>
      )}
    </div>
  );
}

