import { API_BASE_URL } from './api.js';

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
            // Usar _clearLocalSession directamente para evitar dependencia circular
            _clearLocalSession();
            return false;
        }
    }

    return true;
}

/**
 * Limpia el storage local y redirige al login.
 * Uso interno — llamar solo después de invalidar el token en el servidor.
 */
function _clearLocalSession() {
    localStorage.removeItem('auth_token');
    localStorage.removeItem('user_info');
    localStorage.removeItem('user_name');
    localStorage.removeItem('user_role');
    localStorage.removeItem('sidebar_collapsed');
    window.location.href = '/index.html';
}

/**
 * Cierra la sesión:
 * 1. Llama al endpoint POST /logout del backend para invalidar el token JWT en el servidor.
 * 2. Limpia el localStorage y redirige al login.
 * @returns {Promise<void>}
 */
export async function logout() {
    const token = getToken();
    if (token) {
        try {
            await fetch(`${API_BASE_URL}/logout`, {
                method: 'POST',
                headers: {
                    'Accept': 'application/json',
                    'Authorization': `Bearer ${token}`,
                },
            });
        } catch (e) {
            // Si hay error de red, de todas formas cerramos sesión localmente
            console.warn('No se pudo contactar al servidor para invalidar el token:', e);
        }
    }
    _clearLocalSession();
}

/**
 * Ejecuta la validación de ruta protegida.
 * Si no está autenticado, redirige al login.
 *
 * También registra un listener para el evento `pageshow` que cubre el caso
 * del BFCache (Back-Forward Cache): cuando el usuario navega hacia atrás,
 * el navegador puede restaurar la página desde memoria sin volver a ejecutar
 * el JS. El evento `pageshow` con `persisted=true` indica ese escenario y
 * permite forzar la re-validación de sesión.
 */
export function requireAuth() {
    // Validación inicial — redirige de inmediato si no hay sesión
    if (!isAuthenticated()) {
        window.location.href = '/index.html';
        return;
    }

    // Guard contra BFCache: si el navegador restaura esta página desde caché
    // (botón "atrás" / "adelante"), volvemos a verificar la sesión.
    window.addEventListener('pageshow', (event) => {
        if (event.persisted && !isAuthenticated()) {
            // La página se restauró desde BFCache pero ya no hay sesión válida
            window.location.replace('/index.html');
        }
    });
}
