import { ProtectedRoute } from '../components/ProtectedRoute.js';
import { Navbar, initNavbarEvents } from '../components/Navbar.js';
import { Sidebar, initSidebarEvents } from '../components/Sidebar.js';
import { DataTable } from '../components/DataTable.js';
import { ModalForm, setModalLoading } from '../components/ModalForm.js';
import { FormInput } from '../components/FormInput.js';
import { ConfirmDialog } from '../components/ConfirmDialog.js';
import { AlertMessage } from '../components/AlertMessage.js';
import { getAmbientes, createAmbiente, updateAmbiente, deleteAmbiente, getAreas } from '../utils/api.js';

class AmbientesPage {
    constructor() {
        new ProtectedRoute();
        this.appContainer = document.getElementById('app');
        this.ambientes = [];
        this.areas = [];
        this.currentEditId = null;

        // Parse search params
        const urlParams = new URLSearchParams(window.location.search);
        this.idSede = urlParams.get('idSede');
        this.nombreSede = urlParams.get('nombreSede') || 'Sede Seleccionada';

        if (!this.idSede) {
            // Optional: Redirect back to sedes if no idSede
            // window.location.href = '/sedes.html';
        }

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
        const pageTitle = this.idSede ? 'Ambientes de ' + this.nombreSede : 'Todos los Ambientes';
        const subtitle = this.idSede ? 'Gestionando ambientes vinculados a esta sede' : 'Administra todos los ambientes';

        this.appContainer.innerHTML = `
            ${Sidebar(currentPath)}
            
            <div class="main-wrapper">
                ${Navbar()}
                
                <main class="container-fluid p-4 flex-grow-1" style="background: var(--bg-page);">
                    
                    <!-- Breadcrumbs / Back navigation -->
                    ${this.idSede ? `
                    <nav aria-label="breadcrumb" class="mb-3">
                        <ol class="breadcrumb mb-0">
                            <li class="breadcrumb-item"><a href="/sedes.html" class="text-decoration-none" style="color: var(--primary-color);">Sedes</a></li>
                            <li class="breadcrumb-item active" aria-current="page">${this.nombreSede}</li>
                        </ol>
                    </nav>
                    ` : ''}

                    <div id="page-alert-container"></div>
                    
                    <!-- Page Header -->
                    <div class="d-flex flex-column flex-sm-row justify-content-between align-items-start align-items-sm-center mb-4 gap-3">
                        <div class="d-flex align-items-center gap-3">
                            <div class="page-icon">
                                <i class="bi bi-door-open-fill"></i>
                            </div>
                            <div>
                                <h4 class="fw-bold mb-0" style="color: var(--text-dark);">${pageTitle}</h4>
                                <small style="color: var(--text-muted);">${subtitle}</small>
                            </div>
                        </div>
                        
                        <button class="btn btn-purple d-flex align-items-center gap-2" id="btn-add-ambiente">
                            <i class="bi bi-plus-lg"></i>
                            <span>Nuevo Ambiente</span>
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
                        ${DataTable({ id: 'ambientes-table', columns: [], loading: true })}
                    </div>
                </main>
            </div>
            
            <!-- Modal Container -->
            <div id="modal-container"></div>
        `;

        document.getElementById('btn-add-ambiente').addEventListener('click', () => this.openModal());

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
            const areasData = await getAreas();
            this.areas = areasData.data || (Array.isArray(areasData) ? areasData : []);
        } catch (error) {
            console.error('Error al cargar áreas:', error);
            this.showAlert('page-alert-container', 'warning', 'No se pudieron cargar las áreas.');
        }
    }

    filterTable(query) {
        const q = query.toLowerCase().trim();
        if (!q) {
            this.renderTable(this.ambientes);
            return;
        }
        const filtered = this.ambientes.filter(a => {
            return (a.nombre && a.nombre.toLowerCase().includes(q)) ||
                (a.codigo && a.codigo.toLowerCase().includes(q)) ||
                (a.tipoAmbiente && a.tipoAmbiente.toLowerCase().includes(q)) ||
                (a.bloque && a.bloque.toLowerCase().includes(q)) ||
                (a.area && a.area.nombreArea && a.area.nombreArea.toLowerCase().includes(q)) ||
                (a.area_formacion && a.area_formacion.nombreArea && a.area_formacion.nombreArea.toLowerCase().includes(q));
        });
        this.renderTable(filtered);
    }

    async loadData() {
        try {
            const data = await getAmbientes();
            let allAmbientes = data.data || (Array.isArray(data) ? data : []);

            // Filter by Sede if we are viewing a specific Sede
            if (this.idSede) {
                this.ambientes = allAmbientes.filter(a => String(a.idSede) === String(this.idSede));
            } else {
                this.ambientes = allAmbientes;
            }

            this.renderTable();
        } catch (error) {
            this.showAlert('page-alert-container', 'danger', error.message || 'Error al cargar los ambientes.');
            document.getElementById('table-container').innerHTML = DataTable({ id: 'ambientes-table', columns: [], loading: false, data: [] });
        }
    }

    renderTable(data = null) {
        const displayData = data || this.ambientes;

        const columns = [
            { key: 'codigo', label: 'Código', icon: 'hash' },
            {
                key: 'descripcion',
                label: 'Descripción / Nombre',
                icon: 'door-open',
                render: (row) => row.descripcion || row.nombre || '<span class="text-muted">N/A</span>'
            },
            { key: 'bloque', label: 'Bloque', icon: 'building' },
            { key: 'capacidad', label: 'Capacidad', icon: 'people' },
            { key: 'tipoAmbiente', label: 'Tipo Formación', icon: 'easel' },
            {
                key: 'area',
                label: 'Área',
                icon: 'tags',
                render: (row) => {
                    const objArea = row.area || row.area_formacion;
                    return objArea && objArea.nombreArea ? objArea.nombreArea : '<span class="text-muted">N/A</span>';
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
                        <button class="btn-action edit btn-edit" data-id="${row.idAmbiente}" title="Editar">
                            <i class="bi bi-pencil-square"></i>
                        </button>
                        <button class="btn-action delete btn-delete" data-id="${row.idAmbiente}" title="Eliminar">
                            <i class="bi bi-trash"></i>
                        </button>
                    </div>
                `
            }
        ];

        document.getElementById('table-container').innerHTML = DataTable({
            id: 'ambientes-table',
            columns: columns,
            data: displayData
        });

        // Inicializar DataTables con botones
        if (typeof $ !== 'undefined' && $.fn.dataTable) {
            this.dtInstance = $('#ambientes-table').DataTable({
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
        const areaOptions = this.areas.map(a =>
            '<option value="' + a.idArea + '">' + a.nombreArea + '</option>'
        ).join('');

        const formContent = `
            <div class="row g-3">
                <div class="col-md-4">
                    ${FormInput({ id: 'codigo', label: 'Código', required: true })}
                </div>
                <div class="col-md-8">
                    ${FormInput({ id: 'descripcion', label: 'Descripción / Nombre', required: true })}
                </div>
                <div class="col-md-4">
                    ${FormInput({ id: 'numero', label: 'Número de Ambiente', type: 'number', required: true })}
                </div>
                <div class="col-md-4">
                    ${FormInput({ id: 'capacidad', label: 'Capacidad', type: 'number', required: true })}
                </div>
                <div class="col-md-4">
                    ${FormInput({ id: 'bloque', label: 'Bloque (ej. L, D)', required: true })}
                </div>
                
                <div class="col-md-4">
                    <div class="mb-4 form-floating position-relative">
                        <select class="form-select" id="tipoAmbiente" required style="background-color: #f8fafc; border: 1px solid #eeecf5; border-radius: 0.6rem;">
                            <option value="">Seleccione tipo...</option>
                            <option value="Bilinguismo">Bilinguismo</option>
                            <option value="Formacion">Formacion</option>
                            <option value="Taller">Taller</option>
                        </select>
                        <label for="tipoAmbiente">Tipo de Ambiente</label>
                    </div>
                </div>
                <div class="col-md-4">
                    <div class="mb-4 form-floating position-relative">
                        <select class="form-select" id="idArea" required style="background-color: #f8fafc; border: 1px solid #eeecf5; border-radius: 0.6rem;">
                            <option value="">Seleccione área...</option>
                            ${areaOptions}
                        </select>
                        <label for="idArea">Área de Formación</label>
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
            id: 'ambiente-modal',
            title: 'Ambiente',
            formContent: formContent
        });

        const formEl = document.getElementById('ambiente-modal-form');
        formEl.addEventListener('submit', this.handleFormSubmit.bind(this));

        this.bsModal = new bootstrap.Modal(document.getElementById('ambiente-modal'));
    }

    injectDynamicModalFields(ambiente = null) {
        document.getElementById('codigo').value = ambiente ? ambiente.codigo : '';
        document.getElementById('descripcion').value = ambiente ? ambiente.descripcion : '';
        document.getElementById('numero').value = ambiente ? ambiente.numero : '';
        document.getElementById('capacidad').value = ambiente ? ambiente.capacidad : '';
        document.getElementById('bloque').value = ambiente ? ambiente.bloque : '';
        document.getElementById('tipoAmbiente').value = ambiente ? (ambiente.tipoAmbiente || '') : '';
        document.getElementById('estado').value = ambiente ? (ambiente.estado || 'Activo') : 'Activo';
        document.getElementById('idArea').value = ambiente ? (ambiente.idArea || '') : '';

        const formEl = document.getElementById('ambiente-modal-form');
        formEl.querySelectorAll('.is-invalid').forEach(el => el.classList.remove('is-invalid'));
        document.getElementById('ambiente-modal-title').textContent = ambiente ? 'Editar Ambiente' : 'Nuevo Ambiente';
    }

    openModal(id = null) {
        this.currentEditId = id;
        document.getElementById('ambiente-modal-alert').innerHTML = '';

        let ambiente = null;
        if (id) {
            ambiente = this.ambientes.find(a => String(a.idAmbiente) === String(id));
        }

        this.injectDynamicModalFields(ambiente);
        this.bsModal.show();
    }

    async handleFormSubmit(e) {
        e.preventDefault();
        const form = e.target;
        if (!form.checkValidity()) {
            form.reportValidity();
            return;
        }

        // Si tenemos un idSede en la URL, lo usamos automáticamente.
        // Si no estamos filtrando por sede y estamos creando sin sede, esto fallará en el backend.
        // Asumo que el flujo normal es acceder a ambientes desde sedes.
        if (!this.idSede && !this.currentEditId) {
            this.showAlert('page-alert-container', 'danger', 'No puedes crear un ambiente si no has seleccionado una sede previamente. Ve a Sedes e ingresa a Ambientes desde ahí.');
            this.bsModal.hide();
            return;
        }

        let sedId = this.idSede;
        if (this.currentEditId) {
            const tempEnv = this.ambientes.find(a => String(a.idAmbiente) === String(this.currentEditId));
            if (tempEnv) sedId = tempEnv.idSede;
        }

        const data = {
            codigo: document.getElementById('codigo').value,
            descripcion: document.getElementById('descripcion').value,
            numero: document.getElementById('numero').value,
            capacidad: parseInt(document.getElementById('capacidad').value),
            bloque: document.getElementById('bloque').value,
            tipoAmbiente: document.getElementById('tipoAmbiente').value,
            estado: document.getElementById('estado').value,
            idArea: parseInt(document.getElementById('idArea').value),
            idSede: parseInt(sedId)
        };

        setModalLoading('ambiente-modal', true);
        document.getElementById('ambiente-modal-alert').innerHTML = '';

        try {
            if (this.currentEditId) {
                await updateAmbiente(this.currentEditId, data);
            } else {
                await createAmbiente(data);
            }

            this.bsModal.hide();
            const actionText = this.currentEditId ? 'actualizado' : 'creado';
            this.showAlert('page-alert-container', 'success', 'Ambiente ' + actionText + ' correctamente.');

            await this.loadData();

        } catch (error) {
            document.getElementById('ambiente-modal-alert').innerHTML = AlertMessage({
                id: 'modal-error',
                type: 'danger',
                message: error.message
            });
        } finally {
            setModalLoading('ambiente-modal', false);
        }
    }

    async handleDelete(id) {
        const ambiente = this.ambientes.find(a => String(a.idAmbiente) === String(id));
        if (!ambiente) return;

        const nombre = ambiente.descripcion || ambiente.codigo;

        const confirm = await ConfirmDialog({
            title: '¿Eliminar Ambiente?',
            message: 'Vas a eliminar permanentemente el ambiente <strong>' + nombre + '</strong>. Esta acción no se puede deshacer.',
            confirmText: 'Sí, eliminar',
            cancelText: 'Cancelar'
        });

        if (confirm) {
            try {
                // Optimistic UI update
                const prev = [...this.ambientes];
                this.ambientes = this.ambientes.filter(a => String(a.idAmbiente) !== String(id));
                this.renderTable();

                await deleteAmbiente(id);
                this.showAlert('page-alert-container', 'success', 'Ambiente eliminado del sistema.');
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
    new AmbientesPage();
});
