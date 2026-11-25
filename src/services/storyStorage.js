/**
 * Modul Penyimpanan Cerita & Gambar Tanpa Backend (src/services/storyStorage.js)
 * - Metadata & teks cerita disimpan di localStorage (dan disinkronkan ke IndexedDB)
 * - Gambar sampul & halaman disimpan di IndexedDB sebagai Blob asli
 * - Ditampilkan lewat URL.createObjectURL(blob) dan dibebaskan dengan URL.revokeObjectURL(url)
 * - Mendukung Ekspor (.json dengan gambar base64) dan Impor (.json kembali ke IndexedDB Blob)
 */

const DB_NAME = 'bukuna_stories_db_v1';
const DB_VERSION = 1;
const STORE_IMAGES = 'story_images';
const LS_MY_STORIES_KEY = 'bukuna_my_stories_v1';

// Cache URL.createObjectURL di memori agar komponen dapat menampilkan Blob secara instan
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

export function isIndexedDbImageId(val) {
  return typeof val === 'string' && val.startsWith('idb:');
}

/**
 * Menyimpan Blob gambar ke IndexedDB dan mengembalikan ID unik ("idb:img_...")
 */
export async function saveImage(blob, customId = null) {
  if (!blob) return '';
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

    // Jika sebelumnya ada objectURL untuk imageId ini, bebaskan dulu
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
 * Mengambil Blob dan ObjectURL dari IndexedDB berdasarkan imageId
 */
export async function getImage(imageId) {
  if (!imageId) return { blob: null, url: '' };
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

/**
 * Mengambil ObjectURL yang sudah di-cache di memori (sinkron)
 */
export function getCachedImageUrl(imageId) {
  if (!imageId) return '';
  if (!isIndexedDbImageId(imageId)) return imageId;
  return objectUrlCache.get(imageId) || '';
}

/**
 * Berlangganan perubahan ObjectURL untuk imageId tertentu
 */
export function subscribeImageUrl(imageId, callback) {
  if (!isIndexedDbImageId(imageId)) return () => {};
  if (!imageListeners.has(imageId)) {
    imageListeners.set(imageId, new Set());
  }
  const set = imageListeners.get(imageId);
  set.add(callback);

  // Trigger pemuatan asinkron jika belum ada di cache
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

/**
 * Menghapus gambar dari IndexedDB dan membebaskan URL.revokeObjectURL
 */
export async function deleteImage(imageId) {
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
    // Abaikan jika gagal hapus
  }
}

/**
 * Mengambil seluruh kunci gambar di IndexedDB (untuk verifikasi dan pembersihan)
 */
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

function readRawStories() {
  try {
    const raw = localStorage.getItem(LS_MY_STORIES_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    let needsMigration = false;
    const migratedList = parsed
      .filter((s) => s && typeof s === 'object')
      .map((s) => {
        const nextUsia = migrateAgeLabel(s.usia || s.kelompokUsia);
        const nextKelompok = extractAgeGroup(nextUsia);
        if (s.usia !== nextUsia || s.kelompokUsia !== nextKelompok) {
          needsMigration = true;
          return { ...s, usia: nextUsia, kelompokUsia: nextKelompok };
        }
        return s;
      });
    if (needsMigration) {
      try {
        localStorage.setItem(LS_MY_STORIES_KEY, JSON.stringify(migratedList));
      } catch {
        // Abaikan jika penyimpanan penuh
      }
    }
    return migratedList;
  } catch {
    return [];
  }
}

function writeRawStories(storiesList) {
  try {
    localStorage.setItem(LS_MY_STORIES_KEY, JSON.stringify(storiesList));
  } catch (err) {
    if (err && (err.name === 'QuotaExceededError' || err.code === 22)) {
      const quotaErr = new Error(
        'Penyimpanan teks cerita penuh. Hapus cerita lama yang tidak terpakai terlebih dahulu.'
      );
      quotaErr.isQuotaError = true;
      throw quotaErr;
    }
    throw err;
  }
}

function collectStoryImageIds(story) {
  const ids = new Set();
  if (!story) return ids;
  if (isIndexedDbImageId(story.cover)) {
    ids.add(story.cover);
  }
  if (Array.isArray(story.pages)) {
    story.pages.forEach((p) => {
      if (p && isIndexedDbImageId(p.gambar)) {
        ids.add(p.gambar);
      }
    });
  }
  if (story.quiz && Array.isArray(story.quiz.questions)) {
    story.quiz.questions.forEach((q) => {
      if (!q) return;
      if (q.media && isIndexedDbImageId(q.media.gambar)) {
        ids.add(q.media.gambar);
      }
      if (Array.isArray(q.options)) {
        q.options.forEach((opt) => {
          if (opt && isIndexedDbImageId(opt.gambar)) {
            ids.add(opt.gambar);
          }
        });
      }
      if (Array.isArray(q.sequence)) {
        q.sequence.forEach((seq) => {
          if (seq && isIndexedDbImageId(seq.gambar)) {
            ids.add(seq.gambar);
          }
        });
      }
    });
  }
  return ids;
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
          label: sanitizeText(
            (seq && seq.label) || `Kejadian ${sIdx + 1}`,
            100
          ),
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
  return {
    judul,
    questions,
  };
}

function normalizeStoryObject(input, existing = null) {
  const now = new Date().toISOString();
  const id =
    (existing && existing.id) ||
    (typeof input.id === 'string' && input.id.trim()
      ? input.id.trim()
      : `cerita-ku-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`);

  const judul = sanitizeText(input.judul || (existing && existing.judul) || 'Cerita Tanpa Judul', 60);
  const kategori = sanitizeText(input.kategori || (existing && existing.kategori) || 'Petualangan', 40);
  const rawUsia = input.usia || (existing && existing.usia) || '4-5 Tahun';
  const usia = migrateAgeLabel(sanitizeText(rawUsia, 30));
  const kelompokUsia = extractAgeGroup(usia);
  const sinopsis = sanitizeText(
    input.sinopsis !== undefined ? input.sinopsis : (existing && existing.sinopsis) || '',
    1000
  );
  const cover =
    input.cover !== undefined
      ? input.cover
      : (existing && existing.cover) || 'cat-magic-forest';
  const coverAlt = sanitizeText(
    input.coverAlt !== undefined ? input.coverAlt : (existing && existing.coverAlt) || '',
    200
  );

  const rawPages = Array.isArray(input.pages)
    ? input.pages
    : existing && Array.isArray(existing.pages)
    ? existing.pages
    : [{ id: 'hal-1', gambar: '', teks: '', alt: '' }];

  const pages = rawPages.slice(0, 30).map((p, idx) => ({
    id: (p && p.id) || `hal-${idx + 1}-${Date.now()}`,
    halaman: idx + 1,
    gambar: (p && p.gambar) || '',
    teks: sanitizeText((p && p.teks) || '', 2000),
    alt: sanitizeText((p && p.alt) || '', 200),
  }));

  if (pages.length === 0) {
    pages.push({ id: `hal-1-${Date.now()}`, halaman: 1, gambar: '', teks: '', alt: '' });
  }

  const status = input.status === 'terbit' ? 'terbit' : 'draf';
  const penulis = sanitizeText(
    input.penulis || (existing && existing.penulis) || 'Guru & Orang Tua Bukuna',
    80
  );

  const rawQuizInput =
    input.quiz !== undefined ? input.quiz : existing ? existing.quiz : null;
  const quiz = normalizeQuizObject(rawQuizInput, judul);

  return {
    id,
    judul,
    kategori,
    usia,
    kelompokUsia,
    sinopsis,
    cover,
    coverAlt,
    pages,
    quiz,
    status,
    penulis,
    dibuat: (existing && existing.dibuat) || input.dibuat || now,
    diubah: now,
    sumber: 'pengguna',
  };
}

/**
 * Mengambil seluruh daftar cerita buatan pengguna, diurutkan dari yang terbaru diubah
 */
export function getMyStories() {
  const list = readRawStories();
  return list.sort((a, b) => {
    const tA = new Date(a.diubah || a.dibuat || 0).getTime();
    const tB = new Date(b.diubah || b.dibuat || 0).getTime();
    return tB - tA;
  });
}

/**
 * Mengambil satu cerita buatan pengguna berdasarkan ID
 */
export function getStoryById(id) {
  if (!id) return null;
  const list = readRawStories();
  return list.find((s) => s.id === id) || null;
}

/**
 * Membuat cerita baru dan menyimpannya
 */
export function createStory(storyData) {
  const list = readRawStories();
  const normalized = normalizeStoryObject(storyData || {});
  const filtered = list.filter((s) => s.id !== normalized.id);
  writeRawStories([normalized, ...filtered]);
  notifyStoryStorageChanged();
  return normalized;
}

/**
 * Memperbarui cerita berdasarkan ID dan membersihkan Blob gambar lama yang tidak lagi dipakai
 */
export async function updateStory(id, storyData) {
  const list = readRawStories();
  const idx = list.findIndex((s) => s.id === id);
  const existing = idx !== -1 ? list[idx] : null;
  const oldImages = collectStoryImageIds(existing);

  const updated = normalizeStoryObject({ ...storyData, id }, existing);
  const newImages = collectStoryImageIds(updated);

  if (idx !== -1) {
    list[idx] = updated;
  } else {
    list.unshift(updated);
  }
  writeRawStories(list);

  // Hapus gambar lama yang sudah diganti/dihapus jika tidak dipakai cerita lain
  const otherStories = list.filter((s) => s.id !== id);
  const usedElsewhere = new Set();
  otherStories.forEach((s) => {
    collectStoryImageIds(s).forEach((imgId) => usedElsewhere.add(imgId));
  });

  for (const oldImgId of oldImages) {
    if (!newImages.has(oldImgId) && !usedElsewhere.has(oldImgId)) {
      await deleteImage(oldImgId);
    }
  }

  notifyStoryStorageChanged();
  return updated;
}

/**
 * Menghapus cerita beserta seluruh Blob gambarnya di IndexedDB
 */
export async function deleteStory(id) {
  const list = readRawStories();
  const target = list.find((s) => s.id === id);
  const remaining = list.filter((s) => s.id !== id);
  writeRawStories(remaining);

  if (target) {
    const targetImages = collectStoryImageIds(target);
    const usedElsewhere = new Set();
    remaining.forEach((s) => {
      collectStoryImageIds(s).forEach((imgId) => usedElsewhere.add(imgId));
    });

    for (const imgId of targetImages) {
      if (!usedElsewhere.has(imgId)) {
        await deleteImage(imgId);
      }
    }
  }

  notifyStoryStorageChanged();
  return true;
}

/**
 * Memuat awal seluruh gambar cerita pengguna ke cache ObjectURL
 */
export async function preloadAllStoryImages() {
  const list = readRawStories();
  const allIds = new Set();
  list.forEach((s) => {
    collectStoryImageIds(s).forEach((id) => allIds.add(id));
  });
  await Promise.all(Array.from(allIds).map((id) => getImage(id)));
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
 * Mengekspor cerita (termasuk kuis buatan pengguna) ke format JSON lengkap dengan gambar Base64
 */
export async function exportStoryToJson(id) {
  const story = getStoryById(id);
  if (!story) {
    throw new Error('Cerita tidak ditemukan untuk diekspor.');
  }

  const exportedStory = JSON.parse(JSON.stringify(story));
  const imagesDataUrlMap = {};

  const allImgIds = collectStoryImageIds(exportedStory);
  for (const imgId of allImgIds) {
    if (isIndexedDbImageId(imgId)) {
      const { blob } = await getImage(imgId);
      if (blob) {
        imagesDataUrlMap[imgId] = await blobToDataUrl(blob);
      }
    }
  }

  if (isIndexedDbImageId(exportedStory.cover) && imagesDataUrlMap[exportedStory.cover]) {
    exportedStory.coverDataUrl = imagesDataUrlMap[exportedStory.cover];
  }

  if (Array.isArray(exportedStory.pages)) {
    for (let i = 0; i < exportedStory.pages.length; i++) {
      const page = exportedStory.pages[i];
      if (page && isIndexedDbImageId(page.gambar) && imagesDataUrlMap[page.gambar]) {
        page.gambarDataUrl = imagesDataUrlMap[page.gambar];
      }
    }
  }

  if (exportedStory.quiz && Array.isArray(exportedStory.quiz.questions)) {
    exportedStory.quiz.questions.forEach((q) => {
      if (!q) return;
      if (q.media && isIndexedDbImageId(q.media.gambar) && imagesDataUrlMap[q.media.gambar]) {
        q.media.gambarDataUrl = imagesDataUrlMap[q.media.gambar];
      }
      if (Array.isArray(q.options)) {
        q.options.forEach((opt) => {
          if (opt && isIndexedDbImageId(opt.gambar) && imagesDataUrlMap[opt.gambar]) {
            opt.gambarDataUrl = imagesDataUrlMap[opt.gambar];
          }
        });
      }
      if (Array.isArray(q.sequence)) {
        q.sequence.forEach((seq) => {
          if (seq && isIndexedDbImageId(seq.gambar) && imagesDataUrlMap[seq.gambar]) {
            seq.gambarDataUrl = imagesDataUrlMap[seq.gambar];
          }
        });
      }
    });
  }

  exportedStory.imagesDataUrlMap = imagesDataUrlMap;

  const payload = {
    app: 'BUKUNA',
    version: 2,
    exportedAt: new Date().toISOString(),
    story: exportedStory,
  };

  return JSON.stringify(payload, null, 2);
}

/**
 * Mengimpor cerita & kuis dari file/teks JSON (memvalidasi struktur, mengonversi base64 kembali ke Blob di IndexedDB)
 */
export async function importStoryFromJson(jsonInput) {
  let parsed = null;
  try {
    parsed = typeof jsonInput === 'string' ? JSON.parse(jsonInput) : jsonInput;
  } catch {
    throw new Error('File JSON tidak valid atau rusak. Pastikan memilih file ekspor cerita BUKUNA (.json).');
  }

  const rawStory = parsed && parsed.story ? parsed.story : parsed;
  if (!rawStory || typeof rawStory !== 'object' || !rawStory.judul || !Array.isArray(rawStory.pages)) {
    throw new Error('Struktur file cerita tidak lengkap. Judul dan halaman cerita wajib ada.');
  }

  const oldToNewImageIdMap = {};
  const rawMap =
    rawStory.imagesDataUrlMap && typeof rawStory.imagesDataUrlMap === 'object'
      ? rawStory.imagesDataUrlMap
      : {};

  const resolveImportedImage = async (origVal, inlineDataUrl) => {
    if (origVal && oldToNewImageIdMap[origVal]) {
      return oldToNewImageIdMap[origVal];
    }
    const candidateDataUrl =
      typeof inlineDataUrl === 'string' && inlineDataUrl.startsWith('data:image/')
        ? inlineDataUrl
        : origVal && typeof rawMap[origVal] === 'string' && rawMap[origVal].startsWith('data:image/')
        ? rawMap[origVal]
        : typeof origVal === 'string' && origVal.startsWith('data:image/')
        ? origVal
        : '';

    if (candidateDataUrl) {
      const blob = await dataUrlToBlob(candidateDataUrl);
      const newId = await saveImage(blob);
      if (origVal && isIndexedDbImageId(origVal)) {
        oldToNewImageIdMap[origVal] = newId;
      }
      return newId;
    }
    return origVal || '';
  };

  const coverValue =
    (await resolveImportedImage(rawStory.cover, rawStory.coverDataUrl)) ||
    'cat-magic-forest';

  const importedPages = [];
  for (let i = 0; i < Math.min(rawStory.pages.length, 30); i++) {
    const p = rawStory.pages[i] || {};
    const pageImg = await resolveImportedImage(p.gambar || '', p.gambarDataUrl);
    importedPages.push({
      id: p.id || `hal-${i + 1}-${Date.now()}`,
      halaman: i + 1,
      gambar: pageImg,
      teks: sanitizeText(p.teks || '', 2000),
      alt: sanitizeText(p.alt || '', 200),
    });
  }

  let importedQuiz = null;
  if (rawStory.quiz && Array.isArray(rawStory.quiz.questions)) {
    const clonedQuiz = JSON.parse(JSON.stringify(rawStory.quiz));
    for (let qi = 0; qi < clonedQuiz.questions.length; qi++) {
      const q = clonedQuiz.questions[qi];
      if (!q) continue;
      if (q.media && (q.media.gambar || q.media.gambarDataUrl)) {
        q.media.gambar = await resolveImportedImage(
          q.media.gambar,
          q.media.gambarDataUrl
        );
      }
      if (Array.isArray(q.options)) {
        for (let oi = 0; oi < q.options.length; oi++) {
          const opt = q.options[oi];
          if (opt && (opt.gambar || opt.gambarDataUrl)) {
            opt.gambar = await resolveImportedImage(
              opt.gambar,
              opt.gambarDataUrl
            );
          }
        }
      }
      if (Array.isArray(q.sequence)) {
        for (let si = 0; si < q.sequence.length; si++) {
          const seq = q.sequence[si];
          if (seq && (seq.gambar || seq.gambarDataUrl)) {
            seq.gambar = await resolveImportedImage(
              seq.gambar,
              seq.gambarDataUrl
            );
          }
        }
      }
    }
    importedQuiz = normalizeQuizObject(clonedQuiz, rawStory.judul);
  }

  // Jika ID sudah ada, gunakan kembali atau buat salinan
  const existing = getStoryById(rawStory.id);
  const targetId = existing
    ? `cerita-ku-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`
    : rawStory.id || `cerita-ku-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;

  const saved = createStory({
    id: targetId,
    judul: sanitizeText(rawStory.judul, 60),
    kategori: rawStory.kategori || 'Petualangan',
    usia: migrateAgeLabel(rawStory.usia || rawStory.kelompokUsia || '4-5 Tahun'),
    sinopsis: sanitizeText(rawStory.sinopsis || '', 1000),
    cover: coverValue,
    coverAlt: sanitizeText(rawStory.coverAlt || '', 200),
    pages: importedPages,
    quiz: importedQuiz,
    status: rawStory.status === 'terbit' ? 'terbit' : 'draf',
    penulis: sanitizeText(rawStory.penulis || 'Guru & Orang Tua Bukuna', 80),
  });

  return saved;
}

