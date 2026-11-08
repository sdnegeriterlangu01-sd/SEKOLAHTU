/**
 * ==========================================================================
 * SEKOLAHTU SHARED LIBRARY: KAMUS GLOSARIUM BAHASA MANUSIAWI NON-TEKNIS
 * Lokasi Satuan Pendidikan: SD Negeri Terlangu 01, Kec. Brebes, Kab. Brebes
 * ==========================================================================
 * Standarisasi terjemahan istilah teknis komputer ke bahasa Indonesia
 * yang santun, mudah dipahami guru senior, staf TU, komite, & orang tua murid.
 */

const HUMAN_CENTRIC_GLOSSARY = {
  "Cache / Browser Storage": "Penyimpanan Aman di Memori Perangkat",
  "IndexedDB Dexie.js": "Basis Data Lokal Bebas Kuota Internet",
  "Offline-First Architecture": "Sistem Siap Pakai Tanpa Gangguan Sinyal",
  "Three-Tier Caching Service Worker": "Sistem Cadangan Data Tiga Lapis",
  "GAS Concurrency Limit / Jitter Queue": "Antrean Pengiriman Data Bertahap Anti-Macet",
  "Bearer Token JWT / Supabase Auth": "Sistem Tiket Sandi Digital Terenkripsi",
  "Data Masking (UU PDP No. 27/2022)": "Penyamaran Otomatis Identitas Pribadi Siswa",
  "Hard Delete / Cryptographic Purge": "Pemusnahan Data Permanen Sesuai Aturan Kearsipan",
  "System Usability Scale (SUS)": "Survei Kemudahan dan Kepuasan Penggunaan Sistem",
  "First Contentful Paint (FCP) / Latency": "Kecepatan Membuka Layar Aplikasi",
  "Zero Hardware / Zero CapEx": "Tanpa Biaya Pembelian Komputer Tambahan",
  "Total Cost of Ownership (TCO)": "Analisis Perbandingan Penghematan Belanja Sekolah",
  "Single Source of Truth (SSOT)": "Pusat Rujukan Data Tunggal Sekolah",
  "Audit Trail": "Buku Catatan Riwayat Perubahan Data",
  "Bug / System Error": "Kendala Teknis / Gangguan Layar",
  "Soft-Delete / Recycle Bin": "Kotak Sampah Penyelamat 30 Hari",
  "Auto-Save Draft": "Penyimpanan Draf Otomatis Anti-Hilang",
  "Progressive Web App (PWA)": "Aplikasi Sekolah Siap Pasang di HP & Laptop",
  "Role-Based Access Control (RBAC)": "Pembagian Menu Sesuai SK Tugas Kepala Sekolah",
  "OCR (Optical Character Recognition)": "Pemindai Teks Kuitansi & Berkas Otomatis"
};

function humanizeTerm(technicalTerm) {
  if (!technicalTerm) return "";
  if (HUMAN_CENTRIC_GLOSSARY[technicalTerm]) {
    return HUMAN_CENTRIC_GLOSSARY[technicalTerm];
  }
  // Pencocokan parsial tidak peka huruf besar-kecil
  const lower = String(technicalTerm).toLowerCase();
  for (const [key, val] of Object.entries(HUMAN_CENTRIC_GLOSSARY)) {
    if (key.toLowerCase() === lower) return val;
  }
  return technicalTerm;
}

function humanizeTextBlock(text) {
  if (!text || typeof text !== "string") return text || "";
  let output = text;
  for (const [tech, human] of Object.entries(HUMAN_CENTRIC_GLOSSARY)) {
    const escaped = tech.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    output = output.replace(new RegExp(escaped, "gi"), human);
  }
  return output;
}

function openGlossaryModal() {
  let modal = document.getElementById("sekolahtu-glossary-modal");
  if (!modal) {
    modal = document.createElement("div");
    modal.id = "sekolahtu-glossary-modal";
    modal.className = "fixed inset-0 z-[70] bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4";
    const rowsHtml = Object.entries(HUMAN_CENTRIC_GLOSSARY)
      .map(
        ([tech, human], idx) => `
        <tr class="border-b border-slate-100 dark:border-slate-800 hover:bg-blue-50/40 dark:hover:bg-slate-800/50 transition">
          <td class="px-3 py-2.5 text-xs font-bold text-slate-500 dark:text-slate-400 text-center">${idx + 1}</td>
          <td class="px-3 py-2.5 text-xs font-extrabold text-blue-900 dark:text-blue-300">${human}</td>
          <td class="px-3 py-2.5 text-[11px] font-mono text-slate-500 dark:text-slate-400">${tech}</td>
        </tr>`
      )
      .join("");

    modal.innerHTML = `
      <div class="bg-white dark:bg-slate-900 rounded-2xl max-w-2xl w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-800 space-y-4 max-h-[88vh] flex flex-col">
        <div class="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
          <div class="flex items-center gap-3">
            <div class="w-10 h-10 rounded-xl bg-blue-100 dark:bg-blue-950 text-blue-800 dark:text-blue-300 flex items-center justify-center text-base font-bold">
              <i class="fa-solid fa-book-open-reader"></i>
            </div>
            <div>
              <h3 class="font-extrabold text-sm sm:text-base text-slate-900 dark:text-slate-100">Kamus Istilah Ramah Guru & Kedinasan</h3>
              <p class="text-xs text-slate-500 dark:text-slate-400">Padanan istilah sistem ke bahasa Indonesia santun sehari-hari di SDN Terlangu 01</p>
            </div>
          </div>
          <button type="button" onclick="document.getElementById('sekolahtu-glossary-modal').classList.add('hidden')" class="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1.5 cursor-pointer">
            <i class="fa-solid fa-xmark text-lg"></i>
          </button>
        </div>
        <div class="overflow-y-auto flex-1 border border-slate-200 dark:border-slate-800 rounded-xl">
          <table class="w-full text-left border-collapse">
            <thead class="bg-slate-100 dark:bg-slate-800 sticky top-0">
              <tr>
                <th class="px-3 py-2.5 text-[11px] font-bold uppercase text-slate-600 dark:text-slate-300 w-10 text-center">No</th>
                <th class="px-3 py-2.5 text-[11px] font-bold uppercase text-slate-600 dark:text-slate-300">Bahasa Kedinasan / Ramah Guru</th>
                <th class="px-3 py-2.5 text-[11px] font-bold uppercase text-slate-600 dark:text-slate-300">Istilah Sistem Asli</th>
              </tr>
            </thead>
            <tbody>${rowsHtml}</tbody>
          </table>
        </div>
        <div class="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-800">
          <span class="text-[11px] text-slate-500 dark:text-slate-400"><i class="fa-solid fa-circle-check text-emerald-600 mr-1"></i>Seluruh cetakan laporan resmi otomatis memakai istilah bahasa Indonesia.</span>
          <button type="button" onclick="document.getElementById('sekolahtu-glossary-modal').classList.add('hidden')" class="px-4 py-2 bg-blue-900 hover:bg-blue-800 text-white rounded-xl text-xs font-bold transition cursor-pointer">
            Tutup Kamus
          </button>
        </div>
      </div>
    `;
    document.body.appendChild(modal);
  }
  modal.classList.remove("hidden");
}

if (typeof window !== "undefined") {
  window.HUMAN_CENTRIC_GLOSSARY = HUMAN_CENTRIC_GLOSSARY;
  window.humanizeTerm = humanizeTerm;
  window.humanizeTextBlock = humanizeTextBlock;
  window.GlossaryManager = {
    GLOSSARY: HUMAN_CENTRIC_GLOSSARY,
    humanizeTerm,
    humanizeTextBlock,
    openGlossaryModal
  };
}

