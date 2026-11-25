import { useState, useCallback, useMemo, useEffect } from 'react';

const PRAISE_MESSAGES = [
  'Hebat! Jawabanmu tepat sekali!',
  'Pintar sekali! Kamu berhasil!',
  'Wah, luar biasa! Ayo lanjut!',
  'Benar sekali! Rodri ikut senang!',
];

/**
 * Hook Logika Kuis Interaktif Anak Usia Dini (src/hooks/useQuiz.js)
 * - Tanpa batas waktu, tanpa skor negatif, tanpa kata "salah"
 * - Setelah 2 kali percobaan belum tepat pada satu soal, otomatis menyalakan petunjuk (showHint = true)
 * - Soal berikutnya muncul setelah anak menjawab benar
 * - Menghasilkan 1-3 bintang apresiasi (tidak pernah 0 bintang)
 */
export default function useQuiz(quiz, onCompleteQuiz) {
  const questions = useMemo(() => (quiz && Array.isArray(quiz.questions) ? quiz.questions : []), [quiz]);
  const totalQuestions = questions.length;

  const [stage, setStage] = useState('start'); // 'start' | 'question' | 'result'
  const [currentIndex, setCurrentIndex] = useState(0);
  const [attemptsOnCurrent, setAttemptsOnCurrent] = useState(0);
  const [totalExtraAttempts, setTotalExtraAttempts] = useState(0);
  const [triedOptionIds, setTriedOptionIds] = useState([]);
  const [feedbackState, setFeedbackState] = useState('idle'); // 'idle' | 'correct' | 'retry'
  const [feedbackMessage, setFeedbackMessage] = useState('');
  const [earnedStars, setEarnedStars] = useState(3);

  const currentQuestion = questions[currentIndex] || null;
  const showHint = attemptsOnCurrent >= 2;

  // Reset state kuis setiap kali berpindah ke kuis/cerita yang berbeda
  useEffect(() => {
    setStage('start');
    setCurrentIndex(0);
    setAttemptsOnCurrent(0);
    setTotalExtraAttempts(0);
    setTriedOptionIds([]);
    setFeedbackState('idle');
    setFeedbackMessage('');
  }, [quiz && quiz.id]);

  const mascotMood = useMemo(() => {
    if (stage === 'start') return 'idle';
    if (stage === 'result') return 'celebrate';
    if (feedbackState === 'correct') return 'happy';
    if (feedbackState === 'retry') return 'encouraging';
    return 'thinking';
  }, [stage, feedbackState]);

  const startQuiz = useCallback(() => {
    setCurrentIndex(0);
    setAttemptsOnCurrent(0);
    setTotalExtraAttempts(0);
    setTriedOptionIds([]);
    setFeedbackState('idle');
    setFeedbackMessage('');
    setStage('question');
  }, []);

  const submitAnswer = useCallback(
    (isCorrect, optionId = null) => {
      if (feedbackState === 'correct') return { status: 'already-correct' };

      if (isCorrect) {
        const praise = PRAISE_MESSAGES[currentIndex % PRAISE_MESSAGES.length];
        setFeedbackState('correct');
        setFeedbackMessage(praise);
        return { status: 'correct', message: praise };
      } else {
        const nextAttempts = attemptsOnCurrent + 1;
        setAttemptsOnCurrent(nextAttempts);
        setTotalExtraAttempts((prev) => prev + 1);
        if (optionId) {
          setTriedOptionIds((prev) => (prev.includes(optionId) ? prev : [...prev, optionId]));
        }
        const retryMsg =
          nextAttempts >= 2 && currentQuestion && currentQuestion.hint
            ? `Ayo coba lagi! Petunjuk: ${currentQuestion.hint}`
            : 'Ayo coba lagi! Kamu pasti bisa!';
        setFeedbackState('retry');
        setFeedbackMessage(retryMsg);
        return {
          status: 'retry',
          attempts: nextAttempts,
          showHint: nextAttempts >= 2,
          message: retryMsg,
        };
      }
    },
    [feedbackState, currentIndex, attemptsOnCurrent, currentQuestion]
  );

  const nextQuestion = useCallback(() => {
    if (currentIndex + 1 < totalQuestions) {
      setCurrentIndex((prev) => prev + 1);
      setAttemptsOnCurrent(0);
      setTriedOptionIds([]);
      setFeedbackState('idle');
      setFeedbackMessage('');
    } else {
      // Hitung bintang 1-3 (tidak pernah 0 bintang!)
      let stars = 3;
      if (totalExtraAttempts >= 5) {
        stars = 1;
      } else if (totalExtraAttempts >= 2) {
        stars = 2;
      }
      setEarnedStars(stars);
      setStage('result');
      if (onCompleteQuiz && quiz) {
        onCompleteQuiz({
          storyId: quiz.storyId || quiz.id,
          quizId: quiz.id,
          judul: quiz.judul,
          bintang: stars,
          totalSoal: totalQuestions,
          tanggal: new Date().toISOString(),
        });
      }
    }
  }, [currentIndex, totalQuestions, totalExtraAttempts, onCompleteQuiz, quiz]);

  const restartQuiz = useCallback(() => {
    setCurrentIndex(0);
    setAttemptsOnCurrent(0);
    setTotalExtraAttempts(0);
    setTriedOptionIds([]);
    setFeedbackState('idle');
    setFeedbackMessage('');
    setStage('question');
  }, []);

  return {
    stage,
    setStage,
    questions,
    totalQuestions,
    currentIndex,
    currentQuestion,
    attemptsOnCurrent,
    triedOptionIds,
    feedbackState,
    feedbackMessage,
    showHint,
    mascotMood,
    earnedStars,
    startQuiz,
    submitAnswer,
    nextQuestion,
    restartQuiz,
  };
}
