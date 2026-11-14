/* Farmacia Roma · app para los empleados — datos y cuentas (sin pantalla).
   Basada en "Mi Agenda" (turnos de farmacia) + gastos personales + mis vacaciones.
   Todo queda guardado en el celular de cada empleado (localStorage 'rofac_roma_emp'): no se sube a ningún lado. */
(function (raiz) {
  const CLAVE = 'rofac_roma_emp';
  const MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
  const DIAS = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];

  // ---------- fechas 'AAAA-MM-DD' (se cuentan en UTC para que no haya corrimientos de horario)
  const aD = f => { const [a, m, d] = f.split('-').map(Number); return new Date(Date.UTC(a, m - 1, d)); };
  const aF = d => d.toISOString().slice(0, 10);
  const sumar = (f, n) => { const d = aD(f); d.setUTCDate(d.getUTCDate() + n); return aF(d); };
  const entre = (a, b) => Math.round((aD(b) - aD(a)) / 864e5);
  const diaSemana = f => aD(f).getUTCDay();                       // 0 = domingo
  const lunesDe = f => sumar(f, -((diaSemana(f) + 6) % 7));
  const hoyLocal = () => { const d = new Date(); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); };
  const finDeMes = (a, m) => new Date(Date.UTC(a, m, 0)).getUTCDate();   // m 1..12
  const fechaLarga = f => { const d = aD(f); return DIAS[d.getUTCDay()] + ' ' + d.getUTCDate() + ' de ' + MESES[d.getUTCMonth()]; };
  const fechaCorta = f => { const d = aD(f); return d.getUTCDate() + '/' + (d.getUTCMonth() + 1); };
  const valida = f => typeof f === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(f) && aF(aD(f)) === f;

  // ---------- importes: acepta "1500", "1.500", "1.500,50", "1500,5", "$ 2.000"
  function numero(v) {
    if (typeof v === 'number') return isFinite(v) ? v : NaN;
    let s = String(v == null ? '' : v).replace(/[$\s]/g, '');
    if (!s) return NaN;
    if (s.includes(',')) s = s.replace(/\./g, '').replace(',', '.');
    else if (/^\d{1,3}(\.\d{3})+$/.test(s)) s = s.replace(/\./g, '');
    return /^-?\d+(\.\d+)?$/.test(s) ? parseFloat(s) : NaN;
  }
  const r2 = x => Math.round(x * 100) / 100;

  const CATS = [
    { id: 'comida', nombre: 'Comida', emoji: '🍔' }, { id: 'super', nombre: 'Súper', emoji: '🛒' }, { id: 'transporte', nombre: 'Transporte', emoji: '🚌' },
    { id: 'servicios', nombre: 'Servicios', emoji: '💡' }, { id: 'salud', nombre: 'Salud', emoji: '💊' }, { id: 'ropa', nombre: 'Ropa', emoji: '👕' },
    { id: 'salidas', nombre: 'Salidas', emoji: '🎉' }, { id: 'casa', nombre: 'Casa', emoji: '🏠' }, { id: 'otros', nombre: 'Otros', emoji: '📦' },
  ];
  const TIPOS = [
    { id: 'medico', nombre: 'Turno médico', emoji: '🩺' }, { id: 'tramite', nombre: 'Trámite', emoji: '📄' }, { id: 'cumple', nombre: 'Cumpleaños', emoji: '🎂' },
    { id: 'salida', nombre: 'Salida / evento', emoji: '🎉' }, { id: 'recordar', nombre: 'Recordatorio', emoji: '🔔' }, { id: 'otro', nombre: 'Otro', emoji: '📌' },
  ];
  const MEDIOS = ['Efectivo', 'Débito', 'Crédito', 'Transferencia', 'Mercado Pago'];

  // ---------- estado inicial: el listado de turnos (rotación de 8, empieza el 1/11/2026 con Cristal), igual que en las otras apps
  function inicial() {
    return {
      v: 1,
      farmacias: [
        { id: 'cristal', nombre: 'Cristal', corto: 'Cristal' },
        { id: 'sanjose', nombre: 'San José', corto: 'S. José' },
        { id: 'villaberthet', nombre: 'Villa Berthet', corto: 'V. Berthet' },
        { id: 'roma2', nombre: 'Roma II', corto: 'Roma II', nuestra: true },
        { id: 'sanmartin', nombre: 'San Martín', corto: 'S. Martín' },
        { id: 'roma', nombre: 'Roma', corto: 'Roma', nuestra: true },
        { id: 'delcarmen', nombre: 'Del Carmen', corto: 'D. Carmen' },
        { id: 'charytonow', nombre: 'Charytonow', corto: 'Charyt.' },
      ],
      rotaciones: [{ desde: '2026-11-01', orden: ['cristal', 'sanjose', 'villaberthet', 'roma2', 'sanmartin', 'roma', 'delcarmen', 'charytonow'] }],
      confirmadoHasta: '2027-12-31', mig2027: 1,
      cambios: {},          // fecha → { f: farmacia que hace la guardia, nota, par: fecha del intercambio }
      gastos: [],           // { id, fecha, monto, cat, desc, medio }
      anot: [],             // mis anotaciones: { id, fecha, hora, tipo, titulo, nota, anual } (turno médico, trámite, cumpleaños…)
      vac: { porAnio: 14, anios: {}, lista: [] },   // anios: { '2026': 21 } si un año le corresponden otros días; lista: { id, desde, hasta, anio, nota }
      cfg: { verTodas: true, nombre: '', mia: 'ambas' },
    };
  }

  function crear(guardado) {
    let E = guardado && typeof guardado === 'object' && Array.isArray(guardado.farmacias) ? guardado : inicial();
    E.cambios = E.cambios || {}; E.gastos = E.gastos || []; E.anot = E.anot || [];
    E.tareas = E.tareas || []; E.notas = E.notas || []; E.habitos = E.habitos || []; E.habHechos = E.habHechos || {}; E.dias = E.dias || {};
    E.cfg = E.cfg || {};
    E.vac = E.vac || {}; E.vac.lista = E.vac.lista || []; E.vac.anios = E.vac.anios || {}; if (!(E.vac.porAnio >= 0)) E.vac.porAnio = 14;
    if (!E.cfg.mia) E.cfg.mia = 'ambas';
    const atras = [];                                    // para "Deshacer"

    // listado 2027 confirmado (13/11/2026): si seguía con la fecha original, pasa al 31/12/2027 (una sola vez)
    let migro = false;
    if (!E.mig2027) { if (E.confirmadoHasta === '2026-12-31') E.confirmadoHasta = '2027-12-31'; E.mig2027 = 1; migro = !!guardado; }

    const farmacia = id => E.farmacias.find(x => x.id === id) || { id, nombre: id || '—', corto: id || '—' };
    const esNuestra = id => !!farmacia(id).nuestra;
    const nuestras = () => E.farmacias.filter(x => x.nuestra);

    function rotacionDe(f) {
      const rs = E.rotaciones.slice().sort((a, b) => a.desde < b.desde ? -1 : 1);
      let r = rs[0];
      for (const x of rs) if (x.desde <= f) r = x;
      return r;
    }
    function oficial(f) {
      const r = rotacionDe(f); if (!r || !r.orden.length) return null;
      const n = r.orden.length, i = ((entre(r.desde, f) % n) + n) % n;
      return r.orden[i];
    }
    function info(f) {
      const of = oficial(f), c = E.cambios[f], t = c ? c.f : of;
      const ofN = esNuestra(of), tN = esNuestra(t);
      return {
        fecha: f, oficial: of, turno: t, nuestra: tN, cambio: c || null,
        cedida: !!c && ofN && !tN,                 // era nuestra y la hace otra
        tomada: !!c && !ofN && tN,                 // era de otra y la hacemos nosotros
        estimado: f > E.confirmadoHasta,
      };
    }
    function guardiasNuestras(desde, hasta) {
      const out = []; for (let f = desde; f <= hasta; f = sumar(f, 1)) { const i = info(f); if (i.nuestra) out.push(i); }
      return out;
    }
    function proximasNuestras(desde, cuantas, soloId) {
      const out = []; let f = desde;
      for (let k = 0; k < 400 && out.length < cuantas; k++, f = sumar(f, 1)) { const i = info(f); if (i.nuestra && (!soloId || i.turno === soloId)) out.push(i); }
      return out;
    }
    function resumenMes(a, m) {
      const d = `${a}-${String(m).padStart(2, '0')}-01`, h = `${a}-${String(m).padStart(2, '0')}-${finDeMes(a, m)}`;
      const r = { total: 0, porFarmacia: {}, cedidas: 0, tomadas: 0 };
      for (let f = d; f <= h; f = sumar(f, 1)) {
        const i = info(f);
        if (i.cedida) r.cedidas++;
        if (i.nuestra) { r.total++; r.porFarmacia[i.turno] = (r.porFarmacia[i.turno] || 0) + 1; if (i.tomada) r.tomadas++; }
      }
      return r;
    }

    // ---------- guardar / deshacer
    let alGuardar = null;
    function guardar() { try { raiz.localStorage && raiz.localStorage.setItem(CLAVE, JSON.stringify(E)); } catch (e) {} alGuardar && alGuardar(); }
    function antes(que) { atras.push({ que, foto: JSON.stringify(E) }); if (atras.length > 30) atras.shift(); }
    function deshacer() {
      const u = atras.pop(); if (!u) return null;
      const nuevo = JSON.parse(u.foto); Object.keys(E).forEach(k => delete E[k]); Object.assign(E, nuevo); guardar(); return u.que;
    }
    const nuevoId = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
    const txt = (v, max) => String(v == null ? '' : v).trim().slice(0, max || 500);

    // ---------- cambios de guardia (igual que en Mi Agenda)
    function cambiar(f, quien, nota, par) {
      if (!valida(f)) throw new Error('Fecha inválida');
      if (!E.farmacias.some(x => x.id === quien)) throw new Error('Elegí la farmacia');
      if (par && !valida(par)) throw new Error('Fecha del intercambio inválida');
      if (par === f) throw new Error('El intercambio tiene que ser otro día');
      const of = oficial(f);
      if (par) {
        if (!esNuestra(of) || quien === of || esNuestra(quien)) throw new Error('El intercambio es para cuando le cedés una guardia nuestra a otra farmacia');
        const ofPar = oficial(par);
        if (ofPar !== quien) throw new Error('El ' + fechaCorta(par) + ' no está de turno ' + farmacia(quien).nombre + ' (está ' + farmacia(ofPar).nombre + ')');
      }
      antes('el cambio de guardia');
      quitarSinGuardar(f);
      const n = (nota || '').trim();
      if (quien !== of) E.cambios[f] = { f: quien, nota: n };
      else if (n) E.cambios[f] = { f: of, nota: n };
      if (par) {
        quitarSinGuardar(par);
        E.cambios[par] = { f: of, nota: n, par: f };
        E.cambios[f].par = par;
      }
      guardar();
    }
    function quitarSinGuardar(f) {
      const c = E.cambios[f]; if (!c) return;
      delete E.cambios[f];
      if (c.par && E.cambios[c.par] && E.cambios[c.par].par === f) delete E.cambios[c.par];
    }
    function volverOriginal(f) { if (!E.cambios[f]) return; antes('volver a la guardia original'); quitarSinGuardar(f); guardar(); }

    // ---------- gastos personales
    const cat = id => CATS.find(c => c.id === id) || CATS[CATS.length - 1];
    function guardarGasto(g) {
      const monto = numero(g.monto);
      if (!(monto > 0)) throw new Error('Escribí cuánto gastaste');
      if (monto > 100000000) throw new Error('El importe es demasiado grande');
      if (!valida(g.fecha)) throw new Error('Elegí la fecha');
      if (g.fecha > sumar(hoyLocal(), 1)) throw new Error('La fecha no puede ser más adelante que hoy');
      const x = { id: g.id || nuevoId(), fecha: g.fecha, monto: r2(monto), cat: cat(g.cat).id, desc: txt(g.desc, 120), medio: MEDIOS.includes(g.medio) ? g.medio : 'Efectivo' };
      antes(g.id ? 'el cambio del gasto' : 'el gasto nuevo');
      const i = E.gastos.findIndex(y => y.id === x.id);
      if (i >= 0) E.gastos[i] = x; else E.gastos.push(x);
      guardar(); return x;
    }
    function borrarGasto(id) { const i = E.gastos.findIndex(y => y.id === id); if (i < 0) return; antes('el gasto borrado'); E.gastos.splice(i, 1); guardar(); }
    function gastosMes(ym) {
      const l = E.gastos.filter(g => g.fecha.slice(0, 7) === ym).sort((a, b) => a.fecha < b.fecha ? 1 : a.fecha > b.fecha ? -1 : (a.id < b.id ? 1 : -1));
      const total = r2(l.reduce((s, g) => s + g.monto, 0));
      const porCat = {}; l.forEach(g => { porCat[g.cat] = r2((porCat[g.cat] || 0) + g.monto); });
      const porMedio = {}; l.forEach(g => { porMedio[g.medio] = r2((porMedio[g.medio] || 0) + g.monto); });
      return { lista: l, total, porCat, porMedio };
    }

    // ---------- mis vacaciones (días corridos)
    const diasVac = v => entre(v.desde, v.hasta) + 1;
    const corresponden = anio => { const x = E.vac.anios[String(anio)]; return x >= 0 ? x : E.vac.porAnio; };
    const tomados = (anio, sinId) => E.vac.lista.filter(v => v.anio === +anio && v.id !== sinId).reduce((s, v) => s + diasVac(v), 0);
    function resumenVac(anio) {
      const c = corresponden(anio), t = tomados(anio);
      return { anio: +anio, corresponden: c, tomados: t, quedan: Math.max(0, c - t), pasado: Math.max(0, t - c) };
    }
    // a cuenta de qué año se propone: enero a abril, si del año anterior le quedan días, a cuenta del anterior
    function anioSugerido(desde, sinId) {
      const a = +desde.slice(0, 4), m = +desde.slice(5, 7);
      if (m <= 4 && E.vac.lista.some(v => v.anio === a - 1 || v.desde.slice(0, 4) === String(a - 1)) && corresponden(a - 1) - tomados(a - 1, sinId) > 0) return a - 1;
      return a;
    }
    function revisarVac(v) {     // { desde, hasta, anio, id } → { dias, avisos[] } o error
      if (!valida(v.desde)) throw new Error('Elegí desde qué día');
      if (!valida(v.hasta)) throw new Error('Elegí hasta qué día (el último día de vacaciones)');
      if (v.hasta < v.desde) throw new Error('El último día no puede ser antes del primero');
      const dias = entre(v.desde, v.hasta) + 1;
      if (dias > 120) throw new Error('Son demasiados días (' + dias + '): revisá las fechas');
      const anio = +v.anio || +v.desde.slice(0, 4);
      const choca = E.vac.lista.find(x => x.id !== v.id && x.desde <= v.hasta && x.hasta >= v.desde);
      if (choca) throw new Error(`Ya tenés vacaciones del ${fechaCorta(choca.desde)} al ${fechaCorta(choca.hasta)} que se superponen`);
      const avisos = [], queda = corresponden(anio) - tomados(anio, v.id);
      if (dias > queda) avisos.push(queda > 0 ? `Del ${anio} te quedan ${queda} días y son ${dias}: te pasás ${dias - queda}.` : `Del ${anio} ya no te quedan días: son ${dias} de más.`);
      return { dias, anio, avisos };
    }
    function guardarVac(v) {
      const r = revisarVac(v);
      const x = { id: v.id || nuevoId(), desde: v.desde, hasta: v.hasta, anio: r.anio, nota: txt(v.nota, 160) };
      antes(v.id ? 'el cambio de las vacaciones' : 'las vacaciones');
      const i = E.vac.lista.findIndex(y => y.id === x.id);
      if (i >= 0) E.vac.lista[i] = x; else E.vac.lista.push(x);
      E.vac.lista.sort((a, b) => a.desde < b.desde ? -1 : 1);
      guardar(); return x;
    }
    function borrarVac(id) { const i = E.vac.lista.findIndex(y => y.id === id); if (i < 0) return; antes('las vacaciones borradas'); E.vac.lista.splice(i, 1); guardar(); }
    function setCorresponden(anio, n, paraSiempre) {
      const d = Math.trunc(numero(n)); if (!(d >= 0 && d <= 60)) throw new Error('Los días por año van de 0 a 60');
      antes('los días de vacaciones');
      if (paraSiempre) {
        // los años anteriores quedan como estaban
        const viejo = E.vac.porAnio, anios = new Set(E.vac.lista.map(v => v.anio).concat([+hoyLocal().slice(0, 4) - 1, +hoyLocal().slice(0, 4)]));
        anios.forEach(y => { if (y < +anio && !(E.vac.anios[String(y)] >= 0)) E.vac.anios[String(y)] = viejo; });
        E.vac.porAnio = d; Object.keys(E.vac.anios).forEach(k => { if (+k >= +anio) delete E.vac.anios[k]; });
      }
      else E.vac.anios[String(anio)] = d;
      guardar();
    }
    const vacDe = f => E.vac.lista.find(v => v.desde <= f && v.hasta >= f) || null;
    const proximasVac = f => E.vac.lista.filter(v => v.desde > f).sort((a, b) => a.desde < b.desde ? -1 : 1)[0] || null;

    // ---------- farmacias y listado (igual que en Mi Agenda)
    function guardarFarmacias(lista) {
      const ids = new Set(), nombres = new Set();
      for (const x of lista) {
        x.nombre = (x.nombre || '').trim(); x.corto = (x.corto || '').trim() || x.nombre;
        if (!x.nombre) throw new Error('Hay una farmacia sin nombre');
        const k = x.nombre.toLowerCase(); if (nombres.has(k)) throw new Error('Hay dos farmacias "' + x.nombre + '"'); nombres.add(k);
        if (!x.id) { let b = k.normalize('NFD').replace(/[^a-z0-9]/g, '') || 'f', id = b, n = 2; while (ids.has(id) || E.farmacias.some(y => y.id === id && !lista.includes(y))) id = b + n++; x.id = id; }
        ids.add(x.id);
      }
      if (!lista.length) throw new Error('Tiene que haber al menos una farmacia');
      const usadas = new Set(E.rotaciones.flatMap(r => r.orden).concat(Object.values(E.cambios).map(c => c.f)));
      for (const u of usadas) if (!ids.has(u)) throw new Error('No se puede sacar "' + farmacia(u).nombre + '": está en el listado de turnos o en un cambio');
      antes('el cambio de farmacias'); E.farmacias = lista.map(x => ({ id: x.id, nombre: x.nombre, corto: x.corto, nuestra: !!x.nuestra })); guardar();
    }
    function nuevoListado(desde, orden, confirmadoHasta) {
      if (!valida(desde)) throw new Error('Elegí desde qué día');
      if (!orden.length) throw new Error('El listado está vacío');
      if (new Set(orden).size !== orden.length) throw new Error('Hay una farmacia repetida en el listado');
      for (const id of orden) if (!E.farmacias.some(x => x.id === id)) throw new Error('Farmacia desconocida');
      if (confirmadoHasta && !valida(confirmadoHasta)) throw new Error('Fecha "confirmado hasta" inválida');
      antes('el listado de turnos');
      E.rotaciones = E.rotaciones.filter(r => r.desde !== desde); E.rotaciones.push({ desde, orden: orden.slice() });
      E.rotaciones.sort((a, b) => a.desde < b.desde ? -1 : 1);
      if (confirmadoHasta) E.confirmadoHasta = confirmadoHasta;
      guardar();
    }
    function borrarListado(desde) {
      if (E.rotaciones.length < 2) throw new Error('Tiene que quedar al menos un listado');
      antes('el listado borrado'); E.rotaciones = E.rotaciones.filter(r => r.desde !== desde); guardar();
    }
    function setConfirmado(f) { if (!valida(f)) throw new Error('Fecha inválida'); antes('la fecha confirmada'); E.confirmadoHasta = f; guardar(); }
    function setCfg(k, v) { E.cfg[k] = v; guardar(); }

    // ---------- mis anotaciones (turno médico, trámite, cumpleaños, lo que quieran)
    const tipo = id => TIPOS.find(t => t.id === id) || TIPOS[TIPOS.length - 1];
    function guardarAnot(a) {
      const titulo = txt(a.titulo, 80); if (!titulo) throw new Error('Escribí qué es (ej. Dentista, Cumple de mamá)');
      if (!valida(a.fecha)) throw new Error('Elegí la fecha');
      if (a.hora && !/^([01]\d|2[0-3]):[0-5]\d$/.test(a.hora)) throw new Error('Hora inválida');
      const x = { id: a.id || nuevoId(), fecha: a.fecha, hora: a.hora || '', tipo: tipo(a.tipo).id, titulo, nota: txt(a.nota, 400), anual: !!a.anual };
      antes(a.id ? 'el cambio de la anotación' : 'la anotación nueva');
      const i = E.anot.findIndex(y => y.id === x.id);
      if (i >= 0) E.anot[i] = x; else E.anot.push(x);
      guardar(); return x;
    }
    function borrarAnot(id) { const i = E.anot.findIndex(y => y.id === id); if (i < 0) return; antes('la anotación borrada'); E.anot.splice(i, 1); guardar(); }
    const ordAnot = (a, b) => (a.hora || '99') < (b.hora || '99') ? -1 : (a.hora || '99') > (b.hora || '99') ? 1 : (a.titulo < b.titulo ? -1 : 1);
    // las anuales (cumpleaños) se repiten todos los años desde la fecha cargada; el 29/2 cae el 28/2 los años que no es bisiesto
    function caeEl(a, f) {
      if (a.fecha === f) return true;
      if (!a.anual || f < a.fecha) return false;
      const md = a.fecha.slice(5), anio = +f.slice(0, 4);
      const mdAnio = md === '02-29' && !(anio % 4 === 0 && (anio % 100 !== 0 || anio % 400 === 0)) ? '02-28' : md;
      return f.slice(5) === mdAnio;
    }
    const anotDe = f => E.anot.filter(a => caeEl(a, f)).sort(ordAnot);
    function proximasAnot(desde, dias, cuantas) {
      const out = []; let f = desde;
      for (let k = 0; k <= dias && out.length < cuantas; k++, f = sumar(f, 1)) anotDe(f).forEach(a => out.length < cuantas && out.push({ ...a, cuando: f }));
      return out;
    }
    function icsAnot(a) {
      let fecha = a.fecha;   // las anuales arrancan en la próxima vez que caen (así el celular no arranca en 1990)
      if (a.anual) { let f = hoyLocal(); for (let k = 0; k < 400; k++, f = sumar(f, 1)) if (caeEl(a, f)) { fecha = f; break; } }
      return ics([{ uid: 'anot-' + a.id, titulo: tipo(a.tipo).emoji + ' ' + a.titulo, fecha, hora: a.hora, nota: a.nota, anual: a.anual, aviso: a.hora ? '-PT2H' : '-PT15H' }]);
    }

    // ---------- tareas, notas, hábitos y mi día (como en "Mi Agenda")
    function upsert(lista, x, que) {
      antes(que); x.id = x.id || nuevoId(); const L = E[lista], i = L.findIndex(y => y.id === x.id);
      if (i >= 0) L[i] = { ...L[i], ...x }; else L.push(x); guardar(); return L.find(y => y.id === x.id);
    }
    function borrarDe(lista, id, que) { const L = E[lista], i = L.findIndex(y => y.id === id); if (i < 0) return; antes(que); L.splice(i, 1); guardar(); }
    function guardarTarea(t) {
      const tx = txt(t.t, 160); if (!tx) throw new Error('Escribí la tarea');
      if (t.fecha && !valida(t.fecha)) throw new Error('Fecha inválida');
      const viejo = t.id ? E.tareas.find(y => y.id === t.id) : null;
      return upsert('tareas', { id: t.id || null, t: tx, fecha: t.fecha || '', nota: txt(t.nota, 400), ok: viejo ? viejo.ok : false, hecha: viejo ? viejo.hecha : '', creada: viejo ? viejo.creada : hoyLocal() }, t.id ? 'el cambio de la tarea' : 'la tarea nueva');
    }
    function tareaOk(id, si) { const x = E.tareas.find(y => y.id === id); if (!x) return; antes(si ? 'tarea hecha' : 'desmarcar'); x.ok = !!si; x.hecha = si ? hoyLocal() : ''; guardar(); }
    function tareasPendientes() {
      return E.tareas.filter(x => !x.ok).sort((a, b) => (a.fecha || '9999') < (b.fecha || '9999') ? -1 : (a.fecha || '9999') > (b.fecha || '9999') ? 1 : (a.creada < b.creada ? -1 : 1));
    }
    function borrarHechas() { if (!E.tareas.some(x => x.ok)) return; antes('las tareas hechas'); E.tareas = E.tareas.filter(x => !x.ok); guardar(); }
    function guardarNota(n) {
      const titulo = txt(n.titulo, 80), texto = txt(n.texto, 5000); if (!titulo && !texto) throw new Error('La nota está vacía');
      const viejo = n.id ? E.notas.find(y => y.id === n.id) : null;
      return upsert('notas', { id: n.id || null, titulo, texto, fijada: viejo ? !!viejo.fijada : false, color: viejo ? viejo.color : E.notas.length % 4, mod: new Date().toISOString() }, n.id ? 'el cambio de la nota' : 'la nota nueva');
    }
    function fijarNota(id) { const x = E.notas.find(y => y.id === id); if (!x) return; antes('fijar'); x.fijada = !x.fijada; guardar(); }
    const notasOrdenadas = () => E.notas.slice().sort((a, b) => (b.fijada ? 1 : 0) - (a.fijada ? 1 : 0) || (a.mod < b.mod ? 1 : -1));
    function guardarHabito(h) {
      const nombre = txt(h.nombre, 40); if (!nombre) throw new Error('Escribí el hábito');
      if (E.habitos.some(y => y.id !== h.id && y.nombre.toLowerCase() === nombre.toLowerCase())) throw new Error('Ya tenés ese hábito');
      return upsert('habitos', { id: h.id || null, nombre, emoji: txt(h.emoji, 8) || '🌱' }, h.id ? 'el cambio del hábito' : 'el hábito nuevo');
    }
    function borrarHabito(id) {
      const i = E.habitos.findIndex(y => y.id === id); if (i < 0) return; antes('el hábito borrado'); E.habitos.splice(i, 1);
      for (const f of Object.keys(E.habHechos)) { E.habHechos[f] = E.habHechos[f].filter(x => x !== id); if (!E.habHechos[f].length) delete E.habHechos[f]; }
      guardar();
    }
    const habitoHecho = (id, f) => (E.habHechos[f] || []).includes(id);
    function tildarHabito(id, f, si) {
      if (!valida(f)) throw new Error('Fecha inválida'); antes(si ? 'el hábito' : 'desmarcar');
      const l = (E.habHechos[f] || []).filter(x => x !== id); if (si) l.push(id);
      if (l.length) E.habHechos[f] = l; else delete E.habHechos[f]; guardar();
    }
    function racha(id, hasta) { let f = hasta, n = 0; if (!habitoHecho(id, f)) f = sumar(f, -1); while (habitoHecho(id, f) && n < 3660) { n++; f = sumar(f, -1); } return n; }
    function dia(f) { return E.dias[f] || { foco: '', pendientes: [], notas: '', agua: 0, animo: 0 }; }
    function guardarDia(f, cambios, que) {
      antes(que || 'el cambio'); const d = { ...dia(f), ...cambios };
      if (!d.foco && !d.notas && !(d.pendientes || []).length && !d.agua && !d.animo) delete E.dias[f]; else E.dias[f] = d;
      guardar();
    }

    // ---------- copia de seguridad
    function exportar() { return JSON.stringify({ app: 'rofac-roma-empleado', guardado: new Date().toISOString(), datos: E }, null, 1); }
    function importar(texto) {
      let o; try { o = JSON.parse(texto); } catch (e) { throw new Error('El archivo no es una copia de esta app'); }
      const d = o && o.app === 'rofac-roma-empleado' ? o.datos : null;
      if (!d || !Array.isArray(d.farmacias) || !Array.isArray(d.rotaciones)) throw new Error('El archivo no es una copia de esta app');
      antes('restaurar la copia'); Object.keys(E).forEach(k => delete E[k]); Object.assign(E, crear(d).E); guardar();
    }

    // ---------- calendario del celular (.ics)
    const icsTxt = s => String(s || '').replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\n/g, '\\n');
    const sinGuion = f => f.replace(/-/g, '');
    function ics(eventos) {
      const L = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//RoFac//Farmacia Roma//ES', 'CALSCALE:GREGORIAN', 'METHOD:PUBLISH'];
      const sello = new Date().toISOString().replace(/[-:]/g, '').slice(0, 15) + 'Z';
      for (const e of eventos) {
        L.push('BEGIN:VEVENT', 'UID:' + e.uid + '@rofac-roma', 'DTSTAMP:' + sello, 'SUMMARY:' + icsTxt(e.titulo));
        if (e.hora) {
          const [h, m] = e.hora.split(':').map(Number), fin = Math.min(h * 60 + m + 60, 23 * 60 + 59), dos = n => String(n).padStart(2, '0');
          L.push('DTSTART:' + sinGuion(e.fecha) + 'T' + dos(h) + dos(m) + '00', 'DTEND:' + sinGuion(e.fecha) + 'T' + dos(Math.floor(fin / 60)) + dos(fin % 60) + '00');
        } else L.push('DTSTART;VALUE=DATE:' + sinGuion(e.fecha), 'DTEND;VALUE=DATE:' + sinGuion(sumar(e.hasta || e.fecha, 1)));
        if (e.anual) L.push('RRULE:FREQ=YEARLY');
        if (e.nota) L.push('DESCRIPTION:' + icsTxt(e.nota));
        if (e.aviso) L.push('BEGIN:VALARM', 'ACTION:DISPLAY', 'DESCRIPTION:' + icsTxt(e.titulo), 'TRIGGER:' + e.aviso, 'END:VALARM');
        L.push('END:VEVENT');
      }
      L.push('END:VCALENDAR'); return L.join('\r\n') + '\r\n';
    }
    function icsGuardias(desde, hasta, soloId) {
      return ics(guardiasNuestras(desde, hasta).filter(i => !soloId || i.turno === soloId).map(i => ({
        uid: 'guardia-' + i.fecha, titulo: 'Guardia ' + farmacia(i.turno).nombre + (i.tomada ? ' (cambio)' : ''), fecha: i.fecha,
        nota: i.cambio && i.cambio.nota ? i.cambio.nota : '', aviso: '-PT15H',
      })));
    }
    function icsVac(v) { return ics([{ uid: 'vac-' + v.id, titulo: 'Vacaciones', fecha: v.desde, hasta: v.hasta, nota: v.nota, aviso: '-PT15H' }]); }

    if (migro) { try { raiz.localStorage && raiz.localStorage.setItem(CLAVE, JSON.stringify(E)); } catch (e) {} }
    return {
      E, farmacia, esNuestra, nuestras, oficial, info, guardiasNuestras, proximasNuestras, resumenMes,
      cambiar, volverOriginal, guardarFarmacias, nuevoListado, borrarListado, setConfirmado, setCfg, exportar, importar, icsGuardias, icsVac, deshacer,
      cat, guardarGasto, borrarGasto, gastosMes, tipo, borrarDe, guardarTarea, tareaOk, tareasPendientes, borrarHechas, guardarNota, fijarNota, notasOrdenadas,
      guardarHabito, borrarHabito, habitoHecho, tildarHabito, racha, dia, guardarDia, guardarAnot, borrarAnot, anotDe, proximasAnot, icsAnot,
      diasVac, corresponden, tomados, resumenVac, anioSugerido, revisarVac, guardarVac, borrarVac, setCorresponden, vacDe, proximasVac,
      hayDeshacer: () => atras.length > 0, set alGuardar(fn) { alGuardar = fn; },
    };
  }

  function cargar() {
    let g = null; try { g = JSON.parse(raiz.localStorage.getItem(CLAVE) || 'null'); } catch (e) {}
    return crear(g);
  }

  const F = { aD, aF, sumar, entre, diaSemana, lunesDe, hoyLocal, finDeMes, fechaLarga, fechaCorta, valida, MESES, DIAS };
  const api = { crear, cargar, inicial, F, CLAVE, CATS, MEDIOS, TIPOS, numero };
  if (typeof module !== 'undefined') module.exports = api; else raiz.Roma = api;
})(typeof window !== 'undefined' ? window : globalThis);
