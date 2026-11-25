import { supabase, isSupabaseConfigured } from '../lib/supabaseClient';
import { isAuthInDemoMode } from './authService';
import { initialStories } from '../data/stories';
import { extractAgeGroup, migrateAgeLabel } from './storyStorage';

/**
 * Layanan Dashboard Admin & Katalog Cerita Supabase (/src/services/adminService.js)
 * - Mengelola katalog cerita di tabel `stories` Supabase (Fetch, Auto-Migrate dari initialStories jika kosong,
 *   Tambah Cerita Baru, Edit Cerita, dan Hapus Cerita).
 * - Mengonversi skema baris database `stories` (id, slug, title, synopsis, category, age_category,
 *   cover_url, moral_value, pages, content) ke format objek cerita BUKUNA yang kompatibel 100%
 *   dengan Beranda, Koleksi, Detail Cerita, dan Halaman Membaca.
 * - Mengelola Moderasi Ulasan & Komentar (`story_comments` join `profiles`).
 * - Mengambil Daftar Pengguna Terdaftar (`profiles`).
 */

const LOCAL_ADMIN_STORIES_KEY = 'bukuna_admin_stories_v1';
const LOCAL_COMMENTS_KEY = 'bukuna_story_comments_v1';

export function slugifyStoryTitle(title) {
  const base = String(title || '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
  return base || `cerita-bukuna-${Date.now()}`;
}

export function isUserAdmin(user) {
  if (!user) return false;
  return (
    user.isAdmin === true ||
    String(user.role || '').toUpperCase() === 'ADMIN' ||
    String(user.peran || '').toUpperCase() === 'ADMIN'
  );
}

/**
 * Mengonversi baris dari tabel `stories` Supabase (atau objek cerita lokal)
 * menjadi objek cerita BUKUNA standar yang dipakai seluruh komponen UI.
 */
export function normalizeDbStoryToBukuna(row) {
  if (!row || typeof row !== 'object') return null;

  const slug = String(row.slug || row.id || slugifyStoryTitle(row.title || row.judul)).trim();
  const id = String(row.id || slug).trim();
  const judul = String(row.title || row.judul || 'Cerita Tanpa Judul').trim();
  const sinopsis = String(row.synopsis || row.sinopsis || '').trim();
  const kategori = String(row.category || row.kategori || 'Petualangan').trim();
  const rawUsia = String(row.age_group || row.age_category || row.usia || '4-5 Tahun').trim();
  const usia = migrateAgeLabel(rawUsia);
  const kelompokUsia = extractAgeGroup(usia);
  const cover = String(row.cover_url || row.cover || '/stories/kucing-hutan/cover.webp').trim();
  const pesanMoral = String(row.moral_value || row.pesanMoral || '').trim();
  const penulis = String(row.author_name || row.penulis || 'Guru & Orang Tua Bukuna').trim();
  const userId = row.user_id || row.userId || null;

  let rawPages = [];
  if (Array.isArray(row.pages) && row.pages.length > 0) {
    rawPages = row.pages;
  } else if (typeof row.pages === 'string' && row.pages.trim().startsWith('[')) {
    try {
      const parsed = JSON.parse(row.pages);
      if (Array.isArray(parsed)) rawPages = parsed;
    } catch {
      rawPages = [];
    }
  }

  // Jika pages kosong tapi ada kolom content (teks per paragraf dipisah baris kosong), pecah menjadi halaman
  if (rawPages.length === 0 && typeof row.content === 'string' && row.content.trim()) {
    const paragraphs = row.content
      .split(/\n\s*\n/)
      .map((p) => p.trim())
      .filter(Boolean);
    rawPages = paragraphs.map((pText, idx) => ({
      halaman: idx + 1,
      gambar: cover,
      alt: `${judul} - Halaman ${idx + 1}`,
      teks: pText,
    }));
  }

  const pages =
    rawPages.length > 0
      ? rawPages.map((p, idx) => ({
          id: (p && p.id) || `hal-${idx + 1}`,
          halaman: idx + 1,
          gambar: (p && (p.gambar || p.image_url || p.image)) || cover,
          alt: (p && p.alt) || `${judul} - Halaman ${idx + 1}`,
          teks: (p && (p.teks || p.text || p.content)) || '',
        }))
      : [
          {
            id: 'hal-1',
            halaman: 1,
            gambar: cover,
            alt: judul,
            teks: sinopsis || 'Mari membaca cerita seru ini bersama-sama!',
          },
        ];

  return {
    id,
    slug,
    user_id: userId,
    author_name: penulis,
    penulis,
    judul,
    title: judul,
    kategori,
    category: kategori,
    usia,
    age_group: usia,
    age_category: usia,
    kelompokUsia,
    cover,
    cover_url: cover,
    coverAlt: row.coverAlt || judul,
    objectPosition: row.objectPosition || 'center center',
    featured: true,
    sinopsis,
    synopsis: sinopsis,
    pesanMoral,
    moral_value: pesanMoral,
    pages,
    quiz: row.quiz || null,
    status: row.status || 'terbit',
    content:
      typeof row.content === 'string' && row.content.trim()
        ? row.content
        : pages.map((p) => p.teks).join('\n\n'),
    created_at: row.created_at || new Date().toISOString(),
    dibuat: row.created_at || new Date().toISOString(),
    sumber: userId ? 'pengguna' : 'katalog',
  };
}

/**
 * Mengonversi objek cerita BUKUNA ke payload baris tabel `public.stories` Supabase
 */
export function buildDbStoryPayload(input) {
  const title = String(input.title || input.judul || 'Cerita Baru Bukuna').trim();
  const slug = String(input.slug || input.id || slugifyStoryTitle(title)).trim();
  const id = String(input.id || slug).trim();
  const synopsis = String(input.synopsis || input.sinopsis || '').trim();
  const category = String(input.category || input.kategori || 'Petualangan').trim();
  const age_group = migrateAgeLabel(
    String(input.age_group || input.age_category || input.usia || '4-5 Tahun').trim()
  );
  const cover_url = String(
    input.cover_url || input.cover || '/stories/kucing-hutan/cover.webp'
  ).trim();
  const author_name = String(
    input.author_name || input.penulis || 'Guru & Orang Tua Bukuna'
  ).trim();
  const user_id = input.user_id || input.userId || null;

  let pages = [];
  if (Array.isArray(input.pages) && input.pages.length > 0) {
    pages = input.pages.map((p, idx) => {
      const pageImg = (p && (p.gambar || p.image_url)) || cover_url;
      const pageText = String((p && (p.teks || p.text)) || '').trim();
      return {
        halaman: idx + 1,
        gambar: pageImg,
        image_url: pageImg,
        alt: (p && p.alt) || `${title} - Halaman ${idx + 1}`,
        teks: pageText,
        text: pageText,
      };
    });
  } else if (typeof input.content === 'string' && input.content.trim()) {
    const paragraphs = input.content
      .split(/\n\s*\n/)
      .map((p) => p.trim())
      .filter(Boolean);
    pages = paragraphs.map((pText, idx) => ({
      halaman: idx + 1,
      gambar: cover_url,
      image_url: cover_url,
      alt: `${title} - Halaman ${idx + 1}`,
      teks: pText,
      text: pText,
    }));
  }

  if (pages.length === 0) {
    pages = [
      {
        halaman: 1,
        gambar: cover_url,
        image_url: cover_url,
        alt: title,
        teks: synopsis || 'Halaman pertama cerita.',
        text: synopsis || 'Halaman pertama cerita.',
      },
    ];
  }

  return {
    id,
    user_id,
    author_name,
    title,
    synopsis,
    category,
    age_group,
    cover_url,
    pages,
  };
}

function readLocalCatalogStories() {
  try {
    const raw = localStorage.getItem(LOCAL_ADMIN_STORIES_KEY);
    if (!raw) {
      return initialStories.map((s) =>
        normalizeDbStoryToBukuna({
          ...s,
          slug: s.id,
          title: s.judul,
          synopsis: s.sinopsis,
          category: s.kategori,
          age_category: s.usia,
          cover_url: s.cover,
          moral_value:
            s.id === 'petualangan-kucing-di-hutan-ajaib'
              ? 'Keberanian, sikap suka menolong sahabat, dan rasa syukur akan kehangatan rumah.'
              : 'Berbagi kebaikan sederhana dapat menghadirkan kebahagiaan bagi teman-teman di sekitar kita.',
        })
      );
    }
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed) || parsed.length === 0) {
      return initialStories.map((s) => normalizeDbStoryToBukuna(s));
    }
    return parsed.map((s) => normalizeDbStoryToBukuna(s)).filter(Boolean);
  } catch {
    return initialStories.map((s) => normalizeDbStoryToBukuna(s)).filter(Boolean);
  }
}

function writeLocalCatalogStories(list) {
  try {
    localStorage.setItem(LOCAL_ADMIN_STORIES_KEY, JSON.stringify(list));
  } catch {
    // Abaikan jika penyimpanan lokal penuh
  }
}

/**
 * 1. AMBIL KATALOG CERITA DARI TABEL `stories` SUPABASE
 * - Jika tabel `stories` masih kosong dan pengguna adalah Admin (atau kebijakan mengizinkan),
 *   otomatis migrasikan 2 cerita statis bawaan ke tabel `stories`.
 * - Jika tabel `stories` belum dibuat di Supabase, gunakan fallback cerita bawaan dengan aman.
 */
export async function fetchCatalogStories({ autoMigrateIfEmpty = true } = {}) {
  const defaultInitialNormalized = initialStories
    .map((s) =>
      normalizeDbStoryToBukuna({
        ...s,
        slug: s.id,
        title: s.judul,
        synopsis: s.sinopsis,
        category: s.kategori,
        age_category: s.usia,
        cover_url: s.cover,
        moral_value:
          s.id === 'petualangan-kucing-di-hutan-ajaib'
            ? 'Keberanian, sikap suka menolong sahabat, dan rasa syukur akan kehangatan rumah.'
            : 'Berbagi kebaikan sederhana dapat menghadirkan kebahagiaan bagi teman-teman di sekitar kita.',
      })
    )
    .filter(Boolean);

  if (isAuthInDemoMode() || !isSupabaseConfigured || !supabase) {
    return {
      ok: true,
      stories: readLocalCatalogStories(),
      fromSupabase: false,
    };
  }

  try {
    const { data, error } = await supabase
      .from('stories')
      .select('*')
      .order('created_at', { ascending: true });

    if (error) {
      return {
        ok: true,
        stories: defaultInitialNormalized,
        fromSupabase: false,
        dbNotice:
          'Menggunakan data cerita statis bawaan (jalankan bagian tabel public.stories di supabase/schema.sql untuk mengaktifkan penyimpanan cerita di database).',
      };
    }

    if (Array.isArray(data) && data.length > 0) {
      const normalized = data.map((row) => normalizeDbStoryToBukuna(row)).filter(Boolean);
      return {
        ok: true,
        stories: normalized,
        fromSupabase: true,
      };
    }

    // Jika tabel `stories` di Supabase masih kosong (0 baris), coba migrasikan cerita bawaan
    if (autoMigrateIfEmpty) {
      const seedPayloads = defaultInitialNormalized.map((s) => buildDbStoryPayload(s));
      const { data: insertedData, error: seedError } = await supabase
        .from('stories')
        .upsert(seedPayloads, { onConflict: 'id' })
        .select('*');

      if (!seedError && Array.isArray(insertedData) && insertedData.length > 0) {
        return {
          ok: true,
          stories: insertedData.map((row) => normalizeDbStoryToBukuna(row)).filter(Boolean),
          fromSupabase: true,
          migrated: true,
        };
      }
    }

    return {
      ok: true,
      stories: defaultInitialNormalized,
      fromSupabase: true,
    };
  } catch {
    return {
      ok: true,
      stories: defaultInitialNormalized,
      fromSupabase: false,
    };
  }
}

/**
 * 2. SIMPAN (TAMBAH / EDIT) CERITA DI TABEL `stories` SUPABASE
 */
export async function upsertCatalogStory(storyInput, isEdit = false) {
  const payload = buildDbStoryPayload(storyInput);

  if (isAuthInDemoMode() || !isSupabaseConfigured || !supabase) {
    const current = readLocalCatalogStories();
    const normalized = normalizeDbStoryToBukuna(payload);
    const existsIdx = current.findIndex((s) => s.id === normalized.id || s.slug === normalized.slug);
    let next;
    if (existsIdx !== -1) {
      next = current.map((s, idx) => (idx === existsIdx ? normalized : s));
    } else {
      next = [...current, normalized];
    }
    writeLocalCatalogStories(next);
    return { ok: true, story: normalized };
  }

  try {
    // Jika tabel di Supabase baru saja kosong dan Admin menambah cerita pertama,
    // pastikan 2 cerita bawaan juga ikut disinkronkan agar tidak hilang
    const { data: existingRows } = await supabase.from('stories').select('id').limit(5);
    if (Array.isArray(existingRows) && existingRows.length === 0) {
      const seedPayloads = initialStories.map((s) =>
        buildDbStoryPayload({
          ...s,
          moral_value:
            s.id === 'petualangan-kucing-di-hutan-ajaib'
              ? 'Keberanian, sikap suka menolong sahabat, dan rasa syukur akan kehangatan rumah.'
              : 'Berbagi kebaikan sederhana dapat menghadirkan kebahagiaan bagi teman-teman di sekitar kita.',
        })
      );
      await supabase.from('stories').upsert(seedPayloads, { onConflict: 'id' });
    }

    const { data, error } = await supabase
      .from('stories')
      .upsert(
        {
          ...payload,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'id' }
      )
      .select('*')
      .maybeSingle();

    if (error) {
      return {
        ok: false,
        error:
          error.message ||
          'Gagal menyimpan cerita ke tabel stories Supabase. Pastikan skema SQL tabel stories sudah dijalankan.',
      };
    }

    return {
      ok: true,
      story: normalizeDbStoryToBukuna(data || payload),
    };
  } catch (err) {
    return {
      ok: false,
      error: (err && err.message) || 'Terjadi kendala saat menyimpan cerita ke database.',
    };
  }
}

/**
 * 3. HAPUS CERITA DARI TABEL `stories` SUPABASE
 */
export async function deleteCatalogStory(storyId) {
  if (!storyId) {
    return { ok: false, error: 'ID cerita tidak valid.' };
  }

  if (isAuthInDemoMode() || !isSupabaseConfigured || !supabase) {
    const current = readLocalCatalogStories();
    const next = current.filter((s) => s.id !== storyId && s.slug !== storyId);
    writeLocalCatalogStories(next);
    return { ok: true };
  }

  try {
    const { error } = await supabase.from('stories').delete().eq('id', storyId);
    if (error) {
      return {
        ok: false,
        error: error.message || 'Gagal menghapus cerita dari database.',
      };
    }
    return { ok: true };
  } catch (err) {
    return {
      ok: false,
      error: (err && err.message) || 'Terjadi kendala jaringan saat menghapus cerita.',
    };
  }
}

/**
 * 4. AMBIL SELURUH ULASAN & BALASAN UNTUK MODERASI ADMIN
 */
export async function fetchAllCommentsForAdmin(storiesList = []) {
  const storyTitleMap = {};
  (storiesList || []).forEach((s) => {
    if (s && s.id) storyTitleMap[s.id] = s.judul || s.title || s.id;
  });

  if (isAuthInDemoMode() || !isSupabaseConfigured || !supabase) {
    try {
      const raw = localStorage.getItem(LOCAL_COMMENTS_KEY);
      const parsed = raw ? JSON.parse(raw) : [];
      const list = Array.isArray(parsed) ? parsed : [];
      return {
        ok: true,
        comments: list.map((c) => ({
          ...c,
          story_title: storyTitleMap[c.story_id] || c.story_id,
        })),
      };
    } catch {
      return { ok: true, comments: [] };
    }
  }

  try {
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
          full_name,
          peran,
          role
        )
      `
      )
      .order('created_at', { ascending: false });

    if (!error && Array.isArray(data)) {
      const formatted = data.map((row) => {
        const prof = Array.isArray(row.profiles) ? row.profiles[0] : row.profiles;
        const authorName =
          (prof && (prof.nama_akun || prof.full_name)) || 'Pengguna Bukuna';
        const authorRole = (prof && (prof.role || prof.peran)) || 'GURU';
        return {
          id: String(row.id),
          story_id: String(row.story_id || ''),
          story_title: storyTitleMap[row.story_id] || String(row.story_id || ''),
          user_id: String(row.user_id || ''),
          parent_id: row.parent_id ? String(row.parent_id) : null,
          rating: row.rating,
          comment: String(row.comment || ''),
          created_at: row.created_at || new Date().toISOString(),
          author_name: authorName,
          author_role: String(authorRole).toUpperCase(),
        };
      });
      return { ok: true, comments: formatted };
    }

    // Fallback tanpa relational join
    const { data: rawComments, error: rawErr } = await supabase
      .from('story_comments')
      .select('id, story_id, user_id, parent_id, rating, comment, created_at')
      .order('created_at', { ascending: false });

    if (rawErr) {
      return { ok: false, comments: [], error: rawErr.message };
    }

    const rows = Array.isArray(rawComments) ? rawComments : [];
    const userIds = Array.from(new Set(rows.map((r) => r.user_id).filter(Boolean)));
    const profMap = {};
    if (userIds.length > 0) {
      const { data: profs } = await supabase
        .from('profiles')
        .select('*')
        .in('id', userIds);
      if (Array.isArray(profs)) {
        profs.forEach((p) => {
          if (p && p.id) profMap[p.id] = p;
        });
      }
    }

    return {
      ok: true,
      comments: rows.map((row) => {
        const prof = profMap[row.user_id];
        return {
          id: String(row.id),
          story_id: String(row.story_id || ''),
          story_title: storyTitleMap[row.story_id] || String(row.story_id || ''),
          user_id: String(row.user_id || ''),
          parent_id: row.parent_id ? String(row.parent_id) : null,
          rating: row.rating,
          comment: String(row.comment || ''),
          created_at: row.created_at || new Date().toISOString(),
          author_name:
            (prof && (prof.nama_akun || prof.full_name)) || 'Pengguna Bukuna',
          author_role: String(
            (prof && (prof.role || prof.peran)) || 'GURU'
          ).toUpperCase(),
        };
      }),
    };
  } catch (err) {
    return {
      ok: false,
      comments: [],
      error: (err && err.message) || 'Gagal memuat daftar komentar untuk moderasi.',
    };
  }
}

/**
 * 5. HAPUS KOMENTAR / BALASAN OLEH ADMIN (Moderasi)
 */
export async function adminDeleteComment(commentId) {
  if (!commentId) return { ok: false, error: 'ID komentar tidak valid.' };

  if (isAuthInDemoMode() || !isSupabaseConfigured || !supabase) {
    try {
      const raw = localStorage.getItem(LOCAL_COMMENTS_KEY);
      const parsed = raw ? JSON.parse(raw) : [];
      const next = (Array.isArray(parsed) ? parsed : []).filter(
        (c) => c.id !== commentId && c.parent_id !== commentId
      );
      localStorage.setItem(LOCAL_COMMENTS_KEY, JSON.stringify(next));
      return { ok: true };
    } catch {
      return { ok: false, error: 'Gagal menghapus komentar lokal.' };
    }
  }

  try {
    const { error } = await supabase
      .from('story_comments')
      .delete()
      .eq('id', commentId);

    if (error) {
      return {
        ok: false,
        error:
          error.message ||
          'Gagal menghapus komentar. Pastikan kebijakan RLS Admin DELETE pada story_comments sudah aktif.',
      };
    }
    return { ok: true };
  } catch (err) {
    return {
      ok: false,
      error: (err && err.message) || 'Terjadi kendala saat menghapus komentar.',
    };
  }
}

/**
 * 6. AMBIL DAFTAR PENGGUNA DARI TABEL `profiles` SUPABASE
 */
export async function fetchAllProfilesForAdmin() {
  if (isAuthInDemoMode() || !isSupabaseConfigured || !supabase) {
    return {
      ok: true,
      profiles: [
        {
          id: 'usr-demo-admin',
          full_name: 'Admin Bukuna (Demo)',
          role: 'ADMIN',
          created_at: new Date().toISOString(),
        },
      ],
    };
  }

  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('*');

    if (error) {
      return {
        ok: false,
        profiles: [],
        error: error.message || 'Gagal memuat daftar pengguna dari tabel profiles.',
      };
    }

    const formatted = (Array.isArray(data) ? data : [])
      .map((p) => {
        const fullName =
          p.full_name || p.nama_akun || p.nama || p.name || 'Pengguna Bukuna';
        const isAdm =
          String(p.role || '').toUpperCase() === 'ADMIN' ||
          String(p.peran || '').toUpperCase() === 'ADMIN';
        const roleBadge = isAdm
          ? 'ADMIN'
          : String(p.role || p.peran || 'GURU').toUpperCase();
        const joinedAt = p.created_at || p.dibuat || new Date().toISOString();

        return {
          id: String(p.id),
          full_name: fullName,
          nama_akun: fullName,
          role: roleBadge,
          created_at: joinedAt,
        };
      })
      .sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

    return { ok: true, profiles: formatted };
  } catch (err) {
    return {
      ok: false,
      profiles: [],
      error: (err && err.message) || 'Terjadi kendala saat memuat daftar pengguna.',
    };
  }
}
