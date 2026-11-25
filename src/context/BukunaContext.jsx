import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import { initialStories } from '../data/stories';
import { ALL_QUIZZES, STORY_QUIZZES, getQuizByStoryId } from '../data/quizzes';
import {
  getMyStories,
  createStory,
  updateStory,
  deleteStory,
  exportStoryToJson,
  importStoryFromJson,
  preloadAllStoryImages,
  fetchAndSyncStoriesFromSupabase,
  subscribeStoryStorage,
  fetchUserFavoritesFromSupabase,
  addFavoriteToSupabase,
  removeFavoriteFromSupabase,
  fetchUserCollectionsFromSupabase,
  createCollectionInSupabase,
  deleteCollectionFromSupabase,
  addStoryToCollectionInSupabase,
  removeStoryFromCollectionInSupabase,
  generateUuid,
} from '../services/storyStorage';
import {
  isAuthInDemoMode,
  getCurrentSessionUser,
  registerWithEmail,
  loginWithEmail,
  loginAsDemoAccount,
  logoutUser,
  sendPasswordReset,
  updateUserPassword,
  subscribeAuthChanges,
} from '../services/authService';
import {
  fetchCatalogStories,
  isUserAdmin,
} from '../services/adminService';

const BukunaContext = createContext(null);

const STORAGE_KEYS = {
  FAVORITES: 'bukuna_favorites_v1',
  COLLECTIONS: 'bukuna_collections_v1',
  USER_COLLECTIONS_LIST: 'bukuna_user_collections_list_v1',
  HISTORY: 'bukuna_history_v1',
  QUIZ_RESULTS: 'bukuna_quiz_results_v1',
};

function readStorage(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

/**
 * Membangun himpunan ID cerita aktif yang valid (cerita katalog Supabase/bawaan + seluruh cerita buatan pengguna)
 * serta himpunan ID kuis yang valid, lalu membersihkan referensi ke cerita yang sudah dihapus.
 */
function buildValidIdSets(userStories = [], catalogList = initialStories) {
  const validStoryIds = new Set(initialStories.map((s) => s.id));
  (catalogList || []).forEach((s) => {
    if (s && s.id) validStoryIds.add(s.id);
    if (s && s.slug) validStoryIds.add(s.slug);
  });
  (userStories || []).forEach((s) => {
    if (s && s.id) validStoryIds.add(s.id);
    if (s && s.slug) validStoryIds.add(s.slug);
  });

  const validQuizIds = new Set();
  validStoryIds.forEach((id) => {
    validQuizIds.add(id);
    validQuizIds.add(`kuis-${id}`);
  });
  ALL_QUIZZES.forEach((q) => {
    if (q && q.id) validQuizIds.add(q.id);
    if (q && q.storyId) validQuizIds.add(q.storyId);
  });

  return { validStoryIds, validQuizIds };
}

function sanitizeIdList(list, validStoryIds) {
  if (!Array.isArray(list)) return [];
  const seen = new Set();
  return list.filter((id) => {
    if (typeof id !== 'string' || !validStoryIds.has(id) || seen.has(id)) {
      return false;
    }
    seen.add(id);
    return true;
  });
}

function sanitizeHistoryMap(historyObj, validStoryIds) {
  if (!historyObj || typeof historyObj !== 'object' || Array.isArray(historyObj)) {
    return {};
  }
  const cleaned = {};
  Object.entries(historyObj).forEach(([key, val]) => {
    const sid = (val && val.storyId) || key;
    if (validStoryIds.has(sid) && val && typeof val === 'object') {
      cleaned[sid] = { ...val, storyId: sid };
    }
  });
  return cleaned;
}

function sanitizeQuizResultsList(resultsList, validQuizIds) {
  if (!Array.isArray(resultsList)) return [];
  return resultsList.filter(
    (r) =>
      r &&
      typeof r === 'object' &&
      (validQuizIds.has(r.storyId) || validQuizIds.has(r.quizId))
  );
}

export function BukunaProvider({ children }) {
  // Saat Supabase aktif, mulai dengan user = null dan authLoading = true sampai sesi Supabase selesai diperiksa.
  // Akun bawaan "Ibu Guru Rina" dan akun demo statis HANYA aktif di Mode Demo.
  const [isDemoMode, setIsDemoMode] = useState(() => isAuthInDemoMode());
  const [authLoading, setAuthLoading] = useState(() => !isAuthInDemoMode());
  const [isPasswordRecovery, setIsPasswordRecovery] = useState(false);

  const [user, setUser] = useState(() => {
    if (isAuthInDemoMode()) {
      const storedDemo = readStorage('bukuna_demo_user_v1', {
        id: 'usr-1',
        nama: 'Ibu Guru Rina',
        name: 'Ibu Guru Rina',
        nama_akun: 'Ibu Guru Rina',
        email: 'rina.guru@bukuna.id',
        peran: 'guru',
        avatar: 'orange-cat',
        isDemo: true,
      });
      if (storedDemo && !storedDemo.nama && storedDemo.name) storedDemo.nama = storedDemo.name;
      if (storedDemo && !storedDemo.name && storedDemo.nama) storedDemo.name = storedDemo.nama;
      return storedDemo;
    }
    return null;
  });

  // Daftar cerita katalog dari tabel `stories` Supabase (fallback ke initialStories jika belum dimigrasi)
  const [catalogStories, setCatalogStories] = useState(() => initialStories);
  const [catalogLoading, setCatalogLoading] = useState(false);

  // Daftar seluruh cerita yang tersimpan di tabel `public.stories` Supabase
  const [allSupabaseStories, setAllSupabaseStories] = useState(() => getMyStories());

  // Filter `myStories` untuk halaman "Cerita Saya" (/cerita-saya):
  // Jika user login di Supabase, tampilkan cerita yang dibuat oleh user tersebut (atau semua cerita pengguna di Mode Demo)
  const myStories = useMemo(() => {
    if (isDemoMode) {
      return allSupabaseStories;
    }
    if (!user || !user.id) {
      return [];
    }
    return allSupabaseStories.filter(
      (s) => s && (String(s.user_id) === String(user.id) || !s.user_id)
    );
  }, [allSupabaseStories, user, isDemoMode]);

  const [favorites, setFavorites] = useState(() => {
    if (isAuthInDemoMode()) {
      const existing = readStorage(STORAGE_KEYS.FAVORITES, null);
      if (Array.isArray(existing)) {
        return existing;
      }
      const { validStoryIds } = buildValidIdSets(getMyStories());
      return sanitizeIdList(['petualangan-kucing-di-hutan-ajaib'], validStoryIds);
    }
    return readStorage(STORAGE_KEYS.FAVORITES, []);
  });

  const [collections, setCollections] = useState(() => {
    if (isAuthInDemoMode()) {
      const existing = readStorage(STORAGE_KEYS.COLLECTIONS, null);
      if (Array.isArray(existing)) return existing;
      const { validStoryIds } = buildValidIdSets(getMyStories());
      return sanitizeIdList(
        ['petualangan-kucing-di-hutan-ajaib', 'langit-dan-balon-warna-warni'],
        validStoryIds
      );
    }
    return readStorage(STORAGE_KEYS.COLLECTIONS, []);
  });

  // Daftar koleksi bernama milik user dari tabel `public.collections` & `public.collection_items`:
  // [{ id, user_id, name, description, storyIds: [...] }]
  const [userCollections, setUserCollections] = useState(() => {
    if (isAuthInDemoMode()) {
      const existing = readStorage(STORAGE_KEYS.USER_COLLECTIONS_LIST, null);
      if (Array.isArray(existing) && existing.length > 0) return existing;
      return [
        {
          id: 'col-demo-1',
          user_id: 'usr-1',
          name: 'Koleksi Bacaanku',
          description: 'Daftar buku cerita pilihan keluarga & kelas',
          storyIds: [
            'petualangan-kucing-di-hutan-ajaib',
            'langit-dan-balon-warna-warni',
          ],
        },
      ];
    }
    return readStorage(STORAGE_KEYS.USER_COLLECTIONS_LIST, []);
  });

  // Riwayat bacaan: { [storyId]: { storyId, lastPage, totalPages, completed, updatedAt } }
  const [readingHistory, setReadingHistory] = useState(() => {
    const { validStoryIds } = buildValidIdSets(getMyStories());
    const raw = readStorage(STORAGE_KEYS.HISTORY, {});
    return sanitizeHistoryMap(raw, validStoryIds);
  });

  // Riwayat hasil kuis interaktif anak: [{ id, storyId, quizId, judul, bintang, totalSoal, tanggal }]
  const [quizResults, setQuizResults] = useState(() => {
    const { validQuizIds } = buildValidIdSets(getMyStories());
    const raw = readStorage(STORAGE_KEYS.QUIZ_RESULTS, []);
    return sanitizeQuizResultsList(raw, validQuizIds);
  });

  const [toastMessage, setToastMessage] = useState(null);

  const showToast = useCallback((text) => {
    setToastMessage(text);
    setTimeout(() => {
      setToastMessage((prev) => (prev === text ? null : prev));
    }, 3200);
  }, []);

  // Muat sesi awal dari authService (Supabase atau Mode Demo) dan dengarkan perubahan sesi
  useEffect(() => {
    let mounted = true;

    async function initAuthSession() {
      try {
        const res = await getCurrentSessionUser();
        if (!mounted) return;
        setIsDemoMode(Boolean(res.isDemoMode));
        setUser(res.user || null);
      } finally {
        if (mounted) {
          setAuthLoading(false);
        }
      }
    }

    initAuthSession();

    const unsubscribeAuth = subscribeAuthChanges((event, nextUser) => {
      if (!mounted) return;
      if (event === 'PASSWORD_RECOVERY') {
        setIsPasswordRecovery(true);
      }
      setUser(nextUser || null);
      setIsDemoMode(isAuthInDemoMode());
      setAuthLoading(false);
    });

    return () => {
      mounted = false;
      unsubscribeAuth();
    };
  }, []);

  // Muat katalog cerita dari tabel `stories` Supabase (dan migrasi otomatis jika tabel kosong)
  const refreshCatalogStories = useCallback(async () => {
    setCatalogLoading(true);
    try {
      const [res] = await Promise.all([
        fetchCatalogStories({ autoMigrateIfEmpty: true }),
        fetchAndSyncStoriesFromSupabase(),
      ]);
      setAllSupabaseStories(getMyStories());
      if (res && Array.isArray(res.stories) && res.stories.length > 0) {
        setCatalogStories(res.stories);
      }
      return res;
    } finally {
      setCatalogLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshCatalogStories();
  }, [refreshCatalogStories, user?.id]);

  // Ambil daftar story_id favorit milik user yang login dari tabel `public.favorites` Supabase
  // saat halaman dimuat atau di-refresh agar status favorit tersinkronisasi dari database
  useEffect(() => {
    let active = true;

    async function syncUserFavorites() {
      if (isDemoMode) return;
      if (!user || !user.id || user.isDemo) {
        if (active && !authLoading) {
          setFavorites([]);
        }
        return;
      }

      const dbFavoriteIds = await fetchUserFavoritesFromSupabase(user.id);
      if (active && Array.isArray(dbFavoriteIds)) {
        const uniqueIds = Array.from(new Set(dbFavoriteIds));
        setFavorites(uniqueIds);
      }
    }

    syncUserFavorites();

    return () => {
      active = false;
    };
  }, [user?.id, user?.isDemo, isDemoMode, authLoading]);

  // Ambil daftar koleksi (`public.collections`) dan daftar cerita di dalamnya (`public.collection_items`)
  // milik user yang sedang login dari Supabase saat halaman dimuat atau di-refresh
  useEffect(() => {
    let active = true;

    async function syncUserCollections() {
      if (isDemoMode) return;
      if (!user || !user.id || user.isDemo) {
        if (active && !authLoading) {
          setUserCollections([]);
          setCollections([]);
        }
        return;
      }

      const dbRes = await fetchUserCollectionsFromSupabase(user.id);
      if (active && dbRes) {
        setUserCollections(dbRes.collectionsList || []);
        setCollections(dbRes.allCollectedStoryIds || []);
      }
    }

    syncUserCollections();

    return () => {
      active = false;
    };
  }, [user?.id, user?.isDemo, isDemoMode, authLoading]);

  // Pembersihan otomatis satu kali / reaktif jika ada ID cerita lama yang sudah tidak ada
  useEffect(() => {
    const { validStoryIds, validQuizIds } = buildValidIdSets(
      allSupabaseStories,
      catalogStories
    );
    if (isDemoMode) {
      setFavorites((prev) => {
        const next = sanitizeIdList(prev, validStoryIds);
        return next.length === prev.length ? prev : next;
      });
      setCollections((prev) => {
        const next = sanitizeIdList(prev, validStoryIds);
        return next.length === prev.length ? prev : next;
      });
    }
    setReadingHistory((prev) => {
      const next = sanitizeHistoryMap(prev, validStoryIds);
      return Object.keys(next).length === Object.keys(prev || {}).length ? prev : next;
    });
    setQuizResults((prev) => {
      const next = sanitizeQuizResultsList(prev, validQuizIds);
      return next.length === prev.length ? prev : next;
    });
  }, [allSupabaseStories, catalogStories, isDemoMode]);

  // Preload cerita dari Supabase saat aplikasi dimuat & sinkronkan perubahan storyStorage
  useEffect(() => {
    preloadAllStoryImages().catch(() => {});
    const unsubscribe = subscribeStoryStorage(() => {
      setAllSupabaseStories(getMyStories());
    });
    return unsubscribe;
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.FAVORITES, JSON.stringify(favorites));
    } catch {
      // Abaikan
    }
  }, [favorites]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.COLLECTIONS, JSON.stringify(collections));
    } catch {
      // Abaikan
    }
  }, [collections]);

  useEffect(() => {
    try {
      localStorage.setItem(
        STORAGE_KEYS.USER_COLLECTIONS_LIST,
        JSON.stringify(userCollections)
      );
    } catch {
      // Abaikan
    }
  }, [userCollections]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.HISTORY, JSON.stringify(readingHistory));
    } catch {
      // Abaikan
    }
  }, [readingHistory]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.QUIZ_RESULTS, JSON.stringify(quizResults));
    } catch {
      // Abaikan
    }
  }, [quizResults]);

  // Gabungkan seluruh cerita publik dari tabel `public.stories` Supabase (cerita dari semua akun)
  // dengan cerita katalog bawaan agar tampil secara publik di Beranda, Koleksi, dan Detail Cerita
  const stories = useMemo(() => {
    const publishedSupabaseStories = allSupabaseStories.filter(
      (s) => s.status !== 'draf'
    );
    const activeCatalog =
      Array.isArray(catalogStories) && catalogStories.length > 0
        ? catalogStories
        : initialStories;
    const seenIds = new Set();
    const merged = [];

    [...publishedSupabaseStories, ...activeCatalog, ...initialStories].forEach(
      (item) => {
        if (item && item.id && !seenIds.has(item.id)) {
          seenIds.add(item.id);
          merged.push(item);
        }
      }
    );

    return merged;
  }, [allSupabaseStories, catalogStories]);

  // Ambil cerita berdasarkan ID atau slug (termasuk cerita dari semua akun di tabel `stories` Supabase)
  const getAnyStoryById = useCallback(
    (storyId) => {
      if (!storyId) return stories[0] || initialStories[0];
      const fromAllSupabase = allSupabaseStories.find(
        (s) => s.id === storyId || s.slug === storyId
      );
      if (fromAllSupabase) return fromAllSupabase;
      const fromCatalog = (catalogStories || []).find(
        (s) => s.id === storyId || s.slug === storyId
      );
      if (fromCatalog) return fromCatalog;
      const fromInitial = initialStories.find((s) => s.id === storyId);
      return fromInitial || stories[0] || initialStories[0];
    },
    [allSupabaseStories, catalogStories, stories]
  );

  const refreshMyStories = useCallback(async () => {
    await fetchAndSyncStoriesFromSupabase();
    setAllSupabaseStories(getMyStories());
  }, []);

  const createUserStory = useCallback(
    async (storyData) => {
      const authorDisplayName =
        storyData.author_name ||
        storyData.penulis ||
        (user && (user.nama_akun || user.nama || user.name || user.full_name)) ||
        'Guru & Orang Tua Bukuna';

      const created = await createStory({
        ...storyData,
        user_id: storyData.user_id || (user && !user.isDemo ? user.id : null),
        author_name: authorDisplayName,
        penulis: authorDisplayName,
      });
      setAllSupabaseStories(getMyStories());
      refreshCatalogStories().catch(() => {});
      return created;
    },
    [user, refreshCatalogStories]
  );

  const updateUserStory = useCallback(
    async (id, storyData) => {
      const authorDisplayName =
        storyData.author_name ||
        storyData.penulis ||
        (user && (user.nama_akun || user.nama || user.name || user.full_name)) ||
        'Guru & Orang Tua Bukuna';

      const updated = await updateStory(id, {
        ...storyData,
        user_id: storyData.user_id || (user && !user.isDemo ? user.id : null),
        author_name: authorDisplayName,
        penulis: authorDisplayName,
      });
      setAllSupabaseStories(getMyStories());
      refreshCatalogStories().catch(() => {});
      return updated;
    },
    [user, refreshCatalogStories]
  );

  const deleteUserStory = useCallback(
    async (id) => {
      await deleteStory(id);
      setAllSupabaseStories(getMyStories());
      refreshCatalogStories().catch(() => {});
      setFavorites((prev) => prev.filter((item) => item !== id));
      setCollections((prev) => prev.filter((item) => item !== id));
      setReadingHistory((prev) => {
        if (!prev[id]) return prev;
        const copy = { ...prev };
        delete copy[id];
        return copy;
      });
      setQuizResults((prev) =>
        prev.filter((r) => r.storyId !== id && r.quizId !== id && r.quizId !== `kuis-${id}`)
      );
      showToast('Cerita beserta gambar dan kuisnya telah dihapus.');
    },
    [showToast, refreshCatalogStories]
  );

  const exportUserStory = useCallback(async (id) => {
    return await exportStoryToJson(id);
  }, []);

  const importUserStory = useCallback(
    async (jsonInput) => {
      const imported = await importStoryFromJson(jsonInput, user);
      setAllSupabaseStories(getMyStories());
      refreshCatalogStories().catch(() => {});
      return imported;
    },
    [user, refreshCatalogStories]
  );

  const login = useCallback(
    async ({ email, password }) => {
      const res = await loginWithEmail({ email, password });
      setIsDemoMode(Boolean(res.isDemoMode || isAuthInDemoMode()));
      if (res.ok && res.user) {
        setUser(res.user);
        showToast(`Selamat datang kembali, ${res.user.nama}!`);
      }
      return res;
    },
    [showToast]
  );

  const loginDemo = useCallback(() => {
    if (!isAuthInDemoMode()) {
      return {
        ok: false,
        error: 'Akun demo hanya tersedia saat aplikasi berjalan di Mode Demo.',
      };
    }
    const res = loginAsDemoAccount();
    setIsDemoMode(true);
    setUser(res.user);
    showToast('Selamat datang di Mode Demo Bukuna Study!');
    return res;
  }, [showToast]);

  const register = useCallback(
    async ({ name, nama, email, password }) => {
      const cleanName = (nama || name || '').trim() || 'Guru & Orang Tua Bukuna';
      const res = await registerWithEmail({
        nama: cleanName,
        email,
        password,
      });
      setIsDemoMode(Boolean(res.isDemoMode || isAuthInDemoMode()));
      if (res.ok) {
        if (res.user) {
          setUser(res.user);
          showToast(`Halo ${res.user.nama}! Akunmu berhasil dibuat.`);
        } else if (res.needsEmailConfirmation) {
          showToast('Pendaftaran berhasil! Silakan cek email Anda untuk konfirmasi.');
        }
      }
      return res;
    },
    [showToast]
  );

  const logout = useCallback(async () => {
    await logoutUser();
    setUser(null);
    setFavorites([]);
    setCollections([]);
    setUserCollections([]);
    setIsPasswordRecovery(false);
    showToast('Kamu telah keluar dari akun.');
  }, [showToast]);

  const requestPasswordReset = useCallback(
    async (email) => {
      const res = await sendPasswordReset(email);
      setIsDemoMode(Boolean(res.isDemoMode || isAuthInDemoMode()));
      if (res.ok) {
        showToast('Tautan pengaturan ulang kata sandi telah dikirim ke email Anda.');
      }
      return res;
    },
    [showToast]
  );

  const confirmNewPassword = useCallback(
    async (newPassword) => {
      const res = await updateUserPassword(newPassword);
      if (res.ok) {
        setIsPasswordRecovery(false);
        showToast('Kata sandi berhasil diperbarui!');
      }
      return res;
    },
    [showToast]
  );

  const toggleFavorite = useCallback(
    async (storyId) => {
      if (!storyId) return;
      const targetStory = getAnyStoryById(storyId);
      const canonicalId = (targetStory && targetStory.id) || storyId;
      const slugId = targetStory && targetStory.slug ? targetStory.slug : null;

      const isCurrentlyFav =
        favorites.includes(storyId) ||
        favorites.includes(canonicalId) ||
        (slugId && favorites.includes(slugId));

      // Perbarui state UI secara optimistik
      setFavorites((prev) => {
        if (isCurrentlyFav) {
          return prev.filter(
            (id) => id !== storyId && id !== canonicalId && id !== slugId
          );
        }
        return Array.from(new Set([...prev, canonicalId]));
      });

      showToast(
        isCurrentlyFav ? 'Dihapus dari Favorit' : 'Ditambahkan ke Favorit ❤️'
      );

      // Jika user sedang login di Supabase, simpan atau hapus dari tabel `public.favorites`
      if (!isDemoMode && user && user.id && !user.isDemo) {
        if (isCurrentlyFav) {
          await removeFavoriteFromSupabase(user.id, canonicalId);
          if (storyId !== canonicalId) {
            await removeFavoriteFromSupabase(user.id, storyId);
          }
          if (slugId && slugId !== canonicalId) {
            await removeFavoriteFromSupabase(user.id, slugId);
          }
        } else {
          await addFavoriteToSupabase(user.id, canonicalId);
        }
      }
    },
    [favorites, getAnyStoryById, showToast, isDemoMode, user]
  );

  // 1. Membuat koleksi baru di tabel `public.collections` (id, user_id, name, description)
  const createCollection = useCallback(
    async ({ name, description = '' }) => {
      const cleanName = String(name || '').trim();
      if (!cleanName) {
        throw new Error('Nama koleksi wajib diisi.');
      }
      const cleanDesc = String(description || '').trim();
      const tempId = generateUuid();
      const newCol = {
        id: tempId,
        user_id: (user && user.id) || 'usr-1',
        name: cleanName,
        description: cleanDesc,
        storyIds: [],
      };

      setUserCollections((prev) => [...prev, newCol]);

      if (!isDemoMode && user && user.id && !user.isDemo) {
        const createdInDb = await createCollectionInSupabase({
          id: tempId,
          userId: user.id,
          name: cleanName,
          description: cleanDesc,
        });
        if (createdInDb && createdInDb.id) {
          setUserCollections((prev) =>
            prev.map((c) => (c.id === tempId ? { ...c, ...createdInDb } : c))
          );
          showToast(`Koleksi "${cleanName}" berhasil dibuat! 📚`);
          return createdInDb;
        }
      }

      showToast(`Koleksi "${cleanName}" berhasil dibuat! 📚`);
      return newCol;
    },
    [user, isDemoMode, showToast]
  );

  // 2. Menghapus koleksi dari tabel `public.collections` & `public.collection_items`
  const deleteCollection = useCallback(
    async (collectionId) => {
      if (!collectionId) return;
      const target = userCollections.find((c) => c.id === collectionId);

      setUserCollections((prev) => {
        const remaining = prev.filter((c) => c.id !== collectionId);
        const remainingStoryIds = Array.from(
          new Set(remaining.flatMap((c) => c.storyIds || []))
        );
        setCollections(remainingStoryIds);
        return remaining;
      });

      if (!isDemoMode && user && user.id && !user.isDemo) {
        await deleteCollectionFromSupabase(user.id, collectionId);
      }

      showToast(
        target
          ? `Koleksi "${target.name}" telah dihapus.`
          : 'Koleksi telah dihapus.'
      );
    },
    [userCollections, isDemoMode, user, showToast]
  );

  // 3. Menambahkan cerita ke koleksi tertentu di `public.collection_items`
  const addStoryToCollection = useCallback(
    async (collectionId, storyId) => {
      if (!storyId) return;
      const targetStory = getAnyStoryById(storyId);
      const canonicalStoryId = (targetStory && targetStory.id) || storyId;

      let activeCollectionId = collectionId;
      let targetCol = userCollections.find((c) => c.id === activeCollectionId);

      // Jika belum ada koleksi sama sekali, buat koleksi default "Koleksi Bacaanku" otomatis di Supabase
      if (!targetCol) {
        if (userCollections.length > 0) {
          targetCol = userCollections[0];
          activeCollectionId = targetCol.id;
        } else {
          const created = await createCollection({
            name: 'Koleksi Bacaanku',
            description: 'Daftar cerita favorit & pilihan keluarga',
          });
          activeCollectionId = created.id;
          targetCol = created;
        }
      }

      setUserCollections((prev) =>
        prev.map((col) => {
          if (col.id !== activeCollectionId) return col;
          const nextIds = Array.from(
            new Set([...(col.storyIds || []), canonicalStoryId])
          );
          return { ...col, storyIds: nextIds };
        })
      );

      setCollections((prev) =>
        Array.from(new Set([...prev, canonicalStoryId]))
      );

      if (!isDemoMode && user && user.id && !user.isDemo && activeCollectionId) {
        await addStoryToCollectionInSupabase({
          collectionId: activeCollectionId,
          userId: user.id,
          storyId: canonicalStoryId,
        });
      }

      showToast(
        `Disimpan ke koleksi "${(targetCol && targetCol.name) || 'Koleksi Bacaanku'}" 📚`
      );
    },
    [
      getAnyStoryById,
      userCollections,
      createCollection,
      isDemoMode,
      user,
      showToast,
    ]
  );

  // 4. Menghapus cerita dari koleksi tertentu (atau seluruh koleksi jika collectionId null) di `public.collection_items`
  const removeStoryFromCollection = useCallback(
    async (collectionId, storyId) => {
      if (!storyId) return;
      const targetStory = getAnyStoryById(storyId);
      const canonicalStoryId = (targetStory && targetStory.id) || storyId;
      const slugId = targetStory && targetStory.slug ? targetStory.slug : null;

      setUserCollections((prev) => {
        const nextCols = prev.map((col) => {
          if (collectionId && col.id !== collectionId) return col;
          return {
            ...col,
            storyIds: (col.storyIds || []).filter(
              (id) =>
                id !== storyId && id !== canonicalStoryId && id !== slugId
            ),
          };
        });
        const remainingIds = Array.from(
          new Set(nextCols.flatMap((c) => c.storyIds || []))
        );
        setCollections(remainingIds);
        return nextCols;
      });

      if (!isDemoMode && user && user.id && !user.isDemo) {
        await removeStoryFromCollectionInSupabase({
          collectionId: collectionId || null,
          userId: user.id,
          storyId: canonicalStoryId,
        });
        if (storyId !== canonicalStoryId) {
          await removeStoryFromCollectionInSupabase({
            collectionId: collectionId || null,
            userId: user.id,
            storyId,
          });
        }
        if (slugId && slugId !== canonicalStoryId) {
          await removeStoryFromCollectionInSupabase({
            collectionId: collectionId || null,
            userId: user.id,
            storyId: slugId,
          });
        }
      }

      showToast('Cerita dihapus dari Koleksi');
    },
    [getAnyStoryById, isDemoMode, user, showToast]
  );

  // 5. Toggle cepat (tombol "+ Koleksi" pada Detail Cerita / Halaman Baca / Selesai Membaca)
  const toggleCollection = useCallback(
    async (storyId, collectionId = null) => {
      if (!storyId) return;
      const targetStory = getAnyStoryById(storyId);
      const canonicalStoryId = (targetStory && targetStory.id) || storyId;
      const slugId = targetStory && targetStory.slug ? targetStory.slug : null;

      if (collectionId) {
        const col = userCollections.find((c) => c.id === collectionId);
        const existsInCol =
          col &&
          Array.isArray(col.storyIds) &&
          (col.storyIds.includes(storyId) ||
            col.storyIds.includes(canonicalStoryId) ||
            (slugId && col.storyIds.includes(slugId)));

        if (existsInCol) {
          await removeStoryFromCollection(collectionId, canonicalStoryId);
        } else {
          await addStoryToCollection(collectionId, canonicalStoryId);
        }
        return;
      }

      const existsAnywhere =
        collections.includes(storyId) ||
        collections.includes(canonicalStoryId) ||
        (slugId && collections.includes(slugId)) ||
        userCollections.some(
          (c) =>
            Array.isArray(c.storyIds) &&
            (c.storyIds.includes(storyId) ||
              c.storyIds.includes(canonicalStoryId) ||
              (slugId && c.storyIds.includes(slugId)))
        );

      if (existsAnywhere) {
        await removeStoryFromCollection(null, canonicalStoryId);
      } else {
        await addStoryToCollection(null, canonicalStoryId);
      }
    },
    [
      getAnyStoryById,
      userCollections,
      collections,
      removeStoryFromCollection,
      addStoryToCollection,
    ]
  );

  const updateReadingProgress = useCallback((storyId, pageNumber, totalPages, completed = false) => {
    setReadingHistory((prev) => {
      const current = prev[storyId];
      const isAlreadyCompleted = current?.completed || false;
      return {
        ...prev,
        [storyId]: {
          storyId,
          lastPage: pageNumber,
          totalPages,
          completed: completed || isAlreadyCompleted,
          updatedAt: new Date().toISOString(),
        },
      };
    });
  }, []);

  const markStoryCompleted = useCallback((storyId, totalPages) => {
    setReadingHistory((prev) => ({
      ...prev,
      [storyId]: {
        storyId,
        lastPage: totalPages,
        totalPages,
        completed: true,
        updatedAt: new Date().toISOString(),
      },
    }));
  }, []);

  const isFavorite = useCallback(
    (storyId) => {
      if (!storyId) return false;
      if (favorites.includes(storyId)) return true;
      const found =
        allSupabaseStories.find((s) => s.id === storyId || s.slug === storyId) ||
        (catalogStories || []).find((s) => s.id === storyId || s.slug === storyId);
      if (found) {
        return (
          favorites.includes(found.id) ||
          Boolean(found.slug && favorites.includes(found.slug))
        );
      }
      return false;
    },
    [favorites, allSupabaseStories, catalogStories]
  );
  const isInCollection = useCallback(
    (storyId, collectionId = null) => {
      if (!storyId) return false;
      const found =
        allSupabaseStories.find((s) => s.id === storyId || s.slug === storyId) ||
        (catalogStories || []).find((s) => s.id === storyId || s.slug === storyId);
      const canonicalId = (found && found.id) || storyId;
      const slugId = found && found.slug ? found.slug : null;

      if (collectionId) {
        const col = userCollections.find((c) => c.id === collectionId);
        if (!col || !Array.isArray(col.storyIds)) return false;
        return (
          col.storyIds.includes(storyId) ||
          col.storyIds.includes(canonicalId) ||
          Boolean(slugId && col.storyIds.includes(slugId))
        );
      }

      if (
        collections.includes(storyId) ||
        collections.includes(canonicalId) ||
        Boolean(slugId && collections.includes(slugId))
      ) {
        return true;
      }

      return userCollections.some(
        (c) =>
          Array.isArray(c.storyIds) &&
          (c.storyIds.includes(storyId) ||
            c.storyIds.includes(canonicalId) ||
            Boolean(slugId && c.storyIds.includes(slugId)))
      );
    },
    [collections, userCollections, allSupabaseStories, catalogStories]
  );
  const getStoryProgress = useCallback(
    (storyId) => readingHistory[storyId] || null,
    [readingHistory]
  );

  const saveQuizResult = useCallback((resultData) => {
    const entry = {
      id: `qres-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      storyId: resultData.storyId,
      quizId: resultData.quizId || resultData.storyId,
      judul: resultData.judul || 'Kuis Interaktif Bukuna',
      bintang: Math.max(1, Math.min(3, Number(resultData.bintang) || 3)),
      totalSoal: resultData.totalSoal || 4,
      tanggal: resultData.tanggal || new Date().toISOString(),
    };
    setQuizResults((prev) => [entry, ...prev]);
    return entry;
  }, []);

  const getBestQuizStars = useCallback(
    (storyId) => {
      if (!storyId) return 0;
      const matches = quizResults.filter(
        (r) => r.storyId === storyId || r.quizId === storyId
      );
      if (matches.length === 0) return 0;
      return Math.max(...matches.map((m) => m.bintang || 1));
    },
    [quizResults]
  );

  const hasQuizForStory = useCallback(
    (storyId) => {
      if (!storyId) return false;
      const foundStory =
        allSupabaseStories.find((s) => s.id === storyId || s.slug === storyId) ||
        (catalogStories || []).find((s) => s.id === storyId || s.slug === storyId) ||
        stories.find((s) => s.id === storyId || s.slug === storyId);
      const storyQuiz = foundStory && (foundStory.quizzes || foundStory.quiz);
      if (
        storyQuiz &&
        Array.isArray(storyQuiz.questions) &&
        storyQuiz.questions.length > 0
      ) {
        return true;
      }
      return Boolean(
        getQuizByStoryId(storyId) ||
          (foundStory && getQuizByStoryId(foundStory.slug))
      );
    },
    [allSupabaseStories, catalogStories, stories]
  );

  const getQuizForStory = useCallback(
    (storyId) => {
      const foundStory =
        allSupabaseStories.find((s) => s.id === storyId || s.slug === storyId) ||
        (catalogStories || []).find((s) => s.id === storyId || s.slug === storyId) ||
        stories.find((s) => s.id === storyId || s.slug === storyId);
      const storyQuiz = foundStory && (foundStory.quizzes || foundStory.quiz);
      if (
        foundStory &&
        storyQuiz &&
        Array.isArray(storyQuiz.questions) &&
        storyQuiz.questions.length > 0
      ) {
        return {
          id: `kuis-${foundStory.id}`,
          storyId: foundStory.id,
          judul: storyQuiz.judul || `Kuis ${foundStory.judul}`,
          kategori: foundStory.kategori || 'Cerita Bukuna',
          usia: foundStory.usia || '4-5 Tahun',
          cover: foundStory.cover || 'cat-magic-forest',
          icon: '📖',
          deskripsi: `Yuk jawab pertanyaan seru dari cerita "${foundStory.judul}"!`,
          isGeneral: false,
          questions: storyQuiz.questions,
        };
      }
      return (
        getQuizByStoryId(storyId) ||
        (foundStory && getQuizByStoryId(foundStory.slug)) ||
        STORY_QUIZZES[0]
      );
    },
    [allSupabaseStories, catalogStories, stories]
  );

  const isAdmin = useMemo(() => isUserAdmin(user), [user]);

  return (
    <BukunaContext.Provider
      value={{
        stories,
        catalogStories,
        catalogLoading,
        refreshCatalogStories,
        myStories,
        getAnyStoryById,
        refreshMyStories,
        createUserStory,
        updateUserStory,
        deleteUserStory,
        exportUserStory,
        importUserStory,
        user,
        isAdmin,
        authLoading,
        isDemoMode,
        isPasswordRecovery,
        setIsPasswordRecovery,
        login,
        loginDemo,
        register,
        logout,
        requestPasswordReset,
        confirmNewPassword,
        favorites,
        toggleFavorite,
        isFavorite,
        collections,
        userCollections,
        createCollection,
        deleteCollection,
        addStoryToCollection,
        removeStoryFromCollection,
        toggleCollection,
        isInCollection,
        readingHistory,
        updateReadingProgress,
        markStoryCompleted,
        getStoryProgress,
        quizResults,
        saveQuizResult,
        getBestQuizStars,
        hasQuizForStory,
        getQuizForStory,
        allQuizzes: ALL_QUIZZES,
        toastMessage,
        showToast,
      }}
    >
      {children}
    </BukunaContext.Provider>
  );
}

export function useBukuna() {
  const ctx = useContext(BukunaContext);
  if (!ctx) {
    throw new Error('useBukuna harus digunakan di dalam BukunaProvider');
  }
  return ctx;
}
