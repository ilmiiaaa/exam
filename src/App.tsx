import React, { useState, useEffect } from 'react';
import { LoginScreen } from './components/LoginScreen';
import { ExamScreen } from './components/ExamScreen';
import { ResultScreen } from './components/ResultScreen';
import { TeacherDashboard } from './components/TeacherDashboard';
import { Exam, Submission } from './types';
import { initializeSeedExams } from './lib/initialData';
import { ensureAuth } from './lib/firebase';

export default function App() {
  const [screen, setScreen] = useState<'login' | 'exam' | 'result' | 'teacher'>('login');
  const [studentName, setStudentName] = useState('');
  const [studentSchool, setStudentSchool] = useState('');
  const [studentGrade, setStudentGrade] = useState('');
  const [examToken, setExamToken] = useState('');
  const [currentExam, setCurrentExam] = useState<Exam | null>(null);
  const [currentSubmission, setCurrentSubmission] = useState<Submission | null>(null);

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
  };

  const handleFinishExam = (submission: Submission) => {
    setCurrentSubmission(submission);
    setScreen('result');
  };

  const handleResetToLogin = () => {
    setStudentName('');
    setStudentSchool('');
    setStudentGrade('');
    setExamToken('');
    setCurrentExam(null);
    setCurrentSubmission(null);
    setScreen('login');
  };

  return (
    <div className="min-h-screen bg-slate-100 text-slate-900 font-sans antialiased">
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
