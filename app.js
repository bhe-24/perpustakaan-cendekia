import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getFirestore, collection, addDoc, query, orderBy, getDocs } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

const firebaseConfig = {
    apiKey: "AIzaSyDpUWUIzPXIZN6rrNtsIqcL6VfOE2RLVl0",
    authDomain: "mading-cf676.firebaseapp.com",
    projectId: "mading-cf676",
    storageBucket: "mading-cf676.firebasestorage.app",
    messagingSenderId: "72175203671",
    appId: "1:72175203671:web:7a0676a55beb64bc96ba12"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// --- HELPER: FORMAT TEXT (POIN 5) ---
// Mengubah teks polos/markdown menjadi HTML yang enak dibaca (Bold, Italic, Paragraf)
function formatContent(text) {
    if (!text) return "";
    let formatted = text
        .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>') // Bold
        .replace(/\*(.*?)\*/g, '<em>$1</em>')             // Italic
        .replace(/\n\n/g, '<br><br>')                     // Paragraf baru
        .replace(/\n/g, '<br>');                           // Baris baru
    return `<div style="text-align: left; line-height: 1.6; font-size: 1rem; color: #334155;">${formatted}</div>`;
}

// --- FUNGSI TAMPILKAN POP-UP BACA (POIN 3 & 7) ---
window.openArticle = function(title, content, date, category) {
    Swal.fire({
        title: `<h3 style="font-family: 'Outfit'; color: #0f172a;">${title}</h3>`,
        html: `
            <div style="margin-bottom: 15px;">
                <span style="background: #f1f5f9; padding: 4px 10px; border-radius: 15px; font-size: 0.8rem; color: #64748b;">
                    <i class="fa-regular fa-calendar"></i> ${date}
                </span>
                <span style="background: #fff7ed; padding: 4px 10px; border-radius: 15px; font-size: 0.8rem; color: #d97706; margin-left: 5px;">
                    ${category}
                </span>
            </div>
            <hr style="border: 0; border-top: 1px solid #e2e8f0; margin: 10px 0;">
            ${formatContent(content)}
        `,
        width: '700px',
        showConfirmButton: true,
        confirmButtonText: 'Tutup',
        confirmButtonColor: '#0f172a',
        showClass: { popup: 'animate__animated animate__fadeInUp' }
    });
};

// --- LOGIKA UTAMA ---
const magicBtn = document.getElementById('magic-btn');
const quotaCountSpan = document.getElementById('quota-count');
const contentContainer = document.getElementById('content-container');
const pageTitle = document.getElementById('page-title');
const MAX_QUOTA = 5;

// Cek Reset Kuota
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
        magicBtn.innerHTML = `<i class="fa-solid fa-wand-magic-sparkles"></i> Generate Baru`;
        magicBtn.disabled = false;
    } else {
        magicBtn.classList.add('btn-disabled');
        magicBtn.innerHTML = `Kuota Habis`;
        magicBtn.disabled = true;
    }
}

// Trigger AI
window.triggerMagic = async function() {
    let currentQuota = parseInt(localStorage.getItem('quota'));
    if (isNaN(currentQuota)) currentQuota = 5;

    if (currentQuota > 0) {
        const confirm = await Swal.fire({
            title: 'Buat Materi Baru?',
            text: "Aksa akan menulis materi/tips acak untukmu.",
            icon: 'question',
            showCancelButton: true,
            confirmButtonColor: '#0f172a',
            confirmButtonText: 'Gas!',
            cancelButtonText: 'Batal'
        });

        if (!confirm.isConfirmed) return;

        currentQuota--;
        localStorage.setItem('quota', currentQuota);
        updateButtonUI();
        
        magicBtn.innerHTML = `<i class="fa-solid fa-circle-notch fa-spin"></i> Meracik...`;
        magicBtn.disabled = true;

        try {
            const response = await fetch('/api/generate', { method: 'POST' });
            const dataMateri = await response.json();

            if (dataMateri.error) throw new Error(dataMateri.error);

            // Simpan data
            await addDoc(collection(db, "posts"), {
                title: dataMateri.title,
                content: dataMateri.content,
                category: dataMateri.category, // Tidak di-lowercase biar rapi
                timestamp: new Date()
            });

            Swal.fire('Selesai!', `Materi "${dataMateri.title}" sudah terbit.`, 'success');
            loadCategory('terbaru');

        } catch (error) {
            console.error(error);
            Swal.fire('Gagal', 'Ada gangguan jaringan.', 'error');
            localStorage.setItem('quota', currentQuota + 1);
        } finally {
            updateButtonUI();
        }
    }
};

// Load Kategori
window.loadCategory = async function(category) {
    // Highlight Menu
    document.querySelectorAll('.menu li').forEach(el => el.classList.remove('active'));
    // Cari elemen menu yg diklik (manual logic simple)
    const menuIcon = category === 'terbaru' ? 'fa-house' : (category === 'materi' ? 'fa-book-open' : 'fa-feather');
    // ... (bisa dikembangkan utk highlight otomatis)

    pageTitle.innerText = category === 'terbaru' ? 'Terbaru' : (category.charAt(0).toUpperCase() + category.slice(1));
    
    contentContainer.innerHTML = `<div class="loading-state"><i class="fa-solid fa-spinner fa-spin"></i> Memuat...</div>`;

    try {
        const postsRef = collection(db, "posts");
        const q = query(postsRef, orderBy("timestamp", "desc"));
        const querySnapshot = await getDocs(q);
        
        contentContainer.innerHTML = '';
        let hasData = false;

        querySnapshot.forEach((doc) => {
            const data = doc.data();
            
            // POIN 4: FILTER KATEGORI KETAT
            // Kategori yang diizinkan hanya: Materi, Artikel, Tips
            // Kita normalisasi stringnya biar cocok
            let catDB = (data.category || 'Umum').toLowerCase();
            let catFilter = category.toLowerCase();

            // Logic Filter:
            // 1. Jika user minta 'terbaru', tampilkan SEMUA yg kategori 'materi' atau 'artikel' (tips). Jangan tampilkan novel/umum.
            // 2. Jika user minta spesifik 'materi', tampilkan 'materi' saja.
            
            const isMateri = catDB.includes('materi');
            const isArtikel = catDB.includes('artikel') || catDB.includes('tips');

            if (category === 'terbaru') {
                if (!isMateri && !isArtikel) return; // Skip novel/umum
            } else if (category === 'materi') {
                if (!isMateri) return;
            } else if (category === 'artikel') {
                if (!isArtikel) return;
            }

            hasData = true;
            const dateStr = data.timestamp ? data.timestamp.toDate().toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }) : "-";
            
            // Siapkan data untuk dikirim ke fungsi Pop-up (escape tanda petik biar gak error)
            const safeTitle = data.title.replace(/'/g, "\\'").replace(/"/g, '&quot;');
            const safeContent = data.content.replace(/'/g, "\\'").replace(/"/g, '&quot;').replace(/\n/g, '\\n');
            const safeCat = data.category || 'Materi';

            // POIN 2 & 6: KARTU CUPLIKAN
            const cardHTML = `
                <div class="card" data-cat="${isArtikel ? 'tips' : 'materi'}" 
                     onclick="openArticle('${safeTitle}', '${safeContent}', '${dateStr}', '${safeCat}')">
                    
                    <span class="card-tag">${safeCat}</span>
                    <h3 class="card-title">${data.title}</h3>
                    <p class="card-excerpt">${data.content}</p> 
                    
                    <div class="card-footer">
                        <span><i class="fa-regular fa-clock"></i> ${dateStr}</span>
                        <span class="read-more">Baca <i class="fa-solid fa-arrow-right"></i></span>
                    </div>
                </div>
            `;
            contentContainer.innerHTML += cardHTML;
        });

        if (!hasData) {
            contentContainer.innerHTML = `<div class="loading-state">Belum ada konten di kategori ini.</div>`;
        }

    } catch (error) {
        console.error(error);
        contentContainer.innerHTML = `<p style="text-align:center">Gagal memuat data.</p>`;
    }
};

checkQuotaReset();
updateButtonUI();
loadCategory('terbaru');
