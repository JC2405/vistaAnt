import { ProtectedRoute } from '../components/ProtectedRoute.js';
import { Navbar, initNavbarEvents } from '../components/Navbar.js';
import { Sidebar, initSidebarEvents } from '../components/Sidebar.js';
import { DataTable } from '../components/DataTable.js';
import { ModalForm, setModalLoading } from '../components/ModalForm.js';
import { FormInput } from '../components/FormInput.js';
import { ConfirmDialog } from '../components/ConfirmDialog.js';
import { AlertMessage } from '../components/AlertMessage.js';
import { getTiposFormacion, createTipoFormacion, updateTipoFormacion, deleteTipoFormacion } from '../utils/api.js';

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
                        <div class="btn-group btn-group-sm" role="group">
                            <button id="btn-colvis" class="btn btn-dark rounded-start-pill px-3">Columnas <i class="bi bi-chevron-down ms-1"></i></button>
                            <button id="btn-excel"  class="btn btn-dark px-3">Excel</button>
                            <button id="btn-pdf"    class="btn btn-dark px-3">PDF</button>
                            <button id="btn-print"  class="btn btn-dark rounded-end-pill px-3">Print</button>
                        </div>
                        <div class="d-flex align-items-center gap-2">
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
        `;

        document.getElementById('btn-add-tipo').addEventListener('click', () => this.openModal());

        // Search filter
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
            return (t.nombre && t.nombre.toLowerCase().includes(q)) ||
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
            { key: 'nombre', label: 'Nombre del Tipo de Formación', icon: 'mortarboard' },
            {
                key: 'duracion_meses',
                label: 'Duración (Meses)',
                icon: 'calendar-range',
                render: (row) => row.duracion_meses ? row.duracion_meses + ' meses' : '<span class="text-muted">No definida</span>'
            },
            {
                key: 'acciones',
                label: '',
                render: (row) => `
                    <div class="d-flex gap-1 justify-content-end">
                        <button class="btn-action edit btn-edit" data-id="${row.idTipoFormacion}" title="Editar">
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

        // Inicializar DataTables con botones
        if (typeof $ !== 'undefined' && $.fn.dataTable) {
            this.dtInstance = $('#tipos-table').DataTable({
                responsive: true,
                paging: false,
                info: false,
                searching: false,
                dom: 'rt',
                buttons: [
                    { extend: 'colvis', text: 'Columnas' },
                    { extend: 'excel',  text: 'Excel' },
                    { extend: 'pdf',    text: 'PDF' },
                    { extend: 'print',  text: 'Print' }
                ],
                columnDefs: [{ orderable: false, targets: -1 }]
            });
            this.bindToolbarButtons();
        }

        // Event Listeners
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
        const formContent = `
            <div class="row g-3">
                <div class="col-md-8">
                    ${FormInput({ id: 'nombre', label: 'Nombre (Ej. Tecnólogo, Especialización)', required: true })}
                </div>
                <div class="col-md-4">
                    ${FormInput({ id: 'duracion_meses', label: 'Duración (Meses)', type: 'number', required: false })}
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
        document.getElementById('nombre').value = tipo ? tipo.nombre : '';
        document.getElementById('duracion_meses').value = tipo ? (tipo.duracion_meses || '') : '';

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

        const duracionStr = document.getElementById('duracion_meses').value;
        const data = {
            nombre: document.getElementById('nombre').value,
            duracion_meses: duracionStr ? parseInt(duracionStr) : null
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

        const confirm = await ConfirmDialog({
            title: '¿Eliminar Tipo?',
            message: 'Vas a eliminar permanentemente <strong>' + tipo.nombre + '</strong>. Esta acción no se puede deshacer.',
            confirmText: 'Sí, eliminar',
            cancelText: 'Cancelar'
        });

        if (confirm) {
            try {
                // Optimistic UI update
                const prev = [...this.tipos];
                this.tipos = this.tipos.filter(t => String(t.idTipoFormacion) !== String(id));
                this.renderTable();

                await deleteTipoFormacion(id);
                this.showAlert('page-alert-container', 'success', 'Tipo de formación eliminado del sistema.');
            } catch (error) {
                this.showAlert('page-alert-container', 'danger', 'Error al eliminar: ' + error.message);
                await this.loadData(); // revert
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
