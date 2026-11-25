import React from 'react';
import { ChevronLeft, ChevronRight, Plus } from 'lucide-react';
import ImageUploader from './ImageUploader';

/**
 * Editor Halaman Aktif — Langkah 2 Wizard (src/components/editor/PageEditor.jsx)
 * - Indikator jelas "Halaman 2 dari 5"
 * - Satu gambar ilustrasi + satu kotak teks cerita per halaman
 * - Ukuran font kotak teks sama persis dengan Halaman Membaca (WYSIWYG)
 */
export default function PageEditor({
  page,
  pageIndex = 0,
  totalPages = 1,
  storyTitle = '',
  onUpdatePageField,
  onSelectPage,
  onAddPage,
  onPrevStep,
  onNextStep,
}) {
  const safePage = page || { id: 'hal-1', gambar: '', teks: '', alt: '' };

  return (
    <div className="bg-[#005E5C]/85 border-2 border-[#1FAFAA]/50 rounded-[30px] p-5 sm:p-7 shadow-2xl flex flex-col gap-5">
      {/* Header Indikator "Halaman X dari Y" & Navigasi Cepat Antar Halaman */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-white/15">
        <div>
          <span className="sub-chip inline-block px-4 py-1.5 rounded-full bg-[#E07030] text-white shadow-sm">
            Halaman {pageIndex + 1} dari {totalPages}
          </span>
          <p className="sub-section text-white/85 mt-1.5">
            Unggah satu gambar dan tulis isi cerita untuk halaman ini.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => pageIndex > 0 && onSelectPage(pageIndex - 1)}
            disabled={pageIndex === 0}
            className={`min-h-[40px] px-3.5 py-1.5 rounded-full font-bold text-xs sm:text-sm inline-flex items-center gap-1 transition-colors ${
              pageIndex === 0
                ? 'opacity-40 cursor-not-allowed bg-white/10 text-white'
                : 'bg-[#062D2C] hover:bg-[#1FAFAA] text-white hover:text-[#052625] cursor-pointer'
            }`}
          >
            <ChevronLeft className="w-4 h-4" />
            <span>Hal. Sebelumnya</span>
          </button>

          {pageIndex < totalPages - 1 ? (
            <button
              type="button"
              onClick={() => onSelectPage(pageIndex + 1)}
              className="min-h-[40px] px-3.5 py-1.5 rounded-full bg-[#062D2C] hover:bg-[#1FAFAA] text-white hover:text-[#052625] font-bold text-xs sm:text-sm inline-flex items-center gap-1 transition-colors cursor-pointer"
            >
              <span>Hal. Berikutnya</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          ) : (
            totalPages < 30 && (
              <button
                type="button"
                onClick={onAddPage}
                className="min-h-[40px] px-3.5 py-1.5 rounded-full bg-[#1FAFAA] hover:bg-[#159A95] text-[#052625] font-extrabold text-xs sm:text-sm inline-flex items-center gap-1 transition-colors cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>Tambah Hal. {totalPages + 1}</span>
              </button>
            )
          )}
        </div>
      </div>

      {/* 1. Area Gambar Halaman */}
      <ImageUploader
        idPrefix={`page-img-${pageIndex}`}
        label={`Gambar Ilustrasi Halaman ${pageIndex + 1}`}
        imageValue={safePage.gambar || ''}
        altValue={safePage.alt || ''}
        onImageChange={(val) => onUpdatePageField(pageIndex, 'gambar', val)}
        onAltChange={(val) => onUpdatePageField(pageIndex, 'alt', val)}
        aspectRatio={4 / 3.6}
        aspectLabel="Rasio Halaman (4:3.6)"
        pageIndex={pageIndex}
        storyTitle={storyTitle}
        showPresetThemes={false}
      />

      {/* 2. Kotak Teks Cerita Halaman (WYSIWYG — ukuran font & tampilan Andika sama dengan pembaca) */}
      <div className="bg-[#1FAFAA] rounded-[28px] p-4 sm:p-6 border-4 border-[#FFE9B0]/60 shadow-xl">
        <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
          <label
            htmlFor={`page-story-text-${pageIndex}`}
            className="sub-form-label text-[#052625]"
          >
            Teks Cerita Halaman {pageIndex + 1} (Tampilan Pembaca)
          </label>
          <span className="sub-help px-3 py-1 rounded-full bg-[#007A78] text-[#FFE9B0]">
            {(safePage.teks || '').length} karakter
          </span>
        </div>

        <textarea
          id={`page-story-text-${pageIndex}`}
          name={`pageText_${pageIndex}`}
          rows={5}
          value={safePage.teks || ''}
          onChange={(e) => onUpdatePageField(pageIndex, 'teks', e.target.value)}
          placeholder={`Tulis isi cerita untuk Halaman ${pageIndex + 1} di sini... Gunakan kalimat yang hangat dan mudah dipahami anak-anak.`}
          className="font-story w-full rounded-[22px] bg-[#FFE9B0] text-[#042423] font-bold text-base sm:text-xl lg:text-2xl leading-[1.68] p-4 sm:p-5 border-4 border-transparent focus:border-[#E07030] shadow-inner transition-colors"
        />
      </div>

      {/* Navigasi Langkah Wizard Bawah */}
      <div className="pt-2 flex flex-wrap items-center justify-between gap-3">
        <button
          type="button"
          onClick={onPrevStep}
          className="min-h-[48px] px-5 py-2.5 rounded-full bg-white/15 hover:bg-white/25 text-white font-heading font-bold text-sm sm:text-base inline-flex items-center gap-2 transition-colors cursor-pointer"
        >
          <ChevronLeft className="w-5 h-5" />
          <span>Kembali ke Info Cerita</span>
        </button>

        <button
          type="button"
          onClick={onNextStep}
          className="min-h-[50px] px-7 py-3 rounded-full bg-[#E07030] hover:bg-[#C95B1E] text-white font-heading font-extrabold text-base sm:text-lg shadow-lg inline-flex items-center gap-2 transition-all cursor-pointer"
        >
          <span>Pratinjau & Simpan</span>
          <ChevronRight className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
}

