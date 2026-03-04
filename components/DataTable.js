import { LoadingSpinner } from './LoadingSpinner.js';

/**
 * Genera filas de la tabla
 */
function renderRow(configColumns, rowData) {
    const tds = configColumns.map(col => {
        if (col.render) {
            return `<td>${col.render(rowData)}</td>`;
        }
        return `<td>${rowData[col.key] || ''}</td>`;
    }).join('');

    return `<tr>${tds}</tr>`;
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

    const rowsHtml = data.map(rowData => renderRow(columns, rowData)).join('');

    // Pagination info
    const total = data.length;
    const showing = `Showing 1 to ${total} of ${total} entries`;

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
            <div class="d-flex justify-content-between align-items-center px-3 py-3" style="border-top: 1px solid var(--border-color);">
                <small style="color: var(--text-muted);">${showing}</small>
                <nav>
                    <ul class="pagination pagination-sm table-pagination mb-0">
                        <li class="page-item disabled"><a class="page-link" href="#">«</a></li>
                        <li class="page-item disabled"><a class="page-link" href="#">‹</a></li>
                        <li class="page-item active"><a class="page-link" href="#">1</a></li>
                        <li class="page-item disabled"><a class="page-link" href="#">›</a></li>
                        <li class="page-item disabled"><a class="page-link" href="#">»</a></li>
                    </ul>
                </nav>
            </div>
        </div>
    `;
}
