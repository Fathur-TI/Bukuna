import { supabase, isSupabaseConfigured } from '../lib/supabaseClient';

/**
 * Lapisan Layanan Autentikasi BUKUNA (/src/services/authService.js)
 * - Komponen UI tidak memanggil Supabase secara langsung, melainkan melalui fungsi di modul ini.
 * - Menyediakan fungsi: daftar (registerWithEmail), masuk (loginWithEmail), keluar (logoutUser),
 *   lupa kata sandi (sendPasswordReset), ambil sesi (getCurrentSessionUser),
 *   pembaruan kata sandi saat reset (updateUserPassword), dan langganan perubahan sesi (subscribeAuthChanges).
 * - Jika VITE_SUPABASE_URL kosong atau server Supabase tidak dapat dihubungi (offline/preview.html),
 *   otomatis beralih ke Mode Demo (simulasi lokal) secara mulus.
 */

const DEMO_STORAGE_KEYS = {
  USER: 'bukuna_demo_user_v1',
  USERS_DB: 'bukuna_users_db_v1',
};

let runtimeConnectionFailed = false;

export function isAuthInDemoMode() {
  return !isSupabaseConfigured || runtimeConnectionFailed || !supabase;
}

function isNetworkOrFetchError(err) {
  if (!err) return false;
  const msg = String(err.message || err.error_description || err).toLowerCase();
  return (
    msg.includes('failed to fetch') ||
    msg.includes('networkerror') ||
    msg.includes('network request failed') ||
    msg.includes('load failed') ||
    msg.includes('err_name_not_resolved') ||
    msg.includes('fetch')
  );
}

/**
 * Menerjemahkan pesan error Supabase Auth ke Bahasa Indonesia yang ramah untuk guru & orang tua
 */
export function translateAuthError(err) {
  if (!err) return 'Terjadi kendala saat memproses akun. Silakan coba lagi ya.';
  const raw = String(err.message || err.error_description || err).trim();
  const lower = raw.toLowerCase();

  if (
    lower.includes('invalid login credentials') ||
    lower.includes('invalid_credentials') ||
    lower.includes('invalid email or password')
  ) {
    return 'Email atau Kata Sandi belum tepat. Silakan periksa kembali atau klik "Lupa kata sandi?".';
  }
  if (lower.includes('email not confirmed')) {
    return 'Email Anda belum dikonfirmasi. Silakan buka kotak masuk email Anda dan klik tautan verifikasi terlebih dahulu.';
  }
  if (
    lower.includes('user already registered') ||
    lower.includes('already been registered') ||
    lower.includes('already exists')
  ) {
    return 'Alamat email ini sudah terdaftar. Silakan masuk menggunakan halaman Masuk atau gunakan fitur Lupa Kata Sandi.';
  }
  if (
    lower.includes('password should be at least') ||
    lower.includes('weak_password')
  ) {
    return 'Kata Sandi minimal harus terdiri dari 8 karakter.';
  }
  if (
    lower.includes('unable to validate email address') ||
    lower.includes('invalid format') ||
    lower.includes('anonymous_provider_disabled')
  ) {
    return 'Format alamat Email belum valid (contoh: nama@email.com).';
  }
  if (
    lower.includes('rate limit') ||
    lower.includes('too many requests') ||
    lower.includes('over_email_send_rate_limit') ||
    lower.includes('for security purposes, you can only request this')
  ) {
    return 'Terlalu banyak permintaan dalam waktu singkat. Mohon tunggu sekitar 1 menit sebelum mencoba kembali.';
  }
  if (isNetworkOrFetchError(err)) {
    return 'Tidak dapat terhubung ke layanan akun. Periksa koneksi internet Anda dan coba lagi.';
  }

  return raw || 'Terjadi kendala saat memproses permintaan akun Anda.';
}

function readLocalJson(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

function writeLocalJson(key, value) {
  try {
    if (value === null || value === undefined) {
      localStorage.removeItem(key);
    } else {
      localStorage.setItem(key, JSON.stringify(value));
    }
  } catch {
    // Abaikan jika penyimpanan lokal penuh
  }
}

function buildNormalizedUser(authUser, profileRow = null) {
  if (!authUser) return null;
  const meta = authUser.user_metadata || {};
  const displayName =
    (profileRow && (profileRow.nama_akun || profileRow.full_name || profileRow.nama || profileRow.name)) ||
    meta.nama_akun ||
    meta.full_name ||
    meta.nama ||
    meta.name ||
    (authUser.email ? authUser.email.split('@')[0] : 'Sahabat Bukuna');

  const rawRole =
    (profileRow && (profileRow.role || profileRow.peran)) ||
    meta.role ||
    meta.peran ||
    'guru';

  const isAdmin =
    String(profileRow?.role || '').toUpperCase() === 'ADMIN' ||
    String(profileRow?.peran || '').toUpperCase() === 'ADMIN' ||
    String(rawRole).toUpperCase() === 'ADMIN';

  const normalizedRole = isAdmin
    ? 'ADMIN'
    : String(rawRole).toUpperCase();
  const normalizedPeran = isAdmin
    ? 'admin'
    : String((profileRow && profileRow.peran) || rawRole || 'guru').toLowerCase();

  const dibuat =
    (profileRow && (profileRow.dibuat || profileRow.created_at)) ||
    authUser.created_at ||
    new Date().toISOString();

  return {
    id: authUser.id,
    nama: displayName,
    name: displayName,
    nama_akun: displayName,
    full_name: displayName,
    email: authUser.email || '',
    peran: normalizedPeran,
    role: normalizedRole,
    isAdmin,
    dibuat,
    created_at: dibuat,
    avatar: meta.avatar || 'orange-cat',
    isDemo: false,
  };
}

/**
 * Mengambil atau membuat baris profil pengguna dari tabel `public.profiles`
 */
export async function fetchOrEnsureProfile(authUser, fallbackName = '') {
  if (!supabase || !authUser || !authUser.id) {
    return buildNormalizedUser(authUser);
  }

  try {
    const { data: existingProfile, error: selectErr } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', authUser.id)
      .maybeSingle();

    if (!selectErr && existingProfile) {
      return buildNormalizedUser(authUser, existingProfile);
    }

    const meta = authUser.user_metadata || {};
    const candidateName =
      (fallbackName && fallbackName.trim()) ||
      meta.nama_akun ||
      meta.full_name ||
      meta.nama ||
      meta.name ||
      (authUser.email ? authUser.email.split('@')[0] : 'Guru & Orang Tua Bukuna');

    const { data: insertedProfile, error: insertErr } = await supabase
      .from('profiles')
      .insert({
        id: authUser.id,
        nama_akun: candidateName,
      })
      .select('*')
      .maybeSingle();

    if (!insertErr && insertedProfile) {
      return buildNormalizedUser(authUser, insertedProfile);
    }

    return buildNormalizedUser(authUser, {
      id: authUser.id,
      nama_akun: candidateName,
      peran: 'guru',
      role: 'GURU',
    });
  } catch {
    return buildNormalizedUser(authUser);
  }
}

/**
 * 1. AMBIL SESI PENGGUNA SAAT INI
 */
export async function getCurrentSessionUser() {
  // Bersihkan key legacy lama jika Supabase sudah dikonfigurasi agar akun statis "Ibu Guru Rina" tidak muncul lagi
  if (isSupabaseConfigured) {
    try {
      const legacyRaw = localStorage.getItem('bukuna_user_v1');
      if (legacyRaw) {
        const parsed = JSON.parse(legacyRaw);
        if (parsed && (parsed.id === 'usr-1' || parsed.id === 'usr-demo')) {
          localStorage.removeItem('bukuna_user_v1');
        }
      }
    } catch {
      // Abaikan
    }
  }

  if (isAuthInDemoMode()) {
    const storedDemo = readLocalJson(DEMO_STORAGE_KEYS.USER, {
      id: 'usr-1',
      nama: 'Ibu Guru Rina',
      name: 'Ibu Guru Rina',
      nama_akun: 'Ibu Guru Rina',
      email: 'rina.guru@bukuna.id',
      peran: 'guru',
      avatar: 'orange-cat',
      isDemo: true,
    });
    return {
      user: storedDemo,
      isDemoMode: true,
      error: null,
    };
  }

  try {
    const { data, error } = await supabase.auth.getSession();
    if (error) {
      if (isNetworkOrFetchError(error)) {
        runtimeConnectionFailed = true;
        const fallbackDemo = readLocalJson(DEMO_STORAGE_KEYS.USER, null);
        return { user: fallbackDemo, isDemoMode: true, error: null };
      }
      return { user: null, isDemoMode: false, error: translateAuthError(error) };
    }

    const sessionUser = data && data.session ? data.session.user : null;
    if (!sessionUser) {
      return { user: null, isDemoMode: false, error: null };
    }

    const profileUser = await fetchOrEnsureProfile(sessionUser);
    return {
      user: profileUser,
      isDemoMode: false,
      error: null,
    };
  } catch (err) {
    if (isNetworkOrFetchError(err)) {
      runtimeConnectionFailed = true;
      const fallbackDemo = readLocalJson(DEMO_STORAGE_KEYS.USER, null);
      return { user: fallbackDemo, isDemoMode: true, error: null };
    }
    return { user: null, isDemoMode: false, error: translateAuthError(err) };
  }
}

/**
 * 2. DAFTAR AKUN BARU (Email + Kata Sandi + Nama Akun)
 */
export async function registerWithEmail({ nama, email, password }) {
  const cleanName = String(nama || '').trim() || 'Guru & Orang Tua Bukuna';
  const cleanEmail = String(email || '').trim();

  if (isAuthInDemoMode()) {
    const newUser = {
      id: `usr-${Date.now()}`,
      nama: cleanName,
      name: cleanName,
      nama_akun: cleanName,
      email: cleanEmail,
      peran: 'guru',
      dibuat: new Date().toISOString(),
      avatar: 'orange-cat',
      isDemo: true,
    };
    const usersDb = readLocalJson(DEMO_STORAGE_KEYS.USERS_DB, []);
    const updatedDb = [
      ...usersDb.filter(
        (u) => (u.email || '').toLowerCase() !== cleanEmail.toLowerCase()
      ),
      { ...newUser, password },
    ];
    writeLocalJson(DEMO_STORAGE_KEYS.USERS_DB, updatedDb);
    writeLocalJson(DEMO_STORAGE_KEYS.USER, newUser);
    return {
      ok: true,
      user: newUser,
      needsEmailConfirmation: false,
      isDemoMode: true,
    };
  }

  try {
    const redirectUrl =
      typeof window !== 'undefined' && window.location
        ? `${window.location.origin}/masuk`
        : undefined;

    const { data, error } = await supabase.auth.signUp({
      email: cleanEmail,
      password,
      options: {
        emailRedirectTo: redirectUrl,
        data: {
          nama_akun: cleanName,
          nama: cleanName,
          name: cleanName,
        },
      },
    });

    if (error) {
      if (isNetworkOrFetchError(error)) {
        runtimeConnectionFailed = true;
        return registerWithEmail({ nama: cleanName, email: cleanEmail, password });
      }
      return {
        ok: false,
        error: translateAuthError(error),
      };
    }

    // Deteksi jika Supabase mengembalikan user dengan identities kosong (email sudah terdaftar)
    if (
      data &&
      data.user &&
      Array.isArray(data.user.identities) &&
      data.user.identities.length === 0
    ) {
      return {
        ok: false,
        error:
          'Alamat email ini sudah terdaftar. Silakan masuk melalui halaman Masuk atau gunakan Lupa Kata Sandi.',
      };
    }

    const hasActiveSession = Boolean(data && data.session && data.user);
    if (hasActiveSession) {
      const profileUser = await fetchOrEnsureProfile(data.user, cleanName);
      return {
        ok: true,
        user: profileUser,
        needsEmailConfirmation: false,
        isDemoMode: false,
      };
    }

    return {
      ok: true,
      user: null,
      needsEmailConfirmation: true,
      isDemoMode: false,
      message: `Pendaftaran berhasil! Kami telah mengirimkan email konfirmasi ke ${cleanEmail}. Silakan buka kotak masuk email Anda dan klik tautan verifikasi sebelum masuk.`,
    };
  } catch (err) {
    if (isNetworkOrFetchError(err)) {
      runtimeConnectionFailed = true;
      return registerWithEmail({ nama: cleanName, email: cleanEmail, password });
    }
    return {
      ok: false,
      error: translateAuthError(err),
    };
  }
}

/**
 * 3. MASUK AKUN (Email + Kata Sandi)
 */
export async function loginWithEmail({ email, password }) {
  const cleanEmail = String(email || '').trim();

  if (isAuthInDemoMode()) {
    const usersDb = readLocalJson(DEMO_STORAGE_KEYS.USERS_DB, []);
    const found = usersDb.find(
      (u) =>
        u.email && u.email.toLowerCase() === cleanEmail.toLowerCase()
    );

    if (found && found.password && found.password !== password) {
      return {
        ok: false,
        error: 'Email atau Kata Sandi belum tepat. Silakan periksa kembali.',
      };
    }

    const displayName =
      (found && (found.nama_akun || found.nama || found.name)) ||
      (cleanEmail.includes('@') ? cleanEmail.split('@')[0] : cleanEmail) ||
      'Guru Bukuna';

    const loggedUser = {
      id: (found && found.id) || `usr-${Date.now()}`,
      nama: displayName,
      name: displayName,
      nama_akun: displayName,
      email: cleanEmail,
      peran: (found && found.peran) || 'guru',
      avatar: 'orange-cat',
      isDemo: true,
    };

    writeLocalJson(DEMO_STORAGE_KEYS.USER, loggedUser);
    return {
      ok: true,
      user: loggedUser,
      isDemoMode: true,
    };
  }

  try {
    const { data, error } = await supabase.auth.signInWithPassword({
      email: cleanEmail,
      password,
    });

    if (error) {
      if (isNetworkOrFetchError(error)) {
        runtimeConnectionFailed = true;
        return loginWithEmail({ email: cleanEmail, password });
      }
      return {
        ok: false,
        error: translateAuthError(error),
      };
    }

    const authUser = data && data.user ? data.user : null;
    if (!authUser) {
      return {
        ok: false,
        error: 'Gagal memuat sesi pengguna. Silakan coba masuk kembali.',
      };
    }

    const profileUser = await fetchOrEnsureProfile(authUser);
    return {
      ok: true,
      user: profileUser,
      isDemoMode: false,
    };
  } catch (err) {
    if (isNetworkOrFetchError(err)) {
      runtimeConnectionFailed = true;
      return loginWithEmail({ email: cleanEmail, password });
    }
    return {
      ok: false,
      error: translateAuthError(err),
    };
  }
}

/**
 * 4. MASUK AKUN DEMO (Hanya aktif di Mode Demo)
 */
export function loginAsDemoAccount() {
  const demoUser = {
    id: 'usr-demo',
    nama: 'Bukuna Study',
    name: 'Bukuna Study',
    nama_akun: 'Bukuna Study',
    email: 'bukuna@gmail.com',
    peran: 'guru',
    avatar: 'orange-cat',
    isDemo: true,
  };
  writeLocalJson(DEMO_STORAGE_KEYS.USER, demoUser);
  return {
    ok: true,
    user: demoUser,
    isDemoMode: true,
  };
}

/**
 * 5. KELUAR AKUN (Logout)
 */
export async function logoutUser() {
  writeLocalJson(DEMO_STORAGE_KEYS.USER, null);
  try {
    localStorage.removeItem('bukuna_user_v1');
  } catch {
    // Abaikan
  }

  if (!isAuthInDemoMode() && supabase) {
    try {
      await supabase.auth.signOut();
    } catch {
      // Abaikan jika gagal signOut jaringan
    }
  }
  return { ok: true };
}

/**
 * 6. LUPA KATA SANDI (Kirim Tautan Reset ke Email)
 */
export async function sendPasswordReset(email) {
  const cleanEmail = String(email || '').trim();
  if (!cleanEmail) {
    return {
      ok: false,
      error: 'Mohon isi alamat Email terlebih dahulu untuk menerima tautan reset kata sandi.',
    };
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(cleanEmail)) {
    return {
      ok: false,
      error: 'Format alamat Email belum valid (contoh: nama@email.com).',
    };
  }

  if (isAuthInDemoMode()) {
    return {
      ok: true,
      isDemoMode: true,
      message: `Mode Demo: Simulasi tautan pengaturan ulang kata sandi telah dikirim ke ${cleanEmail}.`,
    };
  }

  try {
    const redirectTo =
      typeof window !== 'undefined' && window.location
        ? `${window.location.origin}/masuk?reset=1`
        : undefined;

    const { error } = await supabase.auth.resetPasswordForEmail(cleanEmail, {
      redirectTo,
    });

    if (error) {
      if (isNetworkOrFetchError(error)) {
        runtimeConnectionFailed = true;
        return sendPasswordReset(cleanEmail);
      }
      return {
        ok: false,
        error: translateAuthError(error),
      };
    }

    return {
      ok: true,
      isDemoMode: false,
      message: `Tautan untuk mengatur ulang kata sandi telah dikirim ke ${cleanEmail}. Silakan periksa kotak masuk atau folder spam email Anda.`,
    };
  } catch (err) {
    if (isNetworkOrFetchError(err)) {
      runtimeConnectionFailed = true;
      return sendPasswordReset(cleanEmail);
    }
    return {
      ok: false,
      error: translateAuthError(err),
    };
  }
}

/**
 * 7. PERBARUI KATA SANDI BARU (Saat pengguna kembali dari tautan email reset password)
 */
export async function updateUserPassword(newPassword) {
  if (!newPassword || String(newPassword).length < 8) {
    return {
      ok: false,
      error: 'Kata Sandi baru minimal terdiri dari 8 karakter.',
    };
  }

  if (isAuthInDemoMode()) {
    return {
      ok: true,
      message: 'Kata sandi berhasil diperbarui (Mode Demo).',
    };
  }

  try {
    const { error } = await supabase.auth.updateUser({
      password: String(newPassword),
    });
    if (error) {
      return {
        ok: false,
        error: translateAuthError(error),
      };
    }
    return {
      ok: true,
      message: 'Kata sandi Anda berhasil diperbarui! Silakan lanjutkan menggunakan BUKUNA.',
    };
  } catch (err) {
    return {
      ok: false,
      error: translateAuthError(err),
    };
  }
}

/**
 * 8. LANGGANAN PERUBAHAN SESI AUTH SUPABASE
 */
export function subscribeAuthChanges(callback) {
  if (isAuthInDemoMode() || !supabase) {
    return () => {};
  }

  const { data } = supabase.auth.onAuthStateChange(async (event, session) => {
    const authUser = session && session.user ? session.user : null;
    if (!authUser) {
      callback(event, null);
      return;
    }
    const profileUser = await fetchOrEnsureProfile(authUser);
    callback(event, profileUser);
  });

  return () => {
    if (data && data.subscription) {
      data.subscription.unsubscribe();
    }
  };
}
