import React, { useState, useEffect } from 'react';
import { RotateCw, Check, XCircle, Crop } from 'lucide-react';
import { compressAndTransformImage } from '../../utils/imageCompress';

/**
 * Komponen Crop & Putar Gambar Sederhana (src/components/editor/ImageCropper.jsx)
 * Memudahkan guru/orang tua memutar gambar (90°) dan menyesuaikan pemotongan ke rasio sampul/halaman
 */
export default function ImageCropper({
  sourceFileOrUrl,
  aspectRatio = 1,
  aspectLabel = 'Rasio Sampul (1:1)',
  onConfirm,
  onCancel,
}) {
  const [previewUrl, setPreviewUrl] = useState('');
  const [rotation, setRotation] = useState(0);
  const [zoom, setZoom] = useState(1);
  const [offsetY, setOffsetY] = useState(0);
  const [processing, setProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    if (!sourceFileOrUrl) return undefined;
    if (sourceFileOrUrl instanceof Blob) {
      const url = URL.createObjectURL(sourceFileOrUrl);
      setPreviewUrl(url);
      return () => {
        try {
          URL.revokeObjectURL(url);
        } catch {
          // Abaikan
        }
      };
    }
    if (typeof sourceFileOrUrl === 'string') {
      setPreviewUrl(sourceFileOrUrl);
    }
    return undefined;
  }, [sourceFileOrUrl]);

  const handleRotate = () => {
    setRotation((prev) => (prev + 90) % 360);
  };

  const handleApply = async () => {
    if (!sourceFileOrUrl || processing) return;
    setProcessing(true);
    setProgress(10);
    setErrorMsg('');

    try {
      const result = await compressAndTransformImage(sourceFileOrUrl, {
        maxWidth: 1280,
        quality: 0.8,
        rotation,
        aspectRatio,
        zoom: Number(zoom) || 1,
        offsetX: 0,
        offsetY: Number(offsetY) || 0,
        onProgress: (val) => setProgress(val),
      });
      if (typeof onConfirm === 'function') {
        await onConfirm(result.blob);
      }
    } catch (err) {
      setErrorMsg(
        (err && err.message) || 'Gagal memproses gambar. Coba gambar lain ya.'
      );
      setProcessing(false);
    }
  };

  return (
    <div className="bg-[#062D2C] border-2 border-[#FFE9B0]/60 rounded-[26px] p-4 sm:p-5 shadow-2xl mt-3">
      <div className="flex items-center justify-between gap-2 mb-3">
        <div className="flex items-center gap-2">
          <Crop className="w-5 h-5 text-[#FFE9B0]" />
          <h4 className="font-heading font-extrabold text-base sm:text-lg text-[#FFE9B0]">
            Sesuaikan &amp; Potong Gambar
          </h4>
        </div>
        <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-[#007A78] text-white">
          {aspectLabel}
        </span>
      </div>

      {/* Kotak Pratinjau Crop */}
      <div
        className="w-full max-w-[320px] mx-auto rounded-2xl overflow-hidden bg-black/45 border-2 border-[#1FAFAA] relative flex items-center justify-center"
        style={{ aspectRatio: aspectRatio === 1 ? '1 / 1' : '4 / 3.6' }}
      >
        {previewUrl && (
          <img
            src={previewUrl}
            alt="Pratinjau pemotongan gambar"
            className="w-full h-full object-cover transition-transform"
            style={{
              transform: `rotate(${rotation}deg) scale(${zoom}) translateY(${offsetY * -25}%)`,
            }}
          />
        )}
      </div>

      {/* Kontrol Putar & Perbesar */}
      <div className="mt-4 flex flex-col gap-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <button
            type="button"
            onClick={handleRotate}
            disabled={processing}
            className="min-h-[44px] px-4 py-2 rounded-full bg-[#007A78] hover:bg-[#1FAFAA] text-white hover:text-[#052625] font-bold text-xs sm:text-sm inline-flex items-center gap-2 transition-colors cursor-pointer"
          >
            <RotateCw className="w-4 h-4" />
            <span>Putar 90° ({rotation}°)</span>
          </button>

          <div className="flex items-center gap-2 flex-1 min-w-[160px] bg-white/10 px-3 py-2 rounded-full">
            <label
              htmlFor="crop-zoom-range"
              className="text-xs font-bold text-[#FFE9B0] shrink-0"
            >
              Perbesar:
            </label>
            <input
              id="crop-zoom-range"
              name="cropZoom"
              type="range"
              min="1"
              max="2.2"
              step="0.1"
              value={zoom}
              onChange={(e) => setZoom(parseFloat(e.target.value) || 1)}
              className="w-full cursor-pointer"
            />
          </div>
        </div>

        <div className="flex items-center gap-2 bg-white/10 px-3 py-2 rounded-full">
          <label
            htmlFor="crop-offset-y"
            className="text-xs font-bold text-[#FFE9B0] shrink-0"
          >
            Geser Atas/Bawah:
          </label>
          <input
            id="crop-offset-y"
            name="cropOffsetY"
            type="range"
            min="-0.8"
            max="0.8"
            step="0.1"
            value={offsetY}
            onChange={(e) => setOffsetY(parseFloat(e.target.value) || 0)}
            className="w-full cursor-pointer"
          />
        </div>
      </div>

      {/* Bar Progress saat Memproses */}
      {processing && (
        <div className="mt-3 bg-white/10 rounded-xl p-3">
          <div className="flex items-center justify-between text-xs font-bold text-[#FFE9B0] mb-1">
            <span>Mengompres &amp; menyimpan gambar...</span>
            <span>{progress}%</span>
          </div>
          <div className="w-full h-2.5 bg-black/35 rounded-full overflow-hidden">
            <div
              className="h-full bg-[#E07030] rounded-full transition-all"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      )}

      {errorMsg && (
        <p className="mt-2 text-xs font-bold text-red-300 bg-red-500/20 px-3 py-2 rounded-xl">
          {errorMsg}
        </p>
      )}

      {/* Tombol Terapkan & Batal */}
      <div className="mt-4 flex flex-wrap items-center justify-end gap-2.5">
        <button
          type="button"
          onClick={onCancel}
          disabled={processing}
          className="min-h-[44px] px-4 py-2 rounded-full bg-white/15 hover:bg-white/25 text-white font-bold text-xs sm:text-sm inline-flex items-center gap-1.5 cursor-pointer"
        >
          <XCircle className="w-4 h-4" />
          <span>Batal</span>
        </button>

        <button
          type="button"
          onClick={handleApply}
          disabled={processing}
          className="min-h-[44px] px-5 py-2 rounded-full bg-[#E07030] hover:bg-[#C95B1E] text-white font-heading font-extrabold text-xs sm:text-sm inline-flex items-center gap-1.5 shadow-md cursor-pointer"
        >
          <Check className="w-4 h-4" />
          <span>{processing ? 'Memproses...' : 'Gunakan Gambar Ini'}</span>
        </button>
      </div>
    </div>
  );
}

