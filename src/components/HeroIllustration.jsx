import React from 'react';

/**
 * Ilustrasi Hero Beranda dari file resmi "/assets/hero-anak-membaca-transparan.webp"
 * Tanpa kartu pembungkus (menyatu langsung di atas latar teal berpola seperti File 2),
 * dengan blob latar dan bayangan lantai berwarna teal gelap semi-transparan (rgba(0,90,88,0.55)),
 * drop-shadow lembut, serta hiasan bintang kecil di sekitar ilustrasi.
 */
export default function HeroIllustration({ className = '' }) {
  const isFileProtocol =
    typeof window !== 'undefined' &&
    window.location &&
    window.location.protocol === 'file:';
  const heroSrc = isFileProtocol
    ? 'public/assets/hero-anak-membaca-transparan.webp'
    : '/assets/hero-anak-membaca-transparan.webp';
  const heroSrcSet = isFileProtocol
    ? 'public/assets/hero-anak-membaca-transparan-800.webp 800w, public/assets/hero-anak-membaca-transparan.webp 1600w'
    : '/assets/hero-anak-membaca-transparan-800.webp 800w, /assets/hero-anak-membaca-transparan.webp 1600w';

  return (
    <div className={`relative select-none bukuna-mascot-float ${className}`}>
      {/* Hiasan bintang kecil lembut di sekitar ilustrasi (aria-hidden) */}
      <svg
        aria-hidden="true"
        viewBox="0 0 24 24"
        className="w-4 h-4 sm:w-5 sm:h-5 text-[#FFE9B0] fill-[#FFE9B0] absolute top-1 left-1 opacity-90 pointer-events-none z-10"
      >
        <path d="M12 2L14.4 9.6L22 12L14.4 14.4L12 22L9.6 14.4L2 12L9.6 9.6L12 2Z" />
      </svg>
      <svg
        aria-hidden="true"
        viewBox="0 0 24 24"
        className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-[#FFE9B0] fill-[#FFE9B0] absolute bottom-2 right-1 opacity-90 pointer-events-none z-10"
      >
        <path d="M12 2L14.4 9.6L22 12L14.4 14.4L12 22L9.6 14.4L2 12L9.6 9.6L12 2Z" />
      </svg>

      <img
        src={heroSrc}
        srcSet={heroSrcSet}
        sizes="(max-width: 639px) 48vw, (max-width: 1023px) 360px, 460px"
        alt="Empat anak membaca buku bersama di sofa dan lantai"
        width={1600}
        height={1600}
        loading="eager"
        fetchPriority="high"
        decoding="async"
        style={{ filter: 'drop-shadow(0 6px 10px rgba(0,0,0,0.25))' }}
        className="w-full h-auto aspect-square object-contain block mx-auto"
      />
    </div>
  );
}
