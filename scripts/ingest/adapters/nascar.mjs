// NASCAR Cup Series adapter — cf.nascar.com live-points feed with an ESPN
// racing-standings fallback baked in.
//
// metric_mode is 'live': entities are the DRIVERS in the season-to-date Cup
// points standings. Primary source is NASCAR's own CDN feeds (probed
// 2026-08-28 — the build plan's filename guesses were wrong, these are the
// patterns that actually serve):
//
//   race list   GET cf.nascar.com/cacher/{year}/race_list_basic.json
//               { series_1: [ {race_id, race_date, winner_driver_id, ...} ] }
//               series_1 = Cup. A race that has run has a non-null
//               winner_driver_id. (Per-race "final" cacher paths like
//               cacher/{y}/1/final/{id}-points.json 403.)
//   points      GET cf.nascar.com/live/feeds/series_1/{raceId}/live_points.json
//               For a COMPLETED race this is the season-to-date driver points
//               standings after that race (points_position unique 1..N,
//               ~56 rows incl. part-timers). Cross-checked vs ESPN racing
//               standings 2026-08-28 after race 5627: Hamlin 1001, Blaney
//               924, Gibbs 880, Reddick 860, Bell 738 — exact match.
//   drivers     GET cf.nascar.com/cacher/drivers.json
//               {response:[{Nascar_Driver_ID, Full_Name, Image, ...}]} —
//               the driver-page portraits (nascar.com wp-content PNGs;
//               NOTE: that host 403s non-browser clients, so these are
//               only a last-resort image fallback). Cross-series ringers
//               (road-course one-offs) are missing entirely.
//
// Fallback: ESPN racing standings —
//   GET site.api.espn.com/apis/v2/sports/racing/nascar-premier/standings
//   children[0].standings.entries[] = {athlete:{id,displayName},
//   stats:[rank, championshipPts]} — 40 drivers, current season when no
//   season param is pinned (correct for live mode). Athlete objects carry
//   no headshot field, but a.espncdn.com/i/headshots/rpm/players/full/{id}.png
//   serves one for every listed driver (spot-verified).
//
// The fallback lives INSIDE this adapter: fetch() tries the CF chain first
// and only on a CF failure tries ESPN; the snapshot fails only when BOTH
// fail. fetchedFrom records whichever source actually served. On the happy
// CF path, drivers.json portraits are merged in and the ESPN standings are
// ALSO fetched best-effort to enrich entities with espn ids + headshots for
// drivers drivers.json doesn't know (e.g. Kevin Magnussen) — enrichment
// failure never fails the CF path.
//
// Names: the feed decorates last names with rookie/ineligible markers
// ("Zilisch #", "Hill(i)") — stripped, they are presentation not identity.
// Cap: top NASCAR_MAX_ENTITIES (40) by points_position — full-time field
// plus every relevant part-timer, and parity with the ESPN fallback's 40.

export const NASCAR_MAX_ENTITIES = 40;
export const MIN_ENTITIES = 14;

export const raceListUrl = (year) =>
  `https://cf.nascar.com/cacher/${year}/race_list_basic.json`;
export const livePointsUrl = (raceId) =>
  `https://cf.nascar.com/live/feeds/series_1/${raceId}/live_points.json`;
export const DRIVERS_URL = "https://cf.nascar.com/cacher/drivers.json";
export const ESPN_STANDINGS_URL =
  "https://site.api.espn.com/apis/v2/sports/racing/nascar-premier/standings";
export const espnHeadshotUrl = (athleteId) =>
  `https://a.espncdn.com/i/headshots/rpm/players/full/${athleteId}.png`;

/** Strip the feed's rookie "#" / ineligible "(i)" name markers. Pure. */
export const cleanDriverName = (name) =>
  String(name ?? "")
    .replace(/\(i\)|[#*]/g, "")
    .replace(/\s+/g, " ")
    .trim();

const normalizeName = (name) =>
  cleanDriverName(name)
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");

/**
 * Pick the most recently COMPLETED Cup race from a race_list_basic payload
 * (series_1; a run race has a non-null winner_driver_id). Returns null when
 * the season has no completed race yet (January/early February). Pure.
 */
export function pickLatestCompletedRace(raceListPayload) {
  const races = raceListPayload?.series_1;
  if (!Array.isArray(races) || races.length === 0) {
    throw new Error("nascar: race list payload has no series_1 races");
  }
  const completed = races.filter(
    (race) => race?.winner_driver_id != null && race?.race_id != null,
  );
  if (completed.length === 0) return null;
  return completed.reduce((latest, race) =>
    String(race.race_date) > String(latest.race_date) ? race : latest,
  );
}

/**
 * drivers.json → Map of Nascar_Driver_ID → portrait URL (rows with a
 * non-empty Image only). Pure.
 */
export function buildDriverImageIndex(driversPayload) {
  const rows = Array.isArray(driversPayload?.response)
    ? driversPayload.response
    : [];
  const index = new Map();
  for (const row of rows) {
    if (
      row?.Nascar_Driver_ID != null &&
      typeof row.Image === "string" &&
      row.Image
    ) {
      index.set(String(row.Nascar_Driver_ID), row.Image);
    }
  }
  return index;
}

const espnEntries = (espnPayload) => {
  const children = espnPayload?.children;
  if (!Array.isArray(children) || children.length === 0) {
    throw new Error("nascar: ESPN standings payload has no children groups");
  }
  return children.flatMap((child) =>
    Array.isArray(child?.standings?.entries) ? child.standings.entries : [],
  );
};

const espnStat = (entry, statName) => {
  const stat = Array.isArray(entry?.stats)
    ? entry.stats.find((s) => s?.name === statName)
    : undefined;
  return typeof stat?.value === "number" ? stat.value : null;
};

/**
 * ESPN racing standings → Map of normalized driver name → {id, headshot}.
 * Used to enrich CF-sourced entities with espn ids + headshot URLs. Pure.
 */
export function buildEspnDriverIndex(espnPayload) {
  const index = new Map();
  for (const entry of espnEntries(espnPayload)) {
    const id = entry?.athlete?.id;
    const name = entry?.athlete?.displayName;
    if (id && name) {
      index.set(normalizeName(name), {
        id: String(id),
        headshot: espnHeadshotUrl(id),
      });
    }
  }
  if (index.size === 0) {
    throw new Error("nascar: ESPN standings payload has no athletes");
  }
  return index;
}

/**
 * Pure transform: CF live_points rows (season-to-date standings after the
 * latest completed race) → adapter contract shape. Caps at
 * NASCAR_MAX_ENTITIES by points_position and validates the capped ranks are
 * unique contiguous 1..N. `images` (driver_id → URL) and `espnIndex`
 * (normalized name → {id, headshot}) are optional enrichment maps.
 *
 * @param {Array<object>} pointsRows
 * @param {{images?: Map, espnIndex?: Map}} enrichment
 * @param {string[]} fetchedFrom
 */
export function transformCfPoints(pointsRows, enrichment, fetchedFrom) {
  if (!Array.isArray(pointsRows) || pointsRows.length === 0) {
    throw new Error("nascar: live points feed has no rows");
  }
  const images = enrichment?.images ?? new Map();
  const espnIndex = enrichment?.espnIndex ?? new Map();

  const capped = [...pointsRows]
    .sort((a, b) => (a?.points_position ?? Infinity) - (b?.points_position ?? Infinity))
    .slice(0, NASCAR_MAX_ENTITIES);
  if (capped.length < MIN_ENTITIES) {
    throw new Error(
      `nascar: only ${capped.length} drivers in the points feed (need ${MIN_ENTITIES})`,
    );
  }

  const entities = capped.map((row) => {
    const driverId = row?.driver_id;
    const rank = row?.points_position;
    const points = row?.points;
    const name = cleanDriverName(
      [row?.first_name, row?.last_name].filter(Boolean).join(" "),
    );
    if (
      driverId == null ||
      !name ||
      !Number.isInteger(rank) ||
      rank < 1 ||
      !Number.isFinite(points)
    ) {
      throw new Error(
        `nascar: points row missing driver_id/name/points_position/points (driver: ${name || driverId || "?"})`,
      );
    }
    const espn = espnIndex.get(normalizeName(name));
    // ESPN rpm headshots first — cf drivers.json portraits live on
    // www.nascar.com/wp-content, which a WAF 403s for non-browser clients
    // (probed 2026-08-28), so they are only the no-espn-match fallback.
    const imageUrl = espn?.headshot ?? images.get(String(driverId));
    return {
      name,
      sourceIds: {
        nascar_cf: String(driverId),
        ...(espn ? { espn: espn.id } : {}),
      },
      ...(imageUrl ? { imageUrl } : {}),
      rank,
      metricValue: points,
    };
  });

  entities.forEach((entity, index) => {
    if (entity.rank !== index + 1) {
      throw new Error(
        `nascar: points_position is not a contiguous 1..${entities.length} ordering (saw ${entity.rank} at position ${index + 1})`,
      );
    }
  });

  return { sportKey: "nascar", fetchedFrom, entities };
}

/**
 * Pure transform: ESPN racing standings payload → adapter contract shape.
 * The FALLBACK path — rank from ESPN's `rank` stat (validated unique
 * contiguous 1..N), metricValue = championshipPts, imageUrl = the rpm
 * headshot URL constructed from the athlete id.
 *
 * @param {object} espnPayload
 * @param {string[]} fetchedFrom
 */
export function transformEspnStandings(espnPayload, fetchedFrom) {
  const rows = espnEntries(espnPayload);
  if (rows.length < MIN_ENTITIES) {
    throw new Error(
      `nascar: ESPN standings has ${rows.length} drivers (need ${MIN_ENTITIES})`,
    );
  }
  const entities = rows
    .map((entry) => {
      const id = entry?.athlete?.id;
      const name = cleanDriverName(entry?.athlete?.displayName);
      const rank = espnStat(entry, "rank");
      const points = espnStat(entry, "championshipPts");
      if (!id || !name || !Number.isInteger(rank) || rank < 1) {
        throw new Error(
          `nascar: ESPN standings row missing athlete.id/displayName/rank (driver: ${name || id || "?"})`,
        );
      }
      return {
        name,
        sourceIds: { espn: String(id) },
        imageUrl: espnHeadshotUrl(id),
        rank,
        ...(Number.isFinite(points) ? { metricValue: points } : {}),
      };
    })
    .sort((a, b) => a.rank - b.rank);

  entities.forEach((entity, index) => {
    if (entity.rank !== index + 1) {
      throw new Error(
        `nascar: ESPN rank stat is not a contiguous 1..${entities.length} ordering (saw ${entity.rank} at position ${index + 1})`,
      );
    }
  });

  return { sportKey: "nascar", fetchedFrom, entities };
}

async function getJson(url) {
  const response = await fetch(url, {
    headers: { accept: "application/json" },
  });
  if (!response.ok) {
    throw new Error(`nascar: GET ${url} → HTTP ${response.status}`);
  }
  return response.json();
}

async function fetchFromCf() {
  const year = Number(new Date().toISOString().slice(0, 4));
  const fetchedFrom = [];
  let race = null;
  // January gap: the new season's list exists but has no completed race yet —
  // fall back to the prior season's final standings.
  for (const seasonYear of [year, year - 1]) {
    const listUrl = raceListUrl(seasonYear);
    const raceList = await getJson(listUrl);
    fetchedFrom.push(listUrl);
    race = pickLatestCompletedRace(raceList);
    if (race) break;
  }
  if (!race) {
    throw new Error("nascar: no completed Cup race found in current or prior season");
  }

  const pointsUrl = livePointsUrl(race.race_id);
  const pointsRows = await getJson(pointsUrl);
  fetchedFrom.push(pointsUrl);

  // Best-effort image/id enrichment — never fails the CF path.
  let images = new Map();
  try {
    images = buildDriverImageIndex(await getJson(DRIVERS_URL));
    fetchedFrom.push(DRIVERS_URL);
  } catch {
    // drivers.json down — ESPN headshots below may still cover.
  }
  let espnIndex = new Map();
  try {
    espnIndex = buildEspnDriverIndex(await getJson(ESPN_STANDINGS_URL));
    fetchedFrom.push(ESPN_STANDINGS_URL);
  } catch {
    // ESPN enrichment down — CF portraits alone still serve.
  }

  return transformCfPoints(pointsRows, { images, espnIndex }, fetchedFrom);
}

const nascarAdapter = {
  sportKey: "nascar",
  async fetch() {
    let cfError;
    try {
      return await fetchFromCf();
    } catch (error) {
      cfError = error;
    }
    try {
      const payload = await getJson(ESPN_STANDINGS_URL);
      return transformEspnStandings(payload, [ESPN_STANDINGS_URL]);
    } catch (espnError) {
      throw new Error(
        `nascar: both sources failed — CF: ${cfError.message}; ESPN fallback: ${espnError.message}`,
      );
    }
  },
};

export default nascarAdapter;
