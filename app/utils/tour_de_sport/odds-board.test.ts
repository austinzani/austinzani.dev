import { describe, expect, it } from "vitest";

import {
  applyBoardOrder,
  matchBoardToEntities,
  normalizeEntityName,
  parseBoardLines,
  parseOddsBoard,
} from "./odds-board";

describe("parseOddsBoard", () => {
  it("accepts the stored provenance shape verbatim", () => {
    const stored = {
      source: "DraftKings",
      retrieved_on: "2026-08-20",
      lines: ["Arsenal -110", "Manchester City +400"],
    };
    expect(parseOddsBoard(stored)).toEqual(stored);
  });

  it("rejects nulls and malformed shapes", () => {
    expect(parseOddsBoard(null)).toBeNull();
    expect(parseOddsBoard("Arsenal -110")).toBeNull();
    expect(parseOddsBoard({ source: "DraftKings", lines: ["x"] })).toBeNull();
    expect(
      parseOddsBoard({ source: "x", retrieved_on: "y", lines: [1] })
    ).toBeNull();
  });
});

describe("parseBoardLines", () => {
  it("strips American odds pasted after each name", () => {
    expect(
      parseBoardLines("Arsenal -110\nManchester City +400\nChelsea +600")
    ).toEqual(["Arsenal", "Manchester City", "Chelsea"]);
  });

  it("strips leading numbering in both dot and paren styles", () => {
    expect(
      parseBoardLines("1. Arsenal +500\n2) Manchester City +650\n10. Everton")
    ).toEqual(["Arsenal", "Manchester City", "Everton"]);
  });

  it("strips fractional odds, parenthesised or bare", () => {
    expect(
      parseBoardLines("Arsenal (10/11)\nLiverpool 9/1\nChelsea (6/1)")
    ).toEqual(["Arsenal", "Liverpool", "Chelsea"]);
  });

  it("handles tab-separated sportsbook table pastes", () => {
    expect(parseBoardLines("Arsenal\t-110\nAston Villa\t+6600")).toEqual([
      "Arsenal",
      "Aston Villa",
    ]);
  });

  it("drops empty and whitespace-only lines and trims survivors", () => {
    expect(parseBoardLines("\n  Arsenal +500  \n\n   \nChelsea\n")).toEqual([
      "Arsenal",
      "Chelsea",
    ]);
  });

  it("keeps names whose words are not odds tokens intact", () => {
    // "Nottingham Forest" has no trailing price; nothing must be eaten.
    expect(parseBoardLines("Nottingham Forest +50000\nFulham")).toEqual([
      "Nottingham Forest",
      "Fulham",
    ]);
  });
});

describe("normalizeEntityName", () => {
  it("lowercases and strips diacritics", () => {
    expect(normalizeEntityName("Nico Hülkenberg")).toBe("nico hulkenberg");
  });

  it("strips punctuation", () => {
    expect(normalizeEntityName("Brighton & Hove Albion")).toBe(
      "brighton hove albion"
    );
    expect(normalizeEntityName("St. Louis Blues")).toBe("st louis blues");
  });

  it("drops a standalone fc but not fc inside a word", () => {
    expect(normalizeEntityName("Arsenal FC")).toBe("arsenal");
    expect(normalizeEntityName("AFC Bournemouth")).toBe("afc bournemouth");
  });

  it("collapses runs of whitespace", () => {
    expect(normalizeEntityName("  Manchester   City ")).toBe("manchester city");
  });
});

const eplEntities = [
  { id: 1, name: "Arsenal" },
  { id: 2, name: "Manchester City" },
  { id: 3, name: "Manchester United" },
  { id: 4, name: "Tottenham Hotspur" },
  { id: 5, name: "Brighton & Hove Albion" },
  { id: 6, name: "AFC Bournemouth" },
  { id: 7, name: "Nottingham Forest" },
];

describe("matchBoardToEntities", () => {
  it("matches abbreviated board names to full entity names", () => {
    const result = matchBoardToEntities(
      ["Man City", "Man Utd", "Tottenham", "Brighton", "Bournemouth"],
      eplEntities
    );
    expect(result.orderedEntityIds).toEqual([2, 3, 4, 5, 6]);
    expect(result.unmatchedBoardNames).toEqual([]);
  });

  it("lets the longer name claim first: Texas Tech is not eaten by Texas", () => {
    const entities = [
      { id: 10, name: "Texas" },
      { id: 11, name: "Texas Tech" },
      { id: 12, name: "Texas A&M" },
    ];
    const result = matchBoardToEntities(
      ["Texas", "Texas Tech", "Texas A&M"],
      entities
    );
    expect(result.orderedEntityIds).toEqual([10, 11, 12]);
    expect(result.unmatchedBoardNames).toEqual([]);
  });

  it("prefers the shortest candidate when several entities contain the name", () => {
    // "Texas" alone must claim the entity actually named Texas, not the
    // longer Texas Tech that also contains the word.
    const entities = [
      { id: 11, name: "Texas Tech" },
      { id: 10, name: "Texas" },
    ];
    const result = matchBoardToEntities(["Texas"], entities);
    expect(result.orderedEntityIds).toEqual([10]);
    expect(result.unlistedEntityIds).toEqual([11]);
  });

  it("reports board names that match nothing, in board order", () => {
    const result = matchBoardToEntities(
      ["Arsenal", "Ipswich Town", "Coventry City", "Man City"],
      eplEntities
    );
    expect(result.orderedEntityIds).toEqual([1, 2]);
    expect(result.unmatchedBoardNames).toEqual(["Ipswich Town", "Coventry City"]);
  });

  it("uses each entity once — a duplicated board name goes unmatched", () => {
    const result = matchBoardToEntities(["Arsenal", "Arsenal"], eplEntities);
    expect(result.orderedEntityIds).toEqual([1]);
    expect(result.unmatchedBoardNames).toEqual(["Arsenal"]);
  });

  it("returns unlisted pool entities in the order given", () => {
    const result = matchBoardToEntities(["Tottenham", "Arsenal"], eplEntities);
    expect(result.orderedEntityIds).toEqual([4, 1]);
    expect(result.unlistedEntityIds).toEqual([2, 3, 5, 6, 7]);
  });

  it("matches through diacritics", () => {
    const drivers = [
      { id: 20, name: "Nico Hülkenberg" },
      { id: 21, name: "Max Verstappen" },
    ];
    const result = matchBoardToEntities(
      ["Max Verstappen", "Nico Hulkenberg"],
      drivers
    );
    expect(result.orderedEntityIds).toEqual([21, 20]);
    expect(result.unmatchedBoardNames).toEqual([]);
  });
});

describe("applyBoardOrder", () => {
  const standingsRankedIds = [5, 4, 1, 2, 3, 7, 6];

  it("puts board order first, then unlisted entities in standings order", () => {
    const match = matchBoardToEntities(["Arsenal", "Man City"], eplEntities);
    expect(applyBoardOrder(standingsRankedIds, match)).toEqual([
      1, 2, 5, 4, 3, 7, 6,
    ]);
  });

  it("preserves the standings tail order exactly", () => {
    const match = matchBoardToEntities(["Nottingham Forest"], eplEntities);
    expect(applyBoardOrder(standingsRankedIds, match)).toEqual([
      7, 5, 4, 1, 2, 3, 6,
    ]);
  });

  it("is always a permutation of the input pool", () => {
    const boards = [
      [],
      ["Arsenal"],
      ["Man City", "Arsenal", "Tottenham"],
      ["Bournemouth", "Brighton", "Man Utd", "Man City", "Arsenal"],
      eplEntities.map((entity) => entity.name),
    ];
    for (const board of boards) {
      const match = matchBoardToEntities(board, eplEntities);
      const ordered = applyBoardOrder(standingsRankedIds, match);
      expect([...ordered].sort((a, b) => a - b)).toEqual(
        [...standingsRankedIds].sort((a, b) => a - b)
      );
    }
  });
});
