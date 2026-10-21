/* ==========================================================================
   SIM-TAS-SD: MODUL JADWAL PELAJARAN (SENIN - SABTU)
   Versi 2.3.0 - SDN Terlangu 01 Brebes
   Fitur:
   1. Manajemen matriks jadwal Senin s/d Sabtu (Jam 1 s/d 8) untuk Kelas 1 s/d 6.
   2. Isolasi edit berbasis peran (Guru Kelas hanya edit kelasnya; Guru Mapel mengampu slotnya).
   3. Presets Mata Pelajaran Kurikulum Merdeka & K13 + Muatan Lokal Brebes.
   4. Cetak Jadwal A4 Landscape Resmi Kedinasan + Kartu Jadwal Saku (Pocket Size).
   5. Salin jadwal antar kelas / semester & integrasi sinkronisasi cloud.
   ========================================================================== */

const ModulJadwal = {
    selectedKelas: "1",
    selectedTA: "",
    filterHari: "Semua",
    editModalData: null,

    HARI_LIST: ["Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"],

    SLOTS: [
        { jamKe: 1, mulai: "07:00", selesai: "07:35", label: "Jam Ke-1" },
        { jamKe: 2, mulai: "07:35", selesai: "08:10", label: "Jam Ke-2" },
        { jamKe: 3, mulai: "08:10", selesai: "08:45", label: "Jam Ke-3" },
        { jamKe: 4, mulai: "09:05", selesai: "09:40", label: "Jam Ke-4" },
        { jamKe: 5, mulai: "09:40", selesai: "10:15", label: "Jam Ke-5" },
        { jamKe: 6, mulai: "10:15", selesai: "10:50", label: "Jam Ke-6" },
        { jamKe: 7, mulai: "10:50", selesai: "11:25", label: "Jam Ke-7" },
        { jamKe: 8, mulai: "11:25", selesai: "12:00", label: "Jam Ke-8" }
    ],

    MAPEL_PRESETS: [
        "Upacara Bendera",
        "Pendidikan Agama Islam",
        "Pendidikan Pancasila",
        "Bahasa Indonesia",
        "Matematika",
        "IPAS (Ilmu Pengetahuan Alam & Sosial)",
        "PJOK (Pendidikan Jasmani)",
        "Seni Rupa / Seni Budaya",
        "Seni Musik",
        "Bahasa Inggris",
        "Bahasa Jawa (Mulok)",
        "Projek Penguatan Profil Pelajar Pancasila (P5)",
        "Senam Pagi & Pembiasaan Karakter",
        "Pramuka / Ekstrakurikuler"
    ],

    init() {
        this.selectedTA = DataStore.getActiveTA();
        const role = Auth.role();
        const gInfo = Auth.getGuruInfo ? Auth.getGuruInfo() : null;

        if (role === "guru" && gInfo && gInfo.isGuruKelas) {
            this.selectedKelas = String(gInfo.kelas).replace(/\D/g, "") || "1";
        }

        this.renderKelasSelector();
        this.renderGrid();
        this.bindEvents();
    },

    bindEvents() {
        const selKelas = document.getElementById("jadwal-select-kelas");
        if (selKelas) {
            selKelas.addEventListener("change", (e) => {
                this.selectedKelas = e.target.value;
                this.renderGrid();
            });
        }

        const selHari = document.getElementById("jadwal-select-hari");
        if (selHari) {
            selHari.addEventListener("change", (e) => {
                this.filterHari = e.target.value;
                this.renderGrid();
            });
        }
    },

    canEditCurrentClass() {
        const role = Auth.role();
        if (role === "admin" || role === "tu") return true;
        if (role === "guru") {
            const gInfo = Auth.getGuruInfo ? Auth.getGuruInfo() : null;
            if (!gInfo) return false;
            if (gInfo.isGuruKelas && String(gInfo.kelas).includes(this.selectedKelas)) return true;
            if (gInfo.isGuruMapel) return true; // dapat mengedit slot mapelnya
        }
        return false;
    },

    renderKelasSelector() {
        const container = document.getElementById("jadwal-select-kelas");
        if (!container) return;

        const role = Auth.role();
        const gInfo = Auth.getGuruInfo ? Auth.getGuruInfo() : null;

        let options = [1, 2, 3, 4, 5, 6].map(k => `<option value="${k}">Kelas ${k} (Fase ${k <= 2 ? 'A' : (k <= 4 ? 'B' : 'C')})</option>`).join("");
        container.innerHTML = options;

        if (role === "guru" && gInfo && gInfo.isGuruKelas) {
            const k = String(gInfo.kelas).replace(/\D/g, "") || "1";
            container.value = k;
            container.disabled = true;
            this.selectedKelas = k;
        } else {
            container.disabled = false;
            container.value = this.selectedKelas || "1";
        }
    },

    getWaliKelas(kelas) {
        const tendiks = DataStore.getTendik();
        const found = tendiks.find(t => t.jabatan && t.jabatan.toLowerCase().includes(`kelas ${kelas}`));
        return found ? found.nama : "Guru Kelas";
    },

    renderGrid() {
        const container = document.getElementById("jadwal-grid-container");
        if (!container) return;

        const kelas = this.selectedKelas;
        const allJadwal = DataStore.getJadwal(kelas, this.selectedTA);
        const canEdit = this.canEditCurrentClass();
        const wali = this.getWaliKelas(kelas);

        // Update header banner & badge info
        const badge = document.getElementById("jadwal-badge-kelas");
        if (badge) {
            badge.textContent = `Kelas ${kelas} • TA ${this.selectedTA || '2025/2026'} (${allJadwal.length} Jam/Minggu)`;
        }

        const infoTitle = document.getElementById("jadwal-kelas-title");
        if (infoTitle) infoTitle.textContent = `Jadwal Pelajaran Kelas ${kelas}`;
        const infoWali = document.getElementById("jadwal-wali-text");
        if (infoWali) infoWali.textContent = `Wali Kelas: ${wali} • Tahun Ajaran: ${this.selectedTA}`;

        // Map jadwal by key: `${hari}_${jamKe}`
        const map = {};
        allJadwal.forEach(j => {
            const key = `${j.hari}_${j.jamKe}`;
            map[key] = j;
        });

        const activeHariList = (this.filterHari && this.filterHari !== "Semua") 
            ? [this.filterHari] 
            : this.HARI_LIST;

        let html = `
            <div class="overflow-x-auto rounded-2xl border border-slate-200 shadow-sm bg-white">
                <table class="w-full text-left border-collapse min-w-[800px]">
                    <thead>
                        <tr class="bg-gradient-to-r from-blue-900 via-indigo-900 to-blue-950 text-white text-xs">
                            <th class="p-3.5 text-center font-bold border-r border-blue-800/60 w-24">Jam / Waktu</th>
                            ${activeHariList.map(h => `
                                <th class="p-3.5 text-center font-bold border-r border-blue-800/60 last:border-r-0">
                                    <div class="text-sm tracking-wide font-extrabold">${h}</div>
                                </th>
                            `).join("")}
                        </tr>
                    </thead>
                    <tbody class="divide-y divide-slate-100 text-xs">
        `;

        this.SLOTS.forEach((slot, sIdx) => {
            // Sisipkan baris istirahat setelah Jam 3
            if (slot.jamKe === 4) {
                html += `
                    <tr class="bg-amber-50/70 border-y-2 border-amber-200">
                        <td class="p-2 text-center font-bold text-amber-800 bg-amber-100/70 border-r border-amber-200">
                            08:45 - 09:05
                        </td>
                        <td colspan="${activeHariList.length}" class="p-2 text-center font-bold text-amber-900 tracking-wider">
                            <i class="fa-solid fa-mug-hot mr-1.5 text-amber-600"></i> ISTIRAHAT PAGI (20 MENIT)
                        </td>
                    </tr>
                `;
            }

            html += `
                <tr class="hover:bg-slate-50/60 transition-colors">
                    <td class="p-2.5 text-center font-mono font-bold text-slate-600 bg-slate-50 border-r border-slate-200">
                        <div class="text-xs text-blue-950">${slot.label}</div>
                        <div class="text-[10px] text-slate-400 font-normal mt-0.5">${slot.mulai} - ${slot.selesai}</div>
                    </td>
            `;

            activeHariList.forEach(hari => {
                const key = `${hari}_${slot.jamKe}`;
                const item = map[key];
                const mapel = item?.mapel || "";
                const guru = item?.guru || "";

                // Warna kartu berdasarkan jenis mapel
                let badgeColor = "bg-slate-50 border-slate-200 text-slate-700";
                let icon = "fa-book";
                if (mapel.includes("Pendidikan Agama")) { badgeColor = "bg-emerald-50 border-emerald-200 text-emerald-900"; icon = "fa-mosque"; }
                else if (mapel.includes("PJOK")) { badgeColor = "bg-rose-50 border-rose-200 text-rose-900"; icon = "fa-volleyball"; }
                else if (mapel.includes("Matematika")) { badgeColor = "bg-blue-50 border-blue-200 text-blue-900"; icon = "fa-calculator"; }
                else if (mapel.includes("Bahasa Indonesia")) { badgeColor = "bg-amber-50 border-amber-200 text-amber-900"; icon = "fa-spell-check"; }
                else if (mapel.includes("IPAS")) { badgeColor = "bg-teal-50 border-teal-200 text-teal-900"; icon = "fa-flask"; }
                else if (mapel.includes("Upacara")) { badgeColor = "bg-indigo-50 border-indigo-200 text-indigo-900"; icon = "fa-flag"; }
                else if (mapel.includes("Pramuka") || mapel.includes("P5")) { badgeColor = "bg-purple-50 border-purple-200 text-purple-900"; icon = "fa-campground"; }

                html += `
                    <td class="p-2 border-r border-slate-100 last:border-r-0 align-top">
                        ${mapel ? `
                            <div class="p-2.5 rounded-xl border ${badgeColor} transition hover:shadow-xs relative group cursor-pointer"
                                onclick="${canEdit ? `ModulJadwal.openEditModal('${hari}', ${slot.jamKe})` : `App.showToast('${Sec.esc(mapel)} - ${Sec.esc(guru || wali)}', 'info')`}">
                                <div class="flex items-center gap-1.5 font-bold text-xs leading-tight">
                                    <i class="fa-solid ${icon} text-[11px] opacity-75"></i>
                                    <span>${Sec.esc(mapel)}</span>
                                </div>
                                <div class="text-[10px] text-slate-500 mt-1 truncate" title="${Sec.esc(guru || wali)}">
                                    <i class="fa-solid fa-user-tie text-[9px] mr-1 opacity-60"></i>${Sec.esc(guru || wali)}
                                </div>
                                ${canEdit ? `
                                    <button onclick="event.stopPropagation(); ModulJadwal.openEditModal('${hari}', ${slot.jamKe})"
                                        class="absolute top-1.5 right-1.5 opacity-0 group-hover:opacity-100 transition p-1 text-slate-400 hover:text-blue-600 bg-white/80 rounded-md shadow-xs" title="Edit Jam Ini">
                                        <i class="fa-solid fa-pencil text-[10px]"></i>
                                    </button>
                                ` : ''}
                            </div>
                        ` : `
                            <div class="h-16 rounded-xl border border-dashed border-slate-200 flex flex-col items-center justify-center text-slate-300 hover:border-blue-300 hover:bg-blue-50/30 transition cursor-pointer"
                                onclick="${canEdit ? `ModulJadwal.openEditModal('${hari}', ${slot.jamKe})` : `App.showToast('Jadwal kosong', 'info')`}">
                                <i class="fa-solid fa-plus text-xs mb-0.5"></i>
                                <span class="text-[9px] font-medium text-slate-400">Kosong</span>
                            </div>
                        `}
                    </td>
                `;
            });

            html += `</tr>`;
        });

        html += `
                    </tbody>
                </table>
            </div>
        `;

        container.innerHTML = html;
        this.renderStats(allJadwal);
    },

    renderStats(allJadwal) {
        const totalSlot = allJadwal.length;
        const countEl = document.getElementById("jadwal-stat-total-jam");
        if (countEl) countEl.textContent = `${totalSlot} Jam Pelajaran / Minggu`;

        // Hitung distribusi mapel
        const counts = {};
        allJadwal.forEach(j => {
            if (j.mapel) counts[j.mapel] = (counts[j.mapel] || 0) + 1;
        });

        const badgeBox = document.getElementById("jadwal-distribution-badges");
        if (badgeBox) {
            badgeBox.innerHTML = Object.entries(counts).map(([m, cnt]) => `
                <span class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-semibold bg-slate-100 text-slate-700 border border-slate-200">
                    <span class="font-bold text-blue-900">${cnt} JP</span> ${Sec.esc(m)}
                </span>
            `).join("");
        }
    },

    openModal(hari, jamKe) {
        this.openEditModal(hari || "Senin", jamKe || 1);
    },

    closeModal() {
        this.closeEditModal();
    },

    openEditModal(hari, jamKe) {
        if (!this.canEditCurrentClass()) {
            App.showToast("Anda tidak memiliki wewenang mengedit jadwal kelas ini.", "warning");
            return;
        }

        hari = hari || "Senin";
        jamKe = Number(jamKe) || 1;
        const slot = this.SLOTS.find(s => s.jamKe === jamKe) || { mulai: "07:00", selesai: "07:35" };
        const allJadwal = DataStore.getJadwal(this.selectedKelas, this.selectedTA);
        const item = allJadwal.find(j => j.hari === hari && j.jamKe === jamKe) || {};

        this.editModalData = {
            id: item.id || `JDW-${this.selectedKelas}-${hari.substring(0, 3).toUpperCase()}-${jamKe}`,
            kelas: this.selectedKelas,
            hari,
            jamKe,
            waktuMulai: item.waktuMulai || slot.mulai,
            waktuSelesai: item.waktuSelesai || slot.selesai,
            mapel: item.mapel || "",
            guru: item.guru || this.getWaliKelas(this.selectedKelas),
            nip: item.nip || "",
            ruang: item.ruang || `Ruang Kelas ${this.selectedKelas}`
        };

        // Buka modal
        const modal = document.getElementById("modal-edit-jadwal");
        if (!modal) return;

        const titleEl = document.getElementById("jadwal-modal-title") || document.getElementById("modal-jadwal-title");
        if (titleEl) titleEl.textContent = `Tambah / Edit Jadwal: ${hari}, Jam Ke-${jamKe} (Kelas ${this.selectedKelas})`;

        const selRombel = document.getElementById("jadwal-form-rombel");
        if (selRombel) selRombel.value = this.selectedKelas;

        const formHari = document.getElementById("jadwal-form-hari") || document.getElementById("form-jadwal-hari");
        if (formHari) formHari.value = hari;

        const formJam = document.getElementById("jadwal-form-jam") || document.getElementById("form-jadwal-jamke");
        if (formJam) formJam.value = String(jamKe);

        const formMulai = document.getElementById("jadwal-form-mulai") || document.getElementById("form-jadwal-mulai");
        if (formMulai) formMulai.value = this.editModalData.waktuMulai;

        const formSelesai = document.getElementById("jadwal-form-selesai") || document.getElementById("form-jadwal-selesai");
        if (formSelesai) formSelesai.value = this.editModalData.waktuSelesai;

        const formMapel = document.getElementById("jadwal-form-mapel") || document.getElementById("form-jadwal-mapel");
        if (formMapel) formMapel.value = this.editModalData.mapel;

        const formRuang = document.getElementById("jadwal-form-ruang");
        if (formRuang) formRuang.value = this.editModalData.ruang;

        // Populate guru dropdown
        const selGuru = document.getElementById("jadwal-form-guru") || document.getElementById("form-jadwal-guru");
        if (selGuru) {
            const tendiks = DataStore.getTendik();
            selGuru.innerHTML = `<option value="">-- Pilih Guru Pengampu --</option>` +
                tendiks.map(t => `<option value="${Sec.esc(t.nama)}" data-nip="${t.nip}" ${t.nama === this.editModalData.guru ? 'selected' : ''}>${Sec.esc(t.nama)} (${t.jabatan})</option>`).join("");
        }

        modal.classList.remove("hidden");
    },

    closeEditModal() {
        const modal = document.getElementById("modal-edit-jadwal");
        if (modal) modal.classList.add("hidden");
        this.editModalData = null;
    },

    async saveSlot(event) {
        if (event && event.preventDefault) event.preventDefault();
        await this.saveEditModal();
    },

    async saveEditModal() {
        const kelas = document.getElementById("jadwal-form-rombel")?.value || this.selectedKelas;
        const hari = (document.getElementById("jadwal-form-hari") || document.getElementById("form-jadwal-hari"))?.value || "Senin";
        const jamKe = Number((document.getElementById("jadwal-form-jam") || document.getElementById("form-jadwal-jamke"))?.value || 1);
        const mapel = (document.getElementById("jadwal-form-mapel") || document.getElementById("form-jadwal-mapel"))?.value?.trim() || "";
        const mulai = (document.getElementById("jadwal-form-mulai") || document.getElementById("form-jadwal-mulai"))?.value || "07:00";
        const selesai = (document.getElementById("jadwal-form-selesai") || document.getElementById("form-jadwal-selesai"))?.value || "07:35";
        const selGuru = document.getElementById("jadwal-form-guru") || document.getElementById("form-jadwal-guru");
        const guru = selGuru?.value || "";
        const nip = selGuru?.selectedOptions[0]?.getAttribute("data-nip") || "";
        const ruang = document.getElementById("jadwal-form-ruang")?.value?.trim() || `Ruang Kelas ${kelas}`;

        const slotId = (this.editModalData && this.editModalData.id) 
            ? this.editModalData.id 
            : `JDW-${kelas}-${hari.substring(0, 3).toUpperCase()}-${jamKe}`;

        const payloadItem = {
            id: slotId,
            kelas: String(kelas),
            tahunAjaran: this.selectedTA,
            hari,
            jamKe,
            waktuMulai: mulai,
            waktuSelesai: selesai,
            mapel,
            guru,
            nip,
            ruang
        };

        const res = await ApiClient.request("saveJadwal", { item: payloadItem });
        if (res && res.success) {
            App.showToast("Jadwal pelajaran berhasil diperbarui!", "success");
            this.closeEditModal();
            this.renderGrid();
            App.updateDashboardStats();
        } else {
            App.showToast(res?.message || "Gagal menyimpan jadwal", "error");
        }
    },

    async deleteSlot() {
        await this.clearCurrentSlot();
    },

    async clearCurrentSlot() {
        const kelas = document.getElementById("jadwal-form-rombel")?.value || this.selectedKelas;
        const hari = (document.getElementById("jadwal-form-hari") || document.getElementById("form-jadwal-hari"))?.value || (this.editModalData?.hari || "Senin");
        const jamKe = Number((document.getElementById("jadwal-form-jam") || document.getElementById("form-jadwal-jamke"))?.value || (this.editModalData?.jamKe || 1));

        if (!confirm(`Kosongkan mata pelajaran untuk ${hari} Jam Ke-${jamKe} Kelas ${kelas}?`)) return;

        const slotId = (this.editModalData && this.editModalData.id)
            ? this.editModalData.id
            : `JDW-${kelas}-${hari.substring(0, 3).toUpperCase()}-${jamKe}`;

        const payloadItem = {
            id: slotId,
            kelas: String(kelas),
            tahunAjaran: this.selectedTA,
            hari,
            jamKe,
            waktuMulai: (document.getElementById("jadwal-form-mulai") || document.getElementById("form-jadwal-mulai"))?.value || "07:00",
            waktuSelesai: (document.getElementById("jadwal-form-selesai") || document.getElementById("form-jadwal-selesai"))?.value || "07:35",
            mapel: "",
            guru: "",
            nip: ""
        };

        await ApiClient.request("saveJadwal", { item: payloadItem });
        App.showToast("Slot jadwal berhasil dikosongkan.", "info");
        this.closeEditModal();
        this.renderGrid();
        App.updateDashboardStats();
    },

    // -------------------------------------------------------------------------
    // PRESET MERDEKA: Isi jadwal standar Kurikulum Merdeka secara otomatis
    // -------------------------------------------------------------------------
    async applyPresetMerdeka() {
        if (!this.canEditCurrentClass()) {
            App.showToast("Anda tidak memiliki hak akses mengedit jadwal kelas ini.", "warning");
            return;
        }

        const kelas = this.selectedKelas;
        if (!confirm(`Terapkan Preset Kurikulum Merdeka untuk Kelas ${kelas}?\nJadwal mingguan akan diisi dengan pola mata pelajaran standar Kurikulum Merdeka.`)) return;

        const wali = this.getWaliKelas(kelas);
        const tendiks = DataStore.getTendik();
        const guruAgama = tendiks.find(t => t.jabatan && t.jabatan.includes("PAI"))?.nama || "Siti Fatimah, S.Pd.I";
        const nipAgama = tendiks.find(t => t.jabatan && t.jabatan.includes("PAI"))?.nip || "19910214 201708 2 004";
        const guruPJOK = tendiks.find(t => t.jabatan && t.jabatan.includes("PJOK"))?.nama || "Agus Triyono, S.Pd.Jas";
        const nipPJOK = tendiks.find(t => t.jabatan && t.jabatan.includes("PJOK"))?.nip || "19850904 201001 1 015";
        const nipWali = tendiks.find(t => t.jabatan && t.jabatan.toLowerCase().includes(`kelas ${kelas}`))?.nip || "";

        const presetDefinitions = [
            // Senin
            { hari: "Senin", jamKe: 1, mapel: "Upacara Bendera", guru: wali, nip: nipWali },
            { hari: "Senin", jamKe: 2, mapel: "Pendidikan Pancasila", guru: wali, nip: nipWali },
            { hari: "Senin", jamKe: 3, mapel: "Bahasa Indonesia", guru: wali, nip: nipWali },
            { hari: "Senin", jamKe: 4, mapel: "Bahasa Indonesia", guru: wali, nip: nipWali },
            { hari: "Senin", jamKe: 5, mapel: "Matematika", guru: wali, nip: nipWali },
            // Selasa
            { hari: "Selasa", jamKe: 1, mapel: "Pendidikan Agama Islam", guru: guruAgama, nip: nipAgama },
            { hari: "Selasa", jamKe: 2, mapel: "Pendidikan Agama Islam", guru: guruAgama, nip: nipAgama },
            { hari: "Selasa", jamKe: 3, mapel: "Bahasa Indonesia", guru: wali, nip: nipWali },
            { hari: "Selasa", jamKe: 4, mapel: Number(kelas) >= 3 ? "IPAS" : "Matematika", guru: wali, nip: nipWali },
            // Rabu
            { hari: "Rabu", jamKe: 1, mapel: "PJOK (Pendidikan Jasmani)", guru: guruPJOK, nip: nipPJOK },
            { hari: "Rabu", jamKe: 2, mapel: "PJOK (Pendidikan Jasmani)", guru: guruPJOK, nip: nipPJOK },
            { hari: "Rabu", jamKe: 3, mapel: "Bahasa Jawa (Mulok)", guru: wali, nip: nipWali },
            { hari: "Rabu", jamKe: 4, mapel: "Seni Rupa / Seni Budaya", guru: wali, nip: nipWali },
            // Kamis
            { hari: "Kamis", jamKe: 1, mapel: "Matematika", guru: wali, nip: nipWali },
            { hari: "Kamis", jamKe: 2, mapel: Number(kelas) >= 3 ? "IPAS" : "Bahasa Indonesia", guru: wali, nip: nipWali },
            { hari: "Kamis", jamKe: 3, mapel: "Pendidikan Pancasila", guru: wali, nip: nipWali },
            { hari: "Kamis", jamKe: 4, mapel: "Bahasa Inggris", guru: wali, nip: nipWali },
            // Jumat
            { hari: "Jumat", jamKe: 1, mapel: "Senam Pagi & Pembiasaan Karakter", guru: wali, nip: nipWali },
            { hari: "Jumat", jamKe: 2, mapel: "Projek P5 (Kearifan Lokal)", guru: wali, nip: nipWali },
            // Sabtu
            { hari: "Sabtu", jamKe: 1, mapel: "Pramuka / Ekstrakurikuler", guru: wali, nip: nipWali },
            { hari: "Sabtu", jamKe: 2, mapel: "Literasi & Numerasi", guru: wali, nip: nipWali }
        ];

        const allJadwal = DataStore.getJadwalAll();
        const otherJadwal = allJadwal.filter(j => !(String(j.kelas) === String(kelas) && (!j.tahunAjaran || j.tahunAjaran === this.selectedTA)));

        const newSlots = presetDefinitions.map(p => {
            const slot = this.SLOTS.find(s => s.jamKe === p.jamKe) || { mulai: "07:00", selesai: "07:35" };
            return {
                id: `JDW-${kelas}-${p.hari.substring(0, 3).toUpperCase()}-${p.jamKe}`,
                kelas: String(kelas),
                tahunAjaran: this.selectedTA,
                hari: p.hari,
                jamKe: p.jamKe,
                waktuMulai: slot.mulai,
                waktuSelesai: slot.selesai,
                mapel: p.mapel,
                guru: p.guru,
                nip: p.nip,
                ruang: `Ruang Kelas ${kelas}`
            };
        });

        const merged = [...otherJadwal, ...newSlots];
        DataStore.saveJadwalAll(merged);

        if (ApiClient.isCloudActive()) {
            for (const item of newSlots) {
                await ApiClient.request("saveJadwal", { item });
            }
        }

        App.showToast(`Preset Merdeka berhasil diterapkan untuk Kelas ${kelas} (${newSlots.length} slot)!`, "success");
        this.renderGrid();
        App.updateDashboardStats();
    },

    printLandscape() {
        this.printJadwalA4();
    },

    printPocketCard() {
        this.printJadwalPocket();
    },

    // -------------------------------------------------------------------------
    // CETAK JADWAL PELAJARAN (A4 RESMI & POCKET SIZE)
    // -------------------------------------------------------------------------
    printJadwalA4() {
        const kelas = this.selectedKelas;
        const config = DataStore.getConfig();
        const wali = this.getWaliKelas(kelas);
        const jadwalList = DataStore.getJadwal(kelas, this.selectedTA);

        const map = {};
        jadwalList.forEach(j => { map[`${j.hari}_${j.jamKe}`] = j; });

        const printWin = window.open("", "_blank");
        if (!printWin) {
            App.showToast("Pop-up diblokir browser. Izinkan pop-up untuk mencetak jadwal.", "warning");
            return;
        }

        printWin.document.write(`
            <!DOCTYPE html>
            <html lang="id">
            <head>
                <meta charset="UTF-8">
                <title>Jadwal Pelajaran Kelas ${kelas} - ${config.namaSekolah}</title>
                <style>
                    @page { size: A4 landscape; margin: 12mm 15mm; }
                    body { font-family: 'Times New Roman', Times, serif; color: #000; margin: 0; padding: 0; font-size: 11pt; }
                    .kop { text-align: center; border-bottom: 3px double #000; padding-bottom: 6px; margin-bottom: 12px; }
                    .kop h2 { margin: 0; font-size: 14pt; font-weight: bold; text-transform: uppercase; }
                    .kop h1 { margin: 2px 0; font-size: 16pt; font-weight: bold; }
                    .kop p { margin: 0; font-size: 9.5pt; font-style: italic; }
                    .title-area { text-align: center; margin-bottom: 12px; }
                    .title-area h3 { margin: 0; font-size: 13pt; text-decoration: underline; text-transform: uppercase; }
                    .title-area p { margin: 3px 0 0; font-size: 10pt; font-weight: bold; }
                    table { width: 100%; border-collapse: collapse; margin-top: 8px; }
                    th, td { border: 1px solid #000; padding: 5px 6px; text-align: center; font-size: 9.5pt; }
                    th { background-color: #f2f2f2; font-weight: bold; }
                    .istirahat { background-color: #eee; font-weight: bold; font-style: italic; }
                    .ttd-box { width: 100%; margin-top: 25px; display: table; }
                    .ttd-col { display: table-cell; width: 50%; text-align: center; font-size: 10pt; }
                </style>
            </head>
            <body>
                <div class="kop">
                    <h2>PEMERINTAH KABUPATEN BREBES</h2>
                    <h2>DINAS PENDIDIKAN PEMUDA DAN OLAHRAGA</h2>
                    <h1>${config.namaSekolah}</h1>
                    <p>${config.alamat} • NPSN: ${config.npsn} • Email: ${config.email}</p>
                </div>

                <div class="title-area">
                    <h3>JADWAL PELAJARAN KELAS ${kelas}</h3>
                    <p>TAHUN AJARAN ${this.selectedTA} (SEMESTER GENAP)</p>
                </div>

                <table>
                    <thead>
                        <tr>
                            <th style="width: 12%;">WAKTU</th>
                            ${this.HARI_LIST.map(h => `<th style="width: 14.6%;">${h.toUpperCase()}</th>`).join("")}
                        </tr>
                    </thead>
                    <tbody>
                        ${this.SLOTS.map(slot => {
                            let row = "";
                            if (slot.jamKe === 4) {
                                row += `
                                    <tr class="istirahat">
                                        <td>08.45 - 09.05</td>
                                        <td colspan="6">ISTIRAHAT</td>
                                    </tr>
                                `;
                            }
                            row += `
                                <tr>
                                    <td><strong>Jam ${slot.jamKe}</strong><br><small>${slot.mulai} - ${slot.selesai}</small></td>
                                    ${this.HARI_LIST.map(hari => {
                                        const it = map[`${hari}_${slot.jamKe}`];
                                        return `<td><strong>${it && it.mapel ? it.mapel : '-'}</strong>${it && it.guru ? `<br><small>(${it.guru})</small>` : ''}</td>`;
                                    }).join("")}
                                </tr>
                            `;
                            return row;
                        }).join("")}
                    </tbody>
                </table>

                <div class="ttd-box">
                    <div class="ttd-col">
                        <br>Mengetahui,<br>Kepala Sekolah<br><br><br><br>
                        <strong>${config.namaKepalaSekolah}</strong><br>
                        NIP. ${config.nipKepalaSekolah}
                    </div>
                    <div class="ttd-col">
                        Brebes, ${new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}<br>
                        Guru / Wali Kelas ${kelas}<br><br><br><br>
                        <strong>${wali}</strong>
                    </div>
                </div>

                <script>
                    window.onload = function() { window.print(); };
                </script>
            </body>
            </html>
        `);
        printWin.document.close();
    },

    // Inovasi 6: Cetak Kartu Jadwal Saku (Pocket Size)
    printJadwalPocket() {
        const kelas = this.selectedKelas;
        const config = DataStore.getConfig();
        const jadwalList = DataStore.getJadwal(kelas, this.selectedTA);
        const wali = this.getWaliKelas(kelas);

        const map = {};
        jadwalList.forEach(j => { map[`${j.hari}_${j.jamKe}`] = j; });

        const printWin = window.open("", "_blank");
        if (!printWin) return;

        printWin.document.write(`
            <!DOCTYPE html>
            <html lang="id">
            <head>
                <meta charset="UTF-8">
                <title>Kartu Jadwal Saku Kelas ${kelas}</title>
                <style>
                    @page { size: portrait; margin: 10mm; }
                    body { font-family: sans-serif; margin: 0; padding: 10px; background: #fff; }
                    .card { width: 85mm; border: 2px solid #1e3a8a; border-radius: 12px; padding: 10px; margin: 0 auto; box-shadow: 0 4px 6px rgba(0,0,0,0.1); }
                    .header { text-align: center; background: #1e3a8a; color: white; padding: 6px; border-radius: 8px; margin-bottom: 8px; }
                    .header h4 { margin: 0; font-size: 11pt; }
                    .header p { margin: 2px 0 0; font-size: 8pt; opacity: 0.9; }
                    table { width: 100%; border-collapse: collapse; font-size: 7.5pt; }
                    th, td { border: 1px solid #cbd5e1; padding: 3px 4px; text-align: left; }
                    th { background: #f8fafc; font-weight: bold; text-align: center; }
                    .footer { text-align: center; font-size: 7pt; color: #64748b; margin-top: 6px; }
                </style>
            </head>
            <body>
                <div class="card">
                    <div class="header">
                        <h4>JADWAL SAKU KELAS ${kelas}</h4>
                        <p>${config.namaSekolah} • TA ${this.selectedTA}</p>
                    </div>
                    <table>
                        <thead>
                            <tr>
                                <th style="width: 25%;">HARI</th>
                                <th>MATA PELAJARAN</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${this.HARI_LIST.map(hari => {
                                const mapels = [];
                                for (let j = 1; j <= 8; j++) {
                                    const it = map[`${hari}_${j}`];
                                    if (it && it.mapel && !mapels.includes(it.mapel)) mapels.push(it.mapel);
                                }
                                return `
                                    <tr>
                                        <td><strong>${hari}</strong></td>
                                        <td>${mapels.length > 0 ? mapels.join(", ") : '-'}</td>
                                    </tr>
                                `;
                            }).join("")}
                        </tbody>
                    </table>
                    <div class="footer">Wali Kelas: ${wali} • Simpan di dompet / meja belajar</div>
                </div>
                <script>window.onload = function() { window.print(); };</script>
            </body>
            </html>
        `);
        printWin.document.close();
    }
};

window.ModulJadwal = ModulJadwal;
