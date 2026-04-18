import { ProtectedRoute } from '../components/ProtectedRoute.js';
import { Navbar, initNavbarEvents } from '../components/Navbar.js';
import { Sidebar, initSidebarEvents } from '../components/Sidebar.js';
import { DataTable, initTablePagination } from '../components/DataTable.js';
import { ModalForm, setModalLoading } from '../components/ModalForm.js';
import { FormInput } from '../components/FormInput.js';
import { ConfirmDialog } from '../components/ConfirmDialog.js';
import { AlertMessage } from '../components/AlertMessage.js';
import {
    getAmbientes, createAmbiente, updateAmbiente, deleteAmbiente,
    getAreas, getHorariosPorAmbiente
} from '../utils/api.js?v=4';

class AmbientesPage {
    constructor() {
        new ProtectedRoute();
        this.appContainer = document.getElementById('app');
        this.ambientes = [];
        this.areas = [];
        this.currentEditId = null;

        const urlParams = new URLSearchParams(window.location.search);
        this.idSede = urlParams.get('idSede');
        this.nombreSede = urlParams.get('nombreSede') || 'Sede Seleccionada';

        this.init();
    }

    async init() {
        this.renderLayout();
        initNavbarEvents();
        initSidebarEvents();

        await this.loadDependencies();
        this.setupModal();
        this.setupHorarioModal();
        await this.loadData();
    }

    renderLayout() {
        const currentPath = window.location.pathname;
        const pageTitle = this.idSede ? 'Ambientes de ' + this.nombreSede : 'Todos los Ambientes';
        const subtitle = this.idSede ? 'Gestionando ambientes vinculados a esta sede' : 'Administra todos los ambientes';

        this.appContainer.innerHTML = `
            ${Sidebar(currentPath)}
            
            <div class="main-wrapper">
                ${Navbar()}
                
                <main class="container-fluid p-4 flex-grow-1" style="background: var(--bg-page);">
                    
                    ${this.idSede ? `
                    <nav aria-label="breadcrumb" class="mb-3">
                        <ol class="breadcrumb mb-0">
                            <li class="breadcrumb-item"><a href="/sedes.html" class="text-decoration-none" style="color: var(--primary-color);">Sedes</a></li>
                            <li class="breadcrumb-item active" aria-current="page">${this.nombreSede}</li>
                        </ol>
                    </nav>
                    ` : ''}

                    <div id="page-alert-container"></div>
                    
                    <div class="d-flex flex-column flex-sm-row justify-content-between align-items-start align-items-sm-center mb-4 gap-3">
                        <div class="d-flex align-items-center gap-3">
                            <div class="page-icon">
                                <i class="bi bi-door-open-fill"></i>
                            </div>
                            <div>
                                <h4 class="fw-bold mb-0" style="color: var(--text-dark);">${pageTitle}</h4>
                                <small style="color: var(--text-muted);">${subtitle}</small>
                            </div>
                        </div>
                        
                        <button class="btn btn-purple d-flex align-items-center gap-2" id="btn-add-ambiente">
                            <i class="bi bi-plus-lg"></i>
                            <span>Nuevo Ambiente</span>
                        </button>
                    </div>

                    <div class="d-flex flex-wrap justify-content-between align-items-center mb-3 gap-2">
                        <div class="btn-group btn-group-sm" role="group"></div>
                        <div class="d-flex align-items-center gap-2">
                            <label class="mb-0 fw-medium" style="color: var(--text-muted); font-size: 0.85rem;">Search:</label>
                            <input type="text" class="form-control form-control-sm" style="max-width: 200px; border-color: var(--border-color); border-radius: 0.4rem;" placeholder="" id="search-input">
                        </div>
                    </div>

                    <div id="table-container">
                        ${DataTable({ id: 'ambientes-table', columns: [], loading: true })}
                    </div>
                </main>
            </div>
            
            <!-- Modal CRUD -->
            <div id="modal-container"></div>

            <!-- Modal Horario Ambiente -->
            <div class="modal fade" id="modalHorarioAmbiente" tabindex="-1" aria-hidden="true">
                <div class="modal-dialog modal-xl modal-dialog-centered modal-dialog-scrollable">
                    <div class="modal-content border-0 shadow-lg" style="border-radius:1rem; overflow:hidden;">
                        <div class="modal-header text-white border-0 px-4 py-3"
                             style="background:linear-gradient(135deg,var(--primary) 0%,var(--primary-dark) 100%);">
                            <h5 class="modal-title fw-bold d-flex align-items-center gap-2" id="modal-horario-ambiente-title">
                                <i class="bi bi-calendar-week"></i> Horario del Ambiente
                            </h5>
                            <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal"></button>
                        </div>
                        <div class="modal-body p-4" style="background:var(--bg-page); min-height:500px;">
                            <div id="modal-horario-ambiente-body">
                                <div class="text-center py-5 text-muted">
                                    <div class="spinner-border text-primary mb-3" role="status"></div>
                                    <p class="small">Cargando horario...</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;

        document.getElementById('btn-add-ambiente').addEventListener('click', () => this.openModal());

        const searchInput = document.getElementById('search-input');
        if (searchInput) {
            searchInput.addEventListener('input', (e) => this.filterTable(e.target.value));
        }
    }

    async loadDependencies() {
        try {
            const areasData = await getAreas();
            this.areas = areasData.data || (Array.isArray(areasData) ? areasData : []);
        } catch (error) {
            console.error('Error al cargar áreas:', error);
            this.showAlert('page-alert-container', 'warning', 'No se pudieron cargar las áreas.');
        }
    }

    filterTable(query) {
        const q = query.toLowerCase().trim();
        if (!q) { this.renderTable(this.ambientes); return; }
        const filtered = this.ambientes.filter(a =>
            (a.nombre        && a.nombre.toLowerCase().includes(q))        ||
            (a.codigo        && a.codigo.toLowerCase().includes(q))        ||
            (a.tipoAmbiente  && a.tipoAmbiente.toLowerCase().includes(q))  ||
            (a.bloque        && a.bloque.toLowerCase().includes(q))        ||
            (a.area          && a.area.nombreArea           && a.area.nombreArea.toLowerCase().includes(q))           ||
            (a.area_formacion && a.area_formacion.nombreArea && a.area_formacion.nombreArea.toLowerCase().includes(q))
        );
        this.renderTable(filtered);
    }

    async loadData() {
        try {
            const data = await getAmbientes();
            let all = data.data || (Array.isArray(data) ? data : []);
            this.ambientes = this.idSede
                ? all.filter(a => String(a.idSede) === String(this.idSede))
                : all;
            this.renderTable();
        } catch (error) {
            this.showAlert('page-alert-container', 'danger', error.message || 'Error al cargar los ambientes.');
            document.getElementById('table-container').innerHTML = DataTable({ id: 'ambientes-table', columns: [], loading: false, data: [] });
        }
    }

    renderTable(data = null) {
        const displayData = data || this.ambientes;

        const columns = [
            { key: 'codigo', label: 'Código', icon: 'hash' },
            {
                key: 'descripcion',
                label: 'Descripción / Nombre',
                icon: 'door-open',
                render: (row) => row.descripcion || row.nombre || '<span class="text-muted">N/A</span>'
            },
            { key: 'bloque',    label: 'Bloque',    icon: 'building' },
            { key: 'capacidad', label: 'Capacidad', icon: 'people'   },
            { key: 'tipoAmbiente', label: 'Tipo Formación', icon: 'easel' },
            {
                key: 'area',
                label: 'Área',
                icon: 'tags',
                render: (row) => {
                    const obj = row.area || row.area_formacion;
                    return obj && obj.nombreArea ? obj.nombreArea : '<span class="text-muted">N/A</span>';
                }
            },
            {
                key: 'estado',
                label: 'Estado',
                icon: 'toggle-on',
                render: (row) => {
                    const cls = row.estado === 'Activo' ? 'bg-success-subtle text-success' : 'bg-danger-subtle text-danger';
                    return `<span class="badge rounded-pill ${cls}">${row.estado || 'N/A'}</span>`;
                }
            },
            {
                key: 'acciones',
                label: '',
                render: (row) => `
                    <div class="d-flex gap-1 justify-content-end">
                        <button class="btn-action btn-ver-horario-ambiente"
                                data-id="${row.idAmbiente}"
                                data-codigo="${row.codigo || ''}"
                                data-nombre="${(row.descripcion || row.nombre || '').replace(/"/g,'&quot;')}"
                                title="Ver Horario"
                                style="color:var(--primary);">
                            <i class="bi bi-calendar-week"></i>
                        </button>
                        <button class="btn-action edit btn-edit" data-id="${row.idAmbiente}" title="Editar">
                            <i class="bi bi-pencil-square"></i>
                        </button>
                        <button class="btn-action delete btn-delete" data-id="${row.idAmbiente}" title="Eliminar">
                            <i class="bi bi-trash"></i>
                        </button>
                    </div>
                `
            }
        ];

        document.getElementById('table-container').innerHTML = DataTable({
            id: 'ambientes-table',
            columns,
            data: displayData
        });

        initTablePagination('ambientes-table', displayData, columns, '#table-container');

        document.querySelectorAll('.btn-edit').forEach(btn => {
            btn.addEventListener('click', (e) => this.openModal(e.currentTarget.dataset.id));
        });

        document.querySelectorAll('.btn-delete').forEach(btn => {
            btn.addEventListener('click', (e) => this.handleDelete(e.currentTarget.dataset.id));
        });

        document.querySelectorAll('.btn-ver-horario-ambiente').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const { id, codigo, nombre } = e.currentTarget.dataset;
                this.verHorarioAmbiente(id, codigo, nombre);
            });
        });
    }

    // ─────────────────────────────────────────────────────────────────────────
    // MODAL HORARIO AMBIENTE
    // ─────────────────────────────────────────────────────────────────────────

    setupHorarioModal() {
        // El modal ya está en el DOM, solo necesitamos la referencia Bootstrap
        this.bsHorarioModal = new bootstrap.Modal(document.getElementById('modalHorarioAmbiente'));
    }

    async verHorarioAmbiente(idAmbiente, codigo, nombre) {
        const label = codigo ? `${codigo}${nombre ? ' - ' + nombre : ''}` : (nombre || idAmbiente);
        document.getElementById('modal-horario-ambiente-title').innerHTML =
            `<i class="bi bi-calendar-week"></i> Horario — ${label}`;

        this.bsHorarioModal.show();

        const body = document.getElementById('modal-horario-ambiente-body');
        body.innerHTML = `
            <div class="text-center py-5 text-muted">
                <div class="spinner-border text-primary mb-3" role="status"></div>
                <p class="small">Cargando horario del ambiente <strong>${label}</strong>...</p>
            </div>`;

        try {
            const response = await getHorariosPorAmbiente(idAmbiente);
            // El backend devuelve { ok, asignaciones, grilla }
            const asignaciones = response.asignaciones || response.data?.asignaciones || [];
            const grilla       = response.grilla       || response.data?.grilla       || {};
            this.renderHorarioAmbiente(body, asignaciones, grilla, label);
        } catch (err) {
            body.innerHTML = `
                <div class="text-center py-5 text-danger">
                    <i class="bi bi-exclamation-triangle fs-1 d-block mb-3 opacity-50"></i>
                    <p>${err.message || 'Error al cargar el horario.'}</p>
                </div>`;
        }
    }

    renderHorarioAmbiente(container, asignaciones, grilla, label) {
        if (!asignaciones.length) {
            container.innerHTML = `
                <div class="text-center py-5 text-muted">
                    <i class="bi bi-calendar-x fs-1 d-block mb-3 opacity-25"></i>
                    <p class="fw-medium">Sin clases asignadas</p>
                    <p class="small">Este ambiente no tiene horario registrado.</p>
                </div>`;
            return;
        }

        // ── Construcción de eventos para FullCalendar ────────────────────────
        const DIAS_MAP = {
            'Lunes':     '2024-01-01',
            'Martes':    '2024-01-02',
            'Miercoles': '2024-01-03',
            'Jueves':    '2024-01-04',
            'Viernes':   '2024-01-05',
            'Sabado':    '2024-01-06',
            'Domingo':   '2024-01-07'
        };

        const DIA_JS = {
            'Domingo':0,'Lunes':1,'Martes':2,'Miercoles':3,
            'Jueves':4,'Viernes':5,'Sabado':6
        };

        const MESES_ES = ['Enero','Febrero','Marzo','Abril','Mayo','Junio',
            'Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];

        // Colores por ficha (se asigna uno distinto a cada ficha)
        const PALETTE = [
            '#4caa16','#0d6efd','#6f42c1','#fd7e14','#0dcaf0',
            '#d63384','#20c997','#ffc107','#dc3545','#6610f2'
        ];
        const fichaColorMap = {};
        let colorIdx = 0;
        const getColorFicha = (idFicha) => {
            const key = String(idFicha);
            if (!fichaColorMap[key]) {
                fichaColorMap[key] = PALETTE[colorIdx % PALETTE.length];
                colorIdx++;
            }
            return fichaColorMap[key];
        };

        const buildEventsSemana = () => {
            const events = [];
            asignaciones.forEach(asig => {
                const bloque = asig.bloque;
                if (!bloque) return;
                const horaIni = bloque.horaInicio ?? bloque.hora_inicio;
                const horaFin = bloque.horaFin    ?? bloque.hora_fin;
                if (!horaIni || !horaFin) return;

                const instructor = asig.funcionario;
                const ficha      = asig.ficha;
                const idFicha    = ficha?.idFicha ?? asig.idFicha ?? 0;
                const color      = getColorFicha(idFicha);
                const fichaLabel = ficha?.codigoFicha ?? ficha?.numero ?? '—';
                const progLabel  = ficha?.programa?.nombre ?? '—';
                const instLabel  = instructor?.nombre ?? 'Sin Instructor';

                (bloque.dias || []).forEach(dia => {
                    const nombreDia = dia.nombre ?? dia.nombreDia;
                    const dateStr   = DIAS_MAP[nombreDia];
                    if (!dateStr) return;
                    events.push({
                        id: `${asig.idAsignacion}_${dia.idDia}`,
                        start: `${dateStr}T${horaIni}`,
                        end:   `${dateStr}T${horaFin}`,
                        backgroundColor: `${color}18`,
                        borderColor: color,
                        textColor:   color,
                        extendedProps: { fichaLabel, progLabel, instLabel, modalidad: asig.modalidad }
                    });
                });
            });
            return events;
        };

        const buildEventosMensual = () => {
            const events = [];
            asignaciones.forEach(asig => {
                const bloque = asig.bloque;
                if (!bloque) return;
                const fechaInicio = bloque.fechaInicio ?? bloque.fecha_inicio;
                const fechaFin    = bloque.fechaFin    ?? bloque.fecha_fin;
                const horaIni     = bloque.horaInicio  ?? bloque.hora_inicio;
                const horaFin     = bloque.horaFin     ?? bloque.hora_fin;
                if (!fechaInicio || !fechaFin || !horaIni || !horaFin) return;

                const instructor = asig.funcionario;
                const ficha      = asig.ficha;
                const idFicha    = ficha?.idFicha ?? asig.idFicha ?? 0;
                const color      = getColorFicha(idFicha);
                const fichaLabel = ficha?.codigoFicha ?? ficha?.numero ?? '—';
                const progLabel  = ficha?.programa?.nombre ?? '—';
                const instLabel  = instructor?.nombre ?? 'Sin Instructor';

                const diasJS = (bloque.dias || []).map(d => {
                    const nombre = d.nombreDia ?? d.nombre;
                    return DIA_JS[nombre] ?? null;
                }).filter(n => n !== null);

                const inicio = new Date(fechaInicio + 'T00:00:00');
                const fin    = new Date(fechaFin    + 'T00:00:00');

                for (let d = new Date(inicio); d <= fin; d.setDate(d.getDate() + 1)) {
                    if (!diasJS.includes(d.getDay())) continue;
                    const dateStr = d.toISOString().split('T')[0];
                    events.push({
                        id: `${asig.idAsignacion}_${dateStr}`,
                        start: `${dateStr}T${horaIni}`,
                        end:   `${dateStr}T${horaFin}`,
                        backgroundColor: `${color}18`,
                        borderColor: color,
                        textColor:   color,
                        extendedProps: { fichaLabel, progLabel, instLabel, modalidad: asig.modalidad }
                    });
                }
            });
            return events;
        };

        // Rango de fechas para mostrar en el badge
        let fechaMin = null, fechaMax = null;
        asignaciones.forEach(asig => {
            const bloque = asig.bloque;
            if (!bloque) return;
            const fi = bloque.fechaInicio ?? bloque.fecha_inicio;
            const ff = bloque.fechaFin    ?? bloque.fecha_fin;
            if (fi && (!fechaMin || fi < fechaMin)) fechaMin = fi;
            if (ff && (!fechaMax || ff > fechaMax)) fechaMax = ff;
        });

        // ── Leyenda de fichas ────────────────────────────────────────────────
        const fichasUnicas = [];
        const seen = new Set();
        asignaciones.forEach(asig => {
            const ficha   = asig.ficha;
            const idFicha = String(ficha?.idFicha ?? asig.idFicha ?? '');
            if (idFicha && !seen.has(idFicha)) {
                seen.add(idFicha);
                fichasUnicas.push({
                    id:    idFicha,
                    label: ficha?.codigoFicha ?? ficha?.numero ?? idFicha,
                    prog:  ficha?.programa?.nombre ?? '—',
                    color: getColorFicha(idFicha)
                });
            }
        });

        const leyendaHtml = fichasUnicas.map(f => `
            <span class="badge border me-1 mb-1 d-inline-flex align-items-center gap-1"
                  style="background:${f.color}18; color:${f.color}; border-color:${f.color}!important; font-size:0.72rem;">
                <i class="bi bi-people-fill"></i>
                <span>Ficha ${f.label}</span>
                <span class="opacity-75">· ${f.prog}</span>
            </span>`).join('');

        let vistaActual = 'semanal';

        container.innerHTML = `
            <!-- Barra de controles -->
            <div class="d-flex flex-wrap align-items-center justify-content-between gap-2 mb-3">
                <div class="d-flex align-items-center gap-2">
                    <div class="btn-group btn-group-sm" role="group">
                        <button type="button" id="amb-btn-semanal" class="btn btn-primary">
                            <i class="bi bi-calendar-week me-1"></i>Semanal
                        </button>
                        <button type="button" id="amb-btn-mensual" class="btn btn-outline-primary">
                            <i class="bi bi-calendar-month me-1"></i>Mensual
                        </button>
                        <button type="button" id="amb-btn-diario" class="btn btn-outline-primary">
                            <i class="bi bi-calendar-day me-1"></i>Día
                        </button>
                    </div>
                </div>
                <!-- Controles navegación (solo mensual/diario) -->
                <div class="d-flex align-items-center gap-1" id="amb-controles-nav" style="display:none!important;">
                    <button class="btn btn-sm btn-outline-secondary" id="amb-btn-prev"><i class="bi bi-chevron-left"></i></button>
                    <span class="fw-semibold px-2 small" id="amb-lbl-periodo" style="min-width:140px;text-align:center;">—</span>
                    <button class="btn btn-sm btn-outline-secondary" id="amb-btn-next"><i class="bi bi-chevron-right"></i></button>
                    <button class="btn btn-sm btn-outline-secondary ms-1" id="amb-btn-today">Hoy</button>
                </div>
                ${fechaMin && fechaMax ? `
                    <span class="badge bg-light text-muted border" style="font-size:0.72rem;">
                        <i class="bi bi-calendar-range me-1"></i>${fechaMin} → ${fechaMax}
                    </span>` : ''}
            </div>

            <!-- Leyenda de fichas -->
            ${fichasUnicas.length ? `
            <div class="mb-3">
                <small class="text-muted fw-semibold me-2" style="font-size:0.72rem;">FICHAS:</small>
                ${leyendaHtml}
            </div>` : ''}

            <!-- Grilla estática (resumen por franjas) -->
            <div id="amb-grilla-container" class="mb-3" style="display:none;"></div>

            <!-- Calendario FullCalendar -->
            <div id="cal-ambiente" style="height:560px;"></div>
        `;

        const calEl = document.getElementById('cal-ambiente');

        const calendar = new FullCalendar.Calendar(calEl, {
            initialView:     'timeGridWeek',
            initialDate:     '2024-01-01',
            headerToolbar:   false,
            allDaySlot:      false,
            slotMinTime:     '06:00:00',
            slotMaxTime:     '24:00:00',
            expandRows:      true,
            dayHeaderFormat: { weekday: 'long' },
            locale:          'es',
            height:          560,
            events:          buildEventsSemana(),
            datesSet: (info) => {
                const lbl = document.getElementById('amb-lbl-periodo');
                if (!lbl) return;
                if (vistaActual === 'semanal') {
                    lbl.textContent = 'Semana de clases';
                } else {
                    const centro = new Date((info.start.getTime() + info.end.getTime()) / 2);
                    lbl.textContent = `${MESES_ES[centro.getMonth()]} ${centro.getFullYear()}`;
                }
            },
            eventContent(arg) {
                const p    = arg.event.extendedProps;
                const icon = p.modalidad === 'virtual' ? 'bi-laptop' : 'bi-building';
                if (vistaActual === 'mensual') {
                    return {
                        html: `<div class="p-1 h-100 d-flex flex-column overflow-hidden">
                            <div class="fw-bold lh-sm text-truncate" style="font-size:0.72rem;">
                                <i class="bi bi-people me-1"></i>Ficha ${p.fichaLabel}
                            </div>
                            <div class="text-truncate" style="font-size:0.65rem;opacity:0.85;">
                                <i class="bi bi-person me-1"></i>${p.instLabel}
                            </div>
                        </div>`
                    };
                }
                return {
                    html: `<div class="p-1 h-100 d-flex flex-column" style="overflow:hidden;">
                        <div class="fw-bold mb-1 lh-sm" style="font-size:0.75rem;">
                            <i class="bi bi-people me-1"></i>Ficha ${p.fichaLabel}
                        </div>
                        <div class="text-truncate mb-1" style="font-size:0.7rem;opacity:0.9;">
                            <i class="bi bi-book me-1"></i>${p.progLabel}
                        </div>
                        <div class="text-truncate" style="font-size:0.68rem;opacity:0.8;">
                            <i class="bi ${icon} me-1"></i>${p.instLabel}
                        </div>
                    </div>`
                };
            }
        });

        calendar.render();
        setTimeout(() => calendar.updateSize(), 300);

        // Controles de vista
        const btnSem  = document.getElementById('amb-btn-semanal');
        const btnMen  = document.getElementById('amb-btn-mensual');
        const btnDia  = document.getElementById('amb-btn-diario');
        const navCont = document.getElementById('amb-controles-nav');

        const activarBtn = (activo) => {
            [btnSem, btnMen, btnDia].forEach(b => {
                b.classList.remove('btn-primary');
                b.classList.add('btn-outline-primary');
            });
            activo.classList.remove('btn-outline-primary');
            activo.classList.add('btn-primary');
        };

        btnSem.addEventListener('click', () => {
            vistaActual = 'semanal';
            activarBtn(btnSem);
            navCont.style.display = 'none';
            calendar.removeAllEvents();
            calendar.changeView('timeGridWeek', '2024-01-01');
            buildEventsSemana().forEach(ev => calendar.addEvent(ev));
        });

        btnMen.addEventListener('click', () => {
            vistaActual = 'mensual';
            activarBtn(btnMen);
            navCont.style.removeProperty('display');
            calendar.removeAllEvents();
            const hoy    = new Date().toISOString().split('T')[0];
            const goDate = fechaMin && fechaMin > hoy ? fechaMin : hoy;
            calendar.changeView('dayGridMonth');
            calendar.gotoDate(goDate);
            buildEventosMensual().forEach(ev => calendar.addEvent(ev));
        });

        btnDia.addEventListener('click', () => {
            vistaActual = 'diario';
            activarBtn(btnDia);
            navCont.style.removeProperty('display');
            calendar.removeAllEvents();
            const hoy    = new Date().toISOString().split('T')[0];
            const goDate = fechaMin && fechaMin > hoy ? fechaMin : hoy;
            calendar.changeView('timeGridDay');
            calendar.gotoDate(goDate);
            buildEventosMensual().forEach(ev => calendar.addEvent(ev));
        });

        document.getElementById('amb-btn-prev')?.addEventListener('click',  () => calendar.prev());
        document.getElementById('amb-btn-next')?.addEventListener('click',  () => calendar.next());
        document.getElementById('amb-btn-today')?.addEventListener('click', () => calendar.today());

        // ── Grilla estática (tabla resumen de franjas × días) ────────────────
        this.renderGrillaEstatica(grilla);
    }

    renderGrillaEstatica(grilla) {
        // grilla: { "06:00 - 07:00": { Lunes: { ficha, programa, instructor, ... }, ... }, ... }
        const container = document.getElementById('amb-grilla-container');
        if (!container) return;

        const franjas = Object.keys(grilla);
        if (!franjas.length) return;

        const diasOrden = ['Lunes','Martes','Miercoles','Jueves','Viernes','Sabado','Domingo'];

        // Detectar días que tienen al menos una clase
        const diasActivos = diasOrden.filter(dia =>
            franjas.some(f => grilla[f][dia])
        );

        if (!diasActivos.length) return;

        const thead = diasActivos.map(d =>
            `<th class="text-center" style="font-size:0.75rem; min-width:120px;">${d}</th>`
        ).join('');

        const tbody = franjas.map(franja => {
            const celdas = diasActivos.map(dia => {
                const celda = grilla[franja][dia];
                if (!celda) return `<td class="text-center text-muted" style="font-size:0.72rem;">—</td>`;
                return `
                    <td style="font-size:0.72rem; vertical-align:top; padding:0.3rem 0.5rem;">
                        <div class="rounded p-1" style="background:#f0fde8; border-left:3px solid #4caa16;">
                            <div class="fw-bold text-truncate" style="color:#4caa16;">
                                <i class="bi bi-people-fill me-1"></i>${celda.ficha || '—'}
                            </div>
                            <div class="text-truncate text-dark opacity-75">${celda.programa || '—'}</div>
                            <div class="text-truncate" style="color:#555;">
                                <i class="bi bi-person me-1"></i>${celda.instructor || '—'}
                            </div>
                        </div>
                    </td>`;
            }).join('');
            return `
                <tr>
                    <td class="fw-semibold text-muted text-nowrap" style="font-size:0.72rem; background:#f8fafc; padding:0.3rem 0.6rem; border-right:1px solid #e5e7eb;">
                        ${franja}
                    </td>
                    ${celdas}
                </tr>`;
        }).join('');

        container.innerHTML = `
            <details class="mb-3">
                <summary class="fw-semibold text-muted mb-2" style="cursor:pointer; font-size:0.82rem; list-style:none;">
                </summary>
                <div class="table-responsive mt-2 border rounded" style="border-radius:0.5rem!important; overflow:hidden;">
                    <table class="table table-sm table-bordered mb-0 align-middle">
                        <thead class="table-light">
                            <tr>
                                <th style="font-size:0.75rem; min-width:110px; background:#f1f5f9;">Franja</th>
                                ${thead}
                            </tr>
                        </thead>
                        <tbody>${tbody}</tbody>
                    </table>
                </div>
            </details>`;

        container.style.display = '';
    }

    // ─────────────────────────────────────────────────────────────────────────
    // MODAL CRUD AMBIENTE
    // ─────────────────────────────────────────────────────────────────────────

    setupModal() {
        const areaOptions = this.areas.map(a =>
            `<option value="${a.idArea}">${a.nombreArea}</option>`
        ).join('');

        const formContent = `
            <div class="row g-3">
                <div class="col-md-4">
                    ${FormInput({ id: 'codigo', label: 'Código', required: true })}
                </div>
                <div class="col-md-8">
                    ${FormInput({ id: 'descripcion', label: 'Descripción / Nombre', required: true })}
                </div>
                <div class="col-md-4">
                    ${FormInput({ id: 'capacidad', label: 'Capacidad', type: 'number', required: true })}
                </div>
                <div class="col-md-4">
                    ${FormInput({ id: 'bloque', label: 'Bloque (ej. L, D)', required: true })}
                </div>
                <div class="col-md-4">
                    <div class="mb-4 form-floating position-relative">
                        <select class="form-select" id="tipoAmbiente" required style="background-color:#f8fafc; border:1px solid #eeecf5; border-radius:0.6rem;">
                            <option value="">Seleccione tipo...</option>
                            <option value="Bilinguismo">Bilinguismo</option>
                            <option value="Formacion">Formacion</option>
                            <option value="Taller">Taller</option>
                        </select>
                        <label for="tipoAmbiente">Tipo de Ambiente</label>
                    </div>
                </div>
                <div class="col-md-4">
                    <div class="mb-4 form-floating position-relative">
                        <select class="form-select" id="idArea" required style="background-color:#f8fafc; border:1px solid #eeecf5; border-radius:0.6rem;">
                            <option value="">Seleccione área...</option>
                            ${areaOptions}
                        </select>
                        <label for="idArea">Área de Formación</label>
                    </div>
                </div>
                <div class="col-md-4">
                    <div class="mb-4 form-floating position-relative">
                        <select class="form-select" id="estado" required style="background-color:#f8fafc; border:1px solid #eeecf5; border-radius:0.6rem;">
                            <option value="Activo">Activo</option>
                            <option value="Inactivo">Inactivo</option>
                        </select>
                        <label for="estado">Estado</label>
                    </div>
                </div>
            </div>
        `;

        document.getElementById('modal-container').innerHTML = ModalForm({
            id: 'ambiente-modal',
            title: 'Ambiente',
            formContent
        });

        document.getElementById('ambiente-modal-form')
            .addEventListener('submit', this.handleFormSubmit.bind(this));

        this.bsModal = new bootstrap.Modal(document.getElementById('ambiente-modal'));
    }

    injectDynamicModalFields(ambiente = null) {
        document.getElementById('codigo').value       = ambiente ? ambiente.codigo      : '';
        document.getElementById('descripcion').value  = ambiente ? ambiente.descripcion : '';
        document.getElementById('capacidad').value    = ambiente ? ambiente.capacidad   : '';
        document.getElementById('bloque').value       = ambiente ? ambiente.bloque      : '';
        document.getElementById('tipoAmbiente').value = ambiente ? (ambiente.tipoAmbiente || '') : '';
        document.getElementById('estado').value       = ambiente ? (ambiente.estado     || 'Activo') : 'Activo';
        document.getElementById('idArea').value       = ambiente ? (ambiente.idArea     || '') : '';

        document.getElementById('ambiente-modal-form')
            .querySelectorAll('.is-invalid')
            .forEach(el => el.classList.remove('is-invalid'));

        document.getElementById('ambiente-modal-title').textContent =
            ambiente ? 'Editar Ambiente' : 'Nuevo Ambiente';
    }

    openModal(id = null) {
        this.currentEditId = id;
        document.getElementById('ambiente-modal-alert').innerHTML = '';

        const ambiente = id ? this.ambientes.find(a => String(a.idAmbiente) === String(id)) : null;
        this.injectDynamicModalFields(ambiente);
        this.bsModal.show();
    }

    async handleFormSubmit(e) {
        e.preventDefault();
        const form = e.target;
        if (!form.checkValidity()) { form.reportValidity(); return; }

        if (!this.idSede && !this.currentEditId) {
            this.showAlert('page-alert-container', 'danger',
                'No puedes crear un ambiente si no has seleccionado una sede previamente. Ve a Sedes e ingresa a Ambientes desde ahí.');
            this.bsModal.hide();
            return;
        }

        let sedId = this.idSede;
        if (this.currentEditId) {
            const tmp = this.ambientes.find(a => String(a.idAmbiente) === String(this.currentEditId));
            if (tmp) sedId = tmp.idSede;
        }

        const data = {
            codigo:       document.getElementById('codigo').value,
            descripcion:  document.getElementById('descripcion').value,
            capacidad:    parseInt(document.getElementById('capacidad').value),
            bloque:       document.getElementById('bloque').value,
            tipoAmbiente: document.getElementById('tipoAmbiente').value,
            estado:       document.getElementById('estado').value,
            idArea:       parseInt(document.getElementById('idArea').value),
            idSede:       parseInt(sedId)
        };

        setModalLoading('ambiente-modal', true);
        document.getElementById('ambiente-modal-alert').innerHTML = '';

        try {
            if (this.currentEditId) {
                await updateAmbiente(this.currentEditId, data);
            } else {
                await createAmbiente(data);
            }
            this.bsModal.hide();
            const txt = this.currentEditId ? 'actualizado' : 'creado';
            this.showAlert('page-alert-container', 'success', `Ambiente ${txt} correctamente.`);
            await this.loadData();
        } catch (error) {
            let mensaje = "Error puede al guardar El Ambiente"

            if (error.response && error.response.data) {
            const data = error.response.data;

            if (data.errors && data.errors.codigoFicha) {
                mensaje = data.errors.codigoFicha[0];
            } else if (data.message) {
                mensaje = data.message;
            }
        }
            document.getElementById('ambiente-modal-alert').innerHTML = AlertMessage({
                id: 'modal-error', type: 'danger', message: error.message
            });
        } finally {
            setModalLoading('ambiente-modal', false);
        }
    }

    async handleDelete(id) {
        const ambiente = this.ambientes.find(a => String(a.idAmbiente) === String(id));
        if (!ambiente) return;

        const nombre = ambiente.descripcion || ambiente.codigo;
        const confirm = await ConfirmDialog({
            title: '¿Eliminar Ambiente?',
            message: `Vas a eliminar permanentemente el ambiente <strong>${nombre}</strong>. Esta acción no se puede deshacer.`,
            confirmText: 'Sí, eliminar',
            cancelText:  'Cancelar'
        });

        if (confirm) {
            try {
                const prev = [...this.ambientes];
                this.ambientes = this.ambientes.filter(a => String(a.idAmbiente) !== String(id));
                this.renderTable();
                await deleteAmbiente(id);
                this.showAlert('page-alert-container', 'success', 'Ambiente eliminado del sistema.');
            } catch (error) {
                this.showAlert('page-alert-container', 'danger', 'Error al eliminar: ' + error.message);
                await this.loadData();
            }
        }
    }

    showAlert(containerId, type, message) {
        const container = document.getElementById(containerId);
        if (!container) return;
        container.innerHTML = AlertMessage({ id: 'alert-' + Date.now(), type, message });
        if (type === 'success') setTimeout(() => { container.innerHTML = ''; }, 5000);
    }
}

document.addEventListener('DOMContentLoaded', () => {
    new AmbientesPage();
});
