import { FormInput } from '../components/FormInput.js';
import { Button } from '../components/Button.js';
import { AlertMessage } from '../components/AlertMessage.js';
import { validateLogin } from '../utils/validation.js';
import { loginApi } from '../utils/api.js';
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

        // Limpiar errores al escribir
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

    async handleSubmit(event) {
        event.preventDefault();
        this.clearAllErrors();

        const correo = this.correoInput.value;
        const password = this.passwordInput.value;

        // Validación lado del cliente
        const validation = validateLogin(correo, password);
        if (!validation.isValid) {
            if (validation.errors.correo) this.showError('correo', validation.errors.correo);
            if (validation.errors.password) this.showError('password', validation.errors.password);
            return;
        }

        // Llamada a la API
        this.setLoading(true);
        try {
            const result = await loginApi({ correo, password });

            // Éxito: Guardar datos
            setToken(result.token);
            if (result.usuario) {
                localStorage.setItem('user_info', JSON.stringify(result.usuario));
                // Guardar nombre para el sidebar
                const nombre = result.usuario.nombre ? result.usuario.nombre + (result.usuario.apellido ? ' ' + result.usuario.apellido : '') : result.usuario.correo;
                localStorage.setItem('user_name', nombre);
            }

            // Decodificar JWT para ver el rol directamente desde el token
            const jwtPayload = decodeJWT(result.token);

            // Determinar rol (fallbacks si JWT no lo tiene a nivel raíz)
            let rol = null;
            if (jwtPayload && jwtPayload.rol) {
                rol = jwtPayload.rol.toLowerCase();
            } else if (result.usuario && result.usuario.rol) {
                rol = result.usuario.rol.toLowerCase();
            }

            // Mapear rol al formato esperado por Sidebar.js (capitalizado exacto)
            let rolSidebar = 'Cordinador'; // default
            if (rol === 'instructor') {
                rolSidebar = 'Instructor';
            } else if (rol === 'coordinador' || rol === 'cordinador') {
                rolSidebar = 'Cordinador';
            }
            localStorage.setItem('user_role', rolSidebar);

            this.showAlert('success', '¡Autenticación exitosa! Redirigiendo...');

            let redirectUrl = '/dashboard-general.html';
            if (rol === 'instructor') {
                redirectUrl = '/dashboard-instructor.html';
            } else if (rol === 'coordinador' || rol === 'cordinador') {
                redirectUrl = '/dashboard-coordinador.html';
            }

            // Redirigir después de una leve pausa visual
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

// Inicializar la página cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', () => {
    new LoginPage();
});
