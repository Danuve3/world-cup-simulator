// World Cup Simulator — Constants
// All times in minutes

/** Production epoch — injected by CI via VITE_EPOCH env var */
const PROD_EPOCH = 1771358400000; // 2026-06-17 20:00 UTC

/**
 * Dev epoch — fixed, ~4 cycles before PROD_EPOCH so dev tournaments
 * are completely different from production ones (different PRNG seeds).
 * Never changes between `npm run dev` sessions.
 */
const DEV_EPOCH = 1768939200000; // 2026-01-20 ~UTC (PROD - 4 cycles)

export const EPOCH = import.meta.env.VITE_EPOCH
  ? Number(import.meta.env.VITE_EPOCH)
  : DEV_EPOCH;

/** Total duration of one World Cup cycle in minutes */
export const CYCLE_DURATION = 10080; // 7 days

/** Draw timing constants */
export const DRAW_COUNTDOWN_MS = 5000; // 5-second countdown before each reveal
export const DRAW_DISPLAY_MS   = 3000; // 3-second display after each reveal
// Total cycle per team: 8 s × 32 teams = 256 s (~4.3 min), fits within the 60-min DRAW phase

/** Schedule phases (start minute, end minute) — all times are multiples of 60 so matches start at :00 */
export const SCHEDULE = {
  DRAW:        { start: 0,    end: 60,   label: 'Sorteo' },
  GROUP_STAGE: { start: 60,   end: 5820, label: 'Fase de Grupos' },
  REST_1:      { start: 5820, end: 5940, label: 'Descanso' },
  ROUND_16:    { start: 5940, end: 6660, label: 'Octavos de Final' },
  REST_2:      { start: 6660, end: 6780, label: 'Descanso' },
  QUARTER:     { start: 6780, end: 7380, label: 'Cuartos de Final' },
  REST_3:      { start: 7380, end: 7500, label: 'Descanso' },
  SEMI:        { start: 7500, end: 8100, label: 'Semifinales' },
  REST_4:      { start: 8100, end: 8220, label: 'Descanso' },
  THIRD_PLACE: { start: 8220, end: 8520, label: 'Tercer Puesto' },
  REST_5:      { start: 8520, end: 8640, label: 'Descanso' },
  FINAL:       { start: 8640, end: 8940, label: 'Final' },
  CELEBRATION: { start: 8940, end: 9000, label: 'Celebraci\u00f3n' },
  COUNTDOWN:   { start: 9000, end: 10080, label: 'Pr\u00f3ximo Mundial' },
};

/** Match simulation constants */
export const MATCH = {
  REGULAR_MINUTES: 90,
  EXTRA_TIME_MINUTES: 30,
  GOAL_PROBABILITY_BASE: 0.027,  // ~2.7% per minute (≈WC historical average)
  FATIGUE_START: 75,
  FATIGUE_BOOST: 0.005,
  PENALTY_ROUNDS: 5,
  PENALTY_SCORE_PROB: 0.75,
};

/** Groups config */
export const GROUPS = {
  COUNT: 8,
  TEAMS_PER_GROUP: 4,
  TOTAL_TEAMS: 32,
};

/** Knockout slot duration in minutes (includes gap for extra time) */
export const KNOCKOUT_SLOT = 90;

/** Number of teams in draw pots */
export const POT_SIZE = 8;

/** Confederations */
export const CONFEDERATIONS = ['UEFA', 'CONMEBOL', 'CONCACAF', 'CAF', 'AFC', 'OFC'];
