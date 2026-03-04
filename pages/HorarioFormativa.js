import { ProtectedRoute } from '../components/ProtectedRoute.js';
import { Navbar, initNavbarEvents } from '../components/Navbar.js';
import { Sidebar, initSidebarEvents } from '../components/Sidebar.js';
import { apiCall as apiFetchUtil, getFichas, getAmbientes, getFuncionarios, getSedes } from '../utils/api.js';

// Local wrapper so we can call it with (url, method, body)
async function apiCall(endpoint, method = 'GET', body = null) {
    return apiFetchUtil(endpoint, {
        method,
        body: body ? JSON.stringify(body) : undefined
    });
}

class HorarioFormativa {
    constructor() {
        this.fichas = [];
        this.ambientes = [];
        this.instructores = [];
        this.sedes = [];
        this.selectedFicha = null;

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

            // Header
            '<div class="d-flex flex-column flex-sm-row justify-content-between align-items-start align-items-sm-center mb-4 gap-3">' +
            '<div class="d-flex align-items-center gap-3">' +
            '<div class="page-icon"><i class="bi bi-calendar-event"></i></div>' +
            '<div>' +
            '<h4 class="fw-bold mb-0" style="color:var(--text-dark)">Horario Formativa</h4>' +
            '<small style="color:var(--text-muted)">Gestión de horarios para cursos cortos y complementarios</small>' +
            '</div>' +
            '</div>' +
            '<div class="input-group" style="max-width:320px;">' +
            '<span class="input-group-text bg-white"><i class="bi bi-search text-muted"></i></span>' +
            '<input type="text" class="form-control" id="search-ficha" placeholder="Buscar ficha...">' +
            '</div>' +
            '</div>' +

            // Two-column content
            '<div class="row g-4">' +

            // Left: Fichas list
            '<div class="col-md-3">' +
            '<div class="card border-0 shadow-sm rounded-4" style="min-height:70vh;">' +
            '<div class="card-header bg-white border-bottom py-3 px-4 rounded-top-4">' +
            '<h6 class="mb-0 fw-bold" style="color:var(--text-dark)"><i class="bi bi-list-ul me-2 text-primary"></i>Fichas Activas</h6>' +
            '</div>' +
            '<div class="list-group list-group-flush" id="fichas-list" style="max-height:65vh;overflow-y:auto;border-radius:0 0 1rem 1rem;">' +
            '</div>' +
            '</div>' +
            '</div>' +

            // Right: Schedule grid
            '<div class="col-md-9">' +
            '<div class="card border-0 shadow-sm rounded-4" id="calendario-card" style="min-height:70vh;">' +
            '<div class="card-body p-5 text-center d-flex flex-column align-items-center justify-content-center text-muted">' +
            '<i class="bi bi-calendar-event fs-1 mb-3 opacity-25"></i>' +
            '<h5 class="fw-semibold">Selecciona una ficha</h5>' +
            '<p class="small mb-0">Elige una ficha de la lista para ver y gestionar su horario semanal.</p>' +
            '</div>' +
            '</div>' +
            '</div>' +

            '</div>' +

            // Offcanvas
            '<div class="offcanvas offcanvas-end shadow-lg" tabindex="-1" id="offcanvasHorario" style="width:460px;">' +
            '<div class="offcanvas-header text-white p-4" style="background:linear-gradient(135deg,hsl(280,60%,55%) 0%,var(--primary) 100%);">' +
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

            // Date range
            '<p class="fw-semibold text-dark mb-2"><i class="bi bi-calendar-range me-2 text-muted"></i>Rango de Fechas</p>' +
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

            // Class details
            '<p class="fw-semibold text-dark mb-2"><i class="bi bi-briefcase me-2 text-muted"></i>Detalles de la Clase</p>' +
            '<div class="mb-3">' +
            '<label class="form-label small text-muted">Instructor</label>' +
            '<select class="form-select" id="idFuncionario" required>' +
            '<option value="">Seleccionar instructor...</option>' +
            '</select>' +
            '</div>' +
            '<div class="mb-3">' +
            '<label class="form-label small text-muted">Modalidad</label>' +
            '<select class="form-select" id="modalidad_clase" required>' +
            '<option value="presencial">Presencial</option>' +
            '<option value="virtual">Virtual</option>' +
            '</select>' +
            '</div>' +
            '<div class="mb-4" id="container-ambiente">' +
            '<label class="form-label small text-muted">Filtrar por Sede</label>' +
            '<select class="form-select form-select-sm mb-2" id="idSedeFiltro">' +
            '<option value="">Todas las sedes...</option>' +
            '</select>' +
            '<label class="form-label small text-muted">Ambiente</label>' +
            '<select class="form-select" id="idAmbiente" required>' +
            '<option value="">Seleccionar ambiente...</option>' +
            '</select>' +
            '</div>' +

            // Time range
            '<p class="fw-semibold text-dark mb-2"><i class="bi bi-clock-history me-2 text-muted"></i>Franja Horaria</p>' +
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
            '<label class="form-label small text-muted d-block mb-2">Días de la semana</label>' +
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

            // Formativa = fichas whose programa tipo is NOT "Titulada" (complementaria, técnica, etc.)
            const allFichas = fData.data || (Array.isArray(fData) ? fData : []);
            this.fichas = allFichas.filter(f => {
                const tipo = f.programa && f.programa.tipoFormacion ? f.programa.tipoFormacion.nombre : '';
                return f.estado === 'Activo' && !tipo.toLowerCase().includes('titulada');
            });
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

            this.renderFichasList(this.fichas);
            this.populateSelects();

        } catch (err) {
            this.showAlert('page-alert-container', 'danger', 'Error al cargar datos: ' + err.message);
        }
    }

    populateSelects() {
        const selInst = document.getElementById('idFuncionario');
        selInst.innerHTML = '<option value="">Seleccionar instructor...</option>' +
            this.instructores.map(i => '<option value="' + i.idFuncionario + '">' + (i.nombre || 'Sin nombre') + '</option>').join('');

        const selSede = document.getElementById('idSedeFiltro');
        selSede.innerHTML = '<option value="">Todas las sedes...</option>' +
            this.sedes.map(s => '<option value="' + s.idSede + '">' + s.nombre + '</option>').join('');

        this.renderAmbientes('');

        const dias = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];
        const cont = document.getElementById('dias-container');
        cont.innerHTML = dias.map((d, i) => {
            const val = i + 1;
            return '<input type="checkbox" class="btn-check" id="dia_' + val + '" value="' + val + '" autocomplete="off">' +
                '<label class="btn btn-outline-primary rounded-pill btn-sm d-flex align-items-center justify-content-center" ' +
                'style="width:40px;height:40px;font-size:0.8rem;" for="dia_' + val + '">' + d.charAt(0) + '</label>';
        }).join('');
    }

    renderAmbientes(idSede) {
        const sel = document.getElementById('idAmbiente');
        const filtered = idSede ? this.ambientes.filter(a => String(a.idSede) === String(idSede)) : this.ambientes;
        sel.innerHTML = '<option value="">Seleccionar ambiente...</option>' +
            filtered.map(a => '<option value="' + a.idAmbiente + '">Blq ' + a.bloque + ' - Amb ' + a.numero + ' (' + a.tipoAmbiente + ')</option>').join('');
    }

    setupEventListeners() {
        document.getElementById('search-ficha')?.addEventListener('input', e => {
            const q = e.target.value.toLowerCase();
            const filtered = this.fichas.filter(f =>
                String(f.codigoFicha).toLowerCase().includes(q) ||
                (f.programa && f.programa.nombre.toLowerCase().includes(q))
            );
            this.renderFichasList(filtered);
        });

        document.getElementById('idSedeFiltro')?.addEventListener('change', e => {
            this.renderAmbientes(e.target.value);
        });

        document.getElementById('modalidad_clase')?.addEventListener('change', e => {
            const isVirtual = e.target.value === 'virtual';
            const cont = document.getElementById('container-ambiente');
            cont.style.opacity = isVirtual ? '0.4' : '1';
            cont.style.pointerEvents = isVirtual ? 'none' : '';
            document.getElementById('idAmbiente').required = !isVirtual;
        });

        document.getElementById('form-horario')?.addEventListener('submit', e => {
            e.preventDefault();
            this.handleSubmit();
        });
    }

    renderFichasList(fichasArr) {
        const cont = document.getElementById('fichas-list');
        if (!fichasArr.length) {
            cont.innerHTML = '<div class="p-4 text-center text-muted small">No se encontraron fichas activas</div>';
            return;
        }
        cont.innerHTML = fichasArr.map(f => {
            const prog = f.programa ? f.programa.nombre : 'Sin programa';
            return '<button type="button" class="list-group-item list-group-item-action px-4 py-3 ficha-btn border-0 border-start border-3 border-transparent" data-id="' + f.idFicha + '">' +
                '<div class="d-flex justify-content-between align-items-center mb-1">' +
                '<span class="badge rounded-pill" style="background:var(--primary-light);color:var(--primary);font-size:0.7rem;">' + f.codigoFicha + '</span>' +
                '<i class="bi bi-chevron-right text-muted" style="font-size:0.75rem;"></i>' +
                '</div>' +
                '<div class="text-truncate small fw-medium" style="color:var(--text-dark);" title="' + prog + '">' + prog + '</div>' +
                '<div class="d-flex gap-3 mt-1" style="font-size:0.72rem;color:var(--text-muted);">' +
                '<span><i class="bi bi-clock me-1"></i>' + (f.jornada || '-') + '</span>' +
                '<span><i class="bi bi-laptop me-1"></i>' + (f.modalidad || '-') + '</span>' +
                '</div>' +
                '</button>';
        }).join('');

        cont.querySelectorAll('.ficha-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                cont.querySelectorAll('.ficha-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                this.selectFicha(btn.dataset.id);
            });
        });
    }

    async selectFicha(idFicha) {
        this.selectedFicha = this.fichas.find(f => String(f.idFicha) === String(idFicha));
        if (!this.selectedFicha) return;

        const card = document.getElementById('calendario-card');
        card.innerHTML = '<div class="card-body p-5 text-center d-flex flex-column align-items-center justify-content-center">' +
            '<div class="spinner-border text-primary mb-3" role="status"></div>' +
            '<p class="text-muted small">Cargando horario de ' + this.selectedFicha.codigoFicha + '...</p>' +
            '</div>';

        document.getElementById('lbl-ficha-context').innerHTML =
            this.selectedFicha.codigoFicha +
            ' <span class="badge bg-light text-dark border fw-normal ms-1">' + (this.selectedFicha.jornada || '') + '</span>';
        if (this.selectedFicha.fechaInicio) document.getElementById('fecha_inicio').value = this.selectedFicha.fechaInicio;
        if (this.selectedFicha.fechaFin) document.getElementById('fecha_fin').value = this.selectedFicha.fechaFin;

        if (this.selectedFicha.ambiente && this.selectedFicha.ambiente.idSede) {
            document.getElementById('idSedeFiltro').value = this.selectedFicha.ambiente.idSede;
            this.renderAmbientes(this.selectedFicha.ambiente.idSede);
        }

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
        const dias = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];

        let header = '<div class="card-header bg-white border-0 d-flex justify-content-between align-items-center pt-4 pb-2 px-4">' +
            '<div>' +
            '<h5 class="fw-bold mb-0" style="color:var(--text-dark)">Ficha ' + ficha.codigoFicha + '</h5>' +
            '<p class="small mb-0" style="color:var(--text-muted)">' + (ficha.programa ? ficha.programa.nombre : '') + '</p>' +
            '</div>' +
            '<button class="btn btn-purple rounded-pill px-4 d-flex align-items-center gap-2 shadow-sm" data-bs-toggle="offcanvas" data-bs-target="#offcanvasHorario">' +
            '<i class="bi bi-plus-lg"></i><span>Agregar Clase</span>' +
            '</button>' +
            '</div>';

        let body = '<div class="card-body pt-0 px-4 pb-4">';

        if (Object.keys(grilla).length === 0) {
            body += '<div class="text-center py-5 text-muted">' +
                '<i class="bi bi-calendar-x fs-1 d-block mb-3 opacity-25"></i>' +
                '<p class="fw-medium">Sin clases asignadas</p>' +
                '<p class="small">Usa "Agregar Clase" para comenzar.</p></div>';
        } else {
            body += '<div class="table-responsive rounded-3 border">' +
                '<table class="table table-bordered mb-0 text-center align-middle" style="min-width:700px;">' +
                '<thead class="table-light"><tr>' +
                '<th class="py-3 fw-semibold" style="width:110px;color:var(--text-muted);font-size:0.8rem;">Franja</th>' +
                dias.map(d => '<th class="py-3 fw-semibold" style="color:var(--text-muted);font-size:0.8rem;">' + d + '</th>').join('') +
                '</tr></thead><tbody>';

            for (const [franja, diasMap] of Object.entries(grilla)) {
                body += '<tr><td class="fw-medium text-muted bg-light" style="font-size:0.8rem;">' + franja + '</td>';
                dias.forEach(dia => {
                    const celda = diasMap[dia];
                    if (celda) {
                        const isVirtual = celda.modalidad === 'virtual';
                        const bg = isVirtual ? 'var(--bs-info-bg-subtle)' : 'var(--primary-light)';
                        const color = isVirtual ? 'var(--bs-info)' : 'var(--primary)';
                        const icon = isVirtual ? 'bi-laptop' : 'bi-building';
                        body += '<td class="p-2 align-top horario-cell">' +
                            '<div class="rounded-3 p-2 h-100 text-start" style="background:' + bg + ';border:1px solid ' + color + ';min-height:75px;font-size:0.78rem;">' +
                            '<div class="fw-bold mb-1 d-flex justify-content-between align-items-center" style="color:' + color + ';">' +
                            '<span class="text-truncate">' + celda.instructor + '</span>' +
                            '<button class="btn btn-sm text-danger p-0 delete-btn d-none" data-id="' + celda.idAsignacion + '" style="line-height:1;">' +
                            '<i class="bi bi-x-circle-fill"></i>' +
                            '</button>' +
                            '</div>' +
                            '<div style="color:var(--text-muted);font-size:0.72rem;"><i class="bi ' + icon + ' me-1"></i>' + (celda.ambiente || 'Virtual') + '</div>' +
                            '</div></td>';
                    } else {
                        body += '<td style="min-height:75px;"></td>';
                    }
                });
                body += '</tr>';
            }
            body += '</tbody></table></div>';
        }

        body += '</div>';
        card.innerHTML = header + body;

        card.querySelectorAll('.horario-cell').forEach(td => {
            td.addEventListener('mouseenter', () => td.querySelector('.delete-btn')?.classList.remove('d-none'));
            td.addEventListener('mouseleave', () => td.querySelector('.delete-btn')?.classList.add('d-none'));
        });
        card.querySelectorAll('.delete-btn').forEach(btn => {
            btn.addEventListener('click', e => {
                e.stopPropagation();
                this.deleteAsignacion(btn.dataset.id);
            });
        });
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
            this.showAlert('offcanvas-alert', 'warning', 'Selecciona un ambiente para modalidad presencial.');
            return;
        }

        const bloqueData = {
            hora_inicio: document.getElementById('hora_inicio').value + ':00',
            hora_fin: document.getElementById('hora_fin').value + ':00',
            modalidad,
            idFuncionario: parseInt(document.getElementById('idFuncionario').value),
            dias
        };
        if (modalidad === 'presencial') bloqueData.idAmbiente = idAmbiente;

        const btn = document.getElementById('btn-asignar');
        btn.disabled = true;
        btn.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span>Asignando...';

        try {
            const resBloque = await apiCall('/crearBloque', 'POST', bloqueData);
            const idBloque = resBloque.idBloque || (resBloque.bloque && resBloque.bloque.idBloque);
            if (!idBloque) throw new Error('No se obtuvo el ID del bloque.');

            await apiCall('/crearAsignacion', 'POST', {
                idFicha: this.selectedFicha.idFicha,
                idBloque,
                fecha_inicio: document.getElementById('fecha_inicio').value,
                fecha_fin: document.getElementById('fecha_fin').value,
                estado: 'activo'
            });

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
        if (type === 'success') setTimeout(() => el.querySelector('.alert')?.remove(), 4000);
    }
}

document.addEventListener('DOMContentLoaded', () => {
    new HorarioFormativa();
});
