/* ==========================================================================
   SIM-TAS-SD: MODUL PROGRAM INDONESIA PINTAR (PIP KEMENDIKBUD)
   Versi 2.0.0 - SDN Terlangu 01 Brebes
   Fitur:
   1. Dasbor & Visualisasi Analitik Desil Kemiskinan (1-4, 5-7, 8-10) & Status SK.
   2. Data Pengusulan PIP (Format Dapodik/Puslapdik 2026) + Impor Excel.
   3. Data Penerima PIP (Format SK Puslapdik Kemendikbud 2026) + Impor Excel + Toggle Cair.
   4. Integrasi 1-Klik Cetak Rekomendasi Pencairan BRI & Aktif Belajar PIP.
   5. Smart Audit PIP x Dapodik (Inovasi 3) & Poverty Vulnerability Radar (Inovasi 4).
   ========================================================================== */

const ModulPIP = {
    activeTab: "dasbor", // dasbor, pengusulan, penerima
    searchQuery: "",
    filterKelas: "Semua",
    filterDesil: "Semua",
    filterStatusSK: "Semua",
    filterTahap: "Semua",
    filterStatusCair: "Semua",
    chartDesilInstance: null,

    init() {
        const role = Auth.role();
        const gInfo = Auth.getGuruInfo ? Auth.getGuruInfo() : null;
        if (role === "guru" && gInfo && gInfo.isGuruKelas) {
            this.filterKelas = String(gInfo.kelas).replace(/\D/g, "") || "1";
        }

        this.bindEvents();
        this.renderActiveTab();
    },

    bindEvents() {
        // Tab switching
        document.querySelectorAll(".pip-subtab-btn").forEach(btn => {
            btn.addEventListener("click", () => {
                const tab = btn.getAttribute("data-tab");
                if (tab) this.switchTab(tab);
            });
        });
    },

    switchTab(tab) {
        this.activeTab = tab;
        document.querySelectorAll(".pip-subtab-btn").forEach(btn => {
            const isTarget = btn.getAttribute("data-tab") === tab;
            btn.classList.toggle("active-subtab", isTarget);
            btn.classList.toggle("bg-blue-900", isTarget);
            btn.classList.toggle("text-white", isTarget);
            btn.classList.toggle("bg-white", !isTarget);
            btn.classList.toggle("text-slate-600", !isTarget);
        });

        document.querySelectorAll(".pip-tab-content").forEach(el => el.classList.add("hidden"));
        const targetContent = document.getElementById(`pip-tab-${tab}`);
        if (targetContent) targetContent.classList.remove("hidden");

        this.renderActiveTab();
    },

    renderActiveTab() {
        if (this.activeTab === "dasbor") this.renderDasbor();
        else if (this.activeTab === "pengusulan") this.renderPengusulan();
        else if (this.activeTab === "penerima") this.renderPenerima();
    },

    // -------------------------------------------------------------------------
    // 1. DASBOR & ANALITIK DESIL PIP
    // -------------------------------------------------------------------------
    renderDasbor() {
        const role = Auth.role();
        const gInfo = Auth.getGuruInfo ? Auth.getGuruInfo() : null;
        let pengusulan = DataStore.getPIPPengusulan();
        let penerima = DataStore.getPIPPenerima();

        // Jika Guru Kelas, fokuskan statistik ke kelas binaan
        if (role === "guru" && gInfo && gInfo.isGuruKelas) {
            const k = String(gInfo.kelas).replace(/\D/g, "");
            pengusulan = pengusulan.filter(p => String(p.kelas).includes(k));
            penerima = penerima.filter(p => String(p.kelas).includes(k));
            const subTitle = document.getElementById("pip-dasbor-scope-badge");
            if (subTitle) subTitle.textContent = `Khusus Kelas ${k} Binaan`;
        } else {
            const subTitle = document.getElementById("pip-dasbor-scope-badge");
            if (subTitle) subTitle.textContent = `Seluruh Rombel Sekolah`;
        }

        // Metrik Ringkasan
        const totalUsulan = pengusulan.length;
        const masukSK = pengusulan.filter(p => p.statusSK && p.statusSK.toLowerCase().includes("sudah")).length;
        const belumSK = totalUsulan - masukSK;

        const totalPenerima = penerima.length;
        const sudahCair = penerima.filter(p => p.statusCair && p.statusCair.toLowerCase().includes("sudah")).length;
        const belumCair = totalPenerima - sudahCair;
        const totalDana = penerima.reduce((sum, p) => sum + (Number(p.nominal) || 450000), 0);

        // Desil Groups
        const desil1_4 = pengusulan.filter(p => Number(p.desil) >= 1 && Number(p.desil) <= 4).length;
        const desil5_7 = pengusulan.filter(p => Number(p.desil) >= 5 && Number(p.desil) <= 7).length;
        const desil8_10 = pengusulan.filter(p => Number(p.desil) >= 8 && Number(p.desil) <= 10).length;

        // Update DOM elements
        const elTotalUsulan = document.getElementById("pip-stat-total-usulan");
        if (elTotalUsulan) elTotalUsulan.textContent = totalUsulan;
        const elMasukSK = document.getElementById("pip-stat-masuk-sk");
        if (elMasukSK) elMasukSK.textContent = masukSK;
        const elBelumSK = document.getElementById("pip-stat-belum-sk");
        if (elBelumSK) elBelumSK.textContent = belumSK;

        const elTotalPenerima = document.getElementById("pip-stat-total-penerima");
        if (elTotalPenerima) elTotalPenerima.textContent = totalPenerima;
        const elSudahCair = document.getElementById("pip-stat-sudah-cair");
        if (elSudahCair) elSudahCair.textContent = sudahCair;
        const elBelumCair = document.getElementById("pip-stat-belum-cair");
        if (elBelumCair) elBelumCair.textContent = belumCair;
        const elTotalDana = document.getElementById("pip-stat-total-dana");
        if (elTotalDana) elTotalDana.textContent = `Rp ${totalDana.toLocaleString("id-ID")}`;

        const elD1 = document.getElementById("pip-stat-desil-1-4");
        if (elD1) elD1.textContent = `${desil1_4} Siswa`;
        const elD2 = document.getElementById("pip-stat-desil-5-7");
        if (elD2) elD2.textContent = `${desil5_7} Siswa`;
        const elD3 = document.getElementById("pip-stat-desil-8-10");
        if (elD3) elD3.textContent = `${desil8_10} Siswa`;

        // Render Chart Desil Bar Chart
        this.renderDesilChart(desil1_4, desil5_7, desil8_10);

        // Render Breakdown Per Kelas
        this.renderKelasBreakdown(pengusulan, penerima);

        // Inovasi 4: Render Poverty Vulnerability Radar
        this.renderVulnerabilityRadar(pengusulan);
    },

    renderDesilChart(d1, d2, d3) {
        const canvas = document.getElementById("chart-pip-desil");
        if (!canvas || typeof Chart === "undefined") return;

        if (this.chartDesilInstance) {
            this.chartDesilInstance.destroy();
        }

        const ctx = canvas.getContext("2d");
        this.chartDesilInstance = new Chart(ctx, {
            type: "bar",
            data: {
                labels: ["Desil 1 - 4 (Sangat Miskin / Prioritas 1)", "Desil 5 - 7 (Rentan Miskin)", "Desil 8 - 10 (Menengah)"],
                datasets: [{
                    label: "Jumlah Siswa",
                    data: [d1, d2, d3],
                    backgroundColor: [
                        "rgba(225, 29, 72, 0.85)",  // Rose 600
                        "rgba(217, 119, 6, 0.85)",  // Amber 600
                        "rgba(13, 148, 136, 0.85)"  // Teal 600
                    ],
                    borderColor: [
                        "#be123c",
                        "#b45309",
                        "#0f766e"
                    ],
                    borderWidth: 1.5,
                    borderRadius: 8
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { display: false },
                    tooltip: {
                        callbacks: {
                            label: (context) => ` ${context.parsed.y} Siswa Terdata`
                        }
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        ticks: { stepSize: 1, precision: 0 }
                    }
                }
            }
        });
    },

    renderKelasBreakdown(pengusulan, penerima) {
        const tbody = document.getElementById("pip-table-breakdown-kelas");
        if (!tbody) return;

        const rombels = [1, 2, 3, 4, 5, 6];
        tbody.innerHTML = rombels.map(k => {
            const strK = String(k);
            const usulK = pengusulan.filter(p => String(p.kelas).includes(strK));
            const skK = usulK.filter(p => p.statusSK && p.statusSK.toLowerCase().includes("sudah")).length;
            const penK = penerima.filter(p => String(p.kelas).includes(strK));
            const cairK = penK.filter(p => p.statusCair && p.statusCair.toLowerCase().includes("sudah")).length;
            const belumCairK = penK.length - cairK;

            return `
                <tr class="hover:bg-slate-50 border-b border-slate-100 text-xs">
                    <td class="p-3 font-bold text-slate-800">Kelas ${k}</td>
                    <td class="p-3 text-center font-bold text-blue-900">${usulK.length}</td>
                    <td class="p-3 text-center"><span class="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">${skK}</span></td>
                    <td class="p-3 text-center font-bold text-slate-700">${penK.length}</td>
                    <td class="p-3 text-center text-emerald-600 font-bold">${cairK}</td>
                    <td class="p-3 text-center text-amber-600 font-bold">${belumCairK}</td>
                </tr>
            `;
        }).join("");
    },

    // Inovasi 4: Poverty Vulnerability Radar (Desil 1-4 tapi belum masuk SK)
    renderVulnerabilityRadar(pengusulan) {
        const container = document.getElementById("pip-vulnerability-radar");
        if (!container) return;

        const unfulfilled = pengusulan.filter(p => Number(p.desil) >= 1 && Number(p.desil) <= 4 && (!p.statusSK || !p.statusSK.toLowerCase().includes("sudah")));

        if (unfulfilled.length === 0) {
            container.innerHTML = `
                <div class="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center gap-3">
                    <i class="fa-solid fa-circle-check text-lg text-emerald-600"></i>
                    <div>
                        <strong>Seluruh Siswa Desil 1-4 Sudah Terfasilitasi Masuk SK!</strong>
                        <p class="text-[11px] text-emerald-700 mt-0.5">Tidak ditemukan anomali siswa sangat miskin yang tertinggal dalam pengusulan PIP.</p>
                    </div>
                </div>
            `;
            return;
        }

        container.innerHTML = `
            <div class="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-900 space-y-3">
                <div class="flex items-center justify-between">
                    <div class="flex items-center gap-2">
                        <span class="w-2.5 h-2.5 rounded-full bg-rose-600 animate-ping"></span>
                        <h4 class="font-bold text-xs uppercase tracking-wide">Poverty Vulnerability Radar (Prioritas 1 Belum Masuk SK)</h4>
                    </div>
                    <span class="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-rose-200 text-rose-900">${unfulfilled.length} Siswa Perlu Validasi</span>
                </div>
                <p class="text-xs text-rose-700 leading-relaxed">
                    Siswa di bawah ini berada pada desil kemiskinan sangat tinggi (Desil 1-4) namun statusnya masih <strong>Belum Masuk SK</strong>. Disarankan diprioritaskan saat kuota pengusulan tambahan dibuka dinas.
                </p>
                <div class="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                    ${unfulfilled.map(s => `
                        <div class="bg-white p-2.5 rounded-xl border border-rose-200 shadow-xs flex items-center justify-between text-xs">
                            <div>
                                <strong class="text-slate-800">${Sec.esc(s.nama)}</strong>
                                <div class="text-[10px] text-slate-400 font-mono">NISN: ${s.nisn} • Kelas ${s.kelas}</div>
                            </div>
                            <span class="px-2 py-0.5 rounded-md font-bold text-[10px] bg-rose-100 text-rose-800">Desil ${s.desil}</span>
                        </div>
                    `).join("")}
                </div>
            </div>
        `;
    },

    // -------------------------------------------------------------------------
    // 2. DATA PENGUSULAN PIP
    // -------------------------------------------------------------------------
    renderPengusulan() {
        const tbody = document.getElementById("pip-pengusulan-tbody");
        if (!tbody) return;

        const role = Auth.role();
        const gInfo = Auth.getGuruInfo ? Auth.getGuruInfo() : null;
        let data = DataStore.getPIPPengusulan();
        const students = DataStore.getSiswa();

        // Isolasi Guru Kelas
        if (role === "guru" && gInfo && gInfo.isGuruKelas) {
            const k = String(gInfo.kelas).replace(/\D/g, "");
            data = data.filter(p => String(p.kelas).includes(k));
        }

        // Filter UI
        const q = (this.searchQuery || "").toLowerCase();
        data = data.filter(p => {
            const matchQ = !q || p.nama.toLowerCase().includes(q) || p.nisn.includes(q);
            const matchK = this.filterKelas === "Semua" || String(p.kelas).includes(this.filterKelas);
            const matchD = this.filterDesil === "Semua" || String(p.desil) === this.filterDesil;
            let matchSK = true;
            if (this.filterStatusSK === "Sudah") matchSK = p.statusSK && p.statusSK.toLowerCase().includes("sudah");
            else if (this.filterStatusSK === "Belum") matchSK = !p.statusSK || !p.statusSK.toLowerCase().includes("sudah");

            return matchQ && matchK && matchD && matchSK;
        });

        const totalEl = document.getElementById("pip-pengusulan-count");
        if (totalEl) totalEl.textContent = `${data.length} Siswa Terdaftar Pengusulan`;

        if (data.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="8" class="p-8 text-center text-slate-400 text-xs">
                        <i class="fa-solid fa-folder-open text-3xl mb-2 text-slate-300"></i>
                        <p>Tidak ada data pengusulan PIP yang cocok dengan filter.</p>
                    </td>
                </tr>
            `;
            return;
        }

        tbody.innerHTML = data.map((item, idx) => {
            // Inovasi 3: Smart Audit / Fuzzy Matching ke DB_Siswa
            const studentMatch = students.find(s => s.nisn === item.nisn);
            let auditBadge = "";
            if (studentMatch) {
                if (studentMatch.nama.toLowerCase() !== item.nama.toLowerCase()) {
                    auditBadge = `<span class="ml-1 text-[9px] px-1.5 py-0.2 rounded bg-amber-100 text-amber-800" title="Ejaan nama sedikit berbeda dengan buku induk: ${Sec.esc(studentMatch.nama)}">Ejaan Berbeda</span>`;
                } else {
                    auditBadge = `<span class="ml-1 text-[9px] px-1.5 py-0.2 rounded bg-emerald-100 text-emerald-800" title="Valid sesuai database Dapodik"><i class="fa-solid fa-check"></i> Padan</span>`;
                }
            } else {
                auditBadge = `<span class="ml-1 text-[9px] px-1.5 py-0.2 rounded bg-rose-100 text-rose-800" title="NISN tidak ditemukan di data siswa aktif">Belum Terdaftar</span>`;
            }

            const isSudahSK = item.statusSK && item.statusSK.toLowerCase().includes("sudah");
            let desilColor = "bg-slate-100 text-slate-700";
            if (Number(item.desil) <= 4) desilColor = "bg-rose-100 text-rose-800 font-bold border border-rose-200";
            else if (Number(item.desil) <= 7) desilColor = "bg-amber-100 text-amber-800 font-bold border border-amber-200";

            return `
                <tr class="hover:bg-slate-50 border-b border-slate-100 text-xs transition">
                    <td class="p-3 text-center text-slate-400 font-medium">${idx + 1}</td>
                    <td class="p-3 font-mono font-bold text-blue-900">${Sec.esc(item.nisn)}</td>
                    <td class="p-3">
                        <div class="font-bold text-slate-800 flex items-center flex-wrap gap-1">
                            ${Sec.esc(item.nama)} ${auditBadge}
                        </div>
                        <div class="text-[10px] text-slate-400 font-sans mt-0.5">${Sec.esc(item.skAtasNama || item.nama)}</div>
                    </td>
                    <td class="p-3 text-center">
                        <span class="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200">
                            Kelas ${Sec.esc(item.kelas)}
                        </span>
                    </td>
                    <td class="p-3 text-center font-medium text-slate-600">${Sec.esc(item.namaFase || '-')}</td>
                    <td class="p-3 text-center">
                        <span class="px-2 py-0.5 rounded-md text-[11px] ${desilColor}">Desil ${item.desil || '-'}</span>
                    </td>
                    <td class="p-3 text-center">
                        <span class="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold ${isSudahSK ? 'bg-emerald-100 text-emerald-800 border border-emerald-300' : 'bg-slate-100 text-slate-500'}">
                            <i class="fa-solid ${isSudahSK ? 'fa-circle-check text-emerald-600' : 'fa-hourglass-start'}"></i>
                            ${isSudahSK ? 'Sudah SK' : 'Belum Masuk SK'}
                        </span>
                    </td>
                    <td class="p-3 text-center">
                        <div class="inline-flex items-center gap-1">
                            <button onclick="ModulPIP.quickPrintSurat('${item.nisn}', 'pip_aktif')" class="p-1 text-teal-600 hover:text-teal-800 hover:bg-teal-50 rounded" title="Cetak Surat Aktif Belajar PIP">
                                <i class="fa-solid fa-print"></i>
                            </button>
                        </div>
                    </td>
                </tr>
            `;
        }).join("");
    },

    // -------------------------------------------------------------------------
    // 3. DATA PENERIMA SK PIP (KEMENDIKBUD)
    // -------------------------------------------------------------------------
    renderPenerima() {
        const tbody = document.getElementById("pip-penerima-tbody");
        if (!tbody) return;

        const role = Auth.role();
        const gInfo = Auth.getGuruInfo ? Auth.getGuruInfo() : null;
        let data = DataStore.getPIPPenerima();

        // Isolasi Guru Kelas
        if (role === "guru" && gInfo && gInfo.isGuruKelas) {
            const k = String(gInfo.kelas).replace(/\D/g, "");
            data = data.filter(p => String(p.kelas).includes(k));
        }

        const q = (this.searchQuery || "").toLowerCase();
        data = data.filter(p => {
            const matchQ = !q || p.nama.toLowerCase().includes(q) || p.nisn.includes(q) || (p.nomorRekening && p.nomorRekening.includes(q));
            const matchK = this.filterKelas === "Semua" || String(p.kelas).includes(this.filterKelas);
            const matchT = this.filterTahap === "Semua" || String(p.tahap) === this.filterTahap;
            let matchC = true;
            if (this.filterStatusCair === "Sudah") matchC = p.statusCair && p.statusCair.toLowerCase().includes("sudah");
            else if (this.filterStatusCair === "Belum") matchC = !p.statusCair || !p.statusCair.toLowerCase().includes("sudah");

            return matchQ && matchK && matchT && matchC;
        });

        const totalEl = document.getElementById("pip-penerima-count");
        if (totalEl) totalEl.textContent = `${data.length} Siswa Masuk SK Penerima PIP`;

        if (data.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="9" class="p-8 text-center text-slate-400 text-xs">
                        <i class="fa-solid fa-hand-holding-dollar text-3xl mb-2 text-slate-300"></i>
                        <p>Tidak ada data penerima PIP yang cocok dengan filter.</p>
                    </td>
                </tr>
            `;
            return;
        }

        tbody.innerHTML = data.map((item, idx) => {
            const isSudahCair = item.statusCair && item.statusCair.toLowerCase().includes("sudah");
            const nominal = Number(item.nominal) || 450000;

            return `
                <tr class="hover:bg-slate-50 border-b border-slate-100 text-xs transition">
                    <td class="p-3 text-center text-slate-400 font-medium">${idx + 1}</td>
                    <td class="p-3 font-mono font-bold text-blue-900">${Sec.esc(item.nisn)}</td>
                    <td class="p-3">
                        <div class="font-bold text-slate-800">${Sec.esc(item.nama)}</div>
                        <div class="text-[10px] text-slate-400 font-mono mt-0.5">SK: ${Sec.esc(item.nomorSK || '-')}</div>
                    </td>
                    <td class="p-3 text-center">
                        <span class="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200">
                            Kelas ${Sec.esc(item.kelas)}
                        </span>
                    </td>
                    <td class="p-3 text-center font-semibold text-slate-700">${Sec.esc(item.tahap || 'Tahap 1')}</td>
                    <td class="p-3 text-right font-mono font-bold text-emerald-800">Rp ${nominal.toLocaleString("id-ID")}</td>
                    <td class="p-3">
                        <div class="font-mono text-xs text-slate-700 font-semibold">${Sec.esc(item.nomorRekening || '-')}</div>
                        <div class="text-[10px] text-slate-400">Bank ${Sec.esc(item.bankPenyalur || 'BRI')} • ${Sec.esc(item.statusRekening || 'Aktivasi')}</div>
                    </td>
                    <td class="p-3 text-center">
                        <button onclick="ModulPIP.toggleStatusCair('${item.nisn}')" 
                            class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold transition ${isSudahCair ? 'bg-emerald-100 text-emerald-800 hover:bg-emerald-200' : 'bg-amber-100 text-amber-800 hover:bg-amber-200'}">
                            <i class="fa-solid ${isSudahCair ? 'fa-circle-check text-emerald-600' : 'fa-clock text-amber-600'}"></i>
                            ${isSudahCair ? 'Sudah Cair' : 'Belum Cair'}
                        </button>
                        ${item.tanggalCair && item.tanggalCair !== '-' ? `<div class="text-[9px] text-slate-400 mt-0.5">${item.tanggalCair}</div>` : ''}
                    </td>
                    <td class="p-3 text-center">
                        <div class="inline-flex items-center gap-1.5">
                            <button onclick="ModulPIP.quickPrintSurat('${item.nisn}', 'pip_pencairan')" 
                                class="px-2.5 py-1 rounded-lg bg-teal-50 hover:bg-teal-100 text-teal-800 text-[11px] font-bold transition flex items-center gap-1 shadow-xs" title="Cetak Surat Keterangan / Rekomendasi Pencairan BRI">
                                <i class="fa-solid fa-print"></i> Cetak Rekomendasi
                            </button>
                        </div>
                    </td>
                </tr>
            `;
        }).join("");
    },

    // -------------------------------------------------------------------------
    // AKSI CEPAT & TOGGLE CAIR
    // -------------------------------------------------------------------------
    async toggleStatusCair(nisn) {
        const list = DataStore.getPIPPenerima();
        const item = list.find(p => p.nisn === nisn);
        if (!item) return;

        const isCurrentlyCair = item.statusCair && item.statusCair.toLowerCase().includes("sudah");
        const nextStatus = isCurrentlyCair ? "Belum Cair" : "Sudah Cair";
        const nextDate = isCurrentlyCair ? "-" : Util.today();

        const res = await ApiClient.request("updatePIPStatus", {
            nisn,
            statusCair: nextStatus,
            tanggalCair: nextDate
        });

        if (res && res.success) {
            App.showToast(`Status pencairan ${item.nama} diubah menjadi: ${nextStatus}`, "success");
            this.renderActiveTab();
            App.updateDashboardStats();
        } else {
            App.showToast("Gagal memperbarui status pencairan", "error");
        }
    },

    quickPrintSurat(nisn, templateType = "pip_pencairan") {
        App.navigateTo("cetak");
        const selSiswa = document.getElementById("cetak-select-siswa");
        if (selSiswa) {
            selSiswa.value = nisn;
        }
        const selJenis = document.getElementById("cetak-jenis-surat");
        if (selJenis) {
            selJenis.value = templateType;
        }
        if (window.ModulCetak) {
            ModulCetak.loadStudentData(nisn);
            ModulCetak.generatePreview();
        }
    },

    // -------------------------------------------------------------------------
    // 4. IMPOR EXCEL DENGAN SHEETJS (ON-DEMAND)
    // -------------------------------------------------------------------------
    triggerImport(jenis = "pengusulan") {
        const fileInput = document.getElementById(jenis === "pengusulan" ? "file-import-pip-usulan" : "file-import-pip-penerima");
        if (fileInput) fileInput.click();
    },

    async handleFileImport(event, jenis = "pengusulan") {
        const file = event.target.files && event.target.files[0];
        if (!file) return;

        App.showToast("Membaca file Excel PIP...", "info");
        try {
            await ModulImport.loadXlsx();
            const data = await file.arrayBuffer();
            const workbook = XLSX.read(data, { type: "array" });
            const sheetName = workbook.SheetNames[0];
            const worksheet = workbook.Sheets[sheetName];
            const rawJson = XLSX.utils.sheet_to_json(worksheet, { defval: "" });

            if (!rawJson || rawJson.length === 0) {
                App.showToast("File Excel tidak memiliki baris data.", "warning");
                return;
            }

            const parsedRows = [];
            rawJson.forEach(row => {
                const norm = {};
                Object.keys(row).forEach(k => {
                    norm[k.toLowerCase().replace(/[^a-z0-9]/g, "")] = String(row[k]).trim();
                });

                const nisn = norm.nisn || norm.nisnsiswa || norm.nomornisn || "";
                const nama = norm.nama || norm.namasiswa || norm.namapesertadidik || "";
                const kelas = norm.kelas || norm.rombel || norm.tingkat || "1";

                if (nisn && nama) {
                    if (jenis === "pengusulan") {
                        parsedRows.push({
                            nisn,
                            nama,
                            kelas: kelas.replace(/\D/g, "") || kelas,
                            namaFase: norm.namafase || norm.fase || (Number(kelas) <= 2 ? "Fase A" : (Number(kelas) <= 4 ? "Fase B" : "Fase C")),
                            desil: Number(norm.desil || norm.desilkemiskinan || "3") || 3,
                            skAtasNama: norm.skatasnama || norm.atasnama || `${nama} (Siswa)`,
                            statusSK: norm.statussk || norm.keterangansk || (norm.masuksk && norm.masuksk.toLowerCase().includes("sudah") ? "Sudah SK" : "Belum Masuk SK"),
                            tahunUsulan: norm.tahunusulan || norm.tahun || "2026",
                            catatanDapodik: norm.catatan || norm.keterangan || "Diimpor dari file pengusulan"
                        });
                    } else {
                        parsedRows.push({
                            nisn,
                            nama,
                            kelas: kelas.replace(/\D/g, "") || kelas,
                            nomorSK: norm.nomorsk || norm.nosk || "0345/P3KE/PIP/2026",
                            tahap: norm.tahap || norm.tahappenyaluran || "Tahap 1",
                            nominal: Number(norm.nominal || norm.dana || "450000") || 450000,
                            bankPenyalur: norm.bank || norm.bankpenyalur || "BRI",
                            nomorRekening: norm.nomorrekening || norm.norek || "-",
                            statusRekening: norm.statusrekening || "Sudah Aktivasi",
                            statusCair: norm.statuscair || norm.status || "Belum Cair",
                            tanggalCair: norm.tanggalcair || norm.tglcair || "-",
                            tahunAnggaran: norm.tahunanggaran || norm.tahun || "2026"
                        });
                    }
                }
            });

            if (parsedRows.length === 0) {
                App.showToast("Gagal memetakan kolom NISN dan Nama Siswa dari Excel.", "error");
                return;
            }

            const res = await ApiClient.request("importPIP", { jenis, rows: parsedRows });
            if (res && res.success) {
                App.showToast(res.message || `Berhasil mengimpor ${parsedRows.length} data PIP!`, "success");
                this.renderActiveTab();
                App.updateDashboardStats();
            } else {
                App.showToast("Gagal menyimpan data PIP hasil impor", "error");
            }
        } catch (err) {
            console.error("Error import PIP:", err);
            App.showToast(`Gagal membaca Excel: ${err.message}`, "error");
        } finally {
            event.target.value = "";
        }
    }
};

window.ModulPIP = ModulPIP;
