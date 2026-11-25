import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Save,
  CheckCircle2,
  AlertCircle,
  BookOpen,
  Sparkles,
} from 'lucide-react';
import Logo from '../components/Logo';
import Navigation from '../components/Navigation';
import StoryInfoForm from '../components/editor/StoryInfoForm';
import PageList from '../components/editor/PageList';
import PageEditor from '../components/editor/PageEditor';
import StoryPreview from '../components/editor/StoryPreview';
import useAutosave from '../hooks/useAutosave';
import { useBukuna } from '../context/BukunaContext';
import { getStoryById, generateUuid, isValidUuid } from '../services/storyStorage';

const WORKING_DRAFT_KEY = 'bukuna_working_draft_id_v1';

function createInitialStoryState(authorName) {
  const nowId = generateUuid();
  return {
    id: nowId,
    judul: '',
    kategori: 'Petualangan',
    usia: '4-5 Tahun',
    sinopsis: '',
    cover: 'cat-magic-forest',
    coverAlt: '',
    pages: [
      {
        id: `hal-1-${Date.now()}`,
        halaman: 1,
        gambar: '',
        teks: '',
        alt: '',
      },
    ],
    quiz: null,
    status: 'draf',
    penulis: authorName || 'Guru & Orang Tua Bukuna',
    sumber: 'pengguna',
  };
}

/**
 * Halaman Buat Cerita Baru — Wizard 3 Langkah (src/pages/CreateStory.jsx)
 * 1. Info Cerita
 * 2. Halaman Cerita (1-30 halaman, gambar + teks WYSIWYG, tambah/hapus/duplikat/urutkan)
 * 3. Pratinjau & Simpan (Simpan sebagai Draf / Terbitkan)
 */
export default function CreateStory({ editStoryId = null }) {
  const navigate = useNavigate();
  const {
    user,
    createUserStory,
    updateUserStory,
    showToast,
  } = useBukuna();

  const [storyData, setStoryData] = useState(() => {
    if (editStoryId) {
      const existing = getStoryById(editStoryId);
      if (existing) return existing;
    }
    try {
      const savedDraftId = sessionStorage.getItem(WORKING_DRAFT_KEY);
      if (savedDraftId && isValidUuid(savedDraftId)) {
        const draft = getStoryById(savedDraftId);
        if (draft && draft.status === 'draf') {
          return draft;
        }
      } else if (savedDraftId) {
        sessionStorage.removeItem(WORKING_DRAFT_KEY);
      }
    } catch {
      // Abaikan
    }
    return createInitialStoryState(user && user.name);
  });

  const [step, setStep] = useState(1); // 1: Info, 2: Halaman, 3: Pratinjau
  const [activePageIndex, setActivePageIndex] = useState(0);
  const [errors, setErrors] = useState({});
  const [isDirty, setIsDirty] = useState(false);
  const [hasSavedOnce, setHasSavedOnce] = useState(() => Boolean(editStoryId));
  const [showLeaveConfirm, setShowLeaveConfirm] = useState(false);
  const [quotaError, setQuotaError] = useState('');

  // Jika editStoryId berubah, muat ulang data cerita
  useEffect(() => {
    if (editStoryId) {
      const found = getStoryById(editStoryId);
      if (found) {
        setStoryData(found);
        setHasSavedOnce(true);
      }
    }
  }, [editStoryId]);

  const persistStory = useCallback(
    async (dataToSave, options = { silent: false, forceStatus: null }) => {
      const nextStatus = options.forceStatus || dataToSave.status || 'draf';
      const validId = isValidUuid(dataToSave.id) ? dataToSave.id : generateUuid();
      const payload = {
        ...dataToSave,
        id: validId,
        judul: (dataToSave.judul || '').trim() || 'Draf Cerita Baru',
        status: nextStatus,
        penulis: dataToSave.penulis || (user && user.name) || 'Guru & Orang Tua Bukuna',
      };

      try {
        setQuotaError('');
        const exists = getStoryById(payload.id);
        let saved;
        if (exists || hasSavedOnce) {
          saved = await updateUserStory(payload.id, payload);
        } else {
          saved = await createUserStory(payload);
          setHasSavedOnce(true);
        }
        if (saved && saved.id && saved.id !== dataToSave.id) {
          setStoryData((prev) => ({ ...prev, id: saved.id }));
        }
        if (!editStoryId && nextStatus === 'draf' && saved && saved.id) {
          try {
            sessionStorage.setItem(WORKING_DRAFT_KEY, saved.id);
          } catch {
            // Abaikan
          }
        }
        setIsDirty(false);
        return saved;
      } catch (err) {
        setQuotaError(
          (err && err.message) || 'Gagal menyimpan cerita ke database Supabase.'
        );
        throw err;
      }
    },
    [user, hasSavedOnce, updateUserStory, createUserStory, editStoryId]
  );

  // Autosave draf berkala saat pengguna mengetik atau mengubah gambar
  const { lastSavedAt, isSaving, autosaveError } = useAutosave({
    data: storyData,
    isDirty:
      isDirty &&
      Boolean(
        (storyData.judul && storyData.judul.trim()) ||
          storyData.pages.some((p) => p.teks || p.gambar)
      ),
    onSave: (currentData) =>
      persistStory(currentData, {
        silent: true,
        forceStatus: editStoryId ? currentData.status : 'draf',
      }),
    intervalMs: 3000,
    enabled: true,
  });

  const handleFieldChange = (field, value) => {
    setStoryData((prev) => ({
      ...prev,
      [field]: typeof value === 'function' ? value(prev[field]) : value,
    }));
    setIsDirty(true);
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: '' }));
    }
  };

  const handleUpdatePageField = (pageIdx, field, value) => {
    setStoryData((prev) => {
      const nextPages = prev.pages.map((p, idx) =>
        idx === pageIdx ? { ...p, [field]: value } : p
      );
      return { ...prev, pages: nextPages };
    });
    setIsDirty(true);
  };

  const handleAddPage = () => {
    setStoryData((prev) => {
      if (prev.pages.length >= 30) return prev;
      const newPage = {
        id: `hal-${prev.pages.length + 1}-${Date.now()}`,
        halaman: prev.pages.length + 1,
        gambar: '',
        teks: '',
        alt: '',
      };
      const nextPages = [...prev.pages, newPage];
      setActivePageIndex(nextPages.length - 1);
      return { ...prev, pages: nextPages };
    });
    setIsDirty(true);
  };

  const handleDuplicatePage = (pageIdx) => {
    setStoryData((prev) => {
      if (prev.pages.length >= 30) return prev;
      const source = prev.pages[pageIdx];
      if (!source) return prev;
      const copy = {
        ...source,
        id: `hal-dup-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`,
      };
      const nextPages = [
        ...prev.pages.slice(0, pageIdx + 1),
        copy,
        ...prev.pages.slice(pageIdx + 1),
      ].map((p, i) => ({ ...p, halaman: i + 1 }));
      setActivePageIndex(pageIdx + 1);
      return { ...prev, pages: nextPages };
    });
    setIsDirty(true);
    showToast(`Halaman ${pageIdx + 1} berhasil diduplikat.`);
  };

  const handleDeletePage = (pageIdx) => {
    setStoryData((prev) => {
      if (prev.pages.length <= 1) return prev;
      const nextPages = prev.pages
        .filter((_, idx) => idx !== pageIdx)
        .map((p, i) => ({ ...p, halaman: i + 1 }));
      const nextActive = Math.min(activePageIndex, nextPages.length - 1);
      setActivePageIndex(Math.max(0, nextActive));
      return { ...prev, pages: nextPages };
    });
    setIsDirty(true);
    showToast(`Halaman ${pageIdx + 1} telah dihapus.`);
  };

  const handleMovePage = (fromIdx, toIdx) => {
    setStoryData((prev) => {
      if (
        fromIdx < 0 ||
        toIdx < 0 ||
        fromIdx >= prev.pages.length ||
        toIdx >= prev.pages.length
      ) {
        return prev;
      }
      const copy = [...prev.pages];
      const [moved] = copy.splice(fromIdx, 1);
      copy.splice(toIdx, 0, moved);
      const renumbered = copy.map((p, i) => ({ ...p, halaman: i + 1 }));
      setActivePageIndex(toIdx);
      return { ...prev, pages: renumbered };
    });
    setIsDirty(true);
  };

  const validateStep1 = () => {
    const nextErrors = {};
    if (!storyData.judul || !storyData.judul.trim()) {
      nextErrors.judul = 'Judul cerita wajib diisi ya!';
    } else if (storyData.judul.trim().length > 60) {
      nextErrors.judul = 'Judul cerita maksimal 60 karakter.';
    }
    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const goToStep = async (targetStep) => {
    if (targetStep > 1 && !validateStep1()) {
      setStep(1);
      showToast('Isi judul cerita terlebih dahulu ya!');
      return;
    }
    // Autosave saat pindah langkah
    try {
      await persistStory(storyData, {
        silent: true,
        forceStatus: editStoryId ? storyData.status : 'draf',
      });
    } catch {
      // Tetap izinkan pindah langkah meski penyimpanan kuota penuh
    }
    setStep(targetStep);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSaveAsDraft = async () => {
    if (!storyData.judul || !storyData.judul.trim()) {
      setErrors({ judul: 'Judul cerita wajib diisi sebelum menyimpan ya!' });
      setStep(1);
      showToast('Isi judul cerita terlebih dahulu ya!');
      return;
    }
    try {
      await persistStory(storyData, { silent: false, forceStatus: 'draf' });
      try {
        sessionStorage.removeItem(WORKING_DRAFT_KEY);
      } catch {
        // Abaikan
      }
      showToast('Cerita berhasil disimpan sebagai Draf!');
      navigate('/cerita-saya');
    } catch (err) {
      showToast((err && err.message) || 'Gagal menyimpan draf cerita ke Supabase.');
    }
  };

  const handlePublishStory = async () => {
    if (!validateStep1()) {
      setStep(1);
      showToast('Isi judul cerita terlebih dahulu ya!');
      return;
    }
    try {
      await persistStory(storyData, { silent: false, forceStatus: 'terbit' });
      try {
        sessionStorage.removeItem(WORKING_DRAFT_KEY);
      } catch {
        // Abaikan
      }
      showToast('Hore! Ceritamu berhasil diterbitkan!');
      navigate('/cerita-saya');
    } catch (err) {
      showToast((err && err.message) || 'Gagal menerbitkan cerita ke Supabase.');
    }
  };

  const handleBackClick = () => {
    if (isDirty) {
      setShowLeaveConfirm(true);
    } else {
      navigate('/cerita-saya');
    }
  };

  const stepsInfo = [
    { num: 1, label: '1. Info Cerita' },
    { num: 2, label: '2. Halaman Cerita' },
    { num: 3, label: '3. Pratinjau, Kuis & Simpan' },
  ];

  return (
    <div className="bukuna-doodle-bg min-h-screen flex flex-col pb-24 lg:pb-12">
      {/* Header Atas Editor Cerita */}
      <header className="w-full max-w-[1200px] mx-auto px-4 sm:px-6 pt-4 pb-3 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={handleBackClick}
            className="min-h-[44px] px-3.5 py-2 rounded-full bg-[#005E5C]/90 hover:bg-[#1FAFAA] text-white hover:text-[#052625] font-bold text-xs sm:text-sm inline-flex items-center gap-1.5 transition-colors cursor-pointer border border-[#1FAFAA]/50"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Cerita Saya</span>
          </button>

          <Logo size="sm" />
        </div>

        {/* Status Autosave & Tombol Cepat Simpan Draf */}
        <div className="flex items-center gap-2.5">
          <div className=" sub-help hidden sm:flex items-center gap-1.5 text-[#FFE9B0] bg-[#005E5C]/90 px-3 py-1.5 rounded-full border border-[#1FAFAA]/40">
            <CheckCircle2 className="w-3.5 h-3.5 text-[#1FAFAA]" />
            <span>
              {isSaving
                ? 'Menyimpan otomatis...'
                : lastSavedAt
                ? 'Draf tersimpan otomatis'
                : 'Siap menulis cerita'}
            </span>
          </div>

          <button
            type="button"
            onClick={handleSaveAsDraft}
            className="min-h-[44px] px-4 py-2 rounded-full bg-[#1FAFAA] hover:bg-[#159A95] text-[#052625] font-heading font-extrabold text-xs sm:text-sm inline-flex items-center gap-1.5 shadow-md transition-colors cursor-pointer"
          >
            <Save className="w-4 h-4" />
            <span>Simpan Draf</span>
          </button>
        </div>
      </header>

      <main className="flex-1 w-full max-w-[1200px] mx-auto px-4 sm:px-6 pt-2 pb-8">
        {/* Judul Halaman & Stepper 3 Langkah */}
        <div className="mb-6 flex flex-col md:flex-row md:items-center md:justify-between gap-4 bg-[#005E5C]/85 border-2 border-[#1FAFAA]/50 rounded-[28px] p-4 sm:p-5 shadow-xl">
          <div>
            <span className="sub-label inline-flex items-center gap-1.5 uppercase tracking-wider text-[#FFE9B0]">
              <Sparkles className="w-3.5 h-3.5" />
              <span>{editStoryId ? 'Mode Edit Cerita' : 'Buat & Unggah Cerita Sendiri'}</span>
            </span>
            <h1 className="font-heading font-extrabold text-2xl sm:text-3xl text-[#FFE9B0]">
              {storyData.judul && storyData.judul.trim()
                ? storyData.judul
                : editStoryId
                ? 'Edit Cerita Anak'
                : 'Buat Cerita Baru'}
            </h1>
          </div>

          {/* Indikator 3 Langkah Wizard */}
          <div className="flex flex-wrap items-center gap-2">
            {stepsInfo.map((s) => {
              const active = step === s.num;
              const completed = step > s.num;
              return (
                <button
                  key={s.num}
                  type="button"
                  onClick={() => goToStep(s.num)}
                  className={`min-h-[42px] px-4 py-2 rounded-full font-heading font-extrabold text-xs sm:text-sm transition-all cursor-pointer border-2 ${
                    active
                      ? 'bg-[#E07030] border-[#FFE9B0] text-white shadow-md'
                      : completed
                      ? 'bg-[#1FAFAA] border-transparent text-[#052625]'
                      : 'bg-[#062D2C]/80 border-white/20 text-white/85 hover:text-white'
                  }`}
                >
                  {s.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Pesan Error Kuota Penyimpanan jika ada */}
        {(quotaError || autosaveError) && (
          <div
            role="alert"
            className="mb-5 rounded-2xl bg-red-500/20 border-2 border-red-300 px-4 py-3 text-sm font-bold text-white flex items-center gap-2.5"
          >
            <AlertCircle className="w-5 h-5 text-[#FFE9B0] shrink-0" />
            <span>{quotaError || autosaveError}</span>
          </div>
        )}

        {/* Konten Langkah 1: Info Cerita */}
        {step === 1 && (
          <StoryInfoForm
            storyData={storyData}
            onChangeField={handleFieldChange}
            errors={errors}
            onNextStep={() => goToStep(2)}
          />
        )}

        {/* Konten Langkah 2: Halaman Cerita (Daftar Halaman di Kiri + Editor Halaman di Kanan) */}
        {step === 2 && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            <div className="lg:col-span-4">
              <PageList
                pages={storyData.pages}
                activePageIndex={activePageIndex}
                storyCover={storyData.cover}
                onSelectPage={(idx) => setActivePageIndex(idx)}
                onAddPage={handleAddPage}
                onDuplicatePage={handleDuplicatePage}
                onDeletePage={handleDeletePage}
                onMovePage={handleMovePage}
              />
            </div>

            <div className="lg:col-span-8">
              <PageEditor
                page={storyData.pages[activePageIndex] || storyData.pages[0]}
                pageIndex={activePageIndex}
                totalPages={storyData.pages.length}
                storyTitle={storyData.judul}
                onUpdatePageField={handleUpdatePageField}
                onSelectPage={(idx) => setActivePageIndex(idx)}
                onAddPage={handleAddPage}
                onPrevStep={() => goToStep(1)}
                onNextStep={() => goToStep(3)}
              />
            </div>
          </div>
        )}

        {/* Konten Langkah 3: Pratinjau, Kuis & Simpan */}
        {step === 3 && (
          <StoryPreview
            storyData={storyData}
            onChangeQuiz={(nextQuiz) => handleFieldChange('quiz', nextQuiz)}
            onNotify={showToast}
            onPrevStep={() => goToStep(2)}
            onSaveDraft={handleSaveAsDraft}
            onPublish={handlePublishStory}
            isSaving={isSaving}
          />
        )}
      </main>

      {/* Dialog Konfirmasi Keluar Jika Belum Disimpan */}
      {showLeaveConfirm && (
        <div className="fixed inset-0 z-50 bg-black/45 flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-[#005E5C] border-4 border-[#FFE9B0] rounded-[30px] p-6 shadow-2xl text-center">
            <BookOpen className="w-12 h-12 text-[#FFE9B0] mx-auto mb-2" />
            <h3 className="font-heading font-extrabold text-2xl text-[#FFE9B0]">
              Simpan Perubahan Dulu?
            </h3>
            <p className="mt-2 text-sm font-semibold text-white/90">
              Kamu memiliki perubahan cerita yang belum disimpan. Ingin menyimpannya sebagai draf sebelum keluar?
            </p>
            <div className="mt-5 flex flex-col sm:flex-row items-center justify-center gap-2.5">
              <button
                type="button"
                onClick={() => setShowLeaveConfirm(false)}
                className="w-full sm:w-auto min-h-[44px] px-4 py-2 rounded-full bg-white/15 text-white font-bold text-xs sm:text-sm cursor-pointer"
              >
                Lanjut Menulis
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowLeaveConfirm(false);
                  navigate('/cerita-saya');
                }}
                className="w-full sm:w-auto min-h-[44px] px-4 py-2 rounded-full bg-red-500/20 border border-red-300 text-red-300 font-bold text-xs sm:text-sm cursor-pointer"
              >
                Keluar Tanpa Simpan
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowLeaveConfirm(false);
                  handleSaveAsDraft();
                }}
                className="w-full sm:w-auto min-h-[44px] px-5 py-2 rounded-full bg-[#E07030] text-white font-heading font-extrabold text-xs sm:text-sm cursor-pointer"
              >
                Simpan Draf
              </button>
            </div>
          </div>
        </div>
      )}

      <Navigation />
    </div>
  );
}

