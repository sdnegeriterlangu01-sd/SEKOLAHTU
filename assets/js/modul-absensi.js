/* ==========================================================================
   SIM-TAS-SD: MODUL 4 - ABSENSI SEKOLAH (PRESENSI DIGITAL & REKAPITULASI)
   Fitur: Pencatatan Harian Siswa & Tendik, Real-Time Percentage, Chart.js Dashboard
   ========================================================================== */

const ModulAbsensi = {
    selectedDate: new Date().toISOString().split('T')[0],
    selectedKategori: "Siswa", // "Siswa" atau "Tendik"
    selectedKelas: "5",        // "1".."6"
    activeChartTren: null,
    activeChartDonut: null,

    init() {
        if (Auth.role() === "guru") {
            const u = Auth.user();
            const tendik = DataStore.getTendik().find(t => 
                (u?.nama && t.nama && t.nama.toLowerCase().includes(u.nama.toLowerCase())) ||
                (u?.email && t.nip && t.nip.includes(u.email.split("@")[0]))
            );
            if (tendik && tendik.jabatan) {
                const m = tendik.jabatan.match(/kelas\s*(\d+)/i);
                if (m) {
                    this.selectedKelas = m[1];
                    const selKelas = document.getElementById("absensi-kelas");
                    if (selKelas) selKelas.value = m[1];
                }
            }
        }
        this.bindEvents();
        this.setDefaultDate();
        this.renderPresensiInputTable();
        this.renderRekapitulasi();
    },

    bindEvents() {
        const inputTgl = document.getElementById("absensi-tanggal");
        if (inputTgl) {
            inputTgl.addEventListener("change", (e) => {
                this.selectedDate = e.target.value;
                this.renderPresensiInputTable();
            });
        }

        const selKategori = document.getElementById("absensi-kategori");
        if (selKategori) {
            selKategori.addEventListener("change", (e) => {
                this.selectedKategori = e.target.value;
                const kelasContainer = document.getElementById("absensi-kelas-filter-container");
                if (this.selectedKategori === "Tendik") {
                    kelasContainer?.classList.add("hidden");
                } else {
                    kelasContainer?.classList.remove("hidden");
                }
                this.renderPresensiInputTable();
            });
        }

        const selKelas = document.getElementById("absensi-kelas");
        if (selKelas) {
            selKelas.addEventListener("change", (e) => {
                this.selectedKelas = e.target.value;
                this.renderPresensiInputTable();
            });
        }
    },

    setDefaultDate() {
        const inputTgl = document.getElementById("absensi-tanggal");
        if (inputTgl) {
            const today = new Date().toISOString().split('T')[0];
            inputTgl.value = today;
            this.selectedDate = today;
        }
    },

    getListTarget() {
        if (this.selectedKategori === "Tendik") {
            let tendikList = DataStore.getTendik();
            // Untuk role guru, hanya tampilkan data tendik dirinya sendiri
            if (Auth.role() === "guru") {
                const u = Auth.user();
                const filtered = tendikList.filter(t => 
                    (u?.nama && t.nama && t.nama.toLowerCase().includes(u.nama.toLowerCase())) ||
                    (u?.email && t.nip && t.nip.includes(u.email.split("@")[0]))
                );
                if (filtered.length > 0) {
                    tendikList = filtered;
                } else if (u) {
                    tendikList = [{ nip: u.id || "GURU", nama: u.nama || u.email, jabatan: "Guru", jk: "-", statusKepegawaian: "-" }];
                }
            }
            return tendikList.map(t => ({
                idTarget: t.nip,
                nama: t.nama,
                identitas: `NIP: ${t.nip} • ${t.jabatan}`,
                kelas: "-"
            }));
        } else {
            const siswaList = DataStore.getSiswa();
            const filtered = this.selectedKelas === "Semua" ? siswaList : siswaList.filter(s => s.kelas === this.selectedKelas);
            return filtered.map(s => ({
                idTarget: s.nisn,
                nama: s.nama,
                identitas: `NISN: ${s.nisn} • Kelas ${s.kelas}`,
                kelas: s.kelas
            }));
        }
    },

    renderPresensiInputTable() {
        const container = document.getElementById("table-input-absensi-body");
        if (!container) return;

        const targets = this.getListTarget();
        const existingAbsensi = DataStore.getAbsensi().filter(a => 
            a.tanggal === this.selectedDate && a.kategori === this.selectedKategori
        );

        if (targets.length === 0) {
            container.innerHTML = `
                <tr>
                    <td colspan="5" class="py-8 text-center text-slate-400">
                        Tidak ada data target untuk kategori / kelas ini.
                    </td>
                </tr>
            `;
            return;
        }

        container.innerHTML = targets.map((t, index) => {
            const recorded = existingAbsensi.find(a => a.nisnNip === t.idTarget);
            const currentStatus = recorded ? recorded.status : "Hadir";
            const keterangan = recorded ? recorded.keterangan : "";

            return `
                <tr class="hover:bg-slate-50 border-b border-slate-100 transition-colors">
                    <td class="px-4 py-3 text-xs font-semibold text-slate-500">${index + 1}</td>
                    <td class="px-4 py-3">
                        <div class="font-bold text-slate-800 text-sm">${t.nama}</div>
                        <div class="text-xs text-slate-400">${t.identitas}</div>
                    </td>
                    <td class="px-4 py-3">
                        <div class="flex items-center gap-1.5 flex-wrap" id="status-group-${t.idTarget.replace(/\s+/g, '')}">
                            <label class="cursor-pointer inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border text-xs font-semibold transition ${currentStatus === 'Hadir' ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm' : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'}">
                                <input type="radio" name="status_${t.idTarget.replace(/\s+/g, '')}" value="Hadir" ${currentStatus === 'Hadir' ? 'checked' : ''} onchange="ModulAbsensi.updateRadioStyle(this)" class="sr-only">
                                <i class="fa-solid fa-check"></i> Hadir
                            </label>
                            <label class="cursor-pointer inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border text-xs font-semibold transition ${currentStatus === 'Sakit' ? 'bg-amber-500 text-white border-amber-500 shadow-sm' : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'}">
                                <input type="radio" name="status_${t.idTarget.replace(/\s+/g, '')}" value="Sakit" ${currentStatus === 'Sakit' ? 'checked' : ''} onchange="ModulAbsensi.updateRadioStyle(this)" class="sr-only">
                                <i class="fa-solid fa-notes-medical"></i> Sakit
                            </label>
                            <label class="cursor-pointer inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border text-xs font-semibold transition ${currentStatus === 'Izin' ? 'bg-blue-600 text-white border-blue-600 shadow-sm' : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'}">
                                <input type="radio" name="status_${t.idTarget.replace(/\s+/g, '')}" value="Izin" ${currentStatus === 'Izin' ? 'checked' : ''} onchange="ModulAbsensi.updateRadioStyle(this)" class="sr-only">
                                <i class="fa-solid fa-envelope-open"></i> Izin
                            </label>
                            <label class="cursor-pointer inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border text-xs font-semibold transition ${currentStatus === 'Alpa' ? 'bg-rose-600 text-white border-rose-600 shadow-sm' : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'}">
                                <input type="radio" name="status_${t.idTarget.replace(/\s+/g, '')}" value="Alpa" ${currentStatus === 'Alpa' ? 'checked' : ''} onchange="ModulAbsensi.updateRadioStyle(this)" class="sr-only">
                                <i class="fa-solid fa-xmark"></i> Alpa
                            </label>
                        </div>
                    </td>
                    <td class="px-4 py-3">
                        <input type="text" id="ket_${t.idTarget.replace(/\s+/g, '')}" value="${keterangan}" placeholder="Catatan opsional..." 
                            class="w-full px-3 py-1.5 text-xs border border-slate-200 rounded-lg focus:ring-1 focus:ring-blue-500 focus:outline-none">
                    </td>
                    <td class="px-4 py-3 text-center text-xs text-slate-400">
                        ${recorded ? `<span class="text-emerald-600 font-medium"><i class="fa-solid fa-circle-check"></i> Tersimpan</span>` : '<span class="text-slate-400">Belum Disimpan</span>'}
                    </td>
                </tr>
            `;
        }).join("");
    },

    updateRadioStyle(radioInput) {
        const parentGroup = radioInput.closest("div");
        const labels = parentGroup.querySelectorAll("label");
        
        labels.forEach(lbl => {
            const val = lbl.querySelector("input").value;
            lbl.className = "cursor-pointer inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border text-xs font-semibold transition bg-white text-slate-600 border-slate-200 hover:bg-slate-50";
            if (lbl.querySelector("input").checked) {
                if (val === "Hadir") lbl.className = "cursor-pointer inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border text-xs font-semibold transition bg-emerald-600 text-white border-emerald-600 shadow-sm";
                else if (val === "Sakit") lbl.className = "cursor-pointer inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border text-xs font-semibold transition bg-amber-500 text-white border-amber-500 shadow-sm";
                else if (val === "Izin") lbl.className = "cursor-pointer inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border text-xs font-semibold transition bg-blue-600 text-white border-blue-600 shadow-sm";
                else if (val === "Alpa") lbl.className = "cursor-pointer inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border text-xs font-semibold transition bg-rose-600 text-white border-rose-600 shadow-sm";
            }
        });
    },

    markAllHadir() {
        const targets = this.getListTarget();
        targets.forEach(t => {
            const cleanId = t.idTarget.replace(/\s+/g, '');
            const radioHadir = document.querySelector(`input[name="status_${cleanId}"][value="Hadir"]`);
            if (radioHadir) {
                radioHadir.checked = true;
                this.updateRadioStyle(radioHadir);
            }
        });
        App.showToast("Semua siswa/tendik ditandai 'Hadir' secara instan!", "info");
    },

    async savePresensiBatch() {
        const targets = this.getListTarget();
        const records = [];

        targets.forEach(t => {
            const cleanId = t.idTarget.replace(/\s+/g, '');
            const selectedRadio = document.querySelector(`input[name="status_${cleanId}"]:checked`);
            const status = selectedRadio ? selectedRadio.value : "Hadir";
            const keterangan = document.getElementById(`ket_${cleanId}`)?.value || "";

            records.push({
                tanggal: this.selectedDate,
                kategori: this.selectedKategori,
                kelas: t.kelas,
                nisnNip: t.idTarget,
                nama: t.nama,
                status: status,
                keterangan: keterangan
            });
        });

        const btn = document.getElementById("btn-simpan-absensi");
        if (btn) {
            btn.disabled = true;
            btn.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i> Menyimpan...`;
        }

        const res = await ApiClient.request("saveAbsensiBatch", { records: records });

        if (res.success) {
            App.showToast(res.message, "success");
            this.renderPresensiInputTable();
            this.renderRekapitulasi();
            App.updateDashboardStats();
        } else {
            App.showToast(res.message || "Gagal menyimpan presensi", "error");
        }

        if (btn) {
            btn.disabled = false;
            btn.innerHTML = `<i class="fa-solid fa-cloud-arrow-up"></i> Simpan Presensi Hari Ini`;
        }
    },

    renderRekapitulasi() {
        const absensiList = DataStore.getAbsensi();
        const today = this.selectedDate;
        const currentData = absensiList.filter(a => a.tanggal === today);

        const total = currentData.length;
        const hadir = currentData.filter(a => a.status === "Hadir").length;
        const sakit = currentData.filter(a => a.status === "Sakit").length;
        const izin = currentData.filter(a => a.status === "Izin").length;
        const alpa = currentData.filter(a => a.status === "Alpa").length;

        const persenHadir = total > 0 ? ((hadir / total) * 100).toFixed(1) : 0;

        // Update Stat Cards
        const statPersen = document.getElementById("absen-stat-persen");
        const statHadir = document.getElementById("absen-stat-hadir");
        const statSakit = document.getElementById("absen-stat-sakit");
        const statIzin = document.getElementById("absen-stat-izin");
        const statAlpa = document.getElementById("absen-stat-alpa");

        if (statPersen) statPersen.textContent = `${persenHadir}%`;
        if (statHadir) statHadir.textContent = `${hadir} Orang`;
        if (statSakit) statSakit.textContent = `${sakit} Orang`;
        if (statIzin) statIzin.textContent = `${izin} Orang`;
        if (statAlpa) statAlpa.textContent = `${alpa} Orang`;

        this.initOrUpdateCharts(hadir, sakit, izin, alpa);
    },

    initOrUpdateCharts(hadir, sakit, izin, alpa) {
        if (typeof Chart === "undefined") return;

        // 1. Chart Donut Kehadiran Hari Ini
        const ctxDonut = document.getElementById("chart-presensi-donut");
        if (ctxDonut) {
            if (this.activeChartDonut) this.activeChartDonut.destroy();

            const isDataEmpty = (hadir + sakit + izin + alpa) === 0;
            this.activeChartDonut = new Chart(ctxDonut, {
                type: 'doughnut',
                data: {
                    labels: ['Hadir', 'Sakit', 'Izin', 'Alpa'],
                    datasets: [{
                        data: isDataEmpty ? [1, 0, 0, 0] : [hadir, sakit, izin, alpa],
                        backgroundColor: isDataEmpty ? ['#e2e8f0'] : ['#10b981', '#f59e0b', '#3b82f6', '#ef4444'],
                        borderWidth: 2,
                        borderColor: '#ffffff'
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: { position: 'bottom', labels: { boxWidth: 12, font: { size: 11, family: 'Plus Jakarta Sans' } } }
                    },
                    cutout: '72%'
                }
            });
        }

        // 2. Chart Tren Kehadiran Bulanan (Line/Bar)
        const ctxTren = document.getElementById("chart-presensi-tren");
        if (ctxTren) {
            if (this.activeChartTren) this.activeChartTren.destroy();

            const histori = DataStore.getHistoriBulanan();
            const labels = histori.map(h => h.bulan);
            const hadirValues = histori.map(h => h.hadir);

            this.activeChartTren = new Chart(ctxTren, {
                type: 'line',
                data: {
                    labels: labels,
                    datasets: [{
                        label: '% Kehadiran Bulanan',
                        data: hadirValues,
                        borderColor: '#1e3a8a',
                        backgroundColor: 'rgba(30, 58, 138, 0.08)',
                        fill: true,
                        tension: 0.35,
                        pointBackgroundColor: '#1e3a8a',
                        pointRadius: 5,
                        pointHoverRadius: 7
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: { display: false }
                    },
                    scales: {
                        y: {
                            min: 80,
                            max: 100,
                            ticks: {
                                callback: val => `${val}%`,
                                font: { size: 11, family: 'Plus Jakarta Sans' }
                            },
                            grid: { color: '#f1f5f9' }
                        },
                        x: {
                            grid: { display: false },
                            ticks: { font: { size: 11, family: 'Plus Jakarta Sans' } }
                        }
                    }
                }
            });
        }
    },

    exportRekapCSV() {
        const list = DataStore.getAbsensi();
        if (list.length === 0) {
            App.showToast("Tidak ada data presensi untuk diekspor", "warning");
            return;
        }

        let csv = "ID,Tanggal,Kategori,Kelas,NISN / NIP,Nama Lengkap,Status Kehadiran,Catatan Keterangan,Timestamp\n";
        list.forEach(a => {
            csv += `"${a.id}","${a.tanggal}","${a.kategori}","${a.kelas}","${a.nisnNip}","${a.nama}","${a.status}","${(a.keterangan || '').replace(/"/g, '""')}","${a.timestamp}"\n`;
        });

        const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `REKAP_PRESENSI_SIM_TAS_SD_${new Date().toISOString().split('T')[0]}.csv`;
        a.click();
        URL.revokeObjectURL(url);
        App.showToast("Rekapitulasi presensi berhasil diekspor ke CSV!", "success");
    }
};
