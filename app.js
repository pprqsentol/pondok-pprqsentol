/* ===== Aplikasi Pondok - Roudhotul Qur'an ===== */
/* Penyimpanan: Supabase (database bersama) */

/* ====== 1. KONFIGURASI SUPABASE ======
   Isi dua baris di bawah ini dengan Project URL dan Publishable Key
   dari Supabase (Settings -> API Keys). */
const SUPABASE_URL = 'https://hvivddbhacoppkbtiqpe.supabase.co';
const SUPABASE_KEY = 'sb_publishable_BTFxSTrt1vM1seoQaXG_7g_mqYo5aqq';

const sb = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

/* Mengubah karakter khusus HTML (<, >, &, ", ') jadi bentuk aman sebelum
   ditampilkan, supaya teks bebas-ketik dari pengguna (mis. keterangan
   transaksi keuangan) tidak bisa dieksekusi sebagai kode HTML/JS saat
   dirender lewat innerHTML. */
function escapeHtml(str){
  if(str===null || str===undefined) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/* ====== 1b. KOP SURAT (dipakai di semua dokumen Word yang diunduh) ======
   Disimpan sebagai gambar (base64) supaya dokumen Word yang diunduh tetap
   punya kop resmi pondok walau dibuka di komputer/HP mana saja (tidak perlu
   file gambar terpisah). Kalau kop mau diganti, tinggal ganti isi konstanta
   ini dengan hasil convert gambar kop yang baru ke base64. */
const KOP_RQ_B64 = 'data:image/jpeg;base64,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AAAAAAAAAAAAoAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA/8QAAv/aAAwDAQACAAMAAAAQsMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMA8888888888888888888888888888888888888888888888888888888888888888888A888888888888888888888888888888888884ww44804048088888888888888888888A8888888888888888888c888888888888888840I4kUsoQ8888888888888888888888A888888888885R9f8888888888888888888wgc8gY884c88888888888888888888888A888888888qpl1Bz8888888888888888884EwoEkMs840Y4Ms8888888888888888888A8888888888HVfZFl8888888840w884404w40w800w00800004088www488888888888A88888888s1dFoIhb88888888oYY8EoIgQ8M8U0AU0IsAE4Q0wcQ04UEs8c888888888A888888888ftZdflZ888888888888888888YgcQw48AsoAQssc888c88888888888888A888888888ulDPNN8888888888888884w4w80YcwsAoE4oUME048w888888888888888A88888888888bN/3888888888480w48YMM8o8ck8wc88cMUscMcsscw0w48w88888888A88888888888888888888888sMMM8MUcscgsMccssMc8sc8ccM8MMcss8cc8c8888888A8888888888888888888888888888888888888888888888888888888888888888888A8888888888888888888888888888888888888888888888888888888888888888888A8888888888888888888888888888888888888888888888888888888888888888888A8888888888888888888888888888888888888888888888888888888888888888888A/8QAJhEA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YzEgls1VwbB63MPJSjigiOg5Z5EroCSRZS/iaWznbnlNT8Q7kIwDKCtlE2kw4pLqg+OsoRwoTIYkUL7tSVja4XMrnZRQEpDJFnJ6lkzkgLVvsqHmsw6t5OeaaPQw4fPCYKQgD2YhXKZU1U1VhDoXE5uxP2iBEAN2twsQ1QSaV97XdQKLx9T6EnU5w8cZ/OGw9jBqwdTvDjsSx1P8TesjmAUmuLtND3No+okQ2rzEiqkFAddt2gCigglALtADME3LUsrCGdJuamAYNcjBEQYrAHCigLOp8fqmUSV2cuh5pyvJTGEwPCFffY6Qaqviu5hWKQGeGHEbhGnquniUFqgGAvzQhH/pD7mDuk8C2y88GAd3sNidjAIlLrpV7GGI132nkaU2a6KSzg8QTlSWBcYAHSDF/WOT1GR9lANr8IiAdsFTofoHGY55iKO70X2UcCUpSqgq8acnqMj9hDk9RkfsIcnqMj9hDk9RkfsIcnqMj9hDk9RkfsIcnqMj9hDk9RkfsIcnp//EAC0QAQACAgMAAQMEAgMAAgMAAAEAESExQVFhcRCBoSAwUJFAsWDB8JCg0eHx/9oACAEBAAE/EIRAzznnPOec855zznnPOec855zznnPOec855zznnPOec855zznnPOec855zznnPOec855zznnPOec855zznnPOec855zznnPOec855zznnPOec855zznnPOec855zznnPOec855zznnPOec855zznnPOec855zznnPOec855zznnPOec855zznnPOec855zznnPOec855zznnPOec855zznnPOec855zznnPOec855zznnPOec84QQf/DLttttgFSuAZD4XSfFEZNaPatBkaVl+esOrhK/tKCvSFWQi5iI+NlRlrQu+UvYhUroXbVFL+ohtTFIF0TN2/qcF12l6gSQ/NEQfiyvoAlyDjfR1cQUwxzXdvk+j3PwgjARl2sinp6fGIBnQXztWELv8q0SG8ZSWMK671j61C5cxvVNm8OJYwXgNlfkm0UM08nyf8R2V/bTcSrTP8DVy6IFrHh5noY9N4LdldNqqSolJ5uM9qHIhQR+gW+wLhgxTen7W9CplHflyUtBzmGEynYefe1WklB1ONMs1sRiigV20pZNILEjxcU9D7fixhqX+gti8sTXXmuyrpCE2K7ERliRlF7UFoZTJC3ztDynK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';
function kopWordHeader(){
  return `
    <table style="width:100%;border:none;border-collapse:collapse;margin-bottom:4px">
      <tr><td style="border:none;padding:0;text-align:center">
        <img src="${KOP_RQ_B64}" style="width:100%;max-width:560pt;height:auto">
      </td></tr>
    </table>
    <div style="border-bottom:2.5pt solid #000;margin-bottom:14px"></div>
  `;
}


/* ====== 2. MAPPING: nama kolom database <-> nama field aplikasi ====== */
const STATUS_TO_DB = { h: 'Hadir', a: 'Alpha', i: 'Izin' };
const STATUS_FROM_DB = { Hadir: 'h', Alpha: 'a', Izin: 'i', Sakit: 'a' };

function santriRowToApp(r) {
  return {
    id: r.id, nama: r.nama, noInduk: r.no_induk, foto: r.foto_url || '',
    tetala: r.tetala || '', alamat: r.alamat || '', tglMasuk: r.tanggal_masuk || '',
    jenisKelamin: r.jenis_kelamin || 'L', namaAyah: r.nama_ayah || '', namaIbu: r.nama_ibu || '',
    namaWali: r.nama_wali || '', fotoWali: r.foto_wali || '', kodeWali: r.kode_wali || '',
    kelas: r.kelas || '7', kamar: r.kamar || '', hpWali: r.no_hp_wali || '', program: r.program || 'Non-Takhossus',
    hafalanAwal: r.hafalan_awal || 0,
    mahram: []
  };
}
function santriAppToRow(s) {
  return {
    nama: s.nama, no_induk: s.noInduk, foto_url: s.foto || null, tetala: s.tetala || null,
    alamat: s.alamat || null, tanggal_masuk: s.tglMasuk || null,
    jenis_kelamin: s.jenisKelamin || null, nama_ayah: s.namaAyah || null, nama_ibu: s.namaIbu || null,
    nama_wali: s.namaWali || null, foto_wali: s.fotoWali || null,
    kelas: s.kelas || null, kamar: s.kamar || null,
    no_hp_wali: s.hpWali || null, program: s.program || 'Non-Takhossus',
    hafalan_awal: s.hafalanAwal || 0
  };
}
/* Total hafalan berjalan = hafalan awal (sebelum pakai aplikasi) + seluruh hafalan yang diinput lewat aplikasi.
   1 juz = 20 halaman (hitungan internal pondok). */
function totalHafalanSantri(santriId){
  const s = DB.santri.find(x=>x.id===santriId);
  const awal = s ? (s.hafalanAwal||0) : 0;
  const tambahan = DB.hafalan.filter(h=>h.santriId===santriId).reduce((sum,h)=>sum+(h.jumlahHalaman||1),0);
  const total = awal + tambahan;
  return { total, juz: Math.floor(total/20), halaman: total%20 };
}

/* ====== TARGET RAPOR ======
   Target minimal halaman hafalan bertambah per hari (dipakai untuk menghitung
   predikat A-E kategori Hafalan di tab Rapor). Ubah angka ini saja kalau mau
   mengubah standar penilaian pondok. */
const TARGET_HAFALAN_PER_HARI = 1;
function hariDalamPeriode(from, to){
  const a = new Date(from), b = new Date(to);
  return Math.max(1, Math.round((b-a)/86400000) + 1);
}
/* Predikat nilai: A Sangat Baik, B Baik, C Cukup Baik, D Kurang Baik, E Kurang.
   Dipakai untuk 2 kategori: Hafalan dan Absensi, masing-masing dari persentase pencapaian. */
function predikatFromPct(pct){
  if(pct>=90) return 'A'; if(pct>=75) return 'B'; if(pct>=60) return 'C'; if(pct>=40) return 'D'; return 'E';
}
function predikatLabel(huruf){
  return {A:'Sangat Baik', B:'Baik', C:'Cukup Baik', D:'Kurang Baik', E:'Kurang'}[huruf] || '-';
}
function nilaiHafalanSantri(santriId, from, to){
  const tambahan = DB.hafalan.filter(h=>h.santriId===santriId && h.tanggal>=from && h.tanggal<=to)
    .reduce((sum,h)=>sum+(h.jumlahHalaman||1),0);
  const hari = hariDalamPeriode(from, to);
  const target = hari * TARGET_HAFALAN_PER_HARI;
  const pct = target>0 ? Math.min(100, Math.round(tambahan/target*100)) : 0;
  return { tambahan, target, hari, pct, predikat: predikatFromPct(pct) };
}
function nilaiAbsensiSantri(santriId, from, to){
  const items = DB.absensi.filter(a=>a.santriId===santriId && a.tanggal>=from && a.tanggal<=to);
  const hadir = items.filter(a=>a.status==='h').length;
  const pct = items.length ? Math.round(hadir/items.length*100) : 0;
  return { hadir, total: items.length, pct, predikat: predikatFromPct(pct) };
}

/* ====== Urutan hafalan pondok ======
   Santri menghafal TIDAK berurutan 1-30, tapi: 29, 30, 1, 2, 3, ... , 28.
   JUZ_ORDER[0] = juz pertama yang dihafal, JUZ_ORDER[29] = juz terakhir. */
const JUZ_ORDER = [29, 30, ...Array.from({length:28}, (_,i)=>i+1)];
function posisiJuz(juz){ return JUZ_ORDER.indexOf(juz) + 1; } // posisi ke-berapa (1..30) dalam urutan hafalan
function juzSetelah(juz){ const p = posisiJuz(juz); return JUZ_ORDER[p % JUZ_ORDER.length]; } // juz berikutnya (mengikuti urutan, berputar setelah 28)
/* Juz yang sedang dihafal santri sekarang, berdasarkan input hafalan terakhir
   yang dicatat lewat aplikasi (hafalan awal/sebelum pakai aplikasi tidak dipakai
   di sini karena tidak diketahui juz persisnya, hanya total halamannya). */
function juzSekarang(santriId){
  const items = DB.hafalan.filter(h=>h.santriId===santriId)
    .slice().sort((a,b)=> a.tanggal===b.tanggal ? String(a.id).localeCompare(String(b.id)) : a.tanggal.localeCompare(b.tanggal));
  if(items.length===0) return { juz: JUZ_ORDER[0], halaman: 0, mulai: true, adaData: false };
  const last = items[items.length-1];
  if((last.halamanSampai||0) >= 20){
    return { juz: juzSetelah(last.juz), halaman: 0, mulai: true, adaData: true, tanggal: last.tanggal };
  }
  return { juz: last.juz, halaman: last.halamanSampai||0, mulai: false, adaData: true, tanggal: last.tanggal };
}
function formatJuzSekarang(santriId){
  const c = juzSekarang(santriId);
  if(!c.adaData) return `Belum mulai (dimulai dari Juz ${c.juz})`;
  if(c.mulai) return `Juz sebelumnya selesai, giliran Juz ${c.juz} (belum ada input)`;
  return `Juz ${c.juz}, halaman ${c.halaman}`;
}

function mahramRowToApp(r) {
  return { id: r.id, nama: r.nama, hubungan: r.hubungan || '', hp: r.no_hp || '', foto: r.foto_url || '' };
}

/* ====== 3b. INDEXEDDB (cadangan offline, bukan server utama) ======
   Supabase tetap sumber data utama. Setiap kali data berhasil diambil
   dari Supabase, salinan cadangan disimpan di IndexedDB (tersimpan di
   HP/browser). Kalau internet mati atau Supabase tidak bisa dihubungi,
   aplikasi menampilkan cadangan terakhir ini (mode lihat saja). */
const IDB_NAME = 'pondokDB';
const IDB_STORE = 'cadangan';
let OFFLINE_MODE = false;

function idbOpen(){
  return new Promise((resolve, reject)=>{
    const req = indexedDB.open(IDB_NAME, 1);
    req.onupgradeneeded = ()=>{ req.result.createObjectStore(IDB_STORE); };
    req.onsuccess = ()=> resolve(req.result);
    req.onerror = ()=> reject(req.error);
  });
}
async function idbSave(data){
  try {
    const db = await idbOpen();
    await new Promise((resolve, reject)=>{
      const tx = db.transaction(IDB_STORE, 'readwrite');
      tx.objectStore(IDB_STORE).put(data, 'snapshot');
      tx.oncomplete = resolve;
      tx.onerror = ()=> reject(tx.error);
    });
  } catch(e){ console.warn('Gagal simpan cadangan offline:', e); }
}
async function idbLoad(){
  try {
    const db = await idbOpen();
    return await new Promise((resolve, reject)=>{
      const tx = db.transaction(IDB_STORE, 'readonly');
      const req = tx.objectStore(IDB_STORE).get('snapshot');
      req.onsuccess = ()=> resolve(req.result || null);
      req.onerror = ()=> reject(req.error);
    });
  } catch(e){ console.warn('Gagal baca cadangan offline:', e); return null; }
}

/* ====== 3. STATE APLIKASI (diisi dari Supabase setelah login) ====== */
let DB = { kegiatan: [], santri: [], absensi: [], hafalan: [], transaksiSaldo: [], pembina: [] };
let SESSION = null; // { userId, role, program, santriId, nama }

async function loadAll() {
  try {
    const [kegiatanRes, santriRes, mahramRes, absensiRes, hafalanRes, saldoRes, pembinaRes] = await Promise.all([
      sb.from('kegiatan').select('*').eq('aktif', true).order('nama'),
      sb.from('santri').select('*').eq('aktif', true).order('nama'),
      sb.from('mahram').select('*'),
      sb.from('absensi').select('*'),
      sb.from('hafalan').select('*'),
      sb.from('transaksi_saldo').select('*'),
      sb.from('pembina').select('*').order('nama')
    ]);
    if(kegiatanRes.error) throw kegiatanRes.error;
    const santri = (santriRes.data || []).map(santriRowToApp);
    (mahramRes.data || []).forEach(m => {
      const s = santri.find(x => x.id === m.santri_id);
      if (s) s.mahram.push(mahramRowToApp(m));
    });
    DB = {
      kegiatan: (kegiatanRes.data || []).map(k => ({ id: k.id, nama: k.nama, programKhusus: k.program_khusus || null })),
      santri,
      absensi: (absensiRes.data || []).map(a => ({
        id: a.id, santriId: a.santri_id, kegiatanId: a.kegiatan_id, tanggal: a.tanggal,
        status: STATUS_FROM_DB[a.status] || 'a'
      })),
      hafalan: (hafalanRes.data || []).map(h => ({
        id: h.id, santriId: h.santri_id, tanggal: h.tanggal, juz: h.juz,
        halamanDari: h.halaman_dari, halamanSampai: h.halaman_sampai,
        jumlahHalaman: h.halaman_sampai - h.halaman_dari + 1
      })),
      transaksiSaldo: (saldoRes.data || []).map(t => ({
        id: t.id, santriId: t.santri_id, jenis: t.jenis, nominal: t.jumlah,
        keterangan: t.keterangan || '', tanggal: t.tanggal
      })),
      pembina: (pembinaRes.data || []).map(p => ({
        id: p.id, nama: p.nama, program: p.program, tetala: p.tetala || '', alamat: p.alamat || '',
        aktif: p.aktif
      }))
    };
    OFFLINE_MODE = false;
    idbSave(DB);
  } catch(e){
    console.warn('Gagal ambil data dari Supabase, coba pakai cadangan offline:', e);
    const cadangan = await idbLoad();
    if(cadangan){
      DB = cadangan;
      OFFLINE_MODE = true;
    } else {
      throw e;
    }
  }
}

const NAV_ADMIN = [
  {id:'beranda', label:'Beranda', icon:'&#8962;'},
  {id:'santri', label:'Santri', icon:'&#128101;'},
  {id:'laporan', label:'Laporan', icon:'&#128202;'},
  {id:'rapor', label:'Rapor', icon:'&#127891;'},
  {id:'laporanToko', label:'Laporan Toko', icon:'&#128176;'},
  {id:'tagihan', label:'Tagihan', icon:'&#128179;'},
  {id:'pembina', label:'Pembina', icon:'&#128100;'},
  {id:'kelola', label:'Kelola', icon:'&#9881;'}
];

let currentPage = 'beranda';

function togglePasswordView(){
  const inp = document.getElementById('loginPassword');
  const btn = document.getElementById('togglePwBtn');
  if(inp.type === 'password'){ inp.type = 'text'; btn.innerHTML = '&#128584;'; }
  else { inp.type = 'password'; btn.innerHTML = '&#128065;'; }
}

/* ---------- LOGIN ---------- */
async function initLogin() {
  try {
    const { data: { session } } = await sb.auth.getSession();
    if (session) {
      const result = await loadSessionFromAuth(session.user.id);
      if (result === 'ok') { await loadAll(); enterApp(); return; }
      // Akun ini bukan admin pusat (mis. ustadz), atau tidak terdaftar -> jangan biarkan masuk otomatis.
      await sb.auth.signOut();
    }
  } catch(e){
    console.warn('initLogin gagal (mungkin offline):', e);
  }
}
/* Login di aplikasi ini khusus untuk role admin_pusat.
   Login ustadz/pembina sudah dipindah ke Aplikasi Pembina yang terpisah. */
async function loadSessionFromAuth(userId) {
  const { data: profil, error } = await sb.from('profil_akun').select('*').eq('id', userId).single();
  if (error || !profil) return 'not_found';
  if (profil.role !== 'admin_pusat') return 'wrong_role';
  SESSION = { userId, role: profil.role, program: profil.program, santriId: profil.santri_id, nama: profil.nama };
  return 'ok';
}
async function doLogin() {
  const btn = document.getElementById('btnMasuk');
  const email = document.getElementById('loginEmail').value.trim();
  const password = document.getElementById('loginPassword').value;
  const errEl = document.getElementById('loginError');
  errEl.style.display = 'none';
  if(!email || !password){
    errEl.textContent = 'Isi email dan password dulu.';
    errEl.style.display = 'block';
    return;
  }
  btn.disabled = true;
  btn.textContent = 'Memeriksa...';
  try {
    const { data, error } = await sb.auth.signInWithPassword({ email, password });
    if (error) {
      errEl.textContent = 'Email atau password salah.';
      errEl.style.display = 'block';
      return;
    }
    const result = await loadSessionFromAuth(data.user.id);
    if (result === 'wrong_role') {
      errEl.textContent = 'Login ustadz/pembina sekarang lewat Aplikasi Pembina, bukan di sini.';
      errEl.style.display = 'block';
      await sb.auth.signOut();
      return;
    }
    if (result === 'not_found') {
      errEl.textContent = 'Akun ini belum terdaftar sebagai pengguna aplikasi. Hubungi admin pusat.';
      errEl.style.display = 'block';
      await sb.auth.signOut();
      return;
    }
    await loadAll();
    enterApp();
  } catch (e) {
    console.error('Login error:', e);
    errEl.textContent = 'Terjadi kesalahan koneksi: ' + e.message;
    errEl.style.display = 'block';
  } finally {
    btn.disabled = false;
    btn.textContent = 'Masuk';
  }
}
async function logout() {
  await sb.auth.signOut();
  SESSION = null;
  document.getElementById('app').style.display='none';
  document.getElementById('loginScreen').style.display='flex';
}
/* Ukur tinggi topbar sebenarnya lalu simpan ke CSS variable --topbar-h,
   supaya .page-head (judul tab yang stuck) selalu nempel persis di
   bawahnya, di layar berapa pun ukurannya. */
function syncTopbarHeight(){
  const tb = document.querySelector('.topbar');
  if(tb) document.documentElement.style.setProperty('--topbar-h', tb.offsetHeight + 'px');
}
window.addEventListener('resize', syncTopbarHeight);

function enterApp(){
  document.getElementById('loginScreen').style.display='none';
  document.getElementById('app').style.removeProperty('display');
  const roleLabel = 'Admin Pusat';
  document.getElementById('userLabel').textContent = SESSION.nama ? (SESSION.nama + ' \u00b7 ' + roleLabel) : roleLabel;
  const oldBanner = document.getElementById('offlineBanner');
  if(oldBanner) oldBanner.remove();
  if(OFFLINE_MODE){
    const b = document.createElement('div');
    b.id = 'offlineBanner';
    b.style.cssText = 'background:#fdecea;color:#c0392b;padding:8px 14px;font-size:13px;text-align:center';
    b.textContent = '\u26A0 Mode offline: menampilkan cadangan data terakhir. Tambah/ubah data tidak tersedia sampai internet kembali.';
    document.getElementById('app').prepend(b);
  }
  renderNav();
  goPage('beranda');
  syncTopbarHeight();
}
function isAdmin(){ return SESSION.role === 'admin_pusat'; }

/* ---------- NAV ---------- */
function renderNav(){
  const items = NAV_ADMIN;
  const html = items.map(i=>`<button class="navitem" data-p="${i.id}" onclick="goPage('${i.id}')"><span class="ic">${i.icon}</span><span>${i.label}</span></button>`).join('');
  const aksiHtml = `<button class="navitem navaction" id="navRefreshBtn" onclick="refreshData()" title="Muat ulang data dari server"><span class="ic">&#8635;</span><span>Refresh</span></button><button class="navitem navaction navaction-danger" onclick="logout()" title="Keluar dari aplikasi"><span class="ic">&#8631;</span><span>Keluar</span></button>`;
  document.getElementById('bottomnav').innerHTML = html + aksiHtml;
  document.getElementById('sidebar').innerHTML = html + aksiHtml;
}
// Muat ulang semua data dari Supabase tanpa perlu login ulang, lalu render ulang halaman yang sedang dibuka.
async function refreshData(){
  const btn = document.getElementById('navRefreshBtn');
  if(btn) btn.classList.add('spinning');
  try{
    await loadAll();
    const oldBanner = document.getElementById('offlineBanner');
    if(oldBanner) oldBanner.remove();
    if(OFFLINE_MODE){
      const b = document.createElement('div');
      b.id = 'offlineBanner';
      b.style.cssText = 'background:#fdecea;color:#c0392b;padding:8px 14px;font-size:13px;text-align:center';
      b.textContent = '\u26A0 Mode offline: menampilkan cadangan data terakhir. Tambah/ubah data tidak tersedia sampai internet kembali.';
      document.getElementById('app').prepend(b);
    }
    goPage(currentPage);
    syncTopbarHeight();
  }catch(e){
    console.error('Gagal memuat ulang data:', e);
    alert('Gagal memuat ulang data. Cek koneksi internet lalu coba lagi.');
  }finally{
    if(btn) btn.classList.remove('spinning');
  }
}
function goPage(p){
  currentPage = p;
  document.querySelectorAll('.navitem').forEach(el=>el.classList.toggle('active', el.dataset.p===p));
  const c = document.getElementById('content');
  if(p==='beranda') c.innerHTML = pageBeranda();
  if(p==='santri') renderSantriPage();
  if(p==='laporan') renderLaporanPage();
  if(p==='rapor') renderRaporPage();
  if(p==='laporanToko') renderKasPage();
  if(p==='tagihan') renderTagihanPage();
  if(p==='pembina') renderPembinaPage();
  if(p==='kelola') renderKelolaPage();
}

/* helper: santri yang boleh dilihat sesuai role */
function visibleSantri(){
  if(isAdmin()) return DB.santri;
  return DB.santri.filter(s=>s.program===SESSION.program);
}
/* santri yang boleh dilihat, sekaligus difilter oleh program_khusus kegiatan (kalau ada) */
function visibleSantriForKegiatan(kegiatanId){
  const keg = DB.kegiatan.find(k=>k.id===kegiatanId);
  const base = visibleSantri();
  if(!keg || !keg.programKhusus) return base;
  return base.filter(s=>s.program===keg.programKhusus);
}
function initial(name){ return (name||'?').split(' ').map(w=>w[0]).slice(0,2).join('').toUpperCase(); }
function todayStr(){ return new Date().toISOString().slice(0,10); }

/* ---------- BERANDA ---------- */
function pageBeranda(){
  const santri = visibleSantri();
  const today = todayStr();
  const hadirHariIni = DB.absensi.filter(a=>a.tanggal===today && a.status==='h' && santri.some(s=>s.id===a.santriId)).length;
  const hafalanHariIni = DB.hafalan.filter(h=>h.tanggal===today && santri.some(s=>s.id===h.santriId)).length;
  return `
    <div class="page-head">
      <h2>Beranda</h2>
      <p class="muted">${isAdmin() ? 'Semua program' : SESSION.program} &middot; ${santri.length} santri</p>
    </div>
    <div class="grid2" style="margin-top:12px">
      <div class="stat"><div class="num">${hadirHariIni}</div><div class="label">Absen hadir hari ini</div></div>
      <div class="stat"><div class="num">${hafalanHariIni}</div><div class="label">Input hafalan hari ini</div></div>
    </div>
    <p class="muted" style="margin-top:8px">Absensi dan hafalan diisi lewat Aplikasi Pembina. Halaman ini hanya menampilkan riwayat/laporannya.</p>
    <div class="card" style="margin-top:14px">
      <div class="card-title">Menu cepat</div>
      <div class="btn-row">
        <button class="btn btn-accent" onclick="goPage('laporan')">Lihat laporan</button>
        <button class="btn" onclick="goPage('santri')">Data santri</button>
      </div>
    </div>
  `;
}

/* ---------- SANTRI: LIST ---------- */
let santriSearchQuery = '';
let santriProgramFilter = 'semua'; // 'semua' | 'Takhossus' | 'Non-Takhossus'
function filteredSantriList(){
  const q = santriSearchQuery.trim().toLowerCase();
  return visibleSantri().filter(s=>{
    if(santriProgramFilter!=='semua' && s.program!==santriProgramFilter) return false;
    if(!q) return true;
    return s.nama.toLowerCase().includes(q) || (s.noInduk||'').toLowerCase().includes(q);
  });
}
function renderSantriPage(){
  document.getElementById('content').innerHTML = `
    <div class="page-head">
      <div class="page-head-top"><h2>Data Santri</h2><button class="btn btn-accent btn-sm" onclick="openSantriForm()">+ Tambah</button></div>
      <div class="filter-bar">
        <div class="filter-search">
          <input type="text" id="santriSearchInput" placeholder="Cari nama atau no. induk santri..." value="${escapeHtml(santriSearchQuery)}" oninput="santriSearchQuery=this.value; renderSantriListBody()">
        </div>
        <select onchange="santriProgramFilter=this.value; renderSantriListBody()">
          <option value="semua" ${santriProgramFilter==='semua'?'selected':''}>Semua Program</option>
          <option value="Takhossus" ${santriProgramFilter==='Takhossus'?'selected':''}>Takhossus</option>
          <option value="Non-Takhossus" ${santriProgramFilter==='Non-Takhossus'?'selected':''}>Non-Takhossus</option>
        </select>
      </div>
    </div>
    <div class="btn-row" style="margin-bottom:10px;margin-top:0">
      <button class="btn btn-sm" onclick="exportSantriExcel()">&#128190; Unduh Excel</button>
      <button class="btn btn-sm" onclick="printSantriTable()">&#128424; Cetak</button>
    </div>
    <div id="santriListBody"></div>
  `;
  renderSantriListBody();
}
function renderSantriListBody(){
  const all = visibleSantri();
  const santri = filteredSantriList();
  const body = document.getElementById('santriListBody');
  if(!body) return;
  body.innerHTML = `
    ${(santriSearchQuery.trim() || santriProgramFilter!=='semua') ? `<p class="filter-count">Menampilkan ${santri.length} dari ${all.length} santri</p>` : ''}
    <div class="card">
      ${santri.length===0 ? '<p class="muted">Tidak ada santri yang cocok dengan pencarian/filter.</p>' : santri.map(s=>`
        <div class="list-item">
          <div style="display:flex;align-items:center;flex:1;gap:10px;cursor:pointer;min-width:0" onclick="santriDetailTab='informasi'; openSantriDetail('${s.id}')">
            ${s.foto ? `<img class="avatar" src="${s.foto}">` : `<div class="avatar">${escapeHtml(initial(s.nama))}</div>`}
            <div style="flex:1;min-width:0">
              <div class="name">${escapeHtml(s.nama)}</div>
              <div class="sub">No. induk ${escapeHtml(s.noInduk)}</div>
            </div>
          </div>
          <span class="tag ${s.program==='Takhossus'?'tag-takhossus':'tag-nontakhossus'}">${escapeHtml(s.program)}</span>
          <button class="btn btn-sm" title="Edit" onclick="event.stopPropagation(); openSantriForm(${JSON.stringify(s).replace(/"/g,'&quot;')})">&#9998;</button>
        </div>`).join('')}
    </div>
  `;
}
function santriExportRows(){
  return visibleSantri().map((s,i)=>({
    'No': i+1, 'Nama': s.nama, 'No. Induk': s.noInduk, 'Jenis Kelamin': s.jenisKelamin==='P'?'Perempuan':'Laki-laki',
    'Kelas': s.kelas==='Lulus'?'Lulus':`Kelas ${s.kelas||''}`, 'Kamar': s.kamar||'',
    'Program': s.program, 'Tetala': s.tetala||'', 'Alamat': s.alamat||'',
    'Tanggal Masuk': s.tglMasuk||'', 'Nama Ayah': s.namaAyah||'', 'Nama Ibu': s.namaIbu||'',
    'Nama Wali': s.namaWali||'', 'No. HP Wali': s.hpWali||''
  }));
}
function exportSantriExcel(){
  const rows = santriExportRows();
  if(rows.length===0){ alert('Belum ada data santri untuk diunduh.'); return; }
  const ws = XLSX.utils.json_to_sheet(rows);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Data Santri');
  XLSX.writeFile(wb, `Data-Santri-${todayStr()}.xlsx`);
}
function printSantriTable(){
  const rows = santriExportRows();
  const cols = rows.length ? Object.keys(rows[0]) : [];
  showModal('Cetak Data Santri', `
    <div id="printArea">
      <h3 style="text-align:center">Data Santri - Pondok Roudhotul Qur'an</h3>
      <div class="table-wrap"><table class="print-table">
        <tr>${cols.map(c=>`<th>${c}</th>`).join('')}</tr>
        ${rows.map(r=>`<tr>${cols.map(c=>`<td>${r[c]}</td>`).join('')}</tr>`).join('')}
      </table></div>
    </div>
    <div class="btn-row"><button class="btn btn-accent" onclick="window.print()">Cetak</button></div>
  `);
}

function openSantriForm(existing){
  const s = existing || {id:null, nama:'', noInduk:String(1000+DB.santri.length+1), foto:'', tetala:'', alamat:'', tglMasuk:todayStr(), jenisKelamin:'L', namaAyah:'', namaIbu:'', namaWali:'', fotoWali:'', kelas:'7', kamar:'', hpWali:'', program: !isAdmin()?SESSION.program:'Non-Takhossus', hafalanAwal:0};
  const isNew = !existing;
  const juzAwal = Math.floor((s.hafalanAwal||0)/20);
  const halAwal = (s.hafalanAwal||0)%20;
  const optsN = (n, selected)=>Array.from({length:n+1},(_,i)=>i).map(v=>`<option value="${v}" ${v===selected?'selected':''}>${v}</option>`).join('');
  showModal('Data Santri', `
    <label>Foto profil</label>
    <input type="file" accept="image/*" onchange="readImageTo(this,'f_foto')">
    <img id="f_fotoPreview" src="${s.foto||''}" style="width:70px;height:70px;border-radius:50%;object-fit:cover;margin-top:6px;${s.foto?'':'display:none'}">
    <input type="hidden" id="f_foto" value="${s.foto||''}">
    <label>Nama lengkap</label><input id="f_nama" value="${escapeHtml(s.nama)}">
    <label>No. induk (untuk kode QR)</label><input id="f_noInduk" value="${escapeHtml(s.noInduk)}">
    <label>Jenis kelamin</label>
    <select id="f_jenisKelamin">
      <option value="L" ${s.jenisKelamin==='L'?'selected':''}>Laki-laki</option>
      <option value="P" ${s.jenisKelamin==='P'?'selected':''}>Perempuan</option>
    </select>
    <label>Tempat, tanggal lahir</label><input id="f_tetala" value="${escapeHtml(s.tetala)}" placeholder="Surabaya, 12 Januari 2015">
    <label>Alamat</label><input id="f_alamat" value="${escapeHtml(s.alamat)}">
    <label>Tanggal masuk</label><input id="f_tglMasuk" type="date" value="${s.tglMasuk}">
    <label>Kelas</label>
    <select id="f_kelas">
      ${['7','8','9','10','11','12','Lulus'].map(k=>`<option value="${k}" ${s.kelas===k?'selected':''}>${k==='Lulus'?'Lulus (sudah lulus sekolah, masih aktif santri)':'Kelas '+k}</option>`).join('')}
    </select>
    <label>Kamar</label><input id="f_kamar" value="${escapeHtml(s.kamar)||''}">
    <p class="muted" style="margin:14px 0 0"><b>Nama ayah &amp; ibu</b> hanya untuk data (tidak dicetak kartu) &mdash; kadang salah satu sudah tiada.</p>
    <label>Nama ayah</label><input id="f_namaAyah" value="${escapeHtml(s.namaAyah)||''}">
    <label>Nama ibu</label><input id="f_namaIbu" value="${escapeHtml(s.namaIbu)||''}">
    <p class="muted" style="margin:14px 0 0"><b>Wali</b> yang dicetak kartunya &mdash; bisa ayah/ibu atau orang lain (mis. wali bukan orang tua kandung).</p>
    <label>Nama wali</label><input id="f_namaWali" value="${escapeHtml(s.namaWali)||''}">
    <label>Foto wali (opsional)</label>
    <input type="file" accept="image/*" onchange="readImageTo(this,'f_fotoWali')">
    <img id="f_fotoWaliPreview" src="${s.fotoWali||''}" style="width:60px;height:60px;border-radius:50%;object-fit:cover;margin-top:6px;${s.fotoWali?'':'display:none'}">
    <input type="hidden" id="f_fotoWali" value="${s.fotoWali||''}">
    <label>No. HP wali</label><input id="f_hpWali" type="tel" inputmode="numeric" value="${escapeHtml(s.hpWali)||''}" placeholder="08xxxxxxxxxx">
    ${isNew?'<p class="muted" style="margin:6px 0 0">Kode wali akan dibuat otomatis (acak) setelah data ini disimpan.</p>':(s.kodeWali?`<p class="muted" style="margin:6px 0 0">Kode wali: <b style="font-size:15px;letter-spacing:1px">${s.kodeWali}</b> (untuk login Aplikasi Wali, tetap sama, tidak berubah kalau data diedit)</p>`:'')}
    <label>Program</label>
    <div class="chip-group" style="margin-top:4px">
      <button type="button" class="pill-btn ${s.program==='Takhossus'?'on':''}" id="prog_tak" ${!isAdmin()?'disabled':''} onclick="setProgram('Takhossus')">Takhossus</button>
      <button type="button" class="pill-btn ${s.program==='Non-Takhossus'?'on':''}" id="prog_non" ${!isAdmin()?'disabled':''} onclick="setProgram('Non-Takhossus')">Non-Takhossus</button>
    </div>
    <input type="hidden" id="f_program" value="${s.program}">
    <label>Total Hafalan Awal (sebelum pakai aplikasi ini)</label>
    <p class="muted" style="margin:0 0 4px">1 juz = 20 halaman. Isi progres hafalan santri saat ini sebelum mulai dicatat lewat aplikasi.</p>
    <div class="grid2">
      <div><label>Juz</label><select id="f_juzAwal">${optsN(30, juzAwal)}</select></div>
      <div><label>Halaman ke-</label><select id="f_halAwal">${optsN(19, halAwal)}</select></div>
    </div>
    <div class="btn-row">
      <button class="btn btn-accent" onclick="saveSantri('${s.id||''}', ${isNew})">Simpan</button>
      ${isNew?'':`<button class="btn" onclick="closeModal(); openCardSantri('${s.id}')">Cetak kartu santri</button>`}
      ${isNew?'':`<button class="btn btn-danger" onclick="deleteSantri('${s.id}')">Hapus</button>`}
    </div>
  `);
}
function setProgram(p){
  document.getElementById('f_program').value = p;
  document.getElementById('prog_tak').classList.toggle('on', p==='Takhossus');
  document.getElementById('prog_non').classList.toggle('on', p==='Non-Takhossus');
}
function readImageTo(input, hiddenId){
  const file = input.files[0]; if(!file) return;
  const reader = new FileReader();
  reader.onload = e=>{
    document.getElementById(hiddenId).value = e.target.result;
    const prev = document.getElementById(hiddenId+'Preview');
    if(prev){ prev.src = e.target.result; prev.style.display='block'; }
  };
  reader.readAsDataURL(file);
}
async function saveSantri(id, isNew){
  const data = {
    nama: val('f_nama'), noInduk: val('f_noInduk'), foto: val('f_foto'),
    tetala: val('f_tetala'), alamat: val('f_alamat'), tglMasuk: val('f_tglMasuk'),
    jenisKelamin: val('f_jenisKelamin'), kelas: val('f_kelas'), kamar: val('f_kamar'),
    namaAyah: val('f_namaAyah'), namaIbu: val('f_namaIbu'),
    namaWali: val('f_namaWali'), fotoWali: val('f_fotoWali'),
    hpWali: val('f_hpWali'), program: val('f_program'),
    hafalanAwal: parseInt(val('f_juzAwal'))*20 + parseInt(val('f_halAwal'))
  };
  if(!data.nama){ alert('Nama wajib diisi'); return; }
  if(OFFLINE_MODE){ alert('Sedang mode offline (tidak ada internet). Data tidak bisa disimpan sekarang.'); return; }
  const row = santriAppToRow(data);
  if(isNew){
    /* Santri baru otomatis dibuatkan "kode wali" (6 digit acak) -- dipakai wali
       untuk login ke Aplikasi Wali bersama No. Induk santri. Coba simpan dengan
       kode acak, ulangi kalau kebetulan bentrok dengan kode yang sudah ada. */
    for(let i=0;i<5;i++){
      const kodeWali = buatKodeLoginBaru();
      const { data: inserted, error } = await sb.from('santri').insert({ ...row, kode_wali: kodeWali }).select().single();
      if(!error){
        await loadAll(); closeModal(); renderSantriPage();
        /* otomatis tampilkan kartu santri (dan kartu wali kalau nama wali diisi) setelah data baru disimpan */
        openCardSantri(inserted.id);
        return;
      }
      if(!(''+error.message).toLowerCase().includes('duplicate')){
        alert('Gagal menyimpan: ' + error.message); return;
      }
      // kalau duplicate, ulangi loop dengan kode wali baru
    }
    alert('Gagal membuat kode wali unik, coba tekan tombol Simpan sekali lagi.');
  } else {
    const { error } = await sb.from('santri').update(row).eq('id', id);
    if(error){ alert('Gagal menyimpan: ' + error.message); return; }
    await loadAll(); closeModal(); renderSantriPage();
  }
}
/* Buat kode wali acak 6 digit angka, dipakai untuk login Aplikasi Wali Santri. */
function buatKodeLoginBaru(){
  return String(Math.floor(100000 + Math.random()*900000));
}
/* Untuk data santri lama (dibuat sebelum fitur kode wali ada) yang belum punya kode wali. */
async function buatKodeWaliSantriLama(id){
  for(let i=0;i<5;i++){
    const kodeWali = buatKodeLoginBaru();
    const { error } = await sb.from('santri').update({ kode_wali: kodeWali }).eq('id', id);
    if(!error){ await loadAll(); openSantriDetail(id); return; }
    if(!(''+error.message).toLowerCase().includes('duplicate')){
      alert('Gagal membuat kode wali: ' + error.message); return;
    }
  }
  alert('Gagal membuat kode wali unik, coba tekan tombol sekali lagi.');
}
async function deleteSantri(id){
  if(!confirm('Hapus data santri ini?')) return;
  const { error } = await sb.from('santri').delete().eq('id', id);
  if(error){ alert('Gagal menghapus: ' + error.message); return; }
  await loadAll();
  closeModal();
  renderSantriPage();
}
function val(id){ return document.getElementById(id).value; }

/* ---------- SANTRI: DETAIL ---------- */
let santriDetailTab = 'informasi';
function openSantriDetail(id){
  const s = DB.santri.find(x=>x.id===id);
  document.getElementById('content').innerHTML = `
    <button class="btn btn-sm" onclick="renderSantriPage()">&larr; Kembali</button>
    <div class="card" style="margin-top:10px;text-align:center">
      ${s.foto?`<img src="${s.foto}" style="width:88px;height:88px;border-radius:50%;object-fit:cover">`:`<div class="avatar" style="width:88px;height:88px;font-size:26px;margin:0 auto">${escapeHtml(initial(s.nama))}</div>`}
      <h2 style="margin-top:10px">${escapeHtml(s.nama)}</h2>
      <p class="muted">No. induk ${escapeHtml(s.noInduk)}</p>
      <div style="margin-top:6px">
        <span class="tag ${s.program==='Takhossus'?'tag-takhossus':'tag-nontakhossus'}" style="cursor:pointer" onclick="toggleProgramInline('${s.id}')">${escapeHtml(s.program)} (ubah)</span>
      </div>
    </div>
    <div class="tabs">
      <button class="tab ${santriDetailTab==='informasi'?'active':''}" onclick="santriDetailTab='informasi'; openSantriDetail('${s.id}')">Informasi</button>
      <button class="tab ${santriDetailTab==='riwayat'?'active':''}" onclick="santriDetailTab='riwayat'; openSantriDetail('${s.id}')">Riwayat</button>
    </div>
    <div id="santriDetailBody"></div>
  `;
  if(santriDetailTab==='riwayat'){
    document.getElementById('santriDetailBody').innerHTML = `
      <div class="card">
        <div class="tabs">
          <button class="tab ${riwayatPeriode==='hari'?'active':''}" onclick="riwayatPeriode='hari'; renderRiwayatSantri('${s.id}')">Hari</button>
          <button class="tab ${riwayatPeriode==='pekan'?'active':''}" onclick="riwayatPeriode='pekan'; renderRiwayatSantri('${s.id}')">Pekan</button>
          <button class="tab ${riwayatPeriode==='bulan'?'active':''}" onclick="riwayatPeriode='bulan'; renderRiwayatSantri('${s.id}')">Bulan</button>
          <button class="tab ${riwayatPeriode==='tahun'?'active':''}" onclick="riwayatPeriode='tahun'; renderRiwayatSantri('${s.id}')">Tahun</button>
        </div>
        <div id="riwayatBody" style="margin-top:10px"></div>
      </div>
    `;
    renderRiwayatSantri(id);
  } else {
    document.getElementById('santriDetailBody').innerHTML = `
      <div class="card">
        <div class="btn-row" style="justify-content:center">
          <button class="btn" onclick="openSantriForm(${JSON.stringify(s).replace(/"/g,'&quot;')})">Edit data</button>
          <button class="btn btn-accent" onclick="openCardSantri('${s.id}')">Cetak kartu santri</button>
          ${s.namaWali?`<button class="btn btn-accent" onclick="openCardWali('${s.id}')">Cetak kartu wali</button>`:''}
          <button class="btn" onclick="unduhDetailSantriWord('${s.id}')">&#128196; Unduh Word</button>
        </div>
      </div>
      <div class="card">
        <div class="card-title">Informasi</div>
        <div class="table-wrap"><table>
          <tr><th>Jenis kelamin</th><td>${s.jenisKelamin==='P'?'Perempuan':'Laki-laki'}</td></tr>
          <tr><th>Kelas</th><td>${s.kelas==='Lulus'?'Lulus (masih aktif santri)':('Kelas '+(s.kelas||'-'))}</td></tr>
          <tr><th>Kamar</th><td>${escapeHtml(s.kamar)||'-'}</td></tr>
          <tr><th>Tetala</th><td>${escapeHtml(s.tetala)||'-'}</td></tr>
          <tr><th>Alamat</th><td>${escapeHtml(s.alamat)||'-'}</td></tr>
          <tr><th>Tanggal masuk</th><td>${s.tglMasuk||'-'}</td></tr>
          <tr><th>Nama ayah</th><td>${escapeHtml(s.namaAyah)||'-'}</td></tr>
          <tr><th>Nama ibu</th><td>${escapeHtml(s.namaIbu)||'-'}</td></tr>
          <tr><th>Nama wali</th><td>${escapeHtml(s.namaWali)||'-'}</td></tr>
          <tr><th>No. HP wali</th><td>${escapeHtml(s.hpWali)||'-'}</td></tr>
          <tr><th>Kode wali</th><td>${s.kodeWali ? `<b style="font-size:15px;letter-spacing:1px">${s.kodeWali}</b> <span class="muted">(untuk login Aplikasi Wali)</span>` : `<button class="btn btn-sm" onclick="buatKodeWaliSantriLama('${s.id}')">Buat kode wali</button>`}</td></tr>
        </table></div>
      </div>
      <div class="card">
        <div class="row"><div class="card-title">Mahram</div><button class="btn btn-sm" onclick="openMahramForm('${s.id}')">+ Tambah</button></div>
        ${(s.mahram||[]).length===0?'<p class="muted">Belum ada data mahram.</p>':s.mahram.map((m,i)=>`
          <div class="list-item">
            ${m.foto?`<img class="avatar" src="${m.foto}">`:`<div class="avatar">${escapeHtml(initial(m.nama))}</div>`}
            <div style="flex:1"><div class="name">${escapeHtml(m.nama)}</div><div class="sub">${escapeHtml(m.hubungan)} &middot; ${escapeHtml(m.hp)}</div></div>
            <button class="btn btn-sm" onclick="openCardMahram('${s.id}',${i})">Kartu</button>
          </div>`).join('')}
      </div>
    `;
  }
}
let riwayatPeriode = 'bulan';
function periodeRange(periode){
  const now = new Date();
  let from = new Date(now);
  if(periode==='hari'){ /* hari ini saja */ }
  else if(periode==='pekan'){ from.setDate(now.getDate() - 7); }
  else if(periode==='bulan'){ from.setDate(now.getDate() - 30); }
  else if(periode==='tahun'){ from.setFullYear(now.getFullYear() - 1); }
  return { from: from.toISOString().slice(0,10), to: now.toISOString().slice(0,10) };
}
function renderRiwayatSantri(santriId){
  const { from, to } = periodeRange(riwayatPeriode);
  const s = DB.santri.find(x=>x.id===santriId);
  const keuangan = DB.transaksiSaldo.filter(t=>t.santriId===santriId && t.tanggal>=from && t.tanggal<=to).sort((a,b)=>b.tanggal.localeCompare(a.tanggal));
  const hafalan = DB.hafalan.filter(h=>h.santriId===santriId && h.tanggal>=from && h.tanggal<=to).sort((a,b)=>b.tanggal.localeCompare(a.tanggal));
  /* Riwayat absensi santri ini diambil dari data yang sama dipakai tab Absensi (DB.absensi),
     bukan tabel/sumber terpisah -- supaya selalu sinkron dengan yang diinput ustadz. */
  const absensi = DB.absensi.filter(a=>a.santriId===santriId && a.tanggal>=from && a.tanggal<=to).sort((a,b)=>b.tanggal.localeCompare(a.tanggal));
  const statusLabel = {h:'Hadir', a:'Alpha', i:'Izin'};
  const namaKegiatan = kid => (DB.kegiatan.find(k=>k.id===kid)||{}).nama || '-';
  const totalPeriode = hafalan.reduce((sum,h)=>sum+(h.jumlahHalaman||1),0);
  const t = totalHafalanSantri(santriId);
  const nh = nilaiHafalanSantri(santriId, from, to);
  const na = nilaiAbsensiSantri(santriId, from, to);
  document.getElementById('riwayatBody').innerHTML = `
    <p class="muted">Periode: ${from} s.d. ${to}</p>

    <div class="section-heading">Penilaian (periode ini)</div>
    <div class="grid2">
      <div class="highlight-box">
        <div class="hb-label">Nilai Hafalan</div>
        <div class="hb-value">${nh.predikat} &middot; ${predikatLabel(nh.predikat)}</div>
        <div class="muted" style="font-size:12px;margin-top:4px">${nh.tambahan} dari target ${nh.target} halaman (${nh.pct}%)</div>
      </div>
      <div class="highlight-box">
        <div class="hb-label">Nilai Absensi</div>
        <div class="hb-value">${na.predikat} &middot; ${predikatLabel(na.predikat)}</div>
        <div class="muted" style="font-size:12px;margin-top:4px">Hadir ${na.hadir} dari ${na.total} (${na.pct}%)</div>
      </div>
    </div>

    <div class="section-heading">Riwayat Hafalan (ditambahkan pada periode ini: ${totalPeriode} halaman)</div>
    <div class="highlight-box">
      <div class="hb-label">Total hafalan keseluruhan</div>
      <div class="hb-value">${t.juz} JUZ ${t.halaman} HALAMAN</div>
    </div>
    <div class="highlight-box">
      <div class="hb-label">Sedang dihafal</div>
      <div class="hb-value">${formatJuzSekarang(santriId).toUpperCase()}</div>
    </div>
    <canvas id="chartSantriHafalan" width="600" height="180" style="width:100%;height:150px;margin-top:8px"></canvas>
    ${hafalan.length===0?'<p class="muted">Belum ada hafalan dicatat pada periode ini.</p>':`
      <div class="table-wrap"><table><tr><th>Tanggal</th><th>Juz</th><th>Halaman</th></tr>
      ${hafalan.map(h=>`<tr><td>${h.tanggal}</td><td>${h.juz}</td><td>${h.halamanDari===h.halamanSampai?h.halamanDari:h.halamanDari+'-'+h.halamanSampai}</td></tr>`).join('')}
      </table></div>`}

    <div class="section-heading">Riwayat Absensi (periode ini)</div>
    <canvas id="chartSantriAbsensi" width="600" height="180" style="width:100%;height:150px"></canvas>
    ${absensi.length===0?'<p class="muted">Belum ada absensi dicatat pada periode ini.</p>':`
      <div class="table-wrap"><table><tr><th>Tanggal</th><th>Kegiatan</th><th>Status</th></tr>
      ${absensi.map(a=>`<tr><td>${a.tanggal}</td><td>${escapeHtml(namaKegiatan(a.kegiatanId))}</td><td>${statusLabel[a.status]||a.status}</td></tr>`).join('')}
      </table></div>`}

    <div class="section-heading">Riwayat Keuangan</div>
    ${keuangan.length===0?'<p class="muted">Belum ada transaksi pada periode ini. (Data keuangan akan muncul di sini setelah Aplikasi Keuangan disambungkan ke database bersama)</p>':`
      <div class="table-wrap"><table><tr><th>Tanggal</th><th>Jenis</th><th>Nominal</th><th>Keterangan</th></tr>
      ${keuangan.map(t=>`<tr><td>${t.tanggal}</td><td>${t.jenis}</td><td>${t.nominal}</td><td>${escapeHtml(t.keterangan)}</td></tr>`).join('')}
      </table></div>`}
  `;
  drawSantriHafalanChart(hafalan);
  drawSantriAbsensiChart(santriId, from, to);
}
/* Grafik tren hafalan (kumulatif) untuk satu santri di halaman detail. */
function drawSantriHafalanChart(hafalanItems){
  const canvas = document.getElementById('chartSantriHafalan');
  if(!canvas) return;
  const ctx = canvas.getContext('2d');
  const W = canvas.width, H = canvas.height, pad = 30;
  ctx.clearRect(0,0,W,H);
  const items = hafalanItems.slice().sort((a,b)=>a.tanggal.localeCompare(b.tanggal));
  if(items.length<2){ ctx.fillStyle='#888'; ctx.font='12px sans-serif'; ctx.fillText('Belum cukup data untuk grafik.', 10, H/2); return; }
  let cum = 0;
  const series = items.map(h=>{ cum += (h.jumlahHalaman||1); return { t:h.tanggal, v:cum }; });
  const maxV = Math.max(1, ...series.map(p=>p.v));
  ctx.strokeStyle='#ddd'; ctx.beginPath(); ctx.moveTo(pad,H-pad); ctx.lineTo(W-10,H-pad); ctx.stroke();
  ctx.strokeStyle='#3b5940'; ctx.lineWidth=2; ctx.beginPath();
  series.forEach((p,i)=>{
    const x = pad + (i/(series.length-1||1)) * (W-pad-20);
    const y = H-pad - (p.v/maxV) * (H-pad-20);
    if(i===0) ctx.moveTo(x,y); else ctx.lineTo(x,y);
  });
  ctx.stroke(); ctx.lineWidth=1;
  ctx.fillStyle='#3b5940'; ctx.font='10px sans-serif'; ctx.fillText('Halaman bertambah (kumulatif periode ini)', pad, 14);
}
/* Grafik persentase kehadiran per kegiatan untuk satu santri di halaman detail. */
function drawSantriAbsensiChart(santriId, from, to){
  const canvas = document.getElementById('chartSantriAbsensi');
  if(!canvas) return;
  const ctx = canvas.getContext('2d');
  const W = canvas.width, H = canvas.height, padL=30, padB=50;
  ctx.clearRect(0,0,W,H);
  const s = DB.santri.find(x=>x.id===santriId);
  const kegiatanList = DB.kegiatan.filter(k=>!k.programKhusus || k.programKhusus===(s&&s.program));
  const rows = kegiatanList.map(k=>{
    const items = DB.absensi.filter(a=>a.santriId===santriId && a.kegiatanId===k.id && a.tanggal>=from && a.tanggal<=to);
    const hadir = items.filter(a=>a.status==='h').length;
    const pct = items.length ? Math.round(hadir/items.length*100) : 0;
    return { k, pct };
  });
  if(rows.length===0){ ctx.fillStyle='#888'; ctx.font='12px sans-serif'; ctx.fillText('Belum ada kegiatan.', 10, H/2); return; }
  const barW = Math.max(14, (W-padL-10) / rows.length - 6);
  ctx.strokeStyle='#ddd'; ctx.beginPath(); ctx.moveTo(padL,H-padB); ctx.lineTo(W-10,H-padB); ctx.stroke();
  rows.forEach((r,i)=>{
    const x = padL + i*(barW+6);
    const h = (r.pct/100) * (H-padB-15);
    ctx.fillStyle = r.pct>=75 ? '#3b5940' : (r.pct>=50 ? '#d19a24' : '#c0392b');
    ctx.fillRect(x, H-padB-h, barW, h);
    ctx.save();
    ctx.translate(x+barW/2, H-padB+4);
    ctx.rotate(Math.PI/4);
    ctx.fillStyle='#555'; ctx.font='9px sans-serif'; ctx.textAlign='left';
    ctx.fillText(r.k.nama, 0, 0);
    ctx.restore();
  });
}
async function toggleProgramInline(id){
  const s = DB.santri.find(x=>x.id===id);
  const baru = s.program==='Takhossus' ? 'Non-Takhossus' : 'Takhossus';
  const { error } = await sb.from('santri').update({ program: baru }).eq('id', id);
  if(error){ alert('Gagal menyimpan: ' + error.message); return; }
  await loadAll();
  openSantriDetail(id);
}

/* ---------- MAHRAM ---------- */
function openMahramForm(santriId){
  showModal('Tambah Mahram', `
    <label>Foto</label>
    <input type="file" accept="image/*" onchange="readImageTo(this,'m_foto')">
    <img id="m_fotoPreview" style="width:60px;height:60px;border-radius:50%;object-fit:cover;margin-top:6px;display:none">
    <input type="hidden" id="m_foto">
    <label>Nama</label><input id="m_nama">
    <label>Hubungan</label>
    <select id="m_hubungan">
      ${['Ayah','Ibu','Kakek','Nenek','Paman','Bibi','Saudara','Saudari'].map(h=>`<option value="${h}">${h}</option>`).join('')}
    </select>
    <label>No. HP</label><input id="m_hp" type="tel" inputmode="numeric" placeholder="08xxxxxxxxxx">
    <div class="btn-row"><button class="btn btn-accent" onclick="saveMahram('${santriId}')">Simpan</button></div>
  `);
}
async function saveMahram(santriId){
  const nama = val('m_nama');
  if(!nama){ alert('Nama wajib diisi'); return; }
  if(OFFLINE_MODE){ alert('Sedang mode offline (tidak ada internet). Data tidak bisa disimpan sekarang.'); return; }
  try {
    const hubungan = val('m_hubungan');
    const { error } = await sb.from('mahram').insert({
      santri_id: santriId, nama, hubungan: hubungan || null, no_hp: val('m_hp') || null, foto_url: val('m_foto') || null
    });
    if(error){ alert('Gagal menyimpan: ' + error.message); return; }
    await loadAll();
    closeModal();
    openSantriDetail(santriId);
  } catch(e){
    console.error('Error simpan mahram:', e);
    alert('Terjadi kesalahan: ' + e.message);
  }
}

/* ---------- KARTU CETAK ---------- */
function downloadCard(filename){
  const card = document.querySelector('#printArea .id-card');
  if(!card){ alert('Kartu tidak ditemukan.'); return; }
  html2canvas(card, {scale:3, backgroundColor:null}).then(canvas=>{
    const link = document.createElement('a');
    link.download = filename + '.png';
    link.href = canvas.toDataURL('image/png');
    link.click();
  }).catch(e=>{ alert('Gagal mengunduh kartu: ' + e.message); });
}
function openCardSantri(santriId){
  const s = DB.santri.find(x=>x.id===santriId);
  showModal('Kartu Santri', `
    <div id="printArea">
      <div class="id-card">
        <div class="head"><img src="icon-192.png"><div class="pn">KARTU SANTRI &middot; PPRQ SENTOL</div></div>
        <div class="body">
          <div class="left">
            ${s.foto?`<img class="photo" src="${s.foto}">`:`<div class="photo"></div>`}
            <div class="info">
              <div class="nm">${escapeHtml(s.nama)}</div>
              <div>No. Induk: <b>${escapeHtml(s.noInduk)}</b></div>
              <div>${escapeHtml(s.program)||''}</div>
              <div>${escapeHtml(s.alamat)||''}</div>
            </div>
          </div>
          <div class="qr" id="qrSantri"></div>
        </div>
      </div>
    </div>
    <div class="btn-row">
      <button class="btn btn-accent" onclick="downloadCard('Kartu-Santri-${s.noInduk}')">&#128190; Unduh</button>
      <button class="btn" onclick="window.print()">&#128424; Cetak</button>
      ${s.namaWali?`<button class="btn" onclick="openCardWali('${s.id}')">Lanjut cetak kartu wali</button>`:''}
    </div>
  `);
  setTimeout(()=>{ new QRCode(document.getElementById('qrSantri'), {text: s.noInduk, width:110, height:110, correctLevel: QRCode.CorrectLevel.M}); }, 50);
}
function openCardWali(santriId){
  const s = DB.santri.find(x=>x.id===santriId);
  if(!s.kodeWali){
    showModal('Kartu Wali Santri', `
      <p class="muted">Santri ini belum punya kode wali (data lama sebelum fitur ini ada). Buat dulu kode walinya, baru kartu bisa dicetak.</p>
      <div class="btn-row"><button class="btn btn-accent" onclick="buatKodeWaliSantriLama('${s.id}').then(()=>openCardWali('${s.id}'))">Buat kode wali</button></div>
    `);
    return;
  }
  showModal('Kartu Wali Santri', `
    <div id="printArea">
      <div class="id-card id-card-wali">
        <div class="head"><img src="icon-192.png"><div class="pn">KARTU WALI SANTRI &middot; PPRQ SENTOL</div></div>
        <div class="body">
          <div class="left">
            ${s.fotoWali?`<img class="photo" src="${s.fotoWali}">`:`<div class="photo photo-placeholder">&#128100;</div>`}
            <div class="info">
              <div class="nm">${escapeHtml(s.namaWali)}</div>
              <div>Wali dari: <b>${escapeHtml(s.nama)}</b></div>
              <div>No. Induk: ${escapeHtml(s.noInduk)}</div>
              <div>${s.hpWali?('HP: '+escapeHtml(s.hpWali)):''}</div>
              <div style="margin-top:4px">Kode Wali: <b style="font-size:14px;letter-spacing:1px">${s.kodeWali}</b></div>
            </div>
          </div>
          <div class="qr" id="qrWali"></div>
        </div>
      </div>
    </div>
    <p class="muted" style="margin-top:8px">No. Induk dan Kode Wali di atas dipakai wali untuk login ke Aplikasi Wali.</p>
    <div class="btn-row">
      <button class="btn btn-accent" onclick="downloadCard('Kartu-Wali-${s.noInduk}')">&#128190; Unduh</button>
      <button class="btn" onclick="window.print()">&#128424; Cetak</button>
    </div>
  `);
  setTimeout(()=>{ new QRCode(document.getElementById('qrWali'), {text: s.noInduk, width:110, height:110, correctLevel: QRCode.CorrectLevel.M}); }, 50);
}
function openCardMahram(santriId, idx){
  const s = DB.santri.find(x=>x.id===santriId);
  const m = s.mahram[idx];
  showModal('Kartu Mahram', `
    <div id="printArea">
      <div class="id-card id-card-mahram">
        <div class="head"><img src="icon-192.png"><div class="pn">KARTU MAHRAM &middot; PPRQ SENTOL</div></div>
        <div class="body">
          <div class="left">
            ${m.foto?`<img class="photo" src="${m.foto}">`:`<div class="photo"></div>`}
            <div class="info">
              <div class="nm">${escapeHtml(m.nama)}</div>
              <div>Hubungan: ${escapeHtml(m.hubungan)}</div>
              <div>No. HP: ${escapeHtml(m.hp)}</div>
              <div>Mahram dari: <b>${escapeHtml(s.nama)}</b></div>
            </div>
          </div>
          <div class="qr" id="qrMahram"></div>
        </div>
      </div>
    </div>
    <div class="btn-row">
      <button class="btn btn-accent" onclick="downloadCard('Kartu-Mahram-${s.noInduk}-${idx}')">&#128190; Unduh</button>
      <button class="btn" onclick="window.print()">&#128424; Cetak</button>
    </div>
  `);
  setTimeout(()=>{ new QRCode(document.getElementById('qrMahram'), {text: s.noInduk+'-M'+idx, width:110, height:110, correctLevel: QRCode.CorrectLevel.M}); }, 50);
}

/* ---------- LAPORAN (riwayat absensi & hafalan, diisi lewat Aplikasi Pembina) ---------- */

let lapTab = 'hafalan';
let lapFrom = '', lapTo = todayStr();
function renderLaporanPage(){
  if(!lapFrom){ const d=new Date(); d.setDate(d.getDate()-30); lapFrom=d.toISOString().slice(0,10); }
  document.getElementById('content').innerHTML = `
    <div class="page-head">
      <div class="page-head-top"><h2>Laporan</h2></div>
      <div class="tabs">
        <button class="tab ${lapTab==='hafalan'?'active':''}" onclick="lapTab='hafalan'; renderLaporanPage()">Hafalan</button>
        <button class="tab ${lapTab==='absensi'?'active':''}" onclick="lapTab='absensi'; renderLaporanPage()">Absensi</button>
      </div>
      <div class="filter-bar">
        <div class="filter-date"><label>Dari</label><input type="date" value="${lapFrom}" onchange="lapFrom=this.value; renderLaporanBody()"></div>
        <div class="filter-date"><label>S.d.</label><input type="date" value="${lapTo}" onchange="lapTo=this.value; renderLaporanBody()"></div>
      </div>
    </div>
    <div id="lapBody"></div>
  `;
  renderLaporanBody();
}
function renderLaporanBody(){
  const santri = visibleSantri();
  if(lapTab==='hafalan') renderLaporanHafalan(santri); else renderLaporanAbsensi(santri);
}
function renderLaporanHafalan(santri){
  const rows = santri.map(s=>{
    const items = DB.hafalan.filter(h=>h.santriId===s.id && h.tanggal>=lapFrom && h.tanggal<=lapTo).sort((a,b)=>a.tanggal.localeCompare(b.tanggal));
    const tambah = items.reduce((sum,h)=>sum+(h.jumlahHalaman||1),0);
    return {s, items, tambah};
  });
  document.getElementById('lapBody').innerHTML = `
    <div class="btn-row" style="margin-bottom:10px">
      <button class="btn btn-sm" onclick="exportHafalanExcel()">&#128190; Unduh Excel</button>
      <button class="btn btn-sm" onclick="printHafalanTable()">&#128424; Cetak</button>
    </div>
    <div class="card">
      <div class="card-title">Total halaman ditambah per santri (periode terpilih)</div>
      <div class="table-wrap"><table><tr><th>Santri</th><th>Jumlah sesi</th><th>Total ditambah</th></tr>
      ${rows.map(r=>`<tr><td>${escapeHtml(r.s.nama)}</td><td>${r.items.length}</td><td><b>${r.tambah}</b> hal.</td></tr>`).join('')}
      </table></div>
    </div>
    <div class="card">
      <div class="card-title">Grafik tren hafalan (total halaman kumulatif)</div>
      <div id="chartHafalanWrap"></div>
    </div>
  `;
  drawTrendChart(rows);
}
function hafalanExportRows(){
  const santri = visibleSantri();
  return santri.map((s,i)=>{
    const items = DB.hafalan.filter(h=>h.santriId===s.id && h.tanggal>=lapFrom && h.tanggal<=lapTo);
    const tambah = items.reduce((sum,h)=>sum+(h.jumlahHalaman||1),0);
    return { 'No': i+1, 'Nama': s.nama, 'No. Induk': s.noInduk, 'Program': s.program, 'Jumlah Sesi': items.length, 'Total Halaman Ditambah': tambah, 'Periode': `${lapFrom} s.d. ${lapTo}` };
  });
}
function exportHafalanExcel(){
  const rows = hafalanExportRows();
  if(rows.length===0){ alert('Belum ada data untuk diunduh.'); return; }
  const ws = XLSX.utils.json_to_sheet(rows);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Laporan Hafalan');
  XLSX.writeFile(wb, `Laporan-Hafalan-${lapFrom}_${lapTo}.xlsx`);
}
function printHafalanTable(){
  const rows = hafalanExportRows();
  const cols = rows.length ? Object.keys(rows[0]) : [];
  showModal('Cetak Laporan Hafalan', `
    <div id="printArea">
      <h3 style="text-align:center">Laporan Hafalan - Pondok Roudhotul Qur'an</h3>
      <p style="text-align:center" class="muted">Periode: ${lapFrom} s.d. ${lapTo}</p>
      <div class="table-wrap"><table class="print-table">
        <tr>${cols.map(c=>`<th>${c}</th>`).join('')}</tr>
        ${rows.map(r=>`<tr>${cols.map(c=>`<td>${r[c]}</td>`).join('')}</tr>`).join('')}
      </table></div>
    </div>
    <div class="btn-row"><button class="btn btn-accent" onclick="window.print()">Cetak</button></div>
  `);
}
/* Ubah deretan titik [x,y] jadi path SVG kurva halus (Catmull-Rom -> Bezier),
   supaya garis tren tidak patah-patah seperti garis lurus biasa. */
function smoothPathD(pts){
  if(pts.length<2) return '';
  if(pts.length===2) return `M${pts[0][0]},${pts[0][1]} L${pts[1][0]},${pts[1][1]}`;
  let d = `M${pts[0][0]},${pts[0][1]}`;
  for(let i=0;i<pts.length-1;i++){
    const p0 = pts[i-1] || pts[i];
    const p1 = pts[i];
    const p2 = pts[i+1];
    const p3 = pts[i+2] || p2;
    const cp1x = p1[0] + (p2[0]-p0[0])/6, cp1y = p1[1] + (p2[1]-p0[1])/6;
    const cp2x = p2[0] - (p3[0]-p1[0])/6, cp2y = p2[1] - (p3[1]-p1[1])/6;
    d += ` C${cp1x.toFixed(1)},${cp1y.toFixed(1)} ${cp2x.toFixed(1)},${cp2y.toFixed(1)} ${p2[0]},${p2[1]}`;
  }
  return d;
}
function fmtTglSingkat(t){
  const d = new Date(t);
  return d.toLocaleDateString('id-ID', {day:'2-digit', month:'short'});
}
function drawTrendChart(rows){
  const wrap = document.getElementById('chartHafalanWrap');
  if(!wrap) return;
  const colors = ['#3b5940','#c0392b','#d19a24','#2f7d9d','#8a4baf','#c2669b'];
  const allSeries = rows.map(r=>{
    let cum = 0;
    return r.items.map(h=>{ cum += (h.jumlahHalaman||1); return {t:h.tanggal, v:cum}; });
  });
  const maxV = Math.max(1, ...allSeries.flat().map(p=>p.v));
  const allDates = [...new Set(allSeries.flat().map(p=>p.t))].sort();
  if(allDates.length<2){
    wrap.innerHTML = `<div style="text-align:center;padding:34px 10px;color:#999;font-size:13px;background:#f7f7f4;border-radius:10px">Belum cukup data untuk menampilkan grafik tren pada periode ini.</div>`;
    return;
  }
  const W = 640, H = 260, padL = 40, padR = 14, padT = 16, padB = 30;
  const innerW = W-padL-padR, innerH = H-padT-padB;
  const xFor = t => padL + (allDates.indexOf(t)/((allDates.length-1)||1)) * innerW;
  const yFor = v => padT + innerH - (v/maxV) * innerH;
  const steps = 4;
  let svg = `<svg viewBox="0 0 ${W} ${H}" style="width:100%;height:auto;display:block;background:#fbfbf8;border-radius:12px" xmlns="http://www.w3.org/2000/svg">`;
  for(let i=0;i<=steps;i++){
    const v = Math.round(maxV*i/steps);
    const y = yFor(v);
    svg += `<line x1="${padL}" y1="${y.toFixed(1)}" x2="${W-padR}" y2="${y.toFixed(1)}" stroke="#e8e8e3" stroke-width="1"/>`;
    svg += `<text x="${padL-8}" y="${(y+3.5).toFixed(1)}" font-size="10" fill="#999" text-anchor="end">${v}</text>`;
  }
  svg += `<line x1="${padL}" y1="${(padT+innerH).toFixed(1)}" x2="${W-padR}" y2="${(padT+innerH).toFixed(1)}" stroke="#ccc" stroke-width="1.2"/>`;
  [0, Math.floor((allDates.length-1)/2), allDates.length-1].forEach(idx=>{
    const t = allDates[idx];
    svg += `<text x="${xFor(t).toFixed(1)}" y="${H-8}" font-size="10" fill="#999" text-anchor="middle">${fmtTglSingkat(t)}</text>`;
  });
  rows.forEach((r,idx)=>{
    const series = allSeries[idx];
    if(series.length<1) return;
    const color = colors[idx%colors.length];
    const pts = series.map(p=>[+xFor(p.t).toFixed(1), +yFor(p.v).toFixed(1)]);
    if(pts.length===1){
      svg += `<circle cx="${pts[0][0]}" cy="${pts[0][1]}" r="4" fill="${color}"><title>${escapeHtml(r.s.nama)}: ${series[0].v} halaman (${series[0].t})</title></circle>`;
    } else {
      svg += `<path d="${smoothPathD(pts)}" fill="none" stroke="${color}" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>`;
      pts.forEach((p,i)=>{
        svg += `<circle cx="${p[0]}" cy="${p[1]}" r="3" fill="#fff" stroke="${color}" stroke-width="2"><title>${escapeHtml(r.s.nama)}: ${series[i].v} halaman (${series[i].t})</title></circle>`;
      });
    }
  });
  svg += `</svg>`;
  const legend = rows.map((r,idx)=>`
    <span style="display:inline-flex;align-items:center;gap:5px;font-size:11px;color:#555;margin:4px 12px 0 0">
      <span style="width:9px;height:9px;border-radius:50%;background:${colors[idx%colors.length]};display:inline-block;flex:none"></span>${escapeHtml(r.s.nama)}
    </span>`).join('');
  wrap.innerHTML = svg + `<div style="margin-top:6px;display:flex;flex-wrap:wrap">${legend}</div>`;
}
let tidakHadirPeriode = 'hari';
function tidakHadirRange(periode){
  const now = new Date();
  let from = new Date(now);
  if(periode==='hari'){ /* hari ini saja */ }
  else if(periode==='pekan'){ from.setDate(now.getDate() - 7); }
  else if(periode==='bulan'){ from.setDate(now.getDate() - 30); }
  else if(periode==='tahun'){ from.setFullYear(now.getFullYear() - 1); }
  return { from: from.toISOString().slice(0,10), to: now.toISOString().slice(0,10) };
}
/* Santri dianggap "tidak hadir" pada suatu kegiatan dalam periode tertentu kalau:
   - tidak ada catatan absensi sama sekali untuk kegiatan itu dalam periode (belum pernah diabsen), atau
   - seluruh catatan yang ada berstatus bukan Hadir (Alpha/Izin). */
function renderDaftarTidakHadir(){
  const { from, to } = tidakHadirRange(tidakHadirPeriode);
  const kegiatanList = DB.kegiatan;
  const labelPeriode = {hari:'Hari ini', pekan:'7 hari terakhir', bulan:'30 hari terakhir', tahun:'1 tahun terakhir'}[tidakHadirPeriode];
  const blocks = kegiatanList.map(k=>{
    const santriKeg = visibleSantriForKegiatan(k.id);
    const tidakHadir = santriKeg.filter(s=>{
      const rec = DB.absensi.filter(a=>a.santriId===s.id && a.kegiatanId===k.id && a.tanggal>=from && a.tanggal<=to);
      if(rec.length===0) return true;
      return rec.every(r=>r.status!=='h');
    });
    return {k, tidakHadir};
  });
  return `
    <div class="card">
      <div class="section-heading">Daftar Tidak Hadir</div>
      <div class="tabs">
        <button class="tab ${tidakHadirPeriode==='hari'?'active':''}" onclick="tidakHadirPeriode='hari'; renderLaporanPage()">Hari</button>
        <button class="tab ${tidakHadirPeriode==='pekan'?'active':''}" onclick="tidakHadirPeriode='pekan'; renderLaporanPage()">Pekan</button>
        <button class="tab ${tidakHadirPeriode==='bulan'?'active':''}" onclick="tidakHadirPeriode='bulan'; renderLaporanPage()">Bulan</button>
        <button class="tab ${tidakHadirPeriode==='tahun'?'active':''}" onclick="tidakHadirPeriode='tahun'; renderLaporanPage()">Tahun</button>
      </div>
      <p class="muted">Periode: ${labelPeriode} (${from} s.d. ${to}). Santri tanpa catatan Hadir pada kegiatan berikut dianggap tidak hadir.</p>
      ${blocks.map(b=>`
        <div style="margin-top:12px">
          <div style="font-weight:700;font-size:13px">${escapeHtml(b.k.nama)}${b.k.programKhusus?` <span class="muted" style="font-weight:400">(khusus ${escapeHtml(b.k.programKhusus)})</span>`:''}</div>
          ${b.tidakHadir.length===0
            ? '<p class="muted" style="margin:4px 0 0">Semua santri hadir/tercatat pada periode ini.</p>'
            : `<ul style="margin:6px 0 0;padding-left:18px">${b.tidakHadir.map(s=>`<li>${escapeHtml(s.nama)}</li>`).join('')}</ul>`}
        </div>
      `).join('')}
    </div>
  `;
}
/* Warna latar & teks kartu persentase kehadiran, berdasarkan ambang predikat
   yang sama dipakai di seluruh aplikasi (>=90 Sangat baik ... <50 Perlu perhatian). */
function pctAbsensiStyle(pct){
  if(pct>=90) return {bg:'#dcefe1', fg:'#1f5c37'};
  if(pct>=75) return {bg:'#eaf5ec', fg:'#2f6b47'};
  if(pct>=50) return {bg:'#fdf1da', fg:'#8a5a13'};
  return {bg:'#fbe0dc', fg:'#c0392b'};
}
function renderLaporanAbsensi(santri){
  const rows = santri.map(s=>{
    const items = DB.absensi.filter(a=>a.santriId===s.id && a.tanggal>=lapFrom && a.tanggal<=lapTo);
    const hadir = items.filter(a=>a.status==='h').length;
    const pct = items.length ? Math.round(hadir/items.length*100) : 0;
    let predikat = pct>=90?'Sangat baik':pct>=75?'Baik':pct>=50?'Cukup':'Perlu perhatian';
    return {s, total:items.length, hadir, pct, predikat};
  }).sort((a,b)=>b.pct-a.pct);
  const rataRata = rows.length ? Math.round(rows.reduce((sum,r)=>sum+r.pct,0)/rows.length) : 0;
  const rataStyle = pctAbsensiStyle(rataRata);
  document.getElementById('lapBody').innerHTML = `
    <div class="card" style="text-align:center;background:${rataStyle.bg};border-radius:14px">
      <div style="font-size:12px;font-weight:700;letter-spacing:.3px;color:${rataStyle.fg};opacity:.85">RATA-RATA KEHADIRAN &middot; ${rows.length} SANTRI</div>
      <div style="font-size:46px;font-weight:800;color:${rataStyle.fg};margin-top:2px">${rataRata}%</div>
    </div>
    <div class="card">
      <div class="card-title">Persentase kehadiran per santri (periode terpilih)</div>
      <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(132px,1fr));gap:10px;margin-top:8px">
        ${rows.length===0 ? '<p class="muted">Belum ada data.</p>' : rows.map(r=>{
          const st = pctAbsensiStyle(r.pct);
          return `
          <div style="background:${st.bg};border-radius:12px;padding:14px 8px;text-align:center">
            <div style="font-size:12px;font-weight:600;color:${st.fg};white-space:nowrap;overflow:hidden;text-overflow:ellipsis" title="${escapeHtml(r.s.nama)}">${escapeHtml(r.s.nama)}</div>
            <div style="font-size:28px;font-weight:800;color:${st.fg};margin-top:2px">${r.pct}%</div>
            <div style="font-size:11px;color:${st.fg};opacity:.8;margin-top:2px">${r.hadir}/${r.total} hadir</div>
            <div style="font-size:10px;color:${st.fg};opacity:.7">${r.predikat}</div>
          </div>`;
        }).join('')}
      </div>
    </div>
    ${renderDaftarTidakHadir()}
  `;
}

/* ---------- LAPORAN TOKO: sub-tab KAS & LABA ======
   READ-ONLY — data ini milik aplikasi kasir toko, di sini hanya dibaca.
   Sumber data:
   - view v_ringkasan_toko: kas_awal, saldo_kas, nilai_stok, laba_kumulatif,
     piutang, modal_saat_ini (angka kumulatif, sudah dihitung di server oleh
     aplikasi kasir toko lewat migration supabase_ringkasan_toko_migration.sql).
   - tabel kas_mutasi (dibaca saja): buat hitung kas masuk/keluar & operasional
     dalam rentang tanggal terpilih (kasFrom–kasTo).
   - view v_transaksi_item (dibaca saja): detail per item terjual, buat hitung
     omzet & laba dalam rentang tanggal terpilih, dipisah per metode bayar.
   Semua difilter ke satu lokasi (KAS_LOKASI_DEFAULT = 'Utama').

   -- Sub-tab KAS (posisi keuangan saat ini, tidak terikat periode) --
   Saldo Kas  = modal awal + kas masuk - kas keluar (semua digabung, tanpa pisah lokasi)
   Nilai Stok = jumlah (stok x harga beli) semua produk
   Total Laba = total laba kotor kumulatif dari SELURUH transaksi penjualan (all-time)
   Modal Saat Ini = Saldo Kas + Nilai Stok - Total Laba
   (Modal Saat Ini seharusnya stabil dari waktu ke waktu; kalau tiba-tiba turun
    sendiri di luar Prive/Biaya Operasional yang dicatat, tandanya ada barang
    hilang/susut atau salah catat.)
   Piutang    = total transaksi dengan metode Hutang yang belum lunas.
                Ini murni catatan hutang pelanggan, TIDAK ikut dihitung di
                Saldo Kas / Nilai Stok / Total Laba / Modal Saat Ini di atas.

   -- Sub-tab LABA (arus laba dalam rentang tanggal terpilih) --
   Omzet       = total nilai semua transaksi penjualan dalam periode
   Laba Tunai  = laba kotor dari transaksi metode Tunai/Saldo (uang sudah diterima)
   Laba Kredit = laba kotor dari transaksi metode Hutang
   Total Laba  = Laba Tunai + Laba Kredit (khusus periode terpilih)
   Operasional = total kas keluar kategori "operasional" dalam periode
   Laba Bersih = Total Laba - Operasional
   (laba kotor per transaksi dihitung dari harga jual - harga beli produk saat ini) ------- */
let kasFrom = '', kasTo = todayStr();
let laporanTokoTab = 'kas'; // 'kas' | 'laba'
let KAS_DATA = null;
const KAS_LOKASI_DEFAULT = 'Pondok'; // harus sama persis dengan nilai "lokasi" yang dipakai aplikasi kasir toko

function formatRupiah(n){
  return 'Rp' + Math.round(n||0).toLocaleString('id-ID');
}
async function loadKasData(){
  try {
    const [ringkasanRes, mutasiRes, itemRes] = await Promise.all([
      // Ringkasan kas & modal kumulatif (kas_awal, saldo_kas, nilai_stok, laba_kumulatif,
      // piutang, modal_saat_ini) sudah dihitung di server oleh view v_ringkasan_toko —
      // rumusnya sama persis dengan yang dipakai aplikasi kasir toko.
      sb.from('v_ringkasan_toko').select('*').eq('lokasi', KAS_LOKASI_DEFAULT).maybeSingle(),
      // Mutasi kas manual (buat hitung kas masuk/keluar & operasional per periode tanggal).
      sb.from('kas_mutasi').select('arah,kategori,jumlah,tanggal').eq('lokasi', KAS_LOKASI_DEFAULT),
      // Detail per item terjual (buat hitung laba per periode tanggal & per metode bayar).
      sb.from('v_transaksi_item').select('metode,status_bayar,dibatalkan,created_at,qty,harga_jual,harga_beli').eq('lokasi', KAS_LOKASI_DEFAULT)
    ]);
    if(ringkasanRes.error) throw ringkasanRes.error;
    if(mutasiRes.error) throw mutasiRes.error;
    if(itemRes.error) throw itemRes.error;
    KAS_DATA = {
      ringkasan: ringkasanRes.data || null,
      mutasi: mutasiRes.data || [],
      transaksiItem: itemRes.data || []
    };
  } catch(e){
    console.error('Gagal memuat data laporan toko:', e);
    KAS_DATA = 'error';
  }
}
function labaKotorItem(it){
  const hj = Number(it.harga_jual)||0, hb = Number(it.harga_beli)||0, qty = Number(it.qty)||0;
  return (hj-hb)*qty;
}
function hitungKas(){
  const r = KAS_DATA.ringkasan || {};
  const modalAwal = Number(r.kas_awal)||0;
  const totalSaldoKas = Number(r.saldo_kas)||0;
  const totalNilaiStok = Number(r.nilai_stok)||0;
  const totalLaba = Number(r.laba_kumulatif)||0;
  const modalSaatIni = Number(r.modal_saat_ini)||0;
  const totalPiutang = Number(r.piutang)||0;
  const biayaOperasional = Number(r.biaya_operasional_kumulatif)||0;
  const totalPrive = Number(r.prive_kumulatif)||0;

  const masukPeriode = KAS_DATA.mutasi.filter(m=>m.arah==='masuk' && (m.tanggal||'').slice(0,10)>=kasFrom && (m.tanggal||'').slice(0,10)<=kasTo).reduce((s,m)=>s+Number(m.jumlah),0);
  const keluarPeriode = KAS_DATA.mutasi.filter(m=>m.arah==='keluar' && (m.tanggal||'').slice(0,10)>=kasFrom && (m.tanggal||'').slice(0,10)<=kasTo).reduce((s,m)=>s+Number(m.jumlah),0);

  return { modalAwal, totalSaldoKas, totalNilaiStok, totalLaba, modalSaatIni, totalPiutang, biayaOperasional, totalPrive, masukPeriode, keluarPeriode };
}
function hitungLaba(){
  const itemsPeriode = KAS_DATA.transaksiItem.filter(it=>!it.dibatalkan && (it.created_at||'').slice(0,10)>=kasFrom && (it.created_at||'').slice(0,10)<=kasTo);
  const omzet = itemsPeriode.reduce((s,it)=>s+(Number(it.harga_jual)||0)*(Number(it.qty)||0),0);
  const labaTunai = itemsPeriode.filter(it=>it.metode==='Tunai'||it.metode==='Saldo').reduce((s,it)=>s+labaKotorItem(it),0);
  const labaKredit = itemsPeriode.filter(it=>it.metode==='Hutang').reduce((s,it)=>s+labaKotorItem(it),0);
  const totalLaba = labaTunai + labaKredit;
  const operasional = KAS_DATA.mutasi.filter(m=>m.kategori==='operasional' && m.arah==='keluar' && (m.tanggal||'').slice(0,10)>=kasFrom && (m.tanggal||'').slice(0,10)<=kasTo).reduce((s,m)=>s+Number(m.jumlah),0);
  const labaBersih = totalLaba - operasional;
  return { omzet, labaTunai, labaKredit, totalLaba, operasional, labaBersih };
}
function renderKasPage(){
  if(!kasFrom){ const d=new Date(); d.setDate(d.getDate()-30); kasFrom=d.toISOString().slice(0,10); }
  document.getElementById('content').innerHTML = `
    <div class="page-head">
      <div class="page-head-top"><h2>Laporan Toko</h2></div>
      <div class="tabs">
        <button class="tab ${laporanTokoTab==='kas'?'active':''}" onclick="laporanTokoTab='kas'; renderKasPage()">Kas</button>
        <button class="tab ${laporanTokoTab==='laba'?'active':''}" onclick="laporanTokoTab='laba'; renderKasPage()">Laba</button>
      </div>
      <div class="filter-bar">
        <div class="filter-date"><label>Dari</label><input type="date" value="${kasFrom}" onchange="kasFrom=this.value; renderKasBody()"></div>
        <div class="filter-date"><label>S.d.</label><input type="date" value="${kasTo}" onchange="kasTo=this.value; renderKasBody()"></div>
      </div>
    </div>
    <div class="btn-row" style="margin-bottom:10px">
      <button class="btn btn-sm" onclick="unduhLaporanTokoWord()">&#128196; Unduh Word</button>
    </div>
    <div id="kasBody"><p class="muted">Memuat data...</p></div>
  `;
  renderKasBody();
}
async function renderKasBody(){
  await loadKasData();
  const body = document.getElementById('kasBody');
  if(!body) return; // pengguna sudah pindah halaman sebelum data selesai dimuat
  if(KAS_DATA==='error'){
    body.innerHTML = `<p class="muted" style="color:var(--danger)">Gagal memuat data. Periksa koneksi internet.</p><button class="btn" onclick="renderKasBody()">Muat Ulang</button>`;
    return;
  }
  if(laporanTokoTab==='laba') renderLabaBody(body); else renderKasBodyKas(body);
}
function renderKasBodyKas(body){
  const k = hitungKas();
  body.innerHTML = `
    <div class="grid2">
      <div class="stat"><div class="num">${formatRupiah(k.totalSaldoKas)}</div><div class="label">Saldo Kas</div></div>
      <div class="stat"><div class="num">${formatRupiah(k.totalNilaiStok)}</div><div class="label">Nilai Stok</div></div>
    </div>
    <div class="card" style="margin-top:12px">
      <div class="card-title">Modal</div>
      <p class="muted" style="margin-top:-6px;margin-bottom:10px">Modal = uang tunai + nilai barang di rak, dikeluarkan dari laba yang sudah dihasilkan. Angka ini seharusnya <b>stabil</b> dari waktu ke waktu — kalau tiba-tiba turun sendiri (di luar Prive/Biaya Operasional yang kamu catat), itu tanda ada barang hilang/susut atau salah catat.</p>
      <div class="list-item">
        <div class="name" style="flex:1">Saldo Kas</div>
        <div style="font-weight:600">${formatRupiah(k.totalSaldoKas)}</div>
      </div>
      <div class="list-item">
        <div class="name" style="flex:1">+ Nilai Stok</div>
        <div style="font-weight:600">${formatRupiah(k.totalNilaiStok)}</div>
      </div>
      <div class="list-item">
        <div class="name" style="flex:1">+ Piutang (Hutang Belum Lunas)</div>
        <div style="font-weight:600">${formatRupiah(k.totalPiutang)}</div>
      </div>
      <div class="list-item">
        <div class="name" style="flex:1">– Total Laba</div>
        <div style="font-weight:600">${formatRupiah(k.totalLaba)}</div>
      </div>
      ${k.biayaOperasional>0 ? `
      <div class="list-item">
        <div class="name" style="flex:1">+ Biaya Operasional</div>
        <div style="font-weight:600">${formatRupiah(k.biayaOperasional)}</div>
      </div>` : ''}
      ${k.totalPrive>0 ? `
      <div class="list-item">
        <div class="name" style="flex:1">+ Prive</div>
        <div style="font-weight:600">${formatRupiah(k.totalPrive)}</div>
      </div>` : ''}
      <div class="list-item" style="border-top:2px solid var(--border);border-bottom:none;margin-top:2px;padding-top:12px">
        <div class="name" style="flex:1">Modal Saat Ini</div>
        <div style="font-weight:700;font-size:18px;color:${k.modalSaatIni>=0?'var(--green-700)':'var(--danger)'}">${formatRupiah(k.modalSaatIni)}</div>
      </div>
    </div>
    <div class="card" style="margin-top:12px">
      <div class="card-title">Piutang</div>
      <div style="font-size:20px;font-weight:700">${formatRupiah(k.totalPiutang)}</div>
      <p class="muted" style="margin-top:4px">Hutang pelanggan yang belum bayar. Barang sudah keluar dari stok tapi uangnya belum masuk kas, jadi ini dihitung sebagai aset tersendiri — sudah ikut ditambahkan di perhitungan Modal Saat Ini di atas.</p>
    </div>
    <div class="card" style="margin-top:12px">
      <div class="row"><div class="card-title" style="margin-bottom:0">Arus Kas</div></div>
      <p class="muted" style="margin:2px 0 8px">Periode: ${kasFrom} s.d. ${kasTo}</p>
      <div class="grid2">
        <div class="stat"><div class="num">${formatRupiah(k.masukPeriode)}</div><div class="label">Kas Masuk</div></div>
        <div class="stat"><div class="num">${formatRupiah(k.keluarPeriode)}</div><div class="label">Kas Keluar</div></div>
      </div>
    </div>
    <div class="card" style="margin-top:12px">
      <div class="row"><div class="card-title" style="margin-bottom:0">Modal Awal</div></div>
      <div style="font-size:18px;font-weight:600;margin-top:4px">${formatRupiah(k.modalAwal)}</div>
      <p class="muted" style="margin-top:4px">Data ini bersumber dari aplikasi kasir toko (read-only). Untuk mengubahnya, gunakan aplikasi kasir toko.</p>
    </div>
  `;
}
function renderLabaBody(body){
  const l = hitungLaba();
  body.innerHTML = `
    <p class="muted" style="margin:0 0 8px">Periode: ${kasFrom} s.d. ${kasTo}</p>
    <div class="grid2">
      <div class="stat"><div class="num">${formatRupiah(l.omzet)}</div><div class="label">Omzet</div></div>
      <div class="stat"><div class="num">${formatRupiah(l.labaTunai)}</div><div class="label">Laba Tunai</div></div>
      <div class="stat"><div class="num">${formatRupiah(l.labaKredit)}</div><div class="label">Laba Kredit</div></div>
      <div class="stat"><div class="num">${formatRupiah(l.totalLaba)}</div><div class="label">Total Laba</div></div>
    </div>
    <div class="card" style="margin-top:12px">
      <div class="card-title">Operasional</div>
      <div style="font-size:20px;font-weight:700">${formatRupiah(l.operasional)}</div>
      <p class="muted" style="margin-top:4px">Total kas keluar kategori operasional dalam periode ini.</p>
    </div>
    <div class="card" style="margin-top:12px">
      <div class="card-title">Laba Bersih</div>
      <div style="font-size:24px;font-weight:700;color:${l.labaBersih>=0?'var(--green-700)':'var(--danger)'}">${formatRupiah(l.labaBersih)}</div>
      <p class="muted" style="margin-top:4px">Total laba dikurangi biaya operasional.</p>
    </div>
  `;
}
/* Catatan: form "Catat Kas Masuk/Keluar" dan "Ubah Modal Awal" sudah dihapus dari
   sini. Laporan Toko di aplikasi pondok ini sekarang READ-ONLY — semua pencatatan
   (kas masuk/keluar, modal awal) dilakukan lewat aplikasi kasir toko, lalu dibaca
   di sini lewat view v_ringkasan_toko & v_transaksi_item supaya angkanya selalu
   sinkron dengan satu sumber kebenaran (data aplikasi kasir toko). */

/* ---------- TAGIHAN (dari data Aplikasi Keuangan) ------------------------
   Menampilkan tagihan (SPP/cicilan, dari tabel tagihan+jenis_tagihan) dan
   iuran/sosial (dari tabel iuran+iuran_detail) berikut nama-nama santri
   yang belum bayar. Data hanya ditampilkan (baca saja) di aplikasi pondok;
   pembayaran tetap dicatat lewat Aplikasi Keuangan. --------------------- */
let tagihanSubTab = 'tagihan'; // 'tagihan' | 'iuran'
let TAGIHAN_DATA = null;
const NAMA_BULAN = ['Januari','Februari','Maret','April','Mei','Juni','Juli','Agustus','September','Oktober','November','Desember'];

async function loadTagihanData(){
  try {
    const [tagihanRes, jenisRes, iuranRes, iuranDetailRes] = await Promise.all([
      sb.from('tagihan').select('*'),
      sb.from('jenis_tagihan').select('*'),
      sb.from('iuran').select('*'),
      sb.from('iuran_detail').select('*')
    ]);
    if(tagihanRes.error) throw tagihanRes.error;
    if(jenisRes.error) throw jenisRes.error;
    if(iuranRes.error) throw iuranRes.error;
    if(iuranDetailRes.error) throw iuranDetailRes.error;
    TAGIHAN_DATA = {
      tagihan: tagihanRes.data || [],
      jenis: jenisRes.data || [],
      iuran: iuranRes.data || [],
      iuranDetail: iuranDetailRes.data || []
    };
  } catch(e){
    console.error('Gagal memuat data tagihan:', e);
    TAGIHAN_DATA = 'error';
  }
}
function namaJenisTagihan(id){
  const j = TAGIHAN_DATA.jenis.find(x=>x.id===id);
  return j ? j.nama : 'Tagihan';
}
function namaSantriById(id){
  const s = DB.santri.find(x=>x.id===id);
  return s ? s.nama : '(santri tidak aktif/tidak ditemukan)';
}
function bulanLabel(bulan){
  if(!bulan) return '-';
  const [y,m] = bulan.split('-');
  return `${NAMA_BULAN[Number(m)-1]||m} ${y}`;
}
/* Gabungkan tagihan per jenis+bulan, supaya tampak "SPP - Agustus 2026"
   sebagai satu kelompok berikut siapa saja yang belum bayar. */
function groupTagihan(){
  const groups = {};
  TAGIHAN_DATA.tagihan.forEach(t=>{
    const key = t.jenis_tagihan_id + '|' + t.bulan;
    if(!groups[key]) groups[key] = { jenisId: t.jenis_tagihan_id, bulan: t.bulan, items: [] };
    groups[key].items.push(t);
  });
  return Object.values(groups).sort((a,b)=> String(b.bulan).localeCompare(String(a.bulan)));
}
function renderTagihanPage(){
  document.getElementById('content').innerHTML = `
    <div class="page-head">
      <div class="page-head-top"><h2>Tagihan</h2></div>
      <div class="tabs">
        <button class="tab ${tagihanSubTab==='tagihan'?'active':''}" onclick="tagihanSubTab='tagihan'; renderTagihanPage()">Tagihan</button>
        <button class="tab ${tagihanSubTab==='iuran'?'active':''}" onclick="tagihanSubTab='iuran'; renderTagihanPage()">Iuran</button>
      </div>
      <p class="muted" style="margin:6px 2px 0;font-size:11px">Data tagihan &amp; iuran ditarik dari Aplikasi Keuangan (baca saja). Pembayaran dicatat lewat Aplikasi Keuangan.</p>
    </div>
    <div id="tagihanBody"><p class="muted">Memuat data...</p></div>
  `;
  renderTagihanBody();
}
async function renderTagihanBody(){
  await loadTagihanData();
  const body = document.getElementById('tagihanBody');
  if(!body) return; // pengguna sudah pindah halaman sebelum data selesai dimuat
  if(TAGIHAN_DATA==='error'){
    body.innerHTML = `<p class="muted" style="color:var(--danger)">Gagal memuat data. Periksa koneksi internet.</p><button class="btn" onclick="renderTagihanBody()">Muat Ulang</button>`;
    return;
  }
  if(tagihanSubTab==='iuran') renderIuranBody(body); else renderTagihanBodyTagihan(body);
}
function renderTagihanBodyTagihan(body){
  const groups = groupTagihan();
  if(groups.length===0){ body.innerHTML = '<div class="card"><p class="muted">Belum ada data tagihan.</p></div>'; return; }
  body.innerHTML = groups.map(g=>{
    const belum = g.items.filter(t=>t.status==='belum').sort((a,b)=>namaSantriById(a.santri_id).localeCompare(namaSantriById(b.santri_id)));
    const lunas = g.items.filter(t=>t.status==='lunas');
    return `
      <div class="card" style="margin-top:12px">
        <div class="row"><div class="card-title" style="margin-bottom:0">${escapeHtml(namaJenisTagihan(g.jenisId))} &middot; ${bulanLabel(g.bulan)}</div>
          <span style="font-size:12px;font-weight:600;color:${belum.length?'var(--danger)':'var(--green-700)'}">${belum.length} belum bayar</span></div>
        <p class="muted" style="margin:4px 0">${lunas.length} dari ${g.items.length} santri sudah lunas.</p>
        ${belum.length===0 ? '<p class="muted">Semua sudah bayar. &#127881;</p>' : `
          <div class="card-title" style="margin-top:8px;font-size:13px">Belum bayar:</div>
          <ul style="margin:4px 0 0 18px;padding:0">
            ${belum.map(t=>`<li>${escapeHtml(namaSantriById(t.santri_id))} &mdash; ${formatRupiah(t.jumlah)}${t.jatuh_tempo?` <span class="muted">(jatuh tempo ${t.jatuh_tempo})</span>`:''}</li>`).join('')}
          </ul>
        `}
      </div>
    `;
  }).join('');
}
function renderIuranBody(body){
  const list = TAGIHAN_DATA.iuran.slice().sort((a,b)=> String(b.tanggal||'').localeCompare(String(a.tanggal||'')));
  if(list.length===0){ body.innerHTML = '<div class="card"><p class="muted">Belum ada data iuran.</p></div>'; return; }
  body.innerHTML = list.map(it=>{
    const items = TAGIHAN_DATA.iuranDetail.filter(d=>d.iuran_id===it.id);
    const belum = items.filter(d=>d.status==='belum').sort((a,b)=>namaSantriById(a.santri_id).localeCompare(namaSantriById(b.santri_id)));
    const lunas = items.filter(d=>d.status==='lunas');
    return `
      <div class="card" style="margin-top:12px">
        <div class="row"><div class="card-title" style="margin-bottom:0">${escapeHtml(it.keterangan)||'Iuran'}</div>
          <span style="font-size:12px;font-weight:600;color:${belum.length?'var(--danger)':'var(--green-700)'}">${belum.length} belum bayar</span></div>
        <p class="muted" style="margin:4px 0">${it.tanggal||''} &middot; ${lunas.length} dari ${items.length} santri sudah lunas.</p>
        ${belum.length===0 ? '<p class="muted">Semua sudah bayar. &#127881;</p>' : `
          <div class="card-title" style="margin-top:8px;font-size:13px">Belum bayar:</div>
          <ul style="margin:4px 0 0 18px;padding:0">
            ${belum.map(d=>`<li>${escapeHtml(namaSantriById(d.santri_id))} &mdash; ${formatRupiah(d.jumlah)}</li>`).join('')}
          </ul>
        `}
      </div>
    `;
  }).join('');
}

/* ---------- RAPOR ---------- */
let raporFrom = '', raporTo = todayStr();
let raporSearchQuery = '';
let raporProgramFilter = 'semua'; // 'semua' | 'Takhossus' | 'Non-Takhossus'
function filteredRaporSantri(){
  const q = raporSearchQuery.trim().toLowerCase();
  return visibleSantri().filter(s=>{
    if(raporProgramFilter!=='semua' && s.program!==raporProgramFilter) return false;
    if(!q) return true;
    return s.nama.toLowerCase().includes(q) || (s.noInduk||'').toLowerCase().includes(q);
  });
}
function renderRaporPage(){
  if(!raporFrom){ const d=new Date(); d.setDate(d.getDate()-30); raporFrom=d.toISOString().slice(0,10); }
  document.getElementById('content').innerHTML = `
    <div class="page-head">
      <div class="page-head-top"><h2>Rapor</h2></div>
      <div class="filter-bar">
        <div class="filter-date"><label>Dari</label><input type="date" value="${raporFrom}" onchange="raporFrom=this.value; renderRaporBody()"></div>
        <div class="filter-date"><label>S.d.</label><input type="date" value="${raporTo}" onchange="raporTo=this.value; renderRaporBody()"></div>
        <div class="filter-search">
          <input type="text" id="raporSearchInput" placeholder="Cari nama atau no. induk santri..." value="${escapeHtml(raporSearchQuery)}" oninput="raporSearchQuery=this.value; renderRaporBody()">
        </div>
        <select onchange="raporProgramFilter=this.value; renderRaporBody()">
          <option value="semua" ${raporProgramFilter==='semua'?'selected':''}>Semua Program</option>
          <option value="Takhossus" ${raporProgramFilter==='Takhossus'?'selected':''}>Takhossus</option>
          <option value="Non-Takhossus" ${raporProgramFilter==='Non-Takhossus'?'selected':''}>Non-Takhossus</option>
        </select>
        <button class="btn btn-sm btn-accent" title="Mengunduh rekap SEMUA santri, tidak terpengaruh pencarian/filter di atas" onclick="exportRaporExcel()">&#128190; Unduh Excel</button>
      </div>
      <p class="muted" style="margin:6px 2px 0;font-size:11px">Target hafalan: ${TARGET_HAFALAN_PER_HARI} halaman/hari &middot; Predikat: A&ge;90%, B&ge;75%, C&ge;60%, D&ge;40%, E&lt;40%</p>
    </div>
    <div id="raporBody"></div>
  `;
  renderRaporBody();
}
function renderRaporBody(){
  const santri = filteredRaporSantri();
  const allCount = visibleSantri().length;
  const rows = santri.map(s=>{
    const total = totalHafalanSantri(s.id);
    const nh = nilaiHafalanSantri(s.id, raporFrom, raporTo);
    const na = nilaiAbsensiSantri(s.id, raporFrom, raporTo);
    return { s, total, nh, na };
  });
  const body = document.getElementById('raporBody');
  if(!body) return;
  body.innerHTML = `
    ${(raporSearchQuery.trim() || raporProgramFilter!=='semua') ? `<p class="filter-count">Menampilkan ${rows.length} dari ${allCount} santri</p>` : ''}
    <div class="card">
      <div class="table-wrap"><table>
        <tr><th>Santri</th><th>Total Hafalan</th><th>Tambah (periode)</th><th>Nilai Hafalan</th><th>Kehadiran</th><th>Nilai Absensi</th><th></th></tr>
        ${rows.length===0 ? `<tr><td colspan="7" class="muted" style="text-align:center;padding:14px">Tidak ada santri yang cocok dengan pencarian/filter.</td></tr>` : rows.map(r=>`
          <tr>
            <td>${escapeHtml(r.s.nama)}</td>
            <td>Juz ${r.total.juz} hal. ${r.total.halaman}</td>
            <td>${r.nh.tambahan} hal.</td>
            <td><b>${r.nh.predikat}</b> &middot; ${predikatLabel(r.nh.predikat)}</td>
            <td>${r.na.hadir}/${r.na.total} (${r.na.pct}%)</td>
            <td><b>${r.na.predikat}</b> &middot; ${predikatLabel(r.na.predikat)}</td>
            <td><button class="btn btn-sm" onclick="unduhRaporWord('${r.s.id}')">&#128196; Word</button></td>
          </tr>
        `).join('')}
      </table></div>
    </div>
  `;
}
function exportRaporExcel(){
  const santri = visibleSantri();
  const rows = santri.map((s,i)=>{
    const total = totalHafalanSantri(s.id);
    const nh = nilaiHafalanSantri(s.id, raporFrom, raporTo);
    const na = nilaiAbsensiSantri(s.id, raporFrom, raporTo);
    return {
      'No': i+1, 'Nama': s.nama, 'No. Induk': s.noInduk, 'Kelas': s.kelas, 'Kamar': s.kamar||'', 'Program': s.program,
      'Total Hafalan': `Juz ${total.juz} hal. ${total.halaman}`,
      'Tambah Hafalan (periode)': nh.tambahan, 'Target (periode)': nh.target,
      'Nilai Hafalan': nh.predikat, 'Predikat Hafalan': predikatLabel(nh.predikat),
      'Kehadiran (periode)': `${na.hadir}/${na.total}`, 'Persen Hadir': na.pct + '%',
      'Nilai Absensi': na.predikat, 'Predikat Absensi': predikatLabel(na.predikat),
      'Periode': `${raporFrom} s.d. ${raporTo}`
    };
  });
  if(rows.length===0){ alert('Belum ada data untuk diunduh.'); return; }
  const ws = XLSX.utils.json_to_sheet(rows);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Rekap Rapor');
  XLSX.writeFile(wb, `Rekap-Rapor-${raporFrom}_${raporTo}.xlsx`);
}
/* Rapor per-santri diunduh sebagai file Word (.doc), karena rapor ini bersifat
   dokumen resmi per anak yang ditandatangani Pengasuh dan biasanya dicetak
   satu lembar per santri -- lebih pas dibanding rekap tabel di Excel. */
/* ====== DOKUMEN WORD (Rapor, Detail Santri, Laporan Toko) ======
   Ketiganya pakai kop surat yang sama (kopWordHeader) dan kerangka halaman
   yang sama (wordDocHtml) supaya tampilannya konsisten: potrait, margin
   rapi, dan tabel yang lebar kolomnya seimbang (bukan mepet/pas-pasan). */
const WORD_DOC_STYLE = `
  @page WordSection1{ size:21cm 29.7cm; mso-page-orientation:portrait; margin:2cm 1.8cm 2cm 1.8cm; }
  div.WordSection1{ page:WordSection1; }
  body{ font-family:Calibri, Arial, sans-serif; font-size:11.5pt; color:#000; }
  .doc-title{ text-align:center; font-size:15pt; font-weight:bold; letter-spacing:.5px; margin:0 0 3px; }
  .doc-sub{ text-align:center; font-size:11pt; color:#333; margin:0 0 16px; }
  table.info{ border-collapse:collapse; width:100%; margin-bottom:14px; table-layout:fixed; }
  table.info td{ padding:5px 6px; font-size:11pt; vertical-align:top; word-wrap:break-word; }
  table.info td.lbl{ width:32%; font-weight:bold; }
  table.info td.colon{ width:3%; }
  table.grid{ border-collapse:collapse; width:100%; margin-top:6px; table-layout:fixed; }
  table.grid th, table.grid td{ border:1px solid #444; padding:8px; font-size:11pt; word-wrap:break-word; }
  table.grid th{ background:#e4ece3; text-align:left; }
  .section-title{ font-size:12.5pt; font-weight:bold; margin:18px 0 6px; border-bottom:1.5pt solid #000; padding-bottom:3px; }
  .ttd{ margin-top:50px; width:100%; }
  .ttd td{ text-align:center; font-size:11pt; vertical-align:top; }
  .doc-footnote{ margin-top:10px; font-size:9.5pt; color:#555; }
`;
function wordDocHtml(titleText, bodyHtml){
  return `
    <html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
    <head><meta charset="utf-8"><title>${titleText}</title>
    <style>${WORD_DOC_STYLE}</style></head>
    <body><div class="WordSection1">
      ${kopWordHeader()}
      ${bodyHtml}
    </div></body></html>`;
}
function unduhWordFile(html, filename){
  const blob = new Blob(['\ufeff', html], { type: 'application/msword' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  document.body.appendChild(a); a.click(); a.remove();
}

/* ---- 1. Rapor santri (per-anak) ---- */
function unduhRaporWord(santriId){
  const s = DB.santri.find(x=>x.id===santriId);
  if(!s){ alert('Data santri tidak ditemukan.'); return; }
  const total = totalHafalanSantri(s.id);
  const nh = nilaiHafalanSantri(s.id, raporFrom, raporTo);
  const na = nilaiAbsensiSantri(s.id, raporFrom, raporTo);
  const tglCetak = new Date().toLocaleDateString('id-ID', { day:'numeric', month:'long', year:'numeric' });
  const body = `
    <div class="doc-title">RAPOR SANTRI</div>
    <div class="doc-sub">Periode: ${raporFrom} s.d. ${raporTo}</div>
    <table class="info">
      <tr><td class="lbl">Nama</td><td class="colon">:</td><td>${escapeHtml(s.nama)}</td></tr>
      <tr><td class="lbl">No. Induk</td><td class="colon">:</td><td>${escapeHtml(s.noInduk)||'-'}</td></tr>
      <tr><td class="lbl">Kelas</td><td class="colon">:</td><td>${escapeHtml(s.kelas)||'-'}</td></tr>
      <tr><td class="lbl">Kamar</td><td class="colon">:</td><td>${escapeHtml(s.kamar)||'-'}</td></tr>
      <tr><td class="lbl">Program</td><td class="colon">:</td><td>${escapeHtml(s.program)||'-'}</td></tr>
    </table>
    <table class="grid">
      <tr><th style="width:18%">Kategori</th><th>Keterangan</th><th style="width:12%">Nilai</th><th style="width:20%">Predikat</th></tr>
      <tr>
        <td>Hafalan</td>
        <td>Total hafalan saat ini: Juz ${total.juz} halaman ${total.halaman}.<br>Bertambah ${nh.tambahan} halaman selama periode (target ${nh.target} halaman).</td>
        <td style="text-align:center"><b>${nh.predikat}</b></td>
        <td>${predikatLabel(nh.predikat)}</td>
      </tr>
      <tr>
        <td>Absensi Kegiatan</td>
        <td>Hadir ${na.hadir} dari ${na.total} kegiatan tercatat (${na.pct}%).</td>
        <td style="text-align:center"><b>${na.predikat}</b></td>
        <td>${predikatLabel(na.predikat)}</td>
      </tr>
    </table>
    <table class="ttd">
      <tr>
        <td style="width:50%"></td>
        <td style="width:50%">Roudhotul Qur'an, ${tglCetak}<br>Pengasuh,<br><br><br><br>(______________________)</td>
      </tr>
    </table>
  `;
  unduhWordFile(wordDocHtml(`Rapor ${s.nama}`, body), `Rapor-${s.nama.replace(/\s+/g,'_')}-${raporFrom}_${raporTo}.doc`);
}

/* ---- 2. Detail data santri (biodata + mahram) ---- */
function unduhDetailSantriWord(santriId){
  const s = DB.santri.find(x=>x.id===santriId);
  if(!s){ alert('Data santri tidak ditemukan.'); return; }
  const tglCetak = new Date().toLocaleDateString('id-ID', { day:'numeric', month:'long', year:'numeric' });
  const mahram = s.mahram || [];
  const body = `
    <div class="doc-title">DATA SANTRI</div>
    <div class="doc-sub">${escapeHtml(s.nama)} &middot; No. Induk ${escapeHtml(s.noInduk)||'-'}</div>
    <div class="section-title">Informasi</div>
    <table class="info">
      <tr><td class="lbl">Jenis kelamin</td><td class="colon">:</td><td>${s.jenisKelamin==='P'?'Perempuan':'Laki-laki'}</td></tr>
      <tr><td class="lbl">Kelas</td><td class="colon">:</td><td>${s.kelas==='Lulus'?'Lulus (masih aktif santri)':('Kelas '+(s.kelas||'-'))}</td></tr>
      <tr><td class="lbl">Kamar</td><td class="colon">:</td><td>${escapeHtml(s.kamar)||'-'}</td></tr>
      <tr><td class="lbl">Program</td><td class="colon">:</td><td>${escapeHtml(s.program)||'-'}</td></tr>
      <tr><td class="lbl">Tetala</td><td class="colon">:</td><td>${escapeHtml(s.tetala)||'-'}</td></tr>
      <tr><td class="lbl">Alamat</td><td class="colon">:</td><td>${escapeHtml(s.alamat)||'-'}</td></tr>
      <tr><td class="lbl">Tanggal masuk</td><td class="colon">:</td><td>${s.tglMasuk||'-'}</td></tr>
      <tr><td class="lbl">Nama ayah</td><td class="colon">:</td><td>${escapeHtml(s.namaAyah)||'-'}</td></tr>
      <tr><td class="lbl">Nama ibu</td><td class="colon">:</td><td>${escapeHtml(s.namaIbu)||'-'}</td></tr>
      <tr><td class="lbl">Nama wali</td><td class="colon">:</td><td>${escapeHtml(s.namaWali)||'-'}</td></tr>
      <tr><td class="lbl">No. HP wali</td><td class="colon">:</td><td>${escapeHtml(s.hpWali)||'-'}</td></tr>
    </table>
    <div class="section-title">Mahram</div>
    ${mahram.length===0 ? '<p class="doc-footnote" style="font-size:11pt;color:#000">Belum ada data mahram.</p>' : `
    <table class="grid">
      <tr><th style="width:34%">Nama</th><th style="width:33%">Hubungan</th><th style="width:33%">No. HP</th></tr>
      ${mahram.map(m=>`<tr><td>${escapeHtml(m.nama)}</td><td>${escapeHtml(m.hubungan)}</td><td>${escapeHtml(m.hp)||'-'}</td></tr>`).join('')}
    </table>`}
    <div class="doc-footnote">Dicetak pada ${tglCetak} dari Aplikasi Pondok.</div>
    <table class="ttd">
      <tr>
        <td style="width:50%"></td>
        <td style="width:50%">Roudhotul Qur'an, ${tglCetak}<br>Admin Pusat,<br><br><br><br>(______________________)</td>
      </tr>
    </table>
  `;
  unduhWordFile(wordDocHtml(`Data Santri ${s.nama}`, body), `Data-Santri-${s.nama.replace(/\s+/g,'_')}.doc`);
}

/* ---- 3. Laporan Toko (posisi kas + arus kas & laba periode) ---- */
function unduhLaporanTokoWord(){
  if(!KAS_DATA || KAS_DATA==='error'){ alert('Data belum siap dimuat, coba lagi sebentar.'); return; }
  const k = hitungKas();
  const l = hitungLaba();
  const tglCetak = new Date().toLocaleDateString('id-ID', { day:'numeric', month:'long', year:'numeric' });
  const body = `
    <div class="doc-title">LAPORAN TOKO</div>
    <div class="doc-sub">Dicetak ${tglCetak}</div>

    <div class="section-title">Posisi Kas &amp; Modal (saat ini)</div>
    <table class="grid">
      <tr><th style="width:50%">Pos</th><th style="width:50%">Nominal</th></tr>
      <tr><td>Saldo Kas</td><td>${formatRupiah(k.totalSaldoKas)}</td></tr>
      <tr><td>Nilai Stok</td><td>${formatRupiah(k.totalNilaiStok)}</td></tr>
      <tr><td>Piutang (Hutang Belum Lunas)</td><td>${formatRupiah(k.totalPiutang)}</td></tr>
      <tr><td>Total Laba (kumulatif)</td><td>${formatRupiah(k.totalLaba)}</td></tr>
      ${k.biayaOperasional>0 ? `<tr><td>Biaya Operasional (kumulatif)</td><td>${formatRupiah(k.biayaOperasional)}</td></tr>` : ''}
      ${k.totalPrive>0 ? `<tr><td>Prive (kumulatif)</td><td>${formatRupiah(k.totalPrive)}</td></tr>` : ''}
      <tr><td><b>Modal Saat Ini</b></td><td><b>${formatRupiah(k.modalSaatIni)}</b></td></tr>
      <tr><td>Modal Awal (Kas Awal)</td><td>${formatRupiah(k.modalAwal)}</td></tr>
    </table>

    <div class="section-title">Arus Kas &amp; Laba (Periode: ${kasFrom} s.d. ${kasTo})</div>
    <table class="grid">
      <tr><th style="width:50%">Pos</th><th style="width:50%">Nominal</th></tr>
      <tr><td>Kas Masuk</td><td>${formatRupiah(k.masukPeriode)}</td></tr>
      <tr><td>Kas Keluar</td><td>${formatRupiah(k.keluarPeriode)}</td></tr>
      <tr><td>Omzet</td><td>${formatRupiah(l.omzet)}</td></tr>
      <tr><td>Laba Tunai</td><td>${formatRupiah(l.labaTunai)}</td></tr>
      <tr><td>Laba Kredit</td><td>${formatRupiah(l.labaKredit)}</td></tr>
      <tr><td>Total Laba (periode)</td><td>${formatRupiah(l.totalLaba)}</td></tr>
      <tr><td>Operasional</td><td>${formatRupiah(l.operasional)}</td></tr>
      <tr><td><b>Laba Bersih</b></td><td><b>${formatRupiah(l.labaBersih)}</b></td></tr>
    </table>

    <table class="ttd">
      <tr>
        <td style="width:50%">Mengetahui,<br>Ketua Pondok<br><br><br><br>(______________________)</td>
        <td style="width:50%">Roudhotul Qur'an, ${tglCetak}<br>Dibuat oleh, Petugas Kasir<br><br><br><br>(______________________)</td>
      </tr>
    </table>
  `;
  unduhWordFile(wordDocHtml('Laporan Toko', body), `Laporan-Toko-${kasFrom}_${kasTo}.doc`);
}



/* ---------- KELOLA (admin) ---------- */
function renderKelolaPage(){
  document.getElementById('content').innerHTML = `
    <div class="page-head"><h2>Kelola</h2></div>
    <div id="kelolaBody"></div>
  `;
  renderKelolaKegiatan();
}
function renderKelolaKegiatan(){
  document.getElementById('kelolaBody').innerHTML = `
    <div class="card">
      ${DB.kegiatan.map(k=>`<div class="list-item"><div style="flex:1">${escapeHtml(k.nama)}${k.programKhusus?` <span class="muted">(khusus ${escapeHtml(k.programKhusus)})</span>`:''}</div><button class="btn btn-sm btn-danger" onclick="delKegiatan('${k.id}')">Hapus</button></div>`).join('')}
    </div>
    <div class="card">
      <label>Nama kegiatan baru</label>
      <input id="newKegiatan" placeholder="Contoh: Setoran 4">
      <label>Berlaku untuk</label>
      <select id="newKegiatanProgram">
        <option value="">SEMUA SANTRI</option>
        <option value="Takhossus">TAKHOSSUS</option>
        <option value="Non-Takhossus">NON TAKHOSSUS</option>
      </select>
      <div class="btn-row"><button class="btn btn-accent" onclick="addKegiatan()">Tambah</button></div>
    </div>
  `;
}
async function addKegiatan(){
  const nama = val('newKegiatan'); if(!nama) return;
  const programKhusus = val('newKegiatanProgram') || null;
  const { error } = await sb.from('kegiatan').insert({ nama, program_khusus: programKhusus });
  if(error){ alert('Gagal menyimpan: ' + error.message); return; }
  await loadAll(); renderKelolaKegiatan();
}
async function delKegiatan(id){
  const { error } = await sb.from('kegiatan').delete().eq('id', id);
  if(error){ alert('Gagal menghapus: ' + error.message); return; }
  await loadAll(); renderKelolaKegiatan();
}

/* ---------- TAB PEMBINA (data pembina) ---------- */
function renderPembinaPage(){
  document.getElementById('content').innerHTML = `
    <div class="page-head">
      <div class="page-head-top"><h2>Data Pembina</h2><button class="btn btn-accent btn-sm" onclick="openPembinaForm()">+ Tambah</button></div>
    </div>
    <div class="card">
      ${DB.pembina.length===0?'<p class="muted">Belum ada data pembina.</p>':DB.pembina.map(p=>`
        <div class="list-item">
          <div class="avatar">${escapeHtml(initial(p.nama))}</div>
          <div style="flex:1;min-width:0;cursor:pointer" onclick="openPembinaForm(${JSON.stringify(p).replace(/"/g,'&quot;')})">
            <div class="name">${escapeHtml(p.nama)} ${p.aktif?'':'<span class="muted">(nonaktif)</span>'}</div>
            <div class="sub">${escapeHtml(p.tetala)||''}</div>
          </div>
          <button class="btn btn-sm" title="Edit" onclick="openPembinaForm(${JSON.stringify(p).replace(/"/g,'&quot;')})">&#9998;</button>
        </div>
      `).join('')}
    </div>
  `;
}
function openPembinaForm(existing){
  const p = existing || {id:null, nama:'', tetala:'', alamat:'', aktif:true};
  const isNew = !existing;
  showModal('Data Pembina', `
    <label>Nama lengkap</label><input id="f_pNama" value="${escapeHtml(p.nama)}" placeholder="Contoh: Ust. Ahmad">
    <label>Tempat, tanggal lahir</label><input id="f_pTetala" value="${escapeHtml(p.tetala)}" placeholder="Surabaya, 12 Januari 1990">
    <label>Alamat</label><input id="f_pAlamat" value="${escapeHtml(p.alamat)}">
    <div class="btn-row">
      <button class="btn btn-accent" onclick="savePembina('${p.id||''}', ${isNew})">Simpan</button>
      ${isNew?'':`<button class="btn btn-sm" onclick="togglePembinaAktif('${p.id}')">${p.aktif?'Nonaktifkan':'Aktifkan'}</button>`}
      ${isNew?'':`<button class="btn btn-danger" onclick="deletePembina('${p.id}')">Hapus</button>`}
    </div>
  `);
}
async function savePembina(id, isNew){
  const nama = val('f_pNama');
  if(!nama){ alert('Nama wajib diisi'); return; }
  const row = { nama, tetala: val('f_pTetala'), alamat: val('f_pAlamat') };
  if(OFFLINE_MODE){ alert('Sedang mode offline (tidak ada internet). Data tidak bisa disimpan sekarang.'); return; }
  if(isNew){
    const { error } = await sb.from('pembina').insert({ ...row, aktif: true });
    if(error){ alert('Gagal menyimpan: ' + error.message); return; }
    await loadAll(); closeModal(); renderPembinaPage();
  } else {
    const { error } = await sb.from('pembina').update(row).eq('id', id);
    if(error){ alert('Gagal menyimpan: ' + error.message); return; }
    await loadAll(); closeModal(); renderPembinaPage();
  }
}
async function togglePembinaAktif(id){
  const p = DB.pembina.find(x=>x.id===id);
  const { error } = await sb.from('pembina').update({ aktif: !p.aktif }).eq('id', id);
  if(error){ alert('Gagal menyimpan: ' + error.message); return; }
  await loadAll(); closeModal(); renderPembinaPage();
}
async function deletePembina(id){
  if(!confirm('Hapus data pembina ini?')) return;
  const { error } = await sb.from('pembina').delete().eq('id', id);
  if(error){ alert('Gagal menghapus: ' + error.message); return; }
  await loadAll(); closeModal(); renderPembinaPage();
}

/* ---------- MODAL ---------- */
function showModal(title, bodyHtml, onCloseFnCall){
  const closeCall = onCloseFnCall || 'closeModal()';
  document.getElementById('modalRoot').innerHTML = `
    <div class="modal-overlay" onclick="if(event.target===this) ${closeCall}">
      <div class="modal-box">
        <div class="modal-head"><h3>${title}</h3><button class="modal-close" onclick="${closeCall}">&times;</button></div>
        ${bodyHtml}
      </div>
    </div>
  `;
}
function closeModal(){ document.getElementById('modalRoot').innerHTML=''; }

/* ---------- INIT ---------- */
initLogin();
