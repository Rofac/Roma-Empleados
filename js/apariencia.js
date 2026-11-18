/* Apariencia: color, tipo de letra y tamaño de letra (como en la Agenda Docente). Queda guardada en este celular. */
window.Apariencia = (() => {
  const K = 'rofac_roma_apariencia';
  const COLORES = [['roma', 'Roma', '#1f9d48', '#1557d8'], ['verde', 'Verde agua', '#2fa58a', '#0a5c4c'], ['lila', 'Lila', '#9b6fd0', '#4a2d6b'],
    ['azul', 'Azul', '#3a83cf', '#173e6b'], ['rosa', 'Rosa', '#e06a9c', '#7a2a52'], ['coral', 'Coral', '#ec8a5e', '#7a3320'], ['grafito', 'Grafito', '#5b6675', '#262c33']];
  const LETRAS = [['clasica', 'Clásica', "-apple-system, system-ui, 'Segoe UI', Roboto, sans-serif"], ['redondeada', 'Redondeada', "'Poppins', sans-serif"], ['elegante', 'Elegante', "'Lora', Georgia, serif"]];
  const TAMS = [['normal', 'Normal', 15], ['grande', 'Grande', 17], ['muy', 'Muy grande', 19]];
  const BASE = { pal: 'roma', letra: 'redondeada', tam: 'normal' };
  const leer = () => { try { return Object.assign({}, BASE, JSON.parse(localStorage.getItem(K) || '{}')); } catch (e) { return Object.assign({}, BASE); } };
  function aplicar(a = leer()) {
    const h = document.documentElement;
    if (a.pal === 'roma') delete h.dataset.pal; else h.dataset.pal = a.pal;
    if (a.letra === 'redondeada') delete h.dataset.letra; else h.dataset.letra = a.letra;
    if (a.tam === 'normal') delete h.dataset.tam; else h.dataset.tam = a.tam;
  }
  function guardar(k, v) { const a = leer(); a[k] = v; try { localStorage.setItem(K, JSON.stringify(a)); } catch (e) { /* sin lugar: igual se ve */ } aplicar(a); }
  function volver() { try { localStorage.removeItem(K); } catch (e) { /* */ } aplicar(); }
  const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  function html() {
    const a = leer();
    return `<div class="ayuda" style="margin-top:0">Elegí cómo querés ver la app. Se cambia al instante y queda guardado en este celular.
        En los turnos, Roma sigue en <b class="col-roma">verde</b> y Roma II en <b class="col-roma2">azul</b>.</div>
      <div class="ap-t">Color</div><div class="ap-fila">${COLORES.map(([k, n, c1, c2]) => `<button type="button" class="ap-color ${a.pal === k ? 'act' : ''}" data-acc="ap" data-k="pal" data-v="${k}">
        <i style="background:linear-gradient(135deg, ${c1}, ${c2})"></i>${esc(n)}</button>`).join('')}</div>
      <div class="ap-t">Tipo de letra</div><div class="ap-fila tres">${LETRAS.map(([k, n, f]) => `<button type="button" class="ap-op ${a.letra === k ? 'act' : ''}" data-acc="ap" data-k="letra" data-v="${k}">
        <b style="font-family:${esc(f)}">${n}</b><small style="font-family:${esc(f)}">Guardia 8:00</small></button>`).join('')}</div>
      <div class="ap-t">Tamaño de letra</div><div class="ap-fila tres">${TAMS.map(([k, n, px]) => `<button type="button" class="ap-op ${a.tam === k ? 'act' : ''}" data-acc="ap" data-k="tam" data-v="${k}">
        <b style="font-size:${px}px">Aa</b><small>${n}</small></button>`).join('')}</div>
      <div class="botones"><button type="button" class="btn sec chico" data-acc="apVolver">Volver a como venía</button></div>`;
  }
  aplicar();
  return { aplicar, guardar, volver, leer, html, COLORES, LETRAS, TAMS };
})();
