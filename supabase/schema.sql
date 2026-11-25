-- =============================================================================
-- BUKUNA WEB — SKEMA DATABASE SUPABASE (AKUN PROFIL & ULASAN ORANG TUA)
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

-- =============================================================================
-- BAGIAN 1: TABEL PROFIL PENGGUNA (public.profiles)
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  nama_akun TEXT NOT NULL DEFAULT 'Guru & Orang Tua Bukuna',
  peran TEXT NOT NULL DEFAULT 'guru' CHECK (peran IN ('guru', 'editor', 'admin')),
  dibuat TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE public.profiles IS 'Profil akun Guru & Orang Tua BUKUNA yang terhubung ke auth.users.';
COMMENT ON COLUMN public.profiles.peran IS 'Peran akun: guru (default), editor, atau admin.';

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT SELECT ON TABLE public.profiles TO anon, authenticated;
GRANT INSERT (id, nama_akun) ON TABLE public.profiles TO authenticated;
GRANT UPDATE (nama_akun) ON TABLE public.profiles TO authenticated;

DROP POLICY IF EXISTS "Pengguna hanya dapat membaca profilnya sendiri" ON public.profiles;
DROP POLICY IF EXISTS "Profil publik dapat dibaca untuk menampilkan nama penulis ulasan" ON public.profiles;
DROP POLICY IF EXISTS "Pengguna hanya dapat membuat profilnya sendiri dengan peran guru" ON public.profiles;
DROP POLICY IF EXISTS "Pengguna hanya dapat mengubah profilnya sendiri tanpa mengubah peran" ON public.profiles;

-- A. SELECT: Semua pengunjung (anon & authenticated) dapat membaca id, nama_akun, peran pada profiles
-- agar join nama penulis pada Catatan & Ulasan Orang Tua dapat tampil untuk semua pembaca
CREATE POLICY "Profil publik dapat dibaca untuk menampilkan nama penulis ulasan"
  ON public.profiles
  FOR SELECT
  TO anon, authenticated
  USING (true);

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

-- Trigger Pencegahan Tambahan di Level Database agar Kolom "peran" Tidak Bisa Diubah oleh Pengguna Biasa
CREATE OR REPLACE FUNCTION public.prevent_user_role_escalation()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
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

-- Trigger Otomatis Membuat Baris di public.profiles Saat Pengguna Baru Mendaftar di auth.users
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


-- =============================================================================
-- BAGIAN 2: TABEL CATATAN & ULASAN ORANG TUA (public.story_comments)
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.story_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  story_id TEXT NOT NULL,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  parent_id UUID NULL REFERENCES public.story_comments(id) ON DELETE CASCADE,
  rating INTEGER NULL DEFAULT 5 CHECK (rating IS NULL OR (rating >= 1 AND rating <= 5)),
  comment TEXT NOT NULL CHECK (char_length(trim(comment)) >= 2 AND char_length(comment) <= 1000),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Pastikan kolom parent_id tersedia jika tabel sudah dibuat sebelumnya
ALTER TABLE public.story_comments
  ADD COLUMN IF NOT EXISTS parent_id UUID NULL REFERENCES public.story_comments(id) ON DELETE CASCADE;

ALTER TABLE public.story_comments
  ALTER COLUMN rating DROP NOT NULL;

CREATE INDEX IF NOT EXISTS idx_story_comments_story_created
  ON public.story_comments (story_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_story_comments_parent_id
  ON public.story_comments (parent_id);

COMMENT ON TABLE public.story_comments IS 'Catatan & ulasan orang tua/guru beserta balasan komentar pada setiap cerita anak di BUKUNA.';

ALTER TABLE public.story_comments ENABLE ROW LEVEL SECURITY;

GRANT SELECT ON TABLE public.story_comments TO anon, authenticated;
GRANT INSERT (story_id, user_id, parent_id, rating, comment) ON TABLE public.story_comments TO authenticated;
GRANT DELETE ON TABLE public.story_comments TO authenticated;

DROP POLICY IF EXISTS "Semua pengunjung dapat membaca ulasan cerita" ON public.story_comments;
DROP POLICY IF EXISTS "Pengguna login dapat menulis ulasan atas namanya sendiri" ON public.story_comments;
DROP POLICY IF EXISTS "Pengguna hanya dapat menghapus ulasannya sendiri" ON public.story_comments;

-- A. SELECT: Semua pengunjung dapat melihat daftar ulasan orang tua pada cerita
CREATE POLICY "Semua pengunjung dapat membaca ulasan cerita"
  ON public.story_comments
  FOR SELECT
  TO anon, authenticated
  USING (true);

-- B. INSERT: Hanya pengguna yang sudah login yang dapat mengirim ulasan dengan user_id miliknya sendiri
CREATE POLICY "Pengguna login dapat menulis ulasan atas namanya sendiri"
  ON public.story_comments
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- C. DELETE: Pengguna hanya dapat menghapus ulasan miliknya sendiri (user.id === comment.user_id)
CREATE POLICY "Pengguna hanya dapat menghapus ulasannya sendiri"
  ON public.story_comments
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);
