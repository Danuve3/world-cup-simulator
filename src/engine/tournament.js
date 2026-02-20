import { getHost, buildHostsMap } from './hosts.js';
import { performDraw } from './draw.js';
import { simulateGroupStage, getGroupWinners } from './group-stage.js';
import { simulateKnockout } from './knockout.js';
import { getTeamByCode } from './teams.js';
import { computePlayerStats } from './playerEvolution.js';
import { createPRNG, combineSeed } from './prng.js';

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

  // Compute player stats across all matches
  const allMatches = [
    ...groupStage.matches,
    ...knockout.r16,
    ...knockout.qf,
    ...knockout.sf,
    knockout.thirdPlace,
    knockout.final,
  ];

  // Match minutes per phase (regular or ET)
  function matchMinutes(m) {
    return m.extraTime ? 120 : 90;
  }

  // Build per-team match list with side info
  const teamMatchMap = {};
  for (const m of allMatches) {
    for (const side of ['A', 'B']) {
      const code = side === 'A' ? m.teamA.code : m.teamB.code;
      if (!teamMatchMap[code]) teamMatchMap[code] = [];
      teamMatchMap[code].push({ match: m, side, matchMinutes: matchMinutes(m) });
    }
  }

  // Aggregate global player stats map: playerId → { player, goals, matches, mins }
  const playerStatsMap = {};
  const squadsByTeam = {};
  for (const [teamCode, teamMatches] of Object.entries(teamMatchMap)) {
    const { squad, stats } = computePlayerStats(teamCode, edition, teamMatches);
    squadsByTeam[teamCode] = squad;
    for (const player of squad) {
      const s = stats[player.id];
      playerStatsMap[player.id] = { player, ...s };
    }
  }

  // Golden Boot: top scorer
  const topScorer = Object.values(playerStatsMap)
    .filter(e => e.goals > 0)
    .sort((a, b) => b.goals - a.goals || b.player.rating - a.player.rating)[0] || null;

  // Best Player (MVP): realistic weighted pick from semifinalists
  const mvp = computeMVP(edition, knockout, playerStatsMap, squadsByTeam);

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
    playerStats: playerStatsMap,
    squadsByTeam,
    topScorer,
    mvp,
  };

  tournamentCache.set(edition, result);
  return result;
}

/**
 * Compute the MVP (Best Player) for a tournament.
 * Biased toward high-rated semifinalists, but exceptions possible.
 */
function computeMVP(edition, knockout, playerStatsMap, squadsByTeam) {
  const rng = createPRNG(combineSeed('mvp', edition));

  // Collect semifinalist teams (top 4)
  const semiFinalTeams = new Set();
  for (const m of knockout.sf) {
    if (m.teamA) semiFinalTeams.add(m.teamA.code);
    if (m.teamB) semiFinalTeams.add(m.teamB.code);
  }

  // Candidate pool: score each player by goals + rating + team performance bonus
  const candidates = [];
  for (const entry of Object.values(playerStatsMap)) {
    const { player, goals, matches, mins } = entry;
    if (mins === 0) continue; // didn't play

    const isFromSemis = semiFinalTeams.has(player.teamCode);
    const teamBonus = isFromSemis ? 3.0 : 0.5; // strong bias toward semifinalists

    // Score: weighted mix of goals, rating, and team success
    const score = (goals * 2.5 + player.rating * 0.15 + matches * 0.5) * teamBonus;
    candidates.push({ player, goals, score });
  }

  if (candidates.length === 0) return null;

  // Sort descending and take top 10 as final candidates
  candidates.sort((a, b) => b.score - a.score);
  const pool = candidates.slice(0, 10);
  const weights = pool.map(c => c.score * c.score); // squared to further favor top candidates

  const chosen = rng.weightedSample(pool, weights);
  return chosen
    ? { player: chosen.player, goals: chosen.goals }
    : null;
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
    topScorer: t.topScorer,
    mvp: t.mvp,
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
