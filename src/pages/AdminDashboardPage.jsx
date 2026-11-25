import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { Link, Navigate } from 'react-router-dom';
import {
  ShieldCheck,
  BookOpen,
  User,
  Star,
  Plus,
  Edit3,
  Trash2,
  Eye,
  Home,
  Sparkles,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  X,
  Save,
  Clock,
  Award,
} from 'lucide-react';
import Logo from '../components/Logo';
import ColorfulTitle from '../components/ColorfulTitle';
import StoryIllustration from '../components/StoryIllustration';
import TextInput from '../components/TextInput';
import { useBukuna } from '../context/BukunaContext';
import {
  slugifyStoryTitle,
  upsertCatalogStory,
  deleteCatalogStory,
  fetchAllCommentsForAdmin,
  adminDeleteComment,
  fetchAllProfilesForAdmin,
} from '../services/adminService';

const ADMIN_CATEGORIES = [
  'Petualangan',
  'Persahabatan',
  'Keluarga',
  'Alam/Lingkungan',
  'Fantasi',
];

const ADMIN_AGES = ['4-5 Tahun', '5-6 Tahun'];

const PRESET_COVER_OPTIONS = [
  { value: '/stories/kucing-hutan/cover.webp', label: 'Sampul: Kucing di Hutan Ajaib (.webp)' },
  { value: '/stories/langit-balon/cover.webp', label: 'Sampul: Langit & Balon Warna-Warni (.webp)' },
  { value: 'cat-magic-forest', label: 'Ilustrasi SVG: Hutan Kucing' },
  { value: 'sky-balloons', label: 'Ilustrasi SVG: Balon Udara Ceria' },
  { value: 'rabbit-garden', label: 'Ilustrasi SVG: Kebun Kelinci' },
  { value: 'family-home', label: 'Ilustrasi SVG: Rumah Hangat' },
  { value: 'river-clean', label: 'Ilustrasi SVG: Sungai Jernih' },
  { value: 'cloud-ship', label: 'Ilustrasi SVG: Perahu Awan' },
];

function formatDateId(isoStr) {
  try {
    const d = new Date(isoStr);
    if (Number.isNaN(d.getTime())) return 'Baru saja';
    return d.toLocaleDateString('id-ID', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  } catch {
    return 'Baru saja';
  }
}

function createEmptyStoryForm() {
  return {
    id: '',
    title: '',
    slug: '',
    category: 'Petualangan',
    age_category: '4-5 Tahun',
    cover_url: '/stories/kucing-hutan/cover.webp',
    synopsis: '',
    moral_value: '',
    pages: [
      {
        halaman: 1,
        gambar: '/stories/kucing-hutan/halaman-1.webp',
        teks: '',
      },
    ],
  };
}

/**
 * Halaman Dashboard Admin BUKUNA (/admin) — src/pages/AdminDashboardPage.jsx
 * - Protected Route: hanya dapat diakses oleh user yang login dan memiliki role === 'ADMIN'
 *   pada tabel `profiles` Supabase. Jika belum login atau bukan ADMIN, otomatis redirect ke `/`.
 * - Menggunakan 100% palet warna teal gelap (#007A78, #005E5C), teal terang (#1FAFAA),
 *   aksen oranye (#E07030), dan krem lembut (#FFE9B0) yang sama persis dengan web utama BUKUNA.
 * - 4 Tab Utama:
 *   1. Ringkasan (Overview)
 *   2. Kelola Koleksi Cerita (CRUD tabel `stories` Supabase + sinkron ke web utama)
 *   3. Moderasi Ulasan & Komentar (tabel `story_comments` join `profiles` + tombol Hapus Komentar)
 *   4. Daftar Pengguna (tabel `profiles`)
 */
export default function AdminDashboardPage() {
  const {
    user,
    isAdmin,
    authLoading,
    stories,
    catalogStories,
    refreshCatalogStories,
    showToast,
  } = useBukuna();

  const [activeTab, setActiveTab] = useState('ringkasan'); // 'ringkasan' | 'cerita' | 'moderasi' | 'pengguna'
  const [initialLoading, setInitialLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [commentsList, setCommentsList] = useState([]);
  const [profilesList, setProfilesList] = useState([]);
  const hasFetchedOnceRef = useRef(false);
  const catalogStoriesRef = useRef(catalogStories);
  const storiesRef = useRef(stories);

  useEffect(() => {
    catalogStoriesRef.current = catalogStories;
    storiesRef.current = stories;
  }, [catalogStories, stories]);

  // State Modal Tambah / Edit Cerita
  const [storyModalOpen, setStoryModalOpen] = useState(false);
  const [isEditingStory, setIsEditingStory] = useState(false);
  const [storyForm, setStoryForm] = useState(() => createEmptyStoryForm());
  const [slugManuallyEdited, setSlugManuallyEdited] = useState(false);
  const [storyFormError, setStoryFormError] = useState('');
  const [savingStory, setSavingStory] = useState(false);

  // State Konfirmasi Hapus Cerita & Hapus Komentar
  const [confirmDeleteStory, setConfirmDeleteStory] = useState(null);
  const [deletingStoryId, setDeletingStoryId] = useState(null);
  const [confirmDeleteComment, setConfirmDeleteComment] = useState(null);
  const [deletingCommentId, setDeletingCommentId] = useState(null);

  const loadAllAdminData = useCallback(
    async ({ silent = false } = {}) => {
      if (!silent && !hasFetchedOnceRef.current) {
        setInitialLoading(true);
      } else {
        setRefreshing(true);
      }

      try {
        const [catRes, profRes] = await Promise.all([
          refreshCatalogStories(),
          fetchAllProfilesForAdmin(),
        ]);

        const activeStories =
          (catRes && Array.isArray(catRes.stories) && catRes.stories) ||
          catalogStoriesRef.current ||
          storiesRef.current;

        const cmtRes = await fetchAllCommentsForAdmin(activeStories);

        if (profRes && Array.isArray(profRes.profiles)) {
          setProfilesList(profRes.profiles);
        }
        if (cmtRes && Array.isArray(cmtRes.comments)) {
          setCommentsList(cmtRes.comments);
        }
        hasFetchedOnceRef.current = true;
      } finally {
        setInitialLoading(false);
        setRefreshing(false);
      }
    },
    [refreshCatalogStories]
  );

  // Ambil data cukup SATU KALI saat halaman /admin pertama kali dimuat (mount)
  useEffect(() => {
    if (!authLoading && user && isAdmin && !hasFetchedOnceRef.current) {
      loadAllAdminData({ silent: false });
    }
  }, [authLoading, user, isAdmin, loadAllAdminData]);

  // Hitung statistik untuk Tab 1: Ringkasan (Overview)
  const overviewStats = useMemo(() => {
    const totalStories = Array.isArray(catalogStories) ? catalogStories.length : 0;
    const totalUsers = Array.isArray(profilesList) ? profilesList.length : 0;
    const totalCommentsAndReplies = Array.isArray(commentsList)
      ? commentsList.length
      : 0;

    const topLevelWithRating = (commentsList || []).filter(
      (c) => !c.parent_id && Number(c.rating) >= 1
    );
    const avgRating =
      topLevelWithRating.length > 0
        ? (
            topLevelWithRating.reduce(
              (acc, item) => acc + (Number(item.rating) || 5),
              0
            ) / topLevelWithRating.length
          ).toFixed(1)
        : '5.0';

    return {
      totalStories,
      totalUsers,
      totalCommentsAndReplies,
      avgRating,
      topLevelReviewsCount: topLevelWithRating.length,
    };
  }, [catalogStories, profilesList, commentsList]);

  // 1. KEAMANAN AKSES (PROTECTED ROUTE):
  // Tunggu pemeriksaan sesi selesai; jika belum login atau bukan ADMIN, redirect otomatis ke '/'
  if (authLoading) {
    return (
      <div className="bukuna-doodle-bg min-h-screen flex flex-col items-center justify-center p-6 text-center">
        <div className="bg-[#005E5C]/90 border-2 border-[#1FAFAA] rounded-[32px] p-8 shadow-2xl max-w-md w-full animate-pulse">
          <Sparkles className="w-12 h-12 text-[#FFE9B0] mx-auto mb-3" />
          <h1 className="font-heading font-extrabold text-2xl text-[#FFE9B0]">
            Memeriksa Akses Admin...
          </h1>
          <p className="sub-section text-white/85 mt-1">
            Mohon tunggu sebentar, sedang memverifikasi profil Anda.
          </p>
        </div>
      </div>
    );
  }

  if (!user || !isAdmin) {
    return <Navigate to="/" replace />;
  }

  // Handler Buka Modal Tambah Cerita Baru
  const handleOpenAddStory = () => {
    setIsEditingStory(false);
    setSlugManuallyEdited(false);
    setStoryFormError('');
    setStoryForm(createEmptyStoryForm());
    setStoryModalOpen(true);
  };

  // Handler Buka Modal Edit Cerita
  const handleOpenEditStory = (story) => {
    setIsEditingStory(true);
    setSlugManuallyEdited(true);
    setStoryFormError('');
    const existingPages =
      Array.isArray(story.pages) && story.pages.length > 0
        ? story.pages.map((p, idx) => ({
            halaman: idx + 1,
            gambar: p.gambar || story.cover || '/stories/kucing-hutan/cover.webp',
            teks: p.teks || '',
          }))
        : [
            {
              halaman: 1,
              gambar: story.cover || '/stories/kucing-hutan/cover.webp',
              teks: story.sinopsis || '',
            },
          ];

    setStoryForm({
      id: story.id,
      title: story.judul || story.title || '',
      slug: story.slug || story.id || '',
      category: story.kategori || story.category || 'Petualangan',
      age_category: story.usia || story.age_category || '4-5 Tahun',
      cover_url: story.cover || story.cover_url || '/stories/kucing-hutan/cover.webp',
      synopsis: story.sinopsis || story.synopsis || '',
      moral_value: story.pesanMoral || story.moral_value || '',
      pages: existingPages,
    });
    setStoryModalOpen(true);
  };

  const handleTitleChange = (e) => {
    const nextTitle = e.target.value;
    setStoryForm((prev) => ({
      ...prev,
      title: nextTitle,
      slug: slugManuallyEdited ? prev.slug : slugifyStoryTitle(nextTitle),
    }));
  };

  const handleSlugChange = (e) => {
    setSlugManuallyEdited(true);
    setStoryForm((prev) => ({
      ...prev,
      slug: slugifyStoryTitle(e.target.value),
    }));
  };

  const handlePageFieldChange = (pageIdx, field, val) => {
    setStoryForm((prev) => ({
      ...prev,
      pages: prev.pages.map((p, idx) =>
        idx === pageIdx ? { ...p, [field]: val } : p
      ),
    }));
  };

  const handleAddFormPage = () => {
    setStoryForm((prev) => {
      if (prev.pages.length >= 20) return prev;
      return {
        ...prev,
        pages: [
          ...prev.pages,
          {
            halaman: prev.pages.length + 1,
            gambar: prev.cover_url || '/stories/kucing-hutan/cover.webp',
            teks: '',
          },
        ],
      };
    });
  };

  const handleRemoveFormPage = (pageIdx) => {
    setStoryForm((prev) => {
      if (prev.pages.length <= 1) return prev;
      const nextPages = prev.pages
        .filter((_, idx) => idx !== pageIdx)
        .map((p, i) => ({ ...p, halaman: i + 1 }));
      return {
        ...prev,
        pages: nextPages,
      };
    });
  };

  const handleSaveStorySubmit = async (e) => {
    e.preventDefault();
    setStoryFormError('');

    const cleanTitle = (storyForm.title || '').trim();
    if (!cleanTitle) {
      setStoryFormError('Judul cerita wajib diisi.');
      return;
    }

    const cleanSlug = (storyForm.slug || slugifyStoryTitle(cleanTitle)).trim();
    if (!cleanSlug) {
      setStoryFormError('Slug cerita tidak boleh kosong.');
      return;
    }

    const hasPageText = storyForm.pages.some((p) => p.teks && p.teks.trim());
    if (!hasPageText) {
      setStoryFormError('Mohon isi teks cerita minimal pada Halaman 1.');
      return;
    }

    setSavingStory(true);
    try {
      const payload = {
        ...storyForm,
        id: isEditingStory && storyForm.id ? storyForm.id : cleanSlug,
        slug: cleanSlug,
        title: cleanTitle,
      };

      const res = await upsertCatalogStory(payload, isEditingStory);
      if (!res || !res.ok) {
        setStoryFormError(
          (res && res.error) || 'Gagal menyimpan cerita ke database.'
        );
        return;
      }

      await refreshCatalogStories();
      setStoryModalOpen(false);
      showToast(
        isEditingStory
          ? `Cerita "${cleanTitle}" berhasil diperbarui!`
          : `Cerita baru "${cleanTitle}" berhasil ditambahkan ke koleksi!`
      );
    } finally {
      setSavingStory(false);
    }
  };

  const handleConfirmDeleteStory = async () => {
    if (!confirmDeleteStory) return;
    const target = confirmDeleteStory;
    setDeletingStoryId(target.id);
    try {
      const res = await deleteCatalogStory(target.id);
      if (!res || !res.ok) {
        showToast((res && res.error) || 'Gagal menghapus cerita.');
        return;
      }
      setConfirmDeleteStory(null);
      await refreshCatalogStories();
      showToast(`Cerita "${target.judul || target.title}" telah dihapus.`);
    } finally {
      setDeletingStoryId(null);
    }
  };

  const handleConfirmDeleteComment = async () => {
    if (!confirmDeleteComment) return;
    const target = confirmDeleteComment;
    setDeletingCommentId(target.id);
    try {
      const res = await adminDeleteComment(target.id);
      if (!res || !res.ok) {
        showToast((res && res.error) || 'Gagal menghapus komentar.');
        return;
      }
      setCommentsList((prev) =>
        prev.filter((c) => c.id !== target.id && c.parent_id !== target.id)
      );
      setConfirmDeleteComment(null);
      showToast('Komentar berhasil dihapus oleh Admin.');
    } finally {
      setDeletingCommentId(null);
    }
  };

  const tabs = [
    {
      id: 'ringkasan',
      label: 'Ringkasan',
      badge: null,
      icon: Sparkles,
    },
    {
      id: 'cerita',
      label: 'Kelola Koleksi Cerita',
      badge: overviewStats.totalStories,
      icon: BookOpen,
    },
    {
      id: 'moderasi',
      label: 'Moderasi Ulasan & Komentar',
      badge: overviewStats.totalCommentsAndReplies,
      icon: ShieldCheck,
    },
    {
      id: 'pengguna',
      label: 'Daftar Pengguna',
      badge: overviewStats.totalUsers,
      icon: User,
    },
  ];

  return (
    <div className="bukuna-doodle-bg min-h-screen overflow-y-scroll flex flex-col pb-16">
      {/* HEADER DASHBOARD ADMIN (Senada dengan Web Utama + Tombol Kembali ke Web Utama) */}
      <header className="sticky top-0 z-30 w-full bg-[#007A78]/95 backdrop-blur-md border-b border-white/15">
        <div className="max-w-[1200px] mx-auto px-4 sm:px-6 h-16 sm:h-18 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <Link
              to="/beranda"
              className="inline-flex items-center py-1 rounded-xl focus:outline-none"
              aria-label="Ke Beranda Bukuna"
            >
              <Logo size="sm" />
            </Link>
            <span className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#062D2C] border border-[#FFE9B0]/60 text-[#FFE9B0] font-heading font-extrabold text-xs uppercase tracking-wider">
              <ShieldCheck className="w-3.5 h-3.5 text-[#E07030]" />
              <span>Dashboard Admin</span>
            </span>
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            <button
              type="button"
              onClick={() => loadAllAdminData({ silent: true })}
              disabled={refreshing}
              title="Muat ulang data Supabase"
              className="min-h-[42px] px-3.5 py-1.5 rounded-full bg-[#005E5C] hover:bg-[#1FAFAA] text-[#FFE9B0] hover:text-[#052625] border border-[#1FAFAA]/60 font-heading font-bold text-xs sm:text-sm inline-flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
              <span className="hidden sm:inline">
                {refreshing ? 'Menyegarkan...' : 'Segarkan Data'}
              </span>
            </button>

            <Link
              to="/beranda"
              className="min-h-[42px] px-4 py-2 rounded-full bg-[#E07030] hover:bg-[#C95B1E] text-white border-2 border-[#FFE9B0] font-heading font-extrabold text-xs sm:text-sm inline-flex items-center gap-1.5 shadow-md transition-colors"
            >
              <Home className="w-4 h-4" />
              <span>Kembali ke Web Utama</span>
            </Link>
          </div>
        </div>
      </header>

      <main className="flex-1 w-full max-w-[1200px] mx-auto px-4 sm:px-6 pt-5 pb-10 min-h-[760px]">
        {/* BANNER SAMBUTAN ADMIN */}
        <section className="bg-[#005E5C]/90 border-2 border-[#1FAFAA]/60 rounded-[32px] p-5 sm:p-7 shadow-2xl mb-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-[#E07030] text-white text-xs font-extrabold uppercase tracking-wider mb-2 shadow-sm">
              <ShieldCheck className="w-4 h-4" />
              <span>Panel Pengelola Resmi BUKUNA</span>
            </div>
            <ColorfulTitle
              as="h1"
              text="Dashboard Admin Bukuna"
              className="font-heading font-extrabold text-2xl sm:text-3xl lg:text-4xl text-[#FFE9B0]"
            />
            <p className="sub-section text-white/90 mt-1">
              Selamat bertugas, <strong className="text-[#FFE9B0]">{user.nama || user.full_name}</strong>! Kelola koleksi cerita anak, moderasi diskusi orang tua, dan pantau pengguna terdaftar.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 shrink-0">
            <button
              type="button"
              onClick={handleOpenAddStory}
              className="min-h-[48px] px-5 py-2.5 rounded-full bg-[#E07030] hover:bg-[#C95B1E] text-white border-2 border-[#FFE9B0] font-heading font-extrabold text-sm inline-flex items-center gap-2 shadow-lg transition-all cursor-pointer"
            >
              <Plus className="w-5 h-5" />
              <span>+ Tambah Cerita Baru</span>
            </button>
          </div>
        </section>

        {/* NAVIGASI 4 TAB HORIZONTAL BERGAYA PIL / KARTU HANGAT */}
        <nav
          aria-label="Navigasi Tab Dashboard Admin"
          className="mb-6 bg-[#005E5C]/90 border-2 border-[#1FAFAA]/50 rounded-[28px] p-2 shadow-xl flex flex-wrap items-center gap-2"
        >
          {tabs.map((tab) => {
            const TabIcon = tab.icon;
            const active = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`flex-1 min-w-[160px] min-h-[48px] px-4 py-2.5 rounded-full font-heading font-extrabold text-xs sm:text-sm flex items-center justify-center gap-2 transition-colors cursor-pointer border-2 ${
                  active
                    ? 'bg-[#E07030] border-[#FFE9B0] text-white shadow-lg'
                    : 'bg-[#062D2C]/70 border-transparent text-[#FFE9B0] hover:bg-[#1FAFAA] hover:text-[#052625]'
                }`}
              >
                <TabIcon className="w-4 h-4 shrink-0" />
                <span>{tab.label}</span>
                {tab.badge !== null && (
                  <span
                    className={`px-2 py-0.5 rounded-full text-xs font-extrabold ${
                      active
                        ? 'bg-[#062D2C] text-[#FFE9B0]'
                        : 'bg-white/15 text-white'
                    }`}
                  >
                    {tab.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        {/* ===================================================================
            TAB 1: RINGKASAN (OVERVIEW)
           =================================================================== */}
        {activeTab === 'ringkasan' && (
          <section aria-label="Ringkasan Statistik Bukuna" className="space-y-6">
            {/* 4 Kartu Statistik Utama */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
              {/* Kartu 1: Total Koleksi Cerita */}
              <div className="bg-[#005E5C]/95 border-2 border-[#1FAFAA]/60 rounded-[28px] p-5 shadow-xl flex flex-col justify-between">
                <div className="flex items-center justify-between gap-2 mb-3">
                  <span className="sub-chip px-3 py-1 rounded-full bg-[#E07030] text-white">
                    Koleksi Cerita
                  </span>
                  <div className="w-11 h-11 rounded-2xl bg-[#FFE9B0] text-[#062D2C] flex items-center justify-center shadow-inner">
                    <BookOpen className="w-6 h-6" />
                  </div>
                </div>
                <div>
                  <div className="font-heading font-extrabold text-4xl text-[#FFE9B0]">
                    {overviewStats.totalStories}
                  </div>
                  <p className="sub-label text-white/90 mt-1">
                    Buku cerita aktif di katalog utama
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setActiveTab('cerita')}
                  className="mt-4 text-xs font-extrabold text-[#FFE9B0] hover:underline text-left cursor-pointer"
                >
                  Kelola Koleksi Cerita →
                </button>
              </div>

              {/* Kartu 2: Total Pengguna Terdaftar */}
              <div className="bg-[#005E5C]/95 border-2 border-[#1FAFAA]/60 rounded-[28px] p-5 shadow-xl flex flex-col justify-between">
                <div className="flex items-center justify-between gap-2 mb-3">
                  <span className="sub-chip px-3 py-1 rounded-full bg-[#1FAFAA] text-[#052625]">
                    Pengguna
                  </span>
                  <div className="w-11 h-11 rounded-2xl bg-[#FFE9B0] text-[#062D2C] flex items-center justify-center shadow-inner">
                    <User className="w-6 h-6" />
                  </div>
                </div>
                <div>
                  <div className="font-heading font-extrabold text-4xl text-[#FFE9B0]">
                    {overviewStats.totalUsers}
                  </div>
                  <p className="sub-label text-white/90 mt-1">
                    Akun Guru, Orang Tua &amp; Admin
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setActiveTab('pengguna')}
                  className="mt-4 text-xs font-extrabold text-[#FFE9B0] hover:underline text-left cursor-pointer"
                >
                  Lihat Daftar Pengguna →
                </button>
              </div>

              {/* Kartu 3: Total Ulasan & Balasan Masuk */}
              <div className="bg-[#005E5C]/95 border-2 border-[#1FAFAA]/60 rounded-[28px] p-5 shadow-xl flex flex-col justify-between">
                <div className="flex items-center justify-between gap-2 mb-3">
                  <span className="sub-chip px-3 py-1 rounded-full bg-[#E07030] text-white">
                    Diskusi &amp; Ulasan
                  </span>
                  <div className="w-11 h-11 rounded-2xl bg-[#FFE9B0] text-[#062D2C] flex items-center justify-center shadow-inner">
                    <ShieldCheck className="w-6 h-6" />
                  </div>
                </div>
                <div>
                  <div className="font-heading font-extrabold text-4xl text-[#FFE9B0]">
                    {overviewStats.totalCommentsAndReplies}
                  </div>
                  <p className="sub-label text-white/90 mt-1">
                    Ulasan &amp; balasan orang tua masuk
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setActiveTab('moderasi')}
                  className="mt-4 text-xs font-extrabold text-[#FFE9B0] hover:underline text-left cursor-pointer"
                >
                  Moderasi Komentar →
                </button>
              </div>

              {/* Kartu 4: Rata-rata Rating Bintang Keseluruhan */}
              <div className="bg-[#005E5C]/95 border-2 border-[#FFE9B0]/70 rounded-[28px] p-5 shadow-xl flex flex-col justify-between">
                <div className="flex items-center justify-between gap-2 mb-3">
                  <span className="sub-chip px-3 py-1 rounded-full bg-[#FFE9B0] text-[#052625]">
                    Rating Bintang
                  </span>
                  <div className="w-11 h-11 rounded-2xl bg-[#E07030] text-white flex items-center justify-center shadow-inner">
                    <Star className="w-6 h-6 fill-[#FFE9B0] text-[#FFE9B0]" />
                  </div>
                </div>
                <div>
                  <div className="font-heading font-extrabold text-4xl text-[#FFE9B0] flex items-baseline gap-1.5">
                    <span>{overviewStats.avgRating}</span>
                    <span className="text-base text-white/80">/ 5.0</span>
                  </div>
                  <p className="sub-label text-white/90 mt-1">
                    Dari {overviewStats.topLevelReviewsCount} ulasan utama cerita
                  </p>
                </div>
                <span className="mt-4 text-xs font-extrabold text-[#1FAFAA]">
                  ★ Kepuasan Pendamping Anak
                </span>
              </div>
            </div>

            {/* Ringkasan Cepat Koleksi & Komentar Terbaru */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              {/* Daftar Singkat Koleksi Cerita */}
              <div className="lg:col-span-6 bg-[#005E5C]/90 border-2 border-[#1FAFAA]/50 rounded-[30px] p-5 sm:p-6 shadow-xl">
                <div className="flex items-center justify-between gap-2 mb-4">
                  <h2 className="font-heading font-extrabold text-xl text-[#FFE9B0]">
                    📚 Koleksi Cerita Aktif
                  </h2>
                  <button
                    type="button"
                    onClick={() => setActiveTab('cerita')}
                    className="sub-chip px-3 py-1 rounded-full bg-[#1FAFAA] text-[#052625] font-extrabold cursor-pointer"
                  >
                    Kelola Semua
                  </button>
                </div>

                <div className="space-y-3">
                  {(catalogStories || []).slice(0, 4).map((story) => (
                    <div
                      key={story.id}
                      className="bg-[#062D2C]/85 border border-[#1FAFAA]/40 rounded-2xl p-3 flex items-center justify-between gap-3"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-12 h-12 rounded-xl overflow-hidden shrink-0 border border-[#FFE9B0]/40 bg-[#007A78]">
                          <StoryIllustration
                            variant={story.cover}
                            title={story.judul}
                            showCoverTitle={false}
                            sizeVariant="sm"
                          />
                        </div>
                        <div className="min-w-0">
                          <h3 className="font-heading font-extrabold text-sm sm:text-base text-[#FFE9B0] truncate">
                            {story.judul}
                          </h3>
                          <p className="sub-help text-white/80">
                            {story.kategori} • {story.usia} • {story.pages?.length || 1} Hal.
                          </p>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => handleOpenEditStory(story)}
                        className="min-h-[36px] px-3 py-1 rounded-full bg-[#E07030] hover:bg-[#C95B1E] text-white font-bold text-xs inline-flex items-center gap-1 shrink-0 cursor-pointer"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                        <span>Edit</span>
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              {/* Daftar Singkat Ulasan Terbaru */}
              <div className="lg:col-span-6 bg-[#005E5C]/90 border-2 border-[#1FAFAA]/50 rounded-[30px] p-5 sm:p-6 shadow-xl">
                <div className="flex items-center justify-between gap-2 mb-4">
                  <h2 className="font-heading font-extrabold text-xl text-[#FFE9B0]">
                    💬 Ulasan &amp; Balasan Terbaru
                  </h2>
                  <button
                    type="button"
                    onClick={() => setActiveTab('moderasi')}
                    className="sub-chip px-3 py-1 rounded-full bg-[#1FAFAA] text-[#052625] font-extrabold cursor-pointer"
                  >
                    Moderasi Semua
                  </button>
                </div>

                {commentsList.length > 0 ? (
                  <div className="space-y-3">
                    {commentsList.slice(0, 4).map((cmt) => (
                      <div
                        key={cmt.id}
                        className="bg-[#062D2C]/85 border border-[#1FAFAA]/40 rounded-2xl p-3.5 flex flex-col gap-1.5"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-heading font-extrabold text-sm text-[#FFE9B0]">
                            {cmt.author_name}
                          </span>
                          <span className="text-xs font-bold text-[#1FAFAA] truncate max-w-[50%]">
                            {cmt.story_title}
                          </span>
                        </div>
                        <p className="sub-help text-white/90 line-clamp-2">
                          {cmt.comment}
                        </p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="py-8 text-center text-white/80">
                    Belum ada ulasan atau komentar yang masuk.
                  </div>
                )}
              </div>
            </div>
          </section>
        )}

        {/* ===================================================================
            TAB 2: KELOLA KOLEKSI CERITA
           =================================================================== */}
        {activeTab === 'cerita' && (
          <section aria-label="Kelola Koleksi Cerita" className="space-y-5">
            <div className="bg-[#1FAFAA] text-[#052625] rounded-[28px] p-5 sm:p-6 border-2 border-[#FFE9B0] shadow-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h2 className="font-heading font-extrabold text-xl sm:text-2xl text-[#052625]">
                  Katalog Koleksi Cerita BUKUNA ({catalogStories.length} Cerita)
                </h2>
                <p className="sub-section text-[#052625]/85 mt-0.5">
                  Setiap cerita yang ditambah atau diubah di sini langsung tersinkron ke Beranda, Koleksi, dan Halaman Membaca.
                </p>
              </div>

              <button
                type="button"
                onClick={handleOpenAddStory}
                className="min-h-[48px] px-6 py-2.5 rounded-full bg-[#E07030] hover:bg-[#C95B1E] text-white border-2 border-[#FFE9B0] font-heading font-extrabold text-sm sm:text-base inline-flex items-center justify-center gap-2 shadow-lg shrink-0 cursor-pointer"
              >
                <Plus className="w-5 h-5" />
                <span>+ Tambah Cerita Baru</span>
              </button>
            </div>

            {initialLoading && catalogStories.length === 0 ? (
              <div className="py-12 text-center bg-[#005E5C]/85 rounded-[30px] border-2 border-[#1FAFAA]/40">
                <Sparkles className="w-10 h-10 text-[#FFE9B0] mx-auto mb-2" />
                <p className="font-heading font-bold text-lg text-[#FFE9B0]">
                  Memuat katalog cerita dari Supabase...
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                {catalogStories.map((story) => {
                  const pageCount = Array.isArray(story.pages)
                    ? story.pages.length
                    : 1;

                  return (
                    <article
                      key={story.id}
                      className="bg-[#005E5C]/95 border-2 border-[#1FAFAA]/60 rounded-[28px] overflow-hidden shadow-xl flex flex-col justify-between"
                    >
                      <div>
                        <div className="relative aspect-[4/3.4] w-full bg-[#007A78] overflow-hidden">
                          <StoryIllustration
                            variant={story.cover}
                            title={story.judul}
                            alt={story.coverAlt || story.judul}
                            showCoverTitle={false}
                            sizeVariant="sm"
                            className="w-full h-full"
                          />
                          <div className="absolute top-3 left-3 right-3 flex items-center justify-between gap-2">
                            <span className="sub-chip px-3 py-1 rounded-full bg-[#062D2C]/90 text-[#FFE9B0] border border-[#FFE9B0]/50">
                              {story.kategori}
                            </span>
                            <span className="sub-chip px-3 py-1 rounded-full bg-[#E07030] text-white shadow-md">
                              {story.usia}
                            </span>
                          </div>
                        </div>

                        <div className="p-4 sm:p-5">
                          <span className="text-xs font-bold text-[#1FAFAA] block truncate">
                            Slug: /{story.slug || story.id} • {pageCount} Halaman
                          </span>
                          <h3 className="mt-1 font-heading font-extrabold text-xl text-[#FFE9B0] line-clamp-1">
                            {story.judul}
                          </h3>
                          <p className="sub-help mt-1.5 text-white/90 line-clamp-2">
                            {story.sinopsis}
                          </p>
                          {(story.pesanMoral || story.moral_value) && (
                            <p className="mt-2 text-xs font-bold text-[#FFE9B0] bg-[#062D2C]/80 px-3 py-1.5 rounded-xl line-clamp-2">
                              ✨ Pesan Moral: {story.pesanMoral || story.moral_value}
                            </p>
                          )}
                        </div>
                      </div>

                      <div className="p-4 sm:p-5 pt-0 flex items-center justify-between gap-2">
                        <Link
                          to={`/cerita/${story.id}`}
                          className="min-h-[40px] px-3.5 py-1.5 rounded-full bg-[#1FAFAA] hover:bg-[#159A95] text-[#052625] font-heading font-extrabold text-xs inline-flex items-center gap-1.5"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          <span>Lihat</span>
                        </Link>

                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => handleOpenEditStory(story)}
                            className="min-h-[40px] px-3.5 py-1.5 rounded-full bg-[#E07030] hover:bg-[#C95B1E] text-white font-heading font-extrabold text-xs inline-flex items-center gap-1.5 cursor-pointer"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                            <span>Edit Cerita</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => setConfirmDeleteStory(story)}
                            aria-label={`Hapus cerita ${story.judul}`}
                            className="min-h-[40px] px-3 py-1.5 rounded-full bg-red-500/20 hover:bg-red-500/35 border border-red-300/40 text-red-300 font-bold text-xs inline-flex items-center gap-1 cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                            <span>Hapus</span>
                          </button>
                        </div>
                      </div>
                    </article>
                  );
                })}
              </div>
            )}
          </section>
        )}

        {/* ===================================================================
            TAB 3: MODERASI ULASAN & KOMENTAR
           =================================================================== */}
        {activeTab === 'moderasi' && (
          <section aria-label="Moderasi Ulasan dan Komentar" className="space-y-5">
            <div className="bg-[#005E5C]/95 border-2 border-[#FFE9B0]/60 rounded-[28px] p-5 sm:p-6 shadow-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h2 className="font-heading font-extrabold text-xl sm:text-2xl text-[#FFE9B0]">
                  Moderasi Ulasan &amp; Balasan Komentar ({commentsList.length})
                </h2>
                <p className="sub-section text-white/90 mt-0.5">
                  Pantau seluruh komentar pada tabel <code className="text-[#FFE9B0]">story_comments</code> dan hapus komentar yang tidak sesuai dengan aturan kesantunan ramah anak.
                </p>
              </div>
            </div>

            {initialLoading && commentsList.length === 0 ? (
              <div className="py-12 text-center bg-[#005E5C]/85 rounded-[30px] border-2 border-[#1FAFAA]/40">
                <Sparkles className="w-10 h-10 text-[#FFE9B0] mx-auto mb-2" />
                <p className="font-heading font-bold text-lg text-[#FFE9B0]">
                  Memuat daftar komentar dari Supabase...
                </p>
              </div>
            ) : commentsList.length > 0 ? (
              <div className="space-y-3.5">
                {commentsList.map((cmt) => {
                  const isReply = Boolean(cmt.parent_id);
                  const starCount = Math.max(1, Math.min(5, Number(cmt.rating) || 5));

                  return (
                    <article
                      key={cmt.id}
                      className="bg-[#005E5C]/95 border-2 border-[#1FAFAA]/50 rounded-[26px] p-4 sm:p-5 shadow-lg flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                    >
                      <div className="space-y-2 min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span
                            className={`px-3 py-0.5 rounded-full text-xs font-extrabold ${
                              isReply
                                ? 'bg-[#1FAFAA] text-[#052625]'
                                : 'bg-[#E07030] text-white'
                            }`}
                          >
                            {isReply ? '↩ Balasan Komentar' : '★ Ulasan Utama'}
                          </span>

                          <span className="font-heading font-extrabold text-base text-[#FFE9B0]">
                            {cmt.author_name}
                          </span>

                          <span className="px-2.5 py-0.5 rounded-full bg-[#062D2C] text-[#1FAFAA] text-xs font-extrabold uppercase">
                            {cmt.author_role || 'GURU'}
                          </span>

                          {!isReply && (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-[#062D2C] text-[#FFE9B0] text-xs font-extrabold">
                              <Star className="w-3.5 h-3.5 fill-[#FFE9B0]" />
                              <span>{starCount}/5</span>
                            </span>
                          )}

                          <span className="text-xs font-semibold text-white/75">
                            • {formatDateId(cmt.created_at)}
                          </span>
                        </div>

                        <p className="sub-body text-white/95">
                          {cmt.comment}
                        </p>

                        <div className="text-xs font-bold text-[#FFE9B0]/90 flex flex-wrap items-center gap-2">
                          <span>Cerita:</span>
                          <Link
                            to={`/cerita/${cmt.story_id}`}
                            className="px-2.5 py-0.5 rounded-full bg-white/10 hover:bg-white/20 text-[#FFE9B0] underline"
                          >
                            {cmt.story_title || cmt.story_id}
                          </Link>
                        </div>
                      </div>

                      <div className="shrink-0 self-end sm:self-center">
                        <button
                          type="button"
                          onClick={() => setConfirmDeleteComment(cmt)}
                          className="min-h-[42px] px-4 py-2 rounded-full bg-red-500/20 hover:bg-red-500/40 border-2 border-red-300/60 text-red-200 font-heading font-extrabold text-xs sm:text-sm inline-flex items-center gap-1.5 transition-colors cursor-pointer"
                        >
                          <Trash2 className="w-4 h-4" />
                          <span>Hapus Komentar</span>
                        </button>
                      </div>
                    </article>
                  );
                })}
              </div>
            ) : (
              <div className="bg-[#005E5C]/90 border-2 border-[#1FAFAA]/50 rounded-[30px] p-10 text-center">
                <ShieldCheck className="w-12 h-12 text-[#FFE9B0] mx-auto mb-2" />
                <h3 className="font-heading font-extrabold text-xl text-[#FFE9B0]">
                  Belum Ada Komentar Masuk
                </h3>
                <p className="sub-section text-white/85 mt-1">
                  Seluruh ulasan dan balasan yang ditulis orang tua atau guru akan tampil di sini.
                </p>
              </div>
            )}
          </section>
        )}

        {/* ===================================================================
            TAB 4: DAFTAR PENGGUNA
           =================================================================== */}
        {activeTab === 'pengguna' && (
          <section aria-label="Daftar Pengguna Terdaftar" className="space-y-5">
            <div className="bg-[#005E5C]/95 border-2 border-[#1FAFAA]/60 rounded-[28px] p-5 sm:p-6 shadow-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h2 className="font-heading font-extrabold text-xl sm:text-2xl text-[#FFE9B0]">
                  Daftar Pengguna Terdaftar ({profilesList.length} Akun)
                </h2>
                <p className="sub-section text-white/90 mt-0.5">
                  Data profil pendamping (Guru, Orang Tua, dan Admin) dari tabel <code className="text-[#FFE9B0]">profiles</code> Supabase.
                </p>
              </div>
            </div>

            {initialLoading && profilesList.length === 0 ? (
              <div className="py-12 text-center bg-[#005E5C]/85 rounded-[30px] border-2 border-[#1FAFAA]/40">
                <Sparkles className="w-10 h-10 text-[#FFE9B0] mx-auto mb-2" />
                <p className="font-heading font-bold text-lg text-[#FFE9B0]">
                  Memuat daftar pengguna dari Supabase...
                </p>
              </div>
            ) : profilesList.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {profilesList.map((prof) => {
                  const isProfAdmin = String(prof.role).toUpperCase() === 'ADMIN';
                  return (
                    <div
                      key={prof.id}
                      className="bg-[#005E5C]/95 border-2 border-[#1FAFAA]/50 rounded-[26px] p-5 shadow-lg flex items-center justify-between gap-3"
                    >
                      <div className="flex items-center gap-3.5 min-w-0">
                        <div
                          className={`w-12 h-12 rounded-2xl font-heading font-extrabold text-lg flex items-center justify-center shrink-0 shadow-md ${
                            isProfAdmin
                              ? 'bg-[#E07030] text-white border-2 border-[#FFE9B0]'
                              : 'bg-[#FFE9B0] text-[#052625]'
                          }`}
                        >
                          {(prof.full_name || 'U').charAt(0).toUpperCase()}
                        </div>
                        <div className="min-w-0">
                          <h3 className="font-heading font-extrabold text-base sm:text-lg text-[#FFE9B0] truncate">
                            {prof.full_name}
                          </h3>
                          <p className="sub-help text-white/80 flex items-center gap-1 mt-0.5">
                            <Clock className="w-3.5 h-3.5 shrink-0" />
                            <span>Bergabung: {formatDateId(prof.created_at)}</span>
                          </p>
                        </div>
                      </div>

                      <span
                        className={`px-3 py-1 rounded-full font-heading font-extrabold text-xs uppercase tracking-wider shrink-0 shadow-sm ${
                          isProfAdmin
                            ? 'bg-[#E07030] text-white border border-[#FFE9B0]'
                            : 'bg-[#1FAFAA] text-[#052625]'
                        }`}
                      >
                        {prof.role}
                      </span>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="bg-[#005E5C]/90 border-2 border-[#1FAFAA]/50 rounded-[30px] p-10 text-center">
                <User className="w-12 h-12 text-[#FFE9B0] mx-auto mb-2" />
                <h3 className="font-heading font-extrabold text-xl text-[#FFE9B0]">
                  Belum Ada Pengguna Terdaftar
                </h3>
              </div>
            )}
          </section>
        )}
      </main>

      {/* =====================================================================
          MODAL TAMBAH / EDIT CERITA (TAB 2)
         ===================================================================== */}
      {storyModalOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="modal-story-title"
          className="fixed inset-0 z-50 bg-black/75 flex items-center justify-center p-4 overflow-y-auto"
        >
          <div className="w-full max-w-3xl bg-[#005E5C] border-4 border-[#FFE9B0] rounded-[32px] p-5 sm:p-7 shadow-2xl my-8 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between gap-3 pb-4 border-b border-white/15">
              <div>
                <span className="sub-chip px-3 py-0.5 rounded-full bg-[#E07030] text-white">
                  {isEditingStory ? 'Mode Edit Cerita' : 'Koleksi Cerita Baru'}
                </span>
                <h2
                  id="modal-story-title"
                  className="font-heading font-extrabold text-2xl text-[#FFE9B0] mt-1"
                >
                  {isEditingStory ? 'Edit Cerita Koleksi' : 'Tambah Cerita Baru'}
                </h2>
              </div>

              <button
                type="button"
                onClick={() => setStoryModalOpen(false)}
                aria-label="Tutup form cerita"
                className="w-10 h-10 rounded-full bg-white/15 hover:bg-white/25 text-white flex items-center justify-center cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {storyFormError && (
              <div
                role="alert"
                className="mt-4 rounded-2xl bg-red-500/20 border-2 border-red-300 px-4 py-3 text-xs sm:text-sm font-bold text-white flex items-center gap-2"
              >
                <AlertCircle className="w-5 h-5 text-[#FFE9B0] shrink-0" />
                <span>{storyFormError}</span>
              </div>
            )}

            <form onSubmit={handleSaveStorySubmit} noValidate className="mt-5 space-y-4">
              {/* Baris 1: Judul Cerita & Slug Otomatis */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <TextInput
                  id="admin-story-title"
                  name="title"
                  label="Judul Cerita *"
                  value={storyForm.title}
                  onChange={handleTitleChange}
                  placeholder="Contoh: Kancil dan Sahabat Hutan"
                />

                <TextInput
                  id="admin-story-slug"
                  name="slug"
                  label="Slug URL Otomatis *"
                  value={storyForm.slug}
                  onChange={handleSlugChange}
                  placeholder="kancil-dan-sahabat-hutan"
                />
              </div>

              {/* Baris 2: Kategori Tema & Kategori Usia */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label
                    htmlFor="admin-story-category"
                    className="sub-form-label block text-[#FFE9B0] mb-1.5 pl-1"
                  >
                    Kategori Tema
                  </label>
                  <select
                    id="admin-story-category"
                    name="category"
                    value={storyForm.category}
                    onChange={(e) =>
                      setStoryForm((prev) => ({ ...prev, category: e.target.value }))
                    }
                    className="w-full min-h-[50px] px-4 py-2.5 rounded-full bg-white text-[#062D2C] font-bold text-sm sm:text-base border-2 border-transparent focus:border-[#E07030] focus:outline-none"
                  >
                    {ADMIN_CATEGORIES.map((cat) => (
                      <option key={cat} value={cat}>
                        {cat}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label
                    htmlFor="admin-story-age"
                    className="sub-form-label block text-[#FFE9B0] mb-1.5 pl-1"
                  >
                    Kategori Usia Pembaca
                  </label>
                  <select
                    id="admin-story-age"
                    name="age_category"
                    value={storyForm.age_category}
                    onChange={(e) =>
                      setStoryForm((prev) => ({ ...prev, age_category: e.target.value }))
                    }
                    className="w-full min-h-[50px] px-4 py-2.5 rounded-full bg-white text-[#062D2C] font-bold text-sm sm:text-base border-2 border-transparent focus:border-[#E07030] focus:outline-none"
                  >
                    {ADMIN_AGES.map((age) => (
                      <option key={age} value={age}>
                        {age}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Baris 3: URL Gambar Sampul + Pintasan Preset */}
              <div className="bg-[#062D2C]/85 border border-[#1FAFAA]/50 rounded-[24px] p-4 space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-12 gap-4 items-center">
                  <div className="sm:col-span-3">
                    <div className="w-24 h-24 mx-auto rounded-2xl overflow-hidden border-2 border-[#FFE9B0] bg-[#007A78]">
                      <StoryIllustration
                        variant={storyForm.cover_url}
                        title={storyForm.title}
                        showCoverTitle={false}
                        sizeVariant="sm"
                      />
                    </div>
                  </div>
                  <div className="sm:col-span-9 space-y-2.5">
                    <TextInput
                      id="admin-story-cover"
                      name="cover_url"
                      label="URL Gambar Sampul / Tema Ilustrasi"
                      value={storyForm.cover_url}
                      onChange={(e) =>
                        setStoryForm((prev) => ({ ...prev, cover_url: e.target.value }))
                      }
                      placeholder="/stories/kucing-hutan/cover.webp atau https://..."
                    />

                    <div>
                      <span className="text-xs font-bold text-[#FFE9B0] block mb-1 pl-1">
                        Atau pilih cepat gambar sampul bawaan:
                      </span>
                      <div className="flex flex-wrap gap-1.5">
                        {PRESET_COVER_OPTIONS.map((opt) => (
                          <button
                            key={opt.value}
                            type="button"
                            onClick={() =>
                              setStoryForm((prev) => ({ ...prev, cover_url: opt.value }))
                            }
                            className={`px-2.5 py-1 rounded-full text-xs font-bold cursor-pointer transition-colors ${
                              storyForm.cover_url === opt.value
                                ? 'bg-[#E07030] text-white'
                                : 'bg-white/10 hover:bg-white/20 text-white/90'
                            }`}
                          >
                            {opt.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Baris 4: Sinopsis & Pesan Moral */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label
                    htmlFor="admin-story-synopsis"
                    className="sub-form-label block text-[#FFE9B0] mb-1.5 pl-1"
                  >
                    Sinopsis Cerita
                  </label>
                  <textarea
                    id="admin-story-synopsis"
                    name="synopsis"
                    rows={3}
                    value={storyForm.synopsis}
                    onChange={(e) =>
                      setStoryForm((prev) => ({ ...prev, synopsis: e.target.value }))
                    }
                    placeholder="Ringkasan singkat isi cerita..."
                    className="w-full rounded-[22px] bg-white text-[#062D2C] font-bold text-sm p-3.5 border-2 border-transparent focus:border-[#E07030] focus:outline-none"
                  />
                </div>

                <div>
                  <label
                    htmlFor="admin-story-moral"
                    className="sub-form-label block text-[#FFE9B0] mb-1.5 pl-1"
                  >
                    Pesan Moral Cerita
                  </label>
                  <textarea
                    id="admin-story-moral"
                    name="moral_value"
                    rows={3}
                    value={storyForm.moral_value}
                    onChange={(e) =>
                      setStoryForm((prev) => ({ ...prev, moral_value: e.target.value }))
                    }
                    placeholder="Nilai kebaikan atau pesan moral yang dipetik anak..."
                    className="w-full rounded-[22px] bg-white text-[#062D2C] font-bold text-sm p-3.5 border-2 border-transparent focus:border-[#E07030] focus:outline-none"
                  />
                </div>
              </div>

              {/* Baris 5: Isi Cerita per Halaman / Paragraf */}
              <div className="bg-[#062D2C]/90 border-2 border-[#1FAFAA]/50 rounded-[26px] p-4 sm:p-5 space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <h3 className="font-heading font-extrabold text-lg text-[#FFE9B0]">
                      Isi Cerita per Halaman ({storyForm.pages.length} Halaman)
                    </h3>
                    <p className="sub-help text-white/85">
                      Atur gambar ilustrasi dan paragraf cerita untuk setiap halaman buku.
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={handleAddFormPage}
                    className="min-h-[38px] px-4 py-1.5 rounded-full bg-[#1FAFAA] hover:bg-[#159A95] text-[#052625] font-heading font-extrabold text-xs inline-flex items-center gap-1.5 cursor-pointer"
                  >
                    <Plus className="w-4 h-4" />
                    <span>+ Tambah Halaman</span>
                  </button>
                </div>

                <div className="space-y-3.5 max-h-[320px] overflow-y-auto pr-1">
                  {storyForm.pages.map((p, idx) => (
                    <div
                      key={`form-page-${idx}`}
                      className="bg-[#005E5C] border border-[#1FAFAA]/40 rounded-2xl p-3.5 space-y-2.5"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="px-3 py-0.5 rounded-full bg-[#FFE9B0] text-[#052625] font-heading font-extrabold text-xs">
                          Halaman {idx + 1}
                        </span>
                        {storyForm.pages.length > 1 && (
                          <button
                            type="button"
                            onClick={() => handleRemoveFormPage(idx)}
                            className="px-2.5 py-0.5 rounded-full bg-red-500/20 hover:bg-red-500/40 text-red-200 text-xs font-bold inline-flex items-center gap-1 cursor-pointer"
                          >
                            <Trash2 className="w-3 h-3" />
                            <span>Hapus Hal.</span>
                          </button>
                        )}
                      </div>

                      <TextInput
                        id={`admin-page-img-${idx}`}
                        name={`pageImg_${idx}`}
                        label={`URL Gambar Halaman ${idx + 1}`}
                        value={p.gambar}
                        onChange={(e) =>
                          handlePageFieldChange(idx, 'gambar', e.target.value)
                        }
                        placeholder={storyForm.cover_url || '/stories/kucing-hutan/halaman-1.webp'}
                      />

                      <div>
                        <label
                          htmlFor={`admin-page-text-${idx}`}
                          className="sub-help block text-[#FFE9B0] mb-1 pl-1"
                        >
                          Paragraf / Teks Cerita Halaman {idx + 1} *
                        </label>
                        <textarea
                          id={`admin-page-text-${idx}`}
                          name={`pageText_${idx}`}
                          rows={2}
                          value={p.teks}
                          onChange={(e) =>
                            handlePageFieldChange(idx, 'teks', e.target.value)
                          }
                          placeholder={`Tulis isi cerita untuk halaman ${idx + 1}...`}
                          className="font-story w-full rounded-2xl bg-[#FFE9B0] text-[#042423] font-bold text-sm sm:text-base p-3 border-2 border-transparent focus:border-[#E07030] focus:outline-none"
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Tombol Batal & Simpan Cerita */}
              <div className="pt-2 flex flex-wrap items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setStoryModalOpen(false)}
                  className="min-h-[46px] px-5 py-2 rounded-full bg-white/15 hover:bg-white/25 text-white font-heading font-bold text-sm cursor-pointer"
                >
                  Batal
                </button>

                <button
                  type="submit"
                  disabled={savingStory}
                  className="min-h-[48px] px-7 py-2.5 rounded-full bg-[#E07030] hover:bg-[#C95B1E] text-white border-2 border-[#FFE9B0] font-heading font-extrabold text-sm sm:text-base inline-flex items-center gap-2 shadow-lg cursor-pointer"
                >
                  <Save className="w-4 h-4" />
                  <span>
                    {savingStory
                      ? 'Menyimpan...'
                      : isEditingStory
                      ? 'Simpan Perubahan Cerita'
                      : 'Terbitkan ke Koleksi'}
                  </span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* =====================================================================
          MODAL KONFIRMASI HAPUS CERITA
         ===================================================================== */}
      {confirmDeleteStory && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 bg-black/75 flex items-center justify-center p-4"
        >
          <div className="w-full max-w-md bg-[#005E5C] border-4 border-[#FFE9B0] rounded-[30px] p-6 text-center shadow-2xl">
            <Trash2 className="w-12 h-12 text-[#E07030] mx-auto mb-2" />
            <h3 className="font-heading font-extrabold text-2xl text-[#FFE9B0]">
              Hapus Cerita Ini?
            </h3>
            <p className="sub-section text-white/90 mt-2">
              Apakah Anda yakin ingin menghapus cerita{' '}
              <strong className="text-[#FFE9B0]">
                &ldquo;{confirmDeleteStory.judul || confirmDeleteStory.title}&rdquo;
              </strong>{' '}
              dari katalog koleksi?
            </p>
            <div className="mt-6 flex items-center justify-center gap-3">
              <button
                type="button"
                onClick={() => setConfirmDeleteStory(null)}
                className="min-h-[44px] px-5 py-2 rounded-full bg-white/15 text-white font-bold text-sm cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                disabled={Boolean(deletingStoryId)}
                onClick={handleConfirmDeleteStory}
                className="min-h-[44px] px-6 py-2 rounded-full bg-[#E07030] hover:bg-[#C95B1E] text-white font-heading font-extrabold text-sm cursor-pointer"
              >
                {deletingStoryId ? 'Menghapus...' : 'Ya, Hapus Cerita'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* =====================================================================
          MODAL KONFIRMASI HAPUS KOMENTAR (MODERASI)
         ===================================================================== */}
      {confirmDeleteComment && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 bg-black/75 flex items-center justify-center p-4"
        >
          <div className="w-full max-w-md bg-[#005E5C] border-4 border-[#FFE9B0] rounded-[30px] p-6 text-center shadow-2xl">
            <ShieldCheck className="w-12 h-12 text-[#FFE9B0] mx-auto mb-2" />
            <h3 className="font-heading font-extrabold text-2xl text-[#FFE9B0]">
              Hapus Komentar Ini?
            </h3>
            <p className="sub-section text-white/90 mt-2">
              Komentar dari <strong className="text-[#FFE9B0]">{confirmDeleteComment.author_name}</strong> akan dihapus permanen karena melanggar kebijakan kesantunan BUKUNA.
            </p>
            <div className="mt-6 flex items-center justify-center gap-3">
              <button
                type="button"
                onClick={() => setConfirmDeleteComment(null)}
                className="min-h-[44px] px-5 py-2 rounded-full bg-white/15 text-white font-bold text-sm cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                disabled={Boolean(deletingCommentId)}
                onClick={handleConfirmDeleteComment}
                className="min-h-[44px] px-6 py-2 rounded-full bg-[#E07030] hover:bg-[#C95B1E] text-white font-heading font-extrabold text-sm cursor-pointer"
              >
                {deletingCommentId ? 'Menghapus...' : 'Ya, Hapus Komentar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
