//export const API_BASE_URL = 'http://localhost:8000/api';
export const API_BASE_URL = 'http://173.249.44.159:8000/';

import { getToken, logout } from './auth.js';

/**
 * Realiza una petición GET/POST/PUT/DELETE autenticada con JSON
 */
export async function apiFetch(endpoint, options = {}) {
    const token = getToken();

    const headers = {
        'Accept': 'application/json',
        ...options.headers,
    };

    if (token) {
        headers['Authorization'] = `Bearer ${token}`;
    }

    // Solo agregar Content-Type JSON si hay body y NO es FormData
    if (options.body && !(options.body instanceof FormData)) {
        headers['Content-Type'] = 'application/json';
    }

    const config = {
        ...options,
        headers,
    };

    const response = await fetch(`${API_BASE_URL}${endpoint}`, config);

    if (response.status === 401) {
        logout();
        throw new Error('Sesión expirada. Por favor ingresa nuevamente.');
    }

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
        throw new Error(data.message || `Error ${response.status}`);
    }

    return data;
}

export const apiCall = apiFetch;

// ==========================================
// AUTH API
// ==========================================

export async function loginApi(credentials) {
    const response = await fetch(`${API_BASE_URL}/login`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
        },
        body: JSON.stringify(credentials),
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
        throw new Error(data.message || 'Error al autenticar. Verifica tus credenciales.');
    }

    return data;
}

// ==========================================
// DOWNLOAD (exportar archivos Excel)
// ==========================================

export async function apiDownload(endpoint, filename) {
    const token = getToken();

    const headers = {
        'Accept': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet, application/octet-stream, */*',
    };

    if (token) {
        headers['Authorization'] = `Bearer ${token}`;
    }

    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
        method: 'GET',
        headers,
    });

    if (response.status === 401) {
        logout();
        throw new Error('Sesión expirada.');
    }

    if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `Error ${response.status}`);
    }

    const blob = await response.blob();
    const url  = window.URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href     = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    a.remove();
}

// ==========================================
// UPLOAD (importar archivos Excel)
// ==========================================

export async function apiUpload(endpoint, formData) {
    const token = getToken();

    // IMPORTANTE: NO incluir Content-Type manual.
    // El navegador lo agrega automáticamente con el boundary correcto para FormData.
    const headers = {
        'Accept': 'application/json',
    };

    if (token) {
        headers['Authorization'] = `Bearer ${token}`;
    }

    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
        method: 'POST',
        headers,
        body: formData,
    });

    if (response.status === 401) {
        logout();
        throw new Error('Sesión expirada.');
    }

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
        throw new Error(data.message || `Error ${response.status}`);
    }

    return data;
}

// ==========================================
// FUNCIONARIOS API
// ==========================================

export function getFuncionarios() {
    return apiFetch('/listarFuncionario');
}

export function createFuncionario(data) {
    return apiFetch('/crearFuncionario', {
        method: 'POST',
        body: JSON.stringify(data),
    });
}

export function createAdmin(data) {
    return apiFetch('/crearAdmin', {
        method: 'POST',
        body: JSON.stringify(data),
    });
}

export function updateFuncionario(id, data) {
    return apiFetch(`/editarFuncionario/${id}`, {
        method: 'PUT',
        body: JSON.stringify(data),
    });
}

export function deleteFuncionario(id) {
    return apiFetch(`/eliminarFuncionario/${id}`, { method: 'DELETE' });
}

// ==========================================
// TIPOS DE CONTRATO API
// ==========================================

export function getTiposContrato() {
    return apiFetch('/listarTipoContrato');
}

export function createTipoContrato(data) {
    return apiFetch('/crearTipoContrato', {
        method: 'POST',
        body: JSON.stringify(data),
    });
}

export function updateTipoContrato(id, data) {
    return apiFetch(`/editarTipoContrato/${id}`, {
        method: 'PUT',
        body: JSON.stringify(data),
    });
}

export function deleteTipoContrato(id) {
    return apiFetch(`/eliminarTipoContrato/${id}`, { method: 'DELETE' });
}

// ==========================================
// ÁREAS API
// ==========================================

export function getAreas() {
    return apiFetch('/listarArea');
}

export function createArea(data) {
    return apiFetch('/crearArea', {
        method: 'POST',
        body: JSON.stringify(data),
    });
}

export function updateArea(id, data) {
    return apiFetch(`/editarArea/${id}`, {
        method: 'PUT',
        body: JSON.stringify(data),
    });
}

export function deleteArea(id) {
    return apiFetch(`/eliminarArea/${id}`, { method: 'DELETE' });
}

// ==========================================
// MUNICIPIOS API
// ==========================================

export function getMunicipios() {
    return apiFetch('/listarMunicipio');
}

export function getFichasMunicipioPrograma(idMunicipio) {
    return apiFetch(`/fichas/programa-municipio/${idMunicipio}`);
}

// ── Flujo jerárquico Horario: Municipio → Programa → Ficha ────────────────────
export function getMunicipiosConFichas() {
    return apiFetch('/municipios-con-fichas');
}

export function getProgramasPorMunicipio(idMunicipio) {
    return apiFetch(`/programas-por-municipio/${idMunicipio}`);
}

export function getFichasPorProgramaMunicipio(idPrograma, idMunicipio) {
    return apiFetch(`/fichas-por-programa-municipio/${idPrograma}/${idMunicipio}`);
}

// ==========================================
// SEDES API
// ==========================================

export function getSedes() {
    return apiFetch('/listarSedes');
}

export function createSede(data) {
    return apiFetch('/crearSede', {
        method: 'POST',
        body: JSON.stringify(data),
    });
}

export function updateSede(id, data) {
    return apiFetch(`/editarSede/${id}`, {
        method: 'PUT',
        body: JSON.stringify(data),
    });
}

export function deleteSede(id) {
    return apiFetch(`/eliminarSede/${id}`, { method: 'DELETE' });
}

// ==========================================
// TIPO DE FORMACIÓN API
// ==========================================

export function getTiposFormacion() {
    return apiFetch('/listarTipoFormacion');
}

export function createTipoFormacion(data) {
    return apiFetch('/crearTipoFormacion', {
        method: 'POST',
        body: JSON.stringify(data),
    });
}

export function updateTipoFormacion(id, data) {
    return apiFetch(`/editarTipoFormacion/${id}`, {
        method: 'PUT',
        body: JSON.stringify(data),
    });
}

export function deleteTipoFormacion(id) {
    return apiFetch(`/eliminarTipoFormacion/${id}`, { method: 'DELETE' });
}

// ==========================================
// PROGRAMAS API
// ==========================================

export function getProgramas() {
    return apiFetch('/listarPrograma');
}

export function createPrograma(data) {
    return apiFetch('/crearPrograma', {
        method: 'POST',
        body: JSON.stringify(data),
    });
}

export function updatePrograma(id, data) {
    return apiFetch(`/editarPrograma/${id}`, {
        method: 'PUT',
        body: JSON.stringify(data),
    });
}

export function deletePrograma(id) {
    return apiFetch(`/eliminarPrograma/${id}`, { method: 'DELETE' });
}

// ==========================================
// AMBIENTES API
// ==========================================

export function getAmbientes() {
    return apiFetch('/listarAmbiente');
}

export function createAmbiente(data) {
    return apiFetch('/crearAmbiente', {
        method: 'POST',
        body: JSON.stringify(data),
    });
}

export function updateAmbiente(id, data) {
    return apiFetch(`/editarAmbiente/${id}`, {
        method: 'PUT',
        body: JSON.stringify(data),
    });
}

export function deleteAmbiente(id) {
    return apiFetch(`/eliminarAmbiente/${id}`, { method: 'DELETE' });
}

// ==========================================
// FICHAS API
// ==========================================

export function getFichas() {
    return apiFetch('/listarFicha');
}

export function createFicha(data) {
    return apiFetch('/crearFicha', {
        method: 'POST',
        body: JSON.stringify(data),
    });
}

export function updateFicha(id, data) {
    return apiFetch(`/editarFicha/${id}`, {
        method: 'PUT',
        body: JSON.stringify(data),
    });
}

export function deleteFicha(id) {
    return apiFetch(`/eliminarFicha/${id}`, { method: 'DELETE' });
}

// ==========================================
// HORARIO POR FICHA / INSTRUCTOR API
// ==========================================

export function getHorariosPorFicha(idFicha) {
    return apiFetch(`/horariosPorFicha/${idFicha}`);
}

export function enviarHorarioAprendiz(idFicha, fechaInicio = null, fechaFin = null) {
    const body = {};

    if (fechaInicio) body.fechaInicio = fechaInicio;
    if (fechaFin) body.fechaFin = fechaFin;

    return apiFetch(`/enviarHorarioAprendiz/${idFicha}`, {
        method: 'POST',
        body: JSON.stringify(body),
    });
}

export function getHorarioPorInstructor(idFuncionario) {
    return apiFetch(`/horarioPorInstructor/${idFuncionario}`);
}

export function enviarHorario(idFuncionario, fechaInicio = null, fechaFin = null) {
    const body = {};

    if (fechaInicio) body.fechaInicio = fechaInicio;
    if (fechaFin) body.fechaFin = fechaFin;

    return apiFetch(`/enviarHorario/${idFuncionario}`, {
        method: 'POST',
        body: JSON.stringify(body),
    });
}
// ==========================================
// EXPORTAR EXCEL
// ==========================================

export function exportarFuncionarios() {
    const fecha = new Date().toISOString().split('T')[0];
    return apiDownload('/exportar/funcionarios', `funcionarios_${fecha}.xlsx`);
}

export function exportarFichas() {
    const fecha = new Date().toISOString().split('T')[0];
    return apiDownload('/exportar/fichas', `fichas_${fecha}.xlsx`);
}

export function exportarAprendices() {
    const fecha = new Date().toISOString().split('T')[0];
    return apiDownload('/exportar/aprendices', `aprendices_${fecha}.xlsx`);
}

export function exportarAprendicesDeFicha(idFicha) {
    const fecha = new Date().toISOString().split('T')[0];
    return apiDownload(`/exportar/aprendices/${idFicha}`, `aprendices_ficha_${idFicha}_${fecha}.xlsx`);
}

export function exportarProgramas() {
    const fecha = new Date().toISOString().split('T')[0];
    return apiDownload('/exportar/programas', `programas_${fecha}.xlsx`);
}

// ==========================================
// IMPORTAR EXCEL
// ==========================================

/**
 * Importa funcionarios desde un archivo Excel.
 * El backend espera el campo 'archivo' en multipart/form-data.
 */
export function importarFuncionarios(file) {
    const formData = new FormData();
    formData.append('archivo', file); // ← debe coincidir con lo que valida Laravel
    return apiUpload('/importar/funcionarios', formData);
}

/**
 * Importa aprendices desde un archivo Excel.
 * El backend espera 'archivo' e 'id_ficha' en multipart/form-data.
 */
export function importarAprendices(file, idFicha = null) {
    const formData = new FormData();
    formData.append('archivo', file);
    if (idFicha) {
        formData.append('id_ficha', String(idFicha)); // ← enviar como string es más seguro con FormData
    }
    return apiUpload('/importar/aprendices', formData);
}

export function exportarCompetencias(idTipoFormacion = null) {
    const fecha = new Date().toISOString().split('T')[0];
    const url = idTipoFormacion ? `/exportar/competencias?id_tipo_formacion=${idTipoFormacion}` : '/exportar/competencias';
    return apiDownload(url, `competencias_${fecha}.xlsx`);
}

export function importarCompetencias(file, idTipoFormacion = null) {
    const formData = new FormData();
    formData.append('archivo', file);
    if (idTipoFormacion) {
        formData.append('id_tipo_formacion', String(idTipoFormacion));
    }
    return apiUpload('/importar/competencias', formData);
}

export function exportarResultados(idTipoFormacion = null) {
    const fecha = new Date().toISOString().split('T')[0];
    const url = idTipoFormacion ? `/exportar/resultados?id_tipo_formacion=${idTipoFormacion}` : '/exportar/resultados';
    return apiDownload(url, `resultados_${fecha}.xlsx`);
}

export function importarResultados(file, idTipoFormacion = null) {
    const formData = new FormData();
    formData.append('archivo', file);
    if (idTipoFormacion) {
        formData.append('id_tipo_formacion', String(idTipoFormacion));
    }
    return apiUpload('/importar/resultados', formData);
}

export function analizarJuicios(file) {
    const formData = new FormData();
    formData.append('archivo', file);
    return apiUpload('/analizar/juicios', formData);
}

/**
 * Analiza el Excel de Juicios Evaluativos cruzando contra la BD:
 *  - Toma la ficha → programa → tipoFormacion
 *  - Carga las competencias (con sus resultados) de ese tipoFormacion en BD
 *  - Cruza con el Excel para determinar qué competencias están Pendientes vs Cubiertas
 *
 * Endpoint: POST /api/reportes/competencias-pendientes
 * Body: multipart/form-data  → archivo + id_ficha
 */
export function analizarJuiciosConFicha(file, idFicha) {
    const formData = new FormData();
    formData.append('archivo', file);
    formData.append('id_ficha', String(idFicha));
    return apiUpload('/reportes/competencias-pendientes', formData);
}