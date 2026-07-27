import React, { useState, useEffect } from 'react';
import { Users, KeyRound, Plus, Trash2, CheckCircle2, Clock, ArrowLeft, RefreshCw, Sparkles, BookOpen, Search, AlertCircle } from 'lucide-react';
import { collection, onSnapshot, doc, setDoc, deleteDoc, updateDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { Exam, Submission, Question } from '../types';
import { initializeSeedExams } from '../lib/initialData';

interface TeacherDashboardProps {
  onBackToStudentLogin: () => void;
}

export const TeacherDashboard: React.FC<TeacherDashboardProps> = ({ onBackToStudentLogin }) => {
  const [activeTab, setActiveTab] = useState<'monitor' | 'manage'>('monitor');
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [exams, setExams] = useState<Exam[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTokenFilter, setSelectedTokenFilter] = useState<string>('ALL');

  // Form State for New Exam Creation
  const [newTitle, setNewTitle] = useState('');
  const [newSubject, setNewSubject] = useState('');
  const [newToken, setNewToken] = useState('');
  const [newDuration, setNewDuration] = useState(15);
  const [questions, setQuestions] = useState<Question[]>([
    {
      id: 'q_' + Date.now(),
      question: '',
      options: ['', '', '', ''],
      correctAnswer: 0,
      points: 20,
    }
  ]);
  const [createMsg, setCreateMsg] = useState('');
  const [createError, setCreateError] = useState('');

  // 1. Subscribe Real-time Submissions
  useEffect(() => {
    const unsubSub = onSnapshot(collection(db, 'submissions'), (snapshot) => {
      const list: Submission[] = [];
      snapshot.forEach((docSnap) => {
        list.push({ id: docSnap.id, ...docSnap.data() } as Submission);
      });
      // Sort newest first
      list.sort((a, b) => new Date(b.startedAt || 0).getTime() - new Date(a.startedAt || 0).getTime());
      setSubmissions(list);
    }, (err) => {
      console.error('Real-time submission sync error:', err);
    });

    return () => unsubSub();
  }, []);

  // 2. Subscribe Real-time Exams
  useEffect(() => {
    const unsubExams = onSnapshot(collection(db, 'exams'), (snapshot) => {
      const list: Exam[] = [];
      snapshot.forEach((docSnap) => {
        list.push({ id: docSnap.id, ...docSnap.data() } as Exam);
      });
      setExams(list);
    }, (err) => {
      console.error('Real-time exam sync error:', err);
    });

    return () => unsubExams();
  }, []);

  // Add question field in form
  const handleAddQuestion = () => {
    setQuestions([
      ...questions,
      {
        id: 'q_' + Date.now() + '_' + questions.length,
        question: '',
        options: ['', '', '', ''],
        correctAnswer: 0,
        points: 20,
      }
    ]);
  };

  const handleRemoveQuestion = (idx: number) => {
    if (questions.length <= 1) return;
    setQuestions(questions.filter((_, i) => i !== idx));
  };

  const handleQuestionChange = (qIdx: number, field: keyof Question, value: any) => {
    const updated = [...questions];
    updated[qIdx] = { ...updated[qIdx], [field]: value };
    setQuestions(updated);
  };

  const handleOptionChange = (qIdx: number, oIdx: number, val: string) => {
    const updated = [...questions];
    const opts = [...updated[qIdx].options];
    opts[oIdx] = val;
    updated[qIdx].options = opts;
    setQuestions(updated);
  };

  const handleSaveNewExam = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreateMsg('');
    setCreateError('');

    const cleanToken = newToken.trim().toUpperCase();
    if (!cleanToken) {
      setCreateError('Token Ujian tidak boleh kosong.');
      return;
    }
    if (!newTitle.trim()) {
      setCreateError('Judul Ujian tidak boleh kosong.');
      return;
    }

    // Validate questions
    for (let i = 0; i < questions.length; i++) {
      if (!questions[i].question.trim()) {
        setCreateError(`Soal No. ${i + 1} belum diisi.`);
        return;
      }
      for (let j = 0; j < questions[i].options.length; j++) {
        if (!questions[i].options[j].trim()) {
          setCreateError(`Pilihan ${String.fromCharCode(65 + j)} pada Soal No. ${i + 1} masih kosong.`);
          return;
        }
      }
    }

    try {
      const newExamObj: Exam = {
        id: cleanToken,
        token: cleanToken,
        title: newTitle.trim(),
        subject: newSubject.trim() || 'Umum',
        durationMinutes: Number(newDuration) || 15,
        questions,
        createdAt: new Date().toISOString(),
        active: true,
      };

      await setDoc(doc(db, 'exams', cleanToken), newExamObj);
      setCreateMsg(`Berhasil membuat Token Ujian [${cleanToken}]!`);

      // Reset Form
      setNewTitle('');
      setNewSubject('');
      setNewToken('');
      setNewDuration(15);
      setQuestions([
        {
          id: 'q_' + Date.now(),
          question: '',
          options: ['', '', '', ''],
          correctAnswer: 0,
          points: 20,
        }
      ]);
    } catch (err) {
      console.error(err);
      setCreateError('Gagal menyimpan Ujian ke Firestore.');
    }
  };

  const toggleExamStatus = async (examId: string, currentActive: boolean) => {
    try {
      await updateDoc(doc(db, 'exams', examId), { active: !currentActive });
    } catch (err) {
      console.error('Failed to toggle exam status:', err);
    }
  };

  const handleDeleteExam = async (examId: string) => {
    if (confirm(`Yakin ingin menghapus Token Ujian [${examId}]?`)) {
      try {
        await deleteDoc(doc(db, 'exams', examId));
      } catch (err) {
        console.error('Delete exam failed:', err);
      }
    }
  };

  // Filter Submissions
  const filteredSubmissions = submissions.filter((sub) => {
    const matchesSearch = sub.studentName.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          sub.examToken.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesToken = selectedTokenFilter === 'ALL' || sub.examToken === selectedTokenFilter;
    return matchesSearch && matchesToken;
  });

  // Calculate Real-time Statistics
  const totalParticipants = submissions.length;
  const completedSubmissions = submissions.filter(s => s.status === 'submitted' || s.status === 'time_up');
  const inProgressCount = submissions.filter(s => s.status === 'in_progress').length;
  const avgScore = completedSubmissions.length > 0
    ? Math.round(completedSubmissions.reduce((sum, s) => sum + s.percentage, 0) / completedSubmissions.length)
    : 0;
  const passCount = completedSubmissions.filter(s => s.percentage >= 60).length;
  const passRate = completedSubmissions.length > 0
    ? Math.round((passCount / completedSubmissions.length) * 100)
    : 0;

  return (
    <div className="min-h-screen bg-slate-100 text-slate-800 flex flex-col font-sans">
      {/* Header */}
      <header className="bg-slate-900 text-white shadow-md py-3 px-4 md:px-6 sticky top-0 z-20">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <button
              onClick={onBackToStudentLogin}
              className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <h1 className="text-base font-bold text-white flex items-center space-x-2">
                <span>Panel Pengawas & Guru</span>
                <span className="text-[10px] bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 font-semibold px-2 py-0.5 rounded-full flex items-center space-x-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                  <span>Live Sync</span>
                </span>
              </h1>
              <p className="text-xs text-slate-400">Pantau pengerjaan siswa & kelola token ujian</p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={() => initializeSeedExams()}
              className="hidden sm:inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition-colors"
              title="Isi database dengan soal-soal sampel bawaan"
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              <span>Seed Sampel Soal</span>
            </button>
          </div>
        </div>
      </header>

      {/* Tabs */}
      <div className="bg-white border-b border-slate-200 px-4 md:px-6">
        <div className="max-w-6xl mx-auto flex space-x-4">
          <button
            onClick={() => setActiveTab('monitor')}
            className={`py-3 px-2 text-xs font-bold border-b-2 flex items-center space-x-2 transition-all ${
              activeTab === 'monitor'
                ? 'border-indigo-600 text-indigo-600'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Users className="w-4 h-4" />
            <span>Monitor Real-time Siswa ({submissions.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('manage')}
            className={`py-3 px-2 text-xs font-bold border-b-2 flex items-center space-x-2 transition-all ${
              activeTab === 'manage'
                ? 'border-indigo-600 text-indigo-600'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <KeyRound className="w-4 h-4" />
            <span>Kelola Token & Soal Ujian ({exams.length})</span>
          </button>
        </div>
      </div>

      <main className="max-w-6xl w-full mx-auto p-4 md:p-6 flex-1 space-y-6">
        {/* TAB 1: REAL-TIME MONITOR */}
        {activeTab === 'monitor' && (
          <div className="space-y-6">
            {/* Real-time Stats Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
                <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">Total Peserta</span>
                <div className="text-2xl font-black text-slate-900 mt-1">{totalParticipants}</div>
                <span className="text-[11px] text-indigo-600 font-semibold">{inProgressCount} sedang mengerjakan</span>
              </div>

              <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
                <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">Selesai Dikirim</span>
                <div className="text-2xl font-black text-emerald-600 mt-1">{completedSubmissions.length}</div>
                <span className="text-[11px] text-slate-500 font-medium">Tersimpan di Cloud</span>
              </div>

              <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
                <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">Rata-rata Nilai</span>
                <div className="text-2xl font-black text-indigo-600 mt-1">{avgScore}%</div>
                <span className="text-[11px] text-slate-500 font-medium">Skor Otomatis</span>
              </div>

              <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
                <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">Tingkat Kelulusan</span>
                <div className="text-2xl font-black text-teal-600 mt-1">{passRate}%</div>
                <span className="text-[11px] text-slate-500 font-medium">{passCount} lulus dari {completedSubmissions.length}</span>
              </div>
            </div>

            {/* Filter & Search Controls */}
            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-col md:flex-row gap-3 items-center justify-between">
              <div className="relative w-full md:w-72">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3 pointer-events-none" />
                <input
                  type="text"
                  placeholder="Cari nama peserta / token..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                />
              </div>

              <div className="flex items-center space-x-2 w-full md:w-auto">
                <span className="text-xs font-semibold text-slate-500 shrink-0">Filter Token:</span>
                <select
                  value={selectedTokenFilter}
                  onChange={(e) => setSelectedTokenFilter(e.target.value)}
                  className="px-3 py-2 rounded-xl border border-slate-300 text-xs font-medium focus:outline-none bg-slate-50 w-full md:w-auto"
                >
                  <option value="ALL">Semua Token Ujian</option>
                  {exams.map(ex => (
                    <option key={ex.id} value={ex.token}>{ex.token} ({ex.title})</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Real-time Submissions Table */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
              <div className="px-5 py-3.5 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700">
                  Daftar Pengerjaan Real-time ({filteredSubmissions.length})
                </h3>
                <span className="text-[11px] text-slate-500">Pembaruan Otomatis Firestore</span>
              </div>

              {filteredSubmissions.length === 0 ? (
                <div className="p-8 text-center text-slate-400 space-y-2">
                  <Users className="w-8 h-8 mx-auto text-slate-300" />
                  <p className="text-xs font-medium">Belum ada siswa yang mengerjakan ujian dengan filter ini.</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-100 text-slate-600 uppercase text-[10px] tracking-wider font-bold border-b border-slate-200">
                      <tr>
                        <th className="py-3 px-4">Nama Peserta</th>
                        <th className="py-3 px-4">Token Ujian</th>
                        <th className="py-3 px-4">Status</th>
                        <th className="py-3 px-4">Soal Dijawab</th>
                        <th className="py-3 px-4">Nilai Akhir</th>
                        <th className="py-3 px-4">Waktu Mulai</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-slate-800">
                      {filteredSubmissions.map((sub) => {
                        const answersCount = Object.keys(sub.answers || {}).length;
                        const targetExam = exams.find(e => e.token === sub.examToken);
                        const totalQ = targetExam?.questions.length || 5;

                        return (
                          <tr key={sub.id} className="hover:bg-slate-50/80 transition-colors">
                            <td className="py-3 px-4 font-bold text-slate-900">
                              {sub.studentName}
                            </td>
                            <td className="py-3 px-4">
                              <span className="font-mono text-[11px] bg-slate-900 text-white px-2 py-0.5 rounded font-semibold">
                                {sub.examToken}
                              </span>
                            </td>
                            <td className="py-3 px-4">
                              {sub.status === 'in_progress' && (
                                <span className="inline-flex items-center space-x-1 text-[11px] font-semibold bg-amber-50 text-amber-700 border border-amber-200 px-2.5 py-0.5 rounded-full">
                                  <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-ping mr-1"></span>
                                  Sedang Mengerjakan
                                </span>
                              )}
                              {sub.status === 'submitted' && (
                                <span className="inline-flex items-center space-x-1 text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 px-2.5 py-0.5 rounded-full">
                                  <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                                  <span>Selesai</span>
                                </span>
                              )}
                              {sub.status === 'time_up' && (
                                <span className="inline-flex items-center space-x-1 text-[11px] font-semibold bg-slate-100 text-slate-700 border border-slate-300 px-2.5 py-0.5 rounded-full">
                                  <Clock className="w-3 h-3 text-slate-500" />
                                  <span>Waktu Habis</span>
                                </span>
                              )}
                            </td>
                            <td className="py-3 px-4 font-medium text-slate-600">
                              {answersCount} / {totalQ} Soal
                            </td>
                            <td className="py-3 px-4">
                              {sub.status === 'in_progress' ? (
                                <span className="text-slate-400 italic">Menunggu submit...</span>
                              ) : (
                                <div className="flex items-center space-x-2">
                                  <span className="font-black text-sm text-slate-900">
                                    {sub.score} / {sub.maxScore}
                                  </span>
                                  <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                                    sub.percentage >= 60 ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                                  }`}>
                                    {sub.percentage}%
                                  </span>
                                </div>
                              )}
                            </td>
                            <td className="py-3 px-4 text-slate-500 font-mono text-[11px]">
                              {sub.startedAt ? new Date(sub.startedAt).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) : '-'}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 2: MANAGE TOKENS & CREATE EXAMS */}
        {activeTab === 'manage' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Left Column: Create New Exam Form */}
            <div className="lg:col-span-7 bg-white rounded-2xl border border-slate-200 shadow-xs p-5 md:p-6 space-y-5">
              <div>
                <h3 className="text-sm font-bold text-slate-900 flex items-center space-x-2">
                  <Plus className="w-4 h-4 text-indigo-600" />
                  <span>Buat Token & Soal Ujian Baru</span>
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Isi formulir untuk menambahkan token ujian dan daftar soalnya
                </p>
              </div>

              {createMsg && (
                <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold">
                  {createMsg}
                </div>
              )}
              {createError && (
                <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-semibold">
                  {createError}
                </div>
              )}

              <form onSubmit={handleSaveNewExam} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                      Token Ujian (Kode Masuk)
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="Contoh: MATEMATIKA2026"
                      value={newToken}
                      onChange={(e) => setNewToken(e.target.value.toUpperCase())}
                      className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 font-mono font-bold tracking-wider uppercase focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                      Durasi Ujian (Menit)
                    </label>
                    <input
                      type="number"
                      required
                      min={1}
                      max={180}
                      value={newDuration}
                      onChange={(e) => setNewDuration(Number(e.target.value))}
                      className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                      Judul Ujian
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="Contoh: Ujian Tengah Semester IPA"
                      value={newTitle}
                      onChange={(e) => setNewTitle(e.target.value)}
                      className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                      Mata Pelajaran
                    </label>
                    <input
                      type="text"
                      placeholder="Contoh: IPA / Umum"
                      value={newSubject}
                      onChange={(e) => setNewSubject(e.target.value)}
                      className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                    />
                  </div>
                </div>

                {/* Questions Builder */}
                <div className="pt-3 border-t border-slate-200 space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-800">
                      Daftar Soal Pilihan Ganda ({questions.length})
                    </span>

                    <button
                      type="button"
                      onClick={handleAddQuestion}
                      className="px-3 py-1.5 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-semibold flex items-center space-x-1 border border-indigo-200 transition-colors"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Tambah Soal</span>
                    </button>
                  </div>

                  {questions.map((q, qIdx) => (
                    <div key={q.id} className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-indigo-700">Soal No. {qIdx + 1}</span>
                        {questions.length > 1 && (
                          <button
                            type="button"
                            onClick={() => handleRemoveQuestion(qIdx)}
                            className="text-rose-600 hover:text-rose-800 p-1"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>

                      <textarea
                        required
                        placeholder="Tulis pertanyaan soal..."
                        rows={2}
                        value={q.question}
                        onChange={(e) => handleQuestionChange(qIdx, 'question', e.target.value)}
                        className="w-full p-2.5 text-xs rounded-lg border border-slate-300 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                      />

                      {/* Options A, B, C, D */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                        {q.options.map((opt, oIdx) => (
                          <div key={oIdx} className="flex items-center space-x-1.5">
                            <span className="text-xs font-bold text-slate-500 w-4">{String.fromCharCode(65 + oIdx)}.</span>
                            <input
                              type="text"
                              required
                              placeholder={`Pilihan ${String.fromCharCode(65 + oIdx)}`}
                              value={opt}
                              onChange={(e) => handleOptionChange(qIdx, oIdx, e.target.value)}
                              className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-slate-300 bg-white focus:outline-none"
                            />
                          </div>
                        ))}
                      </div>

                      {/* Correct Answer Selector */}
                      <div className="flex items-center space-x-3 pt-1">
                        <label className="text-xs font-semibold text-slate-700">Kunci Jawaban:</label>
                        <select
                          value={q.correctAnswer}
                          onChange={(e) => handleQuestionChange(qIdx, 'correctAnswer', Number(e.target.value))}
                          className="px-2.5 py-1 rounded-lg border border-slate-300 text-xs font-bold bg-white"
                        >
                          {q.options.map((_, oIdx) => (
                            <option key={oIdx} value={oIdx}>Pilihan {String.fromCharCode(65 + oIdx)}</option>
                          ))}
                        </select>
                      </div>
                    </div>
                  ))}
                </div>

                <button
                  type="submit"
                  className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl shadow-md transition-all flex items-center justify-center space-x-2"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Simpan Token & Ujian ke Firestore</span>
                </button>
              </form>
            </div>

            {/* Right Column: Existing Exam Tokens List */}
            <div className="lg:col-span-5 space-y-4">
              <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-5">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 mb-3 flex items-center justify-between">
                  <span>Daftar Token Ujian ({exams.length})</span>
                  <span className="text-indigo-600 font-semibold">Tersimpan di Cloud</span>
                </h3>

                {exams.length === 0 ? (
                  <div className="p-6 text-center text-slate-400 space-y-2">
                    <BookOpen className="w-8 h-8 mx-auto text-slate-300" />
                    <p className="text-xs">Belum ada token ujian.</p>
                    <button
                      onClick={() => initializeSeedExams()}
                      className="px-3 py-1.5 rounded-lg bg-indigo-600 text-white text-xs font-semibold shadow-xs"
                    >
                      Isi Sampel Soal Otonom
                    </button>
                  </div>
                ) : (
                  <div className="space-y-3 max-h-[600px] overflow-y-auto pr-1">
                    {exams.map((ex) => (
                      <div
                        key={ex.id}
                        className={`p-3.5 rounded-xl border transition-all ${
                          ex.active ? 'border-slate-200 bg-white' : 'border-slate-200 bg-slate-100 opacity-60'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <div className="flex items-center space-x-2">
                              <span className="font-mono font-bold text-xs bg-slate-900 text-white px-2 py-0.5 rounded">
                                {ex.token}
                              </span>
                              <span className="text-xs font-bold text-slate-900 truncate max-w-[150px]">
                                {ex.title}
                              </span>
                            </div>

                            <p className="text-[11px] text-slate-500 mt-1">
                              {ex.questions?.length || 0} Soal &bull; {ex.durationMinutes} Menit
                            </p>
                          </div>

                          <div className="flex items-center space-x-1 shrink-0">
                            <button
                              type="button"
                              onClick={() => toggleExamStatus(ex.id, ex.active)}
                              className={`px-2 py-1 rounded text-[10px] font-bold ${
                                ex.active ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-200 text-slate-600'
                              }`}
                            >
                              {ex.active ? 'Aktif' : 'Nonaktif'}
                            </button>

                            <button
                              type="button"
                              onClick={() => handleDeleteExam(ex.id)}
                              className="p-1 text-slate-400 hover:text-rose-600 transition-colors"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};
