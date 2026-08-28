// ATP tennis adapter — ESPN tennis rankings.
//
// metric_mode is 'live': entities are the top ATP_MAX_ENTITIES players in
// the current ATP singles rankings. Endpoint (probed 2026-08-28):
//
//   GET site.api.espn.com/apis/site/v2/sports/tennis/atp/rankings
//
// The NAMED league slug is REQUIRED — the numeric-league-id variant
// (…/tennis/850/rankings) does not serve (500/400 depending on id form).
// No season param: the endpoint always carries the current rankings
// occurrence (rankings[0].update timestamps it), which is exactly what
// live mode wants.
//
// Shape: rankings[0].ranks[] = {current, points, athlete:{id, displayName,
// headshot, flag}} — 150 rows, `current` verified unique contiguous 1..150.
// Note headshot here is a plain STRING URL (golf wraps it in {href}); it is
// also genuinely ABSENT for many younger players (constructed
// a.espncdn.com/i/headshots/tennis/... URLs 404 for them), so the country
// flag URL — always present — is the image fallback. rank = ATP ranking
// position, metricValue = ATP ranking points.

export const ATP_MAX_ENTITIES = 50;
export const MIN_ENTITIES = 14;

export const ATP_RANKINGS_URL =
  "https://site.api.espn.com/apis/site/v2/sports/tennis/atp/rankings";

const imageOf = (athlete) => {
  const headshot = athlete?.headshot;
  if (typeof headshot === "string" && headshot) return headshot;
  if (typeof headshot?.href === "string" && headshot.href) return headshot.href;
  const flag = athlete?.flag;
  if (typeof flag === "string" && flag) return flag;
  if (typeof flag?.href === "string" && flag.href) return flag.href;
  return null;
};

/**
 * Pure transform: ESPN tennis rankings payload → adapter contract shape.
 * Reads rankings[0] (the ATP singles list), caps at ATP_MAX_ENTITIES and
 * validates the capped ranks are unique contiguous 1..N.
 *
 * @param {object} payload
 * @param {string[]} fetchedFrom
 */
export function transformRankings(payload, fetchedFrom) {
  const rankings = payload?.rankings;
  if (!Array.isArray(rankings) || rankings.length === 0) {
    throw new Error("atp: payload has no rankings");
  }
  const ranks = rankings[0]?.ranks;
  if (!Array.isArray(ranks) || ranks.length === 0) {
    throw new Error("atp: rankings list has no ranked players");
  }
  if (ranks.length < MIN_ENTITIES) {
    throw new Error(
      `atp: only ${ranks.length} ranked players (need ${MIN_ENTITIES})`,
    );
  }

  const entities = [...ranks]
    .sort((a, b) => (a?.current ?? Infinity) - (b?.current ?? Infinity))
    .slice(0, ATP_MAX_ENTITIES)
    .map((row) => {
      const id = row?.athlete?.id;
      const name = row?.athlete?.displayName;
      const rank = row?.current;
      const points = row?.points;
      if (!id || !name || !Number.isInteger(rank) || rank < 1) {
        throw new Error(
          `atp: ranking row missing athlete.id/displayName/current (player: ${name ?? id ?? "?"})`,
        );
      }
      const imageUrl = imageOf(row.athlete);
      return {
        name,
        sourceIds: { espn: String(id) },
        ...(imageUrl ? { imageUrl } : {}),
        rank,
        ...(Number.isFinite(points) ? { metricValue: points } : {}),
      };
    });

  entities.forEach((entity, index) => {
    if (entity.rank !== index + 1) {
      throw new Error(
        `atp: rankings are not a contiguous 1..${entities.length} ordering (saw ${entity.rank} at position ${index + 1})`,
      );
    }
  });

  return { sportKey: "atp", fetchedFrom, entities };
}

async function getJson(url) {
  const response = await fetch(url, {
    headers: { accept: "application/json" },
  });
  if (!response.ok) {
    throw new Error(`atp: GET ${url} → HTTP ${response.status}`);
  }
  return response.json();
}

const atpAdapter = {
  sportKey: "atp",
  async fetch() {
    const payload = await getJson(ATP_RANKINGS_URL);
    return transformRankings(payload, [ATP_RANKINGS_URL]);
  },
};

export default atpAdapter;
