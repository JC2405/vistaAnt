import { ProtectedRoute } from '../components/ProtectedRoute.js';
import { Navbar, initNavbarEvents } from '../components/Navbar.js';
import { Sidebar, initSidebarEvents } from '../components/Sidebar.js';
import { footer } from '../components/footer.js';
import { apiFetch, getDashboardCharts } from '../utils/api.js?v=5';

class DashboardCoordinador {
    constructor() {
        new ProtectedRoute();
        this.appContainer = document.getElementById('app');
        this._chartMeses  = null;
        this._chartFichas = null;
        this.render();
        initNavbarEvents();
        initSidebarEvents();
        this.loadChartJS().then(() => {
            this.fetchDashboardData();
            this.fetchCharts();
        });
    }

    // ── Carga Chart.js dinámicamente ────────────────────────────────
    loadChartJS() {
        if (window.Chart) return Promise.resolve();
        return new Promise((resolve, reject) => {
            const s = document.createElement('script');
            s.src = 'https://cdnjs.cloudflare.com/ajax/libs/Chart.js/4.4.1/chart.umd.js';
            s.onload  = resolve;
            s.onerror = reject;
            document.head.appendChild(s);
        });
    }

    // ── Métricas principales ─────────────────────────────────────────
    async fetchDashboardData() {
        try {
            const [fichas, instructores, aprendices, ambientes, horarios] = await Promise.all([
                apiFetch('/dashboard/fichas/activas').catch(e => { console.error('[Dashboard] fichas/activas:', e); return null; }),
                apiFetch('/dashboard/instructores/count').catch(e => { console.error('[Dashboard] instructores/count:', e); return null; }),
                apiFetch('/dashboard/aprendices/matriculados').catch(e => { console.error('[Dashboard] aprendices/matriculados:', e); return null; }),
                apiFetch('/dashboard/ambientes/libres').catch(e => { console.error('[Dashboard] ambientes/libres:', e); return null; }),
                apiFetch('/dashboard/horarios/metrics').catch(e => { console.error('[Dashboard] horarios/metrics:', e); return null; }),
            ]);

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
            console.error('[Dashboard] Error general:', error);
            const zeros = { fichas_activas:0, instructores:0, aprendices_matriculados:0,
                            ambientes_libres:0, clases_del_dia:0, horarios_activos:0 };
            this.updateMetrics(zeros);
            this.updateStatusPanel(zeros);
        }
    }

    // ── Gráficas ─────────────────────────────────────────────────────
    async fetchCharts(anio = new Date().getFullYear()) {
    try {
        const res  = await getDashboardCharts(anio);
        const data = res?.data ?? res ?? {};

        this.renderChartMeses(data.horarios_por_mes    ?? [], anio);
        this.renderChartFichas(data.fichas_con_horario ?? 0, data.fichas_sin_horario ?? 0);

        // Solo poblar el selector la PRIMERA vez (cuando no tiene listener)
        const sel = document.getElementById('select-anio');
        if (sel && !sel._listenerRegistrado) {
            this.poblarSelectorAnios(data.anios_disponibles ?? [anio]);
        }

        // Sincronizar visualmente el valor seleccionado
        if (sel) sel.value = String(anio);

    } catch (e) {
        console.error('[Dashboard] Error charts:', e);
        this.renderChartMeses(Array(12).fill(0), anio);
        this.renderChartFichas(0, 0);
    }
}

poblarSelectorAnios(anios) {
    const sel = document.getElementById('select-anio');
    if (!sel || sel._listenerRegistrado) return;

    const anioActual = new Date().getFullYear();
    const lista = [...new Set([anioActual, ...anios])].sort((a, b) => b - a);

    sel.innerHTML = lista
        .map(a => `<option value="${a}">${a}</option>`)   // ← sin 'selected' hardcodeado
        .join('');

    sel.value = String(anioActual);  // valor inicial

    sel.addEventListener('change', (e) => {
        this.fetchCharts(parseInt(e.target.value));
    });

    sel._listenerRegistrado = true;
}

    renderChartMeses(datos, anio) {
        const ctx = document.getElementById('chart-meses');
        if (!ctx) return;

        if (this._chartMeses) { this._chartMeses.destroy(); this._chartMeses = null; }

        const valores = datos.length === 12 ? datos : Array(12).fill(0);

        this._chartMeses = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'],
                datasets: [{
                    label: `Horarios ${anio}`,
                    data: valores,
                    backgroundColor: 'rgba(78,115,223,0.15)',
                    borderColor: '#4e73df',
                    borderWidth: 2,
                    borderRadius: 6,
                    borderSkipped: false,
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: { legend: { display: false } },
                scales: {
                    x: {
                        grid: { display: false },
                        ticks: { color: '#8898aa', font: { size: 11 } }
                    },
                    y: {
                        beginAtZero: true,
                        grid: { color: 'rgba(0,0,0,0.05)' },
                        ticks: {
                            color: '#8898aa',
                            font: { size: 11 },
                            stepSize: 1,
                            callback: v => Number.isInteger(v) ? v : null
                        }
                    }
                }
            }
        });
    }

    renderChartFichas(con, sin) {
        const ctx = document.getElementById('chart-fichas');
        if (!ctx) return;

        if (this._chartFichas) { this._chartFichas.destroy(); this._chartFichas = null; }

        const lblCon = document.getElementById('lbl-con-horario');
        const lblSin = document.getElementById('lbl-sin-horario');
        if (lblCon) lblCon.textContent = con;
        if (lblSin) lblSin.textContent = sin;

        // Si ambos son 0 mostramos un placeholder gris
        const tieneDatos = con > 0 || sin > 0;

        this._chartFichas = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: ['Con horario', 'Sin horario'],
                datasets: [{
                    data: tieneDatos ? [con, sin] : [1, 0],
                    backgroundColor: tieneDatos ? ['#4e73df', '#e0e4ea'] : ['#e0e4ea', '#e0e4ea'],
                    borderWidth: 0,
                    hoverOffset: tieneDatos ? 6 : 0,
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                cutout: '72%',
                plugins: { legend: { display: false } }
            }
        });
    }

    // ── Actualizar contadores ────────────────────────────────────────
    updateMetrics(metrics) {
        const fade = (id, text) => {
            const el = document.getElementById(id);
            if (!el) return;
            el.innerText = text;
            el.style.opacity = '0';
            requestAnimationFrame(() => {
                el.style.transition = 'opacity 0.5s ease';
                el.style.opacity = '1';
            });
        };

        fade('metric-fichas',      metrics.fichas_activas);
        fade('metric-instructores', metrics.instructores);
        fade('metric-aprendices',  metrics.aprendices_matriculados);
        fade('metric-ambientes',   metrics.ambientes_libres);
        fade('metric-clases-dia',  metrics.clases_del_dia);
        fade('metric-horarios-activos', metrics.horarios_activos);
    }

    updateStatusPanel(metrics) {
        const totalAmbientes = metrics.ambientes_libres + (metrics.horarios_activos > 0 ? metrics.horarios_activos : 0);
        const ocupacionPct   = totalAmbientes > 0
            ? Math.round(((totalAmbientes - metrics.ambientes_libres) / totalAmbientes) * 100)
            : 0;

        const set = (id, val) => { const el = document.getElementById(id); if (el) el.style.width = `${val}%`; };
        const txt = (id, val) => { const el = document.getElementById(id); if (el) el.textContent = val; };

        setTimeout(() => set('bar-ocupacion',   ocupacionPct), 300);
        setTimeout(() => set('bar-fichas',      Math.min(metrics.fichas_activas * 10, 100)), 400);
        setTimeout(() => set('bar-instructores', Math.min(metrics.instructores * 8, 100)), 500);

        txt('lbl-ocupacion',   `${ocupacionPct}%`);
        txt('lbl-fichas',      `${metrics.fichas_activas} activas`);
        txt('lbl-instructores', `${metrics.instructores} registrados`);

        const dot  = document.getElementById('status-dot');
        const stxt = document.getElementById('status-text');
        if (dot && stxt) {
            if (metrics.horarios_activos > 0) {
                dot.className  = 'status-dot status-dot--active';
                stxt.textContent = 'Sistema operativo — Hay horarios activos';
            } else {
                dot.className  = 'status-dot status-dot--idle';
                stxt.textContent = 'Sin actividad — No hay horarios configurados';
            }
        }
    }

    // ── HTML ─────────────────────────────────────────────────────────
    render() {
        const currentPath = window.location.pathname;
        const today   = new Date();
        const dateStr = today.toLocaleDateString('es-CO', { weekday:'long', year:'numeric', month:'long', day:'numeric' });
        const anio    = today.getFullYear();

        this.appContainer.innerHTML = `
            ${Sidebar(currentPath)}

            <div class="main-wrapper transition-all" style="min-height:100vh; background:linear-gradient(135deg,#f5f7fa 0%,#e4e9f2 100%);">
                ${Navbar()}

                <main class="container-fluid p-4 border-0 flex-grow-1" style="max-width:1400px; margin:0 auto;">

                    <!-- Header -->
                    <div class="d-flex justify-content-between align-items-center mb-4">
                        <div>
                            <h2 class="fw-bold mb-1" style="letter-spacing:-0.5px; color:#1a1a2e;">Vista General</h2>
                            <p class="mb-0" style="color:#6c757d; font-size:0.95rem;">
                                <i class="bi bi-calendar3 me-1"></i>
                                ${dateStr.charAt(0).toUpperCase() + dateStr.slice(1)}
                            </p>
                        </div>
                        <button class="btn d-flex align-items-center gap-2 shadow-sm dash-refresh-btn"
                                onclick="window.location.reload()">
                            <i class="bi bi-arrow-clockwise"></i> Actualizar
                        </button>
                    </div>

                    <!-- Métricas principales -->
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
                        <div class="col-12 col-lg-5">
                            <div class="card border-0 shadow-sm h-100" style="border-radius:16px;">
                                <div class="card-body p-4">
                                    <h6 class="fw-bold text-dark mb-4">
                                        <i class="bi bi-bar-chart-line me-2 text-primary"></i>Resumen de Recursos
                                    </h6>
                                    <div class="mb-4">
                                        <div class="d-flex justify-content-between align-items-center mb-2">
                                            <span class="text-secondary" style="font-size:0.85rem;">Ocupación de Ambientes</span>
                                            <span class="fw-semibold text-dark" style="font-size:0.85rem;" id="lbl-ocupacion">0%</span>
                                        </div>
                                        <div class="dash-progress">
                                            <div class="dash-progress__bar dash-progress__bar--purple" id="bar-ocupacion" style="width:0%"></div>
                                        </div>
                                    </div>
                                    <div class="mb-4">
                                        <div class="d-flex justify-content-between align-items-center mb-2">
                                            <span class="text-secondary" style="font-size:0.85rem;">Fichas en el Sistema</span>
                                            <span class="fw-semibold text-dark" style="font-size:0.85rem;" id="lbl-fichas">0</span>
                                        </div>
                                        <div class="dash-progress">
                                            <div class="dash-progress__bar dash-progress__bar--blue" id="bar-fichas" style="width:0%"></div>
                                        </div>
                                    </div>
                                    <div class="mb-2">
                                        <div class="d-flex justify-content-between align-items-center mb-2">
                                            <span class="text-secondary" style="font-size:0.85rem;">Instructores Registrados</span>
                                            <span class="fw-semibold text-dark" style="font-size:0.85rem;" id="lbl-instructores">0</span>
                                        </div>
                                        <div class="dash-progress">
                                            <div class="dash-progress__bar dash-progress__bar--green" id="bar-instructores" style="width:0%"></div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div class="col-12 col-lg-7">
                            <div class="card border-0 shadow-sm h-100" style="border-radius:16px;">
                                <div class="card-body p-4">
                                    <h6 class="fw-bold text-dark mb-4">
                                        <i class="bi bi-lightning-charge me-2 text-warning"></i>Accesos Rápidos
                                    </h6>
                                    <div class="row g-3">
                                        <div class="col-6 col-md-4">
                                            <a href="horario-titulada.html" class="dash-shortcut dash-shortcut--blue">
                                                <i class="bi bi-calendar-check"></i><span>Horario Titulada</span>
                                            </a>
                                        </div>
                                        <div class="col-6 col-md-4">
                                            <a href="horario-formativa.html" class="dash-shortcut dash-shortcut--purple">
                                                <i class="bi bi-calendar-event"></i><span>Horario Transversales</span>
                                            </a>
                                        </div>
                                        <div class="col-6 col-md-4">
                                            <a href="fichas.html" class="dash-shortcut dash-shortcut--green">
                                                <i class="bi bi-folder2-open"></i><span>Fichas</span>
                                            </a>
                                        </div>
                                        <div class="col-6 col-md-4">
                                            <a href="funcionarios.html" class="dash-shortcut dash-shortcut--orange">
                                                <i class="bi bi-person-badge"></i><span>Instructores</span>
                                            </a>
                                        </div>
                                        <div class="col-6 col-md-4">
                                            <a href="programas.html" class="dash-shortcut dash-shortcut--teal">
                                                <i class="bi bi-book-half"></i><span>Programas</span>
                                            </a>
                                        </div>
                                        <div class="col-6 col-md-4">
                                            <a href="tipos-programas.html" class="dash-shortcut dash-shortcut--pink">
                                                <i class="bi bi-journals"></i><span>Tipo Programas</span>
                                            </a>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <!-- Gráficas -->
                    <div class="row g-3 mb-4">

                        <!-- Barras: horarios por mes -->
                        <div class="col-12 col-lg-7">
                            <div class="card border-0 shadow-sm h-100" style="border-radius:16px;">
                                <div class="card-body p-4">
                                    <div class="d-flex justify-content-between align-items-center mb-3">
                                        <h6 class="fw-bold text-dark mb-0">
                                            <i class="bi bi-bar-chart me-2 text-primary"></i>Horarios asignados por mes
                                        </h6>
                                        <select id="select-anio" class="form-select form-select-sm"
                                                style="width:auto; border-radius:8px;">
                                            <option value="${anio}">${anio}</option>
                                        </select>
                                    </div>
                                    <div style="position:relative; height:240px;">
                                        <canvas id="chart-meses"
                                                role="img"
                                                aria-label="Horarios asignados por mes del año ${anio}">
                                            Sin datos aún.
                                        </canvas>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <!-- Donut: fichas con/sin horario -->
                        <div class="col-12 col-lg-5">
                            <div class="card border-0 shadow-sm h-100" style="border-radius:16px;">
                                <div class="card-body p-4">
                                    <h6 class="fw-bold text-dark mb-3">
                                        <i class="bi bi-pie-chart me-2 text-success"></i>Fichas y cobertura de horarios
                                    </h6>
                                    <div style="position:relative; height:180px;">
                                        <canvas id="chart-fichas"
                                                role="img"
                                                aria-label="Distribución de fichas con y sin horario asignado">
                                            Sin datos aún.
                                        </canvas>
                                    </div>
                                    <div class="d-flex justify-content-center gap-4 mt-3"
                                         style="font-size:0.82rem; color:#6c757d;">
                                        <span>
                                            <span style="display:inline-block;width:10px;height:10px;border-radius:2px;
                                                         background:#4e73df;margin-right:5px;"></span>
                                            Con horario <strong id="lbl-con-horario">0</strong>
                                        </span>
                                        <span>
                                            <span style="display:inline-block;width:10px;height:10px;border-radius:2px;
                                                         background:#e0e4ea;margin-right:5px;"></span>
                                            Sin horario <strong id="lbl-sin-horario">0</strong>
                                        </span>
                                    </div>
                                </div>
                            </div>
                        </div>

                    </div>

                </main>
                ${footer()}
            </div>

            <style>
                .dash-card { background:#fff; border-radius:16px; padding:1.25rem; display:flex;
                    align-items:center; gap:1rem; box-shadow:0 2px 12px rgba(0,0,0,.04);
                    transition:transform .25s ease,box-shadow .25s ease; height:100%; }
                .dash-card:hover { transform:translateY(-4px); box-shadow:0 8px 24px rgba(0,0,0,.08); }
                .dash-card__icon { width:52px; height:52px; border-radius:14px; display:flex;
                    align-items:center; justify-content:center; font-size:1.4rem; flex-shrink:0; }
                .dash-card--primary .dash-card__icon { background:#e8f0fe; color:#4e73df; }
                .dash-card--success .dash-card__icon { background:#e6f9f0; color:#1cc88a; }
                .dash-card--info    .dash-card__icon { background:#e3f6fc; color:#36b9cc; }
                .dash-card--warning .dash-card__icon { background:#fff8e1; color:#f6c23e; }
                .dash-card__body { display:flex; flex-direction:column; min-width:0; }
                .dash-card__label { font-size:.75rem; font-weight:600; text-transform:uppercase;
                    letter-spacing:.5px; color:#8898aa; margin-bottom:2px; }
                .dash-card__value { font-size:1.9rem; font-weight:800; color:#1a1a2e; line-height:1.1; }

                .status-dot { width:14px; height:14px; border-radius:50%; flex-shrink:0; position:relative; }
                .status-dot::after { content:''; position:absolute; top:-3px; left:-3px; width:20px; height:20px;
                    border-radius:50%; animation:pulse-ring 2s ease infinite; }
                .status-dot--active { background:#2ecc71; }
                .status-dot--active::after { border:2px solid rgba(46,204,113,.4); }
                .status-dot--idle { background:#f39c12; }
                .status-dot--idle::after { border:2px solid rgba(243,156,18,.3); }
                @keyframes pulse-ring {
                    0%   { transform:scale(1);   opacity:1; }
                    50%  { transform:scale(1.4); opacity:0; }
                    100% { transform:scale(1);   opacity:0; }
                }

                .dash-progress { height:8px; background:#f0f2f5; border-radius:10px; overflow:hidden; }
                .dash-progress__bar { height:100%; border-radius:10px;
                    transition:width 1s cubic-bezier(.4,0,.2,1); }
                .dash-progress__bar--purple { background:linear-gradient(90deg,#667eea,#764ba2); }
                .dash-progress__bar--blue   { background:linear-gradient(90deg,#4facfe,#00f2fe); }
                .dash-progress__bar--green  { background:linear-gradient(90deg,#43e97b,#38f9d7); }

                .dash-shortcut { display:flex; flex-direction:column; align-items:center;
                    justify-content:center; gap:.5rem; padding:1.1rem .75rem; border-radius:14px;
                    text-decoration:none; font-size:.82rem; font-weight:600;
                    transition:all .25s ease; text-align:center; }
                .dash-shortcut i { font-size:1.5rem; }
                .dash-shortcut:hover { transform:translateY(-3px); box-shadow:0 6px 18px rgba(0,0,0,.1); }
                .dash-shortcut--blue   { background:#e8f0fe; color:#4e73df; }
                .dash-shortcut--blue:hover   { background:#4e73df; color:#fff; }
                .dash-shortcut--purple { background:#f0e6ff; color:#764ba2; }
                .dash-shortcut--purple:hover { background:#764ba2; color:#fff; }
                .dash-shortcut--green  { background:#e6f9f0; color:#1cc88a; }
                .dash-shortcut--green:hover  { background:#1cc88a; color:#fff; }
                .dash-shortcut--orange { background:#fff3e0; color:#e67e22; }
                .dash-shortcut--orange:hover { background:#e67e22; color:#fff; }
                .dash-shortcut--teal   { background:#e0f7fa; color:#00897b; }
                .dash-shortcut--teal:hover   { background:#00897b; color:#fff; }
                .dash-shortcut--pink   { background:#fce4ec; color:#e91e63; }
                .dash-shortcut--pink:hover   { background:#e91e63; color:#fff; }

                .dash-refresh-btn { background:#fff; color:#4e73df; border:1px solid #e0e4ea;
                    border-radius:10px; padding:.5rem 1.2rem; font-weight:600; font-size:.9rem;
                    transition:all .2s ease; }
                .dash-refresh-btn:hover { background:#4e73df; color:#fff; border-color:#4e73df; }
            </style>
        `;
    }
}

document.addEventListener('DOMContentLoaded', () => new DashboardCoordinador());