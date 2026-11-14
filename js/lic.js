/* Farmacia Roma · activación por celular.
   Cada celular tiene su código (ej. 7F3A-91C2-04BD). Rodrigo genera la clave con generar_licencia_apps.py (opción Farmacia Roma)
   y esa clave sirve SÓLO en ese celular, hasta la fecha que diga (normalmente un año).
   Clave: ROM-AAAAMMDD-firma(base32). Firma Ed25519 de "ROM|FARMACIAROMA|AAAAMMDD|CODIGO". */
(function () {
  const PUBLICA = 'sHaxKKJiziuYbZxsQOkFnQA6U75PLAe6uNpgTsOl90E=';
  const PROG = 'ROM', NOMBRE = 'FARMACIAROMA';
  const K_EQ = 'rofac_roma_equipo', K_LIC = 'rofac_roma_lic', K_ULT = 'rofac_roma_lic_ult';
  const get = k => { try { return localStorage.getItem(k); } catch (e) { return null; } };
  const set = (k, v) => { try { localStorage.setItem(k, v); } catch (e) {} };

  // ---------- código del celular (se crea una sola vez)
  function equipo() {
    let c = get(K_EQ);
    if (!/^[0-9A-F]{12}$/.test(c || '')) {
      const b = new Uint8Array(6); crypto.getRandomValues(b);
      c = Array.from(b, x => x.toString(16).padStart(2, '0')).join('').toUpperCase();
      set(K_EQ, c);
    }
    return c;
  }
  const lindo = c => c.match(/.{4}/g).join('-');

  // ---------- fecha de hoy (si atrasan el reloj, se usa la última fecha vista)
  function hoy() {
    const d = new Date(), h = d.getFullYear() + String(d.getMonth() + 1).padStart(2, '0') + String(d.getDate()).padStart(2, '0');
    const u = get(K_ULT) || '';
    if (u > h) return u;
    set(K_ULT, h); return h;
  }

  // ---------- Ed25519 (sólo verificar), igual que el de los programas
  const p = 2n ** 255n - 19n, L = 2n ** 252n + 27742317777372353535851937790883648493n;
  const md = a => { a %= p; return a < 0n ? a + p : a; };
  const pw = (b, e) => { let r = 1n; b = md(b); while (e > 0n) { if (e & 1n) r = r * b % p; b = b * b % p; e >>= 1n; } return r; };
  const d = md(-121665n * pw(121666n, p - 2n)), I2 = pw(2n, (p - 1n) / 4n);
  const leInt = b => { let n = 0n; for (let i = b.length - 1; i >= 0; i--) n = (n << 8n) | BigInt(b[i]); return n; };
  function xrec(y, s) {
    const x2 = md((y * y - 1n) * pw(d * y * y + 1n, p - 2n));
    let x = pw(x2, (p + 3n) / 8n);
    if (md(x * x - x2)) x = x * I2 % p;
    if (md(x * x - x2)) throw new Error('punto');
    if ((x & 1n) !== s) x = p - x;
    return x;
  }
  const By = md(4n * pw(5n, p - 2n)), Bx = xrec(By, 0n), B = [Bx, By, 1n, Bx * By % p];
  function sum(P, Q) {
    const A = md((P[1] - P[0]) * (Q[1] - Q[0])), Bb = md((P[1] + P[0]) * (Q[1] + Q[0]));
    const C = md(2n * P[3] * Q[3] * d), D = md(2n * P[2] * Q[2]);
    const E = Bb - A, F = D - C, G = D + C, H = Bb + A;
    return [md(E * F), md(G * H), md(F * G), md(E * H)];
  }
  function mul(s, P) { let Q = [0n, 1n, 1n, 0n]; while (s > 0n) { if (s & 1n) Q = sum(Q, P); P = sum(P, P); s >>= 1n; } return Q; }
  const igual = (P, Q) => md(P[0] * Q[2] - Q[0] * P[2]) === 0n && md(P[1] * Q[2] - Q[1] * P[2]) === 0n;
  function dec(b) {
    if (b.length !== 32) throw new Error('largo');
    let y = leInt(b); const s = y >> 255n; y &= (1n << 255n) - 1n;
    if (y >= p) throw new Error('punto');
    const x = xrec(y, s); return [x, y, 1n, x * y % p];
  }
  async function verificar(pub, msg, firma) {
    try {
      if (firma.length !== 64) return false;
      const A = dec(pub), R = dec(firma.slice(0, 32)), s = leInt(firma.slice(32));
      if (s >= L) return false;
      const todo = new Uint8Array(64 + msg.length); todo.set(firma.slice(0, 32)); todo.set(pub, 32); todo.set(msg, 64);
      const k = leInt(new Uint8Array(await crypto.subtle.digest('SHA-512', todo))) % L;
      return igual(mul(s, B), sum(R, mul(k, A)));
    } catch (e) { return false; }
  }
  const b64 = t => Uint8Array.from(atob(t), c => c.charCodeAt(0));
  function b32(t) {
    const AB = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567'; let bits = 0, val = 0; const out = [];
    for (const ch of t) { const i = AB.indexOf(ch); if (i < 0) return null; val = (val << 5) | i; bits += 5; if (bits >= 8) { bits -= 8; out.push((val >> bits) & 255); } }
    return new Uint8Array(out);
  }

  // ---------- revisar una clave: devuelve la fecha de vencimiento (AAAAMMDD) o null
  async function revisarClave(clave) {
    const t = String(clave || '').toUpperCase().replace(/[^A-Z0-9-]/g, '');
    const m = t.match(/^ROM-?(\d{8})-?([A-Z2-7]{100,})$/); if (!m) return null;
    const firma = b32(m[2]); if (!firma) return null;
    const msg = new TextEncoder().encode([PROG, NOMBRE, m[1], equipo()].join('|'));
    return (await verificar(b64(PUBLICA), msg, firma)) ? m[1] : null;
  }

  const fechaTxt = v => v === '99991231' ? 'sin vencimiento' : v.slice(6) + '/' + v.slice(4, 6) + '/' + v.slice(0, 4);
  const dias = v => Math.round((new Date(+v.slice(0, 4), +v.slice(4, 6) - 1, +v.slice(6)) - new Date(+hoy().slice(0, 4), +hoy().slice(4, 6) - 1, +hoy().slice(6))) / 864e5);

  let estado = { vence: null };
  async function revisar() {
    const v = await revisarClave(get(K_LIC));
    estado.vence = v;
    return !!v && v >= hoy();
  }
  async function activar(clave) {
    const v = await revisarClave(clave);
    if (!v) return 'Esa clave no es para este celular. Fijate que esté completa, o mandale de nuevo tu código a Rodrigo.';
    if (v < hoy()) return 'Esa clave ya está vencida (' + fechaTxt(v) + '). Pedile una nueva a Rodrigo.';
    set(K_LIC, String(clave).trim().toUpperCase()); estado.vence = v; return '';
  }
  const textoWA = () => 'Hola, este es el código de mi celular para la app de Farmacia Roma: ' + lindo(equipo());

  // ---------- pantalla para activar (cuando no está activada o se venció)
  function pantalla(alListo) {
    const ios = /iphone|ipad|ipod/i.test(navigator.userAgent), suelta = !(navigator.standalone || matchMedia('(display-mode: standalone)').matches);
    const vencida = estado.vence && estado.vence < hoy();
    document.getElementById('tabs').innerHTML = '';
    const main = document.getElementById('main');
    main.innerHTML = `<div class="activar">
      <img class="act-logo" src="img/logo-roma.png" alt="Farmacia Roma" width="150" height="53">
      <h1>${vencida ? 'Se venció la activación' : 'Activar la app'}</h1>
      <p>${vencida ? 'La activación de este celular venció el <b>' + fechaTxt(estado.vence) + '</b>. Tus datos siguen guardados: pedile una clave nueva a Rodrigo.' : 'Esta app es sólo para el equipo de Farmacia Roma. Mandale a Rodrigo el código de tu celular y él te pasa la clave.'}</p>
      ${ios && suelta ? '<div class="aviso">En iPhone: primero <b>agregala a inicio</b> (Compartir → “Agregar a inicio”) y activala <b>desde el ícono</b>. Si la activás acá en Safari, en el ícono te la va a pedir de nuevo.</div>' : ''}
      <div class="card">
        <label class="l">Código de este celular</label>
        <div class="act-cod" id="actCod">${lindo(equipo())}</div>
        <div class="botones"><a class="btn" id="actWA" href="https://wa.me/?text=${encodeURIComponent(textoWA())}" target="_blank" rel="noopener">Mandar por WhatsApp</a><button class="btn sec" id="actCopiar">Copiar</button></div>
        <label class="l" for="actClave">Clave que te pasó Rodrigo</label>
        <textarea class="in" id="actClave" rows="3" placeholder="ROM-2027…" autocomplete="off" autocapitalize="characters" spellcheck="false"></textarea>
        <div class="error" id="actErr"></div>
        <div class="botones"><button class="btn" id="actOk">Activar</button></div>
      </div></div>`;
    document.getElementById('actCopiar').onclick = async () => {
      try { await navigator.clipboard.writeText(lindo(equipo())); document.getElementById('actCopiar').textContent = 'Copiado ✓'; } catch (e) { document.getElementById('actCopiar').textContent = 'Mantené apretado el código para copiarlo'; }
    };
    document.getElementById('actOk').onclick = async () => {
      const b = document.getElementById('actOk'); b.disabled = true; b.textContent = 'Revisando…';
      const err = await activar(document.getElementById('actClave').value);
      b.disabled = false; b.textContent = 'Activar';
      document.getElementById('actErr').textContent = err;
      if (!err) alListo();
    };
  }

  window.RomaLic = { revisar, activar, pantalla, equipo: () => lindo(equipo()), textoWA, vence: () => estado.vence, fechaTxt, dias: () => estado.vence ? dias(estado.vence) : null };
})();
