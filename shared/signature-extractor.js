/**
 * ==========================================================================
 * SEKOLAHTU SHARED LIBRARY: EKSTRAKTOR TTD & PARAF TRANSPARAN DARI KERTAS PUTIH
 * Lokasi Satuan Pendidikan: SD Negeri Terlangu 01, Kec. Brebes, Kab. Brebes
 * ==========================================================================
 * Rekayasa Zero-Hardware pengganti Signature Pad USB mahal:
 * 1. Memotret goresan pulpen di atas kertas putih kosong -> Auto-thresholding
 *    (alpha = 0 untuk latar putih/krem, tinta pulpen dipertajam pekat)
 * 2. Tight Bounding Box Auto-Cropping -> Menghasilkan PNG Transparan Mikro (15-50 KB)
 * 3. Touch Signature Pad interaktif di layar sentuh HP/Laptop
 * 4. Terhubung ke Buku Tamu (#bukutamu), Daftar Hadir Rapat (000.1.5),
 *    Paraf Absensi Tendik (#scan-absensi & #absensi), dan Paraf Naskah Dinas.
 */

class SignatureExtractorEngine {
  constructor(options = {}) {
    this.luminanceThreshold = options.luminanceThreshold || 210; // Ambang batas kertas putih
    this.maxOutputWidth = options.maxOutputWidth || 480;
  }

  /**
   * 1. Ekstraksi Foto Kertas Putih Menjadi PNG Transparan Bersih (15 - 50 KB)
   */
  extractFromImageElement(imgElement, customThreshold = null) {
    const threshold = customThreshold || this.luminanceThreshold;
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");

    let w = imgElement.naturalWidth || imgElement.videoWidth || imgElement.width || 600;
    let h = imgElement.naturalHeight || imgElement.videoHeight || imgElement.height || 300;

    if (w > 1000) {
      h = Math.round((h * 1000) / w);
      w = 1000;
    }

    canvas.width = w;
    canvas.height = h;
    ctx.drawImage(imgElement, 0, 0, w, h);

    const imgData = ctx.getImageData(0, 0, w, h);
    const data = imgData.data;
    let minX = w,
      minY = h,
      maxX = 0,
      maxY = 0;
    let hasInkPixels = false;

    for (let i = 0; i < data.length; i += 4) {
      const r = data[i],
        g = data[i + 1],
        b = data[i + 2];
      const lum = 0.299 * r + 0.587 * g + 0.114 * b;
      const x = (i / 4) % w;
      const y = Math.floor(i / 4 / w);

      if (lum > threshold) {
        // Latar kertas putih/krem/abu terang dijadikan transparan total
        data[i + 3] = 0;
      } else {
        // Goresan tinta pulpen dihitamkan tajam & pekat (#0f172a Slate Dark)
        data[i] = 15;
        data[i + 1] = 23;
        data[i + 2] = 42;
        data[i + 3] = 255;
        hasInkPixels = true;
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
      }
    }
    ctx.putImageData(imgData, 0, 0);

    if (!hasInkPixels) {
      minX = 0;
      minY = 0;
      maxX = Math.min(w, 300);
      maxY = Math.min(h, 150);
    }

    // Auto-crop tepi tanda tangan (Tight Bounding Box)
    const cropW = Math.max(1, maxX - minX + 20);
    const cropH = Math.max(1, maxY - minY + 20);

    let outW = cropW;
    let outH = cropH;
    if (outW > this.maxOutputWidth) {
      outH = Math.round((outH * this.maxOutputWidth) / outW);
      outW = this.maxOutputWidth;
    }

    const cropCanvas = document.createElement("canvas");
    cropCanvas.width = outW;
    cropCanvas.height = outH;
    const cropCtx = cropCanvas.getContext("2d");
    cropCtx.drawImage(
      canvas,
      Math.max(0, minX - 10),
      Math.max(0, minY - 10),
      cropW,
      cropH,
      0,
      0,
      outW,
      outH
    );

    // Menghasilkan PNG Transparan Mikro (15 - 50 KB)
    return cropCanvas.toDataURL("image/png");
  }

  /**
   * 2. Pad Tanda Tangan Sentuh Langsung di Layar (Touch Signature Canvas)
   */
  initTouchPad(canvasElement) {
    if (!canvasElement) return;
    const ctx = canvasElement.getContext("2d");
    let isDrawing = false;
    ctx.strokeStyle = "#0f172a";
    ctx.lineWidth = 2.5;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";

    const getPos = (e) => {
      const rect = canvasElement.getBoundingClientRect();
      const scaleX = canvasElement.width / (rect.width || 1);
      const scaleY = canvasElement.height / (rect.height || 1);
      const clientX = e.touches && e.touches[0] ? e.touches[0].clientX : e.clientX;
      const clientY = e.touches && e.touches[0] ? e.touches[0].clientY : e.clientY;
      return {
        x: (clientX - rect.left) * scaleX,
        y: (clientY - rect.top) * scaleY
      };
    };

    canvasElement.addEventListener("mousedown", (e) => {
      isDrawing = true;
      const p = getPos(e);
      ctx.beginPath();
      ctx.moveTo(p.x, p.y);
    });
    canvasElement.addEventListener("mousemove", (e) => {
      if (!isDrawing) return;
      const p = getPos(e);
      ctx.lineTo(p.x, p.y);
      ctx.stroke();
    });
    window.addEventListener("mouseup", () => {
      isDrawing = false;
    });

    canvasElement.addEventListener(
      "touchstart",
      (e) => {
        isDrawing = true;
        const p = getPos(e);
        ctx.beginPath();
        ctx.moveTo(p.x, p.y);
        e.preventDefault();
      },
      { passive: false }
    );
    canvasElement.addEventListener(
      "touchmove",
      (e) => {
        if (!isDrawing) return;
        const p = getPos(e);
        ctx.lineTo(p.x, p.y);
        ctx.stroke();
        e.preventDefault();
      },
      { passive: false }
    );
    window.addEventListener("touchend", () => {
      isDrawing = false;
    });
  }

  clearTouchPad(canvasElement) {
    if (!canvasElement) return;
    const ctx = canvasElement.getContext("2d");
    ctx.clearRect(0, 0, canvasElement.width, canvasElement.height);
  }

  /**
   * 3. Modal Interaktif Ekstraksi TTD Kertas Putih & Touch Pad
   */
  openSignatureModal({ title = "Ekstraktor Tanda Tangan & Paraf Digital Transparan", targetKey = "sekolahtu_saved_signature", onSaved = null } = {}) {
    let modal = document.getElementById("sekolahtu-signature-modal");
    if (!modal) {
      modal = document.createElement("div");
      modal.id = "sekolahtu-signature-modal";
      modal.className = "fixed inset-0 z-[80] bg-slate-900/75 backdrop-blur-sm flex items-center justify-center p-4";
      document.body.appendChild(modal);
    }

    modal.innerHTML = `
      <div class="bg-white dark:bg-slate-900 rounded-2xl max-w-xl w-full p-5 shadow-2xl border border-slate-200 dark:border-slate-800 space-y-4">
        <div class="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
          <div class="flex items-center gap-2.5">
            <div class="w-9 h-9 rounded-xl bg-indigo-100 dark:bg-indigo-950 text-indigo-800 dark:text-indigo-300 flex items-center justify-center font-bold">
              <i class="fa-solid fa-signature"></i>
            </div>
            <div>
              <h3 class="font-extrabold text-sm text-slate-900 dark:text-slate-100">${title}</h3>
              <p class="text-[11px] text-slate-500 dark:text-slate-400">Sesuai UU ITE 1/2024 & PP 71/2019 untuk Dokumen Internal Satuan Pendidikan</p>
            </div>
          </div>
          <button type="button" id="btn-close-sig-modal" class="text-slate-400 hover:text-slate-600 p-1.5 cursor-pointer">
            <i class="fa-solid fa-xmark text-lg"></i>
          </button>
        </div>

        <!-- Tab Pilihan Metode: Foto Kertas Putih vs Gores di Layar -->
        <div class="grid grid-cols-2 gap-2 p-1 bg-slate-100 dark:bg-slate-800 rounded-xl">
          <button type="button" id="tab-sig-paper" class="py-2 px-3 rounded-lg text-xs font-extrabold bg-white dark:bg-slate-900 text-blue-900 dark:text-blue-300 shadow-xs cursor-pointer">
            <i class="fa-solid fa-file-pen mr-1"></i>1. Foto dari Kertas Putih
          </button>
          <button type="button" id="tab-sig-touch" class="py-2 px-3 rounded-lg text-xs font-bold text-slate-600 dark:text-slate-400 hover:text-slate-900 cursor-pointer">
            <i class="fa-solid fa-hand-pointer mr-1"></i>2. Gores Langsung di Layar
          </button>
        </div>

        <!-- Panel 1: Foto Kertas Putih -->
        <div id="panel-sig-paper" class="space-y-3">
          <div class="p-3 rounded-xl bg-blue-50 dark:bg-blue-950/50 border border-blue-200 dark:border-blue-800 text-xs text-blue-900 dark:text-blue-200 leading-relaxed">
            <strong>Petunjuk Mudah:</strong> Tanda tanganlah memakai pulpen hitam/biru di atas kertas putih polos, lalu pilih foto atau potret. Sistem otomatis menghapus warna kertas menjadi PNG transparan mikro (15–50 KB).
          </div>
          <div class="flex items-center gap-2">
            <label class="flex-1 py-2.5 px-4 bg-blue-900 hover:bg-blue-800 text-white rounded-xl text-xs font-bold text-center cursor-pointer transition">
              <i class="fa-solid fa-camera mr-1.5"></i>Potret / Pilih Foto TTD Kertas Putih
              <input type="file" id="inp-sig-paper-file" accept="image/*" capture="environment" class="hidden">
            </label>
          </div>
        </div>

        <!-- Panel 2: Touch Signature Pad -->
        <div id="panel-sig-touch" class="hidden space-y-2">
          <div class="border-2 border-dashed border-slate-300 dark:border-slate-700 rounded-xl bg-white p-1 flex flex-col items-center">
            <canvas id="canvas-sig-touch" width="460" height="180" class="w-full h-44 touch-none cursor-crosshair bg-white rounded-lg"></canvas>
          </div>
          <div class="flex justify-between items-center">
            <span class="text-[11px] text-slate-500">Goreskan jari atau mouse pada kotak putih di atas.</span>
            <button type="button" id="btn-clear-touch-sig" class="text-xs font-bold text-rose-600 hover:underline cursor-pointer">
              <i class="fa-solid fa-eraser mr-1"></i>Bersihkan Kanvas
            </button>
          </div>
        </div>

        <!-- Pratinjau Hasil Transparan -->
        <div class="p-3 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex flex-col items-center justify-center min-h-[110px]">
          <span class="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">Pratinjau PNG Transparan (Latar Kotak-Kotak)</span>
          <img id="img-sig-extracted-preview" alt="Pratinjau TTD" class="max-h-24 object-contain hidden" />
          <span id="txt-sig-size-info" class="text-[11px] font-mono text-emerald-700 dark:text-emerald-400 mt-1">Belum ada tanda tangan dipilih</span>
        </div>

        <div class="flex items-center justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
          <button type="button" id="btn-cancel-sig" class="px-4 py-2 border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-300 cursor-pointer">
            Batal
          </button>
          <button type="button" id="btn-save-sig" class="px-5 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-extrabold inline-flex items-center gap-1.5 shadow-sm cursor-pointer">
            <i class="fa-solid fa-floppy-disk"></i> Simpan Tanda Tangan Transparan
          </button>
        </div>
      </div>
    `;

    modal.classList.remove("hidden");

    const tabPaper = modal.querySelector("#tab-sig-paper");
    const tabTouch = modal.querySelector("#tab-sig-touch");
    const panelPaper = modal.querySelector("#panel-sig-paper");
    const panelTouch = modal.querySelector("#panel-sig-touch");
    const inpFile = modal.querySelector("#inp-sig-paper-file");
    const touchCanvas = modal.querySelector("#canvas-sig-touch");
    const btnClearTouch = modal.querySelector("#btn-clear-touch-sig");
    const imgPreview = modal.querySelector("#img-sig-extracted-preview");
    const txtSize = modal.querySelector("#txt-sig-size-info");
    const btnSave = modal.querySelector("#btn-save-sig");
    const btnCancel = modal.querySelector("#btn-cancel-sig");
    const btnClose = modal.querySelector("#btn-close-sig-modal");

    let activeMode = "paper";
    let extractedDataUrl = localStorage.getItem(targetKey) || null;

    if (extractedDataUrl) {
      imgPreview.src = extractedDataUrl;
      imgPreview.classList.remove("hidden");
      txtSize.textContent = "Tanda tangan tersimpan siap digunakan";
    }

    this.initTouchPad(touchCanvas);

    tabPaper.addEventListener("click", () => {
      activeMode = "paper";
      panelPaper.classList.remove("hidden");
      panelTouch.classList.add("hidden");
      tabPaper.className = "py-2 px-3 rounded-lg text-xs font-extrabold bg-white dark:bg-slate-900 text-blue-900 dark:text-blue-300 shadow-xs cursor-pointer";
      tabTouch.className = "py-2 px-3 rounded-lg text-xs font-bold text-slate-600 dark:text-slate-400 cursor-pointer";
    });

    tabTouch.addEventListener("click", () => {
      activeMode = "touch";
      panelTouch.classList.remove("hidden");
      panelPaper.classList.add("hidden");
      tabTouch.className = "py-2 px-3 rounded-lg text-xs font-extrabold bg-white dark:bg-slate-900 text-blue-900 dark:text-blue-300 shadow-xs cursor-pointer";
      tabPaper.className = "py-2 px-3 rounded-lg text-xs font-bold text-slate-600 dark:text-slate-400 cursor-pointer";
    });

    inpFile.addEventListener("change", (e) => {
      const f = e.target.files && e.target.files[0];
      if (!f) return;
      const reader = new FileReader();
      reader.onload = (ev) => {
        const img = new Image();
        img.onload = () => {
          extractedDataUrl = this.extractFromImageElement(img);
          const kb = Math.round(((extractedDataUrl.split(",")[1]?.length || 0) * 3) / 4 / 1024);
          imgPreview.src = extractedDataUrl;
          imgPreview.classList.remove("hidden");
          txtSize.textContent = `PNG Transparan Berhasil Diekstrak (${kb} KB)`;
        };
        img.src = ev.target.result;
      };
      reader.readAsDataURL(f);
    });

    btnClearTouch.addEventListener("click", () => {
      this.clearTouchPad(touchCanvas);
    });

    btnSave.addEventListener("click", () => {
      if (activeMode === "touch") {
        extractedDataUrl = this.extractFromImageElement(touchCanvas);
      }
      if (extractedDataUrl) {
        try {
          localStorage.setItem(targetKey, extractedDataUrl);
        } catch (e) {}
        if (typeof onSaved === "function") {
          onSaved(extractedDataUrl);
        }
      }
      modal.classList.add("hidden");
    });

    const closeFn = () => modal.classList.add("hidden");
    btnCancel.addEventListener("click", closeFn);
    btnClose.addEventListener("click", closeFn);
  }

  openExtractorModal(opts = {}) {
    return this.openSignatureModal(opts);
  }

  static openExtractorModal(opts = {}) {
    if (typeof window !== "undefined" && window.SignatureManager) {
      return window.SignatureManager.openSignatureModal(opts);
    }
  }

  static openSignatureModal(opts = {}) {
    if (typeof window !== "undefined" && window.SignatureManager) {
      return window.SignatureManager.openSignatureModal(opts);
    }
  }
}

if (typeof window !== "undefined") {
  window.SignatureExtractorEngine = SignatureExtractorEngine;
  window.SignatureManager = new SignatureExtractorEngine();
}

