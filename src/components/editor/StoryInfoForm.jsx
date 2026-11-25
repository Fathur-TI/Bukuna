import React from 'react';
import { ChevronRight, AlertCircle } from 'lucide-react';
import TextInput from '../TextInput';
import ImageUploader from './ImageUploader';

const STORY_CATEGORIES = [
  'Petualangan',
  'Persahabatan',
  'Keluarga',
  'Alam/Lingkungan',
  'Fantasi',
];

const STORY_AGES = ['4-5 Tahun', '5-6 Tahun'];

/**
 * Langkah 1 Wizard: Info Cerita (src/components/editor/StoryInfoForm.jsx)
 * - Judul (wajib, maks 60 karakter) menggunakan <TextInput />
 * - Kategori (Petualangan, Persahabatan, Keluarga, Alam/Lingkungan, Fantasi)
 * - Usia (4-5 Tahun, 5-6 Tahun)
 * - Sinopsis cerita
 * - Gambar Sampul menggunakan <ImageUploader />
 */
export default function StoryInfoForm({
  storyData,
  onChangeField,
  errors = {},
  onNextStep,
}) {
  const titleLength = (storyData.judul || '').length;

  const handleTitleChange = (e) => {
    const val = e.target.value.slice(0, 60);
    onChangeField('judul', val);
  };

  return (
    <div className="bg-[#005E5C]/85 border-2 border-[#1FAFAA]/50 rounded-[30px] p-5 sm:p-7 shadow-2xl flex flex-col gap-5">
      <div>
        <h2 className="font-heading font-extrabold text-xl sm:text-2xl text-[#FFE9B0]">
          Langkah 1: Informasi Dasar Cerita
        </h2>
        <p className="sub-section text-white/90 mt-0.5">
          Isi judul, tema, rentang usia, sinopsis singkat, dan gambar sampul ceritamu.
        </p>
      </div>

      {/* Judul Cerita (Wajib, maks 60 karakter) */}
      <div>
        <div className="flex items-center justify-between mb-1">
          <span className="sub-help text-[#FFE9B0]">
            Wajib diisi (Maksimal 60 karakter)
          </span>
          <span
            className={`sub-help ${
              titleLength >= 55 ? 'text-[#E07030]' : 'text-white/80'
            }`}
          >
            {titleLength}/60 karakter
          </span>
        </div>
        <TextInput
          id="story-info-judul"
          name="judul"
          label="Judul Cerita Anak *"
          value={storyData.judul || ''}
          onChange={handleTitleChange}
          placeholder="Contoh: Petualangan Kiko di Hutan Pelangi"
          error={errors.judul}
        />
      </div>

      {/* Pilihan Kategori & Rentang Usia */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-5">
        <div className="md:col-span-7">
          <p className="sub-form-label block pl-2 mb-2 text-[#FFE9B0]">
            Kategori Cerita
          </p>
          <div className="flex flex-wrap gap-2">
            {STORY_CATEGORIES.map((kat) => {
              const active = storyData.kategori === kat;
              return (
                <button
                  key={kat}
                  type="button"
                  onClick={() => onChangeField('kategori', kat)}
                  className={`sub-chip min-h-[44px] px-4 py-2 rounded-full transition-all cursor-pointer border-2 ${
                    active
                      ? 'bg-[#E07030] border-[#FFE9B0] text-white shadow-md'
                      : 'bg-[#062D2C]/80 border-white/20 text-white hover:bg-white/15'
                  }`}
                >
                  {kat}
                </button>
              );
            })}
          </div>
        </div>

        <div className="md:col-span-5">
          <p className="sub-form-label block pl-2 mb-2 text-[#FFE9B0]">
            Rentang Usia Anak
          </p>
          <div className="flex flex-wrap gap-2">
            {STORY_AGES.map((usiaOpt) => {
              const active = storyData.usia === usiaOpt;
              return (
                <button
                  key={usiaOpt}
                  type="button"
                  onClick={() => onChangeField('usia', usiaOpt)}
                  className={`sub-chip min-h-[44px] px-4 py-2 rounded-full transition-all cursor-pointer border-2 ${
                    active
                      ? 'bg-[#1FAFAA] border-[#FFE9B0] text-[#052625] shadow-md'
                      : 'bg-[#062D2C]/80 border-white/20 text-white hover:bg-white/15'
                  }`}
                >
                  {usiaOpt}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Sinopsis Cerita */}
      <div>
        <label
          htmlFor="story-info-sinopsis"
          className="sub-form-label block pl-2 mb-2 text-[#FFE9B0]"
        >
          Sinopsis Singkat Cerita
        </label>
        <textarea
          id="story-info-sinopsis"
          name="sinopsis"
          rows={3}
          value={storyData.sinopsis || ''}
          onChange={(e) => onChangeField('sinopsis', e.target.value)}
          placeholder="Ceritakan gambaran singkat isi buku dan pesan kebaikan yang bisa dipetik anak-anak..."
          className="w-full rounded-[22px] bg-white text-[#062D2C] font-semibold text-sm sm:text-base p-4 border-4 border-transparent focus:border-[#E07030] shadow-inner transition-colors"
        />
        {errors.sinopsis && (
          <p className="sub-help mt-1.5 pl-2 text-red-300 flex items-center gap-1">
            <AlertCircle className="w-4 h-4" />
            <span>{errors.sinopsis}</span>
          </p>
        )}
      </div>

      {/* Gambar Sampul */}
      <ImageUploader
        idPrefix="cover-upload"
        label="Gambar Sampul Buku Cerita"
        imageValue={storyData.cover || ''}
        altValue={storyData.coverAlt || ''}
        onImageChange={(val) => onChangeField('cover', val)}
        onAltChange={(val) => onChangeField('coverAlt', val)}
        aspectRatio={1}
        aspectLabel="Rasio Sampul (1:1)"
        storyTitle={storyData.judul || 'Judul Cerita'}
        showPresetThemes={true}
      />

      {/* Tombol Lanjut ke Langkah 2 */}
      <div className="pt-2 flex justify-end">
        <button
          type="button"
          onClick={onNextStep}
          className="min-h-[50px] px-7 py-3 rounded-full bg-[#E07030] hover:bg-[#C95B1E] text-white font-heading font-extrabold text-base sm:text-lg shadow-lg inline-flex items-center gap-2 transition-all cursor-pointer"
        >
          <span>Lanjut ke Halaman Cerita</span>
          <ChevronRight className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
}

