import { ProtectedRoute } from '../components/ProtectedRoute.js';
import { Navbar, initNavbarEvents } from '../components/Navbar.js';
import { Sidebar, initSidebarEvents } from '../components/Sidebar.js';
import { DataTable, initTablePagination } from '../components/DataTable.js';
import { ModalForm, setModalLoading, FormSelect } from '../components/ModalForm.js';
import { FormInput } from '../components/FormInput.js';
import { ConfirmDialog } from '../components/ConfirmDialog.js';
import { AlertMessage } from '../components/AlertMessage.js';
import { getFuncionarios, createFuncionario, createAdmin, updateFuncionario, deleteFuncionario, getTiposContrato, getAreas, getHorarioPorInstructor, enviarHorario, importarFuncionarios, exportarFuncionarios } from '../utils/api.js?v=1.1';


function showDateRangeModal(titulo = 'Seleccionar período', subtitulo = '') {
    return new Promise((resolve) => {
        const modalId = `date-range-modal-${Date.now()}`;

        const hoy = new Date();
        const primerDia = new Date(hoy.getFullYear(), hoy.getMonth(), 1)
            .toISOString().split('T')[0];
        const ultimoDia = new Date(hoy.getFullYear(), hoy.getMonth() + 1, 0)
            .toISOString().split('T')[0];

        const html = `
            <div class="modal fade" id="${modalId}" tabindex="-1" data-bs-backdrop="static">
                <div class="modal-dialog modal-dialog-centered" style="max-width:420px;">
                    <div class="modal-content border-0 shadow-lg rounded-4">

                        <div class="modal-header text-white"
                             style="background: var(--primary-gradient);">
                            <h5 class="modal-title">
                                <i class="bi bi-calendar-range"></i> ${titulo}
                            </h5>
                            <button class="btn-close btn-close-white" id="${modalId}-cancel-x"></button>
                        </div>

                        <div class="modal-body">
                            <div class="mb-3">
                                <label>Fecha inicio</label>
                                <input type="date" id="${modalId}-inicio" class="form-control" value="${primerDia}">
                            </div>
                            <div>
                                <label>Fecha fin</label>
                                <input type="date" id="${modalId}-fin" class="form-control" value="${ultimoDia}">
                            </div>
                            <div id="${modalId}-error" class="text-danger small mt-2 d-none"></div>
                        </div>

                        <div class="modal-footer">
                            <button class="btn btn-light" id="${modalId}-cancel">Cancelar</button>
                            <button class="btn btn-primary" id="${modalId}-confirm">Enviar</button>
                        </div>
                    </div>
                </div>
            </div>
        `;

        document.body.insertAdjacentHTML('beforeend', html);
        const modalEl = document.getElementById(modalId);
        const bsModal = new bootstrap.Modal(modalEl);

        document.getElementById(`${modalId}-confirm`).onclick = () => {
            const inicio = document.getElementById(`${modalId}-inicio`).value;
            const fin = document.getElementById(`${modalId}-fin`).value;
            const error = document.getElementById(`${modalId}-error`);

            if (!inicio || !fin) {
                error.textContent = 'Ambas fechas son obligatorias';
                error.classList.remove('d-none');
                return;
            }

            if (fin < inicio) {
                error.textContent = 'Fecha fin inválida';
                error.classList.remove('d-none');
                return;
            }

            bsModal.hide();
            resolve({ fechaInicio: inicio, fechaFin: fin });
        };

        const cancel = () => {
            bsModal.hide();
            resolve(null);
        };

        document.getElementById(`${modalId}-cancel`).onclick = cancel;
        document.getElementById(`${modalId}-cancel-x`).onclick = cancel;

        modalEl.addEventListener('hidden.bs.modal', () => modalEl.remove());

        bsModal.show();
    });
}


class FuncionariosPage {
    constructor() {
        new ProtectedRoute();
        this.appContainer = document.getElementById('app');
        this.funcionarios = [];
        this.tiposContrato = [];
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
                            <button id="btn-export-db" class="btn btn-success px-3" title="Exportar DB" style="border-left: 1px solid rgba(255,255,255,0.2);">
                                <i class="bi bi-download"></i> Exportar
                            </button>
                            <button id="btn-import-db" class="btn btn-primary rounded-end-pill px-3" title="Importar DB">
                                <i class="bi bi-upload"></i> Importar
                            </button>
                            <input type="file" id="file-import-db" accept=".xlsx, .xls, .csv" style="display:none;">
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

            <!-- Modal: Horario del Instructor -->
            <div class="modal fade" id="modalHorarioInstructor" tabindex="-1" aria-hidden="true">
                <div class="modal-dialog modal-xl modal-dialog-centered modal-dialog-scrollable">
                    <div class="modal-content border-0 shadow-lg" style="border-radius:1rem; overflow:hidden;">
                        <!-- Header -->
                        <div class="modal-header text-white border-0 px-4 py-3"
                             style="background:linear-gradient(135deg,var(--primary) 0%,var(--primary-dark) 100%);">
                            <h5 class="modal-title fw-bold d-flex align-items-center gap-2" id="modal-horario-instructor-title">
                                <i class="bi bi-calendar-week"></i> Horario del Instructor
                            </h5>
                            <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal"></button>
                        </div>
                        <!-- Body -->
                        <div class="modal-body p-4" style="background:var(--bg-page); min-height:500px;">
                            <div id="modal-horario-body">
                                <div class="text-center py-5 text-muted">
                                    <div class="spinner-border text-primary mb-3" role="status"></div>
                                    <p class="small">Cargando horario...</p>
                                </div>
                            </div>
                        </div>
                        <!-- Footer -->
                        <div class="modal-footer border-0 px-4 py-3" style="background: var(--bg-page); justify-content: center; border-top: 1px solid var(--border-color) !important;">
                            <button type="button" class="btn btn-primary d-flex align-items-center gap-2 px-4 py-2 shadow-sm" id="btn-enviar-horario" style="border-radius: 0.5rem; font-weight: 500; background-color: var(--primary); border: none;">
                                <i class="bi bi-envelope-paper"></i>
                                <span>Enviar horario</span>
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        `;

        document.getElementById('btn-add-funcionario').addEventListener('click', () => this.openModal());

        document.getElementById('btn-enviar-horario').addEventListener('click', async (e) => {
            const btn = e.currentTarget;
            const idInstructor = btn.dataset.id;
            
            if (!idInstructor) return;
            
            this.enviarHorarioPorCorreo(idInstructor, btn);
        });

        const searchInput = document.getElementById('search-input');
        if (searchInput) {
            searchInput.addEventListener('input', (e) => {
                this.filterTable(e.target.value);
            });
        }

        document.getElementById('btn-export-db').addEventListener('click', async () => {
            try {
                this.showAlert('page-alert-container', 'info', 'Descargando archivo...');
                await exportarFuncionarios();
            } catch (err) {
                this.showAlert('page-alert-container', 'danger', err.message || 'Error al descargar');
            }
        });

        const fileInput = document.getElementById('file-import-db');
        document.getElementById('btn-import-db').addEventListener('click', () => {
            fileInput.click();
        });

        fileInput.addEventListener('change', async (e) => {
            const file = e.target.files[0];
            if (!file) return;

            try {
                Swal.fire({
                    title: 'Importando...',
                    text: 'Por favor espera mientras se procesa el archivo.',
                    allowOutsideClick: false,
                    didOpen: () => {
                        Swal.showLoading();
                    }
                });
                
                const res = await importarFuncionarios(file);
                
                let title = '¡Importación finalizada!';
                let text = `Se importaron/actualizaron <strong>${res.importados || 0}</strong> instructores.`;
                let icon = 'success';

                if (res.con_errores > 0) {
                    icon = 'warning';
                    const errores = res.errores || [];
                    // Mostrar los primeros 5 errores para diagnóstico
                    const muestra = errores.slice(0, 5).map(e => {
                        const msgs = Array.isArray(e.errores) ? e.errores.join(', ') : JSON.stringify(e.errores);
                        return `<li>Fila <b>${e.fila}</b> · <em>${e.columna}</em>: ${msgs}</li>`;
                    }).join('');
                    const extra = errores.length > 5
                        ? `<li class="text-muted">… y ${errores.length - 5} más.</li>`
                        : '';

                    text += `
                        <br><br>
                        <span class="text-danger fw-medium">
                            <i class="bi bi-exclamation-triangle"></i>
                            Hubo <b>${res.con_errores}</b> filas con errores:
                        </span>
                        <ul class="text-start mt-2 mb-0 small" style="max-height:160px;overflow-y:auto;">
                            ${muestra}${extra}
                        </ul>`;
                }
                
                Swal.fire({
                    title: title,
                    html: text,
                    icon: icon,
                    confirmButtonColor: '#4caa16',
                    confirmButtonText: 'Aceptar'
                });

                await this.loadData();
            } catch (err) {
                Swal.fire({
                    title: 'Error al importar',
                    text: err.message || 'Ocurrió un error al leer el archivo.',
                    icon: 'error',
                    confirmButtonColor: '#d33',
                    confirmButtonText: 'Aceptar'
                });
            } finally {
                e.target.value = ''; // Reset input
            }
        });
    }

    filterTable(query) {
        const q = query.toLowerCase().trim();
        if (!q) {
            this.renderTable(this.funcionarios);
            return;
        }
        const filtered = this.funcionarios.filter(f => {
            return (f.nombre    && f.nombre.toLowerCase().includes(q)) ||
                   (f.documento && f.documento.toLowerCase().includes(q)) ||
                   (f.correo    && f.correo.toLowerCase().includes(q)) ||
                   (f.telefono  && f.telefono.toLowerCase().includes(q));
        });
        this.renderTable(filtered);
    }

    async loadData() {
        try {
            const [funcionariosData, contratosData, areasData] = await Promise.all([
                getFuncionarios(),
                getTiposContrato(),
                getAreas()
            ]);

            this.funcionarios  = funcionariosData.data || (Array.isArray(funcionariosData) ? funcionariosData : []);
            this.tiposContrato = contratosData.data    || (Array.isArray(contratosData)    ? contratosData    : []);
            this.areas         = areasData.data        || (Array.isArray(areasData)        ? areasData        : []);

            this.renderTable();
        } catch (error) {
            this.showAlert('page-alert-container', 'danger', error.message || 'Error al cargar los datos.');
            document.getElementById('table-container').innerHTML = DataTable({ id: 'funcionarios-table', columns: [], loading: false, data: [] });
        }
    }

    // ── Helpers para leer tipo de contrato sin importar la forma que llegue del backend ──
    _getTipoContratoNombre(row) {
        // Caso 1: objeto anidado  { tipoContrato: { nombreTipoContrato: '...' } }
        if (row.tipoContrato?.nombreTipoContrato) return row.tipoContrato.nombreTipoContrato;
        // Caso 2: objeto anidado con campo 'nombre'  { tipoContrato: { nombre: '...' } }
        if (row.tipoContrato?.nombre)             return row.tipoContrato.nombre;
        // Caso 3: campo plano  { nombreTipoContrato: '...' }
        if (row.nombreTipoContrato)               return row.nombreTipoContrato;
        // Caso 4: buscar en el array local por ID
        const id = row.idTipoContrato ?? row.tipoContrato?.idTipoContrato;
        if (id) {
            const found = this.tiposContrato.find(t => String(t.idTipoContrato) === String(id));
            if (found) return found.nombreTipoContrato || found.nombre || '';
        }
        return '';
    }

    _getTipoContratoId(row) {
        return row.idTipoContrato
            ?? row.tipoContrato?.idTipoContrato
            ?? '';
    }

    renderTable(data = null) {
        const displayData = data || this.funcionarios;

        const columns = [
            { key: 'nombre',   label: 'Nombre',   icon: 'person',   render: (row) => `${row.nombre || ''} ${row.apellido || ''}`.trim() },
            { key: 'correo',   label: 'Correo',   icon: 'envelope'  },
            { key: 'telefono', label: 'Teléfono', icon: 'telephone' },
            {
                key: 'estado',
                label: 'Estado',
                icon: 'circle-fill',
                render: (row) => {
                    const isActive = row.estado && row.estado.toLowerCase() === 'activo';
                    return `<span class="badge-status ${isActive ? 'active' : 'inactive'}">${row.estado || ''}</span>`;
                }
            },
            {
                key: 'tipoContrato',
                label: 'Tipo Contrato',
                icon: 'file-earmark-text',
                render: (row) => {
                    const nombre = this._getTipoContratoNombre(row);
                    return nombre
                        ? `<span>${nombre}</span>`
                        : `<span class="text-muted small">Sin asignar</span>`;
                }
            },
            {
                key: 'areas',
                label: 'Áreas',
                icon: 'tags',
                render: (row) => {
                    if (!row.areas || row.areas.length === 0)
                        return '<span class="text-muted small">Ninguna</span>';
                    const maxDisplay = 2;
                    let html = row.areas.slice(0, maxDisplay)
                        .map(a => `<span class="badge bg-light text-dark border me-1 mb-1 fw-normal">${a.nombreArea}</span>`)
                        .join('');
                    if (row.areas.length > maxDisplay) {
                        html += `<span class="badge bg-secondary text-white fw-normal">+${row.areas.length - maxDisplay}</span>`;
                    }
                    return `<div class="d-flex flex-wrap" style="max-width: 180px;">${html}</div>`;
                }
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
                        <button class="btn-action btn-ver-horario" data-id="${row.idFuncionario}" data-nombre="${row.nombre}" title="Ver Horario" style="color:var(--primary);">
                            <i class="bi bi-calendar-week"></i>
                        </button>
                    </div>
                `
            }
        ];

        document.getElementById('table-container').innerHTML = DataTable({
            id: 'funcionarios-table',
            columns,
            data: displayData
        });

        initTablePagination('funcionarios-table', displayData, columns, '#table-container');

        document.querySelectorAll('.btn-edit').forEach(btn => {
            btn.addEventListener('click', (e) => this.openModal(e.currentTarget.dataset.id));
        });
        document.querySelectorAll('.btn-delete').forEach(btn => {
            btn.addEventListener('click', (e) => this.handleDelete(e.currentTarget.dataset.id));
        });
        document.querySelectorAll('.btn-ver-horario').forEach(btn => {
            btn.addEventListener('click', (e) => {
                this.verHorario(e.currentTarget.dataset.id, e.currentTarget.dataset.nombre);
            });
        });
    }

    bindToolbarButtons() {}

    setupModal() {
        const estOptions = [
            { id: 'ACTIVO',   nombre: 'ACTIVO'   },
            { id: 'INACTIVO', nombre: 'INACTIVO' }
        ];

        const formContent = `
            <style>
                #funcionario-modal .view-slide { display: none; }
                #funcionario-modal .view-slide.active { display: block; animation: funcFadeIn 0.18s ease; }
                #funcionario-modal .segmented-control {
                    display: flex;
                    background: #f1f5f9;
                    padding: 0.25rem;
                    border-radius: 0.5rem;
                    position: relative;
                }
                #funcionario-modal .segmented-control-item {
                    flex: 1;
                    text-align: center;
                    position: relative;
                    z-index: 1;
                }
                #funcionario-modal .segmented-control-input {
                    display: none;
                }
                #funcionario-modal .segmented-control-label {
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    gap: 0.4rem;
                    padding: 0.35rem 0.5rem;
                    margin: 0;
                    cursor: pointer;
                    font-size: 0.82rem;
                    font-weight: 500;
                    color: #64748b;
                    border-radius: 0.4rem;
                    transition: all 0.25s ease;
                }
                #funcionario-modal .segmented-control-label:hover {
                    color: #334155;
                }
                #funcionario-modal .segmented-control-input:checked + .segmented-control-label {
                    color: var(--primary);
                    background: #ffffff;
                    box-shadow: 0 2px 6px rgba(0,0,0,0.06);
                    font-weight: 600;
                }
            </style>

            <!-- VISTA 1: FORMULARIO PRINCIPAL -->
            <div class="view-slide active" id="view-funcionario-form">
                <div class="row g-3">
                    
                    <!-- Selección de Tipo de Usuario (Solo Creación) -->
                    <div class="col-12 mb-2" id="tipo-usuario-section" style="display:none;">
                        <div class="d-flex flex-column flex-sm-row justify-content-between align-items-start align-items-sm-center gap-2" style="background: #f8fafc; border: 1px solid #eeecf5; border-radius: 0.6rem; padding: 0.75rem 1rem;">
                            <div>
                                <label class="form-label fw-semibold mb-0" style="color:var(--text-dark); font-size: 0.9rem;">
                                    Rol del usuario
                                </label>
                                <div class="small text-muted mt-1" style="font-size: 0.75rem;">El rol define los permisos del usuario en el sistema.</div>
                            </div>
                            <div class="segmented-control w-100" style="max-width: 250px;">
                                <div class="segmented-control-item">
                                    <input class="segmented-control-input" type="radio" name="tipo_usuario_radio" id="radioInstructor" value="instructor" checked>
                                    <label class="segmented-control-label" for="radioInstructor">
                                        <i class="bi bi-person-video3"></i> Instructor
                                    </label>
                                </div>
                                <div class="segmented-control-item">
                                    <input class="segmented-control-input" type="radio" name="tipo_usuario_radio" id="radioCoordinador" value="coordinador">
                                    <label class="segmented-control-label" for="radioCoordinador">
                                        <i class="bi bi-calendar2-check"></i> Coordinador
                                    </label>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div class="col-md-6">
                        ${FormInput({ id: 'nombre',    label: 'Nombre',      required: true })}
                    </div>
                    <div class="col-md-6">
                        ${FormInput({ id: 'apellido',    label: 'Apellido',      required: true })}
                    </div>
                    <div class="col-md-6">
                        ${FormInput({ id: 'documento', label: 'Documento ID',         required: true })}
                    </div>
                    <div class="col-md-6">
                        ${FormInput({ id: 'correo',    label: 'Correo Electrónico',   type: 'email', required: true })}
                    </div>
                    <div class="col-md-6">
                        ${FormInput({ id: 'telefono',  label: 'Teléfono',             required: true })}
                    </div>

                    <!-- Campo contraseña: solo visible en modo editar -->
                    <div class="col-md-6" id="password-section" style="display:none;">
                        <div class="mb-4 position-relative" style="background:#f8fafc; border:1px solid #eeecf5; border-radius:0.6rem; padding: 0.1rem 0 0 0;">
                            <div class="input-group" style="border-radius:0.6rem; overflow:hidden;">
                                <input type="password" class="form-control" id="password-new"
                                       placeholder=" "
                                       style="background:#f8fafc; border:none; border-radius:0.6rem 0 0 0.6rem; padding-top:1.4rem; padding-bottom:0.3rem; height:3.4rem;">
                                <button type="button"
                                        style="background:#f8fafc; border:none; border-left:1px solid #eeecf5; padding: 0 0.9rem; cursor:pointer;"
                                        onclick="
                                            const inp = document.getElementById('password-new');
                                            const ico = this.querySelector('i');
                                            if(inp.type==='password'){ inp.type='text'; ico.className='bi bi-eye-slash text-muted'; }
                                            else { inp.type='password'; ico.className='bi bi-eye text-muted'; }
                                        ">
                                    <i class="bi bi-eye text-muted"></i>
                                </button>
                            </div>
                            <label style="position:absolute; top:0.5rem; left:0.85rem; font-size:0.75rem; color:var(--primary); font-weight:500; pointer-events:none;">
                                <i class="bi bi-lock me-1"></i>Nueva contraseña
                            </label>
                            <small id="password-hint" class="d-block px-2 pb-1 mt-1" style="font-size:0.73rem; color:#888;">
                                <i class="bi bi-info-circle me-1"></i>Por defecto: <strong id="password-hint-value" style="color:var(--text-dark);">—</strong> · Deja vacío para no cambiar
                            </small>
                        </div>
                    </div>

                    <div class="col-md-6">
                        <div id="tipoContrato-wrapper"></div>
                    </div>
                    <div class="col-md-6">
                        ${FormSelect({ id: 'estado', label: 'Estado', options: estOptions, required: true })}
                    </div>
                    <div class="col-md-6">
                        <label class="form-label fw-medium" style="color: var(--text-dark); font-size: 0.9rem;">Áreas Asignadas</label>
                        <div class="input-group input-group-sm" id="btn-select-areas" style="cursor:pointer; border-radius:0.4rem; overflow:hidden; border:1px solid #d1d5db;">
                            <input type="text" class="form-control border-0" id="areasCountDisplay" placeholder="Clic para seleccionar áreas..." readonly style="cursor:pointer; background:#fff; font-size:0.82rem;">
                            <button class="btn border-0 px-2" type="button" style="pointer-events:none; background:#fff;">
                                <i class="bi bi-tags text-primary" style="font-size:0.8rem;"></i>
                            </button>
                        </div>
                    </div>
                </div>
                
                <div class="d-flex justify-content-end gap-2 mt-4 pt-3 border-top">
                    <button type="button" class="btn btn-light border btn-sm px-3" data-bs-dismiss="modal">Cancelar</button>
                    <button type="submit" class="btn btn-primary btn-sm px-4 shadow-sm" id="funcionario-modal-submit" style="background-color:var(--primary);">
                        <span class="btn-text d-flex align-items-center gap-2"><i class="bi bi-check-circle"></i> <span id="btn-submit-text">Guardar Instructor</span></span>
                        <span class="btn-spinner d-none spinner-border spinner-border-sm" role="status"></span>
                    </button>
                </div>
            </div>

            <!-- VISTA 2: SELECTOR DE ÁREAS -->
            <div class="view-slide" id="view-areas-search">
                <div class="d-flex align-items-center gap-2 mb-3 pb-2 border-bottom">
                    <button type="button" class="btn btn-light btn-sm px-3 rounded-pill shadow-sm d-flex align-items-center gap-1" id="btn-back-to-form">
                        <i class="bi bi-arrow-left"></i> Volver
                    </button>
                    <h6 class="mb-0 fw-bold text-dark ms-1"><i class="bi bi-tags text-primary me-1"></i> Seleccionar Áreas</h6>
                </div>
                <div class="mb-2">
                    <div class="input-group input-group-sm shadow-sm" style="border-radius:0.4rem; overflow:hidden; border:1px solid #d1d5db;">
                        <span class="input-group-text bg-white border-0"><i class="bi bi-search text-muted"></i></span>
                        <input type="text" class="form-control border-0" id="search-areas-input" placeholder="Buscar área por nombre..." autocomplete="off">
                    </div>
                </div>
                <div class="bg-white shadow-sm border p-3" style="border-radius:0.4rem; max-height:380px; overflow-y:auto;">
                    <div id="areas-wrapper" class="d-flex flex-column gap-2 mt-1"></div>
                </div>
            </div>
        `;

        document.getElementById('modal-container').innerHTML = ModalForm({
            id: 'funcionario-modal',
            title: 'Funcionario',
            formContent,
            hideFooter: true,
            size: 'modal-lg'
        });

        document.getElementById('funcionario-modal-form')
            .addEventListener('submit', this.handleFormSubmit.bind(this));

        this.bsModal = new bootstrap.Modal(document.getElementById('funcionario-modal'));

        // =======================
        // Cambio Dinámico de Botón (Tipo Usuario)
        // =======================
        document.querySelectorAll('input[name="tipo_usuario_radio"]').forEach(radio => {
            radio.addEventListener('change', (e) => {
                const isCoordinador = e.target.value === 'coordinador';
                const btnText = document.getElementById('btn-submit-text');
                if(btnText) {
                    btnText.textContent = isCoordinador ? 'Guardar Coordinador' : 'Guardar Instructor';
                }
            });
        });

        // =======================
        // Lógica Selección Áreas
        // =======================
        document.getElementById('btn-select-areas').addEventListener('click', () => {
            document.getElementById('view-funcionario-form').classList.remove('active');
            document.getElementById('view-areas-search').classList.add('active');
            setTimeout(() => {
                const search = document.getElementById('search-areas-input');
                if(search) search.focus();
            }, 200);
        });

        document.getElementById('btn-back-to-form').addEventListener('click', () => {
            document.getElementById('view-areas-search').classList.remove('active');
            document.getElementById('view-funcionario-form').classList.add('active');
        });

        document.getElementById('search-areas-input').addEventListener('input', (e) => {
            const q = e.target.value.toLowerCase().trim();
            document.querySelectorAll('.area-checkbox-container').forEach(el => {
                const label = el.textContent.toLowerCase();
                el.style.display = (label.includes(q)) ? '' : 'none';
            });
        });

        document.getElementById('areas-wrapper').addEventListener('change', (e) => {
            if (e.target.classList.contains('area-checkbox')) {
                this._updateAreasCountDisplay();
            }
        });
    }

    _updateAreasCountDisplay() {
        const checkedCount = document.querySelectorAll('.area-checkbox:checked').length;
        const display = document.getElementById('areasCountDisplay');
        if (display) {
            display.value = checkedCount === 0 
                ? 'Ninguna área seleccionada' 
                : (checkedCount === 1 ? '1 Área seleccionada' : `${checkedCount} Áreas seleccionadas`);
        }
    }

    injectDynamicModalFields(funcionario = null) {
        // Resolver el ID del tipo de contrato sin importar cómo llega del backend
        const selectedTipoId = funcionario ? this._getTipoContratoId(funcionario) : '';

        document.getElementById('tipoContrato-wrapper').innerHTML = FormSelect({
            id:            'idTipoContrato',
            label:         'Tipo de Contrato',
            options:       this.tiposContrato,
            valueKey:      'idTipoContrato',
            textKey:       'nombreTipoContrato',
            selectedValue: selectedTipoId,
            required:      true
        });

        // Checkboxes de áreas
        const funcAreasIds = funcionario?.areas ? funcionario.areas.map(a => Number(a.idArea)) : [];
        const areasHtml = this.areas.map(area => `
            <div class="form-check area-checkbox-container" style="user-select:none;">
                <input class="form-check-input area-checkbox" style="cursor:pointer;" type="checkbox" name="areas[]"
                       value="${area.idArea}" id="area_${area.idArea}"
                       ${funcAreasIds.includes(Number(area.idArea)) ? 'checked' : ''}>
                <label class="form-check-label w-100" style="cursor:pointer; padding-top:2px;" for="area_${area.idArea}">${area.nombreArea}</label>
            </div>
        `).join('');
        document.getElementById('areas-wrapper').innerHTML =
            areasHtml || '<div class="text-muted text-center py-2">No hay áreas disponibles.</div>';

        const searchAreas = document.getElementById('search-areas-input');
        if (searchAreas) searchAreas.value = '';
        document.querySelectorAll('.area-checkbox-container').forEach(el => el.style.display = '');

        const viewAreasSearch = document.getElementById('view-areas-search');
        if (viewAreasSearch) viewAreasSearch.classList.remove('active');
        
        const viewFuncForm = document.getElementById('view-funcionario-form');
        if (viewFuncForm) viewFuncForm.classList.add('active');

        this._updateAreasCountDisplay();

        document.getElementById('nombre').value    = funcionario?.nombre    ?? '';
        document.getElementById('apellido').value  = funcionario?.apellido  ?? '';
        document.getElementById('documento').value = funcionario?.documento ?? '';
        document.getElementById('correo').value    = funcionario?.correo    ?? '';
        document.getElementById('telefono').value  = funcionario?.telefono  ?? '';
        document.getElementById('estado').value    = funcionario?.estado    ?? '';

        // Contraseña
        const pwdSection = document.getElementById('password-section');
        const pwdInput   = document.getElementById('password-new');
        if (funcionario) {
            pwdSection.style.display = 'block';
            pwdInput.value = '';
            const hintVal = document.getElementById('password-hint-value');
            if (hintVal) hintVal.textContent = funcionario.documento || '—';
        } else {
            pwdSection.style.display = 'none';
            if (pwdInput) pwdInput.value = '';
        }

        document.getElementById('funcionario-modal-form')
            .querySelectorAll('.is-invalid')
            .forEach(el => el.classList.remove('is-invalid'));

        // Ajustar UI según si es Creación o Edición
        const sectionTipoUsu = document.getElementById('tipo-usuario-section');
        const btnTextElement = document.getElementById('btn-submit-text');
        const modalTitle = document.getElementById('funcionario-modal-title');

        if (funcionario) {
            // Editando
            if (sectionTipoUsu) sectionTipoUsu.style.display = 'none';
            if (btnTextElement) btnTextElement.textContent = 'Guardar Cambios';
            if (modalTitle) modalTitle.textContent = 'Editar Funcionario';
        } else {
            // Creando Nuevo
            if (sectionTipoUsu) sectionTipoUsu.style.display = 'block';
            document.getElementById('radioInstructor').checked = true;
            if (btnTextElement) btnTextElement.textContent = 'Guardar Instructor';
            if (modalTitle) modalTitle.textContent = 'Nuevo Funcionario';
        }
    }

    openModal(id = null) {
        this.currentEditId = id;
        document.getElementById('funcionario-modal-alert').innerHTML = '';

        const funcionario = id
            ? this.funcionarios.find(f => String(f.idFuncionario) === String(id)) ?? null
            : null;

        this.injectDynamicModalFields(funcionario);
        this.bsModal.show();
    }

    async handleFormSubmit(e) {
        e.preventDefault();
        const form = e.target;
        if (!form.checkValidity()) { form.reportValidity(); return; }

        const areasSelected = [];
        document.querySelectorAll('input[name="areas[]"]:checked').forEach(cb => {
            areasSelected.push(parseInt(cb.value));
        });

        const data = {
            nombre:         document.getElementById('nombre').value,
            apellido:       document.getElementById('apellido').value,
            documento:      document.getElementById('documento').value,
            correo:         document.getElementById('correo').value,
            telefono:       document.getElementById('telefono').value,
            estado:         document.getElementById('estado').value,
            idTipoContrato: document.getElementById('idTipoContrato').value,
            areas:          areasSelected
        };

        if (this.currentEditId) {
            const newPwd = (document.getElementById('password-new')?.value || '').trim();
            if (newPwd) data.password = newPwd;
        }

        setModalLoading('funcionario-modal', true);
        document.getElementById('funcionario-modal-alert').innerHTML = '';

        try {
            if (this.currentEditId) {
                // Actualizando
                await updateFuncionario(this.currentEditId, data);
            } else {
                // Creando - Determinar si es Instructor o Coordinador
                const tipoRadio = document.querySelector('input[name="tipo_usuario_radio"]:checked');
                const tipoValue = tipoRadio ? tipoRadio.value : 'instructor';
                
                if (tipoValue === 'coordinador') {
                    await createAdmin(data);
                } else {
                    await createFuncionario(data);
                }
            }

            this.bsModal.hide();
            this.showAlert('page-alert-container', 'success',
                `Funcionario ${this.currentEditId ? 'actualizado' : 'creado'} correctamente.`);
            await this.loadData();

        } catch (error) {
            document.getElementById('funcionario-modal-alert').innerHTML = AlertMessage({
                id: 'modal-error', type: 'danger', message: error.message
            });
        } finally {
            setModalLoading('funcionario-modal', false);
        }
    }

    // ── Ver Horario del Instructor ─────────────────────────────────────────
    async verHorario(idFuncionario, nombreInstructor) {
        document.getElementById('modal-horario-instructor-title').innerHTML =
            '<i class="bi bi-calendar-week"></i> ' + (nombreInstructor || 'Instructor');

        const btnEnviar = document.getElementById('btn-enviar-horario');
        btnEnviar.dataset.id = idFuncionario;
        btnEnviar.innerHTML = '<i class="bi bi-envelope-paper"></i><span>Enviar horario</span>';
        btnEnviar.disabled = false;

        const modalEl = document.getElementById('modalHorarioInstructor');
        bootstrap.Modal.getOrCreateInstance(modalEl).show();

        const body = document.getElementById('modal-horario-body');
        body.innerHTML = `
            <div class="text-center py-5 text-muted">
                <div class="spinner-border text-primary mb-3" role="status"></div>
                <p class="small">Cargando horario de <strong>${nombreInstructor}</strong>...</p>
            </div>`;

        try {
            const data   = await getHorarioPorInstructor(idFuncionario);
            const clases = data.data?.clases || data.clases || [];
            this.renderCalendarioInstructor(body, clases, nombreInstructor);
        } catch (err) {
            body.innerHTML = `
                <div class="text-center py-5 text-danger">
                    <i class="bi bi-exclamation-triangle fs-1 d-block mb-3 opacity-50"></i>
                    <p>${err.message || 'Error al cargar el horario.'}</p>
                </div>`;
        }
    }

    async enviarHorarioPorCorreo(idInstructor, btnElement) {

    // 1. Pedir rango de fechas
    const rango = await showDateRangeModal(
        'Enviar horario por correo',
        'Selecciona el período de bloques'
    );

    if (!rango) return;

    // 2. Spinner
    const originalHtml = btnElement.innerHTML;
    btnElement.innerHTML = `
        <span class="spinner-border spinner-border-sm"></span> Enviando...`;
    btnElement.disabled = true;

    try {
        // 3. Enviar con fechas
        await enviarHorario(
            idInstructor,
            rango.fechaInicio,
            rango.fechaFin
        );

        Swal.fire({
            title: '¡Éxito!',
            text: 'Horario enviado correctamente',
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

    renderCalendarioInstructor(container, clases, nombreInstructor) {
        if (!clases.length) {
            container.innerHTML = `
                <div class="text-center py-5 text-muted">
                    <i class="bi bi-calendar-x fs-1 d-block mb-3 opacity-25"></i>
                    <p class="fw-medium">Sin clases asignadas</p>
                    <p class="small">Este instructor no tiene horario registrado.</p>
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

        // ── Build weekly events (abstract dates) ──
        const buildEventsSemana = () => {
            const events = [];
            clases.forEach(asig => {
                const bloque = asig.bloque;
                if (!bloque) return;
                const ficha      = asig.ficha;
                const isVirtual  = asig.modalidad === 'virtual';
                const color      = isVirtual ? '#0dcaf0'              : '#4caa16';
                const bgColor    = isVirtual ? 'rgba(13,202,240,0.1)' : 'rgba(57,169,0,0.1)';
                const ambienteLabel = asig.ambiente
                    ? `${asig.ambiente.codigo} - No.${asig.ambiente.numero ?? ''}`
                    : 'Virtual';
                const fichaLabel = ficha ? `Ficha ${ficha.codigoFicha || ''}` : '';
                const progLabel  = ficha?.programa?.nombre ?? '';
                const horaIni = bloque.horaInicio ?? bloque.hora_inicio;
                const horaFin = bloque.horaFin ?? bloque.hora_fin;
                if (!horaIni || !horaFin) return;

                (bloque.dias || []).forEach(dia => {
                    const nombreDia = dia.nombreDia ?? dia.nombre;
                    const dateStr = dayMap[nombreDia];
                    if (!dateStr) return;
                    events.push({
                        id:              `${asig.idAsignacion}_${dia.idDia}`,
                        start:           `${dateStr}T${horaIni}`,
                        end:             `${dateStr}T${horaFin}`,
                        backgroundColor: bgColor,
                        borderColor:     color,
                        textColor:       color,
                        extendedProps:   { ambienteLabel, fichaLabel, progLabel, modalidad: asig.modalidad, tipoDeFormacion: asig.tipoDeFormacion }
                    });
                });
            });
            return events;
        };

        // ── Build monthly events (real dates) ──
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

                const ficha     = asig.ficha;
                const isVirtual = asig.modalidad === 'virtual';
                const color     = isVirtual ? '#0dcaf0' : '#4caa16';
                const bgColor   = isVirtual ? 'rgba(13,202,240,0.13)' : 'rgba(57,169,0,0.13)';
                const ambienteLabel = asig.ambiente
                    ? `${asig.ambiente.codigo} - No.${asig.ambiente.numero ?? ''}`
                    : 'Virtual';
                const fichaLabel = ficha ? `F${ficha.codigoFicha || ''}` : '';
                const progLabel  = ficha?.programa?.nombre || '';

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
                        backgroundColor: bgColor,
                        borderColor: color,
                        textColor: color,
                        extendedProps: { ambienteLabel, fichaLabel, progLabel, modalidad: asig.modalidad, tipoDeFormacion: asig.tipoDeFormacion }
                    });
                }
            });
            return events;
        };

        // ── Calculate date range ──
        let fechaMin = null, fechaMax = null;
        clases.forEach(asig => {
            const bloque = asig.bloque;
            if (!bloque) return;
            const fi = bloque.fechaInicio ?? bloque.fecha_inicio;
            const ff = bloque.fechaFin ?? bloque.fecha_fin;
            if (fi && (!fechaMin || fi < fechaMin)) fechaMin = fi;
            if (ff && (!fechaMax || ff > fechaMax)) fechaMax = ff;
        });

        // ── Render toolbar + calendar ──
        let vistaActual = 'semanal';

        container.innerHTML = `
            <div class="d-flex flex-wrap align-items-center justify-content-between gap-2 mb-3">
                <div class="d-flex align-items-center gap-2">
                    <div class="btn-group btn-group-sm" role="group" id="instr-btn-group-vista">
                        <button type="button" id="instr-btn-semanal" class="btn btn-primary" title="Vista semanal">
                            <i class="bi bi-calendar-week me-1"></i>Semanal
                        </button>
                        <button type="button" id="instr-btn-mensual" class="btn btn-outline-primary" title="Vista mensual">
                            <i class="bi bi-calendar-month me-1"></i>Mensual
                        </button>
                        <button type="button" id="instr-btn-diario" class="btn btn-outline-primary" title="Vista diaria">
                            <i class="bi bi-calendar-day me-1"></i>Día
                        </button>
                    </div>
                </div>
                <div class="d-flex align-items-center gap-1" id="instr-controles-mes" style="display:none!important;">
                    <button class="btn btn-sm btn-outline-secondary" id="instr-btn-prev" title="Anterior">
                        <i class="bi bi-chevron-left"></i>
                    </button>
                    <span class="fw-semibold px-2 small" id="instr-lbl-periodo" style="min-width:140px;text-align:center;">—</span>
                    <button class="btn btn-sm btn-outline-secondary" id="instr-btn-next" title="Siguiente">
                        <i class="bi bi-chevron-right"></i>
                    </button>
                    <button class="btn btn-sm btn-outline-secondary ms-1" id="instr-btn-today">Hoy</button>
                </div>
                ${fechaMin && fechaMax
                    ? `<span class="badge bg-light text-muted border" style="font-size:0.72rem;">
                           <i class="bi bi-calendar-range me-1"></i>${fechaMin} → ${fechaMax}
                       </span>`
                    : ''}
            </div>
            <div id="cal-instructor" style="height:500px;"></div>`;

        const calEl = document.getElementById('cal-instructor');
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
            height:          500,
            events:          eventsSemana,
            datesSet:        (info) => {
                const lbl = document.getElementById('instr-lbl-periodo');
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
                const badge = p.tipoDeFormacion
                    ? `<div class="mt-auto pt-1"><span class="badge bg-secondary bg-opacity-25 text-dark" style="font-size:0.62rem;">${p.tipoDeFormacion}</span></div>`
                    : '';

                // Compact view for monthly
                if (vistaActual === 'mensual') {
                    return {
                        html: `<div class="p-1 h-100 d-flex flex-column overflow-hidden">
                            <div class="fw-bold lh-sm text-truncate" style="font-size:0.72rem;">${p.fichaLabel}</div>
                            <div class="text-truncate" style="font-size:0.65rem;opacity:0.8;">
                                <i class="bi ${icon}"></i> ${p.ambienteLabel}
                            </div>
                        </div>`
                    };
                }

                return {
                    html: `<div class="p-1 h-100 d-flex flex-column" style="overflow:hidden;">
                        <div class="fw-bold mb-1 lh-sm" style="font-size:0.78rem;">${p.fichaLabel}</div>
                        <div class="text-truncate" style="font-size:0.72rem;opacity:0.85;">
                            <i class="bi ${icon}"></i> ${p.ambienteLabel}
                        </div>
                        <div class="text-truncate" style="font-size:0.7rem;opacity:0.7;">${p.progLabel}</div>
                        ${badge}
                    </div>`
                };
            }
        });
        calendar.render();

        // ── Vista buttons ──
        const btnSem = document.getElementById('instr-btn-semanal');
        const btnMen = document.getElementById('instr-btn-mensual');
        const btnDia = document.getElementById('instr-btn-diario');
        const controlesMes = document.getElementById('instr-controles-mes');

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
                // When coming from abstract week, go to today
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

        document.getElementById('instr-btn-prev')?.addEventListener('click', () => calendar.prev());
        document.getElementById('instr-btn-next')?.addEventListener('click', () => calendar.next());
        document.getElementById('instr-btn-today')?.addEventListener('click', () => calendar.today());
    }

    async handleDelete(id) {
        const funcionario = this.funcionarios.find(f => String(f.idFuncionario) === String(id));
        if (!funcionario) return;

        const confirm = await ConfirmDialog({
            title:       '¿Mover a papelera?',
            message:     `Vas a eliminar permanentemente al instructor <strong>${funcionario.nombre}</strong>. Esta acción no se puede deshacer.`,
            confirmText: 'Sí, eliminar',
            cancelText:  'Cancelar'
        });

        if (confirm) {
            try {
                // Primero intentamos borrar en la BD
                await deleteFuncionario(id);
                
                // Si no hay error, actualizamos la UI
                this.funcionarios = this.funcionarios.filter(f => String(f.idFuncionario) !== String(id));
                this.renderTable();
                this.showAlert('page-alert-container', 'success', 'Instructor eliminado del sistema.');
            } catch (error) {
                // Si falla (ej: tiene horarios asignados), mandamos alerta y recargamos datos por si acaso
                Swal.fire({
                    title: 'No se pudo eliminar',
                    text: error.message || 'El instructor tiene horarios o datos asignados.',
                    icon: 'warning',
                    confirmButtonColor: '#4caa16',
                    confirmButtonText: 'Aceptar'
                });
                await this.loadData();
            }
        }
    }

    showAlert(containerId, type, message) {
        const container = document.getElementById(containerId);
        if (container) {
            container.innerHTML = AlertMessage({ id: `alert-${Date.now()}`, type, message });
            if (type === 'success') setTimeout(() => { container.innerHTML = ''; }, 5000);
        }
    }
}

document.addEventListener('DOMContentLoaded', () => {
    new FuncionariosPage();
});
