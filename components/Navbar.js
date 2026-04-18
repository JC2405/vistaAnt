import { getUserFromToken, logout } from '../utils/auth.js?v=5';

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
