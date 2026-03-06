import { ProtectedRoute } from '../components/ProtectedRoute.js';
import { Navbar, initNavbarEvents } from '../components/Navbar.js';
import { Sidebar, initSidebarEvents } from '../components/Sidebar.js';
import { apiFetch, getFichas, getAmbientes, getFuncionarios, getSedes } from '../utils/api.js';

// Wrapper: apiCall(endpoint, method?, body?)
async function apiCall(endpoint, method = 'GET', body = null) {
    return apiFetch(endpoint, {
        method,
        body: body ? JSON.stringify(body) : undefined
    });
}

class HorarioTitulada {
    constructor() {
        this.fichas = [];
        this.ambientes = [];
        this.instructores = [];
        this.sedes = [];
        this.selectedFicha = null;
        this.selectedSede = null;
        this.selectedPrograma = null;
        this.viewState = 'sedes'; // 'sedes' | 'programas' | 'fichas' | 'horario'

        this.init();
    }

    async init() {
        new ProtectedRoute();
        this.renderLayout();
        initNavbarEvents();
        initSidebarEvents();
        await this.loadDependencies();
        this.setupEventListeners();
    }

    renderLayout() {
        const currentPath = window.location.pathname;
        document.getElementById('app').innerHTML =
            Sidebar(currentPath) +
            '<div class="main-wrapper">' +
            Navbar() +
            '<main class="container-fluid p-4 flex-grow-1" style="background: var(--bg-page);">' +
            '<div id="page-alert-container"></div>' +

            // Header and Breadcrumb
            '<div class="d-flex flex-column flex-sm-row justify-content-between align-items-start align-items-sm-center mb-4 gap-3">' +
            '<div class="d-flex align-items-center gap-3 w-100">' +
            '<div class="page-icon"><i class="bi bi-calendar-week"></i></div>' +
            '<div class="flex-grow-1">' +
            '<h4 class="fw-bold mb-1" style="color:var(--text-dark)">Horario Titulada</h4>' +
            '<nav aria-label="breadcrumb">' +
            '<ol class="breadcrumb mb-0" id="nav-breadcrumb">' +
            '<li class="breadcrumb-item active" aria-current="page">Sedes</li>' +
            '</ol>' +
            '</nav>' +
            '</div>' +
            '</div>' +
            '</div>' +

            // Dynamic Main Content Container
            '<div id="main-content" class="fade-in">' +
            '</div>' +

            // Offcanvas
            '<div class="offcanvas offcanvas-end shadow-lg" tabindex="-1" id="offcanvasHorario" style="width:460px;">' +
            '<div class="offcanvas-header text-white p-4" style="background:linear-gradient(135deg,var(--primary) 0%,hsl(280,60%,55%) 100%);">' +
            '<h5 class="offcanvas-title fw-bold d-flex align-items-center gap-2">' +
            '<i class="bi bi-calendar-plus"></i> Asignar Clase' +
            '</h5>' +
            '<button type="button" class="btn-close btn-close-white" data-bs-dismiss="offcanvas"></button>' +
            '</div>' +
            '<div class="offcanvas-body p-4" style="background:var(--bg-page)">' +
            '<form id="form-horario" novalidate>' +

            // Ficha context
            '<div class="mb-4 p-3 bg-white rounded-3 border">' +
            '<p class="mb-1 text-muted small fw-semibold text-uppercase">Ficha Seleccionada</p>' +
            '<h6 class="mb-0 fw-bold text-primary" id="lbl-ficha-context">...</h6>' +
            '</div>' +

            '<p class="fw-semibold text-dark mb-2"><i class="bi bi-calendar-range me-2 text-muted"></i>1. Rango de Fechas</p>' +
            '<div class="row g-3 mb-4">' +
            '<div class="col-6">' +
            '<label class="form-label small text-muted">Fecha Inicio</label>' +
            '<input type="date" class="form-control" id="fecha_inicio" required>' +
            '</div>' +
            '<div class="col-6">' +
            '<label class="form-label small text-muted">Fecha Fin</label>' +
            '<input type="date" class="form-control" id="fecha_fin" required>' +
            '</div>' +
            '</div>' +

            // Class details (Modalidad, Ambiente, Instructor)
            '<p class="fw-semibold text-dark mb-2"><i class="bi bi-briefcase me-2 text-muted"></i>2. Detalles de la Clase</p>' +
            '<div class="mb-3">' +
            '<label class="form-label small text-muted">Modalidad</label>' +
            '<select class="form-select" id="modalidad_clase" required>' +
            '<option value="presencial">Presencial</option>' +
            '<option value="virtual">Virtual</option>' +
            '</select>' +
            '</div>' +

            '<div class="mb-3" id="container-ambiente">' +
            '<label class="form-label small text-muted">Ambiente (Sede Activa)</label>' +
            '<select class="form-select" id="idAmbiente" required>' +
            '<option value="">Seleccionar ambiente...</option>' +
            '</select>' +
            '</div>' +

            '<div class="mb-4">' +
            '<label class="form-label small text-muted">Instructor</label>' +
            '<select class="form-select" id="idFuncionario" required>' +
            '<option value="">Seleccionar instructor...</option>' +
            '</select>' +
            '</div>' +

            // Time range
            '<p class="fw-semibold text-dark mb-2"><i class="bi bi-clock-history me-2 text-muted"></i>3. Franja Horaria</p>' +
            '<div class="row g-3 mb-3">' +
            '<div class="col-6">' +
            '<label class="form-label small text-muted">Hora Inicio</label>' +
            '<input type="time" class="form-control" id="hora_inicio" required>' +
            '</div>' +
            '<div class="col-6">' +
            '<label class="form-label small text-muted">Hora Fin</label>' +
            '<input type="time" class="form-control" id="hora_fin" required>' +
            '</div>' +
            '</div>' +

            // Days
            '<div class="mb-4">' +
            '<label class="form-label small text-muted d-block mb-2">4. Días de la semana</label>' +
            '<div class="d-flex flex-wrap gap-2" id="dias-container"></div>' +
            '</div>' +

            '<div id="offcanvas-alert"></div>' +
            '</form>' +
            '</div>' +
            '<div class="p-3 bg-white border-top d-flex gap-2">' +
            '<button type="button" class="btn btn-light flex-grow-1 rounded-3" data-bs-dismiss="offcanvas">Cancelar</button>' +
            '<button type="submit" form="form-horario" id="btn-asignar" class="btn btn-purple flex-grow-1 rounded-3 d-flex justify-content-center align-items-center gap-2">' +
            '<i class="bi bi-calendar-check"></i> Asignar' +
            '</button>' +
            '</div>' +
            '</div>' +

            '</main>' +
            '</div>';
    }

    async loadDependencies() {
        try {
            const [fData, aData, iData, sData] = await Promise.all([
                getFichas(),
                getAmbientes(),
                getFuncionarios(),
                getSedes()
            ]);

            // Only Titulada fichas = tipo_formacion "Titulada" & estado Activo
            const allFichas = fData.data || (Array.isArray(fData) ? fData : []);
            this.fichas = allFichas.filter(f => {
                const tipo = f.programa && f.programa.tipoFormacion ? f.programa.tipoFormacion.nombre : '';
                return f.estado === 'Activo' && tipo.toLowerCase().includes('titulada');
            });
            // Fallback: if none match tipo, show all active
            if (this.fichas.length === 0) {
                this.fichas = allFichas.filter(f => f.estado === 'Activo');
            }

            this.ambientes = aData.data || (Array.isArray(aData) ? aData : []);
            this.sedes = sData.data || (Array.isArray(sData) ? sData : []);

            const allFuncs = iData.data || (Array.isArray(iData) ? iData : []);
            this.instructores = allFuncs.filter(f =>
                f.roles && f.roles.some(r => r.nombre === 'Instructor')
            );
            if (this.instructores.length === 0) this.instructores = allFuncs;

            if (this.instructores.length === 0) this.instructores = allFuncs;

            this.renderBreadcrumb();
            this.renderContent();
            this.populateSelects();

        } catch (err) {
            this.showAlert('page-alert-container', 'danger', 'Error al cargar datos: ' + err.message);
        }
    }

    populateSelects() {
        this.renderInstructores();

        // Ambientes inicial
        this.renderAmbientes();

        // Días
        const dias = ['Lunes', 'Martes', 'Miercoles', 'Jueves', 'Viernes', 'Sabado', 'Domingo'];
        const cont = document.getElementById('dias-container');
        cont.innerHTML = dias.map((d, i) => {
            const val = i + 1;
            return '<input type="checkbox" class="btn-check" id="dia_' + val + '" value="' + val + '" autocomplete="off">' +
                '<label class="btn btn-outline-primary rounded-pill btn-sm d-flex align-items-center justify-content-center" ' +
                'style="width:40px;height:40px;font-size:0.8rem;" for="dia_' + val + '">' + d.charAt(0) + '</label>';
        }).join('');
    }

    renderInstructores(idAreaPreferida = null) {
        let sortedInstructores = [...this.instructores];

        if (idAreaPreferida) {
            sortedInstructores.sort((a, b) => {
                const aHasArea = a.areas && a.areas.some(area => String(area.idArea) === String(idAreaPreferida));
                const bHasArea = b.areas && b.areas.some(area => String(area.idArea) === String(idAreaPreferida));

                if (aHasArea && !bHasArea) return -1;
                if (!aHasArea && bHasArea) return 1;
                return 0; // maintain original alphabetical or ID order
            });
        }

        const selInst = document.getElementById('idFuncionario');
        if (!selInst) return;

        selInst.innerHTML = '<option value="">Seleccionar instructor...</option>' +
            sortedInstructores.map(i => {
                const nombre = i.nombre || 'Sin nombre';
                const areas = i.areas && i.areas.length > 0 ? i.areas.map(a => a.nombreArea).join(', ') : 'Sin área';

                // Si preferimos un área y este instructor la tiene, mostramos un pequeño highlight (e.g. estrella o texto)
                const isMatch = idAreaPreferida && i.areas && i.areas.some(a => String(a.idArea) === String(idAreaPreferida));
                const prefix = isMatch ? '★ ' : '';

                return '<option value="' + i.idFuncionario + '">' + prefix + nombre + ' (' + areas + ')</option>';
            }).join('');
    }

    renderAmbientes() {
        const sel = document.getElementById('idAmbiente');
        if (!sel || !this.selectedSede) return;

        // Automatically filter block environments by currently selected campus (Sede)
        const filtered = this.ambientes.filter(a => String(a.idSede) === String(this.selectedSede.idSede));

        sel.innerHTML = '<option value="">Seleccionar ambiente...</option>' +
            filtered.map(a => {
                const areaNombre = a.area ? a.area.nombreArea : 'Sin área';
                return '<option value="' + a.idAmbiente + '">Blq ' + a.bloque + ' - Amb ' + a.numero + ' (' + areaNombre + ')</option>';
            }).join('');
    }

    setupEventListeners() {
        // Search - We can delegate search to specific views if needed, 
        // but for now, the UI relies on clicking through the hierarchy.
        // We will bind search later if required for the specific view.

        // Modalidad → toggle ambiente
        document.getElementById('modalidad_clase')?.addEventListener('change', e => {
            const isVirtual = e.target.value === 'virtual';
            const cont = document.getElementById('container-ambiente');
            const selAmb = document.getElementById('idAmbiente');

            cont.style.opacity = isVirtual ? '0.4' : '1';
            cont.style.pointerEvents = isVirtual ? 'none' : '';
            selAmb.required = !isVirtual;

            if (isVirtual) {
                selAmb.value = "";
                this.renderInstructores(); // Reset sorting
            }
        });

        // Ambiente -> reordenar instructores por área
        document.getElementById('idAmbiente')?.addEventListener('change', e => {
            const selectedAmbId = e.target.value;
            if (!selectedAmbId) {
                this.renderInstructores();
                return;
            }

            const ambObj = this.ambientes.find(a => String(a.idAmbiente) === String(selectedAmbId));
            if (ambObj && ambObj.idArea) {
                this.renderInstructores(ambObj.idArea);
            } else {
                this.renderInstructores();
            }
        });

        // Form submit
        document.getElementById('form-horario')?.addEventListener('submit', e => {
            e.preventDefault();
            this.handleSubmit();
        });
    }

    renderBreadcrumb() {
        const bc = document.getElementById('nav-breadcrumb');
        if (!bc) return;

        let html = '';

        // Sedes
        if (this.viewState === 'sedes') {
            html += '<li class="breadcrumb-item active" aria-current="page">Sedes</li>';
        } else {
            html += '<li class="breadcrumb-item"><a href="#" id="bc-sedes" class="text-decoration-none">Sedes</a></li>';
        }

        // Programas
        if (['programas', 'fichas', 'horario'].includes(this.viewState) && this.selectedSede) {
            if (this.viewState === 'programas') {
                html += '<li class="breadcrumb-item active" aria-current="page">' + this.selectedSede.nombre + '</li>';
            } else {
                html += '<li class="breadcrumb-item"><a href="#" id="bc-programas" class="text-decoration-none">' + this.selectedSede.nombre + '</a></li>';
            }
        }

        // Fichas
        if (['fichas', 'horario'].includes(this.viewState) && this.selectedPrograma) {
            if (this.viewState === 'fichas') {
                html += '<li class="breadcrumb-item active" aria-current="page">' + this.selectedPrograma.nombre + '</li>';
            } else {
                html += '<li class="breadcrumb-item"><a href="#" id="bc-fichas" class="text-decoration-none">' + this.selectedPrograma.nombre + '</a></li>';
            }
        }

        // Horario
        if (this.viewState === 'horario' && this.selectedFicha) {
            html += '<li class="breadcrumb-item active" aria-current="page">Ficha ' + this.selectedFicha.codigoFicha + '</li>';
        }

        bc.innerHTML = html;

        // Attach events
        document.getElementById('bc-sedes')?.addEventListener('click', (e) => {
            e.preventDefault();
            this.setViewState('sedes');
        });
        document.getElementById('bc-programas')?.addEventListener('click', (e) => {
            e.preventDefault();
            this.setViewState('programas');
        });
        document.getElementById('bc-fichas')?.addEventListener('click', (e) => {
            e.preventDefault();
            this.setViewState('fichas');
        });
    }

    setViewState(state) {
        this.viewState = state;
        if (state === 'sedes') {
            this.selectedSede = null;
            this.selectedPrograma = null;
            this.selectedFicha = null;
        } else if (state === 'programas') {
            this.selectedPrograma = null;
            this.selectedFicha = null;
        } else if (state === 'fichas') {
            this.selectedFicha = null;
        }
        this.renderBreadcrumb();
        this.renderContent();
    }

    renderContent() {
        const container = document.getElementById('main-content');
        container.innerHTML = '';

        switch (this.viewState) {
            case 'sedes':
                this.renderSedesView(container);
                break;
            case 'programas':
                this.renderProgramasView(container);
                break;
            case 'fichas':
                this.renderFichasView(container);
                break;
            case 'horario':
                this.renderHorarioView(container);
                break;
        }
    }

    renderSedesView(container) {
        if (!this.sedes.length) {
            container.innerHTML = '<div class="alert alert-info">No hay sedes disponibles.</div>';
            return;
        }

        let html = '<div class="row g-4">';

        this.sedes.forEach(sede => {
            // Count unique programs in this sede based on fichas
            const myFichas = this.fichas.filter(f => f.ambiente && String(f.ambiente.idSede) === String(sede.idSede));
            const distinctPrograms = new Set(myFichas.filter(f => f.idPrograma).map(f => f.idPrograma));

            html += `
                <div class="col-md-4 col-sm-6">
                    <div class="card h-100 border-0 shadow-sm rounded-4 hover-lift" style="cursor: pointer; transition: transform 0.2s;" data-id="${sede.idSede}">
                        <div class="card-body p-4">
                            <div class="d-flex align-items-center mb-3">
                                <div class="bg-primary bg-opacity-10 text-primary rounded-circle p-3 d-flex align-items-center justify-content-center me-3" style="width: 50px; height: 50px;">
                                    <i class="bi bi-building fs-4"></i>
                                </div>
                                <div>
                                    <h5 class="fw-bold mb-0" style="color:var(--text-dark)">${sede.nombre}</h5>
                                    <small class="text-muted"><i class="bi bi-geo-alt me-1"></i>${sede.direccion || 'Sin dirección'}</small>
                                </div>
                            </div>
                            <div class="mt-3 pt-3 border-top">
                                <div class="d-flex justify-content-between align-items-center">
                                    <span class="badge bg-light text-dark border"><i class="bi bi-journal-bookmark me-1"></i>${distinctPrograms.size} programas</span>
                                    <i class="bi bi-arrow-right text-primary"></i>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            `;
        });

        html += '</div>';
        container.innerHTML = html;

        container.querySelectorAll('.card').forEach(card => {
            card.addEventListener('click', () => {
                const idSede = card.dataset.id;
                this.selectedSede = this.sedes.find(s => String(s.idSede) === idSede);
                this.setViewState('programas');
            });
            card.addEventListener('mouseenter', () => card.style.transform = 'translateY(-5px)');
            card.addEventListener('mouseleave', () => card.style.transform = 'translateY(0)');
        });
    }

    renderProgramasView(container) {
        const myFichas = this.fichas.filter(f => f.ambiente && String(f.ambiente.idSede) === String(this.selectedSede.idSede) && f.programa);

        // Group by idPrograma
        const propsById = {};
        myFichas.forEach(f => {
            if (!propsById[f.idPrograma]) {
                propsById[f.idPrograma] = {
                    programa: f.programa,
                    fichasCount: 0
                };
            }
            propsById[f.idPrograma].fichasCount++;
        });

        const distinctPrograms = Object.values(propsById);

        if (!distinctPrograms.length) {
            container.innerHTML = `
                <div class="text-center py-5">
                    <i class="bi bi-journal-x fs-1 text-muted mb-3 d-block opacity-50"></i>
                    <h5 class="fw-bold">Sin Programas</h5>
                    <p class="text-muted">No se encontraron programas de formación activos con fichas asignadas a esta sede.</p>
                    <button class="btn btn-outline-primary mt-2" id="btn-back">Volver a Sedes</button>
                </div>
            `;
            document.getElementById('btn-back')?.addEventListener('click', () => this.setViewState('sedes'));
            return;
        }

        let html = `
            <div class="d-flex justify-content-between align-items-center mb-4">
                <button class="btn btn-light rounded-pill border shadow-sm" id="btn-back-sedes">
                    <i class="bi bi-arrow-left me-2"></i>Volver
                </button>
                <div class="input-group" style="max-width:320px;">
                    <span class="input-group-text bg-white"><i class="bi bi-search text-muted"></i></span>
                    <input type="text" class="form-control" id="search-programa" placeholder="Buscar programa...">
                </div>
            </div>
            <div class="row g-4" id="programas-grid">
        `;

        const renderProgCards = (programs) => {
            let ch = '';
            programs.forEach(({ programa, fichasCount }) => {
                const tipo = programa.tipoFormacion ? programa.tipoFormacion.nombre : 'Titulada';
                let colorClass = 'primary';
                if (tipo.toLowerCase().includes('tecnólogo')) colorClass = 'success';
                else if (tipo.toLowerCase().includes('técnico')) colorClass = 'info';

                ch += `
                    <div class="col-md-6 col-lg-4 prog-card">
                        <div class="card h-100 border-0 shadow-sm rounded-4 hover-lift" style="cursor: pointer; transition: transform 0.2s;" data-id="${programa.idPrograma}">
                            <div class="card-body p-4">
                                <div class="mb-2">
                                    <span class="badge bg-${colorClass} bg-opacity-10 text-${colorClass} rounded-pill px-3 py-2 fw-semibold">${tipo}</span>
                                </div>
                                <h6 class="fw-bold mb-1 mt-3" style="color:var(--text-dark); line-height: 1.4">${programa.nombre}</h6>
                                <p class="small text-muted mb-3">Código: ${programa.codigo || 'N/A'}</p>
                                
                                <div class="mt-auto pt-3 border-top">
                                    <div class="d-flex justify-content-between align-items-center">
                                        <div class="d-flex align-items-center text-muted small">
                                            <i class="bi bi-people-fill me-2 text-primary opacity-75"></i>
                                            <span class="fw-medium">${fichasCount} ficha(s) activa(s)</span>
                                        </div>
                                        <div class="bg-light rounded-circle d-flex align-items-center justify-content-center" style="width: 30px; height: 30px;">
                                            <i class="bi bi-chevron-right text-muted" style="font-size: 0.8rem;"></i>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                `;
            });
            return ch;
        };

        html += renderProgCards(distinctPrograms);
        html += '</div>';
        container.innerHTML = html;

        document.getElementById('btn-back-sedes')?.addEventListener('click', () => this.setViewState('sedes'));

        const attachCardEvents = () => {
            container.querySelectorAll('.card.hover-lift').forEach(card => {
                card.addEventListener('click', () => {
                    const idProg = card.dataset.id;
                    const p = distinctPrograms.find(dp => String(dp.programa.idPrograma) === idProg);
                    if (p) {
                        this.selectedPrograma = p.programa;
                        this.setViewState('fichas');
                    }
                });
                card.addEventListener('mouseenter', () => card.style.transform = 'translateY(-5px)');
                card.addEventListener('mouseleave', () => card.style.transform = 'translateY(0)');
            });
        };
        attachCardEvents();

        document.getElementById('search-programa')?.addEventListener('input', (e) => {
            const q = e.target.value.toLowerCase();
            const filtered = distinctPrograms.filter(dp =>
                dp.programa.nombre.toLowerCase().includes(q) ||
                (dp.programa.codigo && dp.programa.codigo.toLowerCase().includes(q))
            );
            document.getElementById('programas-grid').innerHTML = renderProgCards(filtered);
            attachCardEvents();
        });
    }

    renderFichasView(container) {
        const myFichas = this.fichas.filter(f =>
            f.ambiente &&
            String(f.ambiente.idSede) === String(this.selectedSede.idSede) &&
            String(f.idPrograma) === String(this.selectedPrograma.idPrograma)
        );

        if (!myFichas.length) {
            container.innerHTML = `
                <div class="text-center py-5">
                    <i class="bi bi-people x fs-1 text-muted mb-3 d-block opacity-50"></i>
                    <h5 class="fw-bold">Sin Fichas</h5>
                    <p class="text-muted">No se encontraron fichas activas para este programa en esta sede.</p>
                    <button class="btn btn-outline-primary mt-2" id="btn-back-prog">Volver a Programas</button>
                </div>
            `;
            document.getElementById('btn-back-prog')?.addEventListener('click', () => this.setViewState('programas'));
            return;
        }

        let html = `
            <div class="d-flex justify-content-between align-items-center mb-4">
                <div class="d-flex align-items-center gap-3">
                    <button class="btn btn-light rounded-pill border shadow-sm" id="btn-back-prog">
                        <i class="bi bi-arrow-left me-2"></i>Volver
                    </button>
                    <div>
                        <h5 class="mb-0 fw-bold" style="color:var(--text-dark);">${this.selectedPrograma.nombre}</h5>
                        <small class="text-muted">Selecciona una ficha para ver su horario</small>
                    </div>
                </div>
            </div>
            <div class="row g-4">
        `;

        myFichas.forEach(f => {
            let mtIcon = f.modalidad === 'virtual' ? 'bi-laptop' : 'bi-person-workspace';
            let colorMod = f.modalidad === 'virtual' ? 'info' : 'primary';

            html += `
                <div class="col-md-4 col-sm-6">
                    <div class="card h-100 border-0 shadow-sm rounded-4 hover-lift" style="cursor: pointer; transition: transform 0.2s; background: linear-gradient(145deg, #ffffff, #fdfdfd);" data-id="${f.idFicha}">
                        <div class="card-body p-4 position-relative overflow-hidden">
                            <!-- Background Decoration -->
                            <i class="bi bi-grid-3x3-gap-fill position-absolute text-light" style="font-size: 8rem; right: -2rem; bottom: -2rem; opacity: 0.5;"></i>
                            
                            <div class="position-relative z-1">
                                <span class="badge bg-${colorMod} bg-opacity-10 text-${colorMod} px-3 py-2 rounded-pill fw-semibold mb-3">
                                    <i class="bi ${mtIcon} me-1"></i>${f.modalidad === 'virtual' ? 'Virtual' : 'Presencial'}
                                </span>
                                
                                <h3 class="fw-bold mb-1 text-dark">Ficha ${f.codigoFicha}</h3>
                                
                                <div class="d-flex gap-3 mt-4 text-muted small">
                                    <div><i class="bi bi-clock me-1"></i>${f.jornada || 'Sin jornada'}</div>
                                    <div><i class="bi bi-check-circle me-1 text-success"></i>Activa</div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            `;
        });

        html += '</div>';
        container.innerHTML = html;

        document.getElementById('btn-back-prog')?.addEventListener('click', () => this.setViewState('programas'));

        container.querySelectorAll('.card.hover-lift').forEach(card => {
            card.addEventListener('click', () => {
                this.selectedFicha = myFichas.find(f => String(f.idFicha) === card.dataset.id);
                this.setViewState('horario');
                this.selectFicha(this.selectedFicha.idFicha);
            });
            card.addEventListener('mouseenter', () => card.style.transform = 'translateY(-5px)');
            card.addEventListener('mouseleave', () => card.style.transform = 'translateY(0)');
        });
    }

    renderHorarioView(container) {
        container.innerHTML = `
            <div class="d-flex justify-content-between align-items-center mb-4">
                <button class="btn btn-light rounded-pill border shadow-sm" id="btn-back-fichas">
                    <i class="bi bi-arrow-left me-2"></i>Volver a Fichas
                </button>
            </div>
            <div class="card border-0 shadow-sm rounded-4" id="calendario-card" style="min-height:70vh;">
                <div class="card-body p-5 text-center d-flex flex-column align-items-center justify-content-center text-muted">
                    <div class="spinner-border text-primary mb-3" role="status"></div>
                    <p class="small mb-0">Cargando horario...</p>
                </div>
            </div>
        `;

        document.getElementById('btn-back-fichas')?.addEventListener('click', () => this.setViewState('fichas'));
    }

    renderFichasList(fichasArr) {
        // Obsolete in new layout paradigm, left intentionally empty to avoid errors
    }

    async selectFicha(idFicha) {
        this.selectedFicha = this.fichas.find(f => String(f.idFicha) === String(idFicha));
        if (!this.selectedFicha) return;

        const card = document.getElementById('calendario-card');
        card.innerHTML = '<div class="card-body p-5 text-center d-flex flex-column align-items-center justify-content-center">' +
            '<div class="spinner-border text-primary mb-3" role="status"></div>' +
            '<p class="text-muted small">Cargando horario de ' + this.selectedFicha.codigoFicha + '...</p>' +
            '</div>';

        // Prepare offcanvas context
        document.getElementById('lbl-ficha-context').innerHTML =
            this.selectedFicha.codigoFicha +
            ' <span class="badge bg-light text-dark border fw-normal ms-1">' + (this.selectedFicha.jornada || '') + '</span>';
        if (this.selectedFicha.fechaInicio) document.getElementById('fecha_inicio').value = this.selectedFicha.fechaInicio;
        if (this.selectedFicha.fechaFin) document.getElementById('fecha_fin').value = this.selectedFicha.fechaFin;

        // Render environments for the currently selected campus
        this.renderAmbientes();

        // Ambiente already prefilled logic removed (or we can select an ambiente and trigger area re-sort)
        const selAmb = document.getElementById('idAmbiente');
        if (selAmb) selAmb.value = '';
        this.renderInstructores(); // Reset instructors on open

        try {
            const data = await apiCall('/horariosPorFicha/' + idFicha);
            this.renderGrid(this.selectedFicha, data.grilla || {});
        } catch (err) {
            card.innerHTML = '<div class="card-body p-5 text-center text-danger">' +
                '<i class="bi bi-exclamation-triangle fs-1 mb-3 d-block opacity-50"></i>' +
                '<p>' + err.message + '</p></div>';
        }
    }

    renderGrid(ficha, grilla) {
        const card = document.getElementById('calendario-card');
        const isEmpty = Object.keys(grilla).length === 0;

        let header = '<div class="card-header bg-white border-0 d-flex justify-content-between align-items-center pt-4 pb-2 px-4">' +
            '<div>' +
            '<h5 class="fw-bold mb-0" style="color:var(--text-dark)">Ficha ' + ficha.codigoFicha + '</h5>' +
            '<p class="small mb-0" style="color:var(--text-muted)">' + (ficha.programa ? ficha.programa.nombre : '') + '</p>' +
            '</div>' +
            '<button class="btn btn-purple rounded-pill px-4 d-flex align-items-center gap-2 shadow-sm" data-bs-toggle="offcanvas" data-bs-target="#offcanvasHorario">' +
            '<i class="bi bi-plus-lg"></i><span>Agregar Clase</span>' +
            '</button>' +
            '</div>';

        let body = '<div class="card-body pt-0 px-4 pb-4" style="height: 600px;">';

        if (isEmpty) {
            body += '<div class="text-center py-5 text-muted h-100 d-flex flex-column justify-content-center">' +
                '<i class="bi bi-calendar-x fs-1 d-block mb-3 opacity-25"></i>' +
                '<p class="fw-medium">Sin clases asignadas</p>' +
                '<p class="small">Usa "Agregar Clase" para comenzar.</p></div>';
            body += '</div>';
            card.innerHTML = header + body;
        } else {
            body += '<div id="fullcalendar-container" class="h-100"></div></div>';
            card.innerHTML = header + body;

            // Map days to specific dates in a dummy week: 2024-01-01 (Monday) to 2024-01-07 (Sunday)
            const dayMap = {
                'Lunes': '2024-01-01',
                'Martes': '2024-01-02',
                'Miercoles': '2024-01-03',
                'Jueves': '2024-01-04',
                'Viernes': '2024-01-05',
                'Sabado': '2024-01-06',
                'Domingo': '2024-01-07'
            };

            const events = [];

            // To prevent duplicate events for contiguous blocks, we group them by idAsignacion and day
            const groupedEvents = {}; // { idAsignacion_dia: { ...eventData, startHour, endHour } }

            for (const [franja, diasMap] of Object.entries(grilla)) {
                // franja is "06:00 - 08:00"
                const [startStr, endStr] = franja.split(' - ');

                for (const [dia, celda] of Object.entries(diasMap)) {
                    if (celda) {
                        const key = `${celda.idAsignacion}_${dia}`;

                        if (!groupedEvents[key]) {
                            const isVirtual = celda.modalidad === 'virtual';
                            const color = isVirtual ? '#0dcaf0' : '#7e57c2'; // Info or Purple
                            const bgColor = isVirtual ? 'rgba(13, 202, 240, 0.1)' : 'rgba(126, 87, 194, 0.1)';

                            groupedEvents[key] = {
                                id: celda.idAsignacion,
                                title: celda.instructor + (isVirtual ? ' (Virtual)' : `\n📍 ${celda.ambiente}`),
                                dateStr: dayMap[dia],
                                startHour: startStr,
                                endHour: endStr,
                                backgroundColor: bgColor,
                                borderColor: color,
                                textColor: color,
                                extendedProps: {
                                    instructor: celda.instructor,
                                    ambiente: celda.ambiente,
                                    modalidad: celda.modalidad
                                }
                            };
                        } else {
                            // Extend the end time if the block is contiguous
                            // We assume the grid is processed in order of hours
                            if (endStr > groupedEvents[key].endHour) {
                                groupedEvents[key].endHour = endStr;
                            }
                        }
                    }
                }
            }

            for (const key in groupedEvents) {
                const group = groupedEvents[key];
                events.push({
                    id: group.id,
                    title: group.title,
                    start: `${group.dateStr}T${group.startHour}:00`,
                    end: `${group.dateStr}T${group.endHour}:00`,
                    backgroundColor: group.backgroundColor,
                    borderColor: group.borderColor,
                    textColor: group.textColor,
                    extendedProps: group.extendedProps
                });
            }

            const calendarEl = document.getElementById('fullcalendar-container');
            const calendar = new FullCalendar.Calendar(calendarEl, {
                initialView: 'timeGridWeek',
                initialDate: '2024-01-01', // Lock to our dummy week
                headerToolbar: false, // Hide header since week is static
                allDaySlot: false,
                slotMinTime: '06:00:00',
                slotMaxTime: '24:00:00',
                expandRows: true, // Fill vertical space
                hiddenDays: [], // Show all 7 days
                dayHeaders: true,
                dayHeaderFormat: { weekday: 'long' },
                locale: 'es',
                events: events,
                eventContent: function (arg) {
                    const props = arg.event.extendedProps;
                    const isVirtual = props.modalidad === 'virtual';
                    const icon = isVirtual ? 'bi-laptop' : 'bi-building';

                    return {
                        html: `
                            <div class="p-1 h-100 d-flex flex-column position-relative" style="overflow: hidden;">
                                <div class="fw-bold mb-1 lh-sm" style="font-size: 0.8rem;">
                                    ${props.instructor}
                                </div>
                                <div class="text-truncate" style="font-size: 0.75rem; opacity: 0.9;">
                                    <i class="bi ${icon}"></i> ${props.ambiente || 'Virtual'}
                                </div>
                                <button class="btn btn-sm text-danger p-0 position-absolute top-0 end-0 delete-btn d-none" 
                                        data-id="${arg.event.id}" 
                                        style="line-height:1; transform: translate(25%, -25%); background: white; border-radius: 50%; box-shadow: 0 0 3px rgba(0,0,0,0.2);">
                                    <i class="bi bi-x-circle-fill"></i>
                                </button>
                            </div>
                        `
                    };
                },
                eventMouseEnter: function (info) {
                    const btn = info.el.querySelector('.delete-btn');
                    if (btn) btn.classList.remove('d-none');
                },
                eventMouseLeave: function (info) {
                    const btn = info.el.querySelector('.delete-btn');
                    if (btn) btn.classList.add('d-none');
                }
            });

            calendar.render();

            // Allow delete button to work inside FullCalendar logic
            calendarEl.addEventListener('click', (e) => {
                const btn = e.target.closest('.delete-btn');
                if (btn) {
                    e.stopPropagation();
                    this.deleteAsignacion(btn.dataset.id);
                }
            });
        }
    }

    async handleSubmit() {
        const dias = Array.from(document.querySelectorAll('#dias-container .btn-check:checked')).map(c => parseInt(c.value));
        if (!dias.length) {
            this.showAlert('offcanvas-alert', 'warning', 'Selecciona al menos un día de la semana.');
            return;
        }

        const modalidad = document.getElementById('modalidad_clase').value;
        const idAmbiente = parseInt(document.getElementById('idAmbiente').value);

        if (modalidad === 'presencial' && !idAmbiente) {
            this.showAlert('offcanvas-alert', 'warning', 'Selecciona un ambiente para la modalidad presencial.');
            return;
        }

        const bloqueData = {
            hora_inicio: document.getElementById('hora_inicio').value + ':00',
            hora_fin: document.getElementById('hora_fin').value + ':00',
            modalidad,
            tipoDeFormacion: 'Titulada',
            idFuncionario: parseInt(document.getElementById('idFuncionario').value),
            idFicha: this.selectedFicha.idFicha, // Para excluir conflictos de ambiente con la misma ficha
            dias
        };
        if (modalidad === 'presencial') bloqueData.idAmbiente = idAmbiente;

        const btn = document.getElementById('btn-asignar');
        btn.disabled = true;
        btn.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span>Asignando...';

        try {
            // 1. Crear bloque horario
            const resBloque = await apiCall('/crearBloque', 'POST', bloqueData);
            const idBloque = resBloque.idBloque || (resBloque.bloque && resBloque.bloque.idBloque);
            if (!idBloque) throw new Error('No se obtuvo el ID del bloque.');

            // 2. Crear asignación a la ficha
            await apiCall('/crearAsignacion', 'POST', {
                idFicha: this.selectedFicha.idFicha,
                idBloque,
                fecha_inicio: document.getElementById('fecha_inicio').value,
                fecha_fin: document.getElementById('fecha_fin').value,
                estado: 'activo'
            });

            // Cerrar offcanvas y recargar
            bootstrap.Offcanvas.getInstance(document.getElementById('offcanvasHorario'))?.hide();
            document.getElementById('form-horario').reset();
            document.getElementById('offcanvas-alert').innerHTML = '';
            this.showAlert('page-alert-container', 'success', 'Clase asignada correctamente al horario.');
            this.selectFicha(this.selectedFicha.idFicha);

        } catch (err) {
            let msg = err.message;
            if (msg.toLowerCase().includes('conflicto')) {
                msg = '<i class="bi bi-exclamation-triangle-fill me-2"></i>' + msg;
            }
            this.showAlert('offcanvas-alert', 'danger', msg);
        } finally {
            btn.disabled = false;
            btn.innerHTML = '<i class="bi bi-calendar-check"></i> Asignar';
        }
    }

    async deleteAsignacion(id) {
        if (!confirm('¿Eliminar esta clase del horario?')) return;
        try {
            await apiCall('/eliminarAsignacion/' + id, 'DELETE');
            this.showAlert('page-alert-container', 'success', 'Clase eliminada correctamente.');
            this.selectFicha(this.selectedFicha.idFicha);
        } catch (err) {
            this.showAlert('page-alert-container', 'danger', 'Error al eliminar: ' + err.message);
        }
    }

    showAlert(containerId, type, message) {
        const el = document.getElementById(containerId);
        if (!el) return;
        const icons = { success: 'check-circle', danger: 'x-circle', warning: 'exclamation-triangle', info: 'info-circle' };
        el.innerHTML = '<div class="alert alert-' + type + ' alert-dismissible fade show d-flex align-items-center gap-3 rounded-4 shadow-sm" role="alert">' +
            '<i class="bi bi-' + (icons[type] || 'info-circle') + ' fs-5 flex-shrink-0"></i>' +
            '<div>' + message + '</div>' +
            '<button type="button" class="btn-close ms-auto" data-bs-dismiss="alert"></button>' +
            '</div>';
        if (type === 'success') {
            setTimeout(() => {
                el.querySelector('.alert')?.remove();
            }, 4000);
        }
    }
}

document.addEventListener('DOMContentLoaded', () => {
    new HorarioTitulada();
});
