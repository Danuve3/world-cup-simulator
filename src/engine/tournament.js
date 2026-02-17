import { getHost, buildHostsMap } from './hosts.js';
import { performDraw } from './draw.js';
import { simulateGroupStage, getGroupWinners } from './group-stage.js';
import { simulateKnockout } from './knockout.js';
import { getTeamByCode } from './teams.js';

/**
 * Cache of completed tournament results by edition.
 * Avoids recomputing expensive simulations.
 */
const tournamentCache = new Map();

/**
 * Cache of host assignments.
 */
let hostsCache = null;
let hostsCacheUpTo = -1;

/**
 * Simulate a full World Cup tournament for a given edition.
 * Results are cached for performance.
 *
 * @param {number} edition - Edition number (0-based from EPOCH)
 * @returns {object} Full tournament state
 */
export function simulateTournament(edition) {
  if (tournamentCache.has(edition)) {
    return tournamentCache.get(edition);
  }

  // Build hosts iteratively up to this edition
  if (hostsCacheUpTo < edition) {
    hostsCache = buildHostsMap(edition);
    hostsCacheUpTo = edition;
  }

  // Get host
  const host = getHost(edition, hostsCache);

  // Get defending champion (from previous edition)
  let defendingChampionCode = null;
  if (edition === 0) {
    defendingChampionCode = 'ar'; // Argentina — 2022 FIFA World Cup champions
  } else {
    const prev = simulateTournament(edition - 1);
    defendingChampionCode = prev.champion.code;
  }

  // Perform draw
  const draw = performDraw(edition, host, defendingChampionCode);

  // Simulate group stage
  const groupStage = simulateGroupStage(edition, draw.groups);

  // Get advancing teams
  const groupWinners = getGroupWinners(groupStage.standings);

  // Simulate knockout
  const knockout = simulateKnockout(edition, groupWinners);

  // Total goals in tournament
  const groupGoals = groupStage.matches.reduce((s, m) => s + m.goalsA + m.goalsB, 0);
  const knockoutGoals = [
    ...knockout.r16,
    ...knockout.qf,
    ...knockout.sf,
    knockout.thirdPlace,
    knockout.final,
  ].reduce((s, m) => s + m.goalsA + m.goalsB, 0);

  const result = {
    edition,
    host,
    draw,
    groupStage,
    groupWinners,
    knockout,
    champion: knockout.champion,
    runnerUp: knockout.runnerUp,
    thirdPlace: knockout.thirdPlaceTeam,
    fourthPlace: knockout.fourthPlaceTeam,
    totalGoals: groupGoals + knockoutGoals,
    totalMatches: groupStage.matches.length + 8 + 4 + 2 + 1 + 1,
  };

  tournamentCache.set(edition, result);
  return result;
}

/**
 * Get tournament summary (lightweight, for history lists).
 */
export function getTournamentSummary(edition) {
  const t = simulateTournament(edition);
  return {
    edition,
    host: t.host,
    champion: t.champion,
    runnerUp: t.runnerUp,
    thirdPlace: t.thirdPlace,
    totalGoals: t.totalGoals,
    totalMatches: t.totalMatches,
  };
}

/**
 * Clear the tournament cache (useful for testing).
 */
export function clearCache() {
  tournamentCache.clear();
  hostsCache = null;
  hostsCacheUpTo = -1;
}
