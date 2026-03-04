/**
 * Genera el HTML de un spinner de carga
 * @param {Object} props
 * @param {string} [props.size=''] - 'sm' para spinner pequeño
 * @param {string} [props.color='primary'] - Variantes de color (primary, light, etc.)
 * @returns {string} HTML string
 */
export function LoadingSpinner({ size = '', color = 'primary' }) {
    const sizeClass = size === 'sm' ? 'spinner-border-sm' : '';
    return `
        <div class="spinner-border ${sizeClass} text-${color}" role="status">
            <span class="visually-hidden">Cargando...</span>
        </div>
    `;
}
