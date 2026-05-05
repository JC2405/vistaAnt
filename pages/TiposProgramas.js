import { ProtectedRoute } from '../components/ProtectedRoute.js';
import { Navbar, initNavbarEvents } from '../components/Navbar.js';
import { Sidebar, initSidebarEvents } from '../components/Sidebar.js';
import { DataTable, initTablePagination } from '../components/DataTable.js';
import { ModalForm, setModalLoading } from '../components/ModalForm.js';
import { FormInput } from '../components/FormInput.js';
import { ConfirmDialog } from '../components/ConfirmDialog.js';
import { AlertMessage } from '../components/AlertMessage.js';
import { footer } from '../components/footer.js';
import { SearchableDropdown } from '../components/SearchableDropdown.js';
import { getTiposFormacion, createTipoFormacion, updateTipoFormacion, deleteTipoFormacion, exportarCompetencias, importarCompetencias, exportarResultados, importarResultados, getCompetenciasPorTipo, deleteCompetencia, createCompetencia, updateCompetencia, getResultadosPorTipo, createResultado, updateResultado, deleteResultado } from '../utils/api.js?v=5';

class TiposProgramasPage {
    constructor() {
        new ProtectedRoute();
        this.appContainer = document.getElementById('app');
        this.tipos = [];
        this.currentEditId = null;

        this.init();
    }

    async init() {
        this.renderLayout();
        initNavbarEvents();
        initSidebarEvents();
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
                    
                    <!-- Page Header -->
                    <div class="d-flex flex-column flex-sm-row justify-content-between align-items-start align-items-sm-center mb-4 gap-3">
                        <div class="d-flex align-items-center gap-3">
                            <div class="page-icon">
                                <i class="bi bi-mortarboard-fill"></i>
                            </div>
                            <div>
                                <h4 class="fw-bold mb-0" style="color: var(--text-dark);">Tipos de Formación</h4>
                                <small style="color: var(--text-muted);">Administra los niveles/tipos de programas</small>
                            </div>
                        </div>
                        
                        <button class="btn btn-purple d-flex align-items-center gap-2" id="btn-add-tipo">
                            <i class="bi bi-plus-lg"></i>
                            <span>Nuevo Tipo</span>
                        </button>
                    </div>

                    <!-- Toolbar -->
                    <div class="d-flex flex-wrap justify-content-between align-items-center mb-3 gap-2">
                        <div class="d-flex align-items-center gap-2 ms-auto">
                            <label class="mb-0 fw-medium" style="color: var(--text-muted); font-size: 0.85rem;">Search:</label>
                            <input type="text" class="form-control form-control-sm" style="max-width: 200px; border-color: var(--border-color); border-radius: 0.4rem;" placeholder="" id="search-input">
                        </div>
                    </div>

                    <!-- Table Container -->
                    <div id="table-container">
                        ${DataTable({ id: 'tipos-table', columns: [], loading: true })}
                    </div>
                    
                </main>
                 ${footer()}
            </div>
            
            <!-- Modal Container -->
            <div id="modal-container"></div>
            
            <!-- Modal: Competencias del Tipo de Formación -->
            <div class="modal fade" id="modalCompetenciasTipo" tabindex="-1" aria-hidden="true">
                <div class="modal-dialog modal-md modal-dialog-centered">
                    <div class="modal-content border-0 shadow-lg" style="border-radius:1rem; overflow:hidden;">
                        <!-- Header -->
                        <div class="modal-header text-white border-0 px-4 py-3"
                             style="background:linear-gradient(135deg,var(--primary) 0%,var(--primary-dark) 100%);">
                            <h5 class="modal-title fw-bold d-flex align-items-center gap-2" id="modal-competencias-title">
                                <i class="bi bi-journal-bookmark"></i> Competencias
                            </h5>
                            <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal"></button>
                        </div>
                        <!-- Body -->
                        <div class="modal-body p-4 text-center" style="background:var(--bg-page);">
                            <p class="mb-4">Gestiona las competencias vinculadas a este tipo de formación usando Excel.</p>
                            
                            <div class="d-flex flex-column gap-3 mx-auto" style="max-width: 320px;">
                                <button id="btn-ver-competencias-modal" class="btn d-flex align-items-center justify-content-center gap-2 py-2"
                                    style="background:linear-gradient(135deg,var(--primary) 0%,var(--primary-dark) 100%); color:#fff; border:none; border-radius:0.5rem; font-weight:600;">
                                    <i class="bi bi-eye"></i> Ver Competencias
                                </button>

                                <button id="btn-export-competencias-modal" class="btn btn-success d-flex align-items-center justify-content-center gap-2 py-2">
                                    <i class="bi bi-download"></i> Exportar Competencias
                                </button>
                                
                                <button id="btn-import-competencias-modal" class="btn btn-primary d-flex align-items-center justify-content-center gap-2 py-2">
                                    <i class="bi bi-upload"></i> Importar Competencias
                                </button>
                                <input type="file" id="file-import-competencias" accept=".xlsx, .xls, .csv" style="display:none;">
                            </div>

                            
                            <div id="alert-competencias-container" class="mt-3 text-start"></div>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Modal: Lista de Competencias -->
            <div class="modal fade" id="modalListaCompetencias" tabindex="-1" aria-hidden="true">
                <div class="modal-dialog modal-lg modal-dialog-centered modal-dialog-scrollable">
                    <div class="modal-content border-0 shadow-lg" style="border-radius:1rem; overflow:hidden;">
                        <!-- Header -->
                        <div class="modal-header text-white border-0 px-4 py-3"
                             style="background:linear-gradient(135deg,var(--primary) 0%,var(--primary-dark) 100%);">
                            <h5 class="modal-title fw-bold d-flex align-items-center gap-2" id="modalListaCompetenciasLabel">
                                <i class="bi bi-list-ul"></i> Competencias
                            </h5>
                            <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal" aria-label="Close"></button>
                        </div>
                        <!-- Body -->
                        <div class="modal-body p-4" style="background:var(--bg-page); min-height: 300px;">
                            <div class="d-flex justify-content-between align-items-center mb-3 gap-2">
                                <input type="text" id="search-competencia-input" class="form-control form-control-sm" style="max-width: 250px; border-radius: 0.4rem;" placeholder="Buscar competencia...">
                                <button id="btn-crear-competencia-modal" class="btn btn-sm" style="background:var(--primary); color:#fff; border-radius: 0.4rem; font-weight: 500;">
                                    <i class="bi bi-plus-lg"></i> Crear Competencia
                                </button>
                            </div>
                            <div id="lista-competencias-content" class="d-flex flex-column gap-2">
                                <!-- Content will be loaded here -->
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Modal: Crear Competencia -->
            <div class="modal fade" id="modalCrearCompetencia" tabindex="-1" aria-hidden="true">
                <div class="modal-dialog modal-md modal-dialog-centered">
                    <div class="modal-content border-0 shadow-lg" style="border-radius:1rem; overflow:hidden;">
                        <!-- Header -->
                        <div class="modal-header text-white border-0 px-4 py-3"
                             style="background:linear-gradient(135deg,var(--primary) 0%,var(--primary-dark) 100%);">
                            <h5 class="modal-title fw-bold d-flex align-items-center gap-2">
                                <i class="bi bi-plus-circle"></i> Crear Competencia
                            </h5>
                            <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal" aria-label="Close"></button>
                        </div>
                        <!-- Body -->
                        <div class="modal-body p-4" style="background:var(--bg-page);">
                            <div id="crear-competencia-alert"></div>
                            <form id="form-crear-competencia">
                                <div class="mb-3">
                                    <label class="form-label fw-medium">Nombre de Competencia</label>
                                    <input type="text" id="comp-nombre" class="form-control" required maxlength="255">
                                </div>
                                <div class="mb-3">
                                    <label class="form-label fw-medium">Código</label>
                                    <input type="text" id="comp-codigo" class="form-control" required maxlength="255">
                                </div>
                                <div class="mb-3">
                                    <label class="form-label fw-medium">Tipo</label>
                                    <input type="text" id="comp-tipo" class="form-control" required maxlength="255">
                                </div>
                                <div class="d-flex justify-content-end gap-2 mt-4">
                                    <button type="button" class="btn btn-light" data-bs-dismiss="modal">Cancelar</button>
                                    <button type="submit" class="btn btn-primary" id="btn-submit-competencia">Guardar</button>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Modal: Resultados del Tipo de Formación -->
            <div class="modal fade" id="modalResultadosTipo" tabindex="-1" aria-hidden="true">
                <div class="modal-dialog modal-md modal-dialog-centered">
                    <div class="modal-content border-0 shadow-lg" style="border-radius:1rem; overflow:hidden;">
                        <!-- Header -->
                        <div class="modal-header text-white border-0 px-4 py-3"
                             style="background:linear-gradient(135deg, #0dcaf0 0%, #087990 100%);">
                            <h5 class="modal-title fw-bold d-flex align-items-center gap-2" id="modal-resultados-title">
                                <i class="bi bi-clipboard-check"></i> Resultados
                            </h5>
                            <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal"></button>
                        </div>
                        <!-- Body -->
                        <div class="modal-body p-4 text-center" style="background:var(--bg-page);">
                            <p class="mb-4">Gestiona los resultados vinculados a este tipo de formación usando Excel.</p>
                            
                            <div class="d-flex flex-column gap-3 mx-auto" style="max-width: 320px;">
                                <button id="btn-ver-resultados-modal" class="btn d-flex align-items-center justify-content-center gap-2 py-2"
                                    style="background:linear-gradient(135deg, #0dcaf0 0%, #087990 100%); color:#fff; border:none; border-radius:0.5rem; font-weight:600;">
                                    <i class="bi bi-eye"></i> Ver Resultados
                                </button>

                                <button id="btn-export-resultados-modal" class="btn btn-success d-flex align-items-center justify-content-center gap-2 py-2">
                                    <i class="bi bi-download"></i> Exportar Resultados
                                </button>
                                
                                <button id="btn-import-resultados-modal" class="btn btn-primary d-flex align-items-center justify-content-center gap-2 py-2">
                                    <i class="bi bi-upload"></i> Importar Resultados
                                </button>
                                <input type="file" id="file-import-resultados" accept=".xlsx, .xls, .csv" style="display:none;">
                            </div>
                            
                            <div id="alert-resultados-container" class="mt-3 text-start"></div>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Modal: Lista de Resultados -->
            <div class="modal fade" id="modalListaResultados" tabindex="-1" aria-hidden="true">
                <div class="modal-dialog modal-lg modal-dialog-centered modal-dialog-scrollable">
                    <div class="modal-content border-0 shadow-lg" style="border-radius:1rem; overflow:hidden;">
                        <!-- Header -->
                        <div class="modal-header text-white border-0 px-4 py-3"
                             style="background:linear-gradient(135deg, #0dcaf0 0%, #087990 100%);">
                            <h5 class="modal-title fw-bold d-flex align-items-center gap-2" id="modalListaResultadosLabel">
                                <i class="bi bi-list-ul"></i> Resultados
                            </h5>
                            <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal" aria-label="Close"></button>
                        </div>
                        <!-- Body -->
                        <div class="modal-body p-4" style="background:var(--bg-page); min-height: 300px;">
                            <div class="d-flex justify-content-between align-items-center mb-3 gap-2">
                                <input type="text" id="search-resultado-input" class="form-control form-control-sm" style="max-width: 250px; border-radius: 0.4rem;" placeholder="Buscar resultado...">
                                <button id="btn-crear-resultado-modal" class="btn btn-sm" style="background:#0dcaf0; color:#fff; border-radius: 0.4rem; font-weight: 500;">
                                    <i class="bi bi-plus-lg"></i> Crear Resultado
                                </button>
                            </div>
                            <div id="lista-resultados-content" class="d-flex flex-column gap-2">
                                <!-- Content will be loaded here -->
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Modal: Crear Resultado -->
            <div class="modal fade" id="modalCrearResultado" tabindex="-1" aria-hidden="true">
                <div class="modal-dialog modal-md modal-dialog-centered">
                    <div class="modal-content border-0 shadow-lg" style="border-radius:1rem; overflow:hidden;">
                        <!-- Header -->
                        <div class="modal-header text-white border-0 px-4 py-3"
                             style="background:linear-gradient(135deg, #0dcaf0 0%, #087990 100%);">
                            <h5 class="modal-title fw-bold d-flex align-items-center gap-2">
                                <i class="bi bi-plus-circle"></i> Crear Resultado
                            </h5>
                            <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal" aria-label="Close"></button>
                        </div>
                        <!-- Body -->
                        <div class="modal-body p-4" style="background:var(--bg-page);">
                            <div id="crear-resultado-alert"></div>
                            <form id="form-crear-resultado">
                                <div class="mb-3">
                                    <label class="form-label fw-medium">Nombre de Resultado</label>
                                    <input type="text" id="res-nombre" class="form-control" required maxlength="255">
                                </div>
                                <div class="mb-3">
                                    <label class="form-label fw-medium">Código</label>
                                    <input type="text" id="res-codigo" class="form-control" required maxlength="40">
                                </div>
                                <div class="mb-3">
                                    <label class="form-label fw-medium">Competencia</label>
                                    <div id="sd-competencia-trigger">
                                        <input type="hidden" id="res-competencia" required>
                                        <input type="text" id="res-competencia-display" class="form-control" placeholder="Cargando competencias..." required style="background: #fff; cursor: pointer;">
                                    </div>
                                </div>
                                <div class="d-flex justify-content-end gap-2 mt-4">
                                    <button type="button" class="btn btn-light" data-bs-dismiss="modal">Cancelar</button>
                                    <button type="submit" class="btn btn-info text-white" id="btn-submit-resultado">Guardar</button>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
            </div>
        `;

        this.competenciaDropdown = new SearchableDropdown({
            triggerEl: 'sd-competencia-trigger',
            inputId: 'res-competencia',
            displayId: 'res-competencia-display',
            placeholder: 'Buscar competencia...',
            emptyText: 'No se encontraron competencias'
        });

        // Evento: Ver Competencias
        document.getElementById('btn-ver-competencias-modal').addEventListener('click', () => {
            this.verCompetencias();
        });

        // Eventos import/export competencias modal
        document.getElementById('btn-export-competencias-modal').addEventListener('click', async () => {
            if (!this.currentTipoIdCompetencias) return;
            try {
                this.showAlert('alert-competencias-container', 'info', 'Descargando archivo...');
                await exportarCompetencias(this.currentTipoIdCompetencias);
                this.showAlert('alert-competencias-container', 'success', 'Archivo exportado con éxito.');
            } catch (err) {
                this.showAlert('alert-competencias-container', 'danger', err.message || 'Error al exportar competencias');
            }
        });

        const fileImportComp = document.getElementById('file-import-competencias');
        document.getElementById('btn-import-competencias-modal').addEventListener('click', () => {
            fileImportComp.click();
        });

        fileImportComp.addEventListener('change', async (e) => {
            const file = e.target.files[0];
            if (!file || !this.currentTipoIdCompetencias) return;

            try {
                this.showAlert('alert-competencias-container', 'info', 'Importando competencias... Por favor espera.');
                const res = await importarCompetencias(file, this.currentTipoIdCompetencias);
                let msg = `Importación exitosa. Agregados/Actualizados: ${res.importados || 0}.`;
                if (res.con_errores > 0) {
                    msg += ` Filas con problemas: ${res.con_errores}. Revisa el log o datos.`;
                }
                this.showAlert('alert-competencias-container', res.con_errores > 0 ? 'warning' : 'success', msg);
                await this.loadData();
            } catch (err) {
                this.showAlert('alert-competencias-container', 'danger', err.message || 'Error al importar');
            } finally {
                e.target.value = ''; // Reset input
            }
        });

        // Eventos import/export resultados modal
        document.getElementById('btn-export-resultados-modal').addEventListener('click', async () => {
            if (!this.currentTipoIdResultados) return;
            try {
                this.showAlert('alert-resultados-container', 'info', 'Descargando archivo...');
                await exportarResultados(this.currentTipoIdResultados);
                this.showAlert('alert-resultados-container', 'success', 'Archivo exportado con éxito.');
            } catch (err) {
                this.showAlert('alert-resultados-container', 'danger', err.message || 'Error al exportar resultados');
            }
        });

        const fileImportRes = document.getElementById('file-import-resultados');
        document.getElementById('btn-import-resultados-modal').addEventListener('click', () => {
            fileImportRes.click();
        });

        fileImportRes.addEventListener('change', async (e) => {
            const file = e.target.files[0];
            if (!file || !this.currentTipoIdResultados) return;

            try {
                this.showAlert('alert-resultados-container', 'info', 'Importando resultados... Por favor espera.');
                const res = await importarResultados(file, this.currentTipoIdResultados);
                let msg = `Importación exitosa. Agregados/Actualizados: ${res.importados || 0}.`;
                if (res.con_errores > 0) {
                    msg += ` Filas con problemas: ${res.con_errores}. Revisa el log o datos.`;
                }
                this.showAlert('alert-resultados-container', res.con_errores > 0 ? 'warning' : 'success', msg);
                await this.loadData();
            } catch (err) {
                this.showAlert('alert-resultados-container', 'danger', err.message || 'Error al importar');
            } finally {
                e.target.value = ''; // Reset input
            }
        });


        // Evento: Ver Resultados
        document.getElementById('btn-ver-resultados-modal').addEventListener('click', () => {
            this.verResultados();
        });

        // Evento: Crear Resultado
        document.getElementById('btn-crear-resultado-modal').addEventListener('click', async () => {
            document.getElementById('form-crear-resultado').reset();
            document.getElementById('crear-resultado-alert').innerHTML = '';
            this.currentEditResultadoId = null;
            document.querySelector('#modalCrearResultado .modal-title').innerHTML = '<i class="bi bi-plus-circle"></i> Crear Resultado';
            
            if (this.competenciaDropdown) {
                this.competenciaDropdown.reset('Cargando competencias...');
                this.competenciaDropdown.disable('Cargando competencias...');
            }

            const modalLista = bootstrap.Modal.getInstance(document.getElementById('modalListaResultados'));
            if (modalLista) modalLista.hide();

            const modalCrear = bootstrap.Modal.getOrCreateInstance(document.getElementById('modalCrearResultado'));
            modalCrear.show();

            try {
                const competencias = await getCompetenciasPorTipo(this.currentTipoIdResultados);
                const lista = Array.isArray(competencias) ? competencias : (competencias.data || []);
                if (this.competenciaDropdown) {
                    if(lista.length === 0) {
                        this.competenciaDropdown.setItems([]);
                        this.competenciaDropdown.disable('No hay competencias (crea una primero)');
                    } else {
                        const items = lista.map(c => ({
                            id: c.idCompetencia || c.id,
                            label: c.nombreCompetencia || 'Sin nombre',
                            sub: c.codigo || 'Sin código'
                        }));
                        this.competenciaDropdown.setItems(items);
                        this.competenciaDropdown.enable('Seleccione una competencia...');
                    }
                }
            } catch (error) {
                if (this.competenciaDropdown) {
                    this.competenciaDropdown.disable('Error al cargar competencias');
                }
            }
        });

        // Al cerrar el modal de Crear/Editar Resultado, volvemos a mostrar la lista
        document.getElementById('modalCrearResultado').addEventListener('hidden.bs.modal', () => {
            if (this.currentTipoIdResultados) {
                const modalLista = bootstrap.Modal.getOrCreateInstance(document.getElementById('modalListaResultados'));
                modalLista.show();
            }
        });

        // Evento: Submit Crear/Editar Resultado
        document.getElementById('form-crear-resultado').addEventListener('submit', async (e) => {
            e.preventDefault();
            const btnSubmit = document.getElementById('btn-submit-resultado');
            btnSubmit.disabled = true;
            btnSubmit.innerHTML = '<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Guardando...';

            const data = {
                nombre: document.getElementById('res-nombre').value,
                codigo: document.getElementById('res-codigo').value,
                idCompetencia: document.getElementById('res-competencia').value
            };

            try {
                if (this.currentEditResultadoId) {
                    await updateResultado(this.currentEditResultadoId, data);
                } else {
                    await createResultado(data);
                }
                const modalCrear = bootstrap.Modal.getInstance(document.getElementById('modalCrearResultado'));
                modalCrear.hide();
                this.verResultados(); 
            } catch (error) {
                document.getElementById('crear-resultado-alert').innerHTML = `<div class="alert alert-danger py-2"><i class="bi bi-exclamation-triangle me-1"></i>${error.message || 'Error al guardar resultado'}</div>`;
            } finally {
                btnSubmit.disabled = false;
                btnSubmit.innerHTML = 'Guardar';
            }
        });

        // Evento: Search Resultados
        document.getElementById('search-resultado-input').addEventListener('input', (e) => {
            const q = e.target.value.toLowerCase().trim();
            const items = document.querySelectorAll('.resultado-item');
            items.forEach(item => {
                const text = item.textContent.toLowerCase();
                if (text.includes(q)) {
                    item.style.display = '';
                } else {
                    item.style.display = 'none';
                }
            });
        });

        // Evento: Crear Competencia
        document.getElementById('btn-crear-competencia-modal').addEventListener('click', () => {
            document.getElementById('form-crear-competencia').reset();
            document.getElementById('crear-competencia-alert').innerHTML = '';
            this.currentEditCompetenciaId = null;
            document.querySelector('#modalCrearCompetencia .modal-title').innerHTML = '<i class="bi bi-plus-circle"></i> Crear Competencia';
            
            const modalLista = bootstrap.Modal.getInstance(document.getElementById('modalListaCompetencias'));
            if (modalLista) modalLista.hide();

            const modalCrear = bootstrap.Modal.getOrCreateInstance(document.getElementById('modalCrearCompetencia'));
            modalCrear.show();
        });

        // Al cerrar el modal de Crear/Editar, volvemos a mostrar la lista (si aplica)
        document.getElementById('modalCrearCompetencia').addEventListener('hidden.bs.modal', () => {
            if (this.currentTipoIdCompetencias) {
                const modalLista = bootstrap.Modal.getOrCreateInstance(document.getElementById('modalListaCompetencias'));
                modalLista.show();
            }
        });

        // Evento: Submit Crear Competencia
        document.getElementById('form-crear-competencia').addEventListener('submit', async (e) => {
            e.preventDefault();
            const btnSubmit = document.getElementById('btn-submit-competencia');
            btnSubmit.disabled = true;
            btnSubmit.innerHTML = '<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Guardando...';

            const data = {
                nombreCompetencia: document.getElementById('comp-nombre').value,
                codigo: document.getElementById('comp-codigo').value,
                tipo: document.getElementById('comp-tipo').value,
                idTipoFormacion: this.currentTipoIdCompetencias
            };

            try {
                if (this.currentEditCompetenciaId) {
                    await updateCompetencia(this.currentEditCompetenciaId, data);
                } else {
                    await createCompetencia(data);
                }
                const modalCrear = bootstrap.Modal.getInstance(document.getElementById('modalCrearCompetencia'));
                modalCrear.hide();
                this.verCompetencias(); // Reload the list
                // To avoid race conditions, we can show a success message via another method or after load
            } catch (error) {
                document.getElementById('crear-competencia-alert').innerHTML = `<div class="alert alert-danger py-2"><i class="bi bi-exclamation-triangle me-1"></i>${error.message || 'Error al guardar competencia'}</div>`;
            } finally {
                btnSubmit.disabled = false;
                btnSubmit.innerHTML = 'Guardar';
            }
        });

        // Evento: Search Competencias
        document.getElementById('search-competencia-input').addEventListener('input', (e) => {
            const q = e.target.value.toLowerCase().trim();
            const items = document.querySelectorAll('.competencia-item');
            items.forEach(item => {
                const text = item.textContent.toLowerCase();
                if (text.includes(q)) {
                    item.style.display = '';
                } else {
                    item.style.display = 'none';
                }
            });
        });

        document.getElementById('btn-add-tipo').addEventListener('click', () => this.openModal());

        const searchInput = document.getElementById('search-input');
        if (searchInput) {
            searchInput.addEventListener('input', (e) => {
                this.filterTable(e.target.value);
            });
        }
    }

    filterTable(query) {
        const q = query.toLowerCase().trim();
        if (!q) {
            this.renderTable(this.tipos);
            return;
        }
        const filtered = this.tipos.filter(t => {
            // Support both old snake_case and new camelCase field names from the API response
            const nombre = t.nombreTipoFormacion || t.nombre || '';
            return nombre.toLowerCase().includes(q) ||
                (t.idTipoFormacion && String(t.idTipoFormacion).includes(q));
        });
        this.renderTable(filtered);
    }

    async loadData() {
        try {
            const data = await getTiposFormacion();
            this.tipos = data.data || (Array.isArray(data) ? data : []);
            this.renderTable();
        } catch (error) {
            this.showAlert('page-alert-container', 'danger', error.message || 'Error al cargar los tipos de formación.');
            document.getElementById('table-container').innerHTML = DataTable({ id: 'tipos-table', columns: [], loading: false, data: [] });
        }
    }

    renderTable(data = null) {
        const displayData = data || this.tipos;

        const columns = [
            {
                key: 'nombreTipoFormacion',
                label: 'Nombre del Tipo de Formación',
                icon: 'mortarboard',
                // Support both field names in case the API returns either
                render: (row) => row.nombreTipoFormacion || row.nombre || '<span class="text-muted">N/A</span>'
            },
            {
                key: 'duracionMeses',
                label: 'Duración (Meses)',
                icon: 'calendar-range',
                render: (row) => {
                    const val = row.duracionMeses ?? row.duracion_meses;
                    return val ? val + ' meses' : '<span class="text-muted">No definida</span>';
                }
            },
            {
                key: 'acciones',
                label: 'Acciones',
                render: (row) => `
                    <div class="d-flex gap-1 justify-content-end">
                        <button class="btn-action btn-competencias" data-id="${row.idTipoFormacion}" data-nombre="${row.nombreTipoFormacion || row.nombre || ''}" title="Competencias de Formación">
                            <i class="bi bi-journal-bookmark" style="color:var(--primary);"></i>
                        </button>
                        <button class="btn-action btn-resultados" data-id="${row.idTipoFormacion}" data-nombre="${row.nombreTipoFormacion || row.nombre || ''}" title="Resultados de Formación">
                            <i class="bi bi-clipboard-check" style="color:#0dcaf0;"></i>
                        </button>
                        <button class="btn-action edit btn-edit ms-2" data-id="${row.idTipoFormacion}" title="Editar">
                            <i class="bi bi-pencil-square"></i>
                        </button>
                        <button class="btn-action delete btn-delete" data-id="${row.idTipoFormacion}" title="Eliminar">
                            <i class="bi bi-trash"></i>
                        </button>
                    </div>
                `
            }
        ];

        document.getElementById('table-container').innerHTML = DataTable({
            id: 'tipos-table',
            columns: columns,
            data: displayData
        });

        initTablePagination('tipos-table', displayData, columns, '#table-container');

        document.querySelectorAll('.btn-edit').forEach(btn => {
            btn.addEventListener('click', (e) => this.openModal(e.currentTarget.dataset.id));
        });

        document.querySelectorAll('.btn-delete').forEach(btn => {
            btn.addEventListener('click', (e) => this.handleDelete(e.currentTarget.dataset.id));
        });

        document.querySelectorAll('.btn-competencias').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const b = e.currentTarget.closest('button');
                this.abrirModalCompetencias(b.dataset.id, b.dataset.nombre);
            });
        });

        document.querySelectorAll('.btn-resultados').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const b = e.currentTarget.closest('button');
                this.abrirModalResultados(b.dataset.id, b.dataset.nombre);
            });
        });
    }

    abrirModalCompetencias(idTipo, nombreTipo) {
        this.currentTipoIdCompetencias = idTipo;
        this.currentTipoNombreCompetencias = nombreTipo;
        document.getElementById('modal-competencias-title').innerHTML = `<i class="bi bi-journal-bookmark"></i> Competencias &mdash; ${nombreTipo}`;
        document.getElementById('alert-competencias-container').innerHTML = '';

        const modalEl = document.getElementById('modalCompetenciasTipo');
        bootstrap.Modal.getOrCreateInstance(modalEl).show();
    }

    async verCompetencias() {
        const content = document.getElementById('lista-competencias-content');
        
        // Hide the current modal
        const modalEl = document.getElementById('modalCompetenciasTipo');
        const currentModal = bootstrap.Modal.getInstance(modalEl);
        if (currentModal) currentModal.hide();

        // Show the new list modal
        const listModalEl = document.getElementById('modalListaCompetencias');
        const listModal = bootstrap.Modal.getOrCreateInstance(listModalEl);
        listModal.show();
        
        document.getElementById('modalListaCompetenciasLabel').innerHTML = `<i class="bi bi-list-ul"></i> Competencias &mdash; ${this.currentTipoNombreCompetencias}`;

        content.innerHTML = '<div class="text-center py-5 text-muted"><i class="bi bi-hourglass-split fs-1 mb-3 d-block"></i> Cargando...</div>';

        try {
            const competencias = await getCompetenciasPorTipo(this.currentTipoIdCompetencias);
            const lista = Array.isArray(competencias) ? competencias : (competencias.data || []);

            if (lista.length === 0) {
                content.innerHTML = `
                    <div class="text-center py-4 text-muted">
                        <i class="bi bi-inbox" style="font-size:2rem;"></i>
                        <p class="mt-2 mb-0">No hay competencias registradas para este tipo de formación.</p>
                    </div>`;
                return;
            }

            content.innerHTML = lista.map((c, i) => `
                <div class="card border-0 shadow-sm mb-2 competencia-item" style="border-radius: 0.8rem; overflow: hidden;">
                    <div class="card-body p-3 d-flex align-items-start gap-3">
                        <div class="d-flex align-items-center justify-content-center flex-shrink-0"
                             style="width:40px; height:40px; border-radius:50%; background:linear-gradient(135deg,var(--primary) 0%,var(--primary-dark) 100%); color:#fff; font-size:0.9rem; font-weight:700;">
                            ${i + 1}
                        </div>
                        <div class="flex-grow-1">
                            <div class="fw-semibold mb-1" style="color:var(--text-dark); font-size:0.95rem;">${c.nombreCompetencia || 'Sin nombre'}</div>
                            <div class="d-flex gap-2 flex-wrap">
                                ${c.codigo ? `<span class="badge" style="background:rgba(124, 58, 237, 0.1); color:var(--primary,#7c3aed); border:1px solid rgba(124, 58, 237, 0.2); font-size:0.75rem;"><i class="bi bi-tag me-1"></i>${c.codigo}</span>` : ''}
                                ${c.tipo ? `<span class="badge bg-light text-dark border" style="font-size:0.75rem;">${c.tipo}</span>` : ''}
                            </div>
                        </div>
                        <div class="flex-shrink-0 ms-auto">
                            <button class="btn btn-sm btn-outline-primary btn-edit-competencia me-1" 
                                data-id="${c.idCompetencia || c.id}" 
                                data-nombre="${c.nombreCompetencia || ''}" 
                                data-codigo="${c.codigo || ''}" 
                                data-tipo="${c.tipo || ''}" 
                                title="Editar Competencia">
                                <i class="bi bi-pencil-square"></i>
                            </button>
                            <button class="btn btn-sm btn-outline-danger btn-delete-competencia" data-id="${c.idCompetencia || c.id}" title="Eliminar Competencia">
                                <i class="bi bi-trash"></i>
                            </button>
                        </div>
                    </div>
                </div>
            `).join('');

            content.querySelectorAll('.btn-edit-competencia').forEach(btn => {
                btn.addEventListener('click', (e) => {
                    const btnEl = e.currentTarget;
                    document.getElementById('form-crear-competencia').reset();
                    document.getElementById('crear-competencia-alert').innerHTML = '';
                    
                    document.getElementById('comp-nombre').value = btnEl.dataset.nombre;
                    document.getElementById('comp-codigo').value = btnEl.dataset.codigo;
                    document.getElementById('comp-tipo').value = btnEl.dataset.tipo;
                    
                    this.currentEditCompetenciaId = btnEl.dataset.id;
                    
                    document.querySelector('#modalCrearCompetencia .modal-title').innerHTML = '<i class="bi bi-pencil-square"></i> Editar Competencia';
                    
                    const modalLista = bootstrap.Modal.getInstance(document.getElementById('modalListaCompetencias'));
                    if (modalLista) modalLista.hide();

                    const modalCrear = bootstrap.Modal.getOrCreateInstance(document.getElementById('modalCrearCompetencia'));
                    modalCrear.show();
                });
            });

            content.querySelectorAll('.btn-delete-competencia').forEach(btn => {
                btn.addEventListener('click', (e) => {
                    const compId = e.currentTarget.dataset.id;
                    this.handleDeleteCompetencia(compId);
                });
            });

        } catch (err) {
            content.innerHTML = `<div class="alert alert-danger m-2 py-2"><i class="bi bi-exclamation-triangle me-1"></i>${err.message || 'Error al cargar competencias'}</div>`;
        }
    }

    async handleDeleteCompetencia(id) {
        const confirm = await ConfirmDialog({
            title: '¿Eliminar Competencia?',
            message: 'Vas a eliminar esta competencia permanentemente. Esta acción no se puede deshacer.',
            confirmText: 'Sí, eliminar',
            cancelText: 'Cancelar'
        });

        if (confirm) {
            try {
                await deleteCompetencia(id);
                const listContent = document.getElementById('lista-competencias-content');
                if (listContent) {
                    listContent.insertAdjacentHTML('afterbegin', '<div class="alert alert-success m-2 py-2"><i class="bi bi-check-circle me-1"></i>Competencia eliminada con éxito.</div>');
                }
                setTimeout(() => this.verCompetencias(), 1000);
            } catch (error) {
                const listContent = document.getElementById('lista-competencias-content');
                if (listContent) {
                    listContent.insertAdjacentHTML('afterbegin', `<div class="alert alert-danger m-2 py-2"><i class="bi bi-exclamation-triangle me-1"></i>Error al eliminar: ${error.message}</div>`);
                }
            }
        }
    }

    abrirModalResultados(idTipo, nombreTipo) {
        this.currentTipoIdResultados = idTipo;
        this.currentTipoNombreResultados = nombreTipo;
        document.getElementById('modal-resultados-title').innerHTML = `<i class="bi bi-clipboard-check"></i> Resultados - ${nombreTipo}`;
        document.getElementById('alert-resultados-container').innerHTML = '';

        const modalEl = document.getElementById('modalResultadosTipo');
        bootstrap.Modal.getOrCreateInstance(modalEl).show();
    }

    async verResultados() {
        const content = document.getElementById('lista-resultados-content');
        
        // Hide the current modal
        const modalEl = document.getElementById('modalResultadosTipo');
        const currentModal = bootstrap.Modal.getInstance(modalEl);
        if (currentModal) currentModal.hide();

        // Show the new list modal
        const listModalEl = document.getElementById('modalListaResultados');
        const listModal = bootstrap.Modal.getOrCreateInstance(listModalEl);
        listModal.show();
        
        document.getElementById('modalListaResultadosLabel').innerHTML = `<i class="bi bi-list-ul"></i> Resultados &mdash; ${this.currentTipoNombreResultados}`;

        content.innerHTML = '<div class="text-center py-5 text-muted"><i class="bi bi-hourglass-split fs-1 mb-3 d-block"></i> Cargando...</div>';

        try {
            const resultados = await getResultadosPorTipo(this.currentTipoIdResultados);
            const lista = Array.isArray(resultados) ? resultados : (resultados.data || []);

            if (lista.length === 0) {
                content.innerHTML = `
                    <div class="text-center py-4 text-muted">
                        <i class="bi bi-inbox" style="font-size:2rem;"></i>
                        <p class="mt-2 mb-0">No hay resultados registrados para este tipo de formación.</p>
                    </div>`;
                return;
            }

            content.innerHTML = lista.map((r, i) => `
                <div class="card border-0 shadow-sm mb-2 resultado-item" style="border-radius: 0.8rem; overflow: hidden;">
                    <div class="card-body p-3 d-flex align-items-start gap-3">
                        <div class="d-flex align-items-center justify-content-center flex-shrink-0"
                             style="width:40px; height:40px; border-radius:50%; background:linear-gradient(135deg, #0dcaf0 0%, #087990 100%); color:#fff; font-size:0.9rem; font-weight:700;">
                            ${i + 1}
                        </div>
                        <div class="flex-grow-1">
                            <div class="fw-semibold mb-1" style="color:var(--text-dark); font-size:0.95rem;">${r.nombre || 'Sin nombre'}</div>
                            <div class="d-flex gap-2 flex-wrap">
                                ${r.codigo ? `<span class="badge" style="background:rgba(13, 202, 240, 0.1); color:#087990; border:1px solid rgba(13, 202, 240, 0.2); font-size:0.75rem;"><i class="bi bi-tag me-1"></i>${r.codigo}</span>` : ''}
                            </div>
                        </div>
                        <div class="flex-shrink-0 ms-auto">
                            <button class="btn btn-sm btn-outline-info btn-edit-resultado me-1" 
                                data-id="${r.idResultado || r.id}" 
                                data-nombre="${r.nombre || ''}" 
                                data-codigo="${r.codigo || ''}" 
                                data-competencia="${r.idCompetencia || ''}" 
                                title="Editar Resultado">
                                <i class="bi bi-pencil-square"></i>
                            </button>
                            <button class="btn btn-sm btn-outline-danger btn-delete-resultado" data-id="${r.idResultado || r.id}" title="Eliminar Resultado">
                                <i class="bi bi-trash"></i>
                            </button>
                        </div>
                    </div>
                </div>
            `).join('');

            content.querySelectorAll('.btn-edit-resultado').forEach(btn => {
                btn.addEventListener('click', async (e) => {
                    const btnEl = e.currentTarget;
                    document.getElementById('form-crear-resultado').reset();
                    document.getElementById('crear-resultado-alert').innerHTML = '';
                    
                    document.getElementById('res-nombre').value = btnEl.dataset.nombre;
                    document.getElementById('res-codigo').value = btnEl.dataset.codigo;
                    
                    this.currentEditResultadoId = btnEl.dataset.id;
                    
                    document.querySelector('#modalCrearResultado .modal-title').innerHTML = '<i class="bi bi-pencil-square"></i> Editar Resultado';
                    
                    if (this.competenciaDropdown) {
                        this.competenciaDropdown.reset('Cargando competencias...');
                        this.competenciaDropdown.disable('Cargando competencias...');
                    }
                    try {
                        const competencias = await getCompetenciasPorTipo(this.currentTipoIdResultados);
                        const listaC = Array.isArray(competencias) ? competencias : (competencias.data || []);
                        if (this.competenciaDropdown) {
                            if(listaC.length === 0) {
                                this.competenciaDropdown.setItems([]);
                                this.competenciaDropdown.disable('No hay competencias');
                            } else {
                                const items = listaC.map(c => ({
                                    id: c.idCompetencia || c.id,
                                    label: c.nombreCompetencia || 'Sin nombre',
                                    sub: c.codigo || 'Sin código'
                                }));
                                this.competenciaDropdown.setItems(items);
                                this.competenciaDropdown.enable('Seleccione una competencia...');
                                
                                const compId = btnEl.dataset.competencia;
                                if (compId) {
                                    const selectedComp = items.find(i => i.id == compId);
                                    if (selectedComp) {
                                        this.competenciaDropdown.setValue(selectedComp.id, selectedComp.label);
                                    }
                                }
                            }
                        }
                    } catch(err) {
                        if (this.competenciaDropdown) this.competenciaDropdown.disable('Error al cargar competencias');
                    }

                    const modalLista = bootstrap.Modal.getInstance(document.getElementById('modalListaResultados'));
                    if (modalLista) modalLista.hide();

                    const modalCrear = bootstrap.Modal.getOrCreateInstance(document.getElementById('modalCrearResultado'));
                    modalCrear.show();
                });
            });

            content.querySelectorAll('.btn-delete-resultado').forEach(btn => {
                btn.addEventListener('click', (e) => {
                    const resId = e.currentTarget.dataset.id;
                    this.handleDeleteResultado(resId);
                });
            });

        } catch (err) {
            content.innerHTML = `<div class="alert alert-danger m-2 py-2"><i class="bi bi-exclamation-triangle me-1"></i>${err.message || 'Error al cargar resultados'}</div>`;
        }
    }

    async handleDeleteResultado(id) {
        const confirm = await ConfirmDialog({
            title: '¿Eliminar Resultado?',
            message: 'Vas a eliminar este resultado permanentemente. Esta acción no se puede deshacer.',
            confirmText: 'Sí, eliminar',
            cancelText: 'Cancelar'
        });

        if (confirm) {
            try {
                await deleteResultado(id);
                const listContent = document.getElementById('lista-resultados-content');
                if (listContent) {
                    listContent.insertAdjacentHTML('afterbegin', '<div class="alert alert-success m-2 py-2"><i class="bi bi-check-circle me-1"></i>Resultado eliminado con éxito.</div>');
                }
                setTimeout(() => this.verResultados(), 1000);
            } catch (error) {
                const listContent = document.getElementById('lista-resultados-content');
                if (listContent) {
                    listContent.insertAdjacentHTML('afterbegin', `<div class="alert alert-danger m-2 py-2"><i class="bi bi-exclamation-triangle me-1"></i>Error al eliminar: ${error.message}</div>`);
                }
            }
        }
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
            <div class="row g-3">
                <div class="col-md-8">
                    ${FormInput({ id: 'nombreTipoFormacion', label: 'Nombre (Ej. Tecnólogo, Especialización)', required: true })}
                </div>
                <div class="col-md-4">
                    ${FormInput({ id: 'duracionMeses', label: 'Duración (Meses)', type: 'number', required: true })}
                </div>
            </div>
        `;

        document.getElementById('modal-container').innerHTML = ModalForm({
            id: 'tipo-modal',
            title: 'Tipo de Formación',
            formContent: formContent
        });

        const formEl = document.getElementById('tipo-modal-form');
        formEl.addEventListener('submit', this.handleFormSubmit.bind(this));

        this.bsModal = new bootstrap.Modal(document.getElementById('tipo-modal'));
    }

    injectDynamicModalFields(tipo = null) {
        // Support both field names in case the API returns either
        document.getElementById('nombreTipoFormacion').value = tipo
            ? (tipo.nombreTipoFormacion || tipo.nombre || '')
            : '';
        document.getElementById('duracionMeses').value = tipo
            ? (tipo.duracionMeses ?? tipo.duracion_meses ?? '')
            : '';

        const formEl = document.getElementById('tipo-modal-form');
        formEl.querySelectorAll('.is-invalid').forEach(el => el.classList.remove('is-invalid'));
        document.getElementById('tipo-modal-title').textContent = tipo ? 'Editar Tipo' : 'Nuevo Tipo';
    }

    openModal(id = null) {
        this.currentEditId = id;
        document.getElementById('tipo-modal-alert').innerHTML = '';

        let tipo = null;
        if (id) {
            tipo = this.tipos.find(t => String(t.idTipoFormacion) === String(id));
        }

        this.injectDynamicModalFields(tipo);
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
            nombreTipoFormacion: document.getElementById('nombreTipoFormacion').value,
            duracionMeses: parseInt(document.getElementById('duracionMeses').value)
        };

        setModalLoading('tipo-modal', true);
        document.getElementById('tipo-modal-alert').innerHTML = '';

        try {
            if (this.currentEditId) {
                await updateTipoFormacion(this.currentEditId, data);
            } else {
                await createTipoFormacion(data);
            }

            this.bsModal.hide();
            const actionText = this.currentEditId ? 'actualizado' : 'creado';
            this.showAlert('page-alert-container', 'success', 'Tipo de formación ' + actionText + ' correctamente.');

            await this.loadData();

        } catch (error) {
            document.getElementById('tipo-modal-alert').innerHTML = AlertMessage({
                id: 'modal-error',
                type: 'danger',
                message: error.message
            });
        } finally {
            setModalLoading('tipo-modal', false);
        }
    }

    async handleDelete(id) {
        const tipo = this.tipos.find(t => String(t.idTipoFormacion) === String(id));
        if (!tipo) return;

        const nombre = tipo.nombreTipoFormacion || tipo.nombre || 'este tipo';

        const confirm = await ConfirmDialog({
            title: '¿Eliminar Tipo?',
            message: 'Vas a eliminar permanentemente <strong>' + nombre + '</strong>. Esta acción no se puede deshacer.',
            confirmText: 'Sí, eliminar',
            cancelText: 'Cancelar'
        });

        if (confirm) {
            try {
                const prev = [...this.tipos];
                this.tipos = this.tipos.filter(t => String(t.idTipoFormacion) !== String(id));
                this.renderTable();

                await deleteTipoFormacion(id);
                this.showAlert('page-alert-container', 'success', 'Tipo de formación eliminado del sistema.');
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
    new TiposProgramasPage();
});
