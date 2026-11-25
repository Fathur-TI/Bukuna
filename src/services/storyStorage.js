import { supabase, isSupabaseConfigured } from '../lib/supabaseClient';
import { isAuthInDemoMode } from './authService';

/**
 * Modul Penyimpanan Cerita & Gambar Terintegrasi Supabase (src/services/storyStorage.js)
 * - Mengunggah file gambar sampul (cover) dan gambar tiap halaman ke bucket Supabase Storage `story-images`
 *   dan mengembalikan URL publik (`getPublicUrl`).
 * - Menyimpan, membaca, memperbarui, dan menghapus data cerita langsung pada tabel `public.stories` Supabase
 *   dengan kolom: `user_id`, `author_name`, `title`, `synopsis`, `category`, `age_group`, `cover_url`, dan `pages` (jsonb).
 * - Tetap mendukung fallback IndexedDB / localStorage ketika berjalan di Mode Demo atau `preview.html` (offline).
 */

const STORAGE_BUCKET = 'story-images';
const DB_NAME = 'bukuna_stories_db_v1';
const DB_VERSION = 1;
const STORE_IMAGES = 'story_images';
const LS_MY_STORIES_KEY = 'bukuna_my_stories_v1';

// Cache cerita di memori yang disinkronkan dari tabel `public.stories` Supabase
let cachedStoriesList = [];
const objectUrlCache = new Map();
const imageListeners = new Map();
const changeListeners = new Set();

function notifyStoryStorageChanged() {
  changeListeners.forEach((listener) => {
    try {
      listener();
    } catch {
      // Abaikan error listener
    }
  });
}

export function subscribeStoryStorage(listener) {
  changeListeners.add(listener);
  return () => changeListeners.delete(listener);
}

function openDatabase() {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') {
      reject(new Error('IndexedDB tidak tersedia di peramban ini.'));
      return;
    }
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      if (!db.objectStoreNames.contains(STORE_IMAGES)) {
        db.createObjectStore(STORE_IMAGES);
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error || new Error('Gagal membuka IndexedDB.'));
  });
}

function sanitizeText(str, maxLen = 5000) {
  if (typeof str !== 'string') return '';
  return str.slice(0, maxLen);
}

export function migrateAgeLabel(rawUsia) {
  const str = typeof rawUsia === 'string' ? rawUsia.trim() : '';
  const match = str.match(/(\d+)\s*-\s*(\d+)/);
  if (match) {
    const minAge = Number(match[1]);
    if (minAge >= 5) {
      return '5-6 Tahun';
    }
    return '4-5 Tahun';
  }
  return '4-5 Tahun';
}

export function extractAgeGroup(usiaStr) {
  const migrated = migrateAgeLabel(usiaStr);
  return migrated.startsWith('5-6') ? '5-6' : '4-5';
}

export function isValidUuid(val) {
  if (!val || typeof val !== 'string') return false;
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    val.trim()
  );
}

export function generateUuid() {
  if (
    typeof crypto !== 'undefined' &&
    typeof crypto.randomUUID === 'function'
  ) {
    return crypto.randomUUID();
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

/**
 * Menghasilkan slug URL unik dari judul cerita ditambah akhiran acak singkat
 * Contoh: "Lentera Kecil di Kebun Bima" -> "lentera-kecil-di-kebun-bima-x7k9m"
 */
export function generateStorySlug(title, existingSlug = '') {
  const base = String(title || 'cerita-bukuna')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');

  const safeBase = base || 'cerita-bukuna';
  const trimmedExisting = typeof existingSlug === 'string' ? existingSlug.trim() : '';

  if (
    trimmedExisting &&
    !isValidUuid(trimmedExisting) &&
    !trimmedExisting.startsWith('draf-cerita-baru') &&
    (trimmedExisting === safeBase || trimmedExisting.startsWith(`${safeBase}-`))
  ) {
    return trimmedExisting;
  }

  const shortSuffix = Math.random().toString(36).slice(2, 7);
  return `${safeBase}-${shortSuffix}`;
}

export function isIndexedDbImageId(val) {
  return typeof val === 'string' && val.startsWith('idb:');
}

export function isPublicHttpUrl(val) {
  return (
    typeof val === 'string' &&
    (val.startsWith('https://') || val.startsWith('http://'))
  );
}

/**
 * Mengunggah Blob/File gambar ke Supabase Storage bucket `story-images`
 * dan mengembalikan URL publiknya (`https://.../storage/v1/object/public/story-images/...`).
 */
export async function uploadImageToSupabaseStorage(blobOrFile, folder = 'uploads') {
  if (!blobOrFile || isAuthInDemoMode() || !isSupabaseConfigured || !supabase) {
    return null;
  }

  try {
    const mimeType = blobOrFile.type || 'image/webp';
    const ext = mimeType.includes('png')
      ? 'png'
      : mimeType.includes('jpeg') || mimeType.includes('jpg')
      ? 'jpg'
      : 'webp';

    const randomPart = Math.random().toString(36).slice(2, 9);
    const filePath = `${folder}/${Date.now()}-${randomPart}.${ext}`;

    const { error: uploadError } = await supabase.storage
      .from(STORAGE_BUCKET)
      .upload(filePath, blobOrFile, {
        contentType: mimeType,
        cacheControl: '3600',
        upsert: true,
      });

    if (uploadError) {
      throw uploadError;
    }

    const { data } = supabase.storage.from(STORAGE_BUCKET).getPublicUrl(filePath);
    if (data && data.publicUrl) {
      return data.publicUrl;
    }
    return null;
  } catch (err) {
    console.warn('Gagal mengunggah ke bucket story-images, menggunakan fallback lokal:', err);
    return null;
  }
}

/**
 * Menyimpan gambar:
 * 1) Saat Supabase aktif: langsung unggah ke bucket `story-images` dan kembalikan URL publik (`https://...`).
 * 2) Saat Mode Demo / Offline (atau jika bucket belum dibuat): simpan ke IndexedDB sebagai fallback.
 */
export async function saveImage(blob, customId = null) {
  if (!blob) return '';

  // Utamakan unggah ke Supabase Storage bucket `story-images`
  if (!isAuthInDemoMode() && isSupabaseConfigured && supabase) {
    const publicUrl = await uploadImageToSupabaseStorage(blob, 'stories');
    if (publicUrl) {
      return publicUrl;
    }
  }

  // Fallback IndexedDB untuk Mode Demo / preview.html
  const imageId =
    customId && isIndexedDbImageId(customId)
      ? customId
      : `idb:img_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;

  try {
    const db = await openDatabase();
    await new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_IMAGES, 'readwrite');
      const store = tx.objectStore(STORE_IMAGES);
      store.put(blob, imageId);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });

    if (objectUrlCache.has(imageId)) {
      try {
        URL.revokeObjectURL(objectUrlCache.get(imageId));
      } catch {
        // Abaikan
      }
    }

    const objUrl = URL.createObjectURL(blob);
    objectUrlCache.set(imageId, objUrl);

    if (imageListeners.has(imageId)) {
      imageListeners.get(imageId).forEach((cb) => cb(objUrl));
    }

    return imageId;
  } catch (err) {
    if (err && (err.name === 'QuotaExceededError' || err.code === 22)) {
      const quotaErr = new Error(
        'Penyimpanan peramban sudah penuh. Hapus beberapa cerita atau gambar lama untuk melanjutkan.'
      );
      quotaErr.isQuotaError = true;
      throw quotaErr;
    }
    throw err;
  }
}

/**
 * Mengambil Blob dan URL dari URL publik Supabase atau dari IndexedDB berdasarkan imageId
 */
export async function getImage(imageId) {
  if (!imageId) return { blob: null, url: '' };

  if (isPublicHttpUrl(imageId)) {
    try {
      const res = await fetch(imageId);
      const blob = await res.blob();
      return { blob, url: imageId };
    } catch {
      return { blob: null, url: imageId };
    }
  }

  if (!isIndexedDbImageId(imageId)) {
    return { blob: null, url: imageId };
  }

  try {
    const db = await openDatabase();
    const blob = await new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_IMAGES, 'readonly');
      const store = tx.objectStore(STORE_IMAGES);
      const req = store.get(imageId);
      req.onsuccess = () => resolve(req.result || null);
      req.onerror = () => reject(req.error);
    });

    if (!blob) {
      return { blob: null, url: '' };
    }

    let url = objectUrlCache.get(imageId);
    if (!url) {
      url = URL.createObjectURL(blob);
      objectUrlCache.set(imageId, url);
      if (imageListeners.has(imageId)) {
        imageListeners.get(imageId).forEach((cb) => cb(url));
      }
    }
    return { blob, url };
  } catch {
    return { blob: null, url: '' };
  }
}

export function getCachedImageUrl(imageId) {
  if (!imageId) return '';
  if (!isIndexedDbImageId(imageId)) return imageId;
  return objectUrlCache.get(imageId) || '';
}

export function subscribeImageUrl(imageId, callback) {
  if (!isIndexedDbImageId(imageId)) return () => {};
  if (!imageListeners.has(imageId)) {
    imageListeners.set(imageId, new Set());
  }
  const set = imageListeners.get(imageId);
  set.add(callback);

  if (!objectUrlCache.has(imageId)) {
    getImage(imageId).then(({ url }) => {
      if (url && set.has(callback)) {
        callback(url);
      }
    });
  }

  return () => {
    set.delete(callback);
  };
}

export async function deleteImage(imageId) {
  if (!imageId) return;

  // Jika merupakan URL dari bucket Supabase Storage `story-images`, hapus objeknya dari bucket
  if (
    isPublicHttpUrl(imageId) &&
    imageId.includes(`/storage/v1/object/public/${STORAGE_BUCKET}/`) &&
    !isAuthInDemoMode() &&
    isSupabaseConfigured &&
    supabase
  ) {
    try {
      const marker = `/storage/v1/object/public/${STORAGE_BUCKET}/`;
      const idx = imageId.indexOf(marker);
      if (idx !== -1) {
        const storagePath = decodeURIComponent(
          imageId.slice(idx + marker.length).split('?')[0]
        );
        if (storagePath) {
          await supabase.storage.from(STORAGE_BUCKET).remove([storagePath]);
        }
      }
    } catch {
      // Abaikan jika gagal hapus dari bucket
    }
    return;
  }

  if (!isIndexedDbImageId(imageId)) return;
  if (objectUrlCache.has(imageId)) {
    try {
      URL.revokeObjectURL(objectUrlCache.get(imageId));
    } catch {
      // Abaikan
    }
    objectUrlCache.delete(imageId);
  }
  try {
    const db = await openDatabase();
    await new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_IMAGES, 'readwrite');
      const store = tx.objectStore(STORE_IMAGES);
      store.delete(imageId);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch {
    // Abaikan
  }
}

export async function getAllIndexedDbImageKeys() {
  try {
    const db = await openDatabase();
    return await new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_IMAGES, 'readonly');
      const store = tx.objectStore(STORE_IMAGES);
      const req = store.getAllKeys();
      req.onsuccess = () => resolve(req.result || []);
      req.onerror = () => reject(req.error);
    });
  } catch {
    return [];
  }
}

function stripBase64FromStory(story) {
  if (!story || typeof story !== 'object') return story;
  const cleanCover =
    typeof story.cover === 'string' && story.cover.startsWith('data:image/')
      ? 'cat-magic-forest'
      : story.cover;
  const cleanCoverUrl =
    typeof story.cover_url === 'string' && story.cover_url.startsWith('data:image/')
      ? 'cat-magic-forest'
      : story.cover_url;
  const cleanPages = Array.isArray(story.pages)
    ? story.pages.map((p) => {
        if (!p || typeof p !== 'object') return p;
        const g =
          typeof p.gambar === 'string' && p.gambar.startsWith('data:image/')
            ? ''
            : p.gambar;
        const imgUrl =
          typeof p.image_url === 'string' && p.image_url.startsWith('data:image/')
            ? ''
            : p.image_url;
        const { gambarDataUrl: _a, ...restPage } = p;
        return { ...restPage, gambar: g, image_url: imgUrl };
      })
    : [];
  const { coverDataUrl: _c, imagesDataUrlMap: _m, ...restStory } = story;
  return {
    ...restStory,
    cover: cleanCover,
    cover_url: cleanCoverUrl,
    pages: cleanPages,
  };
}

function readDemoLocalStories() {
  try {
    const raw = localStorage.getItem(LS_MY_STORIES_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed)
      ? parsed.map((s) => stripBase64FromStory(s))
      : [];
  } catch {
    return [];
  }
}

function writeDemoLocalStories(list) {
  // Jangan pernah menyimpan ke localStorage jika Supabase aktif,
  // dan selalu bersihkan data Base64 agar tidak pernah memicu QuotaExceededError
  if (!isAuthInDemoMode() && isSupabaseConfigured && supabase) {
    try {
      localStorage.removeItem(LS_MY_STORIES_KEY);
    } catch {
      // Abaikan
    }
    return;
  }
  try {
    const stripped = Array.isArray(list)
      ? list.map((s) => stripBase64FromStory(s))
      : [];
    localStorage.setItem(LS_MY_STORIES_KEY, JSON.stringify(stripped));
  } catch {
    // Abaikan
  }
}

function normalizeQuizObject(rawQuiz, storyTitle) {
  if (!rawQuiz || typeof rawQuiz !== 'object') return null;
  if (!Array.isArray(rawQuiz.questions) || rawQuiz.questions.length === 0) return null;

  const judul = sanitizeText(rawQuiz.judul || `Kuis ${storyTitle}`, 80);
  const questions = rawQuiz.questions
    .slice(0, 10)
    .map((q, qIdx) => {
      if (!q || typeof q !== 'object') return null;
      const qType = q.type === 'order-story' ? 'order-story' : 'pick-image';
      const prompt = sanitizeText(
        q.prompt || `Pertanyaan ${qIdx + 1} tentang ${storyTitle}`,
        240
      );
      const voiceText = sanitizeText(q.voiceText || prompt, 300);
      const hint = sanitizeText(
        q.hint || 'Perhatikan baik-baik gambar pada halaman cerita tadi ya!',
        240
      );

      const baseQuestion = {
        id: q.id || `q-usr-${qIdx + 1}-${Date.now()}`,
        type: qType,
        prompt,
        voiceText,
        hint,
      };

      if (q.media && typeof q.media === 'object') {
        baseQuestion.media = {
          emoji: sanitizeText(q.media.emoji || '📖', 16),
          gambar: q.media.gambar || '',
          label: sanitizeText(q.media.label || '', 120),
        };
      }

      if (qType === 'order-story') {
        const rawSeq = Array.isArray(q.sequence) ? q.sequence : [];
        const sequence = rawSeq.slice(0, 3).map((seq, sIdx) => ({
          id: (seq && seq.id) || `seq-${qIdx + 1}-${sIdx + 1}`,
          label: sanitizeText((seq && seq.label) || `Kejadian ${sIdx + 1}`, 100),
          gambar: (seq && seq.gambar) || '',
          emoji: sanitizeText((seq && seq.emoji) || '📖', 16),
          correctOrder: Number(seq && seq.correctOrder) || sIdx + 1,
        }));
        baseQuestion.sequence = sequence;
      } else {
        const rawOpts = Array.isArray(q.options) ? q.options : [];
        const options = rawOpts.slice(0, 4).map((opt, oIdx) => ({
          id: (opt && opt.id) || `opt-${qIdx + 1}-${oIdx + 1}`,
          label: sanitizeText((opt && opt.label) || `Pilihan ${oIdx + 1}`, 100),
          gambar: (opt && opt.gambar) || '',
          emoji: sanitizeText((opt && opt.emoji) || '🌟', 16),
          isCorrect: Boolean(opt && opt.isCorrect),
        }));
        if (options.length > 0 && !options.some((o) => o.isCorrect)) {
          options[0].isCorrect = true;
        }
        baseQuestion.options = options;
      }

      return baseQuestion;
    })
    .filter(Boolean);

  if (questions.length === 0) return null;
  return { judul, questions };
}

/**
 * Mengonversi objek cerita (dari input form maupun dari baris tabel `public.stories` Supabase)
 * ke struktur standar aplikasi BUKUNA.
 */
export function normalizeStoryObject(input, existing = null) {
  const now = new Date().toISOString();
  const candidateId =
    (existing && existing.id) ||
    (input && input.id ? String(input.id).trim() : '');
  const id = isValidUuid(candidateId)
    ? candidateId
    : candidateId && !candidateId.startsWith('cerita-ku-')
    ? candidateId
    : generateUuid();

  const judul = sanitizeText(
    input.title || input.judul || (existing && (existing.judul || existing.title)) || 'Cerita Tanpa Judul',
    60
  );
  const kategori = sanitizeText(
    input.category || input.kategori || (existing && (existing.kategori || existing.category)) || 'Petualangan',
    40
  );
  const rawUsia =
    input.age_group ||
    input.age_category ||
    input.usia ||
    (existing && (existing.usia || existing.age_group || existing.age_category)) ||
    '4-5 Tahun';
  const usia = migrateAgeLabel(sanitizeText(rawUsia, 30));
  const kelompokUsia = extractAgeGroup(usia);

  const sinopsis = sanitizeText(
    input.synopsis !== undefined
      ? input.synopsis
      : input.sinopsis !== undefined
      ? input.sinopsis
      : (existing && (existing.sinopsis || existing.synopsis)) || '',
    1000
  );

  const cover =
    input.cover_url !== undefined && input.cover_url !== ''
      ? input.cover_url
      : input.cover !== undefined && input.cover !== ''
      ? input.cover
      : (existing && (existing.cover || existing.cover_url)) || 'cat-magic-forest';

  const coverAlt = sanitizeText(
    input.coverAlt !== undefined ? input.coverAlt : (existing && existing.coverAlt) || judul,
    200
  );

  let parsedPagesInput = input.pages;
  if (typeof parsedPagesInput === 'string' && parsedPagesInput.trim().startsWith('[')) {
    try {
      parsedPagesInput = JSON.parse(parsedPagesInput);
    } catch {
      parsedPagesInput = null;
    }
  }

  const rawPages = Array.isArray(parsedPagesInput)
    ? parsedPagesInput
    : existing && Array.isArray(existing.pages)
    ? existing.pages
    : [{ id: 'hal-1', gambar: '', teks: '', alt: '' }];

  const pages = rawPages.slice(0, 30).map((p, idx) => {
    const pageImg =
      (p && (p.gambar || p.image_url || p.image || p.cover_url)) || '';
    const pageText = sanitizeText(
      (p && (p.teks || p.text || p.content)) || '',
      2000
    );
    const pageAlt = sanitizeText((p && p.alt) || '', 200);
    return {
      id: (p && p.id) || `hal-${idx + 1}-${Date.now()}`,
      halaman: idx + 1,
      gambar: pageImg,
      image_url: pageImg,
      teks: pageText,
      text: pageText,
      alt: pageAlt,
    };
  });

  if (pages.length === 0) {
    pages.push({
      id: `hal-1-${Date.now()}`,
      halaman: 1,
      gambar: '',
      image_url: '',
      teks: '',
      text: '',
      alt: '',
    });
  }

  const status =
    input.status === 'draf'
      ? 'draf'
      : input.status === 'terbit'
      ? 'terbit'
      : (existing && existing.status) || 'terbit';

  const penulis = sanitizeText(
    input.author_name ||
      input.penulis ||
      (existing && (existing.penulis || existing.author_name)) ||
      'Guru & Orang Tua Bukuna',
    80
  );

  const userId =
    input.user_id ||
    input.userId ||
    (existing && (existing.user_id || existing.userId)) ||
    null;

  const rawQuizInput =
    input.quiz !== undefined ? input.quiz : existing ? existing.quiz : null;
  const quiz = normalizeQuizObject(rawQuizInput, judul);

  const dibuat =
    input.created_at ||
    input.dibuat ||
    (existing && (existing.dibuat || existing.created_at)) ||
    now;
  const diubah = input.updated_at || now;

  const slug = generateStorySlug(
    judul,
    (input && input.slug) || (existing && existing.slug) || ''
  );

  return {
    id,
    slug,
    user_id: userId,
    author_name: penulis,
    penulis,
    title: judul,
    judul,
    synopsis: sinopsis,
    sinopsis,
    category: kategori,
    kategori,
    age_group: usia,
    age_category: usia,
    usia,
    kelompokUsia,
    cover_url: cover,
    cover,
    coverAlt,
    moral_value: sanitizeText(input.moral_value || input.pesanMoral || '', 500),
    pesanMoral: sanitizeText(input.pesanMoral || input.moral_value || '', 500),
    pages,
    quiz,
    status,
    dibuat,
    created_at: dibuat,
    diubah,
    updated_at: diubah,
    sumber: userId ? 'pengguna' : input.sumber || 'pengguna',
  };
}

/**
 * Mengunggah gambar yang masih berformat IndexedDB (`idb:...`) atau Data URL (`data:image/...`)
 * ke bucket Supabase Storage `story-images` agar berubah menjadi URL publik sebelum disimpan ke `public.stories`.
 */
async function ensurePublicImageUrl(imageVal, folder = 'stories') {
  if (!imageVal || typeof imageVal !== 'string') return '';
  if (isPublicHttpUrl(imageVal) || imageVal.startsWith('/stories/')) {
    return imageVal;
  }

  if (isAuthInDemoMode() || !isSupabaseConfigured || !supabase) {
    return imageVal;
  }

  try {
    if (isIndexedDbImageId(imageVal)) {
      const { blob } = await getImage(imageVal);
      if (blob) {
        const uploadedUrl = await uploadImageToSupabaseStorage(blob, folder);
        if (uploadedUrl) return uploadedUrl;
      }
    } else if (imageVal.startsWith('data:image/')) {
      const res = await fetch(imageVal);
      const blob = await res.blob();
      const uploadedUrl = await uploadImageToSupabaseStorage(blob, folder);
      if (uploadedUrl) return uploadedUrl;
    }
  } catch {
    // Abaikan dan kembalikan nilai semula
  }

  return imageVal;
}

/**
 * Membangun payload baris database untuk tabel `public.stories` Supabase
 * sesuai kolom yang diminta: `user_id`, `author_name`, `title`, `synopsis`,
 * `category`, `age_group`, `cover_url`, dan `pages` (jsonb).
 */
async function buildSupabaseStoryRow(normalizedStory) {
  const coverUrl = await ensurePublicImageUrl(
    normalizedStory.cover_url || normalizedStory.cover,
    'covers'
  );

  const resolvedPages = [];
  for (let i = 0; i < normalizedStory.pages.length; i++) {
    const p = normalizedStory.pages[i];
    const pageImgUrl = await ensurePublicImageUrl(p.gambar || p.image_url, 'pages');
    resolvedPages.push({
      id: p.id || `hal-${i + 1}`,
      halaman: i + 1,
      gambar: pageImgUrl,
      image_url: pageImgUrl,
      teks: p.teks || '',
      text: p.teks || '',
      alt: p.alt || `${normalizedStory.judul} - Halaman ${i + 1}`,
    });
  }

  const validId = isValidUuid(normalizedStory.id)
    ? normalizedStory.id
    : generateUuid();

  const titleVal = normalizedStory.title || normalizedStory.judul || 'Cerita Tanpa Judul';
  const slugVal = generateStorySlug(titleVal, normalizedStory.slug);

  return {
    id: validId,
    slug: slugVal,
    user_id: isValidUuid(normalizedStory.user_id) ? normalizedStory.user_id : null,
    author_name: normalizedStory.author_name || normalizedStory.penulis || 'Guru & Orang Tua Bukuna',
    title: titleVal,
    synopsis: normalizedStory.synopsis || normalizedStory.sinopsis || '',
    category: normalizedStory.category || normalizedStory.kategori || 'Petualangan',
    age_group: normalizedStory.age_group || normalizedStory.usia || '4-5 Tahun',
    cover_url: coverUrl || 'cat-magic-forest',
    pages: resolvedPages,
  };
}

/**
 * Menyinkronkan daftar cerita dari tabel `public.stories` Supabase ke memori lokal
 */
export async function fetchAndSyncStoriesFromSupabase() {
  if (isAuthInDemoMode() || !isSupabaseConfigured || !supabase) {
    const demoList = readDemoLocalStories().map((s) => normalizeStoryObject(s));
    cachedStoriesList = demoList;
    return demoList;
  }

  try {
    const { data, error } = await supabase
      .from('stories')
      .select('*')
      .order('created_at', { ascending: false });

    if (!error && Array.isArray(data)) {
      cachedStoriesList = data.map((row) => normalizeStoryObject(row));
      notifyStoryStorageChanged();
      return cachedStoriesList;
    }
  } catch {
    // Abaikan jika gagal koneksi
  }

  return cachedStoriesList;
}

/**
 * Mengambil seluruh daftar cerita yang telah disinkronkan dari Supabase (atau Mode Demo)
 */
export function getMyStories() {
  if (isAuthInDemoMode() || !isSupabaseConfigured || !supabase) {
    const list = readDemoLocalStories().map((s) => normalizeStoryObject(s));
    return list.sort((a, b) => {
      const tA = new Date(a.diubah || a.dibuat || 0).getTime();
      const tB = new Date(b.diubah || b.dibuat || 0).getTime();
      return tB - tA;
    });
  }

  return [...cachedStoriesList].sort((a, b) => {
    const tA = new Date(a.diubah || a.dibuat || 0).getTime();
    const tB = new Date(b.diubah || b.dibuat || 0).getTime();
    return tB - tA;
  });
}

/**
 * Mengambil satu cerita berdasarkan ID dari memori/Supabase
 */
export function getStoryById(id) {
  if (!id) return null;
  const list = getMyStories();
  return list.find((s) => s.id === id || s.slug === id) || null;
}

/**
 * Membuat atau menyimpan cerita baru ke tabel `public.stories` Supabase
 */
export async function createStory(storyData) {
  const normalized = normalizeStoryObject(storyData || {});

  if (isAuthInDemoMode() || !isSupabaseConfigured || !supabase) {
    const list = readDemoLocalStories();
    const filtered = list.filter((s) => s.id !== normalized.id);
    writeDemoLocalStories([normalized, ...filtered]);
    cachedStoriesList = [normalized, ...filtered];
    notifyStoryStorageChanged();
    return normalized;
  }

  const rowPayload = await buildSupabaseStoryRow(normalized);

  // Perbarui cache di memori secara optimistik terlebih dahulu
  const optimistic = normalizeStoryObject({ ...normalized, ...rowPayload });
  cachedStoriesList = [
    optimistic,
    ...cachedStoriesList.filter((s) => s.id !== optimistic.id),
  ];
  notifyStoryStorageChanged();

  const { data, error } = await supabase
    .from('stories')
    .upsert(rowPayload, { onConflict: 'id' })
    .select('*')
    .maybeSingle();

  if (error) {
    // Jika kolom id di tabel stories Supabase bertipe UUID murni dan menolak string non-UUID,
    // kirim ulang tanpa properti `id` agar Supabase menghasilkan UUID otomatis
    const { id: _ignoredId, ...payloadWithoutId } = rowPayload;
    const { data: retryData, error: retryError } = await supabase
      .from('stories')
      .insert(payloadWithoutId)
      .select('*')
      .maybeSingle();

    if (retryError) {
      throw new Error(
        retryError.message ||
          'Gagal menyimpan cerita ke tabel public.stories Supabase.'
      );
    }

    const savedRetry = normalizeStoryObject({
      ...optimistic,
      ...(retryData || {}),
    });
    cachedStoriesList = [
      savedRetry,
      ...cachedStoriesList.filter(
        (s) => s.id !== optimistic.id && s.id !== savedRetry.id
      ),
    ];
    notifyStoryStorageChanged();
    return savedRetry;
  }

  const saved = normalizeStoryObject({
    ...optimistic,
    ...(data || rowPayload),
  });
  cachedStoriesList = [
    saved,
    ...cachedStoriesList.filter((s) => s.id !== saved.id),
  ];
  notifyStoryStorageChanged();
  return saved;
}

/**
 * Memperbarui cerita berdasarkan ID di tabel `public.stories` Supabase
 */
export async function updateStory(id, storyData) {
  const existing = getStoryById(id);
  const safeId = isValidUuid(id) ? id : (existing && isValidUuid(existing.id) ? existing.id : generateUuid());
  const updated = normalizeStoryObject({ ...storyData, id: safeId }, existing);

  if (isAuthInDemoMode() || !isSupabaseConfigured || !supabase) {
    const list = readDemoLocalStories();
    const idx = list.findIndex((s) => s.id === id || s.id === safeId);
    if (idx !== -1) {
      list[idx] = updated;
    } else {
      list.unshift(updated);
    }
    writeDemoLocalStories(list);
    cachedStoriesList = list;
    notifyStoryStorageChanged();
    return updated;
  }

  const rowPayload = await buildSupabaseStoryRow(updated);
  const optimistic = normalizeStoryObject({ ...updated, ...rowPayload });

  cachedStoriesList = [
    optimistic,
    ...cachedStoriesList.filter((s) => s.id !== id && s.id !== safeId && s.id !== optimistic.id),
  ];
  notifyStoryStorageChanged();

  const { data, error } = await supabase
    .from('stories')
    .upsert(rowPayload, { onConflict: 'id' })
    .select('*')
    .maybeSingle();

  if (error) {
    throw new Error(
      error.message || 'Gagal memperbarui cerita di tabel public.stories Supabase.'
    );
  }

  const saved = normalizeStoryObject({
    ...optimistic,
    ...(data || rowPayload),
  });
  cachedStoriesList = [
    saved,
    ...cachedStoriesList.filter((s) => s.id !== id && s.id !== safeId && s.id !== saved.id),
  ];
  notifyStoryStorageChanged();
  return saved;
}

/**
 * Menghapus cerita dari tabel `public.stories` Supabase beserta gambar di bucket `story-images`
 */
export async function deleteStory(id) {
  const target = getStoryById(id);

  if (isAuthInDemoMode() || !isSupabaseConfigured || !supabase) {
    const list = readDemoLocalStories();
    const remaining = list.filter((s) => s.id !== id);
    writeDemoLocalStories(remaining);
    cachedStoriesList = remaining;
    notifyStoryStorageChanged();
    return true;
  }

  cachedStoriesList = cachedStoriesList.filter((s) => s.id !== id);
  notifyStoryStorageChanged();

  const { error } = await supabase.from('stories').delete().eq('id', id);
  if (error) {
    throw new Error(error.message || 'Gagal menghapus cerita dari Supabase.');
  }

  if (target) {
    if (target.cover) {
      await deleteImage(target.cover);
    }
    if (Array.isArray(target.pages)) {
      for (const p of target.pages) {
        if (p && p.gambar) {
          await deleteImage(p.gambar);
        }
      }
    }
  }

  return true;
}

/**
 * Memuat awal seluruh cerita dari Supabase (dan gambar IndexedDB pada Mode Demo)
 */
export async function preloadAllStoryImages() {
  await fetchAndSyncStoriesFromSupabase();
}

function blobToDataUrl(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result);
    reader.onerror = () => reject(new Error('Gagal membaca Blob gambar.'));
    reader.readAsDataURL(blob);
  });
}

async function dataUrlToBlob(dataUrl) {
  const res = await fetch(dataUrl);
  return await res.blob();
}

/**
 * Mengekspor cerita ke format JSON
 */
export async function exportStoryToJson(id) {
  const story = getStoryById(id);
  if (!story) {
    throw new Error('Cerita tidak ditemukan untuk diekspor.');
  }

  const exportedStory = JSON.parse(JSON.stringify(story));
  const payload = {
    app: 'BUKUNA',
    version: 3,
    exportedAt: new Date().toISOString(),
    story: exportedStory,
  };

  return JSON.stringify(payload, null, 2);
}

/**
 * Mengimpor cerita dari file JSON dan menyimpannya ke tabel `public.stories` Supabase
 * (serta mengunggah gambar Base64 di dalamnya ke bucket `story-images`)
 */
export async function importStoryFromJson(jsonInput, currentUser = null) {
  let parsed = null;
  try {
    parsed = typeof jsonInput === 'string' ? JSON.parse(jsonInput) : jsonInput;
  } catch {
    throw new Error(
      'File JSON tidak valid atau rusak. Pastikan memilih file ekspor cerita BUKUNA (.json).'
    );
  }

  const rawStory = parsed && parsed.story ? parsed.story : parsed;
  if (
    !rawStory ||
    typeof rawStory !== 'object' ||
    !(rawStory.judul || rawStory.title) ||
    !Array.isArray(rawStory.pages)
  ) {
    throw new Error(
      'Struktur file cerita tidak lengkap. Judul dan halaman cerita wajib ada.'
    );
  }

  const resolveImportedImage = async (origVal, inlineDataUrl) => {
    const candidateDataUrl =
      typeof inlineDataUrl === 'string' && inlineDataUrl.startsWith('data:image/')
        ? inlineDataUrl
        : typeof origVal === 'string' && origVal.startsWith('data:image/')
        ? origVal
        : '';

    if (candidateDataUrl) {
      const blob = await dataUrlToBlob(candidateDataUrl);
      return await saveImage(blob);
    }
    return origVal || '';
  };

  const coverValue =
    (await resolveImportedImage(
      rawStory.cover || rawStory.cover_url,
      rawStory.coverDataUrl
    )) || 'cat-magic-forest';

  const importedPages = [];
  for (let i = 0; i < Math.min(rawStory.pages.length, 30); i++) {
    const p = rawStory.pages[i] || {};
    const pageImg = await resolveImportedImage(
      p.gambar || p.image_url || '',
      p.gambarDataUrl
    );
    importedPages.push({
      id: p.id || `hal-${i + 1}-${Date.now()}`,
      halaman: i + 1,
      gambar: pageImg,
      image_url: pageImg,
      teks: sanitizeText(p.teks || p.text || '', 2000),
      alt: sanitizeText(p.alt || '', 200),
    });
  }

  const saved = await createStory({
    user_id: (currentUser && currentUser.id) || rawStory.user_id || null,
    author_name:
      (currentUser && (currentUser.nama_akun || currentUser.nama || currentUser.name)) ||
      rawStory.author_name ||
      rawStory.penulis ||
      'Guru & Orang Tua Bukuna',
    title: sanitizeText(rawStory.title || rawStory.judul, 60),
    judul: sanitizeText(rawStory.judul || rawStory.title, 60),
    category: rawStory.category || rawStory.kategori || 'Petualangan',
    age_group: migrateAgeLabel(
      rawStory.age_group || rawStory.usia || rawStory.kelompokUsia || '4-5 Tahun'
    ),
    synopsis: sanitizeText(rawStory.synopsis || rawStory.sinopsis || '', 1000),
    cover_url: coverValue,
    cover: coverValue,
    coverAlt: sanitizeText(rawStory.coverAlt || '', 200),
    pages: importedPages,
    quiz: rawStory.quiz || null,
    status: 'terbit',
  });

  return saved;
}
