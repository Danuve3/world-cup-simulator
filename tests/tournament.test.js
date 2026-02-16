import { describe, it, expect, beforeEach } from 'vitest';
import { simulateTournament, clearCache } from '../src/engine/tournament.js';

beforeEach(() => {
  clearCache();
});

describe('Tournament', () => {
  it('is deterministic — same edition gives same result', () => {
    const a = simulateTournament(0);
    clearCache();
    const b = simulateTournament(0);
    expect(a.champion.code).toBe(b.champion.code);
    expect(a.runnerUp.code).toBe(b.runnerUp.code);
    expect(a.totalGoals).toBe(b.totalGoals);
  });

  it('has 32 teams in the draw', () => {
    const t = simulateTournament(0);
    const teams = t.draw.groups.flat();
    expect(teams.length).toBe(32);
  });

  it('has 8 groups of 4 teams', () => {
    const t = simulateTournament(0);
    expect(t.draw.groups.length).toBe(8);
    for (const group of t.draw.groups) {
      expect(group.length).toBe(4);
    }
  });

  it('has no duplicate teams', () => {
    const t = simulateTournament(0);
    const codes = t.draw.groups.flat().map(t => t.code);
    expect(new Set(codes).size).toBe(32);
  });

  it('host is always in Group A', () => {
    const t = simulateTournament(0);
    const groupA = t.draw.groups[0];
    expect(groupA.some(team => team.code === t.host.code)).toBe(true);
  });

  it('group stage has 48 matches', () => {
    const t = simulateTournament(0);
    expect(t.groupStage.matches.length).toBe(48);
  });

  it('knockout has correct number of matches', () => {
    const t = simulateTournament(0);
    expect(t.knockout.r16.length).toBe(8);
    expect(t.knockout.qf.length).toBe(4);
    expect(t.knockout.sf.length).toBe(2);
    expect(t.knockout.thirdPlace).toBeDefined();
    expect(t.knockout.final).toBeDefined();
  });

  it('champion is one of the qualified teams', () => {
    const t = simulateTournament(0);
    const codes = t.draw.groups.flat().map(t => t.code);
    expect(codes).toContain(t.champion.code);
  });

  it('different editions can produce different champions', () => {
    const champions = new Set();
    for (let i = 0; i < 10; i++) {
      const t = simulateTournament(i);
      champions.add(t.champion.code);
    }
    expect(champions.size).toBeGreaterThan(1);
  });

  it('completes in reasonable time (<500ms per tournament)', () => {
    const start = performance.now();
    simulateTournament(5);
    const elapsed = performance.now() - start;
    expect(elapsed).toBeLessThan(500);
  });
});
