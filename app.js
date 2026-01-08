// Import Firebase (Menggunakan Config Kakak)
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getFirestore, collection, query, where, getDocs, orderBy } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

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

// Referensi Elemen HTML
const contentContainer = document.getElementById('content-container');
const pageTitle = document.getElementById('page-title');
const menuItems = document.querySelectorAll('.menu li');

// Fungsi Utama: Mengambil Data dari Firebase
window.loadCategory = async function(category) {
    // 1. Update UI (Judul & Menu Aktif)
    pageTitle.innerText = category === 'terbaru' ? 'Terbaru Hari Ini' : capitalize(category);
    
    menuItems.forEach(item => item.classList.remove('active'));
    // (Logic highlight menu bisa ditambahkan nanti agar lebih detail)

    contentContainer.innerHTML = `<div class="loading-card">Sedang mengambil data ${category}... ⏳</div>`;

    try {
        let q;
        const postsRef = collection(db, "posts"); // Asumsi nama koleksi di Firebase adalah 'posts'

        // 2. Filter Data Berdasarkan Kategori
        if (category === 'terbaru') {
            q = query(postsRef, orderBy("timestamp", "desc")); // Ambil semua urut waktu
        } else {
            q = query(postsRef, where("category", "==", category), orderBy("timestamp", "desc"));
        }

        const querySnapshot = await getDocs(q);
        
        // 3. Render Data ke HTML
        contentContainer.innerHTML = ''; // Kosongkan container
        
        if (querySnapshot.empty) {
            contentContainer.innerHTML = `<p>Belum ada konten di kategori ini. AI akan segera menulis! 🤖</p>`;
            return;
        }

        querySnapshot.forEach((doc) => {
            const data = doc.data();
            // Buat Kartu HTML
            const cardHTML = `
                <div class="card">
                    <span class="card-tag">${data.category || 'Umum'}</span>
                    <div class="card-body">
                        <h3 class="card-title">${data.title}</h3>
                        <p class="card-excerpt">${data.content.substring(0, 100)}...</p>
                    </div>
                    <div class="card-meta">
                        <span>🗓️ ${new Date(data.timestamp?.toDate()).toLocaleDateString()}</span>
                        <span>🤖 Oleh Aksa AI</span>
                    </div>
                </div>
            `;
            contentContainer.innerHTML += cardHTML;
        });

    } catch (error) {
        console.error("Error mengambil data:", error);
        contentContainer.innerHTML = `<p>Ups, gagal memuat data. (Cek koneksi internet)</p>`;
    }
};

// Helper: Huruf Besar Awal
function capitalize(str) {
    return str.charAt(0).toUpperCase() + str.slice(1);
}

// Load default saat pertama buka
loadCategory('terbaru');
