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

const BukunaContext = createContext(null);

const STORAGE_KEYS = {
  USER: 'bukuna_user_v1',
  USERS_DB: 'bukuna_users_db_v1',
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
 * Membangun himpunan ID cerita aktif yang valid (2 cerita bawaan + seluruh cerita buatan pengguna)
 * serta himpunan ID kuis yang valid, lalu membersihkan referensi ke cerita yang sudah dihapus.
 */
function buildValidIdSets(userStories = []) {
  const validStoryIds = new Set(initialStories.map((s) => s.id));
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
  // Default pengguna langsung aktif agar guru/anak dapat langsung mencoba atau keluar/daftar ulang
  const [user, setUser] = useState(() => {
    const stored = readStorage(STORAGE_KEYS.USER, {
      id: 'usr-1',
      nama: 'Ibu Guru Rina',
      name: 'Ibu Guru Rina',
      email: 'rina.guru@bukuna.id',
      avatar: 'orange-cat',
    });
    if (stored && !stored.nama && stored.name) stored.nama = stored.name;
    if (stored && !stored.name && stored.nama) stored.name = stored.nama;
    return stored;
  });

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

  // Pembersihan otomatis satu kali / reaktif jika ada ID cerita lama yang sudah tidak ada
  useEffect(() => {
    const { validStoryIds, validQuizIds } = buildValidIdSets(myStories);
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
  }, [myStories]);

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
      if (user) {
        localStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(user));
      } else {
        localStorage.removeItem(STORAGE_KEYS.USER);
      }
    } catch {
      // Abaikan jika mode privat penuh
    }
  }, [user]);

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

  const showToast = useCallback((text) => {
    setToastMessage(text);
    setTimeout(() => {
      setToastMessage((prev) => (prev === text ? null : prev));
    }, 2800);
  }, []);

  // Gabungkan cerita terbit buatan pengguna dengan cerita bawaan BUKUNA
  const stories = useMemo(() => {
    const publishedUserStories = myStories.filter((s) => s.status === 'terbit');
    return [...publishedUserStories, ...initialStories];
  }, [myStories]);

  // Ambil cerita berdasarkan ID (termasuk draf milik pengguna)
  const getAnyStoryById = useCallback(
    (storyId) => {
      if (!storyId) return stories[0];
      const fromUser = myStories.find((s) => s.id === storyId);
      if (fromUser) return fromUser;
      const fromInitial = initialStories.find((s) => s.id === storyId);
      return fromInitial || stories[0];
    },
    [myStories, stories]
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
    ({ name, nama, email, password }) => {
      const identifier = (email || name || nama || '').trim();
      const usersDb = readStorage(STORAGE_KEYS.USERS_DB, []);
      const found = usersDb.find(
        (u) =>
          (u.name && u.name.toLowerCase() === identifier.toLowerCase()) ||
          (u.nama && u.nama.toLowerCase() === identifier.toLowerCase()) ||
          (u.email && u.email.toLowerCase() === identifier.toLowerCase())
      );

      const displayName =
        (found && (found.nama || found.name)) ||
        (nama || name || (identifier.includes('@') ? identifier.split('@')[0] : identifier) || 'Sahabat Bukuna');

      const loggedUser = found
        ? { ...found, nama: displayName, name: displayName }
        : {
            id: `usr-${Date.now()}`,
            nama: displayName,
            name: displayName,
            email: identifier.includes('@')
              ? identifier
              : `${displayName.toLowerCase().replace(/\s+/g, '.')}@bukuna.id`,
            password,
            avatar: 'orange-cat',
          };

      setUser(loggedUser);
      showToast(`Selamat datang kembali, ${loggedUser.nama}!`);
      return { ok: true, user: loggedUser, ...loggedUser };
    },
    [showToast]
  );

  const loginDemo = useCallback(() => {
    const demoUser = {
      id: 'usr-demo',
      nama: 'Bukuna Study',
      name: 'Bukuna Study',
      email: 'bukuna@gmail.com',
      avatar: 'orange-cat',
    };
    setUser(demoUser);
    showToast('Selamat datang di Mode Demo Bukuna Study!');
    return { ok: true, user: demoUser, ...demoUser };
  }, [showToast]);

  const register = useCallback(
    ({ name, nama, email, password }) => {
      const cleanName = (nama || name || '').trim() || 'Sahabat Bukuna';
      const cleanEmail = (email || '').trim();
      const newUser = {
        id: `usr-${Date.now()}`,
        nama: cleanName,
        name: cleanName,
        email: cleanEmail,
        password,
        avatar: 'orange-cat',
      };
      const usersDb = readStorage(STORAGE_KEYS.USERS_DB, []);
      const updatedDb = [...usersDb.filter((u) => u.email !== cleanEmail), newUser];
      try {
        localStorage.setItem(STORAGE_KEYS.USERS_DB, JSON.stringify(updatedDb));
      } catch {
        // Abaikan
      }
      setUser(newUser);
      showToast(`Halo ${newUser.nama}! Akunmu berhasil dibuat.`);
      return { ok: true, user: newUser, ...newUser };
    },
    [showToast]
  );

  const logout = useCallback(() => {
    setUser(null);
    showToast('Kamu telah keluar dari akun.');
  }, [showToast]);

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

  return (
    <BukunaContext.Provider
      value={{
        stories,
        myStories,
        getAnyStoryById,
        refreshMyStories,
        createUserStory,
        updateUserStory,
        deleteUserStory,
        exportUserStory,
        importUserStory,
        user,
        login,
        loginDemo,
        register,
        logout,
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
