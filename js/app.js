/* Farmacia Roma · app para los empleados — pantallas.
   Turnos de farmacia (de "Mi Agenda", con los cambios de guardia), mis gastos y mis vacaciones. */
(function () {
  const F = Roma.F, A = Roma.cargar(), I = Icono;
  const $ = s => document.querySelector(s), $$ = s => Array.from(document.querySelectorAll(s));
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const VERSION = 'v1.0';
  const DIAS3 = ['dom', 'lun', 'mar', 'mié', 'jue', 'vie', 'sáb'];
  try { navigator.storage && navigator.storage.persist && navigator.storage.persist(); } catch (e) {}

  let HOY = F.hoyLocal();
  const V = { pant: 'inicio', vista: 'mes', mes: HOY.slice(0, 7), lunes: F.lunesDe(HOY), gmes: HOY.slice(0, 7), vanio: +HOY.slice(0, 4) };
  try { const p = sessionStorage.getItem('roma_pant'); if (p) V.pant = p; const v = sessionStorage.getItem('roma_vista'); if (v) V.vista = v; } catch (e) {}

  // ---------- utilidades
  const nombreF = id => A.farmacia(id).nombre;
  const claseF = id => id === 'roma' ? 'roma' : id === 'roma2' ? 'roma2' : A.esNuestra(id) ? 'roma' : '';
  const faltan = f => { const n = F.entre(HOY, f); return n === 0 ? 'hoy' : n === 1 ? 'mañana' : n === -1 ? 'ayer' : n > 0 ? 'en ' + n + ' días' : 'hace ' + (-n) + ' días'; };
  const fechaChica = f => `${DIAS3[F.diaSemana(f)]} ${F.fechaCorta(f)}`;
  const plata = n => '$ ' + (Math.round(n * 100) / 100).toLocaleString('es-AR', { minimumFractionDigits: n % 1 ? 2 : 0, maximumFractionDigits: 2 });
  const may = t => t.charAt(0).toUpperCase() + t.slice(1);
  const mesNombre = ym => { const [a, m] = ym.split('-').map(Number); return may(F.MESES[m - 1]) + ' ' + a; };
  const masMes = (ym, d) => { let [a, m] = ym.split('-').map(Number); m += d; if (m < 1) { m = 12; a--; } if (m > 12) { m = 1; a++; } return a + '-' + String(m).padStart(2, '0'); };
  const mia = () => A.E.cfg.mia === 'roma' || A.E.cfg.mia === 'roma2' ? A.E.cfg.mia : null;

  let tToast;
  function toast(msg, deshacer, err) {
    const t = $('#toast'); clearTimeout(tToast);
    t.className = err ? 'err' : ''; t.innerHTML = `<span>${esc(msg)}</span>` + (deshacer ? '<button id="tDes">Deshacer</button>' : '');
    t.hidden = false;
    if (deshacer) $('#tDes').onclick = () => { const q = A.deshacer(); t.hidden = true; if (q) { toast('Listo, deshecho'); repintar(); refrescarHoja(); } };
    tToast = setTimeout(() => { t.hidden = true; }, deshacer ? 6000 : 2600);
  }

  // ---------- hoja de abajo
  let hojaActual = null;
  function abrir(fn) { hojaActual = fn; $('#hoja').innerHTML = fn(); $('#capa').hidden = false; $('#hoja').scrollTop = 0; enganchar($('#hoja')); }
  function refrescarHoja() { if (hojaActual && !$('#capa').hidden) { const s = $('#hoja').scrollTop; $('#hoja').innerHTML = hojaActual(); enganchar($('#hoja')); $('#hoja').scrollTop = s; } }
  function cerrar() { $('#capa').hidden = true; hojaActual = null; }
  $('#capa').addEventListener('click', e => { if (e.target.id === 'capa') cerrar(); });
  const btnCerrar = `<button class="mini cerrar" data-acc="cerrar" aria-label="Cerrar">${I('cruz')}</button>`;

  // ---------- encabezado con el logo chiquito
  function cab(titulo, sub, extra = '') {
    return `<header class="cab"><img class="logo" src="img/logo-roma.png" alt="Farmacia Roma" width="110" height="39">
      <div class="cab-t"><h1>${esc(titulo)}</h1>${sub ? `<div class="sub">${sub}</div>` : ''}</div>${extra}</header>`;
  }
  const navBar = (acc, d1, medio, d2) => `<div class="nav-mes"><button class="redondo" data-acc="${acc}" data-d="${d1}" aria-label="Anterior">${I('izq')}</button>
    <div class="medio">${medio}</div><button class="redondo" data-acc="${acc}" data-d="${d2}" aria-label="Siguiente">${I('der')}</button></div>`;

  // =================== INICIO
  function turnoCard() {
    const i = A.info(HOY), c = claseF(i.turno);
    const det = i.nuestra ? (i.tomada ? 'Tomada de ' + esc(nombreF(i.oficial)) : 'Farmacia de turno')
      : (i.cedida ? `Era de <span class="tachado">${esc(nombreF(i.oficial))}</span>, se la cedimos` : 'Hoy no tenemos guardia');
    return `<div class="card turno-hoy ${i.nuestra ? 'nuestra ' + c : ''}" data-acc="dia" data-f="${HOY}">
      <div class="et">${i.nuestra ? '¡Hoy tenemos guardia!' : 'Hoy está de turno'}</div>
      <div class="quien">${esc(nombreF(i.turno))}</div>
      <div class="det">${det}${i.cambio && i.cambio.nota ? ' · ' + esc(i.cambio.nota) : ''}${i.estimado ? ' <span class="chip est">a confirmar</span>' : ''}</div></div>`;
  }
  function filaGuardia(i) {
    const d = F.aD(i.fecha);
    return `<div class="fila toca" data-acc="dia" data-f="${i.fecha}"><div class="fecha ${claseF(i.turno)}"><small>${DIAS3[d.getUTCDay()]}</small><b>${d.getUTCDate()}</b><small>${F.MESES[d.getUTCMonth()].slice(0, 3)}</small></div>
      <div class="txt"><b>${esc(nombreF(i.turno))}</b> ${i.tomada ? '<span class="chip tom">cambio</span>' : ''} ${i.estimado ? '<span class="chip est">a confirmar</span>' : ''}
      ${i.cambio && i.cambio.nota ? `<small>${esc(i.cambio.nota)}</small>` : ''}${A.vacDe(i.fecha) ? '<small>🏖 estás de vacaciones</small>' : ''}</div><div class="falta">${faltan(i.fecha)}</div></div>`;
  }
  // anotaciones (turno médico, trámite, cumpleaños…)
  function filaAnot(a, conFecha) {
    const t = A.tipo(a.tipo), f = a.cuando || a.fecha;
    return `<div class="fila toca" data-acc="editAnot" data-id="${a.id}"><span class="g-emo">${t.emoji}</span><div class="txt"><b>${esc(a.titulo)}</b>
      <small>${conFecha ? fechaChica(f) + (a.hora ? ' · ' : '') : ''}${a.hora ? a.hora + ' h' : (conFecha ? '' : 'todo el día')}${a.nota ? ' · ' + esc(a.nota) : ''}</small></div>${conFecha ? `<div class="falta">${faltan(f)}</div>` : ''}</div>`;
  }
  function cardAnot(lista, titulo, vacio, fNueva, conFecha = true) {
    return `<div class="card"><div class="card-t">${I('cal', 18)} ${titulo}</div>
      ${lista.map(a => filaAnot(a, conFecha)).join('') || `<div class="vacio">${vacio}</div>`}
      <div class="botones"><button class="btn sec chico" data-acc="nuevaAnot" data-f="${fNueva}">${I('mas_', 17)} Anotar algo</button></div></div>`;
  }
  function vacEstado() {
    const ahora = A.vacDe(HOY), prox = A.proximasVac(HOY), r = A.resumenVac(+HOY.slice(0, 4));
    if (ahora) { const vuelve = F.sumar(ahora.hasta, 1); return `🏖 <b>¡Estás de vacaciones!</b> Volvés el ${DIAS3[F.diaSemana(vuelve)]} ${F.fechaCorta(vuelve)}`; }
    if (prox) return `Próximas vacaciones: <b>${fechaChica(prox.desde)}</b> (${faltan(prox.desde)}) · te quedan <b>${r.quedan}</b> días`;
    return `Te quedan <b>${r.quedan}</b> días de vacaciones del ${r.anio}`;
  }
  function pInicio() {
    const nombre = (A.E.cfg.nombre || '').trim(), h = new Date().getHours();
    const saludo = (h < 13 ? 'Buen día' : h < 20 ? 'Buenas tardes' : 'Buenas noches') + (nombre ? ', ' + esc(nombre.split(' ')[0]) : '');
    const prox = A.proximasNuestras(F.sumar(HOY, 1), 3, mia()), g = A.gastosMes(HOY.slice(0, 7));
    return cab(saludo, esc(F.fechaLarga(HOY)).replace(/^./, c => c.toUpperCase())) + instalarAviso() + turnoCard() +
      `<div class="card"><div class="card-t">${I('guardia', 18)} Próximas guardias${mia() ? ' de ' + esc(nombreF(mia())) : ''}</div>
        ${prox.map(filaGuardia).join('') || '<div class="vacio">No hay guardias cargadas</div>'}
        <div class="botones"><button class="btn sec chico" data-acc="ir" data-p="turnos">${I('mes', 17)} Ver el calendario</button></div></div>
      ${cardAnot(A.proximasAnot(HOY, 60, 4), 'Lo que tengo anotado', 'Nada anotado para los próximos días', HOY)}
      <div class="dos-cards">
        <button class="card mini-card azul" data-acc="ir" data-p="gastos"><span class="mc-t">${I('plata', 18)} Gastos de ${F.MESES[+HOY.slice(5, 7) - 1]}</span><b>${plata(g.total)}</b><small>${g.lista.length} gasto${g.lista.length === 1 ? '' : 's'}</small></button>
        <button class="card mini-card verde" data-acc="ir" data-p="vacaciones"><span class="mc-t">${I('playa', 18)} Vacaciones</span><b>${A.resumenVac(+HOY.slice(0, 4)).quedan} días</b><small>me quedan</small></button></div>
      <div class="card vac-ini" data-acc="ir" data-p="vacaciones">${vacEstado()}</div>
      <button class="fab" data-acc="nuevoGasto" aria-label="Anotar un gasto">${I('mas_', 26)}<span>Gasto</span></button>`;
  }

  // =================== TURNOS
  function pTurnos() {
    const vista = V.vista;
    const seg = `<div class="seg">${[['mes', 'Mes'], ['semana', 'Semana'], ['lista', 'Mis guardias']].map(([k, t]) => `<button class="${vista === k ? 'act' : ''}" data-acc="vista" data-v="${k}">${t}</button>`).join('')}</div>`;
    return cab('Turnos de farmacia', 'Roma <span class="pt roma"></span> · Roma II <span class="pt roma2"></span>') + seg + (vista === 'semana' ? vSemana() : vista === 'lista' ? vLista() : vMes());
  }
  function vMes() {
    const [a, m] = V.mes.split('-').map(Number), ini = V.mes + '-01', fin = V.mes + '-' + String(F.finDeMes(a, m)).padStart(2, '0');
    const todas = A.E.cfg.verTodas !== false, r = A.resumenMes(a, m);
    let celdas = ['LUN', 'MAR', 'MIÉ', 'JUE', 'VIE', 'SÁB', 'DOM'].map(x => `<div class="dn">${x}</div>`).join('');
    const vacias = (F.diaSemana(ini) + 6) % 7;
    for (let k = 0; k < vacias; k++) celdas += `<div class="c fuera"></div>`;
    let hayEst = false;
    for (let f = ini; f <= fin; f = F.sumar(f, 1)) {
      const i = A.info(f); if (i.estimado) hayEst = true;
      const nombre = A.farmacia(i.turno).corto || nombreF(i.turno), vac = A.vacDe(f), an = A.anotDe(f);
      let cont = '';
      if (i.cedida) cont = `<span class="f x tachado">${esc(A.farmacia(i.oficial).corto)}</span><span class="f">${todas ? esc(nombre) : ''}</span>`;
      else if (i.nuestra || todas) cont = `<span class="f">${esc(nombre)}</span>`;
      celdas += `<button class="c ${i.nuestra ? 'nuestra ' + claseF(i.turno) : ''} ${f === HOY ? 'hoy' : ''} ${i.estimado ? 'est' : ''} ${vac ? 'vac' : ''}" data-acc="dia" data-f="${f}" aria-label="${esc(F.fechaLarga(f) + ': ' + nombreF(i.turno))}">
        <span class="n">${F.aD(f).getUTCDate()}</span>${cont}${vac ? '<span class="vac-m">🏖</span>' : ''}${an.length ? `<span class="anot-m">${A.tipo(an[0].tipo).emoji}${an.length > 1 ? '<sup>' + an.length + '</sup>' : ''}</span>` : ''}${i.cambio && i.cambio.f !== i.oficial ? '<span class="ico-cambio">⇄</span>' : ''}</button>`;
    }
    const resto = (7 - (vacias + F.finDeMes(a, m)) % 7) % 7;
    for (let k = 0; k < resto; k++) celdas += `<div class="c fuera"></div>`;
    const porF = Object.entries(r.porFarmacia).map(([id, n]) => `<span class="chip ${claseF(id)}">${esc(nombreF(id))}: ${n}</span>`).join(' ');
    return navBar('mes', -1, `<h2>${esc(may(F.MESES[m - 1]))} <span>${a}</span></h2>`, 1) +
      `<div class="seg chico"><button class="${todas ? '' : 'act'}" data-acc="ver" data-v="0">Sólo las nuestras</button><button class="${todas ? 'act' : ''}" data-acc="ver" data-v="1">Todas</button></div>
      ${hayEst ? `<div class="aviso">✎ Desde el ${F.fechaCorta(F.sumar(A.E.confirmadoHasta, 1))} es <b>estimado</b> (rayado), siguiendo la rotación. Cuando salga el listado nuevo, cargalo en Más.</div>` : ''}
      <div class="card" style="padding:10px 8px"><div class="grilla">${celdas}</div>
        ${V.mes !== HOY.slice(0, 7) ? `<div style="text-align:center;margin-top:10px"><button class="btn sec chico" data-acc="mesHoy">Volver a este mes</button></div>` : ''}</div>
      <div class="card"><div class="card-t">${I('guardia', 18)} Este mes: ${r.total} guardias nuestras</div><div class="chips">${porF}
        ${r.cedidas ? `<span class="chip ced">${r.cedidas} cedida${r.cedidas > 1 ? 's' : ''}</span>` : ''}${r.tomadas ? `<span class="chip tom">${r.tomadas} tomada${r.tomadas > 1 ? 's' : ''}</span>` : ''}</div>
        <div class="ayuda">Tocá un día para ver quién está de turno, cambiar una guardia o anotar algo tuyo. 🏖 = tus vacaciones.</div></div>
      ${cardAnot(anotMes(a, m), 'Mis anotaciones de ' + F.MESES[m - 1], 'No anotaste nada este mes', V.mes === HOY.slice(0, 7) ? HOY : ini)}`;
  }
  function anotMes(a, m) {
    const out = [], fin = finMes(a, m);
    for (let f = `${a}-${String(m).padStart(2, '0')}-01`; f <= fin; f = F.sumar(f, 1)) A.anotDe(f).forEach(x => out.push({ ...x, cuando: f }));
    return out;
  }
  const finMes = (a, m) => `${a}-${String(m).padStart(2, '0')}-${String(F.finDeMes(a, m)).padStart(2, '0')}`;
  function vSemana() {
    const l = V.lunes, dom = F.sumar(l, 6), dl = F.aD(l), dd = F.aD(dom);
    const titulo = dl.getUTCMonth() === dd.getUTCMonth() ? `${dl.getUTCDate()} al ${dd.getUTCDate()} de ${F.MESES[dd.getUTCMonth()]}` : `${dl.getUTCDate()} ${F.MESES[dl.getUTCMonth()].slice(0, 3)} al ${dd.getUTCDate()} ${F.MESES[dd.getUTCMonth()].slice(0, 3)}`;
    let filas = '';
    for (let k = 0; k < 7; k++) {
      const f = F.sumar(l, k), i = A.info(f), d = F.aD(f), vac = A.vacDe(f);
      const tur = i.nuestra ? `<b class="col-${claseF(i.turno)}">Guardia ${esc(nombreF(i.turno))}</b>${i.tomada ? ' <span class="chip tom">cambio</span>' : ''}`
        : `<span class="tenue">De turno:</span> ${esc(nombreF(i.turno))}${i.cedida ? ' <span class="chip ced">cedida</span>' : ''}`;
      filas += `<div class="dia-sem ${f === HOY ? 'hoy' : ''} ${i.nuestra ? 'nuestra ' + claseF(i.turno) : ''}" data-acc="dia" data-f="${f}"><div class="izq"><small>${F.DIAS[d.getUTCDay()].slice(0, 3)}</small><b>${d.getUTCDate()}</b></div>
        <div class="der"><div>${tur}${i.estimado ? ' <span class="chip est">a confirmar</span>' : ''}</div>
        ${i.cambio && i.cambio.nota ? `<small class="tenue">✎ ${esc(i.cambio.nota)}</small>` : ''}${vac ? '<small>🏖 vacaciones</small>' : ''}
        ${A.anotDe(f).map(x => `<small class="anot-s">${A.tipo(x.tipo).emoji} ${x.hora ? '<b>' + x.hora + '</b> ' : ''}${esc(x.titulo)}</small>`).join('')}</div></div>`;
    }
    const n = A.guardiasNuestras(l, dom).length;
    return navBar('sem', -7, `<h2 style="font-size:17px">${esc(titulo)}</h2><div class="sub">${n ? n + (n > 1 ? ' guardias nuestras' : ' guardia nuestra') : 'sin guardias nuestras'}</div>`, 7) +
      `<div class="card" style="padding:6px 10px">${filas}</div>
      ${V.lunes !== F.lunesDe(HOY) ? `<div style="text-align:center"><button class="btn sec chico" data-acc="semHoy">Volver a esta semana</button></div>` : ''}`;
  }
  function vLista() {
    const m = mia(), prox = A.proximasNuestras(HOY, 12, m);
    return `<div class="seg chico">${[['ambas', 'Roma y Roma II'], ['roma', 'Sólo Roma'], ['roma2', 'Sólo Roma II']].map(([k, t]) => `<button class="${(A.E.cfg.mia || 'ambas') === k ? 'act' : ''}" data-acc="mia" data-v="${k}">${t}</button>`).join('')}</div>
      <div class="card"><div class="card-t">${I('guardia', 18)} Próximas guardias</div>${prox.map(filaGuardia).join('') || '<div class="vacio">No hay guardias cargadas</div>'}</div>
      <div class="botones"><button class="btn sec" data-acc="icsGuardias">${I('cal', 18)} Pasarlas al calendario del celular</button></div>
      <div class="ayuda" style="text-align:center">El calendario del celular te avisa la noche anterior.</div>`;
  }

  // ---------- hoja del día
  function hDia(f) {
    return () => {
      const i = A.info(f), cambiado = i.cambio && i.cambio.f !== i.oficial, vac = A.vacDe(f);
      let det = '';
      if (i.cedida) det = `Era nuestra (<span class="tachado">${esc(nombreF(i.oficial))}</span>) y se la cedimos.`;
      else if (i.tomada) det = `Era de ${esc(nombreF(i.oficial))} y la hacemos nosotros.`;
      else if (cambiado) det = `En el listado figuraba ${esc(nombreF(i.oficial))}.`;
      if (i.cambio && i.cambio.par) det += ` Intercambio con el ${esc(F.fechaLarga(i.cambio.par))}.`;
      if (i.cambio && i.cambio.nota) det += ` <i>“${esc(i.cambio.nota)}”</i>`;
      if (i.estimado) det += ' <span class="chip est">a confirmar</span>';
      return `${btnCerrar}<h2>${esc(F.fechaLarga(f)).replace(/^./, c => c.toUpperCase())}</h2><div class="sub">${faltan(f) === 'hoy' ? 'Hoy' : faltan(f)}</div>
        <div class="bloque ${i.nuestra ? 'nuestra ' + claseF(i.turno) : ''}"><div class="tenue" style="font-size:13px">${i.nuestra ? 'Tenemos guardia' : 'Está de turno'}</div>
          <div class="quien-d">${esc(nombreF(i.turno))}</div>${det ? `<div style="font-size:13.5px;margin-top:4px">${det}</div>` : ''}
          <div class="botones" style="margin-top:10px"><button class="btn chico" data-acc="cambiar" data-f="${f}">${I('cambio', 17)} Cambiar guardia</button>
          ${i.cambio ? `<button class="btn sec chico" data-acc="original" data-f="${f}">Volver al listado</button>` : ''}</div></div>
        ${vac ? `<div class="bloque">🏖 Estás de vacaciones (del ${F.fechaCorta(vac.desde)} al ${F.fechaCorta(vac.hasta)})</div>` : ''}
        <div class="bloque"><div class="tenue" style="font-size:13px">Mis anotaciones</div>
          ${A.anotDe(f).map(x => filaAnot(x, false)).join('') || '<div class="vacio" style="font-size:14px;padding:6px 0">Nada anotado</div>'}
          <div class="botones" style="margin-top:8px"><button class="btn sec chico" data-acc="nuevaAnot" data-f="${f}">${I('mas_', 17)} Anotar algo este día</button></div></div>
        <div class="ayuda">Todo queda guardado sólo en tu celular.</div>`;
    };
  }
  function hCambiar(f, sel) {
    return () => {
      const i = A.info(f), elegido = sel.quien || i.turno, of = i.oficial, nuestraOf = A.esNuestra(of);
      const lista = A.E.farmacias.slice().sort((a, b) => (b.nuestra ? 1 : 0) - (a.nuestra ? 1 : 0));
      const puedeInter = nuestraOf && elegido !== of && !A.esNuestra(elegido);
      let sugs = '';
      if (puedeInter) {
        const dias = []; for (let k = -40; k <= 90 && dias.length < 6; k++) { const g = F.sumar(f, k); if (k !== 0 && g >= F.sumar(HOY, -7) && A.oficial(g) === elegido && !A.E.cambios[g]) dias.push(g); }
        sugs = dias.map(g => `<button type="button" class="${sel.par === g ? 'act' : ''}" data-acc="sugPar" data-g="${g}">${DIAS3[F.diaSemana(g)]} ${F.fechaCorta(g)}</button>`).join('');
      }
      return `${btnCerrar}<h2>Cambiar guardia</h2><div class="sub">${esc(F.fechaLarga(f))} · en el listado: <b>${esc(nombreF(of))}</b></div>
        <label class="l">¿Quién hace la guardia ese día?</label>
        <div class="pills">${lista.map(x => `<button type="button" class="${x.id === elegido ? 'act' : ''} ${claseF(x.id)}" data-acc="elegir" data-id="${x.id}">${esc(x.nombre)}${x.id === of ? ' <small>(listado)</small>' : ''}</button>`).join('')}</div>
        ${puedeInter ? `<label class="chk"><input type="checkbox" id="cInter" ${sel.inter ? 'checked' : ''} data-acc="inter"> Nos devuelve otro día (intercambio)</label>
          <div class="${sel.inter ? '' : 'oculto'}" id="cInterBox"><div class="ayuda">Días que está de turno ${esc(nombreF(elegido))}: ese día lo hacemos nosotros (${esc(nombreF(of))}).</div>
            <div class="pills sug">${sugs || '<span class="ayuda">No hay días cerca: elegí la fecha abajo.</span>'}</div>
            <input class="in" type="date" id="cPar" value="${sel.par || ''}" style="margin-top:8px"></div>` : ''}
        <label class="l">Nota (opcional)</label><input class="in" id="cNota" value="${esc(sel.nota != null ? sel.nota : (i.cambio && i.cambio.nota) || '')}" placeholder="Ej.: a cambio de…, se la pidió Fulano">
        <div class="error" id="cErr"></div>
        <div class="botones"><button class="btn sec" data-acc="dia" data-f="${f}">Volver</button><button class="btn" data-acc="guardarCambio" data-f="${f}">Guardar</button></div>`;
    };
  }

  // =================== GASTOS
  function pGastos() {
    const g = A.gastosMes(V.gmes), ant = A.gastosMes(masMes(V.gmes, -1)), maxC = Math.max(1, ...Object.values(g.porCat));
    const cats = Object.entries(g.porCat).sort((a, b) => b[1] - a[1]);
    const dif = ant.total ? Math.round((g.total - ant.total) / ant.total * 100) : null;
    const porDia = {}; g.lista.forEach(x => (porDia[x.fecha] = porDia[x.fecha] || []).push(x));
    return cab('Mis gastos', 'sólo para vos: quedan en tu celular') +
      navBar('gmes', -1, `<h2>${esc(mesNombre(V.gmes))}</h2>`, 1) +
      `<div class="card total-mes"><small>Gastaste en el mes</small><b>${plata(g.total)}</b>
        ${dif != null ? `<span class="chip ${dif > 0 ? 'ced' : 'tom'}">${dif > 0 ? '▲ ' + dif + '% más' : dif < 0 ? '▼ ' + (-dif) + '% menos' : 'igual'} que ${F.MESES[+masMes(V.gmes, -1).slice(5) - 1]}</span>` : ''}
        ${Object.keys(g.porMedio).length > 1 ? `<div class="medios">${Object.entries(g.porMedio).map(([m, n]) => `<span>${esc(m)} <b>${plata(n)}</b></span>`).join('')}</div>` : ''}</div>
      ${cats.length ? `<div class="card"><div class="card-t">${I('torta', 18)} En qué gastaste</div>${cats.map(([c, n]) => { const k = A.cat(c);
        return `<div class="barra-cat"><span class="bc-n">${k.emoji} ${esc(k.nombre)}</span><span class="bc-v">${plata(n)}</span><div class="bc-b"><i style="width:${Math.max(3, n / maxC * 100)}%"></i></div></div>`; }).join('')}</div>` : ''}
      <div class="card"><div class="card-t">${I('lista', 18)} Detalle</div>
        ${Object.keys(porDia).map(f => `<div class="g-dia">${f === HOY ? 'Hoy' : esc(F.fechaLarga(f))}</div>${porDia[f].map(x => { const k = A.cat(x.cat);
          return `<div class="fila toca" data-acc="editGasto" data-id="${x.id}"><span class="g-emo">${k.emoji}</span><div class="txt"><b>${esc(x.desc || k.nombre)}</b><small>${esc(k.nombre)} · ${esc(x.medio)}</small></div><div class="g-monto">${plata(x.monto)}</div></div>`; }).join('')}`).join('')
          || `<div class="vacio">No anotaste gastos en ${esc(mesNombre(V.gmes))}</div>`}</div>
      ${V.gmes !== HOY.slice(0, 7) ? `<div style="text-align:center"><button class="btn sec chico" data-acc="gmesHoy">Volver a este mes</button></div>` : ''}
      <button class="fab" data-acc="nuevoGasto" aria-label="Anotar un gasto">${I('mas_', 26)}<span>Gasto</span></button>`;
  }
  let gSel = {};
  function hGasto(g) {
    return () => `${btnCerrar}<h2>${g.id ? 'Gasto' : 'Anotar un gasto'}</h2>
      <label class="l">¿Cuánto?</label><div class="monto-in"><span>$</span><input class="in grande" id="gM" inputmode="decimal" value="${g.monto != null ? esc(String(g.monto).replace('.', ',')) : ''}" placeholder="0" autocomplete="off"></div>
      <label class="l">¿En qué?</label><div class="pills cats">${Roma.CATS.map(c => `<button type="button" class="${gSel.cat === c.id ? 'act' : ''}" data-acc="gCat" data-v="${c.id}">${c.emoji} ${esc(c.nombre)}</button>`).join('')}</div>
      <label class="l">Detalle (opcional)</label><input class="in" id="gD" value="${esc(g.desc || '')}" placeholder="Ej.: almuerzo, carga SUBE, luz…" autocomplete="off" maxlength="120">
      <div class="dos"><div><label class="l">Fecha</label><input class="in" type="date" id="gF" value="${g.fecha || HOY}" max="${HOY}"></div>
        <div><label class="l">Cómo pagaste</label><select class="in" id="gP">${Roma.MEDIOS.map(m => `<option ${gSel.medio === m ? 'selected' : ''}>${m}</option>`).join('')}</select></div></div>
      <div class="error" id="gErr"></div>
      <div class="botones"><button class="btn grande" data-acc="guardarGasto" data-id="${g.id || ''}">${I('check', 18)} Guardar</button>
      ${g.id ? `<button class="btn peligro" data-acc="borrarGasto" data-id="${g.id}">${I('basura', 16)} Borrar</button>` : ''}</div>`;
  }

  let aSel = {};
  function hAnot(a) {
    return () => `${btnCerrar}<h2>${a.id ? 'Mi anotación' : 'Anotar algo'}</h2>
      <label class="l">¿Qué es?</label><div class="pills tipos">${Roma.TIPOS.map(t => `<button type="button" class="${aSel.tipo === t.id ? 'act' : ''}" data-acc="aTipo" data-v="${t.id}">${t.emoji} ${esc(t.nombre)}</button>`).join('')}</div>
      <label class="l" for="aT">Título</label><input class="in" id="aT" value="${esc(a.titulo || '')}" placeholder="Ej.: Dentista, Cumple de mamá, Pagar el auto…" autocomplete="off" maxlength="80">
      <div class="dos"><div><label class="l" for="aF">Fecha</label><input class="in" type="date" id="aF" value="${a.fecha || HOY}"></div>
        <div><label class="l" for="aH">Hora (opcional)</label><input class="in" type="time" id="aH" value="${a.hora || ''}"></div></div>
      <label class="chk"><input type="checkbox" id="aA" ${aSel.anual ? 'checked' : ''}> Se repite todos los años <small class="tenue">(cumpleaños, aniversarios)</small></label>
      <label class="l" for="aN">Nota (opcional)</label><textarea class="in" id="aN" rows="2" maxlength="400" placeholder="Dirección, qué llevar, teléfono…">${esc(a.nota || '')}</textarea>
      <div class="error" id="aErr"></div>
      <div class="botones"><button class="btn grande" data-acc="guardarAnot" data-id="${a.id || ''}">${I('check', 18)} Guardar</button>
      <button class="btn sec" data-acc="guardarAnot" data-id="${a.id || ''}" data-ics="1">${I('cal', 17)} Guardar y pasar al calendario</button>
      ${a.id ? `<button class="btn peligro" data-acc="borrarAnot" data-id="${a.id}">${I('basura', 16)} Borrar</button>` : ''}</div>`;
  }

  // =================== VACACIONES
  function pVacaciones() {
    const a = V.vanio, r = A.resumenVac(a), ahora = A.vacDe(HOY), prox = A.proximasVac(HOY);
    const lista = A.E.vac.lista.filter(v => v.anio === a || v.desde.slice(0, 4) === String(a) || v.hasta.slice(0, 4) === String(a));
    const pct = r.corresponden ? Math.min(100, r.tomados / r.corresponden * 100) : 0;
    return cab('Mis vacaciones', 'días corridos') + navBar('vanio', -1, `<h2>${a}</h2>`, 1) +
      `<div class="card vac-res"><div class="vr"><small>Corresponden</small><b>${r.corresponden}</b><button class="mini" data-acc="vacDias" aria-label="Cambiar los días que me corresponden">${I('lapiz', 16)}</button></div>
        <div class="vr"><small>Tomé</small><b>${r.tomados}</b></div><div class="vr dest"><small>Quedan</small><b>${r.quedan}</b></div>
        <div class="bc-b" style="grid-column:1/-1"><i style="width:${pct}%"></i></div>
        ${r.pasado ? `<div class="aviso" style="grid-column:1/-1;margin:4px 0 0">Te pasaste ${r.pasado} día${r.pasado > 1 ? 's' : ''}: quedan como adelanto a cuenta del ${a + 1}.</div>` : ''}</div>
      ${a === +HOY.slice(0, 4) && (ahora || prox) ? `<div class="card vac-ini">${vacEstado()}</div>` : ''}
      <div class="botones"><button class="btn grande" data-acc="nuevaVac">${I('mas_', 20)} Anotar vacaciones</button></div>
      <div class="card"><div class="card-t">${I('playa', 18)} Del ${a}</div>
        ${lista.map(v => { const n = A.diasVac(v), ya = v.hasta < HOY, ah = v.desde <= HOY && v.hasta >= HOY;
          return `<div class="fila toca" data-acc="editVac" data-id="${v.id}"><div class="fecha verde"><small>${F.MESES[+v.desde.slice(5, 7) - 1].slice(0, 3)}</small><b>${n}</b><small>día${n > 1 ? 's' : ''}</small></div>
            <div class="txt"><b>${fechaChica(v.desde)} al ${fechaChica(v.hasta)}</b><small>${ah ? '🏖 ahora' : ya ? 'ya me las tomé' : faltan(v.desde)}${v.anio !== a ? ` · <span class="chip ${v.anio > a ? 'ced' : 'est'}">a cuenta del ${v.anio}</span>` : ''}${v.nota ? ' · ' + esc(v.nota) : ''}</small></div>${I('lapiz', 18)}</div>`; }).join('')
          || '<div class="vacio">Todavía no anotaste vacaciones de este año</div>'}</div>
      <div class="ayuda" style="text-align:center">Se cuentan días corridos (sábados, domingos y feriados incluidos). Las de enero a abril se proponen a cuenta del año anterior si te quedaban días.</div>`;
  }
  function hVac(v, avisos) {
    return () => {
      let dias = '';
      if (F.valida(v.desde || '') && F.valida(v.hasta || '') && v.hasta >= v.desde) { const n = F.entre(v.desde, v.hasta) + 1; dias = `<div class="dias-vac"><b>${n}</b> día${n > 1 ? 's' : ''} corrido${n > 1 ? 's' : ''} · volvés el ${fechaChica(F.sumar(v.hasta, 1))}</div>`; }
      const anios = [+(v.desde || HOY).slice(0, 4) - 1, +(v.desde || HOY).slice(0, 4), +(v.desde || HOY).slice(0, 4) + 1];
      return `${btnCerrar}<h2>${v.id ? 'Mis vacaciones' : 'Anotar vacaciones'}</h2>
        <div class="dos"><div><label class="l">Desde</label><input class="in" type="date" id="vD" value="${v.desde || ''}"></div>
          <div><label class="l">Hasta (último día)</label><input class="in" type="date" id="vH" value="${v.hasta || ''}"></div></div>
        ${dias}
        <label class="l">A cuenta del año</label><div class="pills">${anios.map(x => `<button type="button" class="${+v.anio === x ? 'act' : ''}" data-acc="vAnio" data-v="${x}">${x} <small>(quedan ${Math.max(0, A.corresponden(x) - A.tomados(x, v.id))})</small></button>`).join('')}</div>
        <label class="l">Nota (opcional)</label><input class="in" id="vN" value="${esc(v.nota || '')}" placeholder="Ej.: viaje, me las firmó…" maxlength="160">
        ${avisos && avisos.length ? `<div class="aviso">${avisos.map(esc).join('<br>')}<br><b>¿Las guardás igual?</b></div>` : ''}
        <div class="error" id="vErr"></div>
        <div class="botones"><button class="btn grande" data-acc="guardarVac" data-id="${v.id || ''}" data-forzar="${avisos && avisos.length ? 1 : ''}">${I('check', 18)} ${avisos && avisos.length ? 'Guardar igual' : 'Guardar'}</button>
        ${v.id ? `<button class="btn sec" data-acc="icsVac" data-id="${v.id}">${I('cal', 16)} Al calendario</button><button class="btn peligro" data-acc="borrarVac" data-id="${v.id}">${I('basura', 16)}</button>` : ''}</div>`;
    };
  }
  function hVacDias() {
    const a = V.vanio;
    return () => `${btnCerrar}<h2>Días que me corresponden</h2><div class="sub">Por ley son 14 días corridos (hasta 5 años de antigüedad), 21 (de 5 a 10), 28 (de 10 a 20) y 35 (más de 20).</div>
      <input class="in grande" id="vcN" inputmode="numeric" value="${A.corresponden(a)}">
      <div class="pills" style="margin-top:8px">${[14, 21, 28, 35].map(n => `<button type="button" data-acc="vcSug" data-v="${n}">${n}</button>`).join('')}</div>
      <div class="error" id="vcErr"></div>
      <div class="botones"><button class="btn" data-acc="vcGuardar" data-todos="1">Desde el ${a} en adelante</button><button class="btn sec" data-acc="vcGuardar">Sólo el ${a}</button></div>`;
  }

  // =================== MÁS
  function pMas() {
    const E = A.E, rs = E.rotaciones.slice().sort((a, b) => a.desde < b.desde ? 1 : -1);
    const ultima = E.cfg.ultimaCopia ? F.entre(E.cfg.ultimaCopia, HOY) : null;
    return cab('Más', 'ajustes, listado de turnos y copia') +
      `<div class="card"><div class="card-t">${I('usuario', 18)} Yo</div>
        <label class="l">Mi nombre</label><input class="in" id="mNom" value="${esc(E.cfg.nombre || '')}" placeholder="Para saludarte en el inicio" maxlength="40">
        <label class="l">Trabajo en</label><div class="seg chico" style="margin:4px 0 0">${[['ambas', 'Las dos'], ['roma', 'Roma'], ['roma2', 'Roma II']].map(([k, t]) => `<button class="${(E.cfg.mia || 'ambas') === k ? 'act' : ''}" data-acc="mia" data-v="${k}">${t}</button>`).join('')}</div></div>
      <div class="card"><div class="card-t">${I('farmacia', 18)} Listado de turnos</div>
        ${rs.map(r => `<div style="margin:8px 0 4px"><b>Desde el ${F.fechaCorta(r.desde)}/${r.desde.slice(0, 4)}</b> <small class="tenue">(cada ${r.orden.length} días se repite)</small>
          <div class="ayuda">${r.orden.map(id => A.esNuestra(id) ? `<b class="col-${claseF(id)}">${esc(nombreF(id))}</b>` : esc(nombreF(id))).join(' → ')}</div></div>`).join('')}
        <div style="margin-top:10px;font-size:14px">Confirmado hasta el <b>${F.fechaCorta(E.confirmadoHasta)}/${E.confirmadoHasta.slice(0, 4)}</b>. Después es estimado.</div>
        <div class="botones"><button class="btn sec chico" data-acc="confirmar">Cambiar fecha confirmada</button><button class="btn sec chico" data-acc="listado">Cargar listado nuevo</button><button class="btn sec chico" data-acc="farmacias">Farmacias</button></div></div>
      <div class="card"><div class="card-t">${I('cal', 18)} Calendario del celular</div>
        <div style="font-size:14px">Pasa las guardias${mia() ? ' de ' + esc(nombreF(mia())) : ''} al calendario del celular, así te avisa la noche anterior.</div>
        <div class="botones"><button class="btn" data-acc="icsGuardias">${I('cal', 18)} Pasar guardias al calendario</button></div></div>
      <div class="card"><div class="card-t">${I('guardar', 18)} Copia de seguridad</div>
        <div style="font-size:14px">Todo queda guardado <b>sólo en este celular</b>. Guardá una copia de vez en cuando (en WhatsApp, Drive o Archivos) por si se cambia o se pierde el teléfono.</div>
        <div class="ayuda">${ultima == null ? 'Todavía no guardaste ninguna copia.' : 'Última copia: ' + (ultima === 0 ? 'hoy' : 'hace ' + ultima + ' día' + (ultima > 1 ? 's' : ''))}</div>
        <div class="botones"><button class="btn" data-acc="copia">${I('guardar', 18)} Guardar copia</button><label class="btn sec" style="cursor:pointer">${I('subir', 18)} Restaurar copia<input type="file" accept=".json,application/json,text/plain" data-acc="restaurar" hidden></label></div></div>
      <div class="card"><div class="card-t">${I('compartir', 18)} Instalarla en el celular</div>
        <b style="font-size:14px">Android (Chrome)</b><ol class="pasos"><li>Abrir el link en <b>Chrome</b>.</li><li>Menú <b>⋮</b> (arriba a la derecha) → <b>“Instalar app”</b> o <b>“Agregar a la pantalla principal”</b>.</li></ol>
        <b style="font-size:14px">iPhone (Safari)</b><ol class="pasos"><li>Abrir el link en <b>Safari</b>.</li><li>Tocar <b>Compartir</b> ${I('compartir', 15)} → <b>“Agregar a inicio”</b> → Agregar.</li></ol></div>
      <div class="card"><div class="card-t">${I('usuario', 18)} Activación</div>
        <div style="font-size:14px">${RomaLic.vence() === '99991231' ? 'Activada <b>sin vencimiento</b>.' : 'Activada hasta el <b>' + RomaLic.fechaTxt(RomaLic.vence() || '') + '</b>.'}</div>
        <div class="ayuda">Código de este celular: <b>${RomaLic.equipo()}</b>. Cuando esté por vencer, mandáselo a Rodrigo y cargá la clave nueva.</div>
        <div class="botones"><a class="btn sec chico" href="https://wa.me/?text=${encodeURIComponent(RomaLic.textoWA())}" target="_blank" rel="noopener">Mandar código</a><button class="btn sec chico" data-acc="licNueva">Cargar clave nueva</button></div></div>
      <div class="pie"><img src="img/logo-roma.png" alt="" width="84" height="30"><br>App para el equipo de Farmacia Roma · RoFac ${VERSION}</div>`;
  }
  function instalarAviso() {
    const ios = /iphone|ipad|ipod/i.test(navigator.userAgent), and = /android/i.test(navigator.userAgent), suelta = !(navigator.standalone || matchMedia('(display-mode: standalone)').matches);
    let visto = false; try { visto = localStorage.getItem('rofac_roma_instalar') === '1'; } catch (e) {}
    if (!(ios || and) || !suelta || visto) return '';
    return `<div class="aviso instalar">${I('compartir', 22)}<div style="flex:1">Para tenerla como app: ${ios ? 'tocá <b>Compartir</b> y <b>“Agregar a inicio”</b>' : 'menú <b>⋮</b> → <b>“Instalar app”</b>'}.</div><button class="mini" data-acc="noInstalar" aria-label="Cerrar">${I('cruz', 16)}</button></div>`;
  }

  // ---------- farmacias y listado (de "Mi Agenda")
  function hFarmacias(lista) {
    return () => `${btnCerrar}<h2>Farmacias</h2><div class="sub">Marcá con ★ las nuestras. “Corto” es como se ve en el calendario del mes.</div>
      ${lista.map((x, k) => `<div class="bloque" style="padding:10px"><div class="flex"><input class="in" data-fk="${k}" data-campo="nombre" value="${esc(x.nombre)}" placeholder="Nombre" style="flex:2">
        <input class="in" data-fk="${k}" data-campo="corto" value="${esc(x.corto || '')}" placeholder="Corto" style="flex:1.2" maxlength="10"></div>
        <div class="flex" style="margin-top:6px"><label class="chk" style="margin:0"><input type="checkbox" data-fk="${k}" data-campo="nuestra" ${x.nuestra ? 'checked' : ''}> ★ Nuestra</label><span class="sp"></span>
        ${x.id ? '' : `<button class="mini rojo" data-acc="farmX" data-k="${k}" aria-label="Quitar">${I('basura', 18)}</button>`}</div></div>`).join('')}
      <div class="botones"><button class="btn sec" data-acc="farmMas">${I('mas_', 18)} Agregar farmacia</button></div>
      <div class="error" id="fErr"></div>
      <div class="botones"><button class="btn" data-acc="farmGuardar">Guardar</button></div>`;
  }
  function leerFarmacias(lista) { $$('#hoja [data-fk]').forEach(el => { const x = lista[+el.dataset.fk]; if (!x) return; x[el.dataset.campo] = el.type === 'checkbox' ? el.checked : el.value; }); }
  function hListado(s) {
    return () => {
      const prev = s.desde ? A.info(s.desde) : null;
      return `${btnCerrar}<h2>Listado de turnos nuevo</h2><div class="sub">Cuando sale el listado nuevo (o cambia el orden), cargalo desde el día que empieza.</div>
        <label class="l">Empieza el</label><input class="in" type="date" id="lD" value="${s.desde}">
        ${prev ? `<div class="ayuda">Con el listado actual ese día está ${esc(nombreF(prev.oficial))}.</div>` : ''}
        <label class="l">Orden (el primero es el de ese día)</label>
        ${s.orden.map((id, k) => `<div class="orden"><span class="nro">${k + 1}</span><span>${A.esNuestra(id) ? `<b class="col-${claseF(id)}">${esc(nombreF(id))}</b>` : esc(nombreF(id))}</span>
          <button class="mini" data-acc="ordMov" data-k="${k}" data-d="-1" ${k ? '' : 'disabled'} aria-label="Subir">${I('arriba', 18)}</button><button class="mini" data-acc="ordMov" data-k="${k}" data-d="1" ${k < s.orden.length - 1 ? '' : 'disabled'} aria-label="Bajar">${I('abajo', 18)}</button>
          <button class="mini rojo" data-acc="ordX" data-k="${k}" aria-label="Sacar">${I('cruz', 16)}</button></div>`).join('')}
        ${A.E.farmacias.filter(x => !s.orden.includes(x.id)).map(x => `<button class="btn sec chico" style="margin:6px 6px 0 0" data-acc="ordAdd" data-id="${x.id}">${I('mas_', 15)} ${esc(x.nombre)}</button>`).join('')}
        <label class="l">Confirmado hasta</label><input class="in" type="date" id="lC" value="${s.hasta}">
        <div class="ayuda"><b>Así quedan los primeros días:</b><br>${s.orden.slice(0, 8).map((id, k) => s.desde ? `${F.fechaCorta(F.sumar(s.desde, k))} ${esc(nombreF(id))}` : '').join(' · ')}</div>
        <div class="error" id="lErr"></div>
        <div class="botones"><button class="btn" data-acc="listadoGuardar">Guardar listado</button></div>
        ${A.E.rotaciones.length > 1 ? `<div class="botones">${A.E.rotaciones.map(r => `<button class="btn peligro chico" data-acc="listadoX" data-d="${r.desde}">Borrar listado del ${F.fechaCorta(r.desde)}/${r.desde.slice(2, 4)}</button>`).join('')}</div>` : ''}`;
    };
  }
  function hConfirmar() {
    return () => `${btnCerrar}<h2>Confirmado hasta</h2><div class="sub">Hasta qué día está el listado en papel. Después se calcula siguiendo la rotación y se marca “a confirmar”.</div>
      <input class="in" type="date" id="cC" value="${A.E.confirmadoHasta}"><div class="error" id="ccErr"></div>
      <div class="botones"><button class="btn" data-acc="confirmarGuardar">Guardar</button></div>`;
  }

  // ---------- archivos (copia y calendario)
  async function darArchivo(nombre, texto, tipo, compartir) {
    const blob = new Blob([texto], { type: tipo });
    if (compartir) {
      try { const file = new File([blob], nombre, { type: tipo }); if (navigator.canShare && navigator.canShare({ files: [file] })) { await navigator.share({ files: [file], title: nombre }); return true; } }
      catch (e) { if (e && e.name === 'AbortError') return false; }
    }
    const u = URL.createObjectURL(blob), a = document.createElement('a'); a.href = u; a.download = nombre; document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(u), 30000); return true;
  }
  const alCalendario = (nombre, txt) => { darArchivo(nombre, txt, 'text/calendar', false); toast('Abrí el archivo y tocá “Agregar” en el calendario'); };

  // =================== pintar
  const PANT = { inicio: ['Inicio', 'inicio', pInicio], turnos: ['Turnos', 'mes', pTurnos], gastos: ['Gastos', 'plata', pGastos], vacaciones: ['Vacaciones', 'playa', pVacaciones], mas: ['Más', 'mas', pMas] };
  function pintar() {
    HOY = F.hoyLocal();
    if (!PANT[V.pant]) V.pant = 'inicio';
    $('#main').innerHTML = PANT[V.pant][2](); enganchar($('#main'));
    $('#tabs').innerHTML = '<div class="in-tabs">' + Object.entries(PANT).map(([k, v]) => `<button class="${k === V.pant ? 'act' : ''}" data-acc="ir" data-p="${k}">${I(v[1], 23)}<span>${v[0]}</span></button>`).join('') + '</div>';
    enganchar($('#tabs'));
  }
  function ir(p) { V.pant = p; try { sessionStorage.setItem('roma_pant', p); } catch (e) {} pintar(); window.scrollTo(0, 0); }
  const repintar = () => { const s = window.scrollY; pintar(); window.scrollTo(0, s); };

  // =================== acciones
  let selCambio = {}, farmLista = null, lst = null, vSel = {};
  const leerVac = () => { const d = $('#vD'), h = $('#vH'), n = $('#vN'); if (d) vSel.desde = d.value; if (h) vSel.hasta = h.value; if (n) vSel.nota = n.value; };
  const ACC = {
    ir: d => ir(d.p), cerrar: () => cerrar(),
    dia: d => abrir(hDia(d.f)),
    vista: d => { V.vista = d.v; try { sessionStorage.setItem('roma_vista', d.v); } catch (e) {} repintar(); },
    mes: d => { V.mes = masMes(V.mes, +d.d); pintar(); }, mesHoy: () => { V.mes = HOY.slice(0, 7); pintar(); },
    sem: d => { V.lunes = F.sumar(V.lunes, +d.d); pintar(); }, semHoy: () => { V.lunes = F.lunesDe(HOY); pintar(); },
    ver: d => { A.setCfg('verTodas', d.v === '1'); repintar(); },
    mia: d => { A.setCfg('mia', d.v); repintar(); },
    noInstalar: () => { try { localStorage.setItem('rofac_roma_instalar', '1'); } catch (e) {} repintar(); },
    // guardias
    cambiar: d => { const i = A.info(d.f); selCambio = { quien: i.turno, inter: !!(i.cambio && i.cambio.par), par: i.cambio && i.cambio.par || '', nota: null }; abrir(hCambiar(d.f, selCambio)); },
    elegir: d => { guardarNotaCambio(); selCambio.quien = d.id; selCambio.par = ''; const f = $('#hoja [data-acc=guardarCambio]').dataset.f; abrir(hCambiar(f, selCambio)); },
    inter: (d, el) => { selCambio.inter = el.checked; $('#cInterBox').classList.toggle('oculto', !el.checked); },
    sugPar: (d, el) => { selCambio.par = d.g; $('#cPar').value = d.g; $$('#hoja .sug button').forEach(b => b.classList.toggle('act', b === el)); },
    guardarCambio: d => {
      const par = selCambio.inter && $('#cPar') ? $('#cPar').value : '';
      if (selCambio.inter && $('#cPar') && !par) { $('#cErr').textContent = 'Elegí qué día nos devuelve la guardia'; return; }
      try { A.cambiar(d.f, selCambio.quien, $('#cNota').value, par || null); } catch (e) { $('#cErr').textContent = e.message; return; }
      toast('Guardia cambiada', true); repintar(); abrir(hDia(d.f));
    },
    original: d => { A.volverOriginal(d.f); toast('Volvió a como está en el listado', true); repintar(); refrescarHoja(); },
    icsGuardias: () => { const h = A.E.confirmadoHasta > HOY ? A.E.confirmadoHasta : F.sumar(HOY, 60), n = A.guardiasNuestras(HOY, h).filter(i => !mia() || i.turno === mia()).length;
      if (!n) return toast('No hay guardias para pasar', false, true); alCalendario('guardias.ics', A.icsGuardias(HOY, h, mia())); },
    // gastos
    gmes: d => { V.gmes = masMes(V.gmes, +d.d); pintar(); }, gmesHoy: () => { V.gmes = HOY.slice(0, 7); pintar(); },
    nuevoGasto: () => { gSel = { cat: 'comida', medio: 'Efectivo' }; abrir(hGasto({ fecha: V.pant === 'gastos' && V.gmes !== HOY.slice(0, 7) ? V.gmes + '-01' : HOY })); setTimeout(() => { const m = $('#gM'); m && m.focus(); }, 80); },
    editGasto: d => { const g = A.E.gastos.find(x => x.id === d.id); if (!g) return; gSel = { cat: g.cat, medio: g.medio }; abrir(hGasto(g)); },
    nuevaAnot: d => { aSel = { tipo: 'medico', anual: false }; abrir(hAnot({ fecha: d.f || HOY })); setTimeout(() => { const t = $('#aT'); t && t.focus(); }, 80); },
    editAnot: d => { const a = A.E.anot.find(x => x.id === d.id); if (!a) return; aSel = { tipo: a.tipo, anual: a.anual }; abrir(hAnot(a)); },
    aTipo: (d, el) => { aSel.tipo = d.v; $$('#hoja .tipos button').forEach(b => b.classList.toggle('act', b === el)); if (d.v === 'cumple') { const c = $('#aA'); if (c) c.checked = true; } },
    guardarAnot: d => {
      let a; try { a = A.guardarAnot({ id: d.id || null, tipo: aSel.tipo, titulo: $('#aT').value, fecha: $('#aF').value, hora: $('#aH').value, anual: $('#aA').checked, nota: $('#aN').value }); }
      catch (e) { $('#aErr').textContent = e.message; return; }
      cerrar(); repintar(); toast(d.id ? 'Anotación guardada' : 'Anotado', true);
      if (d.ics) alCalendario('anotacion.ics', A.icsAnot(a));
    },
    borrarAnot: d => { A.borrarAnot(d.id); cerrar(); repintar(); toast('Anotación borrada', true); },
    gCat: (d, el) => { gSel.cat = d.v; $$('#hoja .cats button').forEach(b => b.classList.toggle('act', b === el)); },
    guardarGasto: d => {
      let g; try { g = A.guardarGasto({ id: d.id || null, monto: $('#gM').value, cat: gSel.cat, desc: $('#gD').value, fecha: $('#gF').value, medio: $('#gP').value }); }
      catch (e) { $('#gErr').textContent = e.message; return; }
      cerrar(); if (V.pant === 'gastos') V.gmes = g.fecha.slice(0, 7); repintar(); toast(d.id ? 'Gasto guardado' : 'Gasto anotado: ' + plata(g.monto), true);
    },
    borrarGasto: d => { A.borrarGasto(d.id); cerrar(); repintar(); toast('Gasto borrado', true); },
    // vacaciones
    vanio: d => { V.vanio += +d.d; pintar(); },
    nuevaVac: () => { vSel = { anio: V.vanio }; abrir(hVac(vSel)); },
    editVac: d => { const v = A.E.vac.lista.find(x => x.id === d.id); if (!v) return; vSel = { ...v }; abrir(hVac(vSel)); },
    vAnio: d => { leerVac(); vSel.anio = +d.v; vSel.anioTocado = true; abrir(hVac(vSel)); },
    guardarVac: d => {
      leerVac(); const v = { id: d.id || null, desde: vSel.desde, hasta: vSel.hasta, anio: vSel.anio, nota: vSel.nota };
      let r; try { r = A.revisarVac(v); } catch (e) { $('#vErr').textContent = e.message; return; }
      if (r.avisos.length && !d.forzar) { abrir(hVac(vSel, r.avisos)); return; }
      try { A.guardarVac(v); } catch (e) { $('#vErr').textContent = e.message; return; }
      cerrar(); V.vanio = +v.anio || +v.desde.slice(0, 4); repintar(); toast(`Vacaciones guardadas: ${r.dias} día${r.dias > 1 ? 's' : ''}`, true);
    },
    borrarVac: d => { A.borrarVac(d.id); cerrar(); repintar(); toast('Vacaciones borradas', true); },
    icsVac: d => { const v = A.E.vac.lista.find(x => x.id === d.id); if (v) alCalendario('vacaciones.ics', A.icsVac(v)); },
    vacDias: () => abrir(hVacDias()),
    vcSug: d => { $('#vcN').value = d.v; },
    vcGuardar: d => { try { A.setCorresponden(V.vanio, $('#vcN').value, !!d.todos); } catch (e) { $('#vcErr').textContent = e.message; return; } cerrar(); repintar(); toast('Guardado', true); },
    // más
    farmacias: () => { farmLista = A.E.farmacias.map(x => ({ ...x })); abrir(hFarmacias(farmLista)); },
    farmMas: () => { leerFarmacias(farmLista); farmLista.push({ nombre: '', corto: '' }); abrir(hFarmacias(farmLista)); },
    farmX: d => { leerFarmacias(farmLista); farmLista.splice(+d.k, 1); abrir(hFarmacias(farmLista)); },
    farmGuardar: () => { leerFarmacias(farmLista); try { A.guardarFarmacias(farmLista.map(x => ({ ...x }))); } catch (e) { $('#fErr').textContent = e.message; return; } cerrar(); repintar(); toast('Farmacias guardadas', true); },
    listado: () => { const desde = F.sumar(A.E.confirmadoHasta, 1), r = A.E.rotaciones[A.E.rotaciones.length - 1], of = A.oficial(desde), k = r.orden.indexOf(of);
      lst = { desde, orden: r.orden.slice(k).concat(r.orden.slice(0, k)), hasta: F.sumar(desde, 364) }; abrir(hListado(lst)); },
    ordMov: d => { leerListado(); const k = +d.k, j = k + +d.d; [lst.orden[k], lst.orden[j]] = [lst.orden[j], lst.orden[k]]; abrir(hListado(lst)); },
    ordX: d => { leerListado(); lst.orden.splice(+d.k, 1); abrir(hListado(lst)); },
    ordAdd: d => { leerListado(); lst.orden.push(d.id); abrir(hListado(lst)); },
    listadoGuardar: () => { leerListado(); try { A.nuevoListado(lst.desde, lst.orden, lst.hasta); } catch (e) { $('#lErr').textContent = e.message; return; } cerrar(); repintar(); toast('Listado guardado', true); },
    listadoX: d => { try { A.borrarListado(d.d); } catch (e) { $('#lErr').textContent = e.message; return; } cerrar(); repintar(); toast('Listado borrado', true); },
    confirmar: () => abrir(hConfirmar()),
    licNueva: () => abrir(() => `${btnCerrar}<h2>Cargar clave nueva</h2><div class="ayuda">Código de este celular: <b>${RomaLic.equipo()}</b></div>
      <label class="l" for="licC">Clave que te pasó Rodrigo</label><textarea class="in" id="licC" rows="3" placeholder="ROM-2028…" autocomplete="off" autocapitalize="characters" spellcheck="false"></textarea>
      <div class="error" id="licErr"></div><div class="botones"><button class="btn" data-acc="licGuardar">Activar</button><button class="btn sec" data-acc="cerrar">Cancelar</button></div>`),
    licGuardar: async () => { const err = await RomaLic.activar($('#licC').value); if (err) { $('#licErr').textContent = err; return; } cerrar(); repintar(); toast(RomaLic.vence() === '99991231' ? 'Activada sin vencimiento' : 'Activada hasta el ' + RomaLic.fechaTxt(RomaLic.vence())); },
    confirmarGuardar: () => { try { A.setConfirmado($('#cC').value); } catch (e) { $('#ccErr').textContent = e.message; return; } cerrar(); repintar(); toast('Guardado', true); },
    copia: async () => { const ok = await darArchivo('roma-copia-' + HOY + '.json', A.exportar(), 'application/json', true); if (ok) { A.setCfg('ultimaCopia', HOY); repintar(); toast('Copia guardada'); } },
  };
  function guardarNotaCambio() { const n = $('#cNota'); if (n) selCambio.nota = n.value; const p = $('#cPar'); if (p) selCambio.par = p.value; }
  function leerListado() { const d = $('#lD'), c = $('#lC'); if (d) lst.desde = d.value; if (c) lst.hasta = c.value; }

  function enganchar(raiz) {
    raiz.querySelectorAll('[data-acc]').forEach(el => {
      const acc = el.dataset.acc;
      if (acc === 'restaurar') return el.addEventListener('change', async () => {
        const f = el.files[0]; if (!f) return; const t = await f.text();
        if (!confirm('¿Reemplazar todo lo de la app por esta copia?')) { el.value = ''; return; }
        try { A.importar(t); toast('Copia restaurada', true); } catch (e) { toast(e.message, false, true); }
        el.value = ''; repintar();
      });
      if (acc === 'inter') return el.addEventListener('change', () => ACC.inter(el.dataset, el));
      el.addEventListener('click', e => { if (!ACC[acc]) return; if (el.tagName !== 'INPUT') e.preventDefault(); e.stopPropagation(); ACC[acc](el.dataset, el); });
    });
    raiz.querySelectorAll('#cPar').forEach(el => el.addEventListener('change', () => { selCambio.par = el.value; $$('#hoja .sug button').forEach(b => b.classList.toggle('act', b.dataset.g === el.value)); }));
    raiz.querySelectorAll('#lD').forEach(el => el.addEventListener('change', () => { leerListado(); abrir(hListado(lst)); }));
    // vacaciones: al elegir las fechas se cuentan los días y se propone a cuenta de qué año
    raiz.querySelectorAll('#vD, #vH').forEach(el => el.addEventListener('change', () => {
      leerVac();
      if (el.id === 'vD' && F.valida(vSel.desde || '') && (!vSel.hasta || vSel.hasta < vSel.desde)) vSel.hasta = F.sumar(vSel.desde, A.E.vac.porAnio > 0 ? Math.min(13, A.E.vac.porAnio - 1) : 0);
      if (F.valida(vSel.desde || '') && !vSel.anioTocado) vSel.anio = A.anioSugerido(vSel.desde, vSel.id);
      abrir(hVac(vSel));
    }));
    raiz.querySelectorAll('#mNom').forEach(el => el.addEventListener('change', () => { A.setCfg('nombre', el.value.trim().slice(0, 40)); toast('Guardado'); }));
    raiz.querySelectorAll('#gM').forEach(el => el.addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); ACC.guardarGasto(raiz.querySelector('[data-acc=guardarGasto]').dataset); } }));
  }

  // al volver a la app otro día, se actualiza "hoy"
  document.addEventListener('visibilitychange', () => { if (!document.hidden && F.hoyLocal() !== HOY) { V.lunes = F.lunesDe(F.hoyLocal()); V.mes = F.hoyLocal().slice(0, 7); V.gmes = V.mes; pintar(); } });
  window.RomaApp = { A, pintar, ir };
  // sólo anda si este celular está activado (clave de Rodrigo)
  RomaLic.revisar().then(ok => {
    if (!ok) return RomaLic.pantalla(() => { pintar(); toast('¡Listo! ' + (RomaLic.vence() === '99991231' ? 'App activada sin vencimiento' : 'App activada hasta el ' + RomaLic.fechaTxt(RomaLic.vence()))); });
    pintar();
    const n = RomaLic.dias(); if (n != null && n <= 20) toast(n === 0 ? 'La activación vence HOY: pedile una clave nueva a Rodrigo' : 'La activación vence en ' + n + ' día' + (n > 1 ? 's' : '') + ': pedile una clave nueva a Rodrigo', false, true);
  });
  if ('serviceWorker' in navigator && location.protocol !== 'file:') navigator.serviceWorker.register('sw.js').catch(() => {});
})();
