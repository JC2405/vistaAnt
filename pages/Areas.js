import { ProtectedRoute } from '../components/ProtectedRoute.js';
import { Navbar, initNavbarEvents } from '../components/Navbar.js';
import { Sidebar, initSidebarEvents } from '../components/Sidebar.js';
import { DataTable, initTablePagination } from '../components/DataTable.js';
import { ModalForm, setModalLoading } from '../components/ModalForm.js';
import { FormInput } from '../components/FormInput.js';
import { ConfirmDialog } from '../components/ConfirmDialog.js';
import { AlertMessage } from '../components/AlertMessage.js';
import { getAreas, createArea, updateArea, deleteArea } from '../utils/api.js';

class AreasPage {
    constructor() {
        new ProtectedRoute();
        this.appContainer = document.getElementById('app');
        this.areas = [];
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
                                <i class="bi bi-grid-3x3-gap-fill"></i>
                            </div>
                            <div>
                                <h4 class="fw-bold mb-0" style="color: var(--text-dark);">Áreas</h4>
                                <small style="color: var(--text-muted);">Administra las áreas de formación</small>
                            </div>
                        </div>
                        
                        <button class="btn btn-purple d-flex align-items-center gap-2" id="btn-add-area">
                            <i class="bi bi-plus-lg"></i>
                            <span>Nueva Área</span>
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
                        ${DataTable({ id: 'areas-table', columns: [], loading: true })}
                    </div>
                </main>
            </div>
            
            <!-- Modal Container -->
            <div id="modal-container"></div>
        `;

        document.getElementById('btn-add-area').addEventListener('click', () => this.openModal());

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
            this.renderTable(this.areas);
            return;
        }
        const filtered = this.areas.filter(a => {
            return (a.nombreArea && a.nombreArea.toLowerCase().includes(q)) ||
                (a.idArea && String(a.idArea).toLowerCase().includes(q));
        });
        this.renderTable(filtered);
    }

    async loadData() {
        try {
            const areasData = await getAreas();
            this.areas = areasData.data || (Array.isArray(areasData) ? areasData : []);
            this.renderTable();
        } catch (error) {
            this.showAlert('page-alert-container', 'danger', error.message || 'Error al cargar las áreas.');
            document.getElementById('table-container').innerHTML = DataTable({ id: 'areas-table', columns: [], loading: false, data: [] });
        }
    }

    renderTable(data = null) {
        const displayData = data || this.areas;

        const columns = [
            { key: 'nombreArea', label: 'Nombre del Área', icon: 'textarea-t' },
            {
                key: 'acciones',
                label: '',
                render: (row) => `
                    <div class="d-flex gap-1 justify-content-end">
                        <button class="btn-action edit btn-edit" data-id="${row.idArea}" title="Editar">
                            <i class="bi bi-pencil-square"></i>
                        </button>
                        <button class="btn-action delete btn-delete" data-id="${row.idArea}" title="Eliminar">
                            <i class="bi bi-trash"></i>
                        </button>
                    </div>
                `
            }
        ];

        document.getElementById('table-container').innerHTML = DataTable({
            id: 'areas-table',
            columns: columns,
            data: displayData
        });

        initTablePagination('areas-table', displayData, columns, '#table-container');

        document.querySelectorAll('.btn-edit').forEach(btn => {
            btn.addEventListener('click', (e) => this.openModal(e.currentTarget.dataset.id));
        });

        document.querySelectorAll('.btn-delete').forEach(btn => {
            btn.addEventListener('click', (e) => this.handleDelete(e.currentTarget.dataset.id));
        });
    }


    setupModal() {
        const formContent = `
            <div class="row g-3">
                <div class="col-12">
                    ${FormInput({ id: 'nombreArea', label: 'Nombre del Área', required: true })}
                </div>
            </div>
        `;

        document.getElementById('modal-container').innerHTML = ModalForm({
            id: 'area-modal',
            title: 'Área',
            formContent: formContent
        });

        const formEl = document.getElementById('area-modal-form');
        formEl.addEventListener('submit', this.handleFormSubmit.bind(this));

        this.bsModal = new bootstrap.Modal(document.getElementById('area-modal'));
    }

    injectDynamicModalFields(area = null) {
        document.getElementById('nombreArea').value = area ? area.nombreArea : '';

        const formEl = document.getElementById('area-modal-form');
        formEl.querySelectorAll('.is-invalid').forEach(el => el.classList.remove('is-invalid'));
        document.getElementById('area-modal-title').textContent = area ? 'Editar Área' : 'Nueva Área';
    }

    openModal(id = null) {
        this.currentEditId = id;
        document.getElementById('area-modal-alert').innerHTML = '';

        let area = null;
        if (id) {
            area = this.areas.find(a => String(a.idArea) === String(id));
        }

        this.injectDynamicModalFields(area);
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
            nombreArea: document.getElementById('nombreArea').value
        };

        setModalLoading('area-modal', true);
        document.getElementById('area-modal-alert').innerHTML = '';

        try {
            if (this.currentEditId) {
                await updateArea(this.currentEditId, data);
            } else {
                await createArea(data);
            }

            this.bsModal.hide();
            this.showAlert('page-alert-container', 'success', `Área ${this.currentEditId ? 'actualizada' : 'creada'} correctamente.`);

            await this.loadData();

        } catch (error) {
            document.getElementById('area-modal-alert').innerHTML = AlertMessage({
                id: 'modal-error',
                type: 'danger',
                message: error.message
            });
        } finally {
            setModalLoading('area-modal', false);
        }
    }

    async handleDelete(id) {
        const area = this.areas.find(a => String(a.idArea) === String(id));
        if (!area) return;

        const confirm = await ConfirmDialog({
            title: '¿Eliminar Área?',
            message: `Vas a eliminar permanentemente el área <strong>${area.nombreArea}</strong>. Esta acción no se puede deshacer.`,
            confirmText: 'Sí, eliminar',
            cancelText: 'Cancelar'
        });

        if (confirm) {
            try {
                // Optimistic UI update
                const prev = [...this.areas];
                this.areas = this.areas.filter(a => String(a.idArea) !== String(id));
                this.renderTable();

                await deleteArea(id);
                this.showAlert('page-alert-container', 'success', 'Área eliminada del sistema.');
            } catch (error) {
                this.showAlert('page-alert-container', 'danger', `Error al eliminar: ${error.message}`);
                await this.loadData(); // revert
            }
        }
    }

    showAlert(containerId, type, message) {
        const container = document.getElementById(containerId);
        if (container) {
            container.innerHTML = AlertMessage({ id: `alert-${Date.now()}`, type, message });
            if (type === 'success') {
                setTimeout(() => { container.innerHTML = ''; }, 5000);
            }
        }
    }
}

document.addEventListener('DOMContentLoaded', () => {
    new AreasPage();
});
