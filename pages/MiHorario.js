import { ProtectedRoute } from '../components/ProtectedRoute.js';
import { Navbar, initNavbarEvents } from '../components/Navbar.js';
import { Sidebar, initSidebarEvents } from '../components/Sidebar.js';
import { getHorarioPorInstructor } from '../utils/api.js';

// ─── Mapa nombre de día → número JS (0=Dom, 1=Lun … 6=Sab) ───────────────────
const DIA_JS = {
    'Domingo':   0,
    'Lunes':     1,
    'Martes':    2,
    'Miercoles': 3,
    'Jueves':    4,
    'Viernes':   5,
    'Sabado':    6,
};

// Fecha de referencia fija para la vista semanal abstracta
const SEMANA_REF = {
    'Lunes':     '2024-01-01',
    'Martes':    '2024-01-02',
    'Miercoles': '2024-01-03',
    'Jueves':    '2024-01-04',
    'Viernes':   '2024-01-05',
    'Sabado':    '2024-01-06',
    'Domingo':   '2024-01-07',
};

// Nombres de meses en español
const MESES_ES = [
    'Enero','Febrero','Marzo','Abril','Mayo','Junio',
    'Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'
];

class MiHorarioPage {
    constructor() {
        new ProtectedRoute();
        this.appContainer     = document.getElementById('app');
        this.idFuncionario    = null;
        this.nombreInstructor = null;
        this.clases           = [];
        this.calendar         = null;
        this.vistaActual      = 'semanal'; // 'semanal' | 'mensual'
        this.verHastaLimite   = false;
        this.fechaMaxima      = null; // fecha fin máxima de todos los bloques
        this.init();
    }

    init() {
        const userInfo = JSON.parse(localStorage.getItem('user_info') || '{}');
        this.idFuncionario    = userInfo.idFuncionario ?? userInfo.id ?? null;
        this.nombreInstructor = userInfo.nombre || localStorage.getItem('user_name') || 'Instructor';

        this.renderLayout();
        initNavbarEvents();
        initSidebarEvents();
        this.loadHorario();
    }

    renderLayout() {
        const currentPath = window.location.pathname;
        this.appContainer.innerHTML = `
            ${Sidebar(currentPath)}

            <div class="main-wrapper">
                ${Navbar()}

                <main class="container-fluid p-4 flex-grow-1" style="background: var(--bg-page);">
                    <div id="page-alert-container"></div>

                    <!-- Header -->
                    <div class="d-flex align-items-center gap-3 mb-4">
                        <div class="page-icon">
                            <i class="bi bi-calendar-week-fill"></i>
                        </div>
                        <div>
                            <h4 class="fw-bold mb-0" style="color: var(--text-dark);">Mi Horario</h4>
                            <small style="color: var(--text-muted);" id="lbl-instructor-nombre">${this.nombreInstructor}</small>
                        </div>
                    </div>

                    <!-- Card principal -->
                    <div class="card border-0 shadow-sm rounded-4" id="horario-card" style="min-height: 72vh;">
                        <div class="card-body p-5 text-center d-flex flex-column align-items-center justify-content-center text-muted">
                            <div class="spinner-border text-primary mb-3" role="status"></div>
                            <p class="small mb-0">Cargando tu horario...</p>
                        </div>
                    </div>
                </main>
            </div>
        `;
    }

    async loadHorario() {
        const card = document.getElementById('horario-card');

        if (!this.idFuncionario) {
            card.innerHTML = `
                <div class="card-body p-5 text-center text-warning">
                    <i class="bi bi-exclamation-triangle fs-1 d-block mb-3 opacity-50"></i>
                    <p class="fw-medium">No se pudo identificar tu usuario.</p>
                    <p class="small text-muted">Cierra sesión e inicia de nuevo.</p>
                </div>`;
            return;
        }

        try {
            const data = await getHorarioPorInstructor(this.idFuncionario);
            this.clases = data.data?.clases || data.clases || [];

            // Calcular fecha máxima de todos los bloques
            this.fechaMaxima = this.calcularFechaMaxima(this.clases);

            this.renderCalendario(card);
        } catch (err) {
            card.innerHTML = `
                <div class="card-body p-5 text-center text-danger">
                    <i class="bi bi-x-circle fs-1 d-block mb-3 opacity-50"></i>
                    <p>${err.message || 'Error al cargar el horario.'}</p>
                </div>`;
        }
    }

    // ─── Calcula la fecha fin máxima entre todos los bloques ─────────────────
    calcularFechaMaxima(clases) {
        let max = null;
        clases.forEach(asig => {
            const bloque = asig.bloque;
            if (!bloque) return;
            const fechaFin = bloque.fechaFin ?? bloque.fecha_fin ?? null;
            if (!fechaFin) return;
            if (!max || fechaFin > max) max = fechaFin;
        });
        return max; // string 'YYYY-MM-DD' o null
    }

    // ─── Expande los días de la semana dentro del rango fechaInicio-fechaFin ─
    expandirEventosMensuales(clases) {
        const events = [];

        clases.forEach(asig => {
            const bloque = asig.bloque;
            if (!bloque) return;

            const fechaInicio = bloque.fechaInicio ?? bloque.fecha_inicio ?? null;
            const fechaFin    = bloque.fechaFin    ?? bloque.fecha_fin    ?? null;
            const horaIni     = bloque.horaInicio  ?? bloque.hora_inicio  ?? null;
            const horaFin     = bloque.horaFin     ?? bloque.hora_fin     ?? null;

            if (!fechaInicio || !fechaFin || !horaIni || !horaFin) return;

            const ficha         = asig.ficha;
            const isVirtual     = asig.modalidad === 'virtual';
            const color         = isVirtual ? '#0dcaf0' : '#4caa16';
            const bgColor       = isVirtual ? 'rgba(13,202,240,0.13)' : 'rgba(57,169,0,0.13)';
            const ambienteLabel = asig.ambiente
                ? `${asig.ambiente.codigo} - No.${asig.ambiente.numero ?? ''}`
                : 'Virtual';
            const fichaLabel = ficha ? `F${ficha.codigoFicha || ''}` : '';
            const progLabel  = ficha?.programa?.nombre || '';

            const diasJS = (bloque.dias || []).map(d => {
                const nombre = d.nombreDia ?? d.nombre;
                return DIA_JS[nombre] ?? null;
            }).filter(n => n !== null);

            // Iterar cada día entre fechaInicio y fechaFin
            const inicio = new Date(fechaInicio + 'T00:00:00');
            const fin    = new Date(fechaFin    + 'T00:00:00');

            for (let d = new Date(inicio); d <= fin; d.setDate(d.getDate() + 1)) {
                if (!diasJS.includes(d.getDay())) continue;

                const dateStr = d.toISOString().split('T')[0];
                events.push({
                    id: `${asig.idAsignacion}_${dateStr}`,
                    start: `${dateStr}T${horaIni}`,
                    end:   `${dateStr}T${horaFin}`,
                    backgroundColor: bgColor,
                    borderColor: color,
                    textColor: color,
                    extendedProps: {
                        ambienteLabel,
                        fichaLabel,
                        progLabel,
                        modalidad: asig.modalidad,
                        tipoDeFormacion: asig.tipoDeFormacion,
                        fechaInicioBloque: fechaInicio,
                        fechaFinBloque: fechaFin,
                    }
                });
            }
        });

        return events;
    }

    // ─── Eventos para vista semanal abstracta (fechas fijas) ─────────────────
    buildEventosSemana(clases) {
        const events = [];
        clases.forEach(asig => {
            const bloque = asig.bloque;
            if (!bloque) return;
            const horaIni = bloque.horaInicio ?? bloque.hora_inicio ?? null;
            const horaFin = bloque.horaFin    ?? bloque.hora_fin    ?? null;
            if (!horaIni || !horaFin) return;

            const ficha         = asig.ficha;
            const isVirtual     = asig.modalidad === 'virtual';
            const color         = isVirtual ? '#0dcaf0' : '#4caa16';
            const bgColor       = isVirtual ? 'rgba(13,202,240,0.1)' : 'rgba(57,169,0,0.1)';
            const ambienteLabel = asig.ambiente
                ? `${asig.ambiente.codigo} - No.${asig.ambiente.numero ?? ''}`
                : 'Virtual';
            const fichaLabel = ficha ? `Ficha ${ficha.codigoFicha || ''}` : '';
            const progLabel  = ficha?.programa?.nombre || '';

            (bloque.dias || []).forEach(dia => {
                const nombreDia = dia.nombreDia ?? dia.nombre;
                const dateStr   = SEMANA_REF[nombreDia];
                if (!dateStr) return;
                events.push({
                    id: `${asig.idAsignacion}_${dia.idDia}`,
                    start: `${dateStr}T${horaIni}`,
                    end:   `${dateStr}T${horaFin}`,
                    backgroundColor: bgColor,
                    borderColor: color,
                    textColor: color,
                    extendedProps: { ambienteLabel, fichaLabel, progLabel, modalidad: asig.modalidad, tipoDeFormacion: asig.tipoDeFormacion }
                });
            });
        });
        return events;
    }

    renderCalendario(card) {
        if (!this.clases.length) {
            card.innerHTML = `
                <div class="card-body p-5 text-center text-muted d-flex flex-column align-items-center justify-content-center" style="min-height:60vh;">
                    <i class="bi bi-calendar-x fs-1 d-block mb-3 opacity-25"></i>
                    <p class="fw-medium">Sin clases asignadas</p>
                    <p class="small">Aún no tienes horario registrado en el sistema.</p>
                </div>`;
            return;
        }

        const fechaMaxLabel = this.fechaMaxima
            ? this.formatearFechaEs(this.fechaMaxima)
            : '—';

        card.innerHTML = `
            <!-- Toolbar superior -->
            <div class="card-header bg-white border-0 pt-4 pb-3 px-4">
                <div class="d-flex flex-wrap align-items-center gap-2 justify-content-between">
                    <div class="d-flex align-items-center gap-2">
                        <i class="bi bi-calendar-week text-primary fs-5"></i>
                        <div>
                            <h5 class="fw-bold mb-0" style="color:var(--text-dark);">Mi Horario</h5>
                            <small class="text-muted">Visualización de clases asignadas</small>
                        </div>
                    </div>

                    <!-- Controles de vista -->
                    <div class="d-flex flex-wrap align-items-center gap-2">

                        <!-- Botones Vista Semanal / Mensual -->
                        <div class="btn-group btn-group-sm" role="group" id="btn-group-vista">
                            <button type="button" id="btn-vista-semanal"
                                class="btn btn-primary active-vista"
                                title="Vista semanal (patrón de días)">
                                <i class="bi bi-calendar-week me-1"></i>Semanal
                            </button>
                            <button type="button" id="btn-vista-mensual"
                                class="btn btn-outline-primary"
                                title="Vista mensual (fechas reales)">
                                <i class="bi bi-calendar-month me-1"></i>Mensual
                            </button>
                        </div>

                        <!-- Divider visual -->
                        <div class="vr d-none d-md-block"></div>

                        <!-- Selector de MES (solo vista mensual) -->
                        <div class="d-flex align-items-center gap-1" id="controles-mensuales" style="display:none!important;">
                            <button class="btn btn-sm btn-outline-secondary" id="btn-mes-anterior" title="Mes anterior">
                                <i class="bi bi-chevron-left"></i>
                            </button>
                            <span class="fw-semibold px-2 small" id="lbl-mes-actual" style="min-width:130px;text-align:center;">—</span>
                            <button class="btn btn-sm btn-outline-secondary" id="btn-mes-siguiente" title="Mes siguiente">
                                <i class="bi bi-chevron-right"></i>
                            </button>
                        </div>

                        <!-- Toggle: Ver hasta fecha límite -->
                        <div class="form-check form-switch mb-0 d-flex align-items-center gap-2 ms-1" id="toggle-limite-wrapper" style="display:none!important;">
                            <input class="form-check-input" type="checkbox" id="toggle-hasta-limite" role="switch">
                            <label class="form-check-label small fw-medium" for="toggle-hasta-limite" style="cursor:pointer;">
                                Hasta&nbsp;<span class="badge bg-success-subtle text-success fw-semibold" style="font-size:0.7rem;">${fechaMaxLabel}</span>
                            </label>
                        </div>

                    </div>
                </div>
            </div>

            <!-- Leyenda -->
            <div class="px-4 pb-2 d-flex gap-3 flex-wrap" style="font-size:0.78rem;">
                <span class="d-flex align-items-center gap-1">
                    <span style="width:12px;height:12px;border-radius:3px;background:rgba(57,169,0,0.5);display:inline-block;"></span>
                    Presencial
                </span>
                <span class="d-flex align-items-center gap-1">
                    <span style="width:12px;height:12px;border-radius:3px;background:rgba(13,202,240,0.5);display:inline-block;"></span>
                    Virtual
                </span>
                ${this.fechaMaxima ? `<span class="ms-auto text-muted">Vigencia: <strong>${this.formatearFechaEs(this.calcularFechaMinima(this.clases))}</strong> → <strong>${fechaMaxLabel}</strong></span>` : ''}
            </div>

            <!-- Calendario -->
            <div class="card-body pt-0 px-4 pb-4">
                <div id="mi-horario-calendar" style="height:600px;"></div>
            </div>
        `;

        this.bindControles();
        this.initCalendar();
    }

    calcularFechaMinima(clases) {
        let min = null;
        clases.forEach(asig => {
            const bloque = asig.bloque;
            if (!bloque) return;
            const f = bloque.fechaInicio ?? bloque.fecha_inicio ?? null;
            if (!f) return;
            if (!min || f < min) min = f;
        });
        return min;
    }

    formatearFechaEs(dateStr) {
        if (!dateStr) return '—';
        const [y, m, d] = dateStr.split('-');
        return `${+d} ${MESES_ES[+m - 1]} ${y}`;
    }

    bindControles() {
        document.getElementById('btn-vista-semanal').addEventListener('click', () => this.cambiarVista('semanal'));
        document.getElementById('btn-vista-mensual').addEventListener('click', () => this.cambiarVista('mensual'));
        document.getElementById('btn-mes-anterior').addEventListener('click', () => this.calendar?.prev());
        document.getElementById('btn-mes-siguiente').addEventListener('click', () => this.calendar?.next());
        document.getElementById('toggle-hasta-limite').addEventListener('change', (e) => {
            this.verHastaLimite = e.target.checked;
            this.actualizarFiltroFecha();
        });
    }

    initCalendar() {
        const calendarEl = document.getElementById('mi-horario-calendar');
        const eventsSemana = this.buildEventosSemana(this.clases);

        this.calendar = new FullCalendar.Calendar(calendarEl, {
            initialView:     'timeGridWeek',
            initialDate:     '2024-01-01',
            headerToolbar:   false,
            allDaySlot:      false,
            slotMinTime:     '06:00:00',
            slotMaxTime:     '24:00:00',
            expandRows:      true,
            hiddenDays:      [],
            dayHeaderFormat: { weekday: 'long' },
            locale:          'es',
            events:          eventsSemana,
            height:          600,
            eventContent:    (arg) => this.buildEventContent(arg),
            datesSet:        (info) => this.actualizarLabelMes(info),
        });

        this.calendar.render();
        this.actualizarEstadoBotones();
    }

    cambiarVista(vista) {
        this.vistaActual = vista;

        const controlesM = document.getElementById('controles-mensuales');
        const toggleW    = document.getElementById('toggle-limite-wrapper');
        const btnSem     = document.getElementById('btn-vista-semanal');
        const btnMen     = document.getElementById('btn-vista-mensual');

        if (vista === 'mensual') {
            // Activar controles mensuales
            controlesM.style.removeProperty('display');
            toggleW.style.removeProperty('display');

            btnSem.classList.remove('btn-primary');
            btnSem.classList.add('btn-outline-primary');
            btnMen.classList.remove('btn-outline-primary');
            btnMen.classList.add('btn-primary');

            // Cambiar eventos a fechas reales
            const hoy = new Date();
            const eventosMensuales = this.expandirEventosMensuales(this.clases);

            this.calendar.removeAllEvents();
            // Decidir fecha inicial: hoy si está en rango, si no la fecha mínima
            const fechaMin = this.calcularFechaMinima(this.clases);
            const goDate   = fechaMin && fechaMin > hoy.toISOString().split('T')[0]
                ? fechaMin
                : hoy.toISOString().split('T')[0];

            this.calendar.changeView('dayGridMonth');
            this.calendar.gotoDate(goDate);
            eventosMensuales.forEach(ev => this.calendar.addEvent(ev));

        } else {
            // Vista semanal
            controlesM.style.display = 'none';
            toggleW.style.display    = 'none';
            this.verHastaLimite = false;
            document.getElementById('toggle-hasta-limite').checked = false;

            btnMen.classList.remove('btn-primary');
            btnMen.classList.add('btn-outline-primary');
            btnSem.classList.remove('btn-outline-primary');
            btnSem.classList.add('btn-primary');

            const eventsSemana = this.buildEventosSemana(this.clases);
            this.calendar.removeAllEvents();
            this.calendar.changeView('timeGridWeek', '2024-01-01');
            eventsSemana.forEach(ev => this.calendar.addEvent(ev));
        }

        this.actualizarEstadoBotones();
    }

    actualizarFiltroFecha() {
        if (this.vistaActual !== 'mensual') return;

        let eventosMensuales = this.expandirEventosMensuales(this.clases);

        if (this.verHastaLimite && this.fechaMaxima) {
            // Sin filtro adicional — ya están todos los eventos hasta la fecha fin del bloque
            // Navegar al mes de inicio del horario
            const fechaMin = this.calcularFechaMinima(this.clases);
            if (fechaMin) {
                this.calendar.gotoDate(fechaMin);
            }
        } else {
            // Solo eventos del mes actual
            const hoy = new Date().toISOString().split('T')[0];
            this.calendar.gotoDate(hoy);
        }

        this.calendar.removeAllEvents();
        eventosMensuales.forEach(ev => this.calendar.addEvent(ev));
    }

    actualizarLabelMes(info) {
        const lbl = document.getElementById('lbl-mes-actual');
        if (!lbl) return;
        if (this.vistaActual !== 'mensual') {
            lbl.textContent = 'Semana de clases';
            return;
        }
        // Calcular el mes visible del centro del rango
        const centro = new Date((info.start.getTime() + info.end.getTime()) / 2);
        lbl.textContent = `${MESES_ES[centro.getMonth()]} ${centro.getFullYear()}`;
    }

    actualizarEstadoBotones() {
        // Botones prev/next solo relevantes en vista mensual
        const btnAnterior  = document.getElementById('btn-mes-anterior');
        const btnSiguiente = document.getElementById('btn-mes-siguiente');
        if (!btnAnterior || !btnSiguiente) return;

        if (this.vistaActual === 'mensual') {
            btnAnterior.disabled  = false;
            btnSiguiente.disabled = false;
        }
    }

    buildEventContent(arg) {
        const p    = arg.event.extendedProps;
        const icon = p.modalidad === 'virtual' ? 'bi-laptop' : 'bi-building';
        const badge = p.tipoDeFormacion
            ? `<div class="mt-auto pt-1"><span class="badge bg-secondary bg-opacity-25 text-dark" style="font-size:0.62rem;">${p.tipoDeFormacion}</span></div>`
            : '';

        // En vista mensual mostrar info compacta
        if (this.vistaActual === 'mensual') {
            return {
                html: `<div class="p-1 h-100 d-flex flex-column overflow-hidden">
                    <div class="fw-bold lh-sm text-truncate" style="font-size:0.72rem;">${p.fichaLabel}</div>
                    <div class="text-truncate" style="font-size:0.65rem;opacity:0.8;">
                        <i class="bi ${icon}"></i> ${p.ambienteLabel}
                    </div>
                </div>`
            };
        }

        return {
            html: `<div class="p-1 h-100 d-flex flex-column" style="overflow:hidden;">
                <div class="fw-bold mb-1 lh-sm" style="font-size:0.78rem;">${p.fichaLabel}</div>
                <div class="text-truncate" style="font-size:0.72rem;opacity:0.85;">
                    <i class="bi ${icon}"></i> ${p.ambienteLabel}
                </div>
                <div class="text-truncate" style="font-size:0.7rem;opacity:0.7;">${p.progLabel}</div>
                ${badge}
            </div>`
        };
    }
}

document.addEventListener('DOMContentLoaded', () => { new MiHorarioPage(); });

