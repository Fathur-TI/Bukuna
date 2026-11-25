import { supabase, isSupabaseConfigured } from '../lib/supabaseClient';
import { isAuthInDemoMode } from './authService';

/**
 * Layanan Catatan & Ulasan Orang Tua beserta Balasan (/src/services/commentService.js)
 * - Mengambil daftar ulasan & balasan dari tabel `story_comments` berdasarkan `story_id`,
 *   dengan dukungan kolom `parent_id` (`null` untuk ulasan utama, berisi ID ulasan utama untuk balasan),
 *   dan join ke tabel `profiles` untuk menampilkan nama penulis (`nama_akun`) dan peran (`peran`).
 * - Menyimpan ulasan utama (`parent_id: null`, `rating: 1..5`) maupun balasan komentar (`parent_id: <id>`).
 * - Menghapus ulasan atau balasan milik user yang sedang login (`user.id === item.user_id`).
 * - Mendukung fallback penyimpanan lokal (`localStorage`) jika berjalan di Mode Demo / preview.html.
 */

const LOCAL_COMMENTS_KEY = 'bukuna_story_comments_v1';

const INITIAL_DEMO_COMMENTS = [
  {
    id: 'demo-cmt-1',
    story_id: 'petualangan-kucing-di-hutan-ajaib',
    user_id: 'usr-demo-parent-1',
    parent_id: null,
    rating: 5,
    comment:
      'Cerita Rodri sangat membantu saya mengenalkan nilai keberanian dan sikap suka menolong kepada anak sebelum tidur. Ilustrasinya hangat sekali!',
    created_at: '2026-11-20T12:30:00.000Z',
    author_name: 'Bunda Sari (Orang Tua)',
    author_role: 'guru',
  },
  {
    id: 'demo-cmt-1-reply-1',
    story_id: 'petualangan-kucing-di-hutan-ajaib',
    user_id: 'usr-demo-parent-2',
    parent_id: 'demo-cmt-1',
    rating: null,
    comment:
      'Setuju sekali Bunda! Di kelas kami anak-anak juga paling suka bagian saat Rodri membantu Pipi menyeberangi jembatan.',
    created_at: '2026-11-20T14:10:00.000Z',
    author_name: 'Ibu Guru Dina',
    author_role: 'guru',
  },
  {
    id: 'demo-cmt-2',
    story_id: 'langit-dan-balon-warna-warni',
    user_id: 'usr-demo-parent-2',
    parent_id: null,
    rating: 5,
    comment:
      'Anak-anak di kelas TK sangat antusias menyebutkan warna balon sambil berdiskusi tentang berbagi kebaikan kepada teman yang sedang sedih.',
    created_at: '2026-11-21T09:15:00.000Z',
    author_name: 'Ibu Guru Dina',
    author_role: 'guru',
  },
];

function readLocalComments() {
  try {
    const raw = localStorage.getItem(LOCAL_COMMENTS_KEY);
    if (!raw) return INITIAL_DEMO_COMMENTS;
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : INITIAL_DEMO_COMMENTS;
  } catch {
    return INITIAL_DEMO_COMMENTS;
  }
}

function writeLocalComments(list) {
  try {
    localStorage.setItem(LOCAL_COMMENTS_KEY, JSON.stringify(list));
  } catch {
    // Abaikan jika localStorage penuh
  }
}

function normalizeCommentRow(row, fallbackAuthorName = 'Orang Tua / Guru Bukuna') {
  if (!row) return null;

  let profileObj = row.profiles || null;
  if (Array.isArray(profileObj)) {
    profileObj = profileObj[0] || null;
  }

  const authorName =
    (profileObj && (profileObj.nama_akun || profileObj.nama || profileObj.name)) ||
    row.author_name ||
    fallbackAuthorName;

  const authorRole = (profileObj && profileObj.peran) || row.author_role || 'guru';
  const parentId =
    row.parent_id !== undefined && row.parent_id !== null && String(row.parent_id).trim() !== ''
      ? String(row.parent_id)
      : null;

  const normalizedRating =
    row.rating === null || row.rating === undefined
      ? parentId
        ? null
        : 5
      : Math.max(1, Math.min(5, Number(row.rating) || 5));

  return {
    id: String(row.id),
    story_id: String(row.story_id),
    user_id: String(row.user_id || ''),
    parent_id: parentId,
    rating: normalizedRating,
    comment: String(row.comment || '').trim(),
    created_at: row.created_at || new Date().toISOString(),
    author_name: authorName,
    author_role: authorRole,
  };
}

/**
 * 1. AMBIL DAFTAR ULASAN & BALASAN BERDASARKAN story_id (+ Join profiles)
 */
export async function fetchStoryComments(storyId) {
  if (!storyId) return { ok: true, comments: [] };

  if (isAuthInDemoMode() || !isSupabaseConfigured || !supabase) {
    const allLocal = readLocalComments();
    const filtered = allLocal
      .filter((c) => c && c.story_id === storyId)
      .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
      .map((c) => normalizeCommentRow(c))
      .filter(Boolean);
    return { ok: true, comments: filtered, isLocal: true };
  }

  try {
    // Query utama: join story_comments dengan profiles termasuk parent_id
    const { data, error } = await supabase
      .from('story_comments')
      .select(
        `
        id,
        story_id,
        user_id,
        parent_id,
        rating,
        comment,
        created_at,
        profiles (
          id,
          nama_akun,
          peran
        )
      `
      )
      .eq('story_id', storyId)
      .order('created_at', { ascending: false });

    if (!error && Array.isArray(data)) {
      const normalized = data.map((row) => normalizeCommentRow(row)).filter(Boolean);
      return { ok: true, comments: normalized, isLocal: false };
    }

    // Fallback kedua jika relasi foreign key di Supabase disetel ke auth.users (bukan public.profiles langsung):
    // ambil story_comments lalu gabungkan manual dengan query ke tabel profiles
    const { data: rawComments, error: rawErr } = await supabase
      .from('story_comments')
      .select('id, story_id, user_id, parent_id, rating, comment, created_at')
      .eq('story_id', storyId)
      .order('created_at', { ascending: false });

    if (rawErr) {
      return {
        ok: false,
        comments: [],
        error: 'Belum dapat memuat ulasan dari database. Pastikan tabel story_comments sudah dijalankan di Supabase.',
      };
    }

    const rows = Array.isArray(rawComments) ? rawComments : [];
    const userIds = Array.from(
      new Set(rows.map((r) => r.user_id).filter(Boolean))
    );

    const profilesMap = {};
    if (userIds.length > 0) {
      const { data: profRows } = await supabase
        .from('profiles')
        .select('id, nama_akun, peran')
        .in('id', userIds);

      if (Array.isArray(profRows)) {
        profRows.forEach((p) => {
          if (p && p.id) profilesMap[p.id] = p;
        });
      }
    }

    const merged = rows
      .map((r) =>
        normalizeCommentRow({
          ...r,
          profiles: profilesMap[r.user_id] || null,
        })
      )
      .filter(Boolean);

    return { ok: true, comments: merged, isLocal: false };
  } catch {
    return {
      ok: false,
      comments: [],
      error: 'Terjadi kendala jaringan saat memuat ulasan cerita.',
    };
  }
}

/**
 * 2. TAMBAH ULASAN UTAMA ATAU BALASAN KOMENTAR (story_id, user_id, parent_id, rating, comment)
 */
export async function addStoryComment({
  storyId,
  user,
  rating = 5,
  comment,
  parentId = null,
}) {
  if (!user || !user.id) {
    return {
      ok: false,
      error: 'Silakan masuk ke akun Guru / Orang Tua terlebih dahulu untuk menulis komentar.',
    };
  }

  const cleanComment = String(comment || '').trim();
  if (cleanComment.length < 2) {
    return {
      ok: false,
      error: 'Mohon tulis catatan atau balasan minimal 2 karakter.',
    };
  }

  if (cleanComment.length > 1000) {
    return {
      ok: false,
      error: 'Teks komentar maksimal 1.000 karakter.',
    };
  }

  const cleanParentId =
    parentId !== undefined && parentId !== null && String(parentId).trim() !== ''
      ? String(parentId).trim()
      : null;

  // Untuk balasan (parent_id !== null), rating bintang tidak diperlukan di UI,
  // namun kita tetap menyiapkan fallback nilai valid (5) bila kolom rating di DB pengguna masih berstatus NOT NULL.
  const safeRating =
    rating === null || rating === undefined
      ? 5
      : Math.max(1, Math.min(5, Number(rating) || 5));

  const authorName =
    user.nama_akun || user.nama || user.name || 'Orang Tua / Guru Bukuna';
  const authorRole = user.peran || 'guru';

  if (isAuthInDemoMode() || !isSupabaseConfigured || !supabase) {
    const newEntry = {
      id: `local-cmt-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      story_id: storyId,
      user_id: user.id,
      parent_id: cleanParentId,
      rating: cleanParentId ? null : safeRating,
      comment: cleanComment,
      created_at: new Date().toISOString(),
      author_name: authorName,
      author_role: authorRole,
    };
    const current = readLocalComments();
    writeLocalComments([newEntry, ...current]);
    return {
      ok: true,
      comment: normalizeCommentRow(newEntry, authorName),
    };
  }

  try {
    const payload = {
      story_id: storyId,
      user_id: user.id,
      parent_id: cleanParentId,
      rating: safeRating,
      comment: cleanComment,
    };

    const { data, error } = await supabase
      .from('story_comments')
      .insert(payload)
      .select(
        `
        id,
        story_id,
        user_id,
        parent_id,
        rating,
        comment,
        created_at,
        profiles (
          id,
          nama_akun,
          peran
        )
      `
      )
      .maybeSingle();

    if (!error && data) {
      return {
        ok: true,
        comment: normalizeCommentRow(data, authorName),
      };
    }

    // Fallback insert tanpa relational select jika FK join langsung belum terbaca oleh PostgREST cache
    const { data: fallbackData, error: fallbackErr } = await supabase
      .from('story_comments')
      .insert(payload)
      .select('id, story_id, user_id, parent_id, rating, comment, created_at')
      .maybeSingle();

    if (fallbackErr) {
      return {
        ok: false,
        error:
          fallbackErr.message ||
          'Gagal menyimpan komentar ke Supabase. Pastikan kolom parent_id sudah ada di tabel story_comments.',
      };
    }

    return {
      ok: true,
      comment: normalizeCommentRow(
        {
          ...(fallbackData || payload),
          id: (fallbackData && fallbackData.id) || `cmt-${Date.now()}`,
          created_at:
            (fallbackData && fallbackData.created_at) || new Date().toISOString(),
          profiles: {
            id: user.id,
            nama_akun: authorName,
            peran: authorRole,
          },
        },
        authorName
      ),
    };
  } catch {
    return {
      ok: false,
      error: 'Tidak dapat mengirim komentar saat ini. Periksa koneksi internet Anda.',
    };
  }
}

/**
 * 3. HAPUS ULASAN ATAU BALASAN MILIK PENGGUNA SENDIRI (user.id === comment.user_id)
 */
export async function deleteStoryComment({ commentId, userId }) {
  if (!commentId || !userId) {
    return {
      ok: false,
      error: 'Anda tidak memiliki akses untuk menghapus komentar ini.',
    };
  }

  if (isAuthInDemoMode() || !isSupabaseConfigured || !supabase) {
    const current = readLocalComments();
    const next = current.filter(
      (c) =>
        !(c.id === commentId && String(c.user_id) === String(userId)) &&
        c.parent_id !== commentId
    );
    writeLocalComments(next);
    return { ok: true };
  }

  try {
    const { error } = await supabase
      .from('story_comments')
      .delete()
      .eq('id', commentId)
      .eq('user_id', userId);

    if (error) {
      return {
        ok: false,
        error: error.message || 'Gagal menghapus komentar dari database.',
      };
    }

    return { ok: true };
  } catch {
    return {
      ok: false,
      error: 'Terjadi kendala jaringan saat menghapus komentar.',
    };
  }
}
