/**
 * Genera el HTML de un mensaje de alerta (success, danger, warning)
 * @param {Object} props
 * @param {string} props.id - ID del contenedor de la alerta
 * @param {string} props.type - Tipo de alerta (danger, success, warning, info)
 * @param {string} props.message - Mensaje a mostrar
 * @param {boolean} [props.dismissible=true] - Si se puede cerrar la alerta
 * @returns {string} HTML string
 */
export function AlertMessage({ id, type, message, dismissible = true }) {
    const dismissBtn = dismissible
        ? `<button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>`
        : '';

    const alertClass = dismissible ? 'alert-dismissible fade show' : '';

    // Iconos según el tipo de alerta
    let icon = 'info-circle';
    if (type === 'danger') icon = 'exclamation-triangle-fill';
    if (type === 'success') icon = 'check-circle-fill';
    if (type === 'warning') icon = 'exclamation-circle-fill';

    return `
        <div id="${id}" class="alert alert-${type} ${alertClass} d-flex align-items-center shadow-sm" role="alert">
            <i class="bi bi-${icon} me-2 fs-5"></i>
            <div>${message}</div>
            ${dismissBtn}
        </div>
    `;
}
