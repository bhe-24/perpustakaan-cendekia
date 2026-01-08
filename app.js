// Import fungsi-fungsi Firebase Client (Bukan Admin)
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getFirestore, collection, addDoc, query, orderBy, getDocs } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

// Konfigurasi Firebase (Aman ditaruh di sini karena ini Client SDK)
const firebaseConfig = {
    apiKey: "AIzaSyDpUWUIzPXIZN6rrNtsIqcL6VfOE2RLVl0",
    authDomain: "mading-cf676.firebaseapp.com",
    projectId: "mading-cf676",
    storageBucket: "mading-cf676.firebasestorage.app",
    messagingSenderId: "72175203671",
    appId: "1:72175203671:web:7a0676a55beb64bc96ba12"
};

// Inisialisasi
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// --- LOGIKA TOMBOL MAGIC & KUOTA ---
const magicBtn = document.getElementById('magic-btn');
const quotaCountSpan = document.getElementById('quota-count');
const MAX_QUOTA = 5;

function checkQuotaReset() {
    const lastReset = localStorage.getItem('lastResetDate');
    const today = new Date().toISOString().split('T')[0];
    const currentHour = new Date().getHours();

    if ((lastReset !== today) && currentHour >= 7) {
        localStorage.setItem('quota', MAX_QUOTA);
        localStorage.setItem('lastResetDate', today);
    }
}

function updateButtonUI() {
    let currentQuota = parseInt(localStorage.getItem('quota'));
    if (isNaN(currentQuota)) currentQuota = MAX_QUOTA;
    quotaCountSpan.innerText = currentQuota;

    if (currentQuota > 0) {
        magicBtn.classList.remove('btn-disabled');
        magicBtn.classList.add('btn-active');
        magicBtn.innerText = "✨ Buat Materi Ajaib (AI)";
        magicBtn.disabled = false;
    } else {
        magicBtn.classList.remove('btn-active');
        magicBtn.classList.add('btn-disabled');
        magicBtn.innerText = "😴 Kuota Habis";
        magicBtn.disabled = true;
    }
}

// --- FUNGSI UTAMA: MINTA AI + SIMPAN KE DATABASE ---
window.triggerMagic = async function() {
    let currentQuota = parseInt(localStorage.getItem('quota'));
    if (isNaN(currentQuota)) currentQuota = 5;

    if (currentQuota > 0) {
        // 1. Kurangi Kuota & Update UI Loading
        currentQuota--;
        localStorage.setItem('quota', currentQuota);
        updateButtonUI();
        
        magicBtn.innerText = "⚙️ Sedang Meracik...";
        magicBtn.disabled = true;

        try {
            // 2. Panggil API Vercel (Hanya untuk Generate Teks)
            const response = await fetch('/api/generate', { method: 'POST' });
            const dataMateri = await response.json();

            if (dataMateri.error) throw new Error(dataMateri.error);

            // 3. TUGAS BARU FRONTEND: Simpan ke Firebase
            console.log("Materi diterima, menyimpan ke database...", dataMateri);
            
            await addDoc(collection(db, "posts"), {
                title: dataMateri.title,
                content: dataMateri.content,
                category: dataMateri.category.toLowerCase(),
                timestamp: new Date() // Waktu sekarang
            });

            // 4. Refresh Tampilan
            alert(`Berhasil! AI menulis: "${dataMateri.title}"`);
            loadCategory('terbaru');

        } catch (error) {
            console.error(error);
            alert("Maaf, terjadi gangguan. Kuota dikembalikan.");
            localStorage.setItem('quota', currentQuota + 1);
        } finally {
            updateButtonUI();
        }
    }
};

// --- FUNGSI MENAMPILKAN KONTEN (Sama seperti sebelumnya) ---
const contentContainer = document.getElementById('content-container');
const pageTitle = document.getElementById('page-title');

window.loadCategory = async function(category) {
    if(pageTitle) pageTitle.innerText = category === 'terbaru' ? 'Terbaru Hari Ini' : capitalize(category);
    if(contentContainer) contentContainer.innerHTML = `<div class="loading-card">Sedang mengambil data... ⏳</div>`;

    try {
        let q;
        const postsRef = collection(db, "posts");

        if (category === 'terbaru') {
            q = query(postsRef, orderBy("timestamp", "desc"));
        } else {
            // Note: Perlu Composite Index di Firebase console jika pakai where + orderBy
            // Untuk sementara kita ambil semua dulu lalu filter client-side agar tidak error index
            q = query(postsRef, orderBy("timestamp", "desc"));
        }

        const querySnapshot = await getDocs(q);
        contentContainer.innerHTML = '';
        
        let hasData = false;
        querySnapshot.forEach((doc) => {
            const data = doc.data();
            // Filter manual sederhana jika kategori bukan terbaru
            if (category !== 'terbaru' && data.category !== category) return;

            hasData = true;
            const dateStr = data.timestamp && data.timestamp.toDate ? data.timestamp.toDate().toLocaleDateString() : "Baru saja";

            const cardHTML = `
                <div class="card">
                    <span class="card-tag">${data.category || 'Umum'}</span>
                    <div class="card-body">
                        <h3 class="card-title">${data.title}</h3>
                        <p class="card-excerpt">${data.content}</p>
                    </div>
                    <div class="card-meta">
                        <span>🗓️ ${dateStr}</span>
                        <span>🤖 AI</span>
                    </div>
                </div>
            `;
            contentContainer.innerHTML += cardHTML;
        });

        if (!hasData) contentContainer.innerHTML = `<p style="grid-column: 1/-1; text-align: center;">Belum ada konten di kategori ini.</p>`;

    } catch (error) {
        console.error(error);
        if(contentContainer) contentContainer.innerHTML = `<p>Gagal memuat data.</p>`;
    }
};

function capitalize(str) {
    return str.charAt(0).toUpperCase() + str.slice(1);
}

// Init
checkQuotaReset();
updateButtonUI();
loadCategory('terbaru');
