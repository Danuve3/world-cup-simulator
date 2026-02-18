import { describe, it, expect } from 'vitest';
import { getPhaseAtMinute, getLiveMatches, getGroupMatchTiming, getKnockoutMatchTiming } from '../src/engine/timeline.js';

describe('Timeline', () => {
  it('minute 0 is in DRAW phase', () => {
    const phase = getPhaseAtMinute(0);
    expect(phase.phase).toBe('DRAW');
  });

  it('minute 60 is in GROUP_STAGE', () => {
    const phase = getPhaseAtMinute(60);
    expect(phase.phase).toBe('GROUP_STAGE');
  });

  it('minute 5940 is in ROUND_16', () => {
    const phase = getPhaseAtMinute(5940);
    expect(phase.phase).toBe('ROUND_16');
  });

  it('minute 8640 is FINAL', () => {
    const phase = getPhaseAtMinute(8640);
    expect(phase.phase).toBe('FINAL');
  });

  it('minute 8960 is CELEBRATION', () => {
    const phase = getPhaseAtMinute(8960);
    expect(phase.phase).toBe('CELEBRATION');
  });

  it('all phases cover the full cycle without gaps', () => {
    const visited = new Set();
    for (let m = 0; m < 10080; m += 10) {
      const phase = getPhaseAtMinute(m);
      expect(phase.phase).toBeTruthy();
      visited.add(phase.phase);
    }
    // Should visit at least the major phases
    expect(visited.has('DRAW')).toBe(true);
    expect(visited.has('GROUP_STAGE')).toBe(true);
    expect(visited.has('FINAL')).toBe(true);
  });

  it('group match timings are within group stage bounds', () => {
    for (let day = 0; day < 3; day++) {
      for (let g = 0; g < 8; g++) {
        const timing = getGroupMatchTiming(day, g, 0);
        expect(timing.startMin).toBeGreaterThanOrEqual(60);
        expect(timing.endMin).toBeLessThanOrEqual(5820);
        expect(timing.endMin).toBeGreaterThan(timing.startMin);
      }
    }
  });

  it('knockout match timings are within their phase bounds', () => {
    for (let i = 0; i < 8; i++) {
      const timing = getKnockoutMatchTiming('R16', i);
      expect(timing.startMin).toBeGreaterThanOrEqual(5940);
      expect(timing.endMin).toBeLessThanOrEqual(6660);
    }
    const finalTiming = getKnockoutMatchTiming('FINAL', 0);
    expect(finalTiming.startMin).toBeGreaterThanOrEqual(8640);
    expect(finalTiming.endMin).toBeLessThanOrEqual(8940);
  });
});

describe('Live matches', () => {
  it('no live matches during draw', () => {
    const live = getLiveMatches(15);
    expect(live.length).toBe(0);
  });

  it('returns live matches during group stage', () => {
    const timing = getGroupMatchTiming(0, 0, 0);
    const live = getLiveMatches(timing.startMin + 1); // +1 fits within 2-min MATCH_DURATION
    expect(live.length).toBeGreaterThan(0);
    expect(live[0].type).toBe('group');
  });
});
