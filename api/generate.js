import { GoogleGenerativeAI } from '@google/generative-ai';
import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Hanya boleh POST' });
  }

  try {
    console.log("1. Memulai fungsi AI...");

    // --- STRATEGI BARU: Ambil variabel terpisah ---
    const projectId = process.env.FIREBASE_PROJECT_ID;
    const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
    // Trik pembersih kunci tetap kita pakai
    const privateKey = process.env.FIREBASE_PRIVATE_KEY 
      ? process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n') 
      : undefined;

    if (!projectId || !clientEmail || !privateKey) {
      throw new Error("Kunci Firebase tidak lengkap di Vercel (Cek PROJECT_ID, CLIENT_EMAIL, PRIVATE_KEY).");
    }

    if (!getApps().length) {
      console.log("2. Inisialisasi Firebase Manual...");
      
      initializeApp({
        credential: cert({
          projectId: projectId,
          clientEmail: clientEmail,
          privateKey: privateKey,
        })
      });
      console.log("3. Firebase berhasil login!");
    }

    const db = getFirestore();
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

    console.log("4. Menghubungi Gemini...");
    const model = genAI.getGenerativeModel({ model: "gemini-pro" });
    const prompt = `
      Buatkan satu materi singkat atau tips menulis kreatif untuk pemula. 
      Berikan Judul yang menarik di baris pertama.
      Isinya sekitar 50-100 kata saja. 
      Tentukan kategorinya (Materi, Artikel, atau Novel).
      Hasilkan output HANYA JSON murni.
      Format: { "title": "...", "content": "...", "category": "..." }
    `;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    let text = response.text();
    
    // Bersihkan JSON
    text = text.replace(/```json/g, '').replace(/```/g, '').trim();
    const dataMateri = JSON.parse(text);

    await db.collection('posts').add({
      title: dataMateri.title,
      content: dataMateri.content,
      category: dataMateri.category.toLowerCase(),
      timestamp: new Date()
    });

    res.status(200).json({ message: 'Sukses!', data: dataMateri });

  } catch (error) {
    console.error("❌ ERROR:", error);
    res.status(500).json({ error: error.message });
  }
}
