/**
 * playerPhotos.js
 *
 * Deterministic assignment of pre-generated player portrait photos.
 * Each player always gets the same photo (based on their ID + teamCode).
 */

// ─── Team → appearance category mapping ──────────────────────────────────────
const TEAM_CATEGORY = {
  // Southern/Western Europe (Mediterranean)
  fr: 'euro_latin', es: 'euro_latin', it: 'euro_latin', pt: 'euro_latin',
  be: 'euro_latin', nl: 'euro_latin', at: 'euro_latin', ch: 'euro_latin',
  gr: 'euro_latin', lu: 'euro_latin', cy: 'euro_latin',

  // Northern Europe
  'gb-eng': 'euro_north', 'gb-wls': 'euro_north', 'gb-sct': 'euro_north',
  ie: 'euro_north', dk: 'euro_north', se: 'euro_north', no: 'euro_north',
  fi: 'euro_north', is: 'euro_north', de: 'euro_north',

  // Eastern Europe
  pl: 'euro_east', hr: 'euro_east', rs: 'euro_east', ua: 'euro_east',
  cz: 'euro_east', hu: 'euro_east', ro: 'euro_east', sk: 'euro_east',
  si: 'euro_east', ba: 'euro_east', me: 'euro_east', mk: 'euro_east',
  al: 'euro_east', bg: 'euro_east', by: 'euro_east', ru: 'euro_east',
  lt: 'euro_east', lv: 'euro_east', ee: 'euro_east',

  // Caucasus / Turkey / Central Asia
  tr: 'euro_caucasus', ge: 'euro_caucasus', am: 'euro_caucasus',
  az: 'euro_caucasus', il: 'euro_caucasus', kz: 'euro_caucasus',
  uz: 'euro_caucasus', kg: 'euro_caucasus',

  // South America
  ar: 'south_america', br: 'south_america', co: 'south_america',
  uy: 'south_america', cl: 'south_america', pe: 'south_america',
  ec: 'south_america', py: 'south_america', ve: 'south_america',
  bo: 'south_america',

  // West / Central / Southern Africa
  ng: 'africa_dark', gh: 'africa_dark', sn: 'africa_dark', ci: 'africa_dark',
  cm: 'africa_dark', ml: 'africa_dark', bf: 'africa_dark', gn: 'africa_dark',
  ga: 'africa_dark', bj: 'africa_dark', tg: 'africa_dark', ao: 'africa_dark',
  cd: 'africa_dark', mz: 'africa_dark', ug: 'africa_dark', tz: 'africa_dark',
  zm: 'africa_dark', zw: 'africa_dark', mg: 'africa_dark', na: 'africa_dark',
  ke: 'africa_dark', cv: 'africa_dark', za: 'africa_dark',

  // North Africa
  ma: 'africa_north', dz: 'africa_north', tn: 'africa_north',
  eg: 'africa_north', ly: 'africa_north',

  // Middle East
  sa: 'middle_east', qa: 'middle_east', ae: 'middle_east', iq: 'middle_east',
  ir: 'middle_east', jo: 'middle_east', om: 'middle_east', bh: 'middle_east',
  ps: 'middle_east', sy: 'middle_east',

  // East / Southeast Asia
  jp: 'east_asia', kr: 'east_asia', cn: 'east_asia', kp: 'east_asia',
  th: 'east_asia', vn: 'east_asia', my: 'east_asia', id: 'east_asia',
  in: 'east_asia',

  // North / Central America & Caribbean (mixed heritage)
  us: 'mixed_americas', ca: 'mixed_americas', mx: 'mixed_americas',
  cr: 'mixed_americas', pa: 'mixed_americas', jm: 'mixed_americas',
  hn: 'mixed_americas', sv: 'mixed_americas', tt: 'mixed_americas',
  gt: 'mixed_americas', cw: 'mixed_americas', ht: 'mixed_americas',
  do: 'mixed_americas', cu: 'mixed_americas', ni: 'mixed_americas',

  // Oceania → default to mixed_americas (Pacific Islander look)
  au: 'euro_north', nz: 'euro_north',
  pg: 'mixed_americas', fj: 'mixed_americas', sb: 'mixed_americas',
  pf: 'mixed_americas', vu: 'mixed_americas', ws: 'mixed_americas',
  to: 'mixed_americas', nc: 'mixed_americas',
};

// ─── Deterministic hash ───────────────────────────────────────────────────────
function hashCode(str) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) - hash) + str.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
}

// ─── Manifest cache ───────────────────────────────────────────────────────────
let _manifest = null;

async function loadManifest() {
  if (_manifest) return _manifest;
  try {
    const res = await fetch('/players/manifest.json');
    if (!res.ok) return null;
    _manifest = await res.json();
    return _manifest;
  } catch {
    return null;
  }
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Returns the photo URL for a given player, or null if no photos are available.
 * The same player always gets the same photo (deterministic by playerId).
 */
export async function getPlayerPhotoUrl(playerId, teamCode) {
  const manifest = await loadManifest();
  if (!manifest) return null;

  const category = TEAM_CATEGORY[teamCode] ?? 'euro_latin';
  const pool = manifest[category];
  if (!pool || pool.length === 0) return null;

  const idx = hashCode(`${playerId}-${teamCode}`) % pool.length;
  return '/' + pool[idx];
}

/**
 * Synchronous version — returns null until manifest is loaded.
 * Call loadManifest() first to warm up the cache.
 */
export function getPlayerPhotoUrlSync(playerId, teamCode) {
  if (!_manifest) return null;
  const category = TEAM_CATEGORY[teamCode] ?? 'euro_latin';
  const pool = _manifest[category];
  if (!pool || pool.length === 0) return null;
  const idx = hashCode(`${playerId}-${teamCode}`) % pool.length;
  return '/' + pool[idx];
}

/** Pre-loads the manifest (call once at app startup). */
export { loadManifest };
