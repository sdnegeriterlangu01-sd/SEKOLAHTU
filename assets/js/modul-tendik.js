/* ==========================================================================
   SIM-TAS-SD: MODUL DATA GURU & TENAGA KEPENDIDIKAN (TENDIK)
   Fitur:
   - Direktori profil Guru & Tendik lengkap terhubung ke database DB_Tendik
   - Foto profil guru & tombol upload foto (kompresi instan client-side DataURL)
   - Integrasi jabatan otomatis dari Manajemen Akun Pengguna (RBAC)
   - Pengelolaan data tugas tambahan (Kepala Sekolah, Bendahara BOS, 
     Pembina Pramuka Siaga/Penggalang, Pembina Drum Band, dll.)
   - Pemisahan bersih status kepegawaian (PNS/PPPK) dan Golongan/Pangkat
   - Tampilan Grid Kartu Modern & Tabel Responsif + Cetak Direktori
   ========================================================================== */

const ModulTendik = {
    searchQuery: "",
    statusFilter: "all",
    tugasFilter: "all",
    viewMode: "grid", // 'grid' atau 'table'
    tempPhotoBase64: "",

    TUGAS_PRESETS: [
        "Kepala Sekolah",
        "Bendahara BOS",
        "Pembina Pramuka Siaga",
        "Pembina Pramuka Penggalang",
        "Pembina Drum Band"
    ],

    init() {
        this.renderTable();
    },

    // -------------------------------------------------------------------------
    // RENDER UTAMA MODUL GURU & TENDIK
    // -------------------------------------------------------------------------
    renderTable() {
        const container = document.getElementById("tendik-main-content");
        if (!container) return;

        let list = DataStore.getTendik() || [];
        const totalAll = list.length;
        const totalPns = list.filter(t => (t.statusKepegawaian || "").toUpperCase() === "PNS").length;
        const totalPppk = list.filter(t => (t.statusKepegawaian || "").toUpperCase() === "PPPK").length;
        const totalHonorer = list.filter(t => ["PTT", "GTT", "HONORER"].includes((t.statusKepegawaian || "").toUpperCase())).length;
        const totalTugas = list.filter(t => t.tugasTambahan && t.tugasTambahan.trim() !== "").length;
        const totalFoto = list.filter(t => t.foto && t.foto.trim() !== "").length;

        // Terapkan Filter & Pencarian
        let filtered = list.filter(t => {
            if (this.statusFilter !== "all" && (t.statusKepegawaian || "").toUpperCase() !== this.statusFilter.toUpperCase()) {
                return false;
            }
            if (this.tugasFilter !== "all") {
                if (this.tugasFilter === "none" && t.tugasTambahan && t.tugasTambahan.trim() !== "") return false;
                if (this.tugasFilter === "has_tugas" && (!t.tugasTambahan || t.tugasTambahan.trim() === "")) return false;
                if (this.tugasFilter !== "none" && this.tugasFilter !== "has_tugas") {
                    if (this.tugasFilter === "Lainnya") {
                        if (!t.tugasTambahan || this.TUGAS_PRESETS.includes(t.tugasTambahan)) return false;
                    } else if (t.tugasTambahan !== this.tugasFilter) {
                        return false;
                    }
                }
            }
            if (this.searchQuery) {
                const q = this.searchQuery.toLowerCase().trim();
                const matchNama = (t.nama || "").toLowerCase().includes(q);
                const matchNip = (t.nip || "").toLowerCase().includes(q);
                const matchJab = (t.jabatan || "").toLowerCase().includes(q);
                const matchGol = (t.golJabatan || t.golongan || "").toLowerCase().includes(q);
                const matchTugas = (t.tugasTambahan || "").toLowerCase().includes(q);
                if (!matchNama && !matchNip && !matchJab && !matchGol && !matchTugas) return false;
            }
            return true;
        });

        const canEdit = Auth.canDo("saveTendik");

        container.innerHTML = `
            <!-- Kartu Statistik Ringkasan -->
            <div class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                <div class="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-xs flex items-center gap-3">
                    <div class="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center text-lg flex-shrink-0">
                        <i class="fa-solid fa-users"></i>
                    </div>
                    <div class="min-w-0">
                        <div class="text-[10px] uppercase font-bold text-slate-400">Total Tendik</div>
                        <div class="text-lg font-black text-slate-900">${totalAll} <span class="text-[11px] font-normal text-slate-400">Org</span></div>
                    </div>
                </div>
                <div class="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-xs flex items-center gap-3">
                    <div class="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center text-lg flex-shrink-0">
                        <i class="fa-solid fa-id-badge"></i>
                    </div>
                    <div class="min-w-0">
                        <div class="text-[10px] uppercase font-bold text-slate-400">PNS</div>
                        <div class="text-lg font-black text-indigo-600">${totalPns} <span class="text-[11px] font-normal text-slate-400">Org</span></div>
                    </div>
                </div>
                <div class="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-xs flex items-center gap-3">
                    <div class="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center text-lg flex-shrink-0">
                        <i class="fa-solid fa-graduation-cap"></i>
                    </div>
                    <div class="min-w-0">
                        <div class="text-[10px] uppercase font-bold text-slate-400">PPPK</div>
                        <div class="text-lg font-black text-emerald-600">${totalPppk} <span class="text-[11px] font-normal text-slate-400">Org</span></div>
                    </div>
                </div>
                <div class="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-xs flex items-center gap-3">
                    <div class="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center text-lg flex-shrink-0">
                        <i class="fa-solid fa-briefcase"></i>
                    </div>
                    <div class="min-w-0">
                        <div class="text-[10px] uppercase font-bold text-slate-400">PTT / Honorer</div>
                        <div class="text-lg font-black text-amber-600">${totalHonorer} <span class="text-[11px] font-normal text-slate-400">Org</span></div>
                    </div>
                </div>
                <div class="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-xs flex items-center gap-3">
                    <div class="w-10 h-10 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center text-lg flex-shrink-0">
                        <i class="fa-solid fa-award"></i>
                    </div>
                    <div class="min-w-0">
                        <div class="text-[10px] uppercase font-bold text-slate-400">Tugas Tambahan</div>
                        <div class="text-lg font-black text-purple-600">${totalTugas} <span class="text-[11px] font-normal text-slate-400">Aktif</span></div>
                    </div>
                </div>
                <div class="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-xs flex items-center gap-3">
                    <div class="w-10 h-10 rounded-xl bg-teal-50 text-teal-600 flex items-center justify-center text-lg flex-shrink-0">
                        <i class="fa-solid fa-camera"></i>
                    </div>
                    <div class="min-w-0">
                        <div class="text-[10px] uppercase font-bold text-slate-400">Foto Profil</div>
                        <div class="text-lg font-black text-teal-600">${totalFoto} <span class="text-[11px] font-normal text-slate-400">Lengkap</span></div>
                    </div>
                </div>
            </div>

            <!-- Toolbar Pencarian & Filter -->
            <div class="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs space-y-3">
                <div class="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
                    <!-- Search Input -->
                    <div class="relative flex-grow max-w-md">
                        <i class="fa-solid fa-magnifying-glass absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 text-xs"></i>
                        <input type="text" id="tendik-search-input" value="${Sec.esc(this.searchQuery)}"
                            oninput="ModulTendik.onSearch(this.value)"
                            placeholder="Cari nama, NIP, jabatan, atau tugas tambahan..."
                            class="w-full pl-9 pr-4 py-2 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 bg-slate-50 focus:bg-white transition">
                    </div>

                    <!-- Filter Dropdowns & View Mode -->
                    <div class="flex items-center gap-2 flex-wrap">
                        <!-- Status Kepegawaian Filter -->
                        <select onchange="ModulTendik.onStatusFilter(this.value)"
                            class="px-3 py-2 text-xs border border-slate-300 rounded-xl font-medium text-slate-700 bg-white">
                            <option value="all" ${this.statusFilter === "all" ? "selected" : ""}>Semua Status</option>
                            <option value="PNS" ${this.statusFilter === "PNS" ? "selected" : ""}>PNS</option>
                            <option value="PPPK" ${this.statusFilter === "PPPK" ? "selected" : ""}>PPPK</option>
                            <option value="PPPK PW" ${this.statusFilter === "PPPK PW" ? "selected" : ""}>PPPK PW</option>
                            <option value="PTT" ${this.statusFilter === "PTT" ? "selected" : ""}>PTT</option>
                            <option value="GTT" ${this.statusFilter === "GTT" ? "selected" : ""}>GTT</option>
                            <option value="Honorer" ${this.statusFilter === "Honorer" ? "selected" : ""}>Honorer</option>
                        </select>

                        <!-- Tugas Tambahan Filter -->
                        <select onchange="ModulTendik.onTugasFilter(this.value)"
                            class="px-3 py-2 text-xs border border-slate-300 rounded-xl font-medium text-slate-700 bg-white">
                            <option value="all" ${this.tugasFilter === "all" ? "selected" : ""}>Semua Tugas</option>
                            <option value="has_tugas" ${this.tugasFilter === "has_tugas" ? "selected" : ""}>Ada Tugas Tambahan</option>
                            <option value="Kepala Sekolah" ${this.tugasFilter === "Kepala Sekolah" ? "selected" : ""}>Kepala Sekolah</option>
                            <option value="Bendahara BOS" ${this.tugasFilter === "Bendahara BOS" ? "selected" : ""}>Bendahara BOS</option>
                            <option value="Pembina Pramuka Siaga" ${this.tugasFilter === "Pembina Pramuka Siaga" ? "selected" : ""}>Pembina Pramuka Siaga</option>
                            <option value="Pembina Pramuka Penggalang" ${this.tugasFilter === "Pembina Pramuka Penggalang" ? "selected" : ""}>Pembina Pramuka Penggalang</option>
                            <option value="Pembina Drum Band" ${this.tugasFilter === "Pembina Drum Band" ? "selected" : ""}>Pembina Drum Band</option>
                            <option value="Lainnya" ${this.tugasFilter === "Lainnya" ? "selected" : ""}>Tugas Lainnya</option>
                        </select>

                        <!-- Toggle View Mode Grid vs Table -->
                        <div class="inline-flex rounded-xl border border-slate-200 bg-slate-100 p-0.5">
                            <button type="button" onclick="ModulTendik.setViewMode('grid')"
                                class="px-3 py-1.5 rounded-lg text-xs font-semibold transition ${this.viewMode === "grid" ? "bg-white text-blue-900 shadow-xs" : "text-slate-500 hover:text-slate-900"}">
                                <i class="fa-solid fa-grip mr-1"></i> Kartu
                            </button>
                            <button type="button" onclick="ModulTendik.setViewMode('table')"
                                class="px-3 py-1.5 rounded-lg text-xs font-semibold transition ${this.viewMode === "table" ? "bg-white text-blue-900 shadow-xs" : "text-slate-500 hover:text-slate-900"}">
                                <i class="fa-solid fa-list mr-1"></i> Tabel
                            </button>
                        </div>

                        ${canEdit ? `
                            <button type="button" onclick="ModulTendik.openModal()"
                                class="px-3.5 py-2 bg-blue-900 hover:bg-blue-800 text-white rounded-xl text-xs font-bold transition inline-flex items-center gap-1.5 shadow-xs">
                                <i class="fa-solid fa-user-plus"></i> Tambah Guru/Tendik
                            </button>
                        ` : ''}

                        <button type="button" onclick="ModulTendik.printDirectory()"
                            class="px-3 py-2 bg-white hover:bg-slate-50 border border-slate-300 text-slate-700 rounded-xl text-xs font-semibold transition inline-flex items-center gap-1.5">
                            <i class="fa-solid fa-print text-blue-600"></i> Cetak Direktori
                        </button>
                    </div>
                </div>
            </div>

            <!-- Content Area: Grid Kartu atau Tabel -->
            ${this.viewMode === "grid" ? this.buildGridView(filtered, canEdit) : this.buildTableView(filtered, canEdit)}
        `;
    },

    // -------------------------------------------------------------------------
    // TAMPILAN GRID KARTU (MODERN CARDS)
    // -------------------------------------------------------------------------
    buildGridView(list, canEdit) {
        if (!list || list.length === 0) {
            return `
                <div class="bg-white p-12 text-center rounded-2xl border border-slate-200">
                    <i class="fa-regular fa-id-badge text-4xl text-slate-300 mb-2"></i>
                    <p class="text-xs font-semibold text-slate-600">Tidak ada data guru & tendik yang cocok dengan kriteria.</p>
                </div>
            `;
        }

        const cards = list.map(t => {
            const nipClean = Util.cleanId(t.nip);
            const statusPeg = t.statusKepegawaian || "PNS";
            const golDisplay = t.golJabatan || t.golongan || "-";
            
            // Jabatan dari Manajemen Akun (Sinkron)
            const jabatanAkun = Auth.getJabatanFromAccount ? Auth.getJabatanFromAccount(t) : "";
            const jabatanDisplay = jabatanAkun || t.jabatan || "Pendidik / Tenaga Kependidikan";

            // Status Badge Color
            let statusColor = "bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-950/60 dark:text-blue-300 dark:border-blue-800";
            if (statusPeg === "PPPK") statusColor = "bg-emerald-100 text-emerald-800 border-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800";
            else if (["PTT", "GTT", "HONORER"].includes(statusPeg.toUpperCase())) statusColor = "bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-800";

            // Tugas Tambahan Badge
            const tugasBadge = t.tugasTambahan ? `
                <div class="mt-2 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-bold bg-purple-50 text-purple-700 border border-purple-200/70 dark:bg-purple-950/60 dark:text-purple-300 dark:border-purple-800">
                    <i class="fa-solid fa-award text-purple-600 dark:text-purple-400"></i>
                    <span class="truncate max-w-[200px]" title="${Sec.esc(t.tugasTambahan)}">${Sec.esc(t.tugasTambahan)}</span>
                </div>
            ` : '';

            // Avatar / Foto Profil
            const avatarHtml = t.foto ? `
                <img src="${Sec.safeUrl(t.foto)}" alt="${Sec.esc(t.nama)}" class="w-16 h-16 rounded-2xl object-cover ring-2 ring-slate-100 dark:ring-slate-800 shadow-sm mx-auto">
            ` : `
                <div class="w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-700 to-indigo-900 text-white flex items-center justify-center text-xl font-black shadow-sm mx-auto">
                    ${this.getInitials(t.nama)}
                </div>
            `;

            return `
                <div class="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 hover:border-blue-300 dark:hover:border-blue-700 p-5 shadow-xs hover:shadow-md transition duration-200 flex flex-col justify-between relative group ${t.aktif === false ? "opacity-60 bg-slate-50 dark:bg-slate-800/40" : ""}">
                    <!-- Header Kartu: Status & Gender -->
                    <div class="flex items-center justify-between gap-2 mb-3">
                        <span class="px-2 py-0.5 rounded-full text-[10px] font-black border ${statusColor}">
                            ${Sec.esc(statusPeg)}
                        </span>
                        <span class="text-[10px] font-semibold text-slate-400 flex items-center gap-1">
                            <i class="fa-solid ${t.jk === "Perempuan" ? "fa-venus text-pink-500" : "fa-mars text-blue-500"}"></i>
                            ${Sec.esc(t.jk || "Laki-laki")}
                        </span>
                    </div>

                    <!-- Foto & Identitas -->
                    <div class="text-center">
                        <div class="relative inline-block mb-3">
                            ${avatarHtml}
                            ${t.foto ? `
                                <span class="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-teal-500 text-white flex items-center justify-center text-[9px] shadow" title="Foto Profil Tersedia">
                                    <i class="fa-solid fa-check"></i>
                                </span>
                            ` : `
                                <button type="button" onclick="ModulTendik.openModal('${Sec.esc(nipClean)}')" class="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-slate-200 hover:bg-blue-600 hover:text-white text-slate-600 flex items-center justify-center text-[9px] shadow transition" title="Unggah Foto Profil">
                                    <i class="fa-solid fa-camera"></i>
                                </button>
                            `}
                        </div>

                        <h4 class="font-bold text-sm text-slate-900 dark:text-slate-100 leading-snug line-clamp-2" title="${Sec.esc(t.nama)}">${Sec.esc(t.nama)}</h4>
                        <div class="font-mono text-[11px] text-slate-400 mt-0.5">
                            ${Sec.esc(t.nip || "-")}${t.nuptk ? ` <span class="text-slate-300 dark:text-slate-600">•</span> NUPTK: <span class="text-slate-600 dark:text-slate-300 font-semibold">${Sec.esc(t.nuptk)}</span>` : ''}
                        </div>

                        <!-- Jabatan & Golongan -->
                        <div class="mt-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                            <div class="text-xs font-semibold text-blue-950 dark:text-blue-300 flex items-center justify-center gap-1">
                                <i class="fa-solid fa-briefcase text-blue-600 dark:text-blue-400 text-[10px]"></i>
                                <span class="truncate">${Sec.esc(jabatanDisplay)}</span>
                            </div>
                            <div class="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                                <span class="font-medium">${Sec.esc(golDisplay)}</span>
                            </div>
                            ${(t.ijazah || t.jurusan) ? `
                                <div class="mt-1 text-[10px] text-indigo-900 dark:text-indigo-300 inline-flex items-center gap-1 bg-indigo-50/80 dark:bg-indigo-950/60 px-2 py-0.5 rounded-md border border-indigo-200/60 dark:border-indigo-800 max-w-[95%] truncate font-medium">
                                    <i class="fa-solid fa-graduation-cap text-indigo-600 dark:text-indigo-400 text-[10px]"></i>
                                    <span class="truncate">${Sec.esc(t.ijazah || '')} ${t.jurusan ? `• ${Sec.esc(t.jurusan)}` : ''}</span>
                                </div>
                            ` : ''}
                        </div>

                        <!-- Tugas Tambahan -->
                        ${tugasBadge}
                    </div>

                    <!-- Footer Kartu: Aksi Cepat -->
                    <div class="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-1.5">
                        <button type="button" onclick="ModulTendik.showQrCard('${Sec.esc(nipClean)}')"
                            class="px-2.5 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-semibold inline-flex items-center gap-1.5 transition">
                            <i class="fa-solid fa-qrcode text-indigo-600 dark:text-indigo-400"></i> QR
                        </button>

                        <div class="flex items-center gap-1">
                            ${canEdit ? `
                                <button type="button" onclick="ModulTendik.openModal('${Sec.esc(nipClean)}')"
                                    class="px-3 py-1.5 rounded-xl bg-blue-50 hover:bg-blue-100 dark:bg-blue-950/60 dark:hover:bg-blue-900 dark:text-blue-300 text-blue-700 text-xs font-bold inline-flex items-center gap-1.5 transition" title="Ubah Profil & Foto">
                                    <i class="fa-solid fa-user-pen"></i> Ubah
                                </button>
                                <button type="button" onclick="ModulTendik.hapusTendik('${Sec.esc(nipClean)}', '${Sec.esc(t.nama)}')"
                                    class="p-1.5 rounded-xl text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/50 hover:text-rose-700 dark:hover:text-rose-300 text-xs transition" title="Hapus Tendik">
                                    <i class="fa-solid fa-trash-can"></i>
                                </button>
                            ` : `
                                <span class="text-[11px] text-slate-400 font-medium">Terdaftar</span>
                            `}
                        </div>
                    </div>
                </div>
            `;
        }).join("");

        return `<div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">${cards}</div>`;
    },

    // -------------------------------------------------------------------------
    // TAMPILAN TABEL RESPOCIVE
    // -------------------------------------------------------------------------
    buildTableView(list, canEdit) {
        if (!list || list.length === 0) {
            return `
                <div class="bg-white p-12 text-center rounded-2xl border border-slate-200">
                    <p class="text-xs font-semibold text-slate-400">Tidak ada data guru & tendik yang cocok.</p>
                </div>
            `;
        }

        const rows = list.map((t, idx) => {
            const nipClean = Util.cleanId(t.nip);
            const statusPeg = t.statusKepegawaian || "PNS";
            const golDisplay = t.golJabatan || t.golongan || "-";
            const jabatanAkun = Auth.getJabatanFromAccount ? Auth.getJabatanFromAccount(t) : "";
            const jabatanDisplay = jabatanAkun || t.jabatan || "-";

            const avatarImg = t.foto ? `
                <img src="${Sec.safeUrl(t.foto)}" alt="${Sec.esc(t.nama)}" class="w-8 h-8 rounded-lg object-cover ring-1 ring-slate-200">
            ` : `
                <div class="w-8 h-8 rounded-lg bg-blue-800 text-white flex items-center justify-center text-xs font-bold">
                    ${this.getInitials(t.nama)}
                </div>
            `;

            return `
                <tr class="hover:bg-slate-50 transition text-xs">
                    <td class="px-3.5 py-3 text-center text-slate-400 font-mono">${idx + 1}</td>
                    <td class="px-3.5 py-3">
                        <div class="flex items-center gap-2.5">
                            ${avatarImg}
                            <div>
                                <div class="font-bold text-slate-900">${Sec.esc(t.nama)}</div>
                                <div class="font-mono text-[10px] text-slate-400">
                                    NIP: ${Sec.esc(t.nip || "-")}${t.nuptk ? ` • NUPTK: <span class="text-slate-600 font-semibold">${Sec.esc(t.nuptk)}</span>` : ''}
                                </div>
                            </div>
                        </div>
                    </td>
                    <td class="px-3.5 py-3 font-semibold text-blue-950">${Sec.esc(jabatanDisplay)}</td>
                    <td class="px-3.5 py-3 text-slate-600">${Sec.esc(golDisplay)}</td>
                    <td class="px-3.5 py-3 text-slate-600">
                        ${t.ijazah ? `<span class="font-bold text-slate-800">${Sec.esc(t.ijazah)}</span>` : '<span class="text-slate-300">-</span>'}
                        ${t.jurusan ? `<div class="text-[10px] text-slate-400 truncate max-w-[150px]" title="${Sec.esc(t.jurusan)}">${Sec.esc(t.jurusan)}</div>` : ''}
                    </td>
                    <td class="px-3.5 py-3">
                        <span class="px-2 py-0.5 rounded text-[10px] font-bold ${statusPeg === "PPPK" ? "bg-emerald-100 text-emerald-800" : (statusPeg === "PPPK PW" ? "bg-teal-100 text-teal-800" : (statusPeg === "PNS" ? "bg-blue-100 text-blue-800" : "bg-amber-100 text-amber-800"))}">
                            ${Sec.esc(statusPeg)}
                        </span>
                    </td>
                    <td class="px-3.5 py-3">
                        ${t.tugasTambahan ? `
                            <span class="px-2 py-0.5 rounded text-[10px] font-bold bg-purple-100 text-purple-800 inline-flex items-center gap-1">
                                <i class="fa-solid fa-award"></i> ${Sec.esc(t.tugasTambahan)}
                            </span>
                        ` : `<span class="text-slate-300">-</span>`}
                    </td>
                    <td class="px-3.5 py-3 text-slate-500">${Sec.esc(t.jk || "Laki-laki")}</td>
                    <td class="px-3.5 py-3 text-right">
                        <div class="flex items-center justify-end gap-1">
                            <button type="button" onclick="ModulTendik.showQrCard('${Sec.esc(nipClean)}')"
                                class="p-1.5 rounded-lg text-slate-600 hover:bg-slate-100" title="QR Presensi">
                                <i class="fa-solid fa-qrcode text-indigo-600"></i>
                            </button>
                            ${canEdit ? `
                                <button type="button" onclick="ModulTendik.openModal('${Sec.esc(nipClean)}')"
                                    class="p-1.5 rounded-lg text-blue-600 hover:bg-blue-50 font-bold" title="Ubah Profil">
                                    <i class="fa-solid fa-user-pen"></i>
                                </button>
                                <button type="button" onclick="ModulTendik.hapusTendik('${Sec.esc(nipClean)}', '${Sec.esc(t.nama)}')"
                                    class="p-1.5 rounded-lg text-rose-600 hover:bg-rose-50" title="Hapus Tendik">
                                    <i class="fa-solid fa-trash-can"></i>
                                </button>
                            ` : ''}
                        </div>
                    </td>
                </tr>
            `;
        }).join("");

        return `
            <div class="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
                <div class="overflow-x-auto">
                    <table class="w-full text-left border-collapse">
                        <thead class="bg-slate-50 text-[11px] uppercase tracking-wider text-slate-500 border-b border-slate-200">
                            <tr>
                                <th class="px-3.5 py-3 text-center">No</th>
                                <th class="px-3.5 py-3">Nama & NIP</th>
                                <th class="px-3.5 py-3">Jabatan</th>
                                <th class="px-3.5 py-3">Golongan / Jabatan</th>
                                <th class="px-3.5 py-3">Ijazah & Jurusan</th>
                                <th class="px-3.5 py-3">Status</th>
                                <th class="px-3.5 py-3">Tugas Tambahan</th>
                                <th class="px-3.5 py-3">JK</th>
                                <th class="px-3.5 py-3 text-right">Aksi</th>
                            </tr>
                        </thead>
                        <tbody class="divide-y divide-slate-100">
                            ${rows}
                        </tbody>
                    </table>
                </div>
            </div>
        `;
    },

    // -------------------------------------------------------------------------
    // DIALOG FORM TAMBAH / UBAH GURU & TENDIK
    // -------------------------------------------------------------------------
    openModal(nip = "") {
        const cleanNip = Util.cleanId(nip);
        const t = cleanNip ? (DataStore.getTendik() || []).find(x => Util.cleanId(x.nip) === cleanNip) : null;
        this.tempPhotoBase64 = t?.foto || "";

        let modal = document.getElementById("modal-edit-tendik");
        if (!modal) {
            modal = document.createElement("div");
            modal.id = "modal-edit-tendik";
            modal.className = "fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 hidden";
            document.body.appendChild(modal);
        }

        const v = k => Sec.esc(t ? (t[k] || "") : "");

        // Perbaiki Golongan jika pernah terkontaminasi status PPPK/PNS lama
        let rawGol = t ? (t.golJabatan || t.golongan || "") : "";
        if (rawGol && rawGol.toUpperCase() === (t?.statusKepegawaian || "").toUpperCase()) {
            if (t?.statusKepegawaian === "PPPK") rawGol = "IX / Guru Kelas";
            else if (t?.statusKepegawaian === "PNS") rawGol = "Penata Muda / IIIa";
        }
        if (!rawGol && t?.jabatan) rawGol = t.jabatan;

        // Ambil Jabatan yang sinkron dari akun login jika ada
        const jabatanFromAkun = Auth.getJabatanFromAccount ? Auth.getJabatanFromAccount(t || {}) : "";
        const curJabatan = v("jabatan") || jabatanFromAkun || "";

        // Status Tugas Tambahan
        const curTugas = t?.tugasTambahan || "";
        const isPresetTugas = this.TUGAS_PRESETS.includes(curTugas);
        const isCustomTugas = curTugas && !isPresetTugas;

        modal.innerHTML = `
            <div class="bg-white rounded-3xl max-w-lg w-full p-5 sm:p-6 shadow-2xl border border-slate-200 space-y-4 max-h-[92vh] overflow-y-auto">
                <div class="flex items-center justify-between border-b border-slate-100 pb-3">
                    <div>
                        <h3 class="font-bold text-base text-slate-900">${t ? "Ubah Data Guru / Tendik" : "Tambah Guru & Tendik Baru"}</h3>
                        <p class="text-xs text-slate-400 mt-0.5">Lengkapi profil kepegawaian, foto profil, dan penugasan tambahan.</p>
                    </div>
                    <button type="button" onclick="ModulTendik.closeModal()" class="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 flex items-center justify-center transition">
                        <i class="fa-solid fa-xmark"></i>
                    </button>
                </div>

                <!-- Bagian 1: Foto Profil & Upload -->
                <div class="p-3.5 bg-slate-50 rounded-2xl border border-slate-200/80 flex flex-col sm:flex-row items-center gap-4">
                    <div class="relative flex-shrink-0">
                        <div id="tendik-modal-photo-preview" class="w-20 h-20 rounded-2xl bg-gradient-to-br from-blue-700 to-indigo-900 text-white flex items-center justify-center text-2xl font-black shadow-md overflow-hidden ring-2 ring-white">
                            ${this.tempPhotoBase64 ? `<img src="${this.tempPhotoBase64}" class="w-full h-full object-cover">` : this.getInitials(t?.nama || "Guru")}
                        </div>
                    </div>
                    <div class="space-y-1.5 text-center sm:text-left flex-grow">
                        <div class="text-xs font-bold text-slate-800">Foto Profil Guru & Tendik</div>
                        <p class="text-[11px] text-slate-400 leading-tight">Mendukung format JPG, PNG, atau WEBP. Gambar otomatis dikompresi untuk kecepatan akses.</p>
                        <div class="flex items-center justify-center sm:justify-start gap-2 pt-1">
                            <input type="file" id="tendik-modal-file-input" accept="image/*" class="hidden" onchange="ModulTendik.handlePhotoSelect(event)">
                            <button type="button" onclick="document.getElementById('tendik-modal-file-input').click()"
                                class="px-3 py-1.5 bg-blue-900 hover:bg-blue-800 text-white rounded-xl text-xs font-bold inline-flex items-center gap-1.5 transition shadow-xs">
                                <i class="fa-solid fa-upload"></i> Unggah Foto
                            </button>
                            <button type="button" onclick="ModulTendik.removePhoto()"
                                class="px-2.5 py-1.5 bg-slate-200 hover:bg-rose-100 hover:text-rose-700 text-slate-600 rounded-xl text-xs font-semibold transition" title="Hapus Foto">
                                <i class="fa-solid fa-trash-can"></i>
                            </button>
                        </div>
                    </div>
                </div>

                <!-- Bagian 2: Data Pribadi & Kepegawaian -->
                <div class="space-y-3">
                    <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                            <label class="block text-xs font-bold text-slate-700 mb-1">NIP / ID Pegawai <span class="text-red-500">*</span></label>
                            <input id="mt-nip" ${t ? "readonly" : ""} value="${v("nip")}" maxlength="40" placeholder="19820820 200604 1 008"
                                class="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl font-mono ${t ? "bg-slate-50 cursor-not-allowed" : "focus:ring-2 focus:ring-blue-500"}">
                            <p class="text-[10px] text-slate-400 mt-0.5">4–40 karakter huruf/angka.</p>
                        </div>
                        <div>
                            <label class="block text-xs font-bold text-slate-700 mb-1">NUPTK</label>
                            <input id="mt-nuptk" value="${v("nuptk")}" maxlength="25" placeholder="Contoh: 1234567890123456"
                                class="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl font-mono focus:ring-2 focus:ring-blue-500">
                            <p class="text-[10px] text-slate-400 mt-0.5">Nomor Unik Pendidik & Tenaga Kependidikan.</p>
                        </div>
                    </div>

                    <div>
                        <label class="block text-xs font-bold text-slate-700 mb-1">Nama Lengkap & Gelar <span class="text-red-500">*</span></label>
                        <input id="mt-nama" value="${v("nama")}" placeholder="Contoh: Sri Wahyuni, S.Pd.SD"
                            class="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 font-medium text-slate-900">
                    </div>

                    <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                            <label class="block text-xs font-bold text-slate-700 mb-1">Status Kepegawaian</label>
                            <select id="mt-status" class="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl font-bold text-slate-800 bg-white">
                                <option value="PNS" ${(v("statusKepegawaian") === "PNS" || !t) ? "selected" : ""}>PNS</option>
                                <option value="PPPK" ${v("statusKepegawaian") === "PPPK" ? "selected" : ""}>PPPK</option>
                                <option value="PPPK PW" ${v("statusKepegawaian") === "PPPK PW" ? "selected" : ""}>PPPK PW</option>
                                <option value="PTT" ${v("statusKepegawaian") === "PTT" ? "selected" : ""}>PTT</option>
                                <option value="GTT" ${v("statusKepegawaian") === "GTT" ? "selected" : ""}>GTT</option>
                                <option value="Honorer" ${v("statusKepegawaian") === "Honorer" ? "selected" : ""}>Honorer</option>
                            </select>
                        </div>
                        <div>
                            <label class="block text-xs font-bold text-slate-700 mb-1">Golongan / Jabatan</label>
                            <input id="mt-gol-jabatan" value="${Sec.esc(rawGol)}" 
                                placeholder="Contoh: IX / Guru Kelas atau Penata Muda / IIIa" 
                                class="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl font-medium text-slate-800 focus:ring-2 focus:ring-blue-500">
                        </div>
                    </div>

                    <!-- Bagian Ijazah Terakhir & Jurusan (Sesuai Revisi Item 2) -->
                    <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                            <label class="block text-xs font-bold text-slate-700 mb-1">Ijazah Terakhir</label>
                            <select id="mt-ijazah" class="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl font-bold text-slate-800 bg-white">
                                <option value="" ${!t?.ijazah ? "selected" : ""}>- Pilih Ijazah -</option>
                                <option value="SD" ${t?.ijazah === "SD" ? "selected" : ""}>SD</option>
                                <option value="SMP" ${t?.ijazah === "SMP" ? "selected" : ""}>SMP</option>
                                <option value="MA/SMA/SMK" ${t?.ijazah === "MA/SMA/SMK" ? "selected" : ""}>MA/SMA/SMK</option>
                                <option value="D1" ${t?.ijazah === "D1" ? "selected" : ""}>D1</option>
                                <option value="D2" ${t?.ijazah === "D2" ? "selected" : ""}>D2</option>
                                <option value="D3" ${t?.ijazah === "D3" ? "selected" : ""}>D3</option>
                                <option value="D4" ${t?.ijazah === "D4" ? "selected" : ""}>D4</option>
                                <option value="S1" ${t?.ijazah === "S1" ? "selected" : ""}>S1</option>
                                <option value="S2" ${t?.ijazah === "S2" ? "selected" : ""}>S2</option>
                                <option value="S3" ${t?.ijazah === "S3" ? "selected" : ""}>S3</option>
                            </select>
                        </div>
                        <div>
                            <label class="block text-xs font-bold text-slate-700 mb-1">Jurusan</label>
                            <input id="mt-jurusan" value="${v("jurusan")}" 
                                placeholder="Contoh: PGSD / PAI / Administrasi Perkantoran" 
                                class="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl font-medium text-slate-800 focus:ring-2 focus:ring-blue-500">
                        </div>
                    </div>

                    <!-- Bagian 3: Jabatan & Sinkronisasi Manajemen Akun -->
                    <div>
                        <div class="flex items-center justify-between mb-1">
                            <label class="block text-xs font-bold text-slate-700">Jabatan Pokok (Terkoneksi Akun)</label>
                            ${jabatanFromAkun ? `
                                <span class="text-[10px] text-emerald-700 font-semibold bg-emerald-50 px-2 py-0.5 rounded-full inline-flex items-center gap-1 border border-emerald-200">
                                    <i class="fa-solid fa-link"></i> Terdeteksi di Manajemen Akun: ${Sec.esc(jabatanFromAkun)}
                                </span>
                            ` : ''}
                        </div>
                        <div class="flex gap-2">
                            <input id="mt-jabatan" value="${Sec.esc(curJabatan)}" placeholder="Guru Kelas 3 / Tenaga Administrasi / Pengelola Perpustakaan"
                                class="flex-grow px-3 py-2 text-xs border border-slate-300 rounded-xl font-medium text-slate-900 focus:ring-2 focus:ring-blue-500">
                            <button type="button" onclick="ModulTendik.syncJabatanFromAccount()"
                                class="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold inline-flex items-center gap-1 transition"
                                title="Ambil Jabatan Sesuai Akun Login Pengguna">
                                <i class="fa-solid fa-arrows-rotate text-blue-600"></i> Ambil dari Akun
                            </button>
                        </div>
                    </div>

                    <!-- Bagian 4: Tugas Tambahan (Sesuai Revisi) -->
                    <div>
                        <label class="block text-xs font-bold text-slate-700 mb-1">Tugas Tambahan</label>
                        <select id="mt-tugas-select" onchange="ModulTendik.onTugasSelectChange(this.value)"
                            class="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl font-semibold text-slate-800 bg-white">
                            <option value="" ${!curTugas ? "selected" : ""}>- Tidak Ada Tugas Tambahan -</option>
                            <option value="Kepala Sekolah" ${curTugas === "Kepala Sekolah" ? "selected" : ""}>Kepala Sekolah</option>
                            <option value="Bendahara BOS" ${curTugas === "Bendahara BOS" ? "selected" : ""}>Bendahara BOS</option>
                            <option value="Pembina Pramuka Siaga" ${curTugas === "Pembina Pramuka Siaga" ? "selected" : ""}>Pembina Pramuka Siaga</option>
                            <option value="Pembina Pramuka Penggalang" ${curTugas === "Pembina Pramuka Penggalang" ? "selected" : ""}>Pembina Pramuka Penggalang</option>
                            <option value="Pembina Drum Band" ${curTugas === "Pembina Drum Band" ? "selected" : ""}>Pembina Drum Band</option>
                            <option value="custom" ${isCustomTugas ? "selected" : ""}>Tugas Tambahan Lainnya...</option>
                        </select>
                        <div id="mt-tugas-custom-box" class="mt-2 ${isCustomTugas ? "" : "hidden"}">
                            <input type="text" id="mt-tugas-custom" value="${isCustomTugas ? Sec.esc(curTugas) : ""}"
                                placeholder="Ketik nama tugas tambahan lainnya, contoh: Operator Dapodik / Koordinator UKS"
                                class="w-full px-3 py-2 text-xs border border-purple-300 bg-purple-50/50 rounded-xl focus:ring-2 focus:ring-purple-500 font-medium">
                        </div>
                    </div>

                    <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                            <label class="block text-xs font-bold text-slate-700 mb-1">Jenis Kelamin</label>
                            <select id="mt-jk" class="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl bg-white">
                                <option value="Laki-laki" ${(!t || t.jk !== "Perempuan") ? "selected" : ""}>Laki-laki</option>
                                <option value="Perempuan" ${(t && t.jk === "Perempuan") ? "selected" : ""}>Perempuan</option>
                            </select>
                        </div>
                        <div>
                            <label class="block text-xs font-bold text-slate-700 mb-1">No. WhatsApp / HP</label>
                            <input id="mt-nohp" value="${v("noHp")}" placeholder="08xxxxxxxxxx"
                                class="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl">
                        </div>
                    </div>

                    <label class="flex items-center gap-2 text-xs font-medium text-slate-700 pt-1 cursor-pointer">
                        <input type="checkbox" id="mt-aktif" ${!t || t.aktif !== false ? "checked" : ""} class="rounded text-blue-900">
                        Status Aktif (Tercatat dalam daftar presensi & direktori aktif)
                    </label>
                </div>

                <!-- Footer Modal -->
                <div class="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100">
                    <button type="button" onclick="ModulTendik.closeModal()"
                        class="px-4 py-2 border border-slate-200 text-slate-600 rounded-xl text-xs font-semibold hover:bg-slate-50 transition">
                        Batal
                    </button>
                    <button type="button" onclick="ModulTendik.saveModal()" id="btn-save-tendik-modal"
                        class="px-5 py-2 bg-blue-900 hover:bg-blue-800 text-white rounded-xl text-xs font-bold transition inline-flex items-center gap-1.5 shadow-sm">
                        <i class="fa-solid fa-floppy-disk"></i> Simpan Data Tendik
                    </button>
                </div>
            </div>
        `;

        modal.classList.remove("hidden");
    },

    closeModal() {
        const modal = document.getElementById("modal-edit-tendik");
        if (modal) modal.classList.add("hidden");
    },

    onTugasSelectChange(val) {
        const box = document.getElementById("mt-tugas-custom-box");
        if (box) {
            box.classList.toggle("hidden", val !== "custom");
            if (val === "custom") {
                const inp = document.getElementById("mt-tugas-custom");
                if (inp) inp.focus();
            }
        }
    },

    syncJabatanFromAccount() {
        const nip = document.getElementById("mt-nip")?.value?.trim() || "";
        const nama = document.getElementById("mt-nama")?.value?.trim() || "";
        const jab = Auth.getJabatanFromAccount ? Auth.getJabatanFromAccount({ nip, nama }) : "";
        if (jab) {
            const inp = document.getElementById("mt-jabatan");
            if (inp) inp.value = jab;
            App.showToast(`Jabatan disinkronkan dari akun: ${jab}`, "success");
        } else {
            App.showToast("Belum ada akun login yang cocok dengan nama/NIP ini di Manajemen Akun.", "warning");
        }
    },

    // -------------------------------------------------------------------------
    // UPLOAD & KOMPRESI FOTO PROFIL
    // -------------------------------------------------------------------------
    handlePhotoSelect(e) {
        const file = e.target.files && e.target.files[0];
        if (!file) return;

        if (!file.type.startsWith("image/")) {
            App.showToast("File yang dipilih harus berupa gambar (JPG, PNG, WEBP).", "error");
            return;
        }

        const reader = new FileReader();
        reader.onload = (ev) => {
            const img = new Image();
            img.onload = () => {
                // Resize & kompresi ke canvas maksimal 400x400
                const canvas = document.createElement("canvas");
                let width = img.width;
                let height = img.height;
                const maxDim = 400;

                if (width > height && width > maxDim) {
                    height = Math.round((height * maxDim) / width);
                    width = maxDim;
                } else if (height > maxDim) {
                    width = Math.round((width * maxDim) / height);
                    height = maxDim;
                }

                canvas.width = width;
                canvas.height = height;
                const ctx = canvas.getContext("2d");
                ctx.drawImage(img, 0, 0, width, height);
                const compressedDataUrl = canvas.toDataURL("image/jpeg", 0.85);

                this.tempPhotoBase64 = compressedDataUrl;
                const previewEl = document.getElementById("tendik-modal-photo-preview");
                if (previewEl) {
                    previewEl.innerHTML = `<img src="${compressedDataUrl}" class="w-full h-full object-cover">`;
                }
                App.showToast("Foto profil berhasil dipilih & siap disimpan.", "success");
            };
            img.src = ev.target.result;
        };
        reader.readAsDataURL(file);
    },

    removePhoto() {
        this.tempPhotoBase64 = "";
        const nama = document.getElementById("mt-nama")?.value?.trim() || "Guru";
        const previewEl = document.getElementById("tendik-modal-photo-preview");
        if (previewEl) {
            previewEl.innerHTML = this.getInitials(nama);
        }
        App.showToast("Foto profil direset ke avatar inisial.", "info");
    },

    // -------------------------------------------------------------------------
    // SIMPAN DATA GURU & TENDIK
    // -------------------------------------------------------------------------
    async saveModal() {
        const g = id => document.getElementById(id)?.value?.trim() || "";
        const nip = g("mt-nip");
        const nama = g("mt-nama");

        if (!/^[A-Za-z0-9._\- ]{4,50}$/.test(nip) || !/^[A-Za-z0-9._-]{4,40}$/.test(Util.cleanId(nip))) {
            App.showToast("NIP/ID harus 4–40 karakter huruf, angka, titik, atau strip.", "error");
            return;
        }
        if (!nama) {
            App.showToast("Nama lengkap wajib diisi.", "error");
            return;
        }

        const tugasSelect = g("mt-tugas-select");
        let tugasTambahan = tugasSelect;
        if (tugasSelect === "custom") {
            tugasTambahan = g("mt-tugas-custom");
        }

        const golJabatan = g("mt-gol-jabatan") || "-";
        const jabatan = g("mt-jabatan") || golJabatan;
        const statusKepegawaian = g("mt-status") || "PNS";
        const nuptk = g("mt-nuptk");

        const tendikData = {
            nip,
            nuptk,
            nama,
            jabatan,
            golJabatan,
            golongan: golJabatan,
            statusKepegawaian,
            tugasTambahan,
            foto: this.tempPhotoBase64 || "",
            ijazah: g("mt-ijazah"),
            jurusan: g("mt-jurusan"),
            jk: g("mt-jk") || "Laki-laki",
            noHp: g("mt-nohp"),
            aktif: document.getElementById("mt-aktif")?.checked !== false
        };

        const btn = document.getElementById("btn-save-tendik-modal");
        if (btn) {
            btn.disabled = true;
            btn.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i> Menyimpan...`;
        }

        // Simpan langsung ke DataStore lokal instan
        const list = DataStore.getTendik();
        const cleanKey = Util.cleanId(nip);
        const idx = list.findIndex(x => Util.cleanId(x.nip) === cleanKey);
        if (idx >= 0) list[idx] = { ...list[idx], ...tendikData };
        else list.push(tendikData);
        DataStore.saveTendik(list);

        // Kirim ke backend (GAS / Local fallback)
        const res = await ApiClient.request("saveTendik", {
            ...tendikData,
            tendik: tendikData,
            list: [tendikData]
        });

        if (btn) {
            btn.disabled = false;
            btn.innerHTML = `<i class="fa-solid fa-floppy-disk"></i> Simpan Data Tendik`;
        }

        this.closeModal();
        this.renderTable();
        if (window.ModulPresensi && ModulPresensi.renderQR) {
            ModulPresensi.renderQR();
        }

        App.showToast(res.message || `Data ${nama} berhasil disimpan!`, "success");
    },

    async hapusTendik(nipClean, nama) {
        const ok = await App.confirmDialog({
            title: "Hapus Data Guru / Tendik?",
            message: `Data kepegawaian, kartu ID, dan riwayat presensi ${nama} akan dihapus dari sistem.`,
            itemHighlight: `${nama} (NIP/ID: ${nipClean})`,
            badgeLabel: "Guru / Tenaga Kependidikan",
            note: "Data yang dihapus tidak dapat dipulihkan kembali.",
            confirmText: "Ya, Hapus Data",
            cancelText: "Batal",
            icon: "fa-trash-can",
            type: "danger"
        });
        if (!ok) return;
        const res = await ApiClient.request("deleteTendik", { nip: nipClean });
        if (res && res.success) {
            App.showToast(res.message || `Data ${nama} berhasil dihapus.`, "success");
            this.renderTable();
            if (window.ModulPresensi && ModulPresensi.renderQR) ModulPresensi.renderQR();
        } else {
            App.showToast((res && res.message) || "Gagal menghapus data.", "error");
        }
    },

    showQrCard(nipClean) {
        const clean = Util.cleanId(nipClean);
        const list = (typeof DataStore !== "undefined" && DataStore.getTendik) ? DataStore.getTendik() : [];
        const t = list.find(x => Util.cleanId(x.nip) === clean);
        if (!t) {
            if (window.App && App.showToast) App.showToast("Data Guru/Tendik tidak ditemukan.", "error");
            return;
        }
        this.openQrModal(t);
    },

    openQrModal(t) {
        if (!t) return;
        const nipClean = Util.cleanId(t.nip);
        const config = (typeof DataStore !== "undefined" && DataStore.getConfig) ? DataStore.getConfig() : {};
        const namaSekolah = config.namaSekolah || "SD NEGERI TERLANGU 01";
        const jabatanAkun = (typeof Auth !== "undefined" && Auth.getJabatanFromAccount) ? Auth.getJabatanFromAccount(t) : "";
        const jabatanDisplay = jabatanAkun || t.jabatan || "Pendidik / Tenaga Kependidikan";
        const statusPeg = t.statusKepegawaian || "PNS";
        const golDisplay = t.golJabatan || t.golongan || "-";
        const payload = (window.ModulPresensi && ModulPresensi.qrPayload) ? ModulPresensi.qrPayload(t) : `SEKOLAHTU|T|${nipClean}`;

        let statusBadgeClass = "bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-950/60 dark:text-blue-300 dark:border-blue-800";
        if (statusPeg === "PPPK") statusBadgeClass = "bg-emerald-100 text-emerald-800 border-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800";
        else if (["PTT", "GTT", "HONORER"].includes(statusPeg.toUpperCase())) statusBadgeClass = "bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-800";

        const avatarHtml = t.foto ? `
            <img src="${Sec.safeUrl(t.foto)}" alt="${Sec.esc(t.nama)}" class="w-14 h-14 rounded-2xl object-cover ring-2 ring-slate-200 dark:ring-slate-700 shadow-sm flex-shrink-0">
        ` : `
            <div class="w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-700 to-indigo-900 text-white flex items-center justify-center text-lg font-black shadow-sm flex-shrink-0">
                ${this.getInitials(t.nama)}
            </div>
        `;

        let modal = document.getElementById("modal-qr-tendik");
        if (!modal) {
            modal = document.createElement("div");
            modal.id = "modal-qr-tendik";
            modal.className = "fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4";
            modal.onclick = (e) => {
                if (e.target === modal) ModulTendik.closeQrModal();
            };
            document.body.appendChild(modal);
        }

        modal.innerHTML = `
            <div class="bg-white dark:bg-slate-900 rounded-3xl max-w-md w-full p-5 sm:p-6 shadow-2xl border border-slate-200 dark:border-slate-800 space-y-4 max-h-[92vh] overflow-y-auto animate-fade-in" onclick="event.stopPropagation()">
                <!-- Header -->
                <div class="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
                    <div class="flex items-center gap-2.5">
                        <div class="w-9 h-9 rounded-xl bg-indigo-50 dark:bg-indigo-950/70 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-bold shadow-xs">
                            <i class="fa-solid fa-qrcode text-lg"></i>
                        </div>
                        <div>
                            <h3 class="font-bold text-sm sm:text-base text-slate-900 dark:text-white">Kartu QR Presensi Pegawai</h3>
                            <p class="text-[11px] text-slate-400">${Sec.esc(namaSekolah)}</p>
                        </div>
                    </div>
                    <button type="button" onclick="ModulTendik.closeQrModal()" class="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-500 dark:text-slate-300 flex items-center justify-center transition cursor-pointer">
                        <i class="fa-solid fa-xmark"></i>
                    </button>
                </div>

                <!-- Profil Tendik Card -->
                <div class="p-3.5 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-200/80 dark:border-slate-700/80 flex items-center gap-3.5">
                    ${avatarHtml}
                    <div class="min-w-0 flex-1">
                        <div class="flex items-center gap-1.5 flex-wrap">
                            <span class="px-2 py-0.5 rounded-full text-[10px] font-bold border ${statusBadgeClass}">${Sec.esc(statusPeg)}</span>
                            <span class="text-[11px] font-semibold text-slate-600 dark:text-slate-400">${Sec.esc(golDisplay)}</span>
                        </div>
                        <h4 class="font-extrabold text-sm text-slate-900 dark:text-white truncate mt-0.5" title="${Sec.esc(t.nama)}">${Sec.esc(t.nama)}</h4>
                        <div class="text-[11px] text-blue-900 dark:text-blue-300 font-medium truncate">${Sec.esc(jabatanDisplay)}</div>
                        <div class="font-mono text-[10px] text-slate-400 mt-0.5">NIP: ${Sec.esc(t.nip || "-")} ${t.nuptk ? `• NUPTK: ${Sec.esc(t.nuptk)}` : ''}</div>
                    </div>
                </div>

                <!-- QR Code Box -->
                <div class="bg-gradient-to-b from-slate-50 to-indigo-50/40 dark:from-slate-800/40 dark:to-indigo-950/20 p-5 rounded-2xl border border-indigo-100/80 dark:border-indigo-900/40 text-center space-y-3">
                    <div class="bg-white p-3 rounded-2xl inline-block mx-auto shadow-md border border-slate-100 ring-4 ring-indigo-50/50 dark:ring-indigo-900/20">
                        <div id="tendik-qr-canvas-holder" class="flex items-center justify-center min-w-[180px] min-h-[180px]"></div>
                    </div>
                    <div>
                        <div class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 text-xs font-mono font-bold">
                            <i class="fa-solid fa-fingerprint text-indigo-500"></i> ${Sec.esc(payload)}
                        </div>
                        <p class="text-[11px] text-slate-500 dark:text-slate-400 mt-1.5">
                            Gunakan QR Code ini saat presensi datang & pulang di pemindai SEKOLAHTU.
                        </p>
                    </div>
                </div>

                <!-- Tombol Aksi -->
                <div class="flex items-center justify-between gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                    <button type="button" onclick="ModulTendik.closeQrModal()" class="px-4 py-2 rounded-xl text-xs font-semibold bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 transition cursor-pointer">
                        Tutup
                    </button>
                    <div class="flex items-center gap-2">
                        <a id="btn-tendik-download-qr" download="QR_${Sec.esc(nipClean)}.png" href="#" class="px-3.5 py-2 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white inline-flex items-center gap-1.5 shadow-sm transition cursor-pointer">
                            <i class="fa-solid fa-download"></i> Unduh PNG
                        </a>
                        <button type="button" onclick="ModulTendik.printSingleQrPocket('${Sec.esc(nipClean)}')" class="px-3.5 py-2 rounded-xl text-xs font-bold bg-amber-400 hover:bg-amber-300 text-blue-950 inline-flex items-center gap-1.5 shadow-sm transition cursor-pointer">
                            <i class="fa-solid fa-print"></i> Cetak Kartu
                        </button>
                    </div>
                </div>
            </div>
        `;

        modal.classList.remove("hidden");

        // Render QR Code via QRCode library
        const holder = document.getElementById("tendik-qr-canvas-holder");
        if (holder && typeof QRCode !== "undefined") {
            holder.innerHTML = "";
            new QRCode(holder, {
                text: payload,
                width: 180,
                height: 180,
                correctLevel: QRCode.CorrectLevel.H
            });

            // Set Download URL after canvas is rendered
            setTimeout(() => {
                const canvas = holder.querySelector("canvas");
                const img = holder.querySelector("img");
                const dlBtn = document.getElementById("btn-tendik-download-qr");
                if (dlBtn) {
                    const dataUrl = canvas ? canvas.toDataURL("image/png") : (img ? img.src : "");
                    if (dataUrl) dlBtn.href = dataUrl;
                }
            }, 100);
        }
    },

    closeQrModal() {
        const modal = document.getElementById("modal-qr-tendik");
        if (modal) modal.classList.add("hidden");
    },

    async printSingleQrPocket(nipClean) {
        const clean = Util.cleanId(nipClean);
        const list = (typeof DataStore !== "undefined" && DataStore.getTendik) ? DataStore.getTendik() : [];
        const t = list.find(x => Util.cleanId(x.nip) === clean);
        if (!t) return;

        const config = (typeof DataStore !== "undefined" && DataStore.getConfig) ? DataStore.getConfig() : {};
        const namaSekolah = config.namaSekolah || "SD NEGERI TERLANGU 01";
        const ta = (window.App && App.selectedTA) || config.tahunAjaran || "2026/2027";
        const jabatanAkun = (typeof Auth !== "undefined" && Auth.getJabatanFromAccount) ? Auth.getJabatanFromAccount(t) : "";
        const jabatan = jabatanAkun || t.jabatan || "Pendidik / Tenaga Kependidikan";
        const statusPeg = t.statusKepegawaian || "PNS";
        const gol = t.golJabatan || t.golongan || "-";

        let qrUrl = "";
        try {
            if (window.ModulPresensi && ModulPresensi.qrDataUrl) {
                qrUrl = await ModulPresensi.qrDataUrl(`SEKOLAHTU|T|${clean}`, 200);
            }
        } catch (e) {}

        const printWin = window.open("", "_blank");
        if (!printWin) {
            if (window.App && App.showToast) App.showToast("Gagal membuka jendela cetak. Izinkan pop-up.", "warning");
            return;
        }

        const photoHtml = t.foto 
            ? `<img src="${Sec.safeUrl(t.foto)}" alt="Foto" style="width:36px;height:44px;object-fit:cover;border-radius:4px;border:1px solid #cbd5e1;flex-shrink:0;">`
            : `<div style="width:36px;height:44px;border-radius:4px;background:#1e3a8a;color:#fff;font-weight:bold;font-size:12px;display:flex;align-items:center;justify-content:center;flex-shrink:0;">${this.getInitials(t.nama)}</div>`;

        const qrSectionHtml = qrUrl ? `
            <div class="qr-row">
                <div class="qr-text">
                    <strong>QR Presensi Resmi Pegawai</strong><br>
                    Simpan kartu saku ini di dompet atau kartu tanda pengenal (ID Card).
                </div>
                <img src="${qrUrl}" alt="QR Code" class="qr-img">
            </div>
        ` : '';

        const cardHtml = `<!DOCTYPE html>
<html lang="id">
<head>
    <meta charset="UTF-8">
    <title>Kartu Saku QR - ${t.nama}</title>
    <style>
        @page { size: portrait; margin: 10mm; }
        * { box-sizing: border-box; }
        body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif; margin: 0; padding: 10px; background: #fff; color: #0f172a; }
        .card { width: 85mm; border: 2px solid #1e3a8a; border-radius: 12px; padding: 10px; margin: 0 auto; box-shadow: 0 4px 6px rgba(0,0,0,0.1); background: #ffffff; page-break-inside: avoid; }
        .header { text-align: center; background: #1e3a8a; color: white; padding: 6px; border-radius: 8px; margin-bottom: 8px; }
        .header h4 { margin: 0; font-size: 10.5pt; font-weight: 800; letter-spacing: 0.5px; }
        .header p { margin: 2px 0 0; font-size: 7.5pt; opacity: 0.95; }
        .profile-head { display: flex; align-items: center; gap: 8px; margin-bottom: 7px; padding-bottom: 6px; border-bottom: 1px dashed #cbd5e1; }
        .profile-info { flex: 1; min-width: 0; }
        .profile-name { font-size: 9pt; font-weight: 800; color: #1e3a8a; line-height: 1.2; word-break: break-word; }
        .profile-sub { font-size: 7.5pt; color: #475569; margin-top: 1px; font-weight: 600; }
        .profile-nip { font-size: 7.2pt; font-family: monospace; color: #64748b; margin-top: 1px; }
        .badge { display: inline-block; font-size: 6.5pt; font-weight: 700; padding: 1px 5px; border-radius: 4px; background: #e0e7ff; color: #3730a3; margin-top: 2px; }
        table { width: 100%; border-collapse: collapse; font-size: 7.2pt; }
        th, td { border: 1px solid #cbd5e1; padding: 2.5px 4px; text-align: left; vertical-align: top; }
        th { background: #f8fafc; font-weight: bold; width: 34%; color: #334155; }
        td { color: #0f172a; }
        .qr-row { display: flex; align-items: center; justify-content: space-between; gap: 8px; margin-top: 6px; padding-top: 6px; border-top: 1px dashed #cbd5e1; }
        .qr-img { width: 44px; height: 44px; flex-shrink: 0; }
        .qr-text { font-size: 6.5pt; color: #64748b; line-height: 1.3; }
        .footer { text-align: center; font-size: 6.8pt; color: #64748b; margin-top: 6px; }
    </style>
</head>
<body>
    <div class="card">
        <div class="header">
            <h4>KARTU PRESENSI PEGAWAI</h4>
            <p>${namaSekolah} • TA ${ta}</p>
        </div>
        <div class="profile-head">
            ${photoHtml}
            <div class="profile-info">
                <div class="profile-name">${Sec.esc(t.nama)}</div>
                <div class="profile-sub">${Sec.esc(jabatan)}</div>
                <div class="profile-nip">NIP: ${Sec.esc(t.nip || "-")}</div>
                <div><span class="badge">${Sec.esc(statusPeg)}${gol !== '-' ? ' • ' + Sec.esc(gol) : ''}</span></div>
            </div>
        </div>
        <table>
            <tbody>
                <tr><th>NUPTK</th><td>${Sec.esc(t.nuptk || "-")}</td></tr>
                <tr><th>Jenis Kelamin</th><td>${Sec.esc(t.jk || "Laki-laki")}</td></tr>
                <tr><th>Pendidikan</th><td>${Sec.esc(t.ijazah || "-")} ${t.jurusan ? `• ${Sec.esc(t.jurusan)}` : ''}</td></tr>
                <tr><th>Tugas Tambahan</th><td>${Sec.esc(t.tugasTambahan || "-")}</td></tr>
            </tbody>
        </table>
        ${qrSectionHtml}
        <div class="footer">Simpan di dompet / meja kerja • Dicetak via SEKOLAHTU</div>
    </div>
    <script>window.onload = function() { window.print(); };</script>
</body>
</html>`;

        printWin.document.write(cardHtml);
        printWin.document.close();
    },

    // -------------------------------------------------------------------------
    // FILTER & SEARCH HANDLERS
    // -------------------------------------------------------------------------
    onSearch(val) {
        this.searchQuery = val;
        this.renderTable();
    },

    onStatusFilter(val) {
        this.statusFilter = val;
        this.renderTable();
    },

    onTugasFilter(val) {
        this.tugasFilter = val;
        this.renderTable();
    },

    setViewMode(mode) {
        this.viewMode = mode;
        this.renderTable();
    },

    getInitials(name = "") {
        const parts = String(name).trim().split(/\s+/);
        if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
        return name.substring(0, 2).toUpperCase() || "GT";
    },

    // -------------------------------------------------------------------------
    // CETAK DIREKTORI GURU & TENDIK
    // -------------------------------------------------------------------------
    printDirectory() {
        const c = DataStore.getConfig();
        const list = DataStore.getTendik().filter(t => t.aktif !== false);

        const rows = list.map((t, i) => `
            <tr>
                <td style="text-align:center;padding:6px;border:1px solid #333;">${i + 1}</td>
                <td style="padding:6px;border:1px solid #333;">
                    <strong>${Sec.esc(t.nama)}</strong><br>
                    <span style="font-family:monospace;font-size:10px;color:#555;">NIP: ${Sec.esc(t.nip || "-")}${t.nuptk ? ` • NUPTK: ${Sec.esc(t.nuptk)}` : ''}</span>
                </td>
                <td style="padding:6px;border:1px solid #333;">${Sec.esc(Auth.getJabatanFromAccount ? (Auth.getJabatanFromAccount(t) || t.jabatan) : t.jabatan)}</td>
                <td style="padding:6px;border:1px solid #333;">${Sec.esc(t.golJabatan || t.golongan || "-")}</td>
                <td style="padding:6px;border:1px solid #333;">${Sec.esc(t.ijazah || "-")} ${t.jurusan ? `(${Sec.esc(t.jurusan)})` : ''}</td>
                <td style="text-align:center;padding:6px;border:1px solid #333;">${Sec.esc(t.statusKepegawaian || "PNS")}</td>
                <td style="padding:6px;border:1px solid #333;">${Sec.esc(t.tugasTambahan || "-")}</td>
                <td style="text-align:center;padding:6px;border:1px solid #333;">${Sec.esc(t.jk || "Laki-laki")}</td>
            </tr>
        `).join("");

        const html = `
            <!DOCTYPE html>
            <html>
            <head>
                <meta charset="utf-8">
                <title>Direktori Pendidik & Tenaga Kependidikan</title>
                <style>
                    body { font-family: Arial, sans-serif; font-size: 11px; color: #111; margin: 20px; }
                    .kop { text-align: center; border-bottom: 2px solid #000; padding-bottom: 8px; margin-bottom: 16px; }
                    .kop h2 { margin: 0; font-size: 16px; text-transform: uppercase; }
                    .kop p { margin: 2px 0; font-size: 10px; }
                    table { width: 100%; border-collapse: collapse; margin-top: 10px; }
                    th { background: #eee; padding: 6px; border: 1px solid #333; font-size: 11px; text-align: center; }
                    @media print { body { margin: 0; } }
                </style>
            </head>
            <body>
                <div class="kop">
                    <h2>${Sec.esc(c.namaSekolah || "SD NEGERI TERLANGU 01")}</h2>
                    <p>${Sec.esc(c.alamat || "Dinas Pendidikan Pemuda dan Olahraga Kabupaten Brebes")}</p>
                    <h3 style="margin-top:8px;font-size:13px;text-decoration:underline;">DIREKTORI DATA GURU & TENAGA KEPENDIDIKAN (TENDIK)</h3>
                </div>
                <table>
                    <thead>
                        <tr>
                            <th style="width:30px;">No</th>
                            <th>Nama Lengkap & NIP</th>
                            <th>Jabatan</th>
                            <th>Golongan / Jabatan</th>
                            <th>Ijazah & Jurusan</th>
                            <th>Status</th>
                            <th>Tugas Tambahan</th>
                            <th>JK</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${rows}
                    </tbody>
                </table>
            </body>
            </html>
        `;

        const w = window.open("", "_blank");
        if (w) {
            w.document.write(html);
            w.document.close();
            setTimeout(() => { w.print(); }, 400);
        }
    }
};

window.ModulTendik = ModulTendik;
