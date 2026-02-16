import { describe, it, expect } from 'vitest';
import { createPRNG, hashSeed, combineSeed } from '../src/engine/prng.js';

describe('PRNG', () => {
  it('produces deterministic output for the same seed', () => {
    const a = createPRNG(42);
    const b = createPRNG(42);
    for (let i = 0; i < 100; i++) {
      expect(a.next()).toBe(b.next());
    }
  });

  it('produces different output for different seeds', () => {
    const a = createPRNG(42);
    const b = createPRNG(43);
    const valA = a.next();
    const valB = b.next();
    expect(valA).not.toBe(valB);
  });

  it('next() returns values in [0, 1)', () => {
    const rng = createPRNG(12345);
    for (let i = 0; i < 1000; i++) {
      const val = rng.next();
      expect(val).toBeGreaterThanOrEqual(0);
      expect(val).toBeLessThan(1);
    }
  });

  it('nextInt() returns values in range', () => {
    const rng = createPRNG(99);
    for (let i = 0; i < 1000; i++) {
      const val = rng.nextInt(5, 10);
      expect(val).toBeGreaterThanOrEqual(5);
      expect(val).toBeLessThanOrEqual(10);
    }
  });

  it('shuffle() is deterministic', () => {
    const a = createPRNG(42);
    const b = createPRNG(42);
    const arr = [1, 2, 3, 4, 5, 6, 7, 8];
    expect(a.shuffle(arr)).toEqual(b.shuffle(arr));
  });

  it('shuffle() does not mutate original array', () => {
    const rng = createPRNG(42);
    const arr = [1, 2, 3, 4, 5];
    const copy = [...arr];
    rng.shuffle(arr);
    expect(arr).toEqual(copy);
  });

  it('weightedSample respects weights', () => {
    const rng = createPRNG(42);
    const items = ['a', 'b'];
    const weights = [100, 0];
    for (let i = 0; i < 100; i++) {
      expect(rng.weightedSample(items, weights)).toBe('a');
    }
  });

  it('hashSeed produces consistent values', () => {
    expect(hashSeed('test')).toBe(hashSeed('test'));
    expect(hashSeed('test')).not.toBe(hashSeed('other'));
  });

  it('combineSeed merges multiple values', () => {
    const a = combineSeed('match', 0, 'G-A-0-0');
    const b = combineSeed('match', 0, 'G-A-0-0');
    expect(a).toBe(b);
    const c = combineSeed('match', 0, 'G-A-0-1');
    expect(a).not.toBe(c);
  });
});
