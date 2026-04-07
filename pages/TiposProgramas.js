import { ProtectedRoute } from '../components/ProtectedRoute.js';
import { Navbar, initNavbarEvents } from '../components/Navbar.js';
import { Sidebar, initSidebarEvents } from '../components/Sidebar.js';
import { DataTable, initTablePagination } from '../components/DataTable.js';
import { ModalForm, setModalLoading } from '../components/ModalForm.js';
import { FormInput } from '../components/FormInput.js';
import { ConfirmDialog } from '../components/ConfirmDialog.js';
import { AlertMessage } from '../components/AlertMessage.js';
import { getTiposFormacion, createTipoFormacion, updateTipoFormacion, deleteTipoFormacion, exportarCompetencias, importarCompetencias, exportarResultados, importarResultados } from '../utils/api.js';

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
                            
                            <div class="d-flex flex-column gap-3 mx-auto" style="max-width: 300px;">
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
                            
                            <div class="d-flex flex-column gap-3 mx-auto" style="max-width: 300px;">
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
        `;

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
        document.getElementById('modal-competencias-title').innerHTML = `<i class="bi bi-journal-bookmark"></i> Competencias - ${nombreTipo}`;
        document.getElementById('alert-competencias-container').innerHTML = '';

        const modalEl = document.getElementById('modalCompetenciasTipo');
        bootstrap.Modal.getOrCreateInstance(modalEl).show();
    }

    abrirModalResultados(idTipo, nombreTipo) {
        this.currentTipoIdResultados = idTipo;
        document.getElementById('modal-resultados-title').innerHTML = `<i class="bi bi-clipboard-check"></i> Resultados - ${nombreTipo}`;
        document.getElementById('alert-resultados-container').innerHTML = '';

        const modalEl = document.getElementById('modalResultadosTipo');
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
