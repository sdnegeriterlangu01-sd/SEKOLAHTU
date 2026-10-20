/* ==========================================================================
   SIM-TAS-SD: KONFIGURASI PUBLIK
   --------------------------------------------------------------------------
   File ini AMAN dipublikasikan di GitHub Pages karena hanya berisi nilai yang
   memang bersifat publik:
     - SUPABASE_URL & SUPABASE_ANON_KEY  -> kunci "anon" (publik). Keamanan data
       dijaga oleh Row Level Security (RLS) di Supabase, BUKAN oleh kerahasiaan
       kunci ini. JANGAN PERNAH menaruh "service_role key" di sini.
     - GAS_API_URL -> alamat Web App Google Apps Script. Backend menolak semua
       permintaan tanpa token login Supabase yang valid.

   Kosongkan SUPABASE_URL untuk menjalankan Mode Demo (login lokal, tanpa cloud).
   ========================================================================== */
window.SIMTAS_CONFIG = {
  SUPABASE_URL: "https://wesuxejtpquzqkojpvpg.supabase.co",       // contoh: "https://abcdefgh.supabase.co"
  SUPABASE_ANON_KEY: "sb_publishable_fz1vTJMm99C7PPNsCKjS_g_dt2DfhVa",  // contoh: "eyJhbGciOi..." (anon / public key)
  GAS_API_URL: "https://script.google.com/macros/s/AKfycby8iGSmXP0R6ytEtzWLCcrp7FZQVQQFORaS1KqCsKuNEXrAQ9-JnAZtmkz0mSITSaFM/exec",        // contoh: "https://script.google.com/macros/s/AKfycb.../exec"
  IDLE_TIMEOUT_MENIT: 30  // otomatis keluar bila tidak ada aktivitas
};
