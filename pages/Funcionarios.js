import { ProtectedRoute } from '../components/ProtectedRoute.js';
import { Navbar, initNavbarEvents } from '../components/Navbar.js';
import { Sidebar, initSidebarEvents } from '../components/Sidebar.js';
import { DataTable } from '../components/DataTable.js';
import { ModalForm, setModalLoading, FormSelect } from '../components/ModalForm.js';
import { FormInput } from '../components/FormInput.js';
import { ConfirmDialog } from '../components/ConfirmDialog.js';
import { AlertMessage } from '../components/AlertMessage.js';
import { getFuncionarios, createFuncionario, updateFuncionario, deleteFuncionario, getTiposContrato, getAreas, getHorarioPorInstructor } from '../utils/api.js';

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
                             style="background:linear-gradient(135deg,var(--primary) 0%,hsl(280,60%,55%) 100%);">
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
                    </div>
                </div>
            </div>
        `;

        document.getElementById('btn-add-funcionario').addEventListener('click', () => this.openModal());

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
            { key: 'nombre',   label: 'Nombre',   icon: 'person'    },
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

        if (typeof $ !== 'undefined' && $.fn.dataTable) {
            this.dtInstance = $('#funcionarios-table').DataTable({
                responsive: true,
                paging:     false,
                info:       false,
                searching:  false,
                dom:        'rt',
                buttons: [
                    { extend: 'colvis', text: 'Columnas' },
                    { extend: 'excel',  text: 'Excel'    },
                    { extend: 'pdf',    text: 'PDF'      },
                    { extend: 'print',  text: 'Print'    }
                ],
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
        document.querySelectorAll('.btn-ver-horario').forEach(btn => {
            btn.addEventListener('click', (e) => {
                this.verHorario(e.currentTarget.dataset.id, e.currentTarget.dataset.nombre);
            });
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
        const estOptions = [
            { id: 'ACTIVO',   nombre: 'ACTIVO'   },
            { id: 'INACTIVO', nombre: 'INACTIVO' }
        ];

        const formContent = `
            <div class="row g-3">
                <div class="col-md-6">
                    ${FormInput({ id: 'nombre',    label: 'Nombre Completo',      required: true })}
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
                    <div id="areas-wrapper" class="d-flex flex-wrap gap-3 mt-2"></div>
                </div>
            </div>
        `;

        document.getElementById('modal-container').innerHTML = ModalForm({
            id: 'funcionario-modal',
            title: 'Funcionario',
            formContent
        });

        document.getElementById('funcionario-modal-form')
            .addEventListener('submit', this.handleFormSubmit.bind(this));

        this.bsModal = new bootstrap.Modal(document.getElementById('funcionario-modal'));
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
            <div class="form-check">
                <input class="form-check-input" type="checkbox" name="areas[]"
                       value="${area.idArea}" id="area_${area.idArea}"
                       ${funcAreasIds.includes(Number(area.idArea)) ? 'checked' : ''}>
                <label class="form-check-label" for="area_${area.idArea}">${area.nombreArea}</label>
            </div>
        `).join('');
        document.getElementById('areas-wrapper').innerHTML =
            areasHtml || '<span class="text-muted">No hay áreas disponibles.</span>';

        document.getElementById('nombre').value    = funcionario?.nombre    ?? '';
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

        document.getElementById('funcionario-modal-title').textContent =
            funcionario ? 'Editar Instructor' : 'Nuevo Instructor';
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
                await updateFuncionario(this.currentEditId, data);
            } else {
                await createFuncionario(data);
            }

            this.bsModal.hide();
            this.showAlert('page-alert-container', 'success',
                `Instructor ${this.currentEditId ? 'actualizado' : 'creado'} correctamente.`);
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
            const clases = data.clases || [];
            this.renderCalendarioInstructor(body, clases, nombreInstructor);
        } catch (err) {
            body.innerHTML = `
                <div class="text-center py-5 text-danger">
                    <i class="bi bi-exclamation-triangle fs-1 d-block mb-3 opacity-50"></i>
                    <p>${err.message || 'Error al cargar el horario.'}</p>
                </div>`;
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

        const dayMap = {
            'Lunes':     '2024-01-01', 'Martes':    '2024-01-02', 'Miercoles': '2024-01-03',
            'Jueves':    '2024-01-04', 'Viernes':   '2024-01-05', 'Sabado':    '2024-01-06',
            'Domingo':   '2024-01-07'
        };

        const events = [];
        clases.forEach(asig => {
            const bloque = asig.bloque;
            if (!bloque) return;
            const ficha      = asig.ficha;
            const isVirtual  = bloque.modalidad === 'virtual';
            const color      = isVirtual ? '#0dcaf0'              : '#7e57c2';
            const bgColor    = isVirtual ? 'rgba(13,202,240,0.1)' : 'rgba(126,87,194,0.1)';
            const ambienteLabel = bloque.ambiente
                ? `${bloque.ambiente.codigo} - No.${bloque.ambiente.numero}`
                : 'Virtual';
            const fichaLabel = ficha ? `Ficha ${ficha.codigoFicha || ''}` : '';
            const progLabel  = ficha?.programa?.nombre ?? '';

            (bloque.dias || []).forEach(dia => {
                const dateStr = dayMap[dia.nombre];
                if (!dateStr) return;
                events.push({
                    id:              `${asig.idAsignacion}_${dia.idDia}`,
                    start:           `${dateStr}T${bloque.hora_inicio}`,
                    end:             `${dateStr}T${bloque.hora_fin}`,
                    backgroundColor: bgColor,
                    borderColor:     color,
                    textColor:       color,
                    extendedProps:   { ambienteLabel, fichaLabel, progLabel, modalidad: bloque.modalidad, tipoDeFormacion: bloque.tipoDeFormacion }
                });
            });
        });

        container.innerHTML = '<div id="cal-instructor" style="height:560px;"></div>';

        const calendar = new FullCalendar.Calendar(document.getElementById('cal-instructor'), {
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
            events,
            eventContent(arg) {
                const p    = arg.event.extendedProps;
                const icon = p.modalidad === 'virtual' ? 'bi-laptop' : 'bi-building';
                const badge = p.tipoDeFormacion
                    ? `<div class="mt-auto pt-1"><span class="badge bg-secondary bg-opacity-25 text-dark" style="font-size:0.65rem;">${p.tipoDeFormacion}</span></div>`
                    : '';
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
            if (type === 'success') setTimeout(() => { container.innerHTML = ''; }, 5000);
        }
    }
}

document.addEventListener('DOMContentLoaded', () => {
    new FuncionariosPage();
});