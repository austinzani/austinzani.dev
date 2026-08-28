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
} from "~/components/FantasyFootballUI";
import { capitalizeFirstLetter } from "~/utils/helpers";
import { createSupabaseServerClient } from "~/utils/supabase.server";
import {
  formatPoints,
  formatRelativeTime,
  isStaleFetchedAt,
} from "~/utils/tour_de_sport/scoreboard";
import type { SportScoreRow } from "~/utils/tour_de_sport/scoreboard";
import {
  UNIVERSAL_SCORING_SENTENCE,
  sportScoringDescription,
  sportScoringShortLabel,
} from "~/utils/tour_de_sport/scoring-copy";

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
      .select("id, year, cutoff_date")
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
        // The season row drives the scoring copy: a new season's year and
        // cutoff date update the descriptions on their own.
        season: { year: season.year, cutoff_date: season.cutoff_date },
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

function formatMetricValue(value: number | null): string | null {
  if (value === null || value === undefined) return null;
  return String(Math.round(value * 1000) / 1000);
}

// One board row = one shared grid reflowing by breakpoint: two stacked lines
// on phones (rank/participant/points, then entity + standing full-width), a
// single table-like line at md+. Explicit md col/row starts do the reflow —
// no parallel mobile/desktop renderings.
const boardRowGridClass =
  "grid grid-cols-[2.5rem_minmax(0,1fr)_auto] items-center gap-x-3 gap-y-2 md:grid-cols-[3rem_minmax(0,5fr)_minmax(0,6fr)_5.5rem] md:gap-x-4";

const boardFlagChipClass =
  "rounded border border-amber-500 px-2 py-1.5 text-xs leading-[1.5] text-amber-600 dark:text-amber-400";

const boardFlagLabelClass =
  "mr-1.5 font-mono text-[9px] font-semibold uppercase tracking-[0.06em]";

export default function TourDeSportSport() {
  const { sport, rows, managerIdByParticipantId, season, now } =
    useLoaderData<typeof loader>();
  const scoringSentence = sportScoringDescription(
    sport.sport_key,
    season.year,
    season.cutoff_date,
    sport.metric_mode
  );

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
            <span>
              {sportScoringShortLabel(
                sport.sport_key,
                season.year,
                season.cutoff_date,
                sport.metric_mode
              )}
              .
            </span>
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
            <div>
              <div
                className={`mb-2 hidden px-3 font-mono text-[11px] font-semibold uppercase tracking-[0.06em] text-zinc-500 dark:text-zinc-400 md:grid md:grid-cols-[3rem_minmax(0,5fr)_minmax(0,6fr)_5.5rem] md:gap-x-4`}
              >
                <span>Rank</span>
                <span>Participant</span>
                <span>Entity · Standing</span>
                <span className="text-right">Points</span>
              </div>
              <ul className="space-y-2">
                {rows.map((row) => {
                  const tiedOrdinal = (ordinalCounts.get(row.ordinal) ?? 0) > 1;
                  const metricValue = formatMetricValue(row.metric_value);
                  return (
                    <li
                      key={row.participant_id}
                      className="rounded-md border border-line-muted bg-paper-muted p-3 dark:bg-zinc-900"
                    >
                      <div className={boardRowGridClass}>
                        <span className="font-mono text-sm font-semibold text-accent">
                          {tiedOrdinal ? "T" : ""}
                          {formatPoints(row.ordinal)}
                        </span>
                        <span className="flex min-w-0 items-center gap-2.5">
                          <ManagerAvatar
                            id={
                              managerIdByParticipantId[row.participant_id] ??
                              row.display_name
                            }
                            name={row.display_name}
                            className="h-8 w-8 text-xs"
                          />
                          <span className="min-w-0 truncate text-sm font-semibold text-ink dark:text-zinc-50">
                            {capitalizeFirstLetter(row.display_name)}
                          </span>
                        </span>
                        <span className="text-right font-display text-[22px] leading-none text-ink dark:text-zinc-50 md:col-start-4 md:row-start-1 md:text-xl">
                          {formatPoints(row.points)}
                        </span>
                        <span className="col-span-3 flex min-w-0 items-center gap-2 md:col-span-1 md:col-start-3 md:row-start-1">
                          {row.entity_image_url ? (
                            <img
                              src={row.entity_image_url}
                              alt=""
                              loading="lazy"
                              className="h-6 w-6 shrink-0 object-contain"
                            />
                          ) : null}
                          <span className="min-w-0 truncate text-sm text-ink dark:text-zinc-50">
                            {row.entity_name}
                          </span>
                          {row.real_rank !== null ? (
                            <span className="shrink-0 font-mono text-xs text-ink-muted dark:text-zinc-400">
                              #{row.real_rank}
                              {metricValue ? ` · ${metricValue}` : ""}
                            </span>
                          ) : (
                            <span className="shrink-0 text-xs text-ink-muted dark:text-zinc-400">
                              Not in standings
                            </span>
                          )}
                        </span>
                      </div>
                      {row.reassigned || row.overridden ? (
                        <div className="mt-2 space-y-1.5">
                          {row.reassigned ? (
                            <div className={boardFlagChipClass}>
                              <span className={boardFlagLabelClass}>
                                Reassigned
                              </span>
                              {row.reassignment_reason}
                            </div>
                          ) : null}
                          {row.overridden ? (
                            <div className={boardFlagChipClass}>
                              <span className={boardFlagLabelClass}>
                                Override — computed{" "}
                                {formatPoints(row.base_points)}
                              </span>
                              {row.override_reason}
                            </div>
                          ) : null}
                        </div>
                      ) : null}
                    </li>
                  );
                })}
              </ul>
            </div>
          ) : (
            <FantasyPanel>
              <p className="max-w-[640px] text-[15px] leading-[1.7] text-ink">
                {sport.name} is revealed but its board has nothing to show
                yet — check back once its data lands.
              </p>
            </FantasyPanel>
          )}

        </section>
      )}

      <section className="mt-8">
        <FantasySectionHeading>How This Sport Scores</FantasySectionHeading>
        <div className="max-w-[640px] space-y-2 text-sm leading-[1.7] text-ink">
          <p>{scoringSentence}</p>
          <p className="text-xs leading-[1.6] text-ink-muted dark:text-zinc-400">
            {UNIVERSAL_SCORING_SENTENCE}
          </p>
        </div>
      </section>
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
