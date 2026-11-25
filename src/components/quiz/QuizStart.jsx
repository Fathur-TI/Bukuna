import React from 'react';
import { Play, Volume2, ArrowLeft, Sparkles, Star } from 'lucide-react';
import StoryIllustration from '../StoryIllustration';
import Mascot from './Mascot';

/**
 * Layar Mulai Kuis Interaktif (src/components/quiz/QuizStart.jsx)
 * - Menampilkan sampul cerita/topik, maskot kucing Rodri, judul kuis, jumlah bintang soal,
 *   tombol dengarkan sapaan suara, dan tombol Play besar ("Mulai Main Kuis!")
 */
export default function QuizStart({ quiz, story, onStart, onBack, onSpeakIntro }) {
  const coverVariant = (story && story.cover) || quiz.cover || 'cat-magic-forest';
  const questionCount = Array.isArray(quiz.questions) ? quiz.questions.length : 0;

  return (
    <div className="w-full max-w-[760px] mx-auto bg-[#005E5C]/95 border-4 border-[#1FAFAA] rounded-[34px] p-5 sm:p-8 shadow-2xl text-center">
      {/* Bar Atas: Kembali & Dengarkan Suara */}
      <div className="flex items-center justify-between gap-2 mb-4">
        <button
          type="button"
          onClick={onBack}
          className="min-h-[46px] px-4 py-2 rounded-full bg-white/15 hover:bg-white/25 text-white font-heading font-bold text-sm inline-flex items-center gap-2 transition-colors cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Kembali</span>
        </button>

        <button
          type="button"
          onClick={() =>
            onSpeakIntro &&
            onSpeakIntro(`Ayo bermain ${quiz.judul}! Ketuk tombol mulai berwarna oranye ya!`)
          }
          aria-label="Bacakan judul kuis"
          className="min-h-[46px] px-4 py-2 rounded-full bg-[#1FAFAA] hover:bg-[#159A95] text-[#052625] font-heading font-extrabold text-sm inline-flex items-center gap-2 shadow-md transition-colors cursor-pointer"
        >
          <Volume2 className="w-5 h-5" />
          <span>Dengarkan Suara</span>
        </button>
      </div>

      {/* Sampul & Maskot Rodri */}
      <div className="relative mx-auto w-48 sm:w-56 aspect-[4/4.2] rounded-[26px] overflow-hidden border-4 border-[#FFE9B0] shadow-xl bg-[#007A78]">
        <StoryIllustration
          variant={coverVariant}
          title={quiz.judul}
          alt={(story && story.coverAlt) || quiz.coverAlt || quiz.judul}
          showCoverTitle={false}
          sizeVariant="lg"
          fit="cover"
          loading="eager"
          className="w-full h-full"
        />
        <div className="sub-chip absolute bottom-2 right-2 px-3 py-1 rounded-full bg-[#062D2C]/90 text-[#FFE9B0] border border-[#FFE9B0]/60 inline-flex items-center gap-1">
          <Star className="w-3.5 h-3.5 fill-[#FFE9B0]" />
          <span>{questionCount} Permainan</span>
        </div>
      </div>

      {/* Maskot Menyapa */}
      <div className="mt-5 flex justify-center">
        <Mascot
          mood="happy"
          size="md"
          message="Halo teman kecil! Yuk kita bermain tebak gambar dan suara bersama Rodri!"
        />
      </div>

      {/* Judul & Deskripsi Singkat */}
      <div className="mt-5">
        <span className="sub-chip inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full bg-[#1FAFAA]/25 border border-[#1FAFAA] text-[#FFE9B0]">
          <Sparkles className="w-3.5 h-3.5" />
          <span>{quiz.kategori || 'Kuis Interaktif Anak'} • {quiz.usia || '4-5 Tahun'}</span>
        </span>
        <h1 className="mt-2 font-heading font-extrabold text-2xl sm:text-4xl text-[#FFE9B0] leading-tight">
          {quiz.judul}
        </h1>
        {quiz.deskripsi && (
          <p className="sub-section mt-2 text-white/90 max-w-lg mx-auto">
            {quiz.deskripsi}
          </p>
        )}
      </div>

      {/* Tombol Play Besar */}
      <div className="mt-7 flex justify-center">
        <button
          type="button"
          onClick={onStart}
          className="w-full sm:w-auto min-w-[260px] min-h-[68px] px-10 py-4 rounded-full bg-[#E07030] hover:bg-[#C95B1E] text-white font-heading font-extrabold text-xl sm:text-2xl shadow-[0_10px_26px_rgba(224,112,48,0.5)] border-4 border-[#FFE9B0] inline-flex items-center justify-center gap-3 transition-all active:scale-95 cursor-pointer"
        >
          <Play className="w-8 h-8 fill-white" />
          <span>Mulai Main Kuis!</span>
        </button>
      </div>
    </div>
  );
}

