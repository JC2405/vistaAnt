import { ProtectedRoute } from '../components/ProtectedRoute.js';
import { Navbar, initNavbarEvents } from '../components/Navbar.js';
import { Sidebar, initSidebarEvents } from '../components/Sidebar.js';
import { Card } from '../components/Card.js';
import { StatWidget } from '../components/StatWidget.js';

class DashboardCoordinador {
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
                    <div class="d-flex justify-content-between align-items-center mb-4">
                        <h2 class="fw-bold mb-0 text-dark">Vista General: Coordinación</h2>
                        <button class="btn btn-primary d-flex align-items-center gap-2">
                            <i class="bi bi-plus-lg"></i>
                            <span class="d-none d-sm-inline">Nueva Ficha</span>
                        </button>
                    </div>

                    <!-- Widgets -->
                    <div class="row g-4 mb-4">
                        <div class="col-12 col-md-6 col-lg-3">
                            ${StatWidget({ title: 'Total Fichas Activas', value: '45', icon: 'folder-check', colorClass: 'success' })}
                        </div>
                        <div class="col-12 col-md-6 col-lg-3">
                            ${StatWidget({ title: 'Instructores', value: '28', icon: 'person-video3', colorClass: 'primary' })}
                        </div>
                        <div class="col-12 col-md-6 col-lg-3">
                            ${StatWidget({ title: 'Aprendices Matriculados', value: '1,250', icon: 'mortarboard', colorClass: 'info' })}
                        </div>
                        <div class="col-12 col-md-6 col-lg-3">
                            ${StatWidget({ title: 'Ambientes Libres', value: '5', icon: 'door-open', colorClass: 'warning' })}
                        </div>
                    </div>

                    <div class="row g-4">
                        <div class="col-12">
                            ${Card({
            icon: 'activity',
            title: 'Gestión Rápida de Horarios',
            content: `
                                    <div class="row mt-2">
                                        <div class="col-md-4 mb-3">
                                            <div class="p-3 border rounded bg-light hover-shadow cursor-pointer transition-all">
                                                <h6 class="fw-bold text-primary"><i class="bi bi-calendar-check me-2"></i>Asignar Horarios</h6>
                                                <p class="text-muted small mb-0">Cruzar fichas, ambientes e instructores.</p>
                                            </div>
                                        </div>
                                        <div class="col-md-4 mb-3">
                                            <div class="p-3 border rounded bg-light hover-shadow cursor-pointer transition-all">
                                                <h6 class="fw-bold text-danger"><i class="bi bi-calendar-x me-2"></i>Gestionar Excepciones</h6>
                                                <p class="text-muted small mb-0">Novedades y reemplazos de instructores.</p>
                                            </div>
                                        </div>
                                        <div class="col-md-4 mb-3">
                                            <div class="p-3 border rounded bg-light hover-shadow cursor-pointer transition-all">
                                                <h6 class="fw-bold text-success"><i class="bi bi-file-earmark-bar-graph me-2"></i>Reportes</h6>
                                                <p class="text-muted small mb-0">Exportar sabanas de horarios y ambientes.</p>
                                            </div>
                                        </div>
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
    new DashboardCoordinador();
});
