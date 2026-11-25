import React, { useState, useMemo, useRef, useEffect } from 'react';
import { CheckCircle2, Sparkles } from 'lucide-react';

/**
 * Tipe Soal 3: Cocokkan Pasangan (src/components/quiz/MatchPairs.jsx)
 * - Mendukung Drag-and-Drop MAUPUN sentuh dua kali (ketuk kartu kiri lalu ketuk kartu kanan)
 * - Juga dapat dimainkan penuh dengan keyboard (Enter/Space)
 */
export default function MatchPairs({
  question,
  feedbackState = 'idle',
  showHint = false,
  onSelectOption,
  onSpeakText,
}) {
  const pairs = useMemo(() => (Array.isArray(question.pairs) ? question.pairs : []), [question]);

  // Urutan kolom kanan dibuat stabil namun berbeda dari urutan kiri
  const rightItems = useMemo(() => {
    if (pairs.length <= 1) return pairs;
    return [...pairs.slice(1), pairs[0]];
  }, [pairs]);

  const [selectedLeftId, setSelectedLeftId] = useState(null);
  const [matchedIds, setMatchedIds] = useState([]);
  const selectedLeftRef = useRef(null);
  const matchedIdsRef = useRef([]);

  useEffect(() => {
    setSelectedLeftId(null);
    setMatchedIds([]);
    selectedLeftRef.current = null;
    matchedIdsRef.current = [];
  }, [question.id]);

  const handleSelectLeft = (pair) => {
    if (matchedIdsRef.current.includes(pair.id)) return;
    selectedLeftRef.current = pair.id;
    setSelectedLeftId(pair.id);
    if (onSpeakText) {
      onSpeakText(pair.leftLabel);
    }
  };

  const handleAttemptMatch = (leftId, rightPair) => {
    if (!leftId || matchedIdsRef.current.includes(rightPair.id)) return;

    if (leftId === rightPair.id) {
      const nextMatched = [...matchedIdsRef.current, rightPair.id];
      matchedIdsRef.current = nextMatched;
      setMatchedIds(nextMatched);
      selectedLeftRef.current = null;
      setSelectedLeftId(null);
      if (onSpeakText) {
        onSpeakText(`Cocok! ${rightPair.leftLabel} dengan ${rightPair.rightLabel}`);
      }
      if (nextMatched.length === pairs.length) {
        onSelectOption(true, rightPair.id);
      }
    } else {
      selectedLeftRef.current = null;
      setSelectedLeftId(null);
      onSelectOption(false, `${leftId}-${rightPair.id}`);
    }
  };

  const handleSelectRight = (rightPair) => {
    if (matchedIdsRef.current.includes(rightPair.id)) return;
    const activeLeft = selectedLeftRef.current || selectedLeftId;
    if (!activeLeft) {
      const firstUnmatched = pairs.find((p) => !matchedIdsRef.current.includes(p.id));
      if (firstUnmatched) {
        selectedLeftRef.current = firstUnmatched.id;
        setSelectedLeftId(firstUnmatched.id);
      }
      if (onSpeakText) {
        onSpeakText(`Pilih pasangannya untuk ${rightPair.rightLabel}`);
      }
      return;
    }
    handleAttemptMatch(activeLeft, rightPair);
  };

  // Temukan pasangan yang perlu diberi petunjuk jika showHint aktif
  const activeHintPairId =
    showHint && selectedLeftId
      ? selectedLeftId
      : showHint
      ? (pairs.find((p) => !matchedIds.includes(p.id)) || {}).id
      : null;

  return (
    <div className="space-y-4">
      <p className="text-center text-xs sm:text-sm font-extrabold text-[#FFE9B0] bg-[#062D2C]/70 py-2 px-4 rounded-full max-w-md mx-auto">
        👆 Ketuk gambar di kiri, lalu ketuk (atau tarik ke) pasangannya di kanan!
      </p>

      <div className="grid grid-cols-2 gap-3 sm:gap-6 max-w-2xl mx-auto">
        {/* Kolom Kiri */}
        <div role="group" aria-label="Daftar gambar sebelah kiri" className="space-y-3">
          {pairs.map((pair) => {
            const isMatched = matchedIds.includes(pair.id);
            const isSelected = selectedLeftId === pair.id;
            const isHinted = activeHintPairId === pair.id && !isMatched;

            return (
              <button
                key={pair.id}
                type="button"
                draggable={!isMatched}
                onDragStart={(e) => {
                  try {
                    e.dataTransfer.setData('text/plain', pair.id);
                  } catch {
                    // Abaikan
                  }
                  setSelectedLeftId(pair.id);
                }}
                disabled={isMatched}
                onClick={() => handleSelectLeft(pair)}
                aria-label={`Pasangkan ${pair.leftLabel}`}
                className={`w-full min-h-[96px] p-3 sm:p-4 rounded-[24px] border-4 flex flex-col items-center justify-center gap-1.5 text-center transition-all shadow-lg cursor-pointer ${
                  isMatched
                    ? 'bg-[#1FAFAA] border-[#FFE9B0] text-[#052625]'
                    : isSelected
                    ? 'bg-[#E07030] border-[#FFE9B0] text-white scale-105 ring-4 ring-[#FFE9B0]'
                    : isHinted
                    ? 'bg-[#E07030] border-[#FFE9B0] text-white bukuna-hint-glow'
                    : 'bg-[#005E5C] hover:bg-[#004A48] border-white/30 text-white'
                }`}
              >
                <span className="text-3xl sm:text-4xl select-none">{pair.leftEmoji}</span>
                <span className="font-heading font-extrabold text-xs sm:text-base leading-tight">
                  {pair.leftLabel}
                </span>
                {isMatched && <CheckCircle2 className="w-5 h-5 text-[#052625]" />}
              </button>
            );
          })}
        </div>

        {/* Kolom Kanan */}
        <div role="group" aria-label="Daftar pasangan sebelah kanan" className="space-y-3">
          {rightItems.map((rightPair) => {
            const isMatched = matchedIds.includes(rightPair.id);
            const isHintTarget = activeHintPairId === rightPair.id && !isMatched;

            return (
              <button
                key={rightPair.id}
                type="button"
                disabled={isMatched}
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => {
                  e.preventDefault();
                  let draggedId = selectedLeftId;
                  try {
                    const fromTransfer = e.dataTransfer.getData('text/plain');
                    if (fromTransfer) draggedId = fromTransfer;
                  } catch {
                    // Abaikan
                  }
                  handleAttemptMatch(draggedId, rightPair);
                }}
                onClick={() => handleSelectRight(rightPair)}
                aria-label={`Pasangan ${rightPair.rightLabel}`}
                className={`relative w-full min-h-[96px] p-3 sm:p-4 rounded-[24px] border-4 flex flex-col items-center justify-center gap-1.5 text-center transition-all shadow-lg cursor-pointer ${
                  isMatched
                    ? 'bg-[#1FAFAA] border-[#FFE9B0] text-[#052625]'
                    : isHintTarget
                    ? 'bg-[#E07030] border-[#FFE9B0] text-white ring-4 ring-[#FFE9B0] bukuna-hint-glow'
                    : 'bg-[#E07030]/90 hover:bg-[#E07030] border-white/30 text-white'
                }`}
              >
                {isHintTarget && (
                  <span className="absolute -top-2.5 right-2 px-2 py-0.5 rounded-full bg-[#FFE9B0] text-[#052625] text-[10px] font-extrabold inline-flex items-center gap-1 shadow">
                    <Sparkles className="w-3 h-3" />
                    <span>Cocok!</span>
                  </span>
                )}
                <span className="text-3xl sm:text-4xl select-none">{rightPair.rightEmoji}</span>
                <span className="font-heading font-extrabold text-xs sm:text-base leading-tight">
                  {rightPair.rightLabel}
                </span>
                {isMatched && <CheckCircle2 className="w-5 h-5 text-[#052625]" />}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
