import React, { useState } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  Save,
  Send,
  BookOpen,
  Sparkles,
} from 'lucide-react';
import StoryIllustration from '../StoryIllustration';
import StoryQuizBuilder from './StoryQuizBuilder';

/**
 * Langkah 3 Wizard: Pratinjau, Kuis Cerita, & Simpan (src/components/editor/StoryPreview.jsx)
 * - Menampilkan pratinjau cerita dengan tata letak Halaman Membaca BUKUNA yang sesungguhnya
 * - Menyediakan panel "Buat Kuis dari Cerita Ini" (otomatis & dapat diedit guru)
 * - Tombol "Simpan sebagai Draf" dan "Terbitkan"
 */
export default function StoryPreview({
  storyData,
  onChangeQuiz,
  onNotify,
  onPrevStep,
  onSaveDraft,
  onPublish,
  isSaving = false,
}) {
  const pages =
    Array.isArray(storyData.pages) && storyData.pages.length > 0
      ? storyData.pages
      : [{ id: 'hal-1', gambar: '', teks: '', alt: '' }];

  const totalPages = pages.length;
  const [currentPage, setCurrentPage] = useState(0);
  const safeIdx = Math.min(currentPage, totalPages - 1);
  const pageData = pages[safeIdx] || pages[0];

  return (
    <div className="flex flex-col gap-6">
      {/* Banner Ringkasan Informasi Cerita */}
      <div className="bg-[#005E5C]/90 border-2 border-[#1FAFAA]/50 rounded-[28px] p-4 sm:p-6 shadow-xl flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl overflow-hidden border-2 border-[#FFE9B0] shrink-0 bg-[#007A78]">
            <StoryIllustration
              variant={storyData.cover || 'cat-magic-forest'}
              title={storyData.judul}
              alt={storyData.coverAlt || storyData.judul}
              showCoverTitle={false}
              className="w-full h-full"
            />
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="sub-chip px-2.5 py-0.5 rounded-full bg-[#E07030] text-white">
                Pratinjau Pembaca
              </span>
              <span className="sub-label text-[#FFE9B0]">
                {storyData.kategori} • {storyData.usia} • {totalPages} Halaman
              </span>
              {storyData.quiz &&
                Array.isArray(storyData.quiz.questions) &&
                storyData.quiz.questions.length > 0 && (
                  <span className="sub-chip px-2.5 py-0.5 rounded-full bg-[#1FAFAA] text-[#052625] inline-flex items-center gap-1">
                    <Sparkles className="w-3 h-3" />
                    <span>Kuis: {storyData.quiz.questions.length} Soal</span>
                  </span>
                )}
            </div>
            <h2 className="font-heading font-extrabold text-xl sm:text-2xl text-[#FFE9B0] mt-1">
              {storyData.judul || 'Cerita Tanpa Judul'}
            </h2>
            {storyData.sinopsis && (
              <p className="sub-section text-white/90 line-clamp-2 mt-0.5">
                {storyData.sinopsis}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Komponen Pratinjau Halaman Membaca (Identik dengan ReadStoryPage) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 lg:gap-8 items-stretch">
        {/* Area Ilustrasi Halaman */}
        <div className="lg:col-span-6 relative rounded-[28px] overflow-hidden shadow-2xl border-4 border-[#1FAFAA]/60 bg-[#005E5C] aspect-[4/3.6] lg:aspect-auto lg:min-h-[420px]">
          <div className="absolute top-3.5 left-3.5 right-3.5 z-20 flex items-center justify-between">
            <span className="px-3.5 py-1 rounded-full bg-black/45 text-xs font-extrabold text-[#FFE9B0] truncate max-w-[75%]">
              {storyData.judul || 'Judul Cerita'}
            </span>
            <span className="px-3 py-1 rounded-full bg-[#E07030] text-white text-xs font-extrabold">
              Buatanku
            </span>
          </div>

          <StoryIllustration
            variant={pageData.gambar || storyData.cover || 'cat-magic-forest'}
            title=""
            alt={pageData.alt || `Ilustrasi halaman ${safeIdx + 1}`}
            pageIndex={safeIdx}
            showCoverTitle={false}
            sizeVariant="lg"
            fit="contain-blur"
            loading={safeIdx === 0 ? 'eager' : 'lazy'}
            className="w-full h-full"
          />

          {/* Indikator Titik Halaman */}
          <div className="absolute bottom-3 left-0 right-0 flex items-center justify-center gap-1.5 z-10">
            {pages.map((p, idx) => (
              <button
                key={p.id || `dot-${idx}`}
                type="button"
                onClick={() => setCurrentPage(idx)}
                aria-label={`Lihat halaman ${idx + 1}`}
                className={`h-2.5 rounded-full transition-all cursor-pointer ${
                  idx === safeIdx
                    ? 'w-7 bg-[#FFE9B0]'
                    : 'w-2.5 bg-white/50 hover:bg-white/80'
                }`}
              />
            ))}
          </div>
        </div>

        {/* Kotak Teks Cerita & Navigasi Halaman */}
        <div className="lg:col-span-6 flex flex-col justify-between bg-[#1FAFAA] text-[#052625] rounded-[28px] sm:rounded-[32px] p-5 sm:p-8 shadow-2xl border-4 border-[#FFE9B0]/60 min-h-[270px] lg:min-h-[420px]">
          <div>
            <div className="flex items-center justify-between gap-2 mb-3 sm:mb-4">
              <span className="sub-chip px-3 py-1 rounded-full bg-[#007A78] text-[#FFE9B0]">
                Halaman {safeIdx + 1} dari {totalPages}
              </span>
              <span className="sub-help text-[#052625]/75 flex items-center gap-1">
                <BookOpen className="w-3.5 h-3.5" />
                <span>Tampilan Pembaca</span>
              </span>
            </div>

            <p className="font-story font-bold text-[#042423] leading-[1.68] text-base sm:text-xl lg:text-2xl">
              {pageData.teks && pageData.teks.trim()
                ? pageData.teks
                : '(Belum ada teks pada halaman ini. Kamu bisa kembali ke Langkah 2 untuk mengisi teks cerita.)'}
            </p>
          </div>

          <div className="mt-6 pt-4 border-t-2 border-[#052625]/15 flex items-center justify-between gap-2">
            <button
              type="button"
              onClick={() => safeIdx > 0 && setCurrentPage(safeIdx - 1)}
              disabled={safeIdx === 0}
              className={`min-h-[44px] px-4 py-2 rounded-full font-heading font-extrabold text-xs sm:text-base inline-flex items-center gap-1 transition-all ${
                safeIdx === 0
                  ? 'opacity-40 cursor-not-allowed bg-black/10 text-[#052625]'
                  : 'bg-[#007A78] hover:bg-[#005E5C] text-white shadow-md cursor-pointer'
              }`}
            >
              <ChevronLeft className="w-4 h-4" />
              <span>Sebelumnya</span>
            </button>

            <span className="font-heading font-extrabold text-sm sm:text-lg px-3.5 py-1 rounded-full bg-white/60 text-[#052625]">
              {safeIdx + 1}/{totalPages}
            </span>

            <button
              type="button"
              onClick={() => safeIdx < totalPages - 1 && setCurrentPage(safeIdx + 1)}
              disabled={safeIdx === totalPages - 1}
              className={`min-h-[44px] px-4 py-2 rounded-full font-heading font-extrabold text-xs sm:text-base inline-flex items-center gap-1 transition-all ${
                safeIdx === totalPages - 1
                  ? 'opacity-40 cursor-not-allowed bg-black/10 text-[#052625]'
                  : 'bg-[#E07030] hover:bg-[#C95B1E] text-white shadow-md cursor-pointer'
              }`}
            >
              <span>Selanjutnya</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Panel Integrasi Tahap 3: Buat Kuis dari Cerita Ini */}
      {onChangeQuiz && (
        <StoryQuizBuilder
          storyData={storyData}
          onChangeQuiz={onChangeQuiz}
          onNotify={onNotify}
        />
      )}

      {/* Panel Aksi Simpan sebagai Draf & Terbitkan */}
      <div className="bg-[#005E5C]/90 border-2 border-[#FFE9B0]/50 rounded-[28px] p-5 sm:p-6 shadow-2xl flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
        <button
          type="button"
          onClick={onPrevStep}
          disabled={isSaving}
          className="min-h-[48px] px-5 py-2.5 rounded-full bg-white/15 hover:bg-white/25 text-white font-heading font-bold text-sm sm:text-base inline-flex items-center justify-center gap-2 transition-colors cursor-pointer"
        >
          <ChevronLeft className="w-5 h-5" />
          <span>Kembali Edit Halaman</span>
        </button>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
          <button
            type="button"
            onClick={onSaveDraft}
            disabled={isSaving}
            className="min-h-[50px] px-6 py-3 rounded-full bg-[#1FAFAA] hover:bg-[#159A95] text-[#052625] font-heading font-extrabold text-sm sm:text-base shadow-lg inline-flex items-center justify-center gap-2 transition-all cursor-pointer"
          >
            <Save className="w-5 h-5" />
            <span>Simpan sebagai Draf</span>
          </button>

          <button
            type="button"
            onClick={onPublish}
            disabled={isSaving}
            className="min-h-[50px] px-7 py-3 rounded-full bg-[#E07030] hover:bg-[#C95B1E] text-white font-heading font-extrabold text-base sm:text-lg shadow-[0_8px_20px_rgba(224,112,48,0.45)] inline-flex items-center justify-center gap-2 transition-all cursor-pointer"
          >
            <Send className="w-5 h-5" />
            <span>Terbitkan</span>
          </button>
        </div>
      </div>
    </div>
  );
}

