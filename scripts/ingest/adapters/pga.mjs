// PGA Tour adapter — ESPN golf season statistics, sorted by FedEx Cup
// points. The most fragile endpoint in the set, so the transform is built
// to throw loudly on any shape drift rather than emit garbage.
//
// metric_mode is 'live': entities are the top PGA_LIMIT golfers by
// season-to-date FedEx Cup points ("cupPoints"). Endpoint (probed
// 2026-08-28 — the v2 golf standings endpoint returns children:[] empty,
// ESPN's signature silent failure; golf leaderboard/rankings 404/500):
//
//   GET site.web.api.espn.com/apis/common/v3/sports/golf/pga/statistics/
//       byathlete?limit=N&sort=general.cupPoints%3Adesc&season=Y
//
// Response: top-level `categories` describes the stat columns — the
// "general" category's `names` array indexes each athlete's parallel
// `values` (numbers) / `totals` (display strings) arrays. cupPoints is
// found by NAME in that index, never by position. athletes[].athlete
// carries `headshot.href` (a.espncdn.com golf headshots — 50/50 coverage
// on probe day) with the country-flag URL as a defensive fallback.
//
// Rank: positional 1..N after re-sorting by cupPoints desc (the endpoint
// already returns that order; re-sorting makes the transform independent
// of it). Tie-break: name asc, deterministic like the ESPN team family.
// PGA season is the calendar year (Jan–Dec) — season=current year.

export const PGA_LIMIT = 50;
export const MIN_ENTITIES = 14;

export const pgaStatsUrl = (seasonYear) =>
  "https://site.web.api.espn.com/apis/common/v3/sports/golf/pga/statistics/byathlete" +
  `?limit=${PGA_LIMIT}&sort=general.cupPoints%3Adesc&season=${seasonYear}`;

const imageOf = (athlete) => {
  const headshot = athlete?.headshot;
  if (typeof headshot?.href === "string" && headshot.href) return headshot.href;
  if (typeof headshot === "string" && headshot) return headshot;
  const flag = athlete?.flag;
  if (typeof flag?.href === "string" && flag.href) return flag.href;
  if (typeof flag === "string" && flag) return flag;
  return null;
};

/**
 * Pure transform: ESPN golf statistics/byathlete payload → adapter
 * contract shape. metricValue = FedEx Cup points; rank = position in the
 * cupPoints-desc ordering. Throws on every recognizable shape drift.
 *
 * @param {object} payload
 * @param {string[]} fetchedFrom
 */
export function transformCupPoints(payload, fetchedFrom) {
  const categories = payload?.categories;
  if (!Array.isArray(categories) || categories.length === 0) {
    throw new Error("pga: payload has no categories index");
  }
  const general = categories.find((category) => category?.name === "general");
  if (!general || !Array.isArray(general.names)) {
    throw new Error('pga: payload has no "general" stat category');
  }
  const cupPointsIndex = general.names.indexOf("cupPoints");
  if (cupPointsIndex === -1) {
    throw new Error('pga: "cupPoints" is missing from the stat index');
  }

  const athletes = payload?.athletes;
  if (!Array.isArray(athletes) || athletes.length === 0) {
    throw new Error("pga: payload has no athletes");
  }
  if (athletes.length < MIN_ENTITIES) {
    throw new Error(
      `pga: only ${athletes.length} athletes in the payload (need ${MIN_ENTITIES})`,
    );
  }

  const golfers = athletes.map((row) => {
    const id = row?.athlete?.id;
    const name = row?.athlete?.displayName;
    const stats = Array.isArray(row?.categories)
      ? row.categories.find((category) => category?.name === "general")
      : undefined;
    const cupPoints = stats?.values?.[cupPointsIndex];
    if (!id || !name || !Number.isFinite(cupPoints)) {
      throw new Error(
        `pga: athlete row missing id/displayName/cupPoints (athlete: ${name ?? id ?? "?"})`,
      );
    }
    return {
      id: String(id),
      name,
      cupPoints,
      imageUrl: imageOf(row.athlete),
    };
  });

  const entities = golfers
    .sort((a, b) => b.cupPoints - a.cupPoints || a.name.localeCompare(b.name))
    .map((golfer, index) => ({
      name: golfer.name,
      sourceIds: { espn: golfer.id },
      ...(golfer.imageUrl ? { imageUrl: golfer.imageUrl } : {}),
      rank: index + 1,
      metricValue: golfer.cupPoints,
    }));

  return { sportKey: "pga", fetchedFrom, entities };
}

async function getJson(url) {
  const response = await fetch(url, {
    headers: { accept: "application/json" },
  });
  if (!response.ok) {
    throw new Error(`pga: GET ${url} → HTTP ${response.status}`);
  }
  return response.json();
}

const pgaAdapter = {
  sportKey: "pga",
  async fetch() {
    const seasonYear = Number(new Date().toISOString().slice(0, 4));
    const url = pgaStatsUrl(seasonYear);
    const payload = await getJson(url);
    return transformCupPoints(payload, [url]);
  },
};

export default pgaAdapter;
