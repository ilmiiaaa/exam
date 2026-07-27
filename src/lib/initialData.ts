import { doc, getDoc, setDoc, collection, getDocs } from 'firebase/firestore';
import { db } from './firebase';
import { Exam } from '../types';

export const DEFAULT_EXAMS: Exam[] = [
  {
    id: 'UJIAN2026',
    token: 'UJIAN2026',
    title: 'Ujian Pengetahuan Umum & Sains',
    subject: 'Sains & Umum',
    durationMinutes: 15,
    createdAt: new Date().toISOString(),
    active: true,
    questions: [
      {
        id: 'q1',
        question: 'Planet apakah yang terdekat dengan Matahari dalam tata surya kita?',
        options: ['Venus', 'Merkurius', 'Mars', 'Bumi'],
        correctAnswer: 1, // Merkurius
        points: 20,
        explanation: 'Merkurius adalah planet yang paling dekat posisinya dengan Matahari.'
      },
      {
        id: 'q2',
        question: 'Proses pembuatan makanan pada tumbuhan hijau dengan bantuan sinar matahari dinamakan...',
        options: ['Respirasi', 'Transpirasi', 'Fotosintesis', 'Osmosis'],
        correctAnswer: 2, // Fotosintesis
        points: 20,
        explanation: 'Fotosintesis memanfaatkan energi cahaya matahari untuk mengubah CO2 dan H2O menjadi glukosa dan O2.'
      },
      {
        id: 'q3',
        question: 'Gas manakah yang paling banyak jumlahnya di atmosfer bumi?',
        options: ['Oksigen', 'Karbondioksida', 'Nitrogen', 'Hidrogen'],
        correctAnswer: 2, // Nitrogen
        points: 20,
        explanation: 'Atmosfer bumi terdiri dari sekitar 78% gas Nitrogen.'
      },
      {
        id: 'q4',
        question: 'Rumus kimia H2O secara umum kita kenal sebagai...',
        options: ['Garam', 'Air', 'Gula', 'Udara'],
        correctAnswer: 1, // Air
        points: 20,
        explanation: 'H2O terdiri dari 2 atom Hidrogen dan 1 atom Oksigen yang membentuk molekul air.'
      },
      {
        id: 'q5',
        question: 'Satuan internasional (SI) untuk mengukur kuat arus listrik adalah...',
        options: ['Volt', 'Ampere', 'Watt', 'Ohm'],
        correctAnswer: 1, // Ampere
        points: 20,
        explanation: 'Kuat arus listrik diukur dalam satuan Ampere (A).'
      }
    ]
  },
  {
    id: 'MTK101',
    token: 'MTK101',
    title: 'Ujian Logika & Matematika Dasar',
    subject: 'Matematika',
    durationMinutes: 10,
    createdAt: new Date().toISOString(),
    active: true,
    questions: [
      {
        id: 'm1',
        question: 'Berapakah hasil dari (15 x 6) - 25?',
        options: ['65', '70', '75', '80'],
        correctAnswer: 0, // 65
        points: 20,
        explanation: '15 x 6 = 90. Kemudian 90 - 25 = 65.'
      },
      {
        id: 'm2',
        question: 'Sebuah persegi memiliki panjang sisi 8 cm. Berapakah luas persegi tersebut?',
        options: ['32 cm²', '48 cm²', '64 cm²', '81 cm²'],
        correctAnswer: 2, // 64
        points: 20,
        explanation: 'Luas persegi = sisi x sisi = 8 cm x 8 cm = 64 cm².'
      },
      {
        id: 'm3',
        question: 'Berapakah nilai akar kuadrat dari 144 (√144)?',
        options: ['10', '11', '12', '14'],
        correctAnswer: 2, // 12
        points: 20,
        explanation: '12 x 12 = 144, sehingga √144 = 12.'
      },
      {
        id: 'm4',
        question: 'Di antara bilangan berikut, manakah yang merupakan bilangan prima?',
        options: ['15', '21', '29', '35'],
        correctAnswer: 2, // 29
        points: 20,
        explanation: '29 hanya memiliki dua faktor pembagi yaitu 1 dan 29 sendiri.'
      },
      {
        id: 'm5',
        question: 'Berapakah 25% dari 300?',
        options: ['50', '60', '75', '100'],
        correctAnswer: 2, // 75
        points: 20,
        explanation: '25% x 300 = (25 / 100) x 300 = 75.'
      }
    ]
  }
];

export async function initializeSeedExams() {
  try {
    const examsRef = collection(db, 'exams');
    const snapshot = await getDocs(examsRef);
    if (snapshot.empty) {
      console.log('Seeding initial exams into Firestore...');
      for (const exam of DEFAULT_EXAMS) {
        await setDoc(doc(db, 'exams', exam.token), exam);
      }
    }
  } catch (err) {
    console.error('Error seeding default exams:', err);
  }
}
