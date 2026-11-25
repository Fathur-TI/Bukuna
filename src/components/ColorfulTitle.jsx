import React, { useState, useEffect, useRef } from 'react';

/**
 * Komponen Judul Berwarna-warni (<ColorfulTitle text="..." highlight="Dunia" />)
 * - Mempertahankan font-family, font-weight, ukuran, dan letter-spacing asli (inherit dari heading).
 * - Membagi teks per kata dan memberi warna bergilir melalui CSS variables:
 *   --title-1 (#FFE9B0), --title-2 (#A8E063), --title-3 (#8FD8FF), --title-4 (#FFB3C7).
 * - Kata yang cocok dengan prop `highlight` (mis. "Dunia") ditampilkan di dalam pil oranye (#D9651F),
 *   teks putih, padding horizontal ~12px, border-radius 14px, rotate(-2deg), inline-block,
 *   bergoyang halus tiap 3-4 detik setelah masuk, dan bergoyang lebih besar sekali (±0.5s) saat diklik/diketuk.
 * - Tetap satu elemen heading utuh (h1/h2) dengan aria-label berisi teks lengkap.
 */
export default function ColorfulTitle({
  text = '',
  highlight = '',
  as,
  id,
  className = '',
}) {
  const Tag = as || (highlight ? 'h1' : 'h2');
  const headingRef = useRef(null);
  const hasAnimatedRef = useRef(false);
  const tapTimerRef = useRef(null);

  const isHeroHighlight = Boolean(highlight && highlight.trim());
  const [isVisible, setIsVisible] = useState(() => isHeroHighlight);
  const [entranceDone, setEntranceDone] = useState(false);
  const [pillClicked, setPillClicked] = useState(false);

  const words = String(text || '')
    .trim()
    .split(/\s+/)
    .filter(Boolean);

  // Untuk judul bagian (tanpa highlight), animasi masuk dijalankan sekali saat terlihat di layar
  useEffect(() => {
    if (hasAnimatedRef.current) return;

    if (isHeroHighlight) {
      hasAnimatedRef.current = true;
      setIsVisible(true);
      const totalMs = Math.min(words.length, 8) * 140 + 550;
      const doneTimer = setTimeout(() => {
        setEntranceDone(true);
      }, totalMs);
      return () => clearTimeout(doneTimer);
    }

    const node = headingRef.current;
    if (!node || typeof IntersectionObserver === 'undefined') {
      hasAnimatedRef.current = true;
      setIsVisible(true);
      return undefined;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting && !hasAnimatedRef.current) {
            hasAnimatedRef.current = true;
            setIsVisible(true);
            observer.disconnect();
            const totalMs = Math.min(words.length, 8) * 140 + 550;
            setTimeout(() => {
              setEntranceDone(true);
            }, totalMs);
          }
        });
      },
      { threshold: 0.1 }
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, [isHeroHighlight, words.length]);

  useEffect(() => {
    return () => {
      if (tapTimerRef.current) {
        clearTimeout(tapTimerRef.current);
      }
    };
  }, []);

  const handlePillClick = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (tapTimerRef.current) {
      clearTimeout(tapTimerRef.current);
    }
    setPillClicked(false);
    setTimeout(() => {
      setPillClicked(true);
      tapTimerRef.current = setTimeout(() => {
        setPillClicked(false);
      }, 520);
    }, 10);
  };

  const normalizedHighlight = String(highlight || '')
    .trim()
    .toLowerCase();

  let colorCounter = 0;

  return (
    <Tag
      ref={headingRef}
      id={id}
      aria-label={text}
      className={`bukuna-colorful-title ${className}`.trim()}
    >
      {words.map((word, idx) => {
        const cleanWord = word.replace(/[.,!?]/g, '').toLowerCase();
        const isHighlightedWord =
          normalizedHighlight && cleanWord === normalizedHighlight;

        const delayIdx = Math.min(idx, 7);
        const animStateClass = entranceDone
          ? 'bukuna-title-word-done'
          : isVisible
          ? `bukuna-title-word-enter bukuna-word-delay-${delayIdx}`
          : 'bukuna-title-word-pending';

        if (isHighlightedWord) {
          const pillAnimClass = pillClicked
            ? 'bukuna-title-pill-clicked'
            : 'bukuna-title-pill-idle';

          return (
            <React.Fragment key={`w-${idx}-${word}`}>
              <span className={`bukuna-title-word ${animStateClass}`}>
                <span
                  role="button"
                  tabIndex={0}
                  onClick={handlePillClick}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      handlePillClick(e);
                    }
                  }}
                  className={`bukuna-title-pill ${pillAnimClass}`}
                >
                  {word}
                </span>
              </span>
              {idx < words.length - 1 ? ' ' : ''}
            </React.Fragment>
          );
        }

        const colorClass = `bukuna-title-color-${(colorCounter % 4) + 1}`;
        colorCounter += 1;

        return (
          <React.Fragment key={`w-${idx}-${word}`}>
            <span
              className={`bukuna-title-word ${colorClass} ${animStateClass}`}
            >
              {word}
            </span>
            {idx < words.length - 1 ? ' ' : ''}
          </React.Fragment>
        );
      })}
    </Tag>
  );
}

