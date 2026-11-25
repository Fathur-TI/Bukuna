import { useEffect, useRef, useState } from 'react';

/**
 * Hook Penyimpanan Draf Otomatis (src/hooks/useAutosave.js)
 * - Menyimpan draf secara berkala saat ada perubahan yang belum disimpan
 * - Memasang peringatan beforeunload jika pengguna menutup tab sebelum tersimpan
 */
export default function useAutosave({ data, isDirty, onSave, intervalMs = 3500, enabled = true }) {
  const [lastSavedAt, setLastSavedAt] = useState(null);
  const [isSaving, setIsSaving] = useState(false);
  const [autosaveError, setAutosaveError] = useState('');
  const latestDataRef = useRef(data);
  const latestOnSaveRef = useRef(onSave);

  useEffect(() => {
    latestDataRef.current = data;
  }, [data]);

  useEffect(() => {
    latestOnSaveRef.current = onSave;
  }, [onSave]);

  // Autosave berkala saat data kotor (isDirty)
  useEffect(() => {
    if (!enabled || !isDirty) return undefined;

    const timer = setTimeout(async () => {
      if (typeof latestOnSaveRef.current !== 'function') return;
      try {
        setIsSaving(true);
        setAutosaveError('');
        await latestOnSaveRef.current(latestDataRef.current, { silent: true });
        setLastSavedAt(new Date());
      } catch (err) {
        setAutosaveError(
          (err && err.message) || 'Gagal menyimpan draf otomatis. Periksa ruang penyimpanan peramban.'
        );
      } finally {
        setIsSaving(false);
      }
    }, intervalMs);

    return () => clearTimeout(timer);
  }, [data, isDirty, intervalMs, enabled]);

  // Peringatan sebelum menutup tab jika masih ada perubahan yang belum disimpan
  useEffect(() => {
    const handleBeforeUnload = (e) => {
      if (isDirty) {
        e.preventDefault();
        e.returnValue = 'Ada perubahan cerita yang belum disimpan. Yakin ingin keluar?';
        return e.returnValue;
      }
      return undefined;
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [isDirty]);

  return {
    lastSavedAt,
    isSaving,
    autosaveError,
    setLastSavedAt,
  };
}

