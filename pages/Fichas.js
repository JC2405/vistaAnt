import { ProtectedRoute } from '../components/ProtectedRoute.js';
import { Navbar, initNavbarEvents } from '../components/Navbar.js';
import { Sidebar, initSidebarEvents } from '../components/Sidebar.js';
import { DataTable } from '../components/DataTable.js';
import { ModalForm, setModalLoading } from '../components/ModalForm.js';
import { FormInput } from '../components/FormInput.js';
import { ConfirmDialog } from '../components/ConfirmDialog.js';
import { AlertMessage } from '../components/AlertMessage.js';
import { getFichas, createFicha, updateFicha, deleteFicha, getProgramas, getAmbientes } from '../utils/api.js';

class FichasPage {
    constructor() {
        new ProtectedRoute();
        this.appContainer = document.getElementById('app');
        this.fichas = [];
        this.programas = [];
        this.ambientes = [];
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
                        ${DataTable({ id: 'fichas-table', columns: [], loading: true })}
                    </div>
                </main>
            </div>
            
            <!-- Modal Container -->
            <div id="modal-container"></div>
        `;

        document.getElementById('btn-add-ficha').addEventListener('click', () => this.openModal());

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
            const progData = await getProgramas();
            this.programas = progData.data || (Array.isArray(progData) ? progData : []);

            const ambData = await getAmbientes();
            this.ambientes = ambData.data || (Array.isArray(ambData) ? ambData : []);

            // Import getSedes dynamically or if it's already there:
            const { getSedes } = await import('../utils/api.js');
            const sedesData = await getSedes();
            this.sedes = sedesData.data || (Array.isArray(sedesData) ? sedesData : []);

        } catch (error) {
            console.error('Error al cargar dependencias:', error);
            this.showAlert('page-alert-container', 'warning', 'No se pudieron cargar programas, sedes o ambientes.');
        }
    }

    filterTable(query) {
        const q = query.toLowerCase().trim();
        if (!q) {
            this.renderTable(this.fichas);
            return;
        }
        const filtered = this.fichas.filter(f => {
            return (f.codigoFicha && f.codigoFicha.toLowerCase().includes(q)) ||
                (f.jornada && f.jornada.toLowerCase().includes(q)) ||
                (f.modalidad && f.modalidad.toLowerCase().includes(q)) ||
                (f.programa && f.programa.nombre && f.programa.nombre.toLowerCase().includes(q));
        });
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
                render: (row) => row.programa ? row.programa.nombre : '<span class="text-muted">N/A</span>'
            },
            {
                key: 'ambiente',
                label: 'Ubicación',
                icon: 'building',
                render: (row) => row.ambiente ? `Bloque ${row.ambiente.bloque} - Amb. ${row.ambiente.numero}` : '<span class="text-muted text-center" style="font-size: 0.8rem;">Virtual / S.A.</span>'
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
                    return '<span class="badge rounded-pill ' + badgeClass + '">' + (row.estado || 'N/A') + '</span>';
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

        // Event Listeners
        document.querySelectorAll('.btn-edit').forEach(btn => {
            btn.addEventListener('click', (e) => this.openModal(e.currentTarget.dataset.id));
        });

        document.querySelectorAll('.btn-delete').forEach(btn => {
            btn.addEventListener('click', (e) => this.handleDelete(e.currentTarget.dataset.id));
        });
    }

    setupModal() {
        const programaOptions = this.programas.map(p =>
            '<option value="' + p.idPrograma + '">' + p.nombre + '</option>'
        ).join('');

        const sedesOptions = (this.sedes || []).map(s =>
            '<option value="' + s.idSede + '">' + s.nombre + '</option>'
        ).join('');

        const formContent = `
            <style>
                .form-section { display: none; }
                .form-section.active { display: block; animation: fadeIn 0.3s ease; }
                .section-title { color: var(--text-dark); font-weight: 600; margin-bottom: 1.25rem; border-bottom: 2px solid #eeecf5; padding-bottom: 0.5rem; }
                .form-label { color: #4b5563; font-weight: 500; font-size: 0.9rem; margin-bottom: 0.5rem; }
                .form-control, .form-select { border: 1px solid #d1d5db; border-radius: 0.5rem; padding: 0.6rem 1rem; color: #1f2937; }
                .form-control:focus, .form-select:focus { border-color: var(--primary-color); box-shadow: 0 0 0 3px rgba(107, 70, 193, 0.1); }
                .select-wrapper { position: relative; }
                @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
            </style>
            
            <div class="row g-4">
              <!-- Panel: Campos del Formulario -->
              <div class="col-lg-12">
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
                          <option value="Mañana">🌅 Mañana (6:00 AM - 12:00 PM)</option>
                          <option value="Tarde">☀️ Tarde (12:00 PM - 6:00 PM)</option>
                          <option value="Noche">🌙 Noche (6:00 PM - 12:00 AM)</option>
                        </select>
                      </div>
                      <div class="col-md-6">
                        <label for="modalidad" class="form-label"><i class="bi bi-laptop text-muted me-1"></i> Modalidad de Formación</label>
                        <select class="form-select" id="modalidad" required>
                          <option value="">Seleccionar modalidad...</option>
                          <option value="Presencial">🏫 Presencial</option>
                          <option value="Virtual">💻 Virtual</option>
                        </select>
                        <div class="form-text mt-1 text-muted" style="font-size: 0.8rem;">Indica cómo se dictará la ficha</div>
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

                <!-- SECCIÓN 2: UBICACIÓN -->
                <div class="form-section" id="section2">
                  <h5 class="section-title">
                    <i class="bi bi-geo-alt text-primary me-2"></i> Ubicación
                  </h5>
                  <div class="row g-3">
                    <div class="col-12">
                      <label for="idSede" class="form-label"><i class="bi bi-building text-muted me-1"></i> Sede</label>
                      <div class="select-wrapper">
                          <select class="form-select" id="idSede">
                            <option value="">Seleccione una sede...</option>
                            ${sedesOptions}
                          </select>
                      </div>
                      <div class="form-text mt-1 text-muted" style="font-size: 0.8rem;">Requerida para seleccionar el ambiente presencial</div>
                    </div>
                    <div class="col-12 mt-3">
                      <label for="idAmbiente" class="form-label"><i class="bi bi-door-closed text-muted me-1"></i> Ambiente Base</label>
                      <div class="select-wrapper">
                          <select class="form-select" id="idAmbiente" disabled>
                            <option value="">Primero seleccione una sede...</option>
                          </select>
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

                <!-- SECCIÓN 3: PROGRAMA -->
                <div class="form-section" id="section3">
                  <h5 class="section-title">
                    <i class="bi bi-mortarboard text-primary me-2"></i> Programa de Formación
                  </h5>
                  <div class="row g-3">
                    <div class="col-12">
                      <label for="idPrograma" class="form-label"><i class="bi bi-book text-muted me-1"></i> Seleccionar Programa</label>
                      <div class="select-wrapper">
                          <select class="form-select" id="idPrograma" required>
                            <option value="">Cargando programas...</option>
                            ${programaOptions}
                          </select>
                      </div>
                    </div>
                  </div>
                  <div class="d-flex justify-content-between mt-4 pt-3 border-top">
                    <button type="button" class="btn btn-outline-secondary d-flex align-items-center gap-2 px-4" onclick="document.getElementById('ficha-modal-form').goToSection(2)">
                      <i class="bi bi-arrow-left"></i> Anterior
                    </button>
                    <button type="button" class="btn btn-primary d-flex align-items-center gap-2 px-4 shadow-sm" onclick="document.getElementById('ficha-modal-form').goToSection(4)">
                      Siguiente <i class="bi bi-arrow-right"></i>
                    </button>
                  </div>
                </div>

                <!-- SECCIÓN 4: FECHAS -->
                <div class="form-section" id="section4">
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
                      <input type="date" class="form-control bg-light" id="fechaFin" readonly>
                      <div class="form-text mt-1 text-muted" style="font-size: 0.8rem;">Se calcula automáticamente base al programa</div>
                    </div>
                  </div>
                  <div class="d-flex justify-content-between mt-4 pt-3 border-top">
                    <button type="button" class="btn btn-outline-secondary d-flex align-items-center gap-2 px-4" onclick="document.getElementById('ficha-modal-form').goToSection(3)">
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

        // Add step navigation logic to the form element
        formEl.goToSection = (stepNumber) => {
            // Validate current section before moving forward
            if (stepNumber > 1) {
                const currentSection = document.querySelector('.form-section.active');
                if (currentSection) {
                    const inputs = currentSection.querySelectorAll('input, select, textarea');
                    let isValid = true;
                    inputs.forEach(input => {
                        if (input.hasAttribute('required') && !input.value) {
                            input.classList.add('is-invalid');
                            isValid = false;
                        } else {
                            input.classList.remove('is-invalid');
                        }
                    });
                    if (!isValid) return; // Prevent advancing if invalid
                }
            }

            document.querySelectorAll('.form-section').forEach(s => s.classList.remove('active'));
            document.getElementById('section' + stepNumber).classList.add('active');
        };

        // Handle Sede change to load Ambientes
        const sedeSelect = document.getElementById('idSede');
        const ambienteSelect = document.getElementById('idAmbiente');

        sedeSelect.addEventListener('change', (e) => {
            const sedeId = e.target.value;
            ambienteSelect.innerHTML = '<option value="">Seleccione un ambiente...</option>';

            if (!sedeId) {
                ambienteSelect.disabled = true;
                return;
            }

            // Filter ambientes by selected Sede
            const filteredAmbientes = this.ambientes.filter(a => String(a.idSede) === String(sedeId));

            if (filteredAmbientes.length === 0) {
                ambienteSelect.innerHTML = '<option value="">No hay ambientes en esta sede</option>';
                ambienteSelect.disabled = true;
            } else {
                ambienteSelect.disabled = false;
                filteredAmbientes.forEach(a => {
                    // Optional chaining robust fallback
                    const areaName = (a.area && a.area.nombreArea) ? a.area.nombreArea :
                        (a.area_formacion && a.area_formacion.nombreArea) ? a.area_formacion.nombreArea :
                            'Sin área';

                    const option = document.createElement('option');
                    option.value = a.idAmbiente;
                    option.textContent = `${a.codigo} - Número: ${a.numero} - Área: ${areaName}`;
                    ambienteSelect.appendChild(option);
                });
            }
        });

        formEl.addEventListener('submit', this.handleFormSubmit.bind(this));

        this.bsModal = new bootstrap.Modal(document.getElementById('ficha-modal'));
    }

    injectDynamicModalFields(ficha = null) {
        document.getElementById('codigoFicha').value = ficha ? ficha.codigoFicha : '';
        document.getElementById('idPrograma').value = ficha ? ficha.idPrograma : '';
        document.getElementById('jornada').value = ficha ? ficha.jornada : 'Mañana';
        document.getElementById('modalidad').value = ficha ? ficha.modalidad : 'Presencial';
        document.getElementById('fechaInicio').value = ficha ? (ficha.fechaInicio || '') : '';
        document.getElementById('fechaFin').value = ficha ? (ficha.fechaFin || '') : '';
        document.getElementById('estado').value = ficha ? (ficha.estado || 'Activo') : 'Activo';

        // Handle Sede and Ambiente population
        const sedeSelect = document.getElementById('idSede');
        const ambienteSelect = document.getElementById('idAmbiente');

        sedeSelect.value = '';
        ambienteSelect.innerHTML = '<option value="">Primero seleccione una sede...</option>';
        ambienteSelect.disabled = true;

        if (ficha && ficha.idAmbiente) {
            // Find the ambiente to know its Sede
            const targetAmbiente = this.ambientes.find(a => String(a.idAmbiente) === String(ficha.idAmbiente));
            if (targetAmbiente && targetAmbiente.idSede) {
                sedeSelect.value = targetAmbiente.idSede;
                // Dispatch change event to populate the Ambientes list
                sedeSelect.dispatchEvent(new Event('change'));

                // Once populated, set the actual ambiente value
                setTimeout(() => {
                    ambienteSelect.value = ficha.idAmbiente;
                }, 50);
            }
        }

        const formEl = document.getElementById('ficha-modal-form');
        formEl.querySelectorAll('.is-invalid').forEach(el => el.classList.remove('is-invalid'));
        document.getElementById('ficha-modal-title').textContent = ficha ? 'Editar Ficha' : 'Nueva Ficha';

        // Reset wizard to step 1
        document.querySelectorAll('.form-section').forEach(s => s.classList.remove('active'));
        document.getElementById('section1').classList.add('active');

        // Auto-calculate expected end date logic
        const progSelect = document.getElementById('idPrograma');
        const startInput = document.getElementById('fechaInicio');
        const endInput = document.getElementById('fechaFin');

        // Make end date readonly since it's auto-calculated
        if (endInput) {
            endInput.setAttribute('readonly', 'true');
            endInput.style.backgroundColor = '#e9ecef';
            endInput.style.pointerEvents = 'none';
        }

        const calculateEndDate = () => {
            if (!progSelect.value || !startInput.value) {
                endInput.value = '';
                return;
            }

            const selectedProg = this.programas.find(p => String(p.idPrograma) === String(progSelect.value));
            if (!selectedProg) return;

            // Get duracion_meses from either snake_case or camelCase relation
            const tipoFormacion = selectedProg.tipo_formacion || selectedProg.tipoFormacion;
            const durationMonths = tipoFormacion ? parseInt(tipoFormacion.duracion_meses) : 0;

            if (durationMonths > 0) {
                const startDate = new Date(startInput.value);
                // Add the duration in months
                startDate.setMonth(startDate.getMonth() + durationMonths);
                // Format back to YYYY-MM-DD
                endInput.value = startDate.toISOString().split('T')[0];
            } else {
                endInput.value = '';
                endInput.removeAttribute('readonly');
                endInput.style.backgroundColor = '';
                endInput.style.pointerEvents = 'auto';
            }
        };

        progSelect.addEventListener('change', calculateEndDate);
        startInput.addEventListener('change', calculateEndDate);

        this.bsModal.show();
    }

    openModal(id = null) {
        this.currentEditId = id;
        document.getElementById('ficha-modal-alert').innerHTML = '';

        let ficha = null;
        if (id) {
            ficha = this.fichas.find(f => String(f.idFicha) === String(id));
        }

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
            codigoFicha: document.getElementById('codigoFicha').value,
            idPrograma: parseInt(document.getElementById('idPrograma').value),
            jornada: document.getElementById('jornada').value,
            modalidad: document.getElementById('modalidad').value,
            fechaInicio: document.getElementById('fechaInicio').value,
            fechaFin: document.getElementById('fechaFin').value,
            estado: document.getElementById('estado').value,
            idAmbiente: document.getElementById('idAmbiente').value ? parseInt(document.getElementById('idAmbiente').value) : null
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
            message: 'Vas a eliminar permanentemente la ficha <strong>' + ficha.codigoFicha + '</strong>. Esta acción no se puede deshacer.',
            confirmText: 'Sí, eliminar',
            cancelText: 'Cancelar'
        });

        if (confirm) {
            try {
                // Optimistic UI update
                const prev = [...this.fichas];
                this.fichas = this.fichas.filter(f => String(f.idFicha) !== String(id));
                this.renderTable();

                await deleteFicha(id);
                this.showAlert('page-alert-container', 'success', 'Ficha eliminada del sistema.');
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
    new FichasPage();
});
