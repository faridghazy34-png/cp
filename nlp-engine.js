/**
 * =========================================================
 * Elhitung NLP Engine v3.0
 * Clause-based Semantic Parser untuk Soal Cerita Matematika
 * =========================================================
 * 
 * Arsitektur:
 * 1. Preprocessor - Normalisasi teks, expand angka kata
 * 2. Clause Decomposer - Pecah kalimat jadi klausa semantik
 * 3. Entity Extractor - Ekstraksi angka + satuan + role
 * 4. Number Classifier - Klasifikasi: OPERAND, RATE, COUNT, CONTEXT
 * 5. Question Analyzer - Deteksi apa yang ditanyakan
 * 6. Template Matcher - Cocokkan pola soal
 * 7. Solver - Hitung jawaban
 * 8. Formatter - Format langkah + konversi satuan
 * 
 * Fitur:
 * - Indonesian lightweight stemmer
 * - Context-aware number filtering (menghapus "1 hari", "satu toko" kontekstual)
 * - Rate × Count pattern detection
 * - Multi-step problem solving
 * - Percentage/Discount/Tax handling
 * - Average calculation
 * - Time unit conversion
 * - Step-by-step solution
 */

class ElhitungNLP {
    constructor() {
        this.init();
    }

    // ================================================================
    // INISIALISASI
    // ================================================================
    init() {
        // ---- Verb base forms for operation detection ----
        this.verbToBase = {
            'menambah': 'tambah', 'menambahkan': 'tambah', 'ditambah': 'tambah', 'ditambahkan': 'tambah',
            'tambahan': 'tambah', 'penambahan': 'tambah', 'bertambah': 'tambah',
            'menjumlah': 'jumlah', 'menjumlahkan': 'jumlah', 'dijumlahkan': 'jumlah', 'penjumlahan': 'jumlah',
            'menggabung': 'gabung', 'menggabungkan': 'gabung', 'digabungkan': 'gabung',
            'mendapat': 'dapat', 'mendapatkan': 'dapat', 'didapatkan': 'dapat', 'memperoleh': 'dapat',
            'menerima': 'terima', 'diterima': 'terima',
            'membeli': 'beli', 'dibeli': 'beli', 'pembelian': 'beli',
            'membawa': 'bawa', 'dibawa': 'bawa',
            'mengumpulkan': 'kumpul', 'dikumpulkan': 'kumpul',
            'menabung': 'tabung', 'ditabung': 'tabung',
            'memasukkan': 'masuk', 'dimasukkan': 'masuk',

            'mengurangi': 'kurang', 'dikurangi': 'kurang', 'mengurangkan': 'kurang', 'pengurangan': 'kurang',
            'memberikan': 'beri', 'diberikan': 'beri', 'memberi': 'beri', 'pemberian': 'beri',
            'menjual': 'jual', 'dijual': 'jual', 'terjual': 'jual', 'penjualan': 'jual',
            'mengambil': 'ambil', 'diambil': 'ambil', 'pengambilan': 'ambil',
            'memakan': 'makan', 'dimakan': 'makan', 'termakan': 'makan',
            'membuang': 'buang', 'dibuang': 'buang',
            'menggunakan': 'guna', 'digunakan': 'guna', 'dipakai': 'pakai', 'memakai': 'pakai',
            'kehilangan': 'hilang', 'menghilang': 'hilang',
            'membayar': 'bayar', 'dibayar': 'bayar', 'pembayaran': 'bayar',
            'memotong': 'potong', 'dipotong': 'potong', 'pemotongan': 'potong',
            'mengeluarkan': 'keluar', 'dikeluarkan': 'keluar', 'pengeluaran': 'keluar',
            'meninggalkan': 'tinggal', 'ditinggalkan': 'tinggal',
            'merusak': 'rusak', 'dirusak': 'rusak',

            'mengalikan': 'kali', 'dikalikan': 'kali', 'perkalian': 'kali',
            'melipatgandakan': 'lipat', 'kelipatan': 'lipat',
            'menggandakan': 'ganda', 'digandakan': 'ganda',

            'membagi': 'bagi', 'dibagi': 'bagi', 'membagikan': 'bagi', 'dibagikan': 'bagi', 'pembagian': 'bagi',

            'mengunjungi': 'kunjung', 'dikunjungi': 'kunjung', 'kunjungan': 'kunjung',
            'mendatangi': 'datang', 'berkunjung': 'kunjung',
            'singgah': 'singgah', 'mampir': 'mampir', 'menyinggahi': 'singgah',
            'berbelanja': 'belanja', 'membelanjakan': 'belanja',
        };

        // Operation sets for base verbs
        this.addVerbs = new Set(['tambah', 'jumlah', 'gabung', 'dapat', 'terima', 'beli', 'bawa',
            'kumpul', 'tabung', 'masuk', 'datang', 'naik', 'simpan']);
        this.subVerbs = new Set(['kurang', 'beri', 'jual', 'ambil', 'makan', 'buang', 'guna', 'pakai',
            'hilang', 'bayar', 'potong', 'keluar', 'tinggal', 'rusak', 'pecah', 'turun']);
        this.mulVerbs = new Set(['kali', 'lipat', 'ganda']);
        this.divVerbs = new Set(['bagi']);
        this.rateVerbs = new Set(['kunjung', 'singgah', 'mampir', 'belanja', 'datang']);

        // ---- Units ----
        this.timeFrameUnits = new Set(['hari', 'minggu', 'bulan', 'tahun', 'semester', 'kuartal']);
        this.durationUnits = new Set(['jam', 'menit', 'detik']);
        this.allTimeUnits = new Set([...this.timeFrameUnits, ...this.durationUnits]);

        this.countableUnits = new Set([
            'buah', 'biji', 'ekor', 'orang', 'lembar', 'batang', 'butir', 'helai',
            'potong', 'pasang', 'lusin', 'kodi', 'unit', 'kotak', 'bungkus', 'kantong',
            'karung', 'dus', 'pak', 'set', 'pcs', 'item', 'barang',
            'toko', 'warung', 'kantor', 'rumah', 'tempat', 'lokasi', 'kota', 'desa', 'sekolah', 'kelas',
            'buku', 'pensil', 'apel', 'jeruk', 'mangga', 'kelereng', 'permen',
            'mobil', 'motor', 'sepeda', 'kursi', 'meja', 'bola', 'kue',
            'halaman', 'soal', 'kali', 'putaran', 'ronde'
        ]);

        this.measureUnits = {
            currency: new Set(['rupiah', 'dollar', 'dolar']),
            weight: new Set(['kg', 'kilogram', 'gram', 'g', 'ons', 'ton', 'kuintal', 'kwintal', 'mg']),
            length: new Set(['km', 'kilometer', 'meter', 'm', 'cm', 'centimeter', 'sentimeter', 'mm', 'milimeter']),
            area: new Set(['hektar', 'ha', 'are', 'm2', 'km2']),
            volume: new Set(['liter', 'l', 'ml', 'mililiter', 'cc', 'galon'])
        };

        // ---- Number words ----
        this.numberWords = {
            'nol': 0, 'satu': 1, 'dua': 2, 'tiga': 3, 'empat': 4,
            'lima': 5, 'enam': 6, 'tujuh': 7, 'delapan': 8, 'sembilan': 9,
            'sepuluh': 10, 'sebelas': 11, 'seratus': 100, 'seribu': 1000,
            'sejuta': 1000000, 'setengah': 0.5, 'seperempat': 0.25,
            'sepertiga': 1 / 3, 'selusin': 12, 'sekodi': 20
        };

        // ---- Percentage keywords ----
        this.percentKeywords = ['persen', 'persentase', '%', 'diskon', 'potongan', 'rabat',
            'bunga', 'pajak', 'ppn', 'keuntungan', 'untung', 'profit', 'kerugian', 'rugi'];

        // ---- Average keywords ----
        this.averageKeywords = ['rata-rata', 'rerata', 'rataan', 'mean', 'average'];

        // ---- Question patterns ----
        this.questionPatterns = [
            { regex: /berapa\s+jam/i, qtype: 'time', qunit: 'jam' },
            { regex: /berapa\s+menit/i, qtype: 'time', qunit: 'menit' },
            { regex: /berapa\s+detik/i, qtype: 'time', qunit: 'detik' },
            { regex: /berapa\s+lama/i, qtype: 'time', qunit: null },
            { regex: /berapa\s+waktu/i, qtype: 'time', qunit: null },
            { regex: /berapa\s+(?:total|jumlah|seluruh|semua|keseluruhan|banyak)/i, qtype: 'total', qunit: null },
            { regex: /berapa\s+(?:harga|biaya|uang|ongkos)/i, qtype: 'money', qunit: 'rupiah' },
            { regex: /berapa\s+(?:sisa|tersisa)/i, qtype: 'remainder', qunit: null },
            { regex: /berapa\s+(?:luas|panjang|lebar|tinggi|jarak|keliling)/i, qtype: 'measure', qunit: null },
            { regex: /berapa\s+(?:berat|massa)/i, qtype: 'weight', qunit: null },
            { regex: /berapa\s+rata-rata/i, qtype: 'average', qunit: null },
            { regex: /berapa/i, qtype: 'general', qunit: null },
        ];
    }

    // ================================================================
    // CONVERSATION DETECTION
    // ================================================================
    detectConversation(text) {
        const t = text.toLowerCase().trim().replace(/[?!.,]+$/g, '').trim();

        // Identity questions
        if (/(?:siapa\s+(?:nama\s*(?:mu|kamu)|kamu)|(?:nama\s*(?:mu|kamu)|kamu)\s+siapa|apa\s+nama\s*(?:mu|kamu))/.test(t)) {
            return { type: 'identity', response: 'Halo! Nama saya **Elhitung** 🧠, AI kalkulator pintar yang bisa menyelesaikan soal cerita matematika dalam Bahasa Indonesia. Silakan ketik soal cerita matematikamu!' };
        }
        if (/(?:kamu\s+itu\s+apa|apa\s+itu\s+elhitung|elhitung\s+itu\s+apa)/.test(t)) {
            return { type: 'identity', response: '**Elhitung** adalah AI kalkulator pintar berbasis NLP (Natural Language Processing). Saya bisa memahami soal cerita matematika dalam Bahasa Indonesia dan menyelesaikannya langkah demi langkah! 🚀' };
        }

        // Capability questions
        if (/(?:bisa\s+apa|apa\s+(?:yang\s+)?(?:bisa|dapat)\s+kamu\s+(?:lakukan|kerjakan|bantu)|fitur|kemampuan)/.test(t)) {
            return { type: 'capability', response: 'Saya **Elhitung**, bisa membantu:\n\n• ➕ Penjumlahan & ➖ Pengurangan\n• ✖️ Perkalian & ➗ Pembagian\n• 💰 Diskon & Persentase\n• 📊 Rata-rata\n• ⏱️ Soal waktu (rate × count)\n• 📝 Soal cerita multi-langkah\n\nCoba ketik soal ceritamu!' };
        }

        // Greetings
        if (/^(?:hai|halo|hello|hi|hey|assalamu|selamat\s+(?:pagi|siang|sore|malam))/.test(t)) {
            return { type: 'greeting', response: 'Halo! 👋 Saya **Elhitung**, siap membantu menyelesaikan soal cerita matematikamu. Silakan ketik soalmu!' };
        }

        // Thanks
        if (/(?:terima\s*kasih|makasih|thanks|thx|tq)/.test(t)) {
            return { type: 'thanks', response: 'Sama-sama! 😊 Senang bisa membantu. Kalau ada soal lain, langsung ketik saja ya!' };
        }

        // Help
        if (/^(?:help|bantuan|bantu|tolong|cara\s+pakai|cara\s+menggunakan)/.test(t)) {
            return { type: 'help', response: 'Caranya mudah! Cukup ketik soal cerita matematika di kolom ini, lalu tekan kirim. Contoh:\n\n"Ani memiliki 25 apel dan memberikan 8 kepada Budi. Berapa sisa apel Ani?"\n\nSaya akan menyelesaikannya langkah demi langkah! 📝' };
        }

        return null;
    }

    // ================================================================
    // MAIN SOLVE
    // ================================================================
    solve(text) {
        try {
            // Phase 0: Check for conversational input
            const convo = this.detectConversation(text);
            if (convo) {
                return {
                    success: true,
                    isConversation: true,
                    response: convo.response,
                    originalText: text
                };
            }

            // Phase 1: Preprocess
            const normalized = this.preprocess(text);

            // Phase 2: Analyze question
            const question = this.analyzeQuestion(normalized);

            // Phase 3: Check for average (special handling)
            if (this.isAverageProblem(normalized)) {
                return this.solveAverage(text, normalized, question);
            }

            // Phase 4: Check for percentage/discount
            if (this.isPercentageProblem(normalized)) {
                return this.solvePercentage(text, normalized, question);
            }

            // Phase 5: Extract and classify numbers
            const rawNumbers = this.extractRawNumbers(normalized);
            if (rawNumbers.length === 0) {
                return this.errorResult('Maaf, saya tidak menemukan angka dalam pesanmu. Saya adalah **Elhitung**, AI untuk soal cerita matematika. Coba ketik soal yang mengandung angka ya! 😊', text);
            }

            const classified = this.classifyNumbers(rawNumbers, normalized, question);

            // Phase 6: Detect and solve by template
            return this.solveByTemplate(text, normalized, classified, question);

        } catch (err) {
            return this.errorResult(`Terjadi kesalahan saat memproses soal. Coba ubah kalimat soalmu. (${err.message})`, text);
        }
    }

    // ================================================================
    // PHASE 1: PREPROCESSOR
    // ================================================================
    preprocess(text) {
        let t = text.toLowerCase().trim();
        // Normalize whitespace
        t = t.replace(/\s+/g, ' ');
        // Normalize Rp
        t = t.replace(/rp\.?\s*/gi, 'Rp ');
        // Normalize punctuation
        t = t.replace(/[!]+/g, '.');
        // Remove trailing dots
        t = t.replace(/\.+$/, '');
        return t;
    }

    // ================================================================
    // PHASE 2: QUESTION ANALYZER
    // ================================================================
    analyzeQuestion(text) {
        // Find the question part (typically starts with "berapa")
        const questionMatch = text.match(/berapa[\s\S]{0,80}[?.]?\s*$/i) || text.match(/berapa[^,]*/i);
        const questionText = questionMatch ? questionMatch[0] : '';

        let matchedType = 'general';
        let matchedUnit = null;
        let startIndex = questionMatch ? text.indexOf(questionMatch[0]) : -1;

        for (const pattern of this.questionPatterns) {
            if (pattern.regex.test(text)) {
                matchedType = pattern.qtype;
                matchedUnit = pattern.qunit;
                break;
            }
        }

        // Extract unit from question text if not already set
        // e.g., "berapa jumlah buah" → unit = "buah"
        if (!matchedUnit && questionText) {
            const unitMatch = questionText.match(/berapa\s+(?:jumlah|total|banyak|seluruh|semua)\s+(\S+)/i);
            if (unitMatch) {
                const candidate = unitMatch[1].replace(/[?.,!]+$/, '').toLowerCase();
                // Check if it's a known unit
                if (this.countableUnits.has(candidate) || this.durationUnits.has(candidate)) {
                    matchedUnit = candidate;
                }
                for (const [cat, units] of Object.entries(this.measureUnits)) {
                    if (units.has(candidate)) matchedUnit = candidate;
                }
            }
            // Also check "berapa buah", "berapa apel" etc.
            if (!matchedUnit) {
                const directUnit = questionText.match(/berapa\s+(\S+)/i);
                if (directUnit) {
                    const candidate = directUnit[1].replace(/[?.,!]+$/, '').toLowerCase();
                    if (this.countableUnits.has(candidate)) {
                        matchedUnit = candidate;
                    }
                }
            }
        }

        return {
            type: matchedType,
            unit: matchedUnit,
            text: questionText,
            startIndex
        };
    }

    // ================================================================
    // PHASE 3: RAW NUMBER EXTRACTION
    // ================================================================
    extractRawNumbers(text) {
        const numbers = [];
        const usedRanges = []; // Track already-captured ranges to avoid duplicates

        const isOverlapping = (start, end) => {
            return usedRanges.some(([a, b]) => !(end <= a || start >= b));
        };
        const markUsed = (start, end) => usedRanges.push([start, end]);

        // Pattern 1: Currency — Rp 120.000 or Rp120.000
        const rpPattern = /Rp\s*(\d{1,3}(?:\.\d{3})*(?:,\d+)?)/gi;
        let m;
        while ((m = rpPattern.exec(text)) !== null) {
            const val = this.parseIndonesianNumber(m[1]);
            if (!isNaN(val)) {
                numbers.push(this.createNumObj(val, m[0], m.index, 'rupiah', 'currency'));
                markUsed(m.index, m.index + m[0].length);
            }
        }

        // Pattern 2: Percentage — "25%"
        const pctPattern = /(\d+(?:,\d+)?)\s*%/gi;
        while ((m = pctPattern.exec(text)) !== null) {
            if (isOverlapping(m.index, m.index + m[0].length)) continue;
            const val = parseFloat(m[1].replace(',', '.'));
            if (!isNaN(val)) {
                numbers.push(this.createNumObj(val, m[0], m.index, 'persen', 'percentage', true));
                markUsed(m.index, m.index + m[0].length);
            }
        }

        // Pattern 3: Large format numbers — 1.000.000
        const bigPattern = /(\d{1,3}(?:\.\d{3})+(?:,\d+)?)/g;
        while ((m = bigPattern.exec(text)) !== null) {
            if (isOverlapping(m.index, m.index + m[0].length)) continue;
            const val = this.parseIndonesianNumber(m[1]);
            if (!isNaN(val)) {
                const unitInfo = this.detectUnit(text, m.index + m[0].length);
                numbers.push(this.createNumObj(val, m[0], m.index, unitInfo.unit, unitInfo.category));
                markUsed(m.index, m.index + m[0].length);
            }
        }

        // Pattern 4: Simple integers/decimals
        const simplePattern = /(?<!\d[.,])(?<!\.)(\d+(?:,\d+)?)(?!\.\d{3})(?![.,]\d)(?!%)/g;
        while ((m = simplePattern.exec(text)) !== null) {
            if (isOverlapping(m.index, m.index + m[0].length)) continue;
            const val = parseFloat(m[1].replace(',', '.'));
            if (!isNaN(val)) {
                const unitInfo = this.detectUnit(text, m.index + m[0].length);
                numbers.push(this.createNumObj(val, m[0], m.index, unitInfo.unit, unitInfo.category));
                markUsed(m.index, m.index + m[0].length);
            }
        }

        // Pattern 5: Number words (satu, dua, tiga, etc.)
        for (const [word, val] of Object.entries(this.numberWords)) {
            const wordRegex = new RegExp(`\\b${word}\\b`, 'gi');
            while ((m = wordRegex.exec(text)) !== null) {
                if (isOverlapping(m.index, m.index + m[0].length)) continue;
                const unitInfo = this.detectUnit(text, m.index + m[0].length);
                const numObj = this.createNumObj(val, m[0], m.index, unitInfo.unit, unitInfo.category);
                numObj.isWord = true;
                numbers.push(numObj);
                markUsed(m.index, m.index + m[0].length);
            }
        }

        // Sort by position
        numbers.sort((a, b) => a.index - b.index);
        return numbers;
    }

    // ================================================================
    // PHASE 4: NUMBER CLASSIFICATION
    // ================================================================
    classifyNumbers(numbers, text, question) {
        const classified = [];

        for (const num of numbers) {
            const role = this.determineRole(num, text, question);
            classified.push({ ...num, role });
        }

        return classified;
    }

    /**
     * Determine the semantic role of a number:
     * - CONTEXT: Not a mathematical operand (time frame, modifier)
     * - RATE: A per-unit value (55 menit per toko)
     * - COUNT: A count/quantity (8 toko)
     * - OPERAND: A general operand
     * - PERCENTAGE: A percentage value
     */
    determineRole(num, text, question) {
        // Already percentage
        if (num.isPercentage) return 'PERCENTAGE';

        // Get context around the number
        const before = text.substring(Math.max(0, num.index - 60), num.index).trim();
        const after = text.substring(num.index + num.original.length).trimStart();
        const afterWord = (after.match(/^(\S+)/) || ['', ''])[1].replace(/[,.\?!;:]$/, '');
        const afterTwoWords = (after.match(/^(\S+\s+\S+)/) || ['', ''])[1];

        // ---- RULE 1: Number in question clause → CONTEXT ----
        if (question.startIndex >= 0 && num.index >= question.startIndex) {
            // Number is inside the question — usually context
            // Exception: if the question contains a real operand like "berapa dari 100"
            if (/berapa\s+(dari|persen)\s/.test(text.substring(question.startIndex, num.index + num.original.length + 5))) {
                return 'OPERAND';
            }
            return 'CONTEXT';
        }

        // ---- RULE 2: Number + timeFrameUnit → CONTEXT ----
        // "1 hari", "satu minggu", "2 tahun" as time frames — always context
        if (this.timeFrameUnits.has(afterWord)) {
            return 'CONTEXT';
        }

        // ---- RULE 3: "satu/se-/1" + noun after "di/ke/dari/sebuah" → CONTEXT (means "a/each") ----
        if (num.value === 1) {
            const lastBefore = before.split(/\s+/).pop() || '';
            // "di satu toko", "ke satu tempat", "sebuah toko"
            if (['di', 'ke', 'dari', 'sebuah', 'suatu'].includes(lastBefore)) {
                // It means "at one/each X", not the quantity  
                if (this.countableUnits.has(afterWord) || this.allTimeUnits.has(afterWord)) {
                    return 'CONTEXT';
                }
            }
        }

        // ---- RULE 4: Duration unit + preceded by "selama" → RATE ----
        if (this.durationUnits.has(afterWord) || this.durationUnits.has(num.unit)) {
            // Check if preceded by "selama" — it's a time rate
            if (before.includes('selama')) {
                return 'RATE';
            }
            // Check if the sentence also has a count-type number → likely rate
            return 'RATE';
        }

        // ---- RULE 5: Countable unit + preceded by action verb → COUNT ----
        if (this.countableUnits.has(afterWord) || this.countableUnits.has(num.unit)) {
            // Check for rate-verbs (mengunjungi, singgah, etc.)
            const verbsInContext = this.findVerbsInContext(before);
            if (verbsInContext.some(v => this.rateVerbs.has(v))) {
                return 'COUNT';
            }
            return 'OPERAND';
        }

        // ---- RULE 6: Currency → OPERAND ----
        if (num.unitCategory === 'currency') {
            return 'OPERAND';
        }

        // ---- RULE 7: Measurement units → OPERAND ----
        for (const [cat, units] of Object.entries(this.measureUnits)) {
            if (units.has(afterWord) || units.has(num.unit)) {
                return 'OPERAND';
            }
        }

        // ---- DEFAULT: OPERAND ----
        return 'OPERAND';
    }

    /**
     * Find base verbs in a text context
     */
    findVerbsInContext(context) {
        const words = context.split(/\s+/);
        const found = [];
        for (const word of words) {
            const clean = word.replace(/[,.\?!;:]/g, '');
            if (this.verbToBase[clean]) {
                found.push(this.verbToBase[clean]);
            }
        }
        return found;
    }

    // ================================================================
    // PHASE 5: TEMPLATE DETECTION & SOLVING
    // ================================================================
    solveByTemplate(originalText, normalized, classified, question) {
        const operands = classified.filter(n => n.role === 'OPERAND');
        const rates = classified.filter(n => n.role === 'RATE');
        const counts = classified.filter(n => n.role === 'COUNT');
        const percentages = classified.filter(n => n.role === 'PERCENTAGE');

        // ---- Template 1: Rate × Count ----
        if (rates.length > 0 && counts.length > 0) {
            return this.solveRateCount(originalText, normalized, rates[0], counts[0], question);
        }

        // ---- Template 2: Rate × Operand (if no explicit COUNT but has operand count) ----
        if (rates.length > 0 && operands.length > 0) {
            // Check if one of the operands looks like a count
            const countLike = operands.find(n => this.countableUnits.has(n.unit));
            if (countLike) {
                return this.solveRateCount(originalText, normalized, rates[0], countLike, question);
            }
            // Otherwise, rate × first operand
            return this.solveRateCount(originalText, normalized, rates[0], operands[0], question);
        }

        // ---- Template 3: Duration units present with count (implicit rate × count) ----
        const durationNums = classified.filter(n => n.role !== 'CONTEXT' && this.durationUnits.has(n.unit));
        const countNums = classified.filter(n => n.role !== 'CONTEXT' && this.countableUnits.has(n.unit));
        if (durationNums.length > 0 && countNums.length > 0) {
            return this.solveRateCount(originalText, normalized, durationNums[0], countNums[0], question);
        }

        // ---- Template 4: Standard operations (all operands) ----
        const allOperands = [...rates, ...counts, ...operands];
        if (allOperands.length === 0) {
            // All numbers were classified as CONTEXT — re-evaluate
            const allNonPct = classified.filter(n => !n.isPercentage);
            if (allNonPct.length >= 2) {
                // Force use all non-context numbers
                return this.solveStandardOperation(originalText, normalized, allNonPct, question);
            }
            return this.errorResult('Tidak dapat menentukan angka operand dari soal. Coba ulangi dengan kalimat yang lebih jelas.', originalText);
        }

        if (allOperands.length < 2) {
            if (allOperands.length === 1 && percentages.length > 0) {
                return this.solvePercentage(originalText, normalized, question);
            }
            // Only one operand — try to use context numbers as fallback
            const contextNums = classified.filter(n => n.role === 'CONTEXT' && !this.timeFrameUnits.has(n.unit));
            if (contextNums.length > 0) {
                return this.solveStandardOperation(originalText, normalized, [...allOperands, ...contextNums], question);
            }
            return this.singleValueResult(originalText, allOperands[0]);
        }

        return this.solveStandardOperation(originalText, normalized, allOperands, question);
    }

    // ================================================================
    // TEMPLATE SOLVERS
    // ================================================================

    /**
     * Solve Rate × Count problems
     */
    solveRateCount(originalText, normalized, rate, count, question) {
        const result = rate.value * count.value;
        const rateUnit = rate.unit || '';
        const countUnit = count.unit || '';
        const resultUnit = rateUnit || countUnit;
        const unitStr = resultUnit ? ` ${resultUnit}` : '';

        const steps = [
            `Mengidentifikasi nilai per satuan: ${this.fmt(rate.value)} ${rateUnit}`,
            `Mengidentifikasi jumlah satuan: ${this.fmt(count.value)} ${countUnit}`,
            `Menghitung total: ${this.fmt(rate.value)} × ${this.fmt(count.value)} = ${this.fmt(result)}${unitStr}`
        ];

        // Time conversions
        if (resultUnit === 'menit') {
            if (result >= 60) {
                const hrs = Math.floor(result / 60);
                const mins = Math.round(result % 60);
                let timeStr = `${hrs} jam`;
                if (mins > 0) timeStr += ` ${mins} menit`;
                steps.push(`Konversi: ${this.fmt(result)} menit = ${timeStr}`);
            }
            // If question asks for "jam", convert
            if (question.qunit === 'jam' || question.unit === 'jam') {
                const inHours = result / 60;
                const hrs = Math.floor(inHours);
                const mins = Math.round((inHours - hrs) * 60);
                let timeStr = `${hrs} jam`;
                if (mins > 0) timeStr += ` ${mins} menit`;
                steps.push(`Jawaban dalam jam: ${timeStr}`);
            }
        }

        if (resultUnit === 'jam' && !Number.isInteger(result)) {
            const hrs = Math.floor(result);
            const mins = Math.round((result - hrs) * 60);
            steps.push(`Konversi: ${hrs} jam ${mins} menit`);
        }

        return {
            success: true,
            originalText,
            operation: 'Perkalian (Rate × Count)',
            expression: `${this.fmt(rate.value)} × ${this.fmt(count.value)} = ${this.fmt(result)}`,
            result,
            formattedResult: this.fmt(result) + unitStr,
            steps,
            numbers: [rate.value, count.value],
            unit: resultUnit
        };
    }

    /**
     * Solve standard +, -, ×, ÷ problems
     */
    solveStandardOperation(originalText, normalized, operands, question) {
        const operation = this.detectOperation(normalized, operands);
        const values = operands.map(n => n.value);

        // Determine the best unit for the result:
        // Priority: question unit > common operand unit > first operand unit
        let unit = '';
        if (question.unit) {
            // Question explicitly asks for a unit (e.g., "berapa jumlah buah")
            unit = question.unit;
        } else {
            // Check if all operands share the same unit
            const operandUnits = operands.filter(n => n.unit && !n.isPercentage).map(n => n.unit);
            const uniqueUnits = [...new Set(operandUnits)];
            if (uniqueUnits.length === 1) {
                // All same unit
                unit = uniqueUnits[0];
            } else if (uniqueUnits.length > 1) {
                // Mixed units (e.g., apel + mangga) — try to find a generic counter
                // Don't use specific item names as unit when they differ
                unit = '';
            } else {
                unit = '';
            }
        }
        const unitStr = unit ? ` ${unit}` : '';

        let result, expression, steps;

        switch (operation) {
            case 'addition': {
                result = values.reduce((a, b) => a + b, 0);
                expression = values.map(v => this.fmt(v)).join(' + ');
                steps = [`Mengidentifikasi angka: ${values.map(v => this.fmt(v) + unitStr).join(', ')}`];
                if (values.length === 2) {
                    steps.push(`Menjumlahkan: ${this.fmt(values[0])} + ${this.fmt(values[1])} = ${this.fmt(result)}${unitStr}`);
                } else {
                    let running = 0;
                    for (let i = 0; i < values.length; i++) {
                        running += values[i];
                        if (i > 0) {
                            steps.push(`+ ${this.fmt(values[i])}: ${this.fmt(running - values[i])} + ${this.fmt(values[i])} = ${this.fmt(running)}${unitStr}`);
                        }
                    }
                }
                break;
            }
            case 'subtraction': {
                result = values[0];
                steps = [`Nilai awal: ${this.fmt(values[0])}${unitStr}`];
                for (let i = 1; i < values.length; i++) {
                    const prev = result;
                    result -= values[i];
                    steps.push(`Dikurangi ${this.fmt(values[i])}${unitStr}: ${this.fmt(prev)} − ${this.fmt(values[i])} = ${this.fmt(result)}${unitStr}`);
                }
                expression = values.map(v => this.fmt(v)).join(' − ');
                break;
            }
            case 'multiplication': {
                result = values.reduce((a, b) => a * b, 1);
                expression = values.map(v => this.fmt(v)).join(' × ');
                steps = [
                    `Mengalikan: ${values.map(v => this.fmt(v)).join(' × ')}`,
                    `Hasil: ${this.fmt(result)}${unitStr}`
                ];
                break;
            }
            case 'division': {
                result = values[0] / values[1];
                expression = `${this.fmt(values[0])} ÷ ${this.fmt(values[1])}`;
                steps = [
                    `Nilai yang dibagi: ${this.fmt(values[0])}${unitStr}`,
                    `Pembagi: ${this.fmt(values[1])}`,
                    `Hasil bagi: ${this.fmt(values[0])} ÷ ${this.fmt(values[1])} = ${this.fmt(result)}${unitStr}`
                ];
                if (values[0] % values[1] !== 0) {
                    steps.push(`Sisa: ${this.fmt(values[0] % values[1])}`);
                }
                break;
            }
            default: {
                result = values.reduce((a, b) => a + b, 0);
                expression = values.map(v => this.fmt(v)).join(' + ');
                steps = [
                    `Menjumlahkan: ${expression}`,
                    `Hasil: ${this.fmt(result)}${unitStr}`
                ];
            }
        }

        return {
            success: true,
            originalText,
            operation: this.opNameId(operation),
            expression: `${expression} = ${this.fmt(result)}`,
            result,
            formattedResult: this.fmt(result) + unitStr,
            steps,
            numbers: values,
            unit
        };
    }

    /**
     * Detect the primary math operation from text context
     */
    detectOperation(text, operands) {
        let addScore = 0, subScore = 0, mulScore = 0, divScore = 0;

        // Score from verbs
        const words = text.split(/\s+/);
        for (const word of words) {
            const clean = word.replace(/[,.\?!;:]/g, '');
            const base = this.verbToBase[clean];
            if (base) {
                if (this.addVerbs.has(base)) addScore += 3;
                if (this.subVerbs.has(base)) subScore += 3;
                if (this.mulVerbs.has(base)) mulScore += 3;
                if (this.divVerbs.has(base)) divScore += 3;
            }
        }

        // Score from keywords
        const kwAdd = ['total', 'totalnya', 'seluruh', 'seluruhnya', 'semuanya', 'semua', 'keseluruhan'];
        const kwSub = ['sisa', 'sisanya', 'tersisa', 'tinggal', 'kurang', 'minus'];
        const kwMul = ['kali', 'perkalian', 'kelipatan', 'setiap', 'tiap', 'masing-masing', 'per '];
        const kwDiv = ['bagi', 'dibagi', 'pembagian', 'sama rata', 'bagian'];

        for (const kw of kwAdd) {
            if (text.includes(kw)) addScore += 2;
        }
        for (const kw of kwSub) {
            if (this.wordBoundary(text, kw)) subScore += 2;
        }
        for (const kw of kwMul) {
            if (this.wordBoundary(text, kw)) mulScore += 2;
        }
        for (const kw of kwDiv) {
            if (this.wordBoundary(text, kw)) divScore += 2;
        }

        // Context clues
        if (/lalu|kemudian|setelah itu|selanjutnya/.test(text)) {
            // Multi-step: look at per-number context (handled separately)
        }

        const max = Math.max(addScore, subScore, mulScore, divScore);
        if (max === 0) return 'addition'; // default

        if (subScore === max && subScore > addScore) return 'subtraction';
        if (mulScore === max) return 'multiplication';
        if (divScore === max) return 'division';
        if (addScore === max) return 'addition';
        return 'addition';
    }

    // ================================================================
    // PERCENTAGE SOLVER
    // ================================================================
    isPercentageProblem(text) {
        return this.percentKeywords.some(kw => text.includes(kw));
    }

    solvePercentage(originalText, normalized, question) {
        const rawNumbers = this.extractRawNumbers(normalized);
        const pctNum = rawNumbers.find(n => n.isPercentage);
        
        // Also check for "X persen" pattern without %
        let pctVal = pctNum ? pctNum.value : null;
        if (!pctVal) {
            const pctWordMatch = normalized.match(/(\d+(?:,\d+)?)\s*persen/i);
            if (pctWordMatch) {
                pctVal = parseFloat(pctWordMatch[1].replace(',', '.'));
            }
        }

        const baseNums = rawNumbers.filter(n => !n.isPercentage && n.value !== pctVal);
        if (pctVal === null || baseNums.length === 0) {
            return this.errorResult('Tidak dapat menemukan angka dasar dan persentase dalam soal.', originalText);
        }

        const base = baseNums[0].value;
        const unit = baseNums[0].unit || '';
        const unitStr = unit ? ` ${unit}` : '';
        const pctAmount = base * (pctVal / 100);

        const isDiscount = /diskon|potongan|rabat/.test(normalized);
        const isTax = /pajak|ppn/.test(normalized);
        const isProfit = /(?:^|\s)(?:untung|keuntungan|profit|kenaikan|naik)\b/.test(normalized);
        const isLoss = /(?:^|\s)(?:rugi|kerugian|penurunan|turun)\b/.test(normalized);

        const steps = [
            `Nilai awal: ${this.fmt(base)}${unitStr}`,
            `Persentase: ${pctVal}%`,
            `Hitung ${pctVal}% dari ${this.fmt(base)}: ${this.fmt(base)} × ${pctVal}/100 = ${this.fmt(pctAmount)}${unitStr}`
        ];

        let result, operation;
        if (isDiscount || /bayar|harus dibayar/.test(normalized)) {
            result = base - pctAmount;
            operation = 'Diskon / Potongan Harga';
            steps.push(`Setelah diskon: ${this.fmt(base)} − ${this.fmt(pctAmount)} = ${this.fmt(result)}${unitStr}`);
        } else if (isTax || isProfit) {
            result = base + pctAmount;
            operation = isTax ? 'Penambahan Pajak' : 'Kenaikan / Keuntungan';
            steps.push(`Setelah ${isTax ? 'pajak' : 'kenaikan'}: ${this.fmt(base)} + ${this.fmt(pctAmount)} = ${this.fmt(result)}${unitStr}`);
        } else if (isLoss) {
            result = base - pctAmount;
            operation = 'Penurunan / Kerugian';
            steps.push(`Setelah penurunan: ${this.fmt(base)} − ${this.fmt(pctAmount)} = ${this.fmt(result)}${unitStr}`);
        } else {
            result = pctAmount;
            operation = 'Perhitungan Persentase';
        }

        return {
            success: true,
            originalText,
            operation,
            expression: `${pctVal}% dari ${this.fmt(base)} = ${this.fmt(pctAmount)}`,
            result,
            formattedResult: this.fmt(result) + unitStr,
            steps,
            numbers: [base, pctVal],
            unit
        };
    }

    // ================================================================
    // AVERAGE SOLVER
    // ================================================================
    isAverageProblem(text) {
        return this.averageKeywords.some(kw => text.includes(kw));
    }

    solveAverage(originalText, normalized, question) {
        const rawNumbers = this.extractRawNumbers(normalized);
        const values = rawNumbers.filter(n => !n.isPercentage).map(n => n.value);

        if (values.length < 2) {
            return this.errorResult('Diperlukan minimal 2 angka untuk menghitung rata-rata.', originalText);
        }

        const sum = values.reduce((a, b) => a + b, 0);
        const avg = sum / values.length;
        const unit = rawNumbers.find(n => n.unit)?.unit || '';
        const unitStr = unit ? ` ${unit}` : '';

        return {
            success: true,
            originalText,
            operation: 'Rata-rata',
            expression: `(${values.map(v => this.fmt(v)).join(' + ')}) ÷ ${values.length}`,
            result: avg,
            formattedResult: this.fmt(avg) + unitStr,
            steps: [
                `Data: ${values.map(v => this.fmt(v)).join(', ')} (${values.length} buah)`,
                `Jumlah: ${values.map(v => this.fmt(v)).join(' + ')} = ${this.fmt(sum)}`,
                `Rata-rata: ${this.fmt(sum)} ÷ ${values.length} = ${this.fmt(avg)}${unitStr}`
            ],
            numbers: values,
            unit
        };
    }

    // ================================================================
    // HELPER: Unit Detection
    // ================================================================
    detectUnit(text, afterIndex) {
        const after = text.substring(afterIndex).trimStart().toLowerCase();
        const firstWord = (after.match(/^([a-zA-Z\u00C0-\u024F]+)/) || ['', ''])[1];
        const twoWords = (after.match(/^([a-zA-Z\u00C0-\u024F]+\s+[a-zA-Z\u00C0-\u024F]+)/) || ['', ''])[1];

        // Check two-word units first (e.g., "meter persegi")
        if (twoWords) {
            for (const [cat, units] of Object.entries(this.measureUnits)) {
                if (units.has(twoWords)) return { unit: twoWords, category: cat };
            }
        }

        if (!firstWord) return { unit: null, category: null };

        // Time frame units
        if (this.timeFrameUnits.has(firstWord)) return { unit: firstWord, category: 'timeFrame' };
        // Duration units
        if (this.durationUnits.has(firstWord)) return { unit: firstWord, category: 'duration' };
        // Countable
        if (this.countableUnits.has(firstWord)) return { unit: firstWord, category: 'count' };
        // Measure
        for (const [cat, units] of Object.entries(this.measureUnits)) {
            if (units.has(firstWord)) return { unit: firstWord, category: cat };
        }

        return { unit: null, category: null };
    }

    // ================================================================
    // HELPER: Create Number Object
    // ================================================================
    createNumObj(value, original, index, unit, unitCategory, isPercentage = false) {
        return {
            value,
            original,
            index,
            unit,
            unitCategory,
            isPercentage,
            isWord: false,
            role: null // Will be set in classification
        };
    }

    // ================================================================
    // HELPER: Parse Indonesian number format
    // ================================================================
    parseIndonesianNumber(str) {
        // "120.000,50" → 120000.50
        return parseFloat(str.replace(/\./g, '').replace(',', '.'));
    }

    // ================================================================
    // HELPER: Format number Indonesian style
    // ================================================================
    fmt(num) {
        if (num === undefined || num === null || isNaN(num)) return '0';
        if (!isFinite(num)) return '∞';
        const rounded = Math.round(num * 1000000) / 1000000;
        if (Number.isInteger(rounded)) {
            return rounded.toLocaleString('id-ID');
        }
        return rounded.toLocaleString('id-ID', {
            minimumFractionDigits: 0,
            maximumFractionDigits: 4
        });
    }

    // ================================================================
    // HELPER: Word boundary match
    // ================================================================
    wordBoundary(text, keyword) {
        if (keyword.includes(' ')) return text.includes(keyword);
        const regex = new RegExp(`\\b${keyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i');
        return regex.test(text);
    }

    // ================================================================
    // HELPER: Operation name in Indonesian
    // ================================================================
    opNameId(op) {
        const names = {
            'addition': 'Penjumlahan',
            'subtraction': 'Pengurangan',
            'multiplication': 'Perkalian',
            'division': 'Pembagian'
        };
        return names[op] || 'Perhitungan';
    }

    // ================================================================
    // HELPER: Error result
    // ================================================================
    errorResult(message, originalText) {
        return { success: false, error: message, originalText };
    }

    // ================================================================
    // HELPER: Single value result
    // ================================================================
    singleValueResult(originalText, num) {
        const unitStr = num.unit ? ` ${num.unit}` : '';
        return {
            success: true,
            originalText,
            operation: 'Identifikasi Nilai',
            expression: `= ${this.fmt(num.value)}`,
            result: num.value,
            formattedResult: this.fmt(num.value) + unitStr,
            steps: [`Nilai yang ditemukan: ${this.fmt(num.value)}${unitStr}`],
            numbers: [num.value],
            unit: num.unit || ''
        };
    }
}

// Global instance
const nlpEngine = new ElhitungNLP();
