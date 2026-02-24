import { describe, it, expect } from 'vitest';
import { simulateMatch, getMatchAtMinute } from '../src/engine/match.js';
import { getTeamByCode } from '../src/engine/teams.js';

const TEAM_A = getTeamByCode('es');  // España — UEFA, rating 91
const TEAM_B = getTeamByCode('br');  // Brasil — CONMEBOL, rating 92

describe('Match simulation', () => {
  it('is deterministic — same inputs produce same result', () => {
    const r1 = simulateMatch(0, 'test-1', TEAM_A, TEAM_B, true);
    const r2 = simulateMatch(0, 'test-1', TEAM_A, TEAM_B, true);
    expect(r1.goalsA).toBe(r2.goalsA);
    expect(r1.goalsB).toBe(r2.goalsB);
    expect(r1.events.length).toBe(r2.events.length);
  });

  it('returns valid goal counts', () => {
    const result = simulateMatch(0, 'test-2', TEAM_A, TEAM_B, true);
    expect(result.goalsA).toBeGreaterThanOrEqual(0);
    expect(result.goalsB).toBeGreaterThanOrEqual(0);
    expect(result.goalsA).toBeLessThan(20); // Reasonable upper bound
  });

  it('has events with valid minutes', () => {
    const result = simulateMatch(0, 'test-3', TEAM_A, TEAM_B, true);
    for (const event of result.events) {
      expect(event.minute).toBeGreaterThanOrEqual(1);
      expect(event.minute).toBeLessThanOrEqual(120);
      expect(event.type).toBe('goal');
      expect(['A', 'B']).toContain(event.team);
    }
  });

  it('knockout match always produces a winner', () => {
    // Run multiple matches to ensure at least one goes to penalties
    for (let i = 0; i < 20; i++) {
      const result = simulateMatch(0, `ko-${i}`, TEAM_A, TEAM_B, false);
      expect(result.winner).toBeTruthy();
      expect(['A', 'B']).toContain(result.winner);
    }
  });

  it('group match can end in a draw', () => {
    // Run many matches, at least one should be a draw
    let hasDraws = false;
    for (let i = 0; i < 100; i++) {
      const result = simulateMatch(0, `group-${i}`, TEAM_A, TEAM_B, true);
      if (result.winner === null) {
        hasDraws = true;
        break;
      }
    }
    expect(hasDraws).toBe(true);
  });
});

describe('getMatchAtMinute', () => {
  it('shows no goals at minute 0', () => {
    const state = getMatchAtMinute(0, 'live-1', TEAM_A, TEAM_B, 0, true);
    expect(state.goalsA).toBe(0);
    expect(state.goalsB).toBe(0);
    expect(state.events.length).toBe(0);
  });

  it('shows full result at minute 90', () => {
    const full = simulateMatch(0, 'live-2', TEAM_A, TEAM_B, true);
    const atEnd = getMatchAtMinute(0, 'live-2', TEAM_A, TEAM_B, 90, true);
    expect(atEnd.goalsA).toBe(full.goalsA);
    expect(atEnd.goalsB).toBe(full.goalsB);
  });

  it('goals increase monotonically with time', () => {
    let prevGoals = 0;
    for (let min = 0; min <= 90; min++) {
      const state = getMatchAtMinute(0, 'live-3', TEAM_A, TEAM_B, min, true);
      const totalGoals = state.goalsA + state.goalsB;
      expect(totalGoals).toBeGreaterThanOrEqual(prevGoals);
      prevGoals = totalGoals;
    }
  });
});
