import { FormInput } from '../components/FormInput.js';
import { Button } from '../components/Button.js';
import { AlertMessage } from '../components/AlertMessage.js';
import { validateLogin } from '../utils/validation.js';
import { loginApi } from '../utils/api.js?v=4';
import { setToken, decodeJWT } from '../utils/auth.js';

class LoginPage {
    constructor() {
        this.appContainer = document.getElementById('app');
        this.render();
        this.attachEvents();
    }

    render() {
        this.appContainer.innerHTML = `
            <div class="login-container">
                <main class="login-card">
                    <div class="login-header">
                        <div class="login-brand-icon">
                            <i class="bi bi-shield-lock-fill"></i>
                        </div>
                        <h2 class="fw-bold mb-0">Bienvenido</h2>
                        <p class="text-white-50 mt-2 position-relative" style="z-index: 1;">Ingresa tus credenciales para continuar</p>
                    </div>
                    
                    <div class="login-body">
                        <div id="alert-container"></div>
                        
                        <form id="login-form" novalidate>
                            ${FormInput({
                                id: 'correo',
                                label: 'Correo Electrónico',
                                type: 'email',
                                placeholder: 'ejemplo@correo.com',
                                required: true
                            })}
                            
                            ${FormInput({
                                id: 'password',
                                label: 'Contraseña',
                                type: 'password',
                                placeholder: '••••••••',
                                required: true
                            })}
                            
                            <div class="mt-5">
                                ${Button({
                                    id: 'btn-submit',
                                    text: 'Iniciar Sesión',
                                    type: 'submit',
                                    fullWidth: true
                                })}
                            </div>
                        </form>
                    </div>
                </main>
            </div>
        `;
    }

    attachEvents() {
        this.form = document.getElementById('login-form');
        this.btnSubmit = document.getElementById('btn-submit');
        this.btnText = this.btnSubmit.querySelector('.btn-text');
        this.btnSpinner = this.btnSubmit.querySelector('.btn-spinner');
        this.alertContainer = document.getElementById('alert-container');

        this.correoInput = document.getElementById('correo');
        this.passwordInput = document.getElementById('password');

        this.form.addEventListener('submit', this.handleSubmit.bind(this));

        this.correoInput.addEventListener('input', () => this.clearError('correo'));
        this.passwordInput.addEventListener('input', () => this.clearError('password'));
    }

    setLoading(isLoading) {
        this.btnSubmit.disabled = isLoading;
        if (isLoading) {
            this.btnText.classList.add('d-none');
            this.btnSpinner.classList.remove('d-none');
        } else {
            this.btnText.classList.remove('d-none');
            this.btnSpinner.classList.add('d-none');
        }
    }

    showError(field, message) {
        const input = document.getElementById(field);
        const errorDiv = document.getElementById(`${field}-error`);
        input.classList.add('is-invalid');
        errorDiv.textContent = message;
    }

    clearError(field) {
        const input = document.getElementById(field);
        const errorDiv = document.getElementById(`${field}-error`);
        input.classList.remove('is-invalid');
        errorDiv.textContent = '';
    }

    clearAllErrors() {
        this.clearError('correo');
        this.clearError('password');
        this.alertContainer.innerHTML = '';
    }

    showAlert(type, message) {
        this.alertContainer.innerHTML = AlertMessage({
            id: 'login-alert',
            type: type,
            message: message
        });
    }

    /**
     * Extrae el rol del token JWT o del objeto usuario de la respuesta.
     * Retorna siempre el rol en minúsculas sin espacios, o null si no se encuentra.
     */
    _extraerRol(jwtPayload, usuarioApi) {
        // 1. Intentar desde el payload del JWT (campo "rol")
        if (jwtPayload?.rol && typeof jwtPayload.rol === 'string') {
            return jwtPayload.rol.toLowerCase().trim();
        }

        // 2. Intentar desde el objeto usuario de la respuesta API
        if (usuarioApi?.rol && typeof usuarioApi.rol === 'string') {
            return usuarioApi.rol.toLowerCase().trim();
        }

        // 3. Intentar campo "role" en caso de que el backend lo devuelva así
        if (jwtPayload?.role && typeof jwtPayload.role === 'string') {
            return jwtPayload.role.toLowerCase().trim();
        }
        if (usuarioApi?.role && typeof usuarioApi.role === 'string') {
            return usuarioApi.role.toLowerCase().trim();
        }

        return null;
    }

    /**
     * Mapea el rol normalizado a los valores esperados por Sidebar.js
     * y devuelve también la URL de redirección correspondiente.
     */
    _mapearRol(rol) {
        // Acepta variantes: 'instructor', 'coordinador', 'cordinador', 'coordinator'
        if (rol === 'instructor') {
            return {
                rolSidebar: 'Instructor',
                redirectUrl: '/dashboard-instructor.html'
            };
        }

        if (rol === 'coordinador' || rol === 'cordinador' || rol === 'coordinator') {
            return {
                rolSidebar: 'Cordinador',
                redirectUrl: '/dashboard-coordinador.html'
            };
        }

        // Rol desconocido: dashboard genérico
        console.warn(`[Login] Rol no reconocido: "${rol}". Redirigiendo a dashboard genérico.`);
        return {
            rolSidebar: rol || 'Cordinador',
            redirectUrl: '/dashboard-general.html'
        };
    }

    async handleSubmit(event) {
        event.preventDefault();
        this.clearAllErrors();

        const correo = this.correoInput.value;
        const password = this.passwordInput.value;

        const validation = validateLogin(correo, password);
        if (!validation.isValid) {
            if (validation.errors.correo) this.showError('correo', validation.errors.correo);
            if (validation.errors.password) this.showError('password', validation.errors.password);
            return;
        }

        this.setLoading(true);

        try {
            const result = await loginApi({ correo, password });

            // Guardar token
            setToken(result.token);

            // Guardar info del usuario
            if (result.usuario) {
                localStorage.setItem('user_info', JSON.stringify(result.usuario));

                const nombre = result.usuario.nombre
                    ? result.usuario.nombre + (result.usuario.apellido ? ' ' + result.usuario.apellido : '')
                    : result.usuario.correo;
                localStorage.setItem('user_name', nombre);
            }

            // Decodificar JWT
            let jwtPayload = null;
            try {
                jwtPayload = decodeJWT(result.token);
            } catch (e) {
                console.warn('[Login] No se pudo decodificar el JWT:', e);
            }

            // DEBUG temporal — eliminar en producción
            console.log('[Login] JWT payload:', jwtPayload);
            console.log('[Login] result.usuario:', result.usuario);

            // Extraer y mapear rol
            const rol = this._extraerRol(jwtPayload, result.usuario);
            console.log('[Login] Rol extraído:', rol);

            const { rolSidebar, redirectUrl } = this._mapearRol(rol);

            localStorage.setItem('user_role', rolSidebar);


            setTimeout(() => {
                window.location.href = redirectUrl;
            }, 800);

        } catch (error) {
            this.showAlert('danger', error.message);
        } finally {
            this.setLoading(false);
        }
    }
}

document.addEventListener('DOMContentLoaded', () => {
    new LoginPage();
});
