-- =============================================================================
-- BUKUNA WEB — SKEMA DATABASE SUPABASE (TAHAP 1: AKUN & PROFIL PENGGUNA)
-- =============================================================================
-- CARA MENJALANKAN DI SUPABASE DASHBOARD:
-- 1. Buka proyek Anda di https://supabase.com/dashboard
-- 2. Klik menu "SQL Editor" di bilah kiri, lalu klik "+ New query"
-- 3. Salin seluruh isi file supabase/schema.sql ini dan tempelkan ke editor
-- 4. Klik tombol "Run" (atau tekan Ctrl+Enter) hingga muncul pesan "Success"
--
-- CARA MENJADIKAN AKUN ANDA SEBAGAI ADMIN LEWAT TABLE EDITOR:
-- 1. Daftar akun terlebih dahulu melalui halaman Daftar (/daftar) di website BUKUNA
-- 2. Buka Supabase Dashboard -> klik menu "Table Editor" di bilah kiri
-- 3. Pilih tabel "profiles" pada skema "public"
-- 4. Cari baris dengan nama_akun / id akun Anda, klik dua kali pada kolom "peran"
-- 5. Ubah nilainya dari 'guru' menjadi 'admin' (atau 'editor'), lalu klik Save
-- =============================================================================

-- 1. Buat tabel public.profiles
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  nama_akun TEXT NOT NULL DEFAULT 'Guru & Orang Tua Bukuna',
  peran TEXT NOT NULL DEFAULT 'guru' CHECK (peran IN ('guru', 'editor', 'admin')),
  dibuat TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE public.profiles IS 'Profil akun Guru & Orang Tua BUKUNA yang terhubung ke auth.users.';
COMMENT ON COLUMN public.profiles.peran IS 'Peran akun: guru (default), editor, atau admin.';

-- 2. Aktifkan Row Level Security (RLS) pada tabel profiles
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- 3. Berikan GRANT yang diperlukan untuk peran anon dan authenticated
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT SELECT ON TABLE public.profiles TO anon, authenticated;
GRANT INSERT (id, nama_akun) ON TABLE public.profiles TO authenticated;
GRANT UPDATE (nama_akun) ON TABLE public.profiles TO authenticated;

-- 4. Kebijakan RLS (Row Level Security)
-- Hapus kebijakan lama jika skrip dijalankan ulang (idempotent)
DROP POLICY IF EXISTS "Pengguna hanya dapat membaca profilnya sendiri" ON public.profiles;
DROP POLICY IF EXISTS "Pengguna hanya dapat membuat profilnya sendiri dengan peran guru" ON public.profiles;
DROP POLICY IF EXISTS "Pengguna hanya dapat mengubah profilnya sendiri tanpa mengubah peran" ON public.profiles;

-- A. SELECT: Pengguna hanya dapat membaca profilnya sendiri
CREATE POLICY "Pengguna hanya dapat membaca profilnya sendiri"
  ON public.profiles
  FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

-- B. INSERT: Pengguna hanya dapat menyisipkan baris profil miliknya sendiri dengan peran default 'guru'
CREATE POLICY "Pengguna hanya dapat membuat profilnya sendiri dengan peran guru"
  ON public.profiles
  FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = id
    AND peran = 'guru'
  );

-- C. UPDATE: Pengguna hanya dapat mengubah profilnya sendiri dan TIDAK BISA mengubah kolom peran
CREATE POLICY "Pengguna hanya dapat mengubah profilnya sendiri tanpa mengubah peran"
  ON public.profiles
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (
    auth.uid() = id
    AND peran = (SELECT p.peran FROM public.profiles AS p WHERE p.id = auth.uid())
  );

-- 5. Trigger Pencegahan Tambahan di Level Database agar Kolom "peran" Tidak Bisa Diubah oleh Pengguna Biasa
CREATE OR REPLACE FUNCTION public.prevent_user_role_escalation()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Jika pemanggil adalah pengguna biasa (authenticated/anon lewat API client),
  -- paksa kolom 'peran' dan 'dibuat' tetap memakai nilai lama.
  -- Perubahan peran hanya diizinkan lewat Dashboard Supabase (postgres / service_role).
  IF current_user IN ('authenticated', 'anon') OR auth.role() IN ('authenticated', 'anon') THEN
    NEW.peran := OLD.peran;
    NEW.dibuat := OLD.dibuat;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_prevent_role_escalation ON public.profiles;
CREATE TRIGGER trg_prevent_role_escalation
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.prevent_user_role_escalation();

-- 6. Trigger Otomatis Membuat Baris di public.profiles Saat Pengguna Baru Mendaftar di auth.users
CREATE OR REPLACE FUNCTION public.handle_new_bukuna_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_nama TEXT;
BEGIN
  v_nama := COALESCE(
    NULLIF(TRIM(NEW.raw_user_meta_data->>'nama_akun'), ''),
    NULLIF(TRIM(NEW.raw_user_meta_data->>'nama'), ''),
    NULLIF(TRIM(NEW.raw_user_meta_data->>'name'), ''),
    SPLIT_PART(COALESCE(NEW.email, 'Sahabat Bukuna'), '@', 1)
  );

  INSERT INTO public.profiles (id, nama_akun, peran, dibuat)
  VALUES (NEW.id, v_nama, 'guru', COALESCE(NEW.created_at, NOW()))
  ON CONFLICT (id) DO UPDATE
    SET nama_akun = EXCLUDED.nama_akun;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_bukuna_user();
