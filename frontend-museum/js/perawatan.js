requireAuth();

document.addEventListener('DOMContentLoaded', async () => {
  renderUserInfo();
  await loadAvailableBA();
  await loadForms();
  bindForm();
});

async function loadAvailableBA() {
  const sel = document.getElementById('ba_id');
  if (!sel) return;
  sel.innerHTML = '<option value="">— Memuat BA... —</option>';
  try {
    const res = await API.getPerawatanBaAvailable();
    if (res?.success && res.data?.length > 0) {
      sel.innerHTML = '<option value="">— Pilih Berita Acara —</option>' + res.data.map(b => 
        `<option value="${b.id}">${b.nomor_surat} (${b.jenis_ba})</option>`
      ).join('');
    } else {
      sel.innerHTML = '<option value="">— Tidak ada BA tersedia —</option>';
    }
  } catch (err) {
    sel.innerHTML = '<option value="">— Gagal memuat BA —</option>';
    showToast(err.message, 'error');
  }
}

async function loadForms() {
  const tbody = document.getElementById('tbody-forms');
  if (!tbody) return;
  tbody.innerHTML = '<tr><td colspan="5">Memuat...</td></tr>';
  try {
    const res = await API.getPerawatan();
    const data = res?.data || [];
    if (data.length === 0) {
      tbody.innerHTML = '<tr><td colspan="5" class="text-center">Belum ada form perawatan</td></tr>';
      return;
    }
    const u = JSON.parse(localStorage.getItem('user')||'{}');
    const isAdmin = u.role === 'admin';

    tbody.innerHTML = data.map(f => `
      <tr>
        <td><strong>${f.kode_perawatan}</strong></td>
        <td>${new Date(f.berita_acara?.tanggal_serah_terima).toLocaleDateString('id-ID')}</td>
        <td>${f.berita_acara?.nomor_surat}</td>
        <td>${f.petugas_konservasi || '-'}</td>
        <td>
          <button class="btn btn-sm btn-secondary" onclick="downloadPerawatanPdf('${f.id}','${escapeJs(f.kode_perawatan)}')">PDF</button>
          ${isAdmin ? `<button class="btn btn-sm btn-danger" onclick="hapusForm('${f.id}','${escapeJs(f.kode_perawatan)}')">Hapus</button>` : ''}
        </td>
      </tr>
    `).join('');
  } catch (err) {
    tbody.innerHTML = `<tr><td colspan="5" class="text-danger text-center">Gagal memuat: ${err.message}</td></tr>`;
  }
}

function getCheckedValues(containerId) {
  const container = document.getElementById(containerId);
  if (!container) return [];
  return Array.from(container.querySelectorAll('input:checked')).map(cb => cb.value);
}

function bindForm() {
  document.getElementById('form-perawatan')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const payload = {
      kode_perawatan: document.getElementById('kode_perawatan').value,
      ba_id: document.getElementById('ba_id').value,
      asal_koleksi: document.getElementById('asal_koleksi').value,
      jenis_bahan: document.getElementById('jenis_bahan').value,
      klasifikasi_koleksi: document.getElementById('klasifikasi_koleksi').value,
      material_bahan: getCheckedValues('material_bahan'),
      kondisi_koleksi: getCheckedValues('kondisi_koleksi'),
      faktor_kerusakan: getCheckedValues('faktor_kerusakan'),
      teknis_penanganan: document.getElementById('teknis_penanganan').value,
      metode_perawatan: document.getElementById('metode_perawatan').value,
      metode_bahan: document.getElementById('metode_bahan').value,
      alat_digunakan: getCheckedValues('alat_digunakan'),
      bahan_digunakan: getCheckedValues('bahan_digunakan'),
      petugas_konservasi: document.getElementById('petugas_konservasi').value,
      pendataan: document.getElementById('pendataan').value
    };

    try {
      const res = await API.createPerawatan(payload);
      if (res?.success) {
        showToast('Form berhasil disimpan', 'success');
        document.getElementById('form-perawatan').reset();
        await loadAvailableBA();
        await loadForms();
        if (confirm('Download PDF sekarang?')) downloadPerawatanPdf(res.data.id, res.data.kode_perawatan);
      } else {
        showToast(res.message, 'error');
      }
    } catch (err) {
      showToast(err.message, 'error');
    }
  });
}

function escapeJs(s) { return (s||'').replace(/\\/g,'\\\\').replace(/'/g,"\\'").replace(/"/g,'\\"').replace(/\n/g,' '); }

async function hapusForm(id, kode) {
  if (confirm(`Yakin ingin menghapus form ${kode}?`)) {
    try {
      const res = await API.deletePerawatan(id);
      if (res.success) {
        showToast('Berhasil dihapus', 'success');
        loadForms();
      }
    } catch (err) {
      showToast(err.message, 'error');
    }
  }
}
