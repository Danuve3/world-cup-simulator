import { el, flag, getEditionYear } from './components.js';
import { navigate, getCurrentRoute } from './router.js';

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
  { path: '/history', label: 'Historial', icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12,6 12,12 16,14"/></svg>' },
  { path: '/stats', label: 'Stats', icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="12" width="4" height="8" rx="1"/><rect x="10" y="8" width="4" height="12" rx="1"/><rect x="17" y="4" width="4" height="16" rx="1"/></svg>' },
];

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
              el('span', { text: 'World Cup', className: 'text-base font-bold block leading-tight' }),
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
            className: 'flex items-center gap-2.5 cursor-pointer',
            events: { click: () => navigate('/') },
            children: [
              el('span', { text: '\u26bd', className: 'text-lg' }),
              el('span', { text: 'World Cup Simulator', className: 'text-sm font-bold' }),
            ],
          }),
          el('div', {
            className: 'flex items-center gap-2.5',
            children: [
              el('div', { id: 'header-info', className: 'flex items-center gap-2.5' }),
              el('button', {
                className: 'w-8 h-8 flex items-center justify-center rounded-lg text-text-muted hover:text-text-primary hover:bg-bg-hover transition-colors',
                events: { click: toggleTheme },
                children: [
                  el('span', {
                    html: document.documentElement.classList.contains('light') ? MOON_ICON : SUN_ICON,
                    className: 'w-4 h-4 theme-toggle-icon',
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
