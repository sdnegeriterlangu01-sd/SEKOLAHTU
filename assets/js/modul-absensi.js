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
        this.populateKelasOptions();
        this.bindEvents();
        this.setDefaultDate();
        this.renderPresensiInputTable();
        this.renderRekapitulasi();
    },

    populateKelasOptions() {
        const sel = document.getElementById("absensi-kelas");
        if (!sel) return;
        const rombels = DataStore.getRombels();

        const role = Auth.role();
        const gInfo = Auth.getGuruInfo ? Auth.getGuruInfo() : null;

        // Kunci kelas jika akun guru telah dimapping kelasnya saat buat akun
        if (role === "guru" && gInfo && gInfo.isGuruKelas) {
            const cleanK = String(gInfo.kelas || "1").replace(/kelas\s*/i, "").trim();
            const matchedRombel = rombels.find(r => {
                const d1 = String(r).replace(/\D/g, "");
                const d2 = cleanK.replace(/\D/g, "");
                return (d1 && d2 && d1 === d2) || String(r).toLowerCase().includes(cleanK.toLowerCase());
            }) || `Kelas ${cleanK}`;
            const label = matchedRombel.toLowerCase().startsWith("kelas") ? matchedRombel : `Kelas ${matchedRombel}`;

            sel.innerHTML = `<option value="${Sec.esc(matchedRombel)}" selected>${Sec.esc(label)}</option>`;
            sel.value = matchedRombel;
            sel.disabled = true;
            this.selectedKelas = matchedRombel;
            return;
        } else if (role === "guru" && gInfo && gInfo.isGuruMapel && gInfo.kelas && gInfo.kelas !== "Semua") {
            const cleanK = String(gInfo.kelas).replace(/kelas\s*/i, "").trim();
            const matchedRombel = rombels.find(r => {
                const d1 = String(r).replace(/\D/g, "");
                const d2 = cleanK.replace(/\D/g, "");
                return (d1 && d2 && d1 === d2) || String(r).toLowerCase().includes(cleanK.toLowerCase());
            }) || `Kelas ${cleanK}`;
            const label = matchedRombel.toLowerCase().startsWith("kelas") ? matchedRombel : `Kelas ${matchedRombel}`;

            sel.innerHTML = `<option value="${Sec.esc(matchedRombel)}" selected>${Sec.esc(label)}</option>`;
            sel.value = matchedRombel;
            sel.disabled = true;
            this.selectedKelas = matchedRombel;
            return;
        }

        sel.disabled = false;
        const curVal = sel.value || this.selectedKelas || "Semua";
        sel.innerHTML = `<option value="Semua">Semua Kelas</option>` +
            rombels.map(k => {
                const label = k.toLowerCase().startsWith("kelas") ? k : `Kelas ${k}`;
                return `<option value="${Sec.esc(k)}">${Sec.esc(label)}</option>`;
            }).join("");

        if (curVal && Array.from(sel.options).some(o => o.value === curVal)) {
            sel.value = curVal;
            this.selectedKelas = curVal;
        } else {
            sel.value = "Semua";
            this.selectedKelas = "Semua";
        }
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

    // Deteksi hari libur nasional, hari Minggu, dan cuti bersama (Sumber: husniadil.com/calendar/{Tahun}/)
    getHolidayInfo(dateStr) {
        if (!dateStr) return null;
        const d = new Date(dateStr);
        const isMinggu = d.getDay() === 0;
        const holidays = DataStore.getConfig().hariLibur || [];
        const match = holidays.find(h => h.tanggal === dateStr);
        if (match) {
            return { isHoliday: true, name: match.ket, type: "Nasional / Cuti Bersama", source: "husniadil.com" };
        }
        if (isMinggu) {
            return { isHoliday: true, name: "Hari Minggu (Akhir Pekan)", type: "Minggu", source: "Kalender" };
        }
        return null;
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
            const targetKelas = this.selectedKelas;
            const filtered = (!targetKelas || targetKelas === "Semua") ? siswaList : siswaList.filter(s => {
                const k1 = String(s.kelas || "").trim();
                const k2 = String(s.rombel || "").trim();
                const sel = String(targetKelas).trim();

                if (k1 === sel || k2 === sel) return true;
                if (k1.toLowerCase() === sel.toLowerCase() || k2.toLowerCase() === sel.toLowerCase()) return true;

                const d1 = k1.replace(/\D/g, "");
                const d2 = k2.replace(/\D/g, "");
                const dSel = sel.replace(/\D/g, "");
                if (dSel && (d1 === dSel || d2 === dSel)) return true;

                if (k1 && sel && (k1.toLowerCase().includes(sel.toLowerCase()) || sel.toLowerCase().includes(k1.toLowerCase()))) return true;
                if (k2 && sel && (k2.toLowerCase().includes(sel.toLowerCase()) || sel.toLowerCase().includes(k2.toLowerCase()))) return true;

                return false;
            });

            return filtered.map(s => {
                const rombelStr = String(s.rombel || s.kelas || "-").trim();
                const displayKelas = rombelStr.toLowerCase().startsWith("kelas") ? rombelStr : `Kelas ${rombelStr}`;
                return {
                    idTarget: s.nisn,
                    nama: s.nama,
                    identitas: `NISN: ${s.nisn} • ${displayKelas}`,
                    kelas: rombelStr
                };
            });
        }
    },

    renderPresensiInputTable() {
        const container = document.getElementById("table-input-absensi-body");
        if (!container) return;

        const targets = this.getListTarget();
        const existingAbsensi = DataStore.getAbsensi().filter(a => 
            a.tanggal === this.selectedDate && a.kategori === this.selectedKategori
        );
        const holidayInfo = this.getHolidayInfo(this.selectedDate);

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

        const holidayRow = holidayInfo ? `
            <tr class="bg-rose-50/80 border-b-2 border-rose-200">
                <td colspan="5" class="p-3">
                    <div class="flex items-center justify-between text-xs text-rose-900">
                        <div class="flex items-center gap-2">
                            <i class="fa-solid fa-calendar-xmark text-rose-600 text-sm"></i>
                            <span>Tanggal <strong>${this.selectedDate}</strong> bertepatan dengan <strong>${holidayInfo.name}</strong> (${holidayInfo.type}).</span>
                        </div>
                        <span class="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-rose-200 text-rose-800 uppercase tracking-wider">
                            Hari Libur
                        </span>
                    </div>
                </td>
            </tr>
        ` : '';

        const rowsHtml = targets.map((t, index) => {
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

        container.innerHTML = holidayRow + rowsHtml;
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
        if (targets.length === 0) {
            App.showToast("Tidak ada siswa/tendik pada kelas/filter ini.", "warning");
            return;
        }
        targets.forEach(t => {
            const cleanId = t.idTarget.replace(/\s+/g, '');
            const radioHadir = document.querySelector(`input[name="status_${cleanId}"][value="Hadir"]`);
            if (radioHadir) {
                radioHadir.checked = true;
                this.updateRadioStyle(radioHadir);
            }
        });
        App.showToast("Semua baris telah ditandai Hadir. Klik tombol 'Simpan Presensi' untuk menyimpan ke database & rekapitulasi.", "info");
    },

    async savePresensiBatch() {
        const targets = this.getListTarget();
        if (targets.length === 0) {
            App.showToast("Tidak ada data presensi yang ditampilkan.", "warning");
            return;
        }

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
        const btnFast = document.getElementById("btn-fast-simpan-absensi");
        const setBtnState = (loading) => {
            if (btn) {
                btn.disabled = loading;
                btn.innerHTML = loading ? `<i class="fa-solid fa-spinner fa-spin"></i> Menyimpan...` : `<i class="fa-solid fa-cloud-arrow-up"></i> Simpan Presensi Hari Ini`;
            }
            if (btnFast) {
                btnFast.disabled = loading;
                btnFast.innerHTML = loading ? `<i class="fa-solid fa-spinner fa-spin"></i> Menyimpan...` : `<i class="fa-solid fa-floppy-disk"></i> Simpan Presensi`;
            }
        };

        setBtnState(true);

        // 1. Simpan langsung ke cache lokal DataStore agar instan & status DB langsung 'Tersimpan'
        const currentAbs = DataStore.getAbsensi();
        const absMap = new Map();
        currentAbs.forEach(item => absMap.set(`${item.tanggal}_${item.kategori}_${item.nisnNip}`, item));
        records.forEach(rec => {
            absMap.set(`${rec.tanggal}_${rec.kategori}_${rec.nisnNip}`, {
                id: `ABS-${rec.tanggal}-${rec.kategori}-${String(rec.nisnNip).replace(/\s+/g, "")}`,
                ...rec,
                timestamp: `${Util.today()} ${Util.nowTime()}`
            });
        });
        DataStore.saveAbsensi(Array.from(absMap.values()));

        const res = await ApiClient.request("saveAbsensiBatch", { records: records, tahunAjaran: DataStore.getActiveTA() });

        // Sinkronisasi otomatis ke Rekap Absen Siswa Bulanan
        if (this.selectedKategori === "Siswa" && records.length > 0) {
            try {
                const ta = DataStore.getActiveTA();
                const bulan = this.selectedDate.substring(0, 7);
                const dd = this.selectedDate.substring(8, 10);

                // Kelompokkan siswa berdasarkan kelas / rombel murni
                const perKelas = {};
                records.forEach(r => {
                    const k = String(r.kelas || "").trim();
                    if (k && k !== "-") {
                        if (!perKelas[k]) perKelas[k] = [];
                        perKelas[k].push(r);
                    }
                });

                // 1. Simpan langsung ke cache lokal DataStore agar rekap bulanan siswa selalu instan
                const localBulan = DataStore.getAbsensiSiswaBulan();
                for (const [kls, recs] of Object.entries(perKelas)) {
                    const rowsToSave = recs.map(r => {
                        const key = `${ta}|${bulan}|${r.nisnNip}`;
                        const existingRec = localBulan.find(b => b.key === key || b.nisn === r.nisnNip);
                        const marks = { ...(existingRec?.marks || {}) };
                        if (r.status === "Sakit") marks[dd] = "S";
                        else if (r.status === "Izin") marks[dd] = "I";
                        else if (r.status === "Alpa") marks[dd] = "A";
                        else marks[dd] = "H"; // Hadir
                        return {
                            nisn: r.nisnNip,
                            nama: r.nama,
                            marks: marks,
                            kelas: kls
                        };
                    });

                    rowsToSave.forEach(row => {
                        const key = `${ta}|${bulan}|${row.nisn}`;
                        const idx = localBulan.findIndex(b => b.key === key || b.nisn === row.nisn);
                        const rec = { key, tahunAjaran: ta, bulan, kelas: kls, nisn: row.nisn, nama: row.nama, marks: row.marks };
                        if (idx >= 0) localBulan[idx] = rec; else localBulan.push(rec);
                    });
                    DataStore.saveAbsensiSiswaBulan(localBulan);

                    // 2. Kirim update ke backend Cloud jika aktif
                    ApiClient.request("saveAbsensiSiswaBulan", {
                        tahunAjaran: ta,
                        bulan: bulan,
                        kelas: kls,
                        rows: rowsToSave
                    }).catch(e => console.warn("[ModulAbsensi] Sync saveAbsensiSiswaBulan cloud:", e));
                }
            } catch (errSync) {
                console.warn("[ModulAbsensi] Gagal sinkronisasi rekap bulanan siswa:", errSync);
            }
        }

        if (res.success) {
            App.showToast("Presensi berhasil disimpan dan disinkronkan ke rekapitulasi!", "success");
            this.renderPresensiInputTable();
            this.renderRekapitulasi();
            App.updateDashboardStats();
        } else {
            App.showToast(res.message || "Gagal menyimpan presensi", "error");
        }

        setBtnState(false);
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
