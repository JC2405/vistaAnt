import { ProtectedRoute } from '../components/ProtectedRoute.js';
import { Navbar, initNavbarEvents } from '../components/Navbar.js';
import { Sidebar, initSidebarEvents } from '../components/Sidebar.js';
import { apiFetch, getFichas, getAmbientes, getFuncionarios, getSedes, analizarJuiciosConFicha } from '../utils/api.js';

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

                    <!-- Modal: Asignar Formacion -->
                    <div class="modal fade" tabindex="-1" id="modalHorario" aria-hidden="true">
                        <div class="modal-dialog modal-lg modal-dialog-centered">
                            <div class="modal-content border-0 shadow-lg" style="border-radius:1rem; overflow:hidden;">
                                <div class="modal-header text-white py-3 px-4"
                                     style="background:linear-gradient(135deg,hsl(280,60%,55%) 0%,var(--primary) 100%);">
                                    <h5 class="modal-title fw-bold d-flex align-items-center gap-2">
                                        <i class="bi bi-calendar-plus"></i> Asignar Formación
                                    </h5>
                                    <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal"></button>
                                </div>
                                <style>
                                    #modalHorario .view-slide { display: none; }
                                    #modalHorario .view-slide.active { display: block; animation: slideIn 0.18s ease; }
                                    @keyframes slideIn { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: translateY(0); } }
                                </style>

                                <!-- VISTA 1: Formulario principal -->
                                <div class="view-slide active" id="view-horario-form">
                                    <div class="modal-body p-3" style="background:var(--bg-page)">
                                        <form id="form-horario" novalidate>
                                            <div class="mb-3 p-2 bg-white rounded-3 border d-flex align-items-center gap-3">
                                                <i class="bi bi-card-text text-primary fs-5"></i>
                                                <div>
                                                    <p class="mb-0 text-muted" style="font-size:0.72rem; font-weight:600; text-transform:uppercase; letter-spacing:.04em;">Ficha Seleccionada</p>
                                                    <h6 class="mb-0 fw-bold text-primary" id="lbl-ficha-context" style="font-size:0.95rem;">...</h6>
                                                </div>
                                            </div>

                                            <div class="row g-3">
                                                <div class="col-md-6 border-end pe-3">
                                                    <p class="fw-semibold text-dark mb-2" style="font-size:0.82rem;"><i class="bi bi-briefcase me-2 text-muted"></i>1. Detalles</p>
                                                    <div class="mb-2">
                                                        <label class="form-label small text-muted mb-1">Modalidad</label>
                                                        <select class="form-select form-select-sm" id="modalidad_clase" required>
                                                            <option value="presencial">Presencial</option>
                                                            <option value="virtual">Virtual</option>
                                                        </select>
                                                    </div>
                                                    <div class="mb-2" id="container-sede">
                                                        <label class="form-label small text-muted mb-1">Sede</label>
                                                        <select class="form-select form-select-sm" id="idSede" required><option value="">Seleccionar sede...</option></select>
                                                    </div>
                                                    <div class="mb-2" id="container-ambiente">
                                                        <label class="form-label small text-muted mb-1">Ambiente</label>
                                                        <select class="form-select form-select-sm" id="idAmbiente" required><option value="">Seleccionar ambiente...</option></select>
                                                    </div>
                                                    <div class="mb-2">
                                                        <label class="form-label small text-muted mb-1">Instructor</label>
                                                        <div class="input-group input-group-sm" id="btn-select-instructor" style="cursor:pointer; border-radius:0.4rem; overflow:hidden; border:1px solid #d1d5db;">
                                                            <input type="text" class="form-control border-0" id="instructorNombreDisplay" placeholder="Clic para buscar instructor..." readonly style="cursor:pointer; background:#fff; font-size:0.82rem;" required>
                                                            <input type="hidden" id="idFuncionario" required>
                                                            <button class="btn border-0 px-2" type="button" style="pointer-events:none; background:#fff;">
                                                                <i class="bi bi-search text-primary" style="font-size:0.8rem;"></i>
                                                            </button>
                                                        </div>
                                                    </div>
                                                </div>
                                                <div class="col-md-6 ps-3">
                                                    <p class="fw-semibold text-dark mb-2" style="font-size:0.82rem;"><i class="bi bi-calendar-range me-2 text-muted"></i>2. Fechas y Horario</p>
                                                    <div class="row g-2 mb-2">
                                                        <div class="col-6"><label class="form-label small text-muted mb-1">Inicio</label><input type="date" class="form-control form-control-sm" id="fecha_inicio" required></div>
                                                        <div class="col-6"><label class="form-label small text-muted mb-1">Fin</label><input type="date" class="form-control form-control-sm" id="fecha_fin" required></div>
                                                    </div>
                                                    <div class="row g-2 mb-2">
                                                        <div class="col-6"><label class="form-label small text-muted mb-1">Hora Inicio</label><input type="time" class="form-control form-control-sm" id="hora_inicio" required></div>
                                                        <div class="col-6"><label class="form-label small text-muted mb-1">Hora Fin</label><input type="time" class="form-control form-control-sm" id="hora_fin" required></div>
                                                    </div>
                                                    <div class="mb-2">
                                                        <label class="form-label small text-muted mb-1">Días de la semana</label>
                                                        <div class="d-flex flex-wrap gap-1" id="dias-container"></div>
                                                    </div>
                                                    <div>
                                                        <label class="form-label small text-muted mb-1">Observación (Opcional)</label>
                                                        <textarea class="form-control form-control-sm" id="observacion" rows="1" placeholder="Ej. Bloque práctico..."></textarea>
                                                    </div>
                                                </div>
                                            </div>
                                            <div id="modal-alert" class="mt-2"></div>
                                        </form>
                                    </div>
                                    <div class="modal-footer py-2 px-3 bg-white border-top d-flex gap-2">
                                        <button type="button" class="btn btn-light flex-grow-1 rounded-3 btn-sm" data-bs-dismiss="modal">Cancelar</button>
                                        <button type="submit" form="form-horario" id="btn-asignar"
                                                class="btn btn-purple flex-grow-1 rounded-3 btn-sm d-flex justify-content-center align-items-center gap-2">
                                            <i class="bi bi-calendar-check"></i> Asignar
                                        </button>
                                    </div>
                                </div><!-- /VISTA 1 -->

                                <!-- VISTA 2: Selector de Instructor -->
                                <div class="view-slide" id="view-instructor-search">
                                    <div class="modal-body p-3" style="background:var(--bg-page)">
                                        <div class="d-flex align-items-center gap-2 mb-3 pb-2 border-bottom">
                                            <button type="button" class="btn btn-light btn-sm px-3 rounded-pill shadow-sm d-flex align-items-center gap-1" id="btn-back-to-form-instructor">
                                                <i class="bi bi-arrow-left"></i> Volver
                                            </button>
                                            <h6 class="mb-0 fw-bold text-dark ms-1"><i class="bi bi-person-bounding-box text-primary me-1"></i> Buscar Instructor</h6>
                                        </div>
                                        <div class="mb-2">
                                            <div class="input-group input-group-sm shadow-sm" style="border-radius:0.4rem; overflow:hidden; border:1px solid #d1d5db;">
                                                <span class="input-group-text bg-white border-0"><i class="bi bi-search text-muted"></i></span>
                                                <input type="text" class="form-control border-0" id="search-instructor-input" placeholder="Buscar por nombre o área..." autocomplete="off">
                                            </div>
                                        </div>
                                        <div class="table-responsive bg-white shadow-sm border" style="border-radius:0.4rem; max-height:380px; overflow-y:auto;">
                                            <table class="table table-hover table-sm align-middle mb-0">
                                                <thead class="table-light text-secondary sticky-top" style="z-index:10; font-size:0.78rem;">
                                                    <tr>
                                                        <th>INSTRUCTOR</th>
                                                        <th>ÁREA</th>
                                                        <th class="text-end">ACCIÓN</th>
                                                    </tr>
                                                </thead>
                                                <tbody id="instructores-list-body"></tbody>
                                            </table>
                                            <div id="instructores-empty-state" class="text-center py-4 d-none text-muted" style="font-size:0.85rem;">
                                                <i class="bi bi-person-x fs-3 d-block mb-1 opacity-50"></i>
                                                No se encontraron instructores.
                                            </div>
                                        </div>
                                    </div>
                                </div><!-- /VISTA 2 -->

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

    renderInstructores(idAreaPreferida = null, query = '') {
        const tbody = document.getElementById('instructores-list-body');
        const emptyState = document.getElementById('instructores-empty-state');
        if (!tbody) return;

        let sorted = [...this.instructores];
        
        // Filtrar por query
        const q = query.toLowerCase().trim();
        if (q) {
            sorted = sorted.filter(i => {
                const nombre = (i.nombre || '').toLowerCase();
                const areas = i.areas?.map(a => (a.nombreArea || '').toLowerCase()).join(' ') || '';
                return nombre.includes(q) || areas.includes(q);
            });
        }

        // Ordenar por área preferida
        if (idAreaPreferida) {
            sorted.sort((a, b) => {
                const aH = a.areas?.some(ar => String(ar.idArea) === String(idAreaPreferida));
                const bH = b.areas?.some(ar => String(ar.idArea) === String(idAreaPreferida));
                return (aH && !bH) ? -1 : (!aH && bH) ? 1 : 0;
            });
        }

        if (sorted.length === 0) {
            tbody.innerHTML = '';
            emptyState.classList.remove('d-none');
        } else {
            emptyState.classList.add('d-none');
            tbody.innerHTML = sorted.map(i => {
                const nombre  = i.nombre || 'Sin nombre';
                const areas   = i.areas?.length ? i.areas.map(a => a.nombreArea).join(', ') : 'Sin área';
                const isMatch = idAreaPreferida && i.areas?.some(a => String(a.idArea) === String(idAreaPreferida));
                
                return `
                    <tr class="align-middle" style="cursor: pointer;">
                        <td class="fw-bold text-dark" style="font-size: 0.9rem;">
                            ${isMatch ? '<i class="bi bi-star-fill text-warning me-1" title="Área Recomendada"></i>' : ''}
                            ${nombre}
                        </td>
                        <td style="font-size: 0.85rem;"><span class="badge bg-light text-dark border">${areas}</span></td>
                        <td class="text-end">
                            <button type="button" class="btn btn-sm btn-primary btn-select-inst px-3 shadow-sm" style="border-radius: 0.4rem;"
                                data-id="${i.idFuncionario}" 
                                data-nombre="${nombre.replace(/"/g, '&quot;')}">
                                Seleccionar
                            </button>
                        </td>
                    </tr>
                `;
            }).join('');
        }
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
        document.getElementById('btn-select-instructor')?.addEventListener('click', () => {
            document.getElementById('search-instructor-input').value = '';
            const idAmbiente = document.getElementById('idAmbiente')?.value;
            const amb = this.ambientes.find(a => String(a.idAmbiente) === String(idAmbiente));
            this.renderInstructores(amb?.idArea ?? null);

            document.getElementById('view-horario-form').classList.remove('active');
            document.getElementById('view-instructor-search').classList.add('active');
            setTimeout(() => document.getElementById('search-instructor-input').focus(), 200);
        });

        document.getElementById('btn-back-to-form-instructor')?.addEventListener('click', () => {
            document.getElementById('view-instructor-search').classList.remove('active');
            document.getElementById('view-horario-form').classList.add('active');
        });

        document.getElementById('search-instructor-input')?.addEventListener('input', (e) => {
            const idAmbiente = document.getElementById('idAmbiente')?.value;
            const amb = this.ambientes.find(a => String(a.idAmbiente) === String(idAmbiente));
            this.renderInstructores(amb?.idArea ?? null, e.target.value);
        });

        document.getElementById('instructores-list-body')?.addEventListener('click', (e) => {
            const btn = e.target.closest('.btn-select-inst');
            if (btn) {
                document.getElementById('idFuncionario').value = btn.dataset.id;
                document.getElementById('instructorNombreDisplay').value = btn.dataset.nombre;
                
                document.getElementById('view-instructor-search').classList.remove('active');
                document.getElementById('view-horario-form').classList.add('active');
            }
        });
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
        document.getElementById('idFuncionario').value = '';
        const insDisplay = document.getElementById('instructorNombreDisplay');
        if (insDisplay) insDisplay.value = '';

        // Reset views
        document.querySelectorAll('.view-slide').forEach(s => s.classList.remove('active'));
        const mainView = document.getElementById('view-horario-form');
        if (mainView) mainView.classList.add('active');

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
        const fileInput  = document.getElementById('file-juicios');

        if (!btnJuicios || !fileInput) return;

        // Clonar para evitar listeners acumulados entre renders
        const elClone = fileInput.cloneNode(true);
        fileInput.parentNode.replaceChild(elClone, fileInput);

        btnJuicios.addEventListener('click', () => elClone.click());

        elClone.addEventListener('change', async (e) => {
            const file = e.target.files[0];
            if (!file) return;

            // Necesitamos la ficha actualmente seleccionada para cruzar con BD
            const idFicha = this.selectedFicha?.idFicha;
            if (!idFicha) {
                this.showAlert('page-alert-container', 'warning', 'Selecciona primero una ficha para analizar los juicios.');
                e.target.value = '';
                return;
            }

            try {
                this.showAlert('page-alert-container', 'info',
                    `Analizando juicios vs competencias de la ficha ${this.selectedFicha.codigoFicha}...`);
                // Llamamos al endpoint que cruza Excel + BD (competencias y resultados)
                const data = await analizarJuiciosConFicha(file, idFicha);
                this.renderAnalisisJuicios(data);
            } catch (err) {
                this.showAlert('page-alert-container', 'danger', 'Error al analizar: ' + err.message);
            } finally {
                e.target.value = '';
            }
        });
    }

    renderAnalisisJuicios(data) {
        // data viene de ReporteCompetenciasService:
        // { ok, ficha, programa, tipo_formacion, total_aprendices, umbral_usado,
        //   total_competencias_bd, total_pendientes, total_cubiertas,
        //   competencias_pendientes: [...], competencias_cubiertas: [...] }

        const pendientes = data.competencias_pendientes || [];
        const cubiertas  = data.competencias_cubiertas  || [];
        const umbral     = data.umbral_usado ?? 80;

        // ── Tarjetas de resumen ───────────────────────────────────────────────
        let html = `
            <div class="alert alert-light border mb-3 py-2 px-3" style="font-size:0.85rem;">
                <i class="bi bi-info-circle me-1 text-primary"></i>
                <strong>Ficha:</strong> ${data.ficha || '—'}
                &nbsp;·&nbsp;
                <strong>Programa:</strong> ${data.programa || '—'}
                &nbsp;·&nbsp;
                <strong>Tipo Formación:</strong> ${data.tipo_formacion || '—'}
            </div>
            <div class="row g-3 mb-4">
                <div class="col-md-4">
                    <div class="card border-0 bg-danger text-white shadow-sm h-100">
                        <div class="card-body">
                            <h6 class="card-title fw-bold mb-1 opacity-75">Pendientes (falta horario)</h6>
                            <h2 class="mb-0 fw-bold">${pendientes.length}</h2>
                            <small>Competencias con resultados por debajo del ${umbral}%</small>
                        </div>
                    </div>
                </div>
                <div class="col-md-4">
                    <div class="card border-0 bg-success text-white shadow-sm h-100">
                        <div class="card-body">
                            <h6 class="card-title fw-bold mb-1 opacity-75">Cubiertas</h6>
                            <h2 class="mb-0 fw-bold">${cubiertas.length}</h2>
                            <small>Competencias que superan el umbral de aprobación</small>
                        </div>
                    </div>
                </div>
                <div class="col-md-4">
                    <div class="card border-0 bg-white border-start border-primary border-4 shadow-sm h-100">
                        <div class="card-body">
                            <h6 class="card-title text-muted fw-bold mb-1">Total Aprendices</h6>
                            <h2 class="mb-0 fw-bold text-dark">${data.total_aprendices || 0}</h2>
                            <small class="text-muted">Umbral: ${umbral}%</small>
                        </div>
                    </div>
                </div>
            </div>`;

        // ── Función helper de filas de resultados ─────────────────────────────
        const filaResultado = (res) => {
            const estado    = res.estado ?? (res.necesita_horario ? 'pendiente' : 'evaluado');
            const rowClass  = estado === 'sin_datos' ? 'table-secondary'
                            : estado === 'pendiente' ? 'table-warning' : '';
            const badge = estado === 'evaluado'
                ? `<span class="badge bg-success"><i class="bi bi-check"></i> Evaluado</span>`
                : estado === 'pendiente'
                ? `<span class="badge bg-warning text-dark"><i class="bi bi-clock"></i> Pendiente</span>`
                : `<span class="badge bg-secondary"><i class="bi bi-dash"></i> Sin datos</span>`;
            const pct      = res.porcentaje_aprobacion ?? res.porcentaje ?? 0;
            const aprobados = res.aprobados ?? 0;
            const totalJuicio = res.total_con_juicio ?? 0;
            const nombre    = res.nombre || res.nombre_completo || res.codigo || '—';
            return `
                <tr class="${rowClass}">
                    <td><small>${nombre}</small></td>
                    <td class="text-center">${aprobados}</td>
                    <td class="text-center">${totalJuicio}</td>
                    <td class="text-center"><strong>${pct}%</strong></td>
                    <td class="text-center">${badge}</td>
                </tr>`;
        };

        // ── Helper para renderizar un bloque de competencias ──────────────────
        const bloqueCompetencias = (lista, tipo) => {
            if (!lista.length) {
                return `<p class="text-muted fst-italic text-center py-3">Ninguna competencia ${tipo === 'pendiente' ? 'pendiente' : 'cubierta'}.</p>`;
            }
            let out = `<div class="accordion" id="accordion-${tipo}">`;
            lista.forEach((comp, idx) => {
                const isPend   = tipo === 'pendiente';
                const pct      = (comp.porcentaje ?? comp.porcentaje_minimo ?? 0);
                const resumen  = comp.resumen_resultados;
                const badge    = isPend
                    ? `<span class="badge bg-danger rounded-pill">Pendiente ${Number(pct).toFixed(1)}%</span>`
                    : `<span class="badge bg-success rounded-pill">Cubierto ${Number(pct).toFixed(1)}%</span>`;

                const resumenHtml = resumen
                    ? `<div class="text-muted small mt-1">
                            Resultados BD: ${resumen.total} total
                            &nbsp;·&nbsp; <span class="text-success">${resumen.evaluados} evaluados</span>
                            &nbsp;·&nbsp; <span class="text-warning">${resumen.pendientes} pendientes</span>
                            &nbsp;·&nbsp; <span class="text-secondary">${resumen.sin_datos} sin datos del Excel</span>
                       </div>` : '';

                const tableRows = (comp.resultados || []).map(filaResultado).join('');

                out += `
                    <div class="accordion-item mb-2 border rounded-3 shadow-sm" style="overflow:hidden;">
                        <h2 class="accordion-header">
                            <button class="accordion-button ${isPend ? '' : 'collapsed'} flex-column align-items-start"
                                    type="button" data-bs-toggle="collapse"
                                    data-bs-target="#collapse-${tipo}-${idx}">
                                <div class="d-flex w-100 justify-content-between">
                                    <span class="fw-semibold" style="max-width:420px;">${comp.codigo} — ${comp.nombre || comp.nombre_completo || ''}</span>
                                    <span>${badge}</span>
                                </div>
                                ${resumenHtml}
                            </button>
                        </h2>
                        <div id="collapse-${tipo}-${idx}" class="accordion-collapse collapse ${isPend ? 'show' : ''}"
                             data-bs-parent="#accordion-${tipo}">
                            <div class="accordion-body p-0">
                                <table class="table table-sm table-striped m-0" style="font-size:0.85rem;">
                                    <thead class="bg-light">
                                        <tr>
                                            <th>Resultado de Aprendizaje</th>
                                            <th class="text-center" width="10%">Aprobados</th>
                                            <th class="text-center" width="10%">Evaluados</th>
                                            <th class="text-center" width="14%">% Aprobación</th>
                                            <th class="text-center" width="14%">Estado</th>
                                        </tr>
                                    </thead>
                                    <tbody>${tableRows || '<tr><td colspan="5" class="text-center text-muted">Sin resultados registrados en BD</td></tr>'}</tbody>
                                </table>
                            </div>
                        </div>
                    </div>`;
            });
            out += '</div>';
            return out;
        };

        // ── Sección PENDIENTES ────────────────────────────────────────────────
        html += `
            <h6 class="fw-bold text-danger mb-2 mt-1">
                <i class="bi bi-exclamation-triangle-fill me-1"></i>
                Competencias Pendientes (${pendientes.length})
            </h6>
            ${bloqueCompetencias(pendientes, 'pendiente')}

            <hr class="my-4">
            <h6 class="fw-bold text-success mb-2">
                <i class="bi bi-check-circle-fill me-1"></i>
                Competencias Cubiertas (${cubiertas.length})
            </h6>
            ${bloqueCompetencias(cubiertas, 'cubierta')}`;

        document.getElementById('body-analisis-juicios').innerHTML = html;
        bootstrap.Modal.getOrCreateInstance(
            document.getElementById('modalAnalisisJuicios')
        ).show();
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