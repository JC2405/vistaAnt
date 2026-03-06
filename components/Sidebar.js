/**
 * Sidebar / DashboardMenu Component
 * Renders a grouped, collapsible navigation sidebar.
 * 
 * @param {string} activePage - The 'id' of the active nav item (e.g. 'fichas', 'horario-titulada')
 */
export function DashboardMenu(activePage) {
    const role = localStorage.getItem('user_role') || 'Cordinador';

    // Menu groups only shown to Coordinador
    const coordinadorGroups = [
        {
            id: 'group-horario',
            label: 'Horario',
            icon: 'calendar-week',
            items: [
                { id: 'horario-titulada', icon: 'calendar-check', text: 'Horario Titulada', path: 'horario-titulada.html' },
                { id: 'horario-formativa', icon: 'calendar-event', text: 'Horario Formativa', path: 'horario-formativa.html' },
            ]
        },
        {
            id: 'group-programa',
            label: 'Programa Formación',
            icon: 'book',
            items: [
                { id: 'sedes', icon: 'building', text: 'Sedes', path: 'sedes.html' },
                { id: 'programas', icon: 'book-half', text: 'Programas', path: 'programas.html' },
                { id: 'tipos-programa', icon: 'journals', text: 'Tipo Programas', path: 'tipos-programas.html' },
                { id: 'fichas', icon: 'folder2-open', text: 'Fichas', path: 'fichas.html' },
            ]
        },
        {
            id: 'group-instructores',
            label: 'Instructores',
            icon: 'people',
            items: [
                { id: 'tipos-contrato', icon: 'file-earmark-text', text: 'Tipo de Contrato', path: 'tipos-contrato.html' },
                { id: 'areas', icon: 'grid', text: 'Áreas', path: 'areas.html' },
                { id: 'funcionarios', icon: 'person-badge', text: 'Instructores', path: 'funcionarios.html' },
            ]
        }
    ];

    const instructorGroups = [
        {
            id: 'group-mi-panel',
            label: 'Mi Panel',
            icon: 'speedometer2',
            items: [
                { id: 'mi-horario', icon: 'calendar-check', text: 'Mi Horario', path: 'mi-horario.html' },
            ]
        }
    ];

    const groups = role === 'Instructor' ? instructorGroups : coordinadorGroups;
    const brandHref = role === 'Instructor' ? 'dashboard-instructor.html' : 'dashboard-coordinador.html';

    // Determine which group is open by default (the one containing the active page)
    const activePageClean = (activePage || '').replace(/^\//, '').replace(/\.html$/, '');
    const activeGroup = groups.find(g => g.items.some(i => {
        const pathFilename = i.path.replace(/^.*\//, '').replace(/\.html$/, '');
        return activePageClean === i.id || activePageClean === pathFilename;
    }));
    const activeGroupId = activeGroup ? activeGroup.id : (groups[0] ? groups[0].id : '');

    const menuHtml = groups.map(group => {
        const isOpen = group.id === activeGroupId;
        const itemsHtml = group.items.map(item => {
            // Match activePage against item.id OR against the filename in item.path
            const pathFilename = item.path.replace(/^.*\//, '').replace(/\.html$/, '');
            const activePageClean = (activePage || '').replace(/^\//, '').replace(/\.html$/, '');
            const isActive = activePageClean === item.id || activePageClean === pathFilename;
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
                    <span class="d-flex align-items-center gap-2 fw-semibold">
                        <i class="bi bi-${group.icon} sidebar-group-icon"></i>
                        <span class="sidebar-group-label">${group.label}</span>
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
                    <span class="sidebar-brand-text fw-bold fs-5">horarios</span>
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

            <!-- User + Logout -->
            <div class="sidebar-footer px-1">
                <div class="d-flex align-items-center gap-2 mb-3 sidebar-user-row">
                    <div class="sidebar-avatar d-flex align-items-center justify-content-center rounded-circle flex-shrink-0" title="Usuario">
                        <i class="bi bi-person-fill"></i>
                    </div>
                    <div class="overflow-hidden sidebar-user-info">
                        <div class="sidebar-user-name fw-medium text-truncate" id="sidebar-user-name">Cargando...</div>
                        <div class="sidebar-user-role small text-uppercase">${role}</div>
                    </div>
                </div>
                <button class="sidebar-logout btn w-100 d-flex align-items-center justify-content-center gap-2" id="btn-logout" title="Cerrar Sesión">
                    <i class="bi bi-box-arrow-right"></i>
                    <span class="sidebar-logout-text">Cerrar Sesión</span>
                </button>
            </div>
        </div>
    `;
}

// Alias backward-compatible
export const Sidebar = DashboardMenu;

/**
 * initSidebarEvents — call after inserting the sidebar HTML into the DOM.
 * Handles logout, user name, and chevron animation.
 */
export function initSidebarEvents() {
    // Logout
    const btnLogout = document.getElementById('btn-logout');
    if (btnLogout) {
        btnLogout.addEventListener('click', () => {
            localStorage.clear();
            window.location.href = 'index.html';
        });
    }

    // Fill user name
    const nameEl = document.getElementById('sidebar-user-name');
    if (nameEl) {
        const userName = localStorage.getItem('user_name') || 'Usuario';
        nameEl.textContent = userName;
        nameEl.title = userName;
    }

    // Animate chevron on Bootstrap collapse
    document.querySelectorAll('.sidebar-group-btn').forEach(btn => {
        const targetId = btn.getAttribute('data-bs-target');
        const collapseEl = document.querySelector(targetId);
        if (!collapseEl) return;

        collapseEl.addEventListener('show.bs.collapse', () => {
            btn.querySelector('.sidebar-chevron')?.classList.add('rotated');
        });
        collapseEl.addEventListener('hide.bs.collapse', () => {
            btn.querySelector('.sidebar-chevron')?.classList.remove('rotated');
        });
    });

    // ── Sidebar toggle (desktop) ──────────────────
    const btnToggle = document.getElementById('btn-toggle-sidebar');
    if (btnToggle) {
        // Restore persisted state
        if (localStorage.getItem('sidebar_collapsed') === 'true') {
            document.body.classList.add('sidebar-collapsed');
        }

        btnToggle.addEventListener('click', () => {
            const isNowCollapsed = document.body.classList.toggle('sidebar-collapsed');
            localStorage.setItem('sidebar_collapsed', isNowCollapsed);
        });
    }
}
