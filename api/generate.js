import { GoogleGenerativeAI } from '@google/generative-ai';

export default async function handler(req, res) {
  // Hanya izinkan POST
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  // Ambil API Key Gemini dari Vercel
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: 'API Key Gemini belum disetting di Vercel!' });
  }

  try {
    const genAI = new GoogleGenerativeAI(apiKey);
    
    // --- PERBAIKAN DI SINI ---
    // Ganti "gemini-pro" (lama) menjadi "gemini-1.5-flash" (baru & cepat)
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" }); 
    // -------------------------

    // Prompt Khusus Cendekia Aksara
    const prompt = `
      Buatkan satu materi atau tips menulis kreatif seperti novel, cerpen, puisi, dan karya sastra lainnya untuk pemula. Bisa dijelaskan tata cara menulis, brainstroming, profheading yang benar untuk menghasilkan suatu karya yang baik.
      Produk yang kamu hasilkan bisa berupa contoh penulisan dan analisis, bukan hanya menulis materi.
      Berikan Judul yang menarik. Jangan terlalu panjang.
      Isinya sekitar 350-1000 kata. 
      Tentukan kategorinya, kalau bisa bergantian setiap satu kali publish (Materi, Artikel).
      Hasilkan output HANYA JSON murni.
      Format: { "title": "Judul", "content": "Isi materi...", "category": "Materi"; "Artikel" }
    `;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    let text = response.text();

    // Bersihkan format jika AI memberikan markdown
    text = text.replace(/```json/g, '').replace(/```/g, '').trim();
    
    // Coba parsing JSON untuk memastikan format benar
    const dataJSON = JSON.parse(text);

    // Kirim JSON bersih ke Frontend
    return res.status(200).json(dataJSON);

  } catch (error) {
    console.error("Gemini Error:", error);
    return res.status(500).json({ error: error.message });
  }
}
