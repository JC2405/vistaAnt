    import { LoadingSpinner } from './LoadingSpinner.js';

    const PAGE_SIZE = 10;

    /**
     * Genera filas de la tabla
     */
    function renderRow(configColumns, rowData) {
        const tds = configColumns.map(col => {
            if (col.render) {
                return `<td>${col.render(rowData)}</td>`;
            }
            return `<td>${rowData[col.key] ?? ''}</td>`;
        }).join('');

        return `<tr>${tds}</tr>`;
    }

    /**
     * Construye el HTML del paginador bonito (morado, estilo custom)
     */
    function buildPaginator(id, currentPage, totalPages, totalRecords, from, to) {
        const isFirst = currentPage === 1;
        const isLast = currentPage === totalPages;

        // Generar botones de páginas (máx 5 visibles)
        let pageButtons = '';
        const maxVisible = 5;
        let startPage = Math.max(1, currentPage - Math.floor(maxVisible / 2));
        let endPage = Math.min(totalPages, startPage + maxVisible - 1);
        if (endPage - startPage < maxVisible - 1) {
            startPage = Math.max(1, endPage - maxVisible + 1);
        }

        for (let p = startPage; p <= endPage; p++) {
            const active = p === currentPage ? 'active' : '';
            pageButtons += `<li class="page-item ${active}">
                <a class="page-link dt-page-btn" href="#" data-table="${id}" data-page="${p}">${p}</a>
            </li>`;
        }

        const showing = totalRecords === 0
            ? 'Sin registros'
            : `Mostrando ${from} a ${to} de ${totalRecords} registros`;

        return `
            <div class="d-flex justify-content-between align-items-center px-3 py-3" style="border-top: 1px solid var(--border-color);">
                <small style="color: var(--text-muted);">${showing}</small>
                <nav>
                    <ul class="pagination pagination-sm table-pagination mb-0">
                        <li class="page-item ${isFirst ? 'disabled' : ''}">
                            <a class="page-link dt-page-btn" href="#" data-table="${id}" data-page="1" title="Primera">«</a>
                        </li>
                        <li class="page-item ${isFirst ? 'disabled' : ''}">
                            <a class="page-link dt-page-btn" href="#" data-table="${id}" data-page="${currentPage - 1}" title="Anterior">‹</a>
                        </li>
                        ${pageButtons}
                        <li class="page-item ${isLast ? 'disabled' : ''}">
                            <a class="page-link dt-page-btn" href="#" data-table="${id}" data-page="${currentPage + 1}" title="Siguiente">›</a>
                        </li>
                        <li class="page-item ${isLast ? 'disabled' : ''}">
                            <a class="page-link dt-page-btn" href="#" data-table="${id}" data-page="${totalPages}" title="Última">»</a>
                        </li>
                    </ul>
                </nav>
            </div>
        `;
    }

    /**
     * Registra el estado de paginación y los eventos de click en los botones.
     * Se llama justo después de inyectar el HTML en el DOM.
     */
    export function initTablePagination(id, allData, columns, wrapperSelector, onPageRender) {
    let currentPage = 1;
    const totalPages = Math.ceil(allData.length / PAGE_SIZE) || 1;

    function renderPage(page) {
        currentPage = Math.max(1, Math.min(page, totalPages));
        const from  = (currentPage - 1) * PAGE_SIZE + 1;
        const to    = Math.min(currentPage * PAGE_SIZE, allData.length);
        const slice = allData.slice(from - 1, to);

        const tbody = document.querySelector(`#${id} tbody`);
        if (tbody) {
            tbody.innerHTML = slice.map(row => renderRow(columns, row)).join('');
        }

        const paginatorEl = document.querySelector(`#${id}-paginator`);
        if (paginatorEl) {
            paginatorEl.innerHTML = buildPaginator(id, currentPage, totalPages, allData.length, from, to);
        }

        if (typeof onPageRender === 'function') onPageRender();
    }

    // Delegación de eventos — un solo listener que nunca se destruye
    document.addEventListener('click', function handler(e) {
        const btn = e.target.closest(`.dt-page-btn[data-table="${id}"]`);
        if (!btn) return;
        e.preventDefault();

         if (btn.closest('.page-item')?.classList.contains('disabled')) return;
        const page = parseInt(btn.dataset.page);
        if (!isNaN(page)) renderPage(page);
    });

    renderPage(1);
    }

    /**
     * Genera el HTML de un DataTable limpio con paleta purple
     */
    export function DataTable({ id, columns, data = [], loading = false }) {
        if (loading) {
            return `
                <div class="data-table-wrapper text-center py-5">
                    ${LoadingSpinner({ size: '', color: 'primary' })}
                    <p class="mt-3 mb-0 fw-medium" style="color: var(--text-muted);">Cargando registros...</p>
                </div>
            `;
        }

        if (!data || data.length === 0) {
            return `
                <div class="data-table-wrapper text-center py-5">
                    <div class="d-inline-flex align-items-center justify-content-center mb-3"
                        style="width: 72px; height: 72px; border-radius: 50%; background: var(--primary-light);">
                        <i class="bi bi-inbox fs-1" style="color: var(--primary);"></i>
                    </div>
                    <h5 class="fw-bold" style="color: var(--text-dark);">No hay registros</h5>
                    <p class="mb-0" style="color: var(--text-muted);">Comienza agregando uno nuevo.</p>
                </div>
            `;
        }

        const headersHtml = columns.map(col => {
            const icon = col.icon ? `<i class="bi bi-${col.icon}"></i>` : '';
            return `<th scope="col">${icon} ${col.label}</th>`;
        }).join('');

        // Solo mostramos la primera página inicialmente
        const firstSlice = data.slice(0, PAGE_SIZE);
        const rowsHtml = firstSlice.map(rowData => renderRow(columns, rowData)).join('');
        const totalPages = Math.ceil(data.length / PAGE_SIZE) || 1;
        const to = Math.min(PAGE_SIZE, data.length);
        const paginatorHtml = buildPaginator(id, 1, totalPages, data.length, 1, to);

        return `
            <div class="data-table-wrapper">
                <div class="table-responsive">
                    <table class="table table-hover align-middle mb-0" id="${id}">
                        <thead>
                            <tr>
                                ${headersHtml}
                            </tr>
                        </thead>
                        <tbody>
                            ${rowsHtml}
                        </tbody>
                    </table>
                </div>
                <div class="dt-custom-paginator" id="${id}-paginator">
                    ${paginatorHtml}
                </div>
            </div>
        `;
    }
