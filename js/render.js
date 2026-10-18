// Dibujo de bloques. Todo se inserta con textContent / atributos validados (sin innerHTML).
export function el(tag, props = {}, ...hijos) {
    const nodo = document.createElement(tag);
    for (const [k, v] of Object.entries(props)) {
        if (k === "class") nodo.className = v;
        else if (k === "text") nodo.textContent = v;
        else if (k.startsWith("on")) nodo.addEventListener(k.slice(2), v);
        else nodo.setAttribute(k, v);
    }
    hijos.flat().forEach(h => h && nodo.append(h));
    return nodo;
}

export function urlHttps(u) {
    try { return new URL(u).protocol === "https:"; } catch { return false; }
}

export function imagenValida(src) {
    return urlHttps(src) || /^data:image\/(jpeg|png|webp|gif);base64,/.test(src || "");
}

// Devuelve {tipo:'yt'|'file', src} o null
export function analizarVideo(url) {
    try {
        const u = new URL(url);
        if (u.protocol !== "https:") return null;
        let id = null;
        if (u.hostname === "youtu.be") id = u.pathname.slice(1);
        else if (/(^|\.)youtube\.com$/.test(u.hostname)) {
            id = u.searchParams.get("v") ||
                (/^\/(embed|shorts)\//.test(u.pathname) ? u.pathname.split("/")[2] : null);
        }
        if (id && /^[\w-]{11}$/.test(id)) {
            return { tipo: "yt", src: `https://www.youtube-nocookie.com/embed/${id}` };
        }
        if (/\.(mp4|webm)$/i.test(u.pathname)) return { tipo: "file", src: url };
    } catch {}
    return null;
}

export function dibujarBloque(b) {
    const caja = el("div", { class: "bloque" });
    const pie = (t) => t ? el("div", { class: "pie", text: t }) : null;

    if (b.tipo === "texto") {
        if (b.titulo) caja.append(el("h2", { text: b.titulo }));
        caja.append(el("div", { class: "bloque-texto", text: b.texto || "" }));
    } else if (b.tipo === "imagen" && imagenValida(b.src)) {
        caja.append(el("img", { src: b.src, alt: b.pie || "Imagen", loading: "lazy" }), pie(b.pie));
    } else if (b.tipo === "video") {
        const v = analizarVideo(b.url);
        if (v?.tipo === "yt") {
            caja.append(el("iframe", {
                src: v.src, title: b.pie || "Video", allowfullscreen: "",
                referrerpolicy: "strict-origin-when-cross-origin"
            }), pie(b.pie));
        } else if (v?.tipo === "file") {
            caja.append(el("video", { src: v.src, controls: "" }), pie(b.pie));
        }
    } else if (b.tipo === "enlace" && urlHttps(b.url)) {
        caja.append(el("div", { class: "doc-item" },
            el("a", { href: b.url, target: "_blank", rel: "noopener noreferrer", text: b.texto || b.url })));
    }
    return caja;
}
