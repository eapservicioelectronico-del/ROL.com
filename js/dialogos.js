// Formularios en ventana (<dialog>) y edición de bloques.
import { el, imagenValida, urlHttps, analizarVideo } from "./render.js";

const MAX_LADO = 900;   // las fotos se reducen para no llenar el almacenamiento

function reducirImagen(archivo) {
    return new Promise((res, rej) => {
        const img = new Image();
        const url = URL.createObjectURL(archivo);
        img.onload = () => {
            const k = Math.min(1, MAX_LADO / Math.max(img.width, img.height));
            const c = document.createElement("canvas");
            c.width = Math.round(img.width * k);
            c.height = Math.round(img.height * k);
            c.getContext("2d").drawImage(img, 0, 0, c.width, c.height);
            URL.revokeObjectURL(url);
            res(c.toDataURL("image/jpeg", 0.8));
        };
        img.onerror = () => rej(new Error("No se pudo leer la imagen"));
        img.src = url;
    });
}

// campos: {name,label,tipo:'text'|'textarea'|'password'|'select'|'check'|'imagen', opciones}
export function formulario(titulo, campos, valores = {}, validar = null) {
    return new Promise((resolver) => {
        const dlg = el("dialog", { class: "dlg" });
        const error = el("div", { class: "aviso-error", role: "alert" });
        const ctrl = {};

        const form = el("form", { method: "dialog" }, el("h3", { text: titulo }));

        campos.forEach(c => {
            const id = "f-" + c.name;
            let entrada;
            if (c.tipo === "textarea") entrada = el("textarea", { id });
            else if (c.tipo === "select") {
                entrada = el("select", { id }, c.opciones.map(([v, t]) => el("option", { value: v, text: t })));
            } else if (c.tipo === "check") entrada = el("input", { id, type: "checkbox" });
            else if (c.tipo === "imagen") {
                entrada = el("input", { id, type: "file", accept: "image/*" });
                ctrl[c.name + "_url"] = el("input", { id: id + "-url", type: "url", placeholder: "…o pegá un enlace https://" });
            } else entrada = el("input", { id, type: c.tipo || "text", autocomplete: "off" });

            if (c.tipo === "check") entrada.checked = !!valores[c.name];
            else if (c.tipo !== "imagen" && valores[c.name] != null) entrada.value = valores[c.name];
            if (c.tipo === "imagen" && urlHttps(valores[c.name])) ctrl[c.name + "_url"].value = valores[c.name];

            ctrl[c.name] = entrada;
            const grupo = el("div", { class: "form-group" });
            if (c.tipo === "check") {
                grupo.append(el("label", { class: "check", for: id }, entrada, c.label));
            } else {
                grupo.append(el("label", { for: id, text: c.label }), entrada, ctrl[c.name + "_url"]);
            }
            form.append(grupo);
        });

        const cancelar = el("button", { type: "button", text: "Cancelar", onclick: () => dlg.close() });
        const ok = el("button", { type: "submit", class: "ok", text: "Aceptar" });
        form.append(error, el("div", { class: "botones" }, cancelar, ok));

        form.addEventListener("submit", async (e) => {
            e.preventDefault();
            error.textContent = "";
            const salida = {};
            try {
                for (const c of campos) {
                    const nodo = ctrl[c.name];
                    if (c.tipo === "check") salida[c.name] = nodo.checked;
                    else if (c.tipo === "imagen") {
                        const f = nodo.files[0];
                        salida[c.name] = f ? await reducirImagen(f)
                            : (ctrl[c.name + "_url"].value.trim() || valores[c.name] || "");
                    } else salida[c.name] = nodo.value.trim ? nodo.value.trim() : nodo.value;
                }
                const msg = validar ? await validar(salida) : "";
                if (msg) { error.textContent = msg; return; }
            } catch (err) { error.textContent = err.message; return; }
            resolver(salida);
            dlg.close();
        });

        dlg.addEventListener("close", () => { dlg.remove(); resolver(null); });
        dlg.append(form);
        document.body.append(dlg);
        dlg.showModal();
        form.querySelector("input,textarea,select")?.focus();
    });
}

// ---- Alta / edición de un bloque de contenido ----
const TIPOS = [["texto", "Texto"], ["imagen", "Foto / imagen"], ["video", "Video (YouTube o .mp4)"], ["enlace", "Enlace"]];

export async function editarBloque(actual) {
    let tipo = actual?.tipo;
    if (!tipo) {
        const r = await formulario("Nuevo bloque", [{ name: "tipo", label: "¿Qué querés agregar?", tipo: "select", opciones: TIPOS }]);
        if (!r) return null;
        tipo = r.tipo;
    }
    const v = actual || {};
    let r;
    if (tipo === "texto") {
        r = await formulario("Texto", [
            { name: "titulo", label: "Título (opcional)" },
            { name: "texto", label: "Texto", tipo: "textarea" }
        ], v, o => o.texto ? "" : "Escribí un texto.");
    } else if (tipo === "imagen") {
        r = await formulario("Foto / imagen", [
            { name: "src", label: "Archivo", tipo: "imagen" },
            { name: "pie", label: "Descripción (opcional)" }
        ], v, o => imagenValida(o.src) ? "" : "Elegí un archivo o pegá un enlace https.");
    } else if (tipo === "video") {
        r = await formulario("Video", [
            { name: "url", label: "Enlace de YouTube o archivo .mp4 (https)" },
            { name: "pie", label: "Descripción (opcional)" }
        ], v, o => analizarVideo(o.url) ? "" : "Usá un enlace https de YouTube o un .mp4/.webm.");
    } else {
        r = await formulario("Enlace", [
            { name: "texto", label: "Texto visible" },
            { name: "url", label: "Dirección (https://…)" }
        ], v, o => urlHttps(o.url) && o.texto ? "" : "Completá el texto y una dirección https válida.");
    }
    return r ? { tipo, ...r } : null;
}
