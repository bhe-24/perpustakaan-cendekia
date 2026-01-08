// --- LOGIKA TOMBOL MAGIC & KUOTA ---

const magicBtn = document.getElementById('magic-btn');
const quotaCountSpan = document.getElementById('quota-count');
const MAX_QUOTA = 5;

// Fungsi Cek Reset Jam 7 Pagi
function checkQuotaReset() {
    const lastReset = localStorage.getItem('lastResetDate');
    const today = new Date();
    const currentHour = today.getHours();

    // Buat string tanggal hari ini (Format: YYYY-MM-DD)
    const todayStr = today.toISOString().split('T')[0];

    // Jika belum pernah ada record, atau tanggal terakhir reset bukan hari ini
    // DAN sekarang sudah lewat jam 7 pagi
    if ((lastReset !== todayStr) && currentHour >= 7) {
        localStorage.setItem('quota', MAX_QUOTA); // Reset jadi 5
        localStorage.setItem('lastResetDate', todayStr); // Catat tanggal reset
    }
}

// Fungsi Update Tampilan Tombol
function updateButtonUI() {
    // Ambil kuota (kalau null, anggap 5)
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
        magicBtn.innerText = "😴 AI Sedang Istirahat (Kuota Habis)";
        magicBtn.disabled = true;
    }
}

// Fungsi Utama: Saat Tombol Diklik
window.triggerMagic = async function() {
    let currentQuota = parseInt(localStorage.getItem('quota'));

    if (currentQuota > 0) {
        // 1. Kurangi Kuota Dulu (Biar gak dispam klik)
        currentQuota--;
        localStorage.setItem('quota', currentQuota);
        updateButtonUI();

        // 2. Ubah Teks Loading
        const originalText = magicBtn.innerText;
        magicBtn.innerText = "⚙️ Sedang Menulis...";
        magicBtn.disabled = true;

        try {
            // 3. Panggil API Backend (Otak AI)
            const response = await fetch('/api/generate', { method: 'POST' });
            
            if (response.ok) {
                // Refresh halaman konten otomatis
                loadCategory('terbaru'); 
                alert("Berhasil! Materi baru sudah muncul di daftar Terbaru.");
            } else {
                throw new Error("Gagal memanggil AI");
            }
        } catch (error) {
            console.error(error);
            alert("Maaf, AI sedang sibuk. Kuota dikembalikan.");
            // Balikin kuota kalau gagal
            localStorage.setItem('quota', currentQuota + 1);
            updateButtonUI();
        }
    }
};

// Jalankan saat loading
checkQuotaReset();
updateButtonUI();
