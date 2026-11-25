import React, { useState } from 'react';
import {
  Plus,
  Trash2,
  Copy,
  ArrowUp,
  ArrowDown,
  GripVertical,
  AlertCircle,
} from 'lucide-react';
import StoryIllustration from '../StoryIllustration';

/**
 * Daftar & Pengatur Urutan Halaman Cerita (src/components/editor/PageList.jsx)
 * - Menampilkan daftar 1 s/d 30 halaman cerita
 * - Tambah halaman, Duplikat halaman, Hapus halaman (dengan dialog konfirmasi)
 * - Ubah urutan: mendukung Drag-and-Drop (HTML5) SEKALIGUS tombol Naik/Turun untuk layar sentuh HP/Tablet
 */
export default function PageList({
  pages = [],
  activePageIndex = 0,
  storyCover = 'cat-magic-forest',
  onSelectPage,
  onAddPage,
  onDuplicatePage,
  onDeletePage,
  onMovePage,
}) {
  const [draggedIdx, setDraggedIdx] = useState(null);
  const [confirmDeleteIdx, setConfirmDeleteIdx] = useState(null);

  const totalPages = pages.length;
  const canAddMore = totalPages < 30;
  const canDelete = totalPages > 1;

  const handleDragStart = (e, idx) => {
    setDraggedIdx(idx);
    try {
      e.dataTransfer.effectAllowed = 'move';
      e.dataTransfer.setData('text/plain', String(idx));
    } catch {
      // Abaikan
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
  };

  const handleDrop = (e, targetIdx) => {
    e.preventDefault();
    const fromIdx =
      draggedIdx !== null
        ? draggedIdx
        : parseInt(e.dataTransfer.getData('text/plain'), 10);
    setDraggedIdx(null);
    if (!Number.isNaN(fromIdx) && fromIdx !== targetIdx && onMovePage) {
      onMovePage(fromIdx, targetIdx);
    }
  };

  return (
    <aside className="bg-[#005E5C]/90 border-2 border-[#1FAFAA]/50 rounded-[28px] p-4 sm:p-5 shadow-xl flex flex-col gap-3">
      <div className="flex items-center justify-between gap-2">
        <div>
          <h3 className="font-heading font-extrabold text-base sm:text-lg text-[#FFE9B0]">
            Daftar Halaman ({totalPages}/30)
          </h3>
          <p className="sub-help text-white/85">
            Tarik kartu atau tekan panah ↑ ↓ untuk ubah urutan
          </p>
        </div>

        <button
          type="button"
          onClick={onAddPage}
          disabled={!canAddMore}
          className={`min-h-[42px] px-3.5 py-2 rounded-full font-heading font-extrabold text-xs sm:text-sm inline-flex items-center gap-1.5 shadow-md transition-all ${
            canAddMore
              ? 'bg-[#E07030] hover:bg-[#C95B1E] text-white cursor-pointer'
              : 'bg-white/15 text-white/50 cursor-not-allowed'
          }`}
        >
          <Plus className="w-4 h-4" />
          <span>+ Halaman</span>
        </button>
      </div>

      {/* Daftar Kartu Halaman */}
      <div className="flex flex-col gap-2.5 max-h-[440px] overflow-y-auto pr-1">
        {pages.map((page, idx) => {
          const isActive = idx === activePageIndex;
          const isConfirmingDelete = confirmDeleteIdx === idx;

          return (
            <div
              key={page.id || `page-item-${idx}`}
              draggable={true}
              onDragStart={(e) => handleDragStart(e, idx)}
              onDragOver={handleDragOver}
              onDrop={(e) => handleDrop(e, idx)}
              className={`rounded-2xl p-2.5 border-2 transition-all ${
                isActive
                  ? 'bg-[#062D2C] border-[#FFE9B0] shadow-md'
                  : 'bg-white/10 border-white/15 hover:bg-white/15'
              }`}
            >
              <div className="flex items-center gap-2.5">
                {/* Handle Drag */}
                <span
                  title="Tarik untuk mengubah urutan halaman"
                  className="text-white/60 cursor-pointer shrink-0"
                >
                  <GripVertical className="w-4 h-4" />
                </span>

                {/* Tombol Pilih Halaman (Thumbnail + Cuplikan Teks) */}
                <button
                  type="button"
                  onClick={() => onSelectPage && onSelectPage(idx)}
                  className="flex-1 min-w-0 flex items-center gap-2.5 text-left cursor-pointer"
                >
                  <div className="w-12 h-12 rounded-xl overflow-hidden border border-[#1FAFAA]/60 shrink-0 bg-[#007A78]">
                    <StoryIllustration
                      variant={page.gambar || storyCover || 'cat-magic-forest'}
                      title=""
                      pageIndex={idx}
                      showCoverTitle={false}
                      className="w-full h-full"
                    />
                  </div>
                  <div className="min-w-0 flex-1">
                    <span className="font-heading font-extrabold text-sm text-[#FFE9B0] block">
                      Halaman {idx + 1}
                    </span>
                    <p className="sub-help text-white/85 truncate">
                      {page.teks && page.teks.trim()
                        ? page.teks
                        : '(Belum ada teks cerita)'}
                    </p>
                  </div>
                </button>

                {/* Tombol Aksi Urutan Naik/Turun, Duplikat, dan Hapus (Ramah Layar Sentuh) */}
                <div className="flex items-center gap-1 shrink-0">
                  <button
                    type="button"
                    onClick={() => idx > 0 && onMovePage && onMovePage(idx, idx - 1)}
                    disabled={idx === 0}
                    aria-label={`Pindahkan Halaman ${idx + 1} ke atas`}
                    title="Pindah ke Atas"
                    className={`w-8 h-8 rounded-full flex items-center justify-center transition-colors ${
                      idx === 0
                        ? 'opacity-40 cursor-not-allowed bg-white/5 text-white'
                        : 'bg-white/15 hover:bg-[#1FAFAA] text-white hover:text-[#052625] cursor-pointer'
                    }`}
                  >
                    <ArrowUp className="w-3.5 h-3.5" />
                  </button>

                  <button
                    type="button"
                    onClick={() =>
                      idx < totalPages - 1 && onMovePage && onMovePage(idx, idx + 1)
                    }
                    disabled={idx === totalPages - 1}
                    aria-label={`Pindahkan Halaman ${idx + 1} ke bawah`}
                    title="Pindah ke Bawah"
                    className={`w-8 h-8 rounded-full flex items-center justify-center transition-colors ${
                      idx === totalPages - 1
                        ? 'opacity-40 cursor-not-allowed bg-white/5 text-white'
                        : 'bg-white/15 hover:bg-[#1FAFAA] text-white hover:text-[#052625] cursor-pointer'
                    }`}
                  >
                    <ArrowDown className="w-3.5 h-3.5" />
                  </button>

                  <button
                    type="button"
                    onClick={() => canAddMore && onDuplicatePage && onDuplicatePage(idx)}
                    disabled={!canAddMore}
                    aria-label={`Duplikat Halaman ${idx + 1}`}
                    title="Duplikat Halaman"
                    className={`w-8 h-8 rounded-full flex items-center justify-center transition-colors ${
                      !canAddMore
                        ? 'opacity-40 cursor-not-allowed bg-white/5 text-white'
                        : 'bg-white/15 hover:bg-[#1FAFAA] text-white hover:text-[#052625] cursor-pointer'
                    }`}
                  >
                    <Copy className="w-3.5 h-3.5" />
                  </button>

                  <button
                    type="button"
                    onClick={() => canDelete && setConfirmDeleteIdx(idx)}
                    disabled={!canDelete}
                    aria-label={`Hapus Halaman ${idx + 1}`}
                    title="Hapus Halaman"
                    className={`w-8 h-8 rounded-full flex items-center justify-center transition-colors ${
                      !canDelete
                        ? 'opacity-40 cursor-not-allowed bg-white/5 text-white'
                        : 'bg-red-500/20 hover:bg-red-500/40 text-red-300 cursor-pointer'
                    }`}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Konfirmasi Hapus Halaman */}
              {isConfirmingDelete && (
                <div className="mt-2.5 pt-2.5 border-t border-white/15 flex items-center justify-between gap-2 bg-red-500/20 rounded-xl p-2.5">
                  <span className="text-xs font-bold text-white flex items-center gap-1.5">
                    <AlertCircle className="w-4 h-4 text-[#FFE9B0] shrink-0" />
                    <span>Hapus Halaman {idx + 1}?</span>
                  </span>
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => setConfirmDeleteIdx(null)}
                      className="px-3 py-1 rounded-full bg-white/20 text-white text-xs font-bold cursor-pointer"
                    >
                      Batal
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setConfirmDeleteIdx(null);
                        if (onDeletePage) onDeletePage(idx);
                      }}
                      className="px-3 py-1 rounded-full bg-[#E07030] text-white text-xs font-extrabold cursor-pointer"
                    >
                      Ya, Hapus
                    </button>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </aside>
  );
}

