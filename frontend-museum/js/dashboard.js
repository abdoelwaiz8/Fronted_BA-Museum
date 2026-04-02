/* ============================================================
   Museum Aceh — dashboard.js  (FIXED)

   PERBAIKAN:
   - Grafik jenis: getKoleksiStats() → semua 4776 koleksi, semua 10 jenis
   - Kondisi Baik: NULL kondisi_terkini dihitung sebagai 'Baik'
   - Stat cards kondisi diambil dari stats endpoint (bukan 3 request terpisah)
   ============================================================ */

requireAuth();

let chartKondisi = null;
let chartJenis   = null;

document.addEventListener('DOMContentLoaded', async () => {
  renderUserInfo();
  showSkeletons();
  await Promise.all([
    loadStatistikDanGrafik(),
    loadBeritaAcaraTerbaru(),
    loadAktivitas(),
  ]);
});

function showSkeletons() {
  document.querySelectorAll('.stat-value').forEach((el) => {
    el.innerHTML = '<div class="skeleton skeleton-stat"></div>';
  });
}

// ── Gabungkan statistik & grafik dalam satu call ───────────────
async function loadStatistikDanGrafik() {
  try {
    const [resTotal, resBA, resStats] = await Promise.all([
      API.getKoleksi({ limit: 1 }),     // hanya butuh meta.total
      API.getBeritaAcara(),
      API.getKoleksiStats(),             // FIXED: semua data dari server
    ]);

    const total   = resTotal?.data?.meta?.total ?? 0;
    const totalBA = resBA?.data?.length ?? 0;
    const stats   = resStats?.data;

    // ── Stat Cards ─────────────────────────────────────────────
    animateCount('stat-total', total);
    animateCount('stat-ba',    totalBA);

    if (stats) {
      // FIXED: NULL kondisi sudah dihitung sebagai 'Baik' di backend
      const baik       = stats.byKondisi?.['Baik']        ?? 0;
      const ringan     = stats.byKondisi?.['Rusak Ringan'] ?? 0;
      const berat      = stats.byKondisi?.['Rusak Berat']  ?? 0;
      const perhatian  = ringan + berat;

      animateCount('stat-baik',       baik);
      animateCount('stat-perhatian',  perhatian);

      renderChartKondisi({ baik, ringan, berat });

      // FIXED: byJenis mengandung SEMUA jenis dari seluruh 4776 koleksi
      const top8 = (stats.byJenis || []).slice(0, 8);
      renderChartJenis(top8.map((j) => [j.jenis_koleksi, j.total]));
    } else {
      // Fallback jika stats endpoint belum tersedia
      animateCount('stat-baik',      0);
      animateCount('stat-perhatian', 0);
    }

  } catch (err) {
    console.error('Statistik error:', err);
    showToast('Gagal memuat statistik: ' + err.message, 'error');
  }
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

function renderChartKondisi({ baik, ringan, berat }) {
  const ctx = document.getElementById('chart-kondisi');
  if (!ctx) return;
  if (chartKondisi) chartKondisi.destroy();

  chartKondisi = new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels:   ['Baik', 'Rusak Ringan', 'Rusak Berat'],
      datasets: [{
        data:            [baik, ringan, berat],
        backgroundColor: ['#16A34A', '#CA8A04', '#DC2626'],
        borderColor:     ['#ffffff', '#ffffff', '#ffffff'],
        borderWidth:     3,
        hoverOffset:     8,
      }],
    },
    options: {
      responsive:          true,
      maintainAspectRatio: false,
      cutout:              '65%',
      plugins: {
        legend: {
          position: 'bottom',
          labels: {
            padding:       16,
            font:          { family: "'Source Sans 3', sans-serif", size: 13 },
            usePointStyle: true,
          },
        },
        tooltip: {
          callbacks: {
            label: (ctx) => ` ${ctx.label}: ${ctx.raw.toLocaleString('id-ID')} koleksi`,
          },
        },
      },
    },
  });
}

function renderChartJenis(data) {
  const ctx = document.getElementById('chart-jenis');
  if (!ctx) return;
  if (chartJenis) chartJenis.destroy();

  const labels = data.map(([k]) => k);
  const values = data.map(([, v]) => v);

  chartJenis = new Chart(ctx, {
    type: 'bar',
    data: {
      labels,
      datasets: [{
        label:           'Jumlah Koleksi',
        data:            values,
        backgroundColor: labels.map((_, i) =>
          `rgba(185,28,28,${0.45 + (i / Math.max(labels.length - 1, 1)) * 0.55})`
        ),
        borderColor:  '#B91C1C',
        borderWidth:  1,
        borderRadius: 6,
      }],
    },
    options: {
      responsive:          true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: {
            label: (ctx) => ` ${ctx.raw.toLocaleString('id-ID')} koleksi`,
          },
        },
      },
      scales: {
        x: {
          grid: { display: false },
          ticks: {
            font:        { family: "'Source Sans 3', sans-serif", size: 11 },
            maxRotation: 30,
          },
        },
        y: {
          grid:  { color: '#f1f5f9' },
          ticks: {
            font:     { family: "'Source Sans 3', sans-serif", size: 12 },
            callback: (val) => val.toLocaleString('id-ID'),
          },
          beginAtZero: true,
        },
      },
    },
  });
}

// ── BA Terbaru ─────────────────────────────────────────────────
async function loadBeritaAcaraTerbaru() {
  const tbody = document.getElementById('tbody-ba');
  if (!tbody) return;
  tbody.innerHTML = skeletonRows(5, 6);

  try {
    const res     = await API.getBeritaAcara();
    const terbaru = (res?.data ?? []).slice(0, 5);

    if (terbaru.length === 0) {
      tbody.innerHTML = `
        <tr>
          <td colspan="6" class="table-empty">
            <div class="empty-text">Belum ada berita acara</div>
          </td>
        </tr>`;
      return;
    }

    const u = JSON.parse(localStorage.getItem('user')||'{}');
    const isAdmin = u.role === 'admin';

    tbody.innerHTML = terbaru.map((ba) => `
      <tr>
        <td><strong>${ba.nomor_surat || '-'}</strong></td>
        <td>${ba.jenis_ba || '-'}</td>
        <td>${formatDate(ba.tanggal_serah_terima)}</td>
        <td>${ba.pihak1?.nama || '-'}</td>
        <td>${ba.pihak2?.nama || '-'}</td>
        <td>
          <div class="action-group">
            <a href="berita-acara.html#detail-${ba.id}" class="btn btn-sm btn-ghost" title="Lihat detail">Detail</a>
            <button class="btn btn-sm btn-secondary"
              onclick="downloadPDF('${ba.id}','${ba.nomor_surat}')" title="Download PDF">PDF</button>
            ${isAdmin ? `<button class="btn btn-sm btn-danger" onclick="hapusBeritaAcara('${ba.id}', '${escapeJs(ba.nomor_surat)}')">Hapus</button>` : ''}
          </div>
        </td>
      </tr>
    `).join('');
  } catch (err) {
    tbody.innerHTML = `<tr><td colspan="6" class="table-empty">
      <div class="empty-text text-danger">Gagal memuat data</div></td></tr>`;
    showToast('Gagal memuat berita acara: ' + err.message, 'error');
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
          loadBeritaAcaraTerbaru();
        } else {
          showToast(res?.message || 'Gagal menghapus BA', 'error');
        }
      } catch (err) {
        showToast('Error: ' + err.message, 'error');
      }
    }
  });
}

// ── Aktivitas ──────────────────────────────────────────────────
async function loadAktivitas() {
  const container = document.getElementById('aktivitas-feed');
  if (!container) return;
  container.innerHTML = `<div class="skeleton skeleton-text w-100"></div>`.repeat(4);

  try {
    const [resBA, resKoleksi] = await Promise.all([
      API.getBeritaAcara(),
      API.getKoleksi({ sort_by: 'created_at', sort_order: 'desc', limit: 5 }),
    ]);

    const activities = [];

    (resBA?.data ?? []).slice(0, 5).forEach((ba) => {
      activities.push({
        text: `Berita Acara <strong>${ba.nomor_surat}</strong> (${ba.jenis_ba}) dibuat`,
        time: ba.created_at,
      });
    });

    (resKoleksi?.data?.data ?? []).forEach((k) => {
      activities.push({
        text: `Koleksi <strong>${k.nama_koleksi}</strong> ditambahkan`,
        time: k.created_at,
      });
    });

    activities.sort((a, b) => new Date(b.time) - new Date(a.time));
    const top = activities.slice(0, 8);

    if (top.length === 0) {
      container.innerHTML = `<p class="text-muted text-sm">Belum ada aktivitas.</p>`;
      return;
    }

    container.innerHTML = `
      <div class="timeline">
        ${top.map((a) => `
          <div class="timeline-item">
            <div class="timeline-content">
              <div class="timeline-text">${a.text}</div>
              <div class="timeline-time">${timeAgo(a.time)}</div>
            </div>
          </div>
        `).join('')}
      </div>
    `;
  } catch (err) {
    container.innerHTML = `<p class="text-danger text-sm">Gagal memuat aktivitas.</p>`;
  }
}