// Portal de prueba: navegación + modo dueño (edición local, publicación por archivo).
import {
    cargarPublicado, leerBorrador, guardarBorrador, borrarBorrador,
    leerClaveDueno, guardarClaveDueno, exportar, importar
} from "./almacen.js";
import { crearClave, verificar } from "./seguridad.js";
import { el, dibujarBloque } from "./render.js";
import { formulario, editarBloque } from "./dialogos.js";

const destino = document.getElementById("content-target");
const tabs = document.getElementById("nav-tabs");
const barra = document.getElementById("barra-dueno");

const estado = {
    publicado: null,   // lo que ven los visitantes (datos/contenido.json)
    cont: null,        // lo que se está mostrando
    dueno: false,
    miembro: false,
    seccionId: null,
    aviso: "",
    fallos: 0
};

const seccionActual = () =>
    estado.cont.secciones.find(s => s.id === estado.seccionId) || estado.cont.secciones[0];

const clonar = (o) => JSON.parse(JSON.stringify(o));

// ---------- guardado del borrador ----------
function cambio() {
    const ok = guardarBorrador(estado.cont);
    estado.aviso = ok
        ? "Borrador guardado en este navegador. Exportá contenido.json para publicar."
        : "⚠ No se pudo guardar (almacenamiento lleno). Exportá ya o usá fotos más livianas / enlaces.";
    dibujar();
}

// ---------- dibujo ----------
function dibujarTabs() {
    tabs.replaceChildren(...estado.cont.secciones.map(s => el("button", {
        type: "button",
        class: "nav-tab" + (s.privada ? " protegida" : "")
            + (s.privada && (estado.miembro || estado.dueno) ? " desbloqueada" : "")
            + (s.id === seccionActual().id ? " active" : ""),
        text: s.titulo,
        onclick: () => { estado.seccionId = s.id; dibujar(); }
    })));
}

function dibujarBarra() {
    barra.hidden = !estado.dueno;
    if (!estado.dueno) return;
    const entrada = el("input", { type: "file", accept: "application/json", hidden: "" });
    entrada.addEventListener("change", async () => {
        try {
            estado.cont = await importar(entrada.files[0]);
            cambio();
        } catch (e) { alert("Archivo inválido: " + e.message); }
    });
    barra.replaceChildren(
        el("span", { class: "estado", text: "MODO DUEÑO — " + (estado.aviso || "los cambios se guardan como borrador local") }),
        el("button", { class: "primario", type: "button", text: "Exportar contenido.json", onclick: () => exportar(estado.cont) }),
        el("button", { type: "button", text: "Importar", onclick: () => entrada.click() }),
        el("button", { type: "button", text: "Clave de miembros", onclick: cambiarClaveMiembros }),
        el("button", {
            type: "button", text: "Descartar borrador",
            onclick: () => {
                if (!confirm("¿Volver al contenido publicado y perder el borrador?")) return;
                borrarBorrador(); estado.cont = clonar(estado.publicado); estado.aviso = ""; dibujar();
            }
        }),
        el("button", { type: "button", text: "Salir", onclick: salirDueno }),
        entrada
    );
}

function vistaClaveMiembros(s) {
    const error = el("div", { class: "aviso-error", role: "alert" });
    const campo = el("input", { type: "password", required: "", autocomplete: "off" });
    const form = el("form", {
        onsubmit: async (e) => {
            e.preventDefault();
            if (await verificar(campo.value, estado.cont.config?.miembros)) { estado.miembro = true; dibujar(); }
            else { error.textContent = "Clave incorrecta."; campo.value = ""; }
        }
    },
        el("div", { class: "form-group" }, el("label", { text: "Clave de miembros" }), campo),
        el("button", { class: "btn-submit", type: "submit", text: "Entrar" }), error);
    destino.replaceChildren(el("div", { class: "auth-container" },
        el("h1", { text: s.titulo }),
        el("p", { text: "Sección solo para miembros. Ingresá la clave que te dio la coordinación." }),
        form,
        el("p", { class: "nota-chica", text: "MODO PRUEBA: esta barrera es solo de interfaz, no protege contenido sensible." })));
}

function controlesBloque(s, i) {
    const mover = (d) => {
        const j = i + d;
        if (j < 0 || j >= s.bloques.length) return;
        [s.bloques[i], s.bloques[j]] = [s.bloques[j], s.bloques[i]];
        cambio();
    };
    return el("div", { class: "ctrl-bloque" },
        el("button", { type: "button", text: "↑", title: "Subir", onclick: () => mover(-1) }),
        el("button", { type: "button", text: "↓", title: "Bajar", onclick: () => mover(1) }),
        el("button", { type: "button", text: "✎ Editar", onclick: async () => {
            const nuevo = await editarBloque(s.bloques[i]);
            if (nuevo) { s.bloques[i] = nuevo; cambio(); }
        } }),
        el("button", { type: "button", text: "🗑 Borrar", onclick: () => {
            if (confirm("¿Borrar este bloque?")) { s.bloques.splice(i, 1); cambio(); }
        } })
    );
}

function controlesSeccion(s) {
    return el("div", { class: "ctrl-seccion" },
        el("button", { type: "button", text: "+ Agregar bloque", onclick: async () => {
            const b = await editarBloque(null);
            if (b) { s.bloques.push(b); cambio(); }
        } }),
        el("button", { type: "button", text: "Renombrar / privacidad", onclick: async () => {
            const r = await formulario("Sección", [
                { name: "titulo", label: "Nombre de la pestaña" },
                { name: "privada", label: "Solo miembros", tipo: "check" }
            ], s, o => o.titulo ? "" : "Poné un nombre.");
            if (r) { s.titulo = r.titulo; s.privada = r.privada; cambio(); }
        } }),
        el("button", { type: "button", text: "+ Nueva sección", onclick: async () => {
            const r = await formulario("Nueva sección", [
                { name: "titulo", label: "Nombre de la pestaña" },
                { name: "privada", label: "Solo miembros", tipo: "check" }
            ], {}, o => o.titulo ? "" : "Poné un nombre.");
            if (!r) return;
            const nueva = { id: "s" + Date.now().toString(36), titulo: r.titulo, privada: r.privada, bloques: [] };
            estado.cont.secciones.push(nueva);
            estado.seccionId = nueva.id;
            cambio();
        } }),
        el("button", { type: "button", text: "Mover sección ←", onclick: () => moverSeccion(s, -1) }),
        el("button", { type: "button", text: "Mover sección →", onclick: () => moverSeccion(s, 1) }),
        el("button", { type: "button", text: "🗑 Borrar sección", onclick: () => {
            if (estado.cont.secciones.length < 2) return alert("Tiene que quedar al menos una sección.");
            if (!confirm(`¿Borrar la sección "${s.titulo}" y todo su contenido?`)) return;
            estado.cont.secciones = estado.cont.secciones.filter(x => x !== s);
            estado.seccionId = estado.cont.secciones[0].id;
            cambio();
        } })
    );
}

function moverSeccion(s, d) {
    const arr = estado.cont.secciones;
    const i = arr.indexOf(s), j = i + d;
    if (j < 0 || j >= arr.length) return;
    [arr[i], arr[j]] = [arr[j], arr[i]];
    cambio();
}

function dibujar() {
    const s = seccionActual();
    estado.seccionId = s.id;
    dibujarTabs();
    dibujarBarra();

    if (s.privada && !estado.miembro && !estado.dueno) return vistaClaveMiembros(s);

    const nodos = [el("h1", { text: s.titulo })];
    s.bloques.forEach((b, i) => {
        const caja = dibujarBloque(b);
        if (estado.dueno) {
            caja.classList.add("editando");
            caja.prepend(controlesBloque(s, i));
        }
        nodos.push(caja);
    });
    if (!s.bloques.length) nodos.push(el("p", { text: "Esta sección todavía no tiene contenido." }));
    if (estado.dueno) nodos.push(controlesSeccion(s));
    destino.replaceChildren(...nodos);
}

// ---------- modo dueño ----------
async function entrarDueno() {
    if (estado.dueno) return;
    const guardada = leerClaveDueno();
    if (!guardada) {
        const r = await formulario("Crear clave de dueño (primera vez)", [
            { name: "c1", label: "Clave nueva (mínimo 10 caracteres)", tipo: "password" },
            { name: "c2", label: "Repetir clave", tipo: "password" }
        ], {}, o => o.c1.length < 10 ? "Mínimo 10 caracteres." : o.c1 !== o.c2 ? "Las claves no coinciden." : "");
        if (!r) return;
        guardarClaveDueno(await crearClave(r.c1));
    } else {
        // Demora creciente tras cada intento fallido
        if (estado.fallos) await new Promise(res => setTimeout(res, Math.min(estado.fallos * 1500, 15000)));
        const r = await formulario("Modo dueño", [{ name: "c", label: "Clave de dueño", tipo: "password" }]);
        if (!r) return;
        if (!(await verificar(r.c, guardada))) { estado.fallos++; return alert("Clave incorrecta."); }
    }
    estado.fallos = 0;
    estado.dueno = true;
    estado.cont = leerBorrador() || clonar(estado.publicado);
    estado.aviso = "";
    dibujar();
}

function salirDueno() {
    estado.dueno = false;
    estado.miembro = false;
    estado.cont = estado.publicado;
    dibujar();
}

async function cambiarClaveMiembros() {
    const r = await formulario("Clave de miembros", [
        { name: "c1", label: "Clave nueva (mínimo 6 caracteres)", tipo: "password" }
    ], {}, o => o.c1.length < 6 ? "Mínimo 6 caracteres." : "");
    if (!r) return;
    estado.cont.config = estado.cont.config || {};
    estado.cont.config.miembros = await crearClave(r.c1);
    cambio();
}

// Atajos: Ctrl+Alt+A, o 5 clics rápidos sobre el logo (para celular)
document.addEventListener("keydown", (e) => {
    if (e.ctrlKey && e.altKey && e.code === "KeyA") { e.preventDefault(); entrarDueno(); }
});
let clics = 0, temporizador;
document.getElementById("logo").addEventListener("click", () => {
    clearTimeout(temporizador);
    if (++clics >= 5) { clics = 0; entrarDueno(); return; }
    temporizador = setTimeout(() => { clics = 0; }, 1500);
});

// ---------- arranque ----------
(async () => {
    try {
        estado.publicado = await cargarPublicado();
        estado.cont = estado.publicado;
        dibujar();
    } catch (e) {
        destino.replaceChildren(
            el("h1", { text: "No se pudo cargar el contenido" }),
            el("p", { text: "Abrí el sitio desde un servidor (no con doble clic). Ver LEEME.txt." }));
    }
})();
