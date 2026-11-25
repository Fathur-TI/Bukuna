import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Link } from 'react-router-dom';
import {
  Star,
  Send,
  Trash2,
  ShieldCheck,
  LogIn,
  Sparkles,
  User,
  AlertCircle,
  RotateCcw,
  X,
} from 'lucide-react';
import ColorfulTitle from './ColorfulTitle';
import { useBukuna } from '../context/BukunaContext';
import {
  fetchStoryComments,
  addStoryComment,
  deleteStoryComment,
} from '../services/commentService';

function formatReviewDate(isoStr) {
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

/**
 * Komponen Interaktif "Catatan & Ulasan Orang Tua" (/src/components/ParentReviewsSection.jsx)
 * - Ditempatkan eksklusif di bagian paling bawah halaman Detail Cerita & Halaman Membaca
 *   (setelah konten utama cerita selesai) agar tidak mengganggu fokus membaca anak.
 * - Terintegrasi dengan tabel `story_comments` (termasuk kolom `parent_id` untuk fitur Reply)
 *   dan join ke `profiles` di Supabase.
 * - Struktur Data & Tampilan Balasan:
 *   • Ulasan utama (`parent_id === null`) diurutkan dari yang terbaru (`created_at` descending).
 *   • Komentar balasan (`parent_id !== null`) ditampilkan menjorok ke dalam (indented) tepat di bawah
 *     kartu ulasan utama yang dibalas, diurutkan dari balasan terlama ke terbaru (`created_at` ascending).
 * - Interaksi Balas Komentar:
 *   • Tombol "Balas" pada setiap kartu ulasan utama (hanya muncul jika user sudah login).
 *   • Form input balasan ringkas di bawah ulasan tersebut (tanpa rating bintang) disertai pengingat bahasa santun.
 *   • Tombol "Hapus" pada ulasan utama maupun balasan milik user yang sedang login (`user.id === item.user_id`).
 */
export default function ParentReviewsSection({ storyId, storyTitle = '' }) {
  const { user, showToast } = useBukuna();

  const [comments, setComments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [rating, setRating] = useState(5);
  const [hoverRating, setHoverRating] = useState(0);
  const [commentText, setCommentText] = useState('');
  const [formError, setFormError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [deletingId, setDeletingId] = useState(null);

  // State untuk Balas Komentar (Reply)
  const [activeReplyParentId, setActiveReplyParentId] = useState(null);
  const [replyText, setReplyText] = useState('');
  const [replyError, setReplyError] = useState('');
  const [submittingReply, setSubmittingReply] = useState(false);

  const loadComments = useCallback(async () => {
    if (!storyId) return;
    setLoading(true);
    try {
      const res = await fetchStoryComments(storyId);
      if (res && Array.isArray(res.comments)) {
        setComments(res.comments);
      }
    } finally {
      setLoading(false);
    }
  }, [storyId]);

  useEffect(() => {
    loadComments();
    setActiveReplyParentId(null);
    setReplyText('');
    setReplyError('');
  }, [loadComments]);

  // Pisahkan ulasan utama (parent_id === null) dan kelompokkan balasan (parent_id !== null)
  const { topLevelReviews, repliesByParentMap } = useMemo(() => {
    const topLevel = [];
    const replyMap = {};

    (comments || []).forEach((item) => {
      if (!item) return;
      if (!item.parent_id) {
        topLevel.push(item);
      } else {
        const pid = String(item.parent_id);
        if (!replyMap[pid]) {
          replyMap[pid] = [];
        }
        replyMap[pid].push(item);
      }
    });

    // Ulasan utama: urutkan dari terbaru ke terlama (created_at descending)
    topLevel.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

    // Balasan komentar: urutkan dari terlama ke terbaru (created_at ascending)
    Object.keys(replyMap).forEach((pid) => {
      replyMap[pid].sort(
        (a, b) => new Date(a.created_at) - new Date(b.created_at)
      );
    });

    return {
      topLevelReviews: topLevel,
      repliesByParentMap: replyMap,
    };
  }, [comments]);

  const handleSubmitReview = async (e) => {
    e.preventDefault();
    setFormError('');

    if (!user || !user.id) {
      setFormError('Silakan masuk terlebih dahulu untuk mengirim ulasan.');
      return;
    }

    const trimmed = commentText.trim();
    if (trimmed.length < 3) {
      setFormError('Mohon tulis catatan atau kesan membaca minimal 3 karakter.');
      return;
    }

    setSubmitting(true);

    // Optimistic entry untuk ulasan utama
    const authorName =
      user.nama_akun || user.nama || user.name || 'Orang Tua / Guru Bukuna';
    const tempId = `temp-${Date.now()}`;
    const optimisticEntry = {
      id: tempId,
      story_id: storyId,
      user_id: user.id,
      parent_id: null,
      rating,
      comment: trimmed,
      created_at: new Date().toISOString(),
      author_name: authorName,
      author_role: user.peran || 'guru',
    };

    setComments((prev) => [optimisticEntry, ...prev]);
    setCommentText('');

    try {
      const res = await addStoryComment({
        storyId,
        user,
        rating,
        comment: trimmed,
        parentId: null,
      });

      if (!res || !res.ok) {
        setComments((prev) => prev.filter((item) => item.id !== tempId));
        setCommentText(trimmed);
        setFormError(
          (res && res.error) || 'Gagal mengirim ulasan. Silakan coba kembali.'
        );
        return;
      }

      if (res.comment) {
        setComments((prev) =>
          prev.map((item) => (item.id === tempId ? res.comment : item))
        );
      }
      setRating(5);
      if (showToast) {
        showToast('Terima kasih! Catatan & ulasan Anda berhasil ditambahkan.');
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleOpenReplyForm = (parentId) => {
    if (activeReplyParentId === parentId) {
      setActiveReplyParentId(null);
      setReplyText('');
      setReplyError('');
    } else {
      setActiveReplyParentId(parentId);
      setReplyText('');
      setReplyError('');
    }
  };

  const handleSubmitReply = async (e, parentComment) => {
    e.preventDefault();
    setReplyError('');

    if (!user || !user.id) {
      setReplyError('Silakan masuk terlebih dahulu untuk membalas komentar.');
      return;
    }

    if (!parentComment || !parentComment.id) return;

    const trimmed = replyText.trim();
    if (trimmed.length < 2) {
      setReplyError('Mohon tulis balasan komentar minimal 2 karakter.');
      return;
    }

    setSubmittingReply(true);

    // Optimistic entry untuk balasan komentar
    const authorName =
      user.nama_akun || user.nama || user.name || 'Orang Tua / Guru Bukuna';
    const tempReplyId = `temp-reply-${Date.now()}`;
    const optimisticReply = {
      id: tempReplyId,
      story_id: storyId,
      user_id: user.id,
      parent_id: parentComment.id,
      rating: null,
      comment: trimmed,
      created_at: new Date().toISOString(),
      author_name: authorName,
      author_role: user.peran || 'guru',
    };

    setComments((prev) => [...prev, optimisticReply]);
    setReplyText('');
    setActiveReplyParentId(null);

    try {
      const res = await addStoryComment({
        storyId,
        user,
        rating: null,
        comment: trimmed,
        parentId: parentComment.id,
      });

      if (!res || !res.ok) {
        setComments((prev) => prev.filter((item) => item.id !== tempReplyId));
        setActiveReplyParentId(parentComment.id);
        setReplyText(trimmed);
        setReplyError(
          (res && res.error) || 'Gagal mengirim balasan komentar. Silakan coba lagi.'
        );
        return;
      }

      if (res.comment) {
        setComments((prev) =>
          prev.map((item) => (item.id === tempReplyId ? res.comment : item))
        );
      }

      if (showToast) {
        showToast('Balasan komentar Anda berhasil dikirim!');
      }
    } finally {
      setSubmittingReply(false);
    }
  };

  const handleDeleteCommentOrReply = async (targetItem) => {
    if (!user || !targetItem || String(user.id) !== String(targetItem.user_id)) {
      return;
    }

    const targetId = targetItem.id;
    const isParentReview = !targetItem.parent_id;
    setDeletingId(targetId);

    // Optimistic removal: hapus item tersebut (dan seluruh balasannya jika yang dihapus adalah ulasan utama)
    const previousList = comments;
    setComments((prev) =>
      prev.filter(
        (c) =>
          c.id !== targetId &&
          !(isParentReview && String(c.parent_id) === String(targetId))
      )
    );

    try {
      const res = await deleteStoryComment({
        commentId: targetId,
        userId: user.id,
      });

      if (!res || !res.ok) {
        setComments(previousList);
        if (showToast) {
          showToast((res && res.error) || 'Gagal menghapus komentar.');
        }
        return;
      }

      if (showToast) {
        showToast(
          isParentReview
            ? 'Catatan ulasan Anda telah dihapus.'
            : 'Balasan komentar Anda telah dihapus.'
        );
      }
    } finally {
      setDeletingId(null);
    }
  };

  // Rata-rata rating dihitung hanya dari ulasan utama (parent_id === null)
  const averageRating =
    topLevelReviews.length > 0
      ? (
          topLevelReviews.reduce(
            (acc, item) => acc + (Number(item.rating) || 5),
            0
          ) / topLevelReviews.length
        ).toFixed(1)
      : null;

  return (
    <section
      aria-labelledby="catatan-ulasan-ortu-heading"
      className="w-full mt-8 bg-[#005E5C]/85 backdrop-blur-md border-2 border-[#1FAFAA]/50 rounded-[32px] p-5 sm:p-8 shadow-2xl text-white"
    >
      {/* Header Bagian Catatan & Ulasan Orang Tua */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-5 border-b border-white/15">
        <div>
          <span className="sub-chip inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full bg-[#E07030] text-white uppercase tracking-wider mb-2 shadow-sm">
            <ShieldCheck className="w-4 h-4" />
            <span>Ruang Diskusi Pendamping Dewasa</span>
          </span>
          <ColorfulTitle
            as="h2"
            id="catatan-ulasan-ortu-heading"
            text="Catatan & Ulasan Orang Tua"
            className="font-heading font-extrabold text-2xl sm:text-3xl text-[#FFE9B0]"
          />
          <p className="sub-section text-white/90 mt-0.5">
            Bagikan pesan moral, pengalaman, atau kesan saat membacakan cerita{' '}
            {storyTitle ? (
              <strong className="text-[#FFE9B0]">&ldquo;{storyTitle}&rdquo;</strong>
            ) : (
              'ini'
            )}{' '}
            bersama anak.
          </p>
        </div>

        {/* Ringkasan Rating & Jumlah Ulasan Utama */}
        <div className="flex items-center gap-3 self-start sm:self-center bg-[#062D2C]/90 border border-[#1FAFAA]/50 px-4 py-2.5 rounded-2xl shrink-0">
          <div className="w-10 h-10 rounded-xl bg-[#FFE9B0] text-[#062D2C] flex items-center justify-center font-heading font-extrabold text-lg shadow-inner">
            ★
          </div>
          <div>
            <div className="font-heading font-extrabold text-lg text-[#FFE9B0] leading-none">
              {averageRating ? `${averageRating} / 5.0` : 'Belum Ada Rating'}
            </div>
            <span className="sub-help text-white/80">
              {topLevelReviews.length} Ulasan Orang Tua &amp; Guru
            </span>
          </div>
        </div>
      </div>

      {/* KONTROL AKSES: FORMULIR INPUT UTAMA (Jika sudah login) ATAU AJAKAN LOGIN (Jika belum login) */}
      <div className="mt-6">
        {user ? (
          <form
            onSubmit={handleSubmitReview}
            noValidate
            className="bg-[#062D2C]/85 border-2 border-[#1FAFAA]/50 rounded-[26px] p-4 sm:p-6 space-y-4 shadow-xl"
          >
            {/* Baris Info Penulis & Pemilih Rating Bintang (1-5) */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-full bg-[#1FAFAA] text-[#052625] flex items-center justify-center font-heading font-extrabold">
                  <User className="w-5 h-5" />
                </div>
                <div>
                  <span className="font-heading font-extrabold text-sm sm:text-base text-[#FFE9B0] block leading-tight">
                    {user.nama_akun || user.nama || user.name || 'Orang Tua / Guru'}
                  </span>
                  <span className="text-xs font-bold text-white/75">
                    Menulis sebagai Pendamping ({user.peran || 'guru'})
                  </span>
                </div>
              </div>

              {/* Pemilih Rating 1-5 Bintang */}
              <div className="flex items-center gap-2 bg-[#005E5C] px-3.5 py-2 rounded-full border border-[#1FAFAA]/40 self-start sm:self-auto">
                <span className="sub-help text-[#FFE9B0] mr-1">Rating:</span>
                <div
                  role="radiogroup"
                  aria-label="Pilih rating bintang 1 sampai 5"
                  className="flex items-center gap-1"
                >
                  {[1, 2, 3, 4, 5].map((starValue) => {
                    const active = (hoverRating || rating) >= starValue;
                    return (
                      <button
                        key={starValue}
                        type="button"
                        onClick={() => setRating(starValue)}
                        onMouseEnter={() => setHoverRating(starValue)}
                        onMouseLeave={() => setHoverRating(0)}
                        aria-label={`Beri ${starValue} bintang`}
                        aria-checked={rating === starValue}
                        role="radio"
                        className="w-8 h-8 rounded-full flex items-center justify-center transition-transform hover:scale-110 cursor-pointer"
                      >
                        <Star
                          className={`w-6 h-6 transition-colors ${
                            active
                              ? 'fill-[#FFE9B0] text-[#FFE9B0]'
                              : 'text-white/35'
                          }`}
                        />
                      </button>
                    );
                  })}
                </div>
                <span className="ml-1 px-2 py-0.5 rounded-full bg-[#E07030] text-white text-xs font-extrabold">
                  {rating}/5
                </span>
              </div>
            </div>

            {/* Pengingat Kebijakan Kecil di Atas Kolom Ketik */}
            <div className="rounded-2xl bg-[#005E5C]/90 border border-[#FFE9B0]/40 p-3 flex items-start gap-2.5">
              <ShieldCheck className="w-5 h-5 text-[#FFE9B0] shrink-0 mt-0.5" />
              <p className="sub-help text-white/95">
                Gunakan bahasa yang santun dan positif untuk membagikan pesan moral atau kesan membaca bersama anak.
              </p>
            </div>

            {formError && (
              <div
                role="alert"
                className="rounded-2xl bg-red-500/20 border-2 border-red-300 px-4 py-2.5 text-xs sm:text-sm font-bold text-white flex items-center gap-2"
              >
                <AlertCircle className="w-4 h-4 text-[#FFE9B0] shrink-0" />
                <span>{formError}</span>
              </div>
            )}

            {/* Kolom Teks Ulasan */}
            <div>
              <label
                htmlFor={`parent-review-textarea-${storyId}`}
                className="sub-form-label block text-[#FFE9B0] mb-1.5 pl-1"
              >
                Tulis Catatan atau Ulasan Orang Tua
              </label>
              <textarea
                id={`parent-review-textarea-${storyId}`}
                name="parentReviewComment"
                rows={3}
                maxLength={1000}
                value={commentText}
                onChange={(e) => setCommentText(e.target.value)}
                placeholder="Contoh: Anak saya senang sekali dengan tokohnya. Kami berdiskusi tentang pentingnya sikap jujur dan berani menolong teman..."
                className="w-full rounded-[22px] bg-white text-[#062D2C] placeholder:text-slate-400 font-bold text-sm sm:text-base p-4 border-4 border-transparent focus:border-[#E07030] focus:outline-none shadow-inner transition-colors"
              />
            </div>

            <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
              <span className="sub-help text-white/75 pl-1">
                {commentText.length}/1000 karakter
              </span>

              <button
                type="submit"
                disabled={submitting}
                className="min-h-[48px] px-6 py-2.5 rounded-full bg-[#E07030] hover:bg-[#C95B1E] text-white font-heading font-extrabold text-sm sm:text-base shadow-lg inline-flex items-center gap-2 transition-all cursor-pointer"
              >
                <Send className="w-4 h-4" />
                <span>{submitting ? 'Mengirim Ulasan...' : 'Kirim Ulasan'}</span>
              </button>
            </div>
          </form>
        ) : (
          /* Kartu Ramah Jika User Belum Login */
          <div className="bg-[#062D2C]/85 border-2 border-[#1FAFAA]/50 rounded-[26px] p-5 sm:p-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-center sm:text-left shadow-lg">
            <div className="flex flex-col sm:flex-row items-center gap-3.5">
              <div className="w-12 h-12 rounded-2xl bg-[#1FAFAA]/25 border-2 border-[#FFE9B0] flex items-center justify-center shrink-0">
                <ShieldCheck className="w-6 h-6 text-[#FFE9B0]" />
              </div>
              <div>
                <h3 className="font-heading font-extrabold text-lg text-[#FFE9B0]">
                  Ingin Menulis Catatan &amp; Ulasan Orang Tua?
                </h3>
                <p className="sub-help text-white/90 mt-0.5">
                  Silakan masuk ke akun Guru atau Orang Tua terlebih dahulu untuk membagikan rating, kesan membaca, atau membalas diskusi bersama pendamping lain.
                </p>
              </div>
            </div>

            <Link
              to="/masuk"
              className="min-h-[46px] px-6 py-2.5 rounded-full bg-[#E07030] hover:bg-[#C95B1E] text-white font-heading font-extrabold text-sm inline-flex items-center gap-2 shrink-0 shadow-md transition-all"
            >
              <LogIn className="w-4 h-4" />
              <span>Masuk Akun</span>
            </Link>
          </div>
        )}
      </div>

      {/* DAFTAR ULASAN UTAMA BESERTA BALASAN KOMENTAR */}
      <div className="mt-6">
        {loading ? (
          /* Indikator Loading */
          <div
            role="status"
            aria-live="polite"
            className="py-10 px-4 text-center bg-[#062D2C]/60 rounded-[26px] border border-[#1FAFAA]/30 animate-pulse"
          >
            <Sparkles className="w-9 h-9 text-[#FFE9B0] mx-auto mb-2" />
            <p className="font-heading font-bold text-base text-[#FFE9B0]">
              Memuat catatan &amp; ulasan orang tua...
            </p>
          </div>
        ) : topLevelReviews.length > 0 ? (
          <div className="space-y-4">
            {topLevelReviews.map((item) => {
              const isOwner =
                Boolean(user && user.id) &&
                String(user.id) === String(item.user_id);
              const starCount = Math.max(1, Math.min(5, Number(item.rating) || 5));
              const replies = repliesByParentMap[String(item.id)] || [];
              const isReplyingHere = activeReplyParentId === item.id;

              return (
                <div key={item.id} className="space-y-2.5">
                  {/* Kartu Ulasan Utama (parent_id === null) */}
                  <article className="bg-[#007A78]/95 border-2 border-[#1FAFAA]/50 rounded-[24px] p-4 sm:p-5 shadow-md flex flex-col gap-2.5">
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div className="flex items-center gap-2.5">
                        <div className="w-10 h-10 rounded-full bg-[#FFE9B0] text-[#052625] font-heading font-extrabold text-base flex items-center justify-center shrink-0 shadow-sm">
                          {(item.author_name || 'O').charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <div className="flex flex-wrap items-center gap-2">
                            <h3 className="font-heading font-extrabold text-base text-[#FFE9B0]">
                              {item.author_name || 'Orang Tua / Guru Bukuna'}
                            </h3>
                            {item.author_role && (
                              <span className="px-2.5 py-0.5 rounded-full bg-[#062D2C] text-[#1FAFAA] text-[11px] font-extrabold uppercase tracking-wider">
                                {item.author_role}
                              </span>
                            )}
                            {isOwner && (
                              <span className="px-2.5 py-0.5 rounded-full bg-[#E07030] text-white text-[11px] font-extrabold">
                                Ulasan Saya
                              </span>
                            )}
                          </div>
                          <span className="text-xs font-semibold text-white/75">
                            {formatReviewDate(item.created_at)}
                          </span>
                        </div>
                      </div>

                      <div className="flex flex-wrap items-center gap-2">
                        {/* Bintang Rating 1-5 */}
                        <div
                          role="img"
                          aria-label={`Rating ${starCount} dari 5 bintang`}
                          className="flex items-center gap-0.5 px-3 py-1 rounded-full bg-[#062D2C] border border-[#FFE9B0]/40"
                        >
                          {[1, 2, 3, 4, 5].map((n) => (
                            <Star
                              key={n}
                              className={`w-3.5 h-3.5 sm:w-4 sm:h-4 ${
                                n <= starCount
                                  ? 'fill-[#FFE9B0] text-[#FFE9B0]'
                                  : 'text-white/30'
                              }`}
                            />
                          ))}
                        </div>

                        {/* Tombol Balas (Hanya muncul jika user sudah login) */}
                        {user && (
                          <button
                            type="button"
                            onClick={() => handleOpenReplyForm(item.id)}
                            aria-expanded={isReplyingHere}
                            className={`min-h-[36px] px-3.5 py-1 rounded-full font-heading font-extrabold text-xs inline-flex items-center gap-1.5 transition-colors cursor-pointer ${
                              isReplyingHere
                                ? 'bg-[#FFE9B0] text-[#052625] shadow-sm'
                                : 'bg-[#1FAFAA] hover:bg-[#159A95] text-[#052625] shadow-sm'
                            }`}
                          >
                            <RotateCcw className="w-3.5 h-3.5" />
                            <span>
                              {isReplyingHere
                                ? 'Batal Balas'
                                : `Balas${replies.length > 0 ? ` (${replies.length})` : ''}`}
                            </span>
                          </button>
                        )}

                        {/* Tombol Hapus Khusus Pemilik Ulasan (user.id === comment.user_id) */}
                        {isOwner && (
                          <button
                            type="button"
                            onClick={() => handleDeleteCommentOrReply(item)}
                            disabled={deletingId === item.id}
                            aria-label="Hapus ulasan saya"
                            className="min-h-[36px] px-3 py-1 rounded-full bg-red-500/20 hover:bg-red-500/40 border border-red-300/40 text-red-300 font-bold text-xs inline-flex items-center gap-1 transition-colors cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                            <span>
                              {deletingId === item.id ? 'Menghapus...' : 'Hapus'}
                            </span>
                          </button>
                        )}
                      </div>
                    </div>

                    <p className="sub-body text-white/95 pl-0 sm:pl-12">
                      {item.comment}
                    </p>
                  </article>

                  {/* Daftar Balasan Komentar (Indented / Menjorok ke Dalam, Terlama ke Terbaru) */}
                  {(replies.length > 0 || (user && isReplyingHere)) && (
                    <div className="pl-5 sm:pl-10 space-y-2.5">
                      {replies.map((reply) => {
                        const isReplyOwner =
                          Boolean(user && user.id) &&
                          String(user.id) === String(reply.user_id);

                        return (
                          <article
                            key={reply.id}
                            className="bg-[#062D2C]/90 border-2 border-[#1FAFAA]/40 rounded-[22px] p-3.5 sm:p-4 shadow-md flex flex-col gap-2"
                          >
                            <div className="flex flex-wrap items-start justify-between gap-2">
                              <div className="flex items-center gap-2.5">
                                <div className="w-8 h-8 rounded-full bg-[#1FAFAA] text-[#052625] font-heading font-extrabold text-sm flex items-center justify-center shrink-0 shadow-sm">
                                  {(reply.author_name || 'O').charAt(0).toUpperCase()}
                                </div>
                                <div>
                                  <div className="flex flex-wrap items-center gap-1.5">
                                    <h4 className="font-heading font-extrabold text-sm sm:text-base text-[#FFE9B0]">
                                      {reply.author_name || 'Orang Tua / Guru Bukuna'}
                                    </h4>
                                    {reply.author_role && (
                                      <span className="px-2 py-0.5 rounded-full bg-[#005E5C] text-[#1FAFAA] text-[11px] font-extrabold uppercase tracking-wider">
                                        {reply.author_role}
                                      </span>
                                    )}
                                    <span className="px-2 py-0.5 rounded-full bg-white/10 text-[#FFE9B0] text-[11px] font-bold">
                                      Balasan
                                    </span>
                                    {isReplyOwner && (
                                      <span className="px-2 py-0.5 rounded-full bg-[#E07030] text-white text-[11px] font-extrabold">
                                        Milik Saya
                                      </span>
                                    )}
                                  </div>
                                  <span className="text-xs font-semibold text-white/75">
                                    {formatReviewDate(reply.created_at)}
                                  </span>
                                </div>
                              </div>

                              {/* Tombol Hapus Khusus Pemilik Balasan (user.id === reply.user_id) */}
                              {isReplyOwner && (
                                <button
                                  type="button"
                                  onClick={() => handleDeleteCommentOrReply(reply)}
                                  disabled={deletingId === reply.id}
                                  aria-label="Hapus balasan saya"
                                  className="min-h-[34px] px-3 py-1 rounded-full bg-red-500/20 hover:bg-red-500/40 border border-red-300/40 text-red-300 font-bold text-xs inline-flex items-center gap-1 transition-colors cursor-pointer"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                  <span>
                                    {deletingId === reply.id ? 'Menghapus...' : 'Hapus'}
                                  </span>
                                </button>
                              )}
                            </div>

                            <p className="sub-section text-white/95 pl-0 sm:pl-10">
                              {reply.comment}
                            </p>
                          </article>
                        );
                      })}

                      {/* Form Input Balasan Ringkas (Muncul Saat Tombol "Balas" Diklik, Tanpa Rating Bintang) */}
                      {user && isReplyingHere && (
                        <form
                          onSubmit={(e) => handleSubmitReply(e, item)}
                          noValidate
                          className="bg-[#062D2C]/95 border-2 border-[#FFE9B0]/60 rounded-[22px] p-3.5 sm:p-4 space-y-3 shadow-lg"
                        >
                          <div className="flex items-center justify-between gap-2">
                            <span className="font-heading font-extrabold text-xs sm:text-sm text-[#FFE9B0]">
                              Membalas ulasan {item.author_name || 'Orang Tua / Guru'}
                            </span>
                            <button
                              type="button"
                              onClick={() => {
                                setActiveReplyParentId(null);
                                setReplyText('');
                                setReplyError('');
                              }}
                              aria-label="Tutup form balasan"
                              className="w-7 h-7 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center cursor-pointer"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </div>

                          {/* Pengingat Bahasa Santun pada Balasan */}
                          <div className="rounded-xl bg-[#005E5C]/90 border border-[#1FAFAA]/40 p-2.5 flex items-start gap-2">
                            <ShieldCheck className="w-4 h-4 text-[#FFE9B0] shrink-0 mt-0.5" />
                            <p className="sub-help text-white/90">
                              Gunakan bahasa yang santun dan positif saat berdiskusi dengan sesama orang tua atau guru.
                            </p>
                          </div>

                          {replyError && (
                            <div
                              role="alert"
                              className="rounded-xl bg-red-500/20 border border-red-300 px-3 py-2 text-xs font-bold text-white flex items-center gap-1.5"
                            >
                              <AlertCircle className="w-4 h-4 text-[#FFE9B0] shrink-0" />
                              <span>{replyError}</span>
                            </div>
                          )}

                          <div>
                            <label
                              htmlFor={`reply-textarea-${item.id}`}
                              className="sub-help block text-[#FFE9B0] mb-1 pl-1"
                            >
                              Tulis Balasan Anda
                            </label>
                            <textarea
                              id={`reply-textarea-${item.id}`}
                              name={`replyComment_${item.id}`}
                              rows={2}
                              maxLength={1000}
                              value={replyText}
                              onChange={(e) => setReplyText(e.target.value)}
                              placeholder={`Tulis tanggapan santun untuk ${item.author_name || 'ulasan ini'}...`}
                              className="w-full rounded-2xl bg-white text-[#062D2C] placeholder:text-slate-400 font-bold text-xs sm:text-sm p-3 border-2 border-transparent focus:border-[#E07030] focus:outline-none shadow-inner transition-colors"
                            />
                          </div>

                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <span className="sub-help text-white/75 pl-1">
                              {replyText.length}/1000 karakter
                            </span>

                            <div className="flex items-center gap-2">
                              <button
                                type="button"
                                onClick={() => {
                                  setActiveReplyParentId(null);
                                  setReplyText('');
                                  setReplyError('');
                                }}
                                className="min-h-[38px] px-4 py-1.5 rounded-full bg-white/15 hover:bg-white/25 text-white font-bold text-xs cursor-pointer"
                              >
                                Batal
                              </button>

                              <button
                                type="submit"
                                disabled={submittingReply}
                                className="min-h-[38px] px-5 py-1.5 rounded-full bg-[#E07030] hover:bg-[#C95B1E] text-white font-heading font-extrabold text-xs sm:text-sm shadow-md inline-flex items-center gap-1.5 transition-all cursor-pointer"
                              >
                                <Send className="w-3.5 h-3.5" />
                                <span>
                                  {submittingReply ? 'Mengirim...' : 'Kirim Balasan'}
                                </span>
                              </button>
                            </div>
                          </div>
                        </form>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        ) : (
          /* Empty State Hangat jika belum ada ulasan pada cerita tersebut */
          <div className="py-10 px-6 text-center bg-[#062D2C]/70 rounded-[26px] border-2 border-dashed border-[#1FAFAA]/50">
            <Sparkles className="w-10 h-10 text-[#FFE9B0] mx-auto mb-2" />
            <h3 className="font-heading font-extrabold text-lg sm:text-xl text-[#FFE9B0]">
              Belum Ada Catatan untuk Cerita Ini
            </h3>
            <p className="sub-section text-white/85 mt-1 max-w-md mx-auto">
              Jadilah orang tua atau guru pertama yang membagikan kesan dan pesan moral setelah membacakan cerita ini bersama si kecil!
            </p>
          </div>
        )}
      </div>
    </section>
  );
}
