import { EPOCH } from '../constants.js';

/**
 * Mulberry32 — Deterministic PRNG
 * Given the same seed, always produces the same sequence.
 */
export function createPRNG(seed) {
  let state = seed | 0;

  function next() {
    state |= 0;
    state = (state + 0x6d2b79f5) | 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }

  function nextInt(min, max) {
    return Math.floor(next() * (max - min + 1)) + min;
  }

  function nextBool(probability = 0.5) {
    return next() < probability;
  }

  function shuffle(arr) {
    const result = [...arr];
    for (let i = result.length - 1; i > 0; i--) {
      const j = Math.floor(next() * (i + 1));
      [result[i], result[j]] = [result[j], result[i]];
    }
    return result;
  }

  function weightedSample(items, weights) {
    const total = weights.reduce((a, b) => a + b, 0);
    let r = next() * total;
    for (let i = 0; i < items.length; i++) {
      r -= weights[i];
      if (r <= 0) return items[i];
    }
    return items[items.length - 1];
  }

  function pick(arr) {
    return arr[Math.floor(next() * arr.length)];
  }

  function getState() {
    return state;
  }

  return { next, nextInt, nextBool, shuffle, weightedSample, pick, getState };
}

/**
 * Hash a string into a 32-bit integer seed
 */
export function hashSeed(str) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash + char) | 0;
  }
  return hash >>> 0;
}

/**
 * Combine multiple values into a single seed.
 * EPOCH is used as a global "world seed" so that dev and prod
 * produce completely different tournaments for the same edition number.
 */
export function combineSeed(...values) {
  return hashSeed([EPOCH, ...values].join(':'));
}
