/* ============================================================
   Museum Aceh — auth.js
   Autentikasi: login, logout, proteksi halaman, user info
   ============================================================ */

/**
 * Proteksi halaman — redirect ke login jika belum login
 * Panggil di awal setiap halaman (kecuali index.html)
 */
function requireAuth() {
  const token = localStorage.getItem('token');
  if (!token) {
    window.location.href = 'index.html';
    return false;
  }
  return true;
}

/**
 * Logout — hapus semua data session, redirect ke login
 */
function logout() {
  if (confirm('Yakin ingin keluar dari sistem?')) {
    localStorage.clear();
    window.location.href = 'index.html';
  }
}

/**
 * Tampilkan info user di topbar
 */
function renderUserInfo() {
  const user = JSON.parse(localStorage.getItem('user') || '{}');

  const nameEl = document.getElementById('user-name');
  const roleEl = document.getElementById('user-role');

  if (nameEl) nameEl.textContent = user.nama || '-';
  if (roleEl) {
    roleEl.textContent = user.role
      ? user.role.charAt(0).toUpperCase() + user.role.slice(1)
      : '-';
  }
}

/**
 * Login logic — hanya untuk index.html
 */
function initLoginPage() {
  // Jika sudah login, langsung redirect
  if (localStorage.getItem('token')) {
    window.location.href = 'dashboard.html';
    return;
  }

  const form = document.getElementById('login-form');
  const btnLogin = document.getElementById('btn-login');
  const errorEl = document.getElementById('login-error');
  const pwInput = document.getElementById('input-password');
  const pwToggle = document.getElementById('toggle-password');

  // Toggle show/hide password
  if (pwToggle && pwInput) {
    pwToggle.addEventListener('click', () => {
      const isText = pwInput.type === 'text';
      pwInput.type = isText ? 'password' : 'text';
      pwToggle.textContent = isText ? '👁️' : '🙈';
    });
  }

  if (!form) return;

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (errorEl) errorEl.textContent = '';

    const username = document.getElementById('input-username').value.trim();
    const password = document.getElementById('input-password').value;

    if (!username || !password) {
      if (errorEl) errorEl.textContent = 'Username dan password wajib diisi.';
      return;
    }

    // Loading state
    btnLogin.classList.add('loading');
    btnLogin.disabled = true;
    btnLogin.textContent = 'Memproses...';

    try {
      const res = await API.login({ username, password });

      if (res && res.success) {
        localStorage.setItem('token', res.data.token);
        localStorage.setItem('user', JSON.stringify(res.data.user));

        // Success animation before redirect
        btnLogin.textContent = '✓ Berhasil!';
        btnLogin.style.background = '#16A34A';

        setTimeout(() => {
          window.location.href = 'dashboard.html';
        }, 700);
      } else {
        const msg = res?.message || 'Login gagal. Periksa username dan password.';
        if (errorEl) {
          errorEl.innerHTML = `<span>⚠️</span> ${msg}`;
          errorEl.style.display = 'flex';
        }
        // Shake animation
        form.classList.add('shake');
        setTimeout(() => form.classList.remove('shake'), 500);
      }
    } catch (err) {
      if (errorEl) {
        errorEl.innerHTML = `<span>🔌</span> ${err.message}`;
        errorEl.style.display = 'flex';
      }
    } finally {
      btnLogin.classList.remove('loading');
      btnLogin.disabled = false;
      if (btnLogin.textContent !== '✓ Berhasil!') {
        btnLogin.textContent = 'Masuk →';
      }
    }
  });

  // Activate input hover/focus effects
  const inputs = form.querySelectorAll('input');
  inputs.forEach(input => {
    input.addEventListener('input', () => {
      if (errorEl) {
        errorEl.textContent = '';
        errorEl.style.display = 'none';
      }
    });
  });
}

/**
 * Init mobile sidebar toggle
 */
function initSidebarToggle() {
  const hamburger = document.getElementById('hamburger-btn');
  const sidebar = document.querySelector('.sidebar');
  const overlay = document.querySelector('.sidebar-overlay');

  if (!hamburger || !sidebar) return;

  hamburger.addEventListener('click', () => {
    sidebar.classList.toggle('open');
    if (overlay) overlay.classList.toggle('active');
  });

  if (overlay) {
    overlay.addEventListener('click', () => {
      sidebar.classList.remove('open');
      overlay.classList.remove('active');
    });
  }
}

// Init sidebar on DOM ready
document.addEventListener('DOMContentLoaded', () => {
  renderUserInfo();
  initSidebarToggle();
});