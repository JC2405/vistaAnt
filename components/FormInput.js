/**
 * Genera el HTML de un campo de formulario con validación
 * @param {Object} props
 * @param {string} props.id - ID y Name del input
 * @param {string} props.label - Texto del label
 * @param {string} [props.type='text'] - Tipo de input (text, email, password)
 * @param {string} [props.placeholder=''] - Placeholder del input
 * @param {boolean} [props.required=false] - Si es obligatorio
 * @returns {string} HTML string
 */
export function FormInput({ id, label, type = 'text', placeholder = '', required = false }) {
    return `
        <div class="mb-4 form-floating position-relative">
            <input 
                type="${type}" 
                class="form-control" 
                style="background-color: #f8fafc; border: 1px solid #eeecf5; border-radius: 0.6rem;"
                id="${id}" 
                name="${id}" 
                placeholder="${placeholder}"
                ${required ? 'required' : ''}
            >
            <label for="${id}" class="text-muted"><i class="bi bi-${type === 'password' ? 'lock' : 'envelope'} me-2"></i>${label}</label>
            <div class="invalid-feedback" id="${id}-error"></div>
        </div>
    `;
}
