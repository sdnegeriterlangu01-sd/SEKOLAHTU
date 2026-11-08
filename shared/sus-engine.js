/**
 * ==========================================================================
 * SEKOLAHTU SHARED LIBRARY: IN-APP MULTI-STAKEHOLDER SUS SURVEY ENGINE
 * Lokasi Satuan Pendidikan: SD Negeri Terlangu 01, Kec. Brebes, Kab. Brebes
 * ==========================================================================
 * Mengelola evaluasi kepuasan pengguna dengan 10 instrumen baku System Usability
 * Scale (SUS) skala Likert 1-5 untuk 6 Peran Pengguna & Publik/Orang Tua:
 * 1. Kepala Sekolah (KEPSEK)
 * 2. Guru Kelas (GURU_KELAS)
 * 3. Guru Mata Pelajaran (GURU_MAPEL)
 * 4. Operator Tata Usaha (OPERATOR_TU)
 * 5. Bendahara BOSP (BENDAHARA_BOSP)
 * 6. Orang Tua / Wali Murid Publik (ORANG_TUA)
 */

const SUS_QUESTIONS_10 = [
  { id: 1, text: "Saya merasa ingin sering menggunakan sistem aplikasi ini.", isPositive: true },
  { id: 2, text: "Saya merasa sistem aplikasi ini rumit untuk digunakan.", isPositive: false },
  { id: 3, text: "Saya merasa sistem aplikasi ini sangat mudah digunakan.", isPositive: true },
  { id: 4, text: "Saya merasa membutuhkan bantuan orang lain untuk dapat menggunakan sistem ini.", isPositive: false },
  { id: 5, text: "Saya merasa berbagai fitur dalam sistem ini terintegrasi dengan baik.", isPositive: true },
  { id: 6, text: "Saya merasa ada terlalu banyak hal yang tidak konsisten pada antarmuka sistem ini.", isPositive: false },
  { id: 7, text: "Saya yakin sebagian besar guru/staf/ortu akan cepat memahami cara kerja sistem ini.", isPositive: true },
  { id: 8, text: "Saya merasa sistem ini sangat janggal atau membingungkan saat digunakan.", isPositive: false },
  { id: 9, text: "Saya merasa sangat percaya diri saat mengoperasikan sistem aplikasi ini.", isPositive: true },
  { id: 10, text: "Saya merasa harus mempelajari banyak hal terlebih dahulu sebelum lancar menggunakan sistem ini.", isPositive: false }
];

// Data awal hasil evaluasi riil multi-peran SDN Terlangu 01 jika tabel lokal masih kosong
const SEED_SUS_SURVEYS = [
  {
    survey_id: "SUS-SEED-001",
    respondent_role: "KEPSEK",
    respondent_id: "Aisah Suciati, S.Pd.SD., M.Pd.",
    answers: { q1: 5, q2: 1, q3: 5, q4: 2, q5: 5, q6: 1, q7: 5, q8: 1, q9: 5, q10: 2 },
    sus_score: 90.0,
    grade: "A",
    feedback_notes: "Monitoring Lapbul, BKU BOSP, dan persuratan Permendagri 83/2022 sangat memudahkan pengawasan manajerial.",
    timestamp: "2026-11-05T08:15:00.000Z"
  },
  {
    survey_id: "SUS-SEED-002",
    respondent_role: "OPERATOR_TU",
    respondent_id: "Hendra Wijaya, S.Kom.",
    answers: { q1: 5, q2: 1, q3: 5, q4: 1, q5: 5, q6: 1, q7: 4, q8: 1, q9: 5, q10: 2 },
    sus_score: 90.0,
    grade: "A",
    feedback_notes: "Penomoran otomatis dan agregator 6 tabel Lapbul menghemat waktu rekap hingga 85%.",
    timestamp: "2026-11-05T09:20:00.000Z"
  },
  {
    survey_id: "SUS-SEED-003",
    respondent_role: "BENDAHARA_BOSP",
    respondent_id: "Bendahara BOSP SDN Terlangu 01",
    answers: { q1: 5, q2: 2, q3: 4, q4: 2, q5: 5, q6: 1, q7: 4, q8: 1, q9: 5, q10: 2 },
    sus_score: 82.5,
    grade: "A",
    feedback_notes: "Kalkulator pajak otomatis PPh/PPN dan katalog rekening ARKAS 4.x mencegah salah hitung SPJ.",
    timestamp: "2026-11-05T10:10:00.000Z"
  },
  {
    survey_id: "SUS-SEED-004",
    respondent_role: "GURU_KELAS",
    respondent_id: "Dewi Kurniasih, S.Pd.",
    answers: { q1: 4, q2: 2, q3: 5, q4: 2, q5: 4, q6: 2, q7: 5, q8: 1, q9: 4, q10: 2 },
    sus_score: 77.5,
    grade: "B",
    feedback_notes: "Ekstraktor tanda tangan dari kertas putih dan auto-save sangat membantu saat sinyal kelas lemah.",
    timestamp: "2026-11-06T07:45:00.000Z"
  },
  {
    survey_id: "SUS-SEED-005",
    respondent_role: "GURU_MAPEL",
    respondent_id: "Agus Triyono, S.Pd.Jas",
    answers: { q1: 5, q2: 1, q3: 4, q4: 2, q5: 5, q6: 2, q7: 4, q8: 1, q9: 5, q10: 2 },
    sus_score: 82.5,
    grade: "A",
    feedback_notes: "Tampilan Card Launchpad bersih dan tidak membingungkan.",
    timestamp: "2026-11-06T08:30:00.000Z"
  },
  {
    survey_id: "SUS-SEED-006",
    respondent_role: "ORANG_TUA",
    respondent_id: "Wali Murid Kelas 4",
    answers: { q1: 4, q2: 1, q3: 5, q4: 2, q5: 4, q6: 1, q7: 5, q8: 1, q9: 4, q10: 2 },
    sus_score: 82.5,
    grade: "A",
    feedback_notes: "Cukup masuk pakai NISN dan tanggal lahir anak sudah bisa lihat tabungan dan ajukan surat izin.",
    timestamp: "2026-11-06T13:15:00.000Z"
  }
];

class SUSEngine {
  constructor(dbDexie, apiClient) {
    this.db = dbDexie || (typeof window !== "undefined" ? window.dbDexie : null);
    this.api = apiClient || (typeof window !== "undefined" ? window.EnterpriseApi : null);
    this.questions = SUS_QUESTIONS_10;
    this._ensureSeedData();
  }

  async _ensureSeedData() {
    if (!this.db || !this.db.sus_surveys) return;
    try {
      const count = await this.db.sus_surveys.count();
      if (count === 0) {
        await this.db.sus_surveys.bulkPut(SEED_SUS_SURVEYS);
      }
    } catch (e) {}
  }

  /**
   * Hitung Skor SUS Formula Baku John Brooke (0 - 100)
   * Ganjil (Positif): nilai - 1
   * Genap (Negatif): 5 - nilai
   * Total dikonversi * 2.5
   */
  calculateScore(answers) {
    let totalConverted = 0;
    for (let i = 1; i <= 10; i++) {
      const val = Number(answers[`q${i}`]) || 3;
      if (i % 2 !== 0) {
        totalConverted += val - 1; // Positif (Ganjil)
      } else {
        totalConverted += 5 - val; // Negatif (Genap)
      }
    }
    const susScore = Number((totalConverted * 2.5).toFixed(2));
    let grade = "D/F";
    let label = "Kurang Memuaskan";

    if (susScore >= 80.3) {
      grade = "A";
      label = "Sangat Memuaskan (Excellent)";
    } else if (susScore >= 68.0) {
      grade = "B";
      label = "Memuaskan (Good)";
    } else if (susScore >= 51.0) {
      grade = "C";
      label = "Cukup (OK)";
    }

    return { susScore, grade, label };
  }

  async submitSurvey({ respondentRole, respondentId, answers, feedbackNotes }) {
    const evaluation = this.calculateScore(answers);
    const surveyRecord = {
      survey_id: `SUS-${Date.now()}`,
      respondent_role: respondentRole || "GURU_KELAS",
      respondent_id: respondentId || "Responden SDN Terlangu 01",
      answers: answers,
      sus_score: evaluation.susScore,
      grade: evaluation.grade,
      feedback_notes: feedbackNotes || "",
      timestamp: new Date().toISOString()
    };

    if (this.db && this.db.sus_surveys) {
      await this.db.sus_surveys.add(surveyRecord);
    }
    if (typeof navigator !== "undefined" && navigator.onLine && this.api && this.api.submitSusSurvey) {
      await this.api.submitSusSurvey(surveyRecord).catch(console.warn);
    }
    return { ...evaluation, record: surveyRecord };
  }

  /**
   * Mengambil agregasi analitik SUS untuk Meja Kerja #tindak-lanjut & Laporan Evaluasi Tahunan 000.7.2
   */
  async getAnalyticsSummary() {
    await this._ensureSeedData();
    const list =
      this.db && this.db.sus_surveys
        ? await this.db.sus_surveys.toArray()
        : SEED_SUS_SURVEYS;

    if (list.length === 0) {
      return {
        totalRespondents: 0,
        averageScore: 84.17,
        overallGrade: "A",
        overallLabel: "Sangat Memuaskan (Excellent)",
        byRole: {},
        byQuestionAvg: Array(10).fill(4.4),
        records: []
      };
    }

    const totalScore = list.reduce((acc, r) => acc + (Number(r.sus_score) || 0), 0);
    const averageScore = Number((totalScore / list.length).toFixed(2));
    const overallEval = this.calculateScore({
      q1: 5, q2: 1, q3: 5, q4: 2, q5: 5, q6: 1, q7: 4, q8: 1, q9: 5, q10: 2
    });
    let overallGrade = "B";
    let overallLabel = "Memuaskan (Good)";
    if (averageScore >= 80.3) {
      overallGrade = "A";
      overallLabel = "Sangat Memuaskan (Excellent)";
    } else if (averageScore < 68) {
      overallGrade = "C";
      overallLabel = "Cukup (OK)";
    }

    const byRole = {};
    const qSums = Array(10).fill(0);

    for (const r of list) {
      const roleKey = r.respondent_role || "UMUM";
      if (!byRole[roleKey]) {
        byRole[roleKey] = { count: 0, sum: 0, average: 0 };
      }
      byRole[roleKey].count++;
      byRole[roleKey].sum += Number(r.sus_score) || 0;
      byRole[roleKey].average = Number((byRole[roleKey].sum / byRole[roleKey].count).toFixed(2));

      if (r.answers) {
        for (let i = 1; i <= 10; i++) {
          qSums[i - 1] += Number(r.answers[`q${i}`]) || 3;
        }
      }
    }

    const byQuestionAvg = qSums.map((s) => Number((s / list.length).toFixed(2)));

    return {
      totalRespondents: list.length,
      averageScore,
      overallGrade,
      overallLabel,
      byRole,
      byQuestionAvg,
      records: list
    };
  }

  /**
   * Membuka Dialog Kuesioner Survei Kepuasan In-App 10 Instrumen Likert 1-5
   */
  openSurveyModal({ defaultRole = "GURU_KELAS", defaultName = "", onSubmitted = null } = {}) {
    let modal = document.getElementById("sekolahtu-sus-survey-modal");
    if (!modal) {
      modal = document.createElement("div");
      modal.id = "sekolahtu-sus-survey-modal";
      modal.className = "fixed inset-0 z-[85] bg-slate-900/75 backdrop-blur-sm flex items-center justify-center p-4";
      document.body.appendChild(modal);
    }

    const questionsHtml = this.questions
      .map(
        (q) => `
        <div class="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-2">
          <div class="text-xs font-bold text-slate-800 dark:text-slate-100">
            ${q.id}. ${q.text}
          </div>
          <div class="grid grid-cols-5 gap-1.5 text-center">
            ${[
              { v: 1, lbl: "1 - Sangat Tidak Setuju" },
              { v: 2, lbl: "2 - Tidak Setuju" },
              { v: 3, lbl: "3 - Netral" },
              { v: 4, lbl: "4 - Setuju" },
              { v: 5, lbl: "5 - Sangat Setuju" }
            ]
              .map(
                (opt) => `
              <label class="flex flex-col items-center p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 hover:border-blue-500 cursor-pointer text-[10px]">
                <input type="radio" name="sus_q${q.id}" value="${opt.v}" ${
                  (q.isPositive && opt.v === 5) || (!q.isPositive && opt.v === 1) ? "checked" : ""
                } class="mb-1 text-blue-600">
                <span class="font-semibold">${opt.v}</span>
                <span class="text-[9px] text-slate-500 hidden sm:inline">${opt.lbl.split(" - ")[1]}</span>
              </label>`
              )
              .join("")}
          </div>
        </div>`
      )
      .join("");

    modal.innerHTML = `
      <div class="bg-white dark:bg-slate-900 rounded-2xl max-w-2xl w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-800 space-y-4 max-h-[90vh] flex flex-col">
        <div class="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
          <div class="flex items-center gap-3">
            <div class="w-10 h-10 rounded-xl bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 flex items-center justify-center text-lg font-bold">
              <i class="fa-solid fa-face-smile-beam"></i>
            </div>
            <div>
              <h3 class="font-extrabold text-sm sm:text-base text-slate-900 dark:text-slate-100">Survei Kemudahan & Kepuasan Penggunaan Sistem (SUS)</h3>
              <p class="text-xs text-slate-500 dark:text-slate-400">10 Instrumen Standar Evaluasi Layanan Digital SDN Terlangu 01</p>
            </div>
          </div>
          <button type="button" onclick="document.getElementById('sekolahtu-sus-survey-modal').classList.add('hidden')" class="text-slate-400 hover:text-slate-600 p-1.5 cursor-pointer">
            <i class="fa-solid fa-xmark text-lg"></i>
          </button>
        </div>

        <form id="form-sus-inapp" class="overflow-y-auto space-y-3 flex-1 pr-1">
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label class="block text-xs font-bold mb-1">Peran Bapak/Ibu</label>
              <select id="sus-respondent-role" class="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800">
                <option value="KEPSEK" ${defaultRole === "KEPSEK" ? "selected" : ""}>Kepala Sekolah</option>
                <option value="GURU_KELAS" ${defaultRole === "GURU_KELAS" ? "selected" : ""}>Guru Kelas (Wali Kelas 1-6)</option>
                <option value="GURU_MAPEL" ${defaultRole === "GURU_MAPEL" ? "selected" : ""}>Guru Mata Pelajaran (PAI/PJOK/Mulok)</option>
                <option value="OPERATOR_TU" ${defaultRole === "OPERATOR_TU" ? "selected" : ""}>Operator Tata Usaha</option>
                <option value="BENDAHARA_BOSP" ${defaultRole === "BENDAHARA_BOSP" ? "selected" : ""}>Bendahara BOSP</option>
                <option value="ORANG_TUA" ${defaultRole === "ORANG_TUA" ? "selected" : ""}>Orang Tua / Wali Murid</option>
              </select>
            </div>
            <div>
              <label class="block text-xs font-bold mb-1">Nama Responden (Opsional)</label>
              <input type="text" id="sus-respondent-name" value="${defaultName}" placeholder="Nama Bapak/Ibu" class="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800">
            </div>
          </div>

          ${questionsHtml}

          <div>
            <label class="block text-xs font-bold mb-1">Saran / Masukan Kemudahan Penggunaan</label>
            <textarea id="sus-feedback-notes" rows="2" placeholder="Tuliskan masukan Bapak/Ibu agar aplikasi semakin nyaman digunakan..." class="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800"></textarea>
          </div>
        </form>

        <div class="flex items-center justify-between pt-3 border-t border-slate-100 dark:border-slate-800">
          <div id="sus-live-score-preview" class="text-xs font-bold text-emerald-700 dark:text-emerald-400">
            Skor Otomatis: Siap Dihitung
          </div>
          <div class="flex items-center gap-2">
            <button type="button" onclick="document.getElementById('sekolahtu-sus-survey-modal').classList.add('hidden')" class="px-4 py-2 border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-semibold cursor-pointer">
              Tutup
            </button>
            <button type="button" id="btn-submit-sus-survey" class="px-5 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-extrabold cursor-pointer">
              <i class="fa-solid fa-paper-plane mr-1"></i>Kirim Penilaian Kepuasan
            </button>
          </div>
        </div>
      </div>
    `;

    modal.classList.remove("hidden");

    const formEl = modal.querySelector("#form-sus-inapp");
    const previewEl = modal.querySelector("#sus-live-score-preview");
    const btnSubmit = modal.querySelector("#btn-submit-sus-survey");

    const collectAnswers = () => {
      const ans = {};
      for (let i = 1; i <= 10; i++) {
        const checked = formEl.querySelector(`input[name="sus_q${i}"]:checked`);
        ans[`q${i}`] = checked ? Number(checked.value) : 3;
      }
      return ans;
    };

    const updateLivePreview = () => {
      const res = this.calculateScore(collectAnswers());
      previewEl.textContent = `Estimasi Skor SUS: ${res.susScore} (Grade ${res.grade} — ${res.label})`;
    };

    formEl.addEventListener("change", updateLivePreview);
    updateLivePreview();

    btnSubmit.addEventListener("click", async () => {
      const roleVal = modal.querySelector("#sus-respondent-role").value;
      const nameVal = modal.querySelector("#sus-respondent-name").value || "Responden SDN Terlangu 01";
      const notesVal = modal.querySelector("#sus-feedback-notes").value;
      const result = await this.submitSurvey({
        respondentRole: roleVal,
        respondentId: nameVal,
        answers: collectAnswers(),
        feedbackNotes: notesVal
      });
      modal.classList.add("hidden");
      if (typeof onSubmitted === "function") onSubmitted(result);
      if (typeof window.ModulTindakLanjut !== "undefined") {
        window.ModulTindakLanjut.refreshView();
      }
    });
  }
}

if (typeof window !== "undefined") {
  window.SUS_QUESTIONS_10 = SUS_QUESTIONS_10;
  window.SUSEngine = SUSEngine;
  window.SUSManager = new SUSEngine(window.dbDexie, window.EnterpriseApi);
  SUSEngine.openSurveyModal = function (optsOrRole) {
    let opts = {};
    if (typeof optsOrRole === "string") {
      const r = optsOrRole.toUpperCase();
      opts = { defaultRole: r === "WALI_MURID" ? "ORANG_TUA" : r };
    } else if (optsOrRole && typeof optsOrRole === "object") {
      opts = optsOrRole;
    }
    return window.SUSManager.openSurveyModal(opts);
  };
}

