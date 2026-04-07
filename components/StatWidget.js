/**
 * Genera un Widget estadístico visual (Tarjeta con número grande)
 * @param {Object} props
 * @param {string} props.title
 * @param {string|number} props.value
 * @param {string} props.icon
 * @param {string} [props.colorClass='primary'] - text-primary, bg-primary, etc.
 * @returns {string} HTML string
 */
export function StatWidget({ title, value, icon, colorClass = 'primary' }) {
    return `
        <div class="card stat-widget border-0 shadow-sm transition-all h-100 position-relative overflow-hidden">
            <div class="card-body p-4 d-flex align-items-center justify-content-between">
                <div class="z-index-1">
                    <p class="text-muted fw-bold mb-1 text-uppercase small ls-wider">${title}</p>
                    <h2 class="fw-bolder mb-0 text-dark">${value}</h2>
                </div>
                <div class="stat-icon-wrapper bg-${colorClass} bg-opacity-10 text-${colorClass} rounded-3 d-flex align-items-center justify-content-center" style="width: 60px; height: 60px;">
                    <i class="bi bi-${icon} fs-2"></i>
                </div>
            </div>
            
            <!-- Adorno visual lateral -->
            <div class="position-absolute end-0 top-0 h-100 w-1 bg-${colorClass}"></div>
        </div>
    `;
}
