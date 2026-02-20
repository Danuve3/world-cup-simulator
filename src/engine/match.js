import { createPRNG, combineSeed } from './prng.js';
import { MATCH } from '../constants.js';
import { POSITION_GOAL_WEIGHT } from './players.js';
import { getSquadForEdition } from './playerEvolution.js';

/**
 * Simulate a match minute by minute.
 *
 * @param {number} edition - WC edition
 * @param {string} matchId - Unique match identifier (e.g., 'G-A-0' for group A match 0)
 * @param {object} teamA - Team object
 * @param {object} teamB - Team object
 * @param {boolean} allowDraw - Whether draws are allowed (group stage)
 * @returns {object} Match result
 */
export function simulateMatch(edition, matchId, teamA, teamB, allowDraw = true) {
  const rng = createPRNG(combineSeed('match', edition, matchId));

  // Load squads for scorer attribution (deterministic per edition)
  const squadA = getSquadForEdition(teamA.code, edition);
  const squadB = getSquadForEdition(teamB.code, edition);

  const events = [];
  let goalsA = 0;
  let goalsB = 0;

  // Simulate regular time (90 min)
  for (let min = 1; min <= MATCH.REGULAR_MINUTES; min++) {
    const result = simulateMinute(rng, min, teamA, teamB, goalsA, goalsB, squadA, squadB);
    if (result) {
      events.push(result);
      if (result.team === 'A') goalsA++;
      else goalsB++;
    }
  }

  let extraTime = false;
  let penalties = null;

  // Extra time if needed (knockout only)
  if (!allowDraw && goalsA === goalsB) {
    extraTime = true;
    for (let min = 91; min <= MATCH.REGULAR_MINUTES + MATCH.EXTRA_TIME_MINUTES; min++) {
      const result = simulateMinute(rng, min, teamA, teamB, goalsA, goalsB, squadA, squadB);
      if (result) {
        events.push(result);
        if (result.team === 'A') goalsA++;
        else goalsB++;
      }
    }

    // Penalties if still tied
    if (goalsA === goalsB) {
      penalties = simulatePenalties(rng, teamA, teamB);
    }
  }

  const winner = penalties
    ? (penalties.scoreA > penalties.scoreB ? 'A' : 'B')
    : goalsA > goalsB ? 'A' : goalsA < goalsB ? 'B' : null;

  return {
    matchId,
    teamA,
    teamB,
    goalsA,
    goalsB,
    events,
    extraTime,
    penalties,
    winner,
    winnerTeam: winner === 'A' ? teamA : winner === 'B' ? teamB : null,
    loserTeam: winner === 'A' ? teamB : winner === 'B' ? teamA : null,
  };
}

/**
 * Simulate a single minute of play.
 * Returns a goal event or null.
 */
function simulateMinute(rng, minute, teamA, teamB, goalsA, goalsB, squadA, squadB) {
  const rA = teamA.rating;
  const rB = teamB.rating;

  // Fatigue increases goal chance late in the game
  let fatigueBoost = 0;
  if (minute >= MATCH.FATIGUE_START) {
    fatigueBoost = MATCH.FATIGUE_BOOST;
  }

  // Total goal probability scales linearly with rating mismatch:
  // dominant teams create significantly more chances than evenly-matched ones
  const ratingRatio = Math.max(rA, rB) / Math.min(rA, rB);
  const goalProb = MATCH.GOAL_PROBABILITY_BASE * ratingRatio + fatigueBoost;

  if (rng.nextBool(goalProb)) {
    // Scoring team weighted by rating⁴ — strongly favors better team,
    // but still allows upsets (surprise factor preserved)
    const powerA = rA * rA * rA * rA;
    const powerB = rB * rB * rB * rB;
    const isTeamA = rng.nextBool(powerA / (powerA + powerB));
    const scoringTeam = isTeamA ? 'A' : 'B';
    const squad = isTeamA ? squadA : squadB;
    const scorer = pickScorer(rng, squad);

    return {
      type: 'goal',
      minute,
      team: scoringTeam,
      teamCode: isTeamA ? teamA.code : teamB.code,
      scorerId: scorer ? scorer.id : null,
      scorerName: scorer ? scorer.name : null,
      scorerPosition: scorer ? scorer.position : null,
    };
  }

  return null;
}

/**
 * Pick a goal scorer from the squad using position × rating² weighting.
 * FW >> MF >> DF >> GK (GK goals are astronomically rare but possible).
 */
function pickScorer(rng, squad) {
  if (!squad || squad.length === 0) return null;
  const weights = squad.map(p => POSITION_GOAL_WEIGHT[p.position] * p.rating * p.rating);
  return rng.weightedSample(squad, weights);
}

/**
 * Simulate penalty shootout.
 */
function simulatePenalties(rng, teamA, teamB) {
  let scoreA = 0;
  let scoreB = 0;
  const kicks = [];

  // Standard 5 rounds
  for (let round = 1; round <= MATCH.PENALTY_ROUNDS; round++) {
    // Team A kicks
    const aScores = rng.nextBool(MATCH.PENALTY_SCORE_PROB);
    if (aScores) scoreA++;
    kicks.push({ round, team: 'A', scored: aScores });

    // Check if already decided
    const remainingA = MATCH.PENALTY_ROUNDS - round;
    const remainingB = MATCH.PENALTY_ROUNDS - round + 1;
    if (scoreA > scoreB + remainingB) break;
    if (scoreB > scoreA + remainingA && round < MATCH.PENALTY_ROUNDS) break;

    // Team B kicks
    const bScores = rng.nextBool(MATCH.PENALTY_SCORE_PROB);
    if (bScores) scoreB++;
    kicks.push({ round, team: 'B', scored: bScores });

    // Check if already decided
    if (scoreB > scoreA + remainingA) break;
    if (scoreA > scoreB + remainingA) break;
  }

  // Sudden death if still tied
  let sdRound = MATCH.PENALTY_ROUNDS + 1;
  while (scoreA === scoreB) {
    const aScores = rng.nextBool(MATCH.PENALTY_SCORE_PROB);
    if (aScores) scoreA++;
    kicks.push({ round: sdRound, team: 'A', scored: aScores });

    const bScores = rng.nextBool(MATCH.PENALTY_SCORE_PROB);
    if (bScores) scoreB++;
    kicks.push({ round: sdRound, team: 'B', scored: bScores });

    sdRound++;
    if (sdRound > 20) break; // Safety limit
  }

  return { scoreA, scoreB, kicks };
}

/**
 * Get a match result at a specific minute (for live simulation).
 * Returns partial match state up to that minute.
 */
export function getMatchAtMinute(edition, matchId, teamA, teamB, currentMinute, allowDraw = true) {
  const full = simulateMatch(edition, matchId, teamA, teamB, allowDraw);

  // Filter events to only those up to currentMinute
  const visibleEvents = full.events.filter(e => e.minute <= currentMinute);
  const goalsA = visibleEvents.filter(e => e.team === 'A').length;
  const goalsB = visibleEvents.filter(e => e.team === 'B').length;

  const isFinished = allowDraw
    ? currentMinute >= MATCH.REGULAR_MINUTES
    : full.extraTime
      ? (full.penalties ? currentMinute >= 120 : currentMinute >= 120)
      : currentMinute >= MATCH.REGULAR_MINUTES;

  return {
    ...full,
    goalsA,
    goalsB,
    events: visibleEvents,
    currentMinute: Math.min(currentMinute, full.extraTime ? 120 : 90),
    isFinished: currentMinute >= (full.extraTime ? 120 : 90),
    isLive: !isFinished && currentMinute >= 1,
    penalties: isFinished ? full.penalties : null,
    winner: isFinished ? full.winner : null,
    winnerTeam: isFinished ? full.winnerTeam : null,
    loserTeam: isFinished ? full.loserTeam : null,
  };
}
