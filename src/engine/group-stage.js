import { simulateMatch } from './match.js';

/**
 * Group stage: 8 groups × 4 teams each.
 * 3 matchdays, each matchday has 3 matches per group (but 2 per team).
 * Total: 48 matches.
 *
 * Matchday fixtures (team indices 0,1,2,3):
 *   Day 1: 0v1, 2v3
 *   Day 2: 0v2, 1v3
 *   Day 3: 0v3, 1v2
 */
const FIXTURE_PATTERN = [
  [[0, 1], [2, 3]], // Matchday 1
  [[0, 2], [1, 3]], // Matchday 2
  [[0, 3], [1, 2]], // Matchday 3
];

/**
 * Simulate all group stage matches and compute standings.
 *
 * @param {number} edition - World Cup edition
 * @param {object[][]} groups - Array of 8 groups, each with 4 teams
 * @returns {{ matches: object[], standings: object[][] }}
 */
export function simulateGroupStage(edition, groups) {
  const allMatches = [];

  for (let g = 0; g < groups.length; g++) {
    const groupTeams = groups[g];
    const groupLetter = String.fromCharCode(65 + g); // A-H

    for (let day = 0; day < FIXTURE_PATTERN.length; day++) {
      for (let mi = 0; mi < FIXTURE_PATTERN[day].length; mi++) {
        const [iA, iB] = FIXTURE_PATTERN[day][mi];
        const matchId = `G-${groupLetter}-${day}-${mi}`;
        const result = simulateMatch(edition, matchId, groupTeams[iA], groupTeams[iB], true);
        allMatches.push({
          ...result,
          group: g,
          groupLetter,
          matchday: day,
          matchIndex: mi,
        });
      }
    }
  }

  // Compute standings
  const standings = computeStandings(groups, allMatches);

  return { matches: allMatches, standings };
}

/**
 * Compute group standings from match results.
 * Tiebreakers: points → goal difference → goals for → head-to-head
 */
export function computeStandings(groups, matches) {
  return groups.map((groupTeams, g) => {
    const groupMatches = matches.filter(m => m.group === g);
    const table = groupTeams.map(team => ({
      team,
      played: 0,
      won: 0,
      drawn: 0,
      lost: 0,
      goalsFor: 0,
      goalsAgainst: 0,
      goalDifference: 0,
      points: 0,
    }));

    for (const match of groupMatches) {
      const rowA = table.find(r => r.team.code === match.teamA.code);
      const rowB = table.find(r => r.team.code === match.teamB.code);
      if (!rowA || !rowB) continue;

      rowA.played++;
      rowB.played++;
      rowA.goalsFor += match.goalsA;
      rowA.goalsAgainst += match.goalsB;
      rowB.goalsFor += match.goalsB;
      rowB.goalsAgainst += match.goalsA;

      if (match.goalsA > match.goalsB) {
        rowA.won++;
        rowA.points += 3;
        rowB.lost++;
      } else if (match.goalsA < match.goalsB) {
        rowB.won++;
        rowB.points += 3;
        rowA.lost++;
      } else {
        rowA.drawn++;
        rowB.drawn++;
        rowA.points += 1;
        rowB.points += 1;
      }
    }

    // Update goal differences
    for (const row of table) {
      row.goalDifference = row.goalsFor - row.goalsAgainst;
    }

    // Sort: points → GD → GF → head-to-head
    table.sort((a, b) => {
      if (b.points !== a.points) return b.points - a.points;
      if (b.goalDifference !== a.goalDifference) return b.goalDifference - a.goalDifference;
      if (b.goalsFor !== a.goalsFor) return b.goalsFor - a.goalsFor;

      // Head-to-head
      const h2h = groupMatches.find(
        m =>
          (m.teamA.code === a.team.code && m.teamB.code === b.team.code) ||
          (m.teamA.code === b.team.code && m.teamB.code === a.team.code)
      );
      if (h2h) {
        const aGoals = h2h.teamA.code === a.team.code ? h2h.goalsA : h2h.goalsB;
        const bGoals = h2h.teamA.code === a.team.code ? h2h.goalsB : h2h.goalsA;
        return bGoals - aGoals;
      }
      return 0;
    });

    return table;
  });
}

/**
 * Get the 16 teams that advance from group stage.
 * Top 2 from each group.
 */
export function getGroupWinners(standings) {
  const winners = [];
  for (const groupTable of standings) {
    winners.push({
      first: groupTable[0].team,
      second: groupTable[1].team,
      groupIndex: standings.indexOf(groupTable),
    });
  }
  return winners;
}

/**
 * Get group match schedule: which matchday and index each match is in.
 * Used for mapping to timeline.
 */
export function getGroupMatchList(groups) {
  const matches = [];
  for (let g = 0; g < groups.length; g++) {
    const groupLetter = String.fromCharCode(65 + g);
    for (let day = 0; day < FIXTURE_PATTERN.length; day++) {
      for (let mi = 0; mi < FIXTURE_PATTERN[day].length; mi++) {
        const [iA, iB] = FIXTURE_PATTERN[day][mi];
        matches.push({
          group: g,
          groupLetter,
          matchday: day,
          matchIndex: mi,
          matchId: `G-${groupLetter}-${day}-${mi}`,
          teamAIndex: iA,
          teamBIndex: iB,
        });
      }
    }
  }
  return matches;
}
