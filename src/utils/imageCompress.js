/**
 * Utilitas Validasi, Crop, Putar, dan Kompresi Gambar Otomatis di Browser (src/utils/imageCompress.js)
 * - Format yang didukung: JPG, PNG, WebP (maksimal 10MB)
 * - Kompresi otomatis via <canvas>: lebar maks 1280px, kualitas ±0.8, WebP/JPEG
 */

const ALLOWED_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024; // 10 MB

export function validateImageFile(file) {
  if (!file) {
    return { valid: false, error: 'Pilih file gambar terlebih dahulu ya.' };
  }

  const fileType = (file.type || '').toLowerCase();
  const fileName = (file.name || '').toLowerCase();
  const hasAllowedExt =
    fileName.endsWith('.jpg') ||
    fileName.endsWith('.jpeg') ||
    fileName.endsWith('.png') ||
    fileName.endsWith('.webp');

  if (!ALLOWED_TYPES.includes(fileType) && !hasAllowedExt) {
    return {
      valid: false,
      error:
        'Format gambar belum didukung. Gunakan gambar berformat JPG, PNG, atau WebP ya!',
    };
  }

  if (file.size > MAX_FILE_SIZE_BYTES) {
    const sizeMb = (file.size / (1024 * 1024)).toFixed(1);
    return {
      valid: false,
      error: `Ukuran gambar terlalu besar (${sizeMb} MB). Maksimal ukuran gambar adalah 10 MB ya!`,
    };
  }

  return { valid: true, error: '' };
}

export function loadImageFromSource(source) {
  return new Promise((resolve, reject) => {
    const img = new window.Image();
    let tempUrl = null;

    img.onload = () => {
      if (tempUrl) {
        try {
          URL.revokeObjectURL(tempUrl);
        } catch {
          // Abaikan
        }
      }
      resolve(img);
    };

    img.onerror = () => {
      if (tempUrl) {
        try {
          URL.revokeObjectURL(tempUrl);
        } catch {
          // Abaikan
        }
      }
      reject(new Error('Gambar tidak dapat dibaca. Coba pilih file gambar lain ya.'));
    };

    if (source instanceof Blob) {
      tempUrl = URL.createObjectURL(source);
      img.src = tempUrl;
    } else if (typeof source === 'string') {
      img.src = source;
    } else {
      reject(new Error('Sumber gambar tidak dikenali.'));
    }
  });
}

function canvasToBlob(canvas, mimeType, quality) {
  return new Promise((resolve) => {
    canvas.toBlob(
      (blob) => {
        resolve(blob);
      },
      mimeType,
      quality
    );
  });
}

/**
 * Memutar, memotong (crop) ke rasio sampul/halaman, dan mengompresi gambar ke Blob WebP/JPEG
 * @param {Blob|File|string} source
 * @param {Object} options
 * @param {number} [options.maxWidth=1280]
 * @param {number} [options.quality=0.8]
 * @param {number} [options.rotation=0] - 0, 90, 180, atau 270 derajat
 * @param {number|null} [options.aspectRatio=null] - Rasio lebar/tinggi (mis. 1 untuk sampul, 1.11 untuk halaman)
 * @param {number} [options.zoom=1] - Faktor zoom (1.0 - 2.5)
 * @param {number} [options.offsetX=0] - Geser horizontal (-0.5 s/d 0.5)
 * @param {number} [options.offsetY=0] - Geser vertikal (-0.5 s/d 0.5)
 * @param {function} [options.onProgress] - Callback progress (0 - 100)
 */
export async function compressAndTransformImage(source, options = {}) {
  const {
    maxWidth = 1280,
    quality = 0.8,
    rotation = 0,
    aspectRatio = null,
    zoom = 1,
    offsetX = 0,
    offsetY = 0,
    onProgress = null,
  } = options;

  if (typeof onProgress === 'function') onProgress(15);

  const img = await loadImageFromSource(source);
  if (typeof onProgress === 'function') onProgress(45);

  const normRot = ((rotation % 360) + 360) % 360;
  const isSideways = normRot === 90 || normRot === 270;

  // Langkah 1: Gambar ke kanvas terotasi penuh terlebih dahulu
  const rotatedW = isSideways ? img.naturalHeight || img.height : img.naturalWidth || img.width;
  const rotatedH = isSideways ? img.naturalWidth || img.width : img.naturalHeight || img.height;

  const rotCanvas = document.createElement('canvas');
  rotCanvas.width = Math.max(1, rotatedW);
  rotCanvas.height = Math.max(1, rotatedH);
  const rotCtx = rotCanvas.getContext('2d');

  rotCtx.save();
  rotCtx.translate(rotCanvas.width / 2, rotCanvas.height / 2);
  rotCtx.rotate((normRot * Math.PI) / 180);
  rotCtx.drawImage(
    img,
    -(img.naturalWidth || img.width) / 2,
    -(img.naturalHeight || img.height) / 2
  );
  rotCtx.restore();

  if (typeof onProgress === 'function') onProgress(65);

  // Langkah 2: Hitung area potong (crop) sesuai rasio dan zoom
  const srcRatio = rotatedW / rotatedH;
  const targetRatio = aspectRatio && aspectRatio > 0 ? aspectRatio : srcRatio;

  let baseCropW = rotatedW;
  let baseCropH = rotatedH;

  if (srcRatio > targetRatio) {
    baseCropW = rotatedH * targetRatio;
    baseCropH = rotatedH;
  } else {
    baseCropW = rotatedW;
    baseCropH = rotatedW / targetRatio;
  }

  const safeZoom = Math.max(1, Math.min(3, Number(zoom) || 1));
  const cropW = baseCropW / safeZoom;
  const cropH = baseCropH / safeZoom;

  const maxShiftX = (rotatedW - cropW) / 2;
  const maxShiftY = (rotatedH - cropH) / 2;

  const centerX = rotatedW / 2 + Math.max(-1, Math.min(1, Number(offsetX) || 0)) * maxShiftX;
  const centerY = rotatedH / 2 + Math.max(-1, Math.min(1, Number(offsetY) || 0)) * maxShiftY;

  const sx = Math.max(0, Math.min(rotatedW - cropW, centerX - cropW / 2));
  const sy = Math.max(0, Math.min(rotatedH - cropH, centerY - cropH / 2));

  // Langkah 3: Skala ke lebar maksimum 1280px
  let outW = Math.round(cropW);
  let outH = Math.round(cropH);
  if (outW > maxWidth) {
    outW = maxWidth;
    outH = Math.round(maxWidth / targetRatio);
  }
  outW = Math.max(1, outW);
  outH = Math.max(1, outH);

  const outCanvas = document.createElement('canvas');
  outCanvas.width = outW;
  outCanvas.height = outH;
  const outCtx = outCanvas.getContext('2d');
  outCtx.imageSmoothingEnabled = true;
  outCtx.imageSmoothingQuality = 'high';
  outCtx.drawImage(rotCanvas, sx, sy, cropW, cropH, 0, 0, outW, outH);

  if (typeof onProgress === 'function') onProgress(85);

  // Utamakan WebP, fallback ke JPEG jika browser tidak mendukung encode WebP
  let blob = await canvasToBlob(outCanvas, 'image/webp', quality);
  if (!blob || blob.type !== 'image/webp') {
    blob = await canvasToBlob(outCanvas, 'image/jpeg', quality);
  }

  if (typeof onProgress === 'function') onProgress(100);

  return {
    blob,
    width: outW,
    height: outH,
  };
}

