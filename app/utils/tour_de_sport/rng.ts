/**
 * Deterministic seeded RNG for the Tour de Sport draw.
 *
 * A string seed is hashed with xmur3 and the resulting 32-bit state drives a
 * mulberry32 generator. Every operation is 32-bit integer arithmetic
 * (Math.imul, xor, shifts), so the sequence is bit-identical across engines
 * and platforms — a hard requirement for a draw that must be independently
 * verifiable from a published seed.
 *
 * No Math.random anywhere. Bounded integers are produced by rejection
 * sampling, so shuffles are unbiased.
 */

/** xmur3 string hash: seeds a 32-bit state from an arbitrary string. */
function xmur3(str: string): () => number {
  let h = 1779033703 ^ str.length;
  for (let i = 0; i < str.length; i++) {
    h = Math.imul(h ^ str.charCodeAt(i), 3432918353);
    h = (h << 13) | (h >>> 19);
  }
  return function () {
    h = Math.imul(h ^ (h >>> 16), 2246822507);
    h = Math.imul(h ^ (h >>> 13), 3266489909);
    h ^= h >>> 16;
    return h >>> 0;
  };
}

export interface Rng {
  /** Next unsigned 32-bit integer. */
  next32(): number;
  /** Uniform integer in [0, bound). bound must be a positive integer. */
  nextBelow(bound: number): number;
}

/** mulberry32 PRNG over a 32-bit state. */
function mulberry32(state: number): () => number {
  let a = state >>> 0;
  return function () {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return (t ^ (t >>> 14)) >>> 0;
  };
}

/**
 * Create a deterministic RNG from a string seed. Distinct seeds (including
 * distinct namespaced suffixes of the same season seed) yield independent
 * streams.
 */
export function createRng(seed: string): Rng {
  const hash = xmur3(seed);
  const next = mulberry32(hash());
  return {
    next32: next,
    nextBelow(bound: number): number {
      if (!Number.isInteger(bound) || bound <= 0) {
        throw new Error(`nextBelow requires a positive integer bound, got ${bound}`);
      }
      // Rejection sampling: accept only draws below the largest multiple of
      // bound that fits in 2^32, then reduce. Integer-exact in doubles.
      const limit = Math.floor(4294967296 / bound) * bound;
      let x = next();
      while (x >= limit) {
        x = next();
      }
      return x % bound;
    },
  };
}

/** Return a new array with the items shuffled by an unbiased Fisher–Yates. */
export function shuffle<T>(items: readonly T[], rng: Rng): T[] {
  const result = items.slice();
  for (let i = result.length - 1; i > 0; i--) {
    const j = rng.nextBelow(i + 1);
    const tmp = result[i];
    result[i] = result[j];
    result[j] = tmp;
  }
  return result;
}
