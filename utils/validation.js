/**
 * Valida si un email tiene formato correcto
 * @param {string} email
 * @returns {boolean}
 */
export function isValidEmail(email) {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(String(email).toLowerCase());
}

/**
 * Valida si un valor no está vacío
 * @param {string} value
 * @returns {boolean}
 */
export function isNotEmpty(value) {
    return value !== null && value.trim() !== '';
}

/**
 * Valida el formulario de login completo
 * @param {string} correo
 * @param {string} password
 * @returns {Object} { isValid: boolean, errors: Object }
 */
export function validateLogin(correo, password) {
    const errors = {};
    let isValid = true;

    if (!isNotEmpty(correo)) {
        errors.correo = 'El correo es obligatorio.';
        isValid = false;
    } else if (!isValidEmail(correo)) {
        errors.correo = 'El formato del correo no es válido.';
        isValid = false;
    }

    if (!isNotEmpty(password)) {
        errors.password = 'La contraseña es obligatoria.';
        isValid = false;
    }

    return { isValid, errors };
}
