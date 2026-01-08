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
    const model = genAI.getGenerativeModel({ model: "gemini-pro" });

    // Prompt Khusus Cendekia Aksara
    const prompt = `
      Buatkan satu materi singkat atau tips menulis kreatif untuk pemula. 
      Berikan Judul yang menarik.
      Isinya sekitar 50-100 kata saja. 
      Tentukan kategorinya (Materi, Artikel, atau Novel).
      Hasilkan output HANYA JSON murni.
      Format: { "title": "Judul", "content": "Isi materi...", "category": "Materi" }
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
