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
  subscribeStoryStorage,
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

  // Daftar cerita buatan pengguna (termasuk draf & terbit)
  const [myStories, setMyStories] = useState(() => getMyStories());

  const [favorites, setFavorites] = useState(() => {
    const { validStoryIds } = buildValidIdSets(getMyStories());
    const raw = readStorage(STORAGE_KEYS.FAVORITES, [
      'petualangan-kucing-di-hutan-ajaib',
    ]);
    return sanitizeIdList(raw, validStoryIds);
  });

  const [collections, setCollections] = useState(() => {
    const { validStoryIds } = buildValidIdSets(getMyStories());
    const raw = readStorage(STORAGE_KEYS.COLLECTIONS, [
      'petualangan-kucing-di-hutan-ajaib',
      'langit-dan-balon-warna-warni',
    ]);
    return sanitizeIdList(raw, validStoryIds);
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
      const res = await fetchCatalogStories({ autoMigrateIfEmpty: true });
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

  // Pembersihan otomatis satu kali / reaktif jika ada ID cerita lama yang sudah tidak ada
  useEffect(() => {
    const { validStoryIds, validQuizIds } = buildValidIdSets(myStories, catalogStories);
    setFavorites((prev) => {
      const next = sanitizeIdList(prev, validStoryIds);
      return next.length === prev.length ? prev : next;
    });
    setCollections((prev) => {
      const next = sanitizeIdList(prev, validStoryIds);
      return next.length === prev.length ? prev : next;
    });
    setReadingHistory((prev) => {
      const next = sanitizeHistoryMap(prev, validStoryIds);
      return Object.keys(next).length === Object.keys(prev || {}).length ? prev : next;
    });
    setQuizResults((prev) => {
      const next = sanitizeQuizResultsList(prev, validQuizIds);
      return next.length === prev.length ? prev : next;
    });
  }, [myStories, catalogStories]);

  // Preload gambar IndexedDB saat aplikasi dimuat & sinkronkan perubahan storyStorage
  useEffect(() => {
    preloadAllStoryImages().catch(() => {});
    const unsubscribe = subscribeStoryStorage(() => {
      setMyStories(getMyStories());
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

  // Gabungkan cerita terbit buatan pengguna dengan cerita katalog (dari tabel `stories` Supabase atau fallback statis)
  const stories = useMemo(() => {
    const publishedUserStories = myStories.filter((s) => s.status === 'terbit');
    const activeCatalog =
      Array.isArray(catalogStories) && catalogStories.length > 0
        ? catalogStories
        : initialStories;
    const seenIds = new Set();
    const merged = [];

    [...publishedUserStories, ...activeCatalog].forEach((item) => {
      if (item && item.id && !seenIds.has(item.id)) {
        seenIds.add(item.id);
        merged.push(item);
      }
    });

    return merged;
  }, [myStories, catalogStories]);

  // Ambil cerita berdasarkan ID atau slug (termasuk cerita katalog Supabase & draf milik pengguna)
  const getAnyStoryById = useCallback(
    (storyId) => {
      if (!storyId) return stories[0] || initialStories[0];
      const fromUser = myStories.find((s) => s.id === storyId || s.slug === storyId);
      if (fromUser) return fromUser;
      const fromCatalog = (catalogStories || []).find(
        (s) => s.id === storyId || s.slug === storyId
      );
      if (fromCatalog) return fromCatalog;
      const fromInitial = initialStories.find((s) => s.id === storyId);
      return fromInitial || stories[0] || initialStories[0];
    },
    [myStories, catalogStories, stories]
  );

  const refreshMyStories = useCallback(() => {
    setMyStories(getMyStories());
  }, []);

  const createUserStory = useCallback(
    (storyData) => {
      const created = createStory({
        ...storyData,
        penulis: storyData.penulis || (user && user.name) || 'Guru & Orang Tua Bukuna',
      });
      setMyStories(getMyStories());
      return created;
    },
    [user]
  );

  const updateUserStory = useCallback(async (id, storyData) => {
    const updated = await updateStory(id, storyData);
    setMyStories(getMyStories());
    return updated;
  }, []);

  const deleteUserStory = useCallback(
    async (id) => {
      await deleteStory(id);
      setMyStories(getMyStories());
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
    [showToast]
  );

  const exportUserStory = useCallback(async (id) => {
    return await exportStoryToJson(id);
  }, []);

  const importUserStory = useCallback(async (jsonInput) => {
    const imported = await importStoryFromJson(jsonInput);
    setMyStories(getMyStories());
    return imported;
  }, []);

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
    (storyId) => {
      setFavorites((prev) => {
        const exists = prev.includes(storyId);
        const next = exists ? prev.filter((id) => id !== storyId) : [...prev, storyId];
        showToast(exists ? 'Dihapus dari Favorit' : 'Ditambahkan ke Favorit ❤️');
        return next;
      });
    },
    [showToast]
  );

  const toggleCollection = useCallback(
    (storyId) => {
      setCollections((prev) => {
        const exists = prev.includes(storyId);
        const next = exists ? prev.filter((id) => id !== storyId) : [...prev, storyId];
        showToast(exists ? 'Dihapus dari Koleksi' : 'Disimpan ke Koleksi 📚');
        return next;
      });
    },
    [showToast]
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

  const isFavorite = useCallback((storyId) => favorites.includes(storyId), [favorites]);
  const isInCollection = useCallback((storyId) => collections.includes(storyId), [collections]);
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
      const userStory = myStories.find((s) => s.id === storyId);
      if (
        userStory &&
        userStory.quiz &&
        Array.isArray(userStory.quiz.questions) &&
        userStory.quiz.questions.length > 0
      ) {
        return true;
      }
      return Boolean(getQuizByStoryId(storyId));
    },
    [myStories]
  );

  const getQuizForStory = useCallback(
    (storyId) => {
      const userStory = myStories.find((s) => s.id === storyId);
      if (
        userStory &&
        userStory.quiz &&
        Array.isArray(userStory.quiz.questions) &&
        userStory.quiz.questions.length > 0
      ) {
        return {
          id: `kuis-${userStory.id}`,
          storyId: userStory.id,
          judul: userStory.quiz.judul || `Kuis ${userStory.judul}`,
          kategori: userStory.kategori || 'Cerita Buatanku',
          usia: userStory.usia || '4-5 Tahun',
          cover: userStory.cover || 'cat-magic-forest',
          icon: '📖',
          deskripsi: `Yuk jawab pertanyaan seru dari cerita "${userStory.judul}"!`,
          isGeneral: false,
          questions: userStory.quiz.questions,
        };
      }
      return getQuizByStoryId(storyId) || STORY_QUIZZES[0];
    },
    [myStories]
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
