/**
 * ==========================================================================
 * SEKOLAHTU SHARED LIBRARY: PEMANDU PENGENALAN SISTEM RAMAH GURU (6 LANGKAH)
 * Lokasi Satuan Pendidikan: SD Negeri Terlangu 01, Kec. Brebes, Kab. Brebes
 * ==========================================================================
 * Menggunakan Driver.js CDN untuk memandu Bapak/Ibu Guru Senior dan Staf TU
 * dengan bahasa santun, tenang, dan bebas jargon teknis ("Peace of Mind").
 */

const HUMAN_CENTRIC_TOUR_STEPS = [
  {
    step: 1,
    element: "#app-top-header",
    title: "1. Selamat Datang di Rumah Belajar Digital SDN Terlangu 01",
    description:
      "Assalamu'alaikum Bapak/Ibu Guru dan Staf yang kami hormati. Aplikasi SEKOLAHTU dirancang khusus untuk meringankan pekerjaan administrasi Bapak/Ibu agar lebih cepat selesai, tenang, dan nyaman tanpa perlu khawatir salah pencet."
  },
  {
    step: 2,
    element: "#launchpad-cards-grid",
    title: "2. Meja Kerja Pilihan Tugas (Sesuai SK Kepala Sekolah)",
    description:
      "Bapak/Ibu hanya akan melihat kartu menu yang sesuai dengan tugas pokok dan SK Tugas Tambahan dari Ibu Kepala Sekolah. Cukup ketuk satu kartu atau tombol 9-Titik di pojok kanan atas untuk berpindah ruang kerja seketika."
  },
  {
    step: 3,
    element: "#cloud-status-badge",
    title: "3. Lembar Kerja Anti-Hilang (Aman Meski Mati Lampu / Sinyal Lemah)",
    description:
      "Tidak perlu cemas jika Wi-Fi sekolah sedang penuh atau listrik padam. Setiap ketikan Bapak/Ibu pada formulir surat maupun biodata murid otomatis disimpan setiap 5 detik di memori perangkat dan terkirim sendiri saat sinyal kembali normal."
  },
  {
    step: 4,
    element: "#btn-quick-signature-extractor",
    title: "4. Tanda Tangan Praktis dari Secarik Kertas Putih",
    description:
      "Bapak/Ibu tidak perlu membeli alat tanda tangan khusus. Cukup tanda tangan dengan pulpen biasa di atas kertas putih kosong, lalu foto memakai kamera HP. Sistem otomatis menghapus warna kertas menjadi transparan dan rapi."
  },
  {
    step: 5,
    element: "#dual-signature-mode-switcher",
    title: "5. Fleksibel Saat Mencetak Berkas (Digital atau Stempel Basah)",
    description:
      "Saat hendak mencetak surat atau laporan, tersedia saklar praktis: pilih 'Mode Digital Internal' (lengkap dengan tanda tangan & kode QR), atau pilih 'Mode Siap Tanda Tangan Basah' (ruang tanda tangan dikosongkan bersih untuk pulpen & stempel basah asli ke Dinas/Korwil)."
  },
  {
    step: 6,
    element: "#fab-bug-reporter-trigger",
    title: "6. Kotak Sampah Penyelamat & Bantuan Selalu Siaga",
    description:
      "Jika Bapak/Ibu tidak sengaja menghapus data, tersedia tombol 'Batal Hapus' selama 10 detik dan Kotak Sampah Penyelamat yang menyimpan data selama 30 hari. Jika ada kendala layar, cukup ketuk tombol Bantuan di pojok bawah ini."
  }
];

class HumanCentricTourGuide {
  constructor() {
    this.storageKey = "sekolahtu_tour_completed_v4";
    this.steps = HUMAN_CENTRIC_TOUR_STEPS;
  }

  startTour(force = false) {
    if (!force && localStorage.getItem(this.storageKey) === "true") {
      return;
    }

    const driverObj =
      (typeof window !== "undefined" &&
        window.driver &&
        window.driver.js &&
        window.driver.js.driver) ||
      null;

    if (driverObj) {
      const validSteps = this.steps.map((s) => {
        const elExists = document.querySelector(s.element);
        return {
          element: elExists ? s.element : "body",
          popover: {
            title: s.title,
            description: s.description,
            side: "bottom",
            align: "start"
          }
        };
      });

      const drv = driverObj({
        showProgress: true,
        animate: true,
        nextBtnText: "Lanjut &rarr;",
        prevBtnText: "&larr; Sebelumnya",
        doneBtnText: "Selesai & Mulai Bekerja",
        progressText: "Langkah {{current}} dari {{total}}",
        steps: validSteps,
        onDestroyed: () => {
          localStorage.setItem(this.storageKey, "true");
        }
      });

      drv.drive();
      return;
    }

    // Fallback Modal Ramah Guru jika CDN Driver.js sedang tidak termuat
    this.openFallbackTourModal();
  }

  openFallbackTourModal() {
    let modal = document.getElementById("sekolahtu-fallback-tour-modal");
    if (!modal) {
      modal = document.createElement("div");
      modal.id = "sekolahtu-fallback-tour-modal";
      modal.className =
        "fixed inset-0 z-[75] bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4";
      document.body.appendChild(modal);
    }

    const cardsHtml = this.steps
      .map(
        (s) => `
        <div class="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700 space-y-1">
          <div class="font-extrabold text-xs sm:text-sm text-blue-900 dark:text-blue-300">${s.title}</div>
          <p class="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">${s.description}</p>
        </div>`
      )
      .join("");

    modal.innerHTML = `
      <div class="bg-white dark:bg-slate-900 rounded-2xl max-w-2xl w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-800 space-y-4 max-h-[88vh] flex flex-col">
        <div class="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
          <div class="flex items-center gap-3">
            <div class="w-10 h-10 rounded-xl bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-300 flex items-center justify-center text-lg font-bold">
              <i class="fa-solid fa-hand-holding-heart"></i>
            </div>
            <div>
              <h3 class="font-extrabold text-sm sm:text-base text-slate-900 dark:text-slate-100">Panduan Singkat 6 Langkah Ramah Guru</h3>
              <p class="text-xs text-slate-500 dark:text-slate-400">Kemudahan bekerja di SEKOLAHTU SD Negeri Terlangu 01</p>
            </div>
          </div>
          <button type="button" onclick="document.getElementById('sekolahtu-fallback-tour-modal').classList.add('hidden')" class="text-slate-400 hover:text-slate-600 p-1.5 cursor-pointer">
            <i class="fa-solid fa-xmark text-lg"></i>
          </button>
        </div>
        <div class="overflow-y-auto space-y-2.5 flex-1 pr-1">${cardsHtml}</div>
        <div class="flex items-center justify-between pt-3 border-t border-slate-100 dark:border-slate-800">
          <button type="button" onclick="if(window.GlossaryManager) GlossaryManager.openGlossaryModal()" class="text-xs font-bold text-blue-700 dark:text-blue-400 hover:underline cursor-pointer">
            <i class="fa-solid fa-book mr-1"></i>Buka Kamus Istilah Kedinasan
          </button>
          <button type="button" onclick="localStorage.setItem('sekolahtu_tour_completed_v4','true'); document.getElementById('sekolahtu-fallback-tour-modal').classList.add('hidden')" class="px-5 py-2 bg-blue-900 hover:bg-blue-800 text-white rounded-xl text-xs font-bold transition cursor-pointer">
            Saya Mengerti & Mulai Bekerja
          </button>
        </div>
      </div>
    `;
    modal.classList.remove("hidden");
  }
}

if (typeof window !== "undefined") {
  window.HUMAN_CENTRIC_TOUR_STEPS = HUMAN_CENTRIC_TOUR_STEPS;
  window.HumanCentricTourGuide = HumanCentricTourGuide;
  window.TourGuideManager = new HumanCentricTourGuide();
  window.SekolahtuTourGuide = window.TourGuideManager;
}

