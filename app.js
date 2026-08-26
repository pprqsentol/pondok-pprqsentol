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
function enterApp(){
  document.getElementById('loginScreen').style.display='none';
  document.getElementById('app').style.display='block';
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
    <h2>Beranda</h2>
    <p class="muted">${isAdmin() ? 'Semua program' : SESSION.program} &middot; ${santri.length} santri</p>
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
function renderSantriPage(){
  const santri = visibleSantri();
  document.getElementById('content').innerHTML = `
    <div class="row"><h2>Data Santri</h2><button class="btn btn-accent btn-sm" onclick="openSantriForm()">+ Tambah</button></div>
    <div class="btn-row" style="margin-bottom:10px">
      <button class="btn btn-sm" onclick="exportSantriExcel()">&#128190; Unduh Excel</button>
      <button class="btn btn-sm" onclick="printSantriTable()">&#128424; Cetak</button>
    </div>
    <div class="card">
      ${santri.length===0 ? '<p class="muted">Belum ada data santri.</p>' : santri.map(s=>`
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
      <table class="print-table">
        <tr>${cols.map(c=>`<th>${c}</th>`).join('')}</tr>
        ${rows.map(r=>`<tr>${cols.map(c=>`<td>${r[c]}</td>`).join('')}</tr>`).join('')}
      </table>
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
        </div>
      </div>
      <div class="card">
        <div class="card-title">Informasi</div>
        <table>
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
        </table>
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
      <table><tr><th>Tanggal</th><th>Juz</th><th>Halaman</th></tr>
      ${hafalan.map(h=>`<tr><td>${h.tanggal}</td><td>${h.juz}</td><td>${h.halamanDari===h.halamanSampai?h.halamanDari:h.halamanDari+'-'+h.halamanSampai}</td></tr>`).join('')}
      </table>`}

    <div class="section-heading">Riwayat Absensi (periode ini)</div>
    <canvas id="chartSantriAbsensi" width="600" height="180" style="width:100%;height:150px"></canvas>
    ${absensi.length===0?'<p class="muted">Belum ada absensi dicatat pada periode ini.</p>':`
      <table><tr><th>Tanggal</th><th>Kegiatan</th><th>Status</th></tr>
      ${absensi.map(a=>`<tr><td>${a.tanggal}</td><td>${escapeHtml(namaKegiatan(a.kegiatanId))}</td><td>${statusLabel[a.status]||a.status}</td></tr>`).join('')}
      </table>`}

    <div class="section-heading">Riwayat Keuangan</div>
    ${keuangan.length===0?'<p class="muted">Belum ada transaksi pada periode ini. (Data keuangan akan muncul di sini setelah Aplikasi Keuangan disambungkan ke database bersama)</p>':`
      <table><tr><th>Tanggal</th><th>Jenis</th><th>Nominal</th><th>Keterangan</th></tr>
      ${keuangan.map(t=>`<tr><td>${t.tanggal}</td><td>${t.jenis}</td><td>${t.nominal}</td><td>${escapeHtml(t.keterangan)}</td></tr>`).join('')}
      </table>`}
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
        <div class="head"><img src="icons/icon-192.png"><div class="pn">PONDOK ROUDHOTUL QUR'AN</div></div>
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
        <div class="head"><img src="icons/icon-192.png"><div class="pn">KARTU WALI SANTRI &middot; PONDOK ROUDHOTUL QUR'AN</div></div>
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
  setTimeout(()=>{ new QRCode(document.getElementById('qrWali'), {text: s.noInduk+'-WALI', width:110, height:110, correctLevel: QRCode.CorrectLevel.M}); }, 50);
}
function openCardMahram(santriId, idx){
  const s = DB.santri.find(x=>x.id===santriId);
  const m = s.mahram[idx];
  showModal('Kartu Mahram', `
    <div id="printArea">
      <div class="id-card id-card-mahram">
        <div class="head"><img src="icons/icon-192.png"><div class="pn">KARTU MAHRAM &middot; PONDOK ROUDHOTUL QUR'AN</div></div>
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
  const santri = visibleSantri();
  document.getElementById('content').innerHTML = `
    <h2>Laporan</h2>
    <div class="tabs">
      <button class="tab ${lapTab==='hafalan'?'active':''}" onclick="lapTab='hafalan'; renderLaporanPage()">Hafalan</button>
      <button class="tab ${lapTab==='absensi'?'active':''}" onclick="lapTab='absensi'; renderLaporanPage()">Absensi</button>
    </div>
    <div class="card">
      <div class="grid2">
        <div><label>Dari tanggal</label><input type="date" value="${lapFrom}" onchange="lapFrom=this.value; renderLaporanPage()"></div>
        <div><label>Sampai tanggal</label><input type="date" value="${lapTo}" onchange="lapTo=this.value; renderLaporanPage()"></div>
      </div>
    </div>
    <div id="lapBody"></div>
  `;
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
      <table><tr><th>Santri</th><th>Jumlah sesi</th><th>Total ditambah</th></tr>
      ${rows.map(r=>`<tr><td>${escapeHtml(r.s.nama)}</td><td>${r.items.length}</td><td><b>${r.tambah}</b> hal.</td></tr>`).join('')}
      </table>
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
      <table class="print-table">
        <tr>${cols.map(c=>`<th>${c}</th>`).join('')}</tr>
        ${rows.map(r=>`<tr>${cols.map(c=>`<td>${r[c]}</td>`).join('')}</tr>`).join('')}
      </table>
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
   Mengambil data dari tabel yang sama dipakai aplikasi kasir toko:
   kas_awal (modal awal), mutasi_kas (kas masuk/keluar),
   produk (untuk nilai stok & harga jual/beli), transaksi_toko (penjualan).
   Catatan: kolom "lokasi" pada tabel-tabel ini sudah tidak dipakai untuk
   memisahkan data (dulu per toko/lokasi) — sekarang semua digabung jadi satu
   angka saja, karena pembedaan pencatat sekarang pakai nama admin (dicatat_oleh).

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
const KAS_LOKASI_DEFAULT = 'Utama'; // nilai lokasi tetap untuk baris baru (kolom lokasi tidak dipakai lagi di UI)

function formatRupiah(n){
  return 'Rp' + Math.round(n||0).toLocaleString('id-ID');
}
async function loadKasData(){
  try {
    const [kasAwalRes, mutasiRes, produkRes, transaksiRes] = await Promise.all([
      sb.from('kas_awal').select('*'),
      sb.from('mutasi_kas').select('*'),
      sb.from('produk').select('id,stok,harga_beli,harga_jual'),
      sb.from('transaksi_toko').select('id,items,total,metode,status_bayar,created_at')
    ]);
    if(kasAwalRes.error) throw kasAwalRes.error;
    if(mutasiRes.error) throw mutasiRes.error;
    if(produkRes.error) throw produkRes.error;
    if(transaksiRes.error) throw transaksiRes.error;
    KAS_DATA = {
      kasAwal: kasAwalRes.data || [],
      mutasi: mutasiRes.data || [],
      produk: produkRes.data || [],
      transaksiToko: transaksiRes.data || []
    };
  } catch(e){
    console.error('Gagal memuat data laporan toko:', e);
    KAS_DATA = 'error';
  }
}
function labaKotorTransaksi(t, produkMap){
  return (t.items||[]).reduce((s,it)=>{
    const p = produkMap[it.produk_id];
    if(!p) return s;
    const hj = Number(p.harga_jual)||0, hb = Number(p.harga_beli)||0, qty = Number(it.qty)||0;
    return s + (hj-hb)*qty;
  }, 0);
}
function hitungKas(){
  const modalAwal = KAS_DATA.kasAwal.reduce((s,k)=>s+Number(k.nominal||0),0);
  const kasMasuk = KAS_DATA.mutasi.filter(m=>m.arah==='masuk').reduce((s,m)=>s+Number(m.jumlah),0);
  const kasKeluar = KAS_DATA.mutasi.filter(m=>m.arah==='keluar').reduce((s,m)=>s+Number(m.jumlah),0);
  const totalSaldoKas = modalAwal + kasMasuk - kasKeluar;

  const totalNilaiStok = KAS_DATA.produk.reduce((s,p)=>s+Number(p.stok)*Number(p.harga_beli),0);

  const produkMap = {};
  KAS_DATA.produk.forEach(p=>{ produkMap[p.id] = p; });
  const totalLaba = KAS_DATA.transaksiToko.reduce((s,t)=>s+labaKotorTransaksi(t, produkMap), 0);

  const modalSaatIni = totalSaldoKas + totalNilaiStok - totalLaba;

  const totalPiutang = KAS_DATA.transaksiToko.filter(t=>t.metode==='Hutang' && t.status_bayar==='belum_bayar').reduce((s,t)=>s+Number(t.total),0);

  const masukPeriode = KAS_DATA.mutasi.filter(m=>m.arah==='masuk' && (m.tanggal||'').slice(0,10)>=kasFrom && (m.tanggal||'').slice(0,10)<=kasTo).reduce((s,m)=>s+Number(m.jumlah),0);
  const keluarPeriode = KAS_DATA.mutasi.filter(m=>m.arah==='keluar' && (m.tanggal||'').slice(0,10)>=kasFrom && (m.tanggal||'').slice(0,10)<=kasTo).reduce((s,m)=>s+Number(m.jumlah),0);

  return { modalAwal, totalSaldoKas, totalNilaiStok, totalLaba, modalSaatIni, totalPiutang, masukPeriode, keluarPeriode };
}
function hitungLaba(){
  const produkMap = {};
  KAS_DATA.produk.forEach(p=>{ produkMap[p.id] = p; });
  const transaksiPeriode = KAS_DATA.transaksiToko.filter(t=>(t.created_at||'').slice(0,10)>=kasFrom && (t.created_at||'').slice(0,10)<=kasTo);
  const omzet = transaksiPeriode.reduce((s,t)=>s+Number(t.total),0);
  const labaTunai = transaksiPeriode.filter(t=>t.metode==='Tunai'||t.metode==='Saldo').reduce((s,t)=>s+labaKotorTransaksi(t, produkMap),0);
  const labaKredit = transaksiPeriode.filter(t=>t.metode==='Hutang').reduce((s,t)=>s+labaKotorTransaksi(t, produkMap),0);
  const totalLaba = labaTunai + labaKredit;
  const operasional = KAS_DATA.mutasi.filter(m=>m.kategori==='operasional' && m.arah==='keluar' && (m.tanggal||'').slice(0,10)>=kasFrom && (m.tanggal||'').slice(0,10)<=kasTo).reduce((s,m)=>s+Number(m.jumlah),0);
  const labaBersih = totalLaba - operasional;
  return { omzet, labaTunai, labaKredit, totalLaba, operasional, labaBersih };
}
function renderKasPage(){
  if(!kasFrom){ const d=new Date(); d.setDate(d.getDate()-30); kasFrom=d.toISOString().slice(0,10); }
  document.getElementById('content').innerHTML = `
    <h2>Laporan Toko</h2>
    <div class="tabs">
      <button class="tab ${laporanTokoTab==='kas'?'active':''}" onclick="laporanTokoTab='kas'; renderKasPage()">Kas</button>
      <button class="tab ${laporanTokoTab==='laba'?'active':''}" onclick="laporanTokoTab='laba'; renderKasPage()">Laba</button>
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
        <div class="name" style="flex:1">– Total Laba</div>
        <div style="font-weight:600">${formatRupiah(k.totalLaba)}</div>
      </div>
      <div class="list-item" style="border-top:2px solid var(--border);border-bottom:none;margin-top:2px;padding-top:12px">
        <div class="name" style="flex:1">Modal Saat Ini</div>
        <div style="font-weight:700;font-size:18px;color:${k.modalSaatIni>=0?'var(--green-700)':'var(--danger)'}">${formatRupiah(k.modalSaatIni)}</div>
      </div>
    </div>
    <div class="card" style="margin-top:12px">
      <div class="card-title">Piutang</div>
      <div style="font-size:20px;font-weight:700">${formatRupiah(k.totalPiutang)}</div>
      <p class="muted" style="margin-top:4px">Murni catatan hutang pelanggan yang belum bayar — tidak ikut dihitung di Modal/Laba di atas.</p>
    </div>
    <div class="card" style="margin-top:12px">
      <div class="row"><div class="card-title" style="margin-bottom:0">Arus Kas</div><button class="btn btn-sm btn-accent" onclick="openMutasiKasForm()">+ Catat</button></div>
      <div class="grid2" style="margin-top:8px">
        <div><label>Dari tanggal</label><input type="date" value="${kasFrom}" onchange="kasFrom=this.value; renderKasBody()"></div>
        <div><label>Sampai tanggal</label><input type="date" value="${kasTo}" onchange="kasTo=this.value; renderKasBody()"></div>
      </div>
      <div class="grid2" style="margin-top:8px">
        <div class="stat"><div class="num">${formatRupiah(k.masukPeriode)}</div><div class="label">Kas Masuk</div></div>
        <div class="stat"><div class="num">${formatRupiah(k.keluarPeriode)}</div><div class="label">Kas Keluar</div></div>
      </div>
    </div>
    <div class="card" style="margin-top:12px">
      <div class="row"><div class="card-title" style="margin-bottom:0">Modal Awal</div><button class="btn btn-sm" title="Ubah modal awal" onclick="openKasAwalForm()">&#9998; Ubah</button></div>
      <div style="font-size:18px;font-weight:600;margin-top:4px">${formatRupiah(k.modalAwal)}</div>
    </div>
  `;
}
function renderLabaBody(body){
  const l = hitungLaba();
  body.innerHTML = `
    <div class="card">
      <div class="grid2">
        <div><label>Dari tanggal</label><input type="date" value="${kasFrom}" onchange="kasFrom=this.value; renderKasBody()"></div>
        <div><label>Sampai tanggal</label><input type="date" value="${kasTo}" onchange="kasTo=this.value; renderKasBody()"></div>
      </div>
    </div>
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
function openMutasiKasForm(){
  showModal('Catat Kas Masuk/Keluar', `
    <label>Arah</label>
    <select id="f_kasArah">
      <option value="masuk">Kas Masuk</option>
      <option value="keluar">Kas Keluar</option>
    </select>
    <label>Kategori</label>
    <select id="f_kasKategori">
      <option value="operasional">Operasional</option>
      <option value="modal">Modal</option>
      <option value="stok">Stok</option>
      <option value="prive">Prive</option>
      <option value="lainnya">Lainnya</option>
    </select>
    <label>Jumlah (Rp)</label>
    <input id="f_kasJumlah" type="number" min="0" placeholder="0">
    <label>Tanggal</label>
    <input id="f_kasTanggal" type="date" value="${todayStr()}">
    <label>Catatan</label>
    <input id="f_kasCatatan" placeholder="Contoh: Donasi wali santri">
    <div class="btn-row">
      <button class="btn btn-accent" onclick="saveMutasiKas()">Simpan</button>
    </div>
  `);
}
async function saveMutasiKas(){
  const jumlah = Number(val('f_kasJumlah'));
  if(!jumlah || jumlah<=0){ alert('Isi jumlah dengan angka lebih dari 0.'); return; }
  if(OFFLINE_MODE){ alert('Sedang mode offline (tidak ada internet). Data tidak bisa disimpan sekarang.'); return; }
  const row = {
    lokasi: KAS_LOKASI_DEFAULT,
    arah: val('f_kasArah'),
    kategori: val('f_kasKategori'),
    jumlah,
    tanggal: val('f_kasTanggal'),
    catatan: val('f_kasCatatan') || null,
    dicatat_oleh: SESSION.nama || null
  };
  const { error } = await sb.from('mutasi_kas').insert(row);
  if(error){ alert('Gagal menyimpan: ' + error.message); return; }
  closeModal();
  renderKasBody();
}
function openKasAwalForm(){
  const totalSaatIni = KAS_DATA.kasAwal.reduce((s,k)=>s+Number(k.nominal||0),0);
  showModal('Modal Awal', `
    <label>Modal awal (Rp)</label>
    <input id="f_kasAwalNominal" type="number" min="0" value="${totalSaatIni}">
    <div class="btn-row">
      <button class="btn btn-accent" onclick="saveKasAwal()">Simpan</button>
    </div>
  `);
}
async function saveKasAwal(){
  const nominal = Number(val('f_kasAwalNominal'));
  if(OFFLINE_MODE){ alert('Sedang mode offline (tidak ada internet). Data tidak bisa disimpan sekarang.'); return; }
  const rows = KAS_DATA.kasAwal;
  if(rows.length === 0){
    const { error } = await sb.from('kas_awal').insert({ lokasi: KAS_LOKASI_DEFAULT, nominal });
    if(error){ alert('Gagal menyimpan: ' + error.message); return; }
  } else {
    // Semua digabung jadi satu angka saja: simpan nilai baru di baris pertama,
    // nolkan baris lain (peninggalan dari saat data masih dipisah per lokasi).
    const [first, ...rest] = rows;
    const { error: e1 } = await sb.from('kas_awal').update({ nominal }).eq('lokasi', first.lokasi);
    if(e1){ alert('Gagal menyimpan: ' + e1.message); return; }
    for(const r of rest){
      if(Number(r.nominal) !== 0){
        await sb.from('kas_awal').update({ nominal: 0 }).eq('lokasi', r.lokasi);
      }
    }
  }
  closeModal();
  renderKasBody();
}

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
    <h2>Tagihan</h2>
    <p class="muted">Data tagihan &amp; iuran ditarik dari Aplikasi Keuangan (baca saja). Pembayaran dicatat lewat Aplikasi Keuangan.</p>
    <div class="tabs">
      <button class="tab ${tagihanSubTab==='tagihan'?'active':''}" onclick="tagihanSubTab='tagihan'; renderTagihanPage()">Tagihan</button>
      <button class="tab ${tagihanSubTab==='iuran'?'active':''}" onclick="tagihanSubTab='iuran'; renderTagihanPage()">Iuran</button>
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
function renderRaporPage(){
  if(!raporFrom){ const d=new Date(); d.setDate(d.getDate()-30); raporFrom=d.toISOString().slice(0,10); }
  const santri = visibleSantri();
  const rows = santri.map(s=>{
    const total = totalHafalanSantri(s.id);
    const nh = nilaiHafalanSantri(s.id, raporFrom, raporTo);
    const na = nilaiAbsensiSantri(s.id, raporFrom, raporTo);
    return { s, total, nh, na };
  });
  document.getElementById('content').innerHTML = `
    <h2>Rapor</h2>
    <div class="card">
      <div class="grid2">
        <div><label>Dari tanggal</label><input type="date" value="${raporFrom}" onchange="raporFrom=this.value; renderRaporPage()"></div>
        <div><label>Sampai tanggal</label><input type="date" value="${raporTo}" onchange="raporTo=this.value; renderRaporPage()"></div>
      </div>
      <p class="muted" style="margin-top:8px">Target hafalan: ${TARGET_HAFALAN_PER_HARI} halaman/hari. Predikat: A &ge;90%, B &ge;75%, C &ge;60%, D &ge;40%, E &lt;40%.</p>
    </div>
    <div class="btn-row" style="margin-bottom:10px">
      <button class="btn btn-sm" onclick="exportRaporExcel()">&#128190; Unduh Excel (Rekap Semua Santri)</button>
    </div>
    <div class="card">
      <div class="card-title">Grafik hafalan bertambah per santri (periode terpilih)</div>
      <canvas id="chartRaporHafalan" width="600" height="200" style="width:100%;height:170px"></canvas>
    </div>
    <div class="card">
      <table>
        <tr><th>Santri</th><th>Total Hafalan</th><th>Tambah (periode)</th><th>Nilai Hafalan</th><th>Kehadiran</th><th>Nilai Absensi</th><th></th></tr>
        ${rows.map(r=>`
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
      </table>
    </div>
  `;
  drawRaporHafalanChart(rows);
}
function drawRaporHafalanChart(rows){
  const canvas = document.getElementById('chartRaporHafalan');
  if(!canvas) return;
  const ctx = canvas.getContext('2d');
  const W = canvas.width, H = canvas.height, padL=30, padB=50;
  ctx.clearRect(0,0,W,H);
  if(rows.length===0){ ctx.fillStyle='#888'; ctx.font='13px sans-serif'; ctx.fillText('Belum ada data.', 10, H/2); return; }
  const warna = {A:'#3b5940', B:'#2f7d9d', C:'#d19a24', D:'#e07b39', E:'#c0392b'};
  const maxV = Math.max(1, ...rows.map(r=>r.nh.tambahan));
  const barW = Math.max(14, (W-padL-10) / rows.length - 6);
  ctx.strokeStyle='#ddd'; ctx.beginPath(); ctx.moveTo(padL,H-padB); ctx.lineTo(W-10,H-padB); ctx.stroke();
  rows.forEach((r,i)=>{
    const x = padL + i*(barW+6);
    const h = (r.nh.tambahan/maxV) * (H-padB-15);
    ctx.fillStyle = warna[r.nh.predikat] || '#555';
    ctx.fillRect(x, H-padB-h, barW, h);
    ctx.save();
    ctx.translate(x+barW/2, H-padB+4);
    ctx.rotate(Math.PI/4);
    ctx.fillStyle='#555'; ctx.font='9px sans-serif'; ctx.textAlign='left';
    ctx.fillText(r.s.nama.split(' ')[0], 0, 0);
    ctx.restore();
  });
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
function unduhRaporWord(santriId){
  const s = DB.santri.find(x=>x.id===santriId);
  if(!s){ alert('Data santri tidak ditemukan.'); return; }
  const total = totalHafalanSantri(s.id);
  const nh = nilaiHafalanSantri(s.id, raporFrom, raporTo);
  const na = nilaiAbsensiSantri(s.id, raporFrom, raporTo);
  const tglCetak = new Date().toLocaleDateString('id-ID', { day:'numeric', month:'long', year:'numeric' });
  const html = `
    <html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
    <head><meta charset="utf-8"><title>Rapor ${escapeHtml(s.nama)}</title>
    <style>
      body{ font-family: Calibri, Arial, sans-serif; font-size: 12pt; color:#000; }
      h1{ text-align:center; font-size:16pt; margin:0; }
      h2{ text-align:center; font-size:13pt; margin:2px 0 0; font-weight:normal; }
      .sub{ text-align:center; font-size:11pt; margin:2px 0 16px; }
      table.data{ border-collapse:collapse; width:100%; margin-bottom:14px; }
      table.data td{ padding:4px 6px; font-size:11pt; }
      table.nilai{ border-collapse:collapse; width:100%; margin-top:6px; }
      table.nilai th, table.nilai td{ border:1px solid #000; padding:8px; font-size:11pt; }
      table.nilai th{ background:#eee; text-align:left; }
      .ttd{ margin-top:60px; width:100%; }
      .ttd td{ text-align:center; font-size:11pt; vertical-align:top; }
    </style></head>
    <body>
      <h1>PONDOK ROUDHOTUL QUR'AN</h1>
      <h2>RAPOR SANTRI</h2>
      <div class="sub">Periode: ${raporFrom} s.d. ${raporTo}</div>
      <table class="data">
        <tr><td width="120"><b>Nama</b></td><td width="10">:</td><td>${escapeHtml(s.nama)}</td></tr>
        <tr><td><b>No. Induk</b></td><td>:</td><td>${escapeHtml(s.noInduk)||'-'}</td></tr>
        <tr><td><b>Kelas</b></td><td>:</td><td>${escapeHtml(s.kelas)||'-'}</td></tr>
        <tr><td><b>Kamar</b></td><td>:</td><td>${escapeHtml(s.kamar)||'-'}</td></tr>
        <tr><td><b>Program</b></td><td>:</td><td>${escapeHtml(s.program)||'-'}</td></tr>
      </table>
      <table class="nilai">
        <tr><th width="18%">Kategori</th><th>Keterangan</th><th width="12%">Nilai</th><th width="18%">Predikat</th></tr>
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
          <td width="50%"></td>
          <td width="50%">Roudhotul Qur'an, ${tglCetak}<br>Pengasuh,<br><br><br><br>(______________________)</td>
        </tr>
      </table>
    </body></html>`;
  const blob = new Blob(['\ufeff', html], { type: 'application/msword' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `Rapor-${s.nama.replace(/\s+/g,'_')}-${raporFrom}_${raporTo}.doc`;
  document.body.appendChild(a); a.click(); a.remove();
}

/* ---------- KELOLA (admin) ---------- */
function renderKelolaPage(){
  document.getElementById('content').innerHTML = `
    <h2>Kelola</h2>
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
    <div class="row"><h2>Data Pembina</h2><button class="btn btn-accent btn-sm" onclick="openPembinaForm()">+ Tambah</button></div>
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
