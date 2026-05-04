export function footer() {
    return `
     <!-- Footer integrado con la página -->
<footer style="
    background: transparent;
    border-top: 1px solid rgba(0,0,0,0.06);
    padding: 0.9rem 1.5rem;
    display: flex;
    align-items: center;
    justify-content: space-between;
    flex-wrap: wrap;
    gap: 0.75rem;
    backdrop-filter: blur(6px);
">

    <!-- Logo + info -->
    <div style="display: flex; align-items: center; gap: 12px;">

        <!-- LOGO SENA -->
        <div style="
            width: 44px;
            height: 44px;
            border-radius: 10px;
            overflow: hidden;
            display: flex;
            align-items: center;
            justify-content: center;
            background: transparent;
        ">
            <img 
                src="../img/logoSena.webp"
                alt="Logo SENA"
                style="
                    width: 100%;
                    height: 100%;
                    object-fit: contain;
                "
            >
        </div>

        <!-- Texto -->
        <div>
            <p style="margin: 0; font-size: 13px; font-weight: 700; color: #1f2d3d;">
                SENA · CIMM
            </p>
            <p style="margin: 0; font-size: 11px; color: #6c7a89;">
                Centro Industrial de Mantenimiento y Manufactura
            </p>
        </div>
    </div>

    <!-- Sistema -->
    <div style="
        display: flex;
        align-items: center;
        gap: 8px;
        padding: 6px 10px;
        border-radius: 8px;
        background: rgba(78, 115, 223, 0.08);
    ">
        <i class="bi bi-calendar3" style="color: #4e73df; font-size: 14px;"></i>
        <span style="font-size: 12px; color: #4e5b6e; font-weight: 500;">
            Sistema de Manejo de Horarios
        </span>
    </div>

    <!-- Créditos -->
    <p style="
        margin: 0;
        font-size: 11px;
        color: #8a94a6;
        padding: 5px 10px;
        border-radius: 6px;
        background: rgba(0,0,0,0.03);
    ">
        © 2026 · ADSO
    </p>

</footer>
`;
}