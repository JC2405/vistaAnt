import { ProtectedRoute } from '../components/ProtectedRoute.js';
import { Navbar, initNavbarEvents } from '../components/Navbar.js';
import { Sidebar, initSidebarEvents } from '../components/Sidebar.js';
import { Card } from '../components/Card.js';

class DashboardGeneral {
    constructor() {
        new ProtectedRoute();
        this.appContainer = document.getElementById('app');
        this.render();
        initNavbarEvents();
        initSidebarEvents();
    }

    render() {
        const currentPath = window.location.pathname;

        this.appContainer.innerHTML = `
            ${Sidebar(currentPath)}
            
            <div class="main-wrapper transition-all">
                ${Navbar()}
                
                <main class="container-fluid p-4 bg-light flex-grow-1">
                    <div class="row justify-content-center">
                        <div class="col-12 col-md-8 col-lg-6 mt-5 text-center">
                            <i class="bi bi-person-badge fs-1 text-primary mb-3 d-inline-block p-4 bg-primary bg-opacity-10 rounded-circle"></i>
                            <h2 class="fw-bold text-dark">Bienvenido al Sistema</h2>
                            <p class="text-muted fs-5 mb-5">Has iniciado sesión correctamente. Selecciona una opción del menú lateral para comenzar.</p>
                            
                            ${Card({
            title: 'Tu Perfil',
            content: `
                                    <p class="text-muted mb-0">Para ver y editar tus datos personales, dirígete a la sección de perfil en el menú izquierdo.</p>
                                    <button class="btn btn-outline-primary mt-3 w-100">Ver Perfil Completo</button>
                                `
        })}
                        </div>
                    </div>
                </main>
            </div>
        `;
    }
}

document.addEventListener('DOMContentLoaded', () => {
    new DashboardGeneral();
});
