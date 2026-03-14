import { ProtectedRoute } from '../components/ProtectedRoute.js';
import { Navbar, initNavbarEvents } from '../components/Navbar.js';
import { Sidebar, initSidebarEvents } from '../components/Sidebar.js';
import { DataTable } from '../components/DataTable.js';
import { ModalForm, setModalLoading } from '../components/ModalForm.js';
import { FormInput } from '../components/FormInput.js';
import { ConfirmDialog } from '../components/ConfirmDialog.js';
import { AlertMessage } from '../components/AlertMessage.js';
import { getFichas, createFicha, updateFicha, deleteFicha, getProgramas } from '../utils/api.js';

class FichasPage {
    constructor() {
        new ProtectedRoute();
        this.appContainer = document.getElementById('app');
        this.fichas = [];
        this.programas = [];
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
                    
                    <div class="d-flex flex-column flex-sm-row justify-content-between align-items-start align-items-sm-center mb-4 gap-3">
                        <div class="d-flex align-items-center gap-3">
                            <div class="page-icon">
                                <i class="bi bi-person-video3"></i>
                            </div>
                            <div>
                                <h4 class="fw-bold mb-0" style="color: var(--text-dark);">Fichas</h4>
                                <small style="color: var(--text-muted);">Administra los grupos de formación</small>
                            </div>
                        </div>
                        
                        <button class="btn btn-purple d-flex align-items-center gap-2" id="btn-add-ficha">
                            <i class="bi bi-plus-lg"></i>
                            <span>Nueva Ficha</span>
                        </button>
                    </div>

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

                    <div id="table-container">
                        ${DataTable({ id: 'fichas-table', columns: [], loading: true })}
                    </div>
                </main>
            </div>
            
            <div id="modal-container"></div>
        `;

        document.getElementById('btn-add-ficha').addEventListener('click', () => this.openModal());

        const searchInput = document.getElementById('search-input');
        if (searchInput) {
            searchInput.addEventListener('input', (e) => this.filterTable(e.target.value));
        }
    }

    async loadDependencies() {
        try {
            const progData = await getProgramas();
            this.programas = progData.data || (Array.isArray(progData) ? progData : []);
        } catch (error) {
            console.error('Error al cargar dependencias:', error);
            this.showAlert('page-alert-container', 'warning', 'No se pudieron cargar los programas.');
        }
    }

    // Extrae la duración en meses del programa soportando camelCase y snake_case
    getProgramaDuracion(programa) {
        if (!programa) return 0;
        const tipo = programa.tipoFormacion || programa.tipo_formacion;
        if (!tipo) return 0;
        const meses = tipo.duracionMeses ?? tipo.duracion_meses ?? 0;
        return parseInt(meses) || 0;
    }

    filterTable(query) {
        const q = query.toLowerCase().trim();
        if (!q) {
            this.renderTable(this.fichas);
            return;
        }
        const filtered = this.fichas.filter(f =>
            (f.codigoFicha && f.codigoFicha.toLowerCase().includes(q)) ||
            (f.jornada && f.jornada.toLowerCase().includes(q)) ||
            (f.modalidad && f.modalidad.toLowerCase().includes(q)) ||
            (f.programa && f.programa.nombre && f.programa.nombre.toLowerCase().includes(q)) ||
            (f.programa && f.programa.codigo && f.programa.codigo.toLowerCase().includes(q))
        );
        this.renderTable(filtered);
    }

    async loadData() {
        try {
            const data = await getFichas();
            this.fichas = data.data || (Array.isArray(data) ? data : []);
            this.renderTable();
        } catch (error) {
            this.showAlert('page-alert-container', 'danger', error.message || 'Error al cargar las fichas.');
            document.getElementById('table-container').innerHTML = DataTable({ id: 'fichas-table', columns: [], loading: false, data: [] });
        }
    }

    renderTable(data = null) {
        const displayData = data || this.fichas;

        const columns = [
            { key: 'codigoFicha', label: 'Código', icon: 'hash' },
            {
                key: 'programa',
                label: 'Programa',
                icon: 'book',
                render: (row) => row.programa
                    ? (row.programa.codigo
                        ? `<span class="text-muted me-1" style="font-size:0.8rem;">${row.programa.codigo}</span> ${row.programa.nombre}`
                        : row.programa.nombre)
                    : '<span class="text-muted">N/A</span>'
            },
            { key: 'jornada', label: 'Jornada', icon: 'clock' },
            { key: 'modalidad', label: 'Modalidad', icon: 'laptop' },
            { key: 'fechaInicio', label: 'Inicio', icon: 'calendar-event' },
            { key: 'fechaFin', label: 'Fin', icon: 'calendar-check' },
            {
                key: 'estado',
                label: 'Estado',
                icon: 'toggle-on',
                render: (row) => {
                    const badgeClass = row.estado === 'Activo' ? 'bg-success-subtle text-success' : 'bg-danger-subtle text-danger';
                    return `<span class="badge rounded-pill ${badgeClass}">${row.estado || 'N/A'}</span>`;
                }
            },
            {
                key: 'acciones',
                label: '',
                render: (row) => `
                    <div class="d-flex gap-1 justify-content-end">
                        <button class="btn-action edit btn-edit" data-id="${row.idFicha}" title="Editar">
                            <i class="bi bi-pencil-square"></i>
                        </button>
                        <button class="btn-action delete btn-delete" data-id="${row.idFicha}" title="Eliminar">
                            <i class="bi bi-trash"></i>
                        </button>
                    </div>
                `
            }
        ];

        document.getElementById('table-container').innerHTML = DataTable({
            id: 'fichas-table',
            columns: columns,
            data: displayData
        });

        if (typeof $ !== 'undefined' && $.fn.dataTable) {
            this.dtInstance = $('#fichas-table').DataTable({
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
        // Código del programa al frente del nombre
        const programaOptions = this.programas.map(p =>
            `<option value="${p.idPrograma}">${p.codigo ? p.codigo + ' - ' : ''}${p.nombre}</option>`
        ).join('');

        const formContent = `
            <style>
                .form-section { display: none; }
                .form-section.active { display: block; animation: fadeIn 0.3s ease; }
                .section-title { color: var(--text-dark); font-weight: 600; margin-bottom: 1.25rem; border-bottom: 2px solid #eeecf5; padding-bottom: 0.5rem; }
                .form-label { color: #4b5563; font-weight: 500; font-size: 0.9rem; margin-bottom: 0.5rem; }
                .form-control, .form-select { border: 1px solid #d1d5db; border-radius: 0.5rem; padding: 0.6rem 1rem; color: #1f2937; }
                .form-control:focus, .form-select:focus { border-color: var(--primary-color); box-shadow: 0 0 0 3px rgba(107, 70, 193, 0.1); }
                @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
            </style>
            
            <div class="row g-4">
              <div class="col-lg-12">

                <!-- SECCIÓN 1: INFORMACIÓN BÁSICA -->
                <div class="form-section active" id="section1">
                  <h5 class="section-title">
                    <i class="bi bi-info-circle text-primary me-2"></i> Información Básica
                  </h5>
                  <div class="row g-3">
                    <div class="col-md-6">
                      <label for="codigoFicha" class="form-label"><i class="bi bi-hash text-muted me-1"></i> Código de la Ficha</label>
                      <input type="text" class="form-control" id="codigoFicha" placeholder="Ej: 2866432" required>
                      <div class="form-text mt-1 text-muted" style="font-size: 0.8rem;">Código único de identificación</div>
                    </div>
                    <div class="col-md-6">
                      <label for="jornada" class="form-label"><i class="bi bi-clock text-muted me-1"></i> Jornada</label>
                      <select class="form-select" id="jornada" required>
                        <option value="">Seleccionar jornada...</option>
                        <option value="Diurna">🌅 Diurna</option>
                        <option value="Mixta">🌙 Mixta</option>
                      </select>
                    </div>
                    <div class="col-md-6">
                      <label for="modalidad" class="form-label"><i class="bi bi-laptop text-muted me-1"></i> Modalidad de Formación</label>
                      <select class="form-select" id="modalidad" required>
                        <option value="">Seleccionar modalidad...</option>
                        <option value="Presencial">🏫 Presencial</option>
                        <option value="Virtual">💻 Virtual</option>
                      </select>
                    </div>
                    <div class="col-md-6">
                      <label for="estado" class="form-label"><i class="bi bi-toggle-on text-muted me-1"></i> Estado</label>
                      <select class="form-select" id="estado" required>
                        <option value="Activo">🟢 Activo</option>
                        <option value="Inactivo">🔴 Inactivo</option>
                      </select>
                    </div>
                  </div>
                  <div class="d-flex justify-content-end mt-4 pt-3 border-top">
                    <button type="button" class="btn btn-primary d-flex align-items-center gap-2 px-4 shadow-sm" onclick="document.getElementById('ficha-modal-form').goToSection(2)">
                      Siguiente <i class="bi bi-arrow-right"></i>
                    </button>
                  </div>
                </div>

                <!-- SECCIÓN 2: PROGRAMA -->
                <div class="form-section" id="section2">
                  <h5 class="section-title">
                    <i class="bi bi-mortarboard text-primary me-2"></i> Programa de Formación
                  </h5>
                  <div class="row g-3">
                    <div class="col-12">
                      <label for="idPrograma" class="form-label"><i class="bi bi-book text-muted me-1"></i> Seleccionar Programa</label>
                      <select class="form-select" id="idPrograma" required>
                        <option value="">Seleccione un programa...</option>
                        ${programaOptions}
                      </select>
                    </div>
                    <div class="col-12" id="programa-info" style="display:none;">
                      <div class="alert alert-info d-flex align-items-center gap-2 py-2 mb-0" style="font-size:0.85rem;">
                        <i class="bi bi-info-circle-fill"></i>
                        <span id="programa-info-text"></span>
                      </div>
                    </div>
                  </div>
                  <div class="d-flex justify-content-between mt-4 pt-3 border-top">
                    <button type="button" class="btn btn-outline-secondary d-flex align-items-center gap-2 px-4" onclick="document.getElementById('ficha-modal-form').goToSection(1)">
                      <i class="bi bi-arrow-left"></i> Anterior
                    </button>
                    <button type="button" class="btn btn-primary d-flex align-items-center gap-2 px-4 shadow-sm" onclick="document.getElementById('ficha-modal-form').goToSection(3)">
                      Siguiente <i class="bi bi-arrow-right"></i>
                    </button>
                  </div>
                </div>

                <!-- SECCIÓN 3: FECHAS -->
                <div class="form-section" id="section3">
                  <h5 class="section-title">
                    <i class="bi bi-calendar-range text-primary me-2"></i> Fechas de Formación
                  </h5>
                  <div class="row g-3">
                    <div class="col-md-6">
                      <label for="fechaInicio" class="form-label"><i class="bi bi-calendar-event text-muted me-1"></i> Fecha de Inicio</label>
                      <input type="date" class="form-control" id="fechaInicio" required>
                    </div>
                    <div class="col-md-6">
                      <label for="fechaFin" class="form-label"><i class="bi bi-calendar-check text-muted me-1"></i> Fecha de Finalización</label>
                      <input type="date" class="form-control" id="fechaFin" style="background-color:#e9ecef; pointer-events:none;" readonly>
                      <div class="form-text mt-1 text-muted" style="font-size: 0.8rem;">Se calcula automáticamente según la duración del programa.</div>
                    </div>
                  </div>
                  <div class="d-flex justify-content-between mt-4 pt-3 border-top">
                    <button type="button" class="btn btn-outline-secondary d-flex align-items-center gap-2 px-4" onclick="document.getElementById('ficha-modal-form').goToSection(2)">
                      <i class="bi bi-arrow-left"></i> Anterior
                    </button>
                    <button type="submit" class="btn btn-success d-flex align-items-center gap-2 px-4 shadow-sm" id="ficha-modal-submit">
                      <span class="btn-text d-flex align-items-center gap-2"><i class="bi bi-check-circle"></i> Crear Ficha</span>
                      <span class="btn-spinner d-none spinner-border spinner-border-sm" role="status" aria-hidden="true"></span>
                    </button>
                  </div>
                </div>

              </div>
            </div>
        `;

        document.getElementById('modal-container').innerHTML = ModalForm({
            id: 'ficha-modal',
            title: 'Ficha',
            formContent: formContent,
            hideFooter: true
        });

        const formEl = document.getElementById('ficha-modal-form');

        formEl.goToSection = (stepNumber) => {
            if (stepNumber > 1) {
                const currentSection = document.querySelector('.form-section.active');
                if (currentSection) {
                    let isValid = true;
                    currentSection.querySelectorAll('input[required], select[required]').forEach(input => {
                        if (!input.value) {
                            input.classList.add('is-invalid');
                            isValid = false;
                        } else {
                            input.classList.remove('is-invalid');
                        }
                    });
                    if (!isValid) return;
                }
            }
            document.querySelectorAll('.form-section').forEach(s => s.classList.remove('active'));
            document.getElementById('section' + stepNumber).classList.add('active');
        };

        // Listener único con delegación — se registra UNA sola vez sobre el form
        // Así no se acumulan listeners ni se pierde por cloneNode
        formEl.addEventListener('change', (e) => {
            if (e.target.id === 'idPrograma' || e.target.id === 'fechaInicio') {
                this._recalcularFechaFin();
            }
        });

        formEl.addEventListener('submit', this.handleFormSubmit.bind(this));

        this.bsModal = new bootstrap.Modal(document.getElementById('ficha-modal'));
    }

    // Método dedicado al cálculo — fácil de llamar desde cualquier lugar
    _recalcularFechaFin() {
        const progSelect = document.getElementById('idPrograma');
        const startInput = document.getElementById('fechaInicio');
        const endInput   = document.getElementById('fechaFin');
        const infoBox    = document.getElementById('programa-info');
        const infoText   = document.getElementById('programa-info-text');

        if (!progSelect || !startInput || !endInput) return;

        const selectedProg = this.programas.find(p => String(p.idPrograma) === String(progSelect.value));

        if (selectedProg && infoBox && infoText) {
            const duracion = this.getProgramaDuracion(selectedProg);
            infoText.textContent = duracion > 0
                ? `Duración del programa: ${duracion} meses`
                : 'Este programa no tiene duración definida, ingresa la fecha manualmente.';
            infoBox.style.display = 'block';

            if (duracion === 0) {
                endInput.removeAttribute('readonly');
                endInput.style.backgroundColor = '';
                endInput.style.pointerEvents = 'auto';
            } else {
                endInput.setAttribute('readonly', 'true');
                endInput.style.backgroundColor = '#e9ecef';
                endInput.style.pointerEvents = 'none';
            }
        } else if (infoBox) {
            infoBox.style.display = 'none';
        }

        if (!selectedProg || !startInput.value) {
            endInput.value = '';
            return;
        }

        const duracion = this.getProgramaDuracion(selectedProg);
        if (duracion > 0) {
            // 'T00:00:00' evita desfase por zona horaria al parsear solo la fecha
            const startDate = new Date(startInput.value + 'T00:00:00');
            startDate.setMonth(startDate.getMonth() + duracion);
            endInput.value = startDate.toISOString().split('T')[0];
        }
    }

    injectDynamicModalFields(ficha = null) {
        document.getElementById('codigoFicha').value = ficha ? ficha.codigoFicha : '';
        document.getElementById('jornada').value     = ficha ? ficha.jornada    : '';
        document.getElementById('modalidad').value   = ficha ? ficha.modalidad  : '';
        document.getElementById('estado').value      = ficha ? (ficha.estado    || 'Activo') : 'Activo';
        document.getElementById('fechaInicio').value = ficha ? (ficha.fechaInicio || '') : '';
        document.getElementById('fechaFin').value    = ficha ? (ficha.fechaFin    || '') : '';
        document.getElementById('idPrograma').value  = ficha ? (ficha.idPrograma  || '') : '';

        // Ocultar info box
        const infoBox = document.getElementById('programa-info');
        if (infoBox) infoBox.style.display = 'none';

        // Resetear fechaFin a readonly por defecto
        const endInput = document.getElementById('fechaFin');
        endInput.setAttribute('readonly', 'true');
        endInput.style.backgroundColor = '#e9ecef';
        endInput.style.pointerEvents = 'none';

        // Si es edición con programa y fecha, recalcular para mostrar info
        if (ficha && ficha.idPrograma && ficha.fechaInicio) {
            setTimeout(() => this._recalcularFechaFin(), 0);
        }

        const formEl = document.getElementById('ficha-modal-form');
        formEl.querySelectorAll('.is-invalid').forEach(el => el.classList.remove('is-invalid'));
        document.getElementById('ficha-modal-title').textContent = ficha ? 'Editar Ficha' : 'Nueva Ficha';

        // Actualizar texto del botón submit según el modo
        const submitBtn = document.getElementById('ficha-modal-submit');
        if (submitBtn) {
            const btnText = submitBtn.querySelector('.btn-text');
            if (btnText) {
                btnText.innerHTML = ficha
                    ? '<i class="bi bi-check-circle"></i> Guardar Cambios'
                    : '<i class="bi bi-check-circle"></i> Crear Ficha';
            }
        }

        // Reset wizard al paso 1
        document.querySelectorAll('.form-section').forEach(s => s.classList.remove('active'));
        document.getElementById('section1').classList.add('active');
    }

    openModal(id = null) {
        this.currentEditId = id;
        document.getElementById('ficha-modal-alert').innerHTML = '';

        const ficha = id ? this.fichas.find(f => String(f.idFicha) === String(id)) : null;

        this.injectDynamicModalFields(ficha);
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
            codigoFicha : document.getElementById('codigoFicha').value,
            idPrograma  : parseInt(document.getElementById('idPrograma').value),
            jornada     : document.getElementById('jornada').value,
            modalidad   : document.getElementById('modalidad').value,
            fechaInicio : document.getElementById('fechaInicio').value,
            fechaFin    : document.getElementById('fechaFin').value,
            estado      : document.getElementById('estado').value,
        };

        setModalLoading('ficha-modal', true);
        document.getElementById('ficha-modal-alert').innerHTML = '';

        try {
            if (this.currentEditId) {
                await updateFicha(this.currentEditId, data);
            } else {
                await createFicha(data);
            }

            this.bsModal.hide();
            const actionText = this.currentEditId ? 'actualizada' : 'creada';
            this.showAlert('page-alert-container', 'success', 'Ficha ' + actionText + ' correctamente.');
            await this.loadData();

        } catch (error) {
            document.getElementById('ficha-modal-alert').innerHTML = AlertMessage({
                id: 'modal-error',
                type: 'danger',
                message: error.message
            });
        } finally {
            setModalLoading('ficha-modal', false);
        }
    }

    async handleDelete(id) {
        const ficha = this.fichas.find(f => String(f.idFicha) === String(id));
        if (!ficha) return;

        const confirm = await ConfirmDialog({
            title: '¿Eliminar Ficha?',
            message: `Vas a eliminar permanentemente la ficha <strong>${ficha.codigoFicha}</strong>. Esta acción no se puede deshacer.`,
            confirmText: 'Sí, eliminar',
            cancelText: 'Cancelar'
        });

        if (confirm) {
            try {
                this.fichas = this.fichas.filter(f => String(f.idFicha) !== String(id));
                this.renderTable();
                await deleteFicha(id);
                this.showAlert('page-alert-container', 'success', 'Ficha eliminada del sistema.');
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
    new FichasPage();
});