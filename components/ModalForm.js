/**
 * Genera el HTML de un Custom Select (reutilizable)
 * Similar a FormInput pero para dropdowns
 */
export function FormSelect({ id, label, options = [], valueKey = 'id', textKey = 'nombre', selectedValue = '', required = false }) {
    const optionsHtml = options.map(opt => `
        <option value="${opt[valueKey]}" ${String(opt[valueKey]) === String(selectedValue) ? 'selected' : ''}>
            ${opt[textKey]}
        </option>
    `).join('');

    return `
        <div class="mb-4 form-floating position-relative">
            <select 
                class="form-select" 
                id="${id}"
                style="background-color: #f8fafc; border: 1px solid #eeecf5; border-radius: 0.6rem;" 
                name="${id}" 
                ${required ? 'required' : ''}
            >
                <option value="" disabled ${!selectedValue ? 'selected' : ''}>Selecciona una opción...</option>
                ${optionsHtml}
            </select>
            <label for="${id}" class="text-muted">${label}</label>
            <div class="invalid-feedback" id="${id}-error"></div>
        </div>
    `;
}

/**
 * Genera el HTML para un Modal Formulario de Bootstrap
 * @param {Object} props
 * @param {string} props.id - ID del modal
 * @param {string} props.title - Título
 * @param {string} props.formContent - HTML interno del form
 * @param {string} [props.submitText='Guardar']
 * @returns {string} HTML string
 */
export function ModalForm({ id, title, formContent, submitText = 'Guardar', hideFooter = false, size = 'modal-lg' }) {
    const footerHtml = hideFooter ? '' : `
        <div class="modal-footer bg-light border-top-0 py-3">
            <button type="button" class="btn btn-light rounded-3 px-4" data-bs-dismiss="modal">Cancelar</button>
            <button type="submit" class="btn btn-primary shadow-sm rounded-3 px-4 d-flex align-items-center gap-2" id="${id}-submit">
                <span class="btn-text">${submitText}</span>
                <span class="btn-spinner d-none spinner-border spinner-border-sm" role="status" aria-hidden="true"></span>
            </button>
        </div>
    `;

    return `
        <div class="modal fade" id="${id}" tabindex="-1" aria-labelledby="${id}-title" aria-hidden="true">
            <div class="modal-dialog modal-dialog-centered ${size}">
                <div class="modal-content border-0 shadow-lg rounded-4 overflow-hidden">
                    <div class="modal-header bg-gradient-primary text-white border-0 py-3" style="background: linear-gradient(135deg, hsl(256, 72%, 58%) 0%, hsl(280, 60%, 55%) 100%) !important;">
                        <h5 class="modal-title fw-bold" id="${id}-title">${title}</h5>
                        <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal" aria-label="Close"></button>
                    </div>
                    
                    <form id="${id}-form" novalidate>
                        <div class="modal-body p-3 bg-white">
                            <div id="${id}-alert"></div>
                            ${formContent}
                        </div>
                        ${footerHtml}
                    </form>
                </div>
            </div>
        </div>
    `;
}

export function setModalLoading(modalId, isLoading) {
    const btn = document.getElementById(`${modalId}-submit`);
    if (!btn) return;

    const text = btn.querySelector('.btn-text');
    const spinner = btn.querySelector('.btn-spinner');

    btn.disabled = isLoading;
    if (isLoading) {
        text.classList.add('d-none');
        spinner.classList.remove('d-none');
    } else {
        text.classList.remove('d-none');
        spinner.classList.add('d-none');
    }
}
