import { ProtectedRoute } from '../components/ProtectedRoute.js';
import { Navbar, initNavbarEvents } from '../components/Navbar.js';
import { Sidebar, initSidebarEvents } from '../components/Sidebar.js';
import { apiFetch, getAmbientes, getFuncionarios, getSedes, getMunicipiosConFichas, getProgramasPorMunicipio, getFichasPorProgramaMunicipio } from '../utils/api.js';

async function apiCall(endpoint, method = 'GET', body = null) {
    return apiFetch(endpoint, { method, body: body ? JSON.stringify(body) : undefined });
}

const DIA_ID_MAP = {
    'Lunes': 1, 'Martes': 2, 'Miercoles': 3,
    'Jueves': 4, 'Viernes': 5, 'Sabado': 6, 'Domingo': 7
};

/* ─────────────────────────────────────────────────────────────────────────────
   SearchableDropdown — dropdown reutilizable con búsqueda integrada
   Soporta teclado (↑↓ Enter Escape), highlight de coincidencias,
   apertura hacia arriba/abajo según espacio disponible, y animación suave.
────────────────────────────────────────────────────────────────────────────── */
class SearchableDropdown {
    constructor({ triggerEl, inputId, displayId, placeholder = 'Buscar...', onSelect, onOpen, emptyText = 'Sin resultados' }) {
        this.triggerEl   = typeof triggerEl === 'string' ? document.getElementById(triggerEl) : triggerEl;
        this.inputEl     = document.getElementById(inputId);
        this.displayEl   = document.getElementById(displayId);
        this.placeholder = placeholder;
        this.onSelect    = onSelect || (() => {});
        this.onOpen      = onOpen   || (() => {});
        this.emptyText   = emptyText;
        this.items       = [];
        this._disabled   = false;
        this._dropdown   = null;
        this._bound      = this._onOutsideClick.bind(this);
        this._build();
    }

    _build() {
        this._dropdown = document.createElement('div');
        this._dropdown.className = 'sd-dropdown';
        this._dropdown.innerHTML = `
            <div class="sd-search-wrap">
                <i class="bi bi-search sd-icon"></i>
                <input type="text" class="sd-search" placeholder="${this.placeholder}" autocomplete="off" spellcheck="false">
                <button type="button" class="sd-clear" title="Limpiar"><i class="bi bi-x"></i></button>
            </div>
            <ul class="sd-list"></ul>
            <div class="sd-empty d-none"><i class="bi bi-inbox-fill"></i><span>${this.emptyText}</span></div>`;

        if (!document.getElementById('sd-styles')) {
            const style = document.createElement('style');
            style.id = 'sd-styles';
            style.textContent = `
                .sd-trigger-wrap { position: relative; }
                .sd-trigger-input { cursor: pointer !important; background: #fff !important; user-select: none; }

                .sd-chevron {
                    position: absolute; right: 10px; top: 50%; transform: translateY(-50%);
                    color: #9ca3af; pointer-events: none; font-size: .78rem;
                    transition: transform .2s cubic-bezier(.4,0,.2,1);
                }
                .sd-chevron.open { transform: translateY(-50%) rotate(180deg); color: var(--primary, #7c3aed); }

                .sd-trigger-wrap.sd-has-value .sd-chevron { color: var(--primary, #7c3aed); }
                .sd-trigger-wrap[style*="pointer-events: none"] { opacity: .55; }

                .sd-dropdown {
                    position: fixed; z-index: 9999;
                    background: #fff; border-radius: .8rem;
                    box-shadow: 0 10px 40px rgba(0,0,0,.13), 0 2px 8px rgba(0,0,0,.07);
                    border: 1px solid rgba(0,0,0,.07);
                    overflow: hidden;
                    animation: sdIn .16s cubic-bezier(.16,1,.3,1);
                }
                @keyframes sdIn {
                    from { opacity: 0; transform: translateY(-8px) scale(.97); }
                    to   { opacity: 1; transform: translateY(0)   scale(1);    }
                }

                .sd-search-wrap {
                    display: flex; align-items: center; gap: .5rem;
                    padding: .6rem .85rem; border-bottom: 1px solid #f0f0f0;
                    background: #fafafa;
                }
                .sd-icon { color: #9ca3af; font-size: .82rem; flex-shrink: 0; }
                .sd-search {
                    border: none; outline: none; flex: 1;
                    font-size: .875rem; background: transparent; color: #111;
                }
                .sd-search::placeholder { color: #c0c0c0; }
                .sd-clear {
                    border: none; background: none; padding: 2px 4px; cursor: pointer;
                    color: #aaa; font-size: 1rem; line-height: 1;
                    display: flex; align-items: center; border-radius: 50%;
                    opacity: 0; transition: opacity .15s, background .15s;
                }
                .sd-clear.visible { opacity: 1; }
                .sd-clear:hover { background: #f0f0f0; color: #555; }

                .sd-list {
                    list-style: none; margin: 0; padding: .3rem 0;
                    max-height: 256px; overflow-y: auto;
                }
                .sd-list::-webkit-scrollbar { width: 4px; }
                .sd-list::-webkit-scrollbar-track { background: transparent; }
                .sd-list::-webkit-scrollbar-thumb { background: #e5e7eb; border-radius: 4px; }

                .sd-item {
                    display: flex; flex-direction: column; justify-content: center;
                    padding: .55rem 1rem; cursor: pointer;
                    transition: background .1s;
                    font-size: .875rem; color: #1f2937;
                    border-left: 3px solid transparent;
                }
                .sd-item:hover  { background: #f5f3ff; border-left-color: var(--primary, #7c3aed); }
                .sd-item.focused { background: #ede9fe; border-left-color: var(--primary, #7c3aed); }
                .sd-item.selected {
                    background: #ede9fe; color: var(--primary, #7c3aed);
                    font-weight: 600; border-left-color: var(--primary, #7c3aed);
                }
                .sd-item .sd-label { line-height: 1.3; }
                .sd-item .sd-sub   { font-size: .73rem; color: #9ca3af; margin-top: .1rem; }

                .sd-empty {
                    display: flex; flex-direction: column; align-items: center;
                    gap: .4rem; padding: 1.5rem 1rem;
                    color: #9ca3af; font-size: .82rem;
                }
                .sd-empty i { font-size: 1.5rem; opacity: .35; }

                .sd-loading {
                    display: flex; align-items: center; justify-content: center;
                    gap: .6rem; padding: 1.1rem; color: #9ca3af; font-size: .82rem;
                    list-style: none;
                }
                .sd-loading .spinner-border { width: .9rem; height: .9rem; border-width: 2px; }

                mark.sd-hl {
                    background: #ede9fe; color: var(--primary, #7c3aed);
                    padding: 0; border-radius: 2px; font-weight: 600;
                }
            `;
            document.head.appendChild(style);
        }

        this.triggerEl.classList.add('sd-trigger-wrap');
        this.triggerEl.querySelectorAll('input[type="text"]').forEach(inp => {
            inp.classList.add('sd-trigger-input');
            inp.readOnly = true;
        });

        this._chevron = document.createElement('i');
        this._chevron.className = 'bi bi-chevron-down sd-chevron';
        this.triggerEl.appendChild(this._chevron);

        this.triggerEl.addEventListener('click', (e) => {
            if (this._disabled) return;
            e.stopPropagation();
            this._isOpen() ? this.close() : this.open();
        });

        const search   = this._dropdown.querySelector('.sd-search');
        const clearBtn = this._dropdown.querySelector('.sd-clear');

        search.addEventListener('input', () => {
            clearBtn.classList.toggle('visible', search.value.length > 0);
            this._filter(search.value);
        });
        search.addEventListener('keydown', (e) => {
            if (e.key === 'Escape')    { this.close(); }
            if (e.key === 'ArrowDown') { e.preventDefault(); this._moveFocus(1); }
            if (e.key === 'ArrowUp')   { e.preventDefault(); this._moveFocus(-1); }
            if (e.key === 'Enter')     { e.preventDefault(); this._selectFocused(); }
        });
        clearBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            search.value = '';
            clearBtn.classList.remove('visible');
            this._filter('');
            search.focus();
        });
        this._dropdown.addEventListener('click', (e) => {
            const li = e.target.closest('.sd-item');
            if (li) this._pickItem(li);
        });
    }

    _isOpen() { return !!this._dropdown.parentNode; }

    open() {
        if (this._isOpen()) return;
        this.onOpen();
        document.body.appendChild(this._dropdown);
        this._reposition();
        this._chevron.classList.add('open');
        const search = this._dropdown.querySelector('.sd-search');
        search.value = '';
        this._dropdown.querySelector('.sd-clear').classList.remove('visible');
        this._filter('');
        setTimeout(() => search.focus(), 50);
        document.addEventListener('click', this._bound);
    }

    _reposition() {
        if (!this._isOpen()) return;
        const rect     = this.triggerEl.getBoundingClientRect();
        const ddH      = Math.min(this._dropdown.scrollHeight || 340, 340);
        const below    = window.innerHeight - rect.bottom;
        const above    = rect.top;
        const goUp     = below < ddH + 8 && above > ddH + 8;

        this._dropdown.style.width = rect.width + 'px';
        this._dropdown.style.left  = rect.left + 'px';
        this._dropdown.style.top   = goUp
            ? (rect.top - ddH - 4) + 'px'
            : (rect.bottom + 4) + 'px';
    }

    close() {
        if (!this._isOpen()) return;
        this._dropdown.remove();
        this._chevron.classList.remove('open');
        document.removeEventListener('click', this._bound);
    }

    _onOutsideClick(e) {
        if (!this.triggerEl.contains(e.target) && !this._dropdown.contains(e.target)) this.close();
    }

    setItems(arr) {
        this.items = arr;
        if (this._isOpen()) this._filter(this._dropdown.querySelector('.sd-search').value);
    }

    showLoading() {
        const list  = this._dropdown.querySelector('.sd-list');
        const empty = this._dropdown.querySelector('.sd-empty');
        list.innerHTML = `<li class="sd-loading"><div class="spinner-border text-primary"></div>Cargando...</li>`;
        empty.classList.add('d-none');
    }

    _highlight(str, q) {
        if (!q || !str) return str || '';
        const idx = str.toLowerCase().indexOf(q.toLowerCase());
        if (idx === -1) return str;
        return str.slice(0, idx) +
            `<mark class="sd-hl">${str.slice(idx, idx + q.length)}</mark>` +
            str.slice(idx + q.length);
    }

    _filter(q) {
        const list  = this._dropdown.querySelector('.sd-list');
        const empty = this._dropdown.querySelector('.sd-empty');
        const lq    = q.trim();

        const filtered = lq
            ? this.items.filter(i =>
                (i.label || '').toLowerCase().includes(lq.toLowerCase()) ||
                (i.sub   || '').toLowerCase().includes(lq.toLowerCase()))
            : this.items;

        if (!filtered.length) {
            list.innerHTML = '';
            empty.classList.remove('d-none');
            return;
        }
        empty.classList.add('d-none');
        const curVal = this.inputEl?.value;
        list.innerHTML = filtered.map(item => {
            const selected = String(item.id) === String(curVal);
            return `<li class="sd-item${selected ? ' selected' : ''}"
                        data-id="${item.id}"
                        data-label="${(item.label || '').replace(/"/g, '&quot;')}">
                        <span class="sd-label">${this._highlight(item.label, lq)}</span>
                        ${item.sub ? `<span class="sd-sub">${this._highlight(item.sub, lq)}</span>` : ''}
                    </li>`;
        }).join('');
    }

    _moveFocus(dir) {
        const items = [...this._dropdown.querySelectorAll('.sd-item')];
        if (!items.length) return;
        const cur = this._dropdown.querySelector('.sd-item.focused');
        let idx = cur ? items.indexOf(cur) + dir : (dir > 0 ? 0 : items.length - 1);
        idx = Math.max(0, Math.min(idx, items.length - 1));
        items.forEach(i => i.classList.remove('focused'));
        items[idx].classList.add('focused');
        items[idx].scrollIntoView({ block: 'nearest' });
    }

    _selectFocused() {
        const focused = this._dropdown.querySelector('.sd-item.focused');
        if (focused) this._pickItem(focused);
    }

    _pickItem(li) {
        const id    = li.dataset.id;
        const label = li.dataset.label;
        this.setValue(id, label);
        this.onSelect(this.items.find(i => String(i.id) === String(id)) || { id, label });
        this.close();
    }

    setValue(id, label) {
        if (this.inputEl)   this.inputEl.value  = id;
        if (this.displayEl) this.displayEl.value = label;
        this.triggerEl.classList.toggle('sd-has-value', !!id);
    }

    reset(placeholder = '') {
        if (this.inputEl)  this.inputEl.value   = '';
        if (this.displayEl) {
            this.displayEl.value = '';
            if (placeholder) this.displayEl.placeholder = placeholder;
        }
        this.triggerEl.classList.remove('sd-has-value');
    }

    disable(msg = '') {
        this._disabled = true;
        this.triggerEl.style.opacity       = '.55';
        this.triggerEl.style.pointerEvents = 'none';
        if (msg && this.displayEl) this.displayEl.placeholder = msg;
    }

    enable(placeholder = '') {
        this._disabled = false;
        this.triggerEl.style.opacity       = '';
        this.triggerEl.style.pointerEvents = '';
        if (placeholder && this.displayEl) this.displayEl.placeholder = placeholder;
    }

    destroy() {
        this.close();
        this._chevron?.remove();
        this.triggerEl.classList.remove('sd-trigger-wrap', 'sd-has-value');
        this.triggerEl.querySelectorAll('input').forEach(i => i.classList.remove('sd-trigger-input'));
    }
}


/* ─────────────────────────────────────────────────────────────────────────────
   HorarioTitulada
────────────────────────────────────────────────────────────────────────────── */
class HorarioTitulada {
    constructor() {
        this.fichas        = [];
        this.municipios    = [];
        this.ambientes     = [];
        this.instructores  = [];
        this.sedes         = [];
        this.selectedFicha = null;
        this.viewState     = 'fichas';

        this._ddMunicipio  = null;
        this._ddPrograma   = null;
        this._ddInstructor = null;

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
                        <div class="page-icon"><i class="bi bi-calendar-week"></i></div>
                        <div class="flex-grow-1">
                            <h4 class="fw-bold mb-1" style="color:var(--text-dark)">Horario Titulada</h4>
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
                                     style="background:linear-gradient(135deg,var(--primary) 0%,var(--primary-dark) 100%);">
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
                                                <div class="mb-2" id="container-sede">
                                                    <label class="form-label small text-muted mb-1">Sede</label>
                                                    <select class="form-select form-select-sm" id="idSede" required>
                                                        <option value="">Seleccionar sede...</option>
                                                    </select>
                                                </div>
                                                <div class="mb-2" id="container-ambiente">
                                                    <label class="form-label small text-muted mb-1">Ambiente</label>
                                                    <select class="form-select form-select-sm" id="idAmbiente" required>
                                                        <option value="">Seleccionar ambiente...</option>
                                                    </select>
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
                                                    <label class="form-label small text-muted mb-1">Días de la semana</label>
                                                    <div class="d-flex flex-wrap gap-1" id="dias-container"></div>
                                                </div>
                                                <div>
                                                    <label class="form-label small text-muted mb-1">Observación (Opcional)</label>
                                                    <textarea class="form-control form-control-sm" id="observacion" rows="1" placeholder="Ej. Bloque con enfoque práctico..."></textarea>
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
                            </div>
                        </div>
                    </div>
                </main>
            </div>`;
    }

    async loadDependencies() {
        try {
            const [aData, iData, sData, mData] = await Promise.all([
                getAmbientes(), getFuncionarios(), getSedes(), getMunicipiosConFichas()
            ]);
            this.municipios   = Array.isArray(mData) ? mData : (mData.data || []);
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
        this.renderSedesSelect();
        const selAmb = document.getElementById('idAmbiente');
        if (selAmb) selAmb.innerHTML = '<option value="">Seleccionar ambiente...</option>';
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
    }

    _initInstructorDropdown() {
        const triggerEl = document.getElementById('btn-select-instructor');
        if (!triggerEl) return;
        this._ddInstructor?.destroy();
        this._ddInstructor = new SearchableDropdown({
            triggerEl,
            inputId:     'idFuncionario',
            displayId:   'instructorNombreDisplay',
            placeholder: 'Buscar por nombre o área...',
            emptyText:   'No se encontraron instructores',
            onOpen: () => {
                const idAmbiente = document.getElementById('idAmbiente')?.value;
                const amb = this.ambientes.find(a => String(a.idAmbiente) === String(idAmbiente));
                this._ddInstructor.setItems(this._getInstructorItems(amb?.idArea ?? null));
            },
        });
    }

    _getInstructorItems(idAreaPreferida = null) {
        let list = [...this.instructores];
        if (idAreaPreferida) {
            list.sort((a, b) => {
                const aH = a.areas?.some(ar => String(ar.idArea) === String(idAreaPreferida));
                const bH = b.areas?.some(ar => String(ar.idArea) === String(idAreaPreferida));
                return (aH && !bH) ? -1 : (!aH && bH) ? 1 : 0;
            });
        }
        return list.map(i => {
            const nombre = i.nombre || '';
            const apellido = i.apellido || '';
            return {
                id:    i.idFuncionario,
                label: `${nombre} ${apellido}`.trim() || 'Sin nombre',
                sub:   i.areas?.length ? i.areas.map(a => a.nombreArea).join(', ') : 'Sin área',
            };
        });
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
                const numero = a.numero ?? a.numeroAmbiente ?? a.num ?? a.number ?? '?';
                return `<option value="${a.idAmbiente}">Blq ${a.bloque} -(${a.area?.nombreArea ?? 'Sin área'})</option>`;
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
            }
        });

        document.getElementById('idSede')?.addEventListener('change', e => {
            this.renderAmbientes(e.target.value);
            document.getElementById('idAmbiente').value = '';
        });

        document.getElementById('form-horario')?.addEventListener('submit', e => {
            e.preventDefault();
            this.handleSubmit();
        });
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

    // ── VISTA FICHAS ──────────────────────────────────────────────────────────
    renderFichasView(container) {
        const renderRows = (arr) => arr.map(f => {
            const prog         = f.programa?.nombre ?? 'Sin Programa';
            const tieneHorario = f.asignaciones?.length > 0;
            
            let fechasPill = '';
            if (tieneHorario && f.asignaciones) {
                let minDate = null;
                let maxDate = null;
                f.asignaciones.forEach(asig => {
                    if (asig.bloque && asig.bloque.fechaInicio && asig.bloque.fechaFin) {
                        const start = new Date(asig.bloque.fechaInicio);
                        const end = new Date(asig.bloque.fechaFin);
                        if (!minDate || start < minDate) minDate = start;
                        if (!maxDate || end > maxDate) maxDate = end;
                    }
                });
                
                if (minDate && maxDate) {
                    const formatDate = (d) => {
                        return d.toISOString().split('T')[0];
                    };
                    fechasPill = `<div class="mt-1 small text-muted text-nowrap" style="font-size:0.75rem;"><i class="bi bi-calendar-range me-1"></i>${formatDate(minDate)} a ${formatDate(maxDate)}</div>`;
                }
            }

            const badgeHorario = tieneHorario
                ? `<div class="d-flex flex-column gap-1">
                     <div><span class="badge rounded-pill bg-success bg-opacity-10 text-success border border-success border-opacity-25 px-3 py-1"><i class="bi bi-check-circle-fill me-1"></i>Sí</span></div>
                     ${fechasPill}
                   </div>`
                : `<span class="badge rounded-pill bg-secondary bg-opacity-10 text-secondary border border-secondary border-opacity-25 px-3 py-2"><i class="bi bi-x-circle me-1"></i>No</span>`;
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
        <!-- Filtros -->
        <div class="card border-0 shadow-sm rounded-4 mb-4">
            <div class="card-header bg-white border-0 pt-4 pb-3 px-4">
                <h5 class="fw-bold mb-1" style="color:var(--text-dark);">Horario Titulada</h5>
                <small class="text-muted">Selecciona el municipio y programa para filtrar las fichas disponibles.</small>
            </div>
            <div class="card-body px-4 pb-4">
                <div class="row g-3 align-items-end">

                    <div class="col-md-4">
                        <label class="form-label fw-semibold small text-muted text-uppercase mb-1" style="letter-spacing:.04em;">
                            <i class="bi bi-geo-alt text-primary me-1"></i>1. Municipio
                        </label>
                        <div id="dd-municipio-trigger"
                             style="border-radius:0.5rem; overflow:hidden; border:1px solid #d1d5db; background:#fff;">
                            <input type="text" id="municipioDisplay" class="form-control border-0"
                                   placeholder="Seleccionar municipio..." readonly>
                            <input type="hidden" id="hidMunicipio">
                        </div>
                    </div>

                    <div class="col-md-4">
                        <label class="form-label fw-semibold small text-muted text-uppercase mb-1" style="letter-spacing:.04em;">
                            <i class="bi bi-journals text-primary me-1"></i>2. Programa
                        </label>
                        <div id="dd-programa-trigger"
                             style="border-radius:0.5rem; overflow:hidden; border:1px solid #d1d5db; background:#fff;">
                            <input type="text" id="programaDisplay" class="form-control border-0"
                                   placeholder="Primero selecciona municipio..." readonly>
                            <input type="hidden" id="hidPrograma">
                        </div>
                    </div>

                    <div class="col-md-4">
                        <label class="form-label fw-semibold small text-muted text-uppercase mb-1" style="letter-spacing:.04em;">
                            <i class="bi bi-card-list text-primary me-1"></i>3. Ficha
                        </label>
                        <select class="form-select" id="sel-ficha" disabled>
                            <option value="">Seleccione una ficha...</option>
                        </select>
                    </div>

                </div>
            </div>
        </div>

        <!-- Tabla -->
        <div class="card border-0 shadow-sm rounded-4">
            <div class="card-header bg-white border-0 pt-4 pb-3 px-4 d-flex flex-wrap justify-content-between align-items-center gap-3">
                <div>
                    <h5 class="fw-bold mb-0" style="color:var(--text-dark);">Fichas disponibles</h5>
                    <small class="text-muted" id="lbl-fichas-count">Selecciona municipio y programa para ver las fichas</small>
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
                            <tr><td colspan="6" class="text-center py-5 text-muted">
                                <i class="bi bi-funnel fs-3 d-block mb-2 opacity-25"></i>
                                Selecciona un municipio y programa
                            </td></tr>
                        </tbody>
                    </table>
                </div>
            </div>
        </div>`;

        // ── Estado local ────────────────────────────────────────────────────────
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
            const el  = document.getElementById('fichas-tbody');
            const lbl = document.getElementById('lbl-fichas-count');
            if (!this.fichas.length) {
                el.innerHTML = `<tr><td colspan="6" class="text-center py-5 text-muted">
                    <i class="bi bi-inbox fs-3 d-block mb-2 opacity-25"></i>
                    No hay fichas activas para este programa y municipio
                </td></tr>`;
                if (lbl) lbl.textContent = '0 fichas encontradas';
                return;
            }
            el.innerHTML = renderRows(this.fichas);
            if (lbl) lbl.textContent = `${this.fichas.length} ficha(s) encontrada(s)`;
            attachEvents();
        };

        // ── Dropdown Municipio ───────────────────────────────────────────────────
        this._ddMunicipio?.destroy();
        this._ddMunicipio = new SearchableDropdown({
            triggerEl:   'dd-municipio-trigger',
            inputId:     'hidMunicipio',
            displayId:   'municipioDisplay',
            placeholder: 'Buscar municipio...',
            emptyText:   'No se encontraron municipios',
            onOpen: () => {
                this._ddMunicipio.setItems(
                    this.municipios.map(m => ({ id: m.idMunicipio, label: m.nombreMunicipio }))
                );
            },
            onSelect: async (item) => {
                this._ddPrograma.reset('Cargando programas...');
                this._ddPrograma.disable('Cargando programas...');
                const selFich = document.getElementById('sel-ficha');
                selFich.innerHTML = '<option value="">Seleccione una ficha...</option>';
                selFich.disabled  = true;
                this.fichas = [];
                document.getElementById('fichas-tbody').innerHTML = `<tr><td colspan="6" class="text-center py-5 text-muted">
                    <i class="bi bi-funnel fs-3 d-block mb-2 opacity-25"></i>Selecciona el programa para ver las fichas
                </td></tr>`;
                document.getElementById('lbl-fichas-count').textContent = 'Selecciona un programa para ver las fichas';

                try {
                    const programas = await getProgramasPorMunicipio(item.id);
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

        // ── Dropdown Programa ────────────────────────────────────────────────────
        this._ddPrograma?.destroy();
        this._ddPrograma = new SearchableDropdown({
            triggerEl:   'dd-programa-trigger',
            inputId:     'hidPrograma',
            displayId:   'programaDisplay',
            placeholder: 'Buscar programa...',
            emptyText:   'No se encontraron programas',
            onOpen: () => {
                if (!document.getElementById('hidMunicipio').value) {
                    this._ddPrograma.close();
                    const t = document.getElementById('dd-municipio-trigger');
                    t.style.transition = 'box-shadow .15s';
                    t.style.boxShadow  = '0 0 0 3px rgba(220,53,69,.3)';
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
                const idMun   = document.getElementById('hidMunicipio').value;
                const selFich = document.getElementById('sel-ficha');
                selFich.innerHTML = '<option value="">Cargando fichas...</option>';
                selFich.disabled  = true;
                this.fichas = [];

                try {
                    const fichasData = await getFichasPorProgramaMunicipio(item.id, idMun);
                    this.fichas = Array.isArray(fichasData) ? fichasData : (fichasData.data || []);
                    selFich.innerHTML = '<option value="">Seleccione una ficha...</option>' +
                        this.fichas.map(f => `<option value="${f.idFicha}">Ficha ${f.codigoFicha} · ${f.jornada || ''}</option>`).join('');
                    selFich.disabled = this.fichas.length === 0;
                    if (!this.fichas.length) selFich.innerHTML = '<option value="">Sin fichas activas</option>';
                    updateTable();
                } catch {
                    selFich.innerHTML = '<option value="">Error al cargar</option>';
                }
            }
        });

        // Programa deshabilitado hasta seleccionar municipio
        this._ddPrograma.disable('Primero selecciona municipio...');

        // ── Select ficha ─────────────────────────────────────────────────────────
        document.getElementById('sel-ficha').addEventListener('change', () => {
            const idFicha = document.getElementById('sel-ficha').value;
            if (!idFicha) return;
            document.querySelectorAll('.fila-ficha').forEach(row =>
                row.classList.toggle('table-active', row.dataset.id === idFicha)
            );
        });

        // ── Buscador tabla ───────────────────────────────────────────────────────
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

        document.getElementById('idSede').value    = '';
        document.getElementById('idAmbiente').value = '';

        this._ddInstructor?.destroy();
        this._initInstructorDropdown();
        this.renderAmbientes('');

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
        const card    = document.getElementById('calendario-card');
        const isEmpty = !asignaciones || asignaciones.length === 0;

        const header = `
            <div class="card-header bg-white border-0 d-flex justify-content-between align-items-center pt-4 pb-2 px-4">
                <div>
                    <h5 class="fw-bold mb-0" style="color:var(--text-dark)">Ficha ${ficha.codigoFicha}</h5>
                    <p class="small mb-0" style="color:var(--text-muted)">${ficha.programa?.nombre ?? ''}</p>
                </div>
                <button class="btn btn-purple rounded-pill px-4 d-flex align-items-center gap-2 shadow-sm"
                        data-bs-toggle="modal" data-bs-target="#modalHorario">
                    <i class="bi bi-plus-lg"></i><span>Agregar Formación</span>
                </button>
            </div>`;

        if (isEmpty) {
            card.innerHTML = header + `
                <div class="card-body p-5 text-center text-muted d-flex flex-column align-items-center justify-content-center" style="min-height:400px;">
                    <i class="bi bi-calendar-x fs-1 d-block mb-3 opacity-25"></i>
                    <p class="fw-medium">Sin clases asignadas</p>
                    <p class="small">Usa "Agregar Formación" para comenzar.</p>
                </div>`;
            return;
        }

        card.innerHTML = header +
            `<div class="card-body pt-0 px-4 pb-4" style="height:600px;">
                <div id="fullcalendar-container" class="h-100"></div>
             </div>`;

        /* ── Helpers de fecha ──────────────────────────────────────────────────
           ISO weekday: Lunes=1 … Domingo=7  (igual que DIA_ID_MAP)
           JS getDay():  Domingo=0, Lunes=1 … Sabado=6  → normalizar
        ─────────────────────────────────────────────────────────────────────── */
        const jsWeekday = (date) => date.getDay() === 0 ? 7 : date.getDay(); // 1=Lun … 7=Dom

        /**
         * Dado el nombre del día (e.g. 'Lunes') y un rango [fechaInicio, fechaFin],
         * devuelve un array con todas las fechas ISO (YYYY-MM-DD) de ese día
         * dentro del rango.
         */
        const fechasDelDiaEnRango = (nombreDia, fechaInicioStr, fechaFinStr) => {
            const targetWd = DIA_ID_MAP[nombreDia]; // 1-7
            if (!targetWd || !fechaInicioStr || !fechaFinStr) return [];

            const start = new Date(fechaInicioStr + 'T00:00:00');
            const end   = new Date(fechaFinStr   + 'T00:00:00');
            const fechas = [];

            // Avanzar desde start hasta encontrar el primer día coincidente
            const cur = new Date(start);
            while (jsWeekday(cur) !== targetWd) {
                cur.setDate(cur.getDate() + 1);
                if (cur > end) return []; // el día nunca ocurre en el rango
            }
            // Iterar semana a semana
            while (cur <= end) {
                fechas.push(cur.toISOString().slice(0, 10));
                cur.setDate(cur.getDate() + 7);
            }
            return fechas;
        };

        /* ── Construir eventos ─────────────────────────────────────────────── */
        const events = [];
        let globalStart = null;
        let globalEnd   = null;

        if (asignaciones && asignaciones.length) {
            for (const asig of asignaciones) {
                const bloque = asig.bloque;
                if (!bloque) continue;

                const startHour = bloque.horaInicio || bloque.hora_inicio;
                const endHour   = bloque.horaFin || bloque.hora_fin;
                if (!startHour || !endHour) continue;

                const startDate = asig.fechaInicio || asig.fecha_inicio || bloque.fechaInicio || bloque.fecha_inicio;
                const endDate   = asig.fechaFin || asig.fecha_fin || bloque.fechaFin || bloque.fecha_fin;

                if (startDate && (!globalStart || startDate < globalStart)) globalStart = startDate;
                if (endDate   && (!globalEnd   || endDate > globalEnd))     globalEnd   = endDate;

                const isVirtual = asig.modalidad === 'virtual';

                (bloque.dias || []).forEach(diaObj => {
                    const dia = diaObj.nombreDia || diaObj.nombre;
                    if (!dia) return;

                    const fechas = fechasDelDiaEnRango(dia, startDate, endDate);
                    for (const fecha of fechas) {
                        const ambienteLabel = asig.ambiente ? (asig.ambiente.codigo || asig.ambiente.nombre) : null;
                        const tipoFormacion = asig.ficha?.programa?.tipoFormacion?.nombreTipoFormacion 
                                           || asig.ficha?.programa?.tipo_formacion?.nombreTipoFormacion || '';

                        const bloqueFormacion = bloque.tipoFormacion || '';
                        const isTransversal = bloqueFormacion.toLowerCase() === 'transversal';
                        const orderPriority = isTransversal ? 1 : 2;

                        events.push({
                            id:    `${asig.idAsignacion}_${dia}_${fecha}`,
                            start: `${fecha}T${startHour}`,
                            end:   `${fecha}T${endHour}`,
                            orderPriority: orderPriority,
                            classNames: isTransversal ? ['event-transversal'] : ['event-titulada'],
                            backgroundColor: isTransversal ? '#ffffff' : (isVirtual ? 'rgba(13,202,240,0.1)' : 'rgba(76,170,22,0.1)'),
                            borderColor:     isVirtual ? '#0dcaf0' : '#4caa16',
                            textColor:       isVirtual ? '#0dcaf0' : '#4caa16',
                            extendedProps: {
                                instructor:      asig.funcionario ? asig.funcionario.nombre : '—',
                                ambiente:        ambienteLabel,
                                modalidad:       asig.modalidad,
                                tipoDeFormacion: tipoFormacion,
                                fechaInicio:     startDate,
                                fechaFin:        endDate,
                                idBloque:        bloque.idBloque,
                                idDia:           diaObj.idDia || DIA_ID_MAP[dia],
                                nombreDia:       dia,
                                idAsignacion:    asig.idAsignacion,
                                isTransversal:   isTransversal
                            }
                        });
                    }
                });
            }
        }

        /* ── Calcular rango global para posicionar el calendario ───────────── */
        const initialDate = globalStart ?? new Date().toISOString().slice(0, 10);

        /* ── Toolbar personalizado ─────────────────────────────────────────── */
        // Lo inyectamos manualmente para tener control total del diseño
        const calendarWrapper = document.getElementById('fullcalendar-container');

        // Insertar toolbar encima del calendario
        const toolbarEl = document.createElement('div');
        toolbarEl.className = 'd-flex align-items-center justify-content-between mb-3';
        toolbarEl.innerHTML = `
            <div class="d-flex align-items-center gap-2">
                <button class="btn btn-sm btn-light border rounded-pill px-3 shadow-sm" id="fc-prev">
                    <i class="bi bi-chevron-left"></i>
                </button>
                <button class="btn btn-sm btn-light border rounded-pill px-3 shadow-sm" id="fc-next">
                    <i class="bi bi-chevron-right"></i>
                </button>
                <button class="btn btn-sm btn-light border rounded-pill px-3 shadow-sm" id="fc-today">
                    Hoy
                </button>
            </div>
            <div class="text-center">
                <span id="fc-title" class="fw-semibold" style="color:var(--text-dark);font-size:.95rem;"></span>
                ${globalStart && globalEnd
                    ? `<span class="badge bg-light text-muted border ms-2" style="font-size:.7rem;">
                           <i class="bi bi-calendar-range me-1"></i>${globalStart} → ${globalEnd}
                       </span>`
                    : ''}
            </div>
            <div class="d-flex gap-2">
                <button class="btn btn-sm btn-light border rounded-pill px-3 shadow-sm fc-view-btn active-view" data-view="timeGridWeek">Semana</button>
                <button class="btn btn-sm btn-light border rounded-pill px-3 shadow-sm fc-view-btn" data-view="dayGridMonth">Mes</button>
                <button class="btn btn-sm btn-light border rounded-pill px-3 shadow-sm fc-view-btn" data-view="timeGridDay">Día</button>
            </div>`;

        // El contenedor del calendario en sí
        const fcEl = document.createElement('div');
        fcEl.id = 'fc-grid';
        fcEl.style.height = 'calc(100% - 52px)';

        calendarWrapper.style.display    = 'flex';
        calendarWrapper.style.flexDirection = 'column';
        calendarWrapper.style.height     = '100%';
        calendarWrapper.appendChild(toolbarEl);
        calendarWrapper.appendChild(fcEl);

        /* ── FullCalendar ──────────────────────────────────────────────────── */
        const calendar = new FullCalendar.Calendar(fcEl, {
            initialView:   'timeGridWeek',
            eventOrder:    'orderPriority,start,-duration,allDay,title',
            initialDate,
            headerToolbar: false,   // usamos nuestro toolbar
            allDaySlot:    false,
            slotMinTime:   '06:00:00',
            slotMaxTime:   '24:00:00',
            expandRows:    true,
            locale:        'es',
            // Limitar navegación al rango real
            validRange:    globalStart && globalEnd
                ? { start: globalStart, end: globalEnd }
                : undefined,
            dayHeaderFormat: { weekday: 'short', day: 'numeric', month: 'short' },
            events,

            // Actualizar el título personalizado cuando cambia la vista
            datesSet: (info) => {
                const titleEl = document.getElementById('fc-title');
                if (titleEl) titleEl.textContent = calendar.view.title;
            },

            eventContent(arg) {
                const p    = arg.event.extendedProps;
                const icon = p.modalidad === 'virtual' ? 'bi-laptop' : 'bi-building';
                const badge = p.tipoDeFormacion
                    ? `<div class="mt-auto pt-1"><span class="badge bg-secondary bg-opacity-25 text-dark" style="font-size:0.65rem;">${p.tipoDeFormacion}</span></div>`
                    : '';

                // Compact rendering for monthly view
                if (calendar.view.type === 'dayGridMonth') {
                    return {
                        html: `<div class="p-1 d-flex flex-column overflow-hidden" style="font-size:0.72rem;">
                            <div class="fw-bold text-truncate">${p.instructor}</div>
                            <div class="text-truncate" style="font-size:0.65rem;opacity:0.8;">
                                <i class="bi ${icon}"></i> ${p.ambiente || 'Virtual'}
                            </div>
                        </div>`
                    };
                }

                return {
                    html: `
                        <div class="p-2 d-flex flex-column position-relative" style="height:100%; width:100%; overflow:hidden; background:#ffffff; border-radius: 3px;">    
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
                                    style="line-height:1;transform:translate(25%,-25%);background:white;border-radius:50%;box-shadow:0 0 3px rgba(0,0,0,0.2); z-index: 10;">
                                <i class="bi bi-x-circle-fill"></i>
                            </button>
                        </div>`
                };
            },
            eventDidMount: function(arg) {
                const harness = arg.el.parentElement;
                if (!harness) return;
                const isTransversal = arg.event.extendedProps.isTransversal;
                
                if (isTransversal) {
                    harness.classList.add('fc-timegrid-event-harness-transversal');
                    harness.style.left = '35%';
                    harness.style.right = '0%';
                } else {
                    harness.classList.add('fc-timegrid-event-harness-titulada');
                    harness.style.left = '0%';
                    harness.style.right = '0%';
                }
            },
            eventMouseEnter: info => info.el.querySelector('.delete-btn')?.classList.remove('d-none'),
            eventMouseLeave: info => info.el.querySelector('.delete-btn')?.classList.add('d-none'),
        });
        calendar.render();

        // Estilos para sobreponer las clases transversales a las tituladas
        const fcStyle = document.createElement('style');
        fcStyle.id = 'calendar-overlap-styles';
        if (!document.getElementById('calendar-overlap-styles')) {
            fcStyle.textContent = `
                .fc-timegrid-event-harness-titulada {
                    z-index: 1 !important;
                }
                .fc-timegrid-event-harness-transversal {
                    z-index: 10 !important;
                }
                .fc-timegrid-event {
                    border-radius: 4px;
                }
            `;
            document.head.appendChild(fcStyle);
        }

        // Conectar botones del toolbar personalizado
        document.getElementById('fc-prev')?.addEventListener('click',  () => { calendar.prev();  });
        document.getElementById('fc-next')?.addEventListener('click',  () => { calendar.next();  });
        document.getElementById('fc-today')?.addEventListener('click', () => { calendar.today(); });

        document.querySelectorAll('.fc-view-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                document.querySelectorAll('.fc-view-btn').forEach(b => b.classList.remove('active-view', 'btn-purple'));
                btn.classList.add('active-view', 'btn-purple');
                calendar.changeView(btn.dataset.view);
            });
        });

        // Eliminar día de bloque
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
                horaInicio:      document.getElementById('hora_inicio').value + ':00',
                horaFin:         document.getElementById('hora_fin').value   + ':00',
                modalidad,
                tipoFormacion:   'titulada',
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
            this._ddInstructor?.reset('Buscar instructor...');
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

document.addEventListener('DOMContentLoaded', () => { new HorarioTitulada(); });