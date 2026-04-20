import { ProtectedRoute } from '../components/ProtectedRoute.js';
import { Navbar, initNavbarEvents } from '../components/Navbar.js';
import { Sidebar, initSidebarEvents } from '../components/Sidebar.js';
import { DataTable, initTablePagination } from '../components/DataTable.js';
import { ModalForm, setModalLoading } from '../components/ModalForm.js';
import { FormInput } from '../components/FormInput.js';
import { ConfirmDialog } from '../components/ConfirmDialog.js';
import { AlertMessage } from '../components/AlertMessage.js';
import { getFichas, createFicha, updateFicha, deleteFicha, getProgramas, getSedes,
         exportarFichas, exportarAprendicesDeFicha, importarAprendices,
         getHorariosPorFicha, enviarHorarioAprendiz } from '../utils/api.js?v=4';

function showDateRangeModal(titulo = 'Seleccionar período', subtitulo = '') {
    return new Promise((resolve) => {
        const modalId = `date-range-modal-${Date.now()}`;

        const hoy = new Date();
        const primerDia = new Date(hoy.getFullYear(), hoy.getMonth(), 1)
            .toISOString().split('T')[0];
        const ultimoDia = new Date(hoy.getFullYear(), hoy.getMonth() + 1, 0)
            .toISOString().split('T')[0];

        const html = `
            <div class="modal fade" id="${modalId}" tabindex="-1"
                 aria-hidden="true" data-bs-backdrop="static">
                <div class="modal-dialog modal-dialog-centered" style="max-width: 420px;">
                    <div class="modal-content border-0 shadow-lg rounded-4 overflow-hidden">

                        <div class="modal-header border-0 py-3 px-4"
                             style="background: var(--primary-gradient);">
                            <div>
                                <h5 class="modal-title fw-bold text-white mb-0">
                                    <i class="bi bi-calendar-range me-2"></i>${titulo}
                                </h5>
                                ${subtitulo ? `<small class="text-white opacity-75">${subtitulo}</small>` : ''}
                            </div>
                            <button type="button"
                                    class="btn-close btn-close-white"
                                    id="${modalId}-cancel-x"></button>
                        </div>

                        <div class="modal-body px-4 py-4 bg-white">
                            <div class="mb-3">
                                <label class="form-label fw-semibold small">Fecha inicio</label>
                                <input type="date" id="${modalId}-inicio"
                                       class="form-control" value="${primerDia}">
                            </div>
                            <div>
                                <label class="form-label fw-semibold small">Fecha fin</label>
                                <input type="date" id="${modalId}-fin"
                                       class="form-control" value="${ultimoDia}">
                            </div>
                            <div id="${modalId}-error"
                                 class="mt-2 text-danger small d-none"></div>
                        </div>

                        <div class="modal-footer border-0 bg-light px-4 py-3">
                            <button class="btn btn-light" id="${modalId}-cancel">Cancelar</button>
                            <button class="btn btn-primary" id="${modalId}-confirm">
                                Enviar correo
                            </button>
                        </div>
                    </div>
                </div>
            </div>`;

        document.body.insertAdjacentHTML('beforeend', html);
        const modalEl = document.getElementById(modalId);
        const bsModal = new bootstrap.Modal(modalEl);

        document.getElementById(`${modalId}-confirm`).addEventListener('click', () => {
            const inicio = document.getElementById(`${modalId}-inicio`).value;
            const fin = document.getElementById(`${modalId}-fin`).value;
            const errorEl = document.getElementById(`${modalId}-error`);

            if (!inicio || !fin) {
                errorEl.textContent = 'Ambas fechas son obligatorias';
                errorEl.classList.remove('d-none');
                return;
            }

            if (fin < inicio) {
                errorEl.textContent = 'La fecha fin no puede ser menor';
                errorEl.classList.remove('d-none');
                return;
            }

            bsModal.hide();
            resolve({ fechaInicio: inicio, fechaFin: fin });
        });

        const cancelar = () => {
            bsModal.hide();
            resolve(null);
        };

        document.getElementById(`${modalId}-cancel`).onclick = cancelar;
        document.getElementById(`${modalId}-cancel-x`).onclick = cancelar;

        modalEl.addEventListener('hidden.bs.modal', () => modalEl.remove());

        bsModal.show();
    });
}

class FichasPage {
    constructor() {
        new ProtectedRoute();
        this.appContainer = document.getElementById('app');
        this.fichas = [];
        this.programas = [];
        this.sedes = [];
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
                            <select id="filter-sede" class="form-select form-select-sm" style="max-width: 200px; border-color: var(--border-color); border-radius: 0.4rem;">
                                <option value="">Todas las Sedes</option>
                            </select>
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
                             style="background:linear-gradient(135deg,var(--primary) 0%,var(--primary-dark) 100%);">
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

            <!-- Modal: Horario de la Ficha -->
            <div class="modal fade" id="modalHorarioFicha" tabindex="-1" aria-hidden="true">
                <div class="modal-dialog modal-xl modal-dialog-centered modal-dialog-scrollable">
                    <div class="modal-content border-0 shadow-lg" style="border-radius:1rem; overflow:hidden;">
                        <!-- Header -->
                        <div class="modal-header text-white border-0 px-4 py-3"
                             style="background:linear-gradient(135deg,var(--primary) 0%,var(--primary-dark) 100%);">
                            <h5 class="modal-title fw-bold d-flex align-items-center gap-2" id="modal-horario-ficha-title">
                                <i class="bi bi-calendar-week"></i> Horario de la Ficha
                            </h5>
                            <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal"></button>
                        </div>
                        <!-- Body -->
                        <div class="modal-body p-4" style="background:var(--bg-page); min-height:500px;">
                            <div id="modal-horario-ficha-body">
                                <div class="text-center py-5 text-muted">
                                    <div class="spinner-border text-primary mb-3" role="status"></div>
                                    <p class="small">Cargando horario...</p>
                                </div>
                            </div>
                        </div>
                        <!-- Footer -->
                        <div class="modal-footer border-0 px-4 py-3" style="background: var(--bg-page); justify-content: center; border-top: 1px solid var(--border-color) !important;">
                            <button type="button" class="btn btn-primary d-flex align-items-center gap-2 px-4 py-2 shadow-sm" id="btn-enviar-horario-ficha" style="border-radius: 0.5rem; font-weight: 500; background-color: var(--primary); border: none;">
                                <i class="bi bi-envelope-paper"></i>
                                <span>Enviar horario a Aprendices</span>
                            </button>
                        </div>
                    </div>
                </div>
            </div>

        `;

        document.getElementById('btn-add-ficha').addEventListener('click', () => this.openModal());
        
        const btnEnviarHorario = document.getElementById('btn-enviar-horario-ficha');
        if (btnEnviarHorario) {
            btnEnviarHorario.addEventListener('click', async (e) => {
                const btn = e.currentTarget;
                const idFicha = btn.dataset.id;
                if (!idFicha) return;
                this.enviarHorarioPorCorreoFicha(idFicha, btn);
            });
        }

        const searchInput = document.getElementById('search-input');
        if (searchInput) {
            searchInput.addEventListener('input', () => this.applyFilters());
        }

        const filterSede = document.getElementById('filter-sede');
        if (filterSede) {
            filterSede.addEventListener('change', () => this.applyFilters());
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
            const [progData, sedesData] = await Promise.all([
                getProgramas(),
                getSedes()
            ]);
            this.programas = progData.data || (Array.isArray(progData)  ? progData  : []);
            this.sedes     = sedesData.data || (Array.isArray(sedesData) ? sedesData : []);

            const filterSede = document.getElementById('filter-sede');
            if (filterSede) {
                this.sedes.forEach(s => {
                    const option = document.createElement('option');
                    option.value = s.idSede;
                    option.textContent = s.nombre + (s.municipio ? ` - ${s.municipio.nombreMunicipio}` : '');
                    filterSede.appendChild(option);
                });
            }
        } catch (error) {
            console.error('Error al cargar dependencias:', error);
            this.showAlert('page-alert-container', 'warning', 'No se pudieron cargar los datos de soporte.');
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

    applyFilters() {
        const query = document.getElementById('search-input')?.value.toLowerCase().trim() || '';
        const idSedeFiltro = document.getElementById('filter-sede')?.value || '';

        const filtered = this.fichas.filter(f => {
            let matchSearch = true;
            if (query) {
                matchSearch = (f.codigoFicha && f.codigoFicha.toLowerCase().includes(query)) ||
                              (f.jornada && f.jornada.toLowerCase().includes(query)) ||
                              (f.modalidad && f.modalidad.toLowerCase().includes(query)) ||
                              (f.programa && f.programa.nombre && f.programa.nombre.toLowerCase().includes(query)) ||
                              (f.programa && f.programa.codigo && f.programa.codigo.toLowerCase().includes(query));
            }

            let matchSede = true;
            if (idSedeFiltro) {
                matchSede = String(f.idSede) === String(idSedeFiltro) || (f.sede && String(f.sede.idSede) === String(idSedeFiltro));
            }

            return matchSearch && matchSede;
        });

        this.renderTable(filtered);
    }

    filterTable(query) {
        this.applyFilters();
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
    { key: 'jornada',   label: 'Jornada',   icon: 'clock'  },
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
                        <button class="btn-action btn-aprendices" data-id="${row.idFicha}" data-codigo="${row.codigoFicha || ''}" title="Aprendices de la Ficha" style="color:var(--primary);">
                            <i class="bi bi-people"></i>
                        </button>
                        <button class="btn-action edit btn-edit" data-id="${row.idFicha}" title="Editar">
                            <i class="bi bi-pencil-square"></i>
                        </button>
                        <button class="btn-action delete btn-delete" data-id="${row.idFicha}" title="Eliminar">
                            <i class="bi bi-trash"></i>
                        </button>
                        <button class="btn-action btn-ver-horario-ficha" data-id="${row.idFicha}" data-codigo="${row.codigoFicha || ''}" title="Ver Horario" style="color:var(--primary);">
                            <i class="bi bi-calendar-week"></i>
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

        initTablePagination('fichas-table', displayData, columns, '#table-container');

        document.querySelectorAll('.btn-edit').forEach(btn => {
            btn.addEventListener('click', (e) => this.openModal(e.currentTarget.dataset.id));
        });

        document.querySelectorAll('.btn-delete').forEach(btn => {
            btn.addEventListener('click', (e) => this.handleDelete(e.currentTarget.dataset.id));
        });

        document.querySelectorAll('.btn-aprendices').forEach(btn => {
            btn.addEventListener('click', (e) => this.abrirModalAprendices(e.currentTarget.dataset.id, e.currentTarget.dataset.codigo));
        });

        document.querySelectorAll('.btn-ver-horario-ficha').forEach(btn => {
            btn.addEventListener('click', (e) => this.verHorarioFicha(e.currentTarget.dataset.id, e.currentTarget.dataset.codigo));
        });
    }

    bindToolbarButtons() {}

    abrirModalAprendices(idFicha, codigoFicha) {
        this.currentFichaIdAprendices = idFicha;
        document.getElementById('modal-aprendices-title').innerHTML = `<i class="bi bi-people"></i> Aprendices - Ficha ${codigoFicha}`;
        document.getElementById('alert-aprendices-container').innerHTML = '';

        const modalEl = document.getElementById('modalAprendicesFicha');
        bootstrap.Modal.getOrCreateInstance(modalEl).show();
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
                      <div class="col-6">
                        <label for="estado" class="form-label">Estado</label>
                        <select class="form-select" id="estado" required>
                          <option value="Activo">🟢 Activo</option>
                          <option value="Inactivo">🔴 Inactivo</option>
                        </select>
                      </div>
                      <div class="col-6">
                        <label for="idSede" class="form-label">Sede</label>
                        <div id="btn-select-sede"
                             style="border-radius:0.4rem; overflow:hidden; border:1px solid #d1d5db; background:#fff;">
                          <input type="text" class="form-control border-0" id="sedeNombreDisplay"
                                 placeholder="Clic para buscar sede" readonly
                                 style="cursor:pointer; background:#fff; font-size:0.82rem;" required>
                          <input type="hidden" id="idSede" required>
                          <button class="btn border-0 px-2" type="button" style="pointer-events:none; background:#fff;">
                          </button>
                        </div>
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
            <!-- /VISTA 2 -->

            <!-- VISTA 3: SELECTOR DE SEDES -->
            <div class="view-slide" id="view-sede-search">
                <div class="d-flex align-items-center gap-2 mb-3 pb-2 border-bottom">
                    <button type="button" class="btn btn-light btn-sm px-3 rounded-pill shadow-sm d-flex align-items-center gap-1" id="btn-back-from-sede">
                        <i class="bi bi-arrow-left"></i> Volver
                    </button>
                    <h6 class="mb-0 fw-bold text-dark ms-1"><i class="bi bi-building text-primary me-1"></i> Buscar Sede</h6>
                </div>
                <div class="mb-2">
                    <div class="input-group input-group-sm shadow-sm" style="border-radius:0.4rem; overflow:hidden; border:1px solid #d1d5db;">
                        <span class="input-group-text bg-white border-0"><i class="bi bi-search text-muted"></i></span>
                        <input type="text" class="form-control border-0" id="search-sede-input" placeholder="Buscar sede..." autocomplete="off">
                    </div>
                </div>
                <div class="table-responsive bg-white shadow-sm border" style="border-radius:0.4rem; max-height:380px; overflow-y:auto;">
                    <table class="table table-hover table-sm align-middle mb-0">
                        <thead class="table-light text-secondary sticky-top" style="z-index:10; font-size:0.78rem;">
                            <tr>
                                <th>SEDE</th>
                                <th>MUNICIPIO</th>
                                <th class="text-end">ACCIÓN</th>
                            </tr>
                        </thead>
                        <tbody id="sedes-list-body"></tbody>
                    </table>
                    <div id="sedes-empty-state" class="text-center py-4 d-none text-muted" style="font-size:0.85rem;">
                        <i class="bi bi-building fs-3 d-block mb-1 opacity-50"></i>
                        No se encontraron sedes.
                    </div>
                </div>
            </div>
            <!-- /VISTA 3 -->
        `;

        document.getElementById('modal-container').innerHTML = ModalForm({
            id: 'ficha-modal',
            title: 'Ficha',
            formContent: formContent,
            hideFooter: true,
            size: 'modal-lg'
        });

        const formEl = document.getElementById('ficha-modal-form');

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
                document.getElementById('idPrograma').value = id;
                document.getElementById('programaNombreDisplay').value = codigo ? `${codigo} - ${nombre}` : nombre;
                this._recalcularFechaFin();
                document.getElementById('programaNombreDisplay').classList.remove('is-invalid');
                document.getElementById('view-program-search').classList.remove('active');
                document.getElementById('view-ficha-form').classList.add('active');
            }
        });

        // =======================
        // Lógica Selección Sede
        // =======================
        document.getElementById('btn-select-sede').addEventListener('click', () => {
            this.renderSedesList();
            document.getElementById('search-sede-input').value = '';
            document.getElementById('view-ficha-form').classList.remove('active');
            document.getElementById('view-sede-search').classList.add('active');
            setTimeout(() => document.getElementById('search-sede-input').focus(), 200);
        });

        document.getElementById('btn-back-from-sede').addEventListener('click', () => {
            document.getElementById('view-sede-search').classList.remove('active');
            document.getElementById('view-ficha-form').classList.add('active');
        });

        document.getElementById('search-sede-input').addEventListener('input', (e) => {
            this.renderSedesList(e.target.value);
        });

        document.getElementById('sedes-list-body').addEventListener('click', (e) => {
            const btn = e.target.closest('.btn-select-sede-item');
            if (btn) {
                document.getElementById('idSede').value = btn.dataset.id;
                document.getElementById('sedeNombreDisplay').value = btn.dataset.nombre;
                document.getElementById('sedeNombreDisplay').classList.remove('is-invalid');
                document.getElementById('view-sede-search').classList.remove('active');
                document.getElementById('view-ficha-form').classList.add('active');
            }
        });
    }

    renderSedesList(query = '') {
        const tbody      = document.getElementById('sedes-list-body');
        const emptyState = document.getElementById('sedes-empty-state');
        if (!tbody) return;
        const q = query.toLowerCase().trim();
        const filtered = this.sedes.filter(s =>
            !q || (s.nombre && s.nombre.toLowerCase().includes(q)) ||
            (s.municipio?.nombreMunicipio && s.municipio.nombreMunicipio.toLowerCase().includes(q))
        );
        if (filtered.length === 0) {
            tbody.innerHTML = '';
            emptyState.classList.remove('d-none');
        } else {
            emptyState.classList.add('d-none');
            tbody.innerHTML = filtered.map(s => `
                <tr>
                    <td class="fw-medium text-dark">${s.nombre}</td>
                    <td class="text-muted">${s.municipio?.nombreMunicipio || '—'}</td>
                    <td class="text-end">
                        <button type="button" class="btn btn-sm btn-primary btn-select-sede-item px-3 shadow-sm"
                            style="border-radius:0.4rem;"
                            data-id="${s.idSede}"
                            data-nombre="${(s.nombre + (s.municipio ? ' — ' + s.municipio.nombreMunicipio : '')).replace(/"/g, '&quot;')}">
                            Seleccionar
                        </button>
                    </td>
                </tr>
            `).join('');
        }
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
        document.getElementById('fechaInicio').value   = ficha ? (ficha.fechaInicio || '') : '';
        document.getElementById('fechaFin').value      = ficha ? (ficha.fechaFin    || '') : '';

        // Sede
        const sedeValue = ficha ? (ficha.idSede || '') : '';
        document.getElementById('idSede').value = sedeValue;
        const sedeDisplay = document.getElementById('sedeNombreDisplay');
        if (sedeDisplay) {
            if (sedeValue) {
                const s = this.sedes.find(x => String(x.idSede) === String(sedeValue));
                sedeDisplay.value = s
                    ? s.nombre + (s.municipio ? ' — ' + s.municipio.nombreMunicipio : '')
                    : 'Sede seleccionada';
            } else {
                sedeDisplay.value = '';
            }
        }

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

        const infoBox = document.getElementById('programa-info');
        if (infoBox) infoBox.style.display = 'none';

        const endInput = document.getElementById('fechaFin');
        endInput.setAttribute('readonly', 'true');
        endInput.style.backgroundColor = '#e9ecef';
        endInput.style.pointerEvents = 'none';

        if (ficha && ficha.idPrograma && ficha.fechaInicio) {
            setTimeout(() => this._recalcularFechaFin(), 0);
        }

        const formEl = document.getElementById('ficha-modal-form');
        formEl.querySelectorAll('.is-invalid').forEach(el => el.classList.remove('is-invalid'));
        document.getElementById('ficha-modal-title').textContent = ficha ? 'Editar Ficha' : 'Nueva Ficha';

        const submitBtn = document.getElementById('ficha-modal-submit');
        if (submitBtn) {
            const btnText = submitBtn.querySelector('.btn-text');
            if (btnText) {
                btnText.innerHTML = ficha
                    ? '<i class="bi bi-check-circle"></i> Guardar Cambios'
                    : '<i class="bi bi-check-circle"></i> Crear Ficha';
            }
        }

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
        idSede      : parseInt(document.getElementById('idSede').value),
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

        console.log(error.response);

        let mensaje = 'Error al guardar la ficha - Asegurate que el codigo de la ficha no este duplicado';

        if (error.response && error.response.data) {
            const data = error.response.data;

            if (data.errors && data.errors.codigoFicha) {
                mensaje = data.errors.codigoFicha[0];
            } else if (data.message) {
                mensaje = data.message;
            }
        }

        document.getElementById('ficha-modal-alert').innerHTML = AlertMessage({
            id: 'modal-error',
            type: 'danger',
            message: mensaje
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

    // ── Ver Horario de la Ficha ─────────────────────────────────────────
    async verHorarioFicha(idFicha, codigoFicha) {
        document.getElementById('modal-horario-ficha-title').innerHTML =
            `<i class="bi bi-calendar-week"></i> Horario Ficha ${codigoFicha || ''}`;

        const btnEnviar = document.getElementById('btn-enviar-horario-ficha');
        btnEnviar.dataset.id = idFicha;
        btnEnviar.innerHTML = '<i class="bi bi-envelope-paper"></i><span>Enviar horario a Aprendices</span>';
        btnEnviar.disabled = false;

        const modalEl = document.getElementById('modalHorarioFicha');
        bootstrap.Modal.getOrCreateInstance(modalEl).show();

        const body = document.getElementById('modal-horario-ficha-body');
        body.innerHTML = `
            <div class="text-center py-5 text-muted">
                <div class="spinner-border text-primary mb-3" role="status"></div>
                <p class="small">Cargando horario de la ficha <strong>${codigoFicha}</strong>...</p>
            </div>`;

        try {
            const response = await getHorariosPorFicha(idFicha);
            const asignaciones = response.data?.asignaciones || response.asignaciones || [];
            this.renderCalendarioFicha(body, asignaciones, codigoFicha);
        } catch (err) {
            body.innerHTML = `
                <div class="text-center py-5 text-danger">
                    <i class="bi bi-exclamation-triangle fs-1 d-block mb-3 opacity-50"></i>
                    <p>${err.message || 'Error al cargar el horario.'}</p>
                </div>`;
        }
    }

    async enviarHorarioPorCorreoFicha(idFicha, btnElement) {

    const rango = await showDateRangeModal(
        'Enviar horario a aprendices',
        'Selecciona el período de bloques'
    );

    if (!rango) return;

    const originalHtml = btnElement.innerHTML;
    btnElement.innerHTML = `
        <span class="spinner-border spinner-border-sm"></span> Enviando...`;
    btnElement.disabled = true;

    try {
        const res = await enviarHorarioAprendiz(
            idFicha,
            rango.fechaInicio,
            rango.fechaFin
        );

        let nInfo = res.data?.total || res.total || 0;

        Swal.fire({
            title: '¡Éxito!',
            text: `Horario enviado correctamente a ${nInfo} aprendices.`,
            icon: 'success',
            confirmButtonColor: '#4caa16'
        });

    } catch (error) {
        console.error(error);

        Swal.fire({
            title: 'Error',
            text: 'Error al enviar horario: ' + (error.message || 'Desconocido'),
            icon: 'error',
            confirmButtonColor: '#4caa16'
        });

    } finally {
        btnElement.innerHTML = originalHtml;
        btnElement.disabled = false;
    }
}

    renderCalendarioFicha(container, clases, codigoFicha) {
        if (!clases.length) {
            container.innerHTML = `
                <div class="text-center py-5 text-muted">
                    <i class="bi bi-calendar-x fs-1 d-block mb-3 opacity-25"></i>
                    <p class="fw-medium">Sin clases asignadas</p>
                    <p class="small">Esta ficha no tiene horario registrado.</p>
                </div>`;
            return;
        }

        const MESES_ES = ['Enero','Febrero','Marzo','Abril','Mayo','Junio',
            'Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];

        const dayMap = {
            'Lunes':     '2024-01-01', 'Martes':    '2024-01-02', 'Miercoles': '2024-01-03',
            'Jueves':    '2024-01-04', 'Viernes':   '2024-01-05', 'Sabado':    '2024-01-06',
            'Domingo':   '2024-01-07'
        };

        const DIA_JS = {
            'Domingo':0, 'Lunes':1, 'Martes':2, 'Miercoles':3,
            'Jueves':4, 'Viernes':5, 'Sabado':6
        };

        const buildEventsSemana = () => {
            const events = [];
            clases.forEach(asig => {
                const bloque = asig.bloque;
                if (!bloque) return;
                const instructor = asig.funcionario;
                const isVirtual  = asig.modalidad === 'virtual';
                const color      = isVirtual ? '#0dcaf0' : '#4caa16';
                const bloqueFormacion = bloque.tipoFormacion || '';
                const isTransversal = bloqueFormacion.toLowerCase() === 'transversal';
                const ambienteLabel = asig.ambiente
                    ? `${asig.ambiente.codigo}`
                    : 'Virtual';
                const instLabel  = instructor ? instructor.nombre : 'Sin Instructor';
                const horaIni = bloque.horaInicio ?? bloque.hora_inicio;
                const horaFin = bloque.horaFin ?? bloque.hora_fin;
                if (!horaIni || !horaFin) return;

                (bloque.dias || []).forEach(dia => {
                    const nombreDia = dia.nombre ?? dia.nombreDia;
                    const dateStr = dayMap[nombreDia];
                    if (!dateStr) return;
                    events.push({
                        id:              `${asig.idAsignacion}_${dia.idDia}`,
                        start:           `${dateStr}T${horaIni}`,
                        end:             `${dateStr}T${horaFin}`,
                        backgroundColor: isTransversal ? '#ffffff' : (isVirtual ? 'rgba(13,202,240,0.1)' : 'rgba(76,170,22,0.1)'),
                        borderColor:     color,
                        textColor:       color,
                        classNames:      isTransversal ? ['event-transversal'] : ['event-titulada'],
                        extendedProps:   { ambienteLabel, instLabel, modalidad: asig.modalidad, isTransversal }
                    });
                });
            });
            return events;
        };

        const buildEventosMensual = () => {
            const events = [];
            clases.forEach(asig => {
                const bloque = asig.bloque;
                if (!bloque) return;
                const fechaInicio = bloque.fechaInicio ?? bloque.fecha_inicio;
                const fechaFin    = bloque.fechaFin    ?? bloque.fecha_fin;
                const horaIni     = bloque.horaInicio  ?? bloque.hora_inicio;
                const horaFin     = bloque.horaFin     ?? bloque.hora_fin;
                if (!fechaInicio || !fechaFin || !horaIni || !horaFin) return;

                const instructor    = asig.funcionario;
                const isVirtual     = asig.modalidad === 'virtual';
                const color         = isVirtual ? '#0dcaf0' : '#4caa16';
                const bgColor       = isVirtual ? 'rgba(13,202,240,0.13)' : 'rgba(76,170,22,0.13)';
                const bloqueFormacion = bloque.tipoFormacion || '';
                const isTransversal = bloqueFormacion.toLowerCase() === 'transversal';
                const ambienteLabel = asig.ambiente
                    ? `${asig.ambiente.codigo} `
                    : 'Virtual';
                const instLabel = instructor ? instructor.nombre : 'Sin Instructor';

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
                        backgroundColor: isTransversal ? '#ffffff' : bgColor,
                        borderColor: color,
                        textColor: color,
                        classNames: isTransversal ? ['event-transversal'] : ['event-titulada'],
                        extendedProps: { ambienteLabel, instLabel, modalidad: asig.modalidad, isTransversal }
                    });
                }
            });
            return events;
        };

        let fechaMin = null, fechaMax = null;
        clases.forEach(asig => {
            const bloque = asig.bloque;
            if (!bloque) return;
            const fi = bloque.fechaInicio ?? bloque.fecha_inicio;
            const ff = bloque.fechaFin ?? bloque.fecha_fin;
            if (fi && (!fechaMin || fi < fechaMin)) fechaMin = fi;
            if (ff && (!fechaMax || ff > fechaMax)) fechaMax = ff;
        });

        let vistaActual = 'semanal';

        container.innerHTML = `
            <div class="d-flex flex-wrap align-items-center justify-content-between gap-2 mb-3">
                <div class="d-flex align-items-center gap-2">
                    <div class="btn-group btn-group-sm" role="group" id="ficha-btn-group-vista">
                        <button type="button" id="ficha-btn-semanal" class="btn btn-primary" title="Vista semanal">
                            <i class="bi bi-calendar-week me-1"></i>Semanal
                        </button>
                        <button type="button" id="ficha-btn-mensual" class="btn btn-outline-primary" title="Vista mensual">
                            <i class="bi bi-calendar-month me-1"></i>Mensual
                        </button>
                        <button type="button" id="ficha-btn-diario" class="btn btn-outline-primary" title="Vista diaria">
                            <i class="bi bi-calendar-day me-1"></i>Día
                        </button>
                    </div>
                </div>
                <div class="d-flex align-items-center gap-1" id="ficha-controles-mes" style="display:none!important;">
                    <button class="btn btn-sm btn-outline-secondary" id="ficha-btn-prev" title="Anterior">
                        <i class="bi bi-chevron-left"></i>
                    </button>
                    <span class="fw-semibold px-2 small" id="ficha-lbl-periodo" style="min-width:140px;text-align:center;">—</span>
                    <button class="btn btn-sm btn-outline-secondary" id="ficha-btn-next" title="Siguiente">
                        <i class="bi bi-chevron-right"></i>
                    </button>
                    <button class="btn btn-sm btn-outline-secondary ms-1" id="ficha-btn-today">Hoy</button>
                </div>
                ${fechaMin && fechaMax
                    ? `<span class="badge bg-light text-muted border" style="font-size:0.72rem;">
                           <i class="bi bi-calendar-range me-1"></i>${fechaMin} → ${fechaMax}
                       </span>`
                    : ''}
            </div>
            <div id="cal-ficha" style="height:560px;"></div>`;

        const calEl = document.getElementById('cal-ficha');
        const eventsSemana = buildEventsSemana();

        const calendar = new FullCalendar.Calendar(calEl, {
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
            height:          560,
            events:          eventsSemana,
            datesSet:        (info) => {
                const lbl = document.getElementById('ficha-lbl-periodo');
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
                            <div class="fw-bold lh-sm text-truncate" style="font-size:0.72rem;"><i class="bi bi-person me-1"></i>${p.instLabel}</div>
                            <div class="text-truncate" style="font-size:0.65rem;opacity:0.8;">
                                <i class="bi ${icon}"></i> ${p.ambienteLabel}
                            </div>
                        </div>`
                    };
                }

                return {
                    html: `<div class="p-1 h-100 d-flex flex-column" style="overflow:hidden; box-shadow: ${p.isTransversal ? '-4px 0 8px rgba(0,0,0,0.06)' : 'none'};">
                        <div class="fw-bold mb-1 lh-sm" style="font-size:0.75rem;"><i class="bi bi-person me-1"></i>${p.instLabel}</div>
                        <div class="text-truncate" style="font-size:0.7rem;opacity:0.85;">
                            <i class="bi ${icon} me-1"></i> ${p.ambienteLabel}
                        </div>
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
            }
        });
        calendar.render();
        setTimeout(() => calendar.updateSize(), 250);

        const btnSem = document.getElementById('ficha-btn-semanal');
        const btnMen = document.getElementById('ficha-btn-mensual');
        const btnDia = document.getElementById('ficha-btn-diario');
        const controlesMes = document.getElementById('ficha-controles-mes');

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
            controlesMes.style.display = 'none';
            calendar.removeAllEvents();
            calendar.changeView('timeGridWeek', '2024-01-01');
            buildEventsSemana().forEach(ev => calendar.addEvent(ev));
        });

        btnMen.addEventListener('click', () => {
            vistaActual = 'mensual';
            activarBtn(btnMen);
            controlesMes.style.removeProperty('display');
            calendar.removeAllEvents();
            const hoy = new Date().toISOString().split('T')[0];
            const goDate = fechaMin && fechaMin > hoy ? fechaMin : hoy;
            calendar.changeView('dayGridMonth');
            calendar.gotoDate(goDate);
            buildEventosMensual().forEach(ev => calendar.addEvent(ev));
        });

        btnDia.addEventListener('click', () => {
            vistaActual = 'diario';
            activarBtn(btnDia);
            controlesMes.style.removeProperty('display');
            if (calendar.view.type === 'timeGridWeek') {
                const hoy = new Date().toISOString().split('T')[0];
                const goDate = fechaMin && fechaMin > hoy ? fechaMin : hoy;
                calendar.removeAllEvents();
                calendar.changeView('timeGridDay');
                calendar.gotoDate(goDate);
                buildEventosMensual().forEach(ev => calendar.addEvent(ev));
            } else {
                calendar.changeView('timeGridDay');
            }
        });

        document.getElementById('ficha-btn-prev')?.addEventListener('click', () => calendar.prev());
        document.getElementById('ficha-btn-next')?.addEventListener('click', () => calendar.next());
        document.getElementById('ficha-btn-today')?.addEventListener('click', () => calendar.today());

        if (!document.getElementById('calendar-overlap-styles-fichas')) {
            const fcStyle = document.createElement('style');
            fcStyle.id = 'calendar-overlap-styles-fichas';
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
    }
}

document.addEventListener('DOMContentLoaded', () => {
    new FichasPage();
});
