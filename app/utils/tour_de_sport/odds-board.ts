/**
 * Odds boards: the commissioner-pasted championship-futures lists that can
 * replace the standings order as a sport's tier basis at Season Lock.
 *
 * The stored tds_sports.odds_board JSON keeps the pasted lines VERBATIM
 * (prices and all) for provenance; entity names are parsed out of those lines
 * here, matched against the sport's existing entity pool, and used only to
 * REORDER that pool — a board never creates entities.
 *
 * Matching is deliberately forgiving about sportsbook shorthand: names are
 * normalized (case, diacritics, punctuation, a standalone "FC", "Utd" for
 * "United") and then matched by containment — each normalized board token
 * must prefix an entity-name token in order ("Man City" ⊂ "Manchester
 * City") or vice versa. Longest board names claim first so "Texas Tech" is
 * never eaten by "Texas", each entity is claimed at most once, and ties
 * prefer the shortest candidate ("Texas" claims Texas, not Texas Tech).
 *
 * Pure module: no imports from Remix, Supabase, or anything with side
 * effects.
 */

/** The tds_sports.odds_board JSON shape (raw paste kept for provenance). */
export type OddsBoard = {
  /** Where the board was read (sportsbook / aggregator name). */
  source: string;
  /** When the board was read, as a YYYY-MM-DD date string. */
  retrieved_on: string;
  /** The raw pasted lines, prices and all, verbatim. */
  lines: string[];
};

export type BoardMatchResult = {
  /** Matched entity ids, in board order (strongest odds first). */
  orderedEntityIds: number[];
  /** Board names that matched no available pool entity, in board order. */
  unmatchedBoardNames: string[];
  /** Pool entities absent from the board, in the order given. */
  unlistedEntityIds: number[];
};

/**
 * Narrow an unknown jsonb value to the OddsBoard shape. Returns null for
 * anything that is not a saved board (null column, wrong shape).
 */
export function parseOddsBoard(value: unknown): OddsBoard | null {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return null;
  }
  const record = value as Record<string, unknown>;
  if (
    typeof record.source !== "string" ||
    typeof record.retrieved_on !== "string" ||
    !Array.isArray(record.lines) ||
    !record.lines.every((line) => typeof line === "string")
  ) {
    return null;
  }
  return {
    source: record.source,
    retrieved_on: record.retrieved_on,
    lines: record.lines as string[],
  };
}

// A price token a sportsbook paste appends after the name: American odds
// ("+500", "-110"), fractional odds bare or parenthesised ("9/1", "(10/11)"),
// or the word EVEN.
const ODDS_TOKEN = /^(?:[+-]\d+(?:\.\d+)?|\(\d+\/\d+\)|\d+\/\d+|even)$/i;

/**
 * Split a pasted board into entity names: one name per line, with leading
 * numbering ("1.", "2)"), trailing price tokens, and surrounding whitespace
 * stripped, and empty lines dropped. Lines that are nothing but a price
 * (two-column pastes) are dropped too.
 */
export function parseBoardLines(raw: string): string[] {
  return raw
    .split(/\r?\n/)
    .map((line) => {
      const tokens = line
        .replace(/^\s*\d+\s*[.)]\s*/, "")
        .trim()
        .split(/\s+/)
        .filter((token) => token.length > 0);
      while (tokens.length > 0 && ODDS_TOKEN.test(tokens[tokens.length - 1])) {
        tokens.pop();
      }
      return tokens.join(" ");
    })
    .filter((name) => name.length > 0);
}

// Sportsbook shorthand canonicalized during normalization so containment
// matching sees the same word on both sides.
const TOKEN_ALIASES: Record<string, string> = {
  utd: "united",
};

/**
 * Normalize a name for matching: lowercase, diacritics and punctuation
 * stripped, whitespace collapsed, a standalone "fc" dropped, shorthand
 * tokens canonicalized ("utd" → "united").
 */
export function normalizeEntityName(name: string): string {
  return name
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .split(" ")
    .filter((token) => token.length > 0 && token !== "fc")
    .map((token) => TOKEN_ALIASES[token] ?? token)
    .join(" ");
}

/**
 * True when every needle token, in order, prefixes a distinct hay token in
 * order — the containment rule that lets "man city" match "manchester city"
 * and "brighton" match "brighton hove albion".
 */
function tokensArePrefixSubsequence(
  needle: readonly string[],
  hay: readonly string[]
): boolean {
  let hayIndex = 0;
  for (const token of needle) {
    while (hayIndex < hay.length && !hay[hayIndex].startsWith(token)) {
      hayIndex += 1;
    }
    if (hayIndex >= hay.length) return false;
    hayIndex += 1;
  }
  return true;
}

/**
 * Claim one pool entity per board name. Longest normalized board name claims
 * first (so the most specific names win contested entities); candidates are
 * ranked exact match, then board-name-contained-in-entity, then
 * entity-contained-in-board-name, with the shortest candidate winning ties.
 */
export function matchBoardToEntities(
  boardNames: readonly string[],
  entities: readonly { id: number; name: string }[]
): BoardMatchResult {
  const pool = entities.map((entity, index) => {
    const normalized = normalizeEntityName(entity.name);
    return { id: entity.id, index, normalized, tokens: normalized.split(" ") };
  });
  const claimedEntityIndexes = new Set<number>();
  // Board position -> claimed pool index.
  const claims = new Map<number, number>();

  const claimOrder = boardNames
    .map((name, index) => ({
      index,
      normalized: normalizeEntityName(name),
    }))
    .sort(
      (a, b) => b.normalized.length - a.normalized.length || a.index - b.index
    );

  for (const board of claimOrder) {
    if (board.normalized.length === 0) continue;
    const boardTokens = board.normalized.split(" ");
    let best: { rank: number; entity: (typeof pool)[number] } | null = null;
    for (const entity of pool) {
      if (claimedEntityIndexes.has(entity.index)) continue;
      if (entity.normalized.length === 0) continue;
      let rank: number;
      if (entity.normalized === board.normalized) {
        rank = 0;
      } else if (tokensArePrefixSubsequence(boardTokens, entity.tokens)) {
        rank = 1;
      } else if (tokensArePrefixSubsequence(entity.tokens, boardTokens)) {
        rank = 2;
      } else {
        continue;
      }
      const beatsBest =
        !best ||
        rank < best.rank ||
        (rank === best.rank &&
          entity.normalized.length < best.entity.normalized.length);
      if (beatsBest) best = { rank, entity };
    }
    if (best) {
      claimedEntityIndexes.add(best.entity.index);
      claims.set(board.index, best.entity.index);
    }
  }

  const orderedEntityIds: number[] = [];
  const unmatchedBoardNames: string[] = [];
  boardNames.forEach((name, index) => {
    const claimedIndex = claims.get(index);
    if (claimedIndex === undefined) {
      unmatchedBoardNames.push(name);
    } else {
      orderedEntityIds.push(entities[claimedIndex].id);
    }
  });
  const unlistedEntityIds = pool
    .filter((entity) => !claimedEntityIndexes.has(entity.index))
    .map((entity) => entity.id);

  return { orderedEntityIds, unmatchedBoardNames, unlistedEntityIds };
}

/**
 * Rank a pool by a matched board: board order first (strongest odds first),
 * then every pool entity the board did not list, in frozen standings order.
 * The output is always a permutation of standingsRankedIds — ids the match
 * knows about but the pool does not are dropped, never invented.
 */
export function applyBoardOrder(
  standingsRankedIds: readonly number[],
  match: Pick<BoardMatchResult, "orderedEntityIds">
): number[] {
  const poolIds = new Set(standingsRankedIds);
  const fromBoard: number[] = [];
  const placed = new Set<number>();
  for (const id of match.orderedEntityIds) {
    if (poolIds.has(id) && !placed.has(id)) {
      fromBoard.push(id);
      placed.add(id);
    }
  }
  return [...fromBoard, ...standingsRankedIds.filter((id) => !placed.has(id))];
}
