/**
 * ==========================================================================
 * SEKOLAHTU SHARED LIBRARY: UNIVERSAL WEB CAMERA CAPTURE & CANVAS COMPRESSION
 * Lokasi Satuan Pendidikan: SD Negeri Terlangu 01, Kec. Brebes, Kab. Brebes
 * ==========================================================================
 * Arsitektur Zero-Hardware (Rp0 pengadaan scanner fisik):
 * 1. Mengakses kamera belakang ponsel (facingMode: "environment") / webcam laptop
 * 2. Kompresi HTML5 Canvas sisi klien ke WebP/JPEG <= 800 KB (lebar maks 1600 px)
 * 3. Saklar filter visual: Warna Asli vs Kontras Tinggi Hitam-Putih (Dokumen Tajam)
 * 4. Rotasi 90 derajat & Fallback <input type="file" accept="image/*" capture="environment">
 */

class UniversalCameraCapture {
  constructor(options = {}) {
    this.targetWidth = options.targetWidth || 1600;
    this.maxSizeKB = options.maxSizeKB || 800;
    this.videoStream = null;
    this.rotationAngle = 0;
    this.applyHighContrast = false;
    this._onCaptureCallback = null;
  }

  async startCamera(videoElement, facingMode = "environment") {
    try {
      this.stopCamera();
      this.videoStream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: { ideal: facingMode },
          width: { ideal: 1920 },
          height: { ideal: 1080 }
        },
        audio: false
      });
      if (videoElement) {
        videoElement.srcObject = this.videoStream;
        await videoElement.play();
      }
      return true;
    } catch (err) {
      console.warn("[UniversalCameraCapture] Kamera WebRTC gagal, fallback ke input file capture:", err);
      return false;
    }
  }

  stopCamera() {
    if (this.videoStream) {
      this.videoStream.getTracks().forEach((track) => track.stop());
      this.videoStream = null;
    }
  }

  /**
   * Memproses elemen video atau image ke Canvas dengan opsi kontras tinggi, rotasi, dan kompresi <= 800 KB
   */
  captureAndCompress(sourceElement, applyContrast = this.applyHighContrast, rotationDeg = this.rotationAngle) {
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");

    let srcW = sourceElement.videoWidth || sourceElement.naturalWidth || sourceElement.width || 1280;
    let srcH = sourceElement.videoHeight || sourceElement.naturalHeight || sourceElement.height || 720;

    let width = srcW;
    let height = srcH;

    if (width > this.targetWidth) {
      height = Math.round((height * this.targetWidth) / width);
      width = this.targetWidth;
    }

    const normRot = ((rotationDeg % 360) + 360) % 360;
    if (normRot === 90 || normRot === 270) {
      canvas.width = height;
      canvas.height = width;
    } else {
      canvas.width = width;
      canvas.height = height;
    }

    ctx.save();
    ctx.translate(canvas.width / 2, canvas.height / 2);
    ctx.rotate((normRot * Math.PI) / 180);
    ctx.drawImage(sourceElement, -width / 2, -height / 2, width, height);
    ctx.restore();

    if (applyContrast) {
      const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const d = imgData.data;
      for (let i = 0; i < d.length; i += 4) {
        const v = 0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2];
        const contrastVal = v > 132 ? Math.min(255, v * 1.18) : Math.max(0, v * 0.82);
        d[i] = contrastVal;
        d[i + 1] = contrastVal;
        d[i + 2] = contrastVal;
      }
      ctx.putImageData(imgData, 0, 0);
    }

    // Kompresi adaptif hingga ukuran di bawah maxSizeKB (default 800 KB)
    let quality = 0.82;
    let dataUrl = canvas.toDataURL("image/webp", quality);
    if (!dataUrl.startsWith("data:image/webp")) {
      dataUrl = canvas.toDataURL("image/jpeg", quality);
    }

    while (this.estimateSizeKB(dataUrl) > this.maxSizeKB && quality > 0.35) {
      quality = Number((quality - 0.1).toFixed(2));
      dataUrl = canvas.toDataURL("image/webp", quality);
    }

    return dataUrl;
  }

  estimateSizeKB(dataUrl) {
    if (!dataUrl) return 0;
    const base64Length = dataUrl.split(",")[1]?.length || 0;
    return Math.round((base64Length * 3) / 4 / 1024);
  }

  /**
   * Memproses File dari <input type="file"> fallback dan mengembalikan Promise<DataURL>
   */
  compressFileInput(file, applyContrast = false, rotationDeg = 0) {
    return new Promise((resolve, reject) => {
      if (!file) return reject(new Error("Berkas gambar tidak ditemukan."));
      const reader = new FileReader();
      reader.onload = (ev) => {
        const img = new Image();
        img.onload = () => {
          const resultUrl = this.captureAndCompress(img, applyContrast, rotationDeg);
          resolve({
            dataUrl: resultUrl,
            sizeKB: this.estimateSizeKB(resultUrl),
            fileName: file.name.replace(/\.[^.]+$/, "") + ".webp"
          });
        };
        img.onerror = reject;
        img.src = ev.target.result;
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }

  /**
   * Membuka Modal Pemindai Kamera Dokumen Dinas / Nota BOSP / Surat Masuk
   */
  openCaptureModal({ title = "Pemindai Kamera Dokumen Digital (Tanpa Alat Scanner)", onCaptured = null } = {}) {
    this._onCaptureCallback = onCaptured;
    this.rotationAngle = 0;
    this.applyHighContrast = false;

    let modal = document.getElementById("sekolahtu-camera-modal");
    if (!modal) {
      modal = document.createElement("div");
      modal.id = "sekolahtu-camera-modal";
      modal.className = "fixed inset-0 z-[80] bg-slate-900/75 backdrop-blur-sm flex items-center justify-center p-4";
      document.body.appendChild(modal);
    }

    modal.innerHTML = `
      <div class="bg-white dark:bg-slate-900 rounded-2xl max-w-xl w-full p-5 shadow-2xl border border-slate-200 dark:border-slate-800 space-y-4">
        <div class="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
          <div class="flex items-center gap-2.5">
            <div class="w-9 h-9 rounded-xl bg-blue-100 dark:bg-blue-950 text-blue-800 dark:text-blue-300 flex items-center justify-center font-bold">
              <i class="fa-solid fa-camera-retro"></i>
            </div>
            <div>
              <h3 class="font-extrabold text-sm text-slate-900 dark:text-slate-100">${title}</h3>
              <p class="text-[11px] text-slate-500 dark:text-slate-400">Kompresi Otomatis WebP &le; ${this.maxSizeKB} KB (Hemat Kuota Google Drive)</p>
            </div>
          </div>
          <button type="button" id="btn-close-cam-modal" class="text-slate-400 hover:text-slate-600 p-1.5 cursor-pointer">
            <i class="fa-solid fa-xmark text-lg"></i>
          </button>
        </div>

        <div class="relative bg-slate-950 rounded-xl overflow-hidden aspect-video flex items-center justify-center border border-slate-800">
          <video id="sekolahtu-cam-video" autoplay playsinline muted class="w-full h-full object-contain"></video>
          <img id="sekolahtu-cam-preview" alt="Hasil Foto" class="w-full h-full object-contain hidden" />
          <div id="sekolahtu-cam-badge" class="absolute bottom-2 right-2 bg-slate-900/80 text-white text-[10px] font-mono px-2.5 py-1 rounded-lg">
            Siap Memotret
          </div>
        </div>

        <div class="flex flex-wrap items-center justify-between gap-2 bg-slate-50 dark:bg-slate-800/60 p-2.5 rounded-xl border border-slate-200 dark:border-slate-700">
          <label class="inline-flex items-center gap-2 text-xs font-semibold text-slate-700 dark:text-slate-200 cursor-pointer">
            <input type="checkbox" id="chk-cam-contrast" class="rounded text-blue-600">
            <span>Filter Dokumen Tajam (Hitam-Putih)</span>
          </label>
          <div class="flex items-center gap-1.5">
            <button type="button" id="btn-cam-rotate" class="px-2.5 py-1.5 bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-lg text-xs font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-100 cursor-pointer">
              <i class="fa-solid fa-rotate-right mr-1"></i>Putar 90&deg;
            </button>
            <label class="px-2.5 py-1.5 bg-amber-100 dark:bg-amber-950/70 text-amber-900 dark:text-amber-300 border border-amber-300 dark:border-amber-700 rounded-lg text-xs font-bold cursor-pointer hover:bg-amber-200">
              <i class="fa-solid fa-folder-open mr-1"></i>Pilih File / Galeri
              <input type="file" id="inp-cam-fallback" accept="image/*" capture="environment" class="hidden">
            </label>
          </div>
        </div>

        <div class="flex items-center justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
          <button type="button" id="btn-cam-snap" class="px-5 py-2.5 bg-blue-900 hover:bg-blue-800 text-white rounded-xl text-xs font-extrabold inline-flex items-center gap-2 shadow-md cursor-pointer">
            <i class="fa-solid fa-camera"></i> Ambil Foto Dokumen
          </button>
          <button type="button" id="btn-cam-use" class="hidden px-5 py-2.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-extrabold inline-flex items-center gap-2 shadow-md cursor-pointer">
            <i class="fa-solid fa-check-double"></i> Gunakan Foto Ini
          </button>
        </div>
      </div>
    `;

    modal.classList.remove("hidden");

    const videoEl = modal.querySelector("#sekolahtu-cam-video");
    const previewEl = modal.querySelector("#sekolahtu-cam-preview");
    const badgeEl = modal.querySelector("#sekolahtu-cam-badge");
    const btnSnap = modal.querySelector("#btn-cam-snap");
    const btnUse = modal.querySelector("#btn-cam-use");
    const chkContrast = modal.querySelector("#chk-cam-contrast");
    const btnRotate = modal.querySelector("#btn-cam-rotate");
    const inpFallback = modal.querySelector("#inp-cam-fallback");
    const btnClose = modal.querySelector("#btn-close-cam-modal");

    let lastDataUrl = null;

    this.startCamera(videoEl, "environment").then((ok) => {
      if (!ok) {
        badgeEl.textContent = "Kamera langsung tidak tersedia — Gunakan tombol Pilih File / Galeri";
      }
    });

    chkContrast.addEventListener("change", () => {
      this.applyHighContrast = chkContrast.checked;
    });

    btnRotate.addEventListener("click", () => {
      this.rotationAngle = (this.rotationAngle + 90) % 360;
      badgeEl.textContent = `Rotasi: ${this.rotationAngle}°`;
    });

    btnSnap.addEventListener("click", () => {
      lastDataUrl = this.captureAndCompress(videoEl, this.applyHighContrast, this.rotationAngle);
      const kb = this.estimateSizeKB(lastDataUrl);
      previewEl.src = lastDataUrl;
      previewEl.classList.remove("hidden");
      videoEl.classList.add("hidden");
      btnUse.classList.remove("hidden");
      badgeEl.textContent = `Terpotret: ${kb} KB (WebP)`;
    });

    inpFallback.addEventListener("change", async (e) => {
      const f = e.target.files && e.target.files[0];
      if (!f) return;
      const res = await this.compressFileInput(f, this.applyHighContrast, this.rotationAngle);
      lastDataUrl = res.dataUrl;
      previewEl.src = lastDataUrl;
      previewEl.classList.remove("hidden");
      videoEl.classList.add("hidden");
      btnUse.classList.remove("hidden");
      badgeEl.textContent = `Berkas Dipilih: ${res.sizeKB} KB (WebP)`;
    });

    btnUse.addEventListener("click", () => {
      this.stopCamera();
      modal.classList.add("hidden");
      if (typeof this._onCaptureCallback === "function" && lastDataUrl) {
        this._onCaptureCallback({
          dataUrl: lastDataUrl,
          sizeKB: this.estimateSizeKB(lastDataUrl),
          timestamp: new Date().toISOString()
        });
      }
    });

    btnClose.addEventListener("click", () => {
      this.stopCamera();
      modal.classList.add("hidden");
    });
  }

  static openCaptureModal(opts = {}) {
    if (typeof window !== "undefined" && window.CameraCaptureManager) {
      return window.CameraCaptureManager.openCaptureModal(opts);
    }
  }
}

// Alias sesuai penamaan di beberapa bagian spesifikasi
const DocumentCameraCaptureEngine = UniversalCameraCapture;

if (typeof window !== "undefined") {
  window.UniversalCameraCapture = UniversalCameraCapture;
  window.DocumentCameraCaptureEngine = DocumentCameraCaptureEngine;
  window.CameraCaptureManager = new UniversalCameraCapture();
}

