/**
 * Hash-based SPA router.
 * Routes: #/ (dashboard), #/groups, #/bracket, #/history, #/stats
 */

const routes = new Map();
let currentRoute = null;
let currentCleanup = null;

/**
 * Register a route handler.
 *
 * @param {string} path - Route path (e.g., '/', '/groups')
 * @param {Function} handler - Function that receives (container, params) and returns optional cleanup fn
 */
export function route(path, handler) {
  routes.set(path, handler);
}

/**
 * Navigate to a route.
 */
export function navigate(path) {
  window.location.hash = path === '/' ? '' : path;
}

/**
 * Get the current route path.
 */
export function getCurrentRoute() {
  const hash = window.location.hash.slice(1) || '/';
  return hash;
}

/**
 * Initialize the router. Call once on app start.
 */
export function initRouter(container) {
  function handleRoute() {
    const path = getCurrentRoute();
    // Extract base path and params
    const parts = path.split('/').filter(Boolean);
    const basePath = '/' + (parts[0] || '');
    const params = parts.slice(1);

    const handler = routes.get(basePath) || routes.get('/');
    if (!handler) return;

    // Cleanup previous view
    if (currentCleanup) {
      currentCleanup();
      currentCleanup = null;
    }

    // Clear container with transition
    container.classList.add('view-exit');
    setTimeout(() => {
      container.innerHTML = '';
      container.classList.remove('view-exit');
      container.classList.add('view-enter');

      currentCleanup = handler(container, params) || null;
      currentRoute = basePath;

      setTimeout(() => container.classList.remove('view-enter'), 300);
    }, container.children.length ? 200 : 0);
  }

  window.addEventListener('hashchange', handleRoute);
  handleRoute();

  return () => window.removeEventListener('hashchange', handleRoute);
}

/**
 * Get active route for highlighting nav.
 */
export function isActive(path) {
  return getCurrentRoute().startsWith(path);
}
