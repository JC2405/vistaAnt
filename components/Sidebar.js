import { logout } from '../utils/auth.js';
import { me, updateFuncionario } from '../utils/api.js';

/**
 * Sidebar / DashboardMenu Component
 */
export function DashboardMenu(activePage) {
    const role = localStorage.getItem('user_role') || 'Cordinador';
    const userName = localStorage.getItem('user_name') || 'Funcionario';
    const initial  = userName.charAt(0).toUpperCase();
    const second   = (userName.split(' ')[1]?.charAt(0) || '').toUpperCase();

    const coordinadorGroups = [
        {
            id: 'group-horario', label: 'Horario', icon: 'calendar-week',
            items: [
                { id: 'horario-titulada',  icon: 'calendar-check', text: 'Programar Horario Titulada',     path: 'horario-titulada.html' },
                { id: 'horario-formativa', icon: 'calendar-event', text: 'Programar Horario Transversales', path: 'horario-formativa.html' },
            ]
        },
        {
            id: 'group-programa', label: 'Programas Formacion', icon: 'book',
            items: [
                { id: 'fichas',         icon: 'folder2-open',      text: 'Fichas',         path: 'fichas.html' },
                { id: 'programas',      icon: 'book-half',         text: 'Programas',      path: 'programas.html' },
                { id: 'tipos-programa', icon: 'journals',          text: 'Tipo Programas', path: 'tipos-programas.html' },
                { id: 'sedes',          icon: 'building',          text: 'Sedes',          path: 'sedes.html' },
            ]
        },
        {
            id: 'group-instructores', label: 'Instructores', icon: 'people',
            items: [
                { id: 'funcionarios',   icon: 'person-badge',      text: 'Instructores',      path: 'funcionarios.html' },
                { id: 'areas',          icon: 'grid',              text: 'Áreas',             path: 'areas.html' },
                { id: 'tipos-contrato', icon: 'file-earmark-text', text: 'Tipo de Contrato',  path: 'tipos-contrato.html' },
            ]
        }
    ];

    const instructorGroups = [
        {
            id: 'group-mi-panel', label: 'Mi Panel', icon: 'speedometer2',
            items: [
                { id: 'mi-horario', icon: 'calendar-check', text: 'Mi Horario', path: 'mi-horario.html' },
            ]
        }
    ];

    const groups      = role === 'Instructor' ? instructorGroups : coordinadorGroups;
    const brandHref   = role === 'Instructor' ? 'dashboard-instructor.html' : 'dashboard-coordinador.html';
    const activePageClean = (activePage || '').replace(/^\//, '').replace(/\.html$/, '');
    const activeGroup = groups.find(g => g.items.some(i => {
        const pf = i.path.replace(/^.*\//, '').replace(/\.html$/, '');
        return activePageClean === i.id || activePageClean === pf;
    }));
    const activeGroupId = activeGroup ? activeGroup.id : '';

    const menuHtml = groups.map(group => {
        const isOpen   = group.id === activeGroupId;
        const itemsHtml = group.items.map(item => {
            const pf       = item.path.replace(/^.*\//, '').replace(/\.html$/, '');
            const isActive = activePageClean === item.id || activePageClean === pf;
            return `
                <li>
                    <a href="${item.path}"
                       class="sidebar-sub-link d-flex align-items-center gap-2 px-3 py-2 rounded-3 text-decoration-none${isActive ? ' active' : ''}"
                       data-page="${item.id}">
                        <i class="bi bi-${item.icon} sidebar-sub-icon"></i>
                        <span>${item.text}</span>
                    </a>
                </li>`;
        }).join('');

        return `
            <li class="sidebar-group">
                <button class="sidebar-group-btn d-flex align-items-center justify-content-between w-100 px-3 py-2 rounded-3 border-0 bg-transparent"
                        data-bs-toggle="collapse"
                        data-bs-target="#${group.id}"
                        aria-expanded="${isOpen}"
                        aria-controls="${group.id}">
                    <span class="d-flex align-items-center gap-2 fw-semibold text-start">
                        <i class="bi bi-${group.icon} sidebar-group-icon"></i>
                        <span class="sidebar-group-label" style="line-height:1.1;">${group.label}</span>
                    </span>
                    <i class="bi bi-chevron-down sidebar-chevron ${isOpen ? 'rotated' : ''}"></i>
                </button>
                <div class="collapse${isOpen ? ' show' : ''}" id="${group.id}">
                    <ul class="list-unstyled ms-2 mt-1 mb-1 d-flex flex-column gap-1">
                        ${itemsHtml}
                    </ul>
                </div>
            </li>`;
    }).join('');

    return `
        <div class="sidebar-wrapper d-flex flex-column h-100 py-4 px-3">
            <!-- Brand + Toggle -->
            <div class="sidebar-brand-row d-flex align-items-center justify-content-between mb-4 px-1">
                <a href="${brandHref}" class="sidebar-brand d-flex align-items-center gap-2 text-decoration-none">
                    <div class="sidebar-brand-icon d-flex align-items-center justify-content-center rounded-3 flex-shrink-0">
                        <span class="fw-bold fs-5">H</span>
                    </div>
                    <span class="sidebar-brand-text fw-bold fs-5">Horarios</span>
                </a>
                <button class="btn btn-sm sidebar-toggle-btn d-flex align-items-center justify-content-center" id="btn-toggle-sidebar" title="Ocultar/Mostrar menú">
                    <i class="bi bi-layout-sidebar" id="toggle-sidebar-icon"></i>
                </button>
            </div>

            <hr class="sidebar-divider">

            <!-- Navigation -->
            <nav class="flex-grow-1 overflow-auto">
                <ul class="list-unstyled d-flex flex-column gap-1">
                    ${menuHtml}
                </ul>
            </nav>

            <hr class="sidebar-divider">

            <!-- Footer: Avatar clickeable + Logout -->
            <div class="sidebar-footer px-1">

                <!-- Avatar con popup de perfil -->
                <div class="sb-user-wrap" id="sb-user-wrap" style="position:relative;">

                    <!-- Popup menú — aparece ENCIMA del avatar -->
                    <div class="sb-popup-menu" id="sb-popup-menu" style="display:none;">
                        <button class="sb-popup-item" id="btn-ver-mi-info">
                            <i class="bi bi-person-circle"></i>
                            Ver mi información
                        </button>
                    </div>

                    <div class="d-flex align-items-center gap-2 mb-2 sidebar-user-row" style="cursor:pointer;" id="sb-avatar-btn" title="Ver mi perfil">
                        <div class="sb-avatar-circle flex-shrink-0">
                            <span class="sb-avatar-initials">${initial}${second}</span>
                        </div>
                        <div class="overflow-hidden sidebar-user-info">
                            <div class="sidebar-user-name fw-medium text-truncate" id="sidebar-user-name">Cargando...</div>
                            <div class="sidebar-user-role small text-uppercase">${role}</div>
                        </div>
                        <i class="bi bi-chevron-up sb-avatar-chevron ms-auto" id="sb-avatar-chevron"></i>
                    </div>
                </div>

                <button class="sidebar-logout btn w-100 d-flex align-items-center justify-content-center gap-2" id="btn-logout" title="Cerrar Sesión">
                    <i class="bi bi-box-arrow-right"></i>
                    <span class="sidebar-logout-text">Cerrar Sesión</span>
                </button>
            </div>
        </div>

        <!-- ══ MODAL PERFIL ════════════════════════════════════════════════════ -->
        <div id="sb-modal-overlay" class="sb-modal-overlay" style="display:none;">
            <div class="sb-modal-card">
                <div class="sb-modal-header">
                    <div class="sb-modal-avatar">${initial}${second}</div>
                    <div>
                        <h5 class="sb-modal-title">Mi Perfil</h5>
                        <p class="sb-modal-subtitle">Información de tu cuenta</p>
                    </div>
                    <button class="sb-modal-close" id="sb-close-modal">&times;</button>
                </div>

                <div id="sb-loading" class="sb-loading-state">
                    <div class="sb-spinner"></div>
                    <p>Cargando información...</p>
                </div>

                <form id="sb-form-perfil" class="sb-modal-body" style="display:none;" novalidate>
                    <div class="sb-form-grid">
                        <div class="sb-form-group">
                            <label class="sb-form-label"><i class="bi bi-person"></i> Nombre</label>
                            <input type="text" id="sb-nombre" class="sb-form-input" required>
                        </div>
                        <div class="sb-form-group">
                            <label class="sb-form-label"><i class="bi bi-person"></i> Apellido</label>
                            <input type="text" id="sb-apellido" class="sb-form-input" required>
                        </div>
                        <div class="sb-form-group">
                            <label class="sb-form-label"><i class="bi bi-card-text"></i> Documento</label>
                            <input type="text" id="sb-documento" class="sb-form-input" required>
                        </div>
                        <div class="sb-form-group">
                            <label class="sb-form-label"><i class="bi bi-envelope"></i> Correo</label>
                            <input type="email" id="sb-correo" class="sb-form-input" required>
                        </div>
                        <div class="sb-form-group">
                            <label class="sb-form-label"><i class="bi bi-telephone"></i> Teléfono</label>
                            <input type="text" id="sb-telefono" class="sb-form-input">
                        </div>
                        <div class="sb-form-group">
                            <label class="sb-form-label"><i class="bi bi-lock"></i> Nueva contraseña <span style="font-weight:400;color:#aaa;">(opcional)</span></label>
                            <input type="password" id="sb-password" class="sb-form-input" placeholder="Dejar vacío para no cambiar">
                        </div>

                    </div>

                    <div id="sb-alert" class="sb-alert" style="display:none;"></div>

                    <div class="sb-modal-footer">
                        <button type="button" class="sb-btn sb-btn-secondary" id="sb-cancel-btn">Cancelar</button>
                        <button type="submit" class="sb-btn sb-btn-primary" id="sb-save-btn">
                            <span id="sb-save-text"><i class="bi bi-check2"></i> Guardar cambios</span>
                            <span id="sb-save-loading" style="display:none;"><div class="sb-spinner sb-spinner-sm"></div> Guardando...</span>
                        </button>
                    </div>
                </form>
            </div>
        </div>

        <style>
            /* ── Avatar circulito ───────────────────────────────── */
            .sb-avatar-circle {
                width: 36px; height: 36px;
                border-radius: 50%;
                background: linear-gradient(135deg, #19be3d 0%, #0fa32d 100%);
                display: flex; align-items: center; justify-content: center;
                border: 2px solid rgba(255,255,255,0.3);
                box-shadow: 0 2px 8px rgba(25,190,61,0.45);
                flex-shrink: 0;
                transition: transform 0.2s, box-shadow 0.2s;
            }
            #sb-avatar-btn:hover .sb-avatar-circle {
                transform: scale(1.08);
                box-shadow: 0 4px 14px rgba(25,190,61,0.6);
            }
            .sb-avatar-initials {
                color: #fff; font-size: 11px; font-weight: 700;
                letter-spacing: 0.5px; user-select: none;
            }
            .sb-avatar-chevron {
                font-size: 11px; color: rgba(255,255,255,0.5);
                transition: transform 0.22s;
            }
            .sb-avatar-chevron.flipped { transform: rotate(180deg); }

            /* ── Popup menú ─────────────────────────────────────── */
            .sb-popup-menu {
                background: linear-gradient(135deg, #19be3d 0%, #0fa32d 100%);
                border: 1px solid rgba(255,255,255,0.2);
                border-radius: 10px;
                padding: 4px;
                margin-bottom: 8px;
                white-space: nowrap;
                box-shadow: 0 8px 24px rgba(15,163,45,0.35);
                animation: sb-fadein 0.18s ease;
            }
            @keyframes sb-fadein {
                from { opacity:0; transform: translateY(6px); }
                to   { opacity:1; transform: translateY(0); }
            }
            .sb-popup-item {
                width: 100%;
                display: flex; align-items: center; gap: 8px;
                background: none; border: none;
                padding: 9px 14px;
                border-radius: 8px;
                font-size: 0.84rem; font-weight: 600;
                color: #ffffff;
                cursor: pointer;
                transition: background 0.15s, color 0.15s;
                letter-spacing: 0.2px;
            }
            .sb-popup-item:hover { background: rgba(0,0,0,0.12); color: #ffffff; }

            /* ── Modal overlay ──────────────────────────────────── */
            .sb-modal-overlay {
                position: fixed; inset: 0;
                background: rgba(15,15,35,0.6);
                backdrop-filter: blur(5px);
                z-index: 99999;
                display: flex; align-items: center; justify-content: center;
                animation: sb-fadein 0.2s ease;
            }
            .sb-modal-card {
                background: #fff;
                border-radius: 20px;
                width: 100%; max-width: 540px;
                max-height: 90vh; overflow-y: auto;
                box-shadow: 0 24px 60px rgba(0,0,0,0.2);
                margin: 16px;
                animation: sb-slideup 0.25s cubic-bezier(0.34,1.56,0.64,1);
            }
            @keyframes sb-slideup {
                from { transform: translateY(28px); opacity:0; }
                to   { transform: translateY(0);    opacity:1; }
            }
            .sb-modal-header {
                display: flex; align-items: center; gap: 14px;
                padding: 22px 24px 18px;
                border-bottom: 1px solid #eef0f7;
                position: relative;
            }
            .sb-modal-avatar {
                width: 50px; height: 50px; border-radius: 14px;
                background: linear-gradient(135deg, #19be3d, #0fa32d);
                color:#fff; font-size:15px; font-weight:700;
                display:flex; align-items:center; justify-content:center;
                flex-shrink:0; letter-spacing:0.5px;
                box-shadow: 0 4px 14px rgba(15,163,45,0.35);
            }
            .sb-modal-title    { margin:0; font-size:1.05rem; font-weight:700; color:#1a1a2e; }
            .sb-modal-subtitle { margin:2px 0 0; font-size:0.78rem; color:#8898aa; }
            .sb-modal-close {
                position:absolute; right:18px; top:18px;
                background:#f4f6fd; border:none;
                width:30px; height:30px; border-radius:8px;
                font-size:18px; cursor:pointer; color:#8898aa;
                display:flex; align-items:center; justify-content:center;
                transition: background 0.15s, color 0.15s;
            }
            .sb-modal-close:hover { background:#fdf0ef; color:#e74a3b; }

            .sb-loading-state {
                display:flex; flex-direction:column; align-items:center;
                gap:12px; padding:40px 24px; color:#8898aa; font-size:0.88rem;
            }
            .sb-modal-body { padding: 20px 24px; }
            .sb-form-grid {
                display: grid; grid-template-columns: 1fr 1fr;
                gap: 14px; margin-bottom: 14px;
            }
            @media(max-width:480px){ .sb-form-grid { grid-template-columns:1fr; } }
            .sb-form-group { display:flex; flex-direction:column; gap:5px; }
            .sb-form-label {
                font-size:0.78rem; font-weight:600; color:#5a5f7d;
                display:flex; align-items:center; gap:5px;
            }
            .sb-form-input {
                border:1.5px solid #e4e9f2; border-radius:10px;
                padding:9px 12px; font-size:0.88rem; color:#1a1a2e;
                transition: border-color 0.2s, box-shadow 0.2s;
                outline:none; background:#fff; width:100%; box-sizing:border-box;
            }
            .sb-form-input:focus {
                border-color:#4e73df;
                box-shadow: 0 0 0 3px rgba(78,115,223,0.12);
            }
            .sb-alert {
                padding:10px 14px; border-radius:10px;
                font-size:0.84rem; margin-top:14px;
            }
            .sb-alert.success { background:#eafaf1; color:#1e8449; border:1px solid #a9dfbf; }
            .sb-alert.error   { background:#fdf0ef; color:#c0392b; border:1px solid #f5b7b1; }
            .sb-modal-footer {
                display:flex; justify-content:flex-end; gap:10px;
                margin-top:20px; padding-top:16px; border-top:1px solid #eef0f7;
            }
            .sb-btn {
                padding:9px 20px; border-radius:10px; font-size:0.88rem;
                font-weight:600; cursor:pointer; border:none;
                display:inline-flex; align-items:center; gap:6px; transition:all 0.18s;
            }
            .sb-btn-primary {
                background: linear-gradient(135deg, #19be3d, #0fa32d);
                color:#fff; box-shadow:0 4px 12px rgba(15,163,45,0.3);
            }
            .sb-btn-primary:hover { transform:translateY(-1px); box-shadow:0 6px 18px rgba(15,163,45,0.45); }
            .sb-btn-secondary { background:#f4f6fd; color:#5a5f7d; border:1px solid #e4e9f2; }
            .sb-btn-secondary:hover { background:#e9edf7; }
            .sb-spinner {
                width:26px; height:26px;
                border:3px solid #e4e9f2; border-top-color:#19be3d;
                border-radius:50%; animation:sb-spin 0.7s linear infinite;
            }
            .sb-spinner-sm { width:14px; height:14px; border-width:2px; }
            @keyframes sb-spin { to { transform:rotate(360deg); } }
        </style>
    `;
}

// Alias backward-compatible
export const Sidebar = DashboardMenu;

/**
 * initSidebarEvents — llamar después de insertar el HTML del sidebar en el DOM.
 */
export function initSidebarEvents() {

    // ── Logout ──────────────────────────────────────────────────────────────
    const btnLogout = document.getElementById('btn-logout');
    if (btnLogout) {
        btnLogout.addEventListener('click', async () => {
            btnLogout.disabled = true;
            btnLogout.innerHTML = '<span class="spinner-border spinner-border-sm" role="status"></span> Cerrando...';
            await logout();
        });
    }

    // ── Nombre del usuario ───────────────────────────────────────────────────
    const nameEl = document.getElementById('sidebar-user-name');
    if (nameEl) {
        const userName = localStorage.getItem('user_name') || 'Usuario';
        nameEl.textContent = userName;
        nameEl.title = userName;
    }

    // ── Chevron en grupos de navegación ─────────────────────────────────────
    document.querySelectorAll('.sidebar-group-btn').forEach(btn => {
        const targetId  = btn.getAttribute('data-bs-target');
        const collapseEl = document.querySelector(targetId);
        if (!collapseEl) return;
        collapseEl.addEventListener('show.bs.collapse', () => btn.querySelector('.sidebar-chevron')?.classList.add('rotated'));
        collapseEl.addEventListener('hide.bs.collapse', () => btn.querySelector('.sidebar-chevron')?.classList.remove('rotated'));
    });

    // ── Toggle sidebar (desktop) ─────────────────────────────────────────────
    const btnToggle = document.getElementById('btn-toggle-sidebar');
    if (btnToggle) {
        if (localStorage.getItem('sidebar_collapsed') === 'true') {
            document.body.classList.add('sidebar-collapsed');
        }
        btnToggle.addEventListener('click', () => {
            const isNowCollapsed = document.body.classList.toggle('sidebar-collapsed');
            localStorage.setItem('sidebar_collapsed', isNowCollapsed);
        });
    }

    // ── Avatar → popup menú de perfil ───────────────────────────────────────
    const sbAvatarBtn  = document.getElementById('sb-avatar-btn');
    const sbPopupMenu  = document.getElementById('sb-popup-menu');
    const sbChevron    = document.getElementById('sb-avatar-chevron');

    if (sbAvatarBtn && sbPopupMenu) {
        sbAvatarBtn.addEventListener('click', () => {
            const isOpen = sbPopupMenu.style.display !== 'none';
            sbPopupMenu.style.display = isOpen ? 'none' : 'block';
            sbChevron?.classList.toggle('flipped', !isOpen);
        });
    }

    // ── Modal perfil ─────────────────────────────────────────────────────────
    const modalOverlay  = document.getElementById('sb-modal-overlay');
    const formPerfil    = document.getElementById('sb-form-perfil');
    const loadingState  = document.getElementById('sb-loading');
    const alertEl       = document.getElementById('sb-alert');
    const btnVerInfo    = document.getElementById('btn-ver-mi-info');
    const btnClose      = document.getElementById('sb-close-modal');
    const btnCancel     = document.getElementById('sb-cancel-btn');

    let _perfilId = null;

    function closeModal() {
        if (modalOverlay) modalOverlay.style.display = 'none';
    }

    function showAlert(msg, type = 'error') {
        if (!alertEl) return;
        alertEl.textContent = msg;
        alertEl.className   = `sb-alert ${type}`;
        alertEl.style.display = 'block';
        if (type === 'success') setTimeout(() => { alertEl.style.display = 'none'; }, 3000);
    }

    // Abrir modal y consumir GET /api/me
    if (btnVerInfo) {
        btnVerInfo.addEventListener('click', async () => {
            // Cerrar popup
            if (sbPopupMenu) sbPopupMenu.style.display = 'none';
            if (sbChevron)   sbChevron.classList.remove('flipped');

            // Mostrar overlay con spinner
            if (modalOverlay) modalOverlay.style.display = 'flex';
            if (loadingState) loadingState.style.display = 'flex';
            if (formPerfil)   formPerfil.style.display   = 'none';
            if (alertEl)      alertEl.style.display      = 'none';

            try {
                const data = await me();
                _perfilId  = data.id;

                document.getElementById('sb-nombre').value    = data.nombre    || '';
                document.getElementById('sb-apellido').value  = data.apellido  || '';
                document.getElementById('sb-documento').value = data.documento || '';
                document.getElementById('sb-correo').value    = data.correo    || '';
                document.getElementById('sb-telefono').value  = data.telefono  || '';
                document.getElementById('sb-password').value  = '';

                // Guardar para el PUT
                if (formPerfil) {
                    formPerfil.dataset.idTipoContrato = data.idTipoContrato ?? '';
                    formPerfil.dataset.estado         = data.estado || 'Activo';
                }

                if (loadingState) loadingState.style.display = 'none';
                if (formPerfil)   formPerfil.style.display   = 'block';

            } catch (err) {
                if (loadingState) loadingState.style.display = 'none';
                if (formPerfil)   formPerfil.style.display   = 'block';
                showAlert('No se pudo cargar tu información: ' + (err.message || 'Error desconocido'));
            }
        });
    }

    if (btnClose)  btnClose.addEventListener('click',  closeModal);
    if (btnCancel) btnCancel.addEventListener('click', closeModal);
    if (modalOverlay) {
        modalOverlay.addEventListener('click', e => { if (e.target === modalOverlay) closeModal(); });
    }

    // Guardar cambios → PUT /api/editarFuncionario/{id}
    if (formPerfil) {
        formPerfil.addEventListener('submit', async e => {
            e.preventDefault();
            if (!_perfilId) return;

            if (alertEl) alertEl.style.display = 'none';

            const btnSaveText    = document.getElementById('sb-save-text');
            const btnSaveLoading = document.getElementById('sb-save-loading');
            if (btnSaveText)    btnSaveText.style.display    = 'none';
            if (btnSaveLoading) btnSaveLoading.style.display = 'inline-flex';

            const storedIdTC   = formPerfil.dataset.idTipoContrato;
            const storedEstado = formPerfil.dataset.estado || 'Activo';

            const payload = {
                nombre:         document.getElementById('sb-nombre').value.trim(),
                apellido:       document.getElementById('sb-apellido').value.trim(),
                documento:      document.getElementById('sb-documento').value.trim(),
                correo:         document.getElementById('sb-correo').value.trim(),
                telefono:       document.getElementById('sb-telefono').value.trim(),
                estado:         storedEstado,
                idTipoContrato: storedIdTC ? parseInt(storedIdTC) : 1,
            };

            const pass = document.getElementById('sb-password').value;
            if (pass) payload.password = pass;

            try {
                await updateFuncionario(_perfilId, payload);
                showAlert('✓ Perfil actualizado correctamente.', 'success');
            } catch (err) {
                showAlert('Error al guardar: ' + (err.message || 'Verifica los datos e intenta de nuevo.'));
            } finally {
                if (btnSaveText)    btnSaveText.style.display    = 'inline-flex';
                if (btnSaveLoading) btnSaveLoading.style.display = 'none';
            }
        });
    }
}
