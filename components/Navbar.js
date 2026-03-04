import { getUserFromToken, logout } from '../utils/auth.js';

/**
 * Genera el Navbar superior — estilo "Hola! NOMBRE" con avatar
 */
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
    const displayName = nombre.toUpperCase();
    const initial = nombre.charAt(0).toUpperCase();

    return `
        <nav class="navbar navbar-expand-lg dashboard-navbar px-4 py-2">
            <div class="container-fluid d-flex justify-content-between align-items-center">
                <!-- Toggle para el sidebar en móviles -->
                <button class="btn btn-light d-lg-none me-2 border-0" id="sidebar-toggle">
                    <i class="bi bi-list fs-4"></i>
                </button>
                
                <div class="d-none d-md-block">
                    <span style="color: var(--text-muted); font-size: 0.9rem;">Hola!</span>
                    <span class="fw-bold ms-1" style="color: var(--text-dark); font-size: 0.95rem;">${displayName}</span>
                </div>
                
                <div class="d-flex align-items-center gap-3 ms-auto">
                    <button class="btn btn-light border-0 position-relative" title="Notificaciones" style="color: var(--text-muted);">
                        <i class="bi bi-bell fs-5"></i>
                    </button>
                    
                    <div class="avatar-circle">${initial}</div>
                    
                    <button class="btn btn-light btn-sm border-0 d-flex align-items-center gap-2" id="btn-logout" style="color: var(--text-muted);">
                        <i class="bi bi-box-arrow-right"></i>
                        <span class="d-none d-md-inline">Salir</span>
                    </button>
                </div>
            </div>
        </nav>
    `;
}

/**
 * Función para inicializar los eventos del navbar
 */
export function initNavbarEvents() {
    const btnLogout = document.getElementById('btn-logout');
    if (btnLogout) {
        btnLogout.addEventListener('click', () => {
            logout();
        });
    }
}
