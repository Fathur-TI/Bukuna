import React from 'react';

const SIZE_CLASSES = {
  sm: 'h-8 sm:h-9 lg:h-10',
  md: 'h-12 sm:h-14 lg:h-16',
  lg: 'h-20 sm:h-24 lg:h-28',
};

/**
 * Komponen reusable <Logo /> resmi BUKUNA (diekstrak langsung dari logo-bukuna.pdf).
 * Menggunakan ukuran berbasis tinggi responsif (h-*) dengan w-auto & object-contain
 * agar proporsi asli logo tetap tajam dan tidak pernah gepeng di ukuran layar apa pun.
 */
export default function Logo({ size = 'md', className = '' }) {
  const heightClass = SIZE_CLASSES[size] || SIZE_CLASSES.md;
  const logoSrc =
    typeof window !== 'undefined' && window.location.protocol === 'file:'
      ? 'public/assets/logo-bukuna.svg'
      : '/assets/logo-bukuna.svg';

  return (
    <img
      src={logoSrc}
      alt="Logo Bukuna"
      decoding="async"
      draggable={false}
      className={`${heightClass} w-auto object-contain select-none drop-shadow-[0_2px_5px_rgba(0,30,29,0.32)] ${className}`.trim()}
    />
  );
}
