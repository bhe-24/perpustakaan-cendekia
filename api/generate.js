import { GoogleGenerativeAI } from '@google/generative-ai';

export default async function handler(req, res) {
  // Hanya izinkan POST
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  // Ambil API Key
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: 'API Key belum disetting!' });
  }

  try {
    const genAI = new GoogleGenerativeAI(apiKey);
    
    // KITA PAKAI MODEL STANDAR (JANGAN DIGANTI LAGI)
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

    // Prompt
    const prompt = `
      Buatkan satu konten edukasi menulis kreatif untuk pemula.
      Pilih salah satu jenis: 'Materi' (teori sastra) atau 'Artikel' (tips praktis).
      Berikan Judul yang menarik.
      Isinya padat dan bermanfaat (sekitar 300-550 kata).
      Gunakan format Markdown (bold, italic, list) untuk poin penting.
      
      Output WAJIB JSON murni:
      { "title": "...", "content": "...", "category": "..." }
    `;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    let text = response.text();

    // Bersihkan JSON
    text = text.replace(/```json/g, '').replace(/```/g, '').trim();
    const dataJSON = JSON.parse(text);

    return res.status(200).json(dataJSON);

  } catch (error) {
    console.error("Server Error:", error);
    // Jika error, kirim pesan yang jelas
    return res.status(500).json({ error: error.message });
  }
}
