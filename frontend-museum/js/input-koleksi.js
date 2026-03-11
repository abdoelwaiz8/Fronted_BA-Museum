/* ============================================================
   Museum Aceh — input-koleksi.js
   Logic: Form Tambah & Edit Koleksi (dual mode)
   ============================================================ */

requireAuth();

// ── State ──────────────────────────────────────────────────────
const editId = new URLSearchParams(window.location.search).get('id');
const isEditMode = !!editId;

// ── Init ───────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', async () => {
  renderUserInfo();
  updatePageMode();

  if (isEditMode) {
    await loadKoleksiData(editId);
  }

  bindFormEvents();
});

// ── Update UI for mode ─────────────────────────────────────────
function updatePageMode() {
  const pageTitle = document.querySelector('.page-title');
  const formTitle = document.getElementById('form-title');
  const btnSubmit = document.getElementById('btn-submit');
  const breadcrumb = document.getElementById('breadcrumb');

  if (isEditMode) {
    if (pageTitle) pageTitle.textContent = 'Edit Koleksi';
    if (formTitle) formTitle.textContent = '✏️ Edit Data Koleksi';
    if (btnSubmit) btnSubmit.textContent = 'Simpan Perubahan ▶';
    if (breadcrumb) breadcrumb.innerHTML = `
      <a href="koleksi.html" style="color:var(--teks-sekunder);text-decoration:none">Koleksi</a>
      <span style="color:var(--teks-sekunder)"> / Edit Koleksi</span>
    `;
  } else {
    if (pageTitle) pageTitle.textContent = 'Tambah Koleksi';
    if (formTitle) formTitle.textContent = '🏺 Registrasi Koleksi Baru';
    if (btnSubmit) btnSubmit.textContent = 'Tambah Koleksi ▶';
  }
}

// ── Load data untuk edit ───────────────────────────────────────
async function loadKoleksiData(id) {
  const formCard = document.getElementById('form-card');
  if (formCard) formCard.style.opacity = '0.6';

  try {
    const res = await API.getKoleksiById(id);
    if (!res?.success || !res?.data) {
      showToast('Koleksi tidak ditemukan.', 'error');
      setTimeout(() => window.location.href = 'koleksi.html', 1500);
      return;
    }

    const k = res.data;
    setFieldValue('no_inventaris', k.no_inventaris);
    setFieldValue('nama_koleksi', k.nama_koleksi);
    setFieldValue('jenis_koleksi', k.jenis_koleksi);
    setFieldValue('kondisi_terkini', k.kondisi_terkini);
    setFieldValue('lokasi_terkini', k.lokasi_terkini);

    // Show info
    const infoEl = document.getElementById('edit-info');
    if (infoEl) {
      infoEl.textContent = `Mengedit: ${k.nama_koleksi}`;
      infoEl.style.display = 'block';
    }

  } catch (err) {
    showToast('Gagal memuat data koleksi: ' + err.message, 'error');
  } finally {
    if (formCard) formCard.style.opacity = '1';
  }
}

function setFieldValue(name, value) {
  const el = document.getElementById(name) || document.querySelector(`[name="${name}"]`);
  if (el && value !== null && value !== undefined) el.value = value;
}

// ── Bind Form Events ───────────────────────────────────────────
function bindFormEvents() {
  const form = document.getElementById('form-koleksi');
  if (!form) return;

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!validateForm()) return;

    const payload = {
      no_inventaris:   getValue('no_inventaris'),
      nama_koleksi:    getValue('nama_koleksi'),
      jenis_koleksi:   getValue('jenis_koleksi'),
      kondisi_terkini: getValue('kondisi_terkini'),
      lokasi_terkini:  getValue('lokasi_terkini'),
    };

    const btn = document.getElementById('btn-submit');
    setLoading(btn, true);

    try {
      let res;
      if (isEditMode) {
        res = await API.updateKoleksi(editId, payload);
      } else {
        res = await API.createKoleksi(payload);
      }

      if (res?.success) {
        const msg = isEditMode
          ? 'Koleksi berhasil diperbarui!'
          : 'Koleksi berhasil ditambahkan!';
        showToast(msg, 'success');

        btn.textContent = '✓ Berhasil!';
        btn.style.background = '#16A34A';

        setTimeout(() => window.location.href = 'koleksi.html', 1500);
      } else {
        showToast(res?.message || 'Terjadi kesalahan.', 'error');
        setLoading(btn, false);
      }
    } catch (err) {
      showToast('Gagal: ' + err.message, 'error');
      setLoading(btn, false);
    }
  });

  // Clear errors on input
  form.querySelectorAll('input, select, textarea').forEach(el => {
    el.addEventListener('input', () => clearFieldError(el.id || el.name));
  });
}

// ── Validation ─────────────────────────────────────────────────
function validateForm() {
  const required = [
    { id: 'no_inventaris', label: 'No. Inventaris' },
    { id: 'nama_koleksi', label: 'Nama Koleksi' },
    { id: 'kondisi_terkini', label: 'Kondisi' },
  ];

  let valid = true;

  required.forEach(({ id, label }) => {
    const val = getValue(id);
    if (!val.trim()) {
      showFieldError(id, `${label} wajib diisi.`);
      valid = false;
    }
  });

  return valid;
}

function showFieldError(id, msg) {
  const el = document.getElementById(id);
  if (el) el.classList.add('is-invalid');
  const errEl = document.getElementById(`err-${id}`);
  if (errEl) {
    errEl.textContent = msg;
    errEl.style.display = 'flex';
  }
}

function clearFieldError(id) {
  const el = document.getElementById(id);
  if (el) el.classList.remove('is-invalid');
  const errEl = document.getElementById(`err-${id}`);
  if (errEl) errEl.style.display = 'none';
}

// ── Helpers ────────────────────────────────────────────────────
function getValue(id) {
  const el = document.getElementById(id);
  return el ? el.value.trim() : '';
}

function setLoading(btn, loading) {
  if (!btn) return;
  btn.disabled = loading;
  if (loading) {
    btn.classList.add('loading');
    btn.dataset.originalText = btn.textContent;
    btn.textContent = 'Menyimpan...';
  } else {
    btn.classList.remove('loading');
    btn.textContent = btn.dataset.originalText || 'Simpan';
  }
}