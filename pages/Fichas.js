import { ProtectedRoute } from '../components/ProtectedRoute.js';
import { Navbar, initNavbarEvents } from '../components/Navbar.js';
import { Sidebar, initSidebarEvents } from '../components/Sidebar.js';
import { DataTable } from '../components/DataTable.js';
import { ModalForm, setModalLoading } from '../components/ModalForm.js';
import { FormInput } from '../components/FormInput.js';
import { ConfirmDialog } from '../components/ConfirmDialog.js';
import { AlertMessage } from '../components/AlertMessage.js';
import { getFichas, createFicha, updateFicha, deleteFicha, getProgramas, exportarFichas, exportarAprendicesDeFicha, importarAprendices } from '../utils/api.js';

class FichasPage {
    constructor() {
        new ProtectedRoute();
        this.appContainer = document.getElementById('app');
        this.fichas = [];
        this.programas = [];
        this.currentEditId = null;

        this.init();
    }

    async init() {
        this.renderLayout();
        initNavbarEvents();
        initSidebarEvents();

        await this.loadDependencies();
        this.setupModal();
        await this.loadData();
    }

    renderLayout() {
        const currentPath = window.location.pathname;

        this.appContainer.innerHTML = `
            ${Sidebar(currentPath)}
            
            <div class="main-wrapper">
                ${Navbar()}
                
                <main class="container-fluid p-4 flex-grow-1" style="background: var(--bg-page);">
                    <div id="page-alert-container"></div>
                    
                    <div class="d-flex flex-column flex-sm-row justify-content-between align-items-start align-items-sm-center mb-4 gap-3">
                        <div class="d-flex align-items-center gap-3">
                            <div class="page-icon">
                                <i class="bi bi-person-video3"></i>
                            </div>
                            <div>
                                <h4 class="fw-bold mb-0" style="color: var(--text-dark);">Fichas</h4>
                                <small style="color: var(--text-muted);">Administra los grupos de formación</small>
                            </div>
                        </div>
                        
                        <button class="btn btn-purple d-flex align-items-center gap-2" id="btn-add-ficha">
                            <i class="bi bi-plus-lg"></i>
                            <span>Nueva Ficha</span>
                        </button>
                    </div>

                    <div class="d-flex flex-wrap justify-content-between align-items-center mb-3 gap-2">
                        <div class="btn-group btn-group-sm" role="group">
                            <button id="btn-export-db" class="btn btn-success rounded-end-pill px-3" title="Exportar DB" style="border-left: 1px solid rgba(255,255,255,0.2);">
                                <i class="bi bi-download"></i> Exportar
                            </button>
                        </div>
                        <div class="d-flex align-items-center gap-2">
                            <label class="mb-0 fw-medium" style="color: var(--text-muted); font-size: 0.85rem;">Search:</label>
                            <input type="text" class="form-control form-control-sm" style="max-width: 200px; border-color: var(--border-color); border-radius: 0.4rem;" placeholder="" id="search-input">
                        </div>
                    </div>

                    <div id="table-container">
                        ${DataTable({ id: 'fichas-table', columns: [], loading: true })}
                    </div>
                </main>
            </div>
            
            <div id="modal-container"></div>
            
            <!-- Modal: Aprendices de la Ficha -->
            <div class="modal fade" id="modalAprendicesFicha" tabindex="-1" aria-hidden="true">
                <div class="modal-dialog modal-md modal-dialog-centered">
                    <div class="modal-content border-0 shadow-lg" style="border-radius:1rem; overflow:hidden;">
                        <!-- Header -->
                        <div class="modal-header text-white border-0 px-4 py-3"
                             style="background:linear-gradient(135deg,var(--primary) 0%,hsl(280,60%,55%) 100%);">
                            <h5 class="modal-title fw-bold d-flex align-items-center gap-2" id="modal-aprendices-title">
                                <i class="bi bi-people"></i> Aprendices de la Ficha
                            </h5>
                            <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal"></button>
                        </div>
                        <!-- Body -->
                        <div class="modal-body p-4 text-center" style="background:var(--bg-page);">
                            <p class="mb-4">Gestiona los aprendices vinculados a esta ficha usando Excel.</p>
                            
                            <div class="d-flex flex-column gap-3 mx-auto" style="max-width: 300px;">
                                <button id="btn-export-aprendices" class="btn btn-success d-flex align-items-center justify-content-center gap-2 py-2">
                                    <i class="bi bi-download"></i> Exportar Aprendices
                                </button>
                                
                                <button id="btn-import-aprendices" class="btn btn-primary d-flex align-items-center justify-content-center gap-2 py-2">
                                    <i class="bi bi-upload"></i> Importar Aprendices
                                </button>
                                <input type="file" id="file-import-aprendices" accept=".xlsx, .xls, .csv" style="display:none;">
                            </div>
                            
                            <div id="alert-aprendices-container" class="mt-3 text-start"></div>
                        </div>
                    </div>
                </div>
            </div>

        `;

        document.getElementById('btn-add-ficha').addEventListener('click', () => this.openModal());

        const searchInput = document.getElementById('search-input');
        if (searchInput) {
            searchInput.addEventListener('input', (e) => this.filterTable(e.target.value));
        }

        document.getElementById('btn-export-db').addEventListener('click', async () => {
            try {
                this.showAlert('page-alert-container', 'info', 'Descargando archivo...');
                await exportarFichas();
            } catch (err) {
                this.showAlert('page-alert-container', 'danger', err.message || 'Error al descargar');
            }
        });

        document.getElementById('btn-export-aprendices').addEventListener('click', async () => {
            if (!this.currentFichaIdAprendices) return;
            try {
                this.showAlert('alert-aprendices-container', 'info', 'Descargando archivo...');
                await exportarAprendicesDeFicha(this.currentFichaIdAprendices);
                this.showAlert('alert-aprendices-container', 'success', 'Archivo exportado con éxito.');
            } catch (err) {
                this.showAlert('alert-aprendices-container', 'danger', err.message || 'Error al exportar aprendices');
            }
        });

        const fileImportAp = document.getElementById('file-import-aprendices');
        document.getElementById('btn-import-aprendices').addEventListener('click', () => {
            fileImportAp.click();
        });

        fileImportAp.addEventListener('change', async (e) => {
            const file = e.target.files[0];
            if (!file || !this.currentFichaIdAprendices) return;

            try {
                this.showAlert('alert-aprendices-container', 'info', 'Importando aprendices... Por favor espera.');
                const res = await importarAprendices(file, this.currentFichaIdAprendices);
                let msg = `Importación exitosa. Agregados/Actualizados: ${res.importados || 0}.`;
                if (res.con_errores > 0) {
                    msg += ` Filas con problemas: ${res.con_errores}. Revisa el log o datos.`;
                }
                this.showAlert('alert-aprendices-container', res.con_errores > 0 ? 'warning' : 'success', msg);
            } catch (err) {
                this.showAlert('alert-aprendices-container', 'danger', err.message || 'Error al importar');
            } finally {
                e.target.value = ''; // Reset input
            }
        });
    }

    async loadDependencies() {
        try {
            const progData = await getProgramas();
            this.programas = progData.data || (Array.isArray(progData) ? progData : []);
        } catch (error) {
            console.error('Error al cargar dependencias:', error);
            this.showAlert('page-alert-container', 'warning', 'No se pudieron cargar los programas.');
        }
    }

    // Extrae la duración en meses del programa soportando camelCase y snake_case
    getProgramaDuracion(programa) {
        if (!programa) return 0;
        const tipo = programa.tipoFormacion || programa.tipo_formacion;
        if (!tipo) return 0;
        const meses = tipo.duracionMeses ?? tipo.duracion_meses ?? 0;
        return parseInt(meses) || 0;
    }

    filterTable(query) {
        const q = query.toLowerCase().trim();
        if (!q) {
            this.renderTable(this.fichas);
            return;
        }
        const filtered = this.fichas.filter(f =>
            (f.codigoFicha && f.codigoFicha.toLowerCase().includes(q)) ||
            (f.jornada && f.jornada.toLowerCase().includes(q)) ||
            (f.modalidad && f.modalidad.toLowerCase().includes(q)) ||
            (f.programa && f.programa.nombre && f.programa.nombre.toLowerCase().includes(q)) ||
            (f.programa && f.programa.codigo && f.programa.codigo.toLowerCase().includes(q))
        );
        this.renderTable(filtered);
    }

    async loadData() {
        try {
            const data = await getFichas();
            this.fichas = data.data || (Array.isArray(data) ? data : []);
            this.renderTable();
        } catch (error) {
            this.showAlert('page-alert-container', 'danger', error.message || 'Error al cargar las fichas.');
            document.getElementById('table-container').innerHTML = DataTable({ id: 'fichas-table', columns: [], loading: false, data: [] });
        }
    }

    renderTable(data = null) {
        const displayData = data || this.fichas;

        const columns = [
            { key: 'codigoFicha', label: 'Código', icon: 'hash' },
            {
                key: 'programa',
                label: 'Programa',
                icon: 'book',
                render: (row) => row.programa
                    ? (row.programa.codigo
                        ? `<span class="text-muted me-1" style="font-size:0.8rem;">${row.programa.codigo}</span> ${row.programa.nombre}`
                        : row.programa.nombre)
                    : '<span class="text-muted">N/A</span>'
            },
            { key: 'jornada', label: 'Jornada', icon: 'clock' },
            { key: 'modalidad', label: 'Modalidad', icon: 'laptop' },
            { key: 'fechaInicio', label: 'Inicio', icon: 'calendar-event' },
            { key: 'fechaFin', label: 'Fin', icon: 'calendar-check' },
            {
                key: 'estado',
                label: 'Estado',
                icon: 'toggle-on',
                render: (row) => {
                    const badgeClass = row.estado === 'Activo' ? 'bg-success-subtle text-success' : 'bg-danger-subtle text-danger';
                    return `<span class="badge rounded-pill ${badgeClass}">${row.estado || 'N/A'}</span>`;
                }
            },
            {
                key: 'acciones',
                label: '',
                render: (row) => `
                    <div class="d-flex gap-1 justify-content-end">
                        <button class="btn-action btn-aprendices" data-id="${row.idFicha}" data-codigo="${row.codigoFicha || ''}" title="Aprendices de la Ficha">
                            <i class="bi bi-people" style="color:var(--primary);"></i>
                        </button>
                        <button class="btn-action edit btn-edit" data-id="${row.idFicha}" title="Editar">
                            <i class="bi bi-pencil-square"></i>
                        </button>
                        <button class="btn-action delete btn-delete" data-id="${row.idFicha}" title="Eliminar">
                            <i class="bi bi-trash"></i>
                        </button>
                    </div>
                `
            }
        ];

        document.getElementById('table-container').innerHTML = DataTable({
            id: 'fichas-table',
            columns: columns,
            data: displayData
        });

        if (typeof $ !== 'undefined' && $.fn.dataTable) {
            this.dtInstance = $('#fichas-table').DataTable({
                responsive: true,
                paging: false,
                info: false,
                searching: false,
                dom: 'rt',
                columnDefs: [{ orderable: false, targets: -1 }]
            });
            this.bindToolbarButtons();
        }

        document.querySelectorAll('.btn-edit').forEach(btn => {
            btn.addEventListener('click', (e) => this.openModal(e.currentTarget.dataset.id));
        });

        document.querySelectorAll('.btn-delete').forEach(btn => {
            btn.addEventListener('click', (e) => this.handleDelete(e.currentTarget.dataset.id));
        });

        document.querySelectorAll('.btn-aprendices').forEach(btn => {
            btn.addEventListener('click', (e) => this.abrirModalAprendices(e.currentTarget.dataset.id, e.currentTarget.dataset.codigo));
        });
    }

    abrirModalAprendices(idFicha, codigoFicha) {
        this.currentFichaIdAprendices = idFicha;
        document.getElementById('modal-aprendices-title').innerHTML = `<i class="bi bi-people"></i> Aprendices - Ficha ${codigoFicha}`;
        document.getElementById('alert-aprendices-container').innerHTML = '';

        const modalEl = document.getElementById('modalAprendicesFicha');
        bootstrap.Modal.getOrCreateInstance(modalEl).show();
    }

    bindToolbarButtons() {
        const dt = this.dtInstance;
        if (!dt) return;
        const map = { 'btn-colvis': 0, 'btn-excel': 1, 'btn-pdf': 2, 'btn-print': 3 };
        Object.entries(map).forEach(([id, idx]) => {
            const el = document.getElementById(id);
            if (el) {
                const newEl = el.cloneNode(true);
                el.parentNode.replaceChild(newEl, el);
                newEl.addEventListener('click', () => dt.button(idx).trigger());
            }
        });
    }

    setupModal() {
        const formContent = `
            <style>
                #ficha-modal .section-title { color: var(--text-dark); font-weight: 600; margin-bottom: 0.6rem; border-bottom: 1px solid #eeecf5; padding-bottom: 0.35rem; font-size: 0.82rem; text-transform: uppercase; letter-spacing: .04em; }
                #ficha-modal .form-label { color: #4b5563; font-weight: 500; font-size: 0.8rem; margin-bottom: 0.2rem; }
                #ficha-modal .form-control, #ficha-modal .form-select { border: 1px solid #d1d5db; border-radius: 0.4rem; padding: 0.35rem 0.65rem; color: #1f2937; font-size: 0.82rem; }
                #ficha-modal .form-control:focus, #ficha-modal .form-select:focus { border-color: var(--primary); box-shadow: 0 0 0 3px rgba(107,70,193,0.08); }
                #ficha-modal .compact-section { background: var(--bg-page, #f9fafb); padding: 0.75rem; border-radius: 0.4rem; margin-bottom: 0.6rem; border: 1px solid #e2e8f0; }
                #ficha-modal .view-slide { display: none; }
                #ficha-modal .view-slide.active { display: block; animation: fichaFadeIn 0.18s ease; }
                @keyframes fichaFadeIn { from { opacity: 0; transform: translateY(5px); } to { opacity: 1; transform: translateY(0); } }
            </style>

            <!-- VISTA 1: FORMULARIO PRINCIPAL -->
            <div class="view-slide active" id="view-ficha-form">
              <div class="row g-3">
                <!-- Columna Izquierda -->
                <div class="col-md-6">
                  <div class="compact-section shadow-sm">
                    <h6 class="section-title"><i class="bi bi-info-circle text-primary me-1"></i>1. Detalles de la Ficha</h6>
                    <div class="mb-2">
                      <label for="codigoFicha" class="form-label">Código de la Ficha</label>
                      <input type="text" class="form-control" id="codigoFicha" placeholder="Ej: 2866432" required>
                    </div>
                    <div>
                      <label class="form-label">Programa de Formación</label>
                      <div class="input-group input-group-sm" id="btn-select-programa" style="cursor:pointer; border-radius:0.4rem; overflow:hidden; border:1px solid #d1d5db;">
                        <input type="text" class="form-control border-0" id="programaNombreDisplay" placeholder="Clic para buscar programa..." readonly style="cursor:pointer; background:#fff; font-size:0.82rem;" required>
                        <input type="hidden" id="idPrograma" required>
                        <button class="btn border-0 px-2" type="button" style="pointer-events:none; background:#fff;">
                          <i class="bi bi-search text-primary" style="font-size:0.8rem;"></i>
                        </button>
                      </div>
                      <div id="programa-info" class="mt-1" style="display:none;">
                        <div class="alert alert-info py-1 px-2 mb-0 d-flex align-items-center gap-1" style="font-size:0.75rem; border-radius:0.4rem;">
                          <i class="bi bi-info-circle-fill text-primary" style="font-size:0.9rem;"></i>
                          <span id="programa-info-text"></span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div class="compact-section shadow-sm mb-0">
                    <h6 class="section-title"><i class="bi bi-gear text-primary me-1"></i>2. Configuración</h6>
                    <div class="row g-2">
                      <div class="col-6">
                        <label for="jornada" class="form-label">Jornada</label>
                        <select class="form-select" id="jornada" required>
                          <option value="">Seleccionar...</option>
                          <option value="Diurna">🌅 Diurna</option>
                          <option value="Mixta">🌙 Mixta</option>
                        </select>
                      </div>
                      <div class="col-6">
                        <label for="modalidad" class="form-label">Modalidad</label>
                        <select class="form-select" id="modalidad" required>
                          <option value="">Seleccionar...</option>
                          <option value="Presencial">🏫 Presencial</option>
                          <option value="Virtual">💻 Virtual</option>
                        </select>
                      </div>
                      <div class="col-12">
                        <label for="estado" class="form-label">Estado</label>
                        <select class="form-select" id="estado" required>
                          <option value="Activo">🟢 Activo</option>
                          <option value="Inactivo">🔴 Inactivo</option>
                        </select>
                      </div>
                    </div>
                  </div>
                </div>

                <!-- Columna Derecha -->
                <div class="col-md-6 d-flex flex-column">
                  <div class="compact-section shadow-sm flex-grow-1 mb-2">
                    <h6 class="section-title"><i class="bi bi-calendar-range text-primary me-1"></i>3. Rango de Fechas</h6>
                    <div class="row g-2">
                      <div class="col-6">
                        <label for="fechaInicio" class="form-label">Fecha de Inicio</label>
                        <input type="date" class="form-control" id="fechaInicio" required>
                      </div>
                      <div class="col-6">
                        <label for="fechaFin" class="form-label">Fecha Fin (Auto)</label>
                        <input type="date" class="form-control" id="fechaFin" style="background:#e9ecef; pointer-events:none;" readonly>
                      </div>
                      <div class="col-12">
                        <div class="d-flex align-items-center gap-2 text-muted py-1 px-2 rounded" style="background:#fffbeb; border:1px solid #fde68a; font-size:0.75rem;">
                          <i class="bi bi-lightbulb-fill text-warning"></i>
                          <span>La fecha fin se calcula según la duración del programa.</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div class="d-flex justify-content-end gap-2 mt-auto">
                    <button type="button" class="btn btn-light border btn-sm px-3" data-bs-dismiss="modal">Cancelar</button>
                    <button type="submit" class="btn btn-primary btn-sm px-4 shadow-sm" id="ficha-modal-submit" style="background-color:var(--primary);">
                      <span class="btn-text d-flex align-items-center gap-2"><i class="bi bi-check-circle"></i> Guardar Ficha</span>
                      <span class="btn-spinner d-none spinner-border spinner-border-sm" role="status"></span>
                    </button>
                  </div>
                </div>
              </div>
            </div><!-- /VISTA 1 -->

            <!-- VISTA 2: SELECTOR DE PROGRAMAS -->
            <div class="view-slide" id="view-program-search">
                <div class="d-flex align-items-center gap-2 mb-3 pb-2 border-bottom">
                    <button type="button" class="btn btn-light btn-sm px-3 rounded-pill shadow-sm d-flex align-items-center gap-1" id="btn-back-to-form">
                        <i class="bi bi-arrow-left"></i> Volver
                    </button>
                    <h6 class="mb-0 fw-bold text-dark ms-1"><i class="bi bi-journals text-primary me-1"></i> Buscar Programa</h6>
                </div>
                <div class="mb-2">
                    <div class="input-group input-group-sm shadow-sm" style="border-radius:0.4rem; overflow:hidden; border:1px solid #d1d5db;">
                        <span class="input-group-text bg-white border-0"><i class="bi bi-search text-muted"></i></span>
                        <input type="text" class="form-control border-0" id="search-programa-input" placeholder="Buscar por nombre, código o tipo..." autocomplete="off">
                    </div>
                </div>
                <div class="table-responsive bg-white shadow-sm border" style="border-radius:0.4rem; max-height:380px; overflow-y:auto;">
                    <table class="table table-hover table-sm align-middle mb-0">
                        <thead class="table-light text-secondary sticky-top" style="z-index:10; font-size:0.78rem;">
                            <tr>
                                <th>CÓDIGO</th>
                                <th>PROGRAMA</th>
                                <th>TIPO</th>
                                <th class="text-end">ACCIÓN</th>
                            </tr>
                        </thead>
                        <tbody id="programas-list-body"></tbody>
                    </table>
                    <div id="programas-empty-state" class="text-center py-4 d-none text-muted" style="font-size:0.85rem;">
                        <i class="bi bi-clipboard-x fs-3 d-block mb-1 opacity-50"></i>
                        No se encontraron programas.
                    </div>
                </div>
            </div>
        `;

        document.getElementById('modal-container').innerHTML = ModalForm({
            id: 'ficha-modal',
            title: 'Ficha',
            formContent: formContent,
            hideFooter: true,
            size: 'modal-lg'
        });

        const formEl = document.getElementById('ficha-modal-form');

        // Listener único con delegación — se registra UNA sola vez sobre el form
        // Así no se acumulan listeners ni se pierde por cloneNode
        formEl.addEventListener('change', (e) => {
            if (e.target.id === 'idPrograma' || e.target.id === 'fechaInicio') {
                this._recalcularFechaFin();
            }
        });

        formEl.addEventListener('submit', this.handleFormSubmit.bind(this));

        this.bsModal = new bootstrap.Modal(document.getElementById('ficha-modal'));

        // =======================
        // Lógica Selección Programa
        // =======================
        document.getElementById('btn-select-programa').addEventListener('click', () => {
            this.renderProgramasList();
            document.getElementById('search-programa-input').value = '';
            
            // Cambiar de vista
            document.getElementById('view-ficha-form').classList.remove('active');
            document.getElementById('view-program-search').classList.add('active');
            
            setTimeout(() => document.getElementById('search-programa-input').focus(), 200);
        });

        document.getElementById('btn-back-to-form').addEventListener('click', () => {
            document.getElementById('view-program-search').classList.remove('active');
            document.getElementById('view-ficha-form').classList.add('active');
        });

        document.getElementById('search-programa-input').addEventListener('input', (e) => {
            this.renderProgramasList(e.target.value);
        });

        document.getElementById('programas-list-body').addEventListener('click', (e) => {
            const btn = e.target.closest('.btn-select-prog');
            if (btn) {
                const id = btn.dataset.id;
                const nombre = btn.dataset.nombre;
                const codigo = btn.dataset.codigo;
                
                // Set data
                document.getElementById('idPrograma').value = id;
                document.getElementById('programaNombreDisplay').value = codigo ? `${codigo} - ${nombre}` : nombre;
                
                // Recalculate dates
                this._recalcularFechaFin();
                document.getElementById('programaNombreDisplay').classList.remove('is-invalid');
                
                // Switch view back to main form
                document.getElementById('view-program-search').classList.remove('active');
                document.getElementById('view-ficha-form').classList.add('active');
            }
        });
    }

    renderProgramasList(query = '') {
        const tbody = document.getElementById('programas-list-body');
        const emptyState = document.getElementById('programas-empty-state');
        if (!tbody) return;

        const q = query.toLowerCase().trim();
        const filtered = this.programas.filter(p => {
            if (!q) return true;
            return (p.nombre && p.nombre.toLowerCase().includes(q)) || 
                   (p.codigo && p.codigo.toLowerCase().includes(q)) ||
                   (p.tipoFormacion && p.tipoFormacion.nombreTipoFormacion && p.tipoFormacion.nombreTipoFormacion.toLowerCase().includes(q)) ||
                   (p.tipo_formacion && p.tipo_formacion.nombreTipoFormacion && p.tipo_formacion.nombreTipoFormacion.toLowerCase().includes(q));
        });

        if (filtered.length === 0) {
            tbody.innerHTML = '';
            emptyState.classList.remove('d-none');
        } else {
            emptyState.classList.add('d-none');
            tbody.innerHTML = filtered.map(p => {
                const tipo = p.tipoFormacion?.nombreTipoFormacion || p.tipo_formacion?.nombreTipoFormacion || '<span class="text-muted">N/A</span>';
                return `
                    <tr>
                        <td class="fw-medium text-secondary">${p.codigo || 'N/A'}</td>
                        <td class="fw-bold text-dark" style="font-size: 0.9rem;">${p.nombre || 'Sin nombre'}</td>
                        <td style="font-size: 0.85rem;"><span class="badge bg-light text-dark border">${tipo}</span></td>
                        <td class="text-end">
                            <button type="button" class="btn btn-sm btn-primary btn-select-prog px-3 shadow-sm" style="border-radius: 0.4rem;"
                                data-id="${p.idPrograma}" 
                                data-nombre="${p.nombre ? p.nombre.replace(/"/g, '&quot;') : ''}" 
                                data-codigo="${p.codigo ? p.codigo.replace(/"/g, '&quot;') : ''}">
                                Seleccionar
                            </button>
                        </td>
                    </tr>
                `;
            }).join('');
        }
    }

    // Método dedicado al cálculo — fácil de llamar desde cualquier lugar
    _recalcularFechaFin() {
        const progSelect = document.getElementById('idPrograma');
        const startInput = document.getElementById('fechaInicio');
        const endInput   = document.getElementById('fechaFin');
        const infoBox    = document.getElementById('programa-info');
        const infoText   = document.getElementById('programa-info-text');

        if (!progSelect || !startInput || !endInput) return;

        const selectedProg = this.programas.find(p => String(p.idPrograma) === String(progSelect.value));

        if (selectedProg && infoBox && infoText) {
            const duracion = this.getProgramaDuracion(selectedProg);
            infoText.textContent = duracion > 0
                ? `Duración del programa: ${duracion} meses`
                : 'Este programa no tiene duración definida, ingresa la fecha manualmente.';
            infoBox.style.display = 'block';

            if (duracion === 0) {
                endInput.removeAttribute('readonly');
                endInput.style.backgroundColor = '';
                endInput.style.pointerEvents = 'auto';
            } else {
                endInput.setAttribute('readonly', 'true');
                endInput.style.backgroundColor = '#e9ecef';
                endInput.style.pointerEvents = 'none';
            }
        } else if (infoBox) {
            infoBox.style.display = 'none';
        }

        if (!selectedProg || !startInput.value) {
            endInput.value = '';
            return;
        }

        const duracion = this.getProgramaDuracion(selectedProg);
        if (duracion > 0) {
            // 'T00:00:00' evita desfase por zona horaria al parsear solo la fecha
            const startDate = new Date(startInput.value + 'T00:00:00');
            startDate.setMonth(startDate.getMonth() + duracion);
            endInput.value = startDate.toISOString().split('T')[0];
        }
    }

    injectDynamicModalFields(ficha = null) {
        document.getElementById('codigoFicha').value = ficha ? ficha.codigoFicha : '';
        document.getElementById('jornada').value     = ficha ? ficha.jornada    : '';
        document.getElementById('modalidad').value   = ficha ? ficha.modalidad  : '';
        document.getElementById('estado').value      = ficha ? (ficha.estado    || 'Activo') : 'Activo';
        document.getElementById('fechaInicio').value = ficha ? (ficha.fechaInicio || '') : '';
        document.getElementById('fechaFin').value    = ficha ? (ficha.fechaFin    || '') : '';
        
        const progValue = ficha ? (ficha.idPrograma || '') : '';
        document.getElementById('idPrograma').value = progValue;
        
        const progDisplay = document.getElementById('programaNombreDisplay');
        if (progDisplay) {
            if (progValue) {
                const p = this.programas.find(x => String(x.idPrograma) === String(progValue));
                if (p) {
                    progDisplay.value = `${p.codigo ? p.codigo + ' - ' : ''}${p.nombre}`;
                } else {
                    progDisplay.value = 'Programa seleccionado';
                }
            } else {
                progDisplay.value = '';
            }
        }

        // Ocultar info box
        const infoBox = document.getElementById('programa-info');
        if (infoBox) infoBox.style.display = 'none';

        // Resetear fechaFin a readonly por defecto
        const endInput = document.getElementById('fechaFin');
        endInput.setAttribute('readonly', 'true');
        endInput.style.backgroundColor = '#e9ecef';
        endInput.style.pointerEvents = 'none';

        // Si es edición con programa y fecha, recalcular para mostrar info
        if (ficha && ficha.idPrograma && ficha.fechaInicio) {
            setTimeout(() => this._recalcularFechaFin(), 0);
        }

        const formEl = document.getElementById('ficha-modal-form');
        formEl.querySelectorAll('.is-invalid').forEach(el => el.classList.remove('is-invalid'));
        document.getElementById('ficha-modal-title').textContent = ficha ? 'Editar Ficha' : 'Nueva Ficha';

        // Actualizar texto del botón submit según el modo
        const submitBtn = document.getElementById('ficha-modal-submit');
        if (submitBtn) {
            const btnText = submitBtn.querySelector('.btn-text');
            if (btnText) {
                btnText.innerHTML = ficha
                    ? '<i class="bi bi-check-circle"></i> Guardar Cambios'
                    : '<i class="bi bi-check-circle"></i> Crear Ficha';
            }
        }

        // Formulario reseteado visualmente
        // Asegurar que siempre se abra en la vista principal
        const formElView = document.getElementById('ficha-modal-form');
        if (formElView) {
            formElView.querySelectorAll('.view-slide').forEach(s => s.classList.remove('active'));
            const mainView = document.getElementById('view-ficha-form');
            if (mainView) mainView.classList.add('active');
        }
    }

    openModal(id = null) {
        this.currentEditId = id;
        document.getElementById('ficha-modal-alert').innerHTML = '';

        const ficha = id ? this.fichas.find(f => String(f.idFicha) === String(id)) : null;

        this.injectDynamicModalFields(ficha);
        this.bsModal.show();
    }

    async handleFormSubmit(e) {
        e.preventDefault();
        const form = e.target;
        if (!form.checkValidity()) {
            form.reportValidity();
            return;
        }

        const data = {
            codigoFicha : document.getElementById('codigoFicha').value,
            idPrograma  : parseInt(document.getElementById('idPrograma').value),
            jornada     : document.getElementById('jornada').value,
            modalidad   : document.getElementById('modalidad').value,
            fechaInicio : document.getElementById('fechaInicio').value,
            fechaFin    : document.getElementById('fechaFin').value,
            estado      : document.getElementById('estado').value,
        };

        setModalLoading('ficha-modal', true);
        document.getElementById('ficha-modal-alert').innerHTML = '';

        try {
            if (this.currentEditId) {
                await updateFicha(this.currentEditId, data);
            } else {
                await createFicha(data);
            }

            this.bsModal.hide();
            const actionText = this.currentEditId ? 'actualizada' : 'creada';
            this.showAlert('page-alert-container', 'success', 'Ficha ' + actionText + ' correctamente.');
            await this.loadData();

        } catch (error) {
            document.getElementById('ficha-modal-alert').innerHTML = AlertMessage({
                id: 'modal-error',
                type: 'danger',
                message: error.message
            });
        } finally {
            setModalLoading('ficha-modal', false);
        }
    }

    async handleDelete(id) {
        const ficha = this.fichas.find(f => String(f.idFicha) === String(id));
        if (!ficha) return;

        const confirm = await ConfirmDialog({
            title: '¿Eliminar Ficha?',
            message: `Vas a eliminar permanentemente la ficha <strong>${ficha.codigoFicha}</strong>. Esta acción no se puede deshacer.`,
            confirmText: 'Sí, eliminar',
            cancelText: 'Cancelar'
        });

        if (confirm) {
            try {
                this.fichas = this.fichas.filter(f => String(f.idFicha) !== String(id));
                this.renderTable();
                await deleteFicha(id);
                this.showAlert('page-alert-container', 'success', 'Ficha eliminada del sistema.');
            } catch (error) {
                this.showAlert('page-alert-container', 'danger', 'Error al eliminar: ' + error.message);
                await this.loadData();
            }
        }
    }

    showAlert(containerId, type, message) {
        const container = document.getElementById(containerId);
        if (container) {
            const alertId = 'alert-' + Date.now();
            container.innerHTML = AlertMessage({ id: alertId, type, message });
            if (type === 'success') {
                setTimeout(() => { container.innerHTML = ''; }, 5000);
            }
        }
    }
}

document.addEventListener('DOMContentLoaded', () => {
    new FichasPage();
});