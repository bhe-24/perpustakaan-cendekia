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

// Elemen UI
const magicBtn = document.getElementById('magic-btn');
const quotaCountSpan = document.getElementById('quota-count');
const contentContainer = document.getElementById('content-container');
const pageTitle = document.getElementById('page-title');
const MAX_QUOTA = 5;

// --- RESET KUOTA JAM 7 ---
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
        magicBtn.innerHTML = `<i class="fa-solid fa-wand-magic-sparkles"></i> &nbsp;Generate Materi AI`;
        magicBtn.disabled = false;
    } else {
        magicBtn.classList.add('btn-disabled');
        magicBtn.innerHTML = `<i class="fa-solid fa-bed"></i> &nbsp;AI Sedang Istirahat`;
        magicBtn.disabled = true;
    }
}

// --- FUNGSI UTAMA: TRIGGER AI ---
window.triggerMagic = async function() {
    let currentQuota = parseInt(localStorage.getItem('quota'));
    if (isNaN(currentQuota)) currentQuota = 5;

    if (currentQuota > 0) {
        // Konfirmasi dulu biar keren
        const confirm = await Swal.fire({
            title: 'Panggil Aksa AI?',
            text: "Satu kuota akan terpakai untuk membuat materi baru.",
            icon: 'question',
            showCancelButton: true,
            confirmButtonColor: '#f59e0b',
            cancelButtonColor: '#94a3b8',
            confirmButtonText: 'Ya, Buat!',
            cancelButtonText: 'Batal'
        });

        if (!confirm.isConfirmed) return;

        // Proses Dimulai
        currentQuota--;
        localStorage.setItem('quota', currentQuota);
        updateButtonUI();
        
        // Ubah tombol jadi loading
        magicBtn.innerHTML = `<i class="fa-solid fa-circle-notch fa-spin"></i> &nbsp;Sedang Meracik...`;
        magicBtn.disabled = true;

        try {
            const response = await fetch('/api/generate', { method: 'POST' });
            const dataMateri = await response.json();

            if (dataMateri.error) throw new Error(dataMateri.error);

            // Simpan ke Firebase
            await addDoc(collection(db, "posts"), {
                title: dataMateri.title,
                content: dataMateri.content,
                category: dataMateri.category.toLowerCase(),
                timestamp: new Date()
            });

            // Pop-up SUKSES Modern
            Swal.fire({
                title: 'Berhasil Terbit!',
                text: dataMateri.title,
                icon: 'success',
                confirmButtonColor: '#1e293b'
            });

            loadCategory('terbaru');

        } catch (error) {
            console.error(error);
            // Pop-up ERROR Modern
            Swal.fire({
                title: 'Ups, Gangguan!',
                text: 'Maaf, Aksa sedang pusing. Kuota dikembalikan.',
                icon: 'error'
            });
            localStorage.setItem('quota', currentQuota + 1);
        } finally {
            updateButtonUI();
        }
    }
};

// --- LOAD KONTEN ---
window.loadCategory = async function(category) {
    // Update Menu Aktif
    document.querySelectorAll('.menu li').forEach(el => el.classList.remove('active'));
    // (Opsional: Tambahkan logika highlight menu yg diklik)

    if(pageTitle) pageTitle.innerText = category === 'terbaru' ? 'Terbaru Hari Ini' : capitalize(category);
    
    // Tampilkan Loading Spinner Keren
    if(contentContainer) contentContainer.innerHTML = `
        <div class="loading-state">
            <div class="spinner"></div>
            <p>Sedang mengambil buku di rak...</p>
        </div>
    `;

    try {
        const postsRef = collection(db, "posts");
        // Ambil data urut waktu
        const q = query(postsRef, orderBy("timestamp", "desc"));
        const querySnapshot = await getDocs(q);
        
        contentContainer.innerHTML = '';
        let hasData = false;

        querySnapshot.forEach((doc) => {
            const data = doc.data();
            // Filter Client-side
            if (category !== 'terbaru' && data.category !== category) return;

            hasData = true;
            const dateStr = data.timestamp ? data.timestamp.toDate().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' }) : "Baru saja";

            // HTML Kartu yang lebih rapi
            const cardHTML = `
                <div class="card">
                    <span class="card-tag">${data.category || 'Umum'}</span>
                    <h3 class="card-title">${data.title}</h3>
                    <p class="card-excerpt">${data.content}</p>
                    <div class="card-meta">
                        <span><i class="fa-regular fa-calendar"></i> ${dateStr}</span>
                        <span><i class="fa-solid fa-robot"></i> Aksa AI</span>
                    </div>
                </div>
            `;
            contentContainer.innerHTML += cardHTML;
        });

        if (!hasData) {
            contentContainer.innerHTML = `
                <div class="loading-state">
                    <i class="fa-regular fa-folder-open" style="font-size: 3rem; margin-bottom: 10px;"></i>
                    <p>Belum ada materi di rak ini.</p>
                </div>`;
        }

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
