import { ProtectedRoute } from '../components/ProtectedRoute.js';
import { Navbar, initNavbarEvents } from '../components/Navbar.js';
import { Sidebar, initSidebarEvents } from '../components/Sidebar.js';
import { getHorarioPorInstructor } from '../utils/api.js';

class DashboardInstructor {
    constructor() {
        new ProtectedRoute();
        this.appContainer = document.getElementById('app');
        this.idFuncionario = null;
        this.nombreInstructor = null;
        this.clases = [];
        this.init();
    }

    async init() {
        // Leer id del instructor desde localStorage
        const userInfo = JSON.parse(localStorage.getItem('user_info') || '{}');
        this.idFuncionario    = userInfo.idFuncionario ?? userInfo.id ?? null;
        this.nombreInstructor = userInfo.nombre || localStorage.getItem('user_name') || 'Instructor';

        this.renderLayout();
        initNavbarEvents();
        initSidebarEvents();

        if (this.idFuncionario) {
            await this.loadData();
        } else {
            this.renderStats(0, 0, 0, 0);
            this.renderClases([]);
        }
    }

    async loadData() {
        try {
            const data = await getHorarioPorInstructor(this.idFuncionario);
            this.clases = data.data?.clases || data.clases || [];
            const { fichas, ambientes, horasSemana } = this.calcularStats(this.clases);
            this.renderStats(fichas, ambientes, horasSemana, this.clases.length);
            this.renderClases(this.clases);
        } catch (err) {
            this.renderStats(0, 0, 0, 0);
            this.renderClases([]);
        }
    }

    /**
     * Calcula estadísticas reales desde las clases del instructor.
     */
    calcularStats(clases) {
        const fichasIds    = new Set();
        const ambientesIds = new Set();
        let minutosTotales = 0;

        // Días de la semana actuales (lunes–domingo)
        const hoy      = new Date();
        const diaSemana = hoy.getDay(); // 0=Dom,1=Lun...6=Sab
        const lunes    = new Date(hoy);
        lunes.setDate(hoy.getDate() - ((diaSemana + 6) % 7)); // ajustar a lunes
        const domingo  = new Date(lunes);
        domingo.setDate(lunes.getDate() + 6);

        const diasSemana = new Set(); // nombres de días activos de la semana actual
        for (let d = new Date(lunes); d <= domingo; d.setDate(d.getDate() + 1)) {
            const nombres = ['Domingo','Lunes','Martes','Miercoles','Jueves','Viernes','Sabado'];
            diasSemana.add(nombres[d.getDay()]);
        }

        clases.forEach(asig => {
            const bloque = asig.bloque;
            if (!bloque) return;

            if (asig.ficha?.idFicha) fichasIds.add(asig.ficha.idFicha);
            if (asig.idAmbiente)     ambientesIds.add(asig.idAmbiente);

            // Horas de la semana actual: contar sólo los días que caen en esta semana
            const inicioMin = this.timeToMinutes(bloque.horaInicio ?? bloque.hora_inicio);
            const finMin    = this.timeToMinutes(bloque.horaFin    ?? bloque.hora_fin);
            const duracion  = finMin - inicioMin;

            (bloque.dias || []).forEach(dia => {
                const nombreDia = dia.nombreDia ?? dia.nombre;
                if (diasSemana.has(nombreDia)) {
                    minutosTotales += duracion;
                }
            });
        });

        return {
            fichas:      fichasIds.size,
            ambientes:   ambientesIds.size,
            horasSemana: Math.round(minutosTotales / 60),
        };
    }

    timeToMinutes(timeStr) {
        if (!timeStr) return 0;
        const [h, m] = timeStr.split(':').map(Number);
        return h * 60 + (m || 0);
    }

    renderLayout() {
        const currentPath = window.location.pathname;
        this.appContainer.innerHTML = `
            ${Sidebar(currentPath)}

            <div class="main-wrapper transition-all">
                ${Navbar()}

                <main class="container-fluid p-4 flex-grow-1" style="background: var(--bg-page);">
                    <div class="d-flex justify-content-between align-items-center mb-4">
                        <div>
                            <h4 class="fw-bold mb-0" style="color:var(--text-dark);">Mi Panel de Instructor</h4>
                            <small style="color:var(--text-muted);" id="lbl-bienvenida">Cargando datos...</small>
                        </div>
                    </div>

                    <!-- Widgets estadísticos -->
                    <div class="row g-4 mb-4" id="stats-row">
                        ${this.skeletonStat()}${this.skeletonStat()}${this.skeletonStat()}${this.skeletonStat()}
                    </div>

                    <!-- Contenido principal -->
                    <div class="row g-4">
                        <div class="col-12 col-lg-8">
                            <div class="card border-0 shadow-sm rounded-4 h-100">
                                <div class="card-header bg-white border-0 pt-4 px-4 pb-2 d-flex align-items-center gap-2">
                                    <i class="bi bi-calendar-week text-primary"></i>
                                    <h6 class="fw-bold mb-0" style="color:var(--text-dark);">Mis Clases Asignadas</h6>
                                </div>
                                <div class="card-body px-4 pb-4" id="clases-container">
                                    <div class="text-center py-4 text-muted">
                                        <div class="spinner-border spinner-border-sm text-primary me-2"></div>
                                        Cargando clases...
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div class="col-12 col-lg-4">
                            <div class="card border-0 shadow-sm rounded-4 h-100">
                                <div class="card-header bg-white border-0 pt-4 px-4 pb-2 d-flex align-items-center gap-2">
                                    <i class="bi bi-lightning-charge-fill text-warning"></i>
                                    <h6 class="fw-bold mb-0" style="color:var(--text-dark);">Accesos Rápidos</h6>
                                </div>
                                <div class="card-body px-4 pb-4 d-flex flex-column gap-3">
                                    <a href="mi-horario.html"
                                       class="d-flex align-items-center gap-3 text-decoration-none p-3 rounded-3"
                                       style="background:rgba(57,169,0,0.08);color:#4caa16;">
                                        <i class="bi bi-calendar-week fs-5"></i>
                                        <div>
                                            <div class="fw-semibold small">Ver Mi Horario</div>
                                            <div class="text-muted" style="font-size:0.75rem;">Calendario completo de clases</div>
                                        </div>
                                        <i class="bi bi-arrow-right ms-auto"></i>
                                    </a>
                                </div>
                            </div>
                        </div>
                    </div>
                </main>
            </div>
        `;
    }

    skeletonStat() {
        return `<div class="col-12 col-md-6 col-lg-3">
            <div class="card border-0 shadow-sm rounded-4 h-100 p-4">
                <div class="placeholder-glow">
                    <span class="placeholder col-6 rounded mb-2" style="height:12px;display:block;"></span>
                    <span class="placeholder col-4 rounded" style="height:28px;display:block;"></span>
                </div>
            </div>
        </div>`;
    }

    renderStats(fichas, ambientes, horasSemana, totalClases) {
        const userName = this.nombreInstructor;
        document.getElementById('lbl-bienvenida').textContent = `Bienvenido, ${userName}`;

        const stats = [
            { title: 'Fichas Asignadas',   value: fichas,       icon: 'bi-folder-fill',     color: 'primary' },
            { title: 'Horarios Registrados',  value: totalClases,  icon: 'bi-journal-bookmark', color: 'success' },
            { title: 'Horas esta Semana',   value: horasSemana,  icon: 'bi-clock-fill',       color: 'warning' },
            { title: 'Ambientes',           value: ambientes,    icon: 'bi-building',         color: 'info'    },
        ];

        document.getElementById('stats-row').innerHTML = stats.map(s => `
            <div class="col-12 col-md-6 col-lg-3">
                <div class="card border-0 shadow-sm rounded-4 h-100">
                    <div class="card-body p-4 d-flex align-items-center gap-3">
                        <div class="rounded-3 d-flex align-items-center justify-content-center flex-shrink-0"
                             style="width:52px;height:52px;background:rgba(var(--bs-${s.color}-rgb),.12);">
                            <i class="bi ${s.icon} fs-4 text-${s.color}"></i>
                        </div>
                        <div>
                            <p class="mb-1 fw-semibold text-uppercase" style="font-size:0.7rem;color:var(--text-muted);letter-spacing:.05em;">${s.title}</p>
                            <h3 class="fw-bold mb-0" style="color:var(--text-dark);">${s.value}</h3>
                        </div>
                    </div>
                </div>
            </div>`).join('');
    }

    renderClases(clases) {
        const container = document.getElementById('clases-container');
        if (!clases.length) {
            container.innerHTML = `
                <div class="text-center py-5 text-muted">
                    <i class="bi bi-calendar-x fs-1 d-block mb-3 opacity-25"></i>
                    <p class="fw-medium mb-1">Sin clases asignadas</p>
                    <p class="small">Aún no tienes clases registradas.</p>
                </div>`;
            return;
        }

        // Agrupar por bloque único (idBloque) para no repetir filas
        const seen = new Set();
        const rows = [];
        clases.forEach(asig => {
            const bloque = asig.bloque;
            if (!bloque || seen.has(bloque.idBloque)) return;
            seen.add(bloque.idBloque);

            const ficha    = asig.ficha;
            const dias     = (bloque.dias || []).map(d => (d.nombreDia ?? d.nombre ?? '').substring(0, 2)).join(', ');
            const ambiente = asig.ambiente
                ? asig.ambiente.codigo
                : '<span class="badge bg-info text-dark fw-normal">Virtual</span>';
            const horaInicio = (bloque.horaInicio ?? bloque.hora_inicio ?? '').substring(0, 5) || '--';
            const horaFin    = (bloque.horaFin    ?? bloque.hora_fin    ?? '').substring(0, 5) || '--';
            const isVirtual  = asig.modalidad === 'virtual';
            const modBadge   = isVirtual
                ? '<span class="badge bg-info text-dark fw-normal">Virtual</span>'
                : '<span class="badge bg-primary text-white fw-normal">Presencial</span>';
            const tipoBadge  = '';

            rows.push(`
                <tr>
                    <td class="align-middle">
                        <span class="fw-medium" style="font-size:0.85rem;">${horaInicio} – ${horaFin}</span>
                        <div class="text-muted" style="font-size:0.73rem;">${dias}</div>
                    </td>
                    <td class="align-middle">
                        <div class="fw-bold">${ficha ? ficha.codigoFicha : '—'}</div>
                        <small class="text-muted">${ficha?.programa?.nombre || ''}</small>
                    </td>
                    <td class="align-middle" style="font-size:0.85rem;">${isVirtual ? '—' : ambiente}</td>
                    <td class="align-middle">${modBadge}${tipoBadge}</td>
                </tr>`);
        });

        container.innerHTML = `
            <div class="table-responsive">
                <table class="table table-hover align-middle">
                    <thead class="table-light">
                        <tr>
                            <th style="font-size:0.75rem;" class="text-uppercase text-muted fw-semibold">Horario / Días</th>
                            <th style="font-size:0.75rem;" class="text-uppercase text-muted fw-semibold">Ficha</th>
                            <th style="font-size:0.75rem;" class="text-uppercase text-muted fw-semibold">Ambiente</th>
                            <th style="font-size:0.75rem;" class="text-uppercase text-muted fw-semibold">Modalidad</th>
                        </tr>
                    </thead>
                    <tbody>${rows.join('')}</tbody>
                </table>
            </div>`;
    }
}

document.addEventListener('DOMContentLoaded', () => { new DashboardInstructor(); });

