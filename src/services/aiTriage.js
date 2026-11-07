// Bro Chicken AI Triage Service (Gemini 3.5 Flash Lite + Heuristic NLP Fallback)

const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models';

function analyzeWithRuleBased(message, customerName = 'Pelanggan') {
  const msgLower = (message || '').toLowerCase();
  
  // Deteksi Komplain vs Non-Komplain
  const complaintKeywords = [
    'komplain', 'kecewa', 'dingin', 'asin', 'hambar', 'gosong', 'alot', 'mentah', 'basi', 'bau', 'darah', 'keras',
    'kurang', 'salah', 'saos', 'saus', 'sambal', 'keju', 'nasi', 'minum', 'hilang', 'ketinggalan', 'ketuker', 'tertukar',
    'lama', 'driver', 'nyasar', 'belum sampai', 'tumpah', 'telat', 'lambat', 'ancur', 'rusak',
    'kasir', 'jutek', 'marah', 'cuek', 'kasar', 'kotor', 'lalat', 'rambut', 'kemasannya'
  ];

  const hasComplaint = complaintKeywords.some(kw => msgLower.includes(kw));

  let category = 'OTHER';
  let priority = 'MEDIUM';
  let sentiment = hasComplaint ? 'NEGATIVE' : 'NEUTRAL';
  let extractedProblem = 'Pertanyaan umum seputar layanan Bro Chicken';
  let reply = `Halo Kak ${customerName}! Terima kasih sudah menghubungi Bro Chicken. Ada yang bisa kami bantu seputar menu ayam goreng krispi kami?`;

  if (hasComplaint) {
    if (msgLower.includes('dingin') || msgLower.includes('asin') || msgLower.includes('gosong') || msgLower.includes('mentah') || msgLower.includes('basi') || msgLower.includes('bau') || msgLower.includes('alot')) {
      category = 'FOOD_QUALITY';
      priority = (msgLower.includes('mentah') || msgLower.includes('basi') || msgLower.includes('bau')) ? 'HIGH' : 'MEDIUM';
      extractedProblem = 'Kualitas makanan tidak sesuai standar (rasa, suhu, atau kematangan)';
    } else if (msgLower.includes('kurang') || msgLower.includes('salah') || msgLower.includes('ketinggalan') || msgLower.includes('ketuker') || msgLower.includes('sambal') || msgLower.includes('saus') || msgLower.includes('nasi')) {
      category = 'WRONG_ORDER';
      priority = 'MEDIUM';
      extractedProblem = 'Item pesanan keliru atau ada pelengkap yang tidak disertakan';
    } else if (msgLower.includes('lama') || msgLower.includes('driver') || msgLower.includes('nyasar') || msgLower.includes('telat') || msgLower.includes('tumpah')) {
      category = 'DELIVERY_DELAY';
      priority = 'MEDIUM';
      extractedProblem = 'Kendala pengiriman ojek online atau keterlambatan tiba';
    } else if (msgLower.includes('jutek') || msgLower.includes('kasir') || msgLower.includes('kasar') || msgLower.includes('cuek')) {
      category = 'SERVICE';
      priority = 'MEDIUM';
      extractedProblem = 'Pelayanan staf outlet kurang ramah atau tidak responsif';
    } else if (msgLower.includes('kotor') || msgLower.includes('lalat') || msgLower.includes('rambut')) {
      category = 'CLEANLINESS';
      priority = 'HIGH';
      extractedProblem = 'Isu kebersihan makanan atau area outlet';
    }

    reply = `Halo Kak ${customerName}, mohon maaf sekali atas ketidaknyamanan mengenai pesanan Bro Chicken. Keluhan Kakak sudah otomatis kami daftarkan ke sistem antrean keluhan dengan nomor tiket #{ticket_code}. Tim staf kami sedang segera memeriksa dan menindaklanjuti!`;
  } else if (msgLower.includes('halo') || msgLower.includes('siang') || msgLower.includes('pagi') || msgLower.includes('malam') || msgLower.includes('menu') || msgLower.includes('promo')) {
    sentiment = 'POSITIVE';
    reply = `Halo Kak ${customerName}! Selamat datang di Layanan Pelanggan Bro Chicken. Menu ayam krispi, geprek, dan saus keju kami siap disajikan panas & renyah. Ada pesanan yang ingin ditanyakan?`;
  }

  return {
    is_complaint: hasComplaint,
    category,
    priority,
    sentiment,
    extracted_problem: extractedProblem,
    ai_auto_reply: reply,
    engine: 'rule_based_nlp'
  };
}

async function analyzeWithGemini(message, customerName = 'Pelanggan') {
  const apiKey = process.env.GEMINI_API_KEY;
  const model = process.env.GEMINI_MODEL || 'gemini-3.5-flash-lite';
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY tidak dikonfigurasi.');
  }

  const prompt = `
Kamu adalah AI Triage Customer Service untuk restoran ayam goreng 'Bro Chicken' (outlet ayam krispi, geprek, saus keju, sambal bawang).
Analisis pesan masuk dari pelanggan WhatsApp berikut:
Nama Pelanggan: "${customerName}"
Isi Pesan: "${message}"

Berikan respon HANYA dalam format JSON valid tanpa tanda markdown (no backticks) dengan struktur berikut:
{
  "is_complaint": true atau false (true jika pelanggan mengeluh, pesanan bermasalah, salah menu, makanan dingin/mentah/asin, lambat, kasir jutek; false jika sekadar tanya menu, jam buka, sapaan ramah),
  "category": salah satu dari ["FOOD_QUALITY", "WRONG_ORDER", "DELIVERY_DELAY", "SERVICE", "CLEANLINESS", "OTHER"],
  "priority": salah satu dari ["LOW", "MEDIUM", "HIGH"] (HIGH jika makanan basi/mentah/isu kebersihan/marah besar, MEDIUM jika pesanan salah/kurang, LOW jika saran biasa),
  "sentiment": salah satu dari ["NEGATIVE", "NEUTRAL", "POSITIVE"],
  "extracted_problem": "ringkasan singkat 1 kalimat permasalahan dalam bahasa Indonesia",
  "ai_auto_reply": "kalimat balasan WhatsApp yang empatik, sopan, dan hangat khas Bro Chicken. Jika komplain, sampaikan permohonan maaf tulus dan sebutkan bahwa keluhan telah dicatat ke sistem tiket #{ticket_code} dan Admin kami segera menindaklanjuti."
}
`;

  const url = `${GEMINI_API_URL}/${model}:generateContent?key=${apiKey}`;
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: {
        responseMimeType: 'application/json',
        temperature: 0.2
      }
    }),
    signal: AbortSignal.timeout(8000)
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Gemini API Error ${response.status}: ${errorText}`);
  }

  const data = await response.json();
  const rawText = data.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!rawText) {
    throw new Error('Respons Gemini kosong.');
  }

  const parsed = JSON.parse(rawText);
  return {
    is_complaint: Boolean(parsed.is_complaint),
    category: parsed.category || 'OTHER',
    priority: parsed.priority || 'MEDIUM',
    sentiment: parsed.sentiment || 'NEGATIVE',
    extracted_problem: parsed.extracted_problem || message,
    ai_auto_reply: parsed.ai_auto_reply || 'Mohon maaf atas ketidaknyamanan, keluhan dicatat #{ticket_code}.',
    engine: `gemini (${model})`
  };
}

async function triageCustomerMessage(message, customerName = 'Pelanggan') {
  try {
    return await analyzeWithGemini(message, customerName);
  } catch (err) {
    console.warn('[AI Triage] Gemini fallback ke Rule-Based NLP:', err.message);
    const fallback = analyzeWithRuleBased(message, customerName);
    fallback.fallback_reason = err.message;
    return fallback;
  }
}

module.exports = {
  triageCustomerMessage,
  analyzeWithRuleBased,
  analyzeWithGemini
};
