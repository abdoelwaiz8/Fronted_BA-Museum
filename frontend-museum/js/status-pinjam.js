requireAuth();

let allData = [];

document.addEventListener('DOMContentLoaded', async () => {
  renderUserInfo();
  bindFilterEvents();
  await loadStatusPinjam();
});

function bindFilterEvents() {
  document.getElementById('filter-search')?.addEventListener('input', debounce(renderTable, 300));
  document.getElementById('filter-tipe')?.addEventListener('change', renderTable);
}

async function loadStatusPinjam() {
  const tbody = document.getElementById('tbody-status');
  if (!tbody) return;

  try {
    const res = await API.getStatusPinjam();
    allData = res?.data || [];
    
    // Update Stats
    const total = allData.length;
    const internal = allData.filter(d => d.isInternal).length;
    const eksternal = allData.filter(d => !d.isInternal).length;
    const terlama = allData.length > 0 ? Math.max(...allData.map(d => d.durasi_hari)) : 0;

    animateCount('stat-total', total);
    animateCount('stat-internal', internal);
    animateCount('stat-eksternal', eksternal);
    animateCount('stat-terlama', terlama);

    renderTable();
  } catch (err) {
    showToast('Gagal memuat status pinjam: ' + err.message, 'error');
    tbody.innerHTML = `<tr><td colspan="8" class="table-empty"><div class="empty-text text-danger">Gagal memuat data</div></td></tr>`;
  }
}

function renderTable() {
  const tbody = document.getElementById('tbody-status');
  if (!tbody) return;

  const search = (document.getElementById('filter-search')?.value || '').toLowerCase();
  const tipe = document.getElementById('filter-tipe')?.value;

  const filtered = allData.filter(d => {
    const matchSearch = d.koleksi?.nama_koleksi?.toLowerCase().includes(search);
    const matchTipe = tipe === 'Semua' ? true : (tipe === 'Internal' ? d.isInternal : !d.isInternal);
    return matchSearch && matchTipe;
  });

  if (filtered.length === 0) {
    tbody.innerHTML = `<tr><td colspan="8" class="table-empty"><div class="empty-text">Tidak ada koleksi yang sedang dipinjam</div></td></tr>`;
    return;
  }

  tbody.innerHTML = filtered.map(d => {
    // Styling row based on durasi
    let rowClass = '';
    if (d.durasi_hari > 90) rowClass = 'row-danger';
    else if (d.durasi_hari > 30) rowClass = 'row-warning';

    const badgeTipe = d.isInternal 
      ? `<span class="badge badge-internal" style="font-size:10px">Internal</span>`
      : `<span class="badge badge-eksternal" style="font-size:10px">Eksternal</span>`;

    const namaPeminjam = d.peminjam?.nama || '-';
    const detailPeminjam = d.peminjam?.instansi || d.peminjam?.jabatan || '';

    return `
      <tr class="${rowClass}">
        <td><code>${d.koleksi?.no_inventaris || '-'}</code></td>
        <td>
          <strong>${d.koleksi?.nama_koleksi || '-'}</strong><br>
          <span style="font-size:11px;color:var(--teks-sekunder)">${d.koleksi?.jenis_koleksi || '-'}</span>
        </td>
        <td>${getBadgeKondisi(d.kondisi_saat_transaksi)}</td>
        <td>
          <div style="font-weight:600">${namaPeminjam}</div>
          <div style="font-size:11px;color:var(--teks-sekunder)">${detailPeminjam} ${badgeTipe}</div>
        </td>
        <td>${formatDate(d.tanggal_serah_terima)}</td>
        <td><strong>${d.durasi_hari}</strong> Hari</td>
        <td>${d.nomor_surat}</td>
        <td>
          <a href="berita-acara.html#detail-${d.ba_id}" class="btn btn-sm btn-secondary">Detail BA</a>
        </td>
      </tr>
    `;
  }).join('');
}

function animateCount(id, target) {
  const el = document.getElementById(id);
  if (!el) return;
  let current = 0;
  const step  = Math.max(1, Math.ceil(target / (800 / 16)));
  const timer = setInterval(() => {
    current = Math.min(current + step, target);
    el.textContent = current.toLocaleString('id-ID');
    if (current >= target) clearInterval(timer);
  }, 16);
}
