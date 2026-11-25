import React, { useState, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Plus,
  Edit3,
  Trash2,
  Eye,
  Download,
  FileUp,
  Send,
  Sparkles,
  AlertCircle,
  BookOpen,
  ArrowLeft,
} from 'lucide-react';
import Header from '../components/Header';
import Navigation from '../components/Navigation';
import StoryIllustration from '../components/StoryIllustration';
import ColorfulTitle from '../components/ColorfulTitle';
import { useBukuna } from '../context/BukunaContext';

/**
 * Halaman Cerita Saya (/cerita-saya) (src/pages/MyStories.jsx)
 * - Daftar cerita buatan pengguna dengan badge "Draf" / "Terbit"
 * - Tombol Edit, Hapus (dengan konfirmasi & pembersihan Blob IndexedDB), Lihat, Ekspor (.json), dan Impor (.json)
 * - Empty state ramah: "Ayo buat cerita pertamamu!"
 */
export default function MyStories() {
  const navigate = useNavigate();
  const importInputRef = useRef(null);
  const {
    myStories,
    updateUserStory,
    deleteUserStory,
    exportUserStory,
    importUserStory,
    showToast,
  } = useBukuna();

  const [filterStatus, setFilterStatus] = useState('semua'); // 'semua' | 'terbit' | 'draf'
  const [confirmDeleteId, setConfirmDeleteId] = useState(null);
  const [importError, setImportError] = useState('');
  const [busyId, setBusyId] = useState(null);

  const filteredStories = myStories.filter((s) => {
    if (filterStatus === 'terbit') return s.status === 'terbit';
    if (filterStatus === 'draf') return s.status === 'draf';
    return true;
  });

  const handleStartNewStory = () => {
    try {
      sessionStorage.removeItem('bukuna_working_draft_id_v1');
    } catch {
      // Abaikan
    }
    navigate('/cerita/buat');
  };

  const handleToggleStatus = async (story) => {
    const nextStatus = story.status === 'terbit' ? 'draf' : 'terbit';
    setBusyId(story.id);
    try {
      await updateUserStory(story.id, { ...story, status: nextStatus });
      showToast(
        nextStatus === 'terbit'
          ? `"${story.judul}" berhasil diterbitkan!`
          : `"${story.judul}" dikembalikan ke Draf.`
      );
    } catch {
      showToast('Gagal mengubah status cerita.');
    } finally {
      setBusyId(null);
    }
  };

  const handleExportJson = async (story) => {
    setBusyId(story.id);
    try {
      const jsonStr = await exportUserStory(story.id);
      window.__LAST_EXPORTED_STORY_JSON__ = jsonStr;
      const blob = new Blob([jsonStr], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      const safeSlug = (story.judul || 'cerita-bukuna')
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '');
      a.href = url;
      a.download = `${safeSlug || 'cerita'}.bukuna.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(() => {
        try {
          URL.revokeObjectURL(url);
        } catch {
          // Abaikan
        }
      }, 1500);
      showToast(`File cadangan "${story.judul}.json" berhasil diunduh!`);
    } catch (err) {
      showToast((err && err.message) || 'Gagal mengekspor cerita ke JSON.');
    } finally {
      setBusyId(null);
    }
  };

  const handleImportFileChange = async (e) => {
    const file = e.target.files && e.target.files[0];
    e.target.value = '';
    if (!file) return;

    setImportError('');
    try {
      const text = await file.text();
      const imported = await importUserStory(text);
      showToast(`Cerita "${imported.judul}" berhasil diimpor!`);
    } catch (err) {
      setImportError(
        (err && err.message) ||
          'Gagal mengimpor file cerita. Pastikan memilih file .json ekspor BUKUNA yang valid.'
      );
    }
  };

  const handleConfirmDelete = async (id) => {
    setConfirmDeleteId(null);
    setBusyId(id);
    try {
      await deleteUserStory(id);
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="bukuna-doodle-bg min-h-screen flex flex-col pb-24 lg:pb-12">
      <Header />

      <main className="flex-1 w-full max-w-[1200px] mx-auto px-4 sm:px-6 pt-3 pb-8">
        {/* Baris Judul, Tombol + Buat Cerita, & Impor Cerita (.json) */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6 bg-[#005E5C]/90 border-2 border-[#1FAFAA]/50 rounded-[30px] p-5 sm:p-6 shadow-xl">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Link
                to="/akun"
                className="sub-label text-[#FFE9B0] hover:underline inline-flex items-center gap-1"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Kembali ke Akun</span>
              </Link>
              <span className="text-white/40">•</span>
              <span className="sub-label text-white/85">
                Total {myStories.length} Cerita
              </span>
            </div>
            <ColorfulTitle
              as="h1"
              text="Cerita Saya"
              className="font-heading font-extrabold text-2xl sm:text-3xl text-[#FFE9B0]"
            />
            <p className="sub-section text-white/90 mt-0.5">
              Kelola cerita anak buatanmu, simpan draf, terbitkan, atau cadangkan ke file (.json).
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <input
              ref={importInputRef}
              id="import-story-json-input"
              name="importStoryJson"
              type="file"
              accept=".json,application/json"
              onChange={handleImportFileChange}
              className="hidden"
            />

            <button
              type="button"
              onClick={() => importInputRef.current && importInputRef.current.click()}
              className="min-h-[46px] px-4 py-2.5 rounded-full bg-[#1FAFAA] hover:bg-[#159A95] text-[#052625] font-heading font-extrabold text-xs sm:text-sm inline-flex items-center gap-2 shadow-md transition-all cursor-pointer"
            >
              <FileUp className="w-4 h-4" />
              <span>Impor Cerita (.json)</span>
            </button>

            <button
              type="button"
              onClick={handleStartNewStory}
              className="min-h-[46px] px-5 py-2.5 rounded-full bg-[#E07030] hover:bg-[#C95B1E] text-white font-heading font-extrabold text-xs sm:text-sm inline-flex items-center gap-2 shadow-lg transition-all cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>+ Buat Cerita</span>
            </button>
          </div>
        </div>

        {/* Pesan Error Impor jika ada */}
        {importError && (
          <div
            role="alert"
            className="mb-5 rounded-2xl bg-red-500/20 border-2 border-red-300 px-4 py-3 text-xs sm:text-sm font-bold text-white flex items-center gap-2"
          >
            <AlertCircle className="w-5 h-5 text-[#FFE9B0] shrink-0" />
            <span>{importError}</span>
          </div>
        )}

        {/* Filter Tab Semua / Terbit / Draf */}
        {myStories.length > 0 && (
          <div className="flex flex-wrap items-center gap-2 mb-5">
            {[
              { id: 'semua', label: `Semua (${myStories.length})` },
              {
                id: 'terbit',
                label: `Terbit (${myStories.filter((s) => s.status === 'terbit').length})`,
              },
              {
                id: 'draf',
                label: `Draf (${myStories.filter((s) => s.status === 'draf').length})`,
              },
            ].map((tab) => {
              const active = filterStatus === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setFilterStatus(tab.id)}
                  className={`min-h-[40px] px-4 py-1.5 rounded-full font-heading font-extrabold text-xs sm:text-sm transition-all cursor-pointer border-2 ${
                    active
                      ? 'bg-[#E07030] border-[#FFE9B0] text-white shadow-sm'
                      : 'bg-[#005E5C]/80 border-white/20 text-white hover:bg-white/15'
                  }`}
                >
                  {tab.label}
                </button>
              );
            })}
          </div>
        )}

        {/* Daftar Kartu Cerita Saya atau Empty State */}
        {filteredStories.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {filteredStories.map((story) => {
              const isPublished = story.status === 'terbit';
              const isConfirming = confirmDeleteId === story.id;
              const pageCount = Array.isArray(story.pages) ? story.pages.length : 1;

              return (
                <article
                  key={story.id}
                  className="bg-[#005E5C]/90 border-2 border-[#1FAFAA]/50 rounded-[28px] overflow-hidden shadow-xl flex flex-col justify-between"
                >
                  <div>
                    {/* Sampul & Badge Status Draf / Terbit */}
                    <div className="relative aspect-[4/3.6] w-full bg-[#007A78] overflow-hidden">
                      <StoryIllustration
                        variant={story.cover || 'cat-magic-forest'}
                        title={story.judul}
                        alt={story.coverAlt || story.judul}
                        showCoverTitle={false}
                        className="w-full h-full"
                      />

                      <div className="absolute top-3 left-3 right-3 flex items-center justify-between gap-2">
                        <div className="flex items-center gap-1.5">
                          <span
                            className={`sub-chip px-3 py-1 rounded-full shadow-md ${
                              isPublished
                                ? 'bg-[#1FAFAA] text-[#052625] border border-[#FFE9B0]'
                                : 'bg-[#062D2C]/90 text-[#FFE9B0] border border-[#FFE9B0]/60'
                            }`}
                          >
                            {isPublished ? 'Terbit' : 'Draf'}
                          </span>

                          {story.quiz &&
                            Array.isArray(story.quiz.questions) &&
                            story.quiz.questions.length > 0 && (
                              <span className="sub-chip px-2.5 py-1 rounded-full bg-[#FFE9B0] text-[#052625] shadow-md">
                                🎯 {story.quiz.questions.length} Soal Kuis
                              </span>
                            )}
                        </div>

                        <span className="sub-chip px-3 py-1 rounded-full bg-[#E07030] text-white shadow-md">
                          Buatanku
                        </span>
                      </div>
                    </div>

                    {/* Informasi Cerita */}
                    <div className="p-4 sm:p-5">
                      <h2 className="font-heading font-extrabold text-xl text-[#FFE9B0] line-clamp-1">
                        {story.judul}
                      </h2>
                      <p className="sub-label mt-1 text-white/85">
                        {story.kategori} • {story.usia} • {pageCount} Halaman
                      </p>
                      {story.sinopsis && (
                        <p className="sub-section mt-2 text-white/90 line-clamp-2">
                          {story.sinopsis}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Baris Tombol Aksi: Lihat, Edit, Main Kuis (jika ada), Terbitkan/Draf, Ekspor (.json), Hapus */}
                  <div className="p-4 sm:p-5 pt-0 flex flex-col gap-2.5">
                    <div
                      className={`grid gap-2 ${
                        story.quiz &&
                        Array.isArray(story.quiz.questions) &&
                        story.quiz.questions.length > 0
                          ? 'grid-cols-3'
                          : 'grid-cols-2'
                      }`}
                    >
                      <Link
                        to={`/cerita/${story.id}`}
                        className="min-h-[42px] px-3 py-2 rounded-full bg-[#1FAFAA] hover:bg-[#159A95] text-[#052625] font-heading font-extrabold text-xs sm:text-sm flex items-center justify-center gap-1.5 shadow-sm transition-colors"
                      >
                        <Eye className="w-4 h-4" />
                        <span>Lihat</span>
                      </Link>

                      <Link
                        to={`/cerita/${story.id}/edit`}
                        className="min-h-[42px] px-3 py-2 rounded-full bg-[#E07030] hover:bg-[#C95B1E] text-white font-heading font-extrabold text-xs sm:text-sm flex items-center justify-center gap-1.5 shadow-sm transition-colors"
                      >
                        <Edit3 className="w-4 h-4" />
                        <span>Edit</span>
                      </Link>

                      {story.quiz &&
                        Array.isArray(story.quiz.questions) &&
                        story.quiz.questions.length > 0 && (
                          <Link
                            to={`/kuis/${story.id}`}
                            className="min-h-[42px] px-3 py-2 rounded-full bg-[#FFE9B0] hover:bg-white text-[#052625] font-heading font-extrabold text-xs sm:text-sm flex items-center justify-center gap-1 shadow-sm transition-colors"
                          >
                            <span>🎯 Kuis</span>
                          </Link>
                        )}
                    </div>

                    <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
                      <button
                        type="button"
                        onClick={() => handleToggleStatus(story)}
                        disabled={busyId === story.id}
                        className="min-h-[38px] px-3 py-1.5 rounded-full bg-white/15 hover:bg-white/25 text-[#FFE9B0] font-bold text-xs inline-flex items-center gap-1.5 transition-colors cursor-pointer"
                      >
                        <Send className="w-3.5 h-3.5" />
                        <span>{isPublished ? 'Ubah ke Draf' : 'Terbitkan'}</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleExportJson(story)}
                        disabled={busyId === story.id}
                        title="Unduh cadangan cerita (.json)"
                        className="min-h-[38px] px-3 py-1.5 rounded-full bg-white/15 hover:bg-white/25 text-white font-bold text-xs inline-flex items-center gap-1.5 transition-colors cursor-pointer"
                      >
                        <Download className="w-3.5 h-3.5" />
                        <span>Ekspor (.json)</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setConfirmDeleteId(story.id)}
                        disabled={busyId === story.id}
                        aria-label={`Hapus cerita ${story.judul}`}
                        className="min-h-[38px] px-3 py-1.5 rounded-full bg-red-500/20 hover:bg-red-500/35 text-red-300 font-bold text-xs inline-flex items-center gap-1 transition-colors cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>Hapus</span>
                      </button>
                    </div>

                    {/* Dialog Konfirmasi Hapus Cerita */}
                    {isConfirming && (
                      <div className="mt-2 rounded-2xl bg-[#062D2C] border-2 border-red-300 p-3 text-left">
                        <p className="text-xs font-bold text-white">
                          Yakin ingin menghapus cerita{' '}
                          <span className="text-[#FFE9B0]">&ldquo;{story.judul}&rdquo;</span> beserta seluruh gambarnya?
                        </p>
                        <div className="mt-2.5 flex items-center justify-end gap-2">
                          <button
                            type="button"
                            onClick={() => setConfirmDeleteId(null)}
                            className="px-3 py-1.5 rounded-full bg-white/15 text-white text-xs font-bold cursor-pointer"
                          >
                            Batal
                          </button>
                          <button
                            type="button"
                            onClick={() => handleConfirmDelete(story.id)}
                            className="px-3.5 py-1.5 rounded-full bg-[#E07030] text-white text-xs font-extrabold cursor-pointer"
                          >
                            Ya, Hapus Permanen
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </article>
              );
            })}
          </div>
        ) : (
          /* Empty State "Ayo buat cerita pertamamu!" */
          <div className="bg-[#005E5C]/90 border-2 border-[#1FAFAA]/50 rounded-[32px] p-8 sm:p-12 text-center shadow-2xl max-w-xl mx-auto my-6">
            <div className="w-20 h-20 rounded-full bg-[#1FAFAA]/25 border-2 border-[#FFE9B0] flex items-center justify-center mx-auto mb-4">
              <Sparkles className="w-10 h-10 text-[#FFE9B0]" />
            </div>
            <h2 className="font-heading font-extrabold text-2xl sm:text-3xl text-[#FFE9B0]">
              Ayo buat cerita pertamamu!
            </h2>
            <p className="sub-section mt-2 text-white/90">
              Ibu/Bapak Guru dan Orang Tua dapat menulis buku cerita bergambar sendiri sesuai tema belajar dan imajinasi anak-anak.
            </p>
            <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
              <button
                type="button"
                onClick={handleStartNewStory}
                className="min-h-[50px] px-7 py-3 rounded-full bg-[#E07030] hover:bg-[#C95B1E] text-white font-heading font-extrabold text-base sm:text-lg shadow-lg inline-flex items-center gap-2 transition-all cursor-pointer"
              >
                <BookOpen className="w-5 h-5" />
                <span>+ Buat Cerita Sekarang</span>
              </button>

              <button
                type="button"
                onClick={() => importInputRef.current && importInputRef.current.click()}
                className="min-h-[50px] px-6 py-3 rounded-full bg-[#1FAFAA] hover:bg-[#159A95] text-[#052625] font-heading font-extrabold text-sm sm:text-base shadow-md inline-flex items-center gap-2 transition-all cursor-pointer"
              >
                <FileUp className="w-5 h-5" />
                <span>Impor File Cerita (.json)</span>
              </button>
            </div>
          </div>
        )}
      </main>

      <Navigation />
    </div>
  );
}
