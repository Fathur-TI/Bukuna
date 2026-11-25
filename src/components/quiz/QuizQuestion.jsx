import React, { useState } from 'react';
import { Volume2, VolumeX, X } from 'lucide-react';
import StarProgress from './StarProgress';
import PickImage from './PickImage';
import CountObjects from './CountObjects';
import MatchPairs from './MatchPairs';
import ColorShape from './ColorShape';
import OrderStory from './OrderStory';
import FeelingPick from './FeelingPick';
import QuizFeedback from './QuizFeedback';

/**
 * Container Satu Soal Kuis (src/components/quiz/QuizQuestion.jsx)
 * - Bar atas: tombol keluar (X) dengan konfirmasi sederhana, indikator progres bintang (StarProgress),
 *   dan tombol Mute / Suara Aktif.
 * - Kotak pertanyaan dengan tombol Speaker Besar ("Bacakan Soal")
 * - Merender komponen tipe soal yang sesuai (1 dari 6 tipe soal)
 * - Menampilkan umpan balik ramah (QuizFeedback) di bawah soal
 */
export default function QuizQuestion({
  question,
  currentIndex,
  totalQuestions,
  triedOptionIds,
  feedbackState,
  feedbackMessage,
  showHint,
  isMuted,
  onToggleMute,
  onSpeakPrompt,
  onSpeakText,
  onAnswer,
  onNextQuestion,
  onRequestExit,
}) {
  const [confirmExitOpen, setConfirmExitOpen] = useState(false);

  if (!question) return null;

  const isSolved = feedbackState === 'correct';
  const isLastQuestion = currentIndex + 1 >= totalQuestions;

  const renderQuestionBody = () => {
    const commonProps = {
      question,
      triedOptionIds,
      feedbackState,
      showHint,
      onSelectOption: onAnswer,
      onSpeakText,
    };

    switch (question.type) {
      case 'count-objects':
        return <CountObjects {...commonProps} />;
      case 'match-pairs':
        return <MatchPairs {...commonProps} />;
      case 'color-shape':
        return <ColorShape {...commonProps} />;
      case 'order-story':
        return <OrderStory {...commonProps} />;
      case 'feeling-pick':
        return <FeelingPick {...commonProps} />;
      case 'pick-image':
      default:
        return <PickImage {...commonProps} />;
    }
  };

  return (
    <div className="w-full max-w-[840px] mx-auto">
      {/* Bar Kontrol Atas: Keluar (X), Bintang Progres, dan Tombol Mute */}
      <div className="mb-4 bg-[#005E5C]/90 border-2 border-[#1FAFAA]/50 rounded-[26px] px-4 py-3 flex items-center justify-between gap-2 shadow-lg">
        <button
          type="button"
          onClick={() => setConfirmExitOpen(true)}
          aria-label="Keluar dari kuis"
          className="w-11 h-11 rounded-full bg-[#062D2C] hover:bg-red-500/80 text-white flex items-center justify-center transition-colors shrink-0 cursor-pointer"
        >
          <X className="w-6 h-6" />
        </button>

        <StarProgress
          total={totalQuestions}
          currentIndex={currentIndex}
          isCurrentSolved={isSolved}
        />

        <button
          type="button"
          onClick={onToggleMute}
          aria-label={isMuted ? 'Nyalakan suara kuis' : 'Matikan suara kuis (Mute)'}
          className={`min-h-[44px] px-3.5 py-2 rounded-full font-heading font-extrabold text-xs sm:text-sm inline-flex items-center gap-1.5 transition-colors shrink-0 cursor-pointer ${
            isMuted
              ? 'bg-[#062D2C] text-white/75 border border-white/25'
              : 'bg-[#1FAFAA] text-[#052625] border border-[#FFE9B0]'
          }`}
        >
          {isMuted ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
          <span className="hidden sm:inline">{isMuted ? 'Suara Mati' : 'Suara Aktif'}</span>
        </button>
      </div>

      {/* Panel Soal Utama */}
      <div className="bg-[#005E5C]/95 border-4 border-[#1FAFAA] rounded-[34px] p-4 sm:p-7 shadow-2xl">
        {/* Header Pertanyaan + Tombol Speaker Besar */}
        <div className="mb-6 bg-[#1FAFAA] rounded-[26px] p-4 sm:p-5 border-2 border-[#FFE9B0] flex flex-col sm:flex-row items-center gap-4 shadow-md">
          <button
            type="button"
            onClick={() => onSpeakPrompt(question.prompt)}
            aria-label="Bacakan soal dengan suara"
            className="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-[#E07030] hover:bg-[#C95B1E] text-white border-4 border-[#FFE9B0] shadow-xl flex flex-col items-center justify-center shrink-0 transition-transform active:scale-95 cursor-pointer"
          >
            <Volume2 className="w-8 h-8 sm:w-9 sm:h-9" />
            <span className="text-[10px] font-extrabold uppercase tracking-wider mt-0.5">
              Suara
            </span>
          </button>

          <div className="text-center sm:text-left flex-1">
            <span className="sub-help inline-block px-3 py-0.5 rounded-full bg-[#062D2C] text-[#FFE9B0] mb-1.5">
              Ketuk tombol oranye untuk mendengar soal 🔊
            </span>
            <h2 className="font-story font-bold text-xl sm:text-2xl lg:text-3xl text-[#052625] leading-snug">
              {question.prompt}
            </h2>
          </div>
        </div>

        {/* Isi Komponen Tipe Soal */}
        {renderQuestionBody()}

        {/* Umpan Balik Ramah Anak */}
        <QuizFeedback
          feedbackState={feedbackState}
          feedbackMessage={feedbackMessage}
          showHint={showHint}
          hintText={question.hint}
          isLastQuestion={isLastQuestion}
          onNextQuestion={onNextQuestion}
          onSpeakFeedback={onSpeakText}
        />
      </div>

      {/* Modal Konfirmasi Sederhana saat Tombol Keluar (X) Ditekan */}
      {confirmExitOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="exit-quiz-title"
          className="fixed inset-0 z-50 bg-black/75 flex items-center justify-center p-4"
        >
          <div className="w-full max-w-sm bg-[#005E5C] border-4 border-[#FFE9B0] rounded-[32px] p-6 text-center shadow-2xl">
            <div className="text-5xl mb-2">🐱</div>
            <h3
              id="exit-quiz-title"
              className="font-heading font-extrabold text-2xl text-[#FFE9B0]"
            >
              Ingin Istirahat Dulu?
            </h3>
            <p className="mt-2 text-sm text-white/90 font-semibold">
              Kamu bisa kembali bermain kuis bersama Rodri kapan saja!
            </p>
            <div className="mt-6 flex items-center justify-center gap-3">
              <button
                type="button"
                onClick={() => setConfirmExitOpen(false)}
                className="min-h-[48px] px-6 py-2.5 rounded-full bg-[#1FAFAA] hover:bg-[#159A95] text-[#052625] font-heading font-extrabold text-sm sm:text-base cursor-pointer"
              >
                Lanjut Main
              </button>
              <button
                type="button"
                onClick={onRequestExit}
                className="min-h-[48px] px-6 py-2.5 rounded-full bg-[#E07030] hover:bg-[#C95B1E] text-white font-heading font-extrabold text-sm sm:text-base cursor-pointer"
              >
                Ya, Keluar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

