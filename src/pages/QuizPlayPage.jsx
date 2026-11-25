import React, { useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Logo from '../components/Logo';
import QuizStart from '../components/quiz/QuizStart';
import QuizQuestion from '../components/quiz/QuizQuestion';
import QuizResult from '../components/quiz/QuizResult';
import useSpeech from '../hooks/useSpeech';
import useQuiz from '../hooks/useQuiz';
import { useBukuna } from '../context/BukunaContext';

/**
 * Halaman Bermain Kuis Interaktif (/kuis/:storyId) (src/pages/QuizPlayPage.jsx)
 * - Alur: Layar Mulai (QuizStart) -> 3-5 Soal (QuizQuestion) -> Layar Hasil Bintang 1-3 (QuizResult)
 * - Membacakan soal otomatis dengan Web Speech API (id-ID)
 * - Menyimpan hasil kuis ke localStorage agar tampil di menu "Hasil Kuis" pada halaman Akun
 */
export default function QuizPlayPage() {
  const { storyId } = useParams();
  const navigate = useNavigate();
  const { getAnyStoryById, getQuizForStory, saveQuizResult, showToast } = useBukuna();

  const quiz = getQuizForStory(storyId);
  const story = getAnyStoryById(storyId);

  const {
    speak,
    stopSpeaking,
    toggleMute,
    isMuted,
    playCheerSound,
    playGentleTrySound,
    playFanfareSound,
  } = useSpeech();

  const handleCompleteQuiz = useCallback(
    (resultData) => {
      saveQuizResult(resultData);
      playFanfareSound();
      speak(`Hore! Kamu hebat sekali dan mendapatkan ${resultData.bintang} bintang emas!`);
      showToast(`Kuis selesai! Kamu mendapatkan ${resultData.bintang} Bintang ⭐`);
    },
    [saveQuizResult, playFanfareSound, speak, showToast]
  );

  const {
    stage,
    totalQuestions,
    currentIndex,
    currentQuestion,
    triedOptionIds,
    feedbackState,
    feedbackMessage,
    showHint,
    earnedStars,
    startQuiz,
    submitAnswer,
    nextQuestion,
    restartQuiz,
  } = useQuiz(quiz, handleCompleteQuiz);

  // Otomatis bacakan soal saat berpindah ke soal baru
  useEffect(() => {
    if (stage === 'question' && currentQuestion && currentQuestion.prompt) {
      speak(currentQuestion.prompt);
    }
  }, [stage, currentIndex, currentQuestion, speak]);

  const handleStart = () => {
    startQuiz();
  };

  const handleAnswer = (isCorrect, optionId) => {
    const res = submitAnswer(isCorrect, optionId);
    if (res.status === 'correct') {
      playCheerSound();
      speak(res.message);
    } else if (res.status === 'retry') {
      playGentleTrySound();
      speak(res.message);
    }
  };

  const handleExit = () => {
    stopSpeaking();
    navigate('/kuis');
  };

  return (
    <div className="bukuna-doodle-bg min-h-screen flex flex-col pb-12">
      {/* Header Ringkas Kuis */}
      <header className="w-full max-w-[920px] mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
        <Logo size="sm" />
        <span className="px-4 py-1.5 rounded-full bg-[#005E5C] border border-[#1FAFAA] text-xs sm:text-sm font-heading font-extrabold text-[#FFE9B0]">
          🎯 Kuis Interaktif Anak
        </span>
      </header>

      <main className="flex-1 w-full max-w-[920px] mx-auto px-4 sm:px-6 pt-1 pb-8 flex flex-col justify-center">
        {stage === 'start' && (
          <QuizStart
            quiz={quiz}
            story={story}
            onStart={handleStart}
            onBack={handleExit}
            onSpeakIntro={speak}
          />
        )}

        {stage === 'question' && (
          <QuizQuestion
            question={currentQuestion}
            currentIndex={currentIndex}
            totalQuestions={totalQuestions}
            triedOptionIds={triedOptionIds}
            feedbackState={feedbackState}
            feedbackMessage={feedbackMessage}
            showHint={showHint}
            isMuted={isMuted}
            onToggleMute={toggleMute}
            onSpeakPrompt={speak}
            onSpeakText={speak}
            onAnswer={handleAnswer}
            onNextQuestion={nextQuestion}
            onRequestExit={handleExit}
          />
        )}

        {stage === 'result' && (
          <QuizResult
            quiz={quiz}
            stars={earnedStars}
            onPlayAgain={restartQuiz}
            onOtherStories={() => navigate('/kuis')}
            onGoHome={() => navigate('/beranda')}
            onSpeakResult={speak}
          />
        )}
      </main>
    </div>
  );
}

