import { ProtectedRoute } from '../components/ProtectedRoute.js';
import { Navbar, initNavbarEvents } from '../components/Navbar.js';
import { Sidebar, initSidebarEvents } from '../components/Sidebar.js';
import { DataTable, initTablePagination } from '../components/DataTable.js';
import { ModalForm, setModalLoading } from '../components/ModalForm.js';
import { FormInput } from '../components/FormInput.js';
import { ConfirmDialog } from '../components/ConfirmDialog.js';
import { AlertMessage } from '../components/AlertMessage.js';
import { getSedes, createSede, updateSede, deleteSede, getMunicipios } from '../utils/api.js?v=4';

class SedesPage {
    constructor() {
        new ProtectedRoute();
        this.appContainer = document.getElementById('app');
        this.sedes = [];
        this.municipios = [];
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
                                <i class="bi bi-building"></i>
                            </div>
                            <div>
                                <h4 class="fw-bold mb-0" style="color: var(--text-dark);">Sedes</h4>
                                <small style="color: var(--text-muted);">Administra las sedes de formación</small>
                            </div>
                        </div>
                        
                        <button class="btn btn-purple d-flex align-items-center gap-2" id="btn-add-sede">
                            <i class="bi bi-plus-lg"></i>
                            <span>Nueva Sede</span>
                        </button>
                    </div>

                    <!-- Toolbar -->
                    <div class="d-flex flex-wrap justify-content-between align-items-center mb-3 gap-2">
                        <div class="btn-group btn-group-sm" role="group">
                        </div>
                        <div class="d-flex align-items-center gap-2">
                            <label class="mb-0 fw-medium" style="color: var(--text-muted); font-size: 0.85rem;">Search:</label>
                            <input type="text" class="form-control form-control-sm" style="max-width: 200px; border-color: var(--border-color); border-radius: 0.4rem;" placeholder="" id="search-input">
                        </div>
                    </div>

                    <!-- Table Container -->
                    <div id="table-container">
                        ${DataTable({ id: 'sedes-table', columns: [], loading: true })}
                    </div>
                </main>
            </div>
            
            <!-- Modal Container -->
            <div id="modal-container"></div>
        `;

        document.getElementById('btn-add-sede').addEventListener('click', () => this.openModal());

        // Search filter
        const searchInput = document.getElementById('search-input');
        if (searchInput) {
            searchInput.addEventListener('input', (e) => {
                this.filterTable(e.target.value);
            });
        }
    }

    async loadDependencies() {
        try {
            const munData = await getMunicipios();
            this.municipios = munData.data || (Array.isArray(munData) ? munData : []);
        } catch (error) {
            console.error('Error al cargar municipios:', error);
            this.showAlert('page-alert-container', 'warning', 'No se pudieron cargar los municipios.');
        }
    }

    filterTable(query) {
        const q = query.toLowerCase().trim();
        if (!q) {
            this.renderTable(this.sedes);
            return;
        }
        const filtered = this.sedes.filter(s => {
            return (s.nombre && s.nombre.toLowerCase().includes(q)) ||
                (s.direccion && s.direccion.toLowerCase().includes(q)) ||
                (s.estado && s.estado.toLowerCase().includes(q)) ||
                (s.municipio && s.municipio.nombreMunicipio && s.municipio.nombreMunicipio.toLowerCase().includes(q));
        });
        this.renderTable(filtered);
    }

    async loadData() {
        try {
            const data = await getSedes();
            this.sedes = data.data || (Array.isArray(data) ? data : []);
            this.renderTable();
        } catch (error) {
            this.showAlert('page-alert-container', 'danger', error.message || 'Error al cargar las sedes.');
            document.getElementById('table-container').innerHTML = DataTable({ id: 'sedes-table', columns: [], loading: false, data: [] });
        }
    }

    renderTable(data = null) {
        const displayData = data || this.sedes;

        const columns = [
            { key: 'idSede', label: 'ID', icon: 'hash' },
            { key: 'nombre', label: 'Nombre', icon: 'building' },
            { key: 'direccion', label: 'Dirección', icon: 'geo-alt' },
            {
                key: 'municipio',
                label: 'Municipio',
                icon: 'map',
                render: (row) => row.municipio ? row.municipio.nombreMunicipio : '<span class="text-muted">N/A</span>'
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
                        <a href="/ambientes.html?idSede=${row.idSede}&nombreSede=${encodeURIComponent(row.nombre)}" class="btn-action d-flex align-items-center justify-content-center" title="Ver Ambientes" style="width: 32px; height: 32px; border-radius: 0.4rem; text-decoration: none; background-color: #10b981 !important; color: white !important;">
                            <i class="bi bi-door-open-fill"></i>
                        </a>
                        <button class="btn-action edit btn-edit" data-id="${row.idSede}" title="Editar">
                            <i class="bi bi-pencil-square"></i>
                        </button>
                        <button class="btn-action delete btn-delete" data-id="${row.idSede}" title="Eliminar">
                            <i class="bi bi-trash"></i>
                        </button>
                    </div>
                `
            }
        ];

        document.getElementById('table-container').innerHTML = DataTable({
            id: 'sedes-table',
            columns: columns,
            data: displayData
        });

        initTablePagination('sedes-table', displayData, columns, '#table-container');

        document.querySelectorAll('.btn-edit').forEach(btn => {
            btn.addEventListener('click', (e) => this.openModal(e.currentTarget.dataset.id));
        });

        document.querySelectorAll('.btn-delete').forEach(btn => {
            btn.addEventListener('click', (e) => this.handleDelete(e.currentTarget.dataset.id));
        });
    }

    bindToolbarButtons() {}

    setupModal() {
        const municipioOptions = this.municipios.map(m =>
            '<option value="' + m.idMunicipio + '">' + m.nombreMunicipio + '</option>'
        ).join('');

        const formContent = `
            <div class="row g-3">
                <div class="col-md-6">
                    ${FormInput({ id: 'nombre', label: 'Nombre de la Sede', required: true })}
                </div>
                <div class="col-md-6">
                    ${FormInput({ id: 'direccion', label: 'Dirección' })}
                </div>
                <div class="col-md-6">
                    <div class="mb-4 form-floating position-relative">
                        <select class="form-select" id="idMunicipio" style="background-color: #f8fafc; border: 1px solid #eeecf5; border-radius: 0.6rem;">
                            <option value="">Seleccione un municipio...</option>
                            ${municipioOptions}
                        </select>
                        <label for="idMunicipio">Municipio</label>
                    </div>
                </div>
                <div class="col-md-6">
                    <div class="mb-4 form-floating position-relative">
                        <select class="form-select" id="estado" required style="background-color: #f8fafc; border: 1px solid #eeecf5; border-radius: 0.6rem;">
                            <option value="Activo">Activo</option>
                            <option value="Inactivo">Inactivo</option>
                        </select>
                        <label for="estado">Estado</label>
                    </div>
                </div>
                <div class="col-12">
                    ${FormInput({ id: 'descripcion', label: 'Descripción', type: 'text' })}
                </div>
            </div>
        `;

        document.getElementById('modal-container').innerHTML = ModalForm({
            id: 'sede-modal',
            title: 'Sede',
            formContent: formContent
        });

        const formEl = document.getElementById('sede-modal-form');
        formEl.addEventListener('submit', this.handleFormSubmit.bind(this));

        this.bsModal = new bootstrap.Modal(document.getElementById('sede-modal'));
    }

    injectDynamicModalFields(sede = null) {
        document.getElementById('nombre').value = sede ? sede.nombre : '';
        document.getElementById('direccion').value = sede ? (sede.direccion || '') : '';
        document.getElementById('descripcion').value = sede ? (sede.descripcion || '') : '';
        document.getElementById('estado').value = sede ? (sede.estado || 'Activo') : 'Activo';
        document.getElementById('idMunicipio').value = sede ? (sede.idMunicipio || '') : '';

        const formEl = document.getElementById('sede-modal-form');
        formEl.querySelectorAll('.is-invalid').forEach(el => el.classList.remove('is-invalid'));
        document.getElementById('sede-modal-title').textContent = sede ? 'Editar Sede' : 'Nueva Sede';
    }

    openModal(id = null) {
        this.currentEditId = id;
        document.getElementById('sede-modal-alert').innerHTML = '';

        let sede = null;
        if (id) {
            sede = this.sedes.find(s => String(s.idSede) === String(id));
        }

        this.injectDynamicModalFields(sede);
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
            direccion: document.getElementById('direccion').value,
            descripcion: document.getElementById('descripcion').value,
            estado: document.getElementById('estado').value,
            idMunicipio: document.getElementById('idMunicipio').value ? parseInt(document.getElementById('idMunicipio').value) : null
        };

        setModalLoading('sede-modal', true);
        document.getElementById('sede-modal-alert').innerHTML = '';

        try {
            if (this.currentEditId) {
                await updateSede(this.currentEditId, data);
            } else {
                await createSede(data);
            }

            this.bsModal.hide();
            const actionText = this.currentEditId ? 'actualizada' : 'creada';
            this.showAlert('page-alert-container', 'success', 'Sede ' + actionText + ' correctamente.');

            await this.loadData();

        } catch (error) {
            document.getElementById('sede-modal-alert').innerHTML = AlertMessage({
                id: 'modal-error',
                type: 'danger',
                message: error.message
            });
        } finally {
            setModalLoading('sede-modal', false);
        }
    }

    async handleDelete(id) {
        const sede = this.sedes.find(s => String(s.idSede) === String(id));
        if (!sede) return;

        const confirm = await ConfirmDialog({
            title: '¿Eliminar Sede?',
            message: 'Vas a eliminar permanentemente la sede <strong>' + sede.nombre + '</strong>. Esta acción no se puede deshacer.',
            confirmText: 'Sí, eliminar',
            cancelText: 'Cancelar'
        });

        if (confirm) {
            try {
                // Optimistic UI update
                const prev = [...this.sedes];
                this.sedes = this.sedes.filter(s => String(s.idSede) !== String(id));
                this.renderTable();

                await deleteSede(id);
                this.showAlert('page-alert-container', 'success', 'Sede eliminada del sistema.');
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
    new SedesPage();
});
