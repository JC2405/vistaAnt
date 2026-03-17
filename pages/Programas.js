import { ProtectedRoute } from '../components/ProtectedRoute.js';
import { Navbar, initNavbarEvents } from '../components/Navbar.js';
import { Sidebar, initSidebarEvents } from '../components/Sidebar.js';
import { DataTable } from '../components/DataTable.js';
import { ModalForm, setModalLoading } from '../components/ModalForm.js';
import { FormInput } from '../components/FormInput.js';
import { ConfirmDialog } from '../components/ConfirmDialog.js';
import { AlertMessage } from '../components/AlertMessage.js';
import { getProgramas, createPrograma, updatePrograma, deletePrograma, getTiposFormacion, exportarProgramas } from '../utils/api.js';

// Helper: extrae el nombre del tipo sin importar qué campo devuelva el API
const getTipoNombre = (tipo) => tipo ? (tipo.nombreTipoFormacion || tipo.nombre || 'N/A') : null;

class ProgramasPage {
    constructor() {
        new ProtectedRoute();
        this.appContainer = document.getElementById('app');
        this.programas = [];
        this.tiposFormacion = [];
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
                    
                    <!-- Page Header -->
                    <div class="d-flex flex-column flex-sm-row justify-content-between align-items-start align-items-sm-center mb-4 gap-3">
                        <div class="d-flex align-items-center gap-3">
                            <div class="page-icon">
                                <i class="bi bi-journal-bookmark-fill"></i>
                            </div>
                            <div>
                                <h4 class="fw-bold mb-0" style="color: var(--text-dark);">Programas</h4>
                                <small style="color: var(--text-muted);">Administra los programas de formación</small>
                            </div>
                        </div>
                        
                        <button class="btn btn-purple d-flex align-items-center gap-2" id="btn-add-programa">
                            <i class="bi bi-plus-lg"></i>
                            <span>Nuevo Programa</span>
                        </button>
                    </div>

                    <!-- Toolbar -->
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

                    <!-- Table Container -->
                    <div id="table-container">
                        ${DataTable({ id: 'programas-table', columns: [], loading: true })}
                    </div>
                </main>
            </div>
            
            <!-- Modal Container -->
            <div id="modal-container"></div>
        `;

        document.getElementById('btn-add-programa').addEventListener('click', () => this.openModal());

        const searchInput = document.getElementById('search-input');
        if (searchInput) {
            searchInput.addEventListener('input', (e) => {
                this.filterTable(e.target.value);
            });
        }

        document.getElementById('btn-export-db').addEventListener('click', async () => {
            try {
                this.showAlert('page-alert-container', 'info', 'Descargando archivo...');
                await exportarProgramas();
            } catch (err) {
                this.showAlert('page-alert-container', 'danger', err.message || 'Error al descargar');
            }
        });
    }

    async loadDependencies() {
        try {
            const tiposData = await getTiposFormacion();
            this.tiposFormacion = tiposData.data || (Array.isArray(tiposData) ? tiposData : []);
        } catch (error) {
            console.error('Error al cargar tipos de formación:', error);
            this.showAlert('page-alert-container', 'warning', 'No se pudieron cargar los tipos de formación.');
        }
    }

    filterTable(query) {
        const q = query.toLowerCase().trim();
        if (!q) {
            this.renderTable(this.programas);
            return;
        }
        const filtered = this.programas.filter(p => {
            const tipo = p.tipoFormacion || p.tipo_formacion;
            const tipoNombre = getTipoNombre(tipo) || '';
            return (p.nombre && p.nombre.toLowerCase().includes(q)) ||
                (p.codigo && p.codigo.toLowerCase().includes(q)) ||
                tipoNombre.toLowerCase().includes(q);
        });
        this.renderTable(filtered);
    }

    async loadData() {
        try {
            const data = await getProgramas();
            this.programas = data.data || (Array.isArray(data) ? data : []);
            this.renderTable();
        } catch (error) {
            this.showAlert('page-alert-container', 'danger', error.message || 'Error al cargar los programas.');
            document.getElementById('table-container').innerHTML = DataTable({ id: 'programas-table', columns: [], loading: false, data: [] });
        }
    }

    renderTable(data = null) {
        const displayData = data || this.programas;

        const columns = [
            { key: 'codigo', label: 'Código', icon: 'hash' },
            { key: 'nombre', label: 'Nombre Programa', icon: 'journal-text' },
            { key: 'version', label: 'Versión', icon: 'tag' },
            {
                key: 'tipoFormacion',
                label: 'Tipo Formación',
                icon: 'mortarboard',
                render: (row) => {
                    const tipo = row.tipoFormacion || row.tipo_formacion;
                    const nombre = getTipoNombre(tipo);
                    return nombre ? nombre : '<span class="text-muted">N/A</span>';
                }
            },
            {
                key: 'estado',
                label: 'Estado',
                icon: 'toggle-on',
                render: (row) => {
                    const badgeClass = row.estado === 'Activo' ? 'bg-success-subtle text-success' : 'bg-danger-subtle text-danger';
                    return '<span class="badge rounded-pill ' + badgeClass + '">' + (row.estado || 'N/A') + '</span>';
                }
            },
            {
                key: 'acciones',
                label: '',
                render: (row) => `
                    <div class="d-flex gap-1 justify-content-end">
                        <button class="btn-action edit btn-edit" data-id="${row.idPrograma}" title="Editar">
                            <i class="bi bi-pencil-square"></i>
                        </button>
                        <button class="btn-action delete btn-delete" data-id="${row.idPrograma}" title="Eliminar">
                            <i class="bi bi-trash"></i>
                        </button>
                    </div>
                `
            }
        ];

        document.getElementById('table-container').innerHTML = DataTable({
            id: 'programas-table',
            columns: columns,
            data: displayData
        });

        if (typeof $ !== 'undefined' && $.fn.dataTable) {
            this.dtInstance = $('#programas-table').DataTable({
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
        // Use getTipoNombre helper so options render correctly regardless of API field name
        const tipoOptions = this.tiposFormacion.map(t =>
            '<option value="' + t.idTipoFormacion + '">' + getTipoNombre(t) + '</option>'
        ).join('');

        const formContent = `
            <div class="row g-3">
                <div class="col-md-8">
                    ${FormInput({ id: 'nombre', label: 'Nombre del Programa', required: true })}
                </div>
                <div class="col-md-4">
                    ${FormInput({ id: 'codigo', label: 'Código', required: true })}
                </div>
                <div class="col-md-4">
                    ${FormInput({ id: 'version', label: 'Versión', required: true })}
                </div>
                <div class="col-md-4">
                    <div class="mb-4 form-floating position-relative">
                        <select class="form-select" id="idTipoFormacion" required style="background-color: #f8fafc; border: 1px solid #eeecf5; border-radius: 0.6rem;">
                            <option value="">Seleccione tipo...</option>
                            ${tipoOptions}
                        </select>
                        <label for="idTipoFormacion">Tipo Formación</label>
                    </div>
                </div>
                <div class="col-md-4">
                    <div class="mb-4 form-floating position-relative">
                        <select class="form-select" id="estado" required style="background-color: #f8fafc; border: 1px solid #eeecf5; border-radius: 0.6rem;">
                            <option value="Activo">Activo</option>
                            <option value="Inactivo">Inactivo</option>
                        </select>
                        <label for="estado">Estado</label>
                    </div>
                </div>
            </div>
        `;

        document.getElementById('modal-container').innerHTML = ModalForm({
            id: 'programa-modal',
            title: 'Programa',
            formContent: formContent
        });

        const formEl = document.getElementById('programa-modal-form');
        formEl.addEventListener('submit', this.handleFormSubmit.bind(this));

        this.bsModal = new bootstrap.Modal(document.getElementById('programa-modal'));
    }

    injectDynamicModalFields(programa = null) {
        document.getElementById('nombre').value = programa ? programa.nombre : '';
        document.getElementById('codigo').value = programa ? programa.codigo : '';
        document.getElementById('version').value = programa ? programa.version : '';
        document.getElementById('estado').value = programa ? (programa.estado || 'Activo') : 'Activo';
        document.getElementById('idTipoFormacion').value = programa ? (programa.idTipoFormacion || '') : '';

        const formEl = document.getElementById('programa-modal-form');
        formEl.querySelectorAll('.is-invalid').forEach(el => el.classList.remove('is-invalid'));
        document.getElementById('programa-modal-title').textContent = programa ? 'Editar Programa' : 'Nuevo Programa';
    }

    openModal(id = null) {
        this.currentEditId = id;
        document.getElementById('programa-modal-alert').innerHTML = '';

        let programa = null;
        if (id) {
            programa = this.programas.find(p => String(p.idPrograma) === String(id));
        }

        this.injectDynamicModalFields(programa);
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
            nombre: document.getElementById('nombre').value,
            codigo: document.getElementById('codigo').value,
            version: document.getElementById('version').value,
            estado: document.getElementById('estado').value,
            idTipoFormacion: parseInt(document.getElementById('idTipoFormacion').value)
        };

        setModalLoading('programa-modal', true);
        document.getElementById('programa-modal-alert').innerHTML = '';

        try {
            if (this.currentEditId) {
                await updatePrograma(this.currentEditId, data);
            } else {
                await createPrograma(data);
            }

            this.bsModal.hide();
            const actionText = this.currentEditId ? 'actualizado' : 'creado';
            this.showAlert('page-alert-container', 'success', 'Programa ' + actionText + ' correctamente.');

            await this.loadData();

        } catch (error) {
            document.getElementById('programa-modal-alert').innerHTML = AlertMessage({
                id: 'modal-error',
                type: 'danger',
                message: error.message
            });
        } finally {
            setModalLoading('programa-modal', false);
        }
    }

    async handleDelete(id) {
        const programa = this.programas.find(p => String(p.idPrograma) === String(id));
        if (!programa) return;

        const confirm = await ConfirmDialog({
            title: '¿Eliminar Programa?',
            message: 'Vas a eliminar permanentemente el programa <strong>' + programa.nombre + '</strong>. Esta acción no se puede deshacer.',
            confirmText: 'Sí, eliminar',
            cancelText: 'Cancelar'
        });

        if (confirm) {
            try {
                const prev = [...this.programas];
                this.programas = this.programas.filter(p => String(p.idPrograma) !== String(id));
                this.renderTable();

                await deletePrograma(id);
                this.showAlert('page-alert-container', 'success', 'Programa eliminado del sistema.');
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
    new ProgramasPage();
});