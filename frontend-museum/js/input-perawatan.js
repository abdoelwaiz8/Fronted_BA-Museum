requireAuth();

// ── Checkbox options ───────────────────────────────────────────
const OPT_MATERIAL   = ['Batu','Kayu','Logam','Tekstil','Kulit','Rotan','Kertas','Keramik'];
const OPT_KONDISI    = ['Polutan/debu','Jamur','Lembab','Lapuk','Mengelupas','Berubah Warna','Tergores','Berlubang','Sompel','Robek','Noda Kotoran','Bekas Perbaikan','Pecah','Retak','Patah','Karatan'];
const OPT_FAKTOR     = ['Cahaya','Debu','Suhu','Kelembaban','Bencana','Serangga/hama','Disosiasi','Vandalisme/Tekanan'];
const OPT_ALAT       = ['Kuas','Pinset','Spatula','Scraple','Sikat gigi','Sikat Plastik','Beaker Glass','Pipet Tetes','Jarum Pentul','Jarum Jahit','Jarum Suntik','Gunting','Spons','Selang Air','Ember','Alat Penumbuk','Oven','Timbangan','Vacum Cleaner','Wadah Stanliesh'];
const OPT_BAHAN      = ['Typol','Citrit Acid','Aquades','Alkohol','Parafin','Naftalena','Kain/serbet','Kain Kasa','Benang','Karet Penghapus','Sabun cuci','Sabun Antiseptik','Lem','Tali','Kapas'];
const OPT_PEMBUNGKUS = ['Amplop','Box File','Busa Lapis','Busa Polyfoam','Kertas Bebas asam','Kain kerah (staplek)','Kain Belacu','Kertas Wrab'];
const OPT_PENGAWET   = ['Cengkeh','Lada Hitam','Tembakau','Silica-gel','Kapur Barus'];

let selectedKoleksiId = null;

document.addEventListener('DOMContentLoaded', async () => {
  renderUserInfo();
  renderCheckboxGrid('cb-material', 'material', OPT_MATERIAL);
  renderCheckboxGrid('cb-kondisi', 'kondisi', OPT_KONDISI);
  renderCheckboxGrid('cb-faktor', 'faktor_kerusakan', OPT_FAKTOR);
  renderCheckboxGrid('cb-alat', 'alat', OPT_ALAT);
  renderCheckboxGrid('cb-bahan', 'bahan', OPT_BAHAN);
  renderCheckboxGrid('cb-pembungkus', 'pembungkus', OPT_PEMBUNGKUS);
  renderCheckboxGrid('cb-pengawet', 'pengawet', OPT_PENGAWET);
  await loadStaff();
  initKoleksiSearch();
  document.getElementById('form-perawatan')?.addEventListener('submit', e => { e.preventDefault(); submitForm(); });
});

function renderCheckboxGrid(containerId, name, options) {
  const el = document.getElementById(containerId);
  if (!el) return;
  el.innerHTML = options.map(o => `<label><input type="checkbox" name="${name}" value="${o}"> ${o}</label>`).join('');
}

async function loadStaff() {
  try {
    const res = await API.getStaff({ limit: 1000 });
    const list = Array.isArray(res?.data) ? res.data : Array.isArray(res?.data?.data) ? res.data.data : [];
    const sel = document.getElementById('petugas_id');
    if (!sel) return;
    sel.innerHTML = '<option value="">— Pilih Staff —</option>' + list.map(s => `<option value="${s.id}">${s.nama} — ${s.jabatan}</option>`).join('');
  } catch (err) {
    showToast('Gagal memuat staff: ' + err.message, 'error');
  }
}

// ── Koleksi autocomplete ───────────────────────────────────────
function initKoleksiSearch() {
  const input = document.getElementById('search-koleksi');
  const list  = document.getElementById('ac-list');
  if (!input || !list) return;

  const doSearch = debounce(async () => {
    const q = input.value.trim();
    if (q.length < 2) { list.classList.remove('show'); return; }
    try {
      const res = await API.getKoleksi({ q, limit: 10 });
      const items = res?.data?.data ?? [];
      if (items.length === 0) { list.innerHTML = '<div class="ac-item">Tidak ditemukan</div>'; list.classList.add('show'); return; }
      list.innerHTML = items.map(k => `<div class="ac-item" data-id="${k.id}" data-nama="${k.nama_koleksi}" data-inv="${k.no_inventaris}" data-jenis="${k.jenis_koleksi||''}"><strong>${k.nama_koleksi}</strong><span>${k.no_inventaris} · ${k.jenis_koleksi||'-'}</span></div>`).join('');
      list.classList.add('show');
    } catch (err) { list.innerHTML = '<div class="ac-item">Error: ' + err.message + '</div>'; list.classList.add('show'); }
  }, 350);

  input.addEventListener('input', doSearch);
  list.addEventListener('click', e => {
    const item = e.target.closest('.ac-item');
    if (!item || !item.dataset.id) return;
    selectedKoleksiId = item.dataset.id;
    document.getElementById('koleksi_id').value = item.dataset.id;
    document.getElementById('fill-nama').value  = item.dataset.nama;
    document.getElementById('fill-inv').value   = item.dataset.inv;
    document.getElementById('fill-jenis').value = item.dataset.jenis;
    input.value = item.dataset.nama;
    list.classList.remove('show');
  });
  document.addEventListener('click', e => { if (!e.target.closest('.autocomplete-wrap')) list.classList.remove('show'); });
}

// ── Collect form data ──────────────────────────────────────────
function collectFormData() {
  const getChecked = name => [...document.querySelectorAll(`[name="${name}"]:checked`)].map(c => c.value);
  const getRadio   = name => { const r = document.querySelector(`[name="${name}"]:checked`); return r ? r.value : null; };

  return {
    kode_perawatan:    document.getElementById('kode_perawatan')?.value?.trim(),
    tanggal:           document.getElementById('tanggal')?.value,
    petugas_id:        document.getElementById('petugas_id')?.value,
    koleksi_id:        document.getElementById('koleksi_id')?.value,
    asal_koleksi:      getRadio('asal_koleksi'),
    jenis_organik:     getRadio('jenis_organik') === 'true',
    material:          getChecked('material'),
    material_lainnya:  document.getElementById('material_lainnya')?.value?.trim() || null,
    kondisi:           getChecked('kondisi'),
    faktor_kerusakan:  getChecked('faktor_kerusakan'),
    teknis_penanganan: getRadio('teknis_penanganan'),
    metode_perawatan:  getRadio('metode_perawatan'),
    metode_bahan:      getRadio('metode_bahan'),
    alat:              getChecked('alat'),
    bahan:             getChecked('bahan'),
    pembungkus:        getChecked('pembungkus'),
    pengawet:          getChecked('pengawet'),
    catatan:           document.getElementById('catatan')?.value?.trim() || null,
  };
}

function validateForm(data) {
  if (!data.kode_perawatan) { showToast('Kode perawatan wajib diisi.', 'warning'); return false; }
  if (!data.koleksi_id) { showToast('Pilih koleksi terlebih dahulu.', 'warning'); return false; }
  if (!data.tanggal) { showToast('Tanggal wajib diisi.', 'warning'); return false; }
  if (!data.petugas_id) { showToast('Pilih petugas konservasi.', 'warning'); return false; }
  return true;
}

async function submitForm() {
  const data = collectFormData();
  if (!validateForm(data)) return;
  const btn = document.getElementById('btn-simpan');
  if (btn) { btn.disabled = true; btn.textContent = 'Menyimpan...'; }
  try {
    const res = await API.createPerawatan(data);
    if (res?.success) {
      showToast('Form perawatan berhasil disimpan!', 'success');
      if (res.data?.id && confirm('Download PDF sekarang?')) {
        downloadPerawatanPdf(res.data.id, data.kode_perawatan);
      }
      setTimeout(() => { window.location.href = 'perawatan.html'; }, 1500);
    } else {
      showToast(res?.message || 'Gagal menyimpan form.', 'error');
    }
  } catch (err) {
    showToast('Error: ' + err.message, 'error');
  } finally {
    if (btn) { btn.disabled = false; btn.textContent = 'Simpan Form'; }
  }
}
