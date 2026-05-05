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
    const initial = nombre.charAt(0).toUpperCase();
    const second  = nombre.split(' ')[1]?.charAt(0).toUpperCase() || '';

    return `
        <nav class="nb-float-bar px-3">
            <div class="d-flex align-items-center justify-content-between h-100 w-100">

                <!-- Toggle móvil -->
                <button class="btn d-lg-none border-0 p-1" id="sidebar-toggle" style="color:#5a5f7d;">
                    <i class="bi bi-list fs-4"></i>
                </button>

                <!-- Saludo izquierda -->
                <div class="d-none d-md-flex align-items-center gap-2">
                    <span class="nb-hello">Bienvenido, </span>
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

            /* Avatar flotante */
            .nb-avatar-wrap {
                position: relative;
                cursor: pointer;
                flex-shrink: 0;
            }
            .nb-avatar-circle {
                width: 40px;
                height: 40px;
                border-radius: 50%;
                background: linear-gradient(135deg, #4e73df 0%, #764ba2 100%);
                display: flex;
                align-items: center;
                justify-content: center;
                border: 2.5px solid #fff;
                box-shadow: 0 2px 10px rgba(118,75,162,0.35);
                transition: box-shadow 0.2s, transform 0.2s;
            }
            .nb-avatar-wrap:hover .nb-avatar-circle {
                box-shadow: 0 4px 16px rgba(118,75,162,0.45);
                transform: scale(1.05);
            }
            .nb-avatar-initials {
                color: #fff;
                font-size: 12px;
                font-weight: 700;
                letter-spacing: 0.5px;
                user-select: none;
            }
            .nb-online-dot {
                position: absolute;
                bottom: 1px;
                right: 1px;
                width: 10px;
                height: 10px;
                background: #2ecc71;
                border-radius: 50%;
                border: 2px solid #fff;
            }

            /* Dropdown */
            .nb-dropdown {
                display: none;
                position: absolute;
                top: calc(100% + 10px);
                right: 0;
                width: 215px;
                background: #fff;
                border: 1px solid #eef0f7;
                border-radius: 14px;
                box-shadow: 0 10px 30px rgba(0,0,0,0.12);
                padding: 12px;
                z-index: 9999;
                animation: nb-drop 0.18s ease;
            }
            .nb-avatar-wrap.open .nb-dropdown { display: block; }

            @keyframes nb-drop {
                from { opacity: 0; transform: translateY(-8px) scale(0.97); }
                to   { opacity: 1; transform: translateY(0) scale(1); }
            }

            .nb-dd-header {
                display: flex;
                align-items: center;
                gap: 10px;
                padding-bottom: 10px;
            }
            .nb-dd-avatar {
                width: 38px; height: 38px;
                border-radius: 10px;
                background: linear-gradient(135deg, #4e73df, #764ba2);
                color: #fff;
                font-size: 12px;
                font-weight: 700;
                display: flex;
                align-items: center;
                justify-content: center;
                flex-shrink: 0;
                letter-spacing: 0.5px;
            }
            .nb-dd-name    { margin: 0; font-size: 0.88rem; font-weight: 600; color: #1a1a2e; }
            .nb-dd-role    { margin: 0; font-size: 0.74rem; color: #8898aa; text-transform: capitalize; }
            .nb-dd-divider { height: 1px; background: #eef0f7; margin: 4px 0 8px; }

            .nb-dd-item {
                width: 100%;
                display: flex;
                align-items: center;
                gap: 8px;
                background: none;
                border: none;
                padding: 8px 10px;
                border-radius: 8px;
                font-size: 0.85rem;
                font-weight: 500;
                cursor: pointer;
                transition: background 0.15s;
                color: #5a5f7d;
            }
            .nb-dd-item:hover         { background: #f4f6fd; }
            .nb-dd-item--danger       { color: #e74a3b; }
            .nb-dd-item--danger:hover { background: #fdf0ef; }
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

    // Toggle dropdown avatar
    const menu = document.getElementById('navbar-user-menu');
    if (menu) {
        menu.addEventListener('click', (e) => {
            e.stopPropagation();
            menu.classList.toggle('open');
        });
        document.addEventListener('click', () => menu.classList.remove('open'));
    }

    
}