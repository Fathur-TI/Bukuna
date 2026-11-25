-- =============================================================================
-- BUKUNA WEB — SKEMA DATABASE SUPABASE (PROFIL, CERITA, ULASAN & DASHBOARD ADMIN)
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
-- 4. Cari baris akun Anda, ubah nilai kolom "role" menjadi 'ADMIN' (atau kolom "peran" menjadi 'admin'),
--    lalu klik Save. (Trigger sinkronisasi otomatis akan menyamakan kolom role dan peran).
-- =============================================================================

-- =============================================================================
-- BAGIAN 1: TABEL PROFIL PENGGUNA (public.profiles)
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  nama_akun TEXT NOT NULL DEFAULT 'Guru & Orang Tua Bukuna',
  full_name TEXT NULL,
  peran TEXT NOT NULL DEFAULT 'guru',
  role TEXT NOT NULL DEFAULT 'USER',
  dibuat TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Pastikan seluruh kolom kompatibel (baik skema nama_akun/peran/dibuat maupun full_name/role/created_at)
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS nama_akun TEXT NOT NULL DEFAULT 'Guru & Orang Tua Bukuna';
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS full_name TEXT NULL;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS peran TEXT NOT NULL DEFAULT 'guru';
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS role TEXT NOT NULL DEFAULT 'USER';
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS dibuat TIMESTAMPTZ NOT NULL DEFAULT NOW();
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

-- Hapus constraint lama yang terlalu ketat jika ada, lalu pasang constraint yang mendukung huruf kecil & kapital
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_peran_check;
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_role_check;

ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_peran_check
  CHECK (UPPER(peran) IN ('GURU', 'ORANG_TUA', 'USER', 'EDITOR', 'ADMIN'));

ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_role_check
  CHECK (UPPER(role) IN ('GURU', 'ORANG_TUA', 'USER', 'EDITOR', 'ADMIN'));

COMMENT ON TABLE public.profiles IS 'Profil akun Guru, Orang Tua, & Admin BUKUNA yang terhubung ke auth.users.';

-- Fungsi bantu untuk memeriksa apakah pengguna yang sedang login adalah ADMIN
CREATE OR REPLACE FUNCTION public.is_bukuna_admin()
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.profiles
    WHERE id = auth.uid()
      AND (UPPER(COALESCE(role, '')) = 'ADMIN' OR UPPER(COALESCE(peran, '')) = 'ADMIN')
  );
$$;

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT SELECT ON TABLE public.profiles TO anon, authenticated;
GRANT INSERT (id, nama_akun, full_name) ON TABLE public.profiles TO authenticated;
GRANT UPDATE (nama_akun, full_name) ON TABLE public.profiles TO authenticated;

DROP POLICY IF EXISTS "Pengguna hanya dapat membaca profilnya sendiri" ON public.profiles;
DROP POLICY IF EXISTS "Profil publik dapat dibaca untuk menampilkan nama penulis ulasan" ON public.profiles;
DROP POLICY IF EXISTS "Pengguna hanya dapat membuat profilnya sendiri dengan peran guru" ON public.profiles;
DROP POLICY IF EXISTS "Pengguna hanya dapat mengubah profilnya sendiri tanpa mengubah peran" ON public.profiles;

-- A. SELECT: Semua pengunjung dapat membaca profil untuk nama penulis ulasan & Admin dapat melihat daftar pengguna
CREATE POLICY "Profil publik dapat dibaca untuk menampilkan nama penulis ulasan"
  ON public.profiles
  FOR SELECT
  TO anon, authenticated
  USING (true);

-- B. INSERT: Pengguna hanya dapat menyisipkan baris profil miliknya sendiri (bukan sebagai ADMIN)
CREATE POLICY "Pengguna hanya dapat membuat profilnya sendiri dengan peran guru"
  ON public.profiles
  FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = id
    AND UPPER(COALESCE(peran, 'guru')) <> 'ADMIN'
    AND UPPER(COALESCE(role, 'USER')) <> 'ADMIN'
  );

-- C. UPDATE: Pengguna hanya dapat mengubah profilnya sendiri tanpa menaikkan role/peran sendiri
CREATE POLICY "Pengguna hanya dapat mengubah profilnya sendiri tanpa mengubah peran"
  ON public.profiles
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = id OR public.is_bukuna_admin())
  WITH CHECK (
    auth.uid() = id OR public.is_bukuna_admin()
  );

-- Trigger Sinkronisasi Kolom (nama_akun <-> full_name, peran <-> role) & Pencegahan Escalation
CREATE OR REPLACE FUNCTION public.sync_and_protect_profile_columns()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Sinkronkan nama_akun dan full_name
  IF NEW.nama_akun IS NULL OR TRIM(NEW.nama_akun) = '' THEN
    NEW.nama_akun := COALESCE(NULLIF(TRIM(NEW.full_name), ''), 'Guru & Orang Tua Bukuna');
  END IF;
  IF NEW.full_name IS NULL OR TRIM(NEW.full_name) = '' THEN
    NEW.full_name := NEW.nama_akun;
  END IF;

  -- Jika UPDATE dipanggil oleh pengguna biasa (bukan dari SQL Editor/Table Editor/Admin), kunci kolom peran & role
  IF TG_OP = 'UPDATE' THEN
    IF (current_user IN ('authenticated', 'anon') OR auth.role() IN ('authenticated', 'anon'))
       AND NOT public.is_bukuna_admin() THEN
      NEW.peran := OLD.peran;
      NEW.role := OLD.role;
      NEW.dibuat := OLD.dibuat;
      NEW.created_at := OLD.created_at;
      RETURN NEW;
    END IF;

    -- Jika diubah dari Table Editor (misal salah satu kolom role atau peran diubah ke ADMIN), sinkronkan keduanya
    IF UPPER(COALESCE(NEW.role, '')) = 'ADMIN' AND UPPER(COALESCE(OLD.role, '')) <> 'ADMIN' THEN
      NEW.peran := 'admin';
      NEW.role := 'ADMIN';
    ELSIF UPPER(COALESCE(NEW.peran, '')) = 'ADMIN' AND UPPER(COALESCE(OLD.peran, '')) <> 'ADMIN' THEN
      NEW.role := 'ADMIN';
      NEW.peran := 'admin';
    END IF;
  ELSE
    -- Saat INSERT baru: selaraskan role & peran
    IF UPPER(COALESCE(NEW.role, '')) = 'ADMIN' OR UPPER(COALESCE(NEW.peran, '')) = 'ADMIN' THEN
      NEW.role := 'ADMIN';
      NEW.peran := 'admin';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_prevent_role_escalation ON public.profiles;
DROP TRIGGER IF EXISTS trg_sync_and_protect_profiles ON public.profiles;
CREATE TRIGGER trg_sync_and_protect_profiles
  BEFORE INSERT OR UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_and_protect_profile_columns();

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
    NULLIF(TRIM(NEW.raw_user_meta_data->>'full_name'), ''),
    NULLIF(TRIM(NEW.raw_user_meta_data->>'nama'), ''),
    NULLIF(TRIM(NEW.raw_user_meta_data->>'name'), ''),
    SPLIT_PART(COALESCE(NEW.email, 'Sahabat Bukuna'), '@', 1)
  );

  INSERT INTO public.profiles (id, nama_akun, full_name, peran, role, dibuat, created_at)
  VALUES (
    NEW.id,
    v_nama,
    v_nama,
    'guru',
    'USER',
    COALESCE(NEW.created_at, NOW()),
    COALESCE(NEW.created_at, NOW())
  )
  ON CONFLICT (id) DO UPDATE
    SET nama_akun = EXCLUDED.nama_akun,
        full_name = EXCLUDED.full_name;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_bukuna_user();


-- =============================================================================
-- BAGIAN 2: TABEL KOLEKSI CERITA (public.stories) — DIKELOLA LEWAT DASHBOARD ADMIN
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.stories (
  id TEXT PRIMARY KEY,
  slug TEXT UNIQUE NOT NULL,
  title TEXT NOT NULL,
  synopsis TEXT NOT NULL DEFAULT '',
  category TEXT NOT NULL DEFAULT 'Petualangan',
  age_category TEXT NOT NULL DEFAULT '4-5 Tahun',
  cover_url TEXT NOT NULL DEFAULT '/stories/kucing-hutan/cover.webp',
  moral_value TEXT NOT NULL DEFAULT '',
  pages JSONB NOT NULL DEFAULT '[]'::jsonb,
  content TEXT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE public.stories IS 'Koleksi buku cerita anak BUKUNA yang dapat dikelola melalui Dashboard Admin (/admin).';

ALTER TABLE public.stories ENABLE ROW LEVEL SECURITY;

GRANT SELECT ON TABLE public.stories TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON TABLE public.stories TO authenticated;

DROP POLICY IF EXISTS "Semua pengunjung dapat membaca katalog cerita" ON public.stories;
DROP POLICY IF EXISTS "Hanya Admin yang dapat menambah cerita" ON public.stories;
DROP POLICY IF EXISTS "Hanya Admin yang dapat mengubah cerita" ON public.stories;
DROP POLICY IF EXISTS "Hanya Admin yang dapat menghapus cerita" ON public.stories;

-- A. SELECT: Semua pengunjung (anon & authenticated) dapat membaca cerita di Beranda, Koleksi, & Halaman Baca
CREATE POLICY "Semua pengunjung dapat membaca katalog cerita"
  ON public.stories
  FOR SELECT
  TO anon, authenticated
  USING (true);

-- B. INSERT / UPDATE / DELETE: Hanya pengguna dengan role/peran ADMIN yang dapat mengelola tabel stories
CREATE POLICY "Hanya Admin yang dapat menambah cerita"
  ON public.stories
  FOR INSERT
  TO authenticated
  WITH CHECK (public.is_bukuna_admin());

CREATE POLICY "Hanya Admin yang dapat mengubah cerita"
  ON public.stories
  FOR UPDATE
  TO authenticated
  USING (public.is_bukuna_admin())
  WITH CHECK (public.is_bukuna_admin());

CREATE POLICY "Hanya Admin yang dapat menghapus cerita"
  ON public.stories
  FOR DELETE
  TO authenticated
  USING (public.is_bukuna_admin());


-- =============================================================================
-- BAGIAN 3: TABEL CATATAN & ULASAN ORANG TUA (public.story_comments)
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
DROP POLICY IF EXISTS "Pemilik ulasan atau Admin dapat menghapus komentar" ON public.story_comments;

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

-- C. DELETE: Pemilik komentar (auth.uid() = user_id) ATAU Admin (public.is_bukuna_admin()) dapat menghapus komentar
CREATE POLICY "Pemilik ulasan atau Admin dapat menghapus komentar"
  ON public.story_comments
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id OR public.is_bukuna_admin());
