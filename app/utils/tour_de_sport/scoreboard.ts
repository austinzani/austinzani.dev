// Pure display helpers shared by the Tour de Sport scoreboard (landing) and
// the per-sport detail route. No server dependencies.

/** Shape of one entry in tds_scoreboard's `sports` jsonb array (all 12 sports,
 * ordered by sport_index). */
export type ScoreboardSportEntry = {
  sport_id: number;
  sport_key: string;
  name: string;
  sport_index: number;
  status: "pending" | "counting" | "final";
  revealed: boolean;
  counted: boolean;
  points: number | null;
  overridden: boolean | null;
  snapshot_date: string | null;
  fetched_at: string | null;
};

export type ScoreboardRow = {
  participant_id: number;
  display_name: string;
  manager_id: number | null;
  total_points: number;
  sports: ScoreboardSportEntry[];
};

/** One row of tds_sport_scores, ordered best-first (ordinal asc). */
export type SportScoreRow = {
  participant_id: number;
  display_name: string;
  entity_id: number;
  entity_name: string;
  entity_image_url: string | null;
  real_rank: number | null;
  metric_value: number | null;
  ordinal: number;
  base_points: number;
  points: number;
  overridden: boolean;
  override_reason: string | null;
  snapshot_date: string | null;
  fetched_at: string | null;
  reassigned: boolean;
  reassignment_reason: string | null;
};

/** Data older than this is flagged amber everywhere (per-spec staleness rule). */
export const STALE_AFTER_MS = 48 * 60 * 60 * 1000;

/**
 * A revealed sport with no fetched_at was never successfully ingested —
 * treated as stale/unknown, same amber badge.
 */
export function isStaleFetchedAt(
  fetchedAt: string | null | undefined,
  nowMs: number
): boolean {
  if (!fetchedAt) return true;
  const fetchedMs = Date.parse(fetchedAt);
  if (!Number.isFinite(fetchedMs)) return true;
  return nowMs - fetchedMs > STALE_AFTER_MS;
}

/**
 * Points arrive as numerics with long decimal tails (14.000000…); scoring
 * only ever produces halves, but overrides can be arbitrary — round to two
 * places and drop trailing zeros.
 */
export function formatPoints(value: number | null | undefined): string {
  if (value === null || value === undefined) return "—";
  return String(Math.round(value * 100) / 100);
}

/** Coarse relative time for the "Last updated" line — SSR-stable (uses the
 * loader's clock, no locale). */
export function formatRelativeTime(iso: string, nowMs: number): string {
  const thenMs = Date.parse(iso);
  if (!Number.isFinite(thenMs)) return "at an unknown time";
  const minutes = Math.floor((nowMs - thenMs) / 60000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes} minute${minutes === 1 ? "" : "s"} ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} hour${hours === 1 ? "" : "s"} ago`;
  const days = Math.floor(hours / 24);
  return `${days} day${days === 1 ? "" : "s"} ago`;
}

export type RankedScoreboardRow = ScoreboardRow & {
  rank: number;
  tied: boolean;
};

/**
 * Standard competition ranking over rows already sorted total-desc by the
 * RPC: equal totals share the lower rank and are displayed tied ("T2").
 */
export function rankScoreboardRows(rows: ScoreboardRow[]): RankedScoreboardRow[] {
  const ranked: RankedScoreboardRow[] = [];
  rows.forEach((row, index) => {
    const previous = ranked[index - 1];
    const sharesPrevious =
      previous !== undefined &&
      Math.abs(previous.total_points - row.total_points) < 1e-9;
    const rank = sharesPrevious ? previous.rank : index + 1;
    if (sharesPrevious && previous) previous.tied = true;
    ranked.push({ ...row, rank, tied: sharesPrevious });
  });
  return ranked;
}

/** sport_key → display name, mirroring the season-1 seed. Used by the fantasy
 * shell's pathname-only hero switch, which cannot see loader data. */
export const TDS_SPORT_NAMES: Record<string, string> = {
  nhl: "NHL",
  mlb: "MLB",
  f1: "Formula 1",
  nfl: "NFL",
  nba: "NBA",
  mls: "MLS",
  epl: "Premier League",
  cfb: "College Football",
  cbb: "College Basketball",
  nascar: "NASCAR",
  pga: "PGA Tour",
  atp: "ATP Tennis",
};
