import { createPRNG, combineSeed } from './prng.js';
import { TEAMS } from './teams.js';
import { CONFEDERATIONS } from '../constants.js';

/**
 * Confederation rotation order for hosting.
 * Cycles through confederations, with weighted probability
 * for eligible nations within each confederation.
 */
const CONFEDERATION_ROTATION = ['UEFA', 'CONMEBOL', 'AFC', 'CAF', 'CONCACAF', 'UEFA'];

/**
 * Minimum rating to be eligible as host
 */
const MIN_HOST_RATING = 50;

/**
 * Generate the host nation for a given World Cup edition.
 * Deterministic — same edition always returns the same host.
 *
 * @param {number} edition - World Cup edition number (0-based from EPOCH)
 * @param {Map} [previousHosts] - Map of edition -> host code to avoid repeats
 * @returns {{ team: object, edition: number }}
 */
export function getHost(edition, previousHosts = new Map()) {
  // First edition: USA 2026
  if (edition === 0) {
    return TEAMS.find(t => t.code === 'us');
  }

  const rng = createPRNG(combineSeed('host', edition));

  // Determine confederation for this edition
  const confIndex = edition % CONFEDERATION_ROTATION.length;
  const confederation = CONFEDERATION_ROTATION[confIndex];

  // Get eligible teams from this confederation
  let eligible = TEAMS.filter(
    t => t.confederation === confederation && t.rating >= MIN_HOST_RATING
  );

  // Exclude recent hosts (last 3 editions)
  const recentHosts = new Set();
  for (let i = Math.max(0, edition - 3); i < edition; i++) {
    const prev = previousHosts.get(i);
    if (prev) recentHosts.add(prev);
  }
  eligible = eligible.filter(t => !recentHosts.has(t.code));

  // If no eligible teams in this confederation, fall back to any confederation
  if (eligible.length === 0) {
    eligible = TEAMS.filter(
      t => t.rating >= MIN_HOST_RATING && !recentHosts.has(t.code)
    );
  }

  // Weight by rating
  const weights = eligible.map(t => t.rating);
  const host = rng.weightedSample(eligible, weights);

  return host;
}

/**
 * Build hosts map for editions 0..n (iterative to avoid recomputation)
 */
export function buildHostsMap(upToEdition) {
  const hosts = new Map();
  for (let i = 0; i <= upToEdition; i++) {
    const host = getHost(i, hosts);
    hosts.set(i, host.code);
  }
  return hosts;
}
