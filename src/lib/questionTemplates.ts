import * as XLSX from 'xlsx';
import { Question, QuestionType, MatchingPair } from '../types';

export interface QuestionTypeInfo {
  type: QuestionType;
  label: string;
  badge: string;
  description: string;
  iconName: string;
}

/**
 * Checks if a string is a question type name/keyword
 */
export function isQuestionTypeKeyword(val: string): boolean {
  if (!val || typeof val !== 'string') return false;
  const norm = val.toUpperCase().replace(/[^A-Z0-9]/g, '');
  return [
    'PILIHANGANDA',
    'BENARSALAH',
    'MENJODOHKAN',
    'ISIANSINGKAT',
    'BERGAMBAR',
    'SOALBERGAMBAR',
    'MULTIPLECHOICE',
    'TRUEFALSE',
    'MATCHING',
    'SHORTANSWER',
    'IMAGEQUESTION',
    'PG',
    'BS',
    'TF',
    'MC',
  ].includes(norm);
}

/**
 * Validates that an image URL is a real URL or image path,
 * and definitely NOT a question type keyword like PILIHAN_GANDA or arbitrary text.
 */
export function isValidImageUrl(val: string): boolean {
  if (!val || typeof val !== 'string') return false;
  const trimmed = val.trim();
  if (!trimmed || isQuestionTypeKeyword(trimmed)) return false;
  return (
    trimmed.startsWith('http://') ||
    trimmed.startsWith('https://') ||
    trimmed.startsWith('data:image/') ||
    trimmed.startsWith('/') ||
    /\.(png|jpe?g|gif|webp|svg|bmp)(\?.*)?$/i.test(trimmed) ||
    (trimmed.length > 8 && (trimmed.includes('/') || trimmed.includes('.')))
  );
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
 * Automatically identifies sheet columns, headers, and formats for all 5 question types:
 * 1. Pilihan Ganda (Multiple Choice)
 * 2. Benar / Salah (True / False)
 * 3. Menjodohkan (Matching)
 * 4. Isian Singkat (Short Answer)
 * 5. Soal Bergambar (Image-based Question)
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
    if (!worksheet) return;

    // Detect header row by scanning first 15 rows of worksheet
    const aoa: any[][] = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: '' });
    if (!aoa || aoa.length === 0) return;

    let headerRowIdx = -1;
    for (let r = 0; r < Math.min(aoa.length, 15); r++) {
      const row = aoa[r];
      if (!Array.isArray(row)) continue;
      const rowJoined = row
        .map((cell) => String(cell || '').toLowerCase().replace(/[^a-z0-9]/g, ''))
        .join(' ');

      if (
        rowJoined.includes('soal') ||
        rowJoined.includes('pertanyaan') ||
        rowJoined.includes('pernyataan') ||
        rowJoined.includes('instruksi') ||
        rowJoined.includes('question') ||
        rowJoined.includes('pilihan') ||
        rowJoined.includes('opsi') ||
        rowJoined.includes('kunci') ||
        rowJoined.includes('premis')
      ) {
        headerRowIdx = r;
        break;
      }
    }

    if (headerRowIdx === -1) headerRowIdx = 0;

    const rawRows: any[] = XLSX.utils.sheet_to_json(worksheet, { range: headerRowIdx, defval: '' });

    rawRows.forEach((row, rowIdx) => {
      // Build clean entries for smart multi-strategy matching
      const entries = Object.entries(row).map(([k, v]) => ({
        originalKey: k,
        cleanKey: k.toLowerCase().replace(/[^a-z0-9]/g, ''),
        valStr: v !== undefined && v !== null ? String(v).trim() : '',
        rawVal: v,
      }));

      // Skip row if completely blank
      const hasAnyVal = entries.some((e) => e.valStr !== '');
      if (!hasAnyVal) return;

      // Helper to check if a column represents question type metadata
      const isTypeCol = (cleanKey: string) =>
        cleanKey.startsWith('tipesoal') ||
        cleanKey.startsWith('jenissoal') ||
        cleanKey.startsWith('kategorisoal') ||
        cleanKey.startsWith('formatsoal') ||
        cleanKey === 'tipe' ||
        cleanKey === 'jenis' ||
        cleanKey === 'type';

      // Smart value lookup helper
      const getVal = (...keywords: string[]): string => {
        const validKws = keywords.filter((k) => k && k.trim().length > 0);
        const isLookingForType = validKws.some(
          (k) =>
            k.includes('tipe') ||
            k.includes('jenis') ||
            k.includes('type')
        );

        // 1. Exact match with cleaned key
        for (const kw of validKws) {
          const cKw = kw.toLowerCase().replace(/[^a-z0-9]/g, '');
          if (!cKw) continue;
          const match = entries.find((e) => {
            if (!isLookingForType && isTypeCol(e.cleanKey)) return false;
            return e.cleanKey === cKw && e.valStr !== '';
          });
          if (match) return match.valStr;
        }

        // 2. Starts with keyword (e.g. 'premis1kiri' starts with 'premis1')
        for (const kw of validKws) {
          const cKw = kw.toLowerCase().replace(/[^a-z0-9]/g, '');
          if (!cKw) continue;
          const match = entries.find((e) => {
            if (!isLookingForType && isTypeCol(e.cleanKey)) return false;
            return e.cleanKey.startsWith(cKw) && e.valStr !== '';
          });
          if (match) return match.valStr;
        }

        // 3. Contains keyword (minimum 3 chars, and never match type columns unless querying type)
        for (const kw of validKws) {
          const cKw = kw.toLowerCase().replace(/[^a-z0-9]/g, '');
          if (cKw.length >= 3) {
            const match = entries.find((e) => {
              if (!isLookingForType && isTypeCol(e.cleanKey)) return false;
              return e.cleanKey.includes(cKw) && e.valStr !== '';
            });
            if (match) return match.valStr;
          }
        }

        return '';
      };

      // 1. Detect question type
      const explicitTypeStr = getVal('tipesoal', 'tipe', 'jenissoal', 'jenis', 'type', 'formatsoal').toLowerCase();
      const explicitClean = explicitTypeStr.replace(/[^a-z0-9]/g, '');
      const sheetNameClean = sheetName.toLowerCase().replace(/[^a-z0-9]/g, '');

      let qType: QuestionType = 'multiple_choice';
      let typeIdentified = false;

      // Priority 1: Explicit column value
      if (explicitClean) {
        if (
          explicitClean.includes('pilihan') ||
          explicitClean.includes('ganda') ||
          explicitClean === 'pg' ||
          explicitClean === 'mc' ||
          explicitClean.includes('multiple') ||
          explicitClean.includes('choice')
        ) {
          qType = 'multiple_choice';
          typeIdentified = true;
        } else if (
          explicitClean.includes('benar') ||
          explicitClean.includes('salah') ||
          explicitClean === 'bs' ||
          explicitClean === 'tf' ||
          explicitClean.includes('true') ||
          explicitClean.includes('false')
        ) {
          qType = 'true_false';
          typeIdentified = true;
        } else if (
          explicitClean.includes('jodoh') ||
          explicitClean.includes('menjodohkan') ||
          explicitClean.includes('match') ||
          explicitClean.includes('pasang')
        ) {
          qType = 'matching';
          typeIdentified = true;
        } else if (
          explicitClean.includes('isian') ||
          explicitClean.includes('singkat') ||
          explicitClean.includes('isiansingkat') ||
          explicitClean.includes('short') ||
          explicitClean.includes('essay')
        ) {
          qType = 'short_answer';
          typeIdentified = true;
        } else if (
          explicitClean.includes('gambar') ||
          explicitClean.includes('bergambar') ||
          explicitClean.includes('image') ||
          explicitClean.includes('foto') ||
          explicitClean.includes('visual')
        ) {
          qType = 'image_question';
          typeIdentified = true;
        }
      }

      // Priority 2: Sheet name
      if (!typeIdentified) {
        if (
          sheetNameClean.includes('pilihan') ||
          sheetNameClean.includes('ganda') ||
          sheetNameClean.includes('pg') ||
          sheetNameClean.includes('mc') ||
          sheetNameClean.includes('multiple')
        ) {
          qType = 'multiple_choice';
          typeIdentified = true;
        } else if (
          sheetNameClean.includes('benar') ||
          sheetNameClean.includes('salah') ||
          sheetNameClean.includes('bs') ||
          sheetNameClean.includes('tf') ||
          sheetNameClean.includes('true') ||
          sheetNameClean.includes('false')
        ) {
          qType = 'true_false';
          typeIdentified = true;
        } else if (
          sheetNameClean.includes('jodoh') ||
          sheetNameClean.includes('match') ||
          sheetNameClean.includes('pasang')
        ) {
          qType = 'matching';
          typeIdentified = true;
        } else if (
          sheetNameClean.includes('isian') ||
          sheetNameClean.includes('singkat') ||
          sheetNameClean.includes('short')
        ) {
          qType = 'short_answer';
          typeIdentified = true;
        } else if (
          sheetNameClean.includes('gambar') ||
          sheetNameClean.includes('image') ||
          sheetNameClean.includes('foto')
        ) {
          qType = 'image_question';
          typeIdentified = true;
        }
      }

      // Priority 3: Auto-detect based on row contents and column names
      if (!typeIdentified) {
        const rawImgCandidate = getVal(
          'urlgambarkhususbergambar',
          'urlgambar',
          'imageurl',
          'linkgambar',
          'gambarurl',
          'linkfoto',
          'urlfoto'
        );
        const hasValidImg = isValidImageUrl(rawImgCandidate);
        const hasMatchingPairs = Boolean(
          getVal('premis1kiri', 'premis1', 'pasangan1kanan', 'pasangan1')
        );
        const hasOptions = Boolean(getVal('pilihana', 'opsia', 'a'));
        const rawKey = getVal('kuncijawaban', 'kunci', 'jawaban').toUpperCase();

        if (hasValidImg) {
          qType = 'image_question';
        } else if (hasMatchingPairs && !hasOptions) {
          qType = 'matching';
        } else if (
          rawKey === 'BENAR' ||
          rawKey === 'SALAH' ||
          rawKey === 'TRUE' ||
          rawKey === 'FALSE' ||
          (rawKey === 'B' && !hasOptions) ||
          (rawKey === 'S' && !hasOptions)
        ) {
          qType = 'true_false';
        } else if (
          !hasOptions &&
          (Boolean(getVal('kuncijawabansingkat', 'kuncisingkat', 'jawabansingkat')) || rawKey.length > 1)
        ) {
          qType = 'short_answer';
        } else {
          qType = 'multiple_choice';
        }
      }

      // 2. Extract Question / statement text
      const questionText = getVal(
        'pertanyaansoal',
        'pernyataansoal',
        'instruksisoalmenjodohkan',
        'pertanyaaninstruksi',
        'pertanyaan',
        'pernyataan',
        'instruksi',
        'soal',
        'question',
        'prompt',
        'teks'
      );

      if (!questionText) {
        invalidCount++;
        return;
      }

      // 3. Extract Points & Explanation
      const rawPoints = Number(getVal('poin', 'point', 'points', 'skor', 'nilai', 'bobot') || 20);
      const points = isNaN(rawPoints) || rawPoints <= 0 ? 20 : rawPoints;
      const explanation =
        getVal('pembahasan', 'penjelasan', 'keterangan', 'alasan', 'explanation', 'catatan') || undefined;

      const qId = `q_${Date.now()}_${sheetName}_${rowIdx}`;

      // 4. Construct Question based on detected type
      if (qType === 'true_false') {
        const rawKey = getVal(
          'kuncijawabanbenarsalah',
          'kuncijawaban',
          'kuncibenarsalah',
          'kunci',
          'jawaban',
          'key'
        ).toUpperCase();

        const correctBool = !(
          rawKey.includes('SALAH') ||
          rawKey === 'FALSE' ||
          rawKey === '0' ||
          rawKey === 'S' ||
          rawKey === 'TIDAK'
        );

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
          const premise = getVal(
            `premis${i}kiri`,
            `premis${i}`,
            i === 1 ? 'pilihanapremis1' : i === 2 ? 'pilihancpremis2' : '',
            `kiri${i}`
          );
          const match = getVal(
            `pasangan${i}kanan`,
            `pasangan${i}`,
            i === 1 ? 'pilihanbpasangan1' : i === 2 ? 'pilihandpasangan2' : '',
            `kanan${i}`
          );

          if (premise && match) {
            pairs.push({
              id: `p_${Date.now()}_${i}`,
              premise,
              match,
            });
          }
        }

        if (pairs.length === 0) {
          // Fallback if matching was structured differently
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
        const correctText = getVal(
          'kuncijawabansingkat',
          'kuncisingkat',
          'jawabansingkat',
          'kuncijawaban',
          'kunci',
          'jawaban',
          'answer',
          'key'
        );

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
        const rawImg = getVal(
          'urlgambarkhususbergambar',
          'urlgambar',
          'imageurl',
          'linkgambar',
          'gambarurl',
          'linkfoto',
          'urlfoto',
          'gambar',
          'foto'
        );
        const imageUrl = isValidImageUrl(rawImg)
          ? rawImg
          : 'https://images.unsplash.com/photo-1509228468518-180dd4864904?w=500&auto=format&fit=crop&q=60';

        const optA = getVal('pilihana', 'opsia', 'a') || 'Pilihan A';
        const optB = getVal('pilihanb', 'opsib', 'b') || 'Pilihan B';
        const optC = getVal('pilihanc', 'opsic', 'c') || 'Pilihan C';
        const optD = getVal('pilihand', 'opsid', 'd') || 'Pilihan D';

        const rawKey = getVal('kuncijawabanabcd', 'kuncijawaban', 'kunci', 'jawaban', 'key').toUpperCase();
        let correctAnswer = 0;
        if (rawKey.includes('B') || rawKey === '1' || rawKey === '2') correctAnswer = 1;
        else if (rawKey.includes('C') || rawKey === '2' || rawKey === '3') correctAnswer = 2;
        else if (rawKey.includes('D') || rawKey === '3' || rawKey === '4') correctAnswer = 3;

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
        const optA = getVal('pilihana', 'opsia', 'a', 'pilihanapremis1') || 'Pilihan A';
        const optB = getVal('pilihanb', 'opsib', 'b', 'pilihanbpasangan1') || 'Pilihan B';
        const optC = getVal('pilihanc', 'opsic', 'c', 'pilihancpremis2') || 'Pilihan C';
        const optD = getVal('pilihand', 'opsid', 'd', 'pilihandpasangan2') || 'Pilihan D';

        const rawKey = getVal('kuncijawabanabcd', 'kuncijawaban', 'kunci', 'jawaban', 'key').toUpperCase();
        let correctAnswer = 0;
        if (rawKey.includes('B') || rawKey === '1' || rawKey === '2') correctAnswer = 1;
        else if (rawKey.includes('C') || rawKey === '2' || rawKey === '3') correctAnswer = 2;
        else if (rawKey.includes('D') || rawKey === '3' || rawKey === '4') correctAnswer = 3;

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
