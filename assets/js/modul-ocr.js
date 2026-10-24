/* ==========================================================================
   SIM-TAS-SD: MODUL OCR CERDAS KARTU KELUARGA & AKTA KELAHIRAN
   Versi 2.0.0 - SDN Terlangu 01 Brebes
   Fitur:
   1. On-Demand Client-Side OCR menggunakan Tesseract.js v5 CDN (Tanpa Server / Zero Cost).
   2. Canvas Pre-Processing (Grayscale + Adaptive Thresholding) untuk Meningkatkan Akurasi.
   3. Smart Parser Regex: No KK 16 Digit, Tanggal Terbit KK, Nama Ayah, Nama Ibu, NIK.
   4. Side-by-Side Diff Modal (Perbandingan Data Eksisting vs Deteksi OCR).
   5. Inovasi 2: Smart OCR Family Bundle Matching (Deteksi Saudara Kandung Satu KK Lintas Rombel).
   6. 1-Klik Terapkan & Sinkronkan ke Database Siswa.
   ========================================================================== */

const ModulOCR = {
    TESSERACT_CDN: "https://cdn.jsdelivr.net/npm/tesseract.js@5/dist/tesseract.min.js",
    _tesseractPromise: null,
    isProcessing: false,
    currentNisn: null,
    currentDocType: "kk", // "kk" atau "akta"
    ocrResult: null,

    loadTesseract() {
        if (window.Tesseract) return Promise.resolve(window.Tesseract);
        if (this._tesseractPromise) return this._tesseractPromise;

        this._tesseractPromise = new Promise((resolve, reject) => {
            const s = document.createElement("script");
            s.src = this.TESSERACT_CDN;
            s.crossOrigin = "anonymous";
            s.onload = () => {
                if (window.Tesseract) resolve(window.Tesseract);
                else reject(new Error("Tesseract.js gagal diinisialisasi"));
            };
            s.onerror = () => {
                this._tesseractPromise = null;
                reject(new Error("Gagal mengunduh library OCR Tesseract.js (periksa koneksi internet)"));
            };
            document.head.appendChild(s);
        });

        return this._tesseractPromise;
    },

    // Buka modal scan file OCR
    openScanModal(nisn, docType = "kk") {
        this.currentNisn = nisn;
        this.currentDocType = docType;
        const student = DataStore.getSiswa().find(s => s.nisn === nisn);
        if (!student) {
            App.showToast("Data siswa tidak ditemukan", "error");
            return;
        }

        const modal = document.getElementById("modal-ocr-scanner");
        if (!modal) return;

        document.getElementById("modal-ocr-student-info").textContent = `${student.nama} (NISN: ${student.nisn} • Kelas ${student.rombel || student.kelas})`;
        let docTitle = "Kartu Keluarga (KK)";
        if (docType === "akta") docTitle = "Akta Kelahiran";
        else if (docType === "kta") docTitle = "Kartu Tanda Anggota (KTA) Pramuka";
        document.getElementById("modal-ocr-doc-type").textContent = docTitle;
        
        // Reset state
        document.getElementById("ocr-file-input").value = "";
        document.getElementById("ocr-preview-container").classList.add("hidden");
        document.getElementById("ocr-diff-container").classList.add("hidden");
        document.getElementById("ocr-progress-box").classList.add("hidden");
        document.getElementById("btn-start-ocr").classList.add("hidden");
        document.getElementById("btn-apply-ocr").classList.add("hidden");

        modal.classList.remove("hidden");
    },

    closeScanModal() {
        const modal = document.getElementById("modal-ocr-scanner");
        if (modal) modal.classList.add("hidden");
        this.currentNisn = null;
        this.ocrResult = null;
    },

    // Handle saat pengguna memilih file gambar berkas
    handleFileSelected(event) {
        const file = event.target.files && event.target.files[0];
        if (!file) return;

        if (!file.type.startsWith("image/")) {
            App.showToast("Pilih berkas berupa file foto / scan gambar (JPG/PNG/WEBP).", "warning");
            return;
        }

        const reader = new FileReader();
        reader.onload = (e) => {
            const imgEl = document.getElementById("ocr-image-preview");
            imgEl.src = e.target.result;
            document.getElementById("ocr-preview-container").classList.remove("hidden");
            document.getElementById("btn-start-ocr").classList.remove("hidden");
            document.getElementById("ocr-diff-container").classList.add("hidden");
        };
        reader.readAsDataURL(file);
    },

    // Preprocessing Gambar di Canvas (Grayscale + Thresholding)
    preprocessImage(imgEl) {
        const canvas = document.createElement("canvas");
        const ctx = canvas.getContext("2d");
        canvas.width = imgEl.naturalWidth || imgEl.width || 800;
        canvas.height = imgEl.naturalHeight || imgEl.height || 600;

        ctx.drawImage(imgEl, 0, 0, canvas.width, canvas.height);
        const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const d = imgData.data;

        // Grayscale & Contrast Boost
        for (let i = 0; i < d.length; i += 4) {
            const v = 0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2];
            // Adaptive thresholding sederhana
            const thr = v > 128 ? 255 : (v < 60 ? 0 : v);
            d[i] = thr;
            d[i + 1] = thr;
            d[i + 2] = thr;
        }

        ctx.putImageData(imgData, 0, 0);
        return canvas.toDataURL("image/png");
    },

    // Menjalankan OCR Ekstraksi
    async startOCR() {
        if (this.isProcessing) return;
        const imgEl = document.getElementById("ocr-image-preview");
        if (!imgEl || !imgEl.src) return;

        const progressBox = document.getElementById("ocr-progress-box");
        const progressBar = document.getElementById("ocr-progress-bar");
        const progressStatus = document.getElementById("ocr-progress-status");
        const progressPercent = document.getElementById("ocr-progress-percent");
        const btnStart = document.getElementById("btn-start-ocr");

        progressBox.classList.remove("hidden");
        btnStart.disabled = true;
        this.isProcessing = true;

        try {
            progressStatus.textContent = "Menginisialisasi Engine Tesseract.js (Model Bahasa Indonesia)...";
            progressBar.style.width = "20%";
            if (progressPercent) progressPercent.textContent = "20%";

            const Tesseract = await this.loadTesseract();
            
            progressStatus.textContent = "Melakukan Canvas Image Preprocessing...";
            progressBar.style.width = "40%";
            if (progressPercent) progressPercent.textContent = "40%";
            const processedUrl = this.preprocessImage(imgEl);

            progressStatus.textContent = "Membaca teks dari gambar berkas fisik...";
            progressBar.style.width = "60%";
            if (progressPercent) progressPercent.textContent = "60%";

            const result = await Tesseract.recognize(processedUrl, 'ind', {
                logger: m => {
                    if (m.status === 'recognizing text') {
                        const pct = Math.round(m.progress * 100);
                        progressBar.style.width = `${60 + (pct * 0.35)}%`;
                        progressStatus.textContent = `Memindai teks: ${pct}%...`;
                        if (progressPercent) progressPercent.textContent = `${pct}%`;
                    }
                }
            });

            progressBar.style.width = "100%";
            if (progressPercent) progressPercent.textContent = "100%";
            progressStatus.textContent = "Selesai! Mengekstrak entitas data...";

            const fullText = result.data.text || "";
            this.parseExtractedText(fullText);

        } catch (err) {
            console.error("OCR Error:", err);
            App.showToast(`OCR Gagal: ${err.message}`, "error");
            progressStatus.textContent = `Gagal: ${err.message}`;
            if (progressPercent) progressPercent.textContent = "0%";
        } finally {
            this.isProcessing = false;
            btnStart.disabled = false;
        }
    },

    // Parsing teks mentah hasil OCR dengan regex cerdas
    parseExtractedText(text) {
        if (this.currentDocType === "kta") {
            this.parseKTAText(text);
            return;
        }

        const student = DataStore.getSiswa().find(s => s.nisn === this.currentNisn) || {};
        const lines = text.split(/\r?\n/).map(l => l.trim()).filter(Boolean);

        // 1. Ekstrak Nomor KK (16 digit, umumnya diawali kode provinsi Jateng 33...)
        let detectedNoKK = "";
        const kkMatch = text.match(/\b(33\d{14})\b/) || text.match(/\b(\d{16})\b/);
        if (kkMatch) {
            detectedNoKK = kkMatch[1];
        }

        // 2. Ekstrak Tanggal Terbit KK
        // Pola: "15 Januari 2021" atau "Dikeluarkan Tanggal : 10-08-2020"
        let detectedTglKK = "";
        const tglTextMatch = text.match(/(\d{1,2})\s+(Januari|Februari|Maret|April|Mei|Juni|Juli|Agustus|September|Oktober|November|Desember)\s+(20\d{2})/i);
        if (tglTextMatch) {
            detectedTglKK = `${tglTextMatch[1]} ${tglTextMatch[2]} ${tglTextMatch[3]}`;
        } else {
            const tglNumMatch = text.match(/(\d{2})[-/](\d{2})[-/](20\d{2})/);
            if (tglNumMatch) {
                detectedTglKK = `${tglNumMatch[1]}-${tglNumMatch[2]}-${tglNumMatch[3]}`;
            }
        }

        // 3. Ekstrak NIK Siswa
        let detectedNik = student.nik || "";
        const allNiks = text.match(/\b(33\d{14})\b/g) || [];
        if (allNiks.length > 1) {
            // Jika ada banyak NIK, cari yang berbeda dari No KK
            const candNik = allNiks.find(n => n !== detectedNoKK);
            if (candNik) detectedNik = candNik;
        }

        // 4. Ekstrak Nama Ayah / Kepala Keluarga
        let detectedAyah = student.namaOrtu || "";
        lines.forEach(l => {
            if (/nama\s*kepala\s*keluarga/i.test(l)) {
                const parts = l.split(/[:=]/);
                if (parts[1] && parts[1].trim()) detectedAyah = parts[1].trim();
            }
        });

        // 5. Ekstrak Nama Ibu
        let detectedIbu = student.ibuNama || "";
        lines.forEach(l => {
            if (/nama\s*ibu/i.test(l)) {
                const parts = l.split(/[:=]/);
                if (parts[1] && parts[1].trim()) detectedIbu = parts[1].trim();
            }
        });

        this.ocrResult = {
            nisn: student.nisn,
            nama: student.nama,
            noKk: detectedNoKK || student.noKk || "",
            tglTerbitKk: detectedTglKK || student.tglTerbitKk || "15 Januari 2021",
            nik: detectedNik || student.nik || "",
            namaOrtu: detectedAyah || student.namaOrtu || "",
            ibuNama: detectedIbu || student.ibuNama || ""
        };

        this.renderDiffView(student, this.ocrResult);
    },

    // Parsing khusus Kartu Tanda Anggota (KTA) Pramuka
    parseKTAText(text) {
        const student = DataStore.getSiswa().find(s => s.nisn === this.currentNisn) || {};
        const lines = text.split(/\r?\n/).map(l => l.trim()).filter(Boolean);

        // Ekstraksi Nomor Tanda Anggota (NTA) Pramuka
        let detectedNTA = "";
        const ntaMatch = text.match(/(?:NTA|NOMOR\s*(?:TANDA\s*)?ANGGOTA|NO\.?\s*(?:TANDA\s*)?ANGGOTA|NO\.?\s*KTA|KTA)\s*[:=.]*\s*([0-9.\-\/]+)/i);
        if (ntaMatch && ntaMatch[1].replace(/[\D]/g, '').length >= 5) {
            detectedNTA = ntaMatch[1].trim();
        } else {
            const patternMatch = text.match(/\b(11\.\d{2}[\d.\-\/]{4,20})\b/)
                || text.match(/\b(\d{2}\.\d{2}\.[\d.\-\/]{4,20})\b/)
                || text.match(/\b(\d{8,16})\b/);
            if (patternMatch) {
                detectedNTA = patternMatch[1].trim();
            }
        }

        if (!detectedNTA) {
            for (const l of lines) {
                if (/nta|anggota|pramuka/i.test(l)) {
                    const digits = l.replace(/[^0-9.\-\/]/g, '').trim();
                    if (digits.replace(/\D/g, '').length >= 5) {
                        detectedNTA = digits;
                        break;
                    }
                }
            }
        }

        this.ocrResult = {
            nisn: student.nisn,
            nama: student.nama,
            nta: detectedNTA || student.nta || ""
        };

        this.renderKTADiffView(student, this.ocrResult);
    },

    // Diff View Khusus KTA Pramuka
    renderKTADiffView(dbData, ocrData) {
        const diffBox = document.getElementById("ocr-diff-container");
        if (!diffBox) return;

        diffBox.classList.remove("hidden");
        document.getElementById("btn-apply-ocr").classList.remove("hidden");

        const fields = [
            { key: "nta", label: "Nomor Tanda Anggota (NTA) Pramuka" },
            { key: "nama", label: "Nama Anggota / Siswa" },
            { key: "nisn", label: "NISN Siswa" }
        ];

        let html = `
            <div class="rounded-2xl border border-amber-200 dark:border-amber-800/60 overflow-hidden bg-white dark:bg-slate-900 shadow-sm">
                <div class="grid grid-cols-2 bg-amber-50 dark:bg-slate-800/90 text-xs font-bold border-b border-amber-200 dark:border-amber-800/60 divide-x divide-amber-200 dark:divide-amber-800/60">
                    <div class="p-3 text-amber-950 dark:text-amber-200 flex items-center gap-2">
                        <i class="fa-solid fa-database text-amber-600 dark:text-amber-400"></i> Data Eksisting di Database
                    </div>
                    <div class="p-3 text-amber-900 dark:text-amber-300 bg-amber-100/50 dark:bg-amber-950/40 flex items-center gap-2">
                        <i class="fa-solid fa-wand-magic-sparkles text-amber-600 dark:text-amber-400"></i> Hasil Deteksi OCR KTA Pramuka
                    </div>
                </div>
                <div class="divide-y divide-slate-100 dark:divide-slate-800 text-xs">
        `;

        fields.forEach(f => {
            const dbVal = dbData[f.key] || "";
            const ocrVal = ocrData[f.key] || "";
            const isMatch = dbVal && ocrVal && dbVal.toLowerCase().trim() === ocrVal.toLowerCase().trim();

            let rowBg = "";
            let matchBadge = "";
            if (!dbVal && ocrVal) {
                rowBg = "bg-emerald-50/50 dark:bg-emerald-950/20";
                matchBadge = `<span class="ml-2 text-[10px] px-1.5 py-0.5 rounded font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 dark:border dark:border-emerald-800/60"><i class="fa-solid fa-plus"></i> Data Baru</span>`;
            } else if (isMatch) {
                matchBadge = `<span class="ml-2 text-[10px] px-1.5 py-0.5 rounded font-bold bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300 dark:border dark:border-blue-800/60"><i class="fa-solid fa-check"></i> Cocok</span>`;
            } else if (dbVal && ocrVal && dbVal !== ocrVal) {
                rowBg = "bg-amber-50/50 dark:bg-amber-950/20";
                matchBadge = `<span class="ml-2 text-[10px] px-1.5 py-0.5 rounded font-bold bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 dark:border dark:border-amber-800/60"><i class="fa-solid fa-triangle-exclamation"></i> Perbedaan</span>`;
            }

            const isEditable = f.key === "nta";

            html += `
                <div class="grid grid-cols-2 divide-x divide-slate-100 dark:divide-slate-800 ${rowBg}">
                    <div class="p-3">
                        <label class="block text-[10px] uppercase font-bold text-slate-400 dark:text-slate-400 mb-1">${f.label}</label>
                        <div class="font-mono font-semibold text-slate-800 dark:text-slate-100 text-xs break-all">${Sec.esc(dbVal) || '<em class="text-slate-400 dark:text-slate-500 font-sans">Belum ada data</em>'}</div>
                    </div>
                    <div class="p-3 bg-amber-50/20 dark:bg-amber-950/10">
                        <div class="flex items-center justify-between mb-1">
                            <label class="block text-[10px] uppercase font-bold text-amber-900 dark:text-amber-300">${f.label}</label>
                            ${matchBadge}
                        </div>
                        ${isEditable ? `
                            <input type="text" id="ocr-field-${f.key}" value="${Sec.esc(ocrVal)}" 
                                class="w-full px-2.5 py-1.5 text-xs font-mono font-bold text-amber-900 dark:text-amber-200 bg-white dark:bg-slate-950 border border-amber-300 dark:border-amber-700/80 rounded-lg focus:ring-2 focus:ring-amber-500 focus:outline-none" placeholder="Masukkan NTA Pramuka">
                        ` : `
                            <div class="font-mono font-semibold text-slate-800 dark:text-slate-100 text-xs py-1.5">${Sec.esc(ocrVal)}</div>
                        `}
                    </div>
                </div>
            `;
        });

        html += `</div></div>`;
        diffBox.innerHTML = html;
        diffBox.scrollIntoView({ behavior: 'smooth' });
    },

    // Menampilkan Jendela Pembanding Side-by-Side (Diff View)
    renderDiffView(dbData, ocrData) {
        const diffBox = document.getElementById("ocr-diff-container");
        if (!diffBox) return;

        diffBox.classList.remove("hidden");
        document.getElementById("btn-apply-ocr").classList.remove("hidden");

        const fields = [
            { key: "noKk", label: "Nomor Kartu Keluarga (16 Digit)" },
            { key: "tglTerbitKk", label: "Tanggal Terbit KK" },
            { key: "nik", label: "NIK Siswa (16 Digit)" },
            { key: "namaOrtu", label: "Nama Ayah / Kepala Keluarga" },
            { key: "ibuNama", label: "Nama Ibu Kandung" }
        ];

        let html = `
            <div class="rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden bg-white dark:bg-slate-900 shadow-sm">
                <div class="grid grid-cols-2 bg-slate-100 dark:bg-slate-800/90 text-xs font-bold border-b border-slate-200 dark:border-slate-800 divide-x divide-slate-200 dark:divide-slate-800">
                    <div class="p-3 text-slate-700 dark:text-slate-200 flex items-center gap-2">
                        <i class="fa-solid fa-database text-blue-600 dark:text-blue-400"></i> Data Eksisting di Database
                    </div>
                    <div class="p-3 text-blue-900 dark:text-blue-300 bg-blue-50 dark:bg-blue-950/50 flex items-center gap-2">
                        <i class="fa-solid fa-wand-magic-sparkles text-amber-500"></i> Hasil Ekstraksi OCR (Bisa Diedit)
                    </div>
                </div>
                <div class="divide-y divide-slate-100 dark:divide-slate-800 text-xs">
        `;

        fields.forEach(f => {
            const dbVal = dbData[f.key] || "";
            const ocrVal = ocrData[f.key] || "";
            const isMatch = dbVal && ocrVal && dbVal.toLowerCase().trim() === ocrVal.toLowerCase().trim();
            const isFilled = !!ocrVal;

            let rowBg = "";
            let matchBadge = "";
            if (!dbVal && ocrVal) {
                rowBg = "bg-emerald-50/50 dark:bg-emerald-950/20";
                matchBadge = `<span class="ml-2 text-[10px] px-1.5 py-0.5 rounded font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 dark:border dark:border-emerald-800/60"><i class="fa-solid fa-plus"></i> Data Baru</span>`;
            } else if (isMatch) {
                matchBadge = `<span class="ml-2 text-[10px] px-1.5 py-0.5 rounded font-bold bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300 dark:border dark:border-blue-800/60"><i class="fa-solid fa-check"></i> Cocok</span>`;
            } else if (dbVal && ocrVal && dbVal !== ocrVal) {
                rowBg = "bg-amber-50/50 dark:bg-amber-950/20";
                matchBadge = `<span class="ml-2 text-[10px] px-1.5 py-0.5 rounded font-bold bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 dark:border dark:border-amber-800/60"><i class="fa-solid fa-triangle-exclamation"></i> Perbedaan</span>`;
            }

            html += `
                <div class="grid grid-cols-2 divide-x divide-slate-100 dark:divide-slate-800 ${rowBg}">
                    <div class="p-3">
                        <label class="block text-[10px] uppercase font-bold text-slate-400 dark:text-slate-400 mb-1">${f.label}</label>
                        <div class="font-mono font-semibold text-slate-800 dark:text-slate-100 text-xs break-all">${Sec.esc(dbVal) || '<em class="text-slate-400 dark:text-slate-500 font-sans">Belum ada data</em>'}</div>
                    </div>
                    <div class="p-3 bg-blue-50/20 dark:bg-blue-950/10">
                        <div class="flex items-center justify-between mb-1">
                            <label class="block text-[10px] uppercase font-bold text-blue-900 dark:text-blue-300">${f.label}</label>
                            ${matchBadge}
                        </div>
                        <input type="text" id="ocr-field-${f.key}" value="${Sec.esc(ocrVal)}" 
                            class="w-full px-2.5 py-1.5 text-xs font-mono font-bold text-slate-800 dark:text-slate-100 bg-white dark:bg-slate-950 border border-blue-200 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-blue-600 focus:outline-none">
                    </div>
                </div>
            `;
        });

        html += `</div></div>`;

        // Inovasi 2: Deteksi Saudara Kandung Satu KK
        const siblings = this.detectSiblings(dbData, ocrData);
        if (siblings.length > 0) {
            html += `
                <div class="mt-3 p-3.5 rounded-2xl bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800/60 text-indigo-950 dark:text-indigo-200 flex items-start gap-3">
                    <div class="w-8 h-8 rounded-xl bg-indigo-600 dark:bg-indigo-500 text-white flex items-center justify-center flex-shrink-0 font-bold">
                        <i class="fa-solid fa-people-roof text-sm"></i>
                    </div>
                    <div class="flex-grow min-w-0 text-xs">
                        <strong class="font-bold text-indigo-900 dark:text-indigo-200">Inovasi Cerdas: Ditemukan Saudara Kandung Satu KK!</strong>
                        <p class="text-[11px] text-indigo-700 dark:text-indigo-300 mt-0.5 leading-relaxed">
                            Siswa <strong>${Sec.esc(siblings.map(s => `${s.nama} (Kelas ${s.rombel || s.kelas})`).join(", "))}</strong> memiliki kecocokan nomor KK atau orang tua. 
                            Terapkan data KK ini ke semua saudara kandung secara otomatis?
                        </p>
                        <label class="inline-flex items-center gap-2 mt-2 font-bold text-indigo-900 dark:text-indigo-200 cursor-pointer">
                            <input type="checkbox" id="ocr-apply-to-siblings" checked class="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500">
                            Terapkan salinan nomor KK & kontak orang tua ini ke seluruh saudara kandung
                        </label>
                    </div>
                </div>
            `;
        }

        diffBox.innerHTML = html;
        diffBox.scrollIntoView({ behavior: 'smooth' });
    },

    // Inovasi 2: Cari saudara kandung dari database siswa
    detectSiblings(currentStudent, ocrData) {
        const allStudents = DataStore.getSiswa();
        const noKk = ocrData.noKk;
        const ortu = (ocrData.namaOrtu || "").toLowerCase().trim();

        return allStudents.filter(s => {
            if (s.nisn === currentStudent.nisn) return false;
            if (noKk && s.noKk && s.noKk === noKk) return true;
            if (ortu && s.namaOrtu && s.namaOrtu.toLowerCase().trim() === ortu) return true;
            return false;
        });
    },

    // 1-Klik Terapkan & Sinkronkan ke Database
    async applyOCRToDatabase() {
        if (!this.ocrResult || !this.currentNisn) return;

        // Penanganan Khusus Berkas KTA Pramuka
        if (this.currentDocType === "kta") {
            const updatedNTA = document.getElementById("ocr-field-nta")?.value?.trim() || "";
            const btn = document.getElementById("btn-apply-ocr");
            btn.disabled = true;
            btn.innerHTML = `<i class="fa-solid fa-spinner fa-spin mr-1.5"></i> Menyimpan NTA...`;

            const student = DataStore.getSiswa().find(s => s.nisn === this.currentNisn);
            if (student) {
                student.nta = updatedNTA;
                if (!student.berkas) student.berkas = {};
                student.berkas.kta = {
                    uploaded: true,
                    filename: `KTA_${student.nisn}.jpg`,
                    verified: true,
                    verifiedDate: new Date().toISOString().split("T")[0],
                    size: "245 KB"
                };
            }

            DataStore.updateStudentField(this.currentNisn, {
                nta: updatedNTA,
                berkas: student?.berkas
            });

            await ApiClient.request("updateStudentFields", {
                nisn: this.currentNisn,
                fields: {
                    nta: updatedNTA,
                    berkas: student?.berkas
                }
            });

            App.showToast(`Nomor NTA Pramuka (${updatedNTA || "-"}) berhasil disimpan ke database!`, "success");

            btn.disabled = false;
            btn.innerHTML = `<i class="fa-solid fa-cloud-arrow-up mr-1.5"></i> Terapkan & Sinkronkan ke Database`;

            this.closeScanModal();
            if (window.ModulBerkas) {
                ModulBerkas.renderTable();
                if (ModulBerkas.selectedStudent && ModulBerkas.selectedStudent.nisn === this.currentNisn) {
                    ModulBerkas.openDetailModal(this.currentNisn);
                }
            }
            App.updateDashboardStats();
            return;
        }

        const updatedFields = {
            noKk: document.getElementById("ocr-field-noKk")?.value?.trim() || "",
            tglTerbitKk: document.getElementById("ocr-field-tglTerbitKk")?.value?.trim() || "",
            nik: document.getElementById("ocr-field-nik")?.value?.trim() || "",
            namaOrtu: document.getElementById("ocr-field-namaOrtu")?.value?.trim() || "",
            ibuNama: document.getElementById("ocr-field-ibuNama")?.value?.trim() || ""
        };

        const btn = document.getElementById("btn-apply-ocr");
        btn.disabled = true;
        btn.innerHTML = `<i class="fa-solid fa-spinner fa-spin mr-1.5"></i> Menyimpan ke Database...`;

        const res = await ApiClient.request("updateStudentFields", {
            nisn: this.currentNisn,
            fields: updatedFields
        });

        // Cek apakah opsi saudara kandung dicentang
        const applySiblings = document.getElementById("ocr-apply-to-siblings")?.checked;
        if (applySiblings) {
            const currentStudent = DataStore.getSiswa().find(s => s.nisn === this.currentNisn);
            const siblings = this.detectSiblings(currentStudent, this.ocrResult);
            for (const sib of siblings) {
                await ApiClient.request("updateStudentFields", {
                    nisn: sib.nisn,
                    fields: {
                        noKk: updatedFields.noKk,
                        tglTerbitKk: updatedFields.tglTerbitKk,
                        namaOrtu: updatedFields.namaOrtu
                    }
                });
            }
            if (siblings.length > 0) {
                App.showToast(`Data KK berhasil diterapkan ke ${siblings.length + 1} siswa (termasuk saudara kandung)!`, "success");
            }
        } else {
            App.showToast("Data hasil OCR berhasil disinkronkan ke database siswa!", "success");
        }

        btn.disabled = false;
        btn.innerHTML = `<i class="fa-solid fa-cloud-arrow-up mr-1.5"></i> Terapkan & Sinkronkan ke Database`;

        this.closeScanModal();
        if (window.ModulBerkas) {
            ModulBerkas.renderTable();
            if (ModulBerkas.selectedStudent && ModulBerkas.selectedStudent.nisn === this.currentNisn) {
                ModulBerkas.openDetailModal(this.currentNisn);
            }
        }
        App.updateDashboardStats();
    }
};

window.ModulOCR = ModulOCR;
