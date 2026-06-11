import { ProtectedRoute } from '../components/ProtectedRoute.js';
import { Navbar, initNavbarEvents } from '../components/Navbar.js';
import { Sidebar, initSidebarEvents } from '../components/Sidebar.js';
import { SearchableDropdown } from '../components/SearchableDropdown.js';
import {
    apiFetch, getAmbientes, getFuncionarios, getSedes, analizarJuiciosConFicha,
    getProgramasPorSede, getFichasPorProgramaSede, getAreas
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

                    <!-- Encabezado -->
                    <div class="d-flex align-items-center gap-3 mb-3">
                        <div class="page-icon"><i class="bi bi-calendar-event"></i></div>
                        <div>
                            <h4 class="fw-bold mb-0" style="color:var(--text-dark)">Horario Transversal</h4>
                            <small class="text-muted">Selecciona área, instructor y ficha para gestionar el horario</small>
                        </div>
                    </div>

                    <!-- ══════════════════════════════
                         PANEL BÚSQUEDA: Área → Instructor → Ficha
                    ══════════════════════════════════ -->
                    <div class="card border-0 shadow-sm rounded-4 mb-3">
                        <div class="card-body px-4 py-3">
                            <div class="row g-3 align-items-end">

                                <!-- Área -->
                                <div class="col-md-3">
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

                                <!-- Instructor (depende del área) -->
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

                                <!-- Buscador de ficha por código -->
                                <div class="col-md-4">
                                    <label class="form-label small fw-semibold text-muted mb-1 text-uppercase" style="letter-spacing:.04em;">
                                        <i class="bi bi-search text-primary me-1"></i>Código de Ficha
                                    </label>
                                    <div class="d-flex gap-2">
                                        <input type="text" id="fichaCodigoInput"
                                               class="form-control form-control-sm rounded-3"
                                               placeholder="Ej: 2875643"
                                               style="letter-spacing:.05em;">
                                        <button type="button" id="btn-buscar-ficha"
                                                class="btn btn-sm btn-primary rounded-3 px-3 flex-shrink-0"
                                                style="white-space:nowrap;">
                                            <i class="bi bi-search me-1"></i>Buscar
                                        </button>
                                    </div>
                                </div>

                                <!-- Botón Analizar Juicios -->
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

                    <!-- Banner ficha seleccionada -->
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

                    <!-- ══════════════════════════════
                         FORMULARIO (compacto)
                    ══════════════════════════════════ -->
                    
                    <div id="panel-formulario" class="d-none mb-3">
                        <div class="card border-0 shadow-sm rounded-4">
                            <div class="card-body px-4 py-3">
                                <div id="form-alert" class="mb-2"></div>
                                <form id="form-horario" novalidate>
                                    <div class="row g-2 align-items-end">

                                       <div class="row g-3">

                                        <!-- IZQUIERDA -->
                                        <div class="col-md-8">

                                            <div class="row g-2">

                                                <!-- Modalidad -->
                                                <div class="col-md-6">
                                                    <label class="form-label small mb-1">Modalidad</label>
                                                    <select class="form-select form-select-sm" id="modalidad_clase">
                                                        <option value="presencial">Presencial</option>
                                                        <option value="virtual">Virtual</option>
                                                    </select>
                                                </div>

                                                <!-- Ambiente -->
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
                                                            <i class="bi bi-unlock  me-1"></i>Libres
                                                        </button>
                                                    </div>
                                                </div>

                                                <!-- Observación -->
                                                <div class="col-11">
                                                <label class="form-label small mb-1">
                                                    Observación
                                                </label>
                                                
                                                <input type="text"
                                                       class="form-control form-control-sm"
                                                       id="observacion"
                                                       placeholder="Ej. Bloque práctico...">
                                                       <br>
                                                <div id="recomendacion-contrajornada" class="d-none mt-1"></div>
                                            </div>

                                            </div>

                                        </div>

                                        <!-- DERECHA -->
                                        <div class="col-md-4">

                                            <div class="row g-2">

                                                <!-- Horas -->
                                                <div class="col-6">
                                                    <label class="form-label small mb-1">Hora Inicio</label>
                                                    <input type="time"
                                                           class="form-control form-control-sm"
                                                           id="hora_inicio">
                                                </div>

                                                <div class="col-6">
                                                    <label class="form-label small mb-1">Hora Fin</label>
                                                    <input type="time"
                                                           class="form-control form-control-sm"
                                                           id="hora_fin">
                                                </div>

                                                <!-- Fechas -->
                                                <div class="col-6">
                                                    <label class="form-label small mb-1">Fecha Inicio</label>
                                                    <input type="date"
                                                           class="form-control form-control-sm"
                                                           id="fecha_inicio">
                                                </div>

                                                <div class="col-6">
                                                    <label class="form-label small mb-1">Fecha Fin</label>
                                                    <input type="date"
                                                           class="form-control form-control-sm"
                                                           id="fecha_fin">
                                                </div>

                                                <!-- Días -->
                                                <div class="col-12">
                                                    <label class="form-label small mb-1">
                                                        Días
                                                    </label>

                                                    <div class="d-flex flex-wrap gap-1"
                                                         id="dias-container">
                                                    </div>
                                                </div>
                                            <!-- Resumen de horas — pegar ANTES del col-12 del botón Guardar -->
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
                                                <!-- Botón -->
                                                <div class="col-12">
                                                    <button type="submit"
                                                            id="btn-asignar"
                                                            class="btn btn-purple btn-sm w-100">
                                                        <i class="bi bi-calendar-check"></i>
                                                        Guardar
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

                    <!-- Calendario -->
                    <div id="main-content" class="fade-in"></div>

                    <!-- Modal Juicios -->
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
                getAmbientes(), getSedes(), getAreas()
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
        this.renderSedesSelectModal();

        // Días
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
        this._initFichaBuscador();
        this._initJuiciosEvents();
    }

    renderSedesSelectModal() {
        const sel = document.getElementById('idSede');
        if (!sel) return;
        sel.innerHTML = '<option value="">Seleccionar sede...</option>' +
            this.sedes.map(s => `<option value="${s.idSede}">${s.nombre}</option>`).join('');
    }

    /* ── DROPDOWN: ÁREA (usa /listarArea) ──────────────────────────────── */
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
                this.selectedAreaId = item.id;

                // Resetear instructor
                this._ddInstructor?.reset('Cargando instructores...');
                document.getElementById('instructorNombreDisplay').placeholder = 'Cargando instructores...';
                document.getElementById('idFuncionario').value = '';

                // Cargar instructores del área
                try {
                    const res = await apiCall(`/obtenerInstructorPorArea/${item.id}`);
                    this.instructores = res.data || (Array.isArray(res) ? res : []);
                    document.getElementById('instructorNombreDisplay').placeholder = 'Seleccionar instructor...';
                } catch {
                    this.instructores = [];
                    document.getElementById('instructorNombreDisplay').placeholder = 'Error al cargar';
                }
                // Re-init el dropdown de instructor con los nuevos datos
                this._initInstructorDropdown();
            }
        });
    }

   _mostrarRecomendacionContrajornada(ficha) {
    const el = document.getElementById('recomendacion-contrajornada');
    if (!el) return;

    const jornada = (ficha.jornada || ficha.jornadaFormacion || '').toLowerCase().trim();
    const codigo  = ficha.codigoFicha || ficha.idFicha || '';

    // 🔍 DEBUG temporal — eliminar una vez confirmes el valor
    console.log('[Jornada recibida]:', JSON.stringify(jornada));

    let rangoRecomendado = null;
    let iconoJornada     = 'bi-sun';

    // Jornada MAÑANA / MADRUGADA → contrajornada tarde
    if (/ma[ñn]ana|madrugada|diurna|6[\s\-–.]*12|06[\s\-–.]*12/.test(jornada)) {
        rangoRecomendado = '12:00 – 18:00';
        iconoJornada     = 'bi-sun';

    // Jornada TARDE → contrajornada mañana
    } else if (/tarde|12.?18/.test(jornada)) {
        rangoRecomendado = '06:00 – 12:00';
        iconoJornada     = 'bi-sunset';

    // Jornada NOCHE / NOCTURNA → contrajornada amplia
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
                Para asignar transversales a la ficha <strong>${codigo}</strong>
                se recomienda hacerlo de <strong>${rangoRecomendado}</strong>
                <span class="text-muted">(contrajornada <i class="bi ${iconoJornada}"></i>)</span>
            </span>
        </div>`;
}

    /* ── DROPDOWN: INSTRUCTOR (filtrado por área) ───────────────────────── */
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
                    // Resaltar área
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

    /* ── BUSCADOR DE FICHA POR CÓDIGO ──────────────────────────────────── */
    _initFichaBuscador() {
        const input  = document.getElementById('fichaCodigoInput');
        const btn    = document.getElementById('btn-buscar-ficha');
        if (!input || !btn) return;

        const buscar = async () => {
            const codigo = input.value.trim();
            if (!codigo) {
                input.focus();
                input.classList.add('is-invalid');
                setTimeout(() => input.classList.remove('is-invalid'), 1500);
                return;
            }

            btn.disabled = true;
            const orig = btn.innerHTML;
            btn.innerHTML = '<span class="spinner-border spinner-border-sm"></span>';

            try {
                const res = await apiCall(`/mostratFichaXCodigo/${encodeURIComponent(codigo)}`);
                const ficha = res.data || res;
                if (!ficha || !ficha.idFicha) throw new Error('Ficha no encontrada');

                // Guardar en lista local para compatibilidad
                this.fichas = [ficha];
                this._goToFicha(ficha.idFicha);
            } catch (err) {
                this.showAlert('page-alert-container', 'danger',
                    `<i class="bi bi-x-circle me-2"></i>No se encontró la ficha con código <strong>${codigo}</strong>.`);
            } finally {
                btn.disabled = false;
                btn.innerHTML = orig;
            }
        };

        btn.addEventListener('click', buscar);
        input.addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); buscar(); } });
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
            // usar this.selectedSedeId directamente, no leer del DOM
            const idSede = this.selectedSedeId
                || document.getElementById('idSede')?.value
                || null;

            if (!idSede) {
                this._ddAmbiente.setItems([]);
                return;
            }

            const idAreaPrograma = this.selectedFicha?.programa?.idArea;
            const filtered = this.ambientes.filter(
                a => String(a.idSede) === String(idSede)
            );

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

    /* ── VISTA PRINCIPAL ────────────────────────────────────────────────── */
    renderMainContent() {
        const container = document.getElementById('main-content');
        if (!container) return;
        if (!this.selectedFicha) {
            container.innerHTML = `
                <div class="card border-0 shadow-sm rounded-4">
                    <div class="card-body py-5 text-center text-muted d-flex flex-column align-items-center" style="min-height:300px;justify-content:center;">
                        <i class="bi bi-calendar-event fs-1 mb-3 opacity-25"></i>
                        <p class="fw-medium mb-1">Ingresa el código de la ficha para ver su horario</p>
                        <p class="small">Usa el buscador en la barra superior</p>
                    </div>
                </div>`;
        }
    }

    /* ── NAVEGACIÓN A FICHA ─────────────────────────────────────────────── */
    _goToFicha(id) {
        this.selectedFicha = this.fichas.find(f => String(f.idFicha) === String(id));
        if (!this.selectedFicha) return;
        this.selectFicha(id);
    }

    /* ── SELECT FICHA ───────────────────────────────────────────────────── */
    async selectFicha(idFicha) {
        if (!this.selectedFicha) {
            this.selectedFicha = { idFicha, codigoFicha: idFicha, jornada: '' };
        }

        const f = this.selectedFicha;
        const progNombre = f.programa?.nombre ?? f.nombrePrograma ?? '';
        const sedeNombre = f.sede?.nombre ?? '';
        const jornada    = f.jornada || f.jornadaFormacion || '';
        const fechaIni   = f.fechaInicio ?? f.fecha_inicio ?? '';
        const fechaFin   = f.fechaFin    ?? f.fecha_fin    ?? '';

        // Icono de jornada
        const jornadaIcon = jornada.toLowerCase().includes('noche') ? 'bi-moon-stars'
            : jornada.toLowerCase().includes('tarde') ? 'bi-sunset'
            : jornada.toLowerCase().includes('madrugada') ? 'bi-moon'
            : 'bi-sun';

        document.getElementById('lbl-ficha-context').innerHTML =
            `<span class="me-2">${f.codigoFicha}</span>
             ${jornada ? `<span class="badge bg-white bg-opacity-25 text-white border border-white border-opacity-25 fw-normal me-1" style="font-size:0.7rem;"><i class="bi ${jornadaIcon} me-1"></i>${jornada}</span>` : ''}
             ${progNombre ? `<span class="badge bg-white bg-opacity-25 text-white border border-white border-opacity-25 fw-normal me-1" style="font-size:0.7rem;"><i class="bi bi-journal-bookmark me-1"></i>${progNombre}</span>` : ''}
             ${sedeNombre ? `<span class="badge bg-white bg-opacity-25 text-white border border-white border-opacity-25 fw-normal me-1" style="font-size:0.7rem;"><i class="bi bi-building me-1"></i>${sedeNombre}</span>` : ''}
             ${fechaIni && fechaFin ? `<span class="badge bg-white bg-opacity-25 text-white border border-white border-opacity-25 fw-normal" style="font-size:0.68rem;"><i class="bi bi-calendar-range me-1"></i>${fechaIni} → ${fechaFin}</span>` : ''}`;

        // Pre-rellenar fechas
        if (fechaIni) document.getElementById('fecha_inicio').value = fechaIni;
        if (fechaFin)  document.getElementById('fecha_fin').value   = fechaFin;

        // Sincronizar sede con la de la ficha si viene
        const idSedeFicha = f.idSede ?? f.sede?.idSede ?? null;
        if (idSedeFicha) {
            this.selectedSedeId = idSedeFicha;
            const selSede = document.getElementById('idSede');
            if (selSede) selSede.value = idSedeFicha;
        }

        this._ddAmbiente?.reset();

        this._mostrarPanelFormulario();
        this._mostrarRecomendacionContrajornada(this.selectedFicha);

        const container = document.getElementById('main-content');
        container.innerHTML = `
            <div class="card border-0 shadow-sm rounded-4" id="calendario-card" style="min-height:480px;">
                <div class="card-body p-5 text-center d-flex flex-column align-items-center justify-content-center">
                    <div class="spinner-border text-primary mb-3" role="status"></div>
                    <p class="text-muted small">Cargando horario de ${f.codigoFicha}...</p>
                </div>
            </div>`;

        try {
            const response = await apiCall('/horariosPorFicha/' + idFicha);
            const asignaciones = response.data?.asignaciones || response.asignaciones || [];
            this.renderGrid(f, asignaciones);
        } catch (err) {
            document.getElementById('calendario-card').innerHTML = `
                <div class="card-body p-5 text-center text-danger">
                    <i class="bi bi-exclamation-triangle fs-1 mb-3 d-block opacity-50"></i>
                    <p>${err.message}</p>
                </div>`;
        }
    }

    /* ── EVENTOS ────────────────────────────────────────────────────────── */
    setupEventListeners() {
        // Modalidad → ambiente
        document.getElementById('modalidad_clase')?.addEventListener('change', e => {
            const isVirtual = e.target.value === 'virtual';
            const contAmbiente = document.getElementById('container-ambiente');
            if (contAmbiente) {
                contAmbiente.style.opacity = isVirtual ? '0.4' : '1';
                contAmbiente.style.pointerEvents = isVirtual ? 'none' : '';
            }
            document.getElementById('idAmbiente').required = !isVirtual;
            if (isVirtual) {
                this._ddAmbiente?.reset();
            
            }
        });

        // Cambiar ficha
        document.getElementById('btn-cambiar-ficha')?.addEventListener('click', () => {
            this.selectedFicha = null;
            this._ocultarPanelFormulario();
            this.renderMainContent();
            // Limpiar recomendación
            const rec = document.getElementById('recomendacion-contrajornada');
            if (rec) { rec.classList.add('d-none'); rec.innerHTML = ''; }
            const input = document.getElementById('fichaCodigoInput');
            if (input) { input.value = ''; input.focus(); }
        });

        // Ambientes Libres
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
                if (!q || !str) return str || '';
                const idx = str.toLowerCase().indexOf(q.toLowerCase());
                if (idx === -1) return str;
                return str.slice(0, idx) + `<mark class="sd-hl">${str.slice(idx, idx + q.length)}</mark>` + str.slice(idx + q.length);
            };
            const _filter = (q) => {
                const list  = panel.querySelector('.sd-list');
                const empty = panel.querySelector('.sd-empty');
                const lq = q.trim();
                const fil = lq ? items.filter(i => (i.label || '').toLowerCase().includes(lq.toLowerCase())) : items;
                if (!fil.length) { list.innerHTML = ''; empty.classList.remove('d-none'); return; }
                empty.classList.add('d-none');
                list.innerHTML = fil.map(item =>
                    `<li class="sd-item" data-id="${item.id}" data-label="${(item.label || '').replace(/"/g, '&quot;')}">
                        <span class="sd-label">${_hl(item.label, lq)}</span>
                     </li>`
                ).join('');
            };

            const ddH = 320;
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
                const idSede     = document.getElementById('idSede')?.value || this.selectedSedeId;
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
        const container     = document.getElementById('resumen-horas-container');
        const elTotalHoras  = document.getElementById('rh-total-horas');
        const elTotalDias   = document.getElementById('rh-total-dias');
        const elHorasDia    = document.getElementById('rh-horas-dia');
        const elWarning     = document.getElementById('rh-warning');
        const elWarningMsg  = document.getElementById('rh-warning-msg');
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

    /* ── GRID / FULLCALENDAR ────────────────────────────────────────────── */
    renderGrid(ficha, asignaciones) {
        const card    = document.getElementById('calendario-card');
        const isEmpty = !asignaciones || asignaciones.length === 0;

        const jornada = ficha.jornada || ficha.jornadaFormacion || '';
        const jornadaBadge = jornada
            ? `<span class="badge bg-light text-muted border ms-2" style="font-size:.7rem;"><i class="bi bi-clock me-1"></i>${jornada}</span>`
            : '';

        const header = `
            <div class="card-header bg-white border-0 d-flex flex-wrap justify-content-between align-items-center pt-3 pb-2 px-4 gap-3">
                <div>
                    <h5 class="fw-bold mb-0 d-flex align-items-center" style="color:var(--text-dark)">
                        Ficha ${ficha.codigoFicha}${jornadaBadge}
                    </h5>
                    <p class="small mb-0" style="color:var(--text-muted)">${ficha.programa?.nombre ?? ficha.nombrePrograma ?? ''}</p>
                    ${ficha.sede?.nombre ? `<p class="small mb-0" style="color:var(--text-muted)"><i class="bi bi-building me-1"></i>${ficha.sede.nombre}</p>` : ''}
                </div>
            </div>`;

        if (isEmpty) {
            card.innerHTML = header + `
                <div class="card-body p-5 text-center text-muted d-flex flex-column align-items-center justify-content-center" style="min-height:280px;">
                    <i class="bi bi-calendar-x fs-1 d-block mb-3 opacity-25"></i>
                    <p class="fw-medium">Sin formaciones asignadas</p>
                    <p class="small">Completa el formulario y haz clic en <strong>Guardar</strong>.</p>
                </div>`;
            return;
        }

        card.innerHTML = header +
            `<div class="card-body pt-2 px-4 pb-4" style="height:560px;">
                <div id="fullcalendar-container" class="h-100"></div>
             </div>`;

        const jsWeekday = date => date.getDay() === 0 ? 7 : date.getDay();
        const fechasDelDiaEnRango = (nombreDia, fechaInicioStr, fechaFinStr) => {
            const targetWd = DIA_ID_MAP[nombreDia];
            if (!targetWd || !fechaInicioStr || !fechaFinStr) return [];
            const start = new Date(fechaInicioStr + 'T00:00:00');
            const end   = new Date(fechaFinStr    + 'T00:00:00');
            const fechas = [];
            const cur = new Date(start);
            while (jsWeekday(cur) !== targetWd) {
                cur.setDate(cur.getDate() + 1);
                if (cur > end) return [];
            }
            while (cur <= end) {
                fechas.push(cur.toISOString().slice(0, 10));
                cur.setDate(cur.getDate() + 7);
            }
            return fechas;
        };

        const events = [];
        let globalStart = null, globalEnd = null;

        for (const asig of asignaciones) {
            const bloque    = asig.bloque;
            if (!bloque) continue;
            const startHour = bloque.horaInicio || bloque.hora_inicio;
            const endHour   = bloque.horaFin    || bloque.hora_fin;
            if (!startHour || !endHour) continue;
            const startDate = asig.fechaInicio || asig.fecha_inicio || bloque.fechaInicio || bloque.fecha_inicio;
            const endDate   = asig.fechaFin    || asig.fecha_fin    || bloque.fechaFin    || bloque.fecha_fin;
            if (startDate && (!globalStart || startDate < globalStart)) globalStart = startDate;
            if (endDate   && (!globalEnd   || endDate   > globalEnd))   globalEnd   = endDate;
            const isVirtual = asig.modalidad === 'virtual';

            (bloque.dias || []).forEach(diaObj => {
                const dia = diaObj.nombreDia || diaObj.nombre;
                if (!dia) return;
                const fechas = fechasDelDiaEnRango(dia, startDate, endDate);
                for (const fecha of fechas) {
                    events.push({
                        id: `${asig.idAsignacion}_${dia}_${fecha}`,
                        start: `${fecha}T${startHour}`,
                        end:   `${fecha}T${endHour}`,
                        orderPriority: 1,
                        backgroundColor: '#ffffff',
                        borderColor: isVirtual ? '#0dcaf0' : '#4caa16',
                        textColor:   isVirtual ? '#0dcaf0' : '#4caa16',
                        extendedProps: {
                            instructor: asig.funcionario
                                ? `${asig.funcionario.nombre || ''} ${asig.funcionario.apellido || asig.funcionario.apellidos || ''}`.trim()
                                : '—',
                            ambiente: asig.ambiente ? (asig.ambiente.codigo || asig.ambiente.nombre) : null,
                            modalidad: asig.modalidad,
                            tipoDeFormacion: asig.ficha?.programa?.tipoFormacion?.nombreTipoFormacion || '',
                            fechaInicio: startDate, fechaFin: endDate,
                            idBloque: bloque.idBloque,
                            idDia: diaObj.idDia || DIA_ID_MAP[dia],
                            nombreDia: dia,
                            idAsignacion: asig.idAsignacion,
                            observaciones: bloque.observaciones || bloque.observacion || '',
                        }
                    });
                }
            });
        }

        const initialDate      = globalStart ?? new Date().toISOString().slice(0, 10);
        const calendarWrapper  = document.getElementById('fullcalendar-container');

        const toolbarEl = document.createElement('div');
        toolbarEl.className = 'd-flex align-items-center justify-content-between mb-3';
        toolbarEl.innerHTML = `
            <div class="d-flex align-items-center gap-2">
                <button class="btn btn-sm btn-light border rounded-pill px-3 shadow-sm" id="fc-prev"><i class="bi bi-chevron-left"></i></button>
                <button class="btn btn-sm btn-light border rounded-pill px-3 shadow-sm" id="fc-next"><i class="bi bi-chevron-right"></i></button>
                <button class="btn btn-sm btn-light border rounded-pill px-3 shadow-sm" id="fc-today">Hoy</button>
            </div>
            <div class="text-center">
                <span id="fc-title" class="fw-semibold" style="color:var(--text-dark);font-size:.9rem;"></span>
                ${globalStart && globalEnd ? `<span class="badge bg-light text-muted border ms-2" style="font-size:.65rem;"><i class="bi bi-calendar-range me-1"></i>${globalStart} → ${globalEnd}</span>` : ''}
            </div>
            <div class="d-flex gap-2">
                <button class="btn btn-sm btn-light border rounded-pill px-3 shadow-sm fc-view-btn active-view" data-view="timeGridWeek">Semana</button>
                <button class="btn btn-sm btn-light border rounded-pill px-3 shadow-sm fc-view-btn" data-view="dayGridMonth">Mes</button>
                <button class="btn btn-sm btn-light border rounded-pill px-3 shadow-sm fc-view-btn" data-view="timeGridDay">Día</button>
            </div>`;

        const fcEl = document.createElement('div');
        fcEl.id    = 'fc-grid';
        fcEl.style.height = 'calc(100% - 52px)';
        calendarWrapper.style.cssText = 'display:flex;flex-direction:column;height:100%;';
        calendarWrapper.appendChild(toolbarEl);
        calendarWrapper.appendChild(fcEl);

        const calendar = new FullCalendar.Calendar(fcEl, {
            initialView: 'timeGridWeek',
            eventOrder: 'orderPriority,start,-duration,allDay,title',
            initialDate,
            headerToolbar: false,
            allDaySlot: false,
            slotMinTime: '06:00:00',
            slotMaxTime: '24:00:00',
            expandRows: true,
            locale: 'es',
            validRange: globalStart && globalEnd ? { start: globalStart, end: globalEnd } : undefined,
            dayHeaderFormat: { weekday: 'short', day: 'numeric', month: 'short' },
            views: { dayGridMonth: { dayHeaderFormat: { weekday: 'short' } } },
            events,
            datesSet: () => {
                const t = document.getElementById('fc-title');
                if (t) t.textContent = calendar.view.title;
            },
            eventContent(arg) {
                const p    = arg.event.extendedProps;
                const icon = p.modalidad === 'virtual' ? 'bi-laptop' : 'bi-building';
                const badge = p.tipoDeFormacion
                    ? `<div class="mt-auto pt-1"><span class="badge bg-secondary bg-opacity-25 text-dark" style="font-size:0.65rem;">${p.tipoDeFormacion}</span></div>`
                    : '';
                if (calendar.view.type === 'dayGridMonth') {
                    const fmtH = d => d ? d.toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit', hour12: false }) : '';
                    const rango = fmtH(arg.event.start) && fmtH(arg.event.end)
                        ? `<span class="fw-normal ms-1" style="opacity:0.75;">${fmtH(arg.event.start)} - ${fmtH(arg.event.end)}</span>` : '';
                    return { html: `<div class="p-1 d-flex flex-column overflow-hidden" style="font-size:0.72rem;">
                        <div class="fw-semibold text-truncate">${p.instructor}<br>${rango}</div>
                        <div class="text-truncate" style="font-size:0.65rem;opacity:0.85;"><i class="bi ${icon}"></i> ${p.ambiente || 'Virtual'}</div>
                    </div>` };
                }
                return { html: `
                    <div class="p-2 d-flex flex-column position-relative" style="height:100%;width:100%;overflow:hidden;background:#ffffff;border-radius:3px;">
                        <div class="fw-bold mb-1 lh-sm" style="font-size:0.8rem;">${p.instructor}</div>
                        <div class="text-truncate" style="font-size:0.75rem;opacity:0.9;"><i class="bi ${icon}"></i> ${p.ambiente || 'Virtual'}</div>
                        <div class="mt-1 pb-1" style="font-size:0.65rem;opacity:0.85;border-bottom:1px dashed rgba(0,0,0,0.1);">
                            <i class="bi bi-calendar3 me-1"></i>${p.fechaInicio} → ${p.fechaFin}
                        </div>
                        ${badge}
                        <button class="btn btn-sm text-danger p-0 position-absolute top-0 end-0 delete-btn d-none"
                                data-idbloque="${p.idBloque}" data-iddia="${p.idDia}"
                                data-nombredia="${p.nombreDia}" data-idasignacion="${p.idAsignacion}"
                                style="line-height:1;transform:translate(25%,-25%);background:white;border-radius:50%;box-shadow:0 0 3px rgba(0,0,0,0.2);z-index:10;">
                            <i class="bi bi-x-circle-fill"></i>
                        </button>
                    </div>` };
            },
            eventMouseEnter: info => info.el.querySelector('.delete-btn')?.classList.remove('d-none'),
            eventMouseLeave: info => info.el.querySelector('.delete-btn')?.classList.add('d-none'),
        });

        calendar.render();

        document.getElementById('fc-prev')?.addEventListener('click',  () => calendar.prev());
        document.getElementById('fc-next')?.addEventListener('click',  () => calendar.next());
        document.getElementById('fc-today')?.addEventListener('click', () => calendar.today());
        document.querySelectorAll('.fc-view-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                document.querySelectorAll('.fc-view-btn').forEach(b => b.classList.remove('active-view', 'btn-purple'));
                btn.classList.add('active-view', 'btn-purple');
                calendar.changeView(btn.dataset.view);
            });
        });

        fcEl.addEventListener('click', e => {
            const btn = e.target.closest('.delete-btn');
            if (!btn) return;
            e.stopPropagation();
            this.eliminarDiaDeBloque(
                parseInt(btn.dataset.idbloque), parseInt(btn.dataset.iddia),
                btn.dataset.nombredia, parseInt(btn.dataset.idasignacion)
            );
        });
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
        } else if (result.isDenied) {
            this.deleteAsignacion(idAsignacion, true);
        }
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
           const result = await apiCall('/crearAsignacion', 'POST', payload);
        

           this.showAlert(
                'page-alert-container',
                'success',
                'Formacion asignada correctamente al horario.'
            );
            console.log(result)
           document.getElementById('form-horario').reset();
            document.getElementById('form-alert').innerHTML = '';
            this._ddInstructor?.reset('Seleccionar instructor...');
            this._ddAmbiente?.reset();
            if (this.selectedSedeId) {
        const selSede = document.getElementById('idSede');
        if (selSede) selSede.value = this.selectedSedeId;
        }
            this.showAlert('page-alert-container', 'success', 'Clase asignada correctamente al horario.');
            //this.selectFicha(this.selectedFicha.idFicha);
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
                        Ficha <strong>${err.codigoFicha}</strong> (${existenteInicio} – ${existenteFin})
                    </div>
                </button>
                ${esParcial ? `
                <button type="button" id="btn-partir-conflicto"
                        class="btn btn-outline-warning w-100 btn-sm rounded-3 text-start px-2 py-1 text-dark border-warning">
                    <div class="fw-bold" style="font-size:0.8rem;"><i class="bi bi-scissors me-1"></i> Acortar horario existente</div>
                    <div class="small opacity-75" style="white-space:normal;font-size:0.72rem;">
                        <strong>${err.codigoFicha}</strong>: ${existenteInicio} → <strong>${nuevoInicio}</strong>
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
            this.selectFicha(this.selectedFicha.idFicha);
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
                                    <span class="fw-semibold" style="max-width:420px;">${comp.codigo} — ${comp.nombre || ''}</span>
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