import { GoogleGenerativeAI } from '@google/generative-ai';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: 'API Key belum disetting!' });
  }

  try {
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

    // Poin 4: Membatasi kategori hanya 'Materi' atau 'Tips' (Artikel)
    const prompt = `
      Buatkan satu konten edukasi menulis kreatif untuk pemula.
      Pilih salah satu jenis: 'Materi' (teori sastra) atau 'Artikel' (tips praktis).
      Berikan Judul yang menarik.
      Isinya padat dan bermanfaat (sekitar 300-550 kata).
      Gunakan format Markdown (bold, italic, list) untuk poin penting.
      
      Output WAJIB JSON murni:
      { "title": "...", "content": "...", "category": "..." }
      
      Catatan: category hanya boleh diisi 'Materi' atau 'Artikel'.
    `;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    let text = response.text();

    text = text.replace(/```json/g, '').replace(/```/g, '').trim();
    const dataJSON = JSON.parse(text);

    return res.status(200).json(dataJSON);

  } catch (error) {
    console.error("Gemini Error:", error);
    return res.status(500).json({ error: error.message });
  }
}
