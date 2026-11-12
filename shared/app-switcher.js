/**
 * ============================================================================
 * SEKOLAHTU ENTERPRISE — ROLE-BASED CARD LAUNCHPAD & 9-DOT APP SWITCHER
 * SD Negeri Terlangu 01 — Kabupaten Brebes (NPSN: 20326713)
 * ============================================================================
 * Menyediakan:
 * 1. computeVisibleLaunchCards(userRole, skTugasTambahan): Filter kartu menu
 *    berdasarkan peran utama & SK Tugas Tambahan guru SD
 * 2. Launchpad UI (#/launchpad): Tampilan kartu besar ramah pengguna non-IT
 * 3. 9-Dot Waffle App-Switcher Modal: Navigasi cepat lintas 5 Sub-Aplikasi
 *    Monorepo & Sub-Modul Fase 1
 * ============================================================================
 */

(function (global) {
  'use strict';

  /**
   * Menghitung daftar kartu menu yang tampil di Launchpad berdasarkan peran & SK Tugas Tambahan
   * Sesuai spesifikasi Fase 1 Bab 3.3
   * @param {string} userRole - 'kepsek' | 'operator' | 'admin' | 'guru_kelas' | 'guru_mapel' | 'penjaga' | 'wali_murid'
   * @param {string[]} skTugasTambahan - Array SK tugas tambahan: ['BENDAHARA_BOSP', 'PENGURUS_BARANG', 'KEPALA_PERPUSTAKAAN', 'OPERATOR_DAPODIK', 'TIM_BOS']
   */
  function computeVisibleLaunchCards(userRole, skTugasTambahan) {
    const role = String(userRole || 'operator').toLowerCase();
    const normalizedRole = role === 'admin' ? 'operator' : role;
    const skList = Array.isArray(skTugasTambahan) ? skTugasTambahan : [];

    const allCards = [
      {
        id: 'CARD_ABSENSI_HARIAN',
        title: 'Absensi & Presensi Harian',
        subtitle: 'Catat kehadiran siswa kelas & presensi harian Bapak/Ibu Guru',
        icon: 'fa-user-check',
        color: '#10b981',
        bgGradient: 'linear-gradient(135deg, rgba(16,185,129,0.16), rgba(5,150,105,0.06))',
        targetRoute: 'absensi',
        moduleBadge: 'Inti Sekolah',
        roles: ['kepsek', 'operator', 'guru_kelas', 'guru_mapel', 'penjaga'],
        requiresSK: null
      },
      {
        id: 'CARD_JURNAL_MENGAJAR',
        title: 'Jurnal Mengajar & Nilai Siswa',
        subtitle: 'Agenda mengajar harian, nilai formatif/sumatif & ekskul (SI-GURU)',
        icon: 'fa-chalkboard-user',
        color: '#3b82f6',
        bgGradient: 'linear-gradient(135deg, rgba(59,130,246,0.16), rgba(37,99,235,0.06))',
        targetRoute: 'jadwal',
        moduleBadge: 'SI-GURU',
        roles: ['kepsek', 'guru_kelas', 'guru_mapel'],
        requiresSK: null
      },
      {
        id: 'CARD_SURAT_TATA_NASKAH',
        title: 'Buat & Cetak Surat Resmi',
        subtitle: 'Tata Naskah Permendagri 83/2022, SK, Undangan & BAST',
        icon: 'fa-envelope-open-text',
        color: '#6366f1',
        bgGradient: 'linear-gradient(135deg, rgba(99,102,241,0.16), rgba(79,70,229,0.06))',
        targetRoute: 'cetak',
        moduleBadge: 'Core TU',
        roles: ['kepsek', 'operator'],
        requiresSK: 'OPERATOR_DAPODIK'
      },
      {
        id: 'CARD_BUKU_INDUK_BERKAS',
        title: 'Buku Induk & Berkas Siswa',
        subtitle: '26 Kolom Dapodik, Masking NIK UU PDP & Arsip Digital',
        icon: 'fa-folder-open',
        color: '#0ea5e9',
        bgGradient: 'linear-gradient(135deg, rgba(14,165,233,0.16), rgba(2,132,199,0.06))',
        targetRoute: 'berkas',
        moduleBadge: 'Core TU',
        roles: ['kepsek', 'operator', 'guru_kelas'],
        requiresSK: 'OPERATOR_DAPODIK'
      },
      {
        id: 'CARD_BKU_PAJAK_BOSP',
        title: 'Buku Kas, Pajak BOSP & Tabungan',
        subtitle: 'BKU ARKAS 4.x, Kalkulator Pajak, Honor GTT/PTT, Tabungan Siswa & Infaq',
        icon: 'fa-wallet',
        color: '#f59e0b',
        bgGradient: 'linear-gradient(135deg, rgba(245,158,11,0.16), rgba(217,119,6,0.06))',
        targetRoute: 'keuangan',
        moduleBadge: 'Keuangan & BOSP',
        roles: ['kepsek', 'operator'],
        requiresSK: 'BENDAHARA_BOSP'
      },
      {
        id: 'CARD_LAPBUL_KORWILCAM',
        title: 'Generator Lapbul Brebes & Evaluasi',
        subtitle: 'Kompilasi 1-Klik Laporan Bulanan Korwilcam Brebes & Laporan 000.7.2',
        icon: 'fa-file-Waveform',
        iconFallback: 'fa-chart-pie',
        color: '#8b5cf6',
        bgGradient: 'linear-gradient(135deg, rgba(139,92,246,0.16), rgba(124,58,237,0.06))',
        targetRoute: 'lapbul',
        moduleBadge: 'Core TU Brebes',
        roles: ['kepsek', 'operator'],
        requiresSK: 'OPERATOR_DAPODIK'
      },
      {
        id: 'CARD_EKINERJA_VAULT',
        title: 'Brankas Bukti SKP E-Kinerja BKN',
        subtitle: 'Kurasi SK, sertifikat & bukti dukung RHK Triwulanan untuk BKN',
        icon: 'fa-vault',
        color: '#14b8a6',
        bgGradient: 'linear-gradient(135deg, rgba(20,184,166,0.16), rgba(13,148,136,0.06))',
        targetRoute: 'ekinerja-vault',
        moduleBadge: 'Kepegawaian ASN',
        roles: ['kepsek', 'operator', 'guru_kelas', 'guru_mapel'],
        requiresSK: null
      },
      {
        id: 'CARD_INVENTARIS_ASET',
        title: 'Data Barang & Inventaris Sekolah',
        subtitle: 'Pencatatan KIB, perawatan sarpras & laporan aset sekolah',
        icon: 'fa-boxes-stacked',
        color: '#ec4899',
        bgGradient: 'linear-gradient(135deg, rgba(236,72,153,0.16), rgba(219,39,119,0.06))',
        targetRoute: 'lapbul',
        moduleBadge: 'Sarpras',
        roles: ['kepsek', 'operator', 'penjaga'],
        requiresSK: 'PENGURUS_BARANG'
      },
      {
        id: 'CARD_PERPUSTAKAAN_SD',
        title: 'Perpustakaan & Pojok Baca',
        subtitle: 'Sirkulasi buku bacaan, katalog & literasi siswa (E-Perpus)',
        icon: 'fa-book-open-reader',
        color: '#06b6d4',
        bgGradient: 'linear-gradient(135deg, rgba(6,182,212,0.16), rgba(8,145,178,0.06))',
        targetRoute: 'eperpus-info',
        moduleBadge: 'E-Perpus',
        roles: ['kepsek', 'operator'],
        requiresSK: 'KEPALA_PERPUSTAKAAN'
      },
      {
        id: 'CARD_SUPERVISI_KEPSEK',
        title: 'Supervisi Akademik & Manajerial',
        subtitle: 'Observasi kelas, instrumen supervisi & umpan balik Kepala Sekolah',
        icon: 'fa-clipboard-check',
        color: '#f97316',
        bgGradient: 'linear-gradient(135deg, rgba(249,115,22,0.16), rgba(234,88,12,0.06))',
        targetRoute: 'esupervisi-info',
        moduleBadge: 'E-Supervisi',
        roles: ['kepsek'],
        requiresSK: null
      },
      {
        id: 'CARD_TINDAK_LANJUT_MUTU',
        title: 'Meja Tindak Lanjut & Mutu Layanan',
        subtitle: 'Tiket kendala pengguna, Skor SUS 6 peran & penghematan kertas',
        icon: 'fa-headset',
        color: '#ef4444',
        bgGradient: 'linear-gradient(135deg, rgba(239,68,68,0.16), rgba(220,38,38,0.06))',
        targetRoute: 'tindak-lanjut',
        moduleBadge: 'Penjaminan Mutu',
        roles: ['kepsek', 'operator'],
        requiresSK: null
      },
      {
        id: 'CARD_TALENT_SELEKSI',
        title: 'Penjaringan Talent Pool & Calon Lomba',
        subtitle: 'Hasil diagnostik bakat siswa: OSN, O2SN, FLS2N, MAPSI, FTBI Brebesan & Pramuka',
        icon: 'fa-trophy',
        color: '#f59e0b',
        bgGradient: 'linear-gradient(135deg, rgba(245,158,11,0.16), rgba(217,119,6,0.06))',
        targetRoute: 'berkas',
        moduleBadge: 'Prestasi Siswa',
        roles: ['kepsek', 'operator', 'guru_kelas', 'guru_mapel'],
        requiresSK: 'PEMBINA_LOMBA'
      }
    ];

    return allCards.filter(function (card) {
      const hasPrimaryRole = card.roles.includes(normalizedRole);
      const hasExtraDuty = card.requiresSK && skList.includes(card.requiresSK);
      return hasPrimaryRole || hasExtraDuty;
    });
  }

  const AppSwitcherEngine = {
    STORAGE_KEY_ROLE_OVERRIDE: 'SEKOLAHTU_LAUNCHPAD_ROLE_SIM',
    STORAGE_KEY_SK_OVERRIDE: 'SEKOLAHTU_LAUNCHPAD_SK_SIM',

    getCurrentRoleAndSK: function () {
      let role = 'operator';
      if (global.Auth && typeof global.Auth.getRole === 'function') {
        role = global.Auth.getRole() || 'operator';
      }
      const savedSimRole = localStorage.getItem(this.STORAGE_KEY_ROLE_OVERRIDE);
      if (savedSimRole) {
        role = savedSimRole;
      }

      let skList = ['BENDAHARA_BOSP', 'OPERATOR_DAPODIK'];
      try {
        const savedSk = localStorage.getItem(this.STORAGE_KEY_SK_OVERRIDE);
        if (savedSk) {
          skList = JSON.parse(savedSk);
        }
      } catch (e) {}

      return { role: role, skTugasTambahan: skList };
    },

    setRoleSimulation: function (role, skList) {
      if (role) localStorage.setItem(this.STORAGE_KEY_ROLE_OVERRIDE, role);
      if (Array.isArray(skList)) {
        localStorage.setItem(this.STORAGE_KEY_SK_OVERRIDE, JSON.stringify(skList));
      }
      this.renderLaunchpad('launchpad-module-container');
    },

    toggleSkDuty: function (skCode) {
      const state = this.getCurrentRoleAndSK();
      const idx = state.skTugasTambahan.indexOf(skCode);
      if (idx >= 0) {
        state.skTugasTambahan.splice(idx, 1);
      } else {
        state.skTugasTambahan.push(skCode);
      }
      this.setRoleSimulation(state.role, state.skTugasTambahan);
    },

    navigateFromCard: function (targetRoute) {
      if (targetRoute === 'eperpus-info' || targetRoute === 'esupervisi-info') {
        const modName = targetRoute === 'eperpus-info'
          ? 'E-Perpus (Perpustakaan SD & Pojok Baca)'
          : 'E-Supervisi (Supervisi Akademik & Manajerial Kepala Sekolah)';
        if (global.App && typeof global.App.showToast === 'function') {
          global.App.showToast('Sub-Aplikasi ' + modName + ' telah disiapkan kerangka monoreponya di folder /modules/ dan siap diaktifkan pada Fase 2.', 'info');
        }
        return;
      }
      if (global.App && typeof global.App.navigateTo === 'function') {
        global.App.navigateTo(targetRoute);
      }
    },

    renderLaunchpad: function (containerId) {
      const container = document.getElementById(containerId || 'launchpad-module-container');
      if (!container) return;

      const state = this.getCurrentRoleAndSK();
      const visibleCards = computeVisibleLaunchCards(state.role, state.skTugasTambahan);

      const roleLabels = {
        kepsek: 'Kepala Sekolah (Aisah Suciati, S.Pd.SD., M.Pd.)',
        operator: 'Operator / Admin TU Sekolah',
        guru_kelas: 'Guru Kelas SD (Wali Kelas I - VI)',
        guru_mapel: 'Guru Mata Pelajaran (PAI / PJOK)',
        penjaga: 'Tenaga Kependidikan / Penjaga Sekolah'
      };

      const allSkDuties = [
        { code: 'BENDAHARA_BOSP', label: 'SK Bendahara BOSP' },
        { code: 'OPERATOR_DAPODIK', label: 'SK Operator Dapodik' },
        { code: 'PENGURUS_BARANG', label: 'SK Pengurus Barang/Aset' },
        { code: 'KEPALA_PERPUSTAKAAN', label: 'SK Kepala Perpustakaan' },
        { code: 'PEMBINA_LOMBA', label: 'SK Pembina Lomba/Bakat' }
      ];

      const skBadgesHtml = allSkDuties.map(function (sk) {
        const active = state.skTugasTambahan.includes(sk.code);
        return '<button type="button" onclick="window.AppSwitcherEngine.toggleSkDuty(\'' + sk.code + '\')" ' +
          'style="padding:5px 11px;border-radius:999px;font-size:0.76rem;font-weight:600;cursor:pointer;transition:all 0.2s;border:1px solid ' +
          (active ? '#10b981' : 'rgba(148,163,184,0.3)') + ';background:' +
          (active ? 'rgba(16,185,129,0.16)' : 'rgba(15,23,42,0.4)') + ';color:' +
          (active ? '#34d399' : '#94a3b8') + ';">' +
          '<i class="fa-solid ' + (active ? 'fa-circle-check' : 'fa-circle-plus') + '"></i> ' + sk.label +
          '</button>';
      }).join('');

      const cardsHtml = visibleCards.map(function (card) {
        const iconClass = card.iconFallback || card.icon;
        return '<div class="launchpad-big-card" onclick="window.AppSwitcherEngine.navigateFromCard(\'' + card.targetRoute + '\')" ' +
          'style="min-height:132px;padding:18px;border-radius:16px;background:' + card.bgGradient + ';border:1px solid rgba(148,163,184,0.2);cursor:pointer;display:flex;align-items:center;gap:16px;transition:transform 0.18s ease, box-shadow 0.18s ease;position:relative;overflow:hidden;">' +
          '<div style="width:56px;height:56px;min-width:56px;border-radius:14px;background:' + card.color + ';color:#fff;display:flex;align-items:center;justify-content:center;font-size:1.55rem;box-shadow:0 8px 18px -4px rgba(0,0,0,0.3);">' +
          '<i class="fa-solid ' + iconClass + '"></i>' +
          '</div>' +
          '<div style="flex:1;min-width:0;">' +
          '<div style="display:flex;align-items:center;gap:6px;margin-bottom:4px;flex-wrap:wrap;">' +
          '<span style="font-size:0.68rem;font-weight:700;text-transform:uppercase;letter-spacing:0.04em;padding:2px 8px;border-radius:999px;background:rgba(15,23,42,0.45);color:#e2e8f0;">' + card.moduleBadge + '</span>' +
          (card.requiresSK ? '<span style="font-size:0.65rem;padding:2px 7px;border-radius:999px;background:rgba(16,185,129,0.2);color:#6ee7b7;">+' + card.requiresSK.replace(/_/g, ' ') + '</span>' : '') +
          '</div>' +
          '<h3 style="margin:0 0 4px 0;font-size:1.05rem;font-weight:700;color:var(--text-primary,#f8fafc);">' + card.title + '</h3>' +
          '<p style="margin:0;font-size:0.82rem;color:var(--text-secondary,#cbd5e1);line-height:1.35;">' + card.subtitle + '</p>' +
          '</div>' +
          '<div style="color:var(--text-muted,#94a3b8);font-size:1.1rem;"><i class="fa-solid fa-chevron-right"></i></div>' +
          '</div>';
      }).join('');

      container.innerHTML =
        '<div class="card" style="margin-bottom:18px;border:1px solid rgba(99,102,241,0.3);background:linear-gradient(135deg,rgba(30,41,59,0.92),rgba(15,23,42,0.95));">' +
        '  <div class="card-body" style="padding:20px;">' +
        '    <div style="display:flex;justify-content:space-between;align-items:flex-start;flex-wrap:wrap;gap:14px;">' +
        '      <div>' +
        '        <div style="display:inline-flex;align-items:center;gap:8px;padding:4px 12px;border-radius:999px;background:rgba(99,102,241,0.2);color:#a5b4fc;font-size:0.76rem;font-weight:700;margin-bottom:8px;">' +
        '          <i class="fa-solid fa-rocket"></i> BERANDA PINTAR BERBASIS PERAN & SK TUGAS TAMBAHAN' +
        '        </div>' +
        '        <h2 style="margin:0 0 6px 0;font-size:1.4rem;color:#f8fafc;">Selamat Bertugas di Portal Terpadu SDN Terlangu 01</h2>' +
        '        <p style="margin:0;font-size:0.88rem;color:#cbd5e1;">Menu di bawah ini otomatis menyesuaikan jabatan utama dan <strong>SK Tugas Tambahan</strong> Bapak/Ibu agar tampilan tetap bersih dan mudah digunakan.</p>' +
        '      </div>' +
        '      <div style="display:flex;gap:8px;flex-wrap:wrap;">' +
        '        <button class="btn btn-sm btn-secondary" onclick="window.SekolahtuTourGuide && window.SekolahtuTourGuide.startTour(true)"><i class="fa-solid fa-route"></i> Panduan Tur 6 Langkah</button>' +
        '        <button class="btn btn-sm btn-secondary" onclick="window.GlossaryManager && window.GlossaryManager.openGlossaryModal()"><i class="fa-solid fa-book-bookmark"></i> Kamus Istilah Ramah</button>' +
        '        <button class="btn btn-sm btn-primary" onclick="window.SignatureExtractorEngine && window.SignatureExtractorEngine.openExtractorModal()"><i class="fa-solid fa-signature"></i> Buat Tanda Tangan Transparan</button>' +
        '      </div>' +
        '    </div>' +
        '    <hr style="border:none;border-top:1px solid rgba(148,163,184,0.15);margin:16px 0;">' +
        '    <div style="display:flex;flex-wrap:wrap;align-items:center;justify-content:space-between;gap:12px;">' +
        '      <div style="display:flex;align-items:center;gap:10px;flex-wrap:wrap;">' +
        '        <label style="font-size:0.8rem;font-weight:600;color:#94a3b8;"><i class="fa-solid fa-user-shield"></i> Peran Aktif:</label>' +
        '        <select id="launchpad-role-select" class="form-control" style="width:auto;padding:5px 10px;font-size:0.82rem;" onchange="window.AppSwitcherEngine.setRoleSimulation(this.value, null)">' +
        '          <option value="kepsek" ' + (state.role === 'kepsek' ? 'selected' : '') + '>' + roleLabels.kepsek + '</option>' +
        '          <option value="operator" ' + (state.role === 'operator' ? 'selected' : '') + '>' + roleLabels.operator + '</option>' +
        '          <option value="guru_kelas" ' + (state.role === 'guru_kelas' ? 'selected' : '') + '>' + roleLabels.guru_kelas + '</option>' +
        '          <option value="guru_mapel" ' + (state.role === 'guru_mapel' ? 'selected' : '') + '>' + roleLabels.guru_mapel + '</option>' +
        '          <option value="penjaga" ' + (state.role === 'penjaga' ? 'selected' : '') + '>' + roleLabels.penjaga + '</option>' +
        '        </select>' +
        '      </div>' +
        '      <div style="display:flex;align-items:center;gap:6px;flex-wrap:wrap;">' +
        '        <span style="font-size:0.78rem;color:#94a3b8;margin-right:4px;">SK Tugas Tambahan:</span>' +
                 skBadgesHtml +
        '      </div>' +
        '    </div>' +
        '  </div>' +
        '</div>' +
        '<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(320px,1fr));gap:16px;margin-bottom:20px;">' +
          cardsHtml +
        '</div>' +
        '<div class="card" style="border:1px solid rgba(148,163,184,0.18);">' +
        '  <div class="card-body" style="padding:16px;display:flex;flex-wrap:wrap;align-items:center;justify-content:space-between;gap:12px;">' +
        '    <div style="display:flex;align-items:center;gap:12px;">' +
        '      <div style="width:42px;height:42px;border-radius:10px;background:rgba(16,185,129,0.15);color:#10b981;display:flex;align-items:center;justify-content:center;font-size:1.2rem;"><i class="fa-solid fa-shield-heart"></i></div>' +
        '      <div>' +
        '        <div style="font-weight:700;font-size:0.9rem;">Keamanan Data 4-Lapis & Kepatuhan UU PDP No. 27/2022 Aktif</div>' +
        '        <div style="font-size:0.78rem;color:var(--text-muted,#94a3b8);">Dilengkapi Simpan Draf Otomatis 5 Detik, Tempat Sampah 30 Hari, dan Berita Acara Pemusnahan Arsip Digital (000.5.3).</div>' +
        '      </div>' +
        '    </div>' +
        '    <div style="display:flex;gap:8px;flex-wrap:wrap;">' +
        '      <button class="btn btn-sm btn-secondary" onclick="window.CRUDSafetyManager && window.CRUDSafetyManager.openRecycleBinModal()"><i class="fa-solid fa-trash-can-arrow-up"></i> Tempat Sampah (30 Hari)</button>' +
        '      <button class="btn btn-sm btn-secondary" onclick="window.DigitalPurgeManager && window.DigitalPurgeManager.openPurgeModal()"><i class="fa-solid fa-file-shield"></i> Pemusnahan Arsip (000.5.3)</button>' +
        '      <button class="btn btn-sm btn-primary" onclick="window.SUSEngine && window.SUSEngine.openSurveyModal()"><i class="fa-solid fa-star"></i> Isi Survei Kepuasan (SUS)</button>' +
        '    </div>' +
        '  </div>' +
        '</div>';
    },

    openWaffleModal: function () {
      let existing = document.getElementById('waffle-app-switcher-modal');
      if (existing) {
        existing.remove();
        return;
      }

      const modal = document.createElement('div');
      modal.id = 'waffle-app-switcher-modal';
      modal.style.cssText = 'position:fixed;inset:0;background:rgba(15,23,42,0.72);backdrop-filter:blur(4px);z-index:9999;display:flex;align-items:flex-start;justify-content:flex-end;padding:68px 20px 20px 20px;';

      const apps = [
        { title: 'Beranda Pintar', desc: 'Launchpad Kartu Peran & SK', icon: 'fa-compass', color: '#6366f1', route: 'launchpad', status: 'AKTIF' },
        { title: 'Core TU & Surat', desc: 'Permendagri 83/2022 & Buku Induk', icon: 'fa-building-columns', color: '#0ea5e9', route: 'dashboard', status: 'AKTIF' },
        { title: 'BKU, Pajak & Tabungan', desc: 'ARKAS 4.x, Honor GTT & Infaq', icon: 'fa-wallet', color: '#f59e0b', route: 'keuangan', status: 'AKTIF' },
        { title: 'Lapbul Korwilcam', desc: 'Kompilasi 1-Klik & Laporan 000.7.2', icon: 'fa-chart-pie', color: '#8b5cf6', route: 'lapbul', status: 'AKTIF' },
        { title: 'Brankas E-Kinerja', desc: 'Bukti Dukung RHK SKP BKN', icon: 'fa-vault', color: '#14b8a6', route: 'ekinerja-vault', status: 'AKTIF' },
        { title: 'Meja Tindak Lanjut', desc: 'Tiket Kendala, SUS & Paperless', icon: 'fa-headset', color: '#ef4444', route: 'tindak-lanjut', status: 'AKTIF' },
        { title: 'SI-GURU (Akademik)', desc: 'Jurnal Mengajar & Rapor Kurmer', icon: 'fa-chalkboard-user', color: '#3b82f6', route: 'jadwal', status: 'FASE 2 READY' },
        { title: 'SiSiswa SD (Siswa)', desc: 'Portal Siswa, Talent Pool & E-Perpus', icon: 'fa-graduation-cap', color: '#a855f7', externalUrl: 'sisiswa.html', status: 'AKTIF' },
        { title: 'Portal Wali Murid', desc: 'Layanan Mandiri, Berkas & PIP Ortu', icon: 'fa-hands-holding-child', color: '#10b981', externalUrl: 'ortu.html', status: 'AKTIF' }
      ];

      const gridHtml = apps.map(function (app) {
        const clickHandler = app.externalUrl
          ? "window.open('" + app.externalUrl + "', '_blank');document.getElementById('waffle-app-switcher-modal').remove();"
          : "window.AppSwitcherEngine.navigateFromCard('" + app.route + "');document.getElementById('waffle-app-switcher-modal').remove();";
        return '<div onclick="' + clickHandler + '" style="padding:12px;border-radius:12px;background:rgba(30,41,59,0.85);border:1px solid rgba(148,163,184,0.18);cursor:pointer;display:flex;flex-direction:column;align-items:center;text-align:center;gap:6px;transition:all 0.15s;">' +
          '<div style="width:44px;height:44px;border-radius:12px;background:' + app.color + ';color:#fff;display:flex;align-items:center;justify-content:center;font-size:1.25rem;">' +
          '<i class="fa-solid ' + app.icon + '"></i>' +
          '</div>' +
          '<div style="font-weight:700;font-size:0.8rem;color:#f8fafc;line-height:1.2;">' + app.title + '</div>' +
          '<div style="font-size:0.68rem;color:#94a3b8;line-height:1.2;">' + app.desc + '</div>' +
          '<span style="font-size:0.6rem;font-weight:700;padding:1px 6px;border-radius:999px;background:' + (app.status === 'AKTIF' ? 'rgba(16,185,129,0.2);color:#34d399;' : 'rgba(245,158,11,0.2);color:#fbbf24;') + '">' + app.status + '</span>' +
          '</div>';
      }).join('');

      modal.innerHTML =
        '<div style="width:390px;max-width:95vw;background:#0f172a;border:1px solid rgba(148,163,184,0.28);border-radius:18px;padding:18px;box-shadow:0 20px 45px rgba(0,0,0,0.55);" onclick="event.stopPropagation()">' +
        '  <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;">' +
        '    <div>' +
        '      <div style="font-weight:800;font-size:0.95rem;color:#f8fafc;"><i class="fa-solid fa-grip" style="color:#6366f1;margin-right:6px;"></i> Ekosistem SEKOLAHTU Monorepo</div>' +
        '      <div style="font-size:0.74rem;color:#94a3b8;">SD Negeri Terlangu 01 — 5 Sub-Aplikasi Terpadu</div>' +
        '    </div>' +
        '    <button onclick="document.getElementById(\'waffle-app-switcher-modal\').remove()" style="background:none;border:none;color:#94a3b8;cursor:pointer;font-size:1.1rem;"><i class="fa-solid fa-xmark"></i></button>' +
        '  </div>' +
        '  <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:10px;">' +
             gridHtml +
        '  </div>' +
        '</div>';

      modal.addEventListener('click', function () {
        modal.remove();
      });

      document.body.appendChild(modal);
    }
  };

  global.computeVisibleLaunchCards = computeVisibleLaunchCards;
  global.AppSwitcherEngine = AppSwitcherEngine;
})(typeof window !== 'undefined' ? window : this);

