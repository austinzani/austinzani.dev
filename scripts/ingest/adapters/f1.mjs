// F1 adapter — Jolpica (api.jolpi.ca), the community successor to the
// retired Ergast API, same response shape.
//
// metric_mode for F1 is 'live': the `current` season alias always points at
// the championship in progress (or the most recently completed one between
// seasons), so one URL serves the whole year. Entities are the DRIVERS in
// the World Drivers' Championship standings (~20-23 per season — mid-season
// seat swaps add rows). `limit=100` guards against the default page size
// (30) ever truncating a swap-heavy season; the transform still hard-fails
// if MRData.total exceeds the rows returned.
//
// Rank: the championship `position` — Jolpica pre-breaks points ties with
// the official countback (wins, then best finishes), so positions arrive
// unique. The contract tolerates shared raw ranks anyway, so if the source
// ever emits a genuine tie we pass it through untouched (scoring averages
// tied ranks later). metricValue: championship points.
//
// sourceIds: { jolpica: <driverId>, jolpica_constructor: <constructorId> }.
// driverId (e.g. "max_verstappen") is Jolpica's stable driver slug — the
// cross-source identity key. Constructors is an array (every team the
// driver scored for this season, in order); we store the LAST entry — the
// driver's CURRENT team — as jolpica_constructor. It is context, not
// identity: assignments key off the driver.
//
// Images: Jolpica has none, so imageUrl comes from the static
// f1-images.mjs map (Wikimedia Commons portraits keyed by driverId).
// Unmapped drivers get no imageUrl (optional in the contract).
import { F1_DRIVER_IMAGES } from "./f1-images.mjs";

const STANDINGS_URL =
  "https://api.jolpi.ca/ergast/f1/current/driverstandings/?limit=100";

/**
 * Pure transform: Jolpica driver-standings payload → adapter contract shape.
 * Exported separately from the fetch so fixture tests need no network.
 *
 * @param {{MRData: object}} payload
 * @param {string[]} fetchedFrom - source URLs, for provenance
 */
export function transformDriverStandings(payload, fetchedFrom) {
  const mrData = payload?.MRData;
  const rows = mrData?.StandingsTable?.StandingsLists?.[0]?.DriverStandings;
  if (!Array.isArray(rows) || rows.length === 0) {
    throw new Error("f1: payload has no DriverStandings rows");
  }
  const total = Number.parseInt(mrData.total, 10);
  if (Number.isInteger(total) && total > rows.length) {
    throw new Error(
      `f1: standings truncated by pagination (total ${total}, got ${rows.length})`,
    );
  }

  const entities = rows
    .map((row) => {
      const driver = row?.Driver;
      const driverId = driver?.driverId;
      const name = [driver?.givenName, driver?.familyName]
        .filter(Boolean)
        .join(" ");
      const rank = Number.parseInt(row?.position, 10);
      if (!driverId || !name || !Number.isInteger(rank) || rank < 1) {
        throw new Error(
          `f1: standings row missing driverId/name/position (driver: ${driverId ?? "?"})`,
        );
      }
      const constructors = Array.isArray(row.Constructors)
        ? row.Constructors
        : [];
      const currentConstructorId =
        constructors[constructors.length - 1]?.constructorId;
      const points = Number.parseFloat(row.points);
      const imageUrl = F1_DRIVER_IMAGES[driverId];
      return {
        name,
        sourceIds: {
          jolpica: driverId,
          ...(currentConstructorId
            ? { jolpica_constructor: currentConstructorId }
            : {}),
        },
        ...(imageUrl ? { imageUrl } : {}),
        rank,
        ...(Number.isFinite(points) ? { metricValue: points } : {}),
      };
    })
    .sort((a, b) => a.rank - b.rank);

  return { sportKey: "f1", fetchedFrom, entities };
}

async function getJson(url) {
  const response = await fetch(url, {
    headers: { accept: "application/json" },
  });
  if (!response.ok) {
    throw new Error(`f1: GET ${url} → HTTP ${response.status}`);
  }
  return response.json();
}

const f1Adapter = {
  sportKey: "f1",
  async fetch() {
    const payload = await getJson(STANDINGS_URL);
    return transformDriverStandings(payload, [STANDINGS_URL]);
  },
};

export default f1Adapter;
