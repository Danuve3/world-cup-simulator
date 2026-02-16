import { createPRNG, combineSeed } from './prng.js';
import { TEAMS, getTeamsByRating } from './teams.js';
import { GROUPS } from '../constants.js';

/**
 * Perform the World Cup draw.
 * 32 teams divided into 4 pots of 8, distributed across 8 groups.
 *
 * Rules:
 * - Host goes to Group A, Pot 1
 * - Defending champion goes to Group B, Pot 1 (if qualified)
 * - Max 2 teams from same confederation per group (except UEFA: max 2)
 * - Pots assigned by rating
 *
 * @param {number} edition - World Cup edition
 * @param {object} host - Host team object
 * @param {string|null} defendingChampionCode - Code of defending champion
 * @returns {{ groups: object[][], pots: object[][], drawSequence: object[] }}
 */
export function performDraw(edition, host, defendingChampionCode) {
  const rng = createPRNG(combineSeed('draw', edition));

  // Select 32 teams: host + champion + top rated
  const qualified = selectQualifiedTeams(rng, host, defendingChampionCode);

  // Sort by rating for pot assignment
  const sorted = [...qualified].sort((a, b) => b.rating - a.rating);

  // Create pots (8 teams each)
  const pots = [[], [], [], []];

  // Host always in Pot 1
  pots[0].push(host);

  // Fill Pot 1 with top-rated (excluding host if already there)
  let remaining = sorted.filter(t => t.code !== host.code);

  // If defending champion is qualified and not the host, ensure they're in Pot 1
  const champion = defendingChampionCode
    ? remaining.find(t => t.code === defendingChampionCode)
    : null;
  if (champion) {
    pots[0].push(champion);
    remaining = remaining.filter(t => t.code !== champion.code);
  }

  // Fill rest of Pot 1
  while (pots[0].length < 8) {
    pots[0].push(remaining.shift());
  }

  // Fill Pots 2-4
  for (let i = 0; i < remaining.length; i++) {
    const potIndex = Math.min(3, Math.floor(i / 8) + 1);
    pots[potIndex].push(remaining[i]);
  }

  // Shuffle within each pot
  for (let p = 0; p < 4; p++) {
    pots[p] = rng.shuffle(pots[p]);
  }

  // Assign to groups
  const groups = Array.from({ length: 8 }, () => []);
  const drawSequence = [];

  // Host → Group A position 0
  groups[0].push(host);
  drawSequence.push({ team: host, group: 0, pot: 0, type: 'host' });

  // Champion → Group B position 0 (if in Pot 1)
  if (champion) {
    groups[1].push(champion);
    drawSequence.push({ team: champion, group: 1, pot: 0, type: 'champion' });
  }

  // Distribute rest of Pot 1
  const pot1Rest = pots[0].filter(
    t => t.code !== host.code && (!champion || t.code !== champion.code)
  );
  const availableGroupsPot1 = [];
  for (let g = 0; g < 8; g++) {
    if (groups[g].length === 0) availableGroupsPot1.push(g);
  }
  for (let i = 0; i < pot1Rest.length; i++) {
    const g = availableGroupsPot1[i];
    groups[g].push(pot1Rest[i]);
    drawSequence.push({ team: pot1Rest[i], group: g, pot: 0, type: 'draw' });
  }

  // Distribute Pots 2-4 with confederation constraint
  for (let p = 1; p < 4; p++) {
    for (const team of pots[p]) {
      const validGroups = findValidGroup(groups, team);
      const g = rng.pick(validGroups);
      groups[g].push(team);
      drawSequence.push({ team, group: g, pot: p, type: 'draw' });
    }
  }

  return { groups, pots, drawSequence };
}

/**
 * Find valid groups for a team respecting confederation limits.
 * Max 2 from the same confederation per group.
 */
function findValidGroup(groups, team) {
  const valid = [];
  for (let g = 0; g < 8; g++) {
    if (groups[g].length >= 4) continue;
    const confCount = groups[g].filter(
      t => t.confederation === team.confederation
    ).length;
    const maxPerConf = 2;
    if (confCount < maxPerConf) {
      valid.push(g);
    }
  }
  // Fallback: if constraints can't be met, use any group with space
  if (valid.length === 0) {
    for (let g = 0; g < 8; g++) {
      if (groups[g].length < 4) valid.push(g);
    }
  }
  return valid;
}

/**
 * Select 32 qualified teams: host + champion + top remaining by rating.
 * Uses PRNG for slight randomness in qualification (borderline teams).
 */
function selectQualifiedTeams(rng, host, defendingChampionCode) {
  const selected = new Set();
  const result = [];

  // Host always qualifies
  selected.add(host.code);
  result.push(host);

  // Defending champion always qualifies
  if (defendingChampionCode) {
    const champ = TEAMS.find(t => t.code === defendingChampionCode);
    if (champ && !selected.has(champ.code)) {
      selected.add(champ.code);
      result.push(champ);
    }
  }

  // Remaining: sort by rating with slight random perturbation
  const candidates = TEAMS
    .filter(t => !selected.has(t.code))
    .map(t => ({ ...t, sortKey: t.rating + rng.nextInt(-3, 3) }))
    .sort((a, b) => b.sortKey - a.sortKey);

  for (const c of candidates) {
    if (result.length >= GROUPS.TOTAL_TEAMS) break;
    result.push(c);
  }

  return result;
}
