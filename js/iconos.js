/* Íconos de la app (los mismos de "Mi Agenda" + gastos y vacaciones). SVG propios. */
(function () {
  const ICONOS = {
    hoy: '<path d="M12 3v2M12 19v2M3 12h2M19 12h2M5.6 5.6l1.4 1.4M17 17l1.4 1.4M5.6 18.4 7 17M17 7l1.4-1.4"/><circle cx="12" cy="12" r="4"/>',
    mes: '<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18M8 3v4M16 3v4"/><circle cx="8" cy="14.5" r=".6"/><circle cx="12" cy="14.5" r=".6"/><circle cx="16" cy="14.5" r=".6"/><circle cx="8" cy="18" r=".6"/><circle cx="12" cy="18" r=".6"/>',
    semana: '<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18M8 3v4M16 3v4M7 14h10M7 17.5h6"/>',
    recordar: '<path d="M6 9a6 6 0 0 1 12 0c0 6 2.5 7.5 2.5 7.5h-17S6 15 6 9"/><path d="M10 20a2 2 0 0 0 4 0"/>',
    mas: '<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.6 1.6 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.6 1.6 0 0 0-2.7 1.1V21a2 2 0 1 1-4 0v-.1A1.6 1.6 0 0 0 7.4 19.4l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.6 1.6 0 0 0-1.1-2.7H3a2 2 0 1 1 0-4h.1A1.6 1.6 0 0 0 4.6 7.4l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.6 1.6 0 0 0 1.8.3H9a1.6 1.6 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.6 1.6 0 0 0 1 1.5 1.6 1.6 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.6 1.6 0 0 0-.3 1.8V9a1.6 1.6 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.6 1.6 0 0 0-1.5 1z"/>',
    mas_: '<path d="M12 5v14M5 12h14"/>',
    paleta: '<path d="M12 3a9 9 0 1 0 0 18c1.1 0 1.7-.9 1.4-1.9-.3-.9.3-1.9 1.3-1.9H17a4 4 0 0 0 4-4c0-5.5-4-10.2-9-10.2z"/><circle cx="7.5" cy="11" r="1.2"/><circle cx="10" cy="7" r="1.2"/><circle cx="15" cy="7" r="1.2"/>',
    izq: '<path d="M15 6l-6 6 6 6"/>', der: '<path d="M9 6l6 6-6 6"/>',
    cambio: '<path d="M4 8h13l-3-3M20 16H7l3 3"/>', lapiz: '<path d="M4 20h4L19 9l-4-4L4 16v4z"/>', basura: '<path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13"/>',
    cal: '<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18M8 3v4M16 3v4M12 13v5M9.5 15.5h5"/>', check: '<path d="M5 12l4.5 4.5L19 7"/>',
    cruz: '<path d="M6 6l12 12M18 6 6 18"/>', farmacia: '<path d="M10 3h4v7h7v4h-7v7h-4v-7H3v-4h7z"/>',
    guardar: '<path d="M12 3v12M7 10l5 5 5-5M4 19h16"/>', subir: '<path d="M12 17V5M7 10l5-5 5 5M4 19h16"/>', arriba: '<path d="M6 15l6-6 6 6"/>', abajo: '<path d="M6 9l6 6 6-6"/>',
    inicio: '<path d="M4 11l8-7 8 7v9a1 1 0 0 1-1 1h-4v-6h-6v6H5a1 1 0 0 1-1-1z"/>',
    midia: '<rect x="5" y="4" width="14" height="17" rx="2"/><path d="M9 3v3M15 3v3M8.5 11.5l1.5 1.5 3-3M8.5 16.5h7"/>',
    estetos: '<path d="M6 3v6a5 5 0 0 0 10 0V3"/><path d="M4 3h4M14 3h4M11 14v2a5 5 0 0 0 10 0v-2"/><circle cx="21" cy="12" r="2"/>',
    tareas: '<rect x="4" y="3" width="16" height="18" rx="2"/><path d="M8 8l1.5 1.5L12 7M14 8.5h3M8 13l1.5 1.5L12 12M14 13.5h3M8 18h9"/>',
    libreta: '<path d="M6 3h11a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6z"/><path d="M6 3v18M4 7h4M4 12h4M4 17h4M10 8h6M10 11h4"/>',
    brote: '<path d="M12 21v-8M12 13c0-4-3-6-7-6 0 4 3 6 7 6zM12 11c0-4 3-6 7-6 0 4-3 6-7 6z"/>',
    diana: '<circle cx="12" cy="12" r="8"/><circle cx="12" cy="12" r="4.5"/><circle cx="12" cy="12" r="1"/><path d="M13 11l7-7M17 4h3v3"/>',
    guardia: '<rect x="4" y="4" width="16" height="16" rx="4"/><path d="M12 8v8M8 12h8"/>',
    fijar: '<path d="M9 4h6l-1 5 3 3H7l3-3zM12 15v6"/>',
    compartir: '<path d="M12 15V3M7 8l5-5 5 5"/><path d="M5 12v7a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-7"/>',

    plata: '<rect x="3" y="6" width="18" height="12" rx="2"/><circle cx="12" cy="12" r="2.6"/><path d="M6.5 9.5v5M17.5 9.5v5"/>',
    playa: '<path d="M4 20h16"/><path d="M12 20 9 9"/><path d="M4.5 10.5C6 6 11 4.5 15 6.5c-3 .4-5.3 1.7-6.3 3.3C7.4 9 5.8 9.4 4.5 10.5z"/><circle cx="18.5" cy="5.5" r="2"/>',
    lista: '<path d="M9 6h11M9 12h11M9 18h11"/><circle cx="4.5" cy="6" r="1.2"/><circle cx="4.5" cy="12" r="1.2"/><circle cx="4.5" cy="18" r="1.2"/>',
    torta: '<path d="M12 3a9 9 0 1 0 9 9h-9z"/><path d="M14.5 3.4A9 9 0 0 1 20.6 9.5H14.5z"/>',
    usuario: '<circle cx="12" cy="8" r="4"/><path d="M4 21c1.5-4 4.5-6 8-6s6.5 2 8 6"/>',
  };
  const icono = (n, t = 22) => `<svg viewBox="0 0 24 24" width="${t}" height="${t}" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICONOS[n] || ''}</svg>`;
  window.Icono = icono;
})();
