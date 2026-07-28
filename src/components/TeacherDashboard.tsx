import React, { useState, useEffect } from 'react';
import { Users, KeyRound, Plus, Trash2, CheckCircle2, Clock, ArrowLeft, RefreshCw, Sparkles, BookOpen, Search, AlertCircle, Edit3, X, Save, ShieldCheck } from 'lucide-react';
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

  // Form State for Exam Creation / Editing
  const [editingExamId, setEditingExamId] = useState<string | null>(null);
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

  // Modal State for Editing Student Submission
  const [editingSubmission, setEditingSubmission] = useState<Submission | null>(null);
  const [editSubName, setEditSubName] = useState('');
  const [editSubScore, setEditSubScore] = useState(0);
  const [editSubMaxScore, setEditSubMaxScore] = useState(100);
  const [editSubStatus, setEditSubStatus] = useState<'in_progress' | 'submitted' | 'time_up'>('submitted');
  const [subModalError, setSubModalError] = useState('');

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

  // Populate form to edit an exam
  const handleStartEditExam = (ex: Exam) => {
    setEditingExamId(ex.id);
    setNewToken(ex.token);
    setNewTitle(ex.title);
    setNewSubject(ex.subject || '');
    setNewDuration(ex.durationMinutes || 15);
    setQuestions(
      ex.questions && ex.questions.length > 0
        ? ex.questions
        : [
            {
              id: 'q_' + Date.now(),
              question: '',
              options: ['', '', '', ''],
              correctAnswer: 0,
              points: 20,
            },
          ]
    );
    setCreateMsg('');
    setCreateError('');
    setActiveTab('manage');
  };

  // Reset form cancel edit
  const handleCancelEditExam = () => {
    setEditingExamId(null);
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
      },
    ]);
    setCreateMsg('');
    setCreateError('');
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

      // If token ID changed during edit, remove old document
      if (editingExamId && editingExamId !== cleanToken) {
        await deleteDoc(doc(db, 'exams', editingExamId));
      }

      await setDoc(doc(db, 'exams', cleanToken), newExamObj);

      if (editingExamId) {
        setCreateMsg(`Berhasil memperbarui Token Ujian [${cleanToken}]!`);
      } else {
        setCreateMsg(`Berhasil membuat Token Ujian [${cleanToken}]!`);
      }

      // Reset Form
      handleCancelEditExam();
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
        if (editingExamId === examId) {
          handleCancelEditExam();
        }
      } catch (err) {
        console.error('Delete exam failed:', err);
      }
    }
  };

  // Submission Edit / Delete Handlers
  const handleOpenEditSubmission = (sub: Submission) => {
    setEditingSubmission(sub);
    setEditSubName(sub.studentName);
    setEditSubScore(sub.score);
    setEditSubMaxScore(sub.maxScore);
    setEditSubStatus(sub.status);
    setSubModalError('');
  };

  const handleSaveEditSubmission = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingSubmission) return;

    if (!editSubName.trim()) {
      setSubModalError('Nama peserta tidak boleh kosong.');
      return;
    }

    try {
      const percentage = editSubMaxScore > 0 ? Math.round((editSubScore / editSubMaxScore) * 100) : 0;
      await updateDoc(doc(db, 'submissions', editingSubmission.id), {
        studentName: editSubName.trim(),
        score: Number(editSubScore),
        maxScore: Number(editSubMaxScore),
        percentage,
        status: editSubStatus,
      });

      setEditingSubmission(null);
    } catch (err) {
      console.error('Failed to update submission:', err);
      setSubModalError('Gagal memperbarui data pengerjaan.');
    }
  };

  const handleDeleteSubmission = async (subId: string, studentName: string) => {
    if (confirm(`Yakin ingin menghapus data pengerjaan siswa "${studentName}"?`)) {
      try {
        await deleteDoc(doc(db, 'submissions', subId));
      } catch (err) {
        console.error('Failed to delete submission:', err);
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
    <div className="min-h-screen bg-colorful-light-mesh text-slate-800 flex flex-col font-sans">
      {/* Navbar Header */}
      <header className="sticky top-0 z-30 bg-gradient-to-r from-slate-950 via-indigo-950 to-purple-950 text-white shadow-[0_10px_30px_rgba(15,23,42,0.4)] px-4 py-3.5 border-b border-indigo-800/40">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-amber-400 via-amber-300 to-emerald-400 text-slate-950 flex items-center justify-center font-black shadow-[0_6px_16px_rgba(245,158,11,0.4)] border-b-2 border-amber-600">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h1 className="text-base md:text-lg font-black font-heading tracking-wide text-white">
                  Panel Guru Exam Edu
                </h1>
                <span className="text-[10px] font-black bg-gradient-to-r from-indigo-500 to-purple-500 text-white px-2.5 py-0.5 rounded-full shadow-xs border border-indigo-400/30">
                  REAL-TIME ADMIN
                </span>
              </div>
              <p className="text-[11px] text-indigo-200 font-semibold">
                Pantau pengerjaan siswa & kelola token ujian otonom
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-3">
            <button
              onClick={onBackToStudentLogin}
              className="inline-flex items-center space-x-1.5 px-3.5 py-2 rounded-xl text-xs font-extrabold bg-slate-800/90 hover:bg-slate-700 text-slate-100 transition-all border border-slate-700 shadow-xs cursor-pointer"
            >
              <ArrowLeft className="w-3.5 h-3.5 text-amber-400" />
              <span className="hidden sm:inline">Halaman Siswa</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Dashboard Layout */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 md:p-6 space-y-6">
        {/* Navigation Tabs */}
        <div className="flex items-center space-x-3 border-b border-indigo-200/60 pb-2">
          <button
            onClick={() => setActiveTab('monitor')}
            className={`px-5 py-2.5 rounded-2xl font-black text-xs flex items-center space-x-2 transition-all cursor-pointer ${
              activeTab === 'monitor'
                ? 'btn-3d-indigo text-white'
                : 'bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 shadow-xs'
            }`}
          >
            <Users className="w-4 h-4 text-indigo-500" />
            <span>Monitor Real-time Siswa ({submissions.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('manage')}
            className={`px-5 py-2.5 rounded-2xl font-black text-xs flex items-center space-x-2 transition-all cursor-pointer ${
              activeTab === 'manage'
                ? 'btn-3d-violet text-white'
                : 'bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 shadow-xs'
            }`}
          >
            <KeyRound className="w-4 h-4 text-purple-500" />
            <span>Kelola Token & Soal Ujian ({exams.length})</span>
          </button>
        </div>

        {/* TAB 1: MONITOR REAL-TIME SUBMISSIONS */}
        {activeTab === 'monitor' && (
          <div className="space-y-6">
            {/* Quick Metrics Grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="card-3d p-4 border-l-4 border-l-indigo-500 bg-gradient-to-br from-white to-indigo-50/50">
                <span className="text-[11px] font-bold text-indigo-800 uppercase tracking-wider block mb-1">
                  Total Peserta
                </span>
                <div className="text-2xl font-black text-slate-900 font-heading flex items-center justify-between">
                  <span>{totalParticipants}</span>
                  <div className="w-9 h-9 rounded-xl bg-indigo-100 text-indigo-600 flex items-center justify-center">
                    <Users className="w-5 h-5" />
                  </div>
                </div>
              </div>

              <div className="card-3d p-4 border-l-4 border-l-amber-500 bg-gradient-to-br from-white to-amber-50/50">
                <span className="text-[11px] font-bold text-amber-800 uppercase tracking-wider block mb-1">
                  Sedang Mengerjakan
                </span>
                <div className="text-2xl font-black text-amber-600 font-heading flex items-center justify-between">
                  <span>{inProgressCount}</span>
                  <div className="w-9 h-9 rounded-xl bg-amber-100 text-amber-600 flex items-center justify-center">
                    <Clock className="w-5 h-5 animate-pulse" />
                  </div>
                </div>
              </div>

              <div className="card-3d p-4 border-l-4 border-l-emerald-500 bg-gradient-to-br from-white to-emerald-50/50">
                <span className="text-[11px] font-bold text-emerald-800 uppercase tracking-wider block mb-1">
                  Rata-Rata Nilai
                </span>
                <div className="text-2xl font-black text-emerald-600 font-heading flex items-center justify-between">
                  <span>{avgScore}</span>
                  <div className="w-9 h-9 rounded-xl bg-emerald-100 text-emerald-600 flex items-center justify-center">
                    <CheckCircle2 className="w-5 h-5" />
                  </div>
                </div>
              </div>

              <div className="card-3d p-4 border-l-4 border-l-purple-500 bg-gradient-to-br from-white to-purple-50/50">
                <span className="text-[11px] font-bold text-purple-800 uppercase tracking-wider block mb-1">
                  Tingkat Kelulusan
                </span>
                <div className="text-2xl font-black text-purple-600 font-heading flex items-center justify-between">
                  <span>{passRate}%</span>
                  <div className="w-9 h-9 rounded-xl bg-purple-100 text-purple-600 flex items-center justify-center">
                    <Sparkles className="w-5 h-5" />
                  </div>
                </div>
              </div>
            </div>

            {/* Filter Bar & Submissions Table */}
            <div className="card-3d overflow-hidden">
              <div className="p-4 bg-slate-50 border-b border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-3">
                <div className="relative flex-1 max-w-sm">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Cari nama siswa atau token..."
                    className="w-full pl-9 pr-3 py-2 bg-white border-2 border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div className="flex items-center space-x-2 shrink-0">
                  <label className="text-xs font-bold text-slate-600">Filter Token:</label>
                  <select
                    value={selectedTokenFilter}
                    onChange={(e) => setSelectedTokenFilter(e.target.value)}
                    className="bg-white border-2 border-slate-200 rounded-xl px-3 py-2 text-xs font-extrabold focus:outline-none focus:border-indigo-500"
                  >
                    <option value="ALL">Semua Token Ujian</option>
                    {exams.map(ex => (
                      <option key={ex.id} value={ex.token}>{ex.token} - {ex.title}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="px-5 py-3.5 bg-slate-100/80 border-b border-slate-200 flex items-center justify-between">
                <h3 className="text-xs font-black uppercase tracking-wider text-slate-700 font-heading">
                  Daftar Pengerjaan Real-time ({filteredSubmissions.length})
                </h3>
                <span className="text-[11px] text-slate-500 font-bold flex items-center space-x-1">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                  <span>Otomatis Terhubung Cloud</span>
                </span>
              </div>

              {filteredSubmissions.length === 0 ? (
                <div className="p-8 text-center text-slate-400 space-y-2">
                  <Users className="w-8 h-8 mx-auto text-slate-300" />
                  <p className="text-xs font-bold">Belum ada siswa yang mengerjakan ujian dengan filter ini.</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-200/60 text-slate-700 uppercase text-[10px] tracking-wider font-black border-b border-slate-200 font-heading">
                      <tr>
                        <th className="py-3.5 px-4">Nama Peserta</th>
                        <th className="py-3.5 px-4">Token Ujian</th>
                        <th className="py-3.5 px-4">Status</th>
                        <th className="py-3.5 px-4">Soal Dijawab</th>
                        <th className="py-3.5 px-4">Nilai Akhir</th>
                        <th className="py-3.5 px-4">Waktu Mulai</th>
                        <th className="py-3.5 px-4 text-right">Aksi</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-slate-800 font-medium">
                      {filteredSubmissions.map((sub) => {
                        const answersCount = Object.keys(sub.answers || {}).length;
                        const targetExam = exams.find(e => e.token === sub.examToken);
                        const totalQ = targetExam?.questions.length || 5;

                        return (
                          <tr key={sub.id} className="hover:bg-indigo-50/40 transition-colors">
                            <td className="py-3.5 px-4 font-black text-slate-900">
                              {sub.studentName}
                            </td>
                            <td className="py-3.5 px-4">
                              <span className="font-mono text-[11px] bg-slate-900 text-white px-2.5 py-1 rounded-lg font-extrabold border border-slate-800 shadow-xs">
                                {sub.examToken}
                              </span>
                            </td>
                            <td className="py-3.5 px-4">
                              {sub.status === 'in_progress' && (
                                <span className="inline-flex items-center space-x-1 text-[11px] font-bold bg-amber-50 text-amber-700 border border-amber-200 px-2.5 py-0.5 rounded-full">
                                  <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-ping mr-1"></span>
                                  Sedang Mengerjakan
                                </span>
                              )}
                              {sub.status === 'submitted' && (
                                <span className="inline-flex items-center space-x-1 text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 px-2.5 py-0.5 rounded-full">
                                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                                  <span>Selesai</span>
                                </span>
                              )}
                              {sub.status === 'time_up' && (
                                <span className="inline-flex items-center space-x-1 text-[11px] font-bold bg-slate-100 text-slate-700 border border-slate-300 px-2.5 py-0.5 rounded-full">
                                  <Clock className="w-3.5 h-3.5 text-slate-500" />
                                  <span>Waktu Habis</span>
                                </span>
                              )}
                            </td>
                            <td className="py-3.5 px-4 font-bold text-slate-600">
                              {answersCount} / {totalQ} Soal
                            </td>
                            <td className="py-3.5 px-4">
                              {sub.status === 'in_progress' ? (
                                <span className="text-slate-400 italic font-semibold">Menunggu submit...</span>
                              ) : (
                                <div className="flex items-center space-x-2">
                                  <span className="font-black text-sm text-slate-900">
                                    {sub.score} / {sub.maxScore}
                                  </span>
                                  <span className={`text-[10px] font-black px-2 py-0.5 rounded-lg ${
                                    sub.percentage >= 60 ? 'bg-emerald-100 text-emerald-900 border border-emerald-300' : 'bg-rose-100 text-rose-900 border border-rose-300'
                                  }`}>
                                    {sub.percentage}%
                                  </span>
                                </div>
                              )}
                            </td>
                            <td className="py-3.5 px-4 text-slate-500 font-mono text-[11px] font-semibold">
                              {sub.startedAt ? new Date(sub.startedAt).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) : '-'}
                            </td>
                            <td className="py-3.5 px-4 text-right">
                              <div className="flex items-center justify-end space-x-1.5">
                                <button
                                  type="button"
                                  onClick={() => handleOpenEditSubmission(sub)}
                                  title="Edit pengerjaan siswa"
                                  className="p-1.5 rounded-xl bg-slate-100 hover:bg-indigo-100 text-slate-700 hover:text-indigo-700 border border-slate-200 transition-colors cursor-pointer"
                                >
                                  <Edit3 className="w-4 h-4" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleDeleteSubmission(sub.id, sub.studentName)}
                                  title="Hapus pengerjaan siswa"
                                  className="p-1.5 rounded-xl bg-slate-100 hover:bg-rose-100 text-slate-700 hover:text-rose-700 border border-slate-200 transition-colors cursor-pointer"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </div>
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

        {/* TAB 2: MANAGE TOKENS & CREATE / EDIT EXAMS */}
        {activeTab === 'manage' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Left Column: Create / Edit Exam Form */}
            <div className="lg:col-span-7 card-3d p-5 md:p-6 space-y-5">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <h3 className="text-base font-black text-slate-900 font-heading flex items-center space-x-2">
                  <Plus className="w-5 h-5 text-indigo-600" />
                  <span>{editingExamId ? `Edit Token Ujian [${editingExamId}]` : 'Buat Token & Soal Ujian Baru'}</span>
                </h3>

                {editingExamId && (
                  <button
                    type="button"
                    onClick={handleCancelEditExam}
                    className="px-3 py-1 rounded-xl bg-slate-200 hover:bg-slate-300 text-slate-800 text-xs font-bold transition-all"
                  >
                    Batal Edit
                  </button>
                )}
              </div>

              {createMsg && (
                <div className="p-3 bg-emerald-50 text-emerald-800 border border-emerald-200 rounded-xl text-xs font-bold flex items-center space-x-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>{createMsg}</span>
                </div>
              )}

              {createError && (
                <div className="p-3 bg-rose-50 text-rose-800 border border-rose-200 rounded-xl text-xs font-bold flex items-center space-x-2">
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                  <span>{createError}</span>
                </div>
              )}

              <form onSubmit={handleSaveNewExam} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-black text-slate-700 uppercase tracking-wider mb-1">
                      Token Ujian (Kode Masuk) *
                    </label>
                    <input
                      type="text"
                      required
                      value={newToken}
                      onChange={(e) => setNewToken(e.target.value.toUpperCase())}
                      placeholder="Contoh: MAT2025, FISIKA10"
                      className="w-full px-3.5 py-2.5 bg-slate-50 border-2 border-slate-200 rounded-xl font-mono font-black text-sm uppercase focus:outline-none focus:border-indigo-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-black text-slate-700 uppercase tracking-wider mb-1">
                      Mata Pelajaran
                    </label>
                    <input
                      type="text"
                      value={newSubject}
                      onChange={(e) => setNewSubject(e.target.value)}
                      placeholder="Contoh: Matematika, IPA"
                      className="w-full px-3.5 py-2.5 bg-slate-50 border-2 border-slate-200 rounded-xl font-bold text-xs focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="sm:col-span-2">
                    <label className="block text-xs font-black text-slate-700 uppercase tracking-wider mb-1">
                      Judul Ujian *
                    </label>
                    <input
                      type="text"
                      required
                      value={newTitle}
                      onChange={(e) => setNewTitle(e.target.value)}
                      placeholder="Contoh: Ujian Tengah Semester Genap"
                      className="w-full px-3.5 py-2.5 bg-slate-50 border-2 border-slate-200 rounded-xl font-bold text-xs focus:outline-none focus:border-indigo-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-black text-slate-700 uppercase tracking-wider mb-1">
                      Durasi (Menit)
                    </label>
                    <input
                      type="number"
                      min={1}
                      max={180}
                      value={newDuration}
                      onChange={(e) => setNewDuration(Number(e.target.value))}
                      className="w-full px-3.5 py-2.5 bg-slate-50 border-2 border-slate-200 rounded-xl font-black text-xs focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                </div>

                {/* Questions Builder */}
                <div className="pt-2 border-t border-slate-100 space-y-4">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-black text-slate-700 uppercase tracking-wider font-heading">
                      Daftar Soal Pilihan Ganda ({questions.length})
                    </h4>
                    <button
                      type="button"
                      onClick={handleAddQuestion}
                      className="px-3 py-1.5 rounded-xl btn-3d-slate text-white text-xs font-bold flex items-center space-x-1 cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Tambah Soal</span>
                    </button>
                  </div>

                  <div className="space-y-4 max-h-[450px] overflow-y-auto pr-1">
                    {questions.map((q, qIdx) => (
                      <div key={q.id || qIdx} className="p-4 bg-slate-50 rounded-2xl border-2 border-slate-200/90 space-y-3 relative">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-black text-indigo-700 bg-indigo-100 px-3 py-1 rounded-xl">
                            Soal No. {qIdx + 1}
                          </span>

                          <div className="flex items-center space-x-2">
                            <label className="text-[11px] font-bold text-slate-600">Poin:</label>
                            <input
                              type="number"
                              value={q.points || 20}
                              onChange={(e) => handleQuestionChange(qIdx, 'points', Number(e.target.value))}
                              className="w-16 px-2 py-1 bg-white border border-slate-300 rounded-lg text-xs font-black text-center"
                            />
                            {questions.length > 1 && (
                              <button
                                type="button"
                                onClick={() => handleRemoveQuestion(qIdx)}
                                className="p-1 text-slate-400 hover:text-rose-600 transition-colors"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            )}
                          </div>
                        </div>

                        {/* Question Text Input */}
                        <textarea
                          rows={2}
                          value={q.question}
                          onChange={(e) => handleQuestionChange(qIdx, 'question', e.target.value)}
                          placeholder="Tulis pertanyaan soal di sini..."
                          className="w-full p-2.5 bg-white border border-slate-300 rounded-xl text-xs font-bold focus:outline-none focus:border-indigo-500"
                        />

                        {/* Options A-D Input */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          {q.options.map((optVal, oIdx) => {
                            const optionLabel = String.fromCharCode(65 + oIdx);
                            const isCorrect = q.correctAnswer === oIdx;

                            return (
                              <div
                                key={oIdx}
                                className={`flex items-center space-x-2 p-2 rounded-xl border ${
                                  isCorrect ? 'bg-emerald-50 border-emerald-400' : 'bg-white border-slate-200'
                                }`}
                              >
                                <button
                                  type="button"
                                  onClick={() => handleQuestionChange(qIdx, 'correctAnswer', oIdx)}
                                  className={`w-6 h-6 rounded-lg text-xs font-black shrink-0 flex items-center justify-center transition-all ${
                                    isCorrect ? 'bg-emerald-600 text-white shadow-xs' : 'bg-slate-200 text-slate-600 hover:bg-slate-300'
                                  }`}
                                  title="Klik untuk jadikan kunci jawaban"
                                >
                                  {optionLabel}
                                </button>

                                <input
                                  type="text"
                                  value={optVal}
                                  onChange={(e) => handleOptionChange(qIdx, oIdx, e.target.value)}
                                  placeholder={`Pilihan ${optionLabel}`}
                                  className="w-full bg-transparent text-xs font-bold focus:outline-none"
                                />
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <button
                  type="submit"
                  className="w-full py-3.5 px-4 btn-3d-emerald text-white font-black text-xs rounded-2xl flex items-center justify-center space-x-2 transition-all cursor-pointer"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>{editingExamId ? 'Simpan Perubahan Exam' : 'Simpan Token & Ujian ke Firestore'}</span>
                </button>
              </form>
            </div>

            {/* Right Column: Existing Exam Tokens List */}
            <div className="lg:col-span-5 space-y-4">
              <div className="card-3d p-5">
                <h3 className="text-xs font-black uppercase tracking-wider text-slate-700 mb-3 flex items-center justify-between font-heading">
                  <span>Daftar Token Ujian ({exams.length})</span>
                  <span className="text-indigo-600 font-extrabold">Real-time Cloud</span>
                </h3>

                {exams.length === 0 ? (
                  <div className="p-6 text-center text-slate-400 space-y-2">
                    <BookOpen className="w-8 h-8 mx-auto text-slate-300" />
                    <p className="text-xs font-bold">Belum ada token ujian.</p>
                    <button
                      onClick={() => initializeSeedExams()}
                      className="px-3.5 py-2 rounded-xl btn-3d-indigo text-white text-xs font-black cursor-pointer"
                    >
                      Isi Sampel Soal Otonom
                    </button>
                  </div>
                ) : (
                  <div className="space-y-3 max-h-[600px] overflow-y-auto pr-1">
                    {exams.map((ex) => (
                      <div
                        key={ex.id}
                        className={`p-3.5 rounded-2xl border-2 transition-all ${
                          ex.active ? 'border-slate-200 bg-white shadow-xs' : 'border-slate-200 bg-slate-100 opacity-60'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <div className="flex items-center space-x-2">
                              <span className="font-mono font-black text-xs bg-slate-900 text-white px-2.5 py-0.5 rounded-lg border border-slate-800">
                                {ex.token}
                              </span>
                              <span className="text-xs font-extrabold text-slate-900 truncate max-w-[140px]">
                                {ex.title}
                              </span>
                            </div>

                            <p className="text-[11px] text-slate-500 font-semibold mt-1">
                              {ex.questions?.length || 0} Soal &bull; {ex.durationMinutes} Menit
                            </p>
                          </div>

                          <div className="flex items-center space-x-1 shrink-0">
                            <button
                              type="button"
                              onClick={() => toggleExamStatus(ex.id, ex.active)}
                              className={`px-2.5 py-1 rounded-xl text-[10px] font-black cursor-pointer ${
                                ex.active ? 'bg-emerald-100 text-emerald-900 border border-emerald-300' : 'bg-slate-200 text-slate-600'
                              }`}
                            >
                              {ex.active ? 'Aktif' : 'Nonaktif'}
                            </button>

                            <button
                              type="button"
                              onClick={() => handleStartEditExam(ex)}
                              title="Edit Soal & Token"
                              className="p-1.5 rounded-xl bg-slate-100 hover:bg-indigo-100 text-slate-700 hover:text-indigo-700 border border-slate-200 transition-colors cursor-pointer"
                            >
                              <Edit3 className="w-3.5 h-3.5" />
                            </button>

                            <button
                              type="button"
                              onClick={() => handleDeleteExam(ex.id)}
                              title="Hapus Token Ujian"
                              className="p-1.5 rounded-xl bg-slate-100 hover:bg-rose-100 text-slate-700 hover:text-rose-700 border border-slate-200 transition-colors cursor-pointer"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
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

      {/* Edit Student Submission Modal */}
      {editingSubmission && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="card-3d max-w-md w-full p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-base font-black text-slate-900 font-heading flex items-center space-x-2">
                <Edit3 className="w-5 h-5 text-indigo-600" />
                <span>Edit Data Pengerjaan Siswa</span>
              </h3>
              <button
                onClick={() => setEditingSubmission(null)}
                className="p-1 text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {subModalError && (
              <div className="p-3 bg-rose-50 text-rose-800 border border-rose-200 rounded-xl text-xs font-bold">
                {subModalError}
              </div>
            )}

            <form onSubmit={handleSaveEditSubmission} className="space-y-4">
              <div>
                <label className="block text-xs font-black text-slate-700 uppercase tracking-wider mb-1">
                  Nama Peserta
                </label>
                <input
                  type="text"
                  required
                  value={editSubName}
                  onChange={(e) => setEditSubName(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border-2 border-slate-200 rounded-xl text-xs font-bold focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-black text-slate-700 uppercase tracking-wider mb-1">
                    Nilai Didapat
                  </label>
                  <input
                    type="number"
                    min={0}
                    value={editSubScore}
                    onChange={(e) => setEditSubScore(Number(e.target.value))}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border-2 border-slate-200 rounded-xl text-xs font-black focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-black text-slate-700 uppercase tracking-wider mb-1">
                    Nilai Maksimal
                  </label>
                  <input
                    type="number"
                    min={1}
                    value={editSubMaxScore}
                    onChange={(e) => setEditSubMaxScore(Number(e.target.value))}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border-2 border-slate-200 rounded-xl text-xs font-black focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-black text-slate-700 uppercase tracking-wider mb-1">
                  Status Pengerjaan
                </label>
                <select
                  value={editSubStatus}
                  onChange={(e) => setEditSubStatus(e.target.value as any)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border-2 border-slate-200 rounded-xl text-xs font-extrabold focus:outline-none focus:border-indigo-500"
                >
                  <option value="in_progress">Sedang Mengerjakan</option>
                  <option value="submitted">Selesai (Submitted)</option>
                  <option value="time_up">Waktu Habis</option>
                </select>
              </div>

              <div className="flex items-center space-x-2 pt-2">
                <button
                  type="button"
                  onClick={() => setEditingSubmission(null)}
                  className="flex-1 py-3 rounded-2xl border-2 border-slate-200 text-xs font-bold text-slate-700 hover:bg-slate-100 transition-all"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="flex-1 py-3 rounded-2xl btn-3d-emerald text-white text-xs font-black flex items-center justify-center space-x-1.5 transition-all cursor-pointer"
                >
                  <Save className="w-4 h-4" />
                  <span>Simpan Perubahan</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
