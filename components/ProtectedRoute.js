import { requireAuth } from '../utils/auth.js?v=5';

/**
 * Componente funcional que protege una ruta.
 * Debe ser instanciado al inicio del controlador de la página.
 */
export class ProtectedRoute {
    constructor() {
        requireAuth();
    }
}
