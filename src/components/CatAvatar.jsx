import React from 'react';

/**
 * Avatar Kucing Keren bertopi kuning & kacamata hitam sesuai desain halaman Profil di File 2 Halaman 3.
 */
export default function CatAvatar({ size = 'lg', className = '' }) {
  const sizeClasses = {
    sm: 'w-10 h-10',
    md: 'w-14 h-14',
    lg: 'w-24 h-24 sm:w-28 sm:h-28',
  };

  return (
    <div
      className={`relative rounded-full overflow-hidden border-4 border-[#1FAFAA] shadow-lg bg-[#D8CFC4] shrink-0 ${
        sizeClasses[size] || sizeClasses.lg
      } ${className}`}
    >
      <svg viewBox="0 0 120 120" className="w-full h-full" role="img" aria-label="Avatar Profil Bukuna">
        <defs>
          <linearGradient id="bgCat" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#334155" />
            <stop offset="100%" stopColor="#1E293B" />
          </linearGradient>
          <linearGradient id="beanieGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#FACC15" />
            <stop offset="100%" stopColor="#EAB308" />
          </linearGradient>
        </defs>

        {/* Background */}
        <rect width="120" height="120" fill="url(#bgCat)" />

        {/* Telinga Kucing */}
        <polygon points="22,52 30,22 50,38" fill="#F8FAFC" />
        <polygon points="26,48 32,27 46,38" fill="#FDA4AF" />
        <polygon points="98,52 90,22 70,38" fill="#F8FAFC" />
        <polygon points="94,48 88,27 74,38" fill="#FDA4AF" />

        {/* Badan & Baju hangat */}
        <path d="M20 120 C22 92, 98 92, 100 120 Z" fill="#E07030" />

        {/* Kepala Kucing Putih-Krem */}
        <ellipse cx="60" cy="68" rx="36" ry="32" fill="#F8FAFC" />
        <ellipse cx="42" cy="74" rx="8" ry="5" fill="#FECDD3" opacity="0.7" />
        <ellipse cx="78" cy="74" rx="8" ry="5" fill="#FECDD3" opacity="0.7" />

        {/* Topi Kupluk Kuning (Beanie seperti di File 2) */}
        <path d="M25 50 C28 16, 92 16, 95 50 Z" fill="url(#beanieGrad)" />
        <rect x="22" y="42" width="76" height="12" rx="6" fill="#CA8A04" />
        <circle cx="60" cy="18" r="7" fill="#FDE047" />

        {/* Kacamata Hitam Keren */}
        <g transform="translate(0, 2)">
          <line x1="24" y1="56" x2="96" y2="56" stroke="#F59E0B" strokeWidth="3" />
          <rect x="28" y="48" width="27" height="18" rx="6" fill="#0F172A" stroke="#F59E0B" strokeWidth="2.5" />
          <rect x="65" y="48" width="27" height="18" rx="6" fill="#0F172A" stroke="#F59E0B" strokeWidth="2.5" />
          {/* Kilau Lensa */}
          <line x1="33" y1="62" x2="43" y2="52" stroke="#94A3B8" strokeWidth="2.5" strokeLinecap="round" />
          <line x1="70" y1="62" x2="80" y2="52" stroke="#94A3B8" strokeWidth="2.5" strokeLinecap="round" />
        </g>

        {/* Hidung & Mulut Melet Lucu (sesuai foto kucing di File 2) */}
        <polygon points="56,71 64,71 60,76" fill="#FB7185" />
        <path d="M52 79 Q56 83 60 78 Q64 83 68 79" stroke="#475569" strokeWidth="2.2" fill="none" strokeLinecap="round" />
        {/* Lidah merah muda kecil */}
        <path d="M56 80 C56 89, 64 89, 64 80 Z" fill="#FB7185" />

        {/* Kumis Kucing */}
        <line x1="16" y1="70" x2="34" y2="73" stroke="#94A3B8" strokeWidth="2" strokeLinecap="round" />
        <line x1="16" y1="78" x2="34" y2="78" stroke="#94A3B8" strokeWidth="2" strokeLinecap="round" />
        <line x1="104" y1="70" x2="86" y2="73" stroke="#94A3B8" strokeWidth="2" strokeLinecap="round" />
        <line x1="104" y1="78" x2="86" y2="78" stroke="#94A3B8" strokeWidth="2" strokeLinecap="round" />
      </svg>
    </div>
  );
}

