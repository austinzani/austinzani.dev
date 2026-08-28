// Fixture test for the ATP adapter. The fixture is a real ESPN tennis
// rankings response (occurrence updated 2026-08-20, fetched 2026-08-28)
// trimmed to the fields the transform reads — all 150 ranked players kept;
// the transform caps at the top 50.
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { adapterResultSchema } from "../contract.mjs";
import {
  ATP_MAX_ENTITIES,
  ATP_RANKINGS_URL,
  transformRankings,
} from "./atp.mjs";

const fixture = JSON.parse(
  readFileSync(
    new URL("./fixtures/atp-rankings-2026-08-20.json", import.meta.url),
    "utf8",
  ),
);
const FETCHED_FROM = [ATP_RANKINGS_URL];

describe("atp adapter transform", () => {
  const result = transformRankings(fixture, FETCHED_FROM);

  it("satisfies the shared adapter contract", () => {
    const parsed = adapterResultSchema.safeParse(result);
    expect(parsed.success, JSON.stringify(parsed.error?.issues)).toBe(true);
    expect(result.sportKey).toBe("atp");
    expect(result.fetchedFrom).toEqual(FETCHED_FROM);
  });

  it(`caps at the top ${ATP_MAX_ENTITIES} with unique contiguous ranks`, () => {
    expect(result.entities).toHaveLength(ATP_MAX_ENTITIES);
    result.entities.forEach((entity, index) => {
      expect(entity.rank).toBe(index + 1);
    });
  });

  it("ranking points never increase down the ordering", () => {
    for (let i = 1; i < result.entities.length; i++) {
      expect(result.entities[i].metricValue).toBeLessThanOrEqual(
        result.entities[i - 1].metricValue,
      );
    }
  });

  it("matches the real 2026-08-20 ATP rankings occurrence", () => {
    const [first, second] = result.entities;
    expect(first.name).toBe("Jannik Sinner");
    expect(first.sourceIds).toEqual({ espn: "3623" });
    expect(first.metricValue).toBe(12800);
    expect(second.name).toBe("Alexander Zverev");
  });

  it("every player carries an image URL (headshot, else country flag)", () => {
    for (const entity of result.entities) {
      expect(
        entity.imageUrl,
        `${entity.name} has no image URL`,
      ).toBeDefined();
      expect(new URL(entity.imageUrl).host).toBe("a.espncdn.com");
    }
  });

  it("uses the real headshot when ESPN provides one", () => {
    const sinner = result.entities[0];
    expect(sinner.imageUrl).toBe(
      "https://a.espncdn.com/i/headshots/tennis/players/full/3623.png",
    );
  });

  it("falls back to the country flag when the headshot is absent", () => {
    // Many younger players genuinely have no ESPN headshot (constructed
    // headshot URLs 404) — e.g. Flavio Cobolli, ranked 6th on fixture day.
    const cobolli = result.entities.find((e) => e.name === "Flavio Cobolli");
    expect(cobolli).toBeDefined();
    expect(cobolli.imageUrl).toMatch(/\/i\/teamlogos\/countries\//);
  });

  it("rejects a payload with no rankings", () => {
    expect(() => transformRankings({ rankings: [] }, FETCHED_FROM)).toThrow(
      /no rankings/,
    );
  });

  it("rejects a rankings list with no ranked players", () => {
    expect(() =>
      transformRankings({ rankings: [{ ranks: [] }] }, FETCHED_FROM),
    ).toThrow(/no ranked players/);
  });

  it("rejects a non-contiguous capped ordering", () => {
    const gapped = JSON.parse(JSON.stringify(fixture));
    gapped.rankings[0].ranks = gapped.rankings[0].ranks.filter(
      (row) => row.current !== 3,
    );
    expect(() => transformRankings(gapped, FETCHED_FROM)).toThrow(
      /not a contiguous/,
    );
  });
});
