import { getUserFromToken, logout } from '../utils/auth.js?v=5';

export function Navbar() {
    const user = getUserFromToken() || { nombre: 'Usuario', rol: 'Usuario' };
    let nombre = user.nombre;
    let rol = user.rol;

    if (!nombre) {
        try {
            const userInfo = JSON.parse(localStorage.getItem('user_info'));
            if (userInfo && userInfo.nombre) nombre = userInfo.nombre;
            if (userInfo && userInfo.rol) rol = userInfo.rol;
        } catch (e) { }
    }

    nombre = nombre || 'Funcionario';
    rol = rol || 'Usuario';
    const displayName = nombre.split(' ')
        .map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
        .join(' ');

    return `
        <nav class="nb-float-bar px-3">
            <div class="d-flex align-items-center justify-content-between h-100 w-100">

                <!-- Toggle móvil -->
                <button class="btn d-lg-none border-0 p-1" id="sidebar-toggle" style="color:#5a5f7d;">
                    <i class="bi bi-list fs-4"></i>
                </button>

                <!-- Saludo izquierda -->
                <div class="d-none d-md-flex align-items-center gap-2">
                    <span class="nb-hello"> 👋 Bienvenido, </span>
                    <span class="nb-username">${displayName.toUpperCase()}</span>
                </div>

                <!-- Derecha -->
                <div class="d-flex align-items-center gap-3 ms-auto">

                    <!-- Fecha -->
                    <div class="d-none d-lg-flex align-items-center gap-2 nb-date-chip">
                        <i class="bi bi-calendar3"></i>
                        <span id="navbar-date"></span>
                    </div>

                </div>
            </div>
        </nav>

        <style>
            /* ── Navbar flotante ─────────────────────────────── */
            .nb-float-bar {
                margin: 12px 16px 0 16px;
                height: 56px;
                background: rgba(255, 255, 255, 0.85);
                backdrop-filter: blur(12px);
                -webkit-backdrop-filter: blur(12px);
                border: 1px solid rgba(255,255,255,0.9);
                border-radius: 16px;
                box-shadow: 0 4px 20px rgba(0,0,0,0.07), 0 1px 4px rgba(0,0,0,0.04);
                display: flex;
                align-items: center;
                position: relative;
                z-index: 200;
            }

            /* Saludo */
            .nb-wave      { font-size: 17px; line-height: 1; }
            .nb-hello     { font-size: 0.88rem; color: #19be3d; font-weight: 600; }
            .nb-username  { font-size: 0.88rem; font-weight: 700; color: #1a1a2e; letter-spacing: 0.3px; }

            /* Fecha */
            .nb-date-chip {
                font-size: 0.78rem;
                color: #8898aa;
                background: #f4f6fd;
                border: 1px solid #e4e9f2;
                border-radius: 8px;
                padding: 4px 10px;
                gap: 5px;
            }
        </style>
    `;
}

export function initNavbarEvents() {
    // Fecha
    const dateEl = document.getElementById('navbar-date');
    if (dateEl) {
        const now = new Date();
        dateEl.textContent = now.toLocaleDateString('es-CO', {
            day: 'numeric', month: 'short', year: 'numeric'
        });
    }
}