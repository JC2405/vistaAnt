import { ProtectedRoute } from '../components/ProtectedRoute.js';
import { Navbar, initNavbarEvents } from '../components/Navbar.js';
import { Sidebar, initSidebarEvents } from '../components/Sidebar.js';
import { apiFetch, getFichas, getAmbientes, getFuncionarios, getSedes, analizarJuicios } from '../utils/api.js';

async function apiCall(endpoint, method = 'GET', body = null) {
    return apiFetch(endpoint, { method, body: body ? JSON.stringify(body) : undefined });
}

const DIA_ID_MAP = {
    'Lunes': 1, 'Martes': 2, 'Miercoles': 3,
    'Jueves': 4, 'Viernes': 5, 'Sabado': 6, 'Domingo': 7
};

class HorarioFormativa {
    constructor() {
        this.fichas        = [];
        this.ambientes     = [];
        this.instructores  = [];
        this.sedes         = [];
        this.selectedFicha = null;
        this.viewState     = 'fichas';
        this.init();
    }

    async init() {
        new ProtectedRoute();
        this.renderLayout();
        initNavbarEvents();
        initSidebarEvents();
        await this.loadDependencies();
        this.setupEventListeners();
    }

    renderLayout() {
        const currentPath = window.location.pathname;
        document.getElementById('app').innerHTML =
            Sidebar(currentPath) +
            `<div class="main-wrapper">
                ${Navbar()}
                <main class="container-fluid p-4 flex-grow-1" style="background:var(--bg-page);">
                    <div id="page-alert-container"></div>
                    <div class="d-flex align-items-center gap-3 mb-4">
                        <div class="page-icon"><i class="bi bi-calendar-event"></i></div>
                        <div class="flex-grow-1">
                            <h4 class="fw-bold mb-1" style="color:var(--text-dark)">Horario Formativa</h4>
                            <nav aria-label="breadcrumb">
                                <ol class="breadcrumb mb-0" id="nav-breadcrumb">
                                    <li class="breadcrumb-item active">Fichas</li>
                                </ol>
                            </nav>
                        </div>
                    </div>
                    <div id="main-content" class="fade-in"></div>

                    <!-- Modal: Asignar Formacion (Reemplazo del viejo Panel Lateral) -->
                    <div class="modal fade" tabindex="-1" id="modalHorario" aria-hidden="true">
                        <div class="modal-dialog modal-lg modal-dialog-centered">
                            <div class="modal-content border-0 shadow-lg" style="border-radius:1rem; overflow:hidden;">
                                <div class="modal-header text-white p-4"
                                     style="background:linear-gradient(135deg,hsl(280,60%,55%) 0%,var(--primary) 100%);">
                                    <h5 class="modal-title fw-bold d-flex align-items-center gap-2">
                                        <i class="bi bi-calendar-plus"></i> Asignar Formación
                                    </h5>
                                    <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal"></button>
                                </div>
                                <div class="modal-body p-4" style="background:var(--bg-page)">
                                    <form id="form-horario" novalidate>
                                        <div class="mb-4 p-3 bg-white rounded-3 border">
                                            <p class="mb-1 text-muted small fw-semibold text-uppercase">Ficha Seleccionada</p>
                                            <h6 class="mb-0 fw-bold text-primary" id="lbl-ficha-context">...</h6>
                                        </div>
                                        
                                        <div class="row g-4">
                                            <div class="col-md-6 border-end pe-4">
                                                <p class="fw-semibold text-dark mb-2"><i class="bi bi-briefcase me-2 text-muted"></i>1. Detalles de la Formación</p>
                                                <div class="mb-3">
                                                    <label class="form-label small text-muted">Modalidad</label>
                                                    <select class="form-select" id="modalidad_clase" required>
                                                        <option value="presencial">Presencial</option>
                                                        <option value="virtual">Virtual</option>
                                                    </select>
                                                </div>
                                                <div class="mb-3" id="container-sede">
                                                    <label class="form-label small text-muted">Sede</label>
                                                    <select class="form-select" id="idSede" required><option value="">Seleccionar sede...</option></select>
                                                </div>
                                                <div class="mb-3" id="container-ambiente">
                                                    <label class="form-label small text-muted">Ambiente</label>
                                                    <select class="form-select" id="idAmbiente" required><option value="">Seleccionar ambiente...</option></select>
                                                </div>
                                                <div class="mb-3">
                                                    <label class="form-label small text-muted">Instructor</label>
                                                    <select class="form-select" id="idFuncionario" required><option value="">Seleccionar instructor...</option></select>
                                                </div>
                                            </div>
                                            <div class="col-md-6 ps-4">
                                                <p class="fw-semibold text-dark mb-2"><i class="bi bi-calendar-range me-2 text-muted"></i>2. Rango de Fechas</p>
                                                <div class="row g-2 mb-4">
                                                    <div class="col-6"><label class="form-label small text-muted">Inicio</label><input type="date" class="form-control form-control-sm" id="fecha_inicio" required></div>
                                                    <div class="col-6"><label class="form-label small text-muted">Fin</label><input type="date" class="form-control form-control-sm" id="fecha_fin" required></div>
                                                </div>
                                                
                                                <p class="fw-semibold text-dark mb-2"><i class="bi bi-clock-history me-2 text-muted"></i>3. Franja Horaria</p>
                                                <div class="row g-2 mb-4">
                                                    <div class="col-6"><label class="form-label small text-muted">Hora Inicio</label><input type="time" class="form-control form-control-sm" id="hora_inicio" required></div>
                                                    <div class="col-6"><label class="form-label small text-muted">Hora Fin</label><input type="time" class="form-control form-control-sm" id="hora_fin" required></div>
                                                </div>

                                                <div class="mb-4">
                                                    <label class="form-label small text-muted d-block mb-2">4. Días de la semana</label>
                                                    <div class="d-flex flex-wrap gap-2" id="dias-container"></div>
                                                </div>
                                                <div class="mb-3">
                                                    <label class="form-label small text-muted mb-2">Observación (Opcional)</label>
                                                    <textarea class="form-control" id="observacion" rows="1" placeholder="Ej. Bloque práctico..."></textarea>
                                                </div>
                                            </div>
                                        </div>
                                        <div id="modal-alert"></div>
                                    </form>
                                </div>
                                <div class="modal-footer p-3 bg-white border-top d-flex gap-2">
                                    <button type="button" class="btn btn-light flex-grow-1 rounded-3" data-bs-dismiss="modal">Cancelar</button>
                                    <button type="submit" form="form-horario" id="btn-asignar"
                                            class="btn btn-purple flex-grow-1 rounded-3 d-flex justify-content-center align-items-center gap-2">
                                        <i class="bi bi-calendar-check"></i> Asignar
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                    
                    <!-- Modal: Analisis de Juicios Evaluativos -->
                    <div class="modal fade" id="modalAnalisisJuicios" tabindex="-1" aria-hidden="true">
                        <div class="modal-dialog modal-xl modal-dialog-centered modal-dialog-scrollable">
                            <div class="modal-content border-0 shadow-lg" style="border-radius:1rem; overflow:hidden;">
                                <div class="modal-header text-white border-0 px-4 py-3" style="background:linear-gradient(135deg, #198754 0%, #146c43 100%);">
                                    <h5 class="modal-title fw-bold d-flex align-items-center gap-2">
                                        <i class="bi bi-bar-chart-fill"></i> Análisis de Juicios Evaluativos
                                    </h5>
                                    <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal"></button>
                                </div>
                                <div class="modal-body p-4 bg-light" id="body-analisis-juicios">
                                    <!-- Contenido inyectado dinámicamente -->
                                </div>
                            </div>
                        </div>
                    </div>
                    
                </main>
            </div>`;
    }

    async loadDependencies() {
        try {
            const [fData, aData, iData, sData] = await Promise.all([
                getFichas(), getAmbientes(), getFuncionarios(), getSedes()
            ]);

            const allFichas = Array.isArray(fData) ? fData : (fData.data || []);
            // Formativa = activas que NO son titulada
            this.fichas = allFichas.filter(f => {
                const tipo = f.programa?.tipoFormacion?.nombre ?? '';
                return f.estado === 'Activo' && !tipo.toLowerCase().includes('titulada');
            });
            if (!this.fichas.length) this.fichas = allFichas.filter(f => f.estado === 'Activo');

            this.ambientes    = aData.data || (Array.isArray(aData) ? aData : []);
            this.sedes        = sData.data || (Array.isArray(sData) ? sData : []);
            const allFuncs    = iData.data || (Array.isArray(iData) ? iData : []);
            this.instructores = allFuncs.filter(f => f.roles?.some(r => r.nombre === 'Instructor'));
            if (!this.instructores.length) this.instructores = allFuncs;

            this.renderBreadcrumb();
            this.renderContent();
            this.populateSelects();
        } catch (err) {
            this.showAlert('page-alert-container', 'danger', 'Error al cargar datos: ' + err.message);
        }
    }

    populateSelects() {
        this.renderInstructores();
        this.renderSedesSelect();
        const selAmb = document.getElementById('idAmbiente');
        if (selAmb) selAmb.innerHTML = '<option value="">Seleccionar ambiente...</option>';
        const dias = ['Lunes', 'Martes', 'Miercoles', 'Jueves', 'Viernes', 'Sabado', 'Domingo'];
        document.getElementById('dias-container').innerHTML = dias.map((d, i) => {
            const val = i + 1;
            return `<input type="checkbox" class="btn-check" id="dia_${val}" value="${val}" autocomplete="off">
                    <label class="btn btn-outline-primary rounded-pill btn-sm d-flex align-items-center justify-content-center"
                           style="width:40px;height:40px;font-size:0.8rem;" for="dia_${val}">${d.charAt(0)}</label>`;
        }).join('');
    }

    renderInstructores(idAreaPreferida = null) {
        let sorted = [...this.instructores];
        if (idAreaPreferida) {
            sorted.sort((a, b) => {
                const aH = a.areas?.some(ar => String(ar.idArea) === String(idAreaPreferida));
                const bH = b.areas?.some(ar => String(ar.idArea) === String(idAreaPreferida));
                return (aH && !bH) ? -1 : (!aH && bH) ? 1 : 0;
            });
        }
        const sel = document.getElementById('idFuncionario');
        if (!sel) return;
        sel.innerHTML = '<option value="">Seleccionar instructor...</option>' +
            sorted.map(i => {
                const nombre  = i.nombre || 'Sin nombre';
                const areas   = i.areas?.length ? i.areas.map(a => a.nombreArea).join(', ') : 'Sin área';
                const isMatch = idAreaPreferida && i.areas?.some(a => String(a.idArea) === String(idAreaPreferida));
                return `<option value="${i.idFuncionario}">${isMatch ? '★ ' : ''}${nombre} (${areas})</option>`;
            }).join('');
    }

    renderSedesSelect() {
        const sel = document.getElementById('idSede');
        if (!sel) return;
        sel.innerHTML = '<option value="">Seleccionar sede...</option>' +
            this.sedes.map(s => `<option value="${s.idSede}">${s.nombre}</option>`).join('');
    }

    renderAmbientes(idSede) {
    const sel = document.getElementById('idAmbiente');
    if (!sel) return;
    if (!idSede) { sel.innerHTML = '<option value="">Seleccionar ambiente...</option>'; return; }
    const filtered = this.ambientes.filter(a => String(a.idSede) === String(idSede));
    sel.innerHTML = '<option value="">Seleccionar ambiente...</option>' +
        filtered.map(a => {
            // 👇 Agrega esto temporalmente para ver la estructura real
            console.log('Ambiente:', a);
            const numero = a.numero ?? a.numeroAmbiente ?? a.num ?? a.number ?? '?';
            return `<option value="${a.idAmbiente}">Blq ${a.bloque} (${a.area?.nombreArea ?? 'Sin área'})</option>`;
        }).join('');
}

    setupEventListeners() {
        document.getElementById('modalidad_clase')?.addEventListener('change', e => {
            const isVirtual = e.target.value === 'virtual';
            ['container-ambiente', 'container-sede'].forEach(id => {
                const el = document.getElementById(id);
                if (el) { el.style.opacity = isVirtual ? '0.4' : '1'; el.style.pointerEvents = isVirtual ? 'none' : ''; }
            });
            document.getElementById('idAmbiente').required = !isVirtual;
            document.getElementById('idSede').required     = !isVirtual;
            if (isVirtual) {
                document.getElementById('idAmbiente').value = '';
                document.getElementById('idSede').value     = '';
                this.renderInstructores();
            }
        });
        document.getElementById('idSede')?.addEventListener('change', e => {
            this.renderAmbientes(e.target.value);
            document.getElementById('idAmbiente').value = '';
            this.renderInstructores();
        });
        document.getElementById('idAmbiente')?.addEventListener('change', e => {
            const amb = this.ambientes.find(a => String(a.idAmbiente) === String(e.target.value));
            this.renderInstructores(amb?.idArea ?? null);
        });
        document.getElementById('form-horario')?.addEventListener('submit', e => { e.preventDefault(); this.handleSubmit(); });
    }

    renderBreadcrumb() {
        const bc = document.getElementById('nav-breadcrumb');
        if (!bc) return;
        bc.innerHTML = this.viewState === 'fichas'
            ? '<li class="breadcrumb-item active">Fichas</li>'
            : `<li class="breadcrumb-item"><a href="#" id="bc-fichas" class="text-decoration-none">Fichas</a></li>
               ${this.selectedFicha ? `<li class="breadcrumb-item active">Ficha ${this.selectedFicha.codigoFicha}</li>` : ''}`;
        document.getElementById('bc-fichas')?.addEventListener('click', e => { e.preventDefault(); this.setViewState('fichas'); });
    }

    setViewState(state) {
        this.viewState = state;
        if (state === 'fichas') this.selectedFicha = null;
        this.renderBreadcrumb();
        this.renderContent();
    }

    renderContent() {
        const container = document.getElementById('main-content');
        container.innerHTML = '';
        if (this.viewState === 'fichas')  this.renderFichasView(container);
        if (this.viewState === 'horario') this.renderHorarioView(container);
    }

    // ── TABLA DE FICHAS ───────────────────────────────────────────────────────
    renderFichasView(container) {
        if (!this.fichas.length) {
            container.innerHTML = `
                <div class="text-center py-5">
                    <i class="bi bi-people fs-1 text-muted mb-3 d-block opacity-50"></i>
                    <h5 class="fw-bold">Sin Fichas</h5>
                    <p class="text-muted">No se encontraron fichas formativas activas.</p>
                </div>`;
            return;
        }

        const renderRows = (arr) => arr.map(f => {
            const prog         = f.programa?.nombre ?? 'Sin Programa';
            const tieneHorario = f.asignaciones?.length > 0;
            const badgeHorario = tieneHorario
                ? `<span class="badge rounded-pill bg-success bg-opacity-10 text-success border border-success border-opacity-25 px-3 py-2">
                       <i class="bi bi-check-circle-fill me-1"></i>Sí
                   </span>`
                : `<span class="badge rounded-pill bg-secondary bg-opacity-10 text-secondary border border-secondary border-opacity-25 px-3 py-2">
                       <i class="bi bi-x-circle me-1"></i>No
                   </span>`;
            const badgeMod = f.modalidad === 'virtual'
                ? `<span class="badge rounded-pill bg-info bg-opacity-10 text-info border border-info border-opacity-25 px-3 py-2">
                       <i class="bi bi-laptop me-1"></i>Virtual
                   </span>`
                : `<span class="badge rounded-pill bg-primary bg-opacity-10 text-primary border border-primary border-opacity-25 px-3 py-2">
                       <i class="bi bi-person-workspace me-1"></i>Presencial
                   </span>`;
            return `
                <tr class="fila-ficha align-middle" style="cursor:pointer;" data-id="${f.idFicha}">
                    <td class="ps-4 fw-semibold" style="color:var(--text-dark);">Ficha ${f.codigoFicha}</td>
                    <td class="text-muted">${prog}</td>
                    <td>${f.jornada || '—'}</td>
                    <td>${badgeMod}</td>
                    <td>${badgeHorario}</td>
                    <td class="pe-4">
                        <button class="btn btn-sm btn-purple rounded-pill px-3 btn-ver-horario" data-id="${f.idFicha}">
                            <i class="bi bi-calendar-week me-1"></i>Ver horario
                        </button>
                    </td>
                </tr>`;
        }).join('');

        container.innerHTML = `
            <div class="card border-0 shadow-sm rounded-4">
                <div class="card-header bg-white border-0 pt-4 pb-3 px-4 d-flex flex-wrap justify-content-between align-items-center gap-3">
                    <div>
                        <h5 class="fw-bold mb-0" style="color:var(--text-dark);">Fichas Formativas</h5>
                        <small class="text-muted">Selecciona una ficha para ver y editar su horario</small>
                    </div>
                    <div class="input-group" style="max-width:280px;">
                        <span class="input-group-text bg-white border-end-0"><i class="bi bi-search text-muted"></i></span>
                        <input type="text" class="form-control border-start-0 ps-0" id="search-fichas" placeholder="Buscar ficha o programa...">
                    </div>
                </div>
                <div class="card-body p-0">
                    <div class="table-responsive">
                        <table class="table table-hover mb-0">
                            <thead style="background:var(--bg-page);">
                                <tr class="text-muted small text-uppercase" style="font-size:0.75rem;letter-spacing:.04em;">
                                    <th class="ps-4 py-3 fw-semibold">Código</th>
                                    <th class="py-3 fw-semibold">Programa</th>
                                    <th class="py-3 fw-semibold">Jornada</th>
                                    <th class="py-3 fw-semibold">Modalidad</th>
                                    <th class="py-3 fw-semibold">¿Tiene horario?</th>
                                    <th class="pe-4 py-3 fw-semibold"></th>
                                </tr>
                            </thead>
                            <tbody id="fichas-tbody">${renderRows(this.fichas)}</tbody>
                        </table>
                    </div>
                </div>
            </div>`;

        const attachEvents = () => {
            document.querySelectorAll('.btn-ver-horario').forEach(btn => {
                btn.addEventListener('click', e => { e.stopPropagation(); this._goToFicha(btn.dataset.id); });
            });
            document.querySelectorAll('.fila-ficha').forEach(row => {
                row.addEventListener('click', e => {
                    if (e.target.closest('.btn-ver-horario')) return;
                    this._goToFicha(row.dataset.id);
                });
            });
        };

        document.getElementById('search-fichas')?.addEventListener('input', e => {
            const q = e.target.value.toLowerCase();
            const filtered = this.fichas.filter(f =>
                f.codigoFicha.toLowerCase().includes(q) ||
                (f.programa?.nombre ?? '').toLowerCase().includes(q)
            );
            document.getElementById('fichas-tbody').innerHTML = renderRows(filtered);
            attachEvents();
        });

        attachEvents();
    }

    _goToFicha(id) {
        this.selectedFicha = this.fichas.find(f => String(f.idFicha) === String(id));
        this.setViewState('horario');
        this.selectFicha(id);
    }

    // ── VISTA HORARIO ─────────────────────────────────────────────────────────
    renderHorarioView(container) {
        container.innerHTML = `
            <div class="mb-4">
                <button class="btn btn-light rounded-pill border shadow-sm" id="btn-back-fichas">
                    <i class="bi bi-arrow-left me-2"></i>Volver a Fichas
                </button>
            </div>
            <div class="card border-0 shadow-sm rounded-4" id="calendario-card" style="min-height:70vh;">
                <div class="card-body p-5 text-center d-flex flex-column align-items-center justify-content-center text-muted">
                    <div class="spinner-border text-primary mb-3" role="status"></div>
                    <p class="small mb-0">Cargando horario...</p>
                </div>
            </div>`;
        document.getElementById('btn-back-fichas')?.addEventListener('click', () => this.setViewState('fichas'));
    }

    async selectFicha(idFicha) {
        this.selectedFicha = this.fichas.find(f => String(f.idFicha) === String(idFicha));
        if (!this.selectedFicha) return;

        const card = document.getElementById('calendario-card');
        card.innerHTML = `
            <div class="card-body p-5 text-center d-flex flex-column align-items-center justify-content-center">
                <div class="spinner-border text-primary mb-3" role="status"></div>
                <p class="text-muted small">Cargando horario de ${this.selectedFicha.codigoFicha}...</p>
            </div>`;

        document.getElementById('lbl-ficha-context').innerHTML =
            `${this.selectedFicha.codigoFicha}
             <span class="badge bg-light text-dark border fw-normal ms-1">${this.selectedFicha.jornada || ''}</span>`;

        if (this.selectedFicha.fechaInicio) document.getElementById('fecha_inicio').value = this.selectedFicha.fechaInicio;
        if (this.selectedFicha.fechaFin)    document.getElementById('fecha_fin').value    = this.selectedFicha.fechaFin;

        document.getElementById('idSede').value = '';
        this.renderAmbientes('');
        this.renderInstructores();

        try {
            const data = await apiCall('/horariosPorFicha/' + idFicha);
            this.renderGrid(this.selectedFicha, data.grilla || {});
        } catch (err) {
            card.innerHTML = `
                <div class="card-body p-5 text-center text-danger">
                    <i class="bi bi-exclamation-triangle fs-1 mb-3 d-block opacity-50"></i>
                    <p>${err.message}</p>
                </div>`;
        }
    }

    renderGrid(ficha, grilla) {
        const card    = document.getElementById('calendario-card');
        const isEmpty = !Object.keys(grilla).length;

        const header = `
            <div class="card-header bg-white border-0 d-flex flex-wrap justify-content-between align-items-center pt-4 pb-2 px-4 gap-3">
                <div>
                    <h5 class="fw-bold mb-0" style="color:var(--text-dark)">Ficha ${ficha.codigoFicha}</h5>
                    <p class="small mb-0" style="color:var(--text-muted)">${ficha.programa?.nombre ?? ''}</p>
                </div>
                <div class="d-flex gap-2">
                    <button class="btn btn-outline-success rounded-pill px-4 d-flex align-items-center gap-2 shadow-sm" id="btn-juicios-evaluativos" title="Analizar Excel de Juicios Evaluativos">
                        <i class="bi bi-file-earmark-excel"></i><span>Analizar Juicios</span>
                    </button>
                    <button class="btn btn-purple rounded-pill px-4 d-flex align-items-center gap-2 shadow-sm"
                            data-bs-toggle="modal" data-bs-target="#modalHorario">
                        <i class="bi bi-plus-lg"></i><span>Agregar Formación</span>
                    </button>
                </div>
            </div>
            <!-- INPUT OCULTO PARA SUBIR EL EXCEL DEL SENA -->
            <input type="file" id="file-juicios" accept=".xlsx, .xls" class="d-none">`;

        if (isEmpty) {
            card.innerHTML = header + `
                <div class="card-body p-5 text-center text-muted d-flex flex-column align-items-center justify-content-center" style="min-height:400px;">
                    <i class="bi bi-calendar-x fs-1 d-block mb-3 opacity-25"></i>
                    <p class="fw-medium">Sin clases asignadas</p>
                    <p class="small">Usa "Agregar Formacion" para comenzar.</p>
                </div>`;
            return;
        }

        card.innerHTML = header +
            `<div class="card-body pt-0 px-4 pb-4" style="height:600px;">
                <div id="fullcalendar-container" class="h-100"></div>
             </div>`;

        const dayMap = {
            'Lunes': '2024-01-01', 'Martes': '2024-01-02', 'Miercoles': '2024-01-03',
            'Jueves': '2024-01-04', 'Viernes': '2024-01-05', 'Sabado': '2024-01-06', 'Domingo': '2024-01-07'
        };

        const groupedEvents = {};
        for (const [franja, diasMap] of Object.entries(grilla)) {
            const [startStr, endStr] = franja.split(' - ');
            for (const [dia, celda] of Object.entries(diasMap)) {
                if (!celda) continue;
                const key = `${celda.idBloque}_${dia}`;
                if (!groupedEvents[key]) {
                    const isVirtual = celda.modalidad === 'virtual';
                    groupedEvents[key] = {
                        id: key,
                        dateStr:         dayMap[dia],
                        startHour:       startStr,
                        endHour:         endStr,
                        backgroundColor: isVirtual ? 'rgba(13,202,240,0.1)' : 'rgba(126,87,194,0.1)',
                        borderColor:     isVirtual ? '#0dcaf0'              : '#7e57c2',
                        textColor:       isVirtual ? '#0dcaf0'              : '#7e57c2',
                        extendedProps: {
                            instructor:      celda.instructor,
                            ambiente:        celda.ambiente,
                            modalidad:       celda.modalidad,
                            tipoDeFormacion: celda.tipoDeFormacion,
                            // ✅ camelCase del backend
                            fechaInicio:     celda.fechaInicio,
                            fechaFin:        celda.fechaFin,
                            idBloque:        celda.idBloque,
                            idDia:           DIA_ID_MAP[dia] ?? null,
                            nombreDia:       dia,
                            idAsignacion:    celda.idAsignacion,
                        }
                    };
                } else {
                    if (endStr > groupedEvents[key].endHour) groupedEvents[key].endHour = endStr;
                }
            }
        }

        const events = Object.values(groupedEvents).map(g => ({
            id:              g.id,
            start:           `${g.dateStr}T${g.startHour}:00`,
            end:             `${g.dateStr}T${g.endHour}:00`,
            backgroundColor: g.backgroundColor,
            borderColor:     g.borderColor,
            textColor:       g.textColor,
            extendedProps:   g.extendedProps,
        }));

        const calendarEl = document.getElementById('fullcalendar-container');
        const calendar   = new FullCalendar.Calendar(calendarEl, {
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
                    ? `<div class="mt-auto pt-1"><span class="badge bg-secondary bg-opacity-25 text-dark" style="font-size:0.65rem;">${p.tipoDeFormacion}</span></div>`
                    : '';
                return {
                    html: `
                        <div class="p-1 h-100 d-flex flex-column position-relative" style="overflow:hidden;">
                            <div class="fw-bold mb-1 lh-sm" style="font-size:0.8rem;">${p.instructor}</div>
                            <div class="text-truncate" style="font-size:0.75rem;opacity:0.9;">
                                <i class="bi ${icon}"></i> ${p.ambiente || 'Virtual'}
                            </div>
                            <div class="mt-1 pb-1" style="font-size:0.65rem;opacity:0.85;border-bottom:1px dashed rgba(0,0,0,0.1);">
                                <i class="bi bi-calendar3 me-1"></i>${p.fechaInicio} → ${p.fechaFin}
                            </div>
                            ${badge}
                            <button class="btn btn-sm text-danger p-0 position-absolute top-0 end-0 delete-btn d-none"
                                    data-idbloque="${p.idBloque}" data-iddia="${p.idDia}"
                                    data-nombredia="${p.nombreDia}" data-idasignacion="${p.idAsignacion}"
                                    style="line-height:1;transform:translate(25%,-25%);background:white;border-radius:50%;box-shadow:0 0 3px rgba(0,0,0,0.2);">
                                <i class="bi bi-x-circle-fill"></i>
                            </button>
                        </div>`
                };
            },
            eventMouseEnter: info => info.el.querySelector('.delete-btn')?.classList.remove('d-none'),
            eventMouseLeave: info => info.el.querySelector('.delete-btn')?.classList.add('d-none'),
        });

        calendar.render();

        calendarEl.addEventListener('click', e => {
            const btn = e.target.closest('.delete-btn');
            if (!btn) return;
            e.stopPropagation();
            this.eliminarDiaDeBloque(
                parseInt(btn.dataset.idbloque), parseInt(btn.dataset.iddia),
                btn.dataset.nombredia, parseInt(btn.dataset.idasignacion)
            );
        });

        this.initJuiciosEvents();
    }

    async eliminarDiaDeBloque(idBloque, idDia, nombreDia, idAsignacion) {
        const result = await Swal.fire({
            title: `¿Eliminar el día ${nombreDia}?`,
            text: 'Se eliminará este día del bloque horario.',
            icon: 'warning', showCancelButton: true,
            confirmButtonColor: '#d33', cancelButtonColor: '#3085d6',
            confirmButtonText: 'Sí, eliminar', cancelButtonText: 'Cancelar'
        });
        if (!result.isConfirmed) return;

        try {
            await apiCall(`/eliminarDiaDeBloque/${idBloque}/${idDia}`, 'DELETE');
            this.showAlert('page-alert-container', 'success', `Día ${nombreDia} eliminado correctamente.`);
            this.selectFicha(this.selectedFicha.idFicha);
        } catch (err) {
            const msg = err.message || '';
            if (msg.includes('ULTIMO_DIA') || msg.toLowerCase().includes('único')) {
                const r2 = await Swal.fire({
                    title: 'Último día del bloque',
                    text: 'Este es el único día. Si lo eliminas se eliminará toda la asignación. ¿Continuar?',
                    icon: 'warning', showCancelButton: true,
                    confirmButtonColor: '#d33', cancelButtonColor: '#3085d6',
                    confirmButtonText: 'Sí, eliminar todo', cancelButtonText: 'Cancelar'
                });
                if (r2.isConfirmed) this.deleteAsignacion(idAsignacion, true);
            } else {
                this.showAlert('page-alert-container', 'danger', 'Error: ' + msg);
            }
        }
    }
    
    // ==========================================
    // JS Logic for Analizar Juicios Evaluativos
    // ==========================================
    initJuiciosEvents() {
        const btnJuicios = document.getElementById('btn-juicios-evaluativos');
        const fileInput = document.getElementById('file-juicios');
        
        if (btnJuicios && fileInput) {
            // Remove previous event listeners
            const elClone = fileInput.cloneNode(true);
            fileInput.parentNode.replaceChild(elClone, fileInput);
            
            btnJuicios.addEventListener('click', () => elClone.click());
            
            elClone.addEventListener('change', async (e) => {
                const file = e.target.files[0];
                if (!file) return;
                
                try {
                    this.showAlert('page-alert-container', 'info', 'Analizando archivo de juicios...');
                    const data = await analizarJuicios(file);
                    this.renderAnalisisJuicios(data);
                    
                } catch (err) {
                    this.showAlert('page-alert-container', 'danger', 'Error al analizar: ' + err.message);
                } finally {
                    e.target.value = ''; // Reset
                }
            });
        }
    }

    renderAnalisisJuicios(data) {
        let html = '';
        
        // Metadata & Summary Cards
        html += `
            <div class="row g-3 mb-4">
                <div class="col-md-4">
                    <div class="card border-0 bg-success text-white shadow-sm h-100">
                        <div class="card-body">
                            <h6 class="card-title fw-bold mb-1 opacity-75">Competencias Cubiertas</h6>
                            <h2 class="mb-0 fw-bold">${data.resumen?.competencias_cubiertas || 0}</h2>
                            <small>Alumnos superan el ${data.umbral_usado}% umbral de juicio Aprobado</small>
                        </div>
                    </div>
                </div>
                <div class="col-md-4">
                    <div class="card border-0 bg-danger text-white shadow-sm h-100">
                        <div class="card-body">
                            <h6 class="card-title fw-bold mb-1 opacity-75">Faltan por Horario</h6>
                            <h2 class="mb-0 fw-bold">${data.resumen?.competencias_necesitan_horario || 0}</h2>
                            <small>Competencias donde hay fallos / estudiantes pendientes</small>
                        </div>
                    </div>
                </div>
                <div class="col-md-4">
                    <div class="card border-0 border-start border-primary border-4 shadow-sm h-100 bg-white">
                        <div class="card-body">
                            <h6 class="card-title text-muted fw-bold mb-1">Total Aprendices</h6>
                            <h2 class="mb-0 fw-bold text-dark">${data.total_aprendices || 0}</h2>
                        </div>
                    </div>
                </div>
            </div>
        `;
        
        // Competencias table
        html += `<div class="accordion" id="accordionJuicios">`;
        
        if (data.competencias && data.competencias.length > 0) {
            data.competencias.forEach((comp, idx) => {
                const isPendiente = comp.estado === 'PENDIENTE';
                const badgeComp = isPendiente 
                    ? `<span class="badge bg-danger rounded-pill">Falta Horario / Evaluacion</span>` 
                    : `<span class="badge bg-success rounded-pill">Cubierto</span>`;
                
                const tableRows = comp.resultados.map(res => {
                    const rowClass = res.necesita_horario ? 'table-warning' : '';
                    const badgeRes = res.necesita_horario 
                        ? `<span class="badge bg-warning text-dark"><i class="bi bi-clock"></i> Pendiente</span>`
                        : `<span class="badge bg-success"><i class="bi bi-check"></i> Superado</span>`;
                        
                    return `
                        <tr class="${rowClass}">
                            <td><small>${res.nombre_completo}</small></td>
                            <td class="text-center">${res.aprobados}</td>
                            <td class="text-center">${res.total_con_juicio}</td>
                            <td class="text-center"><strong>${res.porcentaje_aprobacion}%</strong></td>
                            <td class="text-center">${badgeRes}</td>
                        </tr>
                    `;
                }).join('');
                
                html += `
                    <div class="accordion-item mb-2 border rounded-3 shadow-sm" style="overflow:hidden;">
                        <h2 class="accordion-header" id="heading-${idx}">
                            <button class="accordion-button ${isPendiente ? '' : 'collapsed'} d-flex justify-content-between" type="button" data-bs-toggle="collapse" data-bs-target="#collapse-${idx}">
                                <div class="d-flex w-100 justify-content-between me-3">
                                    <span class="fw-semibold text-truncate" style="max-width:400px;">${comp.nombre_completo}</span>
                                    <span>${badgeComp}</span>
                                </div>
                            </button>
                        </h2>
                        <div id="collapse-${idx}" class="accordion-collapse collapse ${isPendiente ? 'show' : ''}" data-bs-parent="#accordionJuicios">
                            <div class="accordion-body p-0">
                                <table class="table table-sm table-striped m-0" style="font-size:0.85rem;">
                                    <thead class="bg-light">
                                        <tr>
                                            <th>Resultado</th>
                                            <th class="text-center" width="10%">Aprobados</th>
                                            <th class="text-center" width="10%">Evaluados</th>
                                            <th class="text-center" width="15%">% Aprobación</th>
                                            <th class="text-center" width="15%">Estado</th>
                                        </tr>
                                    </thead>
                                    <tbody>${tableRows}</tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                `;
            });
        }
        
        html += `</div>`;
        document.getElementById('body-analisis-juicios').innerHTML = html;
        bootstrap.Modal.getOrCreateInstance(document.getElementById('modalAnalisisJuicios')).show();
    }

    async deleteAsignacion(id, skipConfirm = false) {
        if (!skipConfirm && !confirm('¿Eliminar esta clase del horario por completo?')) return;
        try {
            await apiCall('/eliminarAsignacion/' + id, 'DELETE');
            this.showAlert('page-alert-container', 'success', 'Clase eliminada correctamente.');
            this.selectFicha(this.selectedFicha.idFicha);
        } catch (err) {
            this.showAlert('page-alert-container', 'danger', 'Error al eliminar: ' + err.message);
        }
    }

    async handleSubmit() {
        const dias = Array.from(document.querySelectorAll('#dias-container .btn-check:checked'))
            .map(c => parseInt(c.value));
        if (!dias.length) {
            this.showAlert('modal-alert', 'warning', 'Selecciona al menos un día de la semana.');
            return;
        }

        const modalidad  = document.getElementById('modalidad_clase').value;
        const idAmbiente = parseInt(document.getElementById('idAmbiente').value);
        if (modalidad === 'presencial' && !idAmbiente) {
            this.showAlert('modal-alert', 'warning', 'Selecciona un ambiente para la modalidad presencial.');
            return;
        }

        const btn = document.getElementById('btn-asignar');
        btn.disabled = true;
        btn.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span>Guardando...';

        try {
            await apiCall('/crearAsignacion', 'POST', {
                // ✅ camelCase alineado al AsignacionService
                horaInicio:      document.getElementById('hora_inicio').value + ':00',
                horaFin:         document.getElementById('hora_fin').value   + ':00',
                modalidad,
                tipoDeFormacion: 'Formativa',
                idFuncionario:   parseInt(document.getElementById('idFuncionario').value),
                dias,
                idAmbiente:      modalidad === 'presencial' ? idAmbiente : null,
                idFicha:         this.selectedFicha.idFicha,
                fechaInicio:     document.getElementById('fecha_inicio').value,
                fechaFin:        document.getElementById('fecha_fin').value,
                observaciones:   document.getElementById('observacion')?.value || null,
                estado:          'activo',
            });

            bootstrap.Modal.getInstance(document.getElementById('modalHorario'))?.hide();
            document.getElementById('form-horario').reset();
            document.getElementById('modal-alert').innerHTML = '';
            this.showAlert('page-alert-container', 'success', 'Clase asignada correctamente al horario.');
            this.selectFicha(this.selectedFicha.idFicha);
        } catch (err) {
            let msg = err.message;
            if (msg.toLowerCase().includes('conflicto'))
                msg = '<i class="bi bi-exclamation-triangle-fill me-2"></i>' + msg;
            this.showAlert('modal-alert', 'danger', msg);
        } finally {
            btn.disabled = false;
            btn.innerHTML = '<i class="bi bi-calendar-check"></i> Asignar';
        }
    }

    showAlert(containerId, type, message) {
        const el = document.getElementById(containerId);
        if (!el) return;
        const icons = { success: 'check-circle', danger: 'x-circle', warning: 'exclamation-triangle', info: 'info-circle' };
        el.innerHTML = `
            <div class="alert alert-${type} alert-dismissible fade show d-flex align-items-center gap-3 rounded-4 shadow-sm" role="alert">
                <i class="bi bi-${icons[type] ?? 'info-circle'} fs-5 flex-shrink-0"></i>
                <div>${message}</div>
                <button type="button" class="btn-close ms-auto" data-bs-dismiss="alert"></button>
            </div>`;
        if (type === 'success') setTimeout(() => el.querySelector('.alert')?.remove(), 4000);
    }
}

document.addEventListener('DOMContentLoaded', () => { new HorarioFormativa(); });