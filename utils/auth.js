/**
 * Guarda el JWT en localStorage
 * @param {string} token 
 */
export function setToken(token) {
    if (!token || typeof token !== 'string') {
        localStorage.removeItem('auth_token');
        return;
    }

    localStorage.setItem('auth_token', token);
}

/**
 * Obtiene el JWT de localStorage
 * @returns {string|null}
 */
export function getToken() {
    return localStorage.getItem('auth_token');
}

/**
 * Decodifica un JWT (Base64)
 * @param {string} token 
 * @returns {Object|null}
 */
export function decodeJWT(token) {
    if (!token || typeof token !== 'string') return null;
    try {
        const parts = token.split('.');
        if (parts.length < 2 || !parts[1]) return null;

        const base64Url = parts[1];
        const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
        const jsonPayload = decodeURIComponent(atob(base64).split('').map(function (c) {
            return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
        }).join(''));

        return JSON.parse(jsonPayload);
    } catch (e) {
        console.error('Error decoding JWT', e);
        return null;
    }
}

/**
 * Retorna el usuario extraído del token
 * @returns {Object|null}
 */
export function getUserFromToken() {
    const token = getToken();
    if (!token) return null;
    return decodeJWT(token);
}

/**
 * Verifica si hay una sesión activa de forma básica
 * @returns {boolean}
 */
export function isAuthenticated() {
    const token = getToken();
    if (!token) return false;

    // Opcional: Verificar expiración del token si el backend manda 'exp'
    const payload = decodeJWT(token);
    if (!payload) return false;

    if (payload.exp) {
        const currentTime = Math.floor(Date.now() / 1000);
        if (payload.exp < currentTime) {
            logout();
            return false;
        }
    }

    return true;
}

/**
 * Cierra la sesión
 */
export function logout() {
    localStorage.removeItem('auth_token');
    localStorage.removeItem('user_info');
    localStorage.removeItem('user_name');
    localStorage.removeItem('user_role');
    localStorage.removeItem('sidebar_collapsed');
    window.location.href = '/index.html';
}

/**
 * Ejecuta la validación de ruta protegida.
 * Si no está autenticado, redirige al login.
 */
export function requireAuth() {
    if (!isAuthenticated()) {
        window.location.href = '/index.html';
    }
}
