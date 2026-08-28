/**
 * Plain-English scoring descriptions for the sport boards, derived from the
 * season row (year + cutoff_date) so a new season updates the copy on its
 * own — no hardcoded years or dates in the pages. The SQL scoring function
 * is the behavior; these sentences are its public mirror.
 *
 * Season-label conventions, all derived from tds_seasons.year (the year the
 * game's cutoff lands in, e.g. 2027):
 *   - prior-year leagues (NFL, CFB): the season STARTING the prior fall,
 *     labeled "2026".
 *   - cross-year leagues (NHL, NBA, CBB, EPL): labeled "2026-27".
 *   - cutoff-frozen leagues (MLB, MLS, NASCAR, PGA, F1): the calendar-year
 *     season frozen on the cutoff date, labeled "2027".
 *
 * Pure module: no imports with side effects.
 */

const MONTH_NAMES = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

/** "2027-08-07" → "Aug 7, 2027"; unparseable input falls back to a phrase. */
export function formatCutoffDate(
  value: string | null | undefined,
  fallback = "the season's cutoff date"
): string {
  if (!value) return fallback;
  const [year, month, day] = value.split("-").map(Number);
  if (!year || !month || !day || !MONTH_NAMES[month - 1]) return fallback;
  return `${MONTH_NAMES[month - 1]} ${day}, ${year}`;
}

/** 2027 → "2026-27" (the cross-year season completing in the cutoff year). */
function crossYearLabel(seasonYear: number): string {
  return `${seasonYear - 1}-${String(seasonYear).slice(-2)}`;
}

/**
 * The universal conversion, identical for every Sport. Shown once next to
 * the per-sport sentence.
 */
export const UNIVERSAL_SCORING_SENTENCE =
  "The 14 assigned Entities are ranked against each other by that standing: 14 points for the best down to 1 for the worst, ties splitting the points evenly, and an Entity missing from the standings ties for last. Every Sport pays exactly 105 points.";

type SportCopy = { description: string; shortLabel: string };

/**
 * The one per-sport copy table: each Sport's full description and compact
 * label built together from the season row's labels, so adding a Sport or
 * rewording one is a single edit. Returns null for unknown sport keys.
 */
function sportCopy(
  sportKey: string,
  seasonYear: number,
  cutoffDate: string | null | undefined
): SportCopy | null {
  const prior = seasonYear - 1;
  const cross = crossYearLabel(seasonYear);
  const cutoff = formatCutoffDate(cutoffDate);

  switch (sportKey) {
    case "nfl":
      return {
        description: `Scores the final ${prior} regular-season standings, all 32 teams ranked by win percentage. Playoffs never count.`,
        shortLabel: `Final ${prior} standings`,
      };
    case "nhl":
      return {
        description: `Scores the final ${cross} standings by points, the league's own 1-32 ordering with its official tiebreaks.`,
        shortLabel: `Final ${cross} standings`,
      };
    case "nba":
      return {
        description: `Scores the final ${cross} regular-season standings, all 30 teams ranked by win percentage. Playoffs never count.`,
        shortLabel: `Final ${cross} standings`,
      };
    case "cfb":
      return {
        description: `Scores the final ${prior} AP Top 25. Ranked teams score by poll position; a team that falls out of the poll ties for last.`,
        shortLabel: `Final ${prior} AP poll`,
      };
    case "cbb":
      return {
        description: `Scores the final ${cross} AP Top 25. Ranked teams score by poll position; a team that falls out of the poll ties for last.`,
        shortLabel: `Final ${cross} AP poll`,
      };
    case "epl":
      return {
        description: `Scores the final ${cross} Premier League table, positions 1 through 20.`,
        shortLabel: `Final ${cross} table`,
      };
    case "mlb":
      return {
        description: `Scores the ${seasonYear} standings frozen on ${cutoff}, all 30 teams ranked by win percentage. Whatever the table says that morning is the result.`,
        shortLabel: `Frozen ${cutoff}`,
      };
    case "mls":
      return {
        description: `Scores the ${seasonYear} table frozen on ${cutoff}, ranked league-wide by points, not by conference.`,
        shortLabel: `Frozen ${cutoff}`,
      };
    case "nascar":
      return {
        description: `Scores ${seasonYear} Cup Series driver points frozen on ${cutoff}, before the playoffs reset anything.`,
        shortLabel: `Frozen ${cutoff}`,
      };
    case "pga":
      return {
        description: `Scores ${seasonYear} FedEx Cup points frozen on ${cutoff}, which is roughly the end of the regular season.`,
        shortLabel: `Frozen ${cutoff}`,
      };
    case "f1":
      return {
        description: `Scores the ${seasonYear} Drivers' Championship points table frozen on ${cutoff}, mid-season by design.`,
        shortLabel: `Frozen ${cutoff}`,
      };
    case "atp":
      return {
        description: `Scores the official ATP rankings as published on ${cutoff}. The rankings roll weekly; this is simply that week's list.`,
        shortLabel: `Rankings on ${cutoff}`,
      };
    default:
      return null;
  }
}

/**
 * One sentence per Sport describing which real-world standings it scores.
 * Unknown sport keys fall back to a metric-mode-based generic so a future
 * season's new Sport never renders an empty description.
 */
export function sportScoringDescription(
  sportKey: string,
  seasonYear: number,
  cutoffDate: string | null | undefined,
  metricMode: "live" | "final_prior" = "live"
): string {
  const copy = sportCopy(sportKey, seasonYear, cutoffDate);
  if (copy) return copy.description;
  const cutoff = formatCutoffDate(cutoffDate);
  return metricMode === "live"
    ? `Scores this Sport's standings frozen on ${cutoff}.`
    : `Scores this Sport's most recent completed season as of ${cutoff}.`;
}

/**
 * Compact per-sport label for tight UI spots (tab subtext, board meta line) —
 * the short form of sportScoringDescription, from the same copy table.
 * Unknown sport keys fall back by metric mode.
 */
export function sportScoringShortLabel(
  sportKey: string,
  seasonYear: number,
  cutoffDate: string | null | undefined,
  metricMode: "live" | "final_prior" = "live"
): string {
  const copy = sportCopy(sportKey, seasonYear, cutoffDate);
  if (copy) return copy.shortLabel;
  return metricMode === "live"
    ? `Frozen ${formatCutoffDate(cutoffDate)}`
    : "Most recent completed season";
}
