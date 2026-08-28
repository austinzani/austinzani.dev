// MLB adapter — official MLB Stats API (statsapi.mlb.com).
//
// metric_mode for MLB is 'live': we read the CURRENT season's regular-season
// standings for both leagues (AL=103, NL=104) in one request. The season year
// is derived from today's date — the MLB season lives in one calendar year
// (spring training ~late Feb, regular season March–October, postseason
// through early November), so the season year IS the calendar year except in
// January/February, when the upcoming season has no standings yet and we use
// the prior (completed) season.
//
// `hydrate=team` expands each row's team stub into the full team object so
// team.name is the full name ("Milwaukee Brewers", not "Brewers") — matching
// the NHL adapter's full-name entity convention.
//
// Rank: each teamRecord carries `sportRank` — MLB's own MLB-wide (all 30
// teams) ordering with their official tiebreaks applied, verified unique
// 1..30. We use it directly. If sportRank is ever missing or duplicated we
// fall back to ordering by winning percentage desc, then wins desc, then
// name asc (deterministic), assigning ranks 1..30 ourselves.
//
// sourceIds: { mlb_stats: "<teamId>" } — the numeric MLB Stats API team id
// as a STRING (matching the NHL adapter's string convention, e.g. 158 for
// the Brewers). imageUrl: the id-addressed logo at
// https://www.mlbstatic.com/team-logos/<teamId>.svg (verified resolvable).

const STANDINGS_BASE_URL = "https://statsapi.mlb.com/api/v1/standings";

export const standingsUrl = (seasonYear) =>
  `${STANDINGS_BASE_URL}?leagueId=103,104&season=${seasonYear}&standingsTypes=regularSeason&hydrate=team`;

export const teamLogoUrl = (teamId) =>
  `https://www.mlbstatic.com/team-logos/${teamId}.svg`;

/**
 * Derive the MLB season year from today's date. The season year equals the
 * calendar year for March through December; in January/February the new
 * season hasn't started, so use the prior year. Pure.
 *
 * @param {string} todayIsoDate - "YYYY-MM-DD" (UTC)
 */
export function deriveMlbSeasonYear(todayIsoDate) {
  const match = /^(\d{4})-(\d{2})-\d{2}$/.exec(todayIsoDate);
  if (!match) {
    throw new Error(`mlb: cannot derive season year from "${todayIsoDate}"`);
  }
  const year = Number(match[1]);
  const month = Number(match[2]);
  return month <= 2 ? year - 1 : year;
}

/**
 * Pure transform: MLB standings payload → adapter contract shape.
 * Exported separately from the fetch so fixture tests need no network.
 *
 * @param {{records: Array<{teamRecords: Array<object>}>}} standingsPayload
 * @param {string[]} fetchedFrom - source URLs, for provenance
 */
export function transformStandings(standingsPayload, fetchedFrom) {
  const records = standingsPayload?.records;
  if (!Array.isArray(records) || records.length === 0) {
    throw new Error("mlb: standings payload has no records");
  }
  const rows = records.flatMap((record) =>
    Array.isArray(record?.teamRecords) ? record.teamRecords : [],
  );
  if (rows.length === 0) {
    throw new Error("mlb: standings payload has no team records");
  }

  const teams = rows.map((row) => {
    const id = row?.team?.id;
    const name = row?.team?.name;
    if (!Number.isInteger(id) || !name) {
      throw new Error(
        `mlb: team record missing team.id/team.name (team: ${name ?? id ?? "?"})`,
      );
    }
    const sportRank = Number.parseInt(row.sportRank, 10);
    const pct = Number.parseFloat(row.winningPercentage);
    return {
      id,
      name,
      sportRank:
        Number.isInteger(sportRank) && sportRank >= 1 ? sportRank : null,
      pct: Number.isFinite(pct) ? pct : null,
      wins: typeof row.wins === "number" ? row.wins : null,
    };
  });

  // Prefer MLB's own MLB-wide ordering; it should be a unique 1..30. Fall
  // back to winning pct desc → wins desc → name asc if it ever isn't.
  const sportRanks = teams.map((team) => team.sportRank);
  const sportRankUsable =
    sportRanks.every((rank) => rank !== null) &&
    new Set(sportRanks).size === teams.length;

  const ranked = sportRankUsable
    ? teams.map((team) => ({ ...team, rank: team.sportRank }))
    : [...teams]
        .sort(
          (a, b) =>
            (b.pct ?? -1) - (a.pct ?? -1) ||
            (b.wins ?? -1) - (a.wins ?? -1) ||
            a.name.localeCompare(b.name),
        )
        .map((team, index) => ({ ...team, rank: index + 1 }));

  const entities = ranked
    .map((team) => ({
      name: team.name,
      sourceIds: { mlb_stats: String(team.id) },
      imageUrl: teamLogoUrl(team.id),
      rank: team.rank,
      ...(team.pct !== null ? { metricValue: team.pct } : {}),
    }))
    .sort((a, b) => a.rank - b.rank);

  return { sportKey: "mlb", fetchedFrom, entities };
}

async function getJson(url) {
  const response = await fetch(url, {
    headers: { accept: "application/json" },
  });
  if (!response.ok) {
    throw new Error(`mlb: GET ${url} → HTTP ${response.status}`);
  }
  return response.json();
}

const mlbAdapter = {
  sportKey: "mlb",
  async fetch() {
    const todayIsoDate = new Date().toISOString().slice(0, 10);
    const url = standingsUrl(deriveMlbSeasonYear(todayIsoDate));
    const standingsPayload = await getJson(url);
    return transformStandings(standingsPayload, [url]);
  },
};

export default mlbAdapter;
