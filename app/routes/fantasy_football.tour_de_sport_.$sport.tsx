import { json } from "@remix-run/node";
import type {
  HeadersFunction,
  LoaderFunctionArgs,
  MetaFunction,
} from "@remix-run/node";
import {
  Link,
  isRouteErrorResponse,
  useLoaderData,
  useRouteError,
} from "@remix-run/react";

import ManagerAvatar from "~/components/ManagerAvatar";
import {
  FantasyMain,
  FantasyPanel,
  FantasySectionHeading,
  fantasyTableBodyClass,
  fantasyTableHeadRowClass,
  fantasyTableShellClass,
} from "~/components/FantasyFootballUI";
import { capitalizeFirstLetter } from "~/utils/helpers";
import { createSupabaseServerClient } from "~/utils/supabase.server";
import {
  formatPoints,
  formatRelativeTime,
  isStaleFetchedAt,
} from "~/utils/tour_de_sport/scoreboard";
import type { SportScoreRow } from "~/utils/tour_de_sport/scoreboard";

// Public sport board: cache at the edge, serve stale while revalidating —
// same policy as the landing page.
const CACHE_CONTROL = "public, s-maxage=300, stale-while-revalidate=3600";

const SEASON_YEAR = 2027;

export const meta: MetaFunction<typeof loader> = ({ data }) => [
  {
    title: data
      ? `${data.sport.name} | Tour de Sport`
      : "Tour de Sport | Fantasy Football",
  },
];

export const headers: HeadersFunction = ({ loaderHeaders }) => ({
  "Cache-Control": loaderHeaders.get("Cache-Control") ?? CACHE_CONTROL,
});

type SportDetail = {
  sport_key: string;
  name: string;
  sport_index: number;
  metric_mode: "live" | "final_prior";
  status: "pending" | "counting" | "final";
  revealed: boolean;
};

function notFound(): Response {
  return new Response("This Tour de Sport sport does not exist.", {
    status: 404,
    statusText: "Not Found",
  });
}

export const loader = async ({ params }: LoaderFunctionArgs) => {
  const sportKey = params.sport ?? "";

  try {
    const supabase = createSupabaseServerClient();

    const { data: season } = await supabase
      .from("tds_seasons")
      .select("id, year")
      .eq("year", SEASON_YEAR)
      .maybeSingle();
    if (!season) throw notFound();

    // sport_key is validated against tds_sports — anything the season does
    // not know 404s.
    const { data: sport } = await supabase
      .from("tds_sports")
      .select("sport_key, name, sport_index, metric_mode, status, revealed_at")
      .eq("season_id", season.id)
      .eq("sport_key", sportKey)
      .maybeSingle();
    if (!sport) throw notFound();

    // The RPC returns zero rows for BOTH unknown and unrevealed sports, so
    // the tds_sports row (always public) is what distinguishes "not yet
    // revealed" from 404 — and nothing entity-shaped is fetched pre-reveal.
    const revealed = sport.revealed_at !== null;
    let rows: SportScoreRow[] = [];
    let managerIdByParticipantId: Record<number, number | null> = {};
    if (revealed) {
      const [scoresResult, participantsResult] = await Promise.all([
        supabase.rpc("tds_sport_scores", {
          p_season_year: season.year,
          p_sport_key: sport.sport_key,
        }),
        supabase
          .from("tds_participants")
          .select("id, manager_id")
          .eq("season_id", season.id),
      ]);
      rows = (scoresResult.data ?? []) as unknown as SportScoreRow[];
      managerIdByParticipantId = Object.fromEntries(
        (participantsResult.data ?? []).map((participant) => [
          participant.id,
          participant.manager_id,
        ])
      );
    }

    return json(
      {
        sport: {
          sport_key: sport.sport_key,
          name: sport.name,
          sport_index: sport.sport_index,
          metric_mode: sport.metric_mode,
          status: sport.status,
          revealed,
        } as SportDetail,
        rows,
        managerIdByParticipantId,
        // Loader clock for SSR-stable staleness/relative-time rendering.
        now: Date.now(),
      },
      { headers: { "Cache-Control": CACHE_CONTROL } }
    );
  } catch (error) {
    if (error instanceof Response) throw error;
    // The tds_ tables ship in their own migration; in an environment without
    // them this page simply does not exist yet.
    throw notFound();
  }
};

const metricModeLabel: Record<SportDetail["metric_mode"], string> = {
  live: "Live standings through the cutoff",
  final_prior: "Most recent completed season",
};

function formatMetricValue(value: number | null): string | null {
  if (value === null || value === undefined) return null;
  return String(Math.round(value * 1000) / 1000);
}

const tableHeadCellClass =
  "h-11 whitespace-nowrap px-3 text-left align-middle font-mono text-[11px] font-semibold uppercase tracking-[0.06em]";

export default function TourDeSportSport() {
  const { sport, rows, managerIdByParticipantId, now } =
    useLoaderData<typeof loader>();

  const fetchedAt = rows[0]?.fetched_at ?? null;
  const snapshotDate = rows[0]?.snapshot_date ?? null;
  const stale = sport.revealed && isStaleFetchedAt(fetchedAt, now);
  const notCounted = sport.status === "pending";

  // Rows sharing an averaged ordinal are real-world ties — shown as T4.
  const ordinalCounts = new Map<number, number>();
  for (const row of rows) {
    ordinalCounts.set(row.ordinal, (ordinalCounts.get(row.ordinal) ?? 0) + 1);
  }

  return (
    <FantasyMain>
      <Link
        to="/fantasy_football/tour_de_sport"
        prefetch="intent"
        className="mb-6 inline-flex items-center gap-2 font-mono text-[12.5px] font-semibold uppercase tracking-[0.05em] text-ink-muted no-underline transition hover:text-accent dark:text-zinc-400"
      >
        <span aria-hidden="true">←</span>
        Tour de Sport
      </Link>

      {!sport.revealed ? (
        <section>
          <FantasySectionHeading>The Board</FantasySectionHeading>
          <div className="rounded-md border border-dashed border-accent p-5">
            <div className="mb-1.5 font-mono text-[11px] font-semibold uppercase tracking-[0.06em] text-accent">
              Not yet revealed
            </div>
            <p className="max-w-[640px] text-[15px] leading-[1.7] text-ink">
              {sport.name}'s assignments are drawn live at the draft party and
              go public the moment the Draw reveals them — not a second
              before. Until then, this board stays empty on purpose.
            </p>
          </div>
        </section>
      ) : (
        <section>
          <FantasySectionHeading>The Board</FantasySectionHeading>
          <div className="mb-4 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-ink-muted dark:text-zinc-400">
            <span>{metricModeLabel[sport.metric_mode]}.</span>
            <span>
              {fetchedAt
                ? `Data last updated ${formatRelativeTime(fetchedAt, now)}${
                    snapshotDate ? ` (snapshot ${snapshotDate})` : ""
                  }.`
                : "No successful data fetch yet."}
            </span>
            {stale ? (
              <span className="inline-flex items-center gap-1.5 rounded border border-amber-500 px-1.5 py-0.5 font-mono text-[10px] font-semibold uppercase tracking-[0.06em] text-amber-600 dark:text-amber-400">
                <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
                Stale data
              </span>
            ) : null}
          </div>

          {notCounted ? (
            <div className="mb-4 rounded-md border border-dashed border-line-muted p-4">
              <div className="mb-1 font-mono text-[11px] font-semibold uppercase tracking-[0.06em] text-ink-muted dark:text-zinc-400">
                Not yet counted
              </div>
              <p className="max-w-[640px] text-sm leading-[1.6] text-ink">
                This Sport hasn't started counting: the points below are a
                preview and contribute zero to the season totals until it
                flips on.
              </p>
            </div>
          ) : null}

          {rows.length > 0 ? (
            <div className={fantasyTableShellClass}>
              <table className="w-full min-w-[680px] border-collapse text-sm">
                <thead>
                  <tr className={fantasyTableHeadRowClass}>
                    <th className={tableHeadCellClass}>Rank</th>
                    <th className={tableHeadCellClass}>Participant</th>
                    <th className={tableHeadCellClass}>Entity</th>
                    <th className={tableHeadCellClass}>Real-World Standing</th>
                    <th className={`${tableHeadCellClass} text-right`}>
                      Points
                    </th>
                  </tr>
                </thead>
                <tbody className={fantasyTableBodyClass}>
                  {rows.map((row) => {
                    const tiedOrdinal =
                      (ordinalCounts.get(row.ordinal) ?? 0) > 1;
                    return (
                      <tr key={row.participant_id} className="align-middle">
                        <td className="px-3 py-3 font-mono text-sm font-semibold text-accent">
                          {tiedOrdinal ? "T" : ""}
                          {formatPoints(row.ordinal)}
                        </td>
                        <td className="px-3 py-3">
                          <span className="flex items-center gap-2.5">
                            <ManagerAvatar
                              id={
                                managerIdByParticipantId[row.participant_id] ??
                                row.display_name
                              }
                              name={row.display_name}
                              className="h-8 w-8 text-xs"
                            />
                            <span className="min-w-0 truncate font-semibold text-ink dark:text-zinc-50">
                              {capitalizeFirstLetter(row.display_name)}
                            </span>
                          </span>
                        </td>
                        <td className="px-3 py-3">
                          <span className="flex items-center gap-2">
                            {row.entity_image_url ? (
                              <img
                                src={row.entity_image_url}
                                alt=""
                                loading="lazy"
                                className="h-6 w-6 shrink-0 object-contain"
                              />
                            ) : null}
                            <span className="min-w-0 truncate text-ink dark:text-zinc-50">
                              {row.entity_name}
                            </span>
                          </span>
                          {row.reassigned ? (
                            <div className="mt-1 max-w-[320px] text-xs leading-[1.5] text-amber-600 dark:text-amber-400">
                              <span className="mr-1.5 rounded border border-amber-500 px-1 py-0.5 font-mono text-[9px] font-semibold uppercase tracking-[0.06em]">
                                Reassigned
                              </span>
                              {row.reassignment_reason}
                            </div>
                          ) : null}
                          {row.overridden && row.override_reason ? (
                            <div className="mt-1 max-w-[320px] text-xs leading-[1.5] text-amber-600 dark:text-amber-400">
                              {row.override_reason}
                            </div>
                          ) : null}
                        </td>
                        <td className="px-3 py-3">
                          {row.real_rank !== null ? (
                            <span className="flex items-baseline gap-2">
                              <span className="font-mono font-semibold text-ink dark:text-zinc-50">
                                #{row.real_rank}
                              </span>
                              {formatMetricValue(row.metric_value) ? (
                                <span className="font-mono text-xs text-ink-muted dark:text-zinc-400">
                                  {formatMetricValue(row.metric_value)}
                                </span>
                              ) : null}
                            </span>
                          ) : (
                            <span className="text-xs text-ink-muted dark:text-zinc-400">
                              Not in standings
                            </span>
                          )}
                        </td>
                        <td className="px-3 py-3 text-right">
                          <span className="font-mono text-sm font-semibold text-ink dark:text-zinc-50">
                            {formatPoints(row.points)}
                          </span>
                          {row.overridden ? (
                            <div className="mt-0.5 font-mono text-[10px] font-semibold uppercase tracking-[0.06em] text-amber-600 dark:text-amber-400">
                              Override — computed {formatPoints(row.base_points)}
                            </div>
                          ) : null}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <FantasyPanel>
              <p className="max-w-[640px] text-[15px] leading-[1.7] text-ink">
                {sport.name} is revealed but its board has nothing to show
                yet — check back once its data lands.
              </p>
            </FantasyPanel>
          )}

          <p className="mt-4 max-w-[640px] text-xs leading-[1.5] text-ink-muted dark:text-zinc-400">
            Every Sport pays the same 105-point pool, first place to last,
            ties averaging their ranks. An assigned Entity missing from the
            standings ranks below everyone present.
          </p>
        </section>
      )}
    </FantasyMain>
  );
}

export function ErrorBoundary() {
  const error = useRouteError();
  const heading = isRouteErrorResponse(error)
    ? error.status === 404
      ? "Unknown Sport"
      : "Sport Unavailable"
    : "Sport Unavailable";
  const detail =
    isRouteErrorResponse(error) && typeof error.data === "string"
      ? error.data
      : "Something went wrong loading this Tour de Sport page.";

  return (
    <FantasyMain>
      <FantasyPanel>
        <div className="mb-1.5 font-mono text-[11px] font-semibold uppercase tracking-[0.06em] text-accent">
          {heading}
        </div>
        <p className="mb-3 max-w-[640px] text-[15px] leading-[1.7] text-ink">
          {detail}
        </p>
        <Link
          to="/fantasy_football/tour_de_sport"
          prefetch="intent"
          className="inline-flex items-center gap-2 font-mono text-[12.5px] font-semibold uppercase tracking-[0.05em] text-ink no-underline transition hover:text-accent dark:text-zinc-100"
        >
          <span aria-hidden="true">←</span>
          Back to Tour de Sport
        </Link>
      </FantasyPanel>
    </FantasyMain>
  );
}
