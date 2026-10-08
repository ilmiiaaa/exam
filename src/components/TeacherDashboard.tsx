import React, { useState, useEffect } from 'react';
import { Users, KeyRound, Plus, Trash2, CheckCircle2, Clock, ArrowLeft, RefreshCw, Sparkles, BookOpen, Search, AlertCircle, Edit3, X, Save, ShieldCheck, Download, Building, GraduationCap, RotateCcw, Upload, FileSpreadsheet, FileText, UserCheck, UserPlus, Check, Filter, Info, ChevronRight, FileDown, Eye, EyeOff, Lock, Sliders, ToggleLeft, GitMerge, Type, ListChecks, Image as ImageIcon } from 'lucide-react';
import { collection, onSnapshot, doc, setDoc, deleteDoc, updateDoc } from 'firebase/firestore';
import * as XLSX from 'xlsx';
import { db } from '../lib/firebase';
import { Exam, Submission, Question, QuestionType, RegisteredStudent, ParticipantSystemMode } from '../types';
import { initializeSeedExams } from '../lib/initialData';
import { SCHOOL_LIST, GRADE_LIST } from '../data/schools';
import { broadcastSystemUpdate } from '../lib/appUpdateManager';
import { QUESTION_TYPES, downloadQuestionTemplate, parseQuestionsFromWorkbook, isQuestionTypeKeyword } from '../lib/questionTemplates';

interface TeacherDashboardProps {
  onBackToStudentLogin: () => void;
}

export const TeacherDashboard: React.FC<TeacherDashboardProps> = ({ onBackToStudentLogin }) => {
  const [activeTab, setActiveTab] = useState<'monitor' | 'manage' | 'participants'>('monitor');
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [exams, setExams] = useState<Exam[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTokenFilter, setSelectedTokenFilter] = useState<string>('ALL');
  const [selectedSchoolFilter, setSelectedSchoolFilter] = useState<string>('ALL');
  const [selectedGradeFilter, setSelectedGradeFilter] = useState<string>('ALL');
  const [selectedStatusFilter, setSelectedStatusFilter] = useState<'ALL' | 'completed' | 'in_progress'>('ALL');

  // Broadcast System Update state
  const [isBroadcasting, setIsBroadcasting] = useState(false);
  const [broadcastSuccessMsg, setBroadcastSuccessMsg] = useState('');

  const handleManualBroadcastUpdate = async () => {
    setIsBroadcasting(true);
    try {
      await broadcastSystemUpdate('Pembaruan data ujian & sistem oleh Guru');
      setBroadcastSuccessMsg('Sinyal pembaruan sistem berhasil disiarkan! Semua perangkat siswa (yang aktif maupun di recent apps) akan otomatis memperbarui halaman.');
      setTimeout(() => setBroadcastSuccessMsg(''), 4500);
    } catch (err) {
      alert('Gagal menyiarkan pembaruan: ' + (err as Error).message);
    } finally {
      setIsBroadcasting(false);
    }
  };

  // Participant System Mode & Registered Students State
  const [participantMode, setParticipantMode] = useState<ParticipantSystemMode>('umum');
  const [isUpdatingMode, setIsUpdatingMode] = useState(false);
  const [modeSaveMsg, setModeSaveMsg] = useState('');

  const [registeredStudents, setRegisteredStudents] = useState<RegisteredStudent[]>([]);
  const [regSearchQuery, setRegSearchQuery] = useState('');
  const [regSchoolFilter, setRegSchoolFilter] = useState<string>('ALL');
  const [regGradeFilter, setRegGradeFilter] = useState<string>('ALL');

  // Manual single student entry form
  const [newRegName, setNewRegName] = useState('');
  const [newRegSchool, setNewRegSchool] = useState<string>(SCHOOL_LIST[0]);
  const [newRegGrade, setNewRegGrade] = useState<string>(GRADE_LIST[3]);
  const [regFormError, setRegFormError] = useState('');
  const [regFormSuccess, setRegFormSuccess] = useState('');
  const [isSavingReg, setIsSavingReg] = useState(false);

  // Excel Import & Export State
  const [isImporting, setIsImporting] = useState(false);
  const [importSummary, setImportSummary] = useState<{ total: number; added: number; skipped: number } | null>(null);

  // Reset Registered Students Confirmation Modal
  const [showResetRegConfirm, setShowResetRegConfirm] = useState(false);
  const [isResettingReg, setIsResettingReg] = useState(false);

  // Real-time live clock ticker to compute remaining time in seconds
  const [currentTime, setCurrentTime] = useState<number>(Date.now());
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(Date.now());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Form State for Exam Creation / Editing
  const [editingExamId, setEditingExamId] = useState<string | null>(null);
  const [newTitle, setNewTitle] = useState('');
  const [newSubject, setNewSubject] = useState('');
  const [newToken, setNewToken] = useState('');
  const [newDuration, setNewDuration] = useState(15);
  const [newShowReview, setNewShowReview] = useState<boolean>(false);
  const [allowedTypes, setAllowedTypes] = useState<QuestionType[]>([
    'multiple_choice',
    'true_false',
    'matching',
    'short_answer',
    'image_question'
  ]);
  const [questions, setQuestions] = useState<Question[]>([
    {
      id: 'q_' + Date.now(),
      type: 'multiple_choice',
      question: '',
      options: ['', '', '', ''],
      correctAnswer: 0,
      points: 20,
    }
  ]);
  const [createMsg, setCreateMsg] = useState('');
  const [createError, setCreateError] = useState('');

  // Global Result Display Setting State (Show/Hide questions+answers+explanations after exam)
  const [showQuestionsReview, setShowQuestionsReview] = useState<boolean>(false);
  const [isUpdatingResultSetting, setIsUpdatingResultSetting] = useState(false);
  const [resultSettingMsg, setResultSettingMsg] = useState('');

  // Modal State for Editing Student Submission
  const [editingSubmission, setEditingSubmission] = useState<Submission | null>(null);
  const [editSubName, setEditSubName] = useState('');
  const [editSubSchoolName, setEditSubSchoolName] = useState<string>(SCHOOL_LIST[0]);
  const [editSubGradeName, setEditSubGradeName] = useState<string>(GRADE_LIST[3]); // Default Kelas 6
  const [editSubScore, setEditSubScore] = useState(0);
  const [editSubMaxScore, setEditSubMaxScore] = useState(100);
  const [editSubStatus, setEditSubStatus] = useState<'in_progress' | 'submitted' | 'time_up'>('submitted');
  const [subModalError, setSubModalError] = useState('');

  // Reset Data Confirmation State
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [isResetting, setIsResetting] = useState(false);

  // Handle Reset / Clear All Submissions Data
  const handleResetData = async () => {
    if (submissions.length === 0) {
      alert('Tidak ada data pengerjaan siswa untuk dihapus.');
      return;
    }

    setIsResetting(true);
    try {
      const deletePromises = submissions.map((sub) => deleteDoc(doc(db, 'submissions', sub.id)));
      await Promise.all(deletePromises);
      setShowResetConfirm(false);
      alert('Berhasil menghapus seluruh data pengerjaan ujian siswa.');
    } catch (err) {
      console.error(err);
      alert('Gagal menghapus data pengerjaan: ' + (err as Error).message);
    } finally {
      setIsResetting(false);
    }
  };

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

  // 3. Subscribe Real-time Participant System Mode Settings
  useEffect(() => {
    const unsubMode = onSnapshot(doc(db, 'settings', 'participant_system'), (snap) => {
      if (snap.exists()) {
        const data = snap.data();
        if (data.mode === 'terdaftar' || data.mode === 'umum') {
          setParticipantMode(data.mode);
        }
      }
    }, (err) => {
      console.warn('Real-time participant mode listener note:', err);
    });

    return () => unsubMode();
  }, []);

  // 4. Subscribe Real-time Registered Students
  useEffect(() => {
    const unsubStudents = onSnapshot(collection(db, 'registered_students'), (snap) => {
      const list: RegisteredStudent[] = [];
      snap.forEach((docSnap) => {
        list.push({ id: docSnap.id, ...docSnap.data() } as RegisteredStudent);
      });
      // Sort alphabetically by name
      list.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
      setRegisteredStudents(list);
    }, (err) => {
      console.error('Real-time registered students sync error:', err);
    });

    return () => unsubStudents();
  }, []);

  // 5. Subscribe Real-time Result Display Settings (Show/Hide review questions+answers)
  useEffect(() => {
    const unsubResult = onSnapshot(doc(db, 'settings', 'result_display'), (snap) => {
      if (snap.exists()) {
        const data = snap.data();
        if (typeof data.showQuestionsReview === 'boolean') {
          setShowQuestionsReview(data.showQuestionsReview);
        }
      }
    }, (err) => {
      console.warn('Real-time result display setting sync note:', err);
    });

    return () => unsubResult();
  }, []);

  // Handler to update global Result Display Settings in Firestore
  const handleSetShowQuestionsReview = async (showReview: boolean) => {
    setIsUpdatingResultSetting(true);
    setResultSettingMsg('');
    try {
      await setDoc(doc(db, 'settings', 'result_display'), {
        showQuestionsReview: showReview,
        updatedAt: new Date().toISOString()
      }, { merge: true });
      setShowQuestionsReview(showReview);
      setResultSettingMsg(
        showReview
          ? 'Pengaturan tersimpan: Siswa DAPAT melihat soal, jawaban, dan pembahasan setelah ujian.'
          : 'Pengaturan tersimpan: Siswa HANYA melihat halaman hasil nilai (soal & kunci jawaban dikunci).'
      );
      setTimeout(() => setResultSettingMsg(''), 4000);
      broadcastSystemUpdate(
        showReview
          ? 'Tampilan hasil: Pembahasan dibuka'
          : 'Tampilan hasil: Pembahasan dikunci (hanya hasil)'
      ).catch(console.warn);
    } catch (err) {
      console.error('Error saving result display setting:', err);
      alert('Gagal menyimpan pengaturan: ' + (err as Error).message);
    } finally {
      setIsUpdatingResultSetting(false);
    }
  };

  // Update Participant System Mode in Firestore
  const handleSetParticipantMode = async (mode: ParticipantSystemMode) => {
    setIsUpdatingMode(true);
    setModeSaveMsg('');
    try {
      await setDoc(doc(db, 'settings', 'participant_system'), {
        mode,
        updatedAt: new Date().toISOString()
      }, { merge: true });
      setParticipantMode(mode);
      setModeSaveMsg(`Sistem pendaftaran berhasil dialihkan ke: ${mode === 'umum' ? 'Peserta Umum' : 'Peserta Terdaftar'}`);
      setTimeout(() => setModeSaveMsg(''), 4000);
      broadcastSystemUpdate(`Mode peserta dialihkan ke: ${mode === 'umum' ? 'Umum' : 'Terdaftar'}`).catch(console.warn);
    } catch (err) {
      console.error('Error updating participant mode:', err);
      alert('Gagal mengubah mode sistem peserta: ' + (err as Error).message);
    } finally {
      setIsUpdatingMode(false);
    }
  };

  // Add Single Registered Student manually
  const handleAddSingleStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    setRegFormError('');
    setRegFormSuccess('');

    const cleanName = newRegName.trim().toUpperCase();
    if (!cleanName) {
      setRegFormError('Nama lengkap peserta wajib diisi.');
      return;
    }
    if (!newRegSchool) {
      setRegFormError('Asal sekolah wajib dipilih.');
      return;
    }
    if (!newRegGrade) {
      setRegFormError('Kelas wajib dipilih.');
      return;
    }

    // Check duplicate in same school and grade
    const exists = registeredStudents.some(
      (s) => (s.name || '').trim().toUpperCase() === cleanName && s.school === newRegSchool && s.grade === newRegGrade
    );
    if (exists) {
      setRegFormError(`Peserta "${cleanName}" di ${newRegSchool} (${newRegGrade}) sudah terdaftar.`);
      return;
    }

    setIsSavingReg(true);
    try {
      const docId = `reg_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
      await setDoc(doc(db, 'registered_students', docId), {
        name: cleanName,
        school: newRegSchool,
        grade: newRegGrade,
        createdAt: new Date().toISOString()
      });
      setRegFormSuccess(`Peserta "${cleanName}" berhasil didaftarkan!`);
      setNewRegName('');
      setTimeout(() => setRegFormSuccess(''), 3500);
    } catch (err) {
      console.error('Error adding registered student:', err);
      setRegFormError('Gagal menambahkan peserta: ' + (err as Error).message);
    } finally {
      setIsSavingReg(false);
    }
  };

  // Delete Single Registered Student
  const handleDeleteRegisteredStudent = async (id: string, name: string) => {
    if (!window.confirm(`Hapus peserta "${name}" dari daftar peserta terdaftar?`)) return;
    try {
      await deleteDoc(doc(db, 'registered_students', id));
    } catch (err) {
      console.error('Error deleting student:', err);
      alert('Gagal menghapus data peserta: ' + (err as Error).message);
    }
  };

  // Clear/Reset All Registered Students
  const handleResetRegisteredStudents = async () => {
    if (registeredStudents.length === 0) {
      alert('Tidak ada data peserta terdaftar untuk dihapus.');
      return;
    }
    setIsResettingReg(true);
    try {
      const deletePromises = registeredStudents.map((s) => deleteDoc(doc(db, 'registered_students', s.id)));
      await Promise.all(deletePromises);
      setShowResetRegConfirm(false);
      alert('Seluruh data peserta terdaftar berhasil dihapus.');
    } catch (err) {
      console.error('Error resetting registered students:', err);
      alert('Gagal menghapus data peserta: ' + (err as Error).message);
    } finally {
      setIsResettingReg(false);
    }
  };

  // Download Excel Template for Registered Students
  const handleDownloadStudentTemplate = () => {
    // Sheet 1: Template data with examples
    const templateData = [
      {
        NO: 1,
        NAMA_LENGKAP: 'BUDI SANTOSO',
        ASAL_SEKOLAH: 'SD NEGERI KEDUNGGALAR 1',
        KELAS: 'Kelas 6',
      },
      {
        NO: 2,
        NAMA_LENGKAP: 'SITI AISYAH',
        ASAL_SEKOLAH: 'SD NEGERI PELANG LOR 1',
        KELAS: 'Kelas 6',
      },
      {
        NO: 3,
        NAMA_LENGKAP: 'AHMAD FAUZI',
        ASAL_SEKOLAH: 'SD NEGERI GEMARANG 1',
        KELAS: 'Kelas 5',
      },
      {
        NO: 4,
        NAMA_LENGKAP: 'DEWI LESTARI',
        ASAL_SEKOLAH: 'SD MUHAMMADIYAH 1 KEDUNGGALAR',
        KELAS: 'Kelas 4',
      },
      {
        NO: 5,
        NAMA_LENGKAP: 'RIZKY PRATAMA',
        ASAL_SEKOLAH: 'SD AL AZHAR',
        KELAS: 'Kelas 3',
      },
    ];

    const wsTemplate = XLSX.utils.json_to_sheet(templateData);
    wsTemplate['!cols'] = [
      { wch: 6 },
      { wch: 32 },
      { wch: 38 },
      { wch: 15 },
    ];

    // Sheet 2: Reference list of valid schools and grades
    const maxLen = Math.max(SCHOOL_LIST.length, GRADE_LIST.length);
    const referenceData = [];
    for (let i = 0; i < maxLen; i++) {
      referenceData.push({
        DAFTAR_SEKOLAH_VALID: SCHOOL_LIST[i] || '',
        DAFTAR_KELAS_VALID: GRADE_LIST[i] || '',
      });
    }
    const wsRef = XLSX.utils.json_to_sheet(referenceData);
    wsRef['!cols'] = [
      { wch: 40 },
      { wch: 20 },
    ];

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, wsTemplate, 'TEMPLATE_PESERTA');
    XLSX.utils.book_append_sheet(wb, wsRef, 'PANDUAN_SEKOLAH_DAN_KELAS');

    XLSX.writeFile(wb, 'Template_Peserta_Ujian_Terdaftar.xlsx');
  };

  // Upload & Import Excel / CSV for Registered Students
  const handleStudentFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsImporting(true);
    setImportSummary(null);

    const reader = new FileReader();
    reader.onload = async (evt) => {
      try {
        const bstr = evt.target?.result;
        const wb = XLSX.read(bstr, { type: 'binary' });
        const firstSheetName = wb.SheetNames[0];
        const ws = wb.Sheets[firstSheetName];
        const rawRows = XLSX.utils.sheet_to_json<Record<string, any>>(ws, { defval: '' });

        if (!rawRows || rawRows.length === 0) {
          alert('File Excel kosong atau tidak memiliki baris data.');
          setIsImporting(false);
          return;
        }

        let addedCount = 0;
        let skippedCount = 0;

        // Set of existing students (NAME|SCHOOL|GRADE)
        const existingSet = new Set(
          registeredStudents.map((s) => `${(s.name || '').trim().toUpperCase()}|${(s.school || '').trim().toUpperCase()}|${(s.grade || '').trim().toUpperCase()}`)
        );

        const newStudentsToSave: { id: string; name: string; school: string; grade: string; createdAt: string }[] = [];

        for (let i = 0; i < rawRows.length; i++) {
          const row = rawRows[i];
          let rawName = '';
          let rawSchool = '';
          let rawGrade = '';

          for (const key of Object.keys(row)) {
            const k = key.trim().toUpperCase();
            if (k.includes('NAMA') || k.includes('NAME') || k.includes('SISWA') || k.includes('PESERTA')) {
              rawName = String(row[key]);
            } else if (k.includes('SEKOLAH') || k.includes('SCHOOL') || k.includes('ASAL')) {
              rawSchool = String(row[key]);
            } else if (k.includes('KELAS') || k.includes('GRADE')) {
              rawGrade = String(row[key]);
            }
          }

          const cleanName = (rawName || '').trim().toUpperCase();
          if (!cleanName) {
            skippedCount++;
            continue;
          }

          // Match school against SCHOOL_LIST
          const trimmedSchool = (rawSchool || '').trim();
          let matchedSchool = SCHOOL_LIST.find((s) => s.toUpperCase() === trimmedSchool.toUpperCase()) || trimmedSchool;
          if (!matchedSchool) {
            matchedSchool = SCHOOL_LIST[0];
          }

          // Match grade against GRADE_LIST
          const trimmedGrade = (rawGrade || '').trim();
          let matchedGrade = GRADE_LIST.find((g) => g.toUpperCase() === trimmedGrade.toUpperCase()) || '';
          if (!matchedGrade) {
            const num = trimmedGrade.replace(/\D/g, '');
            if (num) {
              const byNum = GRADE_LIST.find((g) => g.includes(num));
              if (byNum) matchedGrade = byNum;
            }
          }
          if (!matchedGrade) {
            matchedGrade = GRADE_LIST[3]; // default Kelas 6
          }

          const key = `${cleanName}|${matchedSchool.toUpperCase()}|${matchedGrade.toUpperCase()}`;
          if (existingSet.has(key)) {
            skippedCount++;
            continue;
          }

          existingSet.add(key);
          const docId = `reg_${Date.now()}_${Math.random().toString(36).substring(2, 7)}_${i}`;
          newStudentsToSave.push({
            id: docId,
            name: cleanName,
            school: matchedSchool,
            grade: matchedGrade,
            createdAt: new Date().toISOString()
          });
          addedCount++;
        }

        if (newStudentsToSave.length > 0) {
          const savePromises = newStudentsToSave.map((st) =>
            setDoc(doc(db, 'registered_students', st.id), st)
          );
          await Promise.all(savePromises);
        }

        setImportSummary({
          total: rawRows.length,
          added: addedCount,
          skipped: skippedCount,
        });

        e.target.value = '';
      } catch (err) {
        console.error('Error importing Excel file:', err);
        alert('Gagal mengimpor file Excel: ' + (err as Error).message);
      } finally {
        setIsImporting(false);
      }
    };
    reader.readAsBinaryString(file);
  };

  // Export Registered Students to Excel
  const handleExportRegisteredStudents = () => {
    if (registeredStudents.length === 0) {
      alert('Belum ada data peserta terdaftar untuk diekspor.');
      return;
    }

    const exportData = registeredStudents.map((st, idx) => ({
      NO: idx + 1,
      NAMA_LENGKAP: st.name,
      ASAL_SEKOLAH: st.school,
      KELAS: st.grade,
      TANGGAL_DIDAFTARKAN: st.createdAt ? new Date(st.createdAt).toLocaleString('id-ID') : '-'
    }));

    const ws = XLSX.utils.json_to_sheet(exportData);
    ws['!cols'] = [
      { wch: 6 },
      { wch: 32 },
      { wch: 38 },
      { wch: 15 },
      { wch: 24 }
    ];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'DATA_PESERTA_TERDAFTAR');
    XLSX.writeFile(wb, `Data_Peserta_Terdaftar_${new Date().toISOString().slice(0, 10)}.xlsx`);
  };

  // Filtered Registered Students for Table Display
  const filteredRegisteredStudents = registeredStudents.filter((st) => {
    const matchesSearch = regSearchQuery === '' || (st.name || '').toUpperCase().includes(regSearchQuery.trim().toUpperCase());
    const matchesSchool = regSchoolFilter === 'ALL' || st.school === regSchoolFilter;
    const matchesGrade = regGradeFilter === 'ALL' || st.grade === regGradeFilter;
    return matchesSearch && matchesSchool && matchesGrade;
  });

  // Add question field in form with selected type
  const handleAddQuestion = (type: QuestionType = 'multiple_choice') => {
    let newQ: Question;
    const qId = 'q_' + Date.now() + '_' + questions.length;

    if (type === 'true_false') {
      newQ = {
        id: qId,
        type: 'true_false',
        question: '',
        correctBool: true,
        points: 20,
      };
    } else if (type === 'matching') {
      newQ = {
        id: qId,
        type: 'matching',
        question: 'Jodohkan istilah di sebelah kiri dengan pasangan yang tepat di sebelah kanan:',
        matchingPairs: [
          { id: `p_${Date.now()}_1`, premise: '', match: '' },
          { id: `p_${Date.now()}_2`, premise: '', match: '' },
          { id: `p_${Date.now()}_3`, premise: '', match: '' },
        ],
        points: 20,
      };
    } else if (type === 'short_answer') {
      newQ = {
        id: qId,
        type: 'short_answer',
        question: '',
        correctText: '',
        points: 20,
      };
    } else if (type === 'image_question') {
      newQ = {
        id: qId,
        type: 'image_question',
        question: '',
        imageUrl: 'https://images.unsplash.com/photo-1509228468518-180dd4864904?w=500&auto=format&fit=crop&q=60',
        options: ['', '', '', ''],
        correctAnswer: 0,
        points: 20,
      };
    } else {
      // multiple_choice
      newQ = {
        id: qId,
        type: 'multiple_choice',
        question: '',
        options: ['', '', '', ''],
        correctAnswer: 0,
        points: 20,
      };
    }

    setQuestions([...questions, newQ]);
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

  const handleQuestionTypeChange = (qIdx: number, newType: QuestionType) => {
    const updated = [...questions];
    const current = updated[qIdx];
    const converted: Question = {
      ...current,
      type: newType,
    };

    if (newType === 'multiple_choice' || newType === 'image_question') {
      converted.options = current.options && current.options.length === 4 ? current.options : ['', '', '', ''];
      converted.correctAnswer = current.correctAnswer ?? 0;
      if (newType === 'image_question' && !converted.imageUrl) {
        converted.imageUrl = 'https://images.unsplash.com/photo-1509228468518-180dd4864904?w=500&auto=format&fit=crop&q=60';
      }
    } else if (newType === 'true_false') {
      converted.correctBool = current.correctBool ?? true;
    } else if (newType === 'matching') {
      if (!converted.matchingPairs || converted.matchingPairs.length === 0) {
        converted.matchingPairs = [
          { id: `p_${Date.now()}_1`, premise: '', match: '' },
          { id: `p_${Date.now()}_2`, premise: '', match: '' },
          { id: `p_${Date.now()}_3`, premise: '', match: '' },
        ];
      }
    } else if (newType === 'short_answer') {
      converted.correctText = current.correctText || '';
    }

    updated[qIdx] = converted;
    setQuestions(updated);
  };

  const handleOptionChange = (qIdx: number, oIdx: number, val: string) => {
    const updated = [...questions];
    const opts = [...(updated[qIdx].options || ['', '', '', ''])];
    opts[oIdx] = val;
    updated[qIdx].options = opts;
    setQuestions(updated);
  };

  const handleMatchingPairChange = (qIdx: number, pIdx: number, field: 'premise' | 'match', val: string) => {
    const updated = [...questions];
    const pairs = [...(updated[qIdx].matchingPairs || [])];
    if (pairs[pIdx]) {
      pairs[pIdx] = { ...pairs[pIdx], [field]: val };
      updated[qIdx].matchingPairs = pairs;
      setQuestions(updated);
    }
  };

  const handleAddMatchingPair = (qIdx: number) => {
    const updated = [...questions];
    const pairs = [...(updated[qIdx].matchingPairs || [])];
    pairs.push({ id: `p_${Date.now()}_${pairs.length + 1}`, premise: '', match: '' });
    updated[qIdx].matchingPairs = pairs;
    setQuestions(updated);
  };

  const handleRemoveMatchingPair = (qIdx: number, pIdx: number) => {
    const updated = [...questions];
    const pairs = [...(updated[qIdx].matchingPairs || [])];
    if (pairs.length <= 2) {
      alert('Soal menjodohkan memerlukan minimal 2 pasangan.');
      return;
    }
    updated[qIdx].matchingPairs = pairs.filter((_, idx) => idx !== pIdx);
    setQuestions(updated);
  };

  // Upload Excel Questions Handler (Auto-detects format & question types)
  const handleUploadQuestionsExcel = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const data = new Uint8Array(event.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        const { questions: parsedQuestions, detectedTypes, invalidCount } = parseQuestionsFromWorkbook(workbook);

        if (!parsedQuestions || parsedQuestions.length === 0) {
          setCreateError(
            `File Excel tidak memiliki data soal yang valid (0 butir terbaca). Pastikan file berisi kolom pertanyaan/soal dan tidak kosong. Anda dapat mengunduh contoh pada menu 'Unduh Template'.`
          );
          return;
        }

        // Auto-enable detected types in the exam allowedTypes
        setAllowedTypes((prev) => {
          const combined = new Set([...prev, ...detectedTypes]);
          return Array.from(combined);
        });

        setQuestions(parsedQuestions);
        const typeLabels = detectedTypes.map((t) => {
          const found = QUESTION_TYPES.find((qt) => qt.type === t);
          return found ? found.label : t;
        });

        setCreateMsg(
          `Berhasil mengimpor ${parsedQuestions.length} butir soal (${typeLabels.join(', ')})! ${
            invalidCount > 0 ? `(${invalidCount} baris dilewati karena kolom belum lengkap)` : ''
          }`
        );
        setCreateError('');
      } catch (err) {
        console.error(err);
        setCreateError('Gagal membaca file Excel. Pastikan format file (.xlsx, .xls, .csv) valid.');
      }
    };

    reader.readAsArrayBuffer(file);
    e.target.value = '';
  };

  // Populate form to edit an exam
  const handleStartEditExam = (ex: Exam) => {
    setEditingExamId(ex.id);
    setNewToken(ex.token);
    setNewTitle(ex.title);
    setNewSubject(ex.subject || '');
    setNewDuration(ex.durationMinutes || 15);
    setAllowedTypes(
      ex.allowedQuestionTypes && ex.allowedQuestionTypes.length > 0
        ? ex.allowedQuestionTypes
        : ['multiple_choice', 'true_false', 'matching', 'short_answer', 'image_question']
    );
    setQuestions(
      ex.questions && ex.questions.length > 0
        ? ex.questions.map((q) => {
            if (q.imageUrl && isQuestionTypeKeyword(q.imageUrl)) {
              return {
                ...q,
                type: q.type === 'image_question' ? 'multiple_choice' : q.type,
                imageUrl: undefined,
              };
            }
            return q;
          })
        : [
            {
              id: 'q_' + Date.now(),
              type: 'multiple_choice',
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
    setAllowedTypes(['multiple_choice', 'true_false', 'matching', 'short_answer', 'image_question']);
    setQuestions([
      {
        id: 'q_' + Date.now(),
        type: 'multiple_choice',
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

    if (allowedTypes.length === 0) {
      setCreateError('Pilih minimal 1 jenis daftar soal yang diizinkan dalam paket ujian ini.');
      return;
    }

    // Validate questions
    for (let i = 0; i < questions.length; i++) {
      const q = questions[i];
      const type = q.type || 'multiple_choice';

      if (!q.question.trim()) {
        setCreateError(`Pertanyaan/pernyataan pada Soal No. ${i + 1} belum diisi.`);
        return;
      }

      if (type === 'multiple_choice' || type === 'image_question') {
        const opts = q.options || [];
        if (opts.length < 4) {
          setCreateError(`Soal No. ${i + 1} harus memiliki 4 pilihan jawaban.`);
          return;
        }
        for (let j = 0; j < 4; j++) {
          if (!opts[j]?.trim()) {
            setCreateError(`Pilihan ${String.fromCharCode(65 + j)} pada Soal No. ${i + 1} masih kosong.`);
            return;
          }
        }
      } else if (type === 'matching') {
        const pairs = q.matchingPairs || [];
        if (pairs.length < 2) {
          setCreateError(`Soal Menjodohkan No. ${i + 1} membutuhkan minimal 2 pasangan.`);
          return;
        }
        for (let j = 0; j < pairs.length; j++) {
          if (!pairs[j].premise.trim() || !pairs[j].match.trim()) {
            setCreateError(`Pasangan No. ${j + 1} pada Soal Menjodohkan No. ${i + 1} belum lengkap.`);
            return;
          }
        }
      } else if (type === 'short_answer') {
        if (!q.correctText?.trim()) {
          setCreateError(`Kunci jawaban singkat pada Soal No. ${i + 1} belum diisi.`);
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
        allowedQuestionTypes: allowedTypes,
        questions,
        createdAt: new Date().toISOString(),
        active: true,
      };

      // If token ID changed during edit, remove old document
      if (editingExamId && editingExamId !== cleanToken) {
        await deleteDoc(doc(db, 'exams', editingExamId));
      }

      await setDoc(doc(db, 'exams', cleanToken), newExamObj);
      broadcastSystemUpdate(`Ujian [${cleanToken}] diperbarui`).catch(console.warn);

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
      broadcastSystemUpdate(`Status ujian [${examId}] diubah`).catch(console.warn);
    } catch (err) {
      console.error('Failed to toggle exam status:', err);
    }
  };

  const handleDeleteExam = async (examId: string) => {
    if (confirm(`Yakin ingin menghapus Token Ujian [${examId}]?`)) {
      try {
        await deleteDoc(doc(db, 'exams', examId));
        broadcastSystemUpdate(`Ujian [${examId}] dihapus`).catch(console.warn);
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
    setEditSubSchoolName(sub.schoolName || SCHOOL_LIST[0]);
    setEditSubGradeName(sub.gradeName || 'Kelas 6');
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
        schoolName: editSubSchoolName,
        gradeName: editSubGradeName,
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
    const q = searchQuery.toLowerCase();
    const matchesSearch = (sub.studentName || '').toLowerCase().includes(q) ||
                          (sub.examToken || '').toLowerCase().includes(q) ||
                          (sub.schoolName || '').toLowerCase().includes(q) ||
                          (sub.gradeName || '').toLowerCase().includes(q);
    const matchesToken = selectedTokenFilter === 'ALL' || sub.examToken === selectedTokenFilter;
    const matchesSchool = selectedSchoolFilter === 'ALL' || (sub.schoolName || 'SD NEGERI BANGUNREJO KIDUL 1') === selectedSchoolFilter;
    const matchesGrade = selectedGradeFilter === 'ALL' || (sub.gradeName || 'Kelas 6') === selectedGradeFilter;
    const matchesStatus =
      selectedStatusFilter === 'ALL' ||
      (selectedStatusFilter === 'completed' && (sub.status === 'submitted' || sub.status === 'time_up' || sub.status === 'cheated')) ||
      (selectedStatusFilter === 'in_progress' && sub.status === 'in_progress');
    return matchesSearch && matchesToken && matchesSchool && matchesGrade && matchesStatus;
  });

  // Handle Export Excel (.xlsx)
  const handleExportExcel = () => {
    if (filteredSubmissions.length === 0) {
      alert('Tidak ada data pengerjaan siswa untuk diunduh.');
      return;
    }

    const exportRows = filteredSubmissions.map((sub, idx) => ({
      'No': idx + 1,
      'Nama Peserta': sub.studentName || '-',
      'Asal Sekolah': sub.schoolName || 'SD NEGERI BANGUNREJO KIDUL 1',
      'Kelas': sub.gradeName || 'Kelas 6',
      'Token Ujian': sub.examToken || '-',
      'Judul Ujian': sub.examTitle || '-',
      'Nilai Perolehan': sub.score,
      'Nilai Maksimal': sub.maxScore,
      'Persentase (%)': sub.percentage,
      'Status Kelulusan': sub.percentage >= 60 ? 'LULUS' : 'TIDAK LULUS',
      'Status Pengerjaan': sub.status === 'submitted' ? 'Selesai' : sub.status === 'time_up' ? 'Waktu Habis' : sub.status === 'cheated' || sub.cheatDetected ? 'Pelanggaran (Pindah Tab)' : 'Sedang Mengerjakan',
      'WAKTU': sub.status === 'in_progress'
        ? (() => {
            const targetExam = exams.find(e => e.token === sub.examToken);
            const durationMin = targetExam?.durationMinutes || 15;
            const startMs = sub.startedAt ? new Date(sub.startedAt).getTime() : Date.now();
            const elapsed = Math.max(0, Math.floor((Date.now() - startMs) / 1000));
            const remain = Math.max(0, durationMin * 60 - elapsed);
            const m = Math.floor(remain / 60);
            const s = remain % 60;
            return `Sedang Mengerjakan (Sisa: ${m}m ${s}d)`;
          })()
        : sub.status === 'time_up'
        ? 'Waktu Habis (00:00)'
        : sub.status === 'cheated'
        ? 'Dihentikan'
        : sub.submittedAt && sub.startedAt
        ? (() => {
            const spent = Math.max(0, Math.floor((new Date(sub.submittedAt).getTime() - new Date(sub.startedAt).getTime()) / 1000));
            return `Selesai (${Math.floor(spent / 60)}m ${spent % 60}d)`;
          })()
        : 'Selesai',
      'Waktu Mulai': sub.startedAt ? new Date(sub.startedAt).toLocaleString('id-ID') : '-',
      'Waktu Selesai': sub.submittedAt ? new Date(sub.submittedAt).toLocaleString('id-ID') : '-'
    }));

    const worksheet = XLSX.utils.json_to_sheet(exportRows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Ringkasan Hasil Ujian');

    worksheet['!cols'] = [
      { wch: 6 },  // No
      { wch: 28 }, // Nama Peserta
      { wch: 35 }, // Asal Sekolah
      { wch: 15 }, // Kelas
      { wch: 14 }, // Token Ujian
      { wch: 25 }, // Judul Ujian
      { wch: 15 }, // Nilai Perolehan
      { wch: 15 }, // Nilai Maksimal
      { wch: 15 }, // Persentase (%)
      { wch: 18 }, // Status Kelulusan
      { wch: 20 }, // Status Pengerjaan
      { wch: 30 }, // WAKTU
      { wch: 22 }, // Waktu Mulai
      { wch: 22 }, // Waktu Selesai
    ];

    const fileToken = selectedTokenFilter !== 'ALL' ? selectedTokenFilter : 'Semua_Token';
    const fileName = `Ringkasan_Hasil_Ujian_${fileToken}_${new Date().toISOString().slice(0, 10)}.xlsx`;
    XLSX.writeFile(workbook, fileName);
  };

  // Calculate Real-time Statistics based on filtered dataset
  const totalParticipants = filteredSubmissions.length;
  const completedSubmissions = filteredSubmissions.filter(s => s.status === 'submitted' || s.status === 'time_up' || s.status === 'cheated');
  const inProgressCount = filteredSubmissions.filter(s => s.status === 'in_progress').length;
  const avgScore = completedSubmissions.length > 0
    ? Math.round(completedSubmissions.reduce((sum, s) => sum + s.percentage, 0) / completedSubmissions.length)
    : 0;
  const passCount = completedSubmissions.filter(s => s.percentage >= 60).length;
  const passRate = completedSubmissions.length > 0
    ? Math.round((passCount / completedSubmissions.length) * 100)
    : 0;
  const isFilterActive = selectedSchoolFilter !== 'ALL' || selectedGradeFilter !== 'ALL' || selectedTokenFilter !== 'ALL' || selectedStatusFilter !== 'ALL' || searchQuery.trim() !== '';

  return (
    <div className="min-h-screen bg-colorful-light-mesh text-slate-800 flex flex-col font-sans">
      {/* Navbar Header */}
      <header className="sticky top-0 z-30 bg-gradient-to-r from-slate-950 via-indigo-950 to-purple-950 text-white shadow-[0_10px_30px_rgba(15,23,42,0.4)] px-4 py-3.5 border-b border-indigo-800/40">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-2xl bg-white/10 p-1 flex items-center justify-center shadow-[0_6px_16px_rgba(245,158,11,0.3)] border border-slate-700/80 overflow-hidden shrink-0">
              <img
                src="https://iili.io/CvXmwBf.png"
                alt="Exam Edu Logo"
                className="w-full h-full object-contain filter drop-shadow-sm"
                referrerPolicy="no-referrer"
              />
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

          <div className="flex items-center space-x-2 sm:space-x-3">
            <button
              type="button"
              disabled={isBroadcasting}
              onClick={handleManualBroadcastUpdate}
              title="Kirim sinyal pembaruan sistem ke seluruh perangkat siswa (yang sedang aktif atau diminimize)"
              className="inline-flex items-center space-x-1.5 px-3 py-2 rounded-xl text-xs font-black bg-indigo-600 hover:bg-indigo-500 text-white transition-all border border-indigo-400 shadow-xs cursor-pointer disabled:opacity-50"
            >
              {isBroadcasting ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  <span className="hidden sm:inline">Menyiarkan...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                  <span className="hidden sm:inline">Siarkan Update Sistem</span>
                </>
              )}
            </button>

            <button
              onClick={onBackToStudentLogin}
              className="inline-flex items-center space-x-1.5 px-3.5 py-2 rounded-xl text-xs font-extrabold bg-slate-800/90 hover:bg-slate-700 text-slate-100 transition-all border border-slate-700 shadow-xs cursor-pointer"
            >
              <ArrowLeft className="w-3.5 h-3.5 text-amber-400" />
              <span className="hidden sm:inline">Halaman Siswa</span>
            </button>
          </div>
        </div>

        {broadcastSuccessMsg && (
          <div className="max-w-7xl mx-auto mt-2.5 p-3 rounded-2xl bg-emerald-500/20 border border-emerald-400/50 text-emerald-200 text-xs font-bold flex items-center space-x-2 animate-fadeIn">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{broadcastSuccessMsg}</span>
          </div>
        )}
      </header>

      {/* Main Dashboard Layout */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 md:p-6 space-y-6">
        {/* Navigation Tabs */}
        <div className="flex flex-wrap items-center gap-2 border-b border-indigo-200/60 pb-3">
          <button
            onClick={() => setActiveTab('monitor')}
            className={`px-4 sm:px-5 py-2.5 rounded-2xl font-black text-xs flex items-center space-x-2 transition-all cursor-pointer ${
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
            className={`px-4 sm:px-5 py-2.5 rounded-2xl font-black text-xs flex items-center space-x-2 transition-all cursor-pointer ${
              activeTab === 'manage'
                ? 'btn-3d-violet text-white'
                : 'bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 shadow-xs'
            }`}
          >
            <KeyRound className="w-4 h-4 text-purple-500" />
            <span>Kelola Token & Soal Ujian ({exams.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('participants')}
            className={`px-4 sm:px-5 py-2.5 rounded-2xl font-black text-xs flex items-center space-x-2 transition-all cursor-pointer ${
              activeTab === 'participants'
                ? 'btn-3d-emerald text-white'
                : 'bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 shadow-xs'
            }`}
          >
            <UserCheck className="w-4 h-4 text-emerald-500" />
            <span>Pengaturan Sistem Peserta Ujian ({registeredStudents.length})</span>
            <span className={`px-2 py-0.5 rounded-full text-[10px] font-black ${
              participantMode === 'terdaftar'
                ? 'bg-amber-100 text-amber-800 border border-amber-300'
                : 'bg-emerald-100 text-emerald-800 border border-emerald-300'
            }`}>
              {participantMode === 'terdaftar' ? 'Mode Terdaftar' : 'Mode Umum'}
            </span>
          </button>
        </div>

        {/* TAB 1: MONITOR REAL-TIME SUBMISSIONS */}
        {activeTab === 'monitor' && (
          <div className="space-y-6">
            {/* Quick Metrics Grid */}
            <div>
              {isFilterActive && (
                <div className="flex items-center justify-between mb-2.5 px-1">
                  <span className="text-[11px] font-extrabold text-indigo-700 bg-indigo-50/90 border border-indigo-200 px-3 py-1 rounded-xl flex items-center space-x-1.5 shadow-xs">
                    <span className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse"></span>
                    <span>Statistik diperbarui berdasarkan filter: Menampilkan <strong>{filteredSubmissions.length}</strong> dari <strong>{submissions.length}</strong> total data</span>
                  </span>
                </div>
              )}
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
          </div>

            {/* Filter Bar & Submissions Table */}
            <div className="card-3d overflow-hidden">
              <div className="p-4 bg-slate-50 border-b border-slate-200 space-y-3.5">
                {/* BARIS 1: Pencarian dan Tombol Aksi Utama */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="relative flex-1 max-w-md">
                    <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Cari nama siswa, sekolah, atau token..."
                      className="w-full pl-9 pr-8 py-2 bg-white border-2 border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:border-indigo-500 shadow-inner"
                    />
                    {searchQuery && (
                      <button
                        type="button"
                        onClick={() => setSearchQuery('')}
                        className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    )}
                  </div>

                  {/* Tombol Aksi Utama: Unduh Excel & Hapus Seluruh Hasil Pengerjaan Siswa */}
                  <div className="flex flex-wrap items-center gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={handleExportExcel}
                      className="px-4 py-2 rounded-xl btn-3d-emerald text-white text-xs font-black inline-flex items-center space-x-1.5 shadow-md cursor-pointer transition-all active:translate-y-0.5"
                      title="Unduh Ringkasan Hasil Ujian Format Excel (.xlsx)"
                    >
                      <Download className="w-4 h-4" />
                      <span>Unduh Excel</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        if (submissions.length === 0) {
                          alert('Tidak ada data pengerjaan siswa untuk dihapus.');
                          return;
                        }
                        setShowResetConfirm(true);
                      }}
                      className="px-4 py-2 rounded-xl bg-gradient-to-r from-rose-600 to-rose-700 hover:from-rose-500 hover:to-rose-600 text-white text-xs font-black inline-flex items-center space-x-1.5 shadow-md cursor-pointer transition-all active:translate-y-0.5 border-b-2 border-rose-900"
                      title="Hapus seluruh hasil pengerjaan ujian siswa di database"
                    >
                      <Trash2 className="w-4 h-4" />
                      <span>Hapus Seluruh Hasil Siswa</span>
                    </button>
                  </div>
                </div>

                {/* BARIS 2: Baris Filter Dropdown (Sekolah, Kelas, Token, Status) */}
                <div className="pt-2 border-t border-slate-200/80 flex flex-wrap items-center justify-between gap-2.5">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-[11px] font-extrabold uppercase tracking-wider text-slate-500 flex items-center space-x-1 mr-1">
                      <span>Filter Data:</span>
                    </span>

                    {/* Filter Sekolah */}
                    <div className="flex items-center space-x-1.5 bg-white px-2.5 py-1.5 rounded-xl border border-slate-200 shadow-xs">
                      <label className="text-[11px] font-bold text-slate-500">Sekolah:</label>
                      <select
                        value={selectedSchoolFilter}
                        onChange={(e) => setSelectedSchoolFilter(e.target.value)}
                        className="bg-transparent text-xs font-black text-slate-800 focus:outline-none max-w-[170px] truncate cursor-pointer"
                      >
                        <option value="ALL">Semua Sekolah</option>
                        {SCHOOL_LIST.map(sch => (
                          <option key={sch} value={sch}>{sch}</option>
                        ))}
                      </select>
                    </div>

                    {/* Filter Kelas */}
                    <div className="flex items-center space-x-1.5 bg-white px-2.5 py-1.5 rounded-xl border border-slate-200 shadow-xs">
                      <label className="text-[11px] font-bold text-slate-500">Kelas:</label>
                      <select
                        value={selectedGradeFilter}
                        onChange={(e) => setSelectedGradeFilter(e.target.value)}
                        className="bg-transparent text-xs font-black text-slate-800 focus:outline-none cursor-pointer"
                      >
                        <option value="ALL">Semua Kelas</option>
                        {GRADE_LIST.map(grd => (
                          <option key={grd} value={grd}>{grd}</option>
                        ))}
                      </select>
                    </div>

                    {/* Filter Token */}
                    <div className="flex items-center space-x-1.5 bg-white px-2.5 py-1.5 rounded-xl border border-slate-200 shadow-xs">
                      <label className="text-[11px] font-bold text-slate-500">Token:</label>
                      <select
                        value={selectedTokenFilter}
                        onChange={(e) => setSelectedTokenFilter(e.target.value)}
                        className="bg-transparent text-xs font-black text-slate-800 focus:outline-none max-w-[160px] truncate cursor-pointer"
                      >
                        <option value="ALL">Semua Token</option>
                        {exams.map(ex => (
                          <option key={ex.id} value={ex.token}>{ex.token} - {ex.title}</option>
                        ))}
                      </select>
                    </div>

                    {/* Filter Status */}
                    <div className="flex items-center space-x-1.5 bg-white px-2.5 py-1.5 rounded-xl border border-slate-200 shadow-xs">
                      <label className="text-[11px] font-bold text-slate-500">Status:</label>
                      <select
                        value={selectedStatusFilter}
                        onChange={(e) => setSelectedStatusFilter(e.target.value as 'ALL' | 'completed' | 'in_progress')}
                        className="bg-transparent text-xs font-black text-slate-800 focus:outline-none cursor-pointer"
                      >
                        <option value="ALL">Semua Status</option>
                        <option value="completed">Selesai</option>
                        <option value="in_progress">Sedang Mengerjakan</option>
                      </select>
                    </div>
                  </div>

                  {/* Reset All Filters Button */}
                  {isFilterActive && (
                    <button
                      type="button"
                      onClick={() => {
                        setSearchQuery('');
                        setSelectedSchoolFilter('ALL');
                        setSelectedGradeFilter('ALL');
                        setSelectedTokenFilter('ALL');
                        setSelectedStatusFilter('ALL');
                      }}
                      className="px-2.5 py-1.5 text-[11px] font-bold text-rose-700 hover:text-rose-900 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-xl inline-flex items-center space-x-1 transition-all cursor-pointer shadow-xs"
                      title="Kembalikan semua filter ke awal"
                    >
                      <X className="w-3.5 h-3.5" />
                      <span>Hapus Filter</span>
                    </button>
                  )}
                </div>
              </div>

              <div className="px-5 py-3.5 bg-slate-100/80 border-b border-slate-200 flex items-center justify-between">
                <h3 className="text-xs font-black uppercase tracking-wider text-slate-700 font-heading flex items-center space-x-2">
                  <span>Daftar Pengerjaan Real-time ({filteredSubmissions.length})</span>
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
                        <th className="py-3.5 px-4">Asal Sekolah</th>
                        <th className="py-3.5 px-4">Kelas</th>
                        <th className="py-3.5 px-4">Token Ujian</th>
                        <th className="py-3.5 px-4">Status</th>
                        <th className="py-3.5 px-4">Soal Dijawab</th>
                        <th className="py-3.5 px-4">Nilai Akhir</th>
                        <th className="py-3.5 px-4 min-w-[170px]">Waktu</th>
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
                            <td className="py-3.5 px-4 text-slate-700 font-semibold max-w-[200px] truncate">
                              <span className="inline-flex items-center space-x-1 bg-slate-100 border border-slate-200 px-2 py-0.5 rounded-md text-[11px] text-slate-800 font-extrabold">
                                <Building className="w-3 h-3 text-indigo-500 shrink-0" />
                                <span className="truncate">{sub.schoolName || 'SD NEGERI BANGUNREJO KIDUL 1'}</span>
                              </span>
                            </td>
                            <td className="py-3.5 px-4 text-slate-700 font-semibold shrink-0">
                              <span className="inline-flex items-center space-x-1 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-md text-[11px] text-emerald-900 font-extrabold">
                                <GraduationCap className="w-3 h-3 text-emerald-600 shrink-0" />
                                <span>{sub.gradeName || 'Kelas 6'}</span>
                              </span>
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
                              {(sub.status === 'cheated' || sub.cheatDetected) && (
                                <span className="inline-flex items-center space-x-1 text-[11px] font-extrabold bg-rose-50 text-rose-700 border border-rose-300 px-2.5 py-0.5 rounded-full" title="Siswa mendeteksi aktivitas berpindah tab atau meminimalkan window">
                                  <AlertCircle className="w-3.5 h-3.5 text-rose-600" />
                                  <span>Pelanggaran (Pindah Tab)</span>
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
                            <td className="py-3.5 px-4 font-semibold">
                              {(() => {
                                const durationMinutes = targetExam?.durationMinutes || 15;
                                const totalDurationSec = durationMinutes * 60;
                                const startMs = sub.startedAt ? new Date(sub.startedAt).getTime() : currentTime;
                                const elapsedSec = Math.max(0, Math.floor((currentTime - startMs) / 1000));
                                const remainingSec = Math.max(0, totalDurationSec - elapsedSec);

                                const formatRemaining = (seconds: number) => {
                                  const hrs = Math.floor(seconds / 3600);
                                  const mins = Math.floor((seconds % 3600) / 60);
                                  const secs = seconds % 60;
                                  if (hrs > 0) {
                                    return `${hrs}:${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
                                  }
                                  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
                                };

                                const startTimeFormatted = sub.startedAt
                                  ? new Date(sub.startedAt).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })
                                  : '-';

                                if (sub.status === 'in_progress') {
                                  const isCritical = remainingSec <= 60;
                                  const isWarning = remainingSec <= 300;

                                  return (
                                    <div className="space-y-1">
                                      <div className="flex items-center space-x-1.5">
                                        <span
                                          className={`inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-xl text-xs font-mono font-black border shadow-xs transition-all ${
                                            isCritical
                                              ? 'bg-rose-100 text-rose-800 border-rose-300 animate-pulse'
                                              : isWarning
                                              ? 'bg-amber-100 text-amber-800 border-amber-300'
                                              : 'bg-indigo-50 text-indigo-800 border-indigo-200'
                                          }`}
                                        >
                                          <Clock className={`w-3.5 h-3.5 ${isCritical ? 'text-rose-600' : isWarning ? 'text-amber-600' : 'text-indigo-600'}`} />
                                          <span>Sisa: {formatRemaining(remainingSec)}</span>
                                        </span>
                                      </div>
                                      <div className="text-[10px] text-slate-500 font-semibold flex items-center space-x-1">
                                        <span>Mulai {startTimeFormatted}</span>
                                        <span>·</span>
                                        <span>Durasi {durationMinutes}m</span>
                                      </div>
                                    </div>
                                  );
                                }

                                if (sub.status === 'submitted') {
                                  const timeSpentSec = sub.submittedAt && sub.startedAt
                                    ? Math.max(0, Math.floor((new Date(sub.submittedAt).getTime() - new Date(sub.startedAt).getTime()) / 1000))
                                    : null;

                                  return (
                                    <div className="space-y-0.5">
                                      <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-lg text-[11px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
                                        <CheckCircle2 className="w-3 h-3 text-emerald-600 shrink-0" />
                                        <span>
                                          {timeSpentSec !== null
                                            ? `Selesai (${Math.floor(timeSpentSec / 60)}m ${timeSpentSec % 60}d)`
                                            : 'Selesai'}
                                        </span>
                                      </span>
                                      <div className="text-[10px] text-slate-500 font-semibold">
                                        <span>Mulai {startTimeFormatted}</span>
                                        {sub.submittedAt && (
                                          <span> · Selesai {new Date(sub.submittedAt).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}</span>
                                        )}
                                      </div>
                                    </div>
                                  );
                                }

                                if (sub.status === 'time_up') {
                                  return (
                                    <div className="space-y-0.5">
                                      <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-lg text-[11px] font-bold bg-slate-100 text-slate-700 border border-slate-300">
                                        <Clock className="w-3 h-3 text-slate-500 shrink-0" />
                                        <span>Waktu Habis (00:00)</span>
                                      </span>
                                      <div className="text-[10px] text-slate-500 font-semibold">
                                        <span>Mulai {startTimeFormatted} · Durasi {durationMinutes}m</span>
                                      </div>
                                    </div>
                                  );
                                }

                                return (
                                  <div className="space-y-0.5">
                                    <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-lg text-[11px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
                                      <AlertCircle className="w-3 h-3 text-rose-500 shrink-0" />
                                      <span>Dihentikan</span>
                                    </span>
                                    <div className="text-[10px] text-slate-500 font-semibold">
                                      <span>Mulai {startTimeFormatted}</span>
                                    </div>
                                  </div>
                                );
                              })()}
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
          <div className="space-y-6">
            {/* OPSI SISTEM: VISIBILITAS HASIL UJIAN SISWA (SOAL + JAWABAN + PENJELASAN) */}
            <div className="card-3d p-5 md:p-6 bg-white border-2 border-indigo-200/80 rounded-3xl space-y-4 shadow-xs">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
                <div className="flex items-center space-x-3">
                  <div className={`w-11 h-11 rounded-2xl flex items-center justify-center shadow-xs shrink-0 ${
                    !showQuestionsReview
                      ? 'bg-amber-100 text-amber-800 border border-amber-300'
                      : 'bg-indigo-100 text-indigo-700 border border-indigo-300'
                  }`}>
                    {!showQuestionsReview ? <Lock className="w-5 h-5 text-amber-700" /> : <Eye className="w-5 h-5 text-indigo-600" />}
                  </div>
                  <div>
                    <div className="flex items-center space-x-2">
                      <h3 className="text-base font-black text-slate-900 font-heading">
                        Opsi Sistem: Visibilitas Hasil Ujian Siswa
                      </h3>
                      <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-800">
                        Otomatis Berlaku ke Siswa
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 font-medium">
                      Atur apakah siswa setelah selesai ujian hanya melihat halaman hasil nilai, atau dapat melihat naskah soal + jawaban + penjelasan.
                    </p>
                  </div>
                </div>

                <div className="shrink-0 flex items-center space-x-2">
                  <span className="text-xs font-bold text-slate-500">Status Saat Ini:</span>
                  <span className={`px-3 py-1 rounded-xl text-xs font-black shadow-xs ${
                    !showQuestionsReview
                      ? 'bg-amber-100 text-amber-900 border border-amber-300'
                      : 'bg-emerald-100 text-emerald-900 border border-emerald-300'
                  }`}>
                    {!showQuestionsReview ? '🔒 HANYA HALAMAN HASIL' : '📖 PEMBAHASAN LENGKAP'}
                  </span>
                </div>
              </div>

              {resultSettingMsg && (
                <div className="p-3 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold flex items-center space-x-2 animate-fadeIn">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>{resultSettingMsg}</span>
                </div>
              )}

              {/* 2 Options Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Opsi 1: Hanya Halaman Hasil (Terkunci) */}
                <div
                  onClick={() => !isUpdatingResultSetting && handleSetShowQuestionsReview(false)}
                  className={`p-4.5 rounded-2xl border-2 transition-all cursor-pointer relative flex flex-col justify-between ${
                    !showQuestionsReview
                      ? 'border-amber-500 ring-4 ring-amber-500/10 bg-amber-50/30'
                      : 'border-slate-200 bg-slate-50/50 hover:border-slate-300 hover:bg-white'
                  }`}
                >
                  <div className="space-y-2.5">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <div className={`w-8 h-8 rounded-xl flex items-center justify-center font-bold text-xs ${
                          !showQuestionsReview ? 'bg-amber-600 text-white' : 'bg-slate-200 text-slate-700'
                        }`}>
                          <Lock className="w-4 h-4" />
                        </div>
                        <h4 className="text-sm font-black text-slate-900 font-heading">
                          Hanya Halaman Hasil (Disarankan)
                        </h4>
                      </div>
                      {!showQuestionsReview && (
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-amber-600 text-white flex items-center space-x-1 shadow-xs">
                          <Check className="w-3 h-3" />
                          <span>AKTIF</span>
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-600 leading-relaxed font-medium">
                      Siswa <strong>hanya melihat skor, nilai akhir, persentase kelulusan, dan status</strong>. Naskah soal, rincian jawaban siswa, kunci jawaban, dan penjelasan <strong>TIDAK BISA LAGI DILIHAT</strong> untuk menjaga kerahasiaan evaluasi ujian.
                    </p>
                  </div>

                  <div className="pt-3 mt-2 border-t border-slate-200/60">
                    <button
                      type="button"
                      disabled={!showQuestionsReview || isUpdatingResultSetting}
                      onClick={(e) => {
                        e.stopPropagation();
                        handleSetShowQuestionsReview(false);
                      }}
                      className={`w-full py-2 px-3 rounded-xl text-xs font-black transition-all ${
                        !showQuestionsReview
                          ? 'bg-amber-100 text-amber-900 cursor-default'
                          : 'btn-3d-amber text-slate-950 cursor-pointer'
                      }`}
                    >
                      {!showQuestionsReview ? '✓ Opsi Ini Sedang Digunakan' : 'Gunakan: Hanya Halaman Hasil'}
                    </button>
                  </div>
                </div>

                {/* Opsi 2: Tampilkan Soal + Jawaban + Penjelasan */}
                <div
                  onClick={() => !isUpdatingResultSetting && handleSetShowQuestionsReview(true)}
                  className={`p-4.5 rounded-2xl border-2 transition-all cursor-pointer relative flex flex-col justify-between ${
                    showQuestionsReview
                      ? 'border-emerald-500 ring-4 ring-emerald-500/10 bg-emerald-50/30'
                      : 'border-slate-200 bg-slate-50/50 hover:border-slate-300 hover:bg-white'
                  }`}
                >
                  <div className="space-y-2.5">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <div className={`w-8 h-8 rounded-xl flex items-center justify-center font-bold text-xs ${
                          showQuestionsReview ? 'bg-emerald-600 text-white' : 'bg-slate-200 text-slate-700'
                        }`}>
                          <BookOpen className="w-4 h-4" />
                        </div>
                        <h4 className="text-sm font-black text-slate-900 font-heading">
                          Tampilkan Soal + Jawaban + Penjelasan
                        </h4>
                      </div>
                      {showQuestionsReview && (
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-emerald-600 text-white flex items-center space-x-1 shadow-xs">
                          <Check className="w-3 h-3" />
                          <span>AKTIF</span>
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-600 leading-relaxed font-medium">
                      Siswa <strong>dapat meninjau seluruh naskah soal</strong>, melihat jawaban yang mereka pilih, melihat kunci jawaban yang benar, serta membaca penjelasan/pembahasan setiap butir soal setelah menyelesaikan ujian.
                    </p>
                  </div>

                  <div className="pt-3 mt-2 border-t border-slate-200/60">
                    <button
                      type="button"
                      disabled={showQuestionsReview || isUpdatingResultSetting}
                      onClick={(e) => {
                        e.stopPropagation();
                        handleSetShowQuestionsReview(true);
                      }}
                      className={`w-full py-2 px-3 rounded-xl text-xs font-black transition-all ${
                        showQuestionsReview
                          ? 'bg-emerald-100 text-emerald-900 cursor-default'
                          : 'btn-3d-emerald text-white cursor-pointer'
                      }`}
                    >
                      {showQuestionsReview ? '✓ Opsi Ini Sedang Digunakan' : 'Gunakan: Tampilkan Pembahasan'}
                    </button>
                  </div>
                </div>
              </div>
            </div>

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
                  {/* PENGATURAN JENIS DAFTAR SOAL DALAM PAKET INI (1 ATAU LEBIH) */}
                  <div className="p-4 bg-gradient-to-r from-indigo-50/90 via-purple-50/80 to-sky-50/90 border-2 border-indigo-200 rounded-3xl space-y-3 shadow-2xs">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center space-x-2">
                        <div className="w-7 h-7 rounded-xl bg-indigo-600 text-white flex items-center justify-center shadow-xs">
                          <Sliders className="w-4 h-4" />
                        </div>
                        <div>
                          <span className="text-xs font-black text-indigo-950 uppercase tracking-wider font-heading block">
                            Pengaturan Jenis Soal dalam Paket Ujian
                          </span>
                          <span className="text-[11px] text-slate-500 font-semibold">
                            Pilih 1 atau lebih jenis soal yang diizinkan dalam paket ini:
                          </span>
                        </div>
                      </div>
                      <span className="text-xs font-extrabold text-indigo-700 bg-white px-3 py-1 rounded-xl border border-indigo-200 shadow-2xs">
                        {allowedTypes.length} Jenis Aktif
                      </span>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2 pt-1">
                      {QUESTION_TYPES.map((tInfo) => {
                        const isChecked = allowedTypes.includes(tInfo.type);
                        return (
                          <button
                            key={tInfo.type}
                            type="button"
                            onClick={() => {
                              if (isChecked) {
                                if (allowedTypes.length <= 1) {
                                  alert('Paket ujian harus memiliki minimal 1 jenis soal.');
                                  return;
                                }
                                setAllowedTypes(allowedTypes.filter((t) => t !== tInfo.type));
                              } else {
                                setAllowedTypes([...allowedTypes, tInfo.type]);
                              }
                            }}
                            className={`p-3 rounded-2xl border-2 text-left flex flex-col justify-between transition-all cursor-pointer ${
                              isChecked
                                ? 'bg-indigo-600 text-white border-indigo-700 shadow-md ring-2 ring-indigo-400/40 translate-y-[-1px]'
                                : 'bg-white text-slate-700 border-slate-200 hover:border-indigo-300'
                            }`}
                          >
                            <div className="flex items-center justify-between mb-1.5">
                              <span
                                className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-lg ${
                                  isChecked ? 'bg-indigo-700/90 text-white' : 'bg-slate-100 text-slate-600'
                                }`}
                              >
                                {tInfo.badge}
                              </span>
                              <span className="text-xs font-black">{isChecked ? '✓' : '+'}</span>
                            </div>
                            <div>
                              <span className="text-xs font-black block leading-tight">{tInfo.label}</span>
                              <span
                                className={`text-[10px] line-clamp-1 mt-0.5 ${
                                  isChecked ? 'text-indigo-100' : 'text-slate-400'
                                }`}
                              >
                                {tInfo.description}
                              </span>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* TEMPLATE UNDUH & UNGGAH BERDASARKAN JENIS SOAL */}
                  <div className="p-4 bg-slate-50 border-2 border-slate-200 rounded-3xl space-y-3">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div>
                        <div className="flex items-center space-x-2">
                          <Download className="w-4 h-4 text-indigo-600" />
                          <h5 className="text-xs font-black text-slate-800 uppercase tracking-wider font-heading">
                            Template & Unggah Soal Excel (.xlsx)
                          </h5>
                        </div>
                        <p className="text-[11px] text-slate-500 font-medium mt-0.5">
                          Unduh format template khusus untuk masing-masing jenis soal atau paket lengkap, lalu unggah untuk impor otomatis.
                        </p>
                      </div>

                      <label className="px-4 py-2.5 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-black flex items-center space-x-2 transition-all cursor-pointer shadow-xs border-b-2 border-indigo-800 shrink-0 self-start sm:self-auto">
                        <Upload className="w-3.5 h-3.5" />
                        <span>Unggah File Soal (.xlsx)</span>
                        <input
                          type="file"
                          accept=".xlsx, .xls, .csv"
                          onChange={handleUploadQuestionsExcel}
                          className="hidden"
                        />
                      </label>
                    </div>

                    {/* Tombol Unduh Masing-Masing Jenis Template */}
                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 pt-1">
                      <button
                        type="button"
                        onClick={() => downloadQuestionTemplate('multiple_choice')}
                        className="p-2.5 rounded-2xl bg-white hover:bg-blue-50 border-2 border-blue-200 text-blue-900 text-[11px] font-bold flex flex-col items-center text-center transition-all shadow-2xs cursor-pointer group"
                        title="Unduh templat Excel khusus Pilihan Ganda"
                      >
                        <span className="text-lg mb-1 group-hover:scale-110 transition-transform">📄</span>
                        <span className="font-black leading-tight">Pilihan Ganda</span>
                        <span className="text-[9px] text-slate-400 mt-0.5">Template (.xlsx)</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => downloadQuestionTemplate('true_false')}
                        className="p-2.5 rounded-2xl bg-white hover:bg-purple-50 border-2 border-purple-200 text-purple-900 text-[11px] font-bold flex flex-col items-center text-center transition-all shadow-2xs cursor-pointer group"
                        title="Unduh templat Excel khusus Benar / Salah"
                      >
                        <span className="text-lg mb-1 group-hover:scale-110 transition-transform">⚖️</span>
                        <span className="font-black leading-tight">Benar / Salah</span>
                        <span className="text-[9px] text-slate-400 mt-0.5">Template (.xlsx)</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => downloadQuestionTemplate('matching')}
                        className="p-2.5 rounded-2xl bg-white hover:bg-emerald-50 border-2 border-emerald-200 text-emerald-900 text-[11px] font-bold flex flex-col items-center text-center transition-all shadow-2xs cursor-pointer group"
                        title="Unduh templat Excel khusus Menjodohkan"
                      >
                        <span className="text-lg mb-1 group-hover:scale-110 transition-transform">🔗</span>
                        <span className="font-black leading-tight">Menjodohkan</span>
                        <span className="text-[9px] text-slate-400 mt-0.5">Template (.xlsx)</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => downloadQuestionTemplate('short_answer')}
                        className="p-2.5 rounded-2xl bg-white hover:bg-amber-50 border-2 border-amber-200 text-amber-900 text-[11px] font-bold flex flex-col items-center text-center transition-all shadow-2xs cursor-pointer group"
                        title="Unduh templat Excel khusus Isian Singkat"
                      >
                        <span className="text-lg mb-1 group-hover:scale-110 transition-transform">✏️</span>
                        <span className="font-black leading-tight">Isian Singkat</span>
                        <span className="text-[9px] text-slate-400 mt-0.5">Template (.xlsx)</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => downloadQuestionTemplate('image_question')}
                        className="p-2.5 rounded-2xl bg-white hover:bg-pink-50 border-2 border-pink-200 text-pink-900 text-[11px] font-bold flex flex-col items-center text-center transition-all shadow-2xs cursor-pointer group"
                        title="Unduh templat Excel khusus Soal Bergambar"
                      >
                        <span className="text-lg mb-1 group-hover:scale-110 transition-transform">🖼️</span>
                        <span className="font-black leading-tight">Soal Bergambar</span>
                        <span className="text-[9px] text-slate-400 mt-0.5">Template (.xlsx)</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => downloadQuestionTemplate('all')}
                        className="p-2.5 rounded-2xl bg-gradient-to-tr from-indigo-50 to-indigo-100 hover:from-indigo-100 hover:to-indigo-200 border-2 border-indigo-300 text-indigo-950 text-[11px] font-black flex flex-col items-center text-center transition-all shadow-2xs cursor-pointer group"
                        title="Unduh templat Excel Paket Lengkap Semua Jenis Soal"
                      >
                        <span className="text-lg mb-1 group-hover:scale-110 transition-transform">📦</span>
                        <span className="font-black leading-tight">Paket Lengkap</span>
                        <span className="text-[9px] text-indigo-600 mt-0.5">Semua Jenis (.xlsx)</span>
                      </button>
                    </div>
                  </div>

                  {/* Header Daftar Soal & Tombol Tambah Soal Sesuai Jenis */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-2">
                    <h4 className="text-xs font-black text-slate-700 uppercase tracking-wider font-heading">
                      Daftar Butir Soal Ujian ({questions.length})
                    </h4>

                    {/* Quick Add Buttons for Allowed Question Types */}
                    <div className="flex flex-wrap items-center gap-1.5">
                      {allowedTypes.includes('multiple_choice') && (
                        <button
                          type="button"
                          onClick={() => handleAddQuestion('multiple_choice')}
                          className="px-2.5 py-1.5 rounded-xl bg-blue-50 hover:bg-blue-100 text-blue-800 text-[11px] font-black border border-blue-200 flex items-center space-x-1 cursor-pointer transition-colors"
                          title="Tambah Soal Pilihan Ganda"
                        >
                          <Plus className="w-3 h-3" />
                          <span>+ Pilihan Ganda</span>
                        </button>
                      )}
                      {allowedTypes.includes('true_false') && (
                        <button
                          type="button"
                          onClick={() => handleAddQuestion('true_false')}
                          className="px-2.5 py-1.5 rounded-xl bg-purple-50 hover:bg-purple-100 text-purple-800 text-[11px] font-black border border-purple-200 flex items-center space-x-1 cursor-pointer transition-colors"
                          title="Tambah Soal Benar / Salah"
                        >
                          <Plus className="w-3 h-3" />
                          <span>+ Benar/Salah</span>
                        </button>
                      )}
                      {allowedTypes.includes('matching') && (
                        <button
                          type="button"
                          onClick={() => handleAddQuestion('matching')}
                          className="px-2.5 py-1.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-800 text-[11px] font-black border border-emerald-200 flex items-center space-x-1 cursor-pointer transition-colors"
                          title="Tambah Soal Menjodohkan"
                        >
                          <Plus className="w-3 h-3" />
                          <span>+ Menjodohkan</span>
                        </button>
                      )}
                      {allowedTypes.includes('short_answer') && (
                        <button
                          type="button"
                          onClick={() => handleAddQuestion('short_answer')}
                          className="px-2.5 py-1.5 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-900 text-[11px] font-black border border-amber-200 flex items-center space-x-1 cursor-pointer transition-colors"
                          title="Tambah Soal Isian Singkat"
                        >
                          <Plus className="w-3 h-3" />
                          <span>+ Isian Singkat</span>
                        </button>
                      )}
                      {allowedTypes.includes('image_question') && (
                        <button
                          type="button"
                          onClick={() => handleAddQuestion('image_question')}
                          className="px-2.5 py-1.5 rounded-xl bg-pink-50 hover:bg-pink-100 text-pink-800 text-[11px] font-black border border-pink-200 flex items-center space-x-1 cursor-pointer transition-colors"
                          title="Tambah Soal Bergambar"
                        >
                          <Plus className="w-3 h-3" />
                          <span>+ Bergambar</span>
                        </button>
                      )}
                    </div>
                  </div>

                  {/* List of Question Items with Custom Editors */}
                  <div className="space-y-4 max-h-[550px] overflow-y-auto pr-1">
                    {questions.map((q, qIdx) => {
                      const qType = q.type || 'multiple_choice';

                      return (
                        <div
                          key={q.id || qIdx}
                          className="p-4 bg-slate-50 rounded-3xl border-2 border-slate-200/90 space-y-3.5 relative shadow-xs"
                        >
                          {/* Item Header */}
                          <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-slate-200/70">
                            <div className="flex items-center space-x-2">
                              <span className="text-xs font-black text-indigo-700 bg-indigo-100 px-3 py-1 rounded-xl">
                                Soal No. {qIdx + 1}
                              </span>

                              {/* Question Type Switcher */}
                              <select
                                value={qType}
                                onChange={(e) =>
                                  handleQuestionTypeChange(qIdx, e.target.value as QuestionType)
                                }
                                className="px-2.5 py-1 rounded-xl bg-white border border-slate-300 text-xs font-extrabold text-slate-800 focus:outline-none focus:border-indigo-500 shadow-2xs"
                              >
                                {allowedTypes.map((t) => (
                                  <option key={t} value={t}>
                                    {t === 'multiple_choice'
                                      ? 'Pilihan Ganda'
                                      : t === 'true_false'
                                      ? 'Benar / Salah'
                                      : t === 'matching'
                                      ? 'Menjodohkan'
                                      : t === 'short_answer'
                                      ? 'Isian Singkat'
                                      : 'Soal Bergambar'}
                                  </option>
                                ))}
                              </select>
                            </div>

                            <div className="flex items-center space-x-2">
                              <label className="text-[11px] font-bold text-slate-600">Poin:</label>
                              <input
                                type="number"
                                min={1}
                                value={q.points || 20}
                                onChange={(e) =>
                                  handleQuestionChange(qIdx, 'points', Number(e.target.value))
                                }
                                className="w-16 px-2 py-1 bg-white border border-slate-300 rounded-xl text-xs font-black text-center"
                              />
                              {questions.length > 1 && (
                                <button
                                  type="button"
                                  onClick={() => handleRemoveQuestion(qIdx)}
                                  className="p-1.5 text-slate-400 hover:text-rose-600 transition-colors"
                                  title="Hapus soal ini"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              )}
                            </div>
                          </div>

                          {/* Image Field for image_question */}
                          {qType === 'image_question' && (
                            <div className="p-3 bg-pink-50/70 border border-pink-200 rounded-2xl space-y-2">
                              <label className="block text-[11px] font-black text-pink-900 uppercase">
                                URL Gambar Soal:
                              </label>
                              <div className="flex items-center space-x-2">
                                <input
                                  type="url"
                                  value={isQuestionTypeKeyword(q.imageUrl || '') ? '' : (q.imageUrl || '')}
                                  onChange={(e) =>
                                    handleQuestionChange(qIdx, 'imageUrl', e.target.value)
                                  }
                                  placeholder="https://contoh.com/gambar-soal.png"
                                  className="flex-1 p-2 bg-white border border-pink-200 rounded-xl text-xs font-semibold focus:outline-none"
                                />
                                {q.imageUrl && !isQuestionTypeKeyword(q.imageUrl) && (
                                  <img
                                    src={q.imageUrl}
                                    alt="Preview"
                                    className="w-10 h-10 object-cover rounded-lg border border-pink-300 shrink-0"
                                    onError={(e) => {
                                      (e.currentTarget as HTMLImageElement).src =
                                        'https://images.unsplash.com/photo-1509228468518-180dd4864904?w=500&auto=format&fit=crop&q=60';
                                    }}
                                  />
                                )}
                              </div>
                              <div className="flex items-center space-x-1.5 text-[10px]">
                                <span className="font-bold text-pink-800">Contoh Cepat:</span>
                                <button
                                  type="button"
                                  onClick={() =>
                                    handleQuestionChange(
                                      qIdx,
                                      'imageUrl',
                                      'https://images.unsplash.com/photo-1509228468518-180dd4864904?w=500&auto=format&fit=crop&q=60'
                                    )
                                  }
                                  className="text-pink-700 hover:underline"
                                >
                                  [Bangun Datar]
                                </button>
                                <button
                                  type="button"
                                  onClick={() =>
                                    handleQuestionChange(
                                      qIdx,
                                      'imageUrl',
                                      'https://images.unsplash.com/photo-1532094349884-543bc11b234d?w=500&auto=format&fit=crop&q=60'
                                    )
                                  }
                                  className="text-pink-700 hover:underline"
                                >
                                  [Laboratorium]
                                </button>
                              </div>
                            </div>
                          )}

                          {/* Question Text Input */}
                          <div>
                            <label className="block text-[11px] font-extrabold text-slate-700 mb-1">
                              {qType === 'true_false' ? 'Pernyataan Soal:' : 'Pertanyaan / Teks Soal:'}
                            </label>
                            <textarea
                              rows={2}
                              value={q.question}
                              onChange={(e) => handleQuestionChange(qIdx, 'question', e.target.value)}
                              placeholder={
                                qType === 'true_false'
                                  ? 'Tulis pernyataan di sini (misal: Air mendidih pada suhu 100°C)...'
                                  : qType === 'matching'
                                  ? 'Tulis instruksi menjodohkan di sini...'
                                  : 'Tulis pertanyaan soal di sini...'
                              }
                              className="w-full p-2.5 bg-white border border-slate-300 rounded-xl text-xs font-bold focus:outline-none focus:border-indigo-500"
                            />
                          </div>

                          {/* 1. Multiple Choice & 5. Image Question Options */}
                          {(qType === 'multiple_choice' || qType === 'image_question') && (
                            <div className="space-y-1.5">
                              <span className="text-[11px] font-bold text-slate-600 block">
                                Pilihan Jawaban (Klik huruf A/B/C/D untuk menentukan kunci jawaban yang benar):
                              </span>
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                {(q.options || ['', '', '', '']).map((optVal, oIdx) => {
                                  const optionLabel = String.fromCharCode(65 + oIdx);
                                  const isCorrect = q.correctAnswer === oIdx;

                                  return (
                                    <div
                                      key={oIdx}
                                      className={`flex items-center space-x-2 p-2 rounded-xl border ${
                                        isCorrect
                                          ? 'bg-emerald-50 border-emerald-400'
                                          : 'bg-white border-slate-200'
                                      }`}
                                    >
                                      <button
                                        type="button"
                                        onClick={() =>
                                          handleQuestionChange(qIdx, 'correctAnswer', oIdx)
                                        }
                                        className={`w-6 h-6 rounded-lg text-xs font-black shrink-0 flex items-center justify-center transition-all ${
                                          isCorrect
                                            ? 'bg-emerald-600 text-white shadow-xs'
                                            : 'bg-slate-200 text-slate-600 hover:bg-slate-300'
                                        }`}
                                        title="Klik untuk jadikan kunci jawaban"
                                      >
                                        {optionLabel}
                                      </button>

                                      <input
                                        type="text"
                                        value={optVal}
                                        onChange={(e) =>
                                          handleOptionChange(qIdx, oIdx, e.target.value)
                                        }
                                        placeholder={`Pilihan ${optionLabel}`}
                                        className="w-full bg-transparent text-xs font-bold focus:outline-none"
                                      />
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          )}

                          {/* 2. True / False Key Selector */}
                          {qType === 'true_false' && (
                            <div className="p-3 bg-purple-50/70 border border-purple-200 rounded-2xl space-y-2">
                              <span className="text-[11px] font-black text-purple-950 uppercase tracking-wide block">
                                Kunci Jawaban Benar / Salah:
                              </span>
                              <div className="grid grid-cols-2 gap-2">
                                <button
                                  type="button"
                                  onClick={() => handleQuestionChange(qIdx, 'correctBool', true)}
                                  className={`py-2 px-3 rounded-xl border-2 text-xs font-black flex items-center justify-center space-x-1.5 transition-all cursor-pointer ${
                                    q.correctBool === true || q.correctBool === undefined
                                      ? 'bg-emerald-600 text-white border-emerald-700 shadow-xs'
                                      : 'bg-white text-slate-600 border-slate-300 hover:bg-slate-50'
                                  }`}
                                >
                                  <Check className="w-4 h-4" />
                                  <span>Kunci: BENAR</span>
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleQuestionChange(qIdx, 'correctBool', false)}
                                  className={`py-2 px-3 rounded-xl border-2 text-xs font-black flex items-center justify-center space-x-1.5 transition-all cursor-pointer ${
                                    q.correctBool === false
                                      ? 'bg-rose-600 text-white border-rose-700 shadow-xs'
                                      : 'bg-white text-slate-600 border-slate-300 hover:bg-slate-50'
                                  }`}
                                >
                                  <X className="w-4 h-4" />
                                  <span>Kunci: SALAH</span>
                                </button>
                              </div>
                            </div>
                          )}

                          {/* 3. Matching Pairs Editor */}
                          {qType === 'matching' && (
                            <div className="p-3 bg-emerald-50/70 border border-emerald-200 rounded-2xl space-y-2.5">
                              <div className="flex items-center justify-between">
                                <span className="text-[11px] font-black text-emerald-950 uppercase tracking-wide">
                                  Daftar Pasangan Menjodohkan (Premis Kiri ➜ Kunci Kanan):
                                </span>
                                <button
                                  type="button"
                                  onClick={() => handleAddMatchingPair(qIdx)}
                                  className="px-2 py-1 rounded-lg bg-emerald-600 text-white text-[10px] font-black hover:bg-emerald-700 cursor-pointer"
                                >
                                  + Tambah Pasangan
                                </button>
                              </div>

                              <div className="space-y-2">
                                {(q.matchingPairs || []).map((pair, pIdx) => (
                                  <div
                                    key={pair.id || pIdx}
                                    className="flex items-center space-x-2 bg-white p-2 rounded-xl border border-emerald-200"
                                  >
                                    <span className="w-5 h-5 rounded-md bg-emerald-100 text-emerald-800 text-[10px] font-black flex items-center justify-center shrink-0">
                                      {pIdx + 1}
                                    </span>
                                    <input
                                      type="text"
                                      value={pair.premise}
                                      onChange={(e) =>
                                        handleMatchingPairChange(
                                          qIdx,
                                          pIdx,
                                          'premise',
                                          e.target.value
                                        )
                                      }
                                      placeholder="Premis Kiri (e.g., Indonesia)"
                                      className="flex-1 bg-transparent text-xs font-bold focus:outline-none"
                                    />
                                    <span className="text-slate-400 font-bold">➜</span>
                                    <input
                                      type="text"
                                      value={pair.match}
                                      onChange={(e) =>
                                        handleMatchingPairChange(
                                          qIdx,
                                          pIdx,
                                          'match',
                                          e.target.value
                                        )
                                      }
                                      placeholder="Kunci Kanan (e.g., Nusantara)"
                                      className="flex-1 bg-transparent text-xs font-black text-emerald-800 focus:outline-none"
                                    />
                                    {(q.matchingPairs?.length || 0) > 2 && (
                                      <button
                                        type="button"
                                        onClick={() => handleRemoveMatchingPair(qIdx, pIdx)}
                                        className="text-slate-400 hover:text-rose-600 p-1"
                                      >
                                        <X className="w-3.5 h-3.5" />
                                      </button>
                                    )}
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* 4. Short Answer Key Editor */}
                          {qType === 'short_answer' && (
                            <div className="p-3 bg-amber-50/70 border border-amber-200 rounded-2xl space-y-1.5">
                              <label className="block text-[11px] font-black text-amber-950 uppercase">
                                Kunci Jawaban Singkat (Teks / Angka):
                              </label>
                              <input
                                type="text"
                                value={q.correctText || ''}
                                onChange={(e) =>
                                  handleQuestionChange(qIdx, 'correctText', e.target.value)
                                }
                                placeholder="e.g. H2O (Gunakan koma untuk alternatif: H2O, Air)"
                                className="w-full p-2.5 bg-white border border-amber-300 rounded-xl text-xs font-extrabold text-amber-950 focus:outline-none"
                              />
                              <p className="text-[10px] text-amber-700 font-medium">
                                *Sistem otomatis mencocokkan tanpa membedakan huruf besar/kecil. Pisahkan dengan koma jika ada beberapa jawaban yang dapat diterima.
                              </p>
                            </div>
                          )}

                          {/* Explanation Field */}
                          <div>
                            <input
                              type="text"
                              value={q.explanation || ''}
                              onChange={(e) =>
                                handleQuestionChange(qIdx, 'explanation', e.target.value)
                              }
                              placeholder="Pembahasan / Penjelasan jawaban (opsional)..."
                              className="w-full p-2 bg-white/70 border border-slate-200 rounded-xl text-[11px] text-slate-600 font-medium focus:outline-none focus:border-indigo-400"
                            />
                          </div>
                        </div>
                      );
                    })}
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
                            {ex.allowedQuestionTypes && ex.allowedQuestionTypes.length > 0 && (
                              <div className="flex flex-wrap gap-1 mt-1.5">
                                {ex.allowedQuestionTypes.map((t) => (
                                  <span
                                    key={t}
                                    className="px-1.5 py-0.5 rounded-md text-[9px] font-black bg-indigo-50 text-indigo-700 border border-indigo-100"
                                  >
                                    {t === 'multiple_choice'
                                      ? 'PG'
                                      : t === 'true_false'
                                      ? 'B/S'
                                      : t === 'matching'
                                      ? 'Jodohkan'
                                      : t === 'short_answer'
                                      ? 'Isian'
                                      : 'Bergambar'}
                                  </span>
                                ))}
                              </div>
                            )}
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
          </div>
        )}

        {/* TAB 3: PENGATURAN SISTEM PESERTA UJIAN */}
        {activeTab === 'participants' && (
          <div className="space-y-6">
            {/* Header & Status Notice */}
            <div className="card-3d p-5 md:p-6 bg-white border-2 border-slate-200">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="space-y-1">
                  <div className="flex items-center space-x-2">
                    <span className="p-2 rounded-xl bg-emerald-100 text-emerald-800">
                      <UserCheck className="w-5 h-5" />
                    </span>
                    <h2 className="text-lg md:text-xl font-black text-slate-900 font-heading">
                      Pengaturan Sistem Peserta Ujian
                    </h2>
                  </div>
                  <p className="text-xs text-slate-500 font-medium">
                    Atur sistem validasi masuk peserta (Umum vs Terdaftar) dan kelola basis data siswa yang berhak mengikuti ujian.
                  </p>
                </div>

                <div className="flex items-center space-x-2">
                  <span className="text-xs font-bold text-slate-600">Mode Sistem Saat Ini:</span>
                  <span className={`px-3 py-1 rounded-xl text-xs font-black shadow-xs ${
                    participantMode === 'terdaftar'
                      ? 'bg-amber-100 text-amber-900 border border-amber-300'
                      : 'bg-indigo-100 text-indigo-900 border border-indigo-300'
                  }`}>
                    {participantMode === 'terdaftar' ? '🛡️ SISTEM PESERTA TERDAFTAR' : '🌐 SISTEM PESERTA UMUM'}
                  </span>
                </div>
              </div>

              {modeSaveMsg && (
                <div className="mt-4 p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold flex items-center space-x-2 animate-fadeIn">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>{modeSaveMsg}</span>
                </div>
              )}
            </div>

            {/* Selection of 2 Systems: Peserta Umum vs Peserta Terdaftar */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {/* Card 1: Sistem Peserta Umum */}
              <div className={`card-3d p-5 md:p-6 rounded-3xl transition-all border-2 relative flex flex-col justify-between ${
                participantMode === 'umum'
                  ? 'border-indigo-500 ring-4 ring-indigo-500/10 bg-indigo-50/20'
                  : 'border-slate-200 bg-white hover:border-slate-300'
              }`}>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="w-12 h-12 rounded-2xl bg-indigo-100 text-indigo-700 flex items-center justify-center shadow-xs">
                      <Users className="w-6 h-6" />
                    </div>
                    {participantMode === 'umum' ? (
                      <span className="px-3 py-1 rounded-full text-[11px] font-black bg-indigo-600 text-white shadow-xs flex items-center space-x-1">
                        <Check className="w-3.5 h-3.5" />
                        <span>SEDANG AKTIF</span>
                      </span>
                    ) : (
                      <span className="px-3 py-1 rounded-full text-[11px] font-bold bg-slate-100 text-slate-500">
                        Tidak Aktif
                      </span>
                    )}
                  </div>

                  <div>
                    <h3 className="text-base font-black text-slate-900 font-heading">
                      1. Sistem Peserta Umum (Terbuka)
                    </h3>
                    <p className="text-xs text-slate-500 font-medium mt-1 leading-relaxed">
                      Siswa bebas mengisi <strong>Nama Lengkap</strong>, memilih <strong>Asal Sekolah</strong>, dan <strong>Kelas</strong> secara mandiri langsung di halaman masuk tanpa perlu didaftarkan terlebih dahulu oleh guru.
                    </p>
                  </div>

                  <div className="p-3 bg-slate-50 rounded-2xl text-[11px] text-slate-600 space-y-1.5 border border-slate-100">
                    <p className="font-extrabold text-slate-800">Karakteristik Mode Umum:</p>
                    <ul className="list-disc list-inside space-y-1 text-slate-600">
                      <li>Siswa langsung mengisi data diri dan lanjut ke token ujian.</li>
                      <li>Tidak ada pengecekan nama di database sebelum mengerjakan.</li>
                      <li>Cocok untuk simulasi terbuka, latihan mandiri, atau try out akbar.</li>
                    </ul>
                  </div>
                </div>

                <div className="pt-4 mt-2">
                  <button
                    type="button"
                    disabled={participantMode === 'umum' || isUpdatingMode}
                    onClick={() => handleSetParticipantMode('umum')}
                    className={`w-full py-3 px-4 rounded-2xl font-black text-xs transition-all flex items-center justify-center space-x-2 cursor-pointer ${
                      participantMode === 'umum'
                        ? 'bg-indigo-100 text-indigo-700 font-black cursor-default'
                        : 'btn-3d-indigo text-white hover:opacity-95'
                    }`}
                  >
                    {participantMode === 'umum' ? (
                      <>
                        <Check className="w-4 h-4" />
                        <span>Mode Umum Sedang Digunakan</span>
                      </>
                    ) : (
                      <span>Gunakan Sistem Peserta Umum</span>
                    )}
                  </button>
                </div>
              </div>

              {/* Card 2: Sistem Peserta Terdaftar */}
              <div className={`card-3d p-5 md:p-6 rounded-3xl transition-all border-2 relative flex flex-col justify-between ${
                participantMode === 'terdaftar'
                  ? 'border-amber-500 ring-4 ring-amber-500/10 bg-amber-50/20'
                  : 'border-slate-200 bg-white hover:border-slate-300'
              }`}>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="w-12 h-12 rounded-2xl bg-amber-100 text-amber-800 flex items-center justify-center shadow-xs">
                      <UserCheck className="w-6 h-6" />
                    </div>
                    {participantMode === 'terdaftar' ? (
                      <span className="px-3 py-1 rounded-full text-[11px] font-black bg-amber-600 text-white shadow-xs flex items-center space-x-1">
                        <Check className="w-3.5 h-3.5" />
                        <span>SEDANG AKTIF</span>
                      </span>
                    ) : (
                      <span className="px-3 py-1 rounded-full text-[11px] font-bold bg-slate-100 text-slate-500">
                        Tidak Aktif
                      </span>
                    )}
                  </div>

                  <div>
                    <h3 className="text-base font-black text-slate-900 font-heading">
                      2. Sistem Peserta Terdaftar (Wajib Verifikasi)
                    </h3>
                    <p className="text-xs text-slate-500 font-medium mt-1 leading-relaxed">
                      Admin/Guru mengisi <strong>Nama Lengkap</strong>, <strong>Asal Sekolah</strong>, dan <strong>Kelas</strong> terlebih dahulu di sistem. Siswa hanya dapat lanjut ke token ujian jika data yang diinput cocok persis dengan data pendaftaran.
                    </p>
                  </div>

                  <div className="p-3 bg-amber-50/80 rounded-2xl text-[11px] text-amber-900 space-y-1.5 border border-amber-200/70">
                    <p className="font-extrabold text-amber-950">Karakteristik Mode Terdaftar:</p>
                    <ul className="list-disc list-inside space-y-1 text-amber-900">
                      <li>Siswa di halaman login diverifikasi ketat (Nama, Sekolah, dan Kelas).</li>
                      <li>Jika data tidak sesuai, siswa <strong>TIDAK BISA lanjut</strong> ke token ujian.</li>
                      <li>Sistem menampilkan peringatan: <em>"Data tidak sesuai!"</em></li>
                      <li>Mencegah siswa salah input nama atau mengerjakan ujian di luar daftar resmi.</li>
                    </ul>
                  </div>
                </div>

                <div className="pt-4 mt-2">
                  <button
                    type="button"
                    disabled={participantMode === 'terdaftar' || isUpdatingMode}
                    onClick={() => handleSetParticipantMode('terdaftar')}
                    className={`w-full py-3 px-4 rounded-2xl font-black text-xs transition-all flex items-center justify-center space-x-2 cursor-pointer ${
                      participantMode === 'terdaftar'
                        ? 'bg-amber-100 text-amber-900 font-black cursor-default'
                        : 'btn-3d-amber text-slate-950 hover:opacity-95'
                    }`}
                  >
                    {participantMode === 'terdaftar' ? (
                      <>
                        <Check className="w-4 h-4" />
                        <span>Mode Terdaftar Sedang Digunakan</span>
                      </>
                    ) : (
                      <span>Gunakan Sistem Peserta Terdaftar</span>
                    )}
                  </button>
                </div>
              </div>
            </div>

            {/* PENGATURAN SISTEM TAMBAHAN: VISIBILITAS HASIL UJIAN SISWA */}
            <div className="card-3d p-5 md:p-6 bg-white border-2 border-indigo-200/80 rounded-3xl space-y-4 shadow-xs">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
                <div className="flex items-center space-x-3">
                  <div className={`w-11 h-11 rounded-2xl flex items-center justify-center shadow-xs shrink-0 ${
                    !showQuestionsReview
                      ? 'bg-amber-100 text-amber-800 border border-amber-300'
                      : 'bg-indigo-100 text-indigo-700 border border-indigo-300'
                  }`}>
                    {!showQuestionsReview ? <Lock className="w-5 h-5 text-amber-700" /> : <Eye className="w-5 h-5 text-indigo-600" />}
                  </div>
                  <div>
                    <div className="flex items-center space-x-2">
                      <h3 className="text-base font-black text-slate-900 font-heading">
                        Opsi Sistem: Visibilitas Hasil Ujian Siswa
                      </h3>
                      <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-800">
                        Otomatis Sinkron ke Siswa
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 font-medium">
                      Atur apakah siswa ketika selesai ujian hanya melihat halaman hasil nilai, atau dapat melihat naskah soal + jawaban + penjelasan.
                    </p>
                  </div>
                </div>

                <div className="shrink-0 flex items-center space-x-2">
                  <span className="text-xs font-bold text-slate-500">Status Saat Ini:</span>
                  <span className={`px-3 py-1 rounded-xl text-xs font-black shadow-xs ${
                    !showQuestionsReview
                      ? 'bg-amber-100 text-amber-900 border border-amber-300'
                      : 'bg-emerald-100 text-emerald-900 border border-emerald-300'
                  }`}>
                    {!showQuestionsReview ? '🔒 HANYA HALAMAN HASIL' : '📖 PEMBAHASAN LENGKAP'}
                  </span>
                </div>
              </div>

              {resultSettingMsg && (
                <div className="p-3 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold flex items-center space-x-2 animate-fadeIn">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>{resultSettingMsg}</span>
                </div>
              )}

              {/* 2 Options Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Opsi 1: Hanya Halaman Hasil */}
                <div
                  onClick={() => !isUpdatingResultSetting && handleSetShowQuestionsReview(false)}
                  className={`p-4.5 rounded-2xl border-2 transition-all cursor-pointer relative flex flex-col justify-between ${
                    !showQuestionsReview
                      ? 'border-amber-500 ring-4 ring-amber-500/10 bg-amber-50/30'
                      : 'border-slate-200 bg-slate-50/50 hover:border-slate-300 hover:bg-white'
                  }`}
                >
                  <div className="space-y-2.5">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <div className={`w-8 h-8 rounded-xl flex items-center justify-center font-bold text-xs ${
                          !showQuestionsReview ? 'bg-amber-600 text-white' : 'bg-slate-200 text-slate-700'
                        }`}>
                          <Lock className="w-4 h-4" />
                        </div>
                        <h4 className="text-sm font-black text-slate-900 font-heading">
                          Hanya Halaman Hasil (Disarankan)
                        </h4>
                      </div>
                      {!showQuestionsReview && (
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-amber-600 text-white flex items-center space-x-1 shadow-xs">
                          <Check className="w-3 h-3" />
                          <span>AKTIF</span>
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-600 leading-relaxed font-medium">
                      Siswa <strong>hanya melihat skor, nilai akhir, persentase kelulusan, dan status</strong>. Naskah soal, rincian jawaban siswa, kunci jawaban, dan penjelasan <strong>TIDAK BISA LAGI DILIHAT</strong> untuk menjaga kerahasiaan evaluasi ujian.
                    </p>
                  </div>

                  <div className="pt-3 mt-2 border-t border-slate-200/60">
                    <button
                      type="button"
                      disabled={!showQuestionsReview || isUpdatingResultSetting}
                      onClick={(e) => {
                        e.stopPropagation();
                        handleSetShowQuestionsReview(false);
                      }}
                      className={`w-full py-2 px-3 rounded-xl text-xs font-black transition-all ${
                        !showQuestionsReview
                          ? 'bg-amber-100 text-amber-900 cursor-default'
                          : 'btn-3d-amber text-slate-950 cursor-pointer'
                      }`}
                    >
                      {!showQuestionsReview ? '✓ Opsi Ini Sedang Digunakan' : 'Gunakan: Hanya Halaman Hasil'}
                    </button>
                  </div>
                </div>

                {/* Opsi 2: Tampilkan Soal + Jawaban + Penjelasan */}
                <div
                  onClick={() => !isUpdatingResultSetting && handleSetShowQuestionsReview(true)}
                  className={`p-4.5 rounded-2xl border-2 transition-all cursor-pointer relative flex flex-col justify-between ${
                    showQuestionsReview
                      ? 'border-emerald-500 ring-4 ring-emerald-500/10 bg-emerald-50/30'
                      : 'border-slate-200 bg-slate-50/50 hover:border-slate-300 hover:bg-white'
                  }`}
                >
                  <div className="space-y-2.5">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <div className={`w-8 h-8 rounded-xl flex items-center justify-center font-bold text-xs ${
                          showQuestionsReview ? 'bg-emerald-600 text-white' : 'bg-slate-200 text-slate-700'
                        }`}>
                          <BookOpen className="w-4 h-4" />
                        </div>
                        <h4 className="text-sm font-black text-slate-900 font-heading">
                          Tampilkan Soal + Jawaban + Penjelasan
                        </h4>
                      </div>
                      {showQuestionsReview && (
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-emerald-600 text-white flex items-center space-x-1 shadow-xs">
                          <Check className="w-3 h-3" />
                          <span>AKTIF</span>
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-600 leading-relaxed font-medium">
                      Siswa <strong>dapat meninjau seluruh naskah soal</strong>, melihat jawaban yang mereka pilih, melihat kunci jawaban yang benar, serta membaca penjelasan/pembahasan setiap butir soal setelah menyelesaikan ujian.
                    </p>
                  </div>

                  <div className="pt-3 mt-2 border-t border-slate-200/60">
                    <button
                      type="button"
                      disabled={showQuestionsReview || isUpdatingResultSetting}
                      onClick={(e) => {
                        e.stopPropagation();
                        handleSetShowQuestionsReview(true);
                      }}
                      className={`w-full py-2 px-3 rounded-xl text-xs font-black transition-all ${
                        showQuestionsReview
                          ? 'bg-emerald-100 text-emerald-900 cursor-default'
                          : 'btn-3d-emerald text-white cursor-pointer'
                      }`}
                    >
                      {showQuestionsReview ? '✓ Opsi Ini Sedang Digunakan' : 'Gunakan: Tampilkan Pembahasan'}
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Quick Actions Panel: Template, Upload/Import, Export, Reset */}
            <div className="card-3d p-5 md:p-6 bg-white border-2 border-slate-200 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-slate-100 gap-2">
                <div>
                  <h3 className="text-base font-black text-slate-900 font-heading flex items-center space-x-2">
                    <FileSpreadsheet className="w-5 h-5 text-emerald-600" />
                    <span>Kelola & Integrasi Data Peserta (Excel/Spreadsheet)</span>
                  </h3>
                  <p className="text-xs text-slate-500 font-medium">
                    Unduh format template resmi, impor ratusan siswa sekaligus, atau ekspor data peserta terdaftar.
                  </p>
                </div>

                <span className="text-xs font-black px-3 py-1 rounded-xl bg-slate-100 text-slate-700">
                  Total Terdaftar: <strong>{registeredStudents.length} Siswa</strong>
                </span>
              </div>

              {/* Action Buttons Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                {/* 1. Download Template */}
                <button
                  type="button"
                  onClick={handleDownloadStudentTemplate}
                  className="py-3 px-4 rounded-2xl bg-emerald-50 hover:bg-emerald-100 text-emerald-900 border-2 border-emerald-300 font-black text-xs flex items-center justify-center space-x-2 transition-all cursor-pointer shadow-xs"
                >
                  <Download className="w-4 h-4 text-emerald-700" />
                  <span>Unduh Template Excel</span>
                </button>

                {/* 2. Upload / Import Excel */}
                <label className="py-3 px-4 rounded-2xl bg-indigo-50 hover:bg-indigo-100 text-indigo-900 border-2 border-indigo-300 font-black text-xs flex items-center justify-center space-x-2 transition-all cursor-pointer shadow-xs">
                  <Upload className="w-4 h-4 text-indigo-700" />
                  <span>{isImporting ? 'Mengimpor...' : 'Unggah Data Excel'}</span>
                  <input
                    type="file"
                    accept=".xlsx, .xls, .csv"
                    disabled={isImporting}
                    onChange={handleStudentFileUpload}
                    className="hidden"
                  />
                </label>

                {/* 3. Export Data */}
                <button
                  type="button"
                  onClick={handleExportRegisteredStudents}
                  disabled={registeredStudents.length === 0}
                  className="py-3 px-4 rounded-2xl bg-slate-50 hover:bg-slate-100 text-slate-800 border-2 border-slate-300 font-black text-xs flex items-center justify-center space-x-2 transition-all cursor-pointer shadow-xs disabled:opacity-50"
                >
                  <FileDown className="w-4 h-4 text-slate-600" />
                  <span>Ekspor Data (.xlsx)</span>
                </button>

                {/* 4. Delete / Reset All Registered Students */}
                <button
                  type="button"
                  onClick={() => setShowResetRegConfirm(true)}
                  disabled={registeredStudents.length === 0}
                  className="py-3 px-4 rounded-2xl bg-rose-50 hover:bg-rose-100 text-rose-800 border-2 border-rose-300 font-black text-xs flex items-center justify-center space-x-2 transition-all cursor-pointer shadow-xs disabled:opacity-50"
                >
                  <Trash2 className="w-4 h-4 text-rose-600" />
                  <span>Hapus Semua Peserta</span>
                </button>
              </div>

              {/* Import Feedback Summary */}
              {importSummary && (
                <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-950 text-xs space-y-1 animate-fadeIn">
                  <div className="flex items-center space-x-2 font-black text-emerald-900">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    <span>Laporan Hasil Impor File Excel:</span>
                  </div>
                  <p>
                    Total baris dibaca: <strong>{importSummary.total}</strong> | Berhasil ditambahkan: <strong className="text-emerald-700">{importSummary.added}</strong> | Dilewati (duplikat/nama kosong): <strong>{importSummary.skipped}</strong>
                  </p>
                </div>
              )}
            </div>

            {/* Manual Single Student Registration Form */}
            <div className="card-3d p-5 md:p-6 bg-white border-2 border-slate-200">
              <div className="pb-3 border-b border-slate-100 mb-4">
                <h3 className="text-base font-black text-slate-900 font-heading flex items-center space-x-2">
                  <UserPlus className="w-5 h-5 text-indigo-600" />
                  <span>Tambah Peserta Terdaftar Manual</span>
                </h3>
                <p className="text-xs text-slate-500 font-medium">
                  Daftarkan satu peserta secara manual berdasarkan daftar sekolah dan kelas resmi di sistem.
                </p>
              </div>

              {regFormError && (
                <div className="mb-4 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-bold flex items-center space-x-2">
                  <AlertCircle className="w-4 h-4 text-rose-500 shrink-0" />
                  <span>{regFormError}</span>
                </div>
              )}

              {regFormSuccess && (
                <div className="mb-4 p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold flex items-center space-x-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>{regFormSuccess}</span>
                </div>
              )}

              <form onSubmit={handleAddSingleStudent} className="grid grid-cols-1 md:grid-cols-4 gap-3 items-end">
                <div className="md:col-span-2 space-y-1">
                  <label className="block text-xs font-black text-slate-700 uppercase tracking-wider">
                    Nama Lengkap Peserta
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="CONTOH: AHMAD FAUZI"
                    value={newRegName}
                    onChange={(e) => setNewRegName(e.target.value.toUpperCase())}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border-2 border-slate-200 rounded-xl text-xs font-bold uppercase tracking-wide focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div className="space-y-1">
                  <label className="block text-xs font-black text-slate-700 uppercase tracking-wider">
                    Asal Sekolah
                  </label>
                  <select
                    value={newRegSchool}
                    onChange={(e) => setNewRegSchool(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border-2 border-slate-200 rounded-xl text-xs font-bold focus:outline-none focus:border-indigo-500 cursor-pointer"
                  >
                    {SCHOOL_LIST.map((sch) => (
                      <option key={sch} value={sch}>
                        {sch}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="block text-xs font-black text-slate-700 uppercase tracking-wider">
                    Kelas
                  </label>
                  <select
                    value={newRegGrade}
                    onChange={(e) => setNewRegGrade(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border-2 border-slate-200 rounded-xl text-xs font-bold focus:outline-none focus:border-indigo-500 cursor-pointer"
                  >
                    {GRADE_LIST.map((grd) => (
                      <option key={grd} value={grd}>
                        {grd}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="md:col-span-4 flex justify-end pt-1">
                  <button
                    type="submit"
                    disabled={isSavingReg}
                    className="py-2.5 px-6 btn-3d-indigo text-white text-xs font-black rounded-xl flex items-center space-x-2 transition-all cursor-pointer disabled:opacity-50"
                  >
                    {isSavingReg ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin" />
                        <span>Mendaftarkan...</span>
                      </>
                    ) : (
                      <>
                        <UserPlus className="w-4 h-4" />
                        <span>Daftarkan Peserta Ini</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>

            {/* Registered Students Data Table & Filters */}
            <div className="card-3d p-5 md:p-6 bg-white border-2 border-slate-200 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-slate-100 gap-2">
                <div>
                  <h3 className="text-base font-black text-slate-900 font-heading flex items-center space-x-2">
                    <Users className="w-5 h-5 text-indigo-600" />
                    <span>Daftar Peserta Terdaftar di Sistem</span>
                  </h3>
                  <p className="text-xs text-slate-500 font-medium">
                    Daftar siswa resmi yang diizinkan melanjutkan ke token ujian saat mode terdaftar aktif.
                  </p>
                </div>

                <span className="text-xs font-extrabold text-indigo-700 bg-indigo-50 px-3 py-1 rounded-xl border border-indigo-200">
                  Menampilkan {filteredRegisteredStudents.length} dari {registeredStudents.length} siswa
                </span>
              </div>

              {/* Filter and Search Bar */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {/* Search by Name */}
                <div className="relative">
                  <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Cari nama peserta..."
                    value={regSearchQuery}
                    onChange={(e) => setRegSearchQuery(e.target.value)}
                    className="w-full pl-10 pr-3.5 py-2.5 bg-slate-50 border-2 border-slate-200 rounded-xl text-xs font-bold focus:outline-none focus:border-indigo-500"
                  />
                  {regSearchQuery && (
                    <button
                      onClick={() => setRegSearchQuery('')}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                {/* Filter by School */}
                <div>
                  <select
                    value={regSchoolFilter}
                    onChange={(e) => setRegSchoolFilter(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border-2 border-slate-200 rounded-xl text-xs font-bold focus:outline-none focus:border-indigo-500 cursor-pointer"
                  >
                    <option value="ALL">Semua Sekolah ({SCHOOL_LIST.length})</option>
                    {SCHOOL_LIST.map((sch) => (
                      <option key={sch} value={sch}>
                        {sch}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Filter by Grade */}
                <div>
                  <select
                    value={regGradeFilter}
                    onChange={(e) => setRegGradeFilter(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border-2 border-slate-200 rounded-xl text-xs font-bold focus:outline-none focus:border-indigo-500 cursor-pointer"
                  >
                    <option value="ALL">Semua Kelas</option>
                    {GRADE_LIST.map((grd) => (
                      <option key={grd} value={grd}>
                        {grd}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Table */}
              {registeredStudents.length === 0 ? (
                <div className="text-center py-12 px-4 rounded-2xl bg-slate-50 border-2 border-dashed border-slate-200 space-y-2">
                  <div className="w-14 h-14 rounded-full bg-slate-200 text-slate-400 flex items-center justify-center mx-auto">
                    <Users className="w-7 h-7" />
                  </div>
                  <div>
                    <h4 className="text-sm font-black text-slate-700">Belum Ada Peserta Terdaftar</h4>
                    <p className="text-xs text-slate-500 max-w-md mx-auto mt-1">
                      Gunakan menu <strong>Kelola & Integrasi Data Peserta</strong> di atas untuk mengunduh template dan mengunggah Excel, atau gunakan formulir pendaftaran manual.
                    </p>
                  </div>
                </div>
              ) : filteredRegisteredStudents.length === 0 ? (
                <div className="text-center py-8 px-4 rounded-2xl bg-slate-50 border border-slate-200 text-xs text-slate-500">
                  Tidak ditemukan peserta yang sesuai dengan filter pencarian Anda.
                </div>
              ) : (
                <div className="overflow-x-auto rounded-2xl border-2 border-slate-200">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-slate-100/90 text-slate-700 text-[11px] font-black uppercase tracking-wider border-b border-slate-200">
                        <th className="py-3 px-3 text-center w-12">No</th>
                        <th className="py-3 px-4">Nama Lengkap Siswa</th>
                        <th className="py-3 px-4">Asal Sekolah</th>
                        <th className="py-3 px-3 text-center">Kelas</th>
                        <th className="py-3 px-3 text-center">Waktu Didaftarkan</th>
                        <th className="py-3 px-3 text-center w-20">Aksi</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-xs">
                      {filteredRegisteredStudents.map((st, idx) => (
                        <tr key={st.id} className="hover:bg-slate-50 transition-colors">
                          <td className="py-2.5 px-3 text-center font-bold text-slate-500">
                            {idx + 1}
                          </td>
                          <td className="py-2.5 px-4 font-black text-slate-900 tracking-wide uppercase">
                            {st.name}
                          </td>
                          <td className="py-2.5 px-4 font-semibold text-slate-700 flex items-center space-x-1.5">
                            <Building className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                            <span>{st.school}</span>
                          </td>
                          <td className="py-2.5 px-3 text-center">
                            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-extrabold bg-indigo-50 text-indigo-700 border border-indigo-200">
                              {st.grade}
                            </span>
                          </td>
                          <td className="py-2.5 px-3 text-center text-slate-400 text-[11px] font-semibold">
                            {st.createdAt ? new Date(st.createdAt).toLocaleDateString('id-ID') : '-'}
                          </td>
                          <td className="py-2.5 px-3 text-center">
                            <button
                              type="button"
                              onClick={() => handleDeleteRegisteredStudent(st.id, st.name)}
                              title="Hapus peserta ini"
                              className="p-1.5 rounded-xl bg-slate-100 hover:bg-rose-100 text-slate-600 hover:text-rose-700 transition-colors cursor-pointer"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
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

              <div>
                <label className="block text-xs font-black text-slate-700 uppercase tracking-wider mb-1">
                  Asal Sekolah
                </label>
                <select
                  value={editSubSchoolName}
                  onChange={(e) => setEditSubSchoolName(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border-2 border-slate-200 rounded-xl text-xs font-bold focus:outline-none focus:border-indigo-500 cursor-pointer"
                >
                  {SCHOOL_LIST.map((sch) => (
                    <option key={sch} value={sch}>
                      {sch}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-black text-slate-700 uppercase tracking-wider mb-1">
                  Kelas
                </label>
                <select
                  value={editSubGradeName}
                  onChange={(e) => setEditSubGradeName(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border-2 border-slate-200 rounded-xl text-xs font-bold focus:outline-none focus:border-indigo-500 cursor-pointer"
                >
                  {GRADE_LIST.map((grd) => (
                    <option key={grd} value={grd}>
                      {grd}
                    </option>
                  ))}
                </select>
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

      {/* Reset Data Confirmation Modal */}
      {showResetConfirm && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 md:p-8 max-w-md w-full border-2 border-slate-200 shadow-2xl space-y-5">
            <div className="flex items-center space-x-3 text-rose-600">
              <div className="w-12 h-12 rounded-2xl bg-rose-100 flex items-center justify-center shrink-0">
                <Trash2 className="w-6 h-6 text-rose-600" />
              </div>
              <div>
                <h3 className="text-lg font-black text-slate-900 font-heading">
                  Konfirmasi Reset Data
                </h3>
                <p className="text-xs font-semibold text-slate-500">
                  Hapus Seluruh Hasil Ujian Siswa
                </p>
              </div>
            </div>

            <div className="bg-rose-50 border border-rose-200 rounded-2xl p-4 text-xs font-semibold text-rose-900 space-y-1.5">
              <p className="font-bold text-rose-950">⚠️ Peringatan Penting:</p>
              <p>
                Tindakan ini akan menghapus permanen sebanyak <strong>{submissions.length} data pengerjaan ujian</strong> siswa di database Cloud Firestore.
              </p>
              <p className="text-rose-700">
                Data yang sudah dihapus tidak dapat dikembalikan lagi.
              </p>
            </div>

            <div className="flex items-center space-x-3 pt-2">
              <button
                type="button"
                disabled={isResetting}
                onClick={() => setShowResetConfirm(false)}
                className="flex-1 py-3 rounded-2xl border-2 border-slate-200 text-xs font-bold text-slate-700 hover:bg-slate-100 transition-all cursor-pointer disabled:opacity-50"
              >
                Batal
              </button>
              <button
                type="button"
                disabled={isResetting}
                onClick={handleResetData}
                className="flex-1 py-3 rounded-2xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-black flex items-center justify-center space-x-1.5 transition-all shadow-md cursor-pointer disabled:opacity-50"
              >
                {isResetting ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Menghapus...</span>
                  </>
                ) : (
                  <>
                    <Trash2 className="w-4 h-4" />
                    <span>Ya, Hapus Semua Data</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Reset Registered Students Confirmation Modal */}
      {showResetRegConfirm && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 md:p-8 max-w-md w-full border-2 border-slate-200 shadow-2xl space-y-5 animate-fadeIn">
            <div className="flex items-center space-x-3 text-rose-600">
              <div className="w-12 h-12 rounded-2xl bg-rose-100 flex items-center justify-center shrink-0">
                <Trash2 className="w-6 h-6 text-rose-600" />
              </div>
              <div>
                <h3 className="text-lg font-black text-slate-900 font-heading">
                  Konfirmasi Hapus Peserta
                </h3>
                <p className="text-xs font-semibold text-slate-500">
                  Hapus Seluruh Data Peserta Terdaftar
                </p>
              </div>
            </div>

            <div className="bg-rose-50 border border-rose-200 rounded-2xl p-4 text-xs font-semibold text-rose-900 space-y-1.5">
              <p className="font-bold text-rose-950">⚠️ Peringatan Penting:</p>
              <p>
                Tindakan ini akan menghapus permanen seluruh <strong>{registeredStudents.length} data peserta terdaftar</strong> di database Cloud Firestore.
              </p>
              <p className="text-rose-700">
                Data yang sudah dihapus tidak dapat dipulihkan. Siswa tidak akan dapat masuk jika Sistem Peserta Terdaftar sedang aktif sampai Anda mendaftarkan data kembali.
              </p>
            </div>

            <div className="flex items-center space-x-3 pt-2">
              <button
                type="button"
                disabled={isResettingReg}
                onClick={() => setShowResetRegConfirm(false)}
                className="flex-1 py-3 rounded-2xl border-2 border-slate-200 text-xs font-bold text-slate-700 hover:bg-slate-100 transition-all cursor-pointer disabled:opacity-50"
              >
                Batal
              </button>
              <button
                type="button"
                disabled={isResettingReg}
                onClick={handleResetRegisteredStudents}
                className="flex-1 py-3 rounded-2xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-black flex items-center justify-center space-x-1.5 transition-all shadow-md cursor-pointer disabled:opacity-50"
              >
                {isResettingReg ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Menghapus...</span>
                  </>
                ) : (
                  <>
                    <Trash2 className="w-4 h-4" />
                    <span>Ya, Hapus Semua Peserta</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
