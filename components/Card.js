/**
 * Genera el HTML para un marco de Card reutilizable
 * @param {Object} props
 * @param {string} props.title
 * @param {string} props.content
 * @param {string} [props.icon]
 * @returns {string} HTML string
 */
export function Card({ title, content, icon = '' }) {
    const iconHtml = icon ? `<i class="bi bi-${icon} me-2 text-primary"></i>` : '';

    return `
        <div class="card dashboard-card border-0 shadow-sm h-100 transition-all">
            <div class="card-header bg-white border-0 pt-4 pb-0">
                <h5 class="card-title fw-bold mb-0 d-flex align-items-center">
                    ${iconHtml}
                    ${title}
                </h5>
            </div>
            <div class="card-body pt-3 pb-4">
                ${content}
            </div>
        </div>
    `;
}
