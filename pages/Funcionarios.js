import { ProtectedRoute } from '../components/ProtectedRoute.js';
import { Navbar, initNavbarEvents } from '../components/Navbar.js';
import { Sidebar, initSidebarEvents } from '../components/Sidebar.js';
import { DataTable } from '../components/DataTable.js';
import { ModalForm, setModalLoading, FormSelect } from '../components/ModalForm.js';
import { FormInput } from '../components/FormInput.js';
import { ConfirmDialog } from '../components/ConfirmDialog.js';
import { AlertMessage } from '../components/AlertMessage.js';
import { getFuncionarios, createFuncionario, updateFuncionario, deleteFuncionario, getTiposContrato } from '../utils/api.js';

class FuncionariosPage {
    constructor() {
        new ProtectedRoute();
        this.appContainer = document.getElementById('app');
        this.funcionarios = [];
        this.tiposContrato = [];
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
                                <i class="bi bi-people-fill"></i>
                            </div>
                            <div>
                                <h4 class="fw-bold mb-0" style="color: var(--text-dark);">Instructores</h4>
                                <small style="color: var(--text-muted);">Administra los instructores</small>
                            </div>
                        </div>
                        
                        <button class="btn btn-purple d-flex align-items-center gap-2" id="btn-add-funcionario">
                            <i class="bi bi-plus-lg"></i>
                            <span>Nuevo Instructor</span>
                        </button>
                    </div>

                    <!-- Toolbar -->
                    <div class="d-flex flex-wrap justify-content-between align-items-center mb-3 gap-2">
                        <div class="btn-group btn-group-sm" role="group">
                            <button class="btn btn-dark rounded-start-pill px-3">Columnas <i class="bi bi-chevron-down ms-1"></i></button>
                            <button class="btn btn-dark px-3">Excel</button>
                            <button class="btn btn-dark px-3">PDF</button>
                            <button class="btn btn-dark rounded-end-pill px-3">Print</button>
                        </div>
                        <div class="d-flex align-items-center gap-2">
                            <label class="mb-0 fw-medium" style="color: var(--text-muted); font-size: 0.85rem;">Search:</label>
                            <input type="text" class="form-control form-control-sm" style="max-width: 200px; border-color: var(--border-color); border-radius: 0.4rem;" placeholder="" id="search-input">
                        </div>
                    </div>

                    <!-- Table Container -->
                    <div id="table-container">
                        ${DataTable({ id: 'funcionarios-table', columns: [], loading: true })}
                    </div>
                </main>
            </div>
            
            <!-- Modal Container -->
            <div id="modal-container"></div>
        `;

        document.getElementById('btn-add-funcionario').addEventListener('click', () => this.openModal());

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
            this.renderTable(this.funcionarios);
            return;
        }
        const filtered = this.funcionarios.filter(f => {
            return (f.nombre && f.nombre.toLowerCase().includes(q)) ||
                (f.documento && f.documento.toLowerCase().includes(q)) ||
                (f.correo && f.correo.toLowerCase().includes(q)) ||
                (f.telefono && f.telefono.toLowerCase().includes(q));
        });
        this.renderTable(filtered);
    }

    async loadData() {
        try {
            const [funcionariosData, contratosData] = await Promise.all([
                getFuncionarios(),
                getTiposContrato()
            ]);

            this.funcionarios = funcionariosData.data || (Array.isArray(funcionariosData) ? funcionariosData : []);
            this.tiposContrato = contratosData.data || (Array.isArray(contratosData) ? contratosData : []);

            this.renderTable();
        } catch (error) {
            this.showAlert('page-alert-container', 'danger', error.message || 'Error al cargar los datos.');
            document.getElementById('table-container').innerHTML = DataTable({ id: 'funcionarios-table', columns: [], loading: false, data: [] });
        }
    }

    renderTable(data = null) {
        const displayData = data || this.funcionarios;

        const columns = [
            { key: 'nombre', label: 'Nombre', icon: 'person' },
            { key: 'correo', label: 'Correo', icon: 'envelope' },
            { key: 'telefono', label: 'Teléfono', icon: 'telephone' },
            {
                key: 'estado',
                label: 'Estado',
                icon: 'circle-fill',
                render: (row) => {
                    const isActive = row.estado && row.estado.toLowerCase() === 'activo';
                    return `<span class="badge-status ${isActive ? 'active' : 'inactive'}">${row.estado || 'N/A'}</span>`;
                }
            },
            {
                key: 'tipo_contrato',
                label: 'Tipo Contrato',
                icon: 'file-earmark-text',
                render: (row) => row.tipo_contrato ? row.tipo_contrato.nombre : 'N/A'
            },
            {
                key: 'acciones',
                label: '',
                render: (row) => `
                    <div class="d-flex gap-1">
                        <button class="btn-action edit btn-edit" data-id="${row.idFuncionario}" title="Editar">
                            <i class="bi bi-pencil-square"></i>
                        </button>
                        <button class="btn-action delete btn-delete" data-id="${row.idFuncionario}" title="Eliminar">
                            <i class="bi bi-trash"></i>
                        </button>
                    </div>
                `
            }
        ];

        document.getElementById('table-container').innerHTML = DataTable({
            id: 'funcionarios-table',
            columns: columns,
            data: displayData
        });

        // Event Listeners
        document.querySelectorAll('.btn-edit').forEach(btn => {
            btn.addEventListener('click', (e) => this.openModal(e.currentTarget.dataset.id));
        });

        document.querySelectorAll('.btn-delete').forEach(btn => {
            btn.addEventListener('click', (e) => this.handleDelete(e.currentTarget.dataset.id));
        });
    }

    setupModal() {
        const estOptions = [
            { id: 'ACTIVO', nombre: 'ACTIVO' },
            { id: 'INACTIVO', nombre: 'INACTIVO' }
        ];

        const formContent = `
            <div class="row g-3">
                <div class="col-md-6">
                    ${FormInput({ id: 'nombre', label: 'Nombre Completo', required: true })}
                </div>
                <div class="col-md-6">
                    ${FormInput({ id: 'documento', label: 'Documento ID', required: true })}
                </div>
                <div class="col-md-6">
                    ${FormInput({ id: 'correo', label: 'Correo Electrónico', type: 'email', required: true })}
                </div>
                <div class="col-md-6">
                    ${FormInput({ id: 'telefono', label: 'Teléfono', required: true })}
                </div>
                <div class="col-md-6">
                    ${FormInput({ id: 'password', label: 'Contraseña (Opcional en edición)', type: 'password' })}
                </div>
                <div class="col-md-6">
                    <div id="tipoContrato-wrapper"></div>
                </div>
                <div class="col-md-6">
                    ${FormSelect({ id: 'estado', label: 'Estado', options: estOptions, required: true })}
                </div>
            </div>
        `;

        document.getElementById('modal-container').innerHTML = ModalForm({
            id: 'funcionario-modal',
            title: 'Funcionario',
            formContent: formContent
        });

        const formEl = document.getElementById('funcionario-modal-form');
        formEl.addEventListener('submit', this.handleFormSubmit.bind(this));

        this.bsModal = new bootstrap.Modal(document.getElementById('funcionario-modal'));
    }

    injectDynamicModalFields(funcionario = null) {
        document.getElementById('tipoContrato-wrapper').innerHTML = FormSelect({
            id: 'idTipoContrato',
            label: 'Tipo de Contrato',
            options: this.tiposContrato,
            valueKey: 'idTipoContrato',
            textKey: 'nombre',
            selectedValue: funcionario ? funcionario.idTipoContrato : '',
            required: true
        });

        document.getElementById('nombre').value = funcionario ? funcionario.nombre : '';
        document.getElementById('documento').value = funcionario ? funcionario.documento : '';
        document.getElementById('correo').value = funcionario ? funcionario.correo : '';
        document.getElementById('telefono').value = funcionario ? funcionario.telefono : '';
        document.getElementById('estado').value = funcionario ? funcionario.estado : '';
        document.getElementById('password').value = '';

        const formEl = document.getElementById('funcionario-modal-form');
        formEl.querySelectorAll('.is-invalid').forEach(el => el.classList.remove('is-invalid'));
        document.getElementById('funcionario-modal-title').textContent = funcionario ? 'Editar Instructor' : 'Nuevo Instructor';
        document.getElementById('password').required = !funcionario;
    }

    openModal(id = null) {
        this.currentEditId = id;
        document.getElementById('funcionario-modal-alert').innerHTML = '';

        let funcionario = null;
        if (id) {
            funcionario = this.funcionarios.find(f => String(f.idFuncionario) === String(id));
        }

        this.injectDynamicModalFields(funcionario);
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
            documento: document.getElementById('documento').value,
            correo: document.getElementById('correo').value,
            telefono: document.getElementById('telefono').value,
            estado: document.getElementById('estado').value,
            idTipoContrato: document.getElementById('idTipoContrato').value
        };

        const pwd = document.getElementById('password').value;
        if (pwd) {
            data.password = pwd;
        }

        setModalLoading('funcionario-modal', true);
        document.getElementById('funcionario-modal-alert').innerHTML = '';

        try {
            if (this.currentEditId) {
                await updateFuncionario(this.currentEditId, data);
            } else {
                await createFuncionario(data);
            }

            this.bsModal.hide();
            this.showAlert('page-alert-container', 'success', `Instructor ${this.currentEditId ? 'actualizado' : 'creado'} correctamente.`);

            await this.loadData();

        } catch (error) {
            document.getElementById('funcionario-modal-alert').innerHTML = AlertMessage({
                id: 'modal-error',
                type: 'danger',
                message: error.message
            });
        } finally {
            setModalLoading('funcionario-modal', false);
        }
    }

    async handleDelete(id) {
        const funcionario = this.funcionarios.find(f => String(f.idFuncionario) === String(id));
        if (!funcionario) return;

        const confirm = await ConfirmDialog({
            title: '¿Mover a papelera?',
            message: `Vas a eliminar permanentemente al instructor <strong>${funcionario.nombre}</strong>. Esta acción no se puede deshacer.`,
            confirmText: 'Sí, eliminar',
            cancelText: 'Cancelar'
        });

        if (confirm) {
            try {
                const prev = [...this.funcionarios];
                this.funcionarios = this.funcionarios.filter(f => String(f.idFuncionario) !== String(id));
                this.renderTable();

                await deleteFuncionario(id);
                this.showAlert('page-alert-container', 'success', 'Instructor eliminado del sistema.');
            } catch (error) {
                this.showAlert('page-alert-container', 'danger', `Error al eliminar: ${error.message}`);
                await this.loadData();
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
    new FuncionariosPage();
});
