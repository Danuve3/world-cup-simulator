import { EPOCH, CYCLE_DURATION, SCHEDULE } from '../constants.js';
import { simulateTournament, getTournamentSummary } from './tournament.js';
import { getPhaseAtMinute, getLiveMatches, getUpcomingMatches, getGroupMatchTiming, getKnockoutMatchTiming } from './timeline.js';
import { getMatchAtMinute } from './match.js';

/**
 * Time offset for debug time-travel. In minutes.
 */
let timeOffset = 0;

/**
 * Set time offset for debugging / time-travel.
 * @param {number} offsetMinutes - Offset in minutes
 */
export function setTimeOffset(offsetMinutes) {
  timeOffset = offsetMinutes;
}

/**
 * Get current time offset.
 */
export function getTimeOffset() {
  return timeOffset;
}

/**
 * Get the current timestamp with offset applied.
 */
export function getNow() {
  return Date.now() + timeOffset * 60 * 1000;
}

/**
 * Convert a real timestamp to edition + cycle minute.
 *
 * @param {number} [timestamp] - Unix timestamp in ms (defaults to now)
 * @returns {{ edition: number, cycleMinute: number, cycleStart: number }}
 */
export function timestampToEdition(timestamp) {
  const ts = timestamp ?? getNow();
  const totalMinutes = Math.floor((ts - EPOCH) / (60 * 1000));
  const edition = Math.floor(totalMinutes / CYCLE_DURATION);
  const cycleMinute = totalMinutes % CYCLE_DURATION;
  const cycleStart = EPOCH + edition * CYCLE_DURATION * 60 * 1000;

  return { edition: Math.max(0, edition), cycleMinute, cycleStart };
}

/**
 * Main API: Get the full current state for rendering.
 *
 * @param {number} [timestamp] - Unix timestamp in ms
 * @returns {object} Complete UI state
 */
export function getCurrentState(timestamp) {
  const { edition, cycleMinute, cycleStart } = timestampToEdition(timestamp);
  const phase = getPhaseAtMinute(cycleMinute);
  const tournament = simulateTournament(edition);

  // Live matches
  const liveMatchInfos = getLiveMatches(cycleMinute);
  const liveMatches = liveMatchInfos.map(info => {
    if (info.type === 'group') {
      const groupTeams = tournament.draw.groups[info.group];
      // Find match fixture
      const fixturePatterns = [
        [[0, 1], [2, 3]],
        [[0, 2], [1, 3]],
        [[0, 3], [1, 2]],
      ];
      const [iA, iB] = fixturePatterns[info.matchday][info.matchIndex];
      const teamA = groupTeams[iA];
      const teamB = groupTeams[iB];
      const matchState = getMatchAtMinute(
        edition, info.matchId, teamA, teamB, info.matchMinute, true
      );
      return { ...info, ...matchState };
    } else {
      // Knockout — we need the full tournament to know the teams
      const matchResult = findKnockoutMatch(tournament, info.round, info.matchIndex);
      if (matchResult) {
        const matchState = getMatchAtMinute(
          edition, info.matchId, matchResult.teamA, matchResult.teamB, info.matchMinute, false
        );
        return { ...info, ...matchState };
      }
      return info;
    }
  });

  // Upcoming matches
  const upcoming = getUpcomingMatches(cycleMinute, 4).map(m => {
    if (m.type === 'group') {
      const groupTeams = tournament.draw.groups[m.group];
      const fixturePatterns = [
        [[0, 1], [2, 3]],
        [[0, 2], [1, 3]],
        [[0, 3], [1, 2]],
      ];
      const [iA, iB] = fixturePatterns[m.matchday][m.matchIndex];
      return { ...m, teamA: groupTeams[iA], teamB: groupTeams[iB] };
    }
    const matchResult = findKnockoutMatch(tournament, m.round, m.matchIndex);
    return { ...m, teamA: matchResult?.teamA, teamB: matchResult?.teamB };
  });

  // Countdown to next cup
  const nextCycleStart = cycleStart + CYCLE_DURATION * 60 * 1000;
  const minutesToNext = CYCLE_DURATION - cycleMinute;

  // Next edition host
  let nextHost = null;
  if (phase.phase === 'COUNTDOWN' || phase.phase === 'CELEBRATION') {
    try {
      const nextTournament = simulateTournament(edition + 1);
      nextHost = nextTournament.host;
    } catch {
      // Ignore errors for future editions
    }
  }

  return {
    edition,
    cycleMinute,
    cycleStart,
    phase,
    tournament,
    liveMatches,
    upcoming,
    nextCycleStart,
    minutesToNext,
    nextHost,
    timestamp: timestamp ?? getNow(),
  };
}

/**
 * Find a knockout match result from the tournament.
 */
function findKnockoutMatch(tournament, round, matchIndex) {
  const ko = tournament.knockout;
  switch (round) {
    case 'R16': return ko.r16[matchIndex];
    case 'QF': return ko.qf[matchIndex];
    case 'SF': return ko.sf[matchIndex];
    case 'THIRD': return ko.thirdPlace;
    case 'FINAL': return ko.final;
    default: return null;
  }
}

/**
 * Get completed tournament summaries for history.
 * Returns editions 0 to (currentEdition - 1).
 */
export function getCompletedTournaments(timestamp) {
  const { edition } = timestampToEdition(timestamp);
  const summaries = [];
  for (let i = 0; i < edition; i++) {
    summaries.push(getTournamentSummary(i));
  }
  return summaries;
}

/**
 * Get stats across all completed tournaments.
 */
export function getStats(timestamp) {
  const { edition } = timestampToEdition(timestamp);
  const titles = {};
  const participations = {};
  let totalGoals = 0;
  let maxGoalsTournament = { edition: 0, goals: 0 };
  const biggestWins = [];

  for (let i = 0; i < edition; i++) {
    const t = simulateTournament(i);

    // Titles
    const champCode = t.champion.code;
    titles[champCode] = (titles[champCode] || 0) + 1;

    // Total goals
    totalGoals += t.totalGoals;
    if (t.totalGoals > maxGoalsTournament.goals) {
      maxGoalsTournament = { edition: i, goals: t.totalGoals, host: t.host };
    }

    // Participations from draw
    for (const group of t.draw.groups) {
      for (const team of group) {
        participations[team.code] = (participations[team.code] || 0) + 1;
      }
    }

    // Biggest wins from group stage + knockout
    const allMatches = [
      ...t.groupStage.matches,
      ...t.knockout.r16,
      ...t.knockout.qf,
      ...t.knockout.sf,
      t.knockout.thirdPlace,
      t.knockout.final,
    ];
    for (const m of allMatches) {
      const diff = Math.abs(m.goalsA - m.goalsB);
      if (diff >= 4) {
        biggestWins.push({
          edition: i,
          teamA: m.teamA,
          teamB: m.teamB,
          goalsA: m.goalsA,
          goalsB: m.goalsB,
        });
      }
    }
  }

  return {
    titles,
    participations,
    totalGoals,
    maxGoalsTournament,
    biggestWins: biggestWins.sort((a, b) => {
      const diffA = Math.abs(a.goalsA - a.goalsB);
      const diffB = Math.abs(b.goalsA - b.goalsB);
      return diffB - diffA;
    }).slice(0, 20),
    totalTournaments: edition,
  };
}

// Expose setTimeOffset globally for debug
if (typeof window !== 'undefined') {
  window.setTimeOffset = setTimeOffset;
  window.getCurrentState = getCurrentState;
}
