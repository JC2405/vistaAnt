//export const API_BASE_URL = 'http://localhost:8000/api';
export const API_BASE_URL = 'https://backend-manejohorarioscimm.sgdis.cloud/api';
import { getToken, logout } from './auth.js';

/**
 * Realiza una petición GET/POST/PUT/DELETE autenticada
 */
export async function apiFetch(endpoint, options = {}) {
    const token = getToken();
    const headers = {
        'Accept': 'application/json',
        ...options.headers
    };

    if (token) {
        headers['Authorization'] = `Bearer ${token}`;
    }

    if (!(options.body instanceof FormData)) {
        headers['Content-Type'] = 'application/json';
    }

    const config = {
        ...options,
        headers
    };

    const response = await fetch(`${API_BASE_URL}${endpoint}`, config);

    if (response.status === 401) {
        logout(); // Token expirado o inválido
        throw new Error('Sesión expirada. Por favor ingresa nuevamente.');
    }

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
        throw new Error(data.message || `Error ${response.status}`);
    }

    return data;
}

export const apiCall = apiFetch;

/**
 * Realiza una petición POST al endpoint de login
 * @param {Object} credentials - Las credenciales del usuario { correo, password }
 * @returns {Promise<Object>} - La respuesta de la API (token y datos del usuario)
 */
export async function loginApi(credentials) {
    try {
        const response = await fetch(`${API_BASE_URL}/login`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            },
            body: JSON.stringify(credentials)
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.message || 'Error al autenticar. Verifica tus credenciales.');
        }

        return data; // { ok: true, token, usuario, sidebar, ... }
    } catch (error) {
        throw error;
    }
}

// ==========================================
// FUNCIONARIOS API
// ==========================================

export async function getFuncionarios() {
    return apiFetch('/listarFuncionario');
}

export async function createFuncionario(data) {
    return apiFetch('/crearFuncionario', {
        method: 'POST',
        body: JSON.stringify(data)
    });
}

export async function updateFuncionario(id, data) {
    return apiFetch(`/editarFuncionario/${id}`, {
        method: 'PUT',
        body: JSON.stringify(data)
    });
}

export async function deleteFuncionario(id) {
    return apiFetch(`/eliminarFuncionario/${id}`, {
        method: 'DELETE'
    });
}

export async function getTiposContrato() {
    return apiFetch('/listarTipoContrato');
}

export async function createTipoContrato(data) {
    return apiFetch('/crearTipoContrato', {
        method: 'POST',
        body: JSON.stringify(data)
    });
}

export async function updateTipoContrato(id, data) {
    return apiFetch(`/editarTipoContrato/${id}`, {
        method: 'PUT',
        body: JSON.stringify(data)
    });
}

export async function deleteTipoContrato(id) {
    return apiFetch(`/eliminarTipoContrato/${id}`, {
        method: 'DELETE'
    });
}

// ==========================================
// ÁREAS API
// ==========================================

export async function getAreas() {
    return apiFetch('/listarArea');
}

export async function createArea(data) {
    return apiFetch('/crearArea', {
        method: 'POST',
        body: JSON.stringify(data)
    });
}

export async function updateArea(id, data) {
    return apiFetch(`/editarArea/${id}`, {
        method: 'PUT',
        body: JSON.stringify(data)
    });
}

export async function deleteArea(id) {
    return apiFetch(`/eliminarArea/${id}`, {
        method: 'DELETE'
    });
}

// ==========================================
// MUNICIPIOS API
// ==========================================

export async function getMunicipios() {
    return apiFetch('/listarMunicipio');
}

// ==========================================
// SEDES API
// ==========================================

export async function getSedes() {
    return apiFetch('/listarSedes');
}

export async function createSede(data) {
    return apiFetch('/crearSede', {
        method: 'POST',
        body: JSON.stringify(data)
    });
}

export async function updateSede(id, data) {
    return apiFetch(`/editarSede/${id}`, {
        method: 'PUT',
        body: JSON.stringify(data)
    });
}

export async function deleteSede(id) {
    return apiFetch(`/eliminarSede/${id}`, {
        method: 'DELETE'
    });
}

// ==========================================
// TIPO DE FORMACION API
// ==========================================

export async function getTiposFormacion() {
    return apiFetch('/listarTipoFormacion');
}

export async function createTipoFormacion(data) {
    return apiFetch('/crearTipoFormacion', {
        method: 'POST',
        body: JSON.stringify(data)
    });
}

export async function updateTipoFormacion(id, data) {
    return apiFetch(`/editarTipoFormacion/${id}`, {
        method: 'PUT',
        body: JSON.stringify(data)
    });
}

export async function deleteTipoFormacion(id) {
    return apiFetch(`/eliminarTipoFormacion/${id}`, {
        method: 'DELETE'
    });
}

// ==========================================
// PROGRAMAS API
// ==========================================

export async function getProgramas() {
    return apiFetch('/listarPrograma');
}

export async function createPrograma(data) {
    return apiFetch('/crearPrograma', {
        method: 'POST',
        body: JSON.stringify(data)
    });
}

export async function updatePrograma(id, data) {
    return apiFetch(`/editarPrograma/${id}`, {
        method: 'PUT',
        body: JSON.stringify(data)
    });
}

export async function deletePrograma(id) {
    return apiFetch(`/eliminarPrograma/${id}`, {
        method: 'DELETE'
    });
}

// ==========================================
// AMBIENTES API
// ==========================================

export async function getAmbientes() {
    return apiFetch('/listarAmbiente');
}

export async function createAmbiente(data) {
    return apiFetch('/crearAmbiente', {
        method: 'POST',
        body: JSON.stringify(data)
    });
}

export async function updateAmbiente(id, data) {
    return apiFetch(`/editarAmbiente/${id}`, {
        method: 'PUT',
        body: JSON.stringify(data)
    });
}

export async function deleteAmbiente(id) {
    return apiFetch(`/eliminarAmbiente/${id}`, {
        method: 'DELETE'
    });
}

// ==========================================
// FICHAS API
// ==========================================

export async function getFichas() {
    return apiFetch('/listarFicha');
}

export async function createFicha(data) {
    return apiFetch('/crearFicha', {
        method: 'POST',
        body: JSON.stringify(data)
    });
}

export async function updateFicha(id, data) {
    return apiFetch(`/editarFicha/${id}`, {
        method: 'PUT',
        body: JSON.stringify(data)
    });
}

export async function deleteFicha(id) {
    return apiFetch(`/eliminarFicha/${id}`, {
        method: 'DELETE'
    });
}

