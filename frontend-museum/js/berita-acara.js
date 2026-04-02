requireAuth();

let staffList     = [];
let selectedItems = [];
let lampiranAktif = false;

document.addEventListener('DOMContentLoaded', async () => {
  renderUserInfo();
  await Promise.all([loadStaff(), loadBeritaAcaraList()]);
  bindFormEvents();
});

// ── Load Staff ─────────────────────────────────────────────────
async function loadStaff() {
  try {
    const res = await API.getStaff({ limit: 1000 });
    if (!res || !res.success) { showToast(`Gagal memuat staff: ${res?.message || 'unknown'}`, 'error'); return; }
    staffList = Array.isArray(res.data) ? res.data
              : Array.isArray(res.data?.data) ? res.data.data : [];
    populateStaffDropdowns();
  } catch (err) {
    showToast('Error memuat staff: ' + err.message, 'error');
  }
}

function populateStaffDropdowns() {
  const pihakOpts = '<option value="">— Pilih Staff —</option>' +
    staffList.map(s => `<option value="${s.id}">${s.nama} — ${s.jabatan}</option>`).join('');
  const saksiOpts = '<option value="">— Pilih Saksi (Opsional) —</option>' +
    staffList.map(s => `<option value="${s.id}">${s.nama} — ${s.jabatan}</option>`).join('');
  ['pihak_pertama_id', 'pihak_kedua_id'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.innerHTML = pihakOpts;
  });
  ['saksi1_id', 'saksi2_id'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.innerHTML = saksiOpts;
  });
}

// ── Bind Events ────────────────────────────────────────────────
function bindFormEvents() {
  document.getElementById('form-ba')?.addEventListener('submit', e => { e.preventDefault(); submitBA(); });

  document.getElementById('toggle-lampiran')?.addEventListener('change', e => {
    lampiranAktif = e.target.checked;
    document.getElementById('lampiran-section').style.display = lampiranAktif ? 'block' : 'none';
    if (!lampiranAktif) { selectedItems = []; renderSelectedItems(); }
  });

  document.getElementById('btn-tambah-koleksi')?.addEventListener('click', openKoleksiModal);

  document.getElementById('toggle-p2-ext')?.addEventListener('change', e => {
    const ext = e.target.checked;
    document.getElementById('p2-internal').style.display = ext ? 'none' : 'block';
    document.getElementById('p2-external').style.display = ext ? 'block' : 'none';
  });

  document.getElementById('toggle-s2-ext')?.addEventListener('change', e => {
    const ext = e.target.checked;
    document.getElementById('s2-internal').style.display = ext ? 'none' : 'block';
    document.getElementById('s2-external').style.display = ext ? 'block' : 'none';
  });
}

// ── Submit BA ──────────────────────────────────────────────────
async function submitBA() {
  if (!validateBA()) return;

  const p2IsExt = document.getElementById('toggle-p2-ext').checked;
  const s2IsExt = document.getElementById('toggle-s2-ext').checked;
  const lokasiGlobal = (document.getElementById('lokasi_tujuan_global')?.value || '').trim();

  const payload = {
    nomor_surat:          getValue('nomor_surat'),
    jenis_ba:             getValue('jenis_ba'),
    tanggal_serah_terima: getValue('tanggal_serah_terima'),
    pihak_pertama_id:     getValue('pihak_pertama_id'),

    pihak_kedua_id:   p2IsExt ? null : (getValue('pihak_kedua_id') || null),
    pihak_kedua_ext:  p2IsExt ? {
      nama:    getValue('p2_ext_nama'),
      nip:     getValue('p2_ext_nip') || '-',
      jabatan: getValue('p2_ext_jabatan'),
      alamat:  getValue('p2_ext_alamat'),
    } : null,

    saksi1_id: getValue('saksi1_id') || null,

    saksi2_id:  s2IsExt ? null : (getValue('saksi2_id') || null),
    saksi2_ext: s2IsExt && getValue('s2_ext_nama') ? {
      nama:    getValue('s2_ext_nama'),
      nip:     getValue('s2_ext_nip') || '-',
      jabatan: getValue('s2_ext_jabatan'),
    } : null,

    items: selectedItems.map(item => ({
      koleksi_id:    item.koleksi.id,
      kondisi:       item.kondisi_kategori === 'Baik'
                       ? 'Baik'
                       : `${item.kondisi_kategori}${item.kondisi_detail ? ' — ' + item.kondisi_detail : ''}`,
      lokasi_tujuan: lokasiGlobal,
      keterangan:    '',
    })),
  };

  const btn = document.getElementById('btn-cetak');
  setLoading(btn, true);
  try {
    const res = await API.createBeritaAcara(payload);
    if (res?.success) {
      showToast('Berita Acara berhasil dibuat!', 'success');
      if (res.data?.id) {
        setTimeout(() => {
          if (confirm('Download PDF sekarang?')) downloadPDF(res.data.id, payload.nomor_surat);
        }, 500);
      }
      resetForm();
      await loadBeritaAcaraList();
    } else {
      showToast(res?.message || 'Gagal membuat Berita Acara.', 'error');
    }
  } catch (err) {
    showToast('Error: ' + err.message, 'error');
  } finally {
    setLoading(btn, false);
  }
}

function resetForm() {
  document.getElementById('form-ba').reset();
  selectedItems = []; lampiranAktif = false;
  document.getElementById('lampiran-section').style.display = 'none';
  document.getElementById('p2-internal').style.display = 'block';
  document.getElementById('p2-external').style.display = 'none';
  document.getElementById('s2-internal').style.display = 'block';
  document.getElementById('s2-external').style.display = 'none';
  renderSelectedItems();
}

// ── Validate ───────────────────────────────────────────────────
function validateBA() {
  const required = [
    { id: 'nomor_surat',          label: 'Nomor Surat' },
    { id: 'jenis_ba',             label: 'Jenis BA' },
    { id: 'tanggal_serah_terima', label: 'Tanggal' },
    { id: 'pihak_pertama_id',     label: 'Pihak Pertama' },
  ];
  let valid = true;
  required.forEach(({ id, label }) => {
    const el = document.getElementById(id);
    if (!getValue(id)) { el?.classList.add('is-invalid'); valid = false; }
    else               { el?.classList.remove('is-invalid'); }
  });

  const p2IsExt = document.getElementById('toggle-p2-ext').checked;
  if (p2IsExt) {
    if (!getValue('p2_ext_nama')) {
      document.getElementById('p2_ext_nama')?.classList.add('is-invalid'); valid = false;
    }
    if (!getValue('p2_ext_jabatan')) {
      document.getElementById('p2_ext_jabatan')?.classList.add('is-invalid'); valid = false;
    }
    if (!getValue('p2_ext_alamat')) {
      document.getElementById('p2_ext_alamat')?.classList.add('is-invalid'); valid = false;
    }
  } else {
    if (!getValue('pihak_kedua_id')) {
      document.getElementById('pihak_kedua_id')?.classList.add('is-invalid'); valid = false;
    }
  }

  if (!valid) { showToast('Harap isi semua field yang wajib diisi.', 'warning'); return false; }
  if (lampiranAktif && selectedItems.length === 0) {
    showToast('Lampiran aktif — minimal 1 koleksi harus dipilih.', 'warning'); return false;
  }
  return true;
}

// ── Modal Cari Koleksi ─────────────────────────────────────────
function openKoleksiModal() {
  document.getElementById('modal-koleksi-picker')?.remove();
  const modal = document.createElement('div');
  modal.id = 'modal-koleksi-picker';
  modal.className = 'modal-overlay';
  modal.innerHTML = `
    <div class="modal" style="max-width:660px;display:flex;flex-direction:column;max-height:90vh">
      <div class="modal-header" style="flex-shrink:0">
        <div style="display:flex;align-items:center;gap:10px">
          <h3 class="modal-title">Cari Koleksi</h3>
          <span id="picker-count-badge" class="item-count-badge" style="display:none;background:var(--hijau-sukses)">0 dipilih</span>
        </div>
        <button class="modal-close" onclick="closeKoleksiModal()">✕</button>
      </div>
      <div style="padding:14px 24px 0;flex-shrink:0">
        <div class="input-wrapper" style="margin-bottom:6px">
          <span class="input-icon" style="font-style:normal;font-size:11px;">Cari</span>
          <input type="text" id="search-koleksi-picker" class="form-control"
            placeholder="Cari nama koleksi atau no. inventaris..." style="padding-left:36px" autocomplete="off">
        </div>
        <p class="text-muted text-sm" style="padding-bottom:8px">
          Klik <strong>+ Tambah</strong> — modal tidak menutup sampai klik Selesai.
        </p>
      </div>
      <div id="picker-results" style="flex:1;overflow-y:auto;padding:0 24px;min-height:180px;max-height:50vh">
        <p class="text-muted text-sm text-center" style="padding:28px">Ketik untuk mencari koleksi...</p>
      </div>
      <div style="padding:12px 24px;border-top:1px solid var(--abu-border);flex-shrink:0;
                  display:flex;align-items:center;justify-content:space-between;background:#f8fafc;border-radius:0 0 12px 12px">
        <span id="picker-footer-info" class="text-muted text-sm">Belum ada koleksi dipilih</span>
        <button class="btn btn-primary btn-sm" onclick="closeKoleksiModal()" id="btn-selesai-picker">✓ Selesai</button>
      </div>
    </div>`;
  document.body.appendChild(modal);
  requestAnimationFrame(() => modal.classList.add('active'));
  modal.addEventListener('click', e => { if (e.target === modal) closeKoleksiModal(); });
  const inp = document.getElementById('search-koleksi-picker');
  inp?.focus();
  inp?.addEventListener('input', debounce(async () => {
    const q = inp.value.trim();
    if (!q) {
      document.getElementById('picker-results').innerHTML =
        `<p class="text-muted text-sm text-center" style="padding:28px">Ketik nama atau nomor inventaris...</p>`;
      return;
    }
    await searchKoleksiForPicker(q);
  }, 350));
  updatePickerFooter();
}

function closeKoleksiModal() { document.getElementById('modal-koleksi-picker')?.remove(); }

function updatePickerFooter() {
  const c = selectedItems.length;
  const badge = document.getElementById('picker-count-badge');
  if (badge) { badge.textContent = `${c} dipilih`; badge.style.display = c > 0 ? 'inline-flex' : 'none'; }
  const footer = document.getElementById('picker-footer-info');
  if (footer) footer.textContent = c > 0 ? `${c} koleksi dipilih` : 'Belum ada koleksi dipilih';
  const btn = document.getElementById('btn-selesai-picker');
  if (btn) btn.textContent = c > 0 ? `✓ Selesai (${c})` : '✓ Selesai';
}

async function searchKoleksiForPicker(q) {
  const container = document.getElementById('picker-results');
  if (!container) return;
  container.innerHTML = `<p class="text-muted text-sm text-center" style="padding:20px">Mencari...</p>`;
  try {
    const res  = await API.getKoleksi({ q, limit: 30 });
    const list = res?.data?.data ?? [];
    if (list.length === 0) {
      container.innerHTML = `<p class="text-muted text-sm text-center" style="padding:20px">Tidak ditemukan untuk "<strong>${escapeJs(q)}</strong>"</p>`;
      return;
    }
    container.innerHTML = list.map(k => renderPickerItem(k)).join('');
    container.querySelectorAll('[id^="picker-item-"]').forEach(el => {
      el.addEventListener('mouseenter', () => el.style.background = '#FEF2F2');
      el.addEventListener('mouseleave', () => el.style.background = '');
    });
  } catch (err) {
    container.innerHTML = `<p class="text-danger text-sm text-center" style="padding:20px">${err.message}</p>`;
  }
}

function renderPickerItem(k) {
  const added = selectedItems.some(i => i.koleksi.id === k.id);
  return `
    <div id="picker-item-${k.id}" style="padding:9px 10px;border-bottom:1px solid var(--abu-border);
         display:flex;align-items:center;justify-content:space-between;gap:10px;border-radius:4px">
      <div style="flex:1;min-width:0">
        <div style="font-weight:700;font-size:13px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${k.nama_koleksi}</div>
        <div style="font-size:11px;color:var(--teks-sekunder);margin-top:1px"><code>${k.no_inventaris}</code> · ${k.jenis_koleksi||'-'}</div>
      </div>
      <div style="display:flex;align-items:center;gap:8px;flex-shrink:0">
        ${getBadgeKondisi(k.kondisi_terkini)}
        ${added
          ? `<span style="font-size:11px;color:var(--hijau-sukses);font-weight:700;background:#dcfce7;padding:2px 8px;border-radius:99px">✓ Dipilih</span>`
          : `<button class="btn btn-sm btn-secondary" style="font-size:12px;padding:3px 10px"
               onclick="addKoleksiToBA('${k.id}','${escapeJs(k.no_inventaris)}','${escapeJs(k.nama_koleksi)}','${escapeJs(k.jenis_koleksi||'')}','${k.kondisi_terkini||'Baik'}')">
               + Tambah
             </button>`}
      </div>
    </div>`;
}

function addKoleksiToBA(id, noInv, nama, jenis, kondisi) {
  if (selectedItems.find(i => i.koleksi.id === id)) { showToast('Sudah ada dalam daftar.', 'warning'); return; }
  selectedItems.push({
    koleksi: { id, no_inventaris: noInv, nama_koleksi: nama, jenis_koleksi: jenis },
    kondisi_kategori: kondisi === 'Baik' ? 'Baik' : kondisi,
    kondisi_detail: '',
  });
  const itemEl = document.getElementById(`picker-item-${id}`);
  if (itemEl) {
    const btn = itemEl.querySelector('button');
    if (btn) btn.outerHTML = `<span style="font-size:11px;color:var(--hijau-sukses);font-weight:700;background:#dcfce7;padding:2px 8px;border-radius:99px">✓ Dipilih</span>`;
  }
  updatePickerFooter();
  renderSelectedItems();
  showToast(`"${nama}" ditambahkan`, 'success');
}

// ── Render item terpilih ───────────────────────────────────────
function renderSelectedItems() {
  const container = document.getElementById('selected-items-list');
  const countEl   = document.getElementById('item-count');
  if (countEl) countEl.textContent = selectedItems.length;
  if (!container) return;

  if (selectedItems.length === 0) {
    container.innerHTML = `<div class="empty-items">Belum ada koleksi dipilih</div>`;
    return;
  }

  container.innerHTML = selectedItems.map((item, i) => `
    <div class="item-row-grid">
      <div>
        <div class="item-nama">${item.koleksi.nama_koleksi}</div>
        <div class="item-inv">${item.koleksi.no_inventaris} · ${item.koleksi.jenis_koleksi || '-'}</div>
        <div class="kondisi-split">
          <select class="filter-control" style="font-size:12px;padding:4px 6px"
            onchange="updateKondisiKategori(${i}, this.value)">
            <option value="Baik"         ${item.kondisi_kategori==='Baik'         ?'selected':''}>Baik</option>
            <option value="Rusak Ringan" ${item.kondisi_kategori==='Rusak Ringan' ?'selected':''}>Rusak Ringan</option>
            <option value="Rusak Berat"  ${item.kondisi_kategori==='Rusak Berat'  ?'selected':''}>Rusak Berat</option>
          </select>
          <input type="text" id="kondisi-detail-${i}"
            class="kondisi-detail-input ${item.kondisi_kategori !== 'Baik' ? 'visible' : ''}"
            placeholder="Contoh: patah bagian pegangan..."
            value="${escapeHtmlAttr(item.kondisi_detail)}"
            oninput="updateKondisiDetail(${i}, this.value)">
        </div>
      </div>
      <button class="btn-hapus-item" onclick="removeItem(${i})" title="Hapus">✕</button>
    </div>`).join('');
}

function updateKondisiKategori(idx, val) {
  if (!selectedItems[idx]) return;
  selectedItems[idx].kondisi_kategori = val;
  const el = document.getElementById(`kondisi-detail-${idx}`);
  if (el) {
    if (val !== 'Baik') { el.classList.add('visible'); }
    else { el.classList.remove('visible'); el.value = ''; selectedItems[idx].kondisi_detail = ''; }
  }
}

function updateKondisiDetail(idx, val) { if (selectedItems[idx]) selectedItems[idx].kondisi_detail = val; }
function removeItem(idx) { selectedItems.splice(idx, 1); renderSelectedItems(); }

// ── Load List BA ───────────────────────────────────────────────
async function loadBeritaAcaraList() {
  const tbody = document.getElementById('tbody-ba-list');
  if (!tbody) return;
  tbody.innerHTML = skeletonRows(5, 5);
  try {
    const res  = await API.getBeritaAcara();
    const list = res?.data ?? [];
    if (list.length === 0) {
      tbody.innerHTML = `<tr><td colspan="5" class="table-empty"><div class="empty-text">Belum ada Berita Acara</div></td></tr>`;
      return;
    }
    const u = JSON.parse(localStorage.getItem('user')||'{}');
    const isAdmin = u.role === 'admin';

    tbody.innerHTML = list.map(ba => `
      <tr>
        <td><strong style="font-size:13px">${ba.nomor_surat || '-'}</strong></td>
        <td>${ba.jenis_ba || '-'}</td>
        <td>${formatDate(ba.tanggal_serah_terima)}</td>
        <td>${ba.pihak1?.nama || '-'}</td>
        <td>
          <div class="action-group">
            <button class="btn btn-sm btn-ghost" onclick="openDetailModal('${ba.id}')" title="Detail">Detail</button>
            <button class="btn btn-sm btn-secondary" onclick="downloadPDF('${ba.id}','${ba.nomor_surat}')" title="Download BA">Download</button>
            <button class="btn btn-sm btn-ghost" onclick="downloadLampiranBAPdf('${ba.id}','${ba.nomor_surat}')" title="Cetak Lampiran Perawatan">Lampiran</button>
            ${isAdmin ? `<button class="btn btn-sm btn-danger" onclick="hapusBeritaAcara('${ba.id}', '${escapeJs(ba.nomor_surat)}')">Hapus</button>` : ''}
          </div>
        </td>
      </tr>`).join('');
  } catch {
    tbody.innerHTML = `<tr><td colspan="5" class="table-empty"><div class="empty-text text-danger">Gagal memuat data</div></td></tr>`;
  }
}

async function hapusBeritaAcara(id, nomorSurat) {
  showModalHapus({
    judul: 'Hapus Berita Acara',
    nama: `Nomor Surat: ${nomorSurat}`,
    sub: 'Tindakan ini juga akan menghapus data item koleksi dalam BA ini.',
    onConfirm: async () => {
      try {
        const res = await API.deleteBeritaAcara(id);
        if (res?.success) {
          showToast('Berita Acara berhasil dihapus', 'success');
          loadBeritaAcaraList();
        } else {
          showToast(res?.message || 'Gagal menghapus BA', 'error');
        }
      } catch (err) {
        showToast('Error: ' + err.message, 'error');
      }
    }
  });
}

// ── Detail Modal ───────────────────────────────────────────────
async function openDetailModal(id) {
  document.getElementById('modal-detail-ba')?.remove();
  const modal = document.createElement('div');
  modal.id = 'modal-detail-ba';
  modal.className = 'modal-overlay';
  modal.innerHTML = `
    <div class="modal" style="max-width:700px">
      <div class="modal-header">
        <h3 class="modal-title">Detail Berita Acara</h3>
        <button class="modal-close" onclick="document.getElementById('modal-detail-ba').remove()">✕</button>
      </div>
      <div class="modal-body" id="modal-detail-content">
        <div class="skeleton skeleton-text w-100" style="height:80px;margin-bottom:12px"></div>
      </div>
      <div class="modal-footer" id="modal-detail-footer">
        <button class="btn btn-ghost" onclick="document.getElementById('modal-detail-ba').remove()">Tutup</button>
      </div>
    </div>`;
  document.body.appendChild(modal);
  requestAnimationFrame(() => modal.classList.add('active'));
  modal.addEventListener('click', e => { if (e.target === modal) modal.remove(); });
  try {
    const res = await API.getBeritaAcaraById(id);
    const ba  = res?.data;
    if (!ba) throw new Error('Data tidak ditemukan.');
    document.getElementById('modal-detail-content').innerHTML = `
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:14px;margin-bottom:16px">
        <div><p class="text-sm text-muted">Nomor Surat</p><p class="fw-700">${ba.nomor_surat}</p></div>
        <div><p class="text-sm text-muted">Jenis BA</p><p class="fw-700">${ba.jenis_ba}</p></div>
        <div><p class="text-sm text-muted">Tanggal</p><p class="fw-700">${formatDate(ba.tanggal_serah_terima)}</p></div>
      </div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:14px;margin-bottom:16px">
        <div style="background:#f8fafc;padding:10px;border-radius:8px">
          <p class="text-sm text-muted">Pihak Pertama</p>
          <p class="fw-700">${ba.pihak1?.nama||'-'}</p>
          <p class="text-sm text-muted">${ba.pihak1?.jabatan||''}</p>
        </div>
        <div style="background:#f8fafc;padding:10px;border-radius:8px">
          <p class="text-sm text-muted">Pihak Kedua</p>
          <p class="fw-700">${ba.pihak2?.nama||'-'}</p>
          <p class="text-sm text-muted">${ba.pihak2?.jabatan||''}</p>
        </div>
      </div>
      <p class="fw-700" style="margin-bottom:8px">Koleksi (${ba.items?.length||0} item)</p>
      <div class="table-wrapper" style="border:1px solid var(--abu-border);border-radius:8px">
        <table class="table" style="font-size:12px">
          <thead><tr><th>No. Inv</th><th>Nama</th><th>Jenis</th><th>Kondisi</th><th>Lokasi</th></tr></thead>
          <tbody>
            ${(ba.items||[]).map(item=>`
              <tr>
                <td><code>${item.koleksi?.no_inventaris||'-'}</code></td>
                <td><strong>${item.koleksi?.nama_koleksi||'-'}</strong></td>
                <td>${item.koleksi?.jenis_koleksi||'-'}</td>
                <td>${getBadgeKondisi(item.kondisi_saat_transaksi)}</td>
                <td>${item.lokasi_tujuan||'-'}</td>
              </tr>`).join('')}
          </tbody>
        </table>
      </div>`;
    document.getElementById('modal-detail-footer').innerHTML = `
      <button class="btn btn-ghost" onclick="document.getElementById('modal-detail-ba').remove()">Tutup</button>
      <button class="btn btn-primary" onclick="downloadPDF('${ba.id}','${ba.nomor_surat}')">Download PDF</button>`;
  } catch (err) {
    document.getElementById('modal-detail-content').innerHTML = `<div class="alert alert-error">${err.message}</div>`;
  }
}

// ── Helpers ────────────────────────────────────────────────────
function getValue(id) { const el = document.getElementById(id); return el ? el.value.trim() : ''; }
function setLoading(btn, on) {
  if (!btn) return;
  btn.disabled = on;
  if (on) { btn.classList.add('loading'); btn.dataset.orig = btn.textContent; btn.textContent = 'Memproses...'; }
  else    { btn.classList.remove('loading'); btn.textContent = btn.dataset.orig || 'Cetak PDF'; }
}
function escapeJs(s) { return (s||'').replace(/\\/g,'\\\\').replace(/'/g,"\\'").replace(/"/g,'\\"').replace(/\n/g,' '); }
function escapeHtmlAttr(s) { return (s||'').replace(/"/g,'&quot;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }