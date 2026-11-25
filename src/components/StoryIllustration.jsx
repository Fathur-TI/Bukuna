import React, { useState, useEffect } from 'react';
import {
  isIndexedDbImageId,
  getCachedImageUrl,
  subscribeImageUrl,
} from '../services/storyStorage';

/**
 * Mengubah path aset publik ("/stories/..." atau "/assets/...") agar tetap jalan
 * baik saat dijalankan lewat dev server (http://) maupun saat preview.html dibuka langsung (file://).
 */
export function resolvePublicStoryUrl(rawPath) {
  if (!rawPath || typeof rawPath !== 'string') return '';
  if (
    typeof window !== 'undefined' &&
    window.location &&
    window.location.protocol === 'file:' &&
    rawPath.startsWith('/')
  ) {
    return `public${rawPath}`;
  }
  return rawPath;
}

/**
 * Menghasilkan path versi kecil (-sm.webp, lebar 480px) dari path .webp cerita bawaan.
 */
export function getSmallStoryUrl(rawPath) {
  if (!rawPath || typeof rawPath !== 'string') return '';
  if (rawPath.endsWith('-sm.webp')) return rawPath;
  if (rawPath.endsWith('.webp')) {
    return rawPath.replace(/\.webp$/, '-sm.webp');
  }
  return rawPath;
}

export function isStaticStoryImagePath(variant) {
  if (!variant || typeof variant !== 'string') return false;
  return (
    variant.startsWith('/stories/') ||
    variant.startsWith('public/stories/') ||
    /\.(webp|png|jpe?g|avif)$/i.test(variant)
  );
}

/**
 * Ilustrasi sampul & halaman cerita buku anak:
 * 1) Gambar cerita bawaan dari PDF di /public/stories/... (.webp & -sm.webp dengan srcset)
 * 2) Gambar unggahan pengguna di IndexedDB ("idb:img_..."), Blob URL, atau Data URL
 * 3) Ilustrasi placeholder SVG ramah anak untuk cerita buatan pengguna yang belum punya gambar
 */
export default function StoryIllustration({
  variant = 'cat-magic-forest',
  title = '',
  alt = '',
  className = '',
  showCoverTitle = true,
  pageIndex = 0,
  sizeVariant = 'lg', // 'sm' (kartu/thumbnail 480w) | 'lg' (detail/baca/selesai 1280w)
  fit = 'cover', // 'cover' | 'contain-blur' (untuk Halaman Membaca agar tidak terpotong)
  loading = 'eager', // 'eager' | 'lazy'
  objectPosition = 'center center',
}) {
  const isStaticStoryImg = isStaticStoryImagePath(variant);
  const isCustomImage =
    !isStaticStoryImg &&
    (isIndexedDbImageId(variant) ||
      (typeof variant === 'string' &&
        (variant.startsWith('blob:') || variant.startsWith('data:image/'))));

  const [resolvedUrl, setResolvedUrl] = useState(() =>
    isCustomImage ? getCachedImageUrl(variant) : ''
  );
  const [imgLoaded, setImgLoaded] = useState(false);

  useEffect(() => {
    if (!isCustomImage) {
      setResolvedUrl('');
      return undefined;
    }
    const cached = getCachedImageUrl(variant);
    if (cached) {
      setResolvedUrl(cached);
    }
    const unsubscribe = subscribeImageUrl(variant, (url) => {
      setResolvedUrl(url || '');
    });
    return unsubscribe;
  }, [variant, isCustomImage]);

  // 1) GAMBAR ILUSTRASI CERITA BAWAAN (/stories/kucing-hutan/... atau /stories/langit-balon/...)
  if (isStaticStoryImg) {
    const largeRaw = variant.endsWith('-sm.webp')
      ? variant.replace(/-sm\.webp$/, '.webp')
      : variant;
    const smallRaw = getSmallStoryUrl(largeRaw);

    const largeUrl = resolvePublicStoryUrl(largeRaw);
    const smallUrl = resolvePublicStoryUrl(smallRaw);

    const primarySrc = sizeVariant === 'sm' ? smallUrl : largeUrl;
    const srcSetStr =
      sizeVariant === 'sm' && smallUrl && largeUrl && smallUrl !== largeUrl
        ? `${smallUrl} 480w, ${largeUrl} 1280w`
        : undefined;
    const sizesStr =
      sizeVariant === 'sm' ? '(max-width: 640px) 46vw, 290px' : undefined;

    if (fit === 'contain-blur') {
      return (
        <div
          className={`relative w-full h-full overflow-hidden select-none bg-[#005E5C] ${className}`}
        >
          {/* Skeleton lembut saat gambar belum selesai dimuat */}
          {!imgLoaded && (
            <div
              aria-hidden="true"
              className="absolute inset-0 bg-[#005E5C] animate-pulse pointer-events-none"
            />
          )}

          {/* Latar buram dari gambar yang sama agar tidak ada bar kosong di sekeliling lukisan */}
          <img
            src={smallUrl || primarySrc}
            alt=""
            aria-hidden="true"
            decoding="async"
            draggable={false}
            className="absolute inset-0 w-full h-full object-cover pointer-events-none"
            style={{
              filter: 'blur(24px) brightness(0.82)',
              transform: 'scale(1.12)',
            }}
          />

          {/* Gambar utama utuh (object-fit: contain) tanpa terpotong */}
          <img
            src={primarySrc}
            srcSet={srcSetStr}
            sizes={sizesStr}
            alt={alt || title || 'Ilustrasi cerita anak'}
            loading={loading}
            fetchPriority={loading === 'eager' ? 'high' : 'auto'}
            decoding="async"
            draggable={false}
            onLoad={() => setImgLoaded(true)}
            className="absolute inset-0 z-10 w-full h-full object-contain block"
          />
        </div>
      );
    }

    return (
      <div
        className={`relative w-full h-full overflow-hidden select-none bg-[#005E5C] ${className}`}
      >
        {!imgLoaded && (
          <div
            aria-hidden="true"
            className="absolute inset-0 bg-[#005E5C] animate-pulse pointer-events-none"
          />
        )}
        <img
          src={primarySrc}
          srcSet={srcSetStr}
          sizes={sizesStr}
          alt={alt || title || 'Ilustrasi cerita anak'}
          loading={loading}
          fetchPriority={loading === 'eager' ? 'high' : 'auto'}
          decoding="async"
          draggable={false}
          onLoad={() => setImgLoaded(true)}
          style={{ objectPosition: objectPosition || 'center center' }}
          className="w-full h-full object-cover block"
        />
      </div>
    );
  }

  // 2) GAMBAR UNGGAHAN PENGGUNA (IndexedDB / Blob / Data URL)
  if (isCustomImage) {
    if (!resolvedUrl) {
      return (
        <div
          role="status"
          aria-label="Memuat gambar ilustrasi..."
          className={`relative w-full h-full overflow-hidden select-none bg-[#005E5C] flex flex-col items-center justify-center p-4 animate-pulse ${className}`}
        >
          <div className="w-12 h-12 rounded-2xl bg-[#1FAFAA]/30 border-2 border-[#FFE9B0]/40 flex items-center justify-center text-2xl mb-2">
            🎨
          </div>
          <span className="text-xs font-bold text-[#FFE9B0]/80">
            Memuat gambar...
          </span>
        </div>
      );
    }

    if (fit === 'contain-blur') {
      return (
        <div
          className={`relative w-full h-full overflow-hidden select-none bg-[#005E5C] ${className}`}
        >
          <img
            src={resolvedUrl}
            alt=""
            aria-hidden="true"
            decoding="async"
            draggable={false}
            className="absolute inset-0 w-full h-full object-cover pointer-events-none"
            style={{
              filter: 'blur(24px) brightness(0.82)',
              transform: 'scale(1.12)',
            }}
          />
          <img
            src={resolvedUrl}
            alt={alt || title || 'Ilustrasi cerita anak'}
            loading={loading}
            decoding="async"
            draggable={false}
            className="relative z-10 w-full h-full object-contain block"
          />
        </div>
      );
    }

    return (
      <div
        className={`relative w-full h-full overflow-hidden select-none bg-[#005E5C] ${className}`}
      >
        <img
          src={resolvedUrl}
          alt={alt || title || 'Ilustrasi cerita anak'}
          loading={loading}
          decoding="async"
          draggable={false}
          style={{ objectPosition: objectPosition || 'center center' }}
          className="w-full h-full object-cover block"
        />
        {showCoverTitle && title && (
          <div className="absolute top-0 left-0 right-0 pt-2.5 px-3 pb-4 bg-black/45 text-center pointer-events-none">
            <span className="font-heading font-extrabold text-[#FFE9B0] text-xs sm:text-sm leading-tight drop-shadow-[0_2px_4px_rgba(0,0,0,0.85)] line-clamp-2">
              {title}
            </span>
          </div>
        )}
      </div>
    );
  }

  // 3) PLACEHOLDER SVG BAWAAN (tetap dipakai untuk cerita buatan pengguna yang belum punya gambar)
  const themes = {
    'cat-magic-forest': {
      skyTop: '#0F4C5C',
      skyBottom: '#2EC4B6',
      hillBack: '#1B6B63',
      hillFront: '#2E8B57',
      accent: '#FF9F1C',
      character: 'cat',
    },
    'sky-balloons': {
      skyTop: '#0284C7',
      skyBottom: '#7DD3FC',
      hillBack: '#16A34A',
      hillFront: '#22C55E',
      accent: '#FACC15',
      character: 'balloons',
    },
    'rabbit-garden': {
      skyTop: '#266DD3',
      skyBottom: '#88D49E',
      hillBack: '#3C8D50',
      hillFront: '#52B788',
      accent: '#FFBF69',
      character: 'rabbit',
    },
    'family-home': {
      skyTop: '#E07A5F',
      skyBottom: '#F2CC8F',
      hillBack: '#81B29A',
      hillFront: '#3D405B',
      accent: '#F4F1DE',
      character: 'house',
    },
    'river-clean': {
      skyTop: '#1D63B8',
      skyBottom: '#72EFDD',
      hillBack: '#2D6A4F',
      hillFront: '#40916C',
      accent: '#FFE66D',
      character: 'river',
    },
    'cloud-ship': {
      skyTop: '#1B263B',
      skyBottom: '#415A77',
      hillBack: '#778DA9',
      hillFront: '#E0E1DD',
      accent: '#FFB703',
      character: 'ship',
    },
    'ants-team': {
      skyTop: '#D97706',
      skyBottom: '#FDE68A',
      hillBack: '#65A30D',
      hillFront: '#4D7C0F',
      accent: '#EF4444',
      character: 'ants',
    },
  };

  const normalizedKey =
    typeof variant === 'string' && variant.startsWith('sky-balloon')
      ? 'sky-balloons'
      : typeof variant === 'string' && variant.startsWith('cat-')
      ? 'cat-magic-forest'
      : variant;

  const t = themes[normalizedKey] || themes['cat-magic-forest'];
  const uid = `${variant || 'default'}-${pageIndex}`.replace(/[^a-zA-Z0-9_-]/g, '');

  const sunX = 75 + ((pageIndex * 37) % 150);
  const sunY = 58 + ((pageIndex * 19) % 35);

  return (
    <div className={`relative w-full h-full overflow-hidden select-none ${className}`}>
      <svg
        viewBox="0 0 300 300"
        className="w-full h-full object-cover block"
        preserveAspectRatio="xMidYMid slice"
        role="img"
        aria-label={alt || title || 'Ilustrasi cerita anak'}
      >
        <defs>
          <linearGradient id={`sky-${uid}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={t.skyTop} />
            <stop offset="100%" stopColor={t.skyBottom} />
          </linearGradient>
          <radialGradient id={`glow-${uid}`} cx="50%" cy="45%" r="55%">
            <stop offset="0%" stopColor="#FFF6CC" stopOpacity="0.85" />
            <stop offset="100%" stopColor="#FFF6CC" stopOpacity="0" />
          </radialGradient>
        </defs>

        {/* Langit */}
        <rect width="300" height="300" fill={`url(#sky-${uid})`} />

        {/* Cahaya Hangat / Matahari / Bulan */}
        <circle cx={sunX} cy={sunY} r="75" fill={`url(#glow-${uid})`} />
        <circle cx={sunX} cy={sunY} r="24" fill="#FFE999" opacity="0.92" />

        {/* Bintang & Kunang-kunang Ajaib */}
        <g fill="#FFF9DB" opacity="0.85">
          <circle cx="42" cy="48" r="3" />
          <circle cx="255" cy="54" r="3.5" />
          <circle cx="195" cy="36" r="2.5" />
          <circle cx="62" cy="122" r="3" />
          <circle cx="242" cy="118" r="3" />
          <path d="M142 32 L145 40 L153 43 L145 46 L142 54 L139 46 L131 43 L139 40 Z" fill="#FFE66D" />
        </g>

        {/* Awan Lembut */}
        <g fill="#FFFFFF" opacity="0.35">
          <ellipse cx="70" cy="88" rx="34" ry="14" />
          <ellipse cx="90" cy="84" rx="24" ry="12" />
          <ellipse cx="225" cy="76" rx="38" ry="14" />
        </g>

        {/* Siluet Pohon Latar */}
        <g fill={t.hillBack} opacity="0.75">
          <circle cx="35" cy="175" r="48" />
          <circle cx="85" cy="185" r="40" />
          <circle cx="265" cy="170" r="52" />
          <circle cx="215" cy="185" r="42" />
        </g>

        {/* Bukit Belakang */}
        <path
          d="M0 205 Q95 165 185 202 T300 190 L300 300 L0 300 Z"
          fill={t.hillBack}
        />

        {/* Bukit Depan */}
        <path
          d="M0 232 Q130 195 300 228 L300 300 L0 300 Z"
          fill={t.hillFront}
        />

        {/* Jalan Setapak Hangat */}
        <path
          d="M125 300 Q145 255 155 225 Q172 255 198 300 Z"
          fill="#E9C46A"
          opacity="0.78"
        />

        {/* Karakter Utama Berdasarkan Tema */}
        {t.character === 'cat' && (
          <g transform={`translate(${115 + (pageIndex % 2) * 8}, 150)`}>
            <path
              d="M52 72 Q82 55 76 32"
              fill="none"
              stroke="#F48C06"
              strokeWidth="12"
              strokeLinecap="round"
            />
            <ellipse cx="36" cy="68" rx="28" ry="26" fill="#F48C06" />
            <ellipse cx="36" cy="72" rx="16" ry="18" fill="#FFD166" />
            <circle cx="36" cy="34" r="25" fill="#F48C06" />
            <polygon points="14,22 18,0 32,14" fill="#E85D04" />
            <polygon points="58,22 54,0 40,14" fill="#E85D04" />
            <polygon points="18,19 20,5 29,14" fill="#FFB5A7" />
            <polygon points="54,19 52,5 43,14" fill="#FFB5A7" />
            <ellipse cx="36" cy="40" rx="15" ry="11" fill="#FFE5B4" />
            <circle cx="26" cy="31" r="5" fill="#1F2937" />
            <circle cx="46" cy="31" r="5" fill="#1F2937" />
            <circle cx="24.5" cy="29.5" r="1.8" fill="#FFFFFF" />
            <circle cx="44.5" cy="29.5" r="1.8" fill="#FFFFFF" />
            <polygon points="33,37 39,37 36,41" fill="#E63946" />
            <path d="M31 43 Q36 47 41 43" fill="none" stroke="#1F2937" strokeWidth="2.2" strokeLinecap="round" />
            <path d="M18 52 Q36 60 54 52" fill="none" stroke="#2A9D8F" strokeWidth="7" strokeLinecap="round" />
          </g>
        )}

        {t.character === 'rabbit' && (
          <g transform="translate(118, 142)">
            <ellipse cx="26" cy="18" rx="8" ry="24" fill="#FFF1E6" stroke="#F4A261" strokeWidth="2" />
            <ellipse cx="46" cy="18" rx="8" ry="24" fill="#FFF1E6" stroke="#F4A261" strokeWidth="2" />
            <ellipse cx="26" cy="18" rx="4" ry="16" fill="#FFB5A7" />
            <ellipse cx="46" cy="18" rx="4" ry="16" fill="#FFB5A7" />
            <ellipse cx="36" cy="76" rx="25" ry="24" fill="#FFF1E6" />
            <circle cx="36" cy="46" r="22" fill="#FFF1E6" />
            <circle cx="28" cy="43" r="4" fill="#1F2937" />
            <circle cx="44" cy="43" r="4" fill="#1F2937" />
            <circle cx="36" cy="50" r="3" fill="#FF758F" />
            <polygon points="48,68 78,56 56,84" fill="#F77F00" />
          </g>
        )}

        {t.character === 'house' && (
          <g transform="translate(88, 128)">
            <rect x="20" y="48" width="84" height="62" rx="8" fill="#FFE5B4" />
            <polygon points="8,52 62,8 116,52" fill="#E63946" />
            <rect x="50" y="74" width="24" height="36" rx="4" fill="#9C6644" />
            <rect x="28" y="62" width="16" height="16" rx="3" fill="#FFD166" />
            <rect x="80" y="62" width="16" height="16" rx="3" fill="#FFD166" />
          </g>
        )}

        {t.character === 'river' && (
          <g>
            <path
              d="M90 202 Q145 235 120 300 L210 300 Q185 235 155 202 Z"
              fill="#48CAE4"
            />
            <path d="M130 252 Q155 268 180 252 Q155 242 130 252 Z" fill="#FF9F1C" />
          </g>
        )}

        {t.character === 'ship' && (
          <g transform="translate(92, 118)">
            <ellipse cx="60" cy="95" rx="58" ry="20" fill="#FFFFFF" opacity="0.92" />
            <path d="M18 75 L102 75 L86 98 L34 98 Z" fill="#E07030" />
            <line x1="60" y1="18" x2="60" y2="75" stroke="#FFE9B0" strokeWidth="4" />
            <polygon points="60,20 60,66 98,52" fill="#FFE9B0" />
            <polygon points="56,26 56,66 26,56" fill="#2EC4B6" />
          </g>
        )}

        {t.character === 'ants' && (
          <g transform="translate(85, 175)">
            <circle cx="65" cy="24" r="22" fill="#FFD166" stroke="#F48C06" strokeWidth="3" />
            <circle cx="35" cy="52" r="9" fill="#7F1D1D" />
            <circle cx="50" cy="55" r="10" fill="#7F1D1D" />
            <circle cx="85" cy="52" r="9" fill="#7F1D1D" />
            <circle cx="100" cy="55" r="10" fill="#7F1D1D" />
          </g>
        )}

        {t.character === 'balloons' && (
          <g transform={`translate(0, ${(pageIndex % 2) * 5})`}>
            <path
              d="M95 142 Q120 185 148 218 M132 118 Q142 175 150 218 M172 132 Q162 178 152 218 M208 148 Q175 186 154 218 M152 155 L150 218"
              fill="none"
              stroke="#FFF8D6"
              strokeWidth="2"
              opacity="0.85"
            />
            <ellipse cx="95" cy="116" rx="22" ry="26" fill="#EF4444" />
            <ellipse cx="88" cy="108" rx="6" ry="9" fill="#FFFFFF" opacity="0.35" />
            <ellipse cx="132" cy="92" rx="23" ry="27" fill="#FACC15" />
            <ellipse cx="125" cy="84" rx="6" ry="9" fill="#FFFFFF" opacity="0.4" />
            <ellipse cx="172" cy="104" rx="22" ry="26" fill="#3B82F6" />
            <ellipse cx="165" cy="96" rx="6" ry="9" fill="#FFFFFF" opacity="0.35" />
            <ellipse cx="208" cy="122" rx="21" ry="25" fill="#EC4899" />
            <ellipse cx="201" cy="114" rx="5.5" ry="8" fill="#FFFFFF" opacity="0.35" />
            <ellipse cx="152" cy="130" rx="20" ry="24" fill="#A8E063" />
            <circle cx="150" cy="202" r="14" fill="#FDE68A" />
            <path d="M136 200 Q150 184 164 200" fill="#1E293B" />
            <rect x="139" y="215" width="22" height="28" rx="9" fill="#F97316" />
          </g>
        )}

        {/* Semak & Bunga Depan */}
        <g fill="#1B4332" opacity="0.65">
          <circle cx="24" cy="285" r="32" />
          <circle cx="62" cy="295" r="24" />
          <circle cx="278" cy="282" r="34" />
          <circle cx="238" cy="295" r="24" />
        </g>
        <circle cx="42" cy="272" r="5" fill="#FFBF69" />
        <circle cx="255" cy="270" r="5" fill="#FF758F" />

        {showCoverTitle && title && (
          <g>
            <rect x="14" y="14" width="272" height="48" rx="14" fill="#000000" opacity="0.28" />
            <text
              x="150"
              y="43"
              textAnchor="middle"
              fontFamily="'Fredoka', sans-serif"
              fontWeight="800"
              fontSize="19"
              fill="#FFF8D6"
              stroke="#083332"
              strokeWidth="3.5"
              paintOrder="stroke"
            >
              {title.length > 24 ? `${title.slice(0, 22)}...` : title}
            </text>
          </g>
        )}
      </svg>
    </div>
  );
}
