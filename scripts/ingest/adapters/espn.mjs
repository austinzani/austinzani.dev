// ESPN adapter family — one config-driven module covering six sports:
// NFL, NBA, MLS, Premier League (epl), College Football (cfb), and College
// Basketball (cbb).
//
// The uniform season rule, shared with every adapter in the family: read the
// season IN PROGRESS (live standings for the four team leagues, the current
// AP Top 25 for the two college sports); when no season is in progress, read
// the most recently completed season's finals. A sport whose season completes
// before the game's cutoff freezes naturally at its final; a sport mid-flight
// on the cutoff is frozen there by ingestion/status — neither freeze lives in
// this module.
//
// Endpoint variants (probed 2026-08-28 — evidence in the AUS-847 notes):
//   standings  GET site.api.espn.com/apis/v2/sports/{path}/standings?season=Y
//              Works for football/nfl, basketball/nba AND (contrary to the
//              build plan's warning) for soccer/usa.1 + soccer/eng.1 — as
//              long as `season` is pinned explicitly. The variant that DOES
//              come back empty for soccer is
//              site.web.api.espn.com/apis/v2/sports/soccer/{lg}/standings
//              ?season=Y&level=1 (no `children` at all). We always pin the
//              season we derived — the in-progress one in-season, the last
//              completed one otherwise — never rely on the no-param default.
//   rankings   GET site.api.espn.com/apis/site/v2/sports/{path}/rankings
//              ?seasons=Y — its `rankings` array carries the LATEST published
//              poll of season Y (probed 2026-08-28: ?seasons=2026 returns the
//              live 2026 preseason AP poll), which is exactly what an
//              in-progress season reads. Its `weeks` index lists every
//              published poll week; the LAST entry of a completed season is
//              labeled "Final Rankings" (cfb: seasontype=3&weeks=1; cbb:
//              seasontype=3&weeks=3) — for a completed season we re-request
//              with that week pinned. Both paths read the AP Top 25 (id "1").
//
// College sources: ESPN rankings only — the build plan's CollegeFootballData
// (CFBD) source is deliberately NOT used: it requires an API key (a new
// secret) and the poll requirement is fully satisfied by ESPN's rankings
// endpoint. Pool = the ranked 25 (>= the 14 participants).
//
// Season derivation is a pure calendar rule per league (ESPN has no season
// index with end dates, so the league calendar is encoded in months). Two
// parts, both unit-tested at the boundaries:
//   - `inSeason` window {from, to, startYearOffset}: months when a season is
//     in progress (wrapping year-end when to < from). Inside it the derived
//     ESPN label is that in-progress season's.
//   - completed-season boundary {boundaryMonth, onOrAfter, before}: outside
//     the window, once `boundaryMonth` is reached the most recently
//     completed season is `year + onOrAfter`; before it, `year + before`.
// ESPN season labels differ per league (NFL/CFB/soccer = starting year;
// NBA/CBB = ending year) — the offsets bake that in.

const STANDINGS_HOST = "https://site.api.espn.com/apis/v2/sports";
const RANKINGS_HOST = "https://site.api.espn.com/apis/site/v2/sports";
const AP_POLL_ID = "1";

export const standingsUrl = (path, seasonYear) =>
  `${STANDINGS_HOST}/${path}/standings?season=${seasonYear}`;

export const rankingsIndexUrl = (path, seasonYear) =>
  `${RANKINGS_HOST}/${path}/rankings?seasons=${seasonYear}`;

export const rankingsWeekUrl = (path, seasonYear, seasonType, week) =>
  `${rankingsIndexUrl(path, seasonYear)}&seasontype=${seasonType}&weeks=${week}`;

/**
 * Derive the ESPN season label of the most recently COMPLETED season from
 * today's date and a league calendar rule. Pure.
 *
 * @param {{boundaryMonth: number, onOrAfter: number, before: number}} rule
 * @param {string} todayIsoDate - "YYYY-MM-DD" (UTC)
 */
export function deriveCompletedSeasonYear(rule, todayIsoDate) {
  const { year, month } = parseIsoDate(todayIsoDate);
  return month >= rule.boundaryMonth
    ? year + rule.onOrAfter
    : year + rule.before;
}

function parseIsoDate(todayIsoDate) {
  const match = /^(\d{4})-(\d{2})-\d{2}$/.exec(todayIsoDate);
  if (!match) {
    throw new Error(`espn: cannot derive season year from "${todayIsoDate}"`);
  }
  return { year: Number(match[1]), month: Number(match[2]) };
}

/**
 * Derive which ESPN season to read under the uniform rule: the season in
 * progress when today falls in the league's `inSeason` month window, else
 * the most recently completed season. Pure.
 *
 * Inside the window the in-progress label is `year + startYearOffset` for
 * months in the window's opening (pre-New-Year) segment and one less after
 * the wrap — starting-year-labeled leagues use offset 0, ending-year-labeled
 * leagues offset 1, calendar-year leagues a non-wrapping window with 0.
 *
 * @param {{boundaryMonth: number, onOrAfter: number, before: number,
 *          inSeason: {from: number, to: number, startYearOffset: number}}} rule
 * @param {string} todayIsoDate - "YYYY-MM-DD" (UTC)
 * @returns {{seasonYear: number, inSeason: boolean}}
 */
export function deriveSeason(rule, todayIsoDate) {
  const { year, month } = parseIsoDate(todayIsoDate);
  const { from, to, startYearOffset } = rule.inSeason;
  const inWindow =
    from <= to ? month >= from && month <= to : month >= from || month <= to;
  if (!inWindow) {
    return {
      seasonYear: deriveCompletedSeasonYear(rule, todayIsoDate),
      inSeason: false,
    };
  }
  const seasonYear =
    month >= from ? year + startYearOffset : year + startYearOffset - 1;
  return { seasonYear, inSeason: true };
}

const statValue = (row, statName) => {
  const stat = Array.isArray(row?.stats)
    ? row.stats.find((s) => s?.name === statName)
    : undefined;
  return typeof stat?.value === "number" ? stat.value : null;
};

const teamLogoUrl = (team) => {
  const logos = Array.isArray(team?.logos) ? team.logos : [];
  const preferred =
    logos.find((logo) => logo?.rel?.includes?.("default")) ?? logos[0];
  if (typeof preferred?.href === "string" && preferred.href) {
    return preferred.href;
  }
  return typeof team?.logo === "string" && team.logo ? team.logo : null;
};

/**
 * Pure transform: ESPN standings payload → adapter contract shape.
 * Flattens every child group (conferences for NFL/NBA/MLS; the single table
 * for the EPL) and ranks league-wide per the config's rank rule:
 *   'winPercent' — winPercent desc → wins desc → pointDifferential desc
 *                  → name asc (NFL, NBA; metricValue = winPercent)
 *   'points'     — points desc → wins desc → pointDifferential desc
 *                  → name asc (MLS; metricValue = points)
 *   'tableRank'  — ESPN's own `rank` stat (official tiebreaks pre-applied),
 *                  validated unique contiguous 1..N, falling back to the
 *                  'points' sort if it ever isn't (EPL; metricValue = points)
 *
 * @param {object} config - an espnConfigs entry
 * @param {object} standingsPayload
 * @param {string[]} fetchedFrom
 */
export function transformStandings(config, standingsPayload, fetchedFrom) {
  const children = standingsPayload?.children;
  if (!Array.isArray(children) || children.length === 0) {
    throw new Error(
      `${config.sportKey}: standings payload has no children groups (the ` +
        `site.web.api soccer variant responds exactly like this — empty)`,
    );
  }
  const rows = children.flatMap((child) =>
    Array.isArray(child?.standings?.entries) ? child.standings.entries : [],
  );
  if (rows.length === 0) {
    throw new Error(`${config.sportKey}: standings payload has no entries`);
  }
  if (config.expectedCount && rows.length !== config.expectedCount) {
    throw new Error(
      `${config.sportKey}: expected ${config.expectedCount} standings rows, got ${rows.length}`,
    );
  }

  const teams = rows.map((row) => {
    const id = row?.team?.id;
    const name = row?.team?.displayName;
    if (!id || !name) {
      throw new Error(
        `${config.sportKey}: standings row missing team.id/team.displayName (team: ${name ?? id ?? "?"})`,
      );
    }
    return {
      id: String(id),
      name,
      logo: teamLogoUrl(row.team),
      winPercent: statValue(row, "winPercent"),
      points: statValue(row, "points"),
      wins: statValue(row, "wins"),
      pointDifferential: statValue(row, "pointDifferential"),
      tableRank: statValue(row, "rank"),
    };
  });

  const metricOf = (team) =>
    config.rankRule === "winPercent" ? team.winPercent : team.points;
  const byMetric = (a, b) =>
    (metricOf(b) ?? -1) - (metricOf(a) ?? -1) ||
    (b.wins ?? -1) - (a.wins ?? -1) ||
    (b.pointDifferential ?? -Infinity) - (a.pointDifferential ?? -Infinity) ||
    a.name.localeCompare(b.name);

  // 'tableRank' trusts ESPN's table position when it is a clean unique
  // contiguous 1..N ordering; otherwise every rule falls through to the
  // deterministic metric sort above.
  const tableRanks = teams.map((team) => team.tableRank);
  const tableRankUsable =
    config.rankRule === "tableRank" &&
    tableRanks.every((rank) => Number.isInteger(rank) && rank >= 1) &&
    new Set(tableRanks).size === teams.length &&
    Math.max(...tableRanks) === teams.length;

  const ranked = tableRankUsable
    ? teams.map((team) => ({ ...team, rank: team.tableRank }))
    : [...teams]
        .sort(byMetric)
        .map((team, index) => ({ ...team, rank: index + 1 }));

  const entities = ranked
    .map((team) => {
      const metricValue = metricOf(team);
      return {
        name: team.name,
        sourceIds: { espn: team.id },
        ...(team.logo ? { imageUrl: team.logo } : {}),
        rank: team.rank,
        ...(metricValue !== null ? { metricValue } : {}),
      };
    })
    .sort((a, b) => a.rank - b.rank);

  return { sportKey: config.sportKey, fetchedFrom, entities };
}

/**
 * Pick the final published poll week of a season from the rankings
 * endpoint's `weeks` index — the last entry, which for a completed season
 * is the postseason "Final Rankings" occurrence. Used only on the
 * completed-season path; an in-progress season reads the latest poll from
 * the unpinned index payload instead and never calls this. Pure; throws
 * when the index is missing or the last entry is not a final/postseason
 * week (i.e. the season turned out to be mid-flight).
 *
 * @param {{weeks: Array<{display: string, week: string, type: string}>}} indexPayload
 */
export function pickFinalRankingWeek(indexPayload) {
  const weeks = indexPayload?.weeks;
  if (!Array.isArray(weeks) || weeks.length === 0) {
    throw new Error("espn: rankings payload has no weeks index");
  }
  const last = weeks[weeks.length - 1];
  if (!last?.week || !last?.type) {
    throw new Error("espn: rankings weeks index entry missing week/type");
  }
  // Season type 3 is postseason for both college sports; its closing entry
  // is labeled "Final Rankings".
  if (last.type !== "3" || !/final/i.test(last.display ?? "")) {
    throw new Error(
      `espn: last rankings week is "${last.display}" (type ${last.type}) — ` +
        "not a final poll; season may not be complete",
    );
  }
  return { week: last.week, type: last.type, display: last.display };
}

/**
 * Pure transform: ESPN rankings payload (final-poll week) → adapter
 * contract shape. Reads the AP Top 25 (poll id "1"); rank = `current`,
 * metricValue = poll voting points. Entity name is "{location} {name}"
 * ("Indiana Hoosiers") to match the family full-name convention and to
 * disambiguate same-location schools.
 *
 * @param {object} config - an espnConfigs entry
 * @param {object} rankingsPayload
 * @param {string[]} fetchedFrom
 */
export function transformRankings(config, rankingsPayload, fetchedFrom) {
  const rankings = rankingsPayload?.rankings;
  if (!Array.isArray(rankings) || rankings.length === 0) {
    throw new Error(`${config.sportKey}: rankings payload has no rankings`);
  }
  const poll = rankings.find((r) => r?.id === AP_POLL_ID);
  if (!poll) {
    throw new Error(
      `${config.sportKey}: AP Top 25 (poll id ${AP_POLL_ID}) not in payload`,
    );
  }
  const ranks = Array.isArray(poll.ranks) ? poll.ranks : [];
  if (ranks.length === 0) {
    throw new Error(`${config.sportKey}: AP poll has no ranked teams`);
  }

  const entities = ranks
    .map((row) => {
      const id = row?.team?.id;
      const location = row?.team?.location;
      const nickname = row?.team?.name;
      const rank = row?.current;
      if (!id || !location || !Number.isInteger(rank) || rank < 1) {
        throw new Error(
          `${config.sportKey}: poll row missing team.id/team.location/current (team: ${location ?? id ?? "?"})`,
        );
      }
      const logo = teamLogoUrl(row.team);
      return {
        name: nickname ? `${location} ${nickname}` : location,
        sourceIds: { espn: String(id) },
        ...(logo ? { imageUrl: logo } : {}),
        rank,
        ...(typeof row.points === "number" ? { metricValue: row.points } : {}),
      };
    })
    .sort((a, b) => a.rank - b.rank);

  // Poll ranks use standard competition ranking: a final poll is a unique
  // contiguous 1..25, while a LIVE poll may share a rank across ties with
  // the next rank(s) skipped (the 2026 preseason AP poll: 14, 14, 16). The
  // contract allows shared raw ranks — scoring averages ties later — so
  // validate exactly that shape: sorted, a rank never exceeds its 1-based
  // position and never falls below the rank before it.
  entities.forEach((entity, index) => {
    const floor = index === 0 ? 1 : entities[index - 1].rank;
    if (entity.rank > index + 1 || entity.rank < floor) {
      throw new Error(
        `${config.sportKey}: AP poll ranks are not a valid competition ranking (saw ${entity.rank} at position ${index + 1})`,
      );
    }
  });

  return { sportKey: config.sportKey, fetchedFrom, entities };
}

async function getJson(sportKey, url) {
  const response = await fetch(url, {
    headers: { accept: "application/json" },
  });
  if (!response.ok) {
    throw new Error(`${sportKey}: GET ${url} → HTTP ${response.status}`);
  }
  return response.json();
}

/**
 * Build an adapter (registry entry shape) from an espnConfigs entry.
 */
export function makeEspnAdapter(config) {
  return {
    sportKey: config.sportKey,
    async fetch() {
      const todayIsoDate = new Date().toISOString().slice(0, 10);
      const { seasonYear, inSeason } = deriveSeason(config.season, todayIsoDate);
      if (config.mode === "rankings") {
        const indexUrl = rankingsIndexUrl(config.path, seasonYear);
        const index = await getJson(config.sportKey, indexUrl);
        if (inSeason) {
          // The season-pinned request with no week pin already carries the
          // latest published poll of the in-progress season — read it directly.
          return transformRankings(config, index, [indexUrl]);
        }
        const final = pickFinalRankingWeek(index);
        const pollUrl = rankingsWeekUrl(
          config.path,
          seasonYear,
          final.type,
          final.week,
        );
        const poll = await getJson(config.sportKey, pollUrl);
        return transformRankings(config, poll, [indexUrl, pollUrl]);
      }
      // Standings: the same pinned-season URL serves both paths — in-season
      // it is the live table, otherwise the completed season's final one.
      const url = standingsUrl(config.path, seasonYear);
      const payload = await getJson(config.sportKey, url);
      return transformStandings(config, payload, [url]);
    },
  };
}

// Season rules, per league:
//   inSeason {from, to, startYearOffset} — months a season is in progress
//     (wrapping year-end when to < from); inside it the in-progress label is
//     year + startYearOffset in the opening segment, one less after the wrap.
//   {boundaryMonth, onOrAfter, before} — outside the window, month >=
//     boundaryMonth → completed season year + onOrAfter, else year + before.
// Offsets encode each league's ESPN season label (NFL/CFB/soccer = starting
// year; NBA/CBB = ending year) against its calendar.
export const espnConfigs = {
  // NFL season Y runs Sep Y – Feb Y+1 (Super Bowl); label = starting year.
  // Offseason Mar–Aug reads season Y-1's finals.
  nfl: {
    sportKey: "nfl",
    path: "football/nfl",
    mode: "standings",
    rankRule: "winPercent",
    expectedCount: 32,
    season: {
      boundaryMonth: 3,
      onOrAfter: -1,
      before: -2,
      inSeason: { from: 9, to: 2, startYearOffset: 0 },
    },
  },
  // NBA season labeled by ending year, Oct – mid-June Finals. Offseason
  // Jul–Sep reads the season that just completed.
  nba: {
    sportKey: "nba",
    path: "basketball/nba",
    mode: "standings",
    rankRule: "winPercent",
    expectedCount: 30,
    season: {
      boundaryMonth: 7,
      onOrAfter: 0,
      before: -1,
      inSeason: { from: 10, to: 6, startYearOffset: 1 },
    },
  },
  // MLS is single-calendar-year, late Feb – Dec (playoffs; the regular-season
  // table is final at Decision Day in early November, so the December reads
  // simply keep returning that final table). Only January is offseason.
  // No expectedCount — the league is still expanding (30 clubs in 2025).
  mls: {
    sportKey: "mls",
    path: "soccer/usa.1",
    mode: "standings",
    rankRule: "points",
    season: {
      boundaryMonth: 12,
      onOrAfter: 0,
      before: -1,
      inSeason: { from: 2, to: 12, startYearOffset: 0 },
    },
  },
  // Premier League season labeled by starting year, mid-Aug – late May.
  // Offseason Jun–Jul reads season Y-1's final table.
  epl: {
    sportKey: "epl",
    path: "soccer/eng.1",
    mode: "standings",
    rankRule: "tableRank",
    expectedCount: 20,
    season: {
      boundaryMonth: 6,
      onOrAfter: -1,
      before: -2,
      inSeason: { from: 8, to: 5, startYearOffset: 0 },
    },
  },
  // CFB season labeled by starting year; preseason AP poll lands in August,
  // CFP title game mid/late January. Offseason Feb–Jul reads season Y-1's
  // final poll.
  cfb: {
    sportKey: "cfb",
    path: "football/college-football",
    mode: "rankings",
    season: {
      boundaryMonth: 2,
      onOrAfter: -1,
      before: -2,
      inSeason: { from: 8, to: 1, startYearOffset: 0 },
    },
  },
  // CBB season labeled by ending year; first polls in November, championship
  // + final AP poll early April. Offseason May–Oct reads the completed one.
  cbb: {
    sportKey: "cbb",
    path: "basketball/mens-college-basketball",
    mode: "rankings",
    season: {
      boundaryMonth: 5,
      onOrAfter: 0,
      before: -1,
      inSeason: { from: 11, to: 4, startYearOffset: 1 },
    },
  },
};

export const espnAdapters = Object.fromEntries(
  Object.values(espnConfigs).map((config) => [
    config.sportKey,
    makeEspnAdapter(config),
  ]),
);

export default espnAdapters;
