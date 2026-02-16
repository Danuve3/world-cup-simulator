import { simulateMatch } from './match.js';

/**
 * Standard FIFA knockout bracket.
 * R16 matchups: 1A v 2B, 1C v 2D, 1E v 2F, 1G v 2H, 1B v 2A, 1D v 2C, 1F v 2E, 1H v 2G
 */
const R16_MATCHUPS = [
  [0, 1], // 1A vs 2B → match 0
  [2, 3], // 1C vs 2D → match 1
  [4, 5], // 1E vs 2F → match 2
  [6, 7], // 1G vs 2H → match 3
  [1, 0], // 1B vs 2A → match 4
  [3, 2], // 1D vs 2C → match 5
  [5, 4], // 1F vs 2E → match 6
  [7, 6], // 1H vs 2G → match 7
];

/**
 * Simulate the entire knockout stage.
 *
 * @param {number} edition - World Cup edition
 * @param {object[]} groupWinners - Array from getGroupWinners() with { first, second }
 * @returns {object} Knockout results
 */
export function simulateKnockout(edition, groupWinners) {
  // Round of 16
  const r16 = R16_MATCHUPS.map(([gA, gB], i) => {
    const teamA = groupWinners[gA].first;
    const teamB = groupWinners[gB].second;
    return simulateMatch(edition, `R16-${i}`, teamA, teamB, false);
  });

  // Quarter-finals
  const qf = [];
  for (let i = 0; i < 4; i++) {
    const teamA = r16[i * 2].winnerTeam;
    const teamB = r16[i * 2 + 1].winnerTeam;
    qf.push(simulateMatch(edition, `QF-${i}`, teamA, teamB, false));
  }

  // Semi-finals
  const sf = [];
  for (let i = 0; i < 2; i++) {
    const teamA = qf[i * 2].winnerTeam;
    const teamB = qf[i * 2 + 1].winnerTeam;
    sf.push(simulateMatch(edition, `SF-${i}`, teamA, teamB, false));
  }

  // Third place match
  const thirdPlace = simulateMatch(
    edition,
    'THIRD',
    sf[0].loserTeam,
    sf[1].loserTeam,
    false
  );

  // Final
  const final = simulateMatch(
    edition,
    'FINAL',
    sf[0].winnerTeam,
    sf[1].winnerTeam,
    false
  );

  return {
    r16,
    qf,
    sf,
    thirdPlace,
    final,
    champion: final.winnerTeam,
    runnerUp: final.loserTeam,
    thirdPlaceTeam: thirdPlace.winnerTeam,
    fourthPlaceTeam: thirdPlace.loserTeam,
  };
}

/**
 * Get all knockout matches in order (for timeline mapping).
 */
export function getKnockoutMatchList() {
  const matches = [];

  // R16: 8 matches
  for (let i = 0; i < 8; i++) {
    matches.push({ round: 'R16', matchIndex: i, matchId: `R16-${i}` });
  }

  // QF: 4 matches
  for (let i = 0; i < 4; i++) {
    matches.push({ round: 'QF', matchIndex: i, matchId: `QF-${i}` });
  }

  // SF: 2 matches
  for (let i = 0; i < 2; i++) {
    matches.push({ round: 'SF', matchIndex: i, matchId: `SF-${i}` });
  }

  // Third place
  matches.push({ round: 'THIRD', matchIndex: 0, matchId: 'THIRD' });

  // Final
  matches.push({ round: 'FINAL', matchIndex: 0, matchId: 'FINAL' });

  return matches;
}
