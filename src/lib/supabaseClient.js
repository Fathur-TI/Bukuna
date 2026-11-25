import { createClient } from '@supabase/supabase-js';

/**
 * Inisialisasi Klien Supabase BUKUNA (/src/lib/supabaseClient.js)
 * - Membaca VITE_SUPABASE_URL dan VITE_SUPABASE_ANON_KEY (mendukung publishable key sb_publishable_...)
 * - Jika variabel lingkungan kosong atau dijalankan dari file:// (preview.html),
 *   otomatis beralih ke Mode Demo tanpa melempar error.
 */

function readViteEnv() {
  try {
    // Mendukung Vite (import.meta.env) maupun fallback global jika dijalankan di preview.html
    const metaEnv =
      typeof import.meta !== 'undefined' && import.meta.env
        ? import.meta.env
        : {};
    const winEnv =
      typeof window !== 'undefined' && window.__BUKUNA_ENV__
        ? window.__BUKUNA_ENV__
        : {};

    const url = String(
      metaEnv.VITE_SUPABASE_URL || winEnv.VITE_SUPABASE_URL || ''
    ).trim();
    const anonKey = String(
      metaEnv.VITE_SUPABASE_ANON_KEY || winEnv.VITE_SUPABASE_ANON_KEY || ''
    ).trim();

    return { url, anonKey };
  } catch {
    return { url: '', anonKey: '' };
  }
}

const { url: supabaseUrl, anonKey: supabaseAnonKey } = readViteEnv();

const isFileProtocol =
  typeof window !== 'undefined' &&
  window.location &&
  window.location.protocol === 'file:';

export const isSupabaseConfigured = Boolean(
  !isFileProtocol &&
    supabaseUrl &&
    supabaseAnonKey &&
    supabaseUrl.startsWith('http')
);

export const supabase =
  isSupabaseConfigured && typeof createClient === 'function'
    ? createClient(supabaseUrl, supabaseAnonKey, {
        auth: {
          persistSession: true,
          autoRefreshToken: true,
          detectSessionInUrl: true,
          storageKey: 'bukuna_supabase_auth_v1',
        },
      })
    : null;
