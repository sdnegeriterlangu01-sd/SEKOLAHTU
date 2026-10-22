/* ==========================================================================
   SIM-TAS-SD: MODUL PROGRAM INDONESIA PINTAR (PIP KEMENDIKBUD)
   Versi 2.5.0 - SDN Terlangu 01 Brebes
   Fitur:
   1. Dasbor & Visualisasi Analitik Desil Kemiskinan (1-4, 5-7, 8-10) & Status SK.
   2. Data Pengusulan PIP (Format Dapodik/Puslapdik 2026) + Unduh Format & Impor Excel.
   3. Data Penerima PIP (Format SK Puslapdik Kemendikbud 2026) + Unduh Format & Impor Excel + Toggle Cair.
   4. Integrasi 1-Klik Cetak Rekomendasi Pencairan BRI & Aktif Belajar PIP.
   5. Smart Audit PIP x Dapodik (Inovasi 3) & Poverty Vulnerability Radar (Inovasi 4).
   6. Dynamic Rombel Dropdown dari Data Siswa Aktif.
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

        this.renderKelasFilter();
        this.bindEvents();
        this.renderActiveTab();
    },

    // Inovasi & Item 5: Pilihan kelas otomatis mengambil data dari rombel siswa
    renderKelasFilter() {
        const sel = document.getElementById("pip-filter-kelas-penerima");
        if (!sel) return;

        const rombels = DataStore.getRombels ? DataStore.getRombels() : [];
        const currentVal = this.filterKelas || "Semua";

        let optionsHtml = `<option value="Semua" ${currentVal === "Semua" ? "selected" : ""}>Semua Tingkat Kelas</option>`;

        if (rombels && rombels.length > 0) {
            rombels.forEach(r => {
                const cleanNum = String(r).replace(/\D/g, "");
                let fase = "Fase A";
                const n = parseInt(cleanNum, 10);
                if (n === 3 || n === 4) fase = "Fase B";
                else if (n >= 5) fase = "Fase C";

                const isSelected = String(currentVal) === String(r) || String(currentVal) === cleanNum;
                optionsHtml += `<option value="${Sec.esc(r)}" ${isSelected ? "selected" : ""}>${Sec.esc(r)} (${fase})</option>`;
            });
        } else {
            for (let i = 1; i <= 6; i++) {
                const isSelected = String(currentVal) === String(i);
                optionsHtml += `<option value="${i}" ${isSelected ? "selected" : ""}>Kelas ${i}</option>`;
            }
        }

        sel.innerHTML = optionsHtml;
    },

    bindEvents() {
        // Tab switching via data-tab attribute or direct onclick
        document.querySelectorAll(".pip-subtab-btn").forEach(btn => {
            btn.addEventListener("click", () => {
                const tab = btn.getAttribute("data-tab");
                if (tab) this.switchTab(tab);
            });
        });

        // Search pengusulan
        const searchUsul = document.getElementById("pip-search-pengusulan");
        if (searchUsul) {
            searchUsul.oninput = (e) => {
                this.searchQuery = e.target.value.trim();
                this.renderPengusulan();
            };
        }

        // Filter Desil
        const selDesil = document.getElementById("pip-filter-desil");
        if (selDesil) {
            selDesil.onchange = (e) => {
                this.filterDesil = e.target.value;
                this.renderPengusulan();
            };
        }

        // Filter Layak / SK
        const selLayak = document.getElementById("pip-filter-layak");
        if (selLayak) {
            selLayak.onchange = (e) => {
                const v = e.target.value;
                if (v === "Layak") this.filterStatusSK = "Sudah";
                else if (v === "Perlu Verifikasi") this.filterStatusSK = "Belum";
                else this.filterStatusSK = "Semua";
                this.renderPengusulan();
            };
        }

        // Search penerima
        const searchPen = document.getElementById("pip-search-penerima");
        if (searchPen) {
            searchPen.oninput = (e) => {
                this.searchQuery = e.target.value.trim();
                this.renderPenerima();
            };
        }

        // Filter Kelas Penerima (Dynamic)
        const selKelas = document.getElementById("pip-filter-kelas-penerima");
        if (selKelas) {
            selKelas.onchange = (e) => {
                this.filterKelas = e.target.value;
                this.renderPenerima();
            };
        }

        // Filter Status Pencairan
        const selCair = document.getElementById("pip-filter-cair");
        if (selCair) {
            selCair.onchange = (e) => {
                const v = e.target.value;
                if (v.includes("Sudah")) this.filterStatusCair = "Sudah";
                else if (v.includes("Belum")) this.filterStatusCair = "Belum";
                else this.filterStatusCair = "Semua";
                this.renderPenerima();
            };
        }
    },

    switchTab(tab) {
        this.activeTab = tab;

        const allTabs = ["dasbor", "pengusulan", "penerima"];
        allTabs.forEach(t => {
            const content = document.getElementById(`pip-tab-${t}`);
            if (content) {
                if (t === tab) content.classList.remove("hidden");
                else content.classList.add("hidden");
            }

            const btn = document.getElementById(`pip-btn-tab-${t}`);
            if (btn) {
                const isTarget = t === tab;
                btn.className = `pip-subtab-btn px-4 py-1.5 rounded-lg text-xs font-bold transition inline-flex items-center gap-2 cursor-pointer ${
                    isTarget 
                        ? 'bg-white text-amber-700 shadow-sm' 
                        : 'text-slate-600 hover:text-slate-900'
                }`;
            }
        });

        // Backward compatibility for class-based buttons
        document.querySelectorAll(".pip-subtab-btn").forEach(btn => {
            const btnTab = btn.getAttribute("data-tab");
            if (btnTab) {
                const isTarget = btnTab === tab;
                btn.classList.toggle("bg-white", isTarget);
                btn.classList.toggle("text-amber-700", isTarget);
                btn.classList.toggle("shadow-sm", isTarget);
                btn.classList.toggle("text-slate-600", !isTarget);
            }
        });

        this.renderActiveTab();
    },

    renderTab() {
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
        const elSudahCair = document.getElementById("pip-stat-sudah-cair") || document.getElementById("pip-stat-total-cair");
        if (elSudahCair) elSudahCair.textContent = sudahCair;
        const elBelumCair = document.getElementById("pip-stat-belum-cair");
        if (elBelumCair) elBelumCair.textContent = belumCair;
        const elTotalDana = document.getElementById("pip-stat-total-dana");
        if (elTotalDana) elTotalDana.textContent = `Rp ${totalDana.toLocaleString("id-ID")}`;

        const elPersenCair = document.getElementById("pip-stat-persen-cair");
        if (elPersenCair) {
            const pct = totalPenerima > 0 ? Math.round((sudahCair / totalPenerima) * 100) : 0;
            elPersenCair.textContent = `${pct}%`;
        }

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
        const canvas = document.getElementById("pip-chart-desil") || document.getElementById("chart-pip-desil");
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
        const tbody = document.getElementById("pip-pengusulan-tbody") || document.getElementById("table-pip-pengusulan-body");
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
            const matchK = this.filterKelas === "Semua" || 
                String(p.kelas).toLowerCase().trim() === String(this.filterKelas).toLowerCase().trim() ||
                String(p.kelas).replace(/\D/g, "") === String(this.filterKelas).replace(/\D/g, "");
            const matchD = this.filterDesil === "Semua" || 
                (this.filterDesil === "1-4" ? Number(p.desil) >= 1 && Number(p.desil) <= 4 :
                 this.filterDesil === "5-7" ? Number(p.desil) >= 5 && Number(p.desil) <= 7 :
                 this.filterDesil === "8-10" ? Number(p.desil) >= 8 && Number(p.desil) <= 10 :
                 String(p.desil) === this.filterDesil);
            let matchSK = true;
            if (this.filterStatusSK === "Sudah") matchSK = p.statusSK && p.statusSK.toLowerCase().includes("sudah");
            else if (this.filterStatusSK === "Belum") matchSK = !p.statusSK || !p.statusSK.toLowerCase().includes("sudah");

            return matchQ && matchK && matchD && matchSK;
        });

        const totalEl = document.getElementById("pip-pengusulan-count") || document.getElementById("pip-total-pengusulan-count");
        if (totalEl) totalEl.textContent = `${data.length} Siswa Terdaftar Pengusulan PIP`;

        if (data.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="7" class="p-8 text-center text-slate-400 text-xs">
                        <i class="fa-solid fa-folder-open text-3xl mb-2 text-slate-300"></i>
                        <p>Tidak ada data pengusulan PIP yang cocok dengan filter pencarian.</p>
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

            const ortuText = [item.namaAyah ? `Ayah: ${item.namaAyah}` : '', item.namaIbu ? `Ibu: ${item.namaIbu}` : ''].filter(Boolean).join(' • ') || '-';
            const rombelText = item.rombel || `Kelas ${item.kelas || '1'}`;

            return `
                <tr class="hover:bg-slate-50 border-b border-slate-100 text-xs transition">
                    <td class="p-3 text-center text-slate-400 font-medium">${idx + 1}</td>
                    <td class="p-3">
                        <div class="font-bold text-slate-800 flex items-center flex-wrap gap-1">
                            ${Sec.esc(item.nama)} ${auditBadge}
                        </div>
                        <div class="text-[10px] text-blue-900 font-mono font-bold mt-0.5">NISN: ${Sec.esc(item.nisn)} ${item.nik ? `<span class="text-slate-400 font-normal">| NIK: ${Sec.esc(item.nik)}</span>` : ''}</div>
                        ${item.jk ? `<div class="text-[9px] text-slate-400">${item.jk === 'L' ? 'Laki-laki' : (item.jk === 'P' ? 'Perempuan' : Sec.esc(item.jk))} ${item.umur ? `• ${item.umur} Th` : ''}</div>` : ''}
                    </td>
                    <td class="p-3 text-center">
                        <span class="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200">
                            ${Sec.esc(rombelText)}
                        </span>
                        <div class="text-[9px] text-slate-400 mt-0.5">${Sec.esc(item.namaFase || '-')}</div>
                    </td>
                    <td class="p-3 text-slate-600">
                        <div class="text-[11px] font-medium truncate max-w-[170px]" title="${Sec.esc(ortuText)}">${Sec.esc(ortuText)}</div>
                        ${item.pekerjaanAyah || item.pekerjaanIbu ? `<div class="text-[9px] text-slate-400 truncate max-w-[170px]">${Sec.esc(item.pekerjaanAyah || item.pekerjaanIbu || '')}</div>` : ''}
                    </td>
                    <td class="p-3 text-center">
                        <span class="px-2 py-0.5 rounded-md text-[11px] ${desilColor}">Desil ${item.desil || '-'}</span>
                        <div class="text-[9px] text-slate-400 mt-0.5">${Sec.esc(item.bank || 'BRI')} • ${Sec.esc(item.statusTabungan || 'Rekening')}</div>
                    </td>
                    <td class="p-3 text-center">
                        <span class="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold ${isSudahSK ? 'bg-emerald-100 text-emerald-800 border border-emerald-300' : 'bg-slate-100 text-slate-500'}">
                            <i class="fa-solid ${isSudahSK ? 'fa-circle-check text-emerald-600' : 'fa-hourglass-start'}"></i>
                            ${isSudahSK ? 'Sudah SK' : 'Belum SK'}
                        </span>
                        <div class="text-[9px] text-slate-500 mt-0.5 truncate max-w-[120px]" title="${Sec.esc(item.skAtasNama || item.nama)}">${Sec.esc(item.skAtasNama || item.nama)}</div>
                    </td>
                    <td class="p-3 text-right">
                        <button onclick="ModulPIP.quickPrintSurat('${item.nisn}', 'pip_aktif')" 
                            class="px-2.5 py-1 rounded-lg bg-teal-50 hover:bg-teal-100 text-teal-800 text-[11px] font-bold transition inline-flex items-center gap-1 shadow-xs cursor-pointer" title="Cetak Surat Aktif Belajar PIP">
                            <i class="fa-solid fa-print"></i> Aktif Belajar
                        </button>
                    </td>
                </tr>
            `;
        }).join("");
    },

    // -------------------------------------------------------------------------
    // 3. DATA PENERIMA SK PIP (KEMENDIKBUD)
    // -------------------------------------------------------------------------
    renderPenerima() {
        const tbody = document.getElementById("pip-penerima-tbody") || document.getElementById("table-pip-penerima-body");
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
            const matchQ = !q || p.nama.toLowerCase().includes(q) || p.nisn.includes(q) || (p.nomorRekening && p.nomorRekening.includes(q)) || (p.virtualAcc && p.virtualAcc.includes(q));
            const matchK = this.filterKelas === "Semua" || 
                String(p.kelas).toLowerCase().trim() === String(this.filterKelas).toLowerCase().trim() ||
                String(p.kelas).replace(/\D/g, "") === String(this.filterKelas).replace(/\D/g, "");
            const matchT = this.filterTahap === "Semua" || String(p.tahap) === this.filterTahap;
            let matchC = true;
            if (this.filterStatusCair === "Sudah") matchC = p.statusCair && p.statusCair.toLowerCase().includes("sudah");
            else if (this.filterStatusCair === "Belum") matchC = !p.statusCair || !p.statusCair.toLowerCase().includes("sudah");

            return matchQ && matchK && matchT && matchC;
        });

        const totalEl = document.getElementById("pip-penerima-count") || document.getElementById("pip-total-penerima-count");
        if (totalEl) totalEl.textContent = `${data.length} Siswa Masuk SK Penerima PIP`;

        if (data.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="8" class="p-8 text-center text-slate-400 text-xs">
                        <i class="fa-solid fa-hand-holding-dollar text-3xl mb-2 text-slate-300"></i>
                        <p>Tidak ada data penerima PIP yang cocok dengan filter pencarian.</p>
                    </td>
                </tr>
            `;
            return;
        }

        tbody.innerHTML = data.map((item, idx) => {
            const isSudahCair = item.statusCair && item.statusCair.toLowerCase().includes("sudah");
            const nominal = Number(item.nominal) || 450000;
            const rombelText = item.rombel || `Kelas ${item.kelas || '1'}`;
            const noRekDisplay = item.nomorRekening && item.nomorRekening !== '-' ? item.nomorRekening : (item.virtualAcc || '-');

            return `
                <tr class="hover:bg-slate-50 border-b border-slate-100 text-xs transition">
                    <td class="p-3 text-center text-slate-400 font-medium">${idx + 1}</td>
                    <td class="p-3">
                        <div class="font-bold text-slate-800">${Sec.esc(item.nama)}</div>
                        <div class="text-[10px] text-blue-900 font-mono font-bold mt-0.5">NISN: ${Sec.esc(item.nisn)} ${item.nik ? `<span class="text-slate-400 font-normal">| NIK: ${Sec.esc(item.nik)}</span>` : ''}</div>
                        ${item.tempatLahir || item.tanggalLahir ? `<div class="text-[9px] text-slate-400">${Sec.esc(item.tempatLahir || '')}, ${Sec.esc(item.tanggalLahir || '')}</div>` : ''}
                    </td>
                    <td class="p-3 text-center">
                        <span class="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200">
                            ${Sec.esc(rombelText)}
                        </span>
                    </td>
                    <td class="p-3">
                        <div class="font-mono text-xs text-slate-700 font-semibold">${Sec.esc(item.nomorSK || 'SK Puslapdik')}</div>
                        <div class="text-[10px] text-slate-400">${Sec.esc(item.tahap || 'Tahap 1')} ${item.tanggalSK ? `• ${Sec.esc(item.tanggalSK)}` : ''}</div>
                    </td>
                    <td class="p-3 font-mono font-bold text-emerald-800">Rp ${nominal.toLocaleString("id-ID")}</td>
                    <td class="p-3">
                        <div class="font-mono text-xs text-slate-700 font-semibold">${Sec.esc(noRekDisplay)}</div>
                        <div class="text-[10px] text-slate-400">${item.virtualAcc && item.virtualAcc !== '-' ? `VA: ${Sec.esc(item.virtualAcc)} • ` : ''}Bank ${Sec.esc(item.bankPenyalur || 'BRI')}</div>
                    </td>
                    <td class="p-3 text-center">
                        <button onclick="ModulPIP.toggleStatusCair('${item.nisn}')" 
                            class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold transition cursor-pointer ${isSudahCair ? 'bg-emerald-100 text-emerald-800 hover:bg-emerald-200' : 'bg-amber-100 text-amber-800 hover:bg-amber-200'}">
                            <i class="fa-solid ${isSudahCair ? 'fa-circle-check text-emerald-600' : 'fa-clock text-amber-600'}"></i>
                            ${isSudahCair ? 'Sudah Cair' : 'Belum Cair'}
                        </button>
                        ${item.tanggalCair && item.tanggalCair !== '-' ? `<div class="text-[9px] text-slate-400 mt-0.5 font-mono">${item.tanggalCair}</div>` : ''}
                    </td>
                    <td class="p-3 text-right">
                        <button onclick="ModulPIP.quickPrintSurat('${item.nisn}', 'pip_pencairan')" 
                            class="px-2.5 py-1 rounded-lg bg-teal-50 hover:bg-teal-100 text-teal-800 text-[11px] font-bold transition inline-flex items-center gap-1 shadow-xs cursor-pointer" title="Cetak Surat Keterangan / Rekomendasi Pencairan BRI">
                            <i class="fa-solid fa-print"></i> Cetak Rekomendasi
                        </button>
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
    // FORMAT CONTOH EXCEL RESMI PUSLAPDIK / DAPODIK
    // -------------------------------------------------------------------------
    async downloadTemplate(jenis = "pengusulan") {
        App.showToast("Menyiapkan format contoh Excel...", "info");
        try {
            const XLSX = await ModulImport.loadXlsx();
            const wb = XLSX.utils.book_new();

            if (jenis === "pengusulan") {
                // Header sesuai screenshot 202713 & 202733 dan data pengusulan PIP SDN Terlangu 01_2026.xlsx
                const headers = [
                    "No", "Nama Murid", "NIK", "Valid Dukcapil", "NISN", "Valid NISN", 
                    "Tempat Lahir", "Tanggal Lahir", "Umur", "Jenis Kelamin", "Nama Ibu", 
                    "Pekerjaan Ibu", "Nama Ayah", "Pekerjaan Ayah", "Jenjang", "Kelas", 
                    "Rombel", "Semester ID", "Desil", "Bank", "Status Tabungan", 
                    "flag_drop", "keterangan_flag", "Fase ID", "Nama Fase", "Role", 
                    "Status SK", "SK Atas Nama"
                ];
                const sampleRows = [
                    [1, "AHMAD FAUZAN PRATAMA", "3329090102170001", "Valid", "3171234567", "Valid", "Brebes", "2017-02-01", 9, "Laki-laki", "SITI AMINAH", "Ibu Rumah Tangga", "SLAMET RIYADI", "Buruh Harian Lepas", "SD", "1", "Kelas 1", "2025/2026-Genap", 2, "BRI", "Memiliki Rekening", 0, "-", "A", "Fase A", "Siswa", "Sudah SK", "AHMAD FAUZAN PRATAMA"],
                    [2, "NURUL HIDAYAH", "3329095204160002", "Valid", "3167890123", "Valid", "Brebes", "2016-04-12", 10, "Perempuan", "ROHANI", "Pedagang Kecil", "KASIM", "Petani", "SD", "2", "Kelas 2", "2025/2026-Genap", 3, "BRI", "Memiliki Rekening", 0, "-", "A", "Fase A", "Siswa", "Sudah SK", "NURUL HIDAYAH"],
                    [3, "BAGAS ADITYA PUTRA", "3329091508150003", "Valid", "3154567890", "Valid", "Brebes", "2015-08-15", 11, "Laki-laki", "MARYAM", "Ibu Rumah Tangga", "SUTRISNO", "Buruh Tani", "SD", "3", "Kelas 3", "2025/2026-Genap", 4, "BRI", "Belum Aktivasi", 0, "-", "B", "Fase B", "Siswa", "Belum Masuk SK", "BAGAS ADITYA PUTRA"]
                ];
                const wsData = [headers, ...sampleRows];
                const ws = XLSX.utils.aoa_to_sheet(wsData);

                ws["!cols"] = [
                    { wch: 6 }, { wch: 26 }, { wch: 20 }, { wch: 14 }, { wch: 14 }, { wch: 14 },
                    { wch: 16 }, { wch: 14 }, { wch: 8 }, { wch: 14 }, { wch: 20 }, { wch: 20 },
                    { wch: 20 }, { wch: 20 }, { wch: 10 }, { wch: 8 }, { wch: 12 }, { wch: 18 },
                    { wch: 8 }, { wch: 10 }, { wch: 18 }, { wch: 10 }, { wch: 16 }, { wch: 8 },
                    { wch: 12 }, { wch: 10 }, { wch: 14 }, { wch: 26 }
                ];
                const activeYear = (window.DataStore && DataStore.getConfig && DataStore.getConfig()?.tahunAjaran?.substring(0, 4)) || new Date().getFullYear();
                const fileName = `format_pengusulan_pip_${activeYear}.xlsx`;
                XLSX.utils.book_append_sheet(wb, ws, `Pengusulan_PIP_${activeYear}`);
                XLSX.writeFile(wb, fileName);
                App.showToast(`Format contoh pengusulan PIP berhasil diunduh (${fileName})!`, "success");
            } else {
                // Header sesuai screenshot 203437 & 203455 dan spesifikasi resmi Puslapdik 2026
                const headers = [
                    "No", "nomenklatur", "kelas", "rombel", "nama_pd", 
                    "nama_ibu_kandung", "nama_ayah", "tanggal_lahir", "tempat_lahir", 
                    "nisn", "nik", "JK", "nominal", "no_rekening", "virtual_acc", 
                    "Tahap", "status_cair", "No Rekening / Virtual ACC", "Nama Pengusul", 
                    "confirmation_text", "nomor_sk", "tanggal_sk"
                ];
                const sampleRows = [
                    [1, "SD NEGERI TERLANGU 01", "1", "Kelas 1", "AHMAD FAUZAN PRATAMA", "SITI AMINAH", "SLAMET RIYADI", "2017-02-01", "Brebes", "3171234567", "3329090102170001", "L", 450000, "0123-01-098765-50-1", "88013171234567", "Tahap 1", "Sudah Cair", "0123-01-098765-50-1", "Kepala SDN Terlangu 01", "Dana telah disalurkan melalui rekening SimPel", "0345/P3KE/PIP/2026", "2026-01-15"],
                    [2, "SD NEGERI TERLANGU 01", "2", "Kelas 2", "NURUL HIDAYAH", "ROHANI", "KASIM", "2016-04-12", "Brebes", "3167890123", "3329095204160002", "P", 450000, "0123-01-098765-50-2", "88013167890123", "Tahap 1", "Belum Cair", "0123-01-098765-50-2", "Kepala SDN Terlangu 01", "Menunggu pencairan oleh wali siswa", "0345/P3KE/PIP/2026", "2026-01-15"],
                    [3, "SD NEGERI TERLANGU 01", "3", "Kelas 3", "BAGAS ADITYA PUTRA", "MARYAM", "SUTRISNO", "2015-08-15", "Brebes", "3154567890", "3329091508150003", "L", 450000, "0123-01-098765-50-3", "88013154567890", "Tahap 1", "Belum Cair", "0123-01-098765-50-3", "Kepala SDN Terlangu 01", "Menunggu aktivasi rekening", "0345/P3KE/PIP/2026", "2026-01-15"]
                ];
                const wsData = [headers, ...sampleRows];
                const ws = XLSX.utils.aoa_to_sheet(wsData);

                ws["!cols"] = [
                    { wch: 6 }, { wch: 24 }, { wch: 8 }, { wch: 12 }, { wch: 26 },
                    { wch: 20 }, { wch: 20 }, { wch: 14 }, { wch: 16 }, { wch: 14 },
                    { wch: 20 }, { wch: 6 }, { wch: 12 }, { wch: 22 }, { wch: 18 },
                    { wch: 12 }, { wch: 14 }, { wch: 24 }, { wch: 24 }, { wch: 30 },
                    { wch: 22 }, { wch: 14 }
                ];
                const activeYear = (window.DataStore && DataStore.getConfig && DataStore.getConfig()?.tahunAjaran?.substring(0, 4)) || new Date().getFullYear();
                const fileName = `format_penerimaan_pip_${activeYear}.xlsx`;
                XLSX.utils.book_append_sheet(wb, ws, `Penerimaan_PIP_${activeYear}`);
                XLSX.writeFile(wb, fileName);
                App.showToast(`Format contoh penerima PIP berhasil diunduh (${fileName})!`, "success");
            }
        } catch (err) {
            console.error("Gagal membuat template Excel:", err);
            App.showToast(`Gagal mengunduh format contoh: ${err.message}`, "error");
        }
    },

    // -------------------------------------------------------------------------
    // 4. IMPOR EXCEL DENGAN SHEETJS (SESUAI DOKUMEN RESMI)
    // -------------------------------------------------------------------------
    triggerImport(jenis = "pengusulan") {
        const fileInput = document.getElementById(jenis === "pengusulan" ? "file-import-pip-usulan" : "file-import-pip-penerima") ||
                          document.getElementById("pip-file-input");
        if (fileInput) fileInput.click();
    },

    async handleFileImport(event, jenis = "pengusulan") {
        const file = event.target.files && event.target.files[0];
        if (!file) return;

        App.showToast("Membaca file Excel PIP...", "info");
        try {
            const XLSX = await ModulImport.loadXlsx();
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

                const nisn = norm.nisn || norm.validnisn || norm.nisnsiswa || norm.nomornisn || norm.pesertadidiknisn || "";
                const nama = norm.namamurid || norm.namapd || norm.nama || norm.namasiswa || norm.namapesertadidik || norm.namalengkap || "";
                const rawKelas = norm.kelas || norm.rombel || norm.tingkat || "1";
                const cleanKelas = String(rawKelas).replace(/\D/g, "") || "1";

                if (nisn && nama) {
                    if (jenis === "pengusulan") {
                        parsedRows.push({
                            nisn,
                            nama,
                            nik: norm.nik || norm.validdukcapil || "",
                            validDukcapil: norm.validdukcapil || "Valid",
                            validNisn: norm.validnisn || "Valid",
                            tempatLahir: norm.tempatlahir || "Brebes",
                            tanggalLahir: norm.tanggallahir || "",
                            umur: norm.umur || "",
                            jk: norm.jeniskelamin || norm.jk || "L",
                            namaIbu: norm.namaibu || norm.namaibukandung || "",
                            pekerjaanIbu: norm.pekerjaanibu || "",
                            namaAyah: norm.namaayah || "",
                            pekerjaanAyah: norm.pekerjaanayah || "",
                            jenjang: norm.jenjang || "SD",
                            kelas: cleanKelas,
                            rombel: norm.rombel || `Kelas ${cleanKelas}`,
                            semesterId: norm.semesterid || "2025/2026-Genap",
                            desil: Number(norm.desil || norm.desilkemiskinan || "3") || 3,
                            bank: norm.bank || "BRI",
                            statusTabungan: norm.statustabungan || "Memiliki Rekening",
                            flagDrop: norm.flagdrop || "0",
                            keteranganFlag: norm.keteranganflag || "-",
                            faseId: norm.faseid || (Number(cleanKelas) <= 2 ? "A" : (Number(cleanKelas) <= 4 ? "B" : "C")),
                            namaFase: norm.namafase || (Number(cleanKelas) <= 2 ? "Fase A" : (Number(cleanKelas) <= 4 ? "Fase B" : "Fase C")),
                            role: norm.role || "Siswa",
                            statusSK: norm.statussk || (norm.skatasnama ? "Sudah SK" : "Belum Masuk SK"),
                            skAtasNama: norm.skatasnama || norm.atasnama || nama,
                            tahunUsulan: norm.tahunusulan || norm.tahun || "2026",
                            catatanDapodik: norm.catatan || norm.catatandapodik || "Diimpor dari file pengusulan",
                            updatedAt: new Date().toISOString()
                        });
                    } else {
                        parsedRows.push({
                            nisn,
                            nama,
                            nomenklatur: norm.nomenklatur || "SD NEGERI TERLANGU 01",
                            kelas: cleanKelas,
                            rombel: norm.rombel || `Kelas ${cleanKelas}`,
                            namaIbu: norm.namaibukandung || norm.namaibu || "",
                            namaAyah: norm.namaayah || "",
                            tanggalLahir: norm.tanggallahir || "",
                            tempatLahir: norm.tempatlahir || "Brebes",
                            nik: norm.nik || "",
                            jk: norm.jk || norm.jeniskelamin || "L",
                            nomorSK: norm.nomorsk || norm.nosk || "0345/P3KE/PIP/2026",
                            tanggalSK: norm.tanggalsk || "2026-01-15",
                            tahap: norm.tahap || norm.tahappenyaluran || "Tahap 1",
                            nominal: Number(norm.nominal || norm.nominalbantuan || "450000") || 450000,
                            bankPenyalur: norm.bank || norm.bankpenyalur || "BRI",
                            nomorRekening: norm.norekening || norm.nomorrekening || norm.norek || "-",
                            virtualAcc: norm.virtualacc || "-",
                            noRekeningOrVirtualAcc: norm.norekeningvirtualacc || norm.norekening || norm.virtualacc || "-",
                            statusRekening: norm.statusrekening || "Sudah Aktivasi",
                            statusCair: norm.statuscair || norm.statuspencairan || "Belum Cair",
                            tanggalCair: norm.tanggalcair || norm.tglcair || "-",
                            namaPengusul: norm.namapengusul || "Kepala SDN Terlangu 01",
                            confirmationText: norm.confirmationtext || "-",
                            tahunAnggaran: norm.tahunanggaran || norm.tahun || "2026",
                            updatedAt: new Date().toISOString()
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
                this.renderDasbor();
                if (typeof App !== "undefined") {
                    if (App.updateDashboardStats) App.updateDashboardStats();
                    if (App.renderAdminPIPStats) App.renderAdminPIPStats();
                }
            } else {
                App.showToast("Gagal menyimpan data PIP hasil impor", "error");
            }
        } catch (err) {
            console.error("Error import PIP:", err);
            App.showToast(`Gagal membaca Excel: ${err.message}`, "error");
        } finally {
            event.target.value = "";
        }
    },

    // -------------------------------------------------------------------------
    // FITUR TAMBAHAN: EXPORT CSV & SMART AUDIT
    // -------------------------------------------------------------------------
    exportPenerimaCSV() {
        const data = DataStore.getPIPPenerima();
        if (!data || data.length === 0) {
            App.showToast("Tidak ada data penerima PIP untuk diekspor.", "warning");
            return;
        }

        const headers = ["No", "NISN", "Nama Siswa", "Kelas", "Nomor SK", "Tahap", "Nominal", "Bank", "No Rekening", "Status Rekening", "Status Cair", "Tanggal Cair", "Tahun"];
        const rows = data.map((d, i) => [
            i + 1,
            `'${d.nisn}`,
            `"${(d.nama || '').replace(/"/g, '""')}"`,
            d.kelas,
            `"${(d.nomorSK || '').replace(/"/g, '""')}"`,
            d.tahap,
            d.nominal || 450000,
            d.bankPenyalur || 'BRI',
            `'${d.nomorRekening || '-'}`,
            d.statusRekening || 'Aktivasi',
            d.statusCair || 'Belum Cair',
            d.tanggalCair || '-',
            d.tahunAnggaran || '2026'
        ]);

        const csvContent = "\uFEFF" + [headers.join(","), ...rows.map(r => r.join(","))].join("\r\n");
        const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `Data_Penerima_PIP_SDN_Terlangu_01_${new Date().getFullYear()}.csv`;
        a.click();
        URL.revokeObjectURL(url);
        App.showToast("Data penerima PIP berhasil diekspor!", "success");
    },

    runSmartAudit() {
        const pengusulan = DataStore.getPIPPengusulan();
        const students = DataStore.getSiswa();
        let matchCount = 0;
        const notFoundList = [];

        pengusulan.forEach(p => {
            const found = students.some(s => s.nisn === p.nisn);
            if (found) {
                matchCount++;
            } else {
                notFoundList.push(p);
            }
        });

        if (notFoundList.length > 0) {
            const detailText = notFoundList.map(s => `• ${s.nama} (NISN: ${s.nisn}, Kelas: ${s.kelas || '-'})`).join("\n");
            App.showToast(`Audit Selesai: ${matchCount} valid padan Dapodik, ${notFoundList.length} belum tercatat di DB Siswa.`, "warning");
            alert(`Laporan Smart Audit PIP x Data Siswa (Dapodik):\n\n` +
                  `✅ ${matchCount} Siswa Valid & Padan dengan Database Siswa.\n` +
                  `⚠️ ${notFoundList.length} Siswa Pengusulan Belum Tercatat di DB Siswa Sekolah:\n\n` +
                  detailText + `\n\n` +
                  `💡 Rekomendasi Tindak Lanjut:\n` +
                  `1. Periksa apakah siswa tersebut baru mutasi/pindah ke SDN Terlangu 01 dan belum terdaftar di menu Data Siswa.\n` +
                  `2. Periksa kesesuaian penulisan 10 digit NISN pada file usulan PIP.`);
        } else {
            App.showToast(`Audit Selesai: Seluruh ${matchCount} siswa usulan PIP 100% valid padan dengan DB Siswa.`, "success");
        }
    },

    renderRadarKemiskinan() {
        this.switchTab("dasbor");
        const el = document.getElementById("pip-vulnerability-radar");
        if (el) el.scrollIntoView({ behavior: "smooth" });
    }
};

window.ModulPIP = ModulPIP;
