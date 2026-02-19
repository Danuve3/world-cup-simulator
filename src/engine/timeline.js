import { SCHEDULE, CYCLE_DURATION, KNOCKOUT_SLOT } from '../constants.js';

/**
 * Group stage sub-schedule.
 * 48 matches spread across ~5760 minutes (30 to 5790).
 * 3 matchdays × 8 groups × 2 matches per group = 48 matches.
 *
 * Matchday 1: min 60-1980 (1920 min)
 * Matchday 2: min 1980-3900 (1920 min)
 * Matchday 3: min 3900-5820 (1920 min)
 *
 * Each matchday: 16 matches in 8 time slots of 2 simultaneous matches.
 * Each slot: ~23 min match duration + 1 min gap = ~24 min per slot cycle.
 * But we space 240 min between slots to spread across the day.
 */
const GROUP_MATCHDAY_DURATION = 1920; // minutes per matchday
const MATCHES_PER_MATCHDAY = 16; // 8 groups × 2 matches
const SLOTS_PER_MATCHDAY = 8; // 8 time slots, 2 matches each
const SLOT_SPACING = 240; // minutes between slot starts
const MATCH_DURATION = 10; // minutes for a full 90-min match — 1 game min ≈ 6.7 real seconds
const HALFTIME_PAUSE = 10 / 60; // 10 real seconds shown as "Descanso"
const ENDGAME_PAUSE = 10 / 60;  // 10 real seconds shown as "Finalizado"
const MATCH_WINDOW = MATCH_DURATION + HALFTIME_PAUSE + ENDGAME_PAUSE;

/**
 * Knockout round sub-schedules.
 * Each knockout round has matches spread evenly within its time window.
 */
const KNOCKOUT_ROUNDS = {
  R16:   { start: 5940, end: 6660, matches: 8, perSlot: 2 },
  QF:    { start: 6780, end: 7380, matches: 4, perSlot: 2 },
  SF:    { start: 7500, end: 8100, matches: 2, perSlot: 1 },
  THIRD: { start: 8220, end: 8520, matches: 1, perSlot: 1 },
  FINAL: { start: 8640, end: 8940, matches: 1, perSlot: 1 },
};

/**
 * Map a group stage match to its start time within the cycle.
 *
 * @param {number} matchday - 0, 1, or 2
 * @param {number} group - 0-7
 * @param {number} matchIndex - 0 or 1 (within the matchday)
 * @returns {{ startMin: number, endMin: number }}
 */
export function getGroupMatchTiming(matchday, group, matchIndex) {
  const matchdayStart = SCHEDULE.GROUP_STAGE.start + matchday * GROUP_MATCHDAY_DURATION;
  // Each slot handles 2 groups simultaneously
  const slotIndex = Math.floor(group / 1); // Each group gets its own slot time
  // Actually: arrange 16 matches into 8 slots of 2 each
  // Slot assignment: group index IS the slot index; both matches of the group play simultaneously
  const startMin = matchdayStart + group * SLOT_SPACING;
  const endMin = startMin + MATCH_WINDOW;

  return { startMin, endMin };
}

/**
 * Map a knockout match to its start time within the cycle.
 *
 * @param {string} round - 'R16', 'QF', 'SF', 'THIRD', 'FINAL'
 * @param {number} matchIndex - Match index within the round
 * @returns {{ startMin: number, endMin: number }}
 */
export function getKnockoutMatchTiming(round, matchIndex) {
  const config = KNOCKOUT_ROUNDS[round];
  if (!config) throw new Error(`Unknown round: ${round}`);

  const totalSlots = Math.ceil(config.matches / config.perSlot);
  const slotIndex = Math.floor(matchIndex / config.perSlot);
  const slotDuration = (config.end - config.start) / totalSlots;
  const startMinFloor = Math.floor(config.start + slotIndex * slotDuration);
  const endMin = startMinFloor + MATCH_WINDOW;

  return { startMin: startMinFloor, endMin };
}

/**
 * Convert elapsed match time (in real minutes) to a display state.
 * Accounts for halftime and end-of-match pauses.
 *
 * @param {number} elapsedMin - Real minutes since match start (within MATCH_WINDOW)
 * @returns {{ minute: number, phase: 'playing'|'halftime'|'finalizado' }}
 */
export function getMatchDisplayState(elapsedMin) {
  const half = MATCH_DURATION / 2;
  if (elapsedMin < half) {
    return { minute: Math.max(1, Math.min(45, Math.round((elapsedMin / half) * 45))), phase: 'playing' };
  }
  if (elapsedMin < half + HALFTIME_PAUSE) {
    return { minute: 45, phase: 'halftime' };
  }
  if (elapsedMin < MATCH_DURATION + HALFTIME_PAUSE) {
    const t = elapsedMin - half - HALFTIME_PAUSE;
    return { minute: Math.max(46, Math.min(90, 46 + Math.round((t / half) * 44))), phase: 'playing' };
  }
  return { minute: 90, phase: 'finalizado' };
}

/**
 * Determine the current phase and sub-state from a cycle-relative minute.
 *
 * @param {number} cycleMinute - Minutes since start of this WC cycle (0-10079)
 * @returns {object} Current phase info
 */
export function getPhaseAtMinute(cycleMinute) {
  for (const [key, phase] of Object.entries(SCHEDULE)) {
    if (cycleMinute >= phase.start && cycleMinute < phase.end) {
      return {
        phase: key,
        label: phase.label,
        phaseStart: phase.start,
        phaseEnd: phase.end,
        phaseProgress: (cycleMinute - phase.start) / (phase.end - phase.start),
        minuteInPhase: cycleMinute - phase.start,
      };
    }
  }

  // Should not happen, but fallback
  return {
    phase: 'COUNTDOWN',
    label: 'Pr\u00f3ximo Mundial',
    phaseStart: SCHEDULE.COUNTDOWN.start,
    phaseEnd: SCHEDULE.COUNTDOWN.end,
    phaseProgress: 1,
    minuteInPhase: 0,
  };
}

/**
 * Find which match (if any) is currently live at a given cycle minute.
 *
 * @param {number} cycleMinute - Minutes since start of this WC cycle
 * @returns {object|null} Current live match info or null
 */
export function getLiveMatches(cycleMinute) {
  const phase = getPhaseAtMinute(cycleMinute);
  const live = [];

  if (phase.phase === 'GROUP_STAGE') {
    // Check all possible group matches
    for (let day = 0; day < 3; day++) {
      for (let g = 0; g < 8; g++) {
        for (let mi = 0; mi < 2; mi++) {
          const timing = getGroupMatchTiming(day, g, mi);
          if (cycleMinute >= timing.startMin && cycleMinute < timing.endMin) {
            const { minute: matchMinute, phase: matchPhase } = getMatchDisplayState(cycleMinute - timing.startMin);
            live.push({
              type: 'group',
              matchday: day,
              group: g,
              matchIndex: mi,
              matchId: `G-${String.fromCharCode(65 + g)}-${day}-${mi}`,
              matchMinute,
              matchPhase,
              timing,
            });
          }
        }
      }
    }
  } else {
    // Check knockout rounds
    for (const [round, config] of Object.entries(KNOCKOUT_ROUNDS)) {
      if (phase.phase !== round && !isPhaseForRound(phase.phase, round)) continue;
      for (let i = 0; i < config.matches; i++) {
        const timing = getKnockoutMatchTiming(round, i);
        if (cycleMinute >= timing.startMin && cycleMinute < timing.endMin) {
          const { minute: matchMinute, phase: matchPhase } = getMatchDisplayState(cycleMinute - timing.startMin);
          live.push({
            type: 'knockout',
            round,
            matchIndex: i,
            matchId: round === 'THIRD' ? 'THIRD' : round === 'FINAL' ? 'FINAL' : `${round}-${i}`,
            matchMinute,
            matchPhase,
            timing,
          });
        }
      }
    }
  }

  return live;
}

function isPhaseForRound(phase, round) {
  const mapping = {
    ROUND_16: 'R16',
    QUARTER: 'QF',
    SEMI: 'SF',
    THIRD_PLACE: 'THIRD',
    FINAL: 'FINAL',
  };
  return mapping[phase] === round;
}

/**
 * Get the list of completed matches at a given cycle minute.
 */
export function getCompletedMatchIds(cycleMinute) {
  const completed = [];

  // Group stage
  for (let day = 0; day < 3; day++) {
    for (let g = 0; g < 8; g++) {
      for (let mi = 0; mi < 2; mi++) {
        const timing = getGroupMatchTiming(day, g, mi);
        if (cycleMinute >= timing.endMin) {
          completed.push(`G-${String.fromCharCode(65 + g)}-${day}-${mi}`);
        }
      }
    }
  }

  // Knockout
  for (const [round, config] of Object.entries(KNOCKOUT_ROUNDS)) {
    for (let i = 0; i < config.matches; i++) {
      const timing = getKnockoutMatchTiming(round, i);
      if (cycleMinute >= timing.endMin) {
        completed.push(
          round === 'THIRD' ? 'THIRD' : round === 'FINAL' ? 'FINAL' : `${round}-${i}`
        );
      }
    }
  }

  return completed;
}

/**
 * Get upcoming matches (not yet started) at a given cycle minute.
 * Returns next N matches.
 */
export function getUpcomingMatches(cycleMinute, limit = 4) {
  const upcoming = [];

  // Collect all matches with their timing
  const allMatches = [];

  for (let day = 0; day < 3; day++) {
    for (let g = 0; g < 8; g++) {
      for (let mi = 0; mi < 2; mi++) {
        const timing = getGroupMatchTiming(day, g, mi);
        allMatches.push({
          type: 'group',
          matchday: day,
          group: g,
          matchIndex: mi,
          matchId: `G-${String.fromCharCode(65 + g)}-${day}-${mi}`,
          ...timing,
        });
      }
    }
  }

  for (const [round, config] of Object.entries(KNOCKOUT_ROUNDS)) {
    for (let i = 0; i < config.matches; i++) {
      const timing = getKnockoutMatchTiming(round, i);
      allMatches.push({
        type: 'knockout',
        round,
        matchIndex: i,
        matchId: round === 'THIRD' ? 'THIRD' : round === 'FINAL' ? 'FINAL' : `${round}-${i}`,
        ...timing,
      });
    }
  }

  return allMatches
    .filter(m => m.startMin > cycleMinute)
    .sort((a, b) => a.startMin - b.startMin)
    .slice(0, limit);
}
