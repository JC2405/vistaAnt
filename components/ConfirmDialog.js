/**
 * Inyecta un diálogo de confirmación elegante en el DOM y lo muestra
 * @param {Object} props
 * @param {string} props.title 
 * @param {string} props.message 
 * @param {string} [props.confirmText='Eliminar'] 
 * @param {string} [props.cancelText='Cancelar'] 
 * @param {string} [props.type='danger'] - Bootstrap color variant para el botón de confirmación
 * @returns {Promise<boolean>} Resuelve true si el usuario confirma
 */
export function ConfirmDialog({ title, message, confirmText = 'Eliminar', cancelText = 'Cancelar', type = 'danger' }) {
    return new Promise((resolve) => {
        const dialogId = `confirm-dialog-${Date.now()}`;

        const html = `
            <div class="modal fade" id="${dialogId}" tabindex="-1" aria-hidden="true" data-bs-backdrop="static">
                <div class="modal-dialog modal-dialog-centered modal-sm">
                    <div class="modal-content border-0 shadow-lg rounded-4 text-center p-4">
                        <div class="mb-3 text-${type}">
                            <i class="bi bi-exclamation-circle-fill" style="font-size: 3.5rem;"></i>
                        </div>
                        <h5 class="fw-bold text-dark">${title}</h5>
                        <p class="text-muted mb-4">${message}</p>
                        
                        <div class="d-flex justify-content-center gap-2">
                            <button type="button" class="btn btn-light rounded-pill px-4" data-bs-dismiss="modal" id="${dialogId}-cancel">${cancelText}</button>
                            <button type="button" class="btn btn-${type} shadow-sm rounded-pill px-4" data-bs-dismiss="modal" id="${dialogId}-confirm">${confirmText}</button>
                        </div>
                    </div>
                </div>
            </div>
        `;

        // Inject to body
        document.body.insertAdjacentHTML('beforeend', html);

        const modalEl = document.getElementById(dialogId);
        const bsModal = new bootstrap.Modal(modalEl);

        document.getElementById(`${dialogId}-confirm`).addEventListener('click', () => {
            resolve(true);
            setTimeout(() => modalEl.remove(), 500); // Cleanup DOM
        });

        document.getElementById(`${dialogId}-cancel`).addEventListener('click', () => {
            resolve(false);
            setTimeout(() => modalEl.remove(), 500); // Cleanup DOM
        });

        modalEl.addEventListener('hidden.bs.modal', () => {
            // In case they click outside (if backdrop wasn't static) or press Esc
            resolve(false);
            setTimeout(() => modalEl.remove(), 500);
        });

        bsModal.show();
    });
}
