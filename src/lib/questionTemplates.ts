import * as XLSX from 'xlsx';
import { Question, QuestionType, MatchingPair } from '../types';

export interface QuestionTypeInfo {
  type: QuestionType;
  label: string;
  badge: string;
  description: string;
  iconName: string;
}

export const QUESTION_TYPES: QuestionTypeInfo[] = [
  {
    type: 'multiple_choice',
    label: 'Pilihan Ganda',
    badge: 'PG (A-D)',
    description: 'Soal dengan 4 opsi pilihan jawaban dan 1 kunci jawaban benar',
    iconName: 'ListChecks',
  },
  {
    type: 'true_false',
    label: 'Benar / Salah',
    badge: 'B / S',
    description: 'Pernyataan dengan opsi BENAR atau SALAH',
    iconName: 'ToggleLeft',
  },
  {
    type: 'matching',
    label: 'Menjodohkan',
    badge: 'Jodohkan',
    description: 'Memasangkan premis sebelah kiri dengan jawaban di sebelah kanan',
    iconName: 'GitMerge',
  },
  {
    type: 'short_answer',
    label: 'Isian Singkat',
    badge: 'Isian',
    description: 'Siswa mengetik teks/angka singkat dengan pencocokan otomatis',
    iconName: 'Type',
  },
  {
    type: 'image_question',
    label: 'Soal Bergambar',
    badge: 'Bergambar',
    description: 'Soal memuat gambar visual dengan pilihan jawaban A-D',
    iconName: 'Image',
  },
];

/**
 * Download Excel template tailored for a specific question type or all types
 */
export function downloadQuestionTemplate(type: QuestionType | 'all') {
  const wb = XLSX.utils.book_new();

  if (type === 'multiple_choice') {
    const data = [
      ['No', 'Pertanyaan', 'Pilihan A', 'Pilihan B', 'Pilihan C', 'Pilihan D', 'Kunci Jawaban (A/B/C/D)', 'Poin', 'Pembahasan'],
      [
        1,
        'Planet apakah yang posisinya paling dekat dengan Matahari?',
        'Venus',
        'Merkurius',
        'Mars',
        'Bumi',
        'B',
        20,
        'Merkurius adalah planet terdekat dengan Matahari dalam tata surya kita.'
      ],
      [
        2,
        'Proses pembuatan makanan pada tumbuhan hijau dengan bantuan cahaya dinamakan...',
        'Respirasi',
        'Transpirasi',
        'Fotosintesis',
        'Osmosis',
        'C',
        20,
        'Fotosintesis mengubah karbondioksida dan air menjadi glukosa dengan sinar matahari.'
      ],
      [
        3,
        'Gas yang memiliki persentase terbesar dalam atmosfer bumi adalah...',
        'Oksigen',
        'Karbondioksida',
        'Nitrogen',
        'Hidrogen',
        'C',
        20,
        'Atmosfer bumi terdiri dari sekitar 78% gas nitrogen.'
      ]
    ];
    const ws = XLSX.utils.aoa_to_sheet(data);
    ws['!cols'] = [{ wch: 6 }, { wch: 45 }, { wch: 18 }, { wch: 18 }, { wch: 18 }, { wch: 18 }, { wch: 22 }, { wch: 8 }, { wch: 35 }];
    XLSX.utils.book_append_sheet(wb, ws, 'Pilihan_Ganda');
    XLSX.writeFile(wb, 'Template_Soal_Pilihan_Ganda.xlsx');
    return;
  }

  if (type === 'true_false') {
    const data = [
      ['No', 'Pernyataan / Soal', 'Kunci Jawaban (BENAR / SALAH)', 'Poin', 'Pembahasan'],
      [
        1,
        'Matahari terbit dari arah barat dan tenggelam di arah timur.',
        'SALAH',
        20,
        'Matahari terbit dari timur dan terbenam di barat karena rotasi bumi.'
      ],
      [
        2,
        'Air murni memiliki titik didih standar 100 derajat Celsius pada tekanan 1 atmosfer.',
        'BENAR',
        20,
        'Titik didih normal air pada tekanan 1 atm adalah 100°C.'
      ],
      [
        3,
        'Mamalia adalah hewan yang berkembang biak secara bertelur.',
        'SALAH',
        20,
        'Sebagian besar mamalia melahirkan (vivipar) dan menyusui anaknya.'
      ]
    ];
    const ws = XLSX.utils.aoa_to_sheet(data);
    ws['!cols'] = [{ wch: 6 }, { wch: 50 }, { wch: 28 }, { wch: 8 }, { wch: 35 }];
    XLSX.utils.book_append_sheet(wb, ws, 'Benar_Salah');
    XLSX.writeFile(wb, 'Template_Soal_Benar_Salah.xlsx');
    return;
  }

  if (type === 'matching') {
    const data = [
      [
        'No',
        'Instruksi / Soal Menjodohkan',
        'Premis 1 (Kiri)',
        'Pasangan 1 (Kanan)',
        'Premis 2 (Kiri)',
        'Pasangan 2 (Kanan)',
        'Premis 3 (Kiri)',
        'Pasangan 3 (Kanan)',
        'Premis 4 (Kiri)',
        'Pasangan 4 (Kanan)',
        'Poin',
        'Pembahasan'
      ],
      [
        1,
        'Jodohkan nama negara di sebelah kiri dengan nama ibu kotanya yang tepat:',
        'Indonesia',
        'Nusantara',
        'Jepang',
        'Tokyo',
        'Prancis',
        'Paris',
        'Mesir',
        'Kairo',
        25,
        'Ibu kota: Indonesia-Nusantara, Jepang-Tokyo, Prancis-Paris, Mesir-Kairo.'
      ],
      [
        2,
        'Pasangkan besaran fisika dengan satuan internasional (SI) yang tepat:',
        'Kuat Arus',
        'Ampere',
        'Suhu',
        'Kelvin',
        'Massa',
        'Kilogram',
        'Panjang',
        'Meter',
        25,
        'Satuan SI: Kuat Arus (Ampere), Suhu (Kelvin), Massa (Kilogram), Panjang (Meter).'
      ]
    ];
    const ws = XLSX.utils.aoa_to_sheet(data);
    ws['!cols'] = [
      { wch: 6 },
      { wch: 45 },
      { wch: 18 },
      { wch: 18 },
      { wch: 18 },
      { wch: 18 },
      { wch: 18 },
      { wch: 18 },
      { wch: 18 },
      { wch: 18 },
      { wch: 8 },
      { wch: 35 }
    ];
    XLSX.utils.book_append_sheet(wb, ws, 'Menjodohkan');
    XLSX.writeFile(wb, 'Template_Soal_Menjodohkan.xlsx');
    return;
  }

  if (type === 'short_answer') {
    const data = [
      ['No', 'Pertanyaan / Soal', 'Kunci Jawaban Singkat', 'Poin', 'Pembahasan'],
      [
        1,
        'Apakah rumus kimia untuk molekul air yang tersusun atas hidrogen dan oksigen?',
        'H2O',
        20,
        'Rumus kimia air adalah H2O (2 atom hidrogen dan 1 atom oksigen).'
      ],
      [
        2,
        'Siapakah nama presiden pertama Republik Indonesia?',
        'Soekarno',
        20,
        'Presiden pertama Republik Indonesia adalah Ir. Soekarno.'
      ],
      [
        3,
        'Berapakah hasil dari 15 dikalikan 4 dibagi 2?',
        '30',
        20,
        '15 x 4 = 60, lalu 60 / 2 = 30.'
      ]
    ];
    const ws = XLSX.utils.aoa_to_sheet(data);
    ws['!cols'] = [{ wch: 6 }, { wch: 50 }, { wch: 25 }, { wch: 8 }, { wch: 35 }];
    XLSX.utils.book_append_sheet(wb, ws, 'Isian_Singkat');
    XLSX.writeFile(wb, 'Template_Soal_Isian_Singkat.xlsx');
    return;
  }

  if (type === 'image_question') {
    const data = [
      ['No', 'Pertanyaan', 'URL Gambar', 'Pilihan A', 'Pilihan B', 'Pilihan C', 'Pilihan D', 'Kunci Jawaban (A/B/C/D)', 'Poin', 'Pembahasan'],
      [
        1,
        'Perhatikan gambar di samping. Bangun datar tersebut memiliki berapa banyak simetri lipat?',
        'https://images.unsplash.com/photo-1509228468518-180dd4864904?w=500&auto=format&fit=crop&q=60',
        '2',
        '4',
        '6',
        '8',
        'B',
        20,
        'Bangun persegi memiliki 4 simetri lipat dan 4 simetri putar.'
      ],
      [
        2,
        'Alat laboratorium kimia pada gambar digunakan untuk mengukur...',
        'https://images.unsplash.com/photo-1532094349884-543bc11b234d?w=500&auto=format&fit=crop&q=60',
        'Suhu larutan',
        'Volume cairan',
        'Tekanan gas',
        'Massa zat padat',
        'B',
        20,
        'Gelas ukur kimia berfungsi untuk mengukur volume cairan secara presisi.'
      ]
    ];
    const ws = XLSX.utils.aoa_to_sheet(data);
    ws['!cols'] = [
      { wch: 6 },
      { wch: 45 },
      { wch: 40 },
      { wch: 18 },
      { wch: 18 },
      { wch: 18 },
      { wch: 18 },
      { wch: 22 },
      { wch: 8 },
      { wch: 35 }
    ];
    XLSX.utils.book_append_sheet(wb, ws, 'Soal_Bergambar');
    XLSX.writeFile(wb, 'Template_Soal_Bergambar.xlsx');
    return;
  }

  // 'all' -> Template Multi-Jenis Soal
  const allData = [
    [
      'Tipe Soal (PILIHAN_GANDA / BENAR_SALAH / MENJODOHKAN / ISIAN_SINGKAT / BERGAMBAR)',
      'Pertanyaan / Instruksi',
      'Pilihan A / Premis 1',
      'Pilihan B / Pasangan 1',
      'Pilihan C / Premis 2',
      'Pilihan D / Pasangan 2',
      'Premis 3',
      'Pasangan 3',
      'Kunci Jawaban / Kunci Singkat',
      'URL Gambar (Khusus Bergambar)',
      'Poin',
      'Pembahasan'
    ],
    [
      'PILIHAN_GANDA',
      'Planet terdekat dari matahari dalam tata surya adalah...',
      'Venus',
      'Merkurius',
      'Mars',
      'Bumi',
      '',
      '',
      'B',
      '',
      20,
      'Merkurius adalah planet terdekat dari Matahari.'
    ],
    [
      'BENAR_SALAH',
      'Air mendidih pada suhu 100°C di tekanan udara 1 atmosfer.',
      '',
      '',
      '',
      '',
      '',
      '',
      'BENAR',
      '',
      20,
      'Titik didih standar air adalah 100 derajat Celsius.'
    ],
    [
      'MENJODOHKAN',
      'Jodohkan negara dengan ibu kotanya:',
      'Indonesia',
      'Nusantara',
      'Jepang',
      'Tokyo',
      'Prancis',
      'Paris',
      '',
      '',
      20,
      'Ibu kota Indonesia adalah Nusantara, Jepang adalah Tokyo.'
    ],
    [
      'ISIAN_SINGKAT',
      'Rumus kimia untuk molekul air adalah...',
      '',
      '',
      '',
      '',
      '',
      '',
      'H2O',
      '',
      20,
      'Air memiliki rumus molekul H2O.'
    ],
    [
      'BERGAMBAR',
      'Perhatikan gambar alat berikut. Berapakah simetri lipat pada gambar?',
      '2',
      '4',
      '6',
      '8',
      '',
      '',
      'B',
      'https://images.unsplash.com/photo-1509228468518-180dd4864904?w=500&auto=format&fit=crop&q=60',
      20,
      'Persegi memiliki 4 simetri lipat.'
    ]
  ];

  const ws = XLSX.utils.aoa_to_sheet(allData);
  ws['!cols'] = [
    { wch: 20 },
    { wch: 40 },
    { wch: 18 },
    { wch: 18 },
    { wch: 18 },
    { wch: 18 },
    { wch: 18 },
    { wch: 18 },
    { wch: 22 },
    { wch: 30 },
    { wch: 8 },
    { wch: 30 }
  ];
  XLSX.utils.book_append_sheet(wb, ws, 'Paket_Lengkap');
  XLSX.writeFile(wb, 'Template_Paket_Semua_Jenis_Soal.xlsx');
}

/**
 * Universal Excel Parser for Questions:
 * Automatically identifies sheet columns and formats for all 5 question types
 */
export function parseQuestionsFromWorkbook(workbook: XLSX.WorkBook): {
  questions: Question[];
  detectedTypes: QuestionType[];
  invalidCount: number;
} {
  const parsedQuestions: Question[] = [];
  const detectedTypesSet = new Set<QuestionType>();
  let invalidCount = 0;

  workbook.SheetNames.forEach((sheetName) => {
    const worksheet = workbook.Sheets[sheetName];
    const rawRows: any[] = XLSX.utils.sheet_to_json(worksheet, { defval: '' });

    rawRows.forEach((row, rowIdx) => {
      // Normalize row keys to lowercase without spaces or underscores
      const norm: Record<string, any> = {};
      Object.keys(row).forEach((k) => {
        const clean = k.toString().toLowerCase().replace(/[\_\s\-\/]/g, '');
        norm[clean] = row[k];
      });

      // 1. Detect question type from explicit column if present
      const explicitTypeStr = (
        norm['tipesoal'] ||
        norm['tipe'] ||
        norm['jenissoal'] ||
        norm['jenis'] ||
        norm['type'] ||
        ''
      ).toString().toLowerCase().trim();

      let qType: QuestionType = 'multiple_choice';

      if (
        explicitTypeStr.includes('benar') ||
        explicitTypeStr.includes('salah') ||
        explicitTypeStr === 'bs' ||
        explicitTypeStr === 'tf' ||
        explicitTypeStr.includes('true')
      ) {
        qType = 'true_false';
      } else if (
        explicitTypeStr.includes('jodoh') ||
        explicitTypeStr.includes('match') ||
        explicitTypeStr.includes('pasang')
      ) {
        qType = 'matching';
      } else if (
        explicitTypeStr.includes('isian') ||
        explicitTypeStr.includes('singkat') ||
        explicitTypeStr.includes('short') ||
        explicitTypeStr.includes('essay')
      ) {
        qType = 'short_answer';
      } else if (
        explicitTypeStr.includes('gambar') ||
        explicitTypeStr.includes('image')
      ) {
        qType = 'image_question';
      } else {
        // Auto-detect based on row column structure
        const hasImageUrl = Boolean(norm['urlgambar'] || norm['gambar'] || norm['imageurl'] || norm['foto']);
        const hasMatchingPairs = Boolean(norm['premis1'] || norm['pasangan1'] || norm['premis'] || norm['pasangan']);
        const hasOptions = Boolean(norm['pilihana'] || norm['opsia'] || norm['a']);
        const rawKey = (norm['kuncijawaban'] || norm['kunci'] || norm['jawaban'] || '').toString().trim().toUpperCase();

        if (hasImageUrl) {
          qType = 'image_question';
        } else if (hasMatchingPairs) {
          qType = 'matching';
        } else if (rawKey === 'BENAR' || rawKey === 'SALAH' || rawKey === 'TRUE' || rawKey === 'FALSE') {
          qType = 'true_false';
        } else if (!hasOptions && (norm['kuncijawabansingkat'] || norm['kuncisingkat'] || rawKey.length > 1)) {
          qType = 'short_answer';
        } else {
          qType = 'multiple_choice';
        }
      }

      // Question / statement text
      const questionText = (
        norm['soal'] ||
        norm['pertanyaan'] ||
        norm['pernyataan'] ||
        norm['instruksi'] ||
        norm['question'] ||
        ''
      ).toString().trim();

      if (!questionText) {
        invalidCount++;
        return;
      }

      // Points & explanation
      const rawPoints = Number(norm['poin'] || norm['point'] || norm['points'] || norm['skor'] || 20);
      const points = isNaN(rawPoints) || rawPoints <= 0 ? 20 : rawPoints;
      const explanation = (norm['pembahasan'] || norm['penjelasan'] || norm['explanation'] || '').toString().trim() || undefined;

      const qId = `q_${Date.now()}_${sheetName}_${rowIdx}`;

      if (qType === 'true_false') {
        const rawKey = (
          norm['kuncijawaban'] ||
          norm['kunci'] ||
          norm['jawaban'] ||
          'BENAR'
        ).toString().trim().toUpperCase();

        const correctBool = !(rawKey.includes('SALAH') || rawKey === 'FALSE' || rawKey === '0' || rawKey === 'S');

        parsedQuestions.push({
          id: qId,
          type: 'true_false',
          question: questionText,
          correctBool,
          points,
          explanation,
        });
        detectedTypesSet.add('true_false');
      } else if (qType === 'matching') {
        const pairs: MatchingPair[] = [];
        for (let i = 1; i <= 6; i++) {
          const premise = (norm[`premis${i}`] || (i === 1 ? norm['pilihana'] : i === 2 ? norm['pilihanc'] : '') || '').toString().trim();
          const match = (norm[`pasangan${i}`] || (i === 1 ? norm['pilihanb'] : i === 2 ? norm['pilihand'] : '') || '').toString().trim();
          if (premise && match) {
            pairs.push({
              id: `p_${Date.now()}_${i}`,
              premise,
              match,
            });
          }
        }

        if (pairs.length === 0) {
          // Fallback if user just entered comma-separated
          pairs.push(
            { id: `p1`, premise: 'Premis A', match: 'Pasangan A' },
            { id: `p2`, premise: 'Premis B', match: 'Pasangan B' }
          );
        }

        parsedQuestions.push({
          id: qId,
          type: 'matching',
          question: questionText,
          matchingPairs: pairs,
          points,
          explanation,
        });
        detectedTypesSet.add('matching');
      } else if (qType === 'short_answer') {
        const correctText = (
          norm['kuncijawabansingkat'] ||
          norm['kuncisingkat'] ||
          norm['kuncijawaban'] ||
          norm['kunci'] ||
          norm['jawaban'] ||
          ''
        ).toString().trim();

        parsedQuestions.push({
          id: qId,
          type: 'short_answer',
          question: questionText,
          correctText: correctText || 'Kunci',
          points,
          explanation,
        });
        detectedTypesSet.add('short_answer');
      } else if (qType === 'image_question') {
        const imageUrl = (
          norm['urlgambar'] ||
          norm['gambar'] ||
          norm['imageurl'] ||
          norm['foto'] ||
          'https://images.unsplash.com/photo-1509228468518-180dd4864904?w=500&auto=format&fit=crop&q=60'
        ).toString().trim();

        const optA = (norm['pilihana'] || norm['opsia'] || norm['a'] || 'Pilihan A').toString().trim();
        const optB = (norm['pilihanb'] || norm['opsib'] || norm['b'] || 'Pilihan B').toString().trim();
        const optC = (norm['pilihanc'] || norm['opsic'] || norm['c'] || 'Pilihan C').toString().trim();
        const optD = (norm['pilihand'] || norm['opsid'] || norm['d'] || 'Pilihan D').toString().trim();

        let keyStr = (norm['kuncijawaban'] || norm['kunci'] || norm['jawaban'] || 'A').toString().trim().toUpperCase();
        let correctAnswer = 0;
        if (keyStr.includes('B') || keyStr === '2') correctAnswer = 1;
        else if (keyStr.includes('C') || keyStr === '3') correctAnswer = 2;
        else if (keyStr.includes('D') || keyStr === '4') correctAnswer = 3;

        parsedQuestions.push({
          id: qId,
          type: 'image_question',
          question: questionText,
          imageUrl,
          options: [optA, optB, optC, optD],
          correctAnswer,
          points,
          explanation,
        });
        detectedTypesSet.add('image_question');
      } else {
        // multiple_choice
        const optA = (norm['pilihana'] || norm['opsia'] || norm['a'] || 'Pilihan A').toString().trim();
        const optB = (norm['pilihanb'] || norm['opsib'] || norm['b'] || 'Pilihan B').toString().trim();
        const optC = (norm['pilihanc'] || norm['opsic'] || norm['c'] || 'Pilihan C').toString().trim();
        const optD = (norm['pilihand'] || norm['opsid'] || norm['d'] || 'Pilihan D').toString().trim();

        let keyStr = (norm['kuncijawaban'] || norm['kunci'] || norm['jawaban'] || 'A').toString().trim().toUpperCase();
        let correctAnswer = 0;
        if (keyStr.includes('B') || keyStr === '2') correctAnswer = 1;
        else if (keyStr.includes('C') || keyStr === '3') correctAnswer = 2;
        else if (keyStr.includes('D') || keyStr === '4') correctAnswer = 3;

        parsedQuestions.push({
          id: qId,
          type: 'multiple_choice',
          question: questionText,
          options: [optA, optB, optC, optD],
          correctAnswer,
          points,
          explanation,
        });
        detectedTypesSet.add('multiple_choice');
      }
    });
  });

  return {
    questions: parsedQuestions,
    detectedTypes: Array.from(detectedTypesSet),
    invalidCount,
  };
}
