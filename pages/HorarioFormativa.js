import { ProtectedRoute } from '../components/ProtectedRoute.js';
import { Navbar, initNavbarEvents } from '../components/Navbar.js';
import { Sidebar, initSidebarEvents } from '../components/Sidebar.js';
import { SearchableDropdown } from '../components/SearchableDropdown.js';
import {
    apiFetch, getAmbientes, getFuncionarios, getSedes, analizarJuiciosConFicha,
    getProgramasPorSede, getFichasPorProgramaSede
} from '../utils/api.js?v=4';

async function apiCall(endpoint, method = 'GET', body = null) {
    return apiFetch(endpoint, { method, body: body ? JSON.stringify(body) : undefined });
}

const DIA_ID_MAP = {
    'Lunes': 1, 'Martes': 2, 'Miercoles': 3,
    'Jueves': 4, 'Viernes': 5, 'Sabado': 6, 'Domingo': 7
};




/* ─────────────────────────────────────────────────────────────────────────────
   HorarioFormativa  —  flujo: Sede → Programa → Ficha
────────────────────────────────────────────────────────────────────────────── */
class HorarioFormativa {
    constructor() {
        this.fichas = [];
        this.sedes = [];
        this.ambientes = [];
        this.instructores = [];
        this.selectedFicha = null;
        this.viewState = 'fichas';
        this.selectedSedeId = null;

        // Estado del dropdown secundario de ambientes disponibles
        this.ambientesDisponibles = [];
        this.mostrarDropdownDisponibles = false;

        // Dropdowns del panel de filtros
        this._ddSede = null;
        this._ddPrograma = null;
        // Dropdown del modal (Instructor, Ambiente)
        this._ddInstructor = null;
        this._ddAmbiente = null;
        // Dropdown flotante auxiliar: Ambientes Disponibles
        this._ddAmbienteDisponibles = null;

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
                    <div class="modal fade" id="modalHorario" aria-hidden="true">
                        <div class="modal-dialog modal-lg modal-dialog-centered">
                            <div class="modal-content border-0 shadow-lg" style="border-radius:1rem; overflow:hidden;">
                                <div class="modal-header text-white py-3 px-4"
                                     style="background:linear-gradient(135deg,var(--primary-dark) 0%,var(--primary) 100%);">
                                    <h5 class="modal-title fw-bold d-flex align-items-center gap-2">
                                        <i class="bi bi-calendar-plus"></i> Asignar Formación
                                    </h5>
                                    <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal"></button>
                                </div>
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
                                                <div class="mb-2 d-none" id="container-sede">
                                                    <label class="form-label small text-muted mb-1">Sede</label>
                                                    <select class="form-select form-select-sm" id="idSede" tabindex="-1"><option value="">Seleccionar sede...</option></select>
                                                </div>
                                                <div class="mb-2" id="container-ambiente">
                                                    <label class="form-label small text-muted mb-1">Ambiente</label>
                                                    <div id="btn-select-ambiente"
                                                         style="border-radius:0.4rem; overflow:hidden; border:1px solid #d1d5db; background:#fff;">
                                                        <input type="text" class="form-control border-0 form-control-sm"
                                                               id="ambienteNombreDisplay"
                                                               placeholder="Buscar ambiente..." readonly
                                                               style="font-size:0.82rem;">
                                                        <input type="hidden" id="idAmbiente" required>
                                                    </div>
                                                </div>
                                                <div class="mb-2">
                                                    <label class="form-label small text-muted mb-1">Instructor</label>
                                                    <div id="btn-select-instructor"
                                                         style="border-radius:0.4rem; overflow:hidden; border:1px solid #d1d5db; background:#fff;">
                                                        <input type="text" class="form-control border-0 form-control-sm"
                                                               id="instructorNombreDisplay"
                                                               placeholder="Buscar instructor..." readonly
                                                               style="font-size:0.82rem;">
                                                        <input type="hidden" id="idFuncionario" required>
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
                                                    <div class="d-flex align-items-center justify-content-between mb-1">
                                                        <label class="form-label small text-muted mb-0">Días de la semana</label>
                                                        <button type="button"
                                                                class="btn btn-sm btn-outline-primary rounded-pill px-3 py-0"
                                                                id="btn-ambientes-libres"
                                                                style="font-size:0.75rem; margin:5.5px 0;">
                                                                Ambientes Libres
                                                            </button>
                                                    </div>
                                                    <div class="d-flex flex-wrap gap-1 mb-2" id="dias-container"></div>
                                                <!-- Resumen de horas calculadas -->
                                                <div id="resumen-horas-container" class="d-none mb-2">
                                                    <div class="rounded-3 border px-3 py-2"
                                                         style="background:linear-gradient(135deg,#f5f3ff 0%,#ede9fe 100%);border-color:#c4b5fd !important;">
                                                        <div class="d-flex align-items-center gap-2 mb-1">
                                                            <i class="bi bi-clock-history text-primary" style="font-size:0.85rem;"></i>
                                                            <span class="small fw-semibold text-primary" style="font-size:0.78rem;text-transform:uppercase;letter-spacing:.04em;">Resumen de horas</span>
                                                        </div>
                                                        <div class="d-flex flex-wrap gap-3">
                                                            <div class="text-center">
                                                                <div class="fw-bold text-primary" id="rh-total-horas" style="font-size:1.25rem;line-height:1;">-</div>
                                                                <div class="text-muted" style="font-size:0.7rem;">Horas totales</div>
                                                            </div>
                                                            <div class="text-center">
                                                                <div class="fw-bold text-dark" id="rh-total-dias" style="font-size:1.25rem;line-height:1;">-</div>
                                                                <div class="text-muted" style="font-size:0.7rem;">Dias validos</div>
                                                            </div>
                                                            <div class="text-center">
                                                                <div class="fw-bold text-dark" id="rh-horas-dia" style="font-size:1.25rem;line-height:1;">-</div>
                                                                <div class="text-muted" style="font-size:0.7rem;">Horas/dia</div>
                                                            </div>
                                                        </div>
                                                        <div id="rh-warning" class="d-none mt-1">
                                                            <small class="text-danger"><i class="bi bi-exclamation-triangle-fill me-1"></i><span id="rh-warning-msg"></span></small>
                                                        </div>
                                                    </div>
                                                </div>

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
                                <div class="modal-footer py-2 px-3 bg-white border-top d-flex flex-column gap-2">
                                    <div id="acciones-conflicto" class="w-100 d-none"></div>
                                    <div class="w-100 d-flex gap-2">
                                        <button type="button" class="btn btn-light flex-grow-1 rounded-3 btn-sm" data-bs-dismiss="modal">Cancelar</button>
                                        <button type="submit" form="form-horario" id="btn-asignar"
                                                class="btn btn-purple flex-grow-1 rounded-3 btn-sm d-flex justify-content-center align-items-center gap-2">
                                            <i class="bi bi-calendar-check"></i> Asignar
                                        </button>
                                    </div>
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
                                <div class="modal-body p-4 bg-light" id="body-analisis-juicios"></div>
                            </div>
                        </div>
                    </div>
                </main>
            </div>`;
    }

    async loadDependencies() {
        try {
            const [aData, iData, sData] = await Promise.all([
                getAmbientes(), getFuncionarios(), getSedes()
            ]);
            this.ambientes = aData.data || (Array.isArray(aData) ? aData : []);
            this.sedes = sData.data || (Array.isArray(sData) ? sData : []);
            const allFuncs = iData.data || (Array.isArray(iData) ? iData : []);
            this.instructores = allFuncs.filter(f => f.roles?.some(r => r.nombreRol === 'Instructor'));
            if (!this.instructores.length) this.instructores = allFuncs;

            this.renderBreadcrumb();
            this.renderContent();
            this.populateSelects();
        } catch (err) {
            this.showAlert('page-alert-container', 'danger', 'Error al cargar datos: ' + err.message);
        }
    }

    populateSelects() {
        this.renderSedesSelectModal();
        const cont = document.getElementById('dias-container');
        if (cont) {
            const dias = ['Lunes', 'Martes', 'Miercoles', 'Jueves', 'Viernes', 'Sabado', 'Domingo'];
            cont.innerHTML = dias.map((d, i) => {
                const val = i + 1;
                return `<input type="checkbox" class="btn-check" id="dia_${val}" value="${val}" autocomplete="off">
                        <label class="btn btn-outline-primary rounded-pill btn-sm d-flex align-items-center justify-content-center"
                               style="width:40px;height:40px;font-size:0.8rem;" for="dia_${val}">${d.charAt(0)}</label>`;
            }).join('');
        }
        this._initInstructorDropdown();
        this._initAmbienteDropdown();
    }

    _initInstructorDropdown() {
        const triggerEl = document.getElementById('btn-select-instructor');
        if (!triggerEl) return;
        this._ddInstructor?.destroy();
        this._ddInstructor = new SearchableDropdown({
            triggerEl,
            inputId: 'idFuncionario',
            displayId: 'instructorNombreDisplay',
            placeholder: 'Buscar por nombre o área...',
            emptyText: 'No se encontraron instructores',
            onOpen: () => {
                const idAmbiente = document.getElementById('idAmbiente')?.value;
                const amb = this.ambientes.find(a => String(a.idAmbiente) === String(idAmbiente));
                this._ddInstructor.setItems(this._getInstructorItems(amb?.idArea ?? null));
            },
        });
    }

    _getInstructorItems(idAreaPreferida = null) {
        let recomendados = [];
        let otros = [];

        this.instructores.forEach(i => {
            const esRecomendado = idAreaPreferida && i.areas?.some(ar => String(ar.idArea) === String(idAreaPreferida));
            const item = {
                id: i.idFuncionario,
                label: `${i.nombre || ''} ${i.apellido || i.apellidos || ''}`.trim() || 'Sin nombre',
                sub: i.areas?.length
                    ? i.areas.map(a => a.tipo ? `${a.nombreArea} (${a.tipo})` : a.nombreArea).join(', ')
                    : 'Sin área',
                isRecommended: !!esRecomendado
            };
            if (esRecomendado) {
                recomendados.push(item);
            } else {
                otros.push(item);
            }
        });

        // Ordenar alfabéticamente dentro de cada grupo para mayor facilidad de busqueda
        const sortFn = (a, b) => a.label.localeCompare(b.label);
        recomendados.sort(sortFn);
        otros.sort(sortFn);

        return [...recomendados, ...otros];
    }

    renderSedesSelectModal() {
        const sel = document.getElementById('idSede');
        if (!sel) return;
        sel.innerHTML = '<option value="">Seleccionar sede...</option>' +
            this.sedes.map(s => `<option value="${s.idSede}">${s.nombre}</option>`).join('');
    }

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
                const idSede = document.getElementById('idSede')?.value;
                if (!idSede) {
                    this._ddAmbiente.setItems([]);
                    return;
                }
                
                const idAreaPrograma = this.selectedFicha?.programa?.idArea;

                // Siempre muestra TODOS los ambientes de la sede, sin filtrar
                const filtered = this.ambientes.filter(a => String(a.idSede) === String(idSede));
                const items = filtered.map(a => {
                    const areaNombre = a.area?.nombreArea ?? 'Sin área';
                    const areaTipo = a.area?.tipo ? ` - ${a.area.tipo}` : '';
                    const esRecomendado = idAreaPrograma && String(a.idArea) === String(idAreaPrograma);

                    return {
                        id: a.idAmbiente,
                        label: `${a.nombre || areaNombre} - Blq ${a.bloque || 'N/A'}`,
                        sub: `${areaNombre}${areaTipo}`,
                        isRecommended: !!esRecomendado
                    };
                });
                
                let recomendados = items.filter(i => i.isRecommended);
                let otros = items.filter(i => !i.isRecommended);
                
                recomendados.sort((a, b) => a.label.localeCompare(b.label));
                otros.sort((a, b) => a.label.localeCompare(b.label));
                
                this._ddAmbiente.setItems([...recomendados, ...otros]);
            },
            onSelect: (item) => {
                // No resetear instructor: verificar compatibilidad y avisar si corresponde
                this._verificarCompatibilidadInstructorAmbiente(item.id);
            }
        });
    }

    /**
     * Verifica si el instructor actualmente seleccionado pertenece al área
     * del ambiente dado. Si no es compatible muestra una advertencia visual
     * sin bloquear ni resetear nada.
     * @param {string|number} idAmbiente
     */
    _verificarCompatibilidadInstructorAmbiente(idAmbiente) {
        const alertEl = document.getElementById('modal-alert');
        if (!alertEl) return;

        // Limpiar advertencia previa de incompatibilidad
        const prevWarn = alertEl.querySelector('[data-compat-warn]');
        prevWarn?.remove();

        const idFuncionario = document.getElementById('idFuncionario')?.value;
        if (!idFuncionario) return; // No hay instructor seleccionado → sin nada que verificar

        const ambiente = this.ambientes.find(a => String(a.idAmbiente) === String(idAmbiente));
        if (!ambiente?.idArea) return; // El ambiente no tiene área definida

        const instructor = this.instructores.find(i => String(i.idFuncionario) === String(idFuncionario));
        if (!instructor) return;

        const perteneceAlArea = instructor.areas?.some(
            ar => String(ar.idArea) === String(ambiente.idArea)
        );

        if (!perteneceAlArea) {
            const warn = document.createElement('div');
            warn.setAttribute('data-compat-warn', '1');
            warn.className = 'alert alert-warning alert-dismissible d-flex align-items-center gap-2 py-2 px-3 mt-2 mb-0';
            warn.style.fontSize = '0.82rem';
            warn.innerHTML = `
                <i class="bi bi-exclamation-triangle-fill flex-shrink-0"></i>
                <span>El instructor seleccionado <strong>no pertenece al área</strong> del ambiente elegido. Puedes continuar o cambiar el instructor.</span>
                <button type="button" class="btn-close" style="font-size:0.7rem;" aria-label="Cerrar"></button>`;
            warn.querySelector('.btn-close').addEventListener('click', () => warn.remove());
            alertEl.appendChild(warn);
        }
    }

    setupEventListeners() {
        document.getElementById('modalidad_clase')?.addEventListener('change', e => {
            const isVirtual = e.target.value === 'virtual';
            ['container-ambiente', 'container-sede'].forEach(id => {
                const el = document.getElementById(id);
                if (el) { el.style.opacity = isVirtual ? '0.4' : '1'; el.style.pointerEvents = isVirtual ? 'none' : ''; }
            });
            document.getElementById('idAmbiente').required = !isVirtual;
            document.getElementById('idSede').required = false; // Se oculta, no debe ser requerido
            if (isVirtual) {
                this._ddAmbiente?.reset();
                document.getElementById('idSede').value = '';
            } else {
                if (this.selectedSedeId) {
                    document.getElementById('idSede').value = this.selectedSedeId;
                }
            }
        });

        // ── Dropdown flotante: Ambientes Disponibles ─────────────────────────
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
                btnAmbientesLibres.innerHTML = 'Ambientes Libres';
            }
        };

        const _abrirDropdownDisponibles = () => {
            if (!this.ambientesDisponibles.length) return;

            _cerrarDropdownDisponibles();

            const btn = btnAmbientesLibres;
            const rect = btn.getBoundingClientRect();

            const panel = document.createElement('div');
            panel.className = 'sd-dropdown';
            // El endpoint retorna: { idAmbiente, nombreCompleto }
            const items = this.ambientesDisponibles.map(a => ({
                id: a.idAmbiente,
                label: a.nombreCompleto || `Ambiente ${a.idAmbiente}`,
                sub: ''
            }));

            panel.innerHTML = `
                <div class="sd-search-wrap">
                    <i class="bi bi-search sd-icon"></i>
                    <input type="text" class="sd-search" placeholder="Ambientes disponibles..." autocomplete="off" spellcheck="false">
                    <button type="button" class="sd-clear" title="Limpiar"><i class="bi bi-x"></i></button>
                </div>
                <ul class="sd-list"></ul>
                <div class="sd-empty d-none"><i class="bi bi-inbox-fill"></i><span>No hay ambientes disponibles</span></div>`;

            const _highlight = (str, q) => {
                if (!q || !str) return str || '';
                const idx = str.toLowerCase().indexOf(q.toLowerCase());
                if (idx === -1) return str;
                return str.slice(0, idx) +
                    `<mark class="sd-hl">${str.slice(idx, idx + q.length)}</mark>` +
                    str.slice(idx + q.length);
            };

            const _filterPanel = (q) => {
                const list = panel.querySelector('.sd-list');
                const empty = panel.querySelector('.sd-empty');
                const lq = q.trim();
                const filtered = lq
                    ? items.filter(i =>
                        (i.label || '').toLowerCase().includes(lq.toLowerCase()) ||
                        (i.sub || '').toLowerCase().includes(lq.toLowerCase()))
                    : items;
                if (!filtered.length) {
                    list.innerHTML = '';
                    empty.classList.remove('d-none');
                    return;
                }
                empty.classList.add('d-none');
                list.innerHTML = filtered.map(item =>
                    `<li class="sd-item"
                         data-id="${item.id}"
                         data-label="${(item.label || '').replace(/"/g, '&quot;')}">
                         <span class="sd-label">${_highlight(item.label, lq)}</span>
                         ${item.sub ? `<span class="sd-sub">${_highlight(item.sub, lq)}</span>` : ''}
                     </li>`
                ).join('');
            };

            const ddH = 340;
            const below = window.innerHeight - rect.bottom;
            const above = rect.top;
            const goUp = below < ddH + 8 && above > ddH + 8;
            panel.style.position = 'fixed';
            panel.style.zIndex = '9999';
            panel.style.width = Math.max(rect.width, 240) + 'px';
            panel.style.left = rect.left + 'px';
            panel.style.top = goUp
                ? (rect.top - Math.min(ddH, 340) - 4) + 'px'
                : (rect.bottom + 4) + 'px';

            const modal = btn.closest('.modal');
            (modal || document.body).appendChild(panel);

            _filterPanel('');

            const searchInput = panel.querySelector('.sd-search');
            const clearBtn = panel.querySelector('.sd-clear');
            searchInput.addEventListener('input', () => {
                clearBtn.classList.toggle('visible', searchInput.value.length > 0);
                _filterPanel(searchInput.value);
            });
            clearBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                searchInput.value = '';
                clearBtn.classList.remove('visible');
                _filterPanel('');
                searchInput.focus();
            });

            // Selección de item desde dropdown flotante
            panel.addEventListener('click', (e) => {
                const li = e.target.closest('.sd-item');
                if (!li) return;
                const id = li.dataset.id;
                const label = li.dataset.label;
                // Sincronizar selección al dropdown principal
                this._ddAmbiente.setValue(id, label);
                // No resetear instructor: verificar compatibilidad y avisar si corresponde
                this._verificarCompatibilidadInstructorAmbiente(id);
                _cerrarDropdownDisponibles();
            });

            const onOutside = (e) => {
                if (!panel.contains(e.target) && e.target !== btn && !btn.contains(e.target)) {
                    _cerrarDropdownDisponibles();
                }
            };
            setTimeout(() => document.addEventListener('click', onOutside), 0);

            this._ddAmbienteDisponibles = { _dropdown: panel, _bound: onOutside };
            this.mostrarDropdownDisponibles = true;

            btnAmbientesLibres.classList.remove('btn-outline-primary');
            btnAmbientesLibres.classList.add('btn-primary');
            btnAmbientesLibres.innerHTML = `<i class="bi bi-funnel-fill"></i> ${items.length} disponibles`;

            setTimeout(() => searchInput.focus(), 80);
        };

        if (btnAmbientesLibres) {
            btnAmbientesLibres.addEventListener('click', async (e) => {
                e.stopPropagation();

                // Toggle: si ya está abierto, cerrar
                if (this.mostrarDropdownDisponibles) {
                    _cerrarDropdownDisponibles();
                    return;
                }

                const idSede = document.getElementById('idSede')?.value;
                const fechaInicio = document.getElementById('fecha_inicio')?.value;
                const fechaFin = document.getElementById('fecha_fin')?.value;
                const horaInicio = document.getElementById('hora_inicio')?.value;
                const horaFin = document.getElementById('hora_fin')?.value;

                if (!idSede || !fechaInicio || !fechaFin || !horaInicio || !horaFin) {
                    this.showAlert('modal-alert', 'warning', 'Debes seleccionar sede, fechas y horas para buscar ambientes libres.');
                    return;
                }

                const orgText = btnAmbientesLibres.innerHTML;
                btnAmbientesLibres.disabled = true;
                btnAmbientesLibres.innerHTML = '<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Buscando...';

                try {
                    const payload = {
                        idSede: parseInt(idSede),
                        fechaInicio,
                        fechaFin,
                        horaInicio: horaInicio.length === 5 ? horaInicio + ':00' : horaInicio,
                        horaFin: horaFin.length === 5 ? horaFin + ':00' : horaFin
                    };
                    const response = await apiCall('/ambientes/disponibles', 'POST', payload);
                    const disponibles = response.data || response || [];
                    this.ambientesDisponibles = Array.isArray(disponibles) ? disponibles : [];

                    if (!this.ambientesDisponibles.length) {
                        this.showAlert('modal-alert', 'warning', 'No se encontraron ambientes disponibles para los criterios seleccionados.');
                        btnAmbientesLibres.innerHTML = orgText;
                        return;
                    }

                    this.showAlert('modal-alert', 'success', `Se encontraron ${this.ambientesDisponibles.length} ambiente(s) disponible(s).`);
                    _abrirDropdownDisponibles();
                } catch (err) {
                    this.showAlert('modal-alert', 'danger', 'Error al buscar ambientes libres: ' + err.message);
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

        // ── Cálculo automático de horas de formación ──────────────────────
        ['fecha_inicio', 'fecha_fin', 'hora_inicio', 'hora_fin'].forEach(id => {
            document.getElementById(id)?.addEventListener('change', () => {
                this._calcularHorasFormacion();
                _cerrarDropdownDisponibles();
            });
        });

        // Delegación para los checkboxes de días (se generan dinámicamente)
        document.getElementById('dias-container')?.addEventListener('change', () => {
            this._calcularHorasFormacion();
            _cerrarDropdownDisponibles();
        });

        // Recalcular al abrir el modal (por si ya hay valores pre-cargados)
        document.getElementById('modalHorario')?.addEventListener('shown.bs.modal', () => this._calcularHorasFormacion());
    }

    /** Calcula el total de horas de formación según rango de fechas, días seleccionados y rango horario. */
    _calcularHorasFormacion() {
        const container = document.getElementById('resumen-horas-container');
        const elTotalHoras = document.getElementById('rh-total-horas');
        const elTotalDias = document.getElementById('rh-total-dias');
        const elHorasDia = document.getElementById('rh-horas-dia');
        const elWarning = document.getElementById('rh-warning');
        const elWarningMsg = document.getElementById('rh-warning-msg');
        if (!container) return;

        const fechaInicioVal = document.getElementById('fecha_inicio')?.value;
        const fechaFinVal = document.getElementById('fecha_fin')?.value;
        const horaInicioVal = document.getElementById('hora_inicio')?.value;
        const horaFinVal = document.getElementById('hora_fin')?.value;

        // Ocultar panel si faltan datos mínimos
        if (!fechaInicioVal && !fechaFinVal && !horaInicioVal && !horaFinVal) {
            container.classList.add('d-none');
            return;
        }
        container.classList.remove('d-none');

        // Limpiar warning
        elWarning.classList.add('d-none');
        elWarningMsg.textContent = '';

        // Validar fecha fin >= fecha inicio
        if (fechaInicioVal && fechaFinVal && fechaFinVal < fechaInicioVal) {
            elWarningMsg.textContent = 'La fecha fin no puede ser anterior a la fecha inicio.';
            elWarning.classList.remove('d-none');
            elTotalHoras.textContent = '—';
            elTotalDias.textContent = '—';
            elHorasDia.textContent = '—';
            return;
        }

        // Calcular horas por día
        let horasPorDia = 0;
        if (horaInicioVal && horaFinVal) {
            const [hI, mI] = horaInicioVal.split(':').map(Number);
            const [hF, mF] = horaFinVal.split(':').map(Number);
            const minutos = (hF * 60 + mF) - (hI * 60 + mI);
            if (minutos <= 0) {
                elWarningMsg.textContent = 'La hora fin debe ser mayor a la hora inicio.';
                elWarning.classList.remove('d-none');
                elTotalHoras.textContent = '—';
                elTotalDias.textContent = '—';
                elHorasDia.textContent = '—';
                return;
            }
            horasPorDia = minutos / 60;
        }

        // Obtener días seleccionados (valores 1-7 donde 1=Lunes…7=Domingo)
        const diasSeleccionados = new Set(
            [...document.querySelectorAll('#dias-container input[type="checkbox"]:checked')]
                .map(cb => parseInt(cb.value))
        );

        // Contar días válidos en el rango de fechas
        let diasValidos = 0;
        if (fechaInicioVal && fechaFinVal && diasSeleccionados.size > 0) {
            const cur = new Date(fechaInicioVal + 'T00:00:00');
            const end = new Date(fechaFinVal + 'T00:00:00');
            while (cur <= end) {
                // JS: 0=Dom,1=Lun…6=Sab → convertir a 1=Lun…7=Dom
                const jsDow = cur.getDay(); // 0-6
                const diaSistema = jsDow === 0 ? 7 : jsDow; // 1=Lun…7=Dom
                if (diasSeleccionados.has(diaSistema)) diasValidos++;
                cur.setDate(cur.getDate() + 1);
            }
        }

        const totalHoras = diasValidos * horasPorDia;

        // Formato: mostrar decimales solo si no es entero
        const fmt = (n) => Number.isInteger(n) ? n.toString() : n.toFixed(1);

        elTotalHoras.textContent = horasPorDia > 0 && diasValidos > 0 ? fmt(totalHoras) : (horasPorDia > 0 ? '—' : '—');
        elTotalDias.textContent = fechaInicioVal && fechaFinVal && diasSeleccionados.size > 0 ? diasValidos.toString() : '—';
        elHorasDia.textContent = horasPorDia > 0 ? fmt(horasPorDia) : '—';

        // Advertencia si no hay días seleccionados pero sí hay fechas y horas
        if (fechaInicioVal && fechaFinVal && horasPorDia > 0 && diasSeleccionados.size === 0) {
            elWarningMsg.textContent = 'Selecciona al menos un día de la semana para calcular el total.';
            elWarning.classList.remove('d-none');
        }
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
        if (this.viewState === 'fichas') this.renderFichasView(container);
        if (this.viewState === 'horario') this.renderHorarioView(container);
    }

    // ── VISTA FICHAS  (Sede → Programa → Ficha) ───────────────────────────────
    renderFichasView(container) {
        const renderRows = (arr) => arr.map(f => {
            const prog = f.programa?.nombre ?? 'Sin Programa';
            const tieneHorario = f.asignaciones?.length > 0;

            let fechasPill = '';
            if (tieneHorario && f.asignaciones) {
                let minDate = null, maxDate = null;
                f.asignaciones.forEach(asig => {
                    if (asig.bloque?.fechaInicio && asig.bloque?.fechaFin) {
                        const s = new Date(asig.bloque.fechaInicio);
                        const e = new Date(asig.bloque.fechaFin);
                        if (!minDate || s < minDate) minDate = s;
                        if (!maxDate || e > maxDate) maxDate = e;
                    }
                });
                if (minDate && maxDate) {
                    fechasPill = `<div class="mt-1 small text-muted text-nowrap" style="font-size:0.75rem;">
                        <i class="bi bi-calendar-range me-1"></i>${minDate.toISOString().split('T')[0]} a ${maxDate.toISOString().split('T')[0]}
                    </div>`;
                }
            }

            const badgeHorario = tieneHorario
                ? `<div class="d-flex flex-column gap-1">
                     <div><span class="badge rounded-pill bg-success bg-opacity-10 text-success border border-success border-opacity-25 px-3 py-1">
                       <i class="bi bi-check-circle-fill me-1"></i>Sí
                     </span></div>
                     ${fechasPill}
                   </div>`
                : `<span class="badge rounded-pill bg-secondary bg-opacity-10 text-secondary border border-secondary border-opacity-25 px-3 py-2">
                       <i class="bi bi-x-circle me-1"></i>No
                   </span>`;
            const badgeMod = f.modalidad === 'virtual'
                ? `<span class="badge rounded-pill bg-info bg-opacity-10 text-info border border-info border-opacity-25 px-3 py-2"><i class="bi bi-laptop me-1"></i>Virtual</span>`
                : `<span class="badge rounded-pill bg-primary bg-opacity-10 text-primary border border-primary border-opacity-25 px-3 py-2"><i class="bi bi-person-workspace me-1"></i>Presencial</span>`;

            return `
                <tr class="fila-ficha align-middle" style="cursor:pointer;" data-id="${f.idFicha}">
                    <td class="ps-4 fw-semibold" style="color:var(--text-dark);">Ficha ${f.codigoFicha}</td>
                    <td class="text-muted">${prog}</td>
                    <td>${f.jornada || '—'}</td>
                    <td>${badgeMod}</td>
                    <td>${badgeHorario}</td>
                    <td class="pe-4">
                        <button class="btn btn-sm btn-purple rounded-pill px-3 btn-ver-horario" data-id="${f.idFicha}">
                            <i class="bi bi-calendar-week me-1"></i>Crear Horario
                        </button>
                    </td>
                </tr>`;
        }).join('');

        container.innerHTML = `
            <!-- Filtros: Sede → Programa → Ficha -->
            <div class="card border-0 shadow-sm rounded-4 mb-4">
                <div class="card-header bg-white border-0 pt-4 pb-3 px-4">
                    <h5 class="fw-bold mb-1" style="color:var(--text-dark);">Fichas Formativas</h5>
                    <small class="text-muted">Selecciona sede, programa y ficha para gestionar el horario.</small>
                </div>
                <div class="card-body px-4 pb-4">
                    <div class="row g-3 align-items-end">

                        <!-- 1. Sede -->
                        <div class="col-md-6">
                            <label class="form-label fw-semibold small text-muted text-uppercase mb-1" style="letter-spacing:.04em;">
                                <i class="bi bi-building text-primary me-1"></i>1. Sede
                            </label>
                            <div id="dd-sede-trigger"
                                 style="border-radius:0.5rem; overflow:hidden; border:1px solid #d1d5db; background:#fff;">
                                <input type="text" id="sedeDisplay" class="form-control border-0"
                                       placeholder="Seleccionar sede..." readonly>
                                <input type="hidden" id="hidSede">
                            </div>
                        </div>

                        <!-- 2. Programa -->
                        <div class="col-md-6">
                            <label class="form-label fw-semibold small text-muted text-uppercase mb-1" style="letter-spacing:.04em;">
                                <i class="bi bi-journals text-primary me-1"></i>2. Programa
                            </label>
                            <div id="dd-programa-trigger"
                                 style="border-radius:0.5rem; overflow:hidden; border:1px solid #d1d5db; background:#fff;">
                                <input type="text" id="programaDisplay" class="form-control border-0"
                                       placeholder="Primero selecciona sede..." readonly>
                                <input type="hidden" id="hidPrograma">
                            </div>
                        </div>

                    </div>
                </div>
            </div>

            <!-- Tabla de fichas -->
            <div class="card border-0 shadow-sm rounded-4">
                <div class="card-header bg-white border-0 pt-4 pb-3 px-4 d-flex flex-wrap justify-content-between align-items-center gap-3">
                    <div>
                        <h5 class="fw-bold mb-0" style="color:var(--text-dark);">Fichas disponibles</h5>
                        <small class="text-muted" id="lbl-fichas-count">Selecciona sede y programa para ver las fichas</small>
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
                            <tbody id="fichas-tbody">
                                <tr>
                                    <td colspan="6" class="text-center py-5 text-muted">
                                        <i class="bi bi-funnel fs-3 d-block mb-2 opacity-25"></i>
                                        Selecciona una sede y programa para ver las fichas
                                    </td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>`;

        // ── Estado local ────────────────────────────────────────────────────
        let programasDisponibles = [];

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

        const updateTable = () => {
            const el = document.getElementById('fichas-tbody');
            const lbl = document.getElementById('lbl-fichas-count');
            if (!this.fichas.length) {
                el.innerHTML = `<tr><td colspan="6" class="text-center py-5 text-muted">
                    <i class="bi bi-inbox fs-3 d-block mb-2 opacity-25"></i>
                    No hay fichas activas para este programa y sede
                </td></tr>`;
                if (lbl) lbl.textContent = '0 fichas encontradas';
                return;
            }
            el.innerHTML = renderRows(this.fichas);
            if (lbl) lbl.textContent = `${this.fichas.length} ficha(s) encontrada(s)`;
            attachEvents();
        };

        // ── Dropdown Sede ───────────────────────────────────────────────────
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
                        sub: s.municipio?.nombreMunicipio || s.direccion || '',
                    }))
                );
            },
            onSelect: async (item) => {
                this.selectedSedeId = item.id;
                this._ddPrograma.reset('Cargando programas...');
                this._ddPrograma.disable('Cargando programas...');
                this.fichas = [];
                document.getElementById('fichas-tbody').innerHTML = `<tr><td colspan="6" class="text-center py-5 text-muted">
                    <i class="bi bi-funnel fs-3 d-block mb-2 opacity-25"></i>Selecciona el programa para ver las fichas
                </td></tr>`;
                document.getElementById('lbl-fichas-count').textContent = 'Selecciona un programa para ver las fichas';

                try {
                    const programas = await getProgramasPorSede(item.id);
                    programasDisponibles = Array.isArray(programas) ? programas : (programas.data || []);
                    this._ddPrograma.setItems(
                        programasDisponibles.map(p => ({
                            id: p.idPrograma, label: p.nombre || 'Sin nombre', sub: p.codigo || '',
                        }))
                    );
                    this._ddPrograma.enable('Seleccionar programa...');
                    this._ddPrograma.reset('Seleccionar programa...');
                } catch {
                    programasDisponibles = [];
                    this._ddPrograma.enable('Error al cargar');
                }
            }
        });

        // ── Dropdown Programa ───────────────────────────────────────────────
        this._ddPrograma?.destroy();
        this._ddPrograma = new SearchableDropdown({
            triggerEl: 'dd-programa-trigger',
            inputId: 'hidPrograma',
            displayId: 'programaDisplay',
            placeholder: 'Buscar programa...',
            emptyText: 'No se encontraron programas',
            onOpen: () => {
                if (!document.getElementById('hidSede').value) {
                    this._ddPrograma.close();
                    const t = document.getElementById('dd-sede-trigger');
                    t.style.transition = 'box-shadow .15s';
                    t.style.boxShadow = '0 0 0 3px rgba(220,53,69,.3)';
                    t.style.borderColor = '#dc3545';
                    setTimeout(() => { t.style.boxShadow = ''; t.style.borderColor = '#d1d5db'; }, 1500);
                    return;
                }
                this._ddPrograma.setItems(
                    programasDisponibles.map(p => ({
                        id: p.idPrograma, label: p.nombre || 'Sin nombre', sub: p.codigo || '',
                    }))
                );
            },
            onSelect: async (item) => {
                const idSede = document.getElementById('hidSede').value;
                this.fichas = [];

                try {
                    const fichasData = await getFichasPorProgramaSede(item.id, idSede);
                    this.fichas = Array.isArray(fichasData) ? fichasData : (fichasData.data || []);
                    updateTable();
                } catch {
                    this.fichas = [];
                    updateTable();
                }
            }
        });

        // Programa deshabilitado hasta seleccionar sede
        this._ddPrograma.disable('Primero selecciona sede...');


        // ── Buscador tabla ──────────────────────────────────────────────────
        document.getElementById('search-fichas').addEventListener('input', e => {
            const q = e.target.value.toLowerCase();
            const filtered = this.fichas.filter(f =>
                f.codigoFicha.toLowerCase().includes(q) ||
                (f.programa?.nombre ?? '').toLowerCase().includes(q)
            );
            document.getElementById('fichas-tbody').innerHTML = renderRows(filtered);
            attachEvents();
        });
    }

    _goToFicha(id) {
        //render ficha bug okey 
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
        if (!this.selectedFicha) {
            this.selectedFicha = { idFicha, codigoFicha: idFicha, jornada: '' };
        }

        const card = document.getElementById('calendario-card');
        card.innerHTML = `
            <div class="card-body p-5 text-center d-flex flex-column align-items-center justify-content-center">
                <div class="spinner-border text-primary mb-3" role="status"></div>
                <p class="text-muted small">Cargando horario de ${this.selectedFicha.codigoFicha}...</p>
            </div>`;

        const progNombre = this.selectedFicha.programa?.nombre ?? '';
        const fechaIni = this.selectedFicha.fechaInicio ?? this.selectedFicha.fecha_inicio ?? '';
        const fechaFin = this.selectedFicha.fechaFin ?? this.selectedFicha.fecha_fin ?? '';
        const fechasBadge = (fechaIni && fechaFin)
            ? `<span class="badge bg-light text-muted border fw-normal ms-1" style="font-size:0.72rem;">
                   <i class="bi bi-calendar-range me-1"></i>${fechaIni} → ${fechaFin}
               </span>`
            : '';
        document.getElementById('lbl-ficha-context').innerHTML =
            `${this.selectedFicha.codigoFicha}
             <span class="badge bg-light text-dark border fw-normal ms-1">${this.selectedFicha.jornada || ''}</span>
             ${progNombre ? `<span class="badge bg-primary bg-opacity-10 text-primary border border-primary border-opacity-25 fw-normal ms-1" style="font-size:0.72rem;"><i class="bi bi-journal-bookmark me-1"></i>${progNombre}</span>` : ''}
             ${fechasBadge}`;

        if (this.selectedFicha.fechaInicio) document.getElementById('fecha_inicio').value = this.selectedFicha.fechaInicio;
        if (this.selectedFicha.fechaFin) document.getElementById('fecha_fin').value = this.selectedFicha.fechaFin;

        if (this.selectedSedeId) {
            document.getElementById('idSede').value = this.selectedSedeId;
        } else {
            document.getElementById('idSede').value = '';
        }
        this._ddAmbiente?.reset();
        this._ddInstructor?.destroy();
        this._initInstructorDropdown();

        try {
            const response = await apiCall('/horariosPorFicha/' + idFicha);
            const asignaciones = response.data?.asignaciones || response.asignaciones || [];
            this.renderGrid(this.selectedFicha, asignaciones);
        } catch (err) {
            card.innerHTML = `
                <div class="card-body p-5 text-center text-danger">
                    <i class="bi bi-exclamation-triangle fs-1 mb-3 d-block opacity-50"></i>
                    <p>${err.message}</p>
                </div>`;
        }
    }

    renderGrid(ficha, asignaciones) {
        const card = document.getElementById('calendario-card');
        const isEmpty = !asignaciones || asignaciones.length === 0;

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
                        <i class="bi bi-plus-lg"></i><span>Agregar Horario</span>
                    </button>
                </div>
            </div>
            <input type="file" id="file-juicios" accept=".xlsx, .xls" class="d-none">`;

        if (isEmpty) {
            card.innerHTML = header + `
                <div class="card-body p-5 text-center text-muted d-flex flex-column align-items-center justify-content-center" style="min-height:400px;">
                    <i class="bi bi-calendar-x fs-1 d-block mb-3 opacity-25"></i>
                    <p class="fw-medium">Sin Formaciones asignadas</p>
                    <p class="small">Usa "Agregar Horario" para comenzar.</p>
                </div>`;
            this.initJuiciosEvents();
            return;
        }

        card.innerHTML = header +
            `<div class="card-body pt-2 px-4 pb-4" style="height:660px;">
                <div id="fullcalendar-container" class="h-100"></div>
             </div>`;

        const jsWeekday = (date) => date.getDay() === 0 ? 7 : date.getDay();

        const fechasDelDiaEnRango = (nombreDia, fechaInicioStr, fechaFinStr) => {
            const targetWd = DIA_ID_MAP[nombreDia];
            if (!targetWd || !fechaInicioStr || !fechaFinStr) return [];
            const start = new Date(fechaInicioStr + 'T00:00:00');
            const end = new Date(fechaFinStr + 'T00:00:00');
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
            const bloque = asig.bloque;
            if (!bloque) continue;
            const startHour = bloque.horaInicio || bloque.hora_inicio;
            const endHour = bloque.horaFin || bloque.hora_fin;
            if (!startHour || !endHour) continue;
            const startDate = asig.fechaInicio || asig.fecha_inicio || bloque.fechaInicio || bloque.fecha_inicio;
            const endDate = asig.fechaFin || asig.fecha_fin || bloque.fechaFin || bloque.fecha_fin;
            if (startDate && (!globalStart || startDate < globalStart)) globalStart = startDate;
            if (endDate && (!globalEnd || endDate > globalEnd)) globalEnd = endDate;
            const isVirtual = asig.modalidad === 'virtual';

            (bloque.dias || []).forEach(diaObj => {
                const dia = diaObj.nombreDia || diaObj.nombre;
                if (!dia) return;
                const fechas = fechasDelDiaEnRango(dia, startDate, endDate);
                for (const fecha of fechas) {
                    events.push({
                        id: `${asig.idAsignacion}_${dia}_${fecha}`,
                        start: `${fecha}T${startHour}`,
                        end: `${fecha}T${endHour}`,
                        orderPriority: 1,
                        backgroundColor: '#ffffff',
                        borderColor: isVirtual ? '#0dcaf0' : '#4caa16',
                        textColor: isVirtual ? '#0dcaf0' : '#4caa16',
                        extendedProps: {
                            instructor: asig.funcionario ? `${asig.funcionario.nombre || ''} ${asig.funcionario.apellido || asig.funcionario.apellidos || ''}`.trim() : '—',
                            ambiente: asig.ambiente ? (asig.ambiente.codigo || asig.ambiente.nombre) : null,
                            modalidad: asig.modalidad,
                            tipoDeFormacion: asig.ficha?.programa?.tipoFormacion?.nombreTipoFormacion || '',
                            fechaInicio: startDate,
                            fechaFin: endDate,
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

        const initialDate = globalStart ?? new Date().toISOString().slice(0, 10);
        const calendarWrapper = document.getElementById('fullcalendar-container');

        const toolbarEl = document.createElement('div');
        toolbarEl.className = 'd-flex align-items-center justify-content-between mb-3';
        toolbarEl.innerHTML = `
            <div class="d-flex align-items-center gap-2">
                <button class="btn btn-sm btn-light border rounded-pill px-3 shadow-sm" id="fc-prev"><i class="bi bi-chevron-left"></i></button>
                <button class="btn btn-sm btn-light border rounded-pill px-3 shadow-sm" id="fc-next"><i class="bi bi-chevron-right"></i></button>
                <button class="btn btn-sm btn-light border rounded-pill px-3 shadow-sm" id="fc-today">Hoy</button>
            </div>
            <div class="text-center">
                <span id="fc-title" class="fw-semibold" style="color:var(--text-dark);font-size:.95rem;"></span>
                ${globalStart && globalEnd ? `<span class="badge bg-light text-muted border ms-2" style="font-size:.7rem;"><i class="bi bi-calendar-range me-1"></i>${globalStart} → ${globalEnd}</span>` : ''}
            </div>
            <div class="d-flex gap-2">
                <button class="btn btn-sm btn-light border rounded-pill px-3 shadow-sm fc-view-btn active-view" data-view="timeGridWeek">Semana</button>
                <button class="btn btn-sm btn-light border rounded-pill px-3 shadow-sm fc-view-btn" data-view="dayGridMonth">Mes</button>
                <button class="btn btn-sm btn-light border rounded-pill px-3 shadow-sm fc-view-btn" data-view="timeGridDay">Día</button>
            </div>`;

        const fcEl = document.createElement('div');
        fcEl.id = 'fc-grid';
        fcEl.style.height = 'calc(100% - 52px)';
        calendarWrapper.style.display = 'flex';
        calendarWrapper.style.flexDirection = 'column';
        calendarWrapper.style.height = '100%';
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
            views: {
                dayGridMonth: {
                    dayHeaderFormat: { weekday: 'short' }
                }
            },
            events,
            datesSet: () => {
                const t = document.getElementById('fc-title');
                if (t) t.textContent = calendar.view.title;
            },
            eventContent(arg) {
                const p = arg.event.extendedProps;
                const icon = p.modalidad === 'virtual' ? 'bi-laptop' : 'bi-building';
                const badge = p.tipoDeFormacion
                    ? `<div class="mt-auto pt-1"><span class="badge bg-secondary bg-opacity-25 text-dark" style="font-size:0.65rem;">${p.tipoDeFormacion}</span></div>`
                    : '';
                if (calendar.view.type === 'dayGridMonth') {
                    const fmtHora = (d) => d ? d.toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit', hour12: false }) : '';
                    const horaIni = fmtHora(arg.event.start);
                    const horaFin = fmtHora(arg.event.end);
                    const rangoHora = horaIni && horaFin ? `<span class="fw-normal ms-1" style="opacity:0.75;">${horaIni} - ${horaFin}</span>` : '';
                    return {
                        html: `<div class="p-1 d-flex flex-column overflow-hidden" style="font-size:0.72rem;">
                        <div class="fw-semibold text-truncate">${p.instructor} <br> ${rangoHora}</div>
                        <div class="text-truncate" style="font-size:0.65rem;opacity:0.85;"><i class="bi ${icon}"></i> ${p.ambiente || 'Virtual'}${p.observaciones ? `<span class="ms-1 text-muted" style="font-size:0.62rem;"> · ${p.observaciones}</span>` : ''}</div>
                    </div>` };
                }
                return {
                    html: `
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

        document.getElementById('fc-prev')?.addEventListener('click', () => calendar.prev());
        document.getElementById('fc-next')?.addEventListener('click', () => calendar.next());
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

        this.initJuiciosEvents();
    }

    async eliminarDiaDeBloque(idBloque, idDia, nombreDia, idAsignacion) {
        const result = await Swal.fire({
            title: `¿Opciones de eliminación?`,
            text: `¿Qué deseas eliminar de este instructor?`,
            icon: 'warning', 
            showCancelButton: true,
            showDenyButton: true,
            confirmButtonColor: '#3085d6', 
            denyButtonColor: '#d33',
            cancelButtonColor: '#6c757d',
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

    initJuiciosEvents() {
        const btnJuicios = document.getElementById('btn-juicios-evaluativos');
        const fileInput = document.getElementById('file-juicios');
        if (!btnJuicios || !fileInput) return;
        const elClone = fileInput.cloneNode(true);
        fileInput.parentNode.replaceChild(elClone, fileInput);
        btnJuicios.addEventListener('click', () => elClone.click());
        elClone.addEventListener('change', async (e) => {
            const file = e.target.files[0];
            if (!file) return;
            const idFicha = this.selectedFicha?.idFicha;
            if (!idFicha) {
                this.showAlert('page-alert-container', 'warning', 'Selecciona primero una ficha para analizar los juicios.');
                e.target.value = '';
                return;
            }
            try {
                this.showAlert('page-alert-container', 'info',
                    `Analizando juicios vs competencias de la ficha ${this.selectedFicha.codigoFicha}...`);
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
        const pendientes = data.competencias_pendientes || [];
        const cubiertas = data.competencias_cubiertas || [];
        const umbral = data.umbral_usado ?? 80;

        let html = `
            <div class="alert alert-light border mb-3 py-2 px-3" style="font-size:0.85rem;">
                <i class="bi bi-info-circle me-1 text-primary"></i>
                <strong>Ficha:</strong> ${data.ficha || '—'}
                &nbsp;·&nbsp;<strong>Programa:</strong> ${data.programa || '—'}
                &nbsp;·&nbsp;<strong>Tipo Formación:</strong> ${data.tipo_formacion || '—'}
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

        const filaResultado = (res) => {
            const estado = res.estado ?? (res.necesita_horario ? 'pendiente' : 'evaluado');
            const rowClass = estado === 'sin_datos' ? 'table-secondary' : estado === 'pendiente' ? 'table-warning' : '';
            const badge = estado === 'evaluado'
                ? `<span class="badge bg-success"><i class="bi bi-check"></i> Evaluado</span>`
                : estado === 'pendiente'
                    ? `<span class="badge bg-warning text-dark"><i class="bi bi-clock"></i> Pendiente</span>`
                    : `<span class="badge bg-secondary"><i class="bi bi-dash"></i> Sin datos</span>`;
            const pct = res.porcentaje_aprobacion ?? res.porcentaje ?? 0;
            const aprobados = res.aprobados ?? 0;
            const totalJuicio = res.total_con_juicio ?? 0;
            const nombre = res.nombre || res.nombre_completo || res.codigo || '—';
            return `<tr class="${rowClass}">
                <td><small>${nombre}</small></td>
                <td class="text-center">${aprobados}</td>
                <td class="text-center">${totalJuicio}</td>
                <td class="text-center"><strong>${pct}%</strong></td>
                <td class="text-center">${badge}</td>
            </tr>`;
        };

        const bloqueCompetencias = (lista, tipo) => {
            if (!lista.length) return `<p class="text-muted fst-italic text-center py-3">Ninguna competencia ${tipo === 'pendiente' ? 'pendiente' : 'cubierta'}.</p>`;
            let out = `<div class="accordion" id="accordion-${tipo}">`;
            lista.forEach((comp, idx) => {
                const isPend = tipo === 'pendiente';
                const pct = comp.porcentaje ?? comp.porcentaje_minimo ?? 0;
                const resumen = comp.resumen_resultados;
                const badge = isPend
                    ? `<span class="badge bg-danger rounded-pill">Pendiente ${Number(pct).toFixed(1)}%</span>`
                    : `<span class="badge bg-success rounded-pill">Cubierto ${Number(pct).toFixed(1)}%</span>`;
                const resumenHtml = resumen
                    ? `<div class="text-muted small mt-1">
                            Resultados BD: ${resumen.total} total
                            &nbsp;·&nbsp;<span class="text-success">${resumen.evaluados} evaluados</span>
                            &nbsp;·&nbsp;<span class="text-warning">${resumen.pendientes} pendientes</span>
                            &nbsp;·&nbsp;<span class="text-secondary">${resumen.sin_datos} sin datos del Excel</span>
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
        // Ocultar botón de conflicto previo (si el usuario reintenta sin conflicto)
        this._ocultarBotonConflicto();

        const btn = document.getElementById('btn-asignar');
        if (btn.disabled) return; // ← guard: si ya está corriendo, ignorar
        btn.disabled = true;
        btn.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span>Guardando...';

        const dias = Array.from(document.querySelectorAll('#dias-container .btn-check:checked'))
            .map(c => parseInt(c.value));
        if (!dias.length) {
            this.showAlert('modal-alert', 'warning', 'Selecciona al menos un día de la semana.');
            btn.disabled = false;
            btn.innerHTML = '<i class="bi bi-calendar-check"></i> Asignar';
            return;
        }
        const modalidad = document.getElementById('modalidad_clase').value;
        const idAmbiente = parseInt(document.getElementById('idAmbiente').value) || null;
        if (modalidad === 'presencial' && !idAmbiente) {
            this.showAlert('modal-alert', 'warning', 'Selecciona un ambiente para la modalidad presencial.');
            btn.disabled = false;
            btn.innerHTML = '<i class="bi bi-calendar-check"></i> Asignar';
            return;
        }

        const payload = {
            horaInicio: document.getElementById('hora_inicio').value + ':00',
            horaFin: document.getElementById('hora_fin').value + ':00',
            modalidad,
            tipoFormacion: 'transversal',
            idFuncionario: parseInt(document.getElementById('idFuncionario').value),
            dias,
            idAmbiente: modalidad === 'presencial' ? idAmbiente : null,
            idFicha: this.selectedFicha.idFicha,
            fechaInicio: document.getElementById('fecha_inicio').value,
            fechaFin: document.getElementById('fecha_fin').value,
            observaciones: document.getElementById('observacion')?.value || null,
            estado: 'activo',
        };

        try {
            await apiCall('/crearAsignacion', 'POST', payload);
            bootstrap.Modal.getInstance(document.getElementById('modalHorario'))?.hide();
            document.getElementById('form-horario').reset();
            document.getElementById('modal-alert').innerHTML = '';
            this._ddInstructor?.reset('Buscar instructor...');
            this.showAlert('page-alert-container', 'success', 'Clase asignada correctamente al horario.');
            this.selectFicha(this.selectedFicha.idFicha);
        } catch (err) {
            // ── Detección de conflictos ────────────────────────────
            if (err.tipo === 'conflicto_ambiente' && err.codigoFicha) {
                this.showAlert('modal-alert', 'warning',
                    `<i class="bi bi-exclamation-triangle-fill me-2"></i>${err.message}`
                );
            } else if (err.tipo === 'conflicto_instructor' && err.conflicto) {
                this._mostrarOpcionesConflictoInstructor(err, payload);
            } else {
                let msg = err.message;
                if (msg.toLowerCase().includes('conflicto'))
                    msg = '<i class="bi bi-exclamation-triangle-fill me-2"></i>' + msg;
                this.showAlert('modal-alert', 'danger', msg);
            }
        } finally {
            btn.disabled = false;
            btn.innerHTML = '<i class="bi bi-calendar-check"></i> Asignar';
        }
    }

    /**
     * Muestra el botón "Eliminar horario anterior" en el contenedor #acciones-conflicto.
     * Solo se muestra cuando hay conflicto_ambiente.
     * @param {number|string} codigoFicha  - Código de la ficha con conflicto.
     * @param {string}        mensajeError - Mensaje original del backend.
     */

    /**
     * Muestra las opciones de Reemplazar o Partir cuando hay conflicto de instructor.
     * Objeto de error con datos del conflicto
     * Payload original de la asignación
     */
    _mostrarOpcionesConflictoInstructor(err, payload) {
    const container = document.getElementById('acciones-conflicto');
    if (!container) return;
            
    this.showAlert('modal-alert', 'warning',
        `<i class="bi bi-exclamation-triangle-fill me-2"></i>${err.message}`);
 
    // ── Comparar horarios para decidir qué opciones mostrar ──────────────
    // Normalizamos a "HH:MM" para comparar como strings (formato 24h ordena bien)
  const normalizar = (h) => h ? h.substring(0, 5) : '';

    const toMin = (h) => {
        if (!h) return 0;
        const [hh, mm] = h.substring(0,5).split(':').map(Number);
        return hh * 60 + mm;
    };
    
    const existenteInicio = normalizar(err.conflicto.horaInicio);
    const existenteFin    = normalizar(err.conflicto.horaFin);
    const nuevoInicio     = normalizar(payload.horaInicio);
    
    const existenteInicioMin = toMin(err.conflicto.horaInicio);
    const existenteFinMin    = toMin(err.conflicto.horaFin);
    const nuevoInicioMin     = toMin(payload.horaInicio);
    const nuevoFinMin        = toMin(payload.horaFin);
    
    const esParcial =
        nuevoInicioMin > existenteInicioMin &&
        nuevoInicioMin < existenteFinMin &&
        nuevoFinMin <= existenteFinMin;
    
    const horaCorteDisplay = nuevoInicio;
 
    container.classList.remove('d-none');
    container.innerHTML = `
        <div class="d-flex flex-column gap-2 w-100 bg-light p-3 rounded-3 border">
            <p class="mb-1 text-dark fw-bold" style="font-size:0.85rem;">
                <i class="bi bi-exclamation-triangle-fill text-warning me-1"></i>
                Opciones para resolver el conflicto:
            </p>
 
            <!-- Opción siempre visible: Eliminar -->
            <button type="button" id="btn-reemplazar-conflicto"
                    class="btn btn-outline-danger w-100 btn-sm rounded-3 text-start px-3 py-2">
                <div class="fw-bold"><i class="bi bi-trash3 me-1"></i> Eliminar horario existente</div>
                <div class="small opacity-75 mt-1" style="white-space:normal;">
                    Se eliminará la clase de la ficha <strong>${err.codigoFicha}</strong>
                    (${existenteInicio} – ${existenteFin}) y se creará la nueva asignación.
                </div>
            </button>
 
            <!-- Opción solo visible si hay solapamiento parcial: Partir -->
            ${esParcial ? `
            <button type="button" id="btn-partir-conflicto"
                    class="btn btn-outline-warning w-100 btn-sm rounded-3 text-start px-3 py-2 text-dark border-warning">
                <div class="fw-bold"><i class="bi bi-scissors me-1"></i> Acortar horario existente</div>
                <div class="small opacity-75 mt-1" style="white-space:normal;">
                    La clase de la ficha <strong>${err.codigoFicha}</strong> se acortará
                    de ${existenteInicio} a <strong>${horaCorteDisplay}</strong>,
                    y la nueva clase iniciará desde las <strong>${horaCorteDisplay}</strong>.
                </div>
            </button>` : ''}
        </div>`;
 
    // ── Eventos ───────────────────────────────────────────────────────────
    document.getElementById('btn-reemplazar-conflicto')
        .addEventListener('click', (e) => {
            e.preventDefault();
            this._resolverConflictoInstructor('/conflicto/reemplazar', {
                ...payload,
                idBloque: err.conflicto.idBloque,
            });
        });
 
    if (esParcial) {
        document.getElementById('btn-partir-conflicto')
            .addEventListener('click', (e) => {
                e.preventDefault();
                this._resolverConflictoInstructor('/conflicto/partir', {
                    ...payload,
                    idBloque:        err.conflicto.idBloque,
                    nuevaHoraInicio: payload.horaInicio, // punto de corte = inicio de la nueva clase
                });
            });
    }
}
    async _resolverConflictoInstructor(endpoint, payload) {
        const container = document.getElementById('acciones-conflicto');
        const btns = container.querySelectorAll('button');
        btns.forEach(b => { b.disabled = true; });

        // Cambiar el texto del botón presionado a 'Procesando...'
        const activeBtn = Array.from(btns).find(b => b.matches(':hover') || b.matches(':active'));
        if (activeBtn) {
            const originalHtml = activeBtn.innerHTML;
            activeBtn.dataset.originalHtml = originalHtml;
            activeBtn.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span>Procesando...';
        }

        try {
            await apiCall(endpoint, 'POST', payload);
            
            // Éxito: ocultar acciones, cerrar modal, resetear y recargar
            this._ocultarBotonConflicto();
            bootstrap.Modal.getInstance(document.getElementById('modalHorario'))?.hide();
            document.getElementById('form-horario').reset();
            document.getElementById('modal-alert').innerHTML = '';
            this._ddInstructor?.reset('Buscar instructor...');
            this.showAlert('page-alert-container', 'success', 'Conflicto resuelto y clase asignada correctamente.');
            this.selectFicha(this.selectedFicha.idFicha);
        } catch (err) {
            this.showAlert('modal-alert', 'danger', 'Error al resolver conflicto: ' + err.message);
            btns.forEach(b => { 
                b.disabled = false; 
                if (b.dataset.originalHtml) {
                    b.innerHTML = b.dataset.originalHtml;
                }
            });
        }
    }

    /** Oculta y limpia el contenedor de acciones de conflicto. */
    _ocultarBotonConflicto() {
        const container = document.getElementById('acciones-conflicto');
        if (!container) return;
        container.classList.add('d-none');
        container.innerHTML = '';
    }

    /**
     * Llama a DELETE /api/eliminar-asignaciones-ficha/{codigoFicha}.
     * Tras eliminar, oculta el botón y reintenta guardar automáticamente.
     * @param {number|string} codigoFicha
     */
    async _eliminarAsignacionesFicha(codigoFicha) {
        const confirmado = confirm(
            `¿Deseas eliminar el horario de la ficha ${codigoFicha}?\n` +
            'Esta acción eliminará todas sus asignaciones y no se puede deshacer.'
        );
        if (!confirmado) return;

        const btnEliminar = document.getElementById('btn-eliminar-conflicto');
        if (btnEliminar) {
            btnEliminar.disabled = true;
            btnEliminar.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span>Eliminando...';
        }

        try {
            await apiCall(`/eliminar-asignaciones-ficha/${codigoFicha}`, 'DELETE');

            // Éxito: ocultar botón y notificar
            this._ocultarBotonConflicto();
            this.showAlert('modal-alert', 'success', 'Horario eliminado correctamente. Reintentando guardar...');

            // Reintento automático tras un breve instante
            setTimeout(() => this.handleSubmit(), 800);

        } catch (err) {
            this.showAlert('modal-alert', 'danger', 'Error al eliminar: ' + err.message);
            if (btnEliminar) {
                btnEliminar.disabled = false;
                btnEliminar.innerHTML =
                    `<i class="bi bi-trash3-fill"></i> Eliminar horario anterior (Ficha ${codigoFicha})`;
            }
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
