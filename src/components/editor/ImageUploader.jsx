import React, { useState, useRef } from 'react';
import {
  Upload,
  Camera,
  Trash2,
  Crop,
  RotateCw,
  ShieldCheck,
  AlertCircle,
  Sparkles,
} from 'lucide-react';
import StoryIllustration from '../StoryIllustration';
import TextInput from '../TextInput';
import ImageCropper from './ImageCropper';
import { validateImageFile, compressAndTransformImage } from '../../utils/imageCompress';
import {
  saveImage,
  getImage,
  isIndexedDbImageId,
} from '../../services/storyStorage';

const PRESET_THEMES = [
  { id: 'cat-magic-forest', label: 'Hutan Kucing' },
  { id: 'sky-balloons', label: 'Balon Warna-Warni' },
  { id: 'rabbit-garden', label: 'Kebun Kelinci' },
  { id: 'family-home', label: 'Rumah Hangat' },
  { id: 'river-clean', label: 'Sungai Jernih' },
  { id: 'cloud-ship', label: 'Perahu Awan' },
];

/**
 * Komponen Unggah Gambar Sampul / Halaman (src/components/editor/ImageUploader.jsx)
 * - Mendukung unggah dari Galeri/File & Kamera HP (capture="environment")
 * - Validasi JPG/PNG/WebP maks 10MB, kompres otomatis <=1280px kualitas 0.8 via canvas
 * - Mendukung Crop sederhana, tombol Putar 90°, Ganti Gambar, Hapus Gambar, progress bar
 * - Kolom opsional "Deskripsi gambar" (alt text)
 * - Menampilkan pengingat wajib privasi & lisensi gambar anak
 */
export default function ImageUploader({
  idPrefix = 'img-up',
  label = 'Gambar Ilustrasi',
  imageValue = '',
  altValue = '',
  onImageChange,
  onAltChange,
  aspectRatio = 1,
  aspectLabel = 'Rasio Sampul (1:1)',
  pageIndex = 0,
  storyTitle = '',
  showPresetThemes = false,
}) {
  const fileInputRef = useRef(null);
  const cameraInputRef = useRef(null);

  const [processing, setProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [errorMsg, setErrorMsg] = useState('');
  const [cropSource, setCropSource] = useState(null);

  const hasUploadedImage =
    isIndexedDbImageId(imageValue) ||
    (typeof imageValue === 'string' &&
      (imageValue.startsWith('blob:') || imageValue.startsWith('data:image/')));

  const handleFileSelected = async (e) => {
    const file = e.target.files && e.target.files[0];
    e.target.value = '';
    if (!file) return;

    setErrorMsg('');
    const check = validateImageFile(file);
    if (!check.valid) {
      setErrorMsg(check.error);
      return;
    }

    // Kompres langsung agar cepat & simpan ke IndexedDB, sambil menyediakan tombol Crop/Putar
    setProcessing(true);
    setProgress(10);
    try {
      const compressed = await compressAndTransformImage(file, {
        maxWidth: 1280,
        quality: 0.8,
        rotation: 0,
        aspectRatio,
        onProgress: (p) => setProgress(p),
      });
      const savedId = await saveImage(compressed.blob);
      if (typeof onImageChange === 'function') {
        onImageChange(savedId);
      }
    } catch (err) {
      setErrorMsg(
        (err && err.message) ||
          'Maaf, gambar belum berhasil diproses. Coba pilih gambar JPG, PNG, atau WebP lain ya.'
      );
    } finally {
      setProcessing(false);
      setProgress(0);
    }
  };

  const handleQuickRotate = async () => {
    if (!hasUploadedImage || processing) return;
    setProcessing(true);
    setProgress(20);
    setErrorMsg('');
    try {
      let srcBlob = null;
      if (isIndexedDbImageId(imageValue)) {
        const res = await getImage(imageValue);
        srcBlob = res.blob;
      }
      const source = srcBlob || imageValue;
      const rotated = await compressAndTransformImage(source, {
        maxWidth: 1280,
        quality: 0.8,
        rotation: 90,
        aspectRatio,
        onProgress: (p) => setProgress(p),
      });
      const savedId = await saveImage(rotated.blob);
      if (typeof onImageChange === 'function') {
        onImageChange(savedId);
      }
    } catch (err) {
      setErrorMsg((err && err.message) || 'Gagal memutar gambar.');
    } finally {
      setProcessing(false);
      setProgress(0);
    }
  };

  const handleOpenCropper = async () => {
    if (!hasUploadedImage) return;
    if (isIndexedDbImageId(imageValue)) {
      const { blob } = await getImage(imageValue);
      if (blob) {
        setCropSource(blob);
        return;
      }
    }
    setCropSource(imageValue);
  };

  const handleConfirmCrop = async (croppedBlob) => {
    try {
      const savedId = await saveImage(croppedBlob);
      if (typeof onImageChange === 'function') {
        onImageChange(savedId);
      }
      setCropSource(null);
    } catch (err) {
      setErrorMsg((err && err.message) || 'Gagal menyimpan hasil potongan gambar.');
    }
  };

  const handleRemoveImage = () => {
    setErrorMsg('');
    setCropSource(null);
    if (typeof onImageChange === 'function') {
      onImageChange('');
    }
  };

  return (
    <div className="bg-[#005E5C]/90 border-2 border-[#1FAFAA]/50 rounded-[26px] p-4 sm:p-5">
      <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
        <span className="sub-form-label text-[#FFE9B0]">
          {label}
        </span>
        <span className="sub-help text-white/85 bg-white/10 px-3 py-1 rounded-full">
          JPG, PNG, WebP • Maks 10MB
        </span>
      </div>

      {/* Pengingat wajib ramah guru & orang tua */}
      <div className="mb-4 rounded-2xl bg-[#062D2C]/90 border border-[#FFE9B0]/40 p-3 flex items-start gap-2.5">
        <ShieldCheck className="w-5 h-5 text-[#FFE9B0] shrink-0 mt-0.5" />
        <p className="sub-help text-white/95">
          Gunakan gambar buatan sendiri atau yang berlisensi bebas. Jangan unggah foto wajah anak tanpa izin orang tua.
        </p>
      </div>

      {/* Area Pratinjau Gambar / Placeholder Ilustrasi */}
      <div className="grid grid-cols-1 sm:grid-cols-12 gap-4 items-center">
        <div className="sm:col-span-5">
          <div
            className="w-full max-w-[240px] mx-auto rounded-[22px] overflow-hidden border-4 border-[#1FAFAA]/60 shadow-lg bg-[#007A78] relative"
            style={{ aspectRatio: aspectRatio === 1 ? '1 / 1' : '4 / 3.6' }}
          >
            <StoryIllustration
              variant={imageValue || 'cat-magic-forest'}
              title={storyTitle}
              alt={altValue || storyTitle || 'Ilustrasi cerita'}
              pageIndex={pageIndex}
              showCoverTitle={aspectRatio === 1 && Boolean(storyTitle)}
              className="w-full h-full"
            />
            {!hasUploadedImage && (
              <div className="absolute bottom-2 left-2 right-2 px-2.5 py-1 rounded-xl bg-black/45 text-center pointer-events-none">
                <span className="sub-help text-[#FFE9B0]">
                  Ilustrasi Bawaan (Bisa Diunggah Sendiri)
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Tombol Aksi Unggah, Kamera, Putar, Crop, Hapus */}
        <div className="sm:col-span-7 flex flex-col gap-3">
          {/* Input file tersembunyi untuk Galeri & Kamera */}
          <input
            ref={fileInputRef}
            id={`${idPrefix}-file`}
            name={`${idPrefix}-file`}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            onChange={handleFileSelected}
            className="hidden"
          />
          <input
            ref={cameraInputRef}
            id={`${idPrefix}-camera`}
            name={`${idPrefix}-camera`}
            type="file"
            accept="image/*"
            capture="environment"
            onChange={handleFileSelected}
            className="hidden"
          />

          <div className="flex flex-wrap gap-2.5">
            <button
              type="button"
              onClick={() => fileInputRef.current && fileInputRef.current.click()}
              disabled={processing}
              className="min-h-[46px] px-4 py-2.5 rounded-full bg-[#E07030] hover:bg-[#C95B1E] text-white font-heading font-extrabold text-xs sm:text-sm inline-flex items-center gap-2 shadow-md transition-all cursor-pointer"
            >
              <Upload className="w-4 h-4" />
              <span>{hasUploadedImage ? 'Ganti Gambar' : 'Pilih Gambar / Galeri'}</span>
            </button>

            <button
              type="button"
              onClick={() => cameraInputRef.current && cameraInputRef.current.click()}
              disabled={processing}
              className="min-h-[46px] px-4 py-2.5 rounded-full bg-[#1FAFAA] hover:bg-[#159A95] text-[#052625] font-heading font-extrabold text-xs sm:text-sm inline-flex items-center gap-2 shadow-md transition-all cursor-pointer"
            >
              <Camera className="w-4 h-4" />
              <span>Kamera HP</span>
            </button>
          </div>

          {/* Jika sudah ada gambar unggahan: tampilkan tombol Putar, Crop, dan Hapus Gambar */}
          {hasUploadedImage && (
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={handleQuickRotate}
                disabled={processing}
                className="min-h-[40px] px-3.5 py-1.5 rounded-full bg-white/15 hover:bg-white/25 text-white font-bold text-xs inline-flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <RotateCw className="w-3.5 h-3.5" />
                <span>Putar</span>
              </button>

              <button
                type="button"
                onClick={handleOpenCropper}
                disabled={processing}
                className="min-h-[40px] px-3.5 py-1.5 rounded-full bg-white/15 hover:bg-white/25 text-white font-bold text-xs inline-flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <Crop className="w-3.5 h-3.5" />
                <span>Sesuaikan Crop</span>
              </button>

              <button
                type="button"
                onClick={handleRemoveImage}
                disabled={processing}
                className="min-h-[40px] px-3.5 py-1.5 rounded-full bg-red-500/20 hover:bg-red-500/35 text-red-300 border border-red-300/40 font-bold text-xs inline-flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Hapus Gambar</span>
              </button>
            </div>
          )}

          {/* Pilihan ilustrasi bawaan jika belum mengunggah gambar sendiri */}
          {showPresetThemes && !hasUploadedImage && (
            <div>
              <p className="sub-help text-[#FFE9B0] mb-1.5 flex items-center gap-1">
                <Sparkles className="w-3.5 h-3.5" />
                <span>Atau pilih ilustrasi sampul bawaan:</span>
              </p>
              <div className="flex flex-wrap gap-1.5">
                {PRESET_THEMES.map((theme) => {
                  const active = (imageValue || 'cat-magic-forest') === theme.id;
                  return (
                    <button
                      key={theme.id}
                      type="button"
                      onClick={() => onImageChange && onImageChange(theme.id)}
                      className={`sub-chip min-h-[36px] px-3 py-1 rounded-full transition-colors cursor-pointer ${
                        active
                          ? 'bg-[#FFE9B0] text-[#052625] shadow-sm'
                          : 'bg-white/10 text-white hover:bg-white/20'
                      }`}
                    >
                      {theme.label}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Indikator Progress saat Memproses Gambar */}
          {processing && (
            <div className="bg-[#062D2C] rounded-2xl p-3 border border-[#1FAFAA]/50">
              <div className="flex items-center justify-between text-xs font-bold text-[#FFE9B0] mb-1">
                <span>Memproses &amp; mengompres gambar otomatis...</span>
                <span>{progress}%</span>
              </div>
              <div className="w-full h-2.5 bg-white/15 rounded-full overflow-hidden">
                <div
                  className="h-full bg-[#E07030] rounded-full transition-all"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>
          )}

          {/* Pesan ramah jika gagal validasi / kompresi */}
          {errorMsg && (
            <div
              role="alert"
              className="rounded-2xl bg-red-500/20 border-2 border-red-300 px-3.5 py-2.5 text-xs sm:text-sm font-bold text-white flex items-center gap-2"
            >
              <AlertCircle className="w-4 h-4 text-[#FFE9B0] shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}
        </div>
      </div>

      {/* Panel Crop Interaktif jika dibuka */}
      {cropSource && (
        <ImageCropper
          sourceFileOrUrl={cropSource}
          aspectRatio={aspectRatio}
          aspectLabel={aspectLabel}
          onConfirm={handleConfirmCrop}
          onCancel={() => setCropSource(null)}
        />
      )}

      {/* Kolom Opsional "Deskripsi gambar" (Alt Text) menggunakan komponen TextInput */}
      <div className="mt-4">
        <TextInput
          id={`${idPrefix}-alt`}
          name={`${idPrefix}-alt`}
          label="Deskripsi Gambar (Opsional, membantu aksesibilitas)"
          value={altValue}
          onChange={(e) => onAltChange && onAltChange(e.target.value)}
          placeholder="Contoh: Kucing oranye berjalan di hutan sambil membawa lentera"
        />
      </div>
    </div>
  );
}

