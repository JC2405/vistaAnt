import { ProtectedRoute } from '../components/ProtectedRoute.js';
import { Navbar, initNavbarEvents } from '../components/Navbar.js';
import { Sidebar, initSidebarEvents } from '../components/Sidebar.js';
import { SearchableDropdown } from '../components/SearchableDropdown.js';
import { escapeHtml } from '../utils/sanitize.js';
import {
    apiFetch, getAmbientes, getFuncionarios, getSedes, analizarJuiciosConFicha,
    getProgramasPorSede, getFichasPorProgramaSede, getFichasPorSede, getAreas , obtenerAreasTransversales
} from '../utils/api.js?v=4';

async function apiCall(endpoint, method = 'GET', body = null) {
    return apiFetch(endpoint, { method, body: body ? JSON.stringify(body) : undefined });
}

const DIA_ID_MAP = {
    'Lunes': 1, 'Martes': 2, 'Miercoles': 3,
    'Jueves': 4, 'Viernes': 5, 'Sabado': 6, 'Domingo': 7
};

class HorarioFormativa {
    constructor() {
        this.fichas = [];
        this.sedes = [];
        this.ambientes = [];
        this.instructores = [];
        this.areas = [];
        this.selectedFicha = null;
        this.selectedSedeId = null;
        this.selectedAreaId = null;

        this._ddArea = null;
        this._ddInstructor = null;
        this._ddAmbiente = null;
        this._ddAmbienteDisponibles = null;

        this.ambientesDisponibles = [];
        this.mostrarDropdownDisponibles = false;

        this._fichasPorSedeCache = {};
        this._idInstructorActivo = null;
        this._cargaInstructor = [];

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

    /* ── LAYOUT ─────────────────────────────────────────────────────────── */
    renderLayout() {
        const currentPath = window.location.pathname;
        document.getElementById('app').innerHTML =
            Sidebar(currentPath) +
            `<div class="main-wrapper">
                ${Navbar()}
                <main class="container-fluid p-4 flex-grow-1" style="background:var(--bg-page);">
                    <div id="page-alert-container"></div>

                    <div class="d-flex align-items-center gap-3 mb-3">
                        <div class="page-icon"><i class="bi bi-calendar-event"></i></div>
                        <div>
                            <h4 class="fw-bold mb-0" style="color:var(--text-dark)">Horario Transversal</h4>
                            <small class="text-muted">Selecciona área, instructor ,sede y ficha para gestionar el horario  
                             <button type="button"
                                class="btn btn-tooltip-green"
                                data-bs-toggle="tooltip"
                                data-bs-placement="bottom"
                               title="<strong>Información Analisis Juicios Evaluativos:</strong><br>Una vez terminada la seleccion de filtrado podra subir el archivo de Juicios evaluativos de la ficha correspondiente; al subir este archivo el sistema le enviara los correspondientes resultados que estan pediente u evaluados de esta ficha.
                                <i class="bi bi-question-circle-fill text-white">?</i>
                              </button></p></small>
                        </div>
                    </div>

                    <div class="card border-0 shadow-sm rounded-4 mb-3">
                        <div class="card-body px-4 py-3">
                            <div class="row g-3 align-items-end">

                                <div class="col-md-2">
                                    <label class="form-label small fw-semibold text-muted mb-1 text-uppercase" style="letter-spacing:.04em;">
                                        <i class="bi bi-diagram-3 text-primary me-1"></i>Área
                                    </label>
                                    <div id="dd-area-trigger"
                                         style="border-radius:0.5rem;overflow:hidden;border:1px solid #d1d5db;background:#fff;">
                                        <input type="text" id="areaDisplay" class="form-control border-0 form-control-sm"
                                               placeholder="Seleccionar área..." readonly>
                                        <input type="hidden" id="hidArea">
                                    </div>
                                </div>

                                <div class="col-md-3">
                                    <label class="form-label small fw-semibold text-muted mb-1 text-uppercase" style="letter-spacing:.04em;">
                                        <i class="bi bi-person-badge text-primary me-1"></i>Instructor
                                    </label>
                                    <div id="btn-select-instructor"
                                         style="border-radius:0.5rem;overflow:hidden;border:1px solid #d1d5db;background:#fff;">
                                        <input type="text" class="form-control border-0 form-control-sm"
                                               id="instructorNombreDisplay" placeholder="Primero selecciona área..." readonly>
                                        <input type="hidden" id="idFuncionario" required>
                                    </div>
                                </div>

                                <div class="col-md-2">
                                    <label class="form-label small fw-semibold text-muted mb-1 text-uppercase" style="letter-spacing:.04em;">
                                        <i class="bi bi-building text-primary me-1"></i>Sede
                                    </label>
                                    <div id="dd-sede-trigger"
                                         style="border-radius:0.5rem;overflow:hidden;border:1px solid #d1d5db;background:#fff;">
                                        <input type="text" id="sedeDisplay" class="form-control border-0 form-control-sm"
                                               placeholder="Seleccionar sede..." readonly>
                                        <input type="hidden" id="hidSede">
                                    </div>
                                </div>

                                <div class="col-md-3">
                                    <label class="form-label small fw-semibold text-muted mb-1 text-uppercase" style="letter-spacing:.04em;">
                                        <i class="bi bi-card-list text-primary me-1"></i>Ficha
                                    </label>
                                    <div id="dd-ficha-trigger"
                                         style="border-radius:0.5rem;overflow:hidden;border:1px solid #d1d5db;background:#fff;">
                                        <input type="text" id="fichaDisplay" class="form-control border-0 form-control-sm"
                                               placeholder="Seleccionar sede primero..." readonly>
                                        <input type="hidden" id="hidFicha">
                                    </div>
                                </div>

                                <div class="col-md-2 d-flex align-items-end">
                                    <button class="btn btn-outline-success w-100 rounded-3 d-flex align-items-center justify-content-center gap-2"
                                            id="btn-juicios-evaluativos" style="height:33px;font-size:0.82rem;">
                                        <i class="bi bi-file-earmark-excel"></i>
                                        <span>Analizar Juicios</span>
                                    </button>
                                    <input type="file" id="file-juicios" accept=".xlsx,.xls" class="d-none">
                                </div>
                            </div>
                        </div>
                    </div>

                    <div id="ficha-info-banner" class="d-none mb-3">
                        <div class="card border-0 rounded-4 shadow-sm" style="background:linear-gradient(135deg,var(--primary-dark) 0%,var(--primary) 100%);">
                            <div class="card-body px-4 py-2 d-flex align-items-center gap-3">
                                <i class="bi bi-card-text text-white fs-5 opacity-75"></i>
                                <div class="flex-grow-1">
                                    <p class="mb-0 text-white-50" style="font-size:0.68rem;text-transform:uppercase;letter-spacing:.05em;font-weight:600;">Ficha activa</p>
                                    <h6 class="mb-0 text-white fw-bold" id="lbl-ficha-context" style="font-size:0.9rem;">—</h6>
                                </div>
                                <button class="btn btn-sm btn-light rounded-pill px-3 opacity-75" id="btn-cambiar-ficha" style="font-size:0.75rem;">
                                    <i class="bi bi-arrow-left-right me-1"></i>Cambiar
                                </button>
                            </div>
                        </div>
                    </div>

                    <div id="panel-formulario" class="d-none mb-3">
                        <div class="card border-0 shadow-sm rounded-4">
                            <div class="card-body px-4 py-3">
                                <div id="form-alert" class="mb-2"></div>
                                <form id="form-horario" novalidate>
                                    <div class="row g-2 align-items-end">
                                       <div class="row g-3">

                                        <div class="col-md-8">
                                            <div class="row g-2">

                                                <div class="col-md-6">
                                                    <label class="form-label small mb-1">Modalidad</label>
                                                    <select class="form-select form-select-sm" id="modalidad_clase">
                                                        <option value="presencial">Presencial</option>
                                                        <option value="virtual">Virtual</option>
                                                    </select>
                                                </div>

                                                <div class="col-md-6">
                                                    <label class="form-label small mb-1">Ambiente</label>
                                                    <div class="d-flex gap-2">
                                                        <div id="btn-select-ambiente"
                                                             class="flex-grow-1 border rounded overflow-hidden">
                                                            <input type="text"
                                                                   class="form-control form-control-sm border-0"
                                                                   id="ambienteNombreDisplay"
                                                                   placeholder="Buscar ambiente..."
                                                                   readonly>
                                                            <input type="hidden" id="idAmbiente">
                                                        </div>
                                                        <button type="button"
                                                                class="btn btn-outline-primary btn-sm"
                                                                id="btn-ambientes-libres">
                                                            <i class="bi bi-unlock me-1"></i>Libres
                                                        </button>
                                                    </div>
                                                </div>

                                                <div class="col-11">
                                                    <label class="form-label small mb-1">Observación</label>
                                                    <input type="text"
                                                           class="form-control form-control-sm"
                                                           id="observacion"
                                                           placeholder="Ej. Bloque práctico...">
                                                    <br>
                                                    <div id="recomendacion-contrajornada" class="d-none mt-1"></div>
                                                </div>

                                            </div>
                                        </div>

                                        <div class="col-md-4">
                                            <div class="row g-2">

                                                <div class="col-6">
                                                    <label class="form-label small mb-1">Hora Inicio</label>
                                                    <input type="time" class="form-control form-control-sm" id="hora_inicio">
                                                </div>
                                                <div class="col-6">
                                                    <label class="form-label small mb-1">Hora Fin</label>
                                                    <input type="time" class="form-control form-control-sm" id="hora_fin">
                                                </div>

                                                <div class="col-6">
                                                    <label class="form-label small mb-1">Fecha Inicio</label>
                                                    <input type="date" class="form-control form-control-sm" id="fecha_inicio">
                                                </div>
                                                <div class="col-6">
                                                    <label class="form-label small mb-1">Fecha Fin</label>
                                                    <input type="date" class="form-control form-control-sm" id="fecha_fin">
                                                </div>

                                                <div class="col-12">
                                                    <label class="form-label small mb-1">Días</label>
                                                    <div class="d-flex flex-wrap gap-1" id="dias-container"></div>
                                                </div>

                                                <div class="col-12">
                                                    <div id="resumen-horas-container" style="display:none;">
                                                        <div class="rounded-3 border px-3 py-2 mb-2"
                                                             style="background:linear-gradient(135deg,#f5f3ff 0%,#ede9fe 100%);border-color:#c4b5fd !important;">
                                                            <div class="d-flex align-items-center gap-2 mb-1">
                                                                <i class="bi bi-clock-history text-primary" style="font-size:0.85rem;"></i>
                                                                <span class="small fw-semibold text-primary"
                                                                      style="font-size:0.78rem;text-transform:uppercase;letter-spacing:.04em;">
                                                                    Resumen de horas
                                                                </span>
                                                            </div>
                                                            <div class="d-flex flex-wrap gap-3">
                                                                <div class="text-center">
                                                                    <div class="fw-bold text-primary" id="rh-total-horas"
                                                                         style="font-size:1.25rem;line-height:1;">—</div>
                                                                    <div class="text-muted" style="font-size:0.7rem;">Horas totales</div>
                                                                </div>
                                                                <div class="text-center">
                                                                    <div class="fw-bold text-dark" id="rh-total-dias"
                                                                         style="font-size:1.25rem;line-height:1;">—</div>
                                                                    <div class="text-muted" style="font-size:0.7rem;">Días válidos</div>
                                                                </div>
                                                                <div class="text-center">
                                                                    <div class="fw-bold text-dark" id="rh-horas-dia"
                                                                         style="font-size:1.25rem;line-height:1;">—</div>
                                                                    <div class="text-muted" style="font-size:0.7rem;">Horas/día</div>
                                                                </div>
                                                            </div>
                                                            <div id="rh-warning" class="d-none mt-1">
                                                                <small class="text-danger">
                                                                    <i class="bi bi-exclamation-triangle-fill me-1"></i>
                                                                    <span id="rh-warning-msg"></span>
                                                                </small>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>

                                                <div class="col-12">
                                                    <button type="submit" id="btn-asignar" class="btn btn-purple btn-sm w-100">
                                                        <i class="bi bi-calendar-check"></i> Guardar
                                                    </button>
                                                </div>

                                            </div>
                                        </div>

                                    </div>
                                    </div>
                                </form>
                            </div>
                        </div>
                    </div>

                    <div id="main-content" class="fade-in"></div>

                    <div class="modal fade" id="modalAnalisisJuicios" tabindex="-1" aria-hidden="true">
                        <div class="modal-dialog modal-xl modal-dialog-centered modal-dialog-scrollable">
                            <div class="modal-content border-0 shadow-lg" style="border-radius:1rem;overflow:hidden;">
                                <div class="modal-header text-white border-0 px-4 py-3"
                                     style="background:linear-gradient(135deg,#198754 0%,#146c43 100%);">
                                    <h5 class="modal-title fw-bold d-flex align-items-center gap-2">
                                        <i class="bi bi-bar-chart-fill"></i> Análisis de Juicios Evaluativos
                                    </h5>
                                    <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal"></button>
                                </div>
                                <div class="modal-body p-4 bg-light" id="body-analisis-juicios"></div>
                            </div>
                        </div>
                    </div>
                </main>
            </div>`;
    }

    /* ── CARGA DE DATOS ─────────────────────────────────────────────────── */
    async loadDependencies() {
        try {
            const [aData, sData, areasData] = await Promise.all([
                getAmbientes(), getSedes(), obtenerAreasTransversales()
            ]);
            this.ambientes = aData.data || (Array.isArray(aData) ? aData : []);
            this.sedes     = sData.data || (Array.isArray(sData) ? sData : []);
            this.areas     = areasData.data || (Array.isArray(areasData) ? areasData : []);

            this.populateSelects();
            this.renderMainContent();
        } catch (err) {
            this.showAlert('page-alert-container', 'danger', 'Error al cargar datos: ' + err.message);
        }
    }

    /* ── SELECTS Y DROPDOWNS ────────────────────────────────────────────── */
    populateSelects() {
        const cont = document.getElementById('dias-container');
        if (cont) {
            const dias = [
                { label: 'L', nombre: 'Lunes' }, { label: 'M', nombre: 'Martes' },
                { label: 'M', nombre: 'Miercoles' }, { label: 'J', nombre: 'Jueves' },
                { label: 'V', nombre: 'Viernes' }, { label: 'S', nombre: 'Sabado' },
                { label: 'D', nombre: 'Domingo' },
            ];
            cont.innerHTML = dias.map((d, i) => {
                const val = i + 1;
                return `<input type="checkbox" class="btn-check" id="dia_${val}" value="${val}" autocomplete="off">
                        <label class="btn btn-outline-primary rounded-circle d-flex align-items-center justify-content-center fw-bold"
                               style="width:38px;height:38px;font-size:0.82rem;" for="dia_${val}"
                               title="${d.nombre}">${d.label}</label>`;
            }).join('');
        }

        this._initAreaDropdown();
        this._initInstructorDropdown();
        this._initAmbienteDropdown();
        this._initSedeDropdown();
        this._initFichaDropdown();
        this._initJuiciosEvents();
    }


    

    /* ── DROPDOWN: SEDE ─────────────────────────────────────────────────── */
    _initSedeDropdown() {
        const triggerEl = document.getElementById('dd-sede-trigger');
        if (!triggerEl) return;
        this._ddSede?.destroy();
        this._ddSede = new SearchableDropdown({
            triggerEl: 'dd-sede-trigger',
            inputId: 'hidSede',
            displayId: 'sedeDisplay',
            placeholder: 'Buscar sede...',
            emptyText: 'No se encontraron sedes',
            onOpen: () => {
                this._ddSede.setItems(
                    this.sedes.map(s => ({
                        id: s.idSede,
                        label: s.nombre,
                        sub: s.ciudad || s.direccion || '',
                    }))
                );
            },
            onSelect: async (item) => {
                const idSede = String(item.id);
                this.selectedSedeId = idSede;

                this._ddFicha?.reset();
                document.getElementById('fichaDisplay').placeholder = 'Cargando fichas...';
                this.selectedFicha = null;
                this._ddAmbiente?.reset();
                this._ocultarPanelFormulario();

                // ✅ FIX Bug 1: si hay instructor activo, re-renderizar tabla SIN tocar renderMainContent()
                // Si no hay instructor activo, no tocar main-content — ya tiene el placeholder inicial
                if (this._idInstructorActivo) {
                    this._renderTablaInstructor();
                }

                try {
                    if (!this._fichasPorSedeCache[idSede]) {
                        const res = await getFichasPorSede(idSede);
                        this._fichasPorSedeCache[idSede] = res.data || (Array.isArray(res) ? res : []);
                    }
                    const fichas = this._fichasPorSedeCache[idSede];
                    document.getElementById('fichaDisplay').placeholder =
                        fichas.length ? 'Seleccionar ficha...' : 'Sin fichas en esta sede';
                } catch (err) {
                    document.getElementById('fichaDisplay').placeholder = 'Error al cargar fichas';
                    this.showAlert('page-alert-container', 'danger',
                        `<i class="bi bi-x-circle me-2"></i>Error al cargar fichas: ${escapeHtml(err.message)}`);
                }
            }
        });
    }

    /* ── DROPDOWN: FICHA ────────────────────────────────────────────────── */
    _initFichaDropdown() {
        const triggerEl = document.getElementById('dd-ficha-trigger');
        if (!triggerEl) return;
        this._ddFicha?.destroy();
        this._ddFicha = new SearchableDropdown({
            triggerEl: 'dd-ficha-trigger',
            inputId: 'hidFicha',
            displayId: 'fichaDisplay',
            placeholder: 'Seleccionar sede primero...',
            emptyText: 'No se encontraron fichas',
            onOpen: () => {
                if (!this.selectedSedeId) {
                    const t = document.getElementById('dd-sede-trigger');
                    if (t) {
                        t.style.transition = 'box-shadow .15s';
                        t.style.boxShadow = '0 0 0 3px rgba(220,53,69,.3)';
                        t.style.borderColor = '#dc3545';
                        setTimeout(() => { t.style.boxShadow = ''; t.style.borderColor = '#d1d5db'; }, 1500);
                    }
                    this._ddFicha.close?.();
                    return;
                }
                const fichas = this._fichasPorSedeCache[this.selectedSedeId] || [];
                this._ddFicha.setItems(
                    fichas.map(f => ({
                        id: f.idFicha,
                        label: f.codigoFicha,
                        sub: (f.programa?.nombre || '') + (f.jornada ? ` · ${f.jornada}` : ''),
                    }))
                );
            },
            onSelect: (item) => {
                this.fichas = this._fichasPorSedeCache[this.selectedSedeId] || [];
                this._goToFicha(item.id);
            }
        });
    }

    /* ── DROPDOWN: ÁREA ─────────────────────────────────────────────────── */
    _initAreaDropdown() {
        const triggerEl = document.getElementById('dd-area-trigger');
        if (!triggerEl) return;
        this._ddArea?.destroy();
        this._ddArea = new SearchableDropdown({
            triggerEl: 'dd-area-trigger',
            inputId: 'hidArea',
            displayId: 'areaDisplay',
            placeholder: 'Buscar área...',
            emptyText: 'No se encontraron áreas',
            onOpen: () => {
                this._ddArea.setItems(
                    this.areas.map(a => ({
                        id: a.idArea,
                        label: a.nombreArea || a.nombre || 'Sin nombre',
                        sub: a.tipo || '',
                    }))
                );
            },
    
            onSelect: async (item) => {
                // Si el usuario seleccionó la misma área, no hacer nada
                if (String(this.selectedAreaId) === String(item.id)) return;

                this.selectedAreaId = item.id;

                // Solo limpiar instructor y carga si el área realmente cambió
                this._idInstructorActivo = null;
                this._cargaInstructor = [];

                this._ddInstructor?.reset('Cargando instructores...');
                document.getElementById('instructorNombreDisplay').placeholder = 'Cargando instructores...';
                document.getElementById('idFuncionario').value = '';

                try {
                    const res = await apiCall(`/obtenerInstructorPorArea/${item.id}`);
                    this.instructores = res.data || (Array.isArray(res) ? res : []);
                    document.getElementById('instructorNombreDisplay').placeholder = 'Seleccionar instructor...';
                } catch {
                    this.instructores = [];
                    document.getElementById('instructorNombreDisplay').placeholder = 'Error al cargar';
                }
                this._initInstructorDropdown();

                // Mostrar placeholder limpio porque ya no hay instructor activo
                this.renderMainContent();
            }
        });
    }

    _mostrarRecomendacionContrajornada(ficha) {
        const el = document.getElementById('recomendacion-contrajornada');
        if (!el) return;

        const jornada = (ficha.jornada || ficha.jornadaFormacion || '').toLowerCase().trim();
        const codigo  = ficha.codigoFicha || ficha.idFicha || '';

        let rangoRecomendado = null;
        let iconoJornada     = 'bi-sun';

        if (/ma[ñn]ana|madrugada|diurna|6[\s\-–.]*12|06[\s\-–.]*12/.test(jornada)) {
            rangoRecomendado = '12:00 – 18:00';
            iconoJornada     = 'bi-sun';
        } else if (/tarde|tardecita|12[\s\-–.]*18/.test(jornada)) {
            rangoRecomendado = '06:00 – 12:00';
            iconoJornada     = 'bi-sunset';
        } else if (/noche|nocturna|18[\s\-–.]*24/.test(jornada)) {
            rangoRecomendado = '06:00 – 18:00';
            iconoJornada     = 'bi-moon-stars';
        }

        if (!rangoRecomendado) {
            el.classList.add('d-none');
            el.innerHTML = '';
            return;
        }

        el.classList.remove('d-none');
        el.innerHTML = `
            <div class="d-flex align-items-start gap-2 px-2 py-2 rounded-3 mt-1"
                 style="background:rgba(255,193,7,0.12);border:1px solid rgba(255,193,7,0.45);font-size:0.78rem;">
                <i class="bi bi-lightbulb-fill text-warning flex-shrink-0" style="font-size:0.9rem;margin-top:1px;"></i>
                <span class="text-dark lh-sm">
                    Para asignar transversales a la ficha <strong>${escapeHtml(String(codigo))}</strong>
                    se recomienda hacerlo de <strong>${rangoRecomendado}</strong>
                    <span class="text-muted">(contrajornada <i class="bi ${iconoJornada}"></i>)</span>
                </span>
            </div>`;
    }


    
    /* ── DROPDOWN: INSTRUCTOR ───────────────────────────────────────────── */
    _initInstructorDropdown() {
        const triggerEl = document.getElementById('btn-select-instructor');
        if (!triggerEl) return;
        this._ddInstructor?.destroy();
        this._ddInstructor = new SearchableDropdown({
            triggerEl,
            inputId: 'idFuncionario',
            displayId: 'instructorNombreDisplay',
            placeholder: this.selectedAreaId ? 'Seleccionar instructor...' : 'Primero selecciona área...',
            emptyText: 'No se encontraron instructores',
            onOpen: () => {
                if (!this.selectedAreaId) {
                    this._ddInstructor.close?.();
                    const t = document.getElementById('dd-area-trigger');
                    if (t) {
                        t.style.transition = 'box-shadow .15s';
                        t.style.boxShadow = '0 0 0 3px rgba(220,53,69,.3)';
                        t.style.borderColor = '#dc3545';
                        setTimeout(() => { t.style.boxShadow = ''; t.style.borderColor = '#d1d5db'; }, 1500);
                    }
                    return;
                }
                this._ddInstructor.setItems(this._getInstructorItems());
            },
            onSelect: async (item) => {
                this._idInstructorActivo = item.id;
                this.selectedFicha = null;
                this._ddFicha?.reset();
                this._ocultarPanelFormulario();
                const rec = document.getElementById('recomendacion-contrajornada');
                if (rec) { rec.classList.add('d-none'); rec.innerHTML = ''; }
                await this._cargarTablaInstructor(item.id);
            }
        });
    }

    _getInstructorItems() {
        return this.instructores.map(i => ({
            id: i.idFuncionario,
            label: `${i.nombre || ''} ${i.apellido || i.apellidos || ''}`.trim() || 'Sin nombre',
            sub: i.areas?.length
                ? i.areas.map(a => a.tipo ? `${a.nombreArea} (${a.tipo})` : a.nombreArea).join(', ')
                : 'Sin área',
        })).sort((a, b) => a.label.localeCompare(b.label));
    }

    /* ── DROPDOWN: AMBIENTE ─────────────────────────────────────────────── */
    _initAmbienteDropdown() {
        const triggerEl = document.getElementById('btn-select-ambiente');
        if (!triggerEl) return;
        this._ddAmbiente?.destroy();
        this._ddAmbiente = new SearchableDropdown({
            triggerEl,
            inputId: 'idAmbiente',
            displayId: 'ambienteNombreDisplay',
            placeholder: 'Buscar ambiente (bloque, área)...',
            emptyText: 'No se encontraron ambientes',
            onOpen: () => {
                const idSede = this.selectedSedeId
                    || document.getElementById('idSede')?.value
                    || null;

                if (!idSede) {
                    this._ddAmbiente.setItems([]);
                    return;
                }

                const idAreaPrograma = this.selectedFicha?.programa?.idArea;
                const filtered = this.ambientes.filter(a => String(a.idSede) === String(idSede));

                if (!filtered.length) {
                    this._ddAmbiente.setItems([]);
                    return;
                }

                const items = filtered.map(a => {
                    const areaNombre = a.area?.nombreArea ?? 'Sin área';
                    const areaTipo   = a.area?.tipo ? ` - ${a.area.tipo}` : '';
                    const esRec = idAreaPrograma && String(a.idArea) === String(idAreaPrograma);
                    return {
                        id: a.idAmbiente,
                        label: `${a.nombre || areaNombre} - Blq ${a.bloque || 'N/A'}`,
                        sub: `${areaNombre}${areaTipo}`,
                        isRecommended: !!esRec
                    };
                });

                const rec   = items.filter(i => i.isRecommended).sort((a, b) => a.label.localeCompare(b.label));
                const otros = items.filter(i => !i.isRecommended).sort((a, b) => a.label.localeCompare(b.label));
                this._ddAmbiente.setItems([...rec, ...otros]);
            },
            onSelect: (item) => {
                this._verificarCompatibilidadInstructorAmbiente(item.id);
            }
        });
    }

    _verificarCompatibilidadInstructorAmbiente(idAmbiente) {
        const alertEl = document.getElementById('form-alert');
        if (!alertEl) return;
        alertEl.querySelector('[data-compat-warn]')?.remove();
        const idFuncionario = document.getElementById('idFuncionario')?.value;
        if (!idFuncionario) return;
        const ambiente = this.ambientes.find(a => String(a.idAmbiente) === String(idAmbiente));
        if (!ambiente?.idArea) return;
        const instructor = this.instructores.find(i => String(i.idFuncionario) === String(idFuncionario));
        if (!instructor) return;
        const perteneceAlArea = instructor.areas?.some(ar => String(ar.idArea) === String(ambiente.idArea));
        if (!perteneceAlArea) {
            const warn = document.createElement('div');
            warn.setAttribute('data-compat-warn', '1');
            warn.className = 'alert alert-warning alert-dismissible d-flex align-items-center gap-2 py-2 px-3 mb-0';
            warn.style.fontSize = '0.82rem';
            warn.innerHTML = `<i class="bi bi-exclamation-triangle-fill flex-shrink-0"></i>
                <span>El instructor <strong>no pertenece al área</strong> del ambiente elegido.</span>
                <button type="button" class="btn-close" style="font-size:0.7rem;" aria-label="Cerrar"></button>`;
            warn.querySelector('.btn-close').addEventListener('click', () => warn.remove());
            alertEl.appendChild(warn);
        }
    }

    /* ── PANEL FORMULARIO ───────────────────────────────────────────────── */
    _mostrarPanelFormulario() {
        document.getElementById('ficha-info-banner')?.classList.remove('d-none');
        document.getElementById('panel-formulario')?.classList.remove('d-none');
    }

    _ocultarPanelFormulario() {
        document.getElementById('ficha-info-banner')?.classList.add('d-none');
        document.getElementById('panel-formulario')?.classList.add('d-none');
    }

    
    /* ── VISTA PRINCIPAL (placeholder sin instructor) ────────────────────── */
    renderMainContent() {
        const container = document.getElementById('main-content');
        if (!container) return;
        container.innerHTML = `
            <div class="card border-0 shadow-sm rounded-4">
                <div class="card-body py-5 text-center text-muted d-flex flex-column align-items-center" style="min-height:300px;justify-content:center;">
                    <i class="bi bi-person-badge fs-1 mb-3 opacity-25"></i>
                    <p class="fw-medium mb-1">Selecciona un área e instructor para ver su carga de transversales</p>
                    <p class="small">Luego elige sede y ficha para asignar nuevas horas</p>
                </div>
            </div>`;
    }

    async _cargarTablaInstructor(idFuncionario) {
    const container = document.getElementById('main-content');
    container.innerHTML = `
        <div class="card border-0 shadow-sm rounded-4" id="tabla-instructor-card">
            <div class="card-body py-4 text-center text-muted">
                <div class="spinner-border spinner-border-sm text-primary me-2"></div>
                Cargando carga del instructor...
            </div>
        </div>`;

    try {
        const res = await apiCall(`/horarioPorInstructor/${idFuncionario}`);  // ✅ endpoint correcto
        this._cargaInstructor = res.data?.clases || [];                        // ✅ estructura correcta
        this._renderTablaInstructor();
    } catch (err) {
        const card = document.getElementById('tabla-instructor-card');
        if (card) card.innerHTML = `
            <div class="card-body text-danger p-4">
                <i class="bi bi-exclamation-triangle me-2"></i>${escapeHtml(err.message)}
            </div>`;
    }
}

    /* ── RENDER TABLA INSTRUCTOR ────────────────────────────────────────── */
    _renderTablaInstructor() {
        if (!this._idInstructorActivo) return;

        
        let card = document.getElementById('tabla-instructor-card');
        if (!card) {
            const container = document.getElementById('main-content');
            container.innerHTML = `<div class="card border-0 shadow-sm rounded-4" id="tabla-instructor-card"></div>`;
            card = document.getElementById('tabla-instructor-card');
        }

        const asignaciones  = this._cargaInstructor;
        const idFichaActiva = this.selectedFicha?.idFicha;

        const idFuncionario = document.getElementById('idFuncionario').value;
        const instructor    = this.instructores.find(i => String(i.idFuncionario) === String(idFuncionario));
        const nombreInst    = instructor
            ? `${instructor.nombre || ''} ${instructor.apellido || instructor.apellidos || ''}`.trim()
            : document.getElementById('instructorNombreDisplay').value || '—';
        const iniciales = nombreInst.split(' ').filter(Boolean).slice(0, 2).map(p => p[0]).join('').toUpperCase();

        const totalHSem = asignaciones.reduce((acc, asig) => {
            const bloque = asig.bloque;
            if (!bloque) return acc;
            const hI = bloque.horaInicio || bloque.hora_inicio || '';
            const hF = bloque.horaFin    || bloque.hora_fin    || '';
            if (!hI || !hF) return acc;
            const [h1, m1] = hI.split(':').map(Number);
            const [h2, m2] = hF.split(':').map(Number);
            const hDia     = ((h2 * 60 + m2) - (h1 * 60 + m1)) / 60;
            const diasCount = (bloque.dias || []).length;
            return acc + hDia * diasCount;
        }, 0);

        const DIAS_LABELS  = ['', 'L', 'M', 'M', 'J', 'V', 'S', 'D'];
        const DIAS_NOMBRES = ['', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];

        const filas = asignaciones.map(asig => {
            const bloque = asig.bloque;
            if (!bloque) return '';

            const fichaId    = asig.ficha?.idFicha || asig.idFicha || '—';
            const fichaCod   = asig.ficha?.codigoFicha || fichaId;
            const progNombre = asig.ficha?.programa?.nombre || '';
            const jornada    = (asig.ficha?.jornada || '').toLowerCase();
            const isActiva   = String(fichaId) === String(idFichaActiva);
            const isVirtual  = asig.modalidad === 'virtual';

            const horaIni = (bloque.horaInicio || bloque.hora_inicio || '').substring(0, 5);
            const horaFin = (bloque.horaFin    || bloque.hora_fin    || '').substring(0, 5);
            const [h1, m1] = horaIni.split(':').map(Number);
            const [h2, m2] = horaFin.split(':').map(Number);
            const hDia = (isNaN(h1) || isNaN(h2)) ? 0 : ((h2 * 60 + m2) - (h1 * 60 + m1)) / 60;

            const fechaIni = asig.fechaInicio || asig.fecha_inicio || bloque.fechaInicio || '';
            const fechaFin = asig.fechaFin    || asig.fecha_fin    || bloque.fechaFin    || '';
            const fmtFecha = s => s ? s.split('-').reverse().join('/') : '—';

            const diasAsig = new Set((bloque.dias || []).map(d => d.idDia || DIA_ID_MAP[d.nombreDia || d.nombre]));
            const diasHtml = [1, 2, 3, 4, 5, 6, 7].map(n =>
                `<span title="${DIAS_NOMBRES[n]}"
                       style="width:20px;height:20px;border-radius:50%;display:inline-flex;align-items:center;
                              justify-content:center;font-size:9px;font-weight:500;margin-right:1px;
                              ${diasAsig.has(n)
                                  ? 'background:#ede9fe;color:#4c1d95;border:0.5px solid #c4b5fd;'
                                  : 'background:#f3f4f6;color:#adb5bd;border:0.5px solid #dee2e6;'}"
                >${DIAS_LABELS[n]}</span>`
            ).join('');

            const jornadaBadge = jornada.includes('noche')
                ? `<span style="padding:1px 6px;border-radius:999px;font-size:9px;background:#ede9fe;color:#4c1d95;">Noche</span>`
                : jornada.includes('tarde')
                ? `<span style="padding:1px 6px;border-radius:999px;font-size:9px;background:#fff3cd;color:#856404;">Tarde</span>`
                : `<span style="padding:1px 6px;border-radius:999px;font-size:9px;background:#d1e7dd;color:#0f5132;">Mañana</span>`;

            const hSem     = (hDia * diasAsig.size).toFixed(1).replace('.0', '');
            const ambiente = asig.ambiente ? (asig.ambiente.nombre || asig.ambiente.codigo) : null;
            const blqNombre = asig.ambiente?.bloque ? `Blq ${asig.ambiente.bloque}` : '';

            return `<tr style="${isActiva ? 'background:#f5f3ff;' : ''}">
                <td class="px-3 py-2">
                    <span style="font-weight:500;font-size:12px;">${escapeHtml(String(fichaCod))}</span>
                    ${isActiva ? `<span style="display:inline-block;padding:1px 6px;border-radius:4px;font-size:9px;background:#ede9fe;color:#4c1d95;margin-left:4px;font-weight:500;">Activa</span>` : ''}
                    <div style="margin-top:2px;">${jornadaBadge}</div>
                </td>
                <td class="px-3 py-2" style="font-size:11px;color:var(--bs-secondary);max-width:160px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">
                    ${escapeHtml(progNombre)}
                </td>
                <td class="px-3 py-2">
                    <span style="font-size:12px;font-weight:500;">${horaIni} → ${horaFin}</span>
                    <div style="font-size:10px;color:var(--bs-secondary);">${hDia > 0 ? hDia + 'h/día' : '—'}</div>
                </td>
                <td class="px-3 py-2" style="font-size:11px;color:var(--bs-secondary);line-height:1.5;">
                    ${fmtFecha(fechaIni)}<br>${fmtFecha(fechaFin)}
                </td>
                <td class="px-3 py-2"><div style="display:flex;flex-wrap:wrap;gap:1px;">${diasHtml}</div></td>
                <td class="px-3 py-2">
                    <span style="display:inline-flex;align-items:center;gap:3px;padding:2px 7px;border-radius:999px;font-size:10px;font-weight:500;
                        ${isVirtual ? 'background:#cfe2ff;color:#084298;' : 'background:#d1e7dd;color:#0f5132;'}">
                        <i class="bi ${isVirtual ? 'bi-laptop' : 'bi-building'}" style="font-size:10px;"></i>
                        ${escapeHtml(asig.modalidad || '—')}
                    </span>
                </td>
                <td class="px-3 py-2" style="font-size:11px;">
                    ${ambiente
                        ? `${escapeHtml(ambiente)}<br><span style="color:var(--bs-secondary);font-size:10px;">${escapeHtml(blqNombre)}</span>`
                        : `<span style="color:var(--bs-secondary);">—</span>`}
                </td>
                <td class="px-3 py-2 text-center">
                    <span style="font-weight:500;font-size:12px;">${hSem}</span>
                    <div style="font-size:10px;color:var(--bs-secondary);">h/sem</div>
                </td>
                <td class="px-3 py-2 text-center">
                    <button class="btn btn-sm btn-outline-danger border-0 rounded-circle delete-asig-btn"
                            data-id="${asig.idAsignacion}"
                            style="width:26px;height:26px;padding:0;font-size:.8rem;"
                            title="Eliminar asignación">
                        <i class="bi bi-trash3"></i>
                    </button>
                </td>
            </tr>`;
        }).join('');

        const hSemFmt = Number.isInteger(totalHSem) ? totalHSem : totalHSem.toFixed(1);

        card.innerHTML = `
            <div style="display:flex;align-items:center;gap:10px;padding:10px 18px;
                        border-bottom:0.5px solid #e5e7eb;background:#f9fafb;border-radius:calc(var(--bs-card-border-radius) - 1px) calc(var(--bs-card-border-radius) - 1px) 0 0;">
                <div style="width:36px;height:36px;border-radius:50%;background:#ede9fe;display:flex;align-items:center;
                            justify-content:center;font-size:12px;font-weight:500;color:#4c1d95;flex-shrink:0;">
                    ${escapeHtml(iniciales)}
                </div>
                <div>
                    <p style="font-size:14px;font-weight:500;margin:0;">${escapeHtml(nombreInst)}</p>
                    <p style="font-size:11px;color:var(--bs-secondary);margin:0;">Carga de transversales asignadas</p>
                </div>
                <div style="margin-left:auto;display:flex;gap:6px;align-items:center;">
                    <span style="padding:3px 10px;border-radius:999px;font-size:11px;font-weight:500;background:#ede9fe;color:#4c1d95;">
                        <i class="bi bi-calendar-check me-1" style="font-size:11px;"></i>${asignaciones.length} fichas
                    </span>
                    <span style="padding:3px 10px;border-radius:999px;font-size:11px;font-weight:500;background:#d1e7dd;color:#0f5132;">
                        <i class="bi bi-clock me-1" style="font-size:11px;"></i>${hSemFmt} h/sem
                    </span>
                </div>
            </div>
            ${asignaciones.length === 0
                ? `<div style="padding:40px;text-align:center;color:var(--bs-secondary);font-size:13px;">
                    <i class="bi bi-calendar-x fs-2 d-block mb-2 opacity-25"></i>
                    Sin asignaciones transversales registradas
                   </div>`
                : `<div class="table-responsive">
                    <table class="table table-hover mb-0 align-middle" style="font-size:.82rem;">
                        <thead class="table-light">
                            <tr>
                                <th class="px-3 py-2" style="font-size:10.5px;text-transform:uppercase;letter-spacing:.04em;color:var(--bs-secondary);font-weight:500;white-space:nowrap;">Ficha</th>
                                <th class="px-3 py-2" style="font-size:10.5px;text-transform:uppercase;letter-spacing:.04em;color:var(--bs-secondary);font-weight:500;">Programa</th>
                                <th class="px-3 py-2" style="font-size:10.5px;text-transform:uppercase;letter-spacing:.04em;color:var(--bs-secondary);font-weight:500;white-space:nowrap;">Horario</th>
                                <th class="px-3 py-2" style="font-size:10.5px;text-transform:uppercase;letter-spacing:.04em;color:var(--bs-secondary);font-weight:500;white-space:nowrap;">Fechas</th>
                                <th class="px-3 py-2" style="font-size:10.5px;text-transform:uppercase;letter-spacing:.04em;color:var(--bs-secondary);font-weight:500;">Días</th>
                                <th class="px-3 py-2" style="font-size:10.5px;text-transform:uppercase;letter-spacing:.04em;color:var(--bs-secondary);font-weight:500;">Modalidad</th>
                                <th class="px-3 py-2" style="font-size:10.5px;text-transform:uppercase;letter-spacing:.04em;color:var(--bs-secondary);font-weight:500;">Ambiente</th>
                                <th class="px-3 py-2" style="font-size:10.5px;text-transform:uppercase;letter-spacing:.04em;color:var(--bs-secondary);font-weight:500;white-space:nowrap;">H/sem</th>
                                <th class="px-3 py-2"></th>
                            </tr>
                        </thead>
                        <tbody>${filas}</tbody>
                    </table>
                   </div>`
            }`;

      card.querySelectorAll('.delete-asig-btn').forEach(btn => {
    btn.addEventListener('click', async () => {
        const result = await Swal.fire({
            title: '¿Eliminar asignación?',
            text: 'Esta acción no se puede deshacer.',
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#d33',
            cancelButtonColor: '#0630b7',
            confirmButtonText: '<i class="bi bi-trash3 me-1"></i>Sí, eliminar',
            cancelButtonText: 'Cancelar',
            reverseButtons: true,
        });
        if (result.isConfirmed) {
            this.deleteAsignacion(parseInt(btn.dataset.id), true); // true = skipConfirm
        }
    });
    });
    }

    /* ── NAVEGACIÓN A FICHA ─────────────────────────────────────────────── */
    _goToFicha(id) {
        // ✅ Si es la misma ficha que ya está activa, no resetear los campos del formulario
        const mismsFicha = this.selectedFicha && String(this.selectedFicha.idFicha) === String(id);

        this.fichas = this._fichasPorSedeCache[this.selectedSedeId] || [];
        this.selectedFicha = this.fichas.find(f => String(f.idFicha) === String(id));
        // ✅ FIX Bug 2: si no está en cache todavía, construir objeto mínimo para no salir silenciosamente
        if (!this.selectedFicha) {
            this.selectedFicha = { idFicha: id, codigoFicha: String(id), jornada: '' };
        }

        if (!mismsFicha) {
            // 🔄 Ficha diferente → resetear todos los campos del formulario
            const hora_inicio = document.getElementById('hora_inicio');
            const hora_fin    = document.getElementById('hora_fin');
            const fecha_inicio = document.getElementById('fecha_inicio');
            const fecha_fin    = document.getElementById('fecha_fin');
            const observacion  = document.getElementById('observacion');
            const modalidad    = document.getElementById('modalidad_clase');

            if (hora_inicio)  hora_inicio.value  = '';
            if (hora_fin)     hora_fin.value     = '';
            if (fecha_inicio) fecha_inicio.value = '';
            if (fecha_fin)    fecha_fin.value    = '';
            if (observacion)  observacion.value  = '';
            if (modalidad)    modalidad.value    = 'presencial';

            // Resetear checkboxes de días
            document.querySelectorAll('#dias-container input[type="checkbox"]').forEach(cb => {
                cb.checked = false;
            });

            // Resetear resumen de horas
            const resumenCont = document.getElementById('resumen-horas-container');
            if (resumenCont) resumenCont.style.display = 'none';

            // Resetear ambiente
            this._ddAmbiente?.reset();
        }

        this.selectFicha(id);
    }

    /* ── SELECT FICHA ───────────────────────────────────────────────────── */
    async selectFicha(idFicha) {
        if (!this.selectedFicha) {
            this.selectedFicha = { idFicha, codigoFicha: idFicha, jornada: '' };
        }

        const f          = this.selectedFicha;
        const progNombre = f.programa?.nombre ?? f.nombrePrograma ?? '';
        const sedeNombre = f.sede?.nombre ?? '';
        const jornada    = f.jornada || f.jornadaFormacion || '';
        const fechaIni   = f.fechaInicio ?? f.fecha_inicio ?? '';
        const fechaFin   = f.fechaFin    ?? f.fecha_fin    ?? '';

        const jornadaIcon = jornada.toLowerCase().includes('noche')    ? 'bi-moon-stars'
            : jornada.toLowerCase().includes('tarde')    ? 'bi-sunset'
            : jornada.toLowerCase().includes('madrugada') ? 'bi-moon'
            : 'bi-sun';

        document.getElementById('lbl-ficha-context').innerHTML =
            `<span class="me-2">${escapeHtml(f.codigoFicha)}</span>
             ${jornada    ? `<span class="badge bg-white bg-opacity-25 text-white border border-white border-opacity-25 fw-normal me-1" style="font-size:0.7rem;"><i class="bi ${jornadaIcon} me-1"></i>${escapeHtml(jornada)}</span>` : ''}
             ${progNombre ? `<span class="badge bg-white bg-opacity-25 text-white border border-white border-opacity-25 fw-normal me-1" style="font-size:0.7rem;"><i class="bi bi-journal-bookmark me-1"></i>${escapeHtml(progNombre)}</span>` : ''}
             ${sedeNombre ? `<span class="badge bg-white bg-opacity-25 text-white border border-white border-opacity-25 fw-normal me-1" style="font-size:0.7rem;"><i class="bi bi-building me-1"></i>${escapeHtml(sedeNombre)}</span>` : ''}
             ${fechaIni && fechaFin ? `<span class="badge bg-white bg-opacity-25 text-white border border-white border-opacity-25 fw-normal" style="font-size:0.68rem;"><i class="bi bi-calendar-range me-1"></i>${escapeHtml(fechaIni)} → ${escapeHtml(fechaFin)}</span>` : ''}`;

        if (fechaIni) document.getElementById('fecha_inicio').value = fechaIni;
        if (fechaFin)  document.getElementById('fecha_fin').value   = fechaFin;

        const idSedeFicha = f.idSede ?? f.sede?.idSede ?? null;
        if (idSedeFicha) {
            this.selectedSedeId = idSedeFicha;
            const selSede = document.getElementById('idSede');
            if (selSede) selSede.value = idSedeFicha;
        }

        this._ddAmbiente?.reset();
        this._mostrarPanelFormulario();
        this._mostrarRecomendacionContrajornada(this.selectedFicha);

        // Actualizar tabla marcando la fila de la ficha activa (sin nueva llamada API)
        this._renderTablaInstructor();
    }

    /* ── EVENTOS ────────────────────────────────────────────────────────── */
    setupEventListeners() {
        document.getElementById('modalidad_clase')?.addEventListener('change', e => {
            const isVirtual = e.target.value === 'virtual';
            const contAmbiente = document.getElementById('container-ambiente');
            if (contAmbiente) {
                contAmbiente.style.opacity = isVirtual ? '0.4' : '1';
                contAmbiente.style.pointerEvents = isVirtual ? 'none' : '';
            }
            document.getElementById('idAmbiente').required = !isVirtual;
            if (isVirtual) this._ddAmbiente?.reset();
        });

        document.getElementById('btn-cambiar-ficha')?.addEventListener('click', () => {
            this.selectedFicha = null;
            this._ocultarPanelFormulario();
            const rec = document.getElementById('recomendacion-contrajornada');
            if (rec) { rec.classList.add('d-none'); rec.innerHTML = ''; }
            this._ddFicha?.reset();
            this._renderTablaInstructor();
        });

        const btnAmbientesLibres = document.getElementById('btn-ambientes-libres');
        const _cerrarDropdownDisponibles = () => {
            if (this._ddAmbienteDisponibles) {
                this._ddAmbienteDisponibles._dropdown?.remove();
                document.removeEventListener('click', this._ddAmbienteDisponibles._bound);
            }
            this._ddAmbienteDisponibles = null;
            this.mostrarDropdownDisponibles = false;
            if (btnAmbientesLibres) {
                btnAmbientesLibres.classList.remove('btn-primary');
                btnAmbientesLibres.classList.add('btn-outline-primary');
                btnAmbientesLibres.innerHTML = '<i class="bi bi-unlock me-1"></i>Libres';
            }
        };

        const _abrirDropdownDisponibles = () => {
            if (!this.ambientesDisponibles.length) return;
            _cerrarDropdownDisponibles();
            const btn  = btnAmbientesLibres;
            const rect = btn.getBoundingClientRect();
            const panel = document.createElement('div');
            panel.className = 'sd-dropdown';
            const items = this.ambientesDisponibles.map(a => ({
                id: a.idAmbiente,
                label: a.nombreCompleto || `Ambiente ${a.idAmbiente}`,
                sub: ''
            }));
            panel.innerHTML = `
                <div class="sd-search-wrap">
                    <i class="bi bi-search sd-icon"></i>
                    <input type="text" class="sd-search" placeholder="Filtrar disponibles..." autocomplete="off" spellcheck="false">
                    <button type="button" class="sd-clear" title="Limpiar"><i class="bi bi-x"></i></button>
                </div>
                <ul class="sd-list"></ul>
                <div class="sd-empty d-none"><i class="bi bi-inbox-fill"></i><span>No hay ambientes disponibles</span></div>`;

            const _hl = (str, q) => {
                if (!str) return '';
                if (!q) return escapeHtml(str);
                const idx = str.toLowerCase().indexOf(q.toLowerCase());
                if (idx === -1) return escapeHtml(str);
                return escapeHtml(str.slice(0, idx)) +
                    `<mark class="sd-hl">${escapeHtml(str.slice(idx, idx + q.length))}</mark>` +
                    escapeHtml(str.slice(idx + q.length));
            };
            const _filter = (q) => {
                const list  = panel.querySelector('.sd-list');
                const empty = panel.querySelector('.sd-empty');
                const lq = q.trim();
                const fil = lq ? items.filter(i => (i.label || '').toLowerCase().includes(lq.toLowerCase())) : items;
                if (!fil.length) { list.innerHTML = ''; empty.classList.remove('d-none'); return; }
                empty.classList.add('d-none');
                list.innerHTML = fil.map(item =>
                    `<li class="sd-item" data-id="${escapeHtml(String(item.id))}" data-label="${escapeHtml(item.label || '')}">
                        <span class="sd-label">${_hl(item.label, lq)}</span>
                     </li>`
                ).join('');
            };

            const ddH   = 320;
            const below = window.innerHeight - rect.bottom;
            const goUp  = below < ddH + 8 && rect.top > ddH + 8;
            panel.style.cssText = `position:fixed;z-index:9999;width:${Math.max(rect.width, 240)}px;left:${rect.left}px;top:${goUp ? (rect.top - Math.min(ddH, 320) - 4) : (rect.bottom + 4)}px;`;

            document.body.appendChild(panel);
            _filter('');

            const searchInput = panel.querySelector('.sd-search');
            const clearBtn    = panel.querySelector('.sd-clear');
            searchInput.addEventListener('input', () => {
                clearBtn.classList.toggle('visible', searchInput.value.length > 0);
                _filter(searchInput.value);
            });
            clearBtn.addEventListener('click', e => {
                e.stopPropagation();
                searchInput.value = '';
                clearBtn.classList.remove('visible');
                _filter('');
                searchInput.focus();
            });
            panel.addEventListener('click', e => {
                const li = e.target.closest('.sd-item');
                if (!li) return;
                this._ddAmbiente.setValue(li.dataset.id, li.dataset.label);
                this._verificarCompatibilidadInstructorAmbiente(li.dataset.id);
                _cerrarDropdownDisponibles();
            });

            const onOutside = e => {
                if (!panel.contains(e.target) && e.target !== btn && !btn.contains(e.target))
                    _cerrarDropdownDisponibles();
            };
            setTimeout(() => document.addEventListener('click', onOutside), 0);
            this._ddAmbienteDisponibles = { _dropdown: panel, _bound: onOutside };
            this.mostrarDropdownDisponibles = true;
            btnAmbientesLibres.classList.remove('btn-outline-primary');
            btnAmbientesLibres.classList.add('btn-primary');
            btnAmbientesLibres.innerHTML = `<i class="bi bi-funnel-fill me-1"></i>${items.length}`;
            setTimeout(() => searchInput.focus(), 80);
        };

        if (btnAmbientesLibres) {
            btnAmbientesLibres.addEventListener('click', async e => {
                e.stopPropagation();
                if (this.mostrarDropdownDisponibles) { _cerrarDropdownDisponibles(); return; }
                const idSede      = document.getElementById('idSede')?.value || this.selectedSedeId;
                const fechaInicio = document.getElementById('fecha_inicio')?.value;
                const fechaFin    = document.getElementById('fecha_fin')?.value;
                const horaInicio  = document.getElementById('hora_inicio')?.value;
                const horaFin     = document.getElementById('hora_fin')?.value;
                if (!idSede || !fechaInicio || !fechaFin || !horaInicio || !horaFin) {
                    this.showAlert('form-alert', 'warning', 'Completa fechas y horas primero.');
                    return;
                }
                const orgText = btnAmbientesLibres.innerHTML;
                btnAmbientesLibres.disabled = true;
                btnAmbientesLibres.innerHTML = '<span class="spinner-border spinner-border-sm"></span>';
                try {
                    const payload = {
                        idSede: parseInt(idSede), fechaInicio, fechaFin,
                        horaInicio: horaInicio.length === 5 ? horaInicio + ':00' : horaInicio,
                        horaFin:    horaFin.length    === 5 ? horaFin    + ':00' : horaFin
                    };
                    const response = await apiCall('/ambientes/disponibles', 'POST', payload);
                    const disponibles = response.data || response || [];
                    this.ambientesDisponibles = Array.isArray(disponibles) ? disponibles : [];
                    if (!this.ambientesDisponibles.length) {
                        this.showAlert('form-alert', 'warning', 'No se encontraron ambientes disponibles.');
                        btnAmbientesLibres.innerHTML = orgText;
                        return;
                    }
                    this.showAlert('form-alert', 'success', `${this.ambientesDisponibles.length} ambiente(s) disponible(s).`);
                    _abrirDropdownDisponibles();
                } catch (err) {
                    this.showAlert('form-alert', 'danger', 'Error: ' + err.message);
                    btnAmbientesLibres.innerHTML = orgText;
                } finally {
                    btnAmbientesLibres.disabled = false;
                }
            });
        }

        document.getElementById('idSede')?.addEventListener('change', () => {
            this._ddAmbiente?.reset();
            _cerrarDropdownDisponibles();
        });

        document.getElementById('form-horario')?.addEventListener('submit', e => {
            e.preventDefault();
            this.handleSubmit();
        });

        ['fecha_inicio', 'fecha_fin', 'hora_inicio', 'hora_fin'].forEach(id => {
            document.getElementById(id)?.addEventListener('change', () => {
                this._calcularHorasFormacion();
                _cerrarDropdownDisponibles();
            });
        });
        document.getElementById('dias-container')?.addEventListener('change', () => {
            this._calcularHorasFormacion();
        });

         document.querySelectorAll('[data-bs-toggle="tooltip"]').forEach(el => {
          new bootstrap.Tooltip(el, {
            html: true
          });
        });
    }

    /* ── JUICIOS ────────────────────────────────────────────────────────── */
    _initJuiciosEvents() {
        const btnJuicios = document.getElementById('btn-juicios-evaluativos');
        const fileInput  = document.getElementById('file-juicios');
        if (!btnJuicios || !fileInput) return;
        btnJuicios.addEventListener('click', () => {
            if (!this.selectedFicha) {
                this.showAlert('page-alert-container', 'warning', 'Selecciona primero una ficha.');
                return;
            }
            fileInput.click();
        });
        fileInput.addEventListener('change', async e => {
            const file = e.target.files[0];
            if (!file) return;
            try {
                const alertEl = this.showAlert('page-alert-container', 'info',
                    `Analizando juicios de la ficha ${this.selectedFicha.codigoFicha}...`);
                const data = await analizarJuiciosConFicha(file, this.selectedFicha.idFicha);
                alertEl?.remove();
                this.renderAnalisisJuicios(data);
            } catch (err) {
                this.showAlert('page-alert-container', 'danger', 'Error al analizar: ' + err.message);
            } finally {
                e.target.value = '';
            }
        });
    }

    /* ── CÁLCULO DE HORAS ───────────────────────────────────────────────── */
    _calcularHorasFormacion() {
        const container    = document.getElementById('resumen-horas-container');
        const elTotalHoras = document.getElementById('rh-total-horas');
        const elTotalDias  = document.getElementById('rh-total-dias');
        const elHorasDia   = document.getElementById('rh-horas-dia');
        const elWarning    = document.getElementById('rh-warning');
        const elWarningMsg = document.getElementById('rh-warning-msg');
        if (!container) return;

        const fechaInicioVal = document.getElementById('fecha_inicio')?.value;
        const fechaFinVal    = document.getElementById('fecha_fin')?.value;
        const horaInicioVal  = document.getElementById('hora_inicio')?.value;
        const horaFinVal     = document.getElementById('hora_fin')?.value;

        if (!fechaInicioVal && !fechaFinVal && !horaInicioVal && !horaFinVal) {
            container.style.cssText = 'display:none!important;';
            return;
        }
        container.style.cssText = 'display:block!important;';
        elWarning.classList.add('d-none');
        elWarningMsg.textContent = '';

        if (fechaInicioVal && fechaFinVal && fechaFinVal < fechaInicioVal) {
            elWarningMsg.textContent = 'La fecha fin no puede ser anterior a la fecha inicio.';
            elWarning.classList.remove('d-none');
            [elTotalHoras, elTotalDias, elHorasDia].forEach(el => el.textContent = '—');
            return;
        }

        let horasPorDia = 0;
        if (horaInicioVal && horaFinVal) {
            const [hI, mI] = horaInicioVal.split(':').map(Number);
            const [hF, mF] = horaFinVal.split(':').map(Number);
            const minutos  = (hF * 60 + mF) - (hI * 60 + mI);
            if (minutos <= 0) {
                elWarningMsg.textContent = 'La hora fin debe ser mayor a la hora inicio.';
                elWarning.classList.remove('d-none');
                [elTotalHoras, elTotalDias, elHorasDia].forEach(el => el.textContent = '—');
                return;
            }
            horasPorDia = minutos / 60;
        }

        const diasSel = new Set(
            [...document.querySelectorAll('#dias-container input[type="checkbox"]:checked')]
                .map(cb => parseInt(cb.value))
        );

        let diasValidos = 0;
        if (fechaInicioVal && fechaFinVal && diasSel.size > 0) {
            const cur = new Date(fechaInicioVal + 'T00:00:00');
            const end = new Date(fechaFinVal    + 'T00:00:00');
            while (cur <= end) {
                const jsDow = cur.getDay();
                if (diasSel.has(jsDow === 0 ? 7 : jsDow)) diasValidos++;
                cur.setDate(cur.getDate() + 1);
            }
        }

        const totalHoras = diasValidos * horasPorDia;
        const fmt = n => Number.isInteger(n) ? n.toString() : n.toFixed(1);

        elTotalHoras.textContent = horasPorDia > 0 && diasValidos > 0 ? fmt(totalHoras) : '—';
        elTotalDias.textContent  = fechaInicioVal && fechaFinVal && diasSel.size > 0 ? diasValidos.toString() : '—';
        elHorasDia.textContent   = horasPorDia > 0 ? fmt(horasPorDia) : '—';

        if (fechaInicioVal && fechaFinVal && horasPorDia > 0 && diasSel.size === 0) {
            elWarningMsg.textContent = 'Selecciona al menos un día de la semana.';
            elWarning.classList.remove('d-none');
        }
    }

    /* ── ELIMINAR ───────────────────────────────────────────────────────── */
    async eliminarDiaDeBloque(idBloque, idDia, nombreDia, idAsignacion) {
        const result = await Swal.fire({
            title: '¿Opciones de eliminación?',
            text: '¿Qué deseas eliminar de este instructor?',
            icon: 'warning',
            showCancelButton: true, showDenyButton: true,
            confirmButtonColor: '#3085d6', denyButtonColor: '#d33', cancelButtonColor: '#6c757d',
            confirmButtonText: `Solo el día ${nombreDia}`,
            denyButtonText: 'Toda la asignación',
            cancelButtonText: 'Cancelar'
        });
        if (result.isConfirmed) {
            try {
                await apiCall(`/eliminarDiaDeBloque/${idBloque}/${idDia}`, 'DELETE');
                this.showAlert('page-alert-container', 'success', `Día ${nombreDia} eliminado correctamente.`);
                await this._cargarTablaInstructor(this._idInstructorActivo);
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
        } else if (result.isDenied) {
            this.deleteAsignacion(idAsignacion, true);
        }
    }

    async deleteAsignacion(id, skipConfirm = false) {
        if (!skipConfirm && !confirm('¿Eliminar esta Formación del horario por completo?')) return;
        try {
            await apiCall('/eliminarAsignacion/' + id, 'DELETE');
            this.showAlert('page-alert-container', 'success', 'Formación eliminada correctamente.');
            if (this._idInstructorActivo) {
                await this._cargarTablaInstructor(this._idInstructorActivo);
            }
        } catch (err) {
            this.showAlert('page-alert-container', 'danger', 'Error al eliminar: ' + err.message);
        }
    }

    /* ── SUBMIT ─────────────────────────────────────────────────────────── */
    async handleSubmit() {
        this._ocultarBotonConflicto();
        const btn = document.getElementById('btn-asignar');
        if (btn.disabled) return;
        btn.disabled = true;
        btn.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span>Guardando...';

        const dias = Array.from(document.querySelectorAll('#dias-container .btn-check:checked'))
            .map(c => parseInt(c.value));
        if (!dias.length) {
            this.showAlert('form-alert', 'warning', 'Selecciona al menos un día.');
            btn.disabled = false;
            btn.innerHTML = '<i class="bi bi-calendar-check"></i> Guardar';
            return;
        }
        const modalidad  = document.getElementById('modalidad_clase').value || null;
        const idAmbiente = parseInt(document.getElementById('idAmbiente').value) || null;
        if (modalidad === 'presencial' && !idAmbiente) {
            this.showAlert('form-alert', 'warning', 'Selecciona un ambiente para modalidad presencial.');
            btn.disabled = false;
            btn.innerHTML = '<i class="bi bi-calendar-check"></i> Guardar';
            return;
        }

        const payload = {
            horaInicio:    document.getElementById('hora_inicio').value + ':00',
            horaFin:       document.getElementById('hora_fin').value + ':00',
            modalidad,
            tipoFormacion: 'transversal',
            idFuncionario: parseInt(document.getElementById('idFuncionario').value),
            dias,
            idAmbiente:    modalidad === 'presencial' ? idAmbiente : null,
            idFicha:       this.selectedFicha.idFicha,
            fechaInicio:   document.getElementById('fecha_inicio').value,
            fechaFin:      document.getElementById('fecha_fin').value,
            observaciones: document.getElementById('observacion')?.value || null,
            estado:        'activo',
        };

        try {
            await apiCall('/crearAsignacion', 'POST', payload);
            document.getElementById('form-alert').innerHTML = '';
            if (this._idInstructorActivo) {
                await this._cargarTablaInstructor(this._idInstructorActivo);
            }
            this.showAlert('page-alert-container', 'success', 'Clase asignada correctamente al horario.');
        } catch (err) {
            if (err.tipo === 'conflicto_ambiente' && err.codigoFicha) {
                this.showAlert('form-alert', 'warning', `<i class="bi bi-exclamation-triangle-fill me-2"></i>${err.message}`);
            } else if (err.tipo === 'conflicto_instructor' && err.conflicto) {
                this._mostrarOpcionesConflictoInstructor(err, payload);
            } else {
                let msg = err.message;
                if (msg.toLowerCase().includes('conflicto'))
                    msg = '<i class="bi bi-exclamation-triangle-fill me-2"></i>' + msg;
                this.showAlert('form-alert', 'danger', msg);
            }
        } finally {
            btn.disabled = false;
            btn.innerHTML = '<i class="bi bi-calendar-check"></i> Guardar';
        }
    }

    /* ── CONFLICTOS ─────────────────────────────────────────────────────── */
    _mostrarOpcionesConflictoInstructor(err, payload) {
        const container = document.getElementById('acciones-conflicto');
        if (!container) return;
        this.showAlert('form-alert', 'warning', `<i class="bi bi-exclamation-triangle-fill me-2"></i>${err.message}`);

        const normalizar = h => h ? h.substring(0, 5) : '';
        const toMin = h => { if (!h) return 0; const [hh, mm] = h.substring(0, 5).split(':').map(Number); return hh * 60 + mm; };
        const existenteInicio = normalizar(err.conflicto.horaInicio);
        const existenteFin    = normalizar(err.conflicto.horaFin);
        const nuevoInicio     = normalizar(payload.horaInicio);
        const esParcial = toMin(payload.horaInicio) > toMin(err.conflicto.horaInicio) &&
            toMin(payload.horaInicio) < toMin(err.conflicto.horaFin) &&
            toMin(payload.horaFin) <= toMin(err.conflicto.horaFin);

        container.classList.remove('d-none');
        container.innerHTML = `
            <div class="d-flex flex-column gap-2 w-100 bg-light p-2 rounded-3 border">
                <p class="mb-1 text-dark fw-bold" style="font-size:0.82rem;">
                    <i class="bi bi-exclamation-triangle-fill text-warning me-1"></i>Resolver conflicto:
                </p>
                <button type="button" id="btn-reemplazar-conflicto"
                        class="btn btn-outline-danger w-100 btn-sm rounded-3 text-start px-2 py-1">
                    <div class="fw-bold" style="font-size:0.8rem;"><i class="bi bi-trash3 me-1"></i> Eliminar horario existente</div>
                    <div class="small opacity-75" style="white-space:normal;font-size:0.72rem;">
                        Ficha <strong>${escapeHtml(String(err.codigoFicha))}</strong> (${existenteInicio} – ${existenteFin})
                    </div>
                </button>
                ${esParcial ? `
                <button type="button" id="btn-partir-conflicto"
                        class="btn btn-outline-warning w-100 btn-sm rounded-3 text-start px-2 py-1 text-dark border-warning">
                    <div class="fw-bold" style="font-size:0.8rem;"><i class="bi bi-scissors me-1"></i> Acortar horario existente</div>
                    <div class="small opacity-75" style="white-space:normal;font-size:0.72rem;">
                        <strong>${escapeHtml(String(err.codigoFicha))}</strong>: ${existenteInicio} → <strong>${nuevoInicio}</strong>
                    </div>
                </button>` : ''}
            </div>`;

        document.getElementById('btn-reemplazar-conflicto').addEventListener('click', e => {
            e.preventDefault();
            this._resolverConflictoInstructor('/conflicto/reemplazar', { ...payload, idBloque: err.conflicto.idBloque });
        });
        if (esParcial) {
            document.getElementById('btn-partir-conflicto').addEventListener('click', e => {
                e.preventDefault();
                const _toHis = h => h ? (h.split(':').length === 2 ? h + ':00' : h) : null;
                this._resolverConflictoInstructor('/conflicto/partir', {
                    ...payload,
                    idBloque:        err.conflicto.idBloque,
                    nuevaHoraInicio: _toHis(payload.horaInicio),
                    nuevaHoraFin:    _toHis(payload.horaFin),
                });
            });
        }
    }

    async _resolverConflictoInstructor(endpoint, payload) {
        const container = document.getElementById('acciones-conflicto');
        const btns = container.querySelectorAll('button');
        btns.forEach(b => b.disabled = true);
        try {
            await apiCall(endpoint, 'POST', payload);
            this._ocultarBotonConflicto();
            document.getElementById('form-horario').reset();
            document.getElementById('form-alert').innerHTML = '';
            this._ddInstructor?.reset('Seleccionar instructor...');
            this.showAlert('page-alert-container', 'success', 'Conflicto resuelto y clase asignada correctamente.');
            if (this._idInstructorActivo) {
                await this._cargarTablaInstructor(this._idInstructorActivo);
            }
        } catch (err) {
            this.showAlert('form-alert', 'danger', 'Error al resolver conflicto: ' + err.message);
            btns.forEach(b => b.disabled = false);
        }
    }

    _ocultarBotonConflicto() {
        const container = document.getElementById('acciones-conflicto');
        if (!container) return;
        container.classList.add('d-none');
        container.innerHTML = '';
    }

    /* ── ANÁLISIS DE JUICIOS ────────────────────────────────────────────── */
    renderAnalisisJuicios(data) {
        const pendientes = data.competencias_pendientes || [];
        const cubiertas  = data.competencias_cubiertas  || [];
        const umbral     = data.umbral_usado ?? 80;

        let html = `
            <div class="alert alert-light border mb-3 py-2 px-3" style="font-size:0.85rem;">
                <i class="bi bi-info-circle me-1 text-primary"></i>
                <strong>Ficha:</strong> ${data.ficha || '—'}
                &nbsp;·&nbsp;<strong>Programa:</strong> ${data.programa || '—'}
                &nbsp;·&nbsp;<strong>Tipo Formación:</strong> ${data.tipo_formacion || '—'}
            </div>
            <div class="row g-3 mb-4">
                <div class="col-md-4"><div class="card border-0 bg-danger text-white shadow-sm h-100"><div class="card-body">
                    <h6 class="card-title fw-bold mb-1 opacity-75">Pendientes</h6>
                    <h2 class="mb-0 fw-bold">${pendientes.length}</h2>
                    <small>Por debajo del ${umbral}%</small>
                </div></div></div>
                <div class="col-md-4"><div class="card border-0 bg-success text-white shadow-sm h-100"><div class="card-body">
                    <h6 class="card-title fw-bold mb-1 opacity-75">Cubiertas</h6>
                    <h2 class="mb-0 fw-bold">${cubiertas.length}</h2>
                    <small>Superan el umbral</small>
                </div></div></div>
                <div class="col-md-4"><div class="card border-0 bg-white border-start border-primary border-4 shadow-sm h-100"><div class="card-body">
                    <h6 class="card-title text-muted fw-bold mb-1">Total Aprendices</h6>
                    <h2 class="mb-0 fw-bold text-dark">${data.total_aprendices || 0}</h2>
                    <small class="text-muted">Umbral: ${umbral}%</small>
                </div></div></div>
            </div>`;

        const filaResultado = (res) => {
            const estado   = res.estado ?? (res.necesita_horario ? 'pendiente' : 'evaluado');
            const rowClass = estado === 'sin_datos' ? 'table-secondary' : estado === 'pendiente' ? 'table-warning' : '';
            const badge    = estado === 'evaluado'
                ? `<span class="badge bg-success"><i class="bi bi-check"></i> Evaluado</span>`
                : estado === 'pendiente'
                    ? `<span class="badge bg-warning text-dark"><i class="bi bi-clock"></i> Pendiente</span>`
                    : `<span class="badge bg-secondary"><i class="bi bi-dash"></i> Sin datos</span>`;
            const pct = res.porcentaje_aprobacion ?? res.porcentaje ?? 0;
            return `<tr class="${rowClass}">
                <td><small>${res.nombre || res.nombre_completo || res.codigo || '—'}</small></td>
                <td class="text-center">${res.aprobados ?? 0}</td>
                <td class="text-center">${res.total_con_juicio ?? 0}</td>
                <td class="text-center"><strong>${pct}%</strong></td>
                <td class="text-center">${badge}</td>
            </tr>`;
        };

        const bloqueCompetencias = (lista, tipo) => {
            if (!lista.length) return `<p class="text-muted fst-italic text-center py-3">Ninguna competencia ${tipo === 'pendiente' ? 'pendiente' : 'cubierta'}.</p>`;
            let out = `<div class="accordion" id="accordion-${tipo}">`;
            lista.forEach((comp, idx) => {
                const isPend = tipo === 'pendiente';
                const pct    = comp.porcentaje ?? comp.porcentaje_minimo ?? 0;
                const badge  = isPend
                    ? `<span class="badge bg-danger rounded-pill">Pendiente ${Number(pct).toFixed(1)}%</span>`
                    : `<span class="badge bg-success rounded-pill">Cubierto ${Number(pct).toFixed(1)}%</span>`;
                const resumen = comp.resumen_resultados;
                const resumenHtml = resumen ? `<div class="text-muted small mt-1">
                    BD: ${resumen.total} total · <span class="text-success">${resumen.evaluados} evaluados</span>
                    · <span class="text-warning">${resumen.pendientes} pendientes</span>
                    · <span class="text-secondary">${resumen.sin_datos} sin datos</span>
                </div>` : '';
                const tableRows = (comp.resultados || []).map(filaResultado).join('');
                out += `
                    <div class="accordion-item mb-2 border rounded-3 shadow-sm" style="overflow:hidden;">
                        <h2 class="accordion-header">
                            <button class="accordion-button ${isPend ? '' : 'collapsed'} flex-column align-items-start"
                                    type="button" data-bs-toggle="collapse" data-bs-target="#collapse-${tipo}-${idx}">
                                <div class="d-flex w-100 justify-content-between">
                                    <span class="fw-semibold" style="max-width:420px;">${escapeHtml(comp.codigo)} — ${escapeHtml(comp.nombre || '')}</span>
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
                                    <tbody>${tableRows || '<tr><td colspan="5" class="text-center text-muted">Sin resultados en BD</td></tr>'}</tbody>
                                </table>
                            </div>
                        </div>
                    </div>`;
            });
            return out + '</div>';
        };

        html += `
            <h6 class="fw-bold text-danger mb-2 mt-1"><i class="bi bi-exclamation-triangle-fill me-1"></i>Competencias Pendientes (${pendientes.length})</h6>
            ${bloqueCompetencias(pendientes, 'pendiente')}
            <hr class="my-4">
            <h6 class="fw-bold text-success mb-2"><i class="bi bi-check-circle-fill me-1"></i>Competencias Cubiertas (${cubiertas.length})</h6>
            ${bloqueCompetencias(cubiertas, 'cubierta')}`;

        document.getElementById('body-analisis-juicios').innerHTML = html;
        bootstrap.Modal.getOrCreateInstance(document.getElementById('modalAnalisisJuicios')).show();
    }

    /* ── ALERT HELPER ───────────────────────────────────────────────────── */
    showAlert(containerId, type, message) {
        const el = document.getElementById(containerId);
        if (!el) return null;
        const icons = { success: 'check-circle', danger: 'x-circle', warning: 'exclamation-triangle', info: 'info-circle' };
        el.innerHTML = `
            <div class="alert alert-${type} alert-dismissible fade show d-flex align-items-center gap-3 rounded-4 shadow-sm" role="alert">
                <i class="bi bi-${icons[type] ?? 'info-circle'} fs-5 flex-shrink-0"></i>
                <div>${message}</div>
                <button type="button" class="btn-close ms-auto" data-bs-dismiss="alert"></button>
            </div>`;
        const alertEl = el.querySelector('.alert');
        if (type === 'success') setTimeout(() => alertEl?.remove(), 4000);
        return alertEl;
    }
}

document.addEventListener('DOMContentLoaded', () => { new HorarioFormativa(); });