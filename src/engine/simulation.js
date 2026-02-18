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
  const totalMinutesExact = (ts - EPOCH) / (60 * 1000);
  const totalMinutes = Math.floor(totalMinutesExact);
  const edition = Math.floor(totalMinutes / CYCLE_DURATION);
  const cycleMinute = totalMinutes % CYCLE_DURATION;
  // Exact (float) cycle minute for smooth match-clock interpolation
  const cycleMinuteExact = totalMinutesExact - edition * CYCLE_DURATION;
  const cycleStart = EPOCH + edition * CYCLE_DURATION * 60 * 1000;

  return { edition: Math.max(0, edition), cycleMinute, cycleMinuteExact, cycleStart };
}

/**
 * Main API: Get the full current state for rendering.
 *
 * @param {number} [timestamp] - Unix timestamp in ms
 * @returns {object} Complete UI state
 */
export function getCurrentState(timestamp) {
  const { edition, cycleMinute, cycleMinuteExact, cycleStart } = timestampToEdition(timestamp);
  const phase = getPhaseAtMinute(cycleMinute);
  const tournament = simulateTournament(edition);

  // Live matches — use exact (float) minute for smooth game-clock interpolation
  const liveMatchInfos = getLiveMatches(cycleMinuteExact);
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

  // Recent matches
  const recentMatches = getRecentMatches(edition, tournament, cycleMinute, 4);

  return {
    edition,
    cycleMinute,
    cycleStart,
    phase,
    tournament,
    liveMatches,
    upcoming,
    recentMatches,
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
  let maxGoalsTournament = { edition: -1, goals: 0 };
  let minGoalsTournament = { edition: -1, goals: Infinity };
  let mostGoalsTeam = { edition: -1, team: null, goals: 0 };
  let fewestGoalsTeam = { edition: -1, team: null, goals: Infinity };
  const biggestWins = [];
  const highestScoring = [];
  const allTimeRanking = {};

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
    if (t.totalGoals < minGoalsTournament.goals) {
      minGoalsTournament = { edition: i, goals: t.totalGoals, host: t.host };
    }

    // Participations from draw
    for (const group of t.draw.groups) {
      for (const team of group) {
        participations[team.code] = (participations[team.code] || 0) + 1;
        if (!allTimeRanking[team.code]) {
          allTimeRanking[team.code] = { team, editions: 0, played: 0, won: 0, drawn: 0, lost: 0, gf: 0, ga: 0 };
        }
        allTimeRanking[team.code].editions++;
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
    const teamGoals = {};
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
      const total = m.goalsA + m.goalsB;
      if (total >= 5) {
        highestScoring.push({
          edition: i,
          teamA: m.teamA,
          teamB: m.teamB,
          goalsA: m.goalsA,
          goalsB: m.goalsB,
        });
      }
      teamGoals[m.teamA.code] = (teamGoals[m.teamA.code] || 0) + m.goalsA;
      teamGoals[m.teamB.code] = (teamGoals[m.teamB.code] || 0) + m.goalsB;

      // All-time ranking
      for (const side of ['A', 'B']) {
        const team = side === 'A' ? m.teamA : m.teamB;
        const gf = side === 'A' ? m.goalsA : m.goalsB;
        const ga = side === 'A' ? m.goalsB : m.goalsA;
        if (!allTimeRanking[team.code]) {
          allTimeRanking[team.code] = { team, editions: 0, played: 0, won: 0, drawn: 0, lost: 0, gf: 0, ga: 0 };
        }
        const r = allTimeRanking[team.code];
        r.played++;
        r.gf += gf;
        r.ga += ga;
        if (gf > ga) r.won++;
        else if (gf === ga) r.drawn++;
        else r.lost++;
      }
    }
    for (const [code, goals] of Object.entries(teamGoals)) {
      const team = t.draw.groups.flat().find(tm => tm.code === code);
      if (goals > mostGoalsTeam.goals) {
        mostGoalsTeam = { edition: i, team, goals };
      }
      if (goals < fewestGoalsTeam.goals) {
        fewestGoalsTeam = { edition: i, team, goals };
      }
    }
  }

  return {
    titles,
    participations,
    totalGoals,
    maxGoalsTournament,
    minGoalsTournament: minGoalsTournament.edition >= 0 ? minGoalsTournament : null,
    mostGoalsTeam: mostGoalsTeam.team ? mostGoalsTeam : null,
    fewestGoalsTeam: fewestGoalsTeam.team ? fewestGoalsTeam : null,
    allTimeRanking: Object.values(allTimeRanking)
      .map(r => ({ ...r, gd: r.gf - r.ga, points: r.won * 3 + r.drawn }))
      .sort((a, b) => b.points - a.points || b.gd - a.gd || b.gf - a.gf),
    biggestWins: biggestWins.sort((a, b) => {
      const diffA = Math.abs(a.goalsA - a.goalsB);
      const diffB = Math.abs(b.goalsA - b.goalsB);
      return diffB - diffA;
    }).slice(0, 20),
    highestScoring: highestScoring.sort((a, b) =>
      (b.goalsA + b.goalsB) - (a.goalsA + a.goalsB)
    ).slice(0, 20),
    totalTournaments: edition,
  };
}

/**
 * Get stats including the current in-progress tournament.
 * Shows partial stats even when no tournament has completed yet.
 * Includes live match data for real-time ranking updates.
 */
export function getLiveStats(timestamp) {
  const { edition, cycleMinute } = timestampToEdition(timestamp);
  const baseStats = getStats(timestamp);

  // Add current tournament partial stats
  const tournament = simulateTournament(edition);
  const { matches } = tournament.groupStage;

  // Live matches for real-time data
  const liveMatchInfos = getLiveMatches(cycleMinute);
  const liveTeamCodes = new Set();

  // Build live match data with scores
  const liveMatchesWithScores = liveMatchInfos.map(info => {
    if (info.type === 'group') {
      const groupTeams = tournament.draw.groups[info.group];
      const fixturePatterns = [
        [[0, 1], [2, 3]],
        [[0, 2], [1, 3]],
        [[0, 3], [1, 2]],
      ];
      const [iA, iB] = fixturePatterns[info.matchday][info.matchIndex];
      const teamA = groupTeams[iA];
      const teamB = groupTeams[iB];
      const matchState = getMatchAtMinute(edition, info.matchId, teamA, teamB, info.matchMinute, true);
      liveTeamCodes.add(teamA.code);
      liveTeamCodes.add(teamB.code);
      return { ...info, ...matchState };
    } else {
      const matchResult = findKnockoutMatch(tournament, info.round, info.matchIndex);
      if (matchResult) {
        const matchState = getMatchAtMinute(edition, info.matchId, matchResult.teamA, matchResult.teamB, info.matchMinute, false);
        liveTeamCodes.add(matchResult.teamA.code);
        liveTeamCodes.add(matchResult.teamB.code);
        return { ...info, ...matchState };
      }
      return info;
    }
  });

  // Completed + live matches for stats
  let currentGoals = 0;
  let currentMatchCount = 0;
  const currentBiggestWins = [];
  const completedMatchesForRanking = [];

  // Group stage completed matches
  for (const m of matches) {
    const timing = getGroupMatchTiming(m.matchday, m.group, m.matchIndex);
    if (timing.endMin <= cycleMinute) {
      currentGoals += m.goalsA + m.goalsB;
      currentMatchCount++;
      completedMatchesForRanking.push(m);
      const diff = Math.abs(m.goalsA - m.goalsB);
      if (diff >= 4) {
        currentBiggestWins.push({
          edition,
          teamA: m.teamA,
          teamB: m.teamB,
          goalsA: m.goalsA,
          goalsB: m.goalsB,
        });
      }
    }
  }

  // Collect live matches for ranking separately
  const liveMatchesForRanking = [];
  for (const m of liveMatchesWithScores) {
    if (m.teamA && m.teamB) {
      currentGoals += m.goalsA + m.goalsB;
      liveMatchesForRanking.push(m);
    }
  }

  // Knockout completed matches
  const koRounds = [
    { round: 'R16', matches: tournament.knockout.r16 },
    { round: 'QF', matches: tournament.knockout.qf },
    { round: 'SF', matches: tournament.knockout.sf },
    { round: 'THIRD', matches: [tournament.knockout.thirdPlace] },
    { round: 'FINAL', matches: [tournament.knockout.final] },
  ];
  for (const { round, matches: roundMatches } of koRounds) {
    roundMatches.forEach((m, i) => {
      const timing = getKnockoutMatchTiming(round, i);
      if (timing.endMin <= cycleMinute) {
        currentGoals += m.goalsA + m.goalsB;
        currentMatchCount++;
        completedMatchesForRanking.push(m);
        const diff = Math.abs(m.goalsA - m.goalsB);
        if (diff >= 4) {
          currentBiggestWins.push({
            edition,
            teamA: m.teamA,
            teamB: m.teamB,
            goalsA: m.goalsA,
            goalsB: m.goalsB,
          });
        }
      }
    });
  }

  // Helper: build ranking from base + tournament participation + match list
  function buildRankingFrom(matchList) {
    const ranking = {};
    for (const r of baseStats.allTimeRanking) {
      ranking[r.team.code] = { ...r };
    }
    for (const group of tournament.draw.groups) {
      for (const team of group) {
        if (!ranking[team.code]) {
          ranking[team.code] = { team, editions: 0, played: 0, won: 0, drawn: 0, lost: 0, gf: 0, ga: 0, gd: 0, points: 0 };
        }
        ranking[team.code].editions++;
      }
    }
    for (const m of matchList) {
      for (const side of ['A', 'B']) {
        const team = side === 'A' ? m.teamA : m.teamB;
        const gf = side === 'A' ? m.goalsA : m.goalsB;
        const ga = side === 'A' ? m.goalsB : m.goalsA;
        if (!ranking[team.code]) {
          ranking[team.code] = { team, editions: 1, played: 0, won: 0, drawn: 0, lost: 0, gf: 0, ga: 0, gd: 0, points: 0 };
        }
        const r = ranking[team.code];
        r.played++;
        r.gf += gf;
        r.ga += ga;
        if (gf > ga) r.won++;
        else if (gf === ga) r.drawn++;
        else r.lost++;
      }
    }
    return Object.values(ranking)
      .map(r => ({ ...r, gd: r.gf - r.ga, points: r.won * 3 + r.drawn }))
      .sort((a, b) => b.points - a.points || b.gd - a.gd || b.gf - a.gf);
  }

  // Build both rankings for position delta comparison
  const completedOnlyRanking = buildRankingFrom(completedMatchesForRanking);
  const liveAllTimeRanking = buildRankingFrom([...completedMatchesForRanking, ...liveMatchesForRanking]);

  // Compute position deltas for live teams
  const rankingDeltas = new Map();
  if (liveTeamCodes.size > 0) {
    for (const code of liveTeamCodes) {
      const basePos = completedOnlyRanking.findIndex(r => r.team.code === code);
      const livePos = liveAllTimeRanking.findIndex(r => r.team.code === code);
      if (basePos >= 0 && livePos >= 0) {
        rankingDeltas.set(code, basePos - livePos); // positive = moved up
      }
    }
  }

  // Current tournament participations
  const currentParticipations = {};
  for (const group of tournament.draw.groups) {
    for (const team of group) {
      currentParticipations[team.code] = (baseStats.participations[team.code] || 0) + 1;
    }
  }

  // Merge participations
  const mergedParticipations = { ...baseStats.participations };
  for (const [code, count] of Object.entries(currentParticipations)) {
    mergedParticipations[code] = count;
  }

  // Merge biggest wins
  const allBiggestWins = [...baseStats.biggestWins, ...currentBiggestWins]
    .sort((a, b) => Math.abs(b.goalsA - b.goalsB) - Math.abs(a.goalsA - a.goalsB))
    .slice(0, 20);

  return {
    ...baseStats,
    participations: mergedParticipations,
    totalGoals: baseStats.totalGoals + currentGoals,
    currentTournamentGoals: currentGoals,
    currentTournamentMatches: currentMatchCount,
    biggestWins: allBiggestWins,
    hasLiveData: currentMatchCount > 0 || liveMatchesWithScores.length > 0,
    allTimeRanking: liveAllTimeRanking,
    liveTeamCodes,
    rankingDeltas,
  };
}

/**
 * Get recently completed matches (for dashboard display).
 * Returns matches with their full results, ordered by most recent first.
 */
export function getRecentMatches(edition, tournament, cycleMinute, limit = 4) {
  const recent = [];
  const fixturePatterns = [
    [[0, 1], [2, 3]],
    [[0, 2], [1, 3]],
    [[0, 3], [1, 2]],
  ];

  // Group stage matches
  for (let day = 0; day < 3; day++) {
    for (let g = 0; g < 8; g++) {
      for (let mi = 0; mi < 2; mi++) {
        const timing = getGroupMatchTiming(day, g, mi);
        if (timing.endMin <= cycleMinute) {
          const groupTeams = tournament.draw.groups[g];
          const [iA, iB] = fixturePatterns[day][mi];
          const match = tournament.groupStage.matches.find(
            m => m.group === g && m.matchday === day && m.matchIndex === mi
          );
          if (match) {
            recent.push({ ...match, endMin: timing.endMin, type: 'group' });
          }
        }
      }
    }
  }

  // Knockout matches
  const koRounds = [
    { round: 'R16', matches: tournament.knockout.r16, label: 'Octavos' },
    { round: 'QF', matches: tournament.knockout.qf, label: 'Cuartos' },
    { round: 'SF', matches: tournament.knockout.sf, label: 'Semifinal' },
    { round: 'THIRD', matches: [tournament.knockout.thirdPlace], label: '3er Puesto' },
    { round: 'FINAL', matches: [tournament.knockout.final], label: 'Final' },
  ];

  for (const { round, matches, label } of koRounds) {
    matches.forEach((match, i) => {
      const timing = getKnockoutMatchTiming(round, i);
      if (timing.endMin <= cycleMinute) {
        recent.push({ ...match, endMin: timing.endMin, type: 'knockout', roundLabel: label });
      }
    });
  }

  return recent
    .sort((a, b) => b.endMin - a.endMin)
    .slice(0, limit);
}

// Expose setTimeOffset globally for debug
if (typeof window !== 'undefined') {
  window.setTimeOffset = setTimeOffset;
  window.getCurrentState = getCurrentState;
}
