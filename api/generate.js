import { GoogleGenerativeAI } from '@google/generative-ai';
import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

export default async function handler(req, res) {
  // 1. Cek Metode Request (Hanya boleh POST)
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Hanya boleh POST' });
  }

  try {
    console.log("1. Memulai fungsi AI...");

    // 2. Cek apakah Kunci Rahasia ada di Vercel
    if (!process.env.GEMINI_API_KEY) {
      throw new Error("GEMINI_API_KEY tidak ditemukan di Vercel!");
    }
    if (!process.env.FIREBASE_SERVICE_ACCOUNT) {
      throw new Error("FIREBASE_SERVICE_ACCOUNT tidak ditemukan di Vercel!");
    }

    // 3. Inisialisasi Firebase (Dengan Fitur Auto-Fix Kunci)
    if (!getApps().length) {
      console.log("2. Mencoba inisialisasi Firebase...");
      
      let serviceAccount;
      try {
        // Parsing JSON dari Vercel
        serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
        
        // --- 🛠️ BAGIAN PERBAIKAN (THE FIX) 🛠️ ---
        // Kode ini akan mengubah '\n' teks menjadi Enter asli agar Firebase tidak error
        if (serviceAccount.private_key) {
            serviceAccount.private_key = serviceAccount.private_key.replace(/\\n/g, '\n');
        }
        // ----------------------------------------

      } catch (e) {
        console.error("Error parsing JSON:", e);
        throw new Error("Format JSON Firebase Service Account SALAH/RUSAK. Cek Environment Variables.");
      }

      initializeApp({
        credential: cert(serviceAccount)
      });
      console.log("3. Firebase berhasil login!");
    }

    const db = getFirestore();
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

    // 4. Perintah ke Gemini
    console.log("4. Menghubungi Gemini...");
    const model = genAI.getGenerativeModel({ model: "gemini-pro" });
    const prompt = `
      Buatkan satu materi singkat atau tips menulis kreatif untuk pemula. 
      Berikan Judul yang menarik di baris pertama.
      Isinya sekitar 50-100 kata saja. 
      Tentukan kategorinya (Materi, Artikel, atau Novel).
      Hasilkan output HANYA JSON murni tanpa markdown code block.
      Format: { "title": "...", "content": "...", "category": "..." }
    `;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    let text = response.text();

    console.log("5. Gemini menjawab:", text);
    
    // Bersihkan format JSON (Jaga-jaga jika AI nakal pakai markdown)
    text = text.replace(/```json/g, '').replace(/```/g, '').trim();
    
    // Cek apakah JSON valid sebelum di-parse
    let dataMateri;
    try {
        dataMateri = JSON.parse(text);
    } catch (jsonError) {
        console.error("AI memberikan format yang salah:", text);
        throw new Error("AI gagal memberikan format JSON yang benar.");
    }

    // 5. Simpan ke Firebase
    console.log("6. Menyimpan ke database...");
    await db.collection('posts').add({
      title: dataMateri.title,
      content: dataMateri.content,
      category: dataMateri.category.toLowerCase(),
      timestamp: new Date()
    });

    console.log("7. SUKSES!");
    res.status(200).json({ message: 'Sukses! Materi baru telah terbit.', data: dataMateri });

  } catch (error) {
    console.error("❌ ERROR FATAL:", error);
    // Kirim pesan error asli ke frontend supaya kita bisa baca
    res.status(500).json({ 
      error: 'Terjadi kesalahan di server.', 
      detail: error.message 
    });
  }
}
