// Contenido: publicado (datos/contenido.json) y borrador del dueño (localStorage).
const LS_BORRADOR = "rsf_borrador";
const LS_DUENO = "rsf_clave_dueno";

export async function cargarPublicado() {
    const r = await fetch("datos/contenido.json", { cache: "no-store" });
    if (!r.ok) throw new Error("No se pudo leer datos/contenido.json");
    return validar(await r.json());
}

export function validar(c) {
    if (!c || !Array.isArray(c.secciones)) throw new Error("Archivo de contenido inválido");
    c.config = c.config || {};
    c.secciones.forEach(s => { s.bloques = Array.isArray(s.bloques) ? s.bloques : []; });
    return c;
}

const leer = (k) => { try { return JSON.parse(localStorage.getItem(k)); } catch { return null; } };

export const leerBorrador = () => leer(LS_BORRADOR);
export const borrarBorrador = () => { try { localStorage.removeItem(LS_BORRADOR); } catch {} };
export function guardarBorrador(c) {
    try { localStorage.setItem(LS_BORRADOR, JSON.stringify(c)); return true; }
    catch { return false; }   // normalmente: se llenó el almacenamiento (fotos pesadas)
}

export const leerClaveDueno = () => leer(LS_DUENO);
export function guardarClaveDueno(obj) { localStorage.setItem(LS_DUENO, JSON.stringify(obj)); }

export function exportar(c) {
    const blob = new Blob([JSON.stringify(c, null, 2)], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "contenido.json";
    a.click();
    URL.revokeObjectURL(a.href);
}

export async function importar(archivo) {
    return validar(JSON.parse(await archivo.text()));
}
