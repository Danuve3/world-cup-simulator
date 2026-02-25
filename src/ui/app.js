import { el, flag, getEditionYear } from './components.js';
import { navigate, getCurrentRoute } from './router.js';
import { getNotifPermission, requestNotifPermission, getNotifPrefs, setNotifPref } from '../notifications.js';

const SUN_ICON = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>';
const MOON_ICON = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>';

function initTheme() {
  const saved = localStorage.getItem('theme');
  if (saved === 'light') {
    document.documentElement.classList.add('light');
  }
}

function toggleTheme() {
  const html = document.documentElement;
  html.classList.toggle('light');
  localStorage.setItem('theme', html.classList.contains('light') ? 'light' : 'dark');
  updateThemeIcons();
}

function updateThemeIcons() {
  const isLight = document.documentElement.classList.contains('light');
  document.querySelectorAll('.theme-toggle-icon').forEach(el => {
    el.innerHTML = isLight ? MOON_ICON : SUN_ICON;
  });
}

initTheme();

const NAV_ITEMS = [
  { path: '/', label: 'En Vivo', icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><polygon points="10,8 16,12 10,16"/></svg>' },
  { path: '/groups', label: 'Grupos', icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/></svg>' },
  { path: '/bracket', label: 'Bracket', icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M4 4v4h4"/><path d="M4 8h8v4"/><path d="M4 16v-4h4"/><path d="M4 12h8v4"/><path d="M12 10h4v2"/><path d="M12 14h4v-2"/><path d="M16 12h4"/></svg>' },
  { path: '/teams', label: 'Plantillas', icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>' },
  { path: '/history', label: 'Historial', icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12,6 12,12 16,14"/></svg>' },
  { path: '/stats', label: 'Stats', icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="12" width="4" height="8" rx="1"/><rect x="10" y="8" width="4" height="12" rx="1"/><rect x="17" y="4" width="4" height="16" rx="1"/></svg>' },
];

const BELL_ICON = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>';

/**
 * Sidebar notification button — updates itself in place when permission changes.
 */
function createNotifSidebarBtn() {
  if (!('Notification' in window)) return null;

  const btn = el('button', { className: 'nav-item w-full text-left' });

  btn.addEventListener('click', async () => {
    if (getNotifPermission() === 'default') {
      await requestNotifPermission();
      render();
    }
  });

  function render() {
    btn.innerHTML = '';
    const perm = getNotifPermission();
    btn.appendChild(el('span', { html: BELL_ICON, className: 'w-5 h-5 shrink-0' }));
    if (perm === 'granted') {
      btn.appendChild(el('span', { text: 'Notificaciones', className: 'text-sm flex-1' }));
      btn.appendChild(el('span', { text: 'ON', className: 'text-[10px] font-bold text-accent ml-auto' }));
    } else if (perm === 'denied') {
      btn.appendChild(el('span', { text: 'Notificaciones', className: 'text-sm flex-1 text-text-muted' }));
      btn.appendChild(el('span', { text: 'BLQ', className: 'text-[10px] font-bold text-live/60 ml-auto' }));
    } else {
      btn.appendChild(el('span', { text: 'Notificaciones', className: 'text-sm' }));
    }
  }

  render();
  return btn;
}

/**
 * Create the app shell.
 */
export function createAppShell() {
  const app = document.getElementById('app');
  app.innerHTML = '';

  const sidebar = createSidebar();

  const contentWrapper = el('div', {
    className: 'flex flex-col flex-1 min-h-dvh lg:min-h-0 overflow-hidden',
    children: [
      createHeader(),
      el('main', {
        id: 'main-content',
        className: 'flex-1 overflow-y-auto px-4 py-5 pb-24 lg:pb-6 lg:px-8',
        children: [
          el('div', { id: 'main-inner', className: 'max-w-[1200px] mx-auto w-full' }),
        ],
      }),
    ],
  });

  const bottomNav = createBottomNav();

  app.appendChild(sidebar);
  app.appendChild(contentWrapper);
  app.appendChild(bottomNav);

  return document.getElementById('main-inner');
}

function createSidebar() {
  return el('aside', {
    id: 'sidebar',
    className: 'hidden lg:flex flex-col w-[240px] shrink-0 border-r border-border-default bg-bg-sidebar p-5 gap-1',
    children: [
      // Logo
      el('div', {
        className: 'flex items-center gap-3 px-3 py-3 mb-6 cursor-pointer',
        events: { click: () => navigate('/') },
        children: [
          el('span', { text: '\u26bd', className: 'text-xl' }),
          el('div', {
            children: [
              el('div', { className: 'flex items-center gap-1.5 leading-tight', children: [
                el('span', { text: 'World Cup', className: 'text-base font-bold' }),
                ...(import.meta.env.DEV ? [el('span', { text: 'Dev', className: 'text-[10px] font-bold bg-red-600 text-white px-1 py-px rounded' })] : []),
              ] }),
              el('span', { text: 'Simulator', className: 'text-[11px] text-text-muted block' }),
            ],
          }),
        ],
      }),
      // Nav
      ...NAV_ITEMS.map(item =>
        el('button', {
          className: 'nav-item sidebar-nav-btn w-full text-left',
          attrs: { 'data-path': item.path },
          events: { click: () => navigate(item.path) },
          children: [
            el('span', { html: item.icon, className: 'w-5 h-5 shrink-0' }),
            el('span', { text: item.label }),
          ],
        })
      ),
      el('div', { className: 'flex-1' }),
      // Footer
      el('div', {
        id: 'sidebar-footer',
        className: 'px-3 py-3 text-xs text-text-muted border-t border-border-default mt-2',
      }),
      createNotifSidebarBtn(),
      el('button', {
        className: 'nav-item w-full text-left mt-1',
        events: { click: toggleTheme },
        children: [
          el('span', {
            html: document.documentElement.classList.contains('light') ? MOON_ICON : SUN_ICON,
            className: 'w-5 h-5 shrink-0 theme-toggle-icon',
          }),
          el('span', { text: 'Cambiar tema', className: 'text-sm' }),
        ],
      }),
      el('button', {
        className: 'nav-item w-full text-left',
        events: { click: openMenu },
        children: [
          el('span', {
            html: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>',
            className: 'w-5 h-5 shrink-0',
          }),
          el('span', { text: '¿Qué es esto?', className: 'text-sm' }),
        ],
      }),
    ],
  });
}

function createHeader() {
  return el('header', {
    id: 'app-header',
    className: 'lg:hidden sticky top-0 z-50 glass-header border-b border-border-default px-4 py-3',
    children: [
      el('div', {
        className: 'flex items-center justify-between',
        children: [
          el('div', {
            className: 'flex items-center gap-1.5 cursor-pointer',
            events: { click: () => navigate('/') },
            children: [
              el('span', { text: '\u26bd', className: 'text-lg animate-spin-slow' }),
              el('div', {
                className: 'flex flex-col',
                children: [
                  el('div', { className: 'flex items-center gap-1 leading-tight', children: [
                    el('span', { text: 'World Cup', className: 'text-xs font-semibold' }),
                    ...(import.meta.env.DEV ? [el('span', { text: 'Dev', className: 'text-[9px] font-bold bg-red-600 text-white px-1 py-px rounded' })] : []),
                  ] }),
                  el('span', { text: 'Simulator', className: 'text-[9px] text-accent leading-tight uppercase font-medium w-full block tracking-[0.1em]', style: { textAlign: 'justify', textAlignLast: 'justify' } }),
                ],
              }),
            ],
          }),
          el('div', {
            className: 'flex items-center gap-2.5',
            children: [
              el('div', { id: 'header-info', className: 'flex items-center gap-2.5' }),
              el('button', {
                className: 'w-8 h-8 flex items-center justify-center rounded-lg text-text-muted hover:text-text-primary hover:bg-bg-hover transition-colors',
                events: { click: openMenu },
                children: [
                  el('span', {
                    html: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/></svg>',
                    className: 'w-5 h-5',
                  }),
                ],
              }),
            ],
          }),
        ],
      }),
    ],
  });
}

/* ── Hamburger menu ── */

let menuPanelEl = null;

function openMenu() {
  if (menuPanelEl) return;
  menuPanelEl = buildMenuPanel();
  document.body.appendChild(menuPanelEl);
  requestAnimationFrame(() => {
    const inner = menuPanelEl.querySelector('#menu-inner');
    if (inner) inner.style.transform = 'translateX(0)';
  });
}

function closeMenu() {
  if (!menuPanelEl) return;
  const inner = menuPanelEl.querySelector('#menu-inner');
  if (inner) inner.style.transform = 'translateX(100%)';
  setTimeout(() => { menuPanelEl?.remove(); menuPanelEl = null; }, 260);
}

function buildNotifMenuSection() {
  if (!('Notification' in window)) return null;

  const perm = getNotifPermission();
  const sectionStyle = { padding: '8px 12px', borderBottom: '1px solid var(--color-border-subtle)' };
  const labelStyle = { fontSize: '11px', fontWeight: '700', color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '6px', padding: '4px 8px 0' };

  if (perm === 'denied') {
    return el('div', { style: sectionStyle, children: [
      el('p', { text: 'NOTIFICACIONES', style: labelStyle }),
      el('p', { text: '🔕 Bloqueadas en el navegador', style: { fontSize: '12px', color: 'var(--color-text-muted)', padding: '4px 8px 8px' } }),
    ] });
  }

  if (perm === 'default') {
    return el('div', { style: sectionStyle, children: [
      el('button', {
        style: { display: 'flex', alignItems: 'center', gap: '12px', width: '100%', padding: '10px 8px', borderRadius: '10px', cursor: 'pointer', textAlign: 'left' },
        events: { click: async () => { await requestNotifPermission(); closeMenu(); } },
        children: [
          el('span', { html: BELL_ICON, style: { width: '20px', height: '20px', display: 'block', color: 'var(--color-text-secondary)', flexShrink: '0' } }),
          el('div', { children: [
            el('div', { text: 'Activar notificaciones', style: { fontSize: '14px', fontWeight: '500' } }),
            el('div', { text: 'Goles, fin de partido y campeón', style: { fontSize: '11px', color: 'var(--color-text-muted)', marginTop: '1px' } }),
          ] }),
        ],
      }),
    ] });
  }

  // granted — show per-type toggles
  const TYPES = [
    { key: 'goals', label: '⚽ Goles' },
    { key: 'matchEnd', label: '🏁 Fin de partido' },
    { key: 'champion', label: '🏆 Campeón' },
  ];

  return el('div', { style: sectionStyle, children: [
    el('p', { text: 'NOTIFICACIONES', style: labelStyle }),
    ...TYPES.map(({ key, label }) => {
      const prefs = getNotifPrefs();
      let active = prefs[key];

      const badge = el('span', {
        text: active ? 'ON' : 'OFF',
        style: { fontSize: '11px', fontWeight: '700', color: active ? 'var(--color-accent)' : 'var(--color-text-muted)' },
      });

      return el('div', {
        style: { display: 'flex', alignItems: 'center', gap: '10px', padding: '8px', borderRadius: '8px', cursor: 'pointer' },
        events: { click: () => {
          active = !active;
          setNotifPref(key, active);
          badge.textContent = active ? 'ON' : 'OFF';
          badge.style.color = active ? 'var(--color-accent)' : 'var(--color-text-muted)';
        } },
        children: [
          el('span', { text: label, style: { fontSize: '13px', flex: '1' } }),
          badge,
        ],
      });
    }),
  ] });
}

function buildMenuPanel() {
  const isLight = document.documentElement.classList.contains('light');

  // Backdrop
  const backdrop = el('div', {
    style: { position: 'fixed', inset: '0', background: 'rgba(0,0,0,0.45)', zIndex: '0' },
    events: { click: closeMenu },
  });

  // Slide panel
  const panel = el('div', {
    id: 'menu-inner',
    style: {
      position: 'absolute', top: '0', right: '0', bottom: '0',
      width: '300px', maxWidth: '88vw',
      background: 'var(--color-bg-card)',
      borderLeft: '1px solid var(--color-border-default)',
      display: 'flex', flexDirection: 'column',
      transform: 'translateX(100%)',
      transition: 'transform 0.24s cubic-bezier(0.4,0,0.2,1)',
      zIndex: '1',
      overflowY: 'auto',
    },
    children: [
      // Header
      el('div', {
        style: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 20px', borderBottom: '1px solid var(--color-border-default)' },
        children: [
          el('div', {
            style: { display: 'flex', alignItems: 'center', gap: '8px' },
            children: [
              el('span', { text: '⚽', style: { fontSize: '18px' } }),
              el('span', { text: 'Menú', style: { fontWeight: '700', fontSize: '15px' } }),
            ],
          }),
          el('button', {
            style: { width: '32px', height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '8px', color: 'var(--color-text-muted)', cursor: 'pointer' },
            events: { click: closeMenu },
            children: [el('span', { html: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>', style: { width: '18px', height: '18px', display: 'block' } })],
          }),
        ],
      }),

      // Theme toggle
      el('div', { style: { padding: '8px 12px', borderBottom: '1px solid var(--color-border-subtle)' }, children: [
        el('button', {
          style: { display: 'flex', alignItems: 'center', gap: '12px', width: '100%', padding: '10px 8px', borderRadius: '10px', cursor: 'pointer', textAlign: 'left' },
          events: { click: () => { toggleTheme(); closeMenu(); } },
          children: [
            el('span', { html: isLight ? MOON_ICON : SUN_ICON, className: 'theme-toggle-icon', style: { width: '20px', height: '20px', display: 'block', color: 'var(--color-text-secondary)', flexShrink: '0' } }),
            el('div', {
              children: [
                el('div', { text: isLight ? 'Cambiar a modo oscuro' : 'Cambiar a modo claro', style: { fontSize: '14px', fontWeight: '500' } }),
                el('div', { text: isLight ? 'Actualmente en modo claro' : 'Actualmente en modo oscuro', style: { fontSize: '11px', color: 'var(--color-text-muted)', marginTop: '1px' } }),
              ],
            }),
          ],
        }),
      ] }),

      // Notifications section
      buildNotifMenuSection(),

      // "Qué es" section
      el('div', { style: { padding: '20px', flex: '1' }, children: [
        el('div', { style: { marginBottom: '14px' }, children: [
          el('p', { text: '¿Qué es World Cup Simulator?', style: { fontSize: '13px', fontWeight: '700', color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '10px' } }),
          el('p', { text: 'Una simulación continua y determinista de un Mundial de Fútbol ficticio. Los partidos ocurren en tiempo real: cada pocos días se completa un torneo entero, de la fase de grupos a la final.', style: { fontSize: '13px', lineHeight: '1.6', color: 'var(--color-text-secondary)', marginBottom: '12px' } }),
        ] }),

        el('div', { style: { display: 'flex', flexDirection: 'column', gap: '12px' }, children: [
          infoBlock('⏱️', 'Tiempo real', 'Cada ~8 días reales equivale a un Mundial completo. Los partidos avanzan minuto a minuto y puedes ver los goles en directo.'),
          infoBlock('🎲', 'Determinista', 'Los resultados no son aleatorios en cada recarga — están fijados por la fecha y hora. El mismo momento siempre produce el mismo partido.'),
          infoBlock('🌍', '32 selecciones', 'Participan 32 selecciones reales con plantillas ficticias generadas según el nivel histórico de cada país. Los grandes tienen estrellas; los pequeños, aspirantes.'),
          infoBlock('👤', 'Jugadores evolutivos', 'Los jugadores envejecen entre ediciones, se retiran y son reemplazados por nuevas generaciones. Los grandes talentos pueden marcar varias Copas.'),
          infoBlock('📊', 'Historial acumulado', 'Cada Mundial queda registrado. Stats muestra rankings históricos, récords y la tabla de todos los tiempos a medida que pasan las ediciones.'),
        ] }),
      ] }),
    ],
  });

  return el('div', {
    style: { position: 'fixed', inset: '0', zIndex: '500', overflow: 'hidden' },
    children: [backdrop, panel],
  });
}

function infoBlock(icon, title, desc) {
  return el('div', {
    style: { display: 'flex', gap: '10px', alignItems: 'flex-start' },
    children: [
      el('span', { text: icon, style: { fontSize: '16px', lineHeight: '1.5', flexShrink: '0', marginTop: '1px' } }),
      el('div', {
        children: [
          el('div', { text: title, style: { fontSize: '13px', fontWeight: '600', marginBottom: '2px' } }),
          el('div', { text: desc, style: { fontSize: '12px', lineHeight: '1.55', color: 'var(--color-text-muted)' } }),
        ],
      }),
    ],
  });
}

export function updateHeader(state) {
  const info = document.getElementById('header-info');
  if (info) {
    info.innerHTML = '';
    if (state.tournament?.host) {
      const hostFlag = flag(state.tournament.host.code, 40);
      hostFlag.style.height = '24px';
      hostFlag.style.width = '36px';
      hostFlag.style.objectFit = 'cover';
      info.appendChild(hostFlag);
      info.appendChild(
        el('div', {
          className: 'flex flex-col items-end',
          children: [
            el('span', {
              text: `Mundial ${getEditionYear(state.edition)}`,
              className: 'text-xs font-semibold leading-tight',
            }),
            el('span', {
              text: state.tournament.host.name,
              className: 'text-[10px] text-text-muted leading-tight',
            }),
          ],
        })
      );
    }
  }

  const footer = document.getElementById('sidebar-footer');
  if (footer) {
    footer.innerHTML = '';
    if (state.tournament?.host) {
      footer.appendChild(
        el('div', {
          className: 'flex items-center gap-2 mb-1',
          children: [
            flag(state.tournament.host.code, 20),
            el('span', {
              text: `Mundial ${getEditionYear(state.edition)}`,
              className: 'font-medium text-text-secondary',
            }),
          ],
        })
      );
    }
    if (state.phase) {
      footer.appendChild(
        el('div', {
          text: state.phase.label,
          className: 'text-[11px] text-text-muted mt-0.5',
        })
      );
    }
  }
}

function createBottomNav() {
  return el('nav', {
    id: 'bottom-nav',
    className: 'fixed bottom-0 left-0 right-0 z-50 lg:hidden glass-header border-t border-border-default safe-bottom',
    children: [
      el('div', {
        className: 'flex items-center justify-around py-1.5 px-1',
        children: NAV_ITEMS.map(item =>
          el('button', {
            className: 'nav-btn flex flex-col items-center gap-0.5 px-2 py-1.5 rounded-xl transition-all min-w-0',
            attrs: { 'data-path': item.path },
            events: { click: () => navigate(item.path) },
            children: [
              el('span', { html: item.icon, className: 'w-5 h-5' }),
              el('span', { text: item.label, className: 'text-[9px] font-medium truncate' }),
            ],
          })
        ),
      }),
    ],
  });
}

export function updateNav() {
  const current = getCurrentRoute();

  document.querySelectorAll('.nav-btn').forEach(btn => {
    const path = btn.getAttribute('data-path');
    const active = path === '/' ? current === '/' : current.startsWith(path);
    btn.classList.toggle('text-accent', active);
    btn.classList.toggle('text-text-muted', !active);
    btn.style.background = active ? 'var(--color-accent-light)' : 'transparent';
  });

  document.querySelectorAll('.sidebar-nav-btn').forEach(btn => {
    const path = btn.getAttribute('data-path');
    const active = path === '/' ? current === '/' : current.startsWith(path);
    btn.classList.toggle('active', active);
  });
}
