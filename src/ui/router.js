/**
 * Hash-based SPA router.
 * Routes: #/ (dashboard), #/groups, #/bracket, #/history, #/stats
 */

const routes = new Map();
let currentRoute = null;
let currentCleanup = null;
let onRouteChange = null;

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

    // Simple transition: fade content out quickly, swap, fade in
    const hasContent = container.children.length > 0;
    if (hasContent) {
      container.style.opacity = '0';
      container.style.transition = 'opacity 0.12s ease-out';
    }

    setTimeout(() => {
      container.innerHTML = '';
      currentCleanup = handler(container, params) || null;
      currentRoute = basePath;
      if (onRouteChange) onRouteChange();

      // Fade in
      container.style.opacity = '0';
      container.style.transition = 'opacity 0.18s ease-in';
      requestAnimationFrame(() => {
        container.style.opacity = '1';
      });
    }, hasContent ? 120 : 0);
  }

  window.addEventListener('hashchange', handleRoute);
  handleRoute();

  return () => window.removeEventListener('hashchange', handleRoute);
}

/**
 * Set a callback for route changes (e.g., to update nav highlighting).
 */
export function setOnRouteChange(fn) {
  onRouteChange = fn;
}

/**
 * Get active route for highlighting nav.
 */
export function isActive(path) {
  return getCurrentRoute().startsWith(path);
}
