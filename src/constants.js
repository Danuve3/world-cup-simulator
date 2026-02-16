// World Cup Simulator — Constants
// All times in minutes

/** PRNG epoch: injected at build time via VITE_EPOCH env var */
export const EPOCH = import.meta.env.VITE_EPOCH
  ? Number(import.meta.env.VITE_EPOCH)
  : Date.UTC(2025, 0, 1, 0, 0, 0);

/** Total duration of one World Cup cycle in minutes */
export const CYCLE_DURATION = 10080; // 7 days

/** Schedule phases (start minute, end minute) */
export const SCHEDULE = {
  DRAW:        { start: 0,    end: 30,   label: 'Sorteo' },
  GROUP_STAGE: { start: 30,   end: 5790, label: 'Fase de Grupos' },
  REST_1:      { start: 5790, end: 5910, label: 'Descanso' },
  ROUND_16:    { start: 5910, end: 6630, label: 'Octavos de Final' },
  REST_2:      { start: 6630, end: 6780, label: 'Descanso' },
  QUARTER:     { start: 6780, end: 7380, label: 'Cuartos de Final' },
  REST_3:      { start: 7380, end: 7530, label: 'Descanso' },
  SEMI:        { start: 7530, end: 8130, label: 'Semifinales' },
  REST_4:      { start: 8130, end: 8280, label: 'Descanso' },
  THIRD_PLACE: { start: 8280, end: 8580, label: 'Tercer Puesto' },
  REST_5:      { start: 8580, end: 8730, label: 'Descanso' },
  FINAL:       { start: 8730, end: 9030, label: 'Final' },
  CELEBRATION: { start: 9030, end: 9075, label: 'Celebraci\u00f3n' },
  COUNTDOWN:   { start: 9075, end: 10080, label: 'Pr\u00f3ximo Mundial' },
};

/** Match simulation constants */
export const MATCH = {
  REGULAR_MINUTES: 90,
  EXTRA_TIME_MINUTES: 30,
  GOAL_PROBABILITY_BASE: 0.025,  // ~2.5% per minute
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
