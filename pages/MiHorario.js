import { ProtectedRoute } from '../components/ProtectedRoute.js';
import { Navbar, initNavbarEvents } from '../components/Navbar.js';
import { Sidebar, initSidebarEvents } from '../components/Sidebar.js';
import { getHorarioPorInstructor } from '../utils/api.js';

// Mapa nombre de día → fecha de referencia (semana fija para FullCalendar)
const DAY_MAP = {
    'Lunes':     '2024-01-01',
    'Martes':    '2024-01-02',
    'Miercoles': '2024-01-03',
    'Jueves':    '2024-01-04',
    'Viernes':   '2024-01-05',
    'Sabado':    '2024-01-06',
    'Domingo':   '2024-01-07',
};

class MiHorarioPage {
    constructor() {
        new ProtectedRoute();
        this.appContainer = document.getElementById('app');
        this.idFuncionario = null;
        this.nombreInstructor = null;
        this.init();
    }

    init() {
        // Obtener id del instructor desde localStorage
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

                    <!-- Calendario -->
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
            const data   = await getHorarioPorInstructor(this.idFuncionario);
            const clases = data.clases || [];
            this.renderCalendario(card, clases);
        } catch (err) {
            card.innerHTML = `
                <div class="card-body p-5 text-center text-danger">
                    <i class="bi bi-x-circle fs-1 d-block mb-3 opacity-50"></i>
                    <p>${err.message || 'Error al cargar el horario.'}</p>
                </div>`;
        }
    }

    renderCalendario(card, clases) {
        if (!clases.length) {
            card.innerHTML = `
                <div class="card-body p-5 text-center text-muted d-flex flex-column align-items-center justify-content-center" style="min-height:60vh;">
                    <i class="bi bi-calendar-x fs-1 d-block mb-3 opacity-25"></i>
                    <p class="fw-medium">Sin clases asignadas</p>
                    <p class="small">Aún no tienes horario registrado en el sistema.</p>
                </div>`;
            return;
        }

        // Construir eventos para FullCalendar
        const events = [];
        clases.forEach(asig => {
            const bloque = asig.bloque;
            if (!bloque) return;

            const ficha     = asig.ficha;
            const isVirtual = bloque.modalidad === 'virtual';
            const color     = isVirtual ? '#0dcaf0' : '#7e57c2';
            const bgColor   = isVirtual ? 'rgba(13,202,240,0.1)' : 'rgba(126,87,194,0.1)';
            const ambienteLabel = bloque.ambiente
                ? `${bloque.ambiente.codigo} - No.${bloque.ambiente.numero}`
                : 'Virtual';
            const fichaLabel = ficha ? `Ficha ${ficha.codigoFicha || ''}` : '';
            const progLabel  = ficha?.programa?.nombre || '';

            (bloque.dias || []).forEach(dia => {
                const dateStr = DAY_MAP[dia.nombre];
                if (!dateStr) return;
                events.push({
                    id: `${asig.idAsignacion}_${dia.idDia}`,
                    start: `${dateStr}T${bloque.hora_inicio}`,
                    end:   `${dateStr}T${bloque.hora_fin}`,
                    backgroundColor: bgColor,
                    borderColor: color,
                    textColor: color,
                    extendedProps: { ambienteLabel, fichaLabel, progLabel, modalidad: bloque.modalidad, tipoDeFormacion: bloque.tipoDeFormacion }
                });
            });
        });

        card.innerHTML = `
            <div class="card-header bg-white border-0 pt-4 pb-2 px-4">
                <h5 class="fw-bold mb-0" style="color:var(--text-dark);">
                    <i class="bi bi-calendar-week me-2 text-primary"></i>Semana de clases
                </h5>
                <p class="small text-muted mb-0">Horario completo asignado</p>
            </div>
            <div class="card-body pt-0 px-4 pb-4" style="height:620px;">
                <div id="fullcalendar-mi-horario" class="h-100"></div>
            </div>`;

        const calendarEl = document.getElementById('fullcalendar-mi-horario');
        const calendar = new FullCalendar.Calendar(calendarEl, {
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
            events,
            eventContent(arg) {
                const p    = arg.event.extendedProps;
                const icon = p.modalidad === 'virtual' ? 'bi-laptop' : 'bi-building';
                const badge = p.tipoDeFormacion
                    ? `<div class="mt-auto pt-1"><span class="badge bg-secondary bg-opacity-25 text-dark" style="font-size:0.62rem;">${p.tipoDeFormacion}</span></div>`
                    : '';
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
        });
        calendar.render();
    }
}

document.addEventListener('DOMContentLoaded', () => { new MiHorarioPage(); });
