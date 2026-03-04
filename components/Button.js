import { LoadingSpinner } from './LoadingSpinner.js';

/**
 * Genera el HTML de un botón reutilizable
 * @param {Object} props
 * @param {string} props.text - Texto del botón
 * @param {string} [props.id] - ID opcional del botón
 * @param {string} [props.type='button'] - submit, button, reset
 * @param {string} [props.variant='primary'] - Color variant (Bootstrap classes)
 * @param {boolean} [props.fullWidth=false] - Si ocupa el 100% del ancho
 * @returns {string} HTML string
 */
export function Button({ text, id = '', type = 'button', variant = 'primary', fullWidth = false }) {
    const widthClass = fullWidth ? 'w-100' : '';
    const idAttr = id ? `id="${id}"` : '';

    return `
        <button ${idAttr} type="${type}" class="btn btn-${variant} btn-lg shadow-sm ${widthClass} d-flex align-items-center justify-content-center gap-2 transition-all">
            <span class="btn-text">${text}</span>
            <span class="btn-spinner d-none">${LoadingSpinner({ size: 'sm', color: 'light' })}</span>
        </button>
    `;
}
