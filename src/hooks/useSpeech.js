import { useState, useCallback, useEffect, useRef } from 'react';

const MUTE_STORAGE_KEY = 'bukuna_quiz_muted_v1';

function playToneSequence(notes) {
  try {
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) return;
    if (!window.__bukunaAudioCtx) {
      window.__bukunaAudioCtx = new AudioCtx();
    }
    const ctx = window.__bukunaAudioCtx;
    if (ctx.state === 'suspended') {
      ctx.resume().catch(() => {});
    }
    const now = ctx.currentTime;
    notes.forEach(({ freq, start, duration, type = 'sine', gain = 0.12 }) => {
      const osc = ctx.createOscillator();
      const g = ctx.createGain();
      osc.type = type;
      osc.frequency.setValueAtTime(freq, now + start);
      g.gain.setValueAtTime(0.001, now + start);
      g.gain.exponentialRampToValueAtTime(gain, now + start + 0.02);
      g.gain.exponentialRampToValueAtTime(0.001, now + start + duration);
      osc.connect(g);
      g.connect(ctx.destination);
      osc.start(now + start);
      osc.stop(now + start + duration + 0.02);
    });
  } catch {
    // Abaikan jika browser memblokir autoplay audio sebelum interaksi
  }
}

/**
 * Hook Web Speech API (id-ID) + Efek Nada Ramah Anak (src/hooks/useSpeech.js)
 * - Membacakan soal, petunjuk, dan pujian dalam Bahasa Indonesia (id-ID)
 * - Menyediakan tombol ulang suara (repeat) dan tombol bisukan (mute)
 */
export default function useSpeech() {
  const [isMuted, setIsMuted] = useState(() => {
    try {
      return localStorage.getItem(MUTE_STORAGE_KEY) === 'true';
    } catch {
      return false;
    }
  });

  const [isSpeaking, setIsSpeaking] = useState(false);
  const lastTextRef = useRef('');

  const stopSpeaking = useCallback(() => {
    try {
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
    } catch {
      // Abaikan
    }
    setIsSpeaking(false);
  }, []);

  const speak = useCallback(
    (text, options = {}) => {
      const cleanText = String(text || '').trim();
      if (!cleanText) return false;
      lastTextRef.current = cleanText;

      if (typeof window !== 'undefined') {
        window.__LAST_SPOKEN_QUIZ_TEXT__ = cleanText;
        window.__SPEECH_CALL_COUNT__ = (window.__SPEECH_CALL_COUNT__ || 0) + 1;
      }

      if (isMuted && !options.ignoreMute) {
        setIsSpeaking(false);
        return false;
      }

      try {
        if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
          window.speechSynthesis.cancel();
          const utterance = new SpeechSynthesisUtterance(cleanText);
          utterance.lang = 'id-ID';
          utterance.rate = options.rate || 0.94;
          utterance.pitch = options.pitch || 1.1;

          const voices = window.speechSynthesis.getVoices
            ? window.speechSynthesis.getVoices()
            : [];
          const idVoice = voices.find(
            (v) => v.lang && v.lang.toLowerCase().startsWith('id')
          );
          if (idVoice) {
            utterance.voice = idVoice;
          }

          utterance.onstart = () => setIsSpeaking(true);
          utterance.onend = () => setIsSpeaking(false);
          utterance.onerror = () => setIsSpeaking(false);

          setIsSpeaking(true);
          window.speechSynthesis.speak(utterance);
          return true;
        }
      } catch {
        setIsSpeaking(false);
      }
      return false;
    },
    [isMuted]
  );

  const repeatLast = useCallback(() => {
    if (lastTextRef.current) {
      return speak(lastTextRef.current);
    }
    return false;
  }, [speak]);

  const toggleMute = useCallback(() => {
    setIsMuted((prev) => {
      const next = !prev;
      try {
        localStorage.setItem(MUTE_STORAGE_KEY, String(next));
      } catch {
        // Abaikan
      }
      if (next) {
        try {
          if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
            window.speechSynthesis.cancel();
          }
        } catch {
          // Abaikan
        }
        setIsSpeaking(false);
      }
      return next;
    });
  }, []);

  // Nada riang lembut saat jawaban benar (tanpa mengejutkan anak)
  const playCheerSound = useCallback(() => {
    if (isMuted) return;
    playToneSequence([
      { freq: 523.25, start: 0.0, duration: 0.12, type: 'triangle', gain: 0.12 }, // C5
      { freq: 659.25, start: 0.11, duration: 0.12, type: 'triangle', gain: 0.13 }, // E5
      { freq: 783.99, start: 0.22, duration: 0.24, type: 'triangle', gain: 0.15 }, // G5
    ]);
  }, [isMuted]);

  // Nada lembut saat mencoba lagi (BUKAN buzzer kasar!)
  const playGentleTrySound = useCallback(() => {
    if (isMuted) return;
    playToneSequence([
      { freq: 440.0, start: 0.0, duration: 0.14, type: 'sine', gain: 0.08 },
      { freq: 493.88, start: 0.14, duration: 0.18, type: 'sine', gain: 0.08 },
    ]);
  }, [isMuted]);

  // Nada perayaan selesai kuis
  const playFanfareSound = useCallback(() => {
    if (isMuted) return;
    playToneSequence([
      { freq: 523.25, start: 0.0, duration: 0.12, type: 'triangle', gain: 0.13 },
      { freq: 659.25, start: 0.12, duration: 0.12, type: 'triangle', gain: 0.13 },
      { freq: 783.99, start: 0.24, duration: 0.14, type: 'triangle', gain: 0.14 },
      { freq: 1046.5, start: 0.38, duration: 0.34, type: 'triangle', gain: 0.16 },
    ]);
  }, [isMuted]);

  useEffect(() => {
    return () => {
      try {
        if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
          window.speechSynthesis.cancel();
        }
      } catch {
        // Abaikan
      }
    };
  }, []);

  return {
    speak,
    repeatLast,
    stopSpeaking,
    toggleMute,
    isMuted,
    isSpeaking,
    playCheerSound,
    playGentleTrySound,
    playFanfareSound,
  };
}

