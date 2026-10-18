// Hash de claves con PBKDF2 (WebCrypto). Nunca se guarda la clave en texto plano.
const enc = new TextEncoder();
const aHex = (buf) => [...new Uint8Array(buf)].map(x => x.toString(16).padStart(2, "0")).join("");
const deHex = (h) => new Uint8Array(h.match(/../g).map(x => parseInt(x, 16)));

async function derivar(clave, salHex) {
    const base = await crypto.subtle.importKey("raw", enc.encode(clave), "PBKDF2", false, ["deriveBits"]);
    const bits = await crypto.subtle.deriveBits(
        { name: "PBKDF2", salt: deHex(salHex), iterations: 100000, hash: "SHA-256" }, base, 256);
    return aHex(bits);
}

export async function crearClave(clave) {
    const sal = aHex(crypto.getRandomValues(new Uint8Array(16)));
    return { sal, hash: await derivar(clave, sal) };
}

export async function verificar(clave, guardada) {
    if (!guardada?.sal || !guardada?.hash) return false;
    return (await derivar(clave, guardada.sal)) === guardada.hash;
}
