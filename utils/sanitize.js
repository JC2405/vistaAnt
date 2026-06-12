/**
 * Escapa caracteres especiales de HTML para prevenir XSS al interpolar
 * datos provenientes del backend (o del usuario) dentro de plantillas
 * que luego se asignan vía innerHTML.
 *
 * Uso:
 *   el.innerHTML = `<span>${escapeHtml(nombre)}</span>`;
 *
 * @param {*} value  Valor a escapar. null/undefined → cadena vacía.
 * @returns {string}
 */
export function escapeHtml(value) {
    if (value === null || value === undefined) return '';
    return String(value)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}
