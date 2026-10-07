import React, { useState, useEffect } from 'react';
import { LoginScreen } from './components/LoginScreen';
import { ExamScreen } from './components/ExamScreen';
import { ResultScreen } from './components/ResultScreen';
import { TeacherDashboard } from './components/TeacherDashboard';
import { SplashScreen } from './components/SplashScreen';
import { AutoUpdateNotification } from './components/AutoUpdateNotification';
import { Exam, Submission } from './types';
import { initializeSeedExams } from './lib/initialData';
import { ensureAuth } from './lib/firebase';

export default function App() {
  const [showSplash, setShowSplash] = useState(() => {
    try {
      const savedScreen = localStorage.getItem('exam_edu_active_screen');
      if (savedScreen === 'result') return false;
    } catch (e) {}
    return true;
  });

  const [screen, setScreen] = useState<'login' | 'exam' | 'result' | 'teacher'>(() => {
    try {
      const savedScreen = localStorage.getItem('exam_edu_active_screen');
      if (savedScreen === 'result') {
        const savedSub = localStorage.getItem('exam_edu_current_submission');
        const savedExam = localStorage.getItem('exam_edu_current_exam');
        if (savedSub && savedExam) {
          return 'result';
        }
      }
    } catch (e) {}
    return 'login';
  });

  const [studentName, setStudentName] = useState(() => {
    try {
      return localStorage.getItem('exam_edu_student_name') || '';
    } catch (e) { return ''; }
  });

  const [studentSchool, setStudentSchool] = useState(() => {
    try {
      return localStorage.getItem('exam_edu_student_school') || '';
    } catch (e) { return ''; }
  });

  const [studentGrade, setStudentGrade] = useState(() => {
    try {
      return localStorage.getItem('exam_edu_student_grade') || '';
    } catch (e) { return ''; }
  });

  const [examToken, setExamToken] = useState(() => {
    try {
      return localStorage.getItem('exam_edu_exam_token') || '';
    } catch (e) { return ''; }
  });

  const [currentExam, setCurrentExam] = useState<Exam | null>(() => {
    try {
      const saved = localStorage.getItem('exam_edu_current_exam');
      return saved ? JSON.parse(saved) : null;
    } catch (e) { return null; }
  });

  const [currentSubmission, setCurrentSubmission] = useState<Submission | null>(() => {
    try {
      const saved = localStorage.getItem('exam_edu_current_submission');
      return saved ? JSON.parse(saved) : null;
    } catch (e) { return null; }
  });

  // Initialize seed exams & Firebase Auth on app mount
  useEffect(() => {
    ensureAuth();
    initializeSeedExams();
  }, []);

  const handleStartExam = (name: string, school: string, grade: string, token: string, exam: Exam) => {
    setStudentName(name);
    setStudentSchool(school);
    setStudentGrade(grade);
    setExamToken(token);
    setCurrentExam(exam);
    setScreen('exam');
    try {
      localStorage.setItem('exam_edu_active_screen', 'exam');
      localStorage.setItem('exam_edu_student_name', name);
      localStorage.setItem('exam_edu_student_school', school);
      localStorage.setItem('exam_edu_student_grade', grade);
      localStorage.setItem('exam_edu_exam_token', token);
      localStorage.setItem('exam_edu_current_exam', JSON.stringify(exam));
    } catch (e) {}
  };

  const handleFinishExam = (submission: Submission) => {
    setCurrentSubmission(submission);
    setScreen('result');
    try {
      localStorage.setItem('exam_edu_active_screen', 'result');
      localStorage.setItem('exam_edu_current_submission', JSON.stringify(submission));
    } catch (e) {}
  };

  const handleResetToLogin = () => {
    setStudentName('');
    setStudentSchool('');
    setStudentGrade('');
    setExamToken('');
    setCurrentExam(null);
    setCurrentSubmission(null);
    setScreen('login');
    try {
      localStorage.removeItem('exam_edu_active_screen');
      localStorage.removeItem('exam_edu_current_submission');
      localStorage.removeItem('exam_edu_current_exam');
      localStorage.removeItem('exam_edu_exam_token');
      localStorage.removeItem('exam_edu_student_name');
      localStorage.removeItem('exam_edu_student_school');
      localStorage.removeItem('exam_edu_student_grade');
    } catch (e) {}
  };

  return (
    <div className="min-h-screen bg-slate-100 text-slate-900 font-sans antialiased">
      {/* Real-time System Auto-Update & Mobile Resume Sync */}
      <AutoUpdateNotification currentScreen={screen} />

      {showSplash && (
        <SplashScreen onFinish={() => setShowSplash(false)} />
      )}

      {screen === 'login' && (
        <LoginScreen
          onStartExam={handleStartExam}
          onOpenTeacherPanel={() => setScreen('teacher')}
        />
      )}

      {screen === 'exam' && currentExam && (
        <ExamScreen
          studentName={studentName}
          schoolName={studentSchool}
          gradeName={studentGrade}
          examToken={examToken}
          exam={currentExam}
          onFinishExam={handleFinishExam}
        />
      )}

      {screen === 'result' && currentSubmission && currentExam && (
        <ResultScreen
          submission={currentSubmission}
          exam={currentExam}
          onReset={handleResetToLogin}
        />
      )}

      {screen === 'teacher' && (
        <TeacherDashboard
          onBackToStudentLogin={() => setScreen('login')}
        />
      )}
    </div>
  );
}
