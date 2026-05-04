import { ProtectedRoute } from '../components/ProtectedRoute.js';
import { Navbar, initNavbarEvents } from '../components/Navbar.js';
import { Sidebar, initSidebarEvents } from '../components/Sidebar.js';
import { footer } from '../components/footer.js';
import { apiFetch } from '../utils/api.js?v=5';

class DashboardCoordinador {
    constructor() {
        new ProtectedRoute();
        this.appContainer = document.getElementById('app');
        this.render();
        initNavbarEvents();
        initSidebarEvents();
        this.fetchDashboardData();
    }

    async fetchDashboardData() {
        try {
            const [
                fichas, instructores, aprendices,
                ambientes, horarios
            ] = await Promise.all([
                apiFetch('/dashboard/fichas/activas').catch(e => { console.error('[Dashboard] Error fichas/activas:', e); return null; }),
                apiFetch('/dashboard/instructores/count').catch(e => { console.error('[Dashboard] Error instructores/count:', e); return null; }),
                apiFetch('/dashboard/aprendices/matriculados').catch(e => { console.error('[Dashboard] Error aprendices/matriculados:', e); return null; }),
                apiFetch('/dashboard/ambientes/libres').catch(e => { console.error('[Dashboard] Error ambientes/libres:', e); return null; }),
                apiFetch('/dashboard/horarios/metrics').catch(e => { console.error('[Dashboard] Error horarios/metrics:', e); return null; })
            ]);

            // horarios/metrics viene envuelto en { ok, data: { ... } }
            const hData = horarios?.data ?? horarios ?? {};

            const metrics = {
                fichas_activas:          fichas?.count          ?? 0,
                instructores:            instructores?.count    ?? 0,
                aprendices_matriculados: aprendices?.count      ?? 0,
                ambientes_libres:        ambientes?.count       ?? 0,
                clases_del_dia:          hData?.clases_del_dia   ?? 0,
                horarios_activos:        hData?.horarios_activos ?? 0,
            };

            this.updateMetrics(metrics);
            this.updateStatusPanel(metrics);

        } catch (error) {
            console.error('[Dashboard] Error general en fetchDashboardData:', error);
            const zeros = { fichas_activas:0, instructores:0, aprendices_matriculados:0,
                            ambientes_libres:0, clases_del_dia:0, horarios_activos:0 };
            this.updateMetrics(zeros);
            this.updateStatusPanel(zeros);
        }
    }

    updateMetrics(metrics) {
        const updateText = (id, text) => {
            const el = document.getElementById(id);
            if (el) {
                el.innerText = text;
                el.style.opacity = '0';
                requestAnimationFrame(() => {
                    el.style.transition = 'opacity 0.5s ease';
                    el.style.opacity = '1';
                });
            }
        };

        updateText('metric-fichas', metrics.fichas_activas);
        updateText('metric-instructores', metrics.instructores);
        updateText('metric-aprendices', metrics.aprendices_matriculados);
        updateText('metric-ambientes', metrics.ambientes_libres);
        updateText('metric-clases-dia', metrics.clases_del_dia);
        updateText('metric-horarios-activos', metrics.horarios_activos);
    }

    updateStatusPanel(metrics) {
        // Barra de progreso animada para "ocupación"
        const totalAmbientes = metrics.ambientes_libres + (metrics.horarios_activos > 0 ? metrics.horarios_activos : 0);
        const ocupacionPct = totalAmbientes > 0 ? Math.round(((totalAmbientes - metrics.ambientes_libres) / totalAmbientes) * 100) : 0;

        const barOcupacion = document.getElementById('bar-ocupacion');
        const lblOcupacion = document.getElementById('lbl-ocupacion');
        if (barOcupacion) {
            setTimeout(() => { barOcupacion.style.width = `${ocupacionPct}%`; }, 300);
        }
        if (lblOcupacion) lblOcupacion.textContent = `${ocupacionPct}%`;

        // Indicador de fichas
        const barFichas = document.getElementById('bar-fichas');
        const lblFichas = document.getElementById('lbl-fichas');
        const fichasPct = Math.min(metrics.fichas_activas * 10, 100); // escala visual
        if (barFichas) {
            setTimeout(() => { barFichas.style.width = `${fichasPct}%`; }, 400);
        }
        if (lblFichas) lblFichas.textContent = `${metrics.fichas_activas} activas`;

        // Indicador de instructores
        const barInstructores = document.getElementById('bar-instructores');
        const lblInstructores = document.getElementById('lbl-instructores');
        const instrPct = Math.min(metrics.instructores * 8, 100);
        if (barInstructores) {
            setTimeout(() => { barInstructores.style.width = `${instrPct}%`; }, 500);
        }
        if (lblInstructores) lblInstructores.textContent = `${metrics.instructores} registrados`;

        // Estado general
        const statusDot = document.getElementById('status-dot');
        const statusText = document.getElementById('status-text');
        if (statusDot && statusText) {
            if (metrics.horarios_activos > 0) {
                statusDot.className = 'status-dot status-dot--active';
                statusText.textContent = 'Sistema operativo — Hay horarios activos';
            } else {
                statusDot.className = 'status-dot status-dot--idle';
                statusText.textContent = 'Sin actividad — No hay horarios configurados';
            }
        }
    }

    render() {
        const currentPath = window.location.pathname;
        const today = new Date();
        const dateStr = today.toLocaleDateString('es-CO', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

        this.appContainer.innerHTML = `
            ${Sidebar(currentPath)}
            
            <div class="main-wrapper transition-all" style="min-height: 100vh; background: linear-gradient(135deg, #f5f7fa 0%, #e4e9f2 100%);">
                ${Navbar()}
                
                <main class="container-fluid p-4 border-0 flex-grow-1" style="max-width: 1400px; margin: 0 auto;">
                    
                    <!-- Header -->
                    <div class="d-flex justify-content-between align-items-center mb-4">
                        <div>
                            <h2 class="fw-bold mb-1" style="letter-spacing: -0.5px; color: #1a1a2e;">Vista General</h2>
                            <p class="mb-0" style="color: #6c757d; font-size: 0.95rem;">
                                <i class="bi bi-calendar3 me-1"></i> ${dateStr.charAt(0).toUpperCase() + dateStr.slice(1)}
                            </p>
                        </div>
                        <button class="btn d-flex align-items-center gap-2 shadow-sm dash-refresh-btn" onclick="window.location.reload()">
                            <i class="bi bi-arrow-clockwise"></i> Actualizar
                        </button>
                    </div>

                    <!-- Métricas Principales (4 cards) -->
                    <div class="row g-3 mb-4">
                        <div class="col-6 col-lg-3">
                            <div class="dash-card dash-card--primary">
                                <div class="dash-card__icon"><i class="bi bi-folder-check"></i></div>
                                <div class="dash-card__body">
                                    <span class="dash-card__label">Fichas Activas</span>
                                    <span class="dash-card__value" id="metric-fichas">...</span>
                                </div>
                            </div>
                        </div>
                        <div class="col-6 col-lg-3">
                            <div class="dash-card dash-card--success">
                                <div class="dash-card__icon"><i class="bi bi-person-video3"></i></div>
                                <div class="dash-card__body">
                                    <span class="dash-card__label">Instructores</span>
                                    <span class="dash-card__value" id="metric-instructores">...</span>
                                </div>
                            </div>
                        </div>
                        <div class="col-6 col-lg-3">
                            <div class="dash-card dash-card--info">
                                <div class="dash-card__icon"><i class="bi bi-mortarboard"></i></div>
                                <div class="dash-card__body">
                                    <span class="dash-card__label">Aprendices</span>
                                    <span class="dash-card__value" id="metric-aprendices">...</span>
                                </div>
                            </div>
                        </div>
                        <div class="col-6 col-lg-3">
                            <div class="dash-card dash-card--warning">
                                <div class="dash-card__icon"><i class="bi bi-door-open"></i></div>
                                <div class="dash-card__body">
                                    <span class="dash-card__label">Ambientes Libres</span>
                                    <span class="dash-card__value" id="metric-ambientes">...</span>
                                </div>
                            </div>
                        </div>
                    </div>
                    <!-- Panel de Estado + Accesos Rápidos -->
                    <div class="row g-3 mb-4">
                        <!-- Panel de Progreso -->
                        <div class="col-12 col-lg-5">
                            <div class="card border-0 shadow-sm h-100" style="border-radius: 16px;">
                                <div class="card-body p-4">
                                    <h6 class="fw-bold text-dark mb-4">
                                        <i class="bi bi-bar-chart-line me-2 text-primary"></i>Resumen de Recursos
                                    </h6>
                                    
                                    <div class="mb-4">
                                        <div class="d-flex justify-content-between align-items-center mb-2">
                                            <span class="text-secondary" style="font-size: 0.85rem;">Ocupación de Ambientes</span>
                                            <span class="fw-semibold text-dark" style="font-size: 0.85rem;" id="lbl-ocupacion">0%</span>
                                        </div>
                                        <div class="dash-progress">
                                            <div class="dash-progress__bar dash-progress__bar--purple" id="bar-ocupacion" style="width: 0%"></div>
                                        </div>
                                    </div>

                                    <div class="mb-4">
                                        <div class="d-flex justify-content-between align-items-center mb-2">
                                            <span class="text-secondary" style="font-size: 0.85rem;">Fichas en el Sistema</span>
                                            <span class="fw-semibold text-dark" style="font-size: 0.85rem;" id="lbl-fichas">0</span>
                                        </div>
                                        <div class="dash-progress">
                                            <div class="dash-progress__bar dash-progress__bar--blue" id="bar-fichas" style="width: 0%"></div>
                                        </div>
                                    </div>

                                    <div class="mb-2">
                                        <div class="d-flex justify-content-between align-items-center mb-2">
                                            <span class="text-secondary" style="font-size: 0.85rem;">Instructores Registrados</span>
                                            <span class="fw-semibold text-dark" style="font-size: 0.85rem;" id="lbl-instructores">0</span>
                                        </div>
                                        <div class="dash-progress">
                                            <div class="dash-progress__bar dash-progress__bar--green" id="bar-instructores" style="width: 0%"></div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <!-- Accesos Rápidos -->
                        <div class="col-12 col-lg-7">
                            <div class="card border-0 shadow-sm h-100" style="border-radius: 16px;">
                                <div class="card-body p-4">
                                    <h6 class="fw-bold text-dark mb-4">
                                        <i class="bi bi-lightning-charge me-2 text-warning"></i>Accesos Rápidos
                                    </h6>
                                    <div class="row g-3">
                                        <div class="col-6 col-md-4">
                                            <a href="horario-titulada.html" class="dash-shortcut dash-shortcut--blue">
                                                <i class="bi bi-calendar-check"></i>
                                                <span>Horario Titulada</span>
                                            </a>
                                        </div>
                                        <div class="col-6 col-md-4">
                                            <a href="horario-formativa.html" class="dash-shortcut dash-shortcut--purple">
                                                <i class="bi bi-calendar-event"></i>
                                                <span>Horario Transversales</span>
                                            </a>
                                        </div>
                                        <div class="col-6 col-md-4">
                                            <a href="fichas.html" class="dash-shortcut dash-shortcut--green">
                                                <i class="bi bi-folder2-open"></i>
                                                <span>Fichas</span>
                                            </a>
                                        </div>
                                        <div class="col-6 col-md-4">
                                            <a href="funcionarios.html" class="dash-shortcut dash-shortcut--orange">
                                                <i class="bi bi-person-badge"></i>
                                                <span>Instructores</span>
                                            </a>
                                        </div>
                                        <div class="col-6 col-md-4">
                                            <a href="programas.html" class="dash-shortcut dash-shortcut--teal">
                                                <i class="bi bi-book-half"></i>
                                                <span>Programas</span>
                                            </a>
                                        </div>
                                        <div class="col-6 col-md-4">
                                            <a href="tipos-programas.html" class="dash-shortcut dash-shortcut--pink">
                                                <i class="bi bi-journals"></i>
                                                <span>Tipo Programas</span>
                                            </a>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                </main>
                ${footer()}
            </div>
            
            <style>
                /* ── Metric Cards ───────────────────────────── */
                .dash-card {
                    background: #fff;
                    border-radius: 16px;
                    padding: 1.25rem;
                    display: flex;
                    align-items: center;
                    gap: 1rem;
                    box-shadow: 0 2px 12px rgba(0,0,0,0.04);
                    transition: transform 0.25s ease, box-shadow 0.25s ease;
                    height: 100%;
                }
                .dash-card:hover {
                    transform: translateY(-4px);
                    box-shadow: 0 8px 24px rgba(0,0,0,0.08);
                }
                .dash-card__icon {
                    width: 52px; height: 52px;
                    border-radius: 14px;
                    display: flex; align-items: center; justify-content: center;
                    font-size: 1.4rem;
                    flex-shrink: 0;
                }
                .dash-card--primary .dash-card__icon { background: #e8f0fe; color: #4e73df; }
                .dash-card--success .dash-card__icon { background: #e6f9f0; color: #1cc88a; }
                .dash-card--info    .dash-card__icon { background: #e3f6fc; color: #36b9cc; }
                .dash-card--warning .dash-card__icon { background: #fff8e1; color: #f6c23e; }
                .dash-card__body { display: flex; flex-direction: column; min-width: 0; }
                .dash-card__label {
                    font-size: 0.75rem;
                    font-weight: 600;
                    text-transform: uppercase;
                    letter-spacing: 0.5px;
                    color: #8898aa;
                    margin-bottom: 2px;
                }
                .dash-card__value {
                    font-size: 1.9rem;
                    font-weight: 800;
                    color: #1a1a2e;
                    line-height: 1.1;
                }

                /* ── Highlight Cards (gradient) ─────────────── */
                .dash-highlight-card {
                    border-radius: 16px;
                    padding: 1.5rem;
                    display: flex;
                    align-items: center;
                    gap: 1rem;
                    color: #fff;
                    box-shadow: 0 4px 15px rgba(0,0,0,0.12);
                    transition: transform 0.25s ease, box-shadow 0.25s ease;
                    height: 100%;
                    min-height: 110px;
                }
                .dash-highlight-card:hover {
                    transform: translateY(-4px) scale(1.01);
                    box-shadow: 0 8px 30px rgba(0,0,0,0.18);
                }
                .dash-highlight-card__icon {
                    width: 54px; height: 54px;
                    border-radius: 14px;
                    background: rgba(255,255,255,0.2);
                    backdrop-filter: blur(10px);
                    display: flex; align-items: center; justify-content: center;
                    font-size: 1.5rem;
                    flex-shrink: 0;
                }
                .dash-highlight-card__label {
                    display: block;
                    font-size: 0.78rem;
                    font-weight: 600;
                    text-transform: uppercase;
                    letter-spacing: 0.5px;
                    opacity: 0.85;
                }
                .dash-highlight-card__value {
                    font-size: 2rem;
                    font-weight: 800;
                    line-height: 1.1;
                }

                /* ── Status Dot ─────────────────────────────── */
                .status-dot {
                    width: 14px; height: 14px;
                    border-radius: 50%;
                    flex-shrink: 0;
                    position: relative;
                }
                .status-dot::after {
                    content: '';
                    position: absolute;
                    top: -3px; left: -3px;
                    width: 20px; height: 20px;
                    border-radius: 50%;
                    animation: pulse-ring 2s ease infinite;
                }
                .status-dot--active { background: #2ecc71; }
                .status-dot--active::after { border: 2px solid rgba(46,204,113,0.4); }
                .status-dot--idle { background: #f39c12; }
                .status-dot--idle::after { border: 2px solid rgba(243,156,18,0.3); }
                @keyframes pulse-ring {
                    0% { transform: scale(1); opacity: 1; }
                    50% { transform: scale(1.4); opacity: 0; }
                    100% { transform: scale(1); opacity: 0; }
                }

                /* ── Progress Bars ──────────────────────────── */
                .dash-progress {
                    height: 8px;
                    background: #f0f2f5;
                    border-radius: 10px;
                    overflow: hidden;
                }
                .dash-progress__bar {
                    height: 100%;
                    border-radius: 10px;
                    transition: width 1s cubic-bezier(0.4, 0, 0.2, 1);
                }
                .dash-progress__bar--purple { background: linear-gradient(90deg, #667eea, #764ba2); }
                .dash-progress__bar--blue   { background: linear-gradient(90deg, #4facfe, #00f2fe); }
                .dash-progress__bar--green  { background: linear-gradient(90deg, #43e97b, #38f9d7); }

                /* ── Shortcut Cards ─────────────────────────── */
                .dash-shortcut {
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    justify-content: center;
                    gap: 0.5rem;
                    padding: 1.1rem 0.75rem;
                    border-radius: 14px;
                    text-decoration: none;
                    font-size: 0.82rem;
                    font-weight: 600;
                    transition: all 0.25s ease;
                    text-align: center;
                }
                .dash-shortcut i { font-size: 1.5rem; }
                .dash-shortcut:hover {
                    transform: translateY(-3px);
                    box-shadow: 0 6px 18px rgba(0,0,0,0.1);
                }
                .dash-shortcut--blue   { background: #e8f0fe; color: #4e73df; }
                .dash-shortcut--blue:hover   { background: #4e73df; color: #fff; }
                .dash-shortcut--purple { background: #f0e6ff; color: #764ba2; }
                .dash-shortcut--purple:hover { background: #764ba2; color: #fff; }
                .dash-shortcut--green  { background: #e6f9f0; color: #1cc88a; }
                .dash-shortcut--green:hover  { background: #1cc88a; color: #fff; }
                .dash-shortcut--orange { background: #fff3e0; color: #e67e22; }
                .dash-shortcut--orange:hover { background: #e67e22; color: #fff; }
                .dash-shortcut--teal   { background: #e0f7fa; color: #00897b; }
                .dash-shortcut--teal:hover   { background: #00897b; color: #fff; }
                .dash-shortcut--pink   { background: #fce4ec; color: #e91e63; }
                .dash-shortcut--pink:hover   { background: #e91e63; color: #fff; }

                /* ── Refresh Button ─────────────────────────── */
                .dash-refresh-btn {
                    background: #fff;
                    color: #4e73df;
                    border: 1px solid #e0e4ea;
                    border-radius: 10px;
                    padding: 0.5rem 1.2rem;
                    font-weight: 600;
                    font-size: 0.9rem;
                    transition: all 0.2s ease;
                }
                .dash-refresh-btn:hover {
                    background: #4e73df;
                    color: #fff;
                    border-color: #4e73df;
                }
            </style>
        `;
    }
}

document.addEventListener('DOMContentLoaded', () => {
    new DashboardCoordinador();
});
