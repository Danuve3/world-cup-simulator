import { EPOCH, CYCLE_DURATION } from '../constants.js';

/**
 * DOM helper utilities for vanilla JS rendering.
 */

/**
 * Create an element with optional classes, attributes, and children.
 */
export function el(tag, opts = {}) {
  const element = document.createElement(tag);

  if (opts.className) element.className = opts.className;
  if (opts.id) element.id = opts.id;
  if (opts.text) element.textContent = opts.text;
  if (opts.html) element.innerHTML = opts.html;

  if (opts.attrs) {
    for (const [key, val] of Object.entries(opts.attrs)) {
      element.setAttribute(key, val);
    }
  }

  if (opts.style) {
    Object.assign(element.style, opts.style);
  }

  if (opts.events) {
    for (const [event, handler] of Object.entries(opts.events)) {
      element.addEventListener(event, handler);
    }
  }

  if (opts.children) {
    for (const child of opts.children) {
      if (child) element.appendChild(child);
    }
  }

  return element;
}

/**
 * Create a flag image element.
 */
export function flag(code, width = 40) {
  const img = document.createElement('img');
  const validWidths = [20, 40, 80, 160, 320];
  const fetchWidth = validWidths.find(w => w >= width) || 40;
  img.src = `https://flagcdn.com/w${fetchWidth}/${code}.png`;
  img.alt = code;
  img.className = 'inline-block rounded-sm shrink-0';
  img.style.width = `${width}px`;
  img.style.height = 'auto';
  img.loading = 'lazy';
  img.onerror = () => { img.style.display = 'none'; };
  return img;
}

/**
 * Create a team badge with flag and name.
 */
export function teamBadge(team, opts = {}) {
  const { size = 'md', showName = true, reverse = false } = opts;
  const flagSize = size === 'sm' ? 20 : size === 'lg' ? 48 : 28;
  const textClass = size === 'sm' ? 'text-xs' : size === 'lg' ? 'text-base font-semibold' : 'text-sm font-medium';

  const children = [flag(team.code, flagSize)];
  if (showName) {
    children.push(el('span', { text: team.name, className: textClass }));
  }
  if (reverse) children.reverse();

  return el('div', {
    className: `flex items-center gap-2 ${reverse ? 'flex-row-reverse' : ''}`,
    children,
  });
}

/**
 * Format minutes to human-readable time.
 */
export function formatMinutes(totalMinutes) {
  const days = Math.floor(totalMinutes / 1440);
  const hours = Math.floor((totalMinutes % 1440) / 60);
  const mins = totalMinutes % 60;

  if (days > 0) return `${days}d ${hours}h ${mins}m`;
  if (hours > 0) return `${hours}h ${mins}m`;
  return `${mins}m`;
}

/**
 * Format countdown to d/h/m/s.
 */
export function formatCountdown(ms) {
  const totalSec = Math.max(0, Math.floor(ms / 1000));
  const d = Math.floor(totalSec / 86400);
  const h = Math.floor((totalSec % 86400) / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;

  return { d, h, m, s };
}

/**
 * Format seconds into mm:ss or hh:mm:ss.
 */
export function formatTime(totalSeconds) {
  totalSeconds = Math.max(0, Math.floor(totalSeconds));
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  const pad = n => String(n).padStart(2, '0');
  if (h > 0) return `${h}:${pad(m)}:${pad(s)}`;
  return `${m}:${pad(s)}`;
}

/**
 * Create a countdown display (d h m s boxes).
 */
export function countdownDisplay(ms, opts = {}) {
  const { size = 'md' } = opts;
  const { d, h, m, s } = formatCountdown(ms);
  const numClass = size === 'sm' ? 'text-lg min-w-[36px] h-[40px]' : 'countdown-num';
  const labelClass = size === 'sm' ? 'text-[9px]' : 'countdown-label';
  const sepClass = size === 'sm' ? 'text-text-muted text-sm font-semibold' : 'text-text-muted text-lg font-bold';

  const units = [];
  if (d > 0) units.push({ value: d, label: 'DÍAS' });
  units.push({ value: h, label: 'HRS' }, { value: m, label: 'MIN' }, { value: s, label: 'SEG' });

  const children = [];
  units.forEach((u, i) => {
    if (i > 0) {
      children.push(el('span', { text: ':', className: `${sepClass} self-start mt-2` }));
    }
    children.push(
      el('div', {
        className: 'countdown-unit',
        children: [
          el('div', {
            text: String(u.value).padStart(2, '0'),
            className: `${numClass} flex items-center justify-center bg-bg-card rounded-xl font-extrabold tabular-nums shadow-sm`,
          }),
          el('span', { text: u.label, className: `${labelClass} text-text-muted font-semibold tracking-wider` }),
        ],
      })
    );
  });

  return el('div', {
    className: 'flex items-start justify-center gap-2',
    children,
  });
}

/**
 * Get the simulated year for a given edition.
 */
export function getEditionYear(edition) {
  const CYCLE_MS = CYCLE_DURATION * 60 * 1000;
  return new Date(EPOCH + edition * CYCLE_MS).getUTCFullYear();
}

/**
 * Simple reactive state.
 */
export function createStore(initial) {
  let state = initial;
  const listeners = new Set();

  return {
    get: () => state,
    set: (next) => {
      state = next;
      for (const fn of listeners) fn(state);
    },
    subscribe: (fn) => {
      listeners.add(fn);
      return () => listeners.delete(fn);
    },
  };
}
