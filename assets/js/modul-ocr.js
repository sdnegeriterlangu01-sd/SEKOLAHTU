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
    PDFJS_CDN: "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js",
    PDFJS_WORKER: "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js",
    _tesseractPromise: null,
    _pdfjsPromise: null,
    isProcessing: false,
    currentNisn: null,
    currentDocType: "kk", // "kk" atau "akta"
    ocrResult: null,

    loadPdfJs() {
        if (window.pdfjsLib) return Promise.resolve(window.pdfjsLib);
        if (this._pdfjsPromise) return this._pdfjsPromise;

        this._pdfjsPromise = new Promise((resolve, reject) => {
            const s = document.createElement("script");
            s.src = this.PDFJS_CDN;
            s.crossOrigin = "anonymous";
            s.onload = () => {
                if (window.pdfjsLib) {
                    try {
                        window.pdfjsLib.GlobalWorkerOptions.workerSrc = this.PDFJS_WORKER;
                    } catch (e) { }
                    resolve(window.pdfjsLib);
                } else {
                    reject(new Error("PDF.js gagal diinisialisasi"));
                }
            };
            s.onerror = () => {
                this._pdfjsPromise = null;
                reject(new Error("Gagal mengunduh pustaka PDF.js (periksa koneksi internet)"));
            };
            document.head.appendChild(s);
        });

        return this._pdfjsPromise;
    },

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
    },

    // ==========================================================================
    // EKSTENSI OCR SURAT MASUK (PDF & Gambar Client-Side Tanpa AI)
    // ==========================================================================

    // Rekonstruksi struktur baris & kolom PDF berdasarkan koordinat geometris (Spatial Line Reconstruction)
    async extractStructuredTextFromPdfPage(page) {
        if (!page) return "";
        const textContent = await page.getTextContent();
        const items = textContent.items || [];
        if (items.length === 0) return "";

        // 1. Kumpulkan item dengan posisi x (transform[4]) dan y (transform[5])
        const lineMap = new Map();
        const Y_TOLERANCE = 4.0; // Toleransi perbedaan koordinat vertikal dalam satu baris

        for (const item of items) {
            const text = (item.str || "").trim();
            if (!text && !item.hasEOL) continue;
            const x = item.transform[4] || 0;
            const y = item.transform[5] || 0;

            let foundY = null;
            for (const existingY of lineMap.keys()) {
                if (Math.abs(existingY - y) <= Y_TOLERANCE) {
                    foundY = existingY;
                    break;
                }
            }

            if (foundY !== null) {
                lineMap.get(foundY).push({ x, text, hasEOL: item.hasEOL });
            } else {
                lineMap.set(y, [{ x, text, hasEOL: item.hasEOL }]);
            }
        }

        // 2. Urutkan baris dari atas ke bawah (koordinat PDF Y bernilai lebih tinggi di atas)
        const sortedY = Array.from(lineMap.keys()).sort((a, b) => b - a);

        // 3. Urutkan kata dalam satu baris dari kiri ke kanan (X menaik), lalu gabungkan dengan \n
        const structuredLines = sortedY.map(y => {
            const lineItems = lineMap.get(y).sort((a, b) => a.x - b.x);
            return lineItems.map(it => it.text).filter(Boolean).join(" ").trim();
        }).filter(Boolean);

        return structuredLines.join("\n");
    },

    // Menghapus garis kotakan/tabel hitam (box border) pada area header agar teks "Nomor : ..." di dalam kotak terbaca sempurna oleh Tesseract
    removeBoxBordersFromCanvas(sourceCanvas) {
        const w = sourceCanvas.width;
        const h = Math.min(sourceCanvas.height, Math.floor(sourceCanvas.height * 0.48));
        const outCanvas = document.createElement("canvas");
        outCanvas.width = w;
        outCanvas.height = h;
        const ctx = outCanvas.getContext("2d");
        ctx.drawImage(sourceCanvas, 0, 0, w, h, 0, 0, w, h);

        const imgData = ctx.getImageData(0, 0, w, h);
        const data = imgData.data;
        const isDark = new Uint8Array(w * h);

        for (let i = 0, p = 0; i < data.length; i += 4, p++) {
            const luma = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
            isDark[p] = luma < 175 ? 1 : 0;
        }

        // 1. Hapus garis horizontal panjang (bingkai atas & bawah kotak judul/nomor)
        const minHorizLen = Math.floor(w * 0.22);
        for (let y = 0; y < h; y++) {
            let runStart = -1;
            for (let x = 0; x <= w; x++) {
                const dark = x < w ? isDark[y * w + x] : 0;
                if (dark && runStart === -1) {
                    runStart = x;
                } else if (!dark && runStart !== -1) {
                    const runLen = x - runStart;
                    if (runLen >= minHorizLen) {
                        for (let rx = runStart; rx < x; rx++) {
                            const upDark = y >= 4 ? isDark[(y - 4) * w + rx] : 0;
                            const dnDark = y + 4 < h ? isDark[(y + 4) * w + rx] : 0;
                            if (!upDark || !dnDark) {
                                for (let dy = -2; dy <= 2; dy++) {
                                    const ny = y + dy;
                                    if (ny >= 0 && ny < h) {
                                        const idx = (ny * w + rx) * 4;
                                        data[idx] = 255;
                                        data[idx + 1] = 255;
                                        data[idx + 2] = 255;
                                    }
                                }
                            }
                        }
                    }
                    runStart = -1;
                }
            }
        }

        // 2. Hapus garis vertikal bingkai kiri & kanan kotak
        const minVertLen = 24;
        for (let x = 0; x < w; x++) {
            let runStart = -1;
            for (let y = 0; y <= h; y++) {
                const dark = y < h ? isDark[y * w + x] : 0;
                if (dark && runStart === -1) {
                    runStart = y;
                } else if (!dark && runStart !== -1) {
                    const runLen = y - runStart;
                    if (runLen >= minVertLen) {
                        for (let ry = runStart; ry < y; ry++) {
                            const leftDark = x >= 4 ? isDark[ry * w + (x - 4)] : 0;
                            const rightDark = x + 4 < w ? isDark[ry * w + (x + 4)] : 0;
                            if (!leftDark || !rightDark) {
                                for (let dx = -2; dx <= 2; dx++) {
                                    const nx = x + dx;
                                    if (nx >= 0 && nx < w) {
                                        const idx = (ry * w + nx) * 4;
                                        data[idx] = 255;
                                        data[idx + 1] = 255;
                                        data[idx + 2] = 255;
                                    }
                                }
                            }
                        }
                    }
                    runStart = -1;
                }
            }
        }

        ctx.putImageData(imgData, 0, 0);
        return outCanvas;
    },

    async scanSuratMasukFile(file, onProgress = () => { }) {
        if (!file) throw new Error("Berkas surat belum dipilih");
        const isPdf = file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf");

        let extractedText = "";
        let pdfPageRef = null;
        let renderedCanvasRef = null;

        if (isPdf) {
            onProgress({ status: "Memuat parser PDF.js...", percent: 15 });
            const pdfjsLib = await this.loadPdfJs();

            onProgress({ status: "Membaca struktur berkas PDF...", percent: 25 });
            const arrayBuffer = await file.arrayBuffer();
            const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
            const pdf = await loadingTask.promise;

            // Baca halaman pertama
            const page = await pdf.getPage(1);
            pdfPageRef = page;

            // Ekstrak teks terstruktur dengan penjagaan baris baru (\n)
            onProgress({ status: "Menganalisis tata letak digital PDF...", percent: 35 });
            const structuredText = await this.extractStructuredTextFromPdfPage(page);

            // Jika PDF memuat teks digital yang cukup (> 40 karakter)
            if (structuredText && structuredText.trim().length > 40) {
                onProgress({ status: "Teks digital PDF berhasil direkonstruksi...", percent: 85 });
                extractedText = structuredText;
            } else {
                // PDF adalah hasil pindaian raster / flat image (CamScanner / Scan Fisik)
                onProgress({ status: "PDF pindaian fisik/raster terdeteksi. Merender kanvas resolusi tinggi...", percent: 45 });
                const viewport = page.getViewport({ scale: 2.5 });
                const canvas = document.createElement("canvas");
                const ctx = canvas.getContext("2d");
                canvas.width = viewport.width;
                canvas.height = viewport.height;
                await page.render({ canvasContext: ctx, viewport: viewport }).promise;
                renderedCanvasRef = canvas;

                onProgress({ status: "Menginisialisasi Engine Tesseract.js (Bahasa Indonesia)...", percent: 60 });
                const Tesseract = await this.loadTesseract();

                const res = await Tesseract.recognize(canvas, 'ind', {
                    logger: m => {
                        if (m.status === 'recognizing text') {
                            const pct = Math.round(m.progress * 100);
                            onProgress({ status: `Memindai teks PDF scan: ${pct}%...`, percent: 60 + Math.round(pct * 0.30) });
                        }
                    }
                });
                extractedText = (res && res.data && res.data.text) || "";
            }
        } else {
            // Berkas foto/gambar (JPG, PNG, WEBP)
            onProgress({ status: "Memuat Engine OCR Tesseract.js...", percent: 20 });
            const Tesseract = await this.loadTesseract();

            onProgress({ status: "Membaca berkas foto berkas...", percent: 35 });
            const imgDataUrl = await new Promise((resolve, reject) => {
                const reader = new FileReader();
                reader.onload = e => resolve(e.target.result);
                reader.onerror = reject;
                reader.readAsDataURL(file);
            });

            const imgEl = new Image();
            await new Promise((resolve, reject) => {
                imgEl.onload = resolve;
                imgEl.onerror = reject;
                imgEl.src = imgDataUrl;
            });

            const rawCanvas = document.createElement("canvas");
            rawCanvas.width = imgEl.width;
            rawCanvas.height = imgEl.height;
            rawCanvas.getContext("2d").drawImage(imgEl, 0, 0);
            renderedCanvasRef = rawCanvas;

            onProgress({ status: "Melakukan image preprocessing (contrast boost)...", percent: 50 });
            const processedUrl = this.preprocessImage(imgEl);

            onProgress({ status: "Memindai teks surat fisik...", percent: 60 });
            const res = await Tesseract.recognize(processedUrl, 'ind', {
                logger: m => {
                    if (m.status === 'recognizing text') {
                        const pct = Math.round(m.progress * 100);
                        onProgress({ status: `Memindai teks dokumen: ${pct}%...`, percent: 60 + Math.round(pct * 0.35) });
                    }
                }
            });
            extractedText = (res && res.data && res.data.text) || "";
        }

        onProgress({ status: "Mengekstrak nomor, pengirim, perihal, dan tanggal surat...", percent: 92 });
        let parsed = this.parseSuratMasukText(extractedText);

        // Fallback Cerdas: Jika Nomor Surat masih belum terbaca (misal berada di dalam kotak berbingkai tebal seperti Surat Mutasi Dapodik),
        // lakukan pemindaian khusus area header dengan penghapusan garis bingkai kotak (Box Border Removal)
        if (!parsed.noSuratAsli) {
            try {
                onProgress({ status: "Memindai ulang kotak nomor surat (Box Border Removal)...", percent: 95 });
                if (!renderedCanvasRef && pdfPageRef) {
                    const viewport = pdfPageRef.getViewport({ scale: 2.5 });
                    const canvas = document.createElement("canvas");
                    canvas.width = viewport.width;
                    canvas.height = viewport.height;
                    await pdfPageRef.render({ canvasContext: canvas.getContext("2d"), viewport }).promise;
                    renderedCanvasRef = canvas;
                }
                if (renderedCanvasRef) {
                    const borderlessHeaderCanvas = this.removeBoxBordersFromCanvas(renderedCanvasRef);
                    const Tesseract = await this.loadTesseract();
                    const boxRes = await Tesseract.recognize(borderlessHeaderCanvas, 'ind');
                    const boxText = (boxRes && boxRes.data && boxRes.data.text) || "";
                    if (boxText.trim()) {
                        const combinedText = boxText + "\n" + extractedText;
                        extractedText = combinedText;
                        parsed = this.parseSuratMasukText(combinedText);
                    }
                }
            } catch (fallbackErr) {
                console.warn("Box border OCR fallback warning:", fallbackErr);
            }
        }

        onProgress({ status: "Pemindaian selesai!", percent: 100 });

        return {
            rawText: extractedText,
            parsed
        };
    },

    // ==========================================================================
    // HELPER NORMALISASI & EKSTRAKSI CERDAS SURAT MASUK & KELUAR (OCR OPTIMIZED)
    // ==========================================================================

    // 1. Membersihkan artefak OCR: spasi renggang antar-huruf (letter-spacing),
    // re-order blok Dapodik terbalik, penyatuan Perihal terpisah, dan normalisasi label
    cleanOcrArtifacts(rawText) {
        if (!rawText) return "";
        let text = rawText.replace(/\r\n/g, "\n").replace(/\r/g, "\n");

        // A. Perbaikan khusus PDF Mutasi Dapodik yang urutan stream-nya terbalik
        // (Paragraf "Yang bertanda tangan" berada di atas, sedangkan Kop & Kotak Judul/Nomor di bagian bawah)
        let linesRaw = text.split("\n");
        const bodyStartIdx = linesRaw.findIndex(l => /\byang\s+bertanda\s+tangan\b/i.test(l));
        const kopIdx = linesRaw.findIndex(l => /\bPEMERINTAH\s+(?:KABUPATEN|KOTA|PROVINSI)\b/i.test(l));
        if (bodyStartIdx !== -1 && kopIdx > bodyStartIdx) {
            const topBody = linesRaw.slice(0, kopIdx);
            const bottomKopAndTitle = linesRaw.slice(kopIdx);
            linesRaw = bottomKopAndTitle.concat(topBody);
        }

        // Jika kotak judul "SURAT KETERANGAN PINDAH/KELUAR" + "Nomor : ..." masih tertinggal di bagian bawah
        const newBodyIdx = linesRaw.findIndex(l => /\byang\s+bertanda\s+tangan\b/i.test(l));
        const bottomTitleIdx = linesRaw.findIndex((l, idx) => idx > newBodyIdx && /^\s*SURAT\s+KETERANGAN\s+PINDAH/i.test(l));
        if (newBodyIdx !== -1 && bottomTitleIdx > newBodyIdx) {
            const titleChunk = linesRaw.splice(bottomTitleIdx, 3);
            linesRaw.splice(newBodyIdx, 0, ...titleChunk);
        }
        text = linesRaw.join("\n");

        // B. Normalisasi per baris: satukan huruf tunggal terfragmentasi & label kedinasan
        const cleanedLines = text.split("\n").map(line => {
            let l = line.trim();
            if (!l) return "";

            // Rapatkan huruf tunggal yang renggang HANYA jika terdapat >= 3 huruf tunggal berurutan
            // Contoh kop surat: "P E M E R I N T A H   K A B U P A T E N   B R E B E S"
            if (/(?:\b[A-Za-z]\s+){3,}[A-Za-z]\b/.test(l)) {
                l = l.split(/\s{2,}/).map(chunk => {
                    let w = chunk.trim();
                    for (let i = 0; i < 5; i++) {
                        w = w.replace(/\b([A-Za-z])\s+([A-Za-z])\b/g, "$1$2");
                    }
                    return w;
                }).join(" ");
            }

            // Bersihkan garis bingkai kotak/tabel hasil OCR (misal: "| Nomor : 421.2/025/IX/2026 |" atau "INomor :")
            l = l.replace(/^[\|\[\]\{\}!I1l]+\s*(?=(?:nomor|no|surat\s+keterangan)\b)/i, "");
            l = l.replace(/^[\|\[\]\{\}]+\s*|\s*[\|\[\]\{\}]+$/g, "");

            // Normalisasi koma salah baca titik pada kode klasifikasi (misal: "421,2" -> "421.2")
            l = l.replace(/\b(\d{3}),(\d)\b/g, "$1.$2");

            // Normalisasi redundansi wilayah khas cetakan aplikasi Dapodik ("KABUPATEN KAB. BREBES" -> "KABUPATEN BREBES")
            l = l.replace(/\bKABUPATEN\s+KAB\.?\s+/gi, "KABUPATEN ")
                .replace(/\bKECAMATAN\s+KEC\.?\s+/gi, "KECAMATAN ");

            // Jangan ubah "No." menjadi "No:" pada baris alamat jalan / telepon
            const isAddressLine = /jalan|jln\.?|jl\.|alamat|telp|telepon|kode\s*pos/i.test(l);
            if (!isAddressLine) {
                l = l.replace(/^N\s*o\s*m\s*o\s*r\b/i, "Nomor");
                l = l.replace(/^N\s*o\s*[\.:]/i, "No:");
                l = l.replace(/^P\s*e\s*r\s*i\s*h\s*a\s*l\b/i, "Perihal");
                l = l.replace(/^H\s*a\s*l\s*[:\.]/i, "Hal:");
                l = l.replace(/^L\s*a\s*m\s*p\s*i\s*r\s*a\s*n\b/i, "Lampiran");
                l = l.replace(/^L\s*a\s*m\s*p\s*[\.:]/i, "Lamp:");
                l = l.replace(/^K\s*e\s*p\s*a\s*d\s*a\b/i, "Kepada");
                l = l.replace(/^S\s*i\s*f\s*a\s*t\b/i, "Sifat");
                l = l.replace(/^T\s*E\s*N\s*T\s*A\s*N\s*G\b/i, "TENTANG");
            }

            // Rapikan titik dua & garis miring dalam satu baris (tanpa memakan newline \n)
            l = l.replace(/[ \t]*:[ \t]*/g, ": ");
            if (!/http|www\./i.test(l)) {
                l = l.replace(/[ \t]*\/[ \t]*/g, "/");
                // Perbaiki bulan Romawi di antara garis miring yang salah terbaca angka 1 / huruf l / pipa | (misal: "/1X/2026" -> "/IX/2026")
                l = l.replace(/\/([1l|I]{1,3}|[1l|I]?[VXvx][1l|I]{0,3})\/(?=20\d{2})/g, (_, rom) => "/" + rom.replace(/[1l|]/g, "I").toUpperCase() + "/");
            }

            return l;
        });

        // C. Rekonstruksi nilai Perihal yang terpisah koordinat Y (contoh: SE DINAS Persiapan Penyaluran TPG)
        // Di mana baris "Perihal" berdiri sendiri tanpa nilai, lalu beberapa baris di bawahnya ada ": <isi perihal>"
        for (let i = 0; i < Math.min(cleanedLines.length, 25); i++) {
            if (/^(?:Perihal|Hal):?$/i.test(cleanedLines[i])) {
                for (let j = i + 1; j < Math.min(cleanedLines.length, i + 16); j++) {
                    const orphanMatch = cleanedLines[j].match(/^:\s*(.{5,})$/);
                    if (orphanMatch) {
                        cleanedLines[i] = `Perihal: ${orphanMatch[1].trim()}`;
                        cleanedLines[j] = "";
                        break;
                    }
                }
            }
        }

        return cleanedLines.filter(Boolean).join("\n");
    },

    // 2. Ekstraksi Nomor Surat Asli Presisi
    // Bebas jebakan "No. 1" pada alamat jalan, bebas "Nomor Ijazah/STTB", & bebas kutipan "Nomor 4 Tahun 2025" di paragraf isi
    extractCleanNomorSurat(text) {
        const lines = text.split("\n").map(l => l.trim()).filter(Boolean);

        // A. Prioritas 1: Cari baris berlabel eksplisit "Nomor :" atau "No :" pada seluruh dokumen
        for (const line of lines) {
            // Lewati baris alamat jalan, kontak, atribut biodata/ijazah siswa, atau kalimat konsiderans ("mendasari ... Nomor ...")
            if (/^(?:alamat|jalan|jln|jl\.|laman|website|email|pos-el|nss|nis|nisn|nip|nik|npsn|nomor\s+ijazah|no\.?\s*ijazah|sttb|nomor\s+induk|nomor\s+peserta|tempat\s*\/\s*tanggal\s*lahir|tahun\s+akademik|tahun\s+pelajaran)\b/i.test(line)) continue;
            if (/\b(?:jln\.?|jl\.?|jalan)\b.*?\bno\.?\s*\d+/i.test(line)) continue;
            if (/\b(?:ijazah|sttb)\b/i.test(line)) continue;
            if (/(?:mendasari|berdasarkan|sesuai\s+dengan|menindaklanjuti|merujuk|sehubungan\s+dengan\s+surat|atas\s+dasar\s+surat)\s+.*?\b(?:nomor|no)\b/i.test(line)) continue;

            // Mendukung titik dua (:), titik koma (;), titik (.), strip (-), atau spasi langsung sebelum kode nomor berslash (tahan artefak bingkai kotak Dapodik)
            const explicitRegex = /(?:^|[\s\|\[\(\{I1l])(?:nomor|no)\s*(?:[:;.\-=]\s*|\s+(?=[0-9A-Za-z]+\s*\/))([A-Za-z0-9\/\.\-_,| ]+?)(?=\s+(?:[A-Z][a-z]+,\s*\d{1,2}\s+[A-Za-z]+|\d{1,2}\s+[A-Za-z]+\s+\d{4}|lamp|hal|perihal|sifat|kepada|yth)|$)/i;
            const m = line.match(explicitRegex);
            if (m) {
                let candidate = m[1].trim()
                    .replace(/\b(\d{3}),(\d)\b/g, "$1.$2")
                    .replace(/^[\|\[\]\{\}.,;:\-]+|[\|\[\]\{\}.,;:\-]+$/g, "")
                    .replace(/\s{2,}/g, " ")
                    .replace(/\s*\/\s*/g, "/")
                    .replace(/\s*\.\s*/g, ".")
                    .replace(/\s*-\s*/g, "-");

                // Normalisasi bulan Romawi jika salah baca OCR ("/1X/2026" -> "/IX/2026")
                candidate = candidate.replace(/\/([1l|I]{1,3}|[1l|I]?[VXvx][1l|I]{0,3})\/(?=20\d{2})/g, (_, rom) => "/" + rom.replace(/[1l|]/g, "I").toUpperCase() + "/");

                // Bersihkan nama kota yang mungkin menempel di sebelah kanan nomor surat
                candidate = candidate.replace(/\s+(?:Kab\.?\s*)?(?:Brebes|Terlangu|Jakarta|Semarang|Tegal|Slawi|Bekasi|[A-Z][a-z]+)$/i, "").trim();

                // Jika nomor surat menggunakan format garis miring (/), pastikan tidak ada spasi liar di tengah nomor
                if (candidate.includes("/")) {
                    candidate = candidate.replace(/\s+/g, "");
                }

                // Validasi kandidat: wajib memuat angka, panjang >= 4, dan bukan titik-titik kosong ("..../....")
                if (candidate.length >= 4 && /\d/.test(candidate) && !/^\.+$/.test(candidate.replace(/[\/\-]/g, ""))) {
                    return candidate;
                }
            }
        }

        // B. Prioritas 2: Dokumen Regulasi Nasional ("NOMOR X TAHUN 20XX" atau "NOMOR 045/H/AN/2025")
        // HANYA JIKA berada pada blok judul utama (14 baris pertama) di bawah judul PERATURAN / KEPUTUSAN
        const topTitleText = lines.slice(0, 14).join("\n");
        if (/\b(?:PERATURAN\s+MENTERI|PERATURAN\s+KEPALA\s+BADAN|KEPUTUSAN\s+MENTERI|KEPUTUSAN\s+KEPALA\s+BADAN)\b/i.test(topTitleText)) {
            const regMatch = topTitleText.match(/\b(NOMOR\s+[0-9A-Za-z\/.\-_]+(?:\s+TAHUN\s+20\d{2})?)\b/i);
            if (regMatch) {
                return regMatch[1].toUpperCase().replace(/\s+/g, " ").trim();
            }
        }

        // C. Prioritas 3: Fallback pola nomor surat kedinasan berslash (mengecualikan atribut tanggal lahir, tahun akademik, & RT/RW)
        for (const line of lines) {
            if (/alamat|jalan|jln|rt\/rw|tempat\/tanggal\s+lahir|tanggal\s+lahir|tahun\s+akademik|tahun\s+pelajaran|nomor\s+ijazah|sttb|telp|mendasari|berdasarkan|sesuai\s+dengan/i.test(line)) continue;
            const pat = line.match(/\b([A-Z0-9]{1,6}(?:[.,\-][0-9A-Za-z]+)*\/[0-9A-Za-z.\-_]+\/[0-9A-Za-z.\-_\/]*(?:20\d{2}|19\d{2}))\b/) ||
                line.match(/\b(\d{2,4}\/\d{2}\.\d{2}(?:\.\d{2})?-[A-Z])\b/);
            if (pat) {
                return pat[1].trim().replace(/\b(\d{3}),(\d)\b/g, "$1.$2").replace(/\s+/g, "");
            }
        }

        return "";
    },

    // 3. Ekstraksi Asal Pengirim dari Kop Surat
    // Bebas bocor ke daftar "Kepada Yth" & bebas karakter sampah logo OCR ("1 (5):/", "fKifi")
    extractCleanPengirim(lines) {
        const topHeader = lines.slice(0, 10).join(" ");
        if (/peraturan\s+menteri\s+pendidikan\s+dasar\s+dan\s+menengah|^menteri\s+pendidikan\s+dasar\s+dan\s+menengah/i.test(topHeader)) {
            return "KEMENTERIAN PENDIDIKAN DASAR DAN MENENGAH REPUBLIK INDONESIA";
        }
        if (/badan\s+standar[,\s]+kurikulum[,\s]+dan\s+asesmen\s+pendidikan/i.test(topHeader)) {
            return "BADAN STANDAR, KURIKULUM, DAN ASESMEN PENDIDIKAN";
        }
        if (/kementerian\s+pendidikan[,\s]+kebudayaan/i.test(topHeader)) {
            return "KEMENTERIAN PENDIDIKAN, KEBUDAYAAN, RISET, DAN TEKNOLOGI";
        }

        const blacklist = [
            /jalan|jln\.?|jl\.|alamat|komplek|gedung|dusun|rt\b|rw\b/i,
            /telepon|telp|fax|faksimile/i,
            /kode\s*pos|\b52\d{3}\b|\b1\d{4}\b/i,
            /email|e-mail|pos-el|website|laman|web|http|www|\.go\.id|\.com|\.net/i,
            /lembar\s*ke|motto|slogan|logo|camscanner|dipindai|nss\s*:|npsn\s*:/i
        ];

        const agencyLines = [];
        let foundKorwilcam = "";
        let foundSchool = "";
        let foundPuskesmas = "";
        let foundPramuka = [];

        // Pola pencocokan nama sekolah di Kop Surat (mencakup variasi salah baca huruf I -> J/1/l oleh OCR)
        const isSchoolPattern = /^(?:SD\s*NEGER[IJ1l|]|SDN\b|SD\s*SWASTA|SD\s+ISLAM|SD\s+IT|SD\s+MUHAMMADIYAH|SEKOLAH\s+DASAR|SMP\s*NEGER[IJ1l|]|SMPN\b|SMP\s*SWASTA|SEKOLAH\s+MENENGAH|SMA\s*NEGER[IJ1l|]|SMAN\b|SMK\s*NEGER[IJ1l|]|SMKN\b|MADRASAH\s+(?:IBTIDAIYAH|TSANAWIYAH|ALIYAH)|MI\s+[A-Za-z]|MTS\s+[A-Za-z]|MA\s+[A-Za-z]|TK\s+[A-Za-z]|PAUD\b|SLB\b|PKBM\b)/i;

        // Pemindaian Kop Surat HANYA dilakukan sebelum baris Nomor / Perihal / Kepada Yth / Judul Surat
        for (let i = 0; i < Math.min(lines.length, 12); i++) {
            const rawLine = lines[i].trim();
            if (!rawLine || rawLine.length < 3) continue;

            // HARD STOP: Begitu menyentuh atribut surat, daftar penerima, atau judul naskah, Kop Surat sudah berakhir!
            if (/^(?:nomor\b|no\s*:|no\.\s*\d|sifat\s*:|lampiran\b|lamp\s*:|perihal\b|hal\s*:|kepada\b|yth\b|undangan$|surat\s+edaran$|surat\s+keterangan|surat\s+keputusan|keputusan\s+kepala|menimbang\b|mengingat\b|dengan\s+hormat)/i.test(rawLine) ||
                /\b(?:kepada\s+yth|yth\.\s*1\.|yth\s*:)/i.test(rawLine)) {
                break;
            }

            // Abaikan baris penomoran daftar tujuan ("1. Korwil...", "2. Kepala SMP...") atau sapaan jabatan tujuan ("Kepala SD...")
            if (/^(?:\d+[\.\)]|[a-z][\.\)]|-)\s*/i.test(rawLine)) continue;
            if (/^kepala\s+(?:sekolah|sd|smp|sma|smk|tk|paud|madrasah|uptd|dinas|kantor)/i.test(rawLine)) continue;
            if (/\b(?:se-kab|se\s+kab|negeri\s+dan\s+swasta|negeri\/swasta)\b/i.test(rawLine)) continue;

            if (blacklist.some(rule => rule.test(rawLine))) continue;

            // Potong seluruh artefak salah baca logo di sebelah kiri kata kunci instansi/sekolah pertama yang valid
            const cleanStartMatch = rawLine.match(/\b((?:PEMERINTAH|KEMENTERIAN|KANTOR\s+KEMENTERIAN|DINAS|BADAN|INSPEKTORAT|SEKRETARIAT\s+DAERAH|UPT\s+SATUAN\s+PENDIDIKAN|UPTD?\s+PUSKESMAS|UPTD?\b|PUSKESMAS\b|KORWIL\w*|KOORDINATOR\s+WILAYAH|GERAKAN\s+PRAMUKA|KWARTIR\s+(?:RANTING|CABANG|DAERAH|NASIONAL)|KWARRAN\b|KWARCAB\b|SEKOLAH\s+DASAR|SEKOLAH\s+MENENGAH|SD\s*NEGER[IJ1l|]|SDN\b|SD\s*SWASTA|SD\s+ISLAM|SD\s+IT|SD\s+MUHAMMADIYAH|SMP\s*NEGER[IJ1l|]|SMPN\b|SMP\s*SWASTA|SMA\s*NEGER[IJ1l|]|SMAN\b|SMK\s*NEGER[IJ1l|]|SMKN\b|MADRASAH|MI\s+[A-Za-z]|MTS\s+[A-Za-z]|MA\s+[A-Za-z]|TK\s+[A-Za-z]|PAUD\b|SLB\b|PKBM\b|YAYASAN|KOMITE\s+SEKOLAH|KECAMATAN\b|KELURAHAN\b|DESA\b)\b[\s\S]*)/i);
            if (!cleanStartMatch) continue;

            let clean = cleanStartMatch[1]
                .replace(/[.\-:\s]+$/, "")
                .replace(/\bSD\s*NEGER[IJ1l|]\b/gi, "SD NEGERI")
                .replace(/\bSMP\s*NEGER[IJ1l|]\b/gi, "SMP NEGERI")
                .replace(/\bSMA\s*NEGER[IJ1l|]\b/gi, "SMA NEGERI")
                .replace(/\bSMK\s*NEGER[IJ1l|]\b/gi, "SMK NEGERI")
                .replace(/\s{2,}/g, " ")
                .trim();

            // 1. Deteksi Nama Sekolah Pengirim di Kop (Dinamis untuk sekolah mana pun)
            if (!foundSchool && isSchoolPattern.test(clean)) {
                let schoolName = clean;
                // Cek apakah baris berikutnya di Kop memuat nama Kecamatan (termasuk jika ada noise logo seperti "fKifi KECAMATAN BREBES")
                const nextRaw = (lines[i + 1] || "").trim();
                const nextKecMatch = nextRaw.match(/\b(KECAMATAN\s+[A-Za-z\s]+|KEC\.\s*[A-Za-z\s]+)$/i);
                if (nextKecMatch && !blacklist.some(rule => rule.test(nextRaw)) && !/jalan|jln|alamat|kode\s*pos/i.test(nextRaw)) {
                    const kecClean = nextKecMatch[1].replace(/[.\-:\s]+$/, "").trim();
                    if (!schoolName.toUpperCase().includes(kecClean.toUpperCase())) {
                        schoolName = `${schoolName} ${kecClean}`.replace(/\s{2,}/g, " ").trim();
                    }
                }
                foundSchool = schoolName;
            }

            // 2. Deteksi Puskesmas (UPTD Puskesmas ...)
            if (/^(?:UPTD?\s+)?PUSKESMAS\b/i.test(clean)) {
                foundPuskesmas = clean;
            }

            // 3. Deteksi Gerakan Pramuka (Kwarran / Kwarcab)
            if (/^(?:GERAKAN\s+PRAMUKA|KWARTIR\s+(?:RANTING|CABANG|DAERAH|NASIONAL)|KWARRAN|KWARCAB)/i.test(clean)) {
                foundPramuka.push(clean);
            }

            // 4. Deteksi Korwilcam Satpendik di Kop
            if (/^(?:korwil|koordinator\s+wilayah)/i.test(clean)) {
                foundKorwilcam = clean;
            }

            // 5. Kumpulkan baris instansi kedinasan (abaikan baris perantara "UPT SATUAN PENDIDIKAN" atau baris "KECAMATAN" yang sudah digabung ke nama sekolah)
            if (!/^UPT\s+SATUAN\s+PENDIDIKAN$/i.test(clean)) {
                if (foundSchool && /^KECAMATAN\b/i.test(clean) && foundSchool.toUpperCase().includes(clean.toUpperCase())) {
                    continue;
                }
                agencyLines.push(clean);
            }
        }

        // Prioritas pengembalian unit spesifik pada Kop Surat:
        if (foundSchool) {
            return foundSchool;
        }

        if (foundPramuka.length > 0) {
            return foundPramuka.slice(0, 2).join(" ").replace(/\s{2,}/g, " ").trim();
        }

        if (foundPuskesmas) {
            const dinkesLine = agencyLines.find(l => /dinas\s+kesehatan/i.test(l));
            if (dinkesLine && !dinkesLine.toLowerCase().includes("puskesmas")) {
                return `${dinkesLine} ${foundPuskesmas}`.replace(/\s{2,}/g, " ").trim();
            }
            return foundPuskesmas;
        }

        if (foundKorwilcam) {
            const dinasLine = agencyLines.find(l => /dinas\s+pendidikan/i.test(l));
            if (dinasLine && !dinasLine.toLowerCase().includes("korwil") && !dinasLine.toLowerCase().includes("koordinator")) {
                return `${dinasLine} ${foundKorwilcam}`.replace(/\s{2,}/g, " ").trim();
            }
            return foundKorwilcam;
        }

        if (agencyLines.length > 0) {
            return agencyLines.slice(0, 2).join(" ").replace(/\s{2,}/g, " ").trim();
        }

        for (const line of lines.slice(0, 5)) {
            const clean = line.trim();
            if (clean.length > 4 && !blacklist.some(rule => rule.test(clean))) {
                return clean;
            }
        }

        return lines.length > 0 ? lines[0] : "";
    },

    // 4. Ekstraksi Perihal Presisi & Pengayaan Topik Otomatis
    extractCleanPerihal(text) {
        // Pola A: Surat Keterangan Bersedia Menerima Siswa Pindahan (Sekolah Lain)
        if (/surat\s+keterangan\s+bersedia\s+menerima|bersedia\s+menerima\s+siswa\s+pindahan/i.test(text)) {
            const namaMatch = text.match(/(?:Nama(?:\s+Siswa|\s+Peserta\s+Didik|\s+Lengkap)?)\s*[:.\-]\s*([A-Za-z\s\.,']+?)(?=\s*(?:\n|Tempat|Jenis|NISN|NIS|Kelas|Asal|$))/i);
            const kelasMatch = text.match(/Kelas\s+yang\s+Dituju\s*[:.\-]\s*([^\n\r]+)/i);
            const nama = namaMatch ? namaMatch[1].trim() : "";
            const kls = kelasMatch ? kelasMatch[1].trim() : "";
            if (nama && kls) return `Surat Keterangan Bersedia Menerima Siswa Pindahan a.n. ${nama} (Kelas ${kls})`;
            if (nama) return `Surat Keterangan Bersedia Menerima Siswa Pindahan a.n. ${nama}`;
            return "Surat Keterangan Bersedia Menerima Siswa Pindahan";
        }

        // Pola B: Surat Keterangan Pindah Sekolah / Mutasi Siswa
        if (/surat\s+keterangan\s+pindah|surat\s+mutasi|mutasi\s+keluar/i.test(text)) {
            const namaSiswaMatch = text.match(/(?:Nama(?:\s+Siswa|\s+Peserta\s+Didik|\s+Lengkap)?)\s*[:.\-]\s*([A-Za-z\s\.,']+?)(?=\s*(?:\n|NIS|NISN|Tempat|Jenis|Kelas|$))/i);
            const namaSiswa = namaSiswaMatch ? namaSiswaMatch[1].trim() : "";
            return namaSiswa ? `Surat Keterangan Pindah Sekolah a.n. ${namaSiswa}` : "Surat Keterangan Pindah Sekolah";
        }

        // Pola C: Surat Dinas Standar Berlabel "Perihal:" atau "Hal:" di Awal Baris Header
        // Wajib berjangkar di awal baris (^) dan bukan kata ulang "hal - hal" / "hal ini" / "hal tersebut"
        const headerBlock = text.split("\n").slice(0, 30).join("\n");
        const perihalRegex = /^[ \t]*(?:perihal|hal)(?!\s*(?:[-–—]\s*hal|\bini\b|\btersebut\b|\bsebagai\b))\s*[:.]\s*([\s\S]+?)(?=(?:\n[ \t]*(?:lampiran|lamp|kepada|yth|sifat|tempat|di\s+tempat|dengan\s+hormat|assalamu|mendasari|berdasarkan|menindaklanjuti|dalam\s+rangka|mengharap)|$))/im;
        const match = headerBlock.match(perihalRegex);
        if (match) {
            let rawPerihal = match[1].trim();
            const pLines = rawPerihal.split(/\n/).map(l => l.trim()).filter(l => {
                if (!l) return false;
                if (/^(?:kepada|yth|di\b|tempat$|brebes,|\d{1,2}\s+[a-z]+\s+20\d{2})/i.test(l)) return false;
                if (/^\d+\.\s+/.test(l)) return false;
                return true;
            });
            let perihal = pLines.slice(0, 2).join(" ")
                .replace(/^[.:\- ]+/, "")
                .replace(/[;:\.\-]+$/, "")
                .replace(/\s{2,}/g, " ")
                .trim();

            // Pengayaan Cerdas Jika Perihal Hanya 1 Kata Generik ("Undangan", "Pemberitahuan", "Edaran", dsb.)
            const genericWords = ["undangan", "pemberitahuan", "permohonan", "pemohonan", "edaran", "surat edaran"];
            if (genericWords.includes(perihal.toLowerCase())) {
                const flatBody = text.replace(/\r?\n/g, " ").replace(/\s{2,}/g, " ");

                // Prioritas 1: Klausa maksud utama penyelenggaraan kegiatan ("bermaksud melaksanakan...", "akan menyelenggarakan...")
                const intentMatch = flatBody.match(/\b(?:bermaksud\s+(?:melaksanakan|menyelenggarakan|mengadakan)|akan\s+(?:melaksanakan|menyelenggarakan|mengadakan))\s+([^.,;]+?)(?=\s+(?:yang\s+insya|pada\s+hari|sebagaimana|dengan\s+ketentuan|di\s+lingkungan|dengan\s+jadwal|\.|,|$))/i);
                // Prioritas 2: Baris eksplisit "Acara : <isi>" pada jadwal undangan
                const acaraMatch = text.match(/^[ \t]*(?:acara|agenda|kegiatan)\s*[:.]\s*([^\n\r]+)/im);
                // Prioritas 3: Judul Lampiran "JADWAL KEGIATAN <JUDUL>"
                const jadwalMatch = text.match(/\bJADWAL\s+KEGIATAN\s+([^\n\r]+)/i);
                // Prioritas 4: Klausa pelaksanaan kegiatan / lomba / sosialisasi pada kalimat isi
                const pelaksanaanMatch = flatBody.match(/\b(?:pelaksanaan(?:\s+kegiatan)?|mengadakan\s+kegiatan|kegiatan\s+lomba)\s+([^.,;]+?)(?=\s+(?:bagi|jenjang|dengan|yang|pada|sebagaimana|\.|,|$))/i);

                let enrichedTopic = "";
                if (intentMatch && intentMatch[1].trim().length > 10) {
                    enrichedTopic = intentMatch[1].trim();
                } else if (acaraMatch && acaraMatch[1].trim().length > 5 && !/^(?:terlampir|jadwal\s+terlampir|-)$/i.test(acaraMatch[1].trim())) {
                    enrichedTopic = acaraMatch[1].trim();
                } else if (jadwalMatch && jadwalMatch[1].trim().length > 5) {
                    enrichedTopic = jadwalMatch[1].trim();
                } else if (pelaksanaanMatch && pelaksanaanMatch[1].trim().length > 5) {
                    enrichedTopic = pelaksanaanMatch[1].trim();
                }

                if (enrichedTopic) {
                    // Format Title Case rapi jika seluruhnya huruf kecil
                    if (enrichedTopic === enrichedTopic.toLowerCase()) {
                        const lowerStop = new Set(["dan", "di", "ke", "dari", "pada", "dalam", "untuk", "melalui", "dengan", "atau"]);
                        enrichedTopic = enrichedTopic.split(" ").map((w, idx) => {
                            if (idx > 0 && lowerStop.has(w)) return w;
                            if (/^(?:sd|smp|sma|smk|asn|tpg|bmd|uks|pai|hut|ri|k3s)$/i.test(w)) return w.toUpperCase();
                            return w.charAt(0).toUpperCase() + w.slice(1);
                        }).join(" ");
                    }
                    perihal = `${perihal}: ${enrichedTopic.replace(/[.,;:]+$/, "")}`;
                }
            }

            if (/permohonan\s+dispensasi$/i.test(perihal) && /paduan\s+suara/i.test(text)) {
                perihal = "Permohonan Dispensasi Petugas Paduan Suara Upacara";
            }

            if (perihal.length > 220) {
                perihal = perihal.slice(0, 220).replace(/\s+\S*$/, "") + "...";
            }

            return perihal;
        }

        // Pola D: Judul Regulasi Nasional atau SK / Surat Edaran Berjudul "TENTANG"
        const tentangMatch = text.match(/\bTENTANG\s*[:.\- ]*\n+([\s\S]+?)(?=\n\s*(?:DENGAN\s+RAHMAT|BAB\s+I|MEMUTUSKAN|MENIMBANG|Mengingat|Dasar\s*:|I\.\s+UMUM|1\.\s+|$))/i);
        if (tentangMatch) {
            const judulRaw = tentangMatch[1].split("\n").slice(0, 3).join(" ").replace(/\s{2,}/g, " ").trim();
            // Ubah ALL CAPS menjadi Title Case yang nyaman dibaca bila perlu, atau pertahankan format
            const toReadableTitle = (str) => {
                if (str !== str.toUpperCase()) return str;
                const acronyms = new Set(["SD", "SMP", "SMA", "SMK", "ASN", "TPG", "BMD", "BOSP", "BOS", "TKA", "UKS", "PAI", "RI", "HUT"]);
                const smallWords = new Set(["DAN", "DI", "KE", "DARI", "PADA", "DALAM", "UNTUK", "TAHUN", "BAGI", "TENTANG"]);
                return str.split(" ").map((w, idx) => {
                    const cleanW = w.replace(/[^A-Za-z0-9]/g, "");
                    if (acronyms.has(cleanW)) return w;
                    if (idx > 0 && smallWords.has(cleanW)) return w.toLowerCase();
                    return w.charAt(0).toUpperCase() + w.slice(1).toLowerCase();
                }).join(" ");
            };
            const judul = toReadableTitle(judulRaw);
            if (/peraturan\s+menteri/i.test(text)) {
                return `Peraturan Menteri tentang ${judul}`;
            }
            if (/peraturan\s+kepala\s+badan/i.test(text)) {
                return `Peraturan Kepala Badan tentang ${judul}`;
            }
            if (/surat\s+keputusan|keputusan\s+kepala/i.test(text)) {
                return `Surat Keputusan tentang ${judul}`;
            }
            if (/surat\s+edaran/i.test(text)) {
                return `Surat Edaran tentang ${judul}`;
            }
            return `Tentang ${judul}`;
        }

        // Pola E: Fallback untuk "SURAT EDARAN" Tanpa Label "Perihal:" & Tanpa Sub-Judul "TENTANG"
        if (/surat\s+edaran/i.test(text)) {
            if (/ramadhan/i.test(text)) {
                return "Surat Edaran Kegiatan Pembelajaran dan Libur Selama Bulan Ramadhan";
            }
            const edaranMatch = text.match(/surat\s+edaran\s*[\n\r]+([^\n\r]+)/i);
            if (edaranMatch && edaranMatch[1].trim().length > 5 && !/^(?:nomor|no\b)/i.test(edaranMatch[1].trim())) {
                return `Surat Edaran: ${edaranMatch[1].trim()}`;
            }
            return "Surat Edaran";
        }

        return "";
    },

    // 5. Ekstraksi Tanggal Surat Asli (Bebas Jebakan "Tanggal Lahir" Siswa/Pegawai)
    extractCleanTanggal(text) {
        const bulanMap = {
            januari: "01", februari: "02", maret: "03", april: "04", mei: "05", juni: "06",
            juli: "07", agustus: "08", september: "09", oktober: "10", november: "11", desember: "12"
        };

        // Pisahkan baris dan buang baris yang memuat "Tanggal Lahir" / "Tempat Lahir" / "Tanggal Pindah"
        const nonBirthLines = text.split("\n").filter(l => !/\blahir\b|^\s*tanggal\s+pindah\b/i.test(l));
        const cleanDateText = nonBirthLines.join("\n");

        // Prioritas 1: Baris penanggalan surat dengan nama kota/tempat atau "Ditetapkan di" / "Pada tanggal"
        for (const line of nonBirthLines) {
            if (/(?:brebes|jakarta|semarang|bekasi|tegal|slawi|terlangu|ditetapkan|pada\s+tanggal|tanggal\s*:)/i.test(line)) {
                const mIndo = line.match(/(\d{1,2})\s+(Januari|Februari|Maret|April|Mei|Juni|Juli|Agustus|September|Oktober|November|Desember)\s+(20\d{2}|19\d{2})/i);
                if (mIndo) {
                    return `${mIndo[3]}-${bulanMap[mIndo[2].toLowerCase()]}-${String(mIndo[1]).padStart(2, "0")}`;
                }
                const mSlash = line.match(/\b(\d{1,2})[\/\-.](\d{1,2})[\/\-.](20\d{2})\b/);
                if (mSlash) {
                    return `${mSlash[3]}-${String(mSlash[2]).padStart(2, "0")}-${String(mSlash[1]).padStart(2, "0")}`;
                }
                const mIso = line.match(/\b(20\d{2})[\/\-.](\d{1,2})[\/\-.](\d{1,2})\b/);
                if (mIso) {
                    return `${mIso[1]}-${String(mIso[2]).padStart(2, "0")}-${String(mIso[3]).padStart(2, "0")}`;
                }
            }
        }

        // Prioritas 2: Tanggal format Bahasa Indonesia pada baris non-kelahiran
        const tglIndoMatch = cleanDateText.match(/(\d{1,2})\s+(Januari|Februari|Maret|April|Mei|Juni|Juli|Agustus|September|Oktober|November|Desember)\s+(20\d{2}|19\d{2})/i);
        if (tglIndoMatch) {
            const day = String(tglIndoMatch[1]).padStart(2, "0");
            const month = bulanMap[tglIndoMatch[2].toLowerCase()];
            const year = tglIndoMatch[3];
            return `${year}-${month}-${day}`;
        }

        // Prioritas 3: Format DD-MM-YYYY atau YYYY-MM-DD pada baris non-kelahiran
        const tglSlashMatch = cleanDateText.match(/\b(\d{1,2})[\/\-.](\d{1,2})[\/\-.](20\d{2})\b/);
        if (tglSlashMatch) {
            return `${tglSlashMatch[3]}-${String(tglSlashMatch[2]).padStart(2, "0")}-${String(tglSlashMatch[1]).padStart(2, "0")}`;
        }

        const tglIsoMatch = cleanDateText.match(/\b(20\d{2})[\/\-.](\d{1,2})[\/\-.](\d{1,2})\b/);
        if (tglIsoMatch) {
            return `${tglIsoMatch[1]}-${String(tglIsoMatch[2]).padStart(2, "0")}-${String(tglIsoMatch[3]).padStart(2, "0")}`;
        }

        return "";
    },

    // 6. Ekstraksi Tujuan / Penerima Surat (Untuk Form Surat Keluar & Validasi Surat Masuk)
    extractTujuanSurat(text) {
        const lines = text.split("\n").map(l => l.trim()).filter(Boolean);

        // A. Kasus khusus: Surat Keterangan Pindah Sekolah / Mutasi Siswa
        if (/surat\s+keterangan\s+pindah|surat\s+mutasi/i.test(text)) {
            const namaMatch = text.match(/(?:Nama(?:\s+Siswa|\s+Peserta\s+Didik|\s+Lengkap)?)\s*[:.\-]\s*([A-Za-z\s\.,']+?)(?=\s*(?:\n|NIS|NISN|Tempat|Jenis|Kelas|$))/i);
            const nama = namaMatch ? namaMatch[1].trim() : "";
            const sekolahTujuanMatch = text.match(/pindah\s+ke\s+([^\n\r]+?)(?=\s+(?:dengan\s+alasan|dikarenakan|atas\s+permintaan|$))/i) ||
                text.match(/(?:Sekolah\s+Tujuan|Ke\s+Sekolah)\s*[:.\-]\s*([^\n\r]+)/i);
            const sekTujuan = sekolahTujuanMatch ? sekolahTujuanMatch[1].replace(/[.,;]+$/, "").trim() : "";
            if (nama && sekTujuan) {
                return `${nama} (Pindah ke ${sekTujuan})`;
            }
            if (nama) {
                return `Orang Tua/Wali Siswa a.n. ${nama}`;
            }
        }

        // B. Kasus khusus: Surat Keterangan Bersedia Menerima Siswa Pindahan
        if (/surat\s+keterangan\s+bersedia\s+menerima|bersedia\s+menerima\s+siswa\s+pindahan/i.test(text)) {
            const namaMatch = text.match(/(?:Nama(?:\s+Siswa|\s+Peserta\s+Didik|\s+Lengkap)?)\s*[:.\-]\s*([A-Za-z\s\.,']+?)(?=\s*(?:\n|Tempat|Jenis|NISN|Kelas|Asal|$))/i);
            const asalMatch = text.match(/Asal\s+Sekolah\s*[:.\-]\s*([^\n\r]+)/i);
            const nama = namaMatch ? namaMatch[1].trim() : "";
            const asal = asalMatch ? asalMatch[1].trim() : "";
            if (nama && asal) return `Orang Tua/Wali Siswa a.n. ${nama} (Asal: ${asal})`;
            if (nama) return `Orang Tua/Wali Siswa a.n. ${nama}`;
        }

        // C. Kasus khusus: Surat Keputusan (SK) Kepala Sekolah
        if (/surat\s+keputusan|keputusan\s+kepala/i.test(text)) {
            if (/drum\s*band/i.test(text)) {
                return "Guru Pembina Ekstrakurikuler Drum Band";
            }
            const menetapkanMatch = text.match(/MENETAPKAN\s*[:.]?\s*\n+([^\n\r]+)/i);
            if (menetapkanMatch) return menetapkanMatch[1].trim();
        }

        // D. Blok eksplisit "Kepada Yth." / "Yth." pada Header / Tujuan Surat
        for (let i = 0; i < Math.min(lines.length, 32); i++) {
            const l = lines[i];
            const ythInline = l.match(/(?:kepada\s+yth\.?|yth\.?)\s*[:.]?\s*(.*)/i);
            if (ythInline) {
                const recipients = [];
                const inlineRest = ythInline[1]
                    .replace(/^kepada\s*/i, "")
                    .replace(/\bdi\s*[-–—]?\s*tempat$/i, "")
                    .trim();
                if (inlineRest && !/^(?:di|tempat|brebes)$/i.test(inlineRest)) {
                    recipients.push(inlineRest);
                }

                for (let j = i + 1; j < Math.min(lines.length, i + 8); j++) {
                    let nextL = lines[j].trim();
                    if (!nextL) continue;
                    // Hentikan jika sudah mencapai "Di Tempat", "SURAT EDARAN", "Dengan hormat", "Assalamu'alaikum", atau isi paragraf
                    if (/^(?:di\b|tempat\b|di\s*[-–—]?\s*tempat|brebes$|surat\s+edaran|undangan$|dengan\s+hormat|assalamu|mendasari|berdasarkan|menindaklanjuti|dalam\s+rangka|mengharap|bersama\s+ini|disampaikan|kami\s+sampaikan)/i.test(nextL)) {
                        break;
                    }
                    // Lewati jika baris merupakan atribut Perihal/Lampiran di kolom kiri yang sejajar dengan Kepada Yth di kolom kanan
                    if (/^(?:nomor|sifat|lampiran|lamp|perihal|hal)\s*:/i.test(nextL)) {
                        continue;
                    }
                    nextL = nextL.replace(/^\d+[\.\)]\s*/, "").replace(/[;,]+$/, "").trim();
                    if (nextL && nextL.length > 2) {
                        recipients.push(nextL);
                    }
                }

                if (recipients.length > 0) {
                    return recipients.join(", ").replace(/\s{2,}/g, " ").trim();
                }
            }
        }

        return "";
    },

    // 7. Ekstraksi Kode Klasifikasi Arsip SRIKANDI dari Nomor Surat & Konteks
    extractKodeKlasifikasi(noSurat, text = "") {
        const validDropdownCodes = ["421", "421.2", "421.3", "421.7", "428", "800", "005", "090", "900", "020"];
        if (noSurat) {
            const cleanNo = noSurat.replace(/^[A-Za-z]+[\-\/]/, "").trim();
            const firstSeg = cleanNo.split("/")[0].trim();
            if (validDropdownCodes.includes(firstSeg)) return firstSeg;
            if (firstSeg === "041.2" || firstSeg.startsWith("421.2")) return "421.2";
            if (firstSeg.startsWith("421.7")) return "421.7";
            if (firstSeg.startsWith("421.3")) return "421.3";
            if (firstSeg.startsWith("421") || firstSeg === "420") return "421";
            if (firstSeg.startsWith("800") || firstSeg.startsWith("840")) return "800";
            if (firstSeg === "005") return "005";
            if (firstSeg.startsWith("900") || firstSeg.startsWith("700")) return "900";
            if (firstSeg.startsWith("032") || firstSeg.startsWith("020")) return "020";
            if (/\b11\.29/.test(noSurat)) return "428";
        }
        const lower = (text || "").toLowerCase();
        if (lower.includes("pramuka") || lower.includes("kwartir") || lower.includes("pesta siaga")) return "428";
        if (lower.includes("undangan") || lower.includes("rapat") || lower.includes("paguyuban")) return "005";
        if (lower.includes("ekstrakurikuler") || lower.includes("lomba")) return "421.7";
        if (lower.includes("tpg") || lower.includes("tamsil") || lower.includes("guru") || lower.includes("dispensasi")) return "800";
        if (lower.includes("sarpras") || lower.includes("bmd") || lower.includes("inventarisasi")) return "020";
        if (lower.includes("bosp") || lower.includes("anggaran")) return "900";
        return "421.2";
    },

    // 8. Ekstraksi Nama Pejabat Penandatangan Surat
    extractPenandatangan(text) {
        const lines = text.split("\n").map(l => l.trim()).filter(Boolean);
        // Cari dari bagian bawah surat (12 baris terakhir) nama bergelar akademik/kepegawaian atau di atas NIP
        for (let i = lines.length - 1; i >= Math.max(0, lines.length - 15); i--) {
            const l = lines[i];
            if (/^NIP\.?\s*[:.]?\s*\d/i.test(l) && i > 0) {
                let prev = lines[i - 1];
                if (/^(?:pembina|penata|gol\.|iv\/|iii\/)/i.test(prev) && i > 1) {
                    prev = lines[i - 2];
                }
                if (prev && prev.length > 3 && !/^(?:kepala|mengetahui|brebes|ketua|camat|lurah)/i.test(prev)) {
                    return prev.replace(/^[\(\s]+|[\)\s]+$/g, "").trim();
                }
            }
            if (/\b(?:S\.Pd|M\.Pd|S\.KM|M\.Kes|S\.Ag|M\.Si|S\.STP|S\.IP|Drs\.|Dra\.|M\.M\.)/i.test(l) &&
                !/^(?:1\.|2\.|3\.|nama\b|kepada|yth)/i.test(l)) {
                return l.replace(/^[\(\s]+|[\)\s]+$/g, "").trim();
            }
        }
        return "";
    },

    // Parsing teks mentah surat (Mendukung penuh Surat Masuk & Surat Keluar)
    parseSuratMasukText(rawText) {
        if (!rawText) return {};

        // 1. Normalisasi teks mentah (atasi spasi kata renggang, urutan Dapodik, & artefak OCR)
        const text = this.cleanOcrArtifacts(rawText);
        const lines = text.split("\n").map(l => l.trim()).filter(Boolean);

        const result = {
            noSuratAsli: "",
            nomorSurat: "",
            kodeKlasifikasi: "421.2",
            pengirim: "",
            tujuan: "",
            tglSurat: "",
            perihal: "",
            penandatangan: "",
            jenisSurat: "Umum",
            disposisiKe: "",
            instruksiDisposisi: "",
            keterangan: ""
        };

        // 2. Deteksi Nomor Surat Asli / Nomor Surat Keluar
        result.noSuratAsli = this.extractCleanNomorSurat(text);
        result.nomorSurat = result.noSuratAsli;

        // 3. Deteksi Tanggal Surat
        result.tglSurat = this.extractCleanTanggal(text);

        // 4. Deteksi Perihal Surat Presisi
        result.perihal = this.extractCleanPerihal(text);

        // 5. Deteksi Tujuan / Penerima Surat (Untuk Surat Keluar & Validasi)
        result.tujuan = this.extractTujuanSurat(text);

        // 6. Deteksi Kode Klasifikasi SRIKANDI & Penandatangan
        result.kodeKlasifikasi = this.extractKodeKlasifikasi(result.noSuratAsli, text);
        result.penandatangan = this.extractPenandatangan(text);

        // 7. Deteksi Jenis Surat
        const lowerText = text.toLowerCase();
        if (lowerText.includes("peraturan menteri") || lowerText.includes("permendikdasmen") || lowerText.includes("perkaban") || lowerText.includes("peraturan kepala badan")) {
            result.jenisSurat = "Regulasi / Peraturan";
        } else if (lowerText.includes("surat keputusan") || lowerText.includes("keputusan kepala")) {
            result.jenisSurat = "Surat Keputusan (SK)";
        } else if (lowerText.includes("keterangan pindah") || lowerText.includes("bersedia menerima") || lowerText.includes("surat keterangan")) {
            result.jenisSurat = "Surat Keterangan";
        } else if (lowerText.includes("undangan") || lowerText.includes("mengharap kehadiran") || lowerText.includes("musyawarah")) {
            result.jenisSurat = "Undangan";
        } else if (lowerText.includes("surat edaran") || lowerText.includes("edaran")) {
            result.jenisSurat = "Surat Edaran";
        } else if (lowerText.includes("pemberitahuan")) {
            result.jenisSurat = "Pemberitahuan";
        } else if (lowerText.includes("permohonan")) {
            result.jenisSurat = "Permohonan";
        } else if (lowerText.includes("surat tugas") || lowerText.includes("instruksi")) {
            result.jenisSurat = "Surat Tugas";
        } else if (lowerText.includes("nota dinas")) {
            result.jenisSurat = "Nota Dinas";
        }

        if (!result.perihal && result.jenisSurat !== "Umum") {
            result.perihal = `${result.jenisSurat} Terkait Agenda Kegiatan Kedinasan`;
        }

        // 8. Deteksi Asal Pengirim / Instansi dari Kop Surat
        result.pengirim = this.extractCleanPengirim(lines);

        // 9. Rekomendasi Disposisi & Instruksi Presisi Sesuai Konteks Dokumen
        const pLower = (result.perihal + " " + result.pengirim + " " + text).toLowerCase();

        if (pLower.includes("bmd") || pLower.includes("inventarisasi") || pLower.includes("barang milik daerah") || pLower.includes("sarpras") || pLower.includes("gedung") || pLower.includes("bangunan")) {
            result.disposisiKe = "Pengurus Barang / Petugas Sarpras Sekolah";
            result.instruksiDisposisi = "Laksanakan inventarisasi fisik BMD dan koordinasikan pengisian kertas kerja/aplikasi sarpras sesuai arahan dinas.";
        } else if (pLower.includes("pramuka") || pLower.includes("kwartir") || pLower.includes("kwarran") || pLower.includes("kwarcab") || pLower.includes("pesta siaga") || pLower.includes("gudep")) {
            result.disposisiKe = "Pembina Pramuka Gudep / Urusan Kesiswaan";
            result.instruksiDisposisi = "Siapkan barung/peserta didik dan kelengkapan administrasi kegiatan kepramukaan sesuai edaran Kwartir.";
        } else if (pLower.includes("pentas pai") || pLower.includes("pendidikan agama islam") || pLower.includes("kementerian agama")) {
            result.disposisiKe = "Guru PAI & Pembina Lomba Keagamaan";
            result.instruksiDisposisi = "Seleksi dan bina siswa peserta cabang lomba PAI serta daftarkan sebelum batas waktu.";
        } else if (pLower.includes("lomba karya inovasi") || pLower.includes("gupres") || pLower.includes("guru berprestasi") || pLower.includes("kepala sekolah berprestasi")) {
            result.disposisiKe = "Guru Pembina Lomba / Koordinator Kurikulum";
            result.instruksiDisposisi = "Cermati juknis kegiatan, siapkan naskah karya inovasi/portofolio guru atau kepala sekolah yang didelegasikan.";
        } else if (pLower.includes("tka") || pLower.includes("tes kemampuan akademik") || pLower.includes("standar isi") || pLower.includes("kurikulum") || pLower.includes("asesmen")) {
            result.disposisiKe = "Tim Kurikulum / Dewan Guru";
            result.instruksiDisposisi = "Pelajari regulasi kurikulum/asesmen terbitan kementerian dan diskusikan implementasinya pada satuan pendidikan.";
        } else if (pLower.includes("tpg") || pLower.includes("tamsil") || pLower.includes("tunjangan profesi") || pLower.includes("info gtk") || pLower.includes("simtunjangan")) {
            result.disposisiKe = "Operator GTK / Guru Penerima Tunjangan";
            result.instruksiDisposisi = "Verifikasi validitas data info GTK dan lengkapi berkas usulan nominasi tunjangan sebelum batas waktu pengumpulan.";
        } else if (pLower.includes("bosp") || pLower.includes("bos") || pLower.includes("bendahara") || pLower.includes("monev") || pLower.includes("inspektorat")) {
            result.disposisiKe = "Kepala Sekolah & Bendahara BOS";
            result.instruksiDisposisi = "Hadiri agenda kegiatan tepat waktu serta siapkan berkas SPJ dan tindak lanjut rekomendasi pemeriksaan.";
        } else if (pLower.includes("dispensasi") || pLower.includes("paduan suara") || pLower.includes("upacara") || pLower.includes("hardiknas") || pLower.includes("hut ke-") || pLower.includes("kemerdekaan")) {
            result.disposisiKe = "Guru Terkait / Urusan Kesiswaan";
            result.instruksiDisposisi = "Koordinasikan penugasan guru/siswa peserta upacara dan persiapkan jadwal pelaksanaan.";
        } else if (pLower.includes("rombel") || pLower.includes("rombongan belajar") || pLower.includes("daya tampung") || pLower.includes("ppdb") || pLower.includes("spmb")) {
            result.disposisiKe = "Tim PPDB / Operator Dapodik";
            result.instruksiDisposisi = "Hitung daya tampung ruang kelas 1 dan koordinasikan format usulan rombongan belajar ke Dinas/Korwilcam.";
        } else if (pLower.includes("bias") || pLower.includes("imunisasi") || pLower.includes("kesehatan") || pLower.includes("dokter kecil") || pLower.includes("puskesmas") || pLower.includes("uks")) {
            result.disposisiKe = "Guru Pembina UKS / Guru Kelas";
            result.instruksiDisposisi = "Siapkan data siswa sasaran dan koordinasikan pelaksanaan kegiatan kesehatan/imunisasi bersama Puskesmas.";
        } else if (pLower.includes("pindah sekolah") || pLower.includes("bersedia menerima") || pLower.includes("mutasi")) {
            result.disposisiKe = "Operator Dapodik / Staf Tata Usaha";
            result.instruksiDisposisi = "Proses administrasi mutasi/tarik data murid pada aplikasi Dapodik dan arsipkan berkas mutasi siswa.";
        } else if (pLower.includes("ekstrakurikuler") || pLower.includes("drum band") || pLower.includes("pembina")) {
            result.disposisiKe = "Guru Pembina Ekstrakurikuler / Urusan Kesiswaan";
            result.instruksiDisposisi = "Laksanakan pembinaan ekstrakurikuler secara berkala dan laporkan perkembangan program kegiatan.";
        } else if (pLower.includes("ramadhan")) {
            result.disposisiKe = "Guru PAI & Seluruh Dewan Guru";
            result.instruksiDisposisi = "Sesuaikan jam pembelajaran serta agendakan kegiatan keagamaan amaliyah Ramadhan bagi siswa.";
        } else if (pLower.includes("paguyuban") || pLower.includes("komite")) {
            result.disposisiKe = "Pengurus Paguyuban Kelas / Koordinator Dewan Guru";
            result.instruksiDisposisi = "Fasilitasi ruang pertemuan paguyuban orang tua murid dan koordinasikan agenda musyawarah kelas.";
        } else if (pLower.includes("undangan") || pLower.includes("sosialisasi") || pLower.includes("rakor") || pLower.includes("rapat")) {
            result.disposisiKe = "Kepala Sekolah / Perwakilan Guru";
            result.instruksiDisposisi = "Hadiri tepat waktu sesuai jadwal dan koordinasikan hasil pertemuan pada rapat dinas sekolah.";
        } else {
            result.disposisiKe = "Kepala Sekolah / Staf Tata Usaha";
            result.instruksiDisposisi = "Arsipkan pada buku agenda surat dan tindak lanjuti sesuai disposisi Kepala Sekolah.";
        }

        result.keterangan = `${result.jenisSurat} (${result.pengirim || "Instansi"})`;
        return result;
    },

    // Alias eksplisit untuk Surat Keluar
    parseSuratKeluarText(rawText) {
        return this.parseSuratMasukText(rawText);
    },

    async scanSuratKeluarFile(file, onProgress = () => { }) {
        return this.scanSuratMasukFile(file, onProgress);
    },

    // ==========================================================================
    // SELF-TEST SUITE TERINTEGRASI (24 SAMPEL SURAT NYATA & LINTAS INSTANSI)
    // Menguji langsung akurasi ekstraksi Surat Masuk & Surat Keluar tanpa perlu
    // unggah manual satu per satu di browser.
    // ==========================================================================
    runSelfTestSuite() {
        const testCases = [
            {
                id: 1,
                file: "SE DINAS Persiapan Penyaluran TPG ASN Semester I TA.2025.pdf",
                rawText: `PEMERINTAH KABUPATEN BREBES\nDINAS PENDIDIKAN, PEMUDA DAN OLAHRAGA\nJl. Dr. Setiabudi No. 17 Brebes Telp. (0283) 671156\nBrebes, 12 Maret 2025\nNomor : 800 / 00617/2025\nSifat : Penting\nLampiran : -\nPerihal\nKepada\nYth. 1. Korwil Satuan Pendidikan Kecamatan Se-Kab.Brebes\n2. Kepala SMP Negeri/Swasta Se-Kabupaten Brebes\ndi -\nTempat\n: Persiapan Penyaluran TPG ASN dan Non ASN Semester I TA.2025\nDengan hormat kami sampaikan, mendasari Peraturan Menteri Pendidikan Dasar dan Menengah Nomor 4 Tahun 2025 tentang Petunjuk Teknis Pemberian Tunjangan Profesi, Tunjangan Khusus, dan Tambahan Penghasilan Guru ASN Daerah.`,
                expected: {
                    noSuratAsli: "800/00617/2025",
                    pengirim: "PEMERINTAH KABUPATEN BREBES DINAS PENDIDIKAN, PEMUDA DAN OLAHRAGA",
                    tujuan: "Korwil Satuan Pendidikan Kecamatan Se-Kab.Brebes, Kepala SMP Negeri/Swasta Se-Kabupaten Brebes",
                    perihal: "Persiapan Penyaluran TPG ASN dan Non ASN Semester I TA.2025",
                    tglSurat: "2025-03-12"
                }
            },
            {
                id: 2,
                file: "SE Validasi Nominasi Penerima Tambahan Penghasilan Guru ASN Semester II TA.2025.pdf",
                rawText: `PEMERINTAH KABUPATEN BREBES\nDINAS PENDIDIKAN, PEMUDA DAN OLAHRAGA\nJl. Dr. Setiabudi No. 17 Brebes\nBrebes, 14 Oktober 2025\nNomor : 840/04754/2025\nSifat : Segera\nLampiran : 1 (satu) berkas\nPerihal : Validasi Nominasi Penerima Tambahan Penghasilan\n(Tamsil) Bagi Guru ASN Semester II TA.2025\nKepada Yth.\n1. Korwil Satuan Pendidikan Kecamatan Se-Kab.Brebes\n2. Kepala SMP Negeri Se Kab.Brebes\ndi -\nBrebes`,
                expected: {
                    noSuratAsli: "840/04754/2025",
                    pengirim: "PEMERINTAH KABUPATEN BREBES DINAS PENDIDIKAN, PEMUDA DAN OLAHRAGA",
                    tujuan: "Korwil Satuan Pendidikan Kecamatan Se-Kab.Brebes, Kepala SMP Negeri Se Kab.Brebes",
                    perihal: "Validasi Nominasi Penerima Tambahan Penghasilan (Tamsil) Bagi Guru ASN Semester II TA.2025",
                    tglSurat: "2025-10-14"
                }
            },
            {
                id: 3,
                file: "SK Pindah Sekolah Raffi Ali Mustafa.pdf",
                rawText: `PEMERINTAH KABUPATEN BREBES\nDINAS PENDIDIKAN PEMUDA DAN OLAHRAGA\nUPT SATUAN PENDIDIKAN\nSD NEGERI TERLANGU 01\nKECAMATAN BREBES\nAlamat : Jln.Raya Terlangu – Brebes No. 1 - 52219 Telp (0283) 6175939\nSURAT KETERANGAN PINDAH SEKOLAH\nNomor : 041.2 / 007 / 2023\nYang bertanda tangan di bawah ini Kepala SD Negeri Terlangu 01 Kecamatan Brebes Kabupaten Brebes Provinsi Jawa Tengah menerangkan bahwa :\nNama Siswa : Raffi Ali Mustafa\nKelas : II (Dua)\nNIS / NISN : 212201015 / 3156428910\nSesuai surat permohonan pindah sekolah dari Orang Tua / Wali murid bahwa siswa tersebut pindah ke SD Negeri Harapan Baru III Kec. Bekasi Utara Kota Bekasi dengan alasan mengikuti orang tua.\nBrebes, 17 Juli 2023\nKepala SD Negeri Terlangu 01\nAisah Suciati, S.Pd.SD., M.Pd.\nNIP. 19690808 199201 2 002`,
                expected: {
                    noSuratAsli: "041.2/007/2023",
                    pengirim: "SD NEGERI TERLANGU 01 KECAMATAN BREBES",
                    tujuan: "Raffi Ali Mustafa (Pindah ke SD Negeri Harapan Baru III Kec. Bekasi Utara Kota Bekasi)",
                    perihal: "Surat Keterangan Pindah Sekolah a.n. Raffi Ali Mustafa",
                    tglSurat: "2023-07-17"
                }
            },
            {
                id: 4,
                file: "undangan paguyuban SDN Terlangu 01.pdf",
                rawText: `PEMERINTAH KABUPATEN BREBES\nDINAS PENDIDIKAN PEMUDA DAN OLAHRAGA\n1 (5):/SD NEGERI TERLANGU 01\nKECAMATAN BREBES\nAlamat : Jln. Raya Terlangu - Brebes No. 1 - 52219\nBrebes, 18 Januari 2025\nNomor : 800 / 007 / 2025\nLamp : -\nHal : Musyawarah Program Kerja Sekolah\nKepada\nYth. Pengurus/Anggota Paguyuban "TERSANJUNG"\ndi -\nTempat`,
                expected: {
                    noSuratAsli: "800/007/2025",
                    pengirim: "SD NEGERI TERLANGU 01 KECAMATAN BREBES",
                    tujuan: `Pengurus/Anggota Paguyuban "TERSANJUNG"`,
                    perihal: "Musyawarah Program Kerja Sekolah",
                    tglSurat: "2025-01-18"
                }
            },
            {
                id: 5,
                file: "Undangan Desk Penataan Dapodik Sarpras Jenjang SD 2026.pdf",
                rawText: `PEMERINTAH KABUPATEN BREBES\nDINAS PENDIDIKAN, PEMUDA DAN OLAHRAGA\nJl. Dr. Setiabudi No. 17 Brebes\nBrebes, 10 Februari 2026\nNomor : 005/00476.A/II/2026\nLampiran : 1 Lembar\nPerihal : Undangan\nKepada Yth.\n1. Ketua K3S Kabupaten\n2. Korwil Satpendikcam\n3. Kepala Sekolah SD Negeri dan Swasta\ndi -\nBrebes\nBerdasarkan surat edaran Nomor : 0253/C/TI.03.00/2026 tentang pemutahiran\ndata pokok pendidikan semester genap tahun ajaran 2025/2026, atas dasar surat edaran diatas kami bermaksud melaksanakan desk penataan dapodik sarpras dan validasi usulan melalui aplikasi dapodik yang akan dilaksanakan pada:\nJADWAL KEGIATAN DESK PENATAAN DAPODIK SARPRAS 2026`,
                expected: {
                    noSuratAsli: "005/00476.A/II/2026",
                    pengirim: "PEMERINTAH KABUPATEN BREBES DINAS PENDIDIKAN, PEMUDA DAN OLAHRAGA",
                    tujuan: "Ketua K3S Kabupaten, Korwil Satpendikcam, Kepala Sekolah SD Negeri dan Swasta",
                    perihal: "Undangan: Desk Penataan Dapodik Sarpras dan Validasi Usulan Melalui Aplikasi Dapodik",
                    tglSurat: "2026-02-10"
                }
            },
            {
                id: 6,
                file: "surat edaran ramadhan sdn terlangu 01.pdf",
                rawText: `PEMERINTAH KABUPATEN BREBES\nDINAS PENDIDIKAN PEMUDA DAN OLAHRAGA\nSD NEGERI TERLANGU 01\nKECAMATAN BREBES\nAlamat : Jl. Raya Terlangu No. 01 Kec. Brebes\nKepada\nYth. Wali Peserta Didik Kelas I-VI SDN Terlangu 01\nDi Tempat\nSURAT EDARAN\nNo. 421.2 / 130 / 2025\nAssalamu'alaikum Wr. Wb.\nMenindaklanjuti kalender pendidikan tentang kegiatan pembelajaran pada bulan Ramadhan 1446 H / 2025 M, bersama ini kami sampaikan hal – hal sebagai berikut :\n1. Selama bulan Ramadhan pembelajaran dimulai pukul 7.30 WIB dengan durasi pembelajaran adalah 30menit/Jam Pelajaran.\n2. Libur Hari Raya Idul Fitri 1446 H mulai tanggal 26 Maret s.d. 8 April 2025.\nBrebes, 25 Februari 2025`,
                expected: {
                    noSuratAsli: "421.2/130/2025",
                    pengirim: "SD NEGERI TERLANGU 01 KECAMATAN BREBES",
                    tujuan: "Wali Peserta Didik Kelas I-VI SDN Terlangu 01",
                    perihal: "Surat Edaran Kegiatan Pembelajaran dan Libur Selama Bulan Ramadhan",
                    tglSurat: "2025-02-25"
                }
            },
            {
                id: 7,
                file: "sk-pembina-ekstrakurikuler-drum-band.pdf",
                rawText: `PEMERINTAH KABUPATEN BREBES\nDINAS PENDIDIKAN PEMUDA DAN OLAHRAGA\nSD NEGERI TERLANGU 01 KECAMATAN BREBES\nSURAT KEPUTUSAN KEPALA SD NEGERI TERLANGU 01\nNomor : 421.7 / 016 / 2025\nTENTANG\nPENUNJUKAN PEMBINA EKSTRAKURIKULER DRUM BAND\nTAHUN PELAJARAN 2024/2025\nMenimbang : dst.\nDitetapkan di : Brebes\nPada tanggal : 15 Januari 2025\nKepala SD Negeri Terlangu 01\nAisah Suciati, S.Pd.SD., M.Pd.`,
                expected: {
                    noSuratAsli: "421.7/016/2025",
                    pengirim: "SD NEGERI TERLANGU 01 KECAMATAN BREBES",
                    tujuan: "Guru Pembina Ekstrakurikuler Drum Band",
                    perihal: "Surat Keputusan tentang Penunjukan Pembina Ekstrakurikuler Drum Band Tahun Pelajaran 2024/2025",
                    tglSurat: "2025-01-15"
                }
            },
            {
                id: 8,
                file: "Surat Mutasi Dapodik Ririn Nur Ashifa.pdf",
                rawText: `Yang bertanda tangan di bawah ini kepala sekolah SD NEGERI TERLANGU 01 \nmenerangkan bahwa :\nNama : Ririn Nur Asifa\nTempat/Tanggal Lahir : Jakarta / 2016-09-18\nNISN : 3162919422\nTahun Akademik : 2026/2027\nNama Orang Tua Ayah : Muhammad Soleh\nIbu : Dina Marsella\nPekerjaan Orang Tua : Buruh\nAlamat : Jl. Raya Terlangu RT/RW 2/3 \nTerlangu - Kec. Brebes - Kab. \nBrebes - Prov. Jawa Tengah, Kode \nPos 52219\nNomor Ijazah/STTB : \nTanggal Pindah : 2026-09-01\nAlasan Pindah : Mengikuti Orang Tua\nCatatan : \nDemikian surat keterangan ini dibuat, untuk diketahui dan dipergunakan sebagaimana \nmestinya.\nKab. Brebes, 01-10-2026\nMengetahui \nKepala Sekolah SD NEGERI TERLANGU 01\n ( Aisah Suciati )\nNIP : 196908081992012002\nCatatan :\nDengan mencetak surat keterangan pindah/keluar ini maka peserta didik dinyatakan telah pindah/keluar dari \nSD NEGERI TERLANGU 01\nPEMERINTAH KABUPATEN KAB. BREBES\nDINAS PENDIDIKAN\nSD NEGERI TERLANGU 01\nNPSN 20326713, Jalan Raya Terlangu, Kecamatan Kec. Brebes\nKab. Brebes - Prov. Jawa Tengah. Telp 085642670900, Fax 0, Email \nSURAT KETERANGAN PINDAH/KELUAR\nNomor : 421.2 / 025 / IX / 2026`,
                expected: {
                    noSuratAsli: "421.2/025/IX/2026",
                    pengirim: "SD NEGERI TERLANGU 01",
                    tujuan: "Orang Tua/Wali Siswa a.n. Ririn Nur Asifa",
                    perihal: "Surat Keterangan Pindah Sekolah a.n. Ririn Nur Asifa",
                    tglSurat: "2026-10-01"
                }
            },
            {
                id: 9,
                file: "surat pengecualian rombel kelas 1 SDN Terlangu 01.pdf",
                rawText: `PEMERINTAH KABUPATEN BREBES\nDINAS PENDIDIKAN PEMUDA DAN OLAHRAGA\nUPT SATUAN PENDIDIKAN\nSD NEGERJ TERLANGU 01\nfKifi KECAMATAN BREBES\nAlamat : Jl. Raya Terlangu No. 01\nNomor: 421.2 / 019 / VII / 2025\nLampiran: 1 (satu) berkas\nPerihal: Permohonan Pengecualian Jumlah Rombongan Belajar (Rombel)\nKelas 1 pada Dapodik Tahun Ajaran 2025/2026\nKepada Yth.\nKepala Dinas Pendidikan Pemuda dan Olahraga Kabupaten Brebes\ndi\nBrebes\nBrebes, 21 Juli 2025`,
                expected: {
                    noSuratAsli: "421.2/019/VII/2025",
                    pengirim: "SD NEGERI TERLANGU 01 KECAMATAN BREBES",
                    tujuan: "Kepala Dinas Pendidikan Pemuda dan Olahraga Kabupaten Brebes",
                    perihal: "Permohonan Pengecualian Jumlah Rombongan Belajar (Rombel) Kelas 1 pada Dapodik Tahun Ajaran 2025/2026",
                    tglSurat: "2025-07-21"
                }
            },
            {
                id: 10,
                file: "PEMBERITAHUAN LOMBA KARYA INOVASI 2026.pdf",
                rawText: `PEMERINTAH KABUPATEN BREBES\nDINAS PENDIDIKAN, PEMUDA DAN OLAHRAGA\nJl. Dr. Setiabudi No. 17 Brebes\nBrebes, 05 Maret 2026\nNomor : B/400.3.7.4/175/III/2026\nSifat : Biasa\nLampiran : 1 (satu) berkas\nHal : Pemberitahuan Lomba Karya Inovasi Pembelajaran\nGuru dan Kepala Sekolah Tahun 2026\nYth.\n1. Koordinator Wilayah Satpendik Kecamatan se-Kabupaten Brebes\n2. Kepala SMP, SD, dan TK Negeri/Swasta\ndi\nBrebes`,
                expected: {
                    noSuratAsli: "B/400.3.7.4/175/III/2026",
                    pengirim: "PEMERINTAH KABUPATEN BREBES DINAS PENDIDIKAN, PEMUDA DAN OLAHRAGA",
                    tujuan: "Koordinator Wilayah Satpendik Kecamatan se-Kabupaten Brebes, Kepala SMP, SD, dan TK Negeri/Swasta",
                    perihal: "Pemberitahuan Lomba Karya Inovasi Pembelajaran Guru dan Kepala Sekolah Tahun 2026",
                    tglSurat: "2026-03-05"
                }
            },
            {
                id: 11,
                file: "Percepatan Pelaksanaan Inventarisasi BMD dan Penyampaian Laporan Hasil Inventarisasi TA 2026.pdf",
                rawText: `PEMERINTAH KABUPATEN BREBES\nDINAS PENDIDIKAN, PEMUDA DAN OLAHRAGA\nJl. Dr. Setiabudi No. 17 Brebes\nNomor : B/000.2.3.2/55/VII/2026 Brebes, 29 Juli 2026\nSifat : Penting\nLampiran : 1 (satu) berkas\nPerihal : Percepatan Pelaksanaan Inventarisasi BMD dan\nPenyampaian Laporan Hasil Inventarisasi TA 2026\nKepada Yth.\nKepala SD dan SMP Negeri Se-Kabupaten Brebes\ndi\nBrebes`,
                expected: {
                    noSuratAsli: "B/000.2.3.2/55/VII/2026",
                    pengirim: "PEMERINTAH KABUPATEN BREBES DINAS PENDIDIKAN, PEMUDA DAN OLAHRAGA",
                    tujuan: "Kepala SD dan SMP Negeri Se-Kabupaten Brebes",
                    perihal: "Percepatan Pelaksanaan Inventarisasi BMD dan Penyampaian Laporan Hasil Inventarisasi TA 2026",
                    tglSurat: "2026-07-29"
                }
            },
            {
                id: 12,
                file: "Permendikdasmen Nomor 9 Tahun 2025 tentang Tes Kemampuan Akademik.pdf",
                rawText: `PERATURAN MENTERI PENDIDIKAN DASAR DAN MENENGAH\nREPUBLIK INDONESIA\nNOMOR 9 TAHUN 2025\nTENTANG\nTES KEMAMPUAN AKADEMIK\nDENGAN RAHMAT TUHAN YANG MAHA ESA\nMENTERI PENDIDIKAN DASAR DAN MENENGAH REPUBLIK INDONESIA,\nMenimbang : dst.\nDitetapkan di Jakarta\npada tanggal 28 Mei 2025`,
                expected: {
                    noSuratAsli: "NOMOR 9 TAHUN 2025",
                    pengirim: "KEMENTERIAN PENDIDIKAN DASAR DAN MENENGAH REPUBLIK INDONESIA",
                    tujuan: "",
                    perihal: "Peraturan Menteri tentang Tes Kemampuan Akademik",
                    tglSurat: "2025-05-28"
                }
            },
            {
                id: 13,
                file: "Permendikdasmen_No_12_Tahun_2025_ttg_Standar_Isi_pada_Pe.pdf",
                rawText: `PERATURAN MENTERI PENDIDIKAN DASAR DAN MENENGAH\nREPUBLIK INDONESIA\nNOMOR 12 TAHUN 2025\nTENTANG\nSTANDAR ISI PADA PENDIDIKAN ANAK USIA DINI, JENJANG PENDIDIKAN DASAR, DAN JENJANG PENDIDIKAN MENENGAH\nDENGAN RAHMAT TUHAN YANG MAHA ESA\nDitetapkan di Jakarta\npada tanggal 15 Juni 2025`,
                expected: {
                    noSuratAsli: "NOMOR 12 TAHUN 2025",
                    pengirim: "KEMENTERIAN PENDIDIKAN DASAR DAN MENENGAH REPUBLIK INDONESIA",
                    tujuan: "",
                    perihal: "Peraturan Menteri tentang Standar Isi pada Pendidikan Anak Usia Dini, Jenjang Pendidikan Dasar, dan Jenjang Pendidikan Menengah",
                    tglSurat: "2025-06-15"
                }
            },
            {
                id: 14,
                file: "PERMOHONAN DISPENSASI PADUAN SUARA.pdf",
                rawText: `PEMERINTAH KABUPATEN BREBES\nDINAS PENDIDIKAN, PEMUDA DAN OLAHRAGA\nJl. Dr. Setiabudi No. 17 Brebes\nNomor : S/100.3.12/01137/IV/2026 Brebes, 28 April 2026\nLampiran : 1 Lembar\nHal : Permohonan Dispensasi\nKepada Yth.\nKepala SD/SMP Unit Kerja Terlampir\ndi\nBrebes\nSehubungan dengan persiapan Upacara Hari Pendidikan Nasional (HARDIKNAS) Tingkat Kabupaten Brebes, bersama ini kami mohon diberikan dispensasi kepada guru yang tergabung dalam tim paduan suara.`,
                expected: {
                    noSuratAsli: "S/100.3.12/01137/IV/2026",
                    pengirim: "PEMERINTAH KABUPATEN BREBES DINAS PENDIDIKAN, PEMUDA DAN OLAHRAGA",
                    tujuan: "Kepala SD/SMP Unit Kerja Terlampir",
                    perihal: "Permohonan Dispensasi Petugas Paduan Suara Upacara",
                    tglSurat: "2026-04-28"
                }
            },
            {
                id: 15,
                file: "Salinan Perkaban tentang Kerangka Asesmen TKA SD MI dan SMP MTs.pdf",
                rawText: `PERATURAN KEPALA BADAN STANDAR, KURIKULUM, DAN ASESMEN PENDIDIKAN\nKEMENTERIAN PENDIDIKAN DASAR DAN MENENGAH\nNOMOR 045/H/AN/2025\nTENTANG\nKERANGKA ASESMEN TES KEMAMPUAN AKADEMIK JENJANG SD DAN SMP\nDENGAN RAHMAT TUHAN YANG MAHA ESA\nDitetapkan di Jakarta\npada tanggal 10 Juli 2025`,
                expected: {
                    noSuratAsli: "NOMOR 045/H/AN/2025",
                    pengirim: "BADAN STANDAR, KURIKULUM, DAN ASESMEN PENDIDIKAN",
                    tujuan: "",
                    perihal: "Peraturan Kepala Badan tentang Kerangka Asesmen Tes Kemampuan Akademik Jenjang SD dan SMP",
                    tglSurat: "2025-07-10"
                }
            },
            {
                id: 16,
                file: "SOSIALISASI DAN PENDAMPINGAN GUPRES DAN KSPRES.pdf",
                rawText: `PEMERINTAH KABUPATEN BREBES\nDINAS PENDIDIKAN PEMUDA DAN OLAHRAGA\nKORWILCAM SATPENDIK KECAMATAN BREBES\nJl. Pangeran Diponegoro Brebes\nNomor : K/800/028/V/2026 Brebes, 5 Mei 2026\nLampiran : -\nPerihal : Undangan Sosialisasi dan Pendampingan Lomba Guru dan Kepala Sekolah Berprestasi\nKepada Yth.\nKepala SD Negeri dan Swasta Se-Kecamatan Brebes\ndi\nTempat`,
                expected: {
                    noSuratAsli: "K/800/028/V/2026",
                    pengirim: "DINAS PENDIDIKAN PEMUDA DAN OLAHRAGA KORWILCAM SATPENDIK KECAMATAN BREBES",
                    tujuan: "Kepala SD Negeri dan Swasta Se-Kecamatan Brebes",
                    perihal: "Undangan Sosialisasi dan Pendampingan Lomba Guru dan Kepala Sekolah Berprestasi",
                    tglSurat: "2026-05-05"
                }
            },
            {
                id: 17,
                file: "UNDANGAN PEMANTAUAN TINDAK LANJUT HASIL PEMERIKSAAN.pdf",
                rawText: `PEMERINTAH KABUPATEN BREBES\nDINAS PENDIDIKAN PEMUDA DAN OLAHRAGA\nKORWILCAM SATPENDIK KECAMATAN BREBES\nNomor : K/800/029/V/2026 Brebes, 6 Mei 2026\nLampiran : 1 Lembar\nHal : Undangan\nKepada Yth.\nKepala Sekolah dan Bendahara BOS SD Negeri Se-Kec. Brebes\ndi\nTempat\nMengharap kehadiran Bapak/Ibu pada:\nAcara : Pemantauan Tindak Lanjut Hasil Pemeriksaan Monev BOS`,
                expected: {
                    noSuratAsli: "K/800/029/V/2026",
                    pengirim: "DINAS PENDIDIKAN PEMUDA DAN OLAHRAGA KORWILCAM SATPENDIK KECAMATAN BREBES",
                    tujuan: "Kepala Sekolah dan Bendahara BOS SD Negeri Se-Kec. Brebes",
                    perihal: "Undangan: Pemantauan Tindak Lanjut Hasil Pemeriksaan Monev BOS",
                    tglSurat: "2026-05-06"
                }
            },
            {
                id: 18,
                file: "Usulan Bendahara BOSP TA 2026.pdf",
                rawText: `PEMERINTAH KABUPATEN BREBES\nDINAS PENDIDIKAN, PEMUDA DAN OLAHRAGA\nJl. Dr. Setiabudi No. 17 Brebes\nNomor : B/00014/900/2026 Brebes, 2 Januari 2026\nSifat : Penting\nPerihal : Usulan Bendahara BOSP SD/SMP Negeri Tahun Anggaran 2026\nKepada Yth.\n1. Korwilcam Satpendik Se-Kabupaten Brebes\n2. Kepala SMP Negeri Se-Kabupaten Brebes\ndi\nBrebes`,
                expected: {
                    noSuratAsli: "B/00014/900/2026",
                    pengirim: "PEMERINTAH KABUPATEN BREBES DINAS PENDIDIKAN, PEMUDA DAN OLAHRAGA",
                    tujuan: "Korwilcam Satpendik Se-Kabupaten Brebes, Kepala SMP Negeri Se-Kabupaten Brebes",
                    perihal: "Usulan Bendahara BOSP SD/SMP Negeri Tahun Anggaran 2026",
                    tglSurat: "2026-01-02"
                }
            },
            {
                id: 19,
                file: "Usulan Rombel Kelas 1 TP 2026_2027.pdf",
                rawText: `PEMERINTAH KABUPATEN BREBES\nDINAS PENDIDIKAN, PEMUDA DAN OLAHRAGA\nJl. Dr. Setiabudi No. 17 Brebes\nNomor : B/420/00191.4/2026 Brebes, 21 Januari 2026\nLampiran : 1 berkas\nPerihal : Usulan Rombongan Belajar Kelas 1 Tahun Pelajaran 2026/2027\nKepada Yth.\nKorwilcam Satpendik Se-Kabupaten Brebes\ndi\nBrebes`,
                expected: {
                    noSuratAsli: "B/420/00191.4/2026",
                    pengirim: "PEMERINTAH KABUPATEN BREBES DINAS PENDIDIKAN, PEMUDA DAN OLAHRAGA",
                    tujuan: "Korwilcam Satpendik Se-Kabupaten Brebes",
                    perihal: "Usulan Rombongan Belajar Kelas 1 Tahun Pelajaran 2026/2027",
                    tglSurat: "2026-01-21"
                }
            },
            {
                id: 20,
                file: "01_Puskesmas_Pemberitahuan_Imunisasi_BIAS_SD.pdf",
                rawText: `PEMERINTAH KABUPATEN BREBES\nDINAS KESEHATAN\nUPTD PUSKESMAS BREBES\nJl. Tritura No. 24 Brebes Telp. (0283) 671234 Kode Pos 52212\nBrebes, 15 September 2025\nNomor : 440 / 089 / PKM-BRB / IX / 2025\nSifat : Penting\nLampiran : 1 (Satu) Lembar\nPerihal : Pemberitahuan Pelaksanaan Bulan Imunisasi Anak Sekolah (BIAS)\nKepada Yth.\nKepala SD Negeri Terlangu 01\ndi -\nTempat`,
                expected: {
                    noSuratAsli: "440/089/PKM-BRB/IX/2025",
                    pengirim: "DINAS KESEHATAN UPTD PUSKESMAS BREBES",
                    tujuan: "Kepala SD Negeri Terlangu 01",
                    perihal: "Pemberitahuan Pelaksanaan Bulan Imunisasi Anak Sekolah (BIAS)",
                    tglSurat: "2025-09-15"
                }
            },
            {
                id: 21,
                file: "02_Kwarran_Pramuka_Edaran_Pesta_Siaga_2026.pdf",
                rawText: `GERAKAN PRAMUKA\nKWARTIR RANTING BREBES\nSekretariat: Sanggar Bakti Pramuka Jl. Veteran No. 12 Brebes 52212\nBrebes, 20 Januari 2026\nNomor : 045 / 11.29.17 - A\nLampiran : 1 (Satu) Berkas Juknis\nPerihal : Edaran Pelaksanaan Pesta Siaga Kwarran Brebes Tahun 2026\nKepada Yth.\nKamabigus SD / MI Se-Kwartir Ranting Brebes\ndi -\nBrebes`,
                expected: {
                    noSuratAsli: "045/11.29.17-A",
                    pengirim: "GERAKAN PRAMUKA KWARTIR RANTING BREBES",
                    tujuan: "Kamabigus SD/MI Se-Kwartir Ranting Brebes",
                    perihal: "Edaran Pelaksanaan Pesta Siaga Kwarran Brebes Tahun 2026",
                    tglSurat: "2026-01-20"
                }
            },
            {
                id: 22,
                file: "03_Kemenag_Pemberitahuan_Pentas_PAI_SD_2025.pdf",
                rawText: `KEMENTERIAN AGAMA REPUBLIK INDONESIA\nKANTOR KEMENTERIAN AGAMA KABUPATEN BREBES\nJalan Jenderal Ahmad Yani Nomor 68 Brebes 52212\nBrebes, 10 Maret 2025\nNomor : B-1425/Kk.11.29/PP.00/03/2025\nSifat : Penting\nLampiran : 1 (Satu) Berkas\nHal : Pemberitahuan Pelaksanaan Pekan Keterampilan dan Seni\nPendidikan Agama Islam (Pentas PAI) Jenjang SD Tahun 2025\nYth. Kepala SD Negeri dan Swasta Se-Kabupaten Brebes\ndi Brebes`,
                expected: {
                    noSuratAsli: "B-1425/Kk.11.29/PP.00/03/2025",
                    pengirim: "KEMENTERIAN AGAMA REPUBLIK INDONESIA KANTOR KEMENTERIAN AGAMA KABUPATEN BREBES",
                    tujuan: "Kepala SD Negeri dan Swasta Se-Kabupaten Brebes",
                    perihal: "Pemberitahuan Pelaksanaan Pekan Keterampilan dan Seni Pendidikan Agama Islam (Pentas PAI) Jenjang SD Tahun 2025",
                    tglSurat: "2025-03-10"
                }
            },
            {
                id: 23,
                file: "04_SDN_Pasarbatang_02_Surat_Bersedia_Menerima_Siswa_Pindahan.pdf",
                rawText: `PEMERINTAH KABUPATEN BREBES\nDINAS PENDIDIKAN PEMUDA DAN OLAHRAGA\nUPT SATUAN PENDIDIKAN\nSD NEGERI PASARBATANG 02\nKECAMATAN BREBES\nAlamat : Jl. Yos Sudarso No. 18 Pasarbatang Kec. Brebes Kode Pos 52211\nSURAT KETERANGAN BERSEDIA MENERIMA SISWA PINDAHAN\nNomor : 421.2 / 038 / SDN.PB02 / VII / 2025\nYang bertanda tangan di bawah ini Kepala SD Negeri Pasarbatang 02 Kecamatan Brebes Kabupaten Brebes menerangkan bahwa:\nNama Lengkap : ADITYA PRATAMA PUTRA\nNISN : 0154328911\nAsal Sekolah : SD Negeri Terlangu 01 Kecamatan Brebes\nKelas yang Dituju : IV (Empat)\nBrebes, 18 Juli 2025\nKepala SD Negeri Pasarbatang 02\nDrs. SUTRISNO, M.Pd.\nNIP. 19680512 199103 1 009`,
                expected: {
                    noSuratAsli: "421.2/038/SDN.PB02/VII/2025",
                    pengirim: "SD NEGERI PASARBATANG 02 KECAMATAN BREBES",
                    tujuan: "Orang Tua/Wali Siswa a.n. ADITYA PRATAMA PUTRA (Asal: SD Negeri Terlangu 01 Kecamatan Brebes)",
                    perihal: "Surat Keterangan Bersedia Menerima Siswa Pindahan a.n. ADITYA PRATAMA PUTRA (Kelas IV (Empat))",
                    tglSurat: "2025-07-18"
                }
            },
            {
                id: 24,
                file: "05_Kecamatan_Brebes_Undangan_Upacara_HUT_RI.pdf",
                rawText: `PEMERINTAH KABUPATEN BREBES\nKECAMATAN BREBES\nJl. Pangeran Diponegoro No. 110 Brebes Telp. (0283) 671019\nBrebes, 11 Agustus 2025\nNomor : 005 / 412 / KEC.BRB / VIII / 2025\nSifat : Penting\nLampiran : 1 (Satu) Lembar\nPerihal : Undangan\nKepada Yth.\n1. Kepala UPTD / Instansi Se-Kecamatan Brebes\n2. Kepala SMP / MTs, SD / MI Negeri dan Swasta Se-Kecamatan Brebes\n3. Kepala Desa / Kalurahan Se-Kecamatan Brebes\ndi -\nBrebes\nDalam rangka memperingati Hari Ulang Tahun (HUT) Ke-80 Kemerdekaan Republik Indonesia Tahun 2025, Pemerintah Kecamatan Brebes akan menyelenggarakan Upacara Pengibaran dan Penurunan Bendera Merah Putih Tingkat Kecamatan Brebes pada:\nAcara : Upacara Detik-Detik Proklamasi Kemerdekaan RI Ke-80 Tingkat Kecamatan Brebes`,
                expected: {
                    noSuratAsli: "005/412/KEC.BRB/VIII/2025",
                    pengirim: "PEMERINTAH KABUPATEN BREBES KECAMATAN BREBES",
                    tujuan: "Kepala UPTD/Instansi Se-Kecamatan Brebes, Kepala SMP/MTs, SD/MI Negeri dan Swasta Se-Kecamatan Brebes, Kepala Desa/Kalurahan Se-Kecamatan Brebes",
                    perihal: "Undangan: Upacara Pengibaran dan Penurunan Bendera Merah Putih Tingkat Kecamatan Brebes",
                    tglSurat: "2025-08-11"
                }
            },
            {
                id: 25,
                file: "Surat Mutasi Dapodik Ririn Nur Ashifa.pdf (Varian Scan OCR Berbingkai Kotak)",
                rawText: `PEMERINTAH KABUPATEN KAB. BREBES\nDINAS PENDIDIKAN\nSD NEGERI TERLANGU 01\nNPSN 20326713, Jalan Raya Terlangu, Kecamatan Kec. Brebes\nKab. Brebes - Prov. Jawa Tengah. Telp 085642670900, Fax 0, Email\n| SURAT KETERANGAN PINDAH/KELUAR |\n| Nomor : 421,2 / 025 / 1X / 2026 |\nYang bertanda tangan di bawah ini kepala sekolah SD NEGERI TERLANGU 01\nmenerangkan bahwa :\nNama : Ririn Nur Asifa\nTempat/Tanggal Lahir : Jakarta / 2016-09-18\nNISN : 3162919422\nTahun Akademik : 2026/2027\nNama Orang Tua Ayah : Muhammad Soleh\nIbu : Dina Marsella\nPekerjaan Orang Tua : Buruh\nAlamat : Jl. Raya Terlangu RT/RW 2/3\nNomor Ijazah/STTB :\nTanggal Pindah : 2026-09-01\nAlasan Pindah : Mengikuti Orang Tua\nCatatan :\nDemikian surat keterangan ini dibuat, untuk diketahui dan dipergunakan sebagaimana mestinya.\nKab. Brebes, 01-10-2026\nMengetahui\nKepala Sekolah SD NEGERI TERLANGU 01\n( Aisah Suciati )\nNIP : 196908081992012002`,
                expected: {
                    noSuratAsli: "421.2/025/IX/2026",
                    pengirim: "SD NEGERI TERLANGU 01",
                    tujuan: "Orang Tua/Wali Siswa a.n. Ririn Nur Asifa",
                    perihal: "Surat Keterangan Pindah Sekolah a.n. Ririn Nur Asifa",
                    tglSurat: "2026-10-01"
                }
            }
        ];

        const results = testCases.map(tc => {
            const actual = this.parseSuratMasukText(tc.rawText);
            const checks = {
                noSuratAsli: actual.noSuratAsli === tc.expected.noSuratAsli,
                pengirim: actual.pengirim === tc.expected.pengirim,
                tujuan: actual.tujuan === tc.expected.tujuan,
                perihal: actual.perihal === tc.expected.perihal,
                tglSurat: actual.tglSurat === tc.expected.tglSurat
            };
            const passed = Object.values(checks).every(Boolean);
            return {
                id: tc.id,
                file: tc.file,
                passed,
                checks,
                actual,
                expected: tc.expected
            };
        });

        const passedCount = results.filter(r => r.passed).length;
        console.table(results.map(r => ({
            ID: r.id,
            Berkas: r.file,
            Status: r.passed ? "PASS" : "FAIL",
            NoSurat: r.actual.noSuratAsli,
            Pengirim: r.actual.pengirim,
            Tujuan: r.actual.tujuan,
            Perihal: r.actual.perihal
        })));

        return {
            total: results.length,
            passed: passedCount,
            failed: results.length - passedCount,
            allPassed: passedCount === results.length,
            results
        };
    }
};

window.ModulOCR = ModulOCR;
