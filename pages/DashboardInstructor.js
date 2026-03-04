import { ProtectedRoute } from '../components/ProtectedRoute.js';
import { Navbar, initNavbarEvents } from '../components/Navbar.js';
import { Sidebar, initSidebarEvents } from '../components/Sidebar.js';
import { Card } from '../components/Card.js';
import { StatWidget } from '../components/StatWidget.js';

class DashboardInstructor {
    constructor() {
        // 1. Proteger ruta
        new ProtectedRoute();

        // 2. Renderizar UI
        this.appContainer = document.getElementById('app');
        this.render();

        // 3. Inicializar eventos
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
                    <div class="d-flex justify-content-between align-items-center mb-4">
                        <h2 class="fw-bold mb-0 text-dark">Mi Panel de Instructor</h2>
                    </div>

                    <!-- Widgets -->
                    <div class="row g-4 mb-4">
                        <div class="col-12 col-md-6 col-lg-3">
                            ${StatWidget({ title: 'Fichas Asignadas', value: '4', icon: 'folder-fill', colorClass: 'primary' })}
                        </div>
                        <div class="col-12 col-md-6 col-lg-3">
                            ${StatWidget({ title: 'Aprendices', value: '120', icon: 'people-fill', colorClass: 'success' })}
                        </div>
                        <div class="col-12 col-md-6 col-lg-3">
                            ${StatWidget({ title: 'Horas esta semana', value: '32', icon: 'clock-fill', colorClass: 'warning' })}
                        </div>
                        <div class="col-12 col-md-6 col-lg-3">
                            ${StatWidget({ title: 'Ambientes', value: '2', icon: 'building', colorClass: 'info' })}
                        </div>
                    </div>

                    <!-- Main Content Row -->
                    <div class="row g-4">
                        <div class="col-12 col-lg-8">
                            ${Card({
            icon: 'calendar-week',
            title: 'Próximas Clases',
            content: `
                                    <div class="table-responsive">
                                        <table class="table table-hover align-middle">
                                            <thead>
                                                <tr>
                                                    <th>Hora</th>
                                                    <th>Ficha</th>
                                                    <th>Ambiente</th>
                                                    <th>Estado</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                <tr>
                                                    <td>08:00 AM - 10:00 AM</td>
                                                    <td><strong>2701234</strong><br><small class="text-muted">Desarrollo de Software</small></td>
                                                    <td>Sistemas 101</td>
                                                    <td><span class="badge bg-success">Activa</span></td>
                                                </tr>
                                                <tr>
                                                    <td>10:30 AM - 12:30 PM</td>
                                                    <td><strong>2701235</strong><br><small class="text-muted">Diseño Multimedia</small></td>
                                                    <td>Sistemas 102</td>
                                                    <td><span class="badge bg-secondary">Programada</span></td>
                                                </tr>
                                            </tbody>
                                        </table>
                                    </div>
                                `
        })}
                        </div>
                        <div class="col-12 col-lg-4">
                            ${Card({
            icon: 'bell-fill',
            title: 'Avisos',
            content: `
                                    <div class="alert alert-info border-0 bg-info bg-opacity-10 text-info">
                                        <i class="bi bi-info-circle-fill me-2"></i>
                                        Recuerda registrar asistencia de la ficha 2701234.
                                    </div>
                                    <div class="alert alert-warning border-0 bg-warning bg-opacity-10 text-warning">
                                        <i class="bi bi-exclamation-triangle-fill me-2"></i>
                                        Reunión de área mañana a las 2:00 PM.
                                    </div>
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
    new DashboardInstructor();
});
