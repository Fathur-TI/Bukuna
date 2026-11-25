import React, { useState, useEffect, useRef } from 'react';
import { ArrowLeft, ArrowRight, CheckCircle2, Sparkles } from 'lucide-react';
import StoryIllustration from '../StoryIllustration';

/**
 * Tipe Soal 5: Urutkan Kejadian Cerita (3 Gambar Adegan) (src/components/quiz/OrderStory.jsx)
 * - Mendukung Drag-and-Drop, ketuk 2 kartu untuk bertukar posisi, serta tombol panah Geser Kiri/Kanan
 * - Mendukung gambar ilustrasi cerita pengguna (item.gambar) maupun emoji adegan (item.emoji)
 */
export default function OrderStory({
  question,
  feedbackState = 'idle',
  showHint = false,
  onSelectOption,
  onSpeakText,
}) {
  const rawSequence = Array.isArray(question.sequence) ? question.sequence : [];
  const isSolved = feedbackState === 'correct';

  // Inisialisasi urutan teracak secara deterministik ([1, 2, 0]) agar anak perlu menyusunnya
  const [items, setItems] = useState(() => {
    if (rawSequence.length < 3) return rawSequence;
    return [rawSequence[1], rawSequence[2], rawSequence[0]];
  });

  const [selectedIdx, setSelectedIdx] = useState(null);
  const selectedIdxRef = useRef(null);
  const [dragIdx, setDragIdx] = useState(null);

  useEffect(() => {
    if (rawSequence.length >= 3) {
      setItems([rawSequence[1], rawSequence[2], rawSequence[0]]);
    } else {
      setItems(rawSequence);
    }
    selectedIdxRef.current = null;
    setSelectedIdx(null);
  }, [question.id]);

  const swapPositions = (idxA, idxB) => {
    if (isSolved || idxA === idxB || idxA < 0 || idxB < 0) {
      return;
    }
    setItems((prevItems) => {
      if (idxA >= prevItems.length || idxB >= prevItems.length) return prevItems;
      const copy = [...prevItems];
      const temp = copy[idxA];
      copy[idxA] = copy[idxB];
      copy[idxB] = temp;
      return copy;
    });
    selectedIdxRef.current = null;
    setSelectedIdx(null);
  };

  const handleCardTap = (idx, item) => {
    if (isSolved) return;
    if (onSpeakText && item.label) {
      onSpeakText(item.label);
    }
    const currSelected = selectedIdxRef.current;
    if (currSelected === null) {
      selectedIdxRef.current = idx;
      setSelectedIdx(idx);
    } else if (currSelected === idx) {
      selectedIdxRef.current = null;
      setSelectedIdx(null);
    } else {
      swapPositions(currSelected, idx);
    }
  };

  const handleCheckOrder = () => {
    if (isSolved) return;
    const isAllCorrect = items.every((item, index) => item.correctOrder === index + 1);
    onSelectOption(isAllCorrect, 'order-check');
  };

  const handleAutoArrangeHint = () => {
    if (isSolved) return;
    const sorted = [...items].sort((a, b) => a.correctOrder - b.correctOrder);
    setItems(sorted);
    onSelectOption(true, 'order-auto-hint');
  };

  return (
    <div className="space-y-5">
      <p className="text-center text-xs sm:text-sm font-extrabold text-[#FFE9B0] bg-[#062D2C]/75 py-2 px-4 rounded-full max-w-lg mx-auto">
        👆 Ketuk 2 kartu (atau tarik kartu) untuk menukar urutan dari <strong>1 → 2 → 3</strong>!
      </p>

      {/* 3 Kartu Adegan Cerita */}
      <div
        role="group"
        aria-label="Urutan 3 gambar adegan cerita"
        className="grid grid-cols-1 sm:grid-cols-3 gap-4"
      >
        {items.map((item, idx) => {
          const isSelected = selectedIdx === idx;
          const isInRightSpot = item.correctOrder === idx + 1;

          return (
            <div
              key={item.id}
              draggable={!isSolved}
              onDragStart={() => setDragIdx(idx)}
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                e.preventDefault();
                if (dragIdx !== null && dragIdx !== idx) {
                  swapPositions(dragIdx, idx);
                }
                setDragIdx(null);
              }}
              className={`relative rounded-[28px] p-4 border-4 flex flex-col justify-between transition-all shadow-xl ${
                isSolved
                  ? 'bg-[#1FAFAA] border-[#FFE9B0] text-[#052625]'
                  : isSelected
                  ? 'bg-[#E07030] border-[#FFE9B0] text-white scale-105 ring-4 ring-[#FFE9B0]'
                  : 'bg-[#005E5C] border-white/30 text-white'
              }`}
            >
              {/* Nomor Slot Urutan 1, 2, 3 */}
              <div className="flex items-center justify-between gap-2 mb-2">
                <span className="w-9 h-9 rounded-full bg-[#FFE9B0] text-[#052625] font-heading font-extrabold text-base flex items-center justify-center shadow">
                  {idx + 1}
                </span>

                {showHint && !isSolved && (
                  <span
                    className={`px-2.5 py-0.5 rounded-full text-xs font-extrabold ${
                      isInRightSpot
                        ? 'bg-[#1FAFAA] text-[#052625]'
                        : 'bg-[#FFE9B0] text-[#052625]'
                    }`}
                  >
                    Seharusnya #{item.correctOrder}
                  </span>
                )}
              </div>

              {/* Tombol Utama Kartu Adegan */}
              <button
                type="button"
                disabled={isSolved}
                onClick={() => handleCardTap(idx, item)}
                aria-label={`Adegan posisi ${idx + 1}: ${item.label}`}
                className="w-full min-h-[104px] py-2 flex flex-col items-center justify-center gap-2 text-center cursor-pointer"
              >
                {item.gambar ? (
                  <div className="w-full max-w-[170px] aspect-[4/3] rounded-2xl overflow-hidden border-2 border-white/30 bg-[#062D2C]">
                    <StoryIllustration
                      variant={item.gambar}
                      title={item.label}
                      alt={item.label}
                      showCoverTitle={false}
                      className="w-full h-full"
                    />
                  </div>
                ) : (
                  <span className="text-4xl sm:text-5xl select-none">{item.emoji || '📖'}</span>
                )}
                <span className="font-heading font-extrabold text-sm sm:text-base leading-snug">
                  {item.label}
                </span>
              </button>

              {/* Tombol Bantu Geser Kiri / Kanan untuk layar sentuh */}
              {!isSolved && (
                <div className="mt-3 pt-2 border-t border-white/15 flex items-center justify-between gap-2">
                  <button
                    type="button"
                    disabled={idx === 0}
                    onClick={() => swapPositions(idx, idx - 1)}
                    aria-label={`Geser adegan ${idx + 1} ke kiri`}
                    className={`min-h-[38px] px-3 py-1 rounded-full text-xs font-extrabold inline-flex items-center gap-1 ${
                      idx === 0
                        ? 'opacity-40 cursor-not-allowed bg-black/20'
                        : 'bg-[#062D2C] hover:bg-[#1FAFAA] hover:text-[#052625] text-[#FFE9B0] cursor-pointer'
                    }`}
                  >
                    <ArrowLeft className="w-3.5 h-3.5" />
                    <span>Geser</span>
                  </button>

                  <button
                    type="button"
                    disabled={idx === items.length - 1}
                    onClick={() => swapPositions(idx, idx + 1)}
                    aria-label={`Geser adegan ${idx + 1} ke kanan`}
                    className={`min-h-[38px] px-3 py-1 rounded-full text-xs font-extrabold inline-flex items-center gap-1 ${
                      idx === items.length - 1
                        ? 'opacity-40 cursor-not-allowed bg-black/20'
                        : 'bg-[#062D2C] hover:bg-[#1FAFAA] hover:text-[#052625] text-[#FFE9B0] cursor-pointer'
                    }`}
                  >
                    <span>Geser</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Tombol Periksa Urutan & Tombol Bantuan Petunjuk */}
      {!isSolved && (
        <div className="pt-2 flex flex-wrap items-center justify-center gap-3">
          <button
            type="button"
            onClick={handleCheckOrder}
            className="min-h-[56px] px-8 py-3 rounded-full bg-[#E07030] hover:bg-[#C95B1E] text-white font-heading font-extrabold text-lg border-2 border-[#FFE9B0] shadow-lg inline-flex items-center gap-2 transition-all cursor-pointer"
          >
            <CheckCircle2 className="w-6 h-6" />
            <span>Periksa Urutan Cerita!</span>
          </button>

          {showHint && (
            <button
              type="button"
              onClick={handleAutoArrangeHint}
              className="min-h-[52px] px-6 py-2.5 rounded-full bg-[#FFE9B0] hover:bg-white text-[#052625] font-heading font-extrabold text-sm sm:text-base shadow-md inline-flex items-center gap-2 transition-all cursor-pointer bukuna-hint-glow"
            >
              <Sparkles className="w-5 h-5 text-[#E07030]" />
              <span>Bantu Susun Bersama Rodri</span>
            </button>
          )}
        </div>
      )}
    </div>
  );
}

