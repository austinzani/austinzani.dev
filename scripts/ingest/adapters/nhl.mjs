// NHL adapter — official NHL Web API (api-web.nhle.com).
//
// metric_mode for NHL is 'final_prior': we read the FINAL standings of the
// most recent COMPLETED season, derived programmatically from the API's
// season index so the next season's final standings take over automatically
// once it completes. Two requests:
//   1. GET /v1/standings-season            → every season's standingsEnd date
//   2. GET /v1/standings/{standingsEnd}    → final standings for that season
//
// The standings payload is a flat array of 32 rows already carrying
// leagueSequence — the NHL's own league-wide ordering (points, then their
// official tiebreaks) — which we use directly as the raw rank.

const BASE_URL = "https://api-web.nhle.com/v1";
const SEASONS_URL = `${BASE_URL}/standings-season`;
const standingsUrl = (date) => `${BASE_URL}/standings/${date}`;

/**
 * Pick the most recent season whose final standings exist, i.e. the season
 * with the greatest standingsEnd <= today. Pure; throws if none qualifies.
 *
 * @param {{seasons: Array<{id: number, standingsEnd: string}>}} seasonsPayload
 * @param {string} todayIsoDate - "YYYY-MM-DD" (UTC)
 */
export function pickLastCompletedSeason(seasonsPayload, todayIsoDate) {
  const seasons = seasonsPayload?.seasons;
  if (!Array.isArray(seasons) || seasons.length === 0) {
    throw new Error("nhl: standings-season payload has no seasons array");
  }
  let best = null;
  for (const season of seasons) {
    if (typeof season?.standingsEnd !== "string") continue;
    // ISO dates compare correctly as strings.
    if (season.standingsEnd <= todayIsoDate) {
      if (!best || season.standingsEnd > best.standingsEnd) best = season;
    }
  }
  if (!best) {
    throw new Error(
      `nhl: no completed season found on or before ${todayIsoDate}`,
    );
  }
  return best;
}

/**
 * Pure transform: NHL standings payload → adapter contract shape.
 * Exported separately from the fetch so fixture tests need no network.
 *
 * @param {{standings: Array<object>}} standingsPayload
 * @param {string[]} fetchedFrom - source URLs, for provenance
 */
export function transformStandings(standingsPayload, fetchedFrom) {
  const rows = standingsPayload?.standings;
  if (!Array.isArray(rows) || rows.length === 0) {
    throw new Error("nhl: standings payload has no standings rows");
  }

  const entities = rows
    .map((row) => {
      const name = row?.teamName?.default;
      const abbrev = row?.teamAbbrev?.default;
      const rank = row?.leagueSequence;
      if (!name || !abbrev || !Number.isInteger(rank)) {
        throw new Error(
          `nhl: standings row missing teamName/teamAbbrev/leagueSequence (team: ${name ?? "?"})`,
        );
      }
      return {
        name,
        sourceIds: { nhl: abbrev },
        ...(typeof row.teamLogo === "string" && row.teamLogo
          ? { imageUrl: row.teamLogo }
          : {}),
        rank,
        ...(typeof row.points === "number"
          ? { metricValue: row.points }
          : {}),
      };
    })
    .sort((a, b) => a.rank - b.rank);

  // leagueSequence should be a contiguous, unique 1..N league-wide ordering.
  entities.forEach((entity, index) => {
    if (entity.rank !== index + 1) {
      throw new Error(
        `nhl: leagueSequence is not a contiguous 1..${entities.length} ordering (saw ${entity.rank} at position ${index + 1})`,
      );
    }
  });

  return { sportKey: "nhl", fetchedFrom, entities };
}

async function getJson(url) {
  const response = await fetch(url, {
    headers: { accept: "application/json" },
  });
  if (!response.ok) {
    throw new Error(`nhl: GET ${url} → HTTP ${response.status}`);
  }
  return response.json();
}

const nhlAdapter = {
  sportKey: "nhl",
  async fetch() {
    const seasonsPayload = await getJson(SEASONS_URL);
    const todayIsoDate = new Date().toISOString().slice(0, 10);
    const season = pickLastCompletedSeason(seasonsPayload, todayIsoDate);
    const url = standingsUrl(season.standingsEnd);
    const standingsPayload = await getJson(url);
    return transformStandings(standingsPayload, [SEASONS_URL, url]);
  },
};

export default nhlAdapter;
