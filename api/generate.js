// api/generate.js
import { GoogleGenerativeAI } from '@google/generative-ai';
import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

// 1. Konfigurasi Service Account Firebase (Harus pakai Environment Variable nanti)
const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);

// Cek agar tidak inisialisasi ganda
if (!getApps().length) {
  initializeApp({
    credential: cert(serviceAccount)
  });
}

const db = getFirestore();
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

export default async function handler(req, res) {
  // Hanya izinkan metode POST
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method Not Allowed' });
  }

  try {
    // 2. Perintah ke Gemini
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
    const prompt = `
      Buatkan satu materi singkat atau tips menulis kreatif mengenai Novel, Cerita Pendek, Puisi dan karya sastra lainnya untuk pemula. 
      Berikan Judul yang menarik di baris pertama.
      Isinya sekitar 300-500 kata saja. 
      Tentukan kategorinya (Materi, Artikel, atau Novel).
      Format output JSON: { "title": "Judul", "content": "Isi materi...", "category": "kategori" }
    `;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();
    
    // Bersihkan format JSON dari markdown ```json ... ``` jika ada
    const cleanText = text.replace(/```json|```/g, '').trim();
    const dataMateri = JSON.parse(cleanText);

    // 3. Simpan ke Firebase Database
    await db.collection('posts').add({
      title: dataMateri.title,
      content: dataMateri.content,
      category: dataMateri.category.toLowerCase(),
      timestamp: new Date() // Waktu server
    });

    res.status(200).json({ message: 'Sukses! Materi baru telah terbit.', data: dataMateri });

  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Gagal membangkitkan materi AI.' });
  }
}
