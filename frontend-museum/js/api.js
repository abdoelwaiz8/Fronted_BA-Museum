/* ============================================================
   Museum Aceh — api.js  (FIXED)
   ============================================================ */

const BASE_URL = 'http://localhost:5000/api';

function getToken() {
  return localStorage.getItem('token');
}

async function apiFetch(endpoint, options = {}) {
  try {
    const res = await fetch(`${BASE_URL}${endpoint}`, {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${getToken()}`,
        ...options.headers,
      },
      ...options,
    });

    if (res.status === 401) {
      localStorage.clear();
      window.location.href = 'index.html';
      return null;
    }

    return await res.json();
  } catch (err) {
    console.error(`[API Error] ${endpoint}:`, err);
    throw new Error('Gagal terhubung ke server. Pastikan backend berjalan.');
  }
}

async function downloadPDF(id, nomorSurat) {
  try {
    const res = await fetch(`${BASE_URL}/berita-acara/${id}/pdf`, {
      headers: { 'Authorization': `Bearer ${getToken()}` }
    });

    if (!res.ok) throw new Error(`Server mengembalikan status ${res.status}`);

    const blob = await res.blob();
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href     = url;
    a.download = `BA_${(nomorSurat || id).replace(/\//g, '-')}.pdf`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    showToast('PDF berhasil diunduh!', 'success');
  } catch (err) {
    showToast('Gagal mengunduh PDF: ' + err.message, 'error');
  }
}

const API = {
  login:  (body) => apiFetch('/auth/login', { method: 'POST', body: JSON.stringify(body) }),
  getMe:  ()     => apiFetch('/auth/me'),

  // Koleksi
  getKoleksi: (params = {}) => {
    const qs = new URLSearchParams(
      Object.fromEntries(
        Object.entries(params).filter(([, v]) => v !== '' && v !== null && v !== undefined)
      )
    ).toString();
    return apiFetch(`/koleksi${qs ? '?' + qs : ''}`);
  },

  // FIXED: endpoint stats untuk agregasi SEMUA koleksi (bukan sample 500/1000)
  getKoleksiStats: () => apiFetch('/koleksi/stats'),

  getKoleksiById: (id)       => apiFetch(`/koleksi/${id}`),
  createKoleksi:  (body)     => apiFetch('/koleksi', { method: 'POST', body: JSON.stringify(body) }),
  updateKoleksi:  (id, body) => apiFetch(`/koleksi/${id}`, { method: 'PUT', body: JSON.stringify(body) }),
  deleteKoleksi:  (id)       => apiFetch(`/koleksi/${id}`, { method: 'DELETE' }),

  // Staff — FIXED: default limit 1000 agar semua staff ter-load
  getStaff: (params = {}) => {
    const finalParams = { limit: 1000, ...params };
    const qs = new URLSearchParams(
      Object.fromEntries(
        Object.entries(finalParams).filter(([, v]) => v !== '' && v !== null && v !== undefined)
      )
    ).toString();
    return apiFetch(`/staff${qs ? '?' + qs : ''}`);
  },

  getBeritaAcara:     ()       => apiFetch('/berita-acara'),
  getBeritaAcaraById: (id)     => apiFetch(`/berita-acara/${id}`),
  createBeritaAcara:  (body)   => apiFetch('/berita-acara', { method: 'POST', body: JSON.stringify(body) }),
};

// ── Toast ──────────────────────────────────────────────────────

function getToastContainer() {
  let c = document.getElementById('toast-container');
  if (!c) {
    c = document.createElement('div');
    c.id = 'toast-container';
    c.className = 'toast-container';
    document.body.appendChild(c);
  }
  return c;
}

function showToast(message, type = 'success') {
  const icons = { success: '✅', error: '❌', warning: '⚠️', info: 'ℹ️' };
  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  toast.innerHTML = `
    <span class="toast-icon">${icons[type] || '💬'}</span>
    <span class="toast-message">${message}</span>
    <button class="toast-dismiss" onclick="this.parentElement.remove()">✕</button>
  `;
  getToastContainer().appendChild(toast);
  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateX(20px)';
    toast.style.transition = 'all 0.3s ease';
    setTimeout(() => toast.remove(), 300);
  }, 3500);
}

// ── Modal Hapus ────────────────────────────────────────────────

function showModalHapus({ judul, nama, sub = null, onConfirm }) {
  document.getElementById('modal-hapus')?.remove();
  const modal = document.createElement('div');
  modal.id = 'modal-hapus';
  modal.className = 'modal-overlay';
  modal.innerHTML = `
    <div class="modal" style="max-width:420px">
      <div class="modal-header">
        <div style="display:flex;align-items:center;gap:10px">
          <span style="font-size:22px">🗑️</span>
          <span class="modal-title" style="color:var(--merah-bahaya)">${judul || 'Hapus Data?'}</span>
        </div>
        <button class="modal-close" onclick="document.getElementById('modal-hapus').remove()">✕</button>
      </div>
      <div class="modal-body">
        <div class="delete-info">
          <div class="delete-nama">${nama}</div>
          ${sub ? `<div class="delete-sub">${sub}</div>` : ''}
        </div>
        <div class="delete-warning"><span>⚠️</span><span>Tindakan ini tidak dapat dibatalkan.</span></div>
      </div>
      <div class="modal-footer">
        <button class="btn btn-ghost" onclick="document.getElementById('modal-hapus').remove()">Batal</button>
        <button class="btn btn-danger" id="btn-confirm-hapus">Ya, Hapus</button>
      </div>
    </div>
  `;
  document.body.appendChild(modal);
  requestAnimationFrame(() => modal.classList.add('active'));
  document.getElementById('btn-confirm-hapus').addEventListener('click', async () => {
    modal.remove();
    await onConfirm();
  });
  modal.addEventListener('click', (e) => { if (e.target === modal) modal.remove(); });
}

// ── Helpers ────────────────────────────────────────────────────

function formatDate(dateStr) {
  if (!dateStr) return '-';
  return new Date(dateStr).toLocaleDateString('id-ID', {
    day: '2-digit', month: 'long', year: 'numeric'
  });
}

function timeAgo(dateStr) {
  if (!dateStr) return '';
  const diff    = Date.now() - new Date(dateStr);
  const minutes = Math.floor(diff / 60000);
  const hours   = Math.floor(diff / 3600000);
  const days    = Math.floor(diff / 86400000);
  if (minutes < 1)  return 'baru saja';
  if (minutes < 60) return `${minutes} menit lalu`;
  if (hours < 24)   return `${hours} jam lalu`;
  if (days < 30)    return `${days} hari lalu`;
  return formatDate(dateStr);
}

function getBadgeKondisi(kondisi) {
  const map = {
    'Baik':         'badge-baik',
    'Rusak Ringan': 'badge-rusak-ringan',
    'Rusak Berat':  'badge-rusak-berat',
  };
  return `<span class="badge ${map[kondisi] || 'badge-baik'}">${kondisi || 'Baik'}</span>`;
}

function debounce(fn, delay = 400) {
  let timer;
  return (...args) => { clearTimeout(timer); timer = setTimeout(() => fn(...args), delay); };
}

function skeletonRows(count = 5, cols = 6) {
  return Array(count).fill(0).map(() =>
    `<tr>${Array(cols).fill(0).map(() =>
      `<td><div class="skeleton skeleton-text w-75"></div></td>`
    ).join('')}</tr>`
  ).join('');
}