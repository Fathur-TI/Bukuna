import React from 'react';
import {
  Sparkles,
  Plus,
  Trash2,
  RefreshCw,
  CheckCircle2,
  Image as ImageIcon,
  ListOrdered,
} from 'lucide-react';
import TextInput from '../TextInput';
import StoryIllustration from '../StoryIllustration';

const PRESET_DISTRACTOR_IMAGES = [
  { value: 'sky-balloons', label: 'Ilustrasi: Balon Udara Ceria' },
  { value: 'cloud-ship', label: 'Ilustrasi: Kapal Awan Malam' },
  { value: 'rabbit-garden', label: 'Ilustrasi: Kebun Kelinci' },
  { value: 'river-clean', label: 'Ilustrasi: Sungai Jernih' },
  { value: 'family-home', label: 'Ilustrasi: Rumah Hangat' },
  { value: 'ants-team', label: 'Ilustrasi: Semut Bergotong Royong' },
  { value: 'cat-magic-forest', label: 'Ilustrasi: Kucing di Hutan Ajaib' },
];

function extractSceneShortLabel(page, idx, fallbackText) {
  if (page && typeof page.alt === 'string' && page.alt.trim()) {
    return page.alt.trim().slice(0, 48);
  }
  if (page && typeof page.teks === 'string' && page.teks.trim()) {
    const firstSentence = page.teks
      .trim()
      .split(/[.!?]/)[0]
      .trim();
    if (firstSentence) {
      return firstSentence.length > 44
        ? `${firstSentence.slice(0, 44)}...`
        : firstSentence;
    }
  }
  return fallbackText || `Adegan Halaman ${idx + 1}`;
}

/**
 * Menghasilkan otomatis 3 soal kuis interaktif (2 Pilih Gambar + 1 Urutkan Kejadian)
 * langsung dari gambar & teks halaman cerita buatan pengguna.
 */
export function generateAutoQuizFromStory(storyData) {
  const judul =
    storyData && storyData.judul && storyData.judul.trim()
      ? storyData.judul.trim()
      : 'Cerita Buatanku';
  const coverImg = (storyData && storyData.cover) || 'cat-magic-forest';
  const pages =
    storyData && Array.isArray(storyData.pages) && storyData.pages.length > 0
      ? storyData.pages
      : [{ id: 'hal-1', halaman: 1, gambar: coverImg, teks: '', alt: '' }];

  const firstPage = pages[0];
  const midIdx = Math.floor((pages.length - 1) / 2);
  const midPage = pages[midIdx] || firstPage;
  const lastIdx = pages.length - 1;
  const lastPage = pages[lastIdx] || firstPage;

  const firstImg = (firstPage && firstPage.gambar) || coverImg;
  const midImg = (midPage && midPage.gambar) || coverImg;
  const lastImg = (lastPage && lastPage.gambar) || coverImg;

  const firstLabel = extractSceneShortLabel(firstPage, 0, 'Awal Cerita');
  const midLabel = extractSceneShortLabel(midPage, midIdx, 'Tengah Cerita');
  const lastLabel = extractSceneShortLabel(lastPage, lastIdx, 'Akhir Cerita');

  const now = Date.now();

  const q1 = {
    id: `q-usr-${now}-1`,
    type: 'pick-image',
    prompt: `Gambar mana yang muncul pada awal cerita "${judul}"?`,
    voiceText: `Gambar mana yang muncul pada awal cerita ${judul}?`,
    hint: `Ingat kembali gambar pada halaman pertama cerita "${judul}" tadi ya!`,
    options: [
      {
        id: `opt-${now}-1a`,
        label: firstLabel,
        gambar: firstImg,
        emoji: '📖',
        isCorrect: true,
      },
      {
        id: `opt-${now}-1b`,
        label: 'Balon Terbang di Awan',
        gambar: 'sky-balloons',
        emoji: '🎈',
        isCorrect: false,
      },
      {
        id: `opt-${now}-1c`,
        label: 'Kapal Layar Samudra',
        gambar: 'cloud-ship',
        emoji: '⛵',
        isCorrect: false,
      },
    ],
  };

  const q2 = {
    id: `q-usr-${now}-2`,
    type: 'pick-image',
    prompt: `Gambar mana yang menceritakan bagian akhir dari "${judul}"?`,
    voiceText: `Gambar mana yang menceritakan bagian akhir dari ${judul}?`,
    hint: `Lihat gambar yang ada di halaman terakhir cerita "${judul}" ya!`,
    options: [
      {
        id: `opt-${now}-2a`,
        label: 'Taman Kelinci Wortel',
        gambar: 'rabbit-garden',
        emoji: '🐰',
        isCorrect: false,
      },
      {
        id: `opt-${now}-2b`,
        label: lastLabel,
        gambar: lastImg,
        emoji: '🌟',
        isCorrect: true,
      },
      {
        id: `opt-${now}-2c`,
        label: 'Sungai Hutan Hijau',
        gambar: 'river-clean',
        emoji: '🏞️',
        isCorrect: false,
      },
    ],
  };

  const q3 = {
    id: `q-usr-${now}-3`,
    type: 'order-story',
    prompt: `Susun 3 gambar kejadian cerita "${judul}" dari awal sampai selesai ya!`,
    voiceText: `Susun tiga gambar kejadian cerita ${judul} dari awal sampai selesai ya!`,
    hint: `Urutkan dari kejadian halaman awal (1), halaman tengah (2), lalu halaman akhir (3) ya!`,
    sequence: [
      {
        id: `seq-${now}-1`,
        label: firstLabel,
        gambar: firstImg,
        emoji: '1️⃣',
        correctOrder: 1,
      },
      {
        id: `seq-${now}-2`,
        label: midLabel,
        gambar: midImg,
        emoji: '2️⃣',
        correctOrder: 2,
      },
      {
        id: `seq-${now}-3`,
        label: lastLabel,
        gambar: lastImg,
        emoji: '3️⃣',
        correctOrder: 3,
      },
    ],
  };

  return {
    judul: `Kuis ${judul}`,
    questions: [q1, q2, q3],
  };
}

/**
 * Komponen Pembuat & Editor Kuis Cerita Buatan Pengguna (src/components/editor/StoryQuizBuilder.jsx)
 * - Tombol "Buat Kuis dari Cerita Ini" menghasilkan otomatis 2-3 soal Pilih Gambar & Urutkan Kejadian
 * - Guru dapat mengedit teks pertanyaan, petunjuk, pilihan jawaban, gambar halaman, atau menambah/menghapus soal
 */
export default function StoryQuizBuilder({
  storyData,
  onChangeQuiz,
  onNotify,
}) {
  const quiz = storyData && storyData.quiz ? storyData.quiz : null;
  const hasQuiz =
    Boolean(quiz) &&
    Array.isArray(quiz.questions) &&
    quiz.questions.length > 0;

  const pages = Array.isArray(storyData?.pages) ? storyData.pages : [];
  const coverImage = storyData?.cover || 'cat-magic-forest';

  // Daftar sumber gambar yang bisa dipilih guru (dari halaman cerita pengguna + sampul + ilustrasi bawaan)
  const availableImageChoices = [
    {
      value: coverImage,
      label: 'Sampul Cerita Pengguna',
    },
    ...pages.map((p, idx) => ({
      value: p.gambar || coverImage,
      label: `Gambar Halaman ${idx + 1}${
        p.alt ? ` (${p.alt.slice(0, 24)})` : ''
      }`,
    })),
    ...PRESET_DISTRACTOR_IMAGES,
  ];

  const handleGenerateAutoQuiz = () => {
    const generated = generateAutoQuizFromStory(storyData);
    onChangeQuiz(generated);
    if (onNotify) {
      onNotify(
        '3 soal kuis interaktif berhasil dibuat otomatis dari gambar halaman ceritamu!'
      );
    }
  };

  const handleRemoveQuiz = () => {
    onChangeQuiz(null);
    if (onNotify) {
      onNotify('Kuis cerita telah dihapus dari cerita ini.');
    }
  };

  const updateQuestion = (qIdx, updater) => {
    if (!hasQuiz) return;
    onChangeQuiz((prevQuiz) => {
      const baseQuiz = prevQuiz && Array.isArray(prevQuiz.questions) ? prevQuiz : quiz;
      if (!baseQuiz || !Array.isArray(baseQuiz.questions)) return prevQuiz;
      const nextQuestions = baseQuiz.questions.map((q, idx) =>
        idx === qIdx ? updater(q) : q
      );
      return {
        ...baseQuiz,
        questions: nextQuestions,
      };
    });
  };

  const handleAddPickImageQuestion = () => {
    const currentQuestions = hasQuiz ? quiz.questions : [];
    if (currentQuestions.length >= 8) return;
    const firstImg = (pages[0] && pages[0].gambar) || coverImage;
    const now = Date.now();
    const newQ = {
      id: `q-usr-${now}-${currentQuestions.length + 1}`,
      type: 'pick-image',
      prompt: `Gambar mana yang sesuai dengan cerita "${
        storyData.judul || 'Kita'
      }"?`,
      voiceText: `Gambar mana yang sesuai dengan cerita ${
        storyData.judul || 'Kita'
      }?`,
      hint: 'Perhatikan gambar halaman cerita tadi ya!',
      options: [
        {
          id: `opt-${now}-1`,
          label: extractSceneShortLabel(pages[0], 0, 'Gambar Cerita'),
          gambar: firstImg,
          emoji: '📖',
          isCorrect: true,
        },
        {
          id: `opt-${now}-2`,
          label: 'Balon Warna-Warni',
          gambar: 'sky-balloons',
          emoji: '🎈',
          isCorrect: false,
        },
        {
          id: `opt-${now}-3`,
          label: 'Kapal Awan Biru',
          gambar: 'cloud-ship',
          emoji: '⛵',
          isCorrect: false,
        },
      ],
    };
    onChangeQuiz({
      judul: (quiz && quiz.judul) || `Kuis ${storyData.judul || 'Ceritaku'}`,
      questions: [...currentQuestions, newQ],
    });
  };

  const handleAddOrderQuestion = () => {
    const currentQuestions = hasQuiz ? quiz.questions : [];
    if (currentQuestions.length >= 8) return;
    const auto = generateAutoQuizFromStory(storyData);
    const orderTemplate = auto.questions.find((q) => q.type === 'order-story');
    onChangeQuiz({
      judul: (quiz && quiz.judul) || `Kuis ${storyData.judul || 'Ceritaku'}`,
      questions: [...currentQuestions, orderTemplate],
    });
  };

  const handleDeleteQuestion = (qIdx) => {
    if (!hasQuiz) return;
    const nextQuestions = quiz.questions.filter((_, idx) => idx !== qIdx);
    if (nextQuestions.length === 0) {
      onChangeQuiz(null);
    } else {
      onChangeQuiz({
        ...quiz,
        questions: nextQuestions,
      });
    }
  };

  return (
    <section
      aria-label="Pembuat Kuis Interaktif dari Cerita Ini"
      className="bg-[#005E5C]/95 border-4 border-[#FFE9B0]/70 rounded-[30px] p-5 sm:p-7 shadow-2xl"
    >
      {/* Header Bagian Kuis Cerita */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <div className="sub-chip inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#E07030] text-white uppercase tracking-wider mb-1.5">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Integrasi Kuis Interaktif Anak</span>
          </div>
          <h3 className="font-heading font-extrabold text-2xl sm:text-3xl text-[#FFE9B0]">
            🎯 Kuis Interaktif dari Cerita Ini
          </h3>
          <p className="sub-section text-white/90 mt-1">
            Buat otomatis 2–3 soal bergambar & bersuara dari halaman ceritamu.
            Ibu/Bapak Guru bisa mengedit soal dan pilihan jawaban sebelum
            disimpan!
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {!hasQuiz ? (
            <button
              type="button"
              onClick={handleGenerateAutoQuiz}
              className="min-h-[52px] px-6 py-3 rounded-full bg-[#FFE9B0] hover:bg-white text-[#052625] border-4 border-[#E07030] font-heading font-extrabold text-sm sm:text-base shadow-xl inline-flex items-center gap-2.5 transition-all cursor-pointer"
            >
              <Sparkles className="w-5 h-5 text-[#E07030]" />
              <span>Buat Kuis dari Cerita Ini</span>
            </button>
          ) : (
            <>
              <button
                type="button"
                onClick={handleGenerateAutoQuiz}
                className="min-h-[44px] px-4 py-2 rounded-full bg-[#1FAFAA] hover:bg-[#159A95] text-[#052625] font-heading font-extrabold text-xs sm:text-sm inline-flex items-center gap-1.5 shadow-md transition-all cursor-pointer"
              >
                <RefreshCw className="w-4 h-4" />
                <span>Buat Ulang Otomatis</span>
              </button>

              <button
                type="button"
                onClick={handleRemoveQuiz}
                className="min-h-[44px] px-4 py-2 rounded-full bg-red-500/20 hover:bg-red-500/35 border border-red-300 text-red-200 font-heading font-bold text-xs sm:text-sm inline-flex items-center gap-1.5 transition-all cursor-pointer"
              >
                <Trash2 className="w-4 h-4" />
                <span>Hapus Kuis</span>
              </button>
            </>
          )}
        </div>
      </div>

      {/* Jika belum ada kuis, tampilkan kartu ajakan ramah */}
      {!hasQuiz ? (
        <div className="mt-5 rounded-[24px] bg-[#062D2C]/75 border-2 border-dashed border-[#1FAFAA]/60 p-6 text-center">
          <p className="text-sm sm:text-base font-bold text-[#FFE9B0]">
            Cerita ini belum memiliki kuis interaktif.
          </p>
          <p className="mt-1 text-xs sm:text-sm font-semibold text-white/85 max-w-xl mx-auto">
            Klik tombol <strong>&ldquo;Buat Kuis dari Cerita Ini&rdquo;</strong>{' '}
            di atas agar BUKUNA menyusun soal Pilih Gambar dan Urutkan Kejadian
            secara otomatis dari gambar halaman ceritamu!
          </p>
        </div>
      ) : (
        <div className="mt-6 space-y-6">
          {/* Bar Info Jumlah Soal & Tambah Soal */}
          <div className="flex flex-wrap items-center justify-between gap-3 bg-[#062D2C]/80 border border-[#1FAFAA]/50 rounded-2xl px-4 py-3">
            <div className="flex items-center gap-2 text-xs sm:text-sm font-extrabold text-[#FFE9B0]">
              <CheckCircle2 className="w-4 h-4 text-[#1FAFAA]" />
              <span>
                {quiz.questions.length} Soal Aktif (Tersimpan bersama cerita &
                ikut diekspor ke .json)
              </span>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={handleAddPickImageQuestion}
                className="min-h-[38px] px-3.5 py-1.5 rounded-full bg-[#E07030] hover:bg-[#C95B1E] text-white font-heading font-extrabold text-xs inline-flex items-center gap-1.5 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>+ Soal Pilih Gambar</span>
              </button>

              <button
                type="button"
                onClick={handleAddOrderQuestion}
                className="min-h-[38px] px-3.5 py-1.5 rounded-full bg-[#1FAFAA] hover:bg-[#159A95] text-[#052625] font-heading font-extrabold text-xs inline-flex items-center gap-1.5 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>+ Soal Urutkan Kejadian</span>
              </button>
            </div>
          </div>

          {/* Daftar Editor Soal Kuis */}
          <div className="space-y-5">
            {quiz.questions.map((question, qIdx) => {
              const isOrderType = question.type === 'order-story';

              return (
                <div
                  key={question.id || `quiz-q-${qIdx}`}
                  className="bg-[#062D2C]/90 border-2 border-[#1FAFAA]/60 rounded-[26px] p-4 sm:p-6 space-y-4 shadow-lg"
                >
                  {/* Baris Atas Kartu Soal */}
                  <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-white/15">
                    <div className="flex items-center gap-2">
                      <span className="px-3 py-1 rounded-full bg-[#FFE9B0] text-[#052625] font-heading font-extrabold text-xs sm:text-sm">
                        Soal {qIdx + 1}
                      </span>
                      <span className="px-3 py-1 rounded-full bg-[#005E5C] text-[#FFE9B0] font-bold text-xs inline-flex items-center gap-1.5 border border-[#1FAFAA]/40">
                        {isOrderType ? (
                          <>
                            <ListOrdered className="w-3.5 h-3.5" />
                            <span>Urutkan 3 Kejadian Cerita</span>
                          </>
                        ) : (
                          <>
                            <ImageIcon className="w-3.5 h-3.5" />
                            <span>Pilih Gambar yang Benar</span>
                          </>
                        )}
                      </span>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleDeleteQuestion(qIdx)}
                      aria-label={`Hapus Soal ${qIdx + 1}`}
                      className="min-h-[36px] px-3 py-1 rounded-full bg-red-500/20 hover:bg-red-500/35 text-red-200 font-bold text-xs inline-flex items-center gap-1 cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Hapus Soal</span>
                    </button>
                  </div>

                  {/* Input Kalimat Pertanyaan & Kalimat Petunjuk */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <TextInput
                      id={`quiz-q-prompt-${qIdx}`}
                      name={`quizPrompt_${qIdx}`}
                      label={`Kalimat Pertanyaan Soal ${qIdx + 1} (Dibacakan Suara)`}
                      value={question.prompt || ''}
                      onChange={(e) => {
                        const val = e.target.value;
                        updateQuestion(qIdx, (prev) => ({
                          ...prev,
                          prompt: val,
                          voiceText: val,
                        }));
                      }}
                      placeholder="Contoh: Gambar mana yang muncul di awal cerita?"
                    />

                    <TextInput
                      id={`quiz-q-hint-${qIdx}`}
                      name={`quizHint_${qIdx}`}
                      label="Petunjuk Ramah (Muncul Jika Anak Mencoba Lagi)"
                      value={question.hint || ''}
                      onChange={(e) => {
                        const val = e.target.value;
                        updateQuestion(qIdx, (prev) => ({
                          ...prev,
                          hint: val,
                        }));
                      }}
                      placeholder="Contoh: Ingat gambar halaman pertama tadi ya!"
                    />
                  </div>

                  {/* Editor Pilihan untuk Tipe Pilih Gambar */}
                  {!isOrderType && Array.isArray(question.options) && (
                    <div className="space-y-3 pt-1">
                      <p className="text-xs font-extrabold uppercase tracking-wider text-[#1FAFAA]">
                        Pilihan Gambar Jawaban (Klik &ldquo;Jawaban Benar&rdquo;
                        untuk memilih kunci jawaban):
                      </p>

                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        {question.options.map((opt, oIdx) => {
                          const isCorrect = Boolean(opt.isCorrect);
                          return (
                            <div
                              key={opt.id || `opt-${qIdx}-${oIdx}`}
                              className={`rounded-2xl p-3.5 border-2 flex flex-col justify-between gap-3 ${
                                isCorrect
                                  ? 'bg-[#005E5C] border-[#FFE9B0] ring-2 ring-[#FFE9B0]/60'
                                  : 'bg-[#004A48]/80 border-white/20'
                              }`}
                            >
                              <div className="space-y-2.5">
                                {/* Pratinjau Gambar Pilihan */}
                                <div className="relative aspect-[4/3] w-full rounded-xl overflow-hidden border border-white/30 bg-[#062D2C]">
                                  <StoryIllustration
                                    variant={opt.gambar || coverImage}
                                    title={opt.label}
                                    alt={opt.label}
                                    showCoverTitle={false}
                                    className="w-full h-full"
                                  />
                                  <span
                                    className={`absolute top-2 left-2 px-2.5 py-0.5 rounded-full text-[11px] font-extrabold ${
                                      isCorrect
                                        ? 'bg-[#FFE9B0] text-[#052625]'
                                        : 'bg-black/60 text-white'
                                    }`}
                                  >
                                    Pilihan {oIdx + 1}
                                  </span>
                                </div>

                                {/* Pilih Sumber Gambar dari Halaman Cerita */}
                                <div>
                                  <label
                                    htmlFor={`quiz-opt-img-${qIdx}-${oIdx}`}
                                    className="block text-[11px] font-bold text-[#FFE9B0] mb-1 pl-1"
                                  >
                                    Sumber Gambar:
                                  </label>
                                  <select
                                    id={`quiz-opt-img-${qIdx}-${oIdx}`}
                                    name={`quizOptImg_${qIdx}_${oIdx}`}
                                    value={opt.gambar || coverImage}
                                    onChange={(e) => {
                                      const nextImg = e.target.value;
                                      updateQuestion(qIdx, (prev) => ({
                                        ...prev,
                                        options: prev.options.map((item, idx) =>
                                          idx === oIdx
                                            ? { ...item, gambar: nextImg }
                                            : item
                                        ),
                                      }));
                                    }}
                                    className="w-full min-h-[38px] rounded-xl bg-[#062D2C] text-white border border-[#1FAFAA]/60 px-2.5 py-1.5 text-xs font-bold focus:outline-none focus:border-[#FFE9B0]"
                                  >
                                    {availableImageChoices.map((choice, cIdx) => (
                                      <option
                                        key={`${choice.value}-${cIdx}`}
                                        value={choice.value}
                                      >
                                        {choice.label}
                                      </option>
                                    ))}
                                  </select>
                                </div>

                                {/* Label Teks Pilihan */}
                                <TextInput
                                  id={`quiz-opt-label-${qIdx}-${oIdx}`}
                                  name={`quizOptLabel_${qIdx}_${oIdx}`}
                                  label={`Label Pilihan ${oIdx + 1}`}
                                  value={opt.label || ''}
                                  onChange={(e) => {
                                    const nextLabel = e.target.value;
                                    updateQuestion(qIdx, (prev) => ({
                                      ...prev,
                                      options: prev.options.map((item, idx) =>
                                        idx === oIdx
                                          ? { ...item, label: nextLabel }
                                          : item
                                      ),
                                    }));
                                  }}
                                  placeholder="Nama gambar pilihan"
                                />
                              </div>

                              {/* Tombol Kunci Jawaban Benar */}
                              <button
                                type="button"
                                onClick={() => {
                                  updateQuestion(qIdx, (prev) => ({
                                    ...prev,
                                    options: prev.options.map((item, idx) => ({
                                      ...item,
                                      isCorrect: idx === oIdx,
                                    })),
                                  }));
                                }}
                                className={`min-h-[40px] w-full px-3 py-1.5 rounded-full font-heading font-extrabold text-xs inline-flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                                  isCorrect
                                    ? 'bg-[#1FAFAA] text-[#052625] shadow-md'
                                    : 'bg-white/10 hover:bg-white/20 text-white/85'
                                }`}
                              >
                                <CheckCircle2 className="w-4 h-4" />
                                <span>
                                  {isCorrect
                                    ? '✓ Jawaban Benar'
                                    : 'Jadikan Jawaban Benar'}
                                </span>
                              </button>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Editor Urutan Adegan untuk Tipe Urutkan Kejadian */}
                  {isOrderType && Array.isArray(question.sequence) && (
                    <div className="space-y-3 pt-1">
                      <p className="text-xs font-extrabold uppercase tracking-wider text-[#1FAFAA]">
                        Urutan 3 Gambar Kejadian yang Benar (1 → 2 → 3):
                      </p>

                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        {question.sequence.map((seq, sIdx) => (
                          <div
                            key={seq.id || `seq-${qIdx}-${sIdx}`}
                            className="rounded-2xl p-3.5 bg-[#005E5C] border-2 border-[#1FAFAA]/50 space-y-2.5"
                          >
                            <div className="relative aspect-[4/3] w-full rounded-xl overflow-hidden border border-white/30 bg-[#062D2C]">
                              <StoryIllustration
                                variant={seq.gambar || coverImage}
                                title={seq.label}
                                alt={seq.label}
                                showCoverTitle={false}
                                className="w-full h-full"
                              />
                              <span className="absolute top-2 left-2 px-2.5 py-0.5 rounded-full bg-[#FFE9B0] text-[#052625] text-xs font-extrabold">
                                Urutan #{sIdx + 1}
                              </span>
                            </div>

                            <div>
                              <label
                                htmlFor={`quiz-seq-img-${qIdx}-${sIdx}`}
                                className="block text-[11px] font-bold text-[#FFE9B0] mb-1 pl-1"
                              >
                                Gambar Adegan #{sIdx + 1}:
                              </label>
                              <select
                                id={`quiz-seq-img-${qIdx}-${sIdx}`}
                                name={`quizSeqImg_${qIdx}_${sIdx}`}
                                value={seq.gambar || coverImage}
                                onChange={(e) => {
                                  const nextImg = e.target.value;
                                  updateQuestion(qIdx, (prev) => ({
                                    ...prev,
                                    sequence: prev.sequence.map((item, idx) =>
                                      idx === sIdx
                                        ? { ...item, gambar: nextImg }
                                        : item
                                    ),
                                  }));
                                }}
                                className="w-full min-h-[38px] rounded-xl bg-[#062D2C] text-white border border-[#1FAFAA]/60 px-2.5 py-1.5 text-xs font-bold focus:outline-none focus:border-[#FFE9B0]"
                              >
                                {availableImageChoices.map((choice, cIdx) => (
                                  <option
                                    key={`${choice.value}-${cIdx}`}
                                    value={choice.value}
                                  >
                                    {choice.label}
                                  </option>
                                ))}
                              </select>
                            </div>

                            <TextInput
                              id={`quiz-seq-label-${qIdx}-${sIdx}`}
                              name={`quizSeqLabel_${qIdx}_${sIdx}`}
                              label={`Keterangan Kejadian #${sIdx + 1}`}
                              value={seq.label || ''}
                              onChange={(e) => {
                                const nextLabel = e.target.value;
                                updateQuestion(qIdx, (prev) => ({
                                  ...prev,
                                  sequence: prev.sequence.map((item, idx) =>
                                    idx === sIdx
                                      ? { ...item, label: nextLabel }
                                      : item
                                  ),
                                }));
                              }}
                              placeholder={`Kejadian ke-${sIdx + 1}`}
                            />
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </section>
  );
}
