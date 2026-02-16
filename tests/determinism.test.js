import { describe, it, expect, beforeEach } from 'vitest';
import { getCurrentState } from '../src/engine/simulation.js';
import { clearCache } from '../src/engine/tournament.js';
import { EPOCH, CYCLE_DURATION } from '../src/constants.js';

beforeEach(() => {
  clearCache();
});

describe('Determinism end-to-end', () => {
  it('same timestamp produces identical state', () => {
    const ts = EPOCH + 5000 * 60 * 1000; // 5000 minutes into first cup
    const a = getCurrentState(ts);
    clearCache();
    const b = getCurrentState(ts);

    expect(a.edition).toBe(b.edition);
    expect(a.cycleMinute).toBe(b.cycleMinute);
    expect(a.phase.phase).toBe(b.phase.phase);
    expect(a.tournament.champion.code).toBe(b.tournament.champion.code);
    expect(a.tournament.host.code).toBe(b.tournament.host.code);
  });

  it('edition 0 starts at EPOCH', () => {
    const state = getCurrentState(EPOCH);
    expect(state.edition).toBe(0);
    expect(state.cycleMinute).toBe(0);
    expect(state.phase.phase).toBe('DRAW');
  });

  it('edition increments after CYCLE_DURATION', () => {
    const ts = EPOCH + CYCLE_DURATION * 60 * 1000 + 1000;
    const state = getCurrentState(ts);
    expect(state.edition).toBe(1);
  });

  it('two different timestamps in the same cycle see the same tournament', () => {
    const ts1 = EPOCH + 100 * 60 * 1000;
    const ts2 = EPOCH + 200 * 60 * 1000;
    const a = getCurrentState(ts1);
    const b = getCurrentState(ts2);
    expect(a.tournament.champion.code).toBe(b.tournament.champion.code);
    expect(a.edition).toBe(b.edition);
  });

  it('different editions have potentially different hosts', () => {
    const hosts = new Set();
    for (let i = 0; i < 10; i++) {
      const ts = EPOCH + i * CYCLE_DURATION * 60 * 1000;
      const state = getCurrentState(ts);
      hosts.add(state.tournament.host.code);
    }
    expect(hosts.size).toBeGreaterThan(1);
  });
});
