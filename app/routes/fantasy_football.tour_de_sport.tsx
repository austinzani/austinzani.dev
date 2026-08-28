import { json } from "@remix-run/node";
import type { HeadersFunction, MetaFunction } from "@remix-run/node";
import {
  Link,
  useLoaderData,
  useSearchParams,
} from "@remix-run/react";
import type { ShouldRevalidateFunction } from "@remix-run/react";

import ManagerAvatar from "~/components/ManagerAvatar";
import ScrollablePills from "~/components/ScrollablePills";
import {
  FantasyMain,
  FantasySectionHeading,
  FantasyStatCard,
} from "~/components/FantasyFootballUI";
import { capitalizeFirstLetter } from "~/utils/helpers";
import { createSupabaseServerClient } from "~/utils/supabase.server";
import {
  formatPoints,
  formatRelativeTime,
  isStaleFetchedAt,
  rankScoreboardRows,
} from "~/utils/tour_de_sport/scoreboard";
import type {
  ScoreboardRow,
  ScoreboardSportEntry,
} from "~/utils/tour_de_sport/scoreboard";
import { sportScoringShortLabel } from "~/utils/tour_de_sport/scoring-copy";
import { TIER_RULE_SENTENCE } from "~/utils/tour_de_sport/tiers";
import type { LockedInputs, SportTiers } from "~/utils/tour_de_sport/tiers";

// Public landing page: cache at the edge, serve stale while revalidating.
const CACHE_CONTROL = "public, s-maxage=300, stale-while-revalidate=3600";

export const meta: MetaFunction = () => [
  { title: "Tour de Sport | Fantasy Football" },
];

export const headers: HeadersFunction = ({ loaderHeaders }) => ({
  "Cache-Control": loaderHeaders.get("Cache-Control") ?? CACHE_CONTROL,
});

// The sport tabs live in ?sport=<key>, which the loader ignores — a pill
// click is a same-pathname navigation that needs no refetch. Real path
// changes revalidate as usual.
export const shouldRevalidate: ShouldRevalidateFunction = ({
  currentUrl,
  nextUrl,
  defaultShouldRevalidate,
}) => {
  if (currentUrl.pathname === nextUrl.pathname) return false;
  return defaultShouldRevalidate;
};

type TourDeSportSeason = {
  id: number;
  name: string;
  year: number;
  cutoff_date: string;
  rng_seed: string | null;
  locked_at: string | null;
  locked_inputs: LockedInputs | null;
};

type TourDeSportSport = {
  id: number;
  sport_key: string;
  name: string;
  sport_index: number;
  metric_mode: "live" | "final_prior";
  tiers: SportTiers | null;
  revealed_at: string | null;
};

type TourDeSportParticipant = {
  id: number;
  display_name: string;
  manager_id: number | null;
};

type TourDeSportAssignment = {
  sport_id: number;
  participant_id: number;
  entity_id: number;
  tier_index: number | null;
  tier_slot: number | null;
};

const emptyState = {
  season: null as TourDeSportSeason | null,
  sports: [] as TourDeSportSport[],
  participants: [] as TourDeSportParticipant[],
  assignments: [] as TourDeSportAssignment[],
  scoreboard: [] as ScoreboardRow[],
  // Loader clock for SSR-stable staleness/relative-time rendering.
  now: 0,
};

export const loader = async () => {
  // The tds_ tables ship in their own migration and may not exist in every
  // environment yet — this public page degrades to its explainer instead of
  // ever throwing over missing data.
  try {
    const supabase = createSupabaseServerClient();

    const { data: season, error: seasonError } = await supabase
      .from("tds_seasons")
      .select("id, name, year, cutoff_date, rng_seed, locked_at, locked_inputs")
      .eq("year", 2027)
      .maybeSingle();

    if (seasonError || !season) {
      return json(emptyState, { headers: { "Cache-Control": CACHE_CONTROL } });
    }

    const [sportsResult, participantsResult, scoreboardResult] =
      await Promise.all([
        supabase
          .from("tds_sports")
          .select("id, sport_key, name, sport_index, metric_mode, tiers, revealed_at")
          .eq("season_id", season.id)
          .order("sport_index", { ascending: true }),
        supabase
          .from("tds_participants")
          .select("id, display_name, manager_id")
          .eq("season_id", season.id)
          .order("display_name", { ascending: true }),
        // Anon RPC: totals over counted sports only, per-sport breakdown as
        // jsonb. RLS keeps unrevealed sports' points null.
        supabase.rpc("tds_scoreboard", { p_season_year: season.year }),
      ]);

    const sports = sportsResult.data ?? [];
    const participants = participantsResult.data ?? [];
    const scoreboard = (scoreboardResult.data ?? []).map((row) => ({
      ...row,
      // The jsonb column comes back as generic Json; narrow it to the shape
      // the RPC documents.
      sports: row.sports as unknown as ScoreboardSportEntry[],
    })) as ScoreboardRow[];

    // Assignment reads are reveal-gated by RLS, so anonymous traffic sees
    // zero rows until the Draw reveals a sport — the board fills in sport by
    // sport as reveals happen, and the "coming at the draft party" state
    // shows while it is empty.
    let assignments: TourDeSportAssignment[] = [];
    if (sports.length > 0) {
      const { data: assignmentRows } = await supabase
        .from("tds_assignments")
        .select("sport_id, participant_id, entity_id, tier_index, tier_slot")
        .in(
          "sport_id",
          sports.map((sport) => sport.id)
        )
        .order("tier_slot", { ascending: true });
      assignments = assignmentRows ?? [];
    }

    return json(
      {
        // The jsonb columns (locked_inputs, tiers) come back as generic Json;
        // narrow them to the shapes Season Lock writes.
        season: season as unknown as TourDeSportSeason,
        sports: sports as unknown as TourDeSportSport[],
        participants: participants as TourDeSportParticipant[],
        assignments,
        scoreboard,
        now: Date.now(),
      },
      { headers: { "Cache-Control": CACHE_CONTROL } }
    );
  } catch {
    return json(emptyState, { headers: { "Cache-Control": CACHE_CONTROL } });
  }
};

const MONTH_NAMES = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

function formatCutoffDate(value: string | null | undefined) {
  if (!value) return "Aug 7, 2027";
  const [year, month, day] = value.split("-").map(Number);
  if (!year || !month || !day || !MONTH_NAMES[month - 1]) return value;
  return `${MONTH_NAMES[month - 1]} ${day}, ${year}`;
}

function formatLockTimestamp(value: string) {
  // Fixed UTC rendering: identical on server and client, no locale drift.
  return `${new Date(value).toISOString().replace("T", " ").slice(0, 16)} UTC`;
}

const howItWorksParagraphs = [
  "Everyone gets one Entity in each of the twelve Sports, dealt by a live Draw at the draft party. Strength Tiers keep the portfolios fair, a published seed proves nobody rigged it, and a revealed Sport is final.",
  "Scoring is simple. Each Sport ranks the fourteen Entities by their real-world results: 14 points for first down to 1 for last, ties split the difference. Add up all twelve Sports and the biggest total wins the year.",
];

const detailsSummaryClass =
  "cursor-pointer select-none font-mono text-[11px] font-semibold uppercase tracking-[0.06em] text-accent";

/**
 * The provenance record, rendered only after Season Lock: the published seed,
 * the frozen inputs, and a methodology precise enough to reproduce every
 * assignment offline.
 */
function DrawRecordSection({
  season,
  sports,
}: {
  season: TourDeSportSeason;
  sports: TourDeSportSport[];
}) {
  if (!season.locked_at || !season.rng_seed) return null;

  const seed = season.rng_seed;
  const tiered = sports.filter((sport) => (sport.tiers?.length ?? 0) > 0);
  const untiered = sports.filter((sport) => (sport.tiers?.length ?? 0) === 0);
  const participants = season.locked_inputs?.participants ?? [];
  const tierRule = season.locked_inputs?.tier_rule ?? TIER_RULE_SENTENCE;
  const participantCount = participants.length;

  const methodologySteps = [
    {
      title: "The frozen inputs",
      body: `Season Lock froze three things, all published on this page: the seed above, the participant order below, and each Sport's tier table. Every assignment is a pure function of those inputs — nothing else feeds the Draw, and nothing can shift after lock.`,
    },
    {
      title: "The random numbers",
      body: `Every random choice comes from a deterministic stream: a text string is hashed (xmur3) into the 32-bit state of a mulberry32 generator, and lists are shuffled with an unbiased Fisher–Yates using rejection-sampled bounded draws. The same string produces the same sequence on any machine.`,
    },
    {
      title: "The participant order",
      body: `The frozen participant list is shuffled once, using the stream seeded by the string "${seed}|participants". Everyone has equal odds of any position, and this one global order is shared by every Sport.`,
    },
    {
      title: "Each Sport's pick slots",
      body: `For a Sport with key K, one stream seeded by the string "${seed}|sport|K" shuffles the entities inside each tier — consumed tier by tier, strongest tier first, from that single continuing stream — and the shuffled tiers are concatenated into pick slots numbered from 0 (strongest). Slots past the participant count are never assigned. Which entity of a tier lands where is pure seeded luck: luck lives inside tiers.`,
    },
    {
      title: "The serpentine deal",
      body: `Sports are paired by their frozen index — (0, 1), (2, 3), and so on — with pair number k = floor(index ÷ 2). In a pair's first Sport the participant at global position g takes slot (g + k) mod ${participantCount}; in the second, the mirror slot ${participantCount} − 1 − ((g + k) mod ${participantCount}). Each pair hands every participant two slots summing to exactly ${participantCount} − 1 — one high, one low — and successive pairs rotate the start by one, so portfolios balance by construction. Only the frozen index matters, never the order sports are drawn in.`,
    },
    {
      title: "The tiers",
      body: `${tierRule} Within a tier, the published order is the frozen standings order — feed each tier to the shuffle exactly as printed below.`,
    },
  ];

  return (
    <section className="mb-9">
      <FantasySectionHeading>The Draw Record</FantasySectionHeading>
      <div className="mb-3 rounded-md border border-line-muted bg-paper-muted p-4 dark:bg-zinc-900">
        <div className="mb-1.5 font-mono text-[11px] font-semibold uppercase tracking-[0.06em] text-accent">
          Season locked {formatLockTimestamp(season.locked_at)}
        </div>
        <p className="mb-2 max-w-[640px] text-[15px] leading-[1.7] text-ink">
          The Draw's inputs are frozen and published here. Re-run the
          methodology below from the seed and you must land on the exact
          assignments. If you don't, shout.
        </p>
        <div className="mb-1 font-mono text-[11px] font-semibold uppercase tracking-[0.06em] text-zinc-500 dark:text-zinc-400">
          Published RNG seed
        </div>
        <code className="block break-all font-mono text-sm text-ink dark:text-zinc-50">
          {seed}
        </code>
      </div>

      <details className="mb-3 rounded-md border border-line-muted p-4">
        <summary className={detailsSummaryClass}>
          The methodology — reproduce it yourself
        </summary>
        <div className="mt-3 space-y-3">
          {methodologySteps.map((step, index) => (
            <p
              key={step.title}
              className="max-w-[640px] text-[15px] leading-[1.7] text-ink"
            >
              <span className="font-mono text-xs font-semibold text-accent">
                {index + 1}.{" "}
              </span>
              <span className="font-semibold">{step.title}. </span>
              {step.body}
            </p>
          ))}
        </div>
      </details>

      {participants.length > 0 ? (
        <details className="mb-3 rounded-md border border-line-muted p-4">
          <summary className={detailsSummaryClass}>
            Frozen participant order
          </summary>
          <p className="mt-3 max-w-[640px] text-[15px] leading-[1.7] text-ink">
            {participants
              .map(
                (participant, index) =>
                  `${index + 1}. ${capitalizeFirstLetter(participant.display_name)}`
              )
              .join(" · ")}
          </p>
          <p className="mt-2 max-w-[640px] text-xs leading-[1.5] text-ink-muted dark:text-zinc-400">
            This pre-shuffle order (participant id ascending at lock time) is
            the list the seeded shuffle consumes — reproduction depends on it.
          </p>
        </details>
      ) : null}

      {tiered.map((sport) => (
        <details
          key={sport.id}
          className="mb-3 rounded-md border border-line-muted p-4"
        >
          <summary className={detailsSummaryClass}>
            {sport.name} tiers — {sport.tiers?.length ?? 0} tiers,{" "}
            {sport.tiers?.reduce((sum, tier) => sum + tier.length, 0) ?? 0}{" "}
            entities
          </summary>
          <div className="mt-3 space-y-2">
            {(sport.tiers ?? []).map((tier, tierIndex) => (
              <p
                key={tierIndex}
                className="text-[15px] leading-[1.7] text-ink"
              >
                <span className="font-mono text-xs font-semibold text-accent">
                  Tier {tierIndex + 1}:{" "}
                </span>
                {tier.map((entity) => entity.name).join(", ")}
              </p>
            ))}
          </div>
        </details>
      ))}

      {untiered.length > 0 ? (
        <p className="max-w-[640px] text-xs leading-[1.5] text-ink-muted dark:text-zinc-400">
          Locked without usable standings (empty tier table, not drawable):{" "}
          {untiered.map((sport) => sport.name).join(", ")}.
        </p>
      ) : null}
    </section>
  );
}

/**
 * One tabbed section for all per-sport content — a scrollable pill per sport
 * (the year-selector idiom) with the selected sport's panel below: metric
 * mode, a link to its full board, and its assignments once revealed (RLS only
 * returns assignment rows once revealed_at is stamped). Selection lives in
 * ?sport=<key> so the panel is SSR-rendered and deep-linkable, and the edge
 * cache varies per sport through the query string.
 */
function SportsTabsSection({
  season,
  sports,
  participants,
  assignments,
}: {
  season: TourDeSportSeason;
  sports: TourDeSportSport[];
  participants: TourDeSportParticipant[];
  assignments: TourDeSportAssignment[];
}) {
  const [searchParams, setSearchParams] = useSearchParams();
  const participantNameById = new Map(
    participants.map((participant) => [participant.id, participant.display_name])
  );
  const revealedCount = sports.filter(
    (sport) => sport.revealed_at !== null
  ).length;
  const sportParam = searchParams.get("sport");
  const selectedSport =
    sports.find((sport) => sport.sport_key === sportParam) ??
    sports.find((sport) => sport.revealed_at !== null) ??
    sports[0];
  if (!selectedSport) return null;

  const selectSport = (key: string) => {
    const nextParams = new URLSearchParams(searchParams);
    nextParams.set("sport", key);
    // Client navigation; shouldRevalidate skips the refetch and
    // preventScrollReset keeps the page from jumping to the top.
    setSearchParams(nextParams, { preventScrollReset: true });
  };

  const sportAssignments = assignments.filter(
    (assignment) => assignment.sport_id === selectedSport.id
  );
  const entityNameById = new Map(
    (selectedSport.tiers ?? []).flat().map((entity) => [entity.id, entity.name])
  );

  return (
    <section className="mb-9">
      <FantasySectionHeading>The Sports</FantasySectionHeading>
      <p className="mb-4 max-w-[640px] text-[15px] leading-[1.7] text-ink-muted">
        {revealedCount} of {sports.length} Sports revealed. Pick a Sport for
        its assignments — the rest stay hidden until their turn at the Draw.
      </p>
      <ScrollablePills
        items={sports.map((sport) => ({
          key: sport.sport_key,
          value: sport.sport_key.toUpperCase(),
        }))}
        selectedKey={selectedSport.sport_key}
        onSelectionChange={selectSport}
      />
      <div className="rounded-md border border-line-muted bg-paper-muted p-4 dark:bg-zinc-900">
        <div className="mb-3 border-b-[1.5px] border-line pb-2.5 dark:border-zinc-500">
          <div className="flex items-baseline justify-between gap-3">
            <span className="flex min-w-0 items-baseline gap-2">
              <span className="font-mono text-xs font-semibold text-accent">
                {String(selectedSport.sport_index + 1).padStart(2, "0")}
              </span>
              <span className="min-w-0 truncate font-display text-lg leading-tight text-ink dark:text-zinc-50">
                {selectedSport.name}
              </span>
            </span>
            <Link
              to={`/fantasy_football/tour_de_sport/${selectedSport.sport_key}`}
              prefetch="intent"
              className="shrink-0 font-mono text-[11px] font-semibold uppercase tracking-[0.06em] text-accent transition hover:text-ink dark:hover:text-zinc-50"
            >
              View full board →
            </Link>
          </div>
          <div className="mt-1 text-xs text-ink-muted dark:text-zinc-400">
            {sportScoringShortLabel(
              selectedSport.sport_key,
              season.year,
              season.cutoff_date,
              selectedSport.metric_mode
            )}
          </div>
        </div>
        {sportAssignments.length > 0 ? (
          <ul className="grid grid-cols-1 gap-x-8 gap-y-1.5 md:grid-cols-2">
            {sportAssignments.map((assignment) => (
              <li
                key={`${assignment.sport_id}-${assignment.participant_id}`}
                className="flex items-baseline justify-between gap-3 text-sm"
              >
                <span className="min-w-0 truncate font-semibold text-ink dark:text-zinc-50">
                  {capitalizeFirstLetter(
                    participantNameById.get(assignment.participant_id) ??
                      `Participant ${assignment.participant_id}`
                  )}
                </span>
                <span className="flex shrink-0 items-baseline gap-2">
                  <span className="text-ink-muted dark:text-zinc-400">
                    {entityNameById.get(assignment.entity_id) ??
                      `Entity ${assignment.entity_id}`}
                  </span>
                  {assignment.tier_index !== null ? (
                    <span className="rounded border border-line-muted px-1 py-0.5 font-mono text-[10px] font-semibold uppercase tracking-[0.06em] text-ink-muted dark:text-zinc-400">
                      T{assignment.tier_index + 1}
                    </span>
                  ) : null}
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm leading-[1.6] text-ink-muted dark:text-zinc-400">
            {selectedSport.revealed_at === null
              ? "Hidden until its turn at the Draw."
              : "Revealed — assignments land here shortly."}
          </p>
        )}
      </div>
    </section>
  );
}

/**
 * The season standings — rendered only once at least one Sport actually
 * counts toward totals. Every row expands (native details, so the breakdown
 * is server-rendered) into per-sport chips linking to the detail pages.
 */
function ScoreboardSection({
  scoreboard,
  now,
}: {
  scoreboard: ScoreboardRow[];
  now: number;
}) {
  const ranked = rankScoreboardRows(scoreboard);
  const sportEntries = scoreboard[0]?.sports ?? [];
  const countedEntries = sportEntries.filter((sport) => sport.counted);
  const fetchedTimes = countedEntries
    .map((sport) => sport.fetched_at)
    .filter((value): value is string => Boolean(value))
    .sort();
  const newestFetchedAt =
    fetchedTimes.length > 0 ? fetchedTimes[fetchedTimes.length - 1] : null;
  const anyStale = sportEntries.some(
    (sport) => sport.revealed && isStaleFetchedAt(sport.fetched_at, now)
  );
  // Any participant with a manually overridden score anywhere — the chips
  // flag the cell, the legend explains the tag.
  const anyOverridden = ranked.some((row) =>
    row.sports.some((sport) => sport.overridden === true)
  );

  return (
    <section className="mb-9">
      <FantasySectionHeading>Scoreboard</FantasySectionHeading>
      <p className="mb-4 max-w-[640px] text-[15px] leading-[1.7] text-ink-muted">
        Totals across every Sport that counts so far. Expand a row for the
        breakdown.
      </p>
      <div className="space-y-2">
        {ranked.map((row) => (
          <details
            key={row.participant_id}
            className="rounded-md border border-line-muted bg-paper-muted dark:bg-zinc-900"
          >
            <summary className="flex cursor-pointer select-none list-none items-center gap-3 p-3 [&::-webkit-details-marker]:hidden">
              <span className="w-8 shrink-0 text-right font-mono text-sm font-semibold text-accent">
                {row.tied ? `T${row.rank}` : row.rank}
              </span>
              <ManagerAvatar
                id={row.manager_id ?? row.display_name}
                name={row.display_name}
                className="h-9 w-9 text-xs"
              />
              <span className="min-w-0 flex-1 truncate text-sm font-semibold text-ink dark:text-zinc-50">
                {capitalizeFirstLetter(row.display_name)}
              </span>
              <span className="font-display text-2xl leading-none text-ink dark:text-zinc-50">
                {formatPoints(row.total_points)}
              </span>
              <span className="font-mono text-[10px] font-semibold uppercase tracking-[0.06em] text-ink-muted dark:text-zinc-400">
                pts
              </span>
            </summary>
            <div className="grid grid-cols-2 gap-2 border-t border-dashed border-line-muted p-3 sm:grid-cols-3 lg:grid-cols-4">
              {row.sports.map((sport) => {
                const stale =
                  sport.revealed && isStaleFetchedAt(sport.fetched_at, now);
                return (
                  <Link
                    key={sport.sport_key}
                    to={`/fantasy_football/tour_de_sport/${sport.sport_key}`}
                    prefetch="intent"
                    className="flex items-center justify-between gap-2 rounded border border-line-muted bg-paper px-2.5 py-1.5 transition hover:border-accent dark:bg-zinc-950"
                  >
                    <span className="flex min-w-0 items-center gap-1.5">
                      {stale ? (
                        <span
                          title="Data older than 48 hours"
                          className="h-1.5 w-1.5 shrink-0 rounded-full bg-amber-500"
                        />
                      ) : null}
                      <span className="min-w-0 truncate font-mono text-[11px] font-semibold uppercase tracking-[0.04em] text-ink-muted dark:text-zinc-400">
                        {sport.name}
                      </span>
                    </span>
                    {sport.counted ? (
                      <span className="flex shrink-0 items-center gap-1.5">
                        {sport.overridden ? (
                          <span
                            title="Manually overridden score"
                            className="rounded border border-amber-500 px-1 py-0.5 font-mono text-[9px] font-semibold uppercase tracking-[0.06em] text-amber-600 dark:text-amber-400"
                          >
                            OVR
                          </span>
                        ) : null}
                        <span className="font-mono text-sm font-semibold text-ink dark:text-zinc-50">
                          {formatPoints(sport.points)}
                        </span>
                      </span>
                    ) : (
                      <span className="flex shrink-0 items-center gap-1.5">
                        {sport.overridden ? (
                          <span
                            title="Manually overridden score"
                            className="rounded border border-amber-500 px-1 py-0.5 font-mono text-[9px] font-semibold uppercase tracking-[0.06em] text-amber-600 dark:text-amber-400"
                          >
                            OVR
                          </span>
                        ) : null}
                        {sport.points !== null ? (
                          <span className="font-mono text-xs text-ink-muted dark:text-zinc-400">
                            {formatPoints(sport.points)}
                          </span>
                        ) : null}
                        <span className="rounded border border-line-muted px-1 py-0.5 font-mono text-[9px] font-semibold uppercase tracking-[0.06em] text-ink-muted dark:text-zinc-400">
                          Not yet counted
                        </span>
                      </span>
                    )}
                  </Link>
                );
              })}
            </div>
          </details>
        ))}
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-ink-muted dark:text-zinc-400">
        <span>
          {countedEntries.length} of {sportEntries.length} Sports counting
          toward totals.
        </span>
        {newestFetchedAt ? (
          <span>Last updated {formatRelativeTime(newestFetchedAt, now)}.</span>
        ) : null}
        {anyStale ? (
          <span className="inline-flex items-center gap-1.5">
            <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
            Amber marks a Sport whose data is older than 48 hours.
          </span>
        ) : null}
        {anyOverridden ? (
          <span>
            OVR marks a manually overridden score — the reason is on the
            Sport's board.
          </span>
        ) : null}
      </div>
    </section>
  );
}

export default function TourDeSport() {
  const { season, sports, participants, assignments, scoreboard, now } =
    useLoaderData<typeof loader>();
  const cutoffLabel = formatCutoffDate(season?.cutoff_date);
  // The scoreboard leads the page once any sport is actually counting; until
  // then the landing stays the explainer it has always been.
  const hasCountedSport = scoreboard.some((row) =>
    row.sports.some((sport) => sport.counted)
  );

  return (
    <FantasyMain>
      {hasCountedSport ? (
        <ScoreboardSection scoreboard={scoreboard} now={now} />
      ) : null}

      <div className="mb-9 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <FantasyStatCard
          label="Participants"
          value={participants.length > 0 ? participants.length : "—"}
          subtitle="The active managers"
        />
        <FantasyStatCard
          label="Sports"
          value={sports.length > 0 ? sports.length : "—"}
          subtitle="One Entity apiece"
        />
        <FantasyStatCard
          label="Scoring"
          value="14 → 1"
          subtitle="First to last, every Sport"
        />
        <FantasyStatCard
          label="Cutoff Date"
          value={cutoffLabel}
          subtitle="Live vs. completed season"
        />
      </div>

      <section className="mb-9">
        <FantasySectionHeading>How It Works</FantasySectionHeading>
        <div className="max-w-[640px] space-y-3 text-[15px] leading-[1.7] text-ink">
          {howItWorksParagraphs.map((paragraph) => (
            <p key={paragraph}>{paragraph}</p>
          ))}
        </div>
      </section>

      {season ? <DrawRecordSection season={season} sports={sports} /> : null}

      {assignments.length === 0 ? (
        <section className="mb-9">
          <FantasySectionHeading>Assignments</FantasySectionHeading>
          <div className="rounded-md border border-dashed border-accent p-5">
            <div className="mb-1.5 font-mono text-[11px] font-semibold uppercase tracking-[0.06em] text-accent">
              Coming at the draft party
            </div>
            <p className="max-w-[640px] text-[15px] leading-[1.7] text-ink">
              The board fills in live at the draft party. No assignment shows
              until the Draw reveals its Sport, and a revealed Sport is final.
            </p>
          </div>
        </section>
      ) : null}

      {season && sports.length > 0 ? (
        <SportsTabsSection
          season={season}
          sports={sports}
          participants={participants}
          assignments={assignments}
        />
      ) : null}

      <section>
        <FantasySectionHeading>The Participants</FantasySectionHeading>
        {participants.length > 0 ? (
          <>
            <p className="mb-4 max-w-[640px] text-[15px] leading-[1.7] text-ink-muted">
              Season 1 is the league's fourteen active managers. Same names,
              same faces, a whole new way to lose.
            </p>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
              {participants.map((participant) => (
                <div
                  key={participant.id}
                  className="flex items-center gap-3 rounded-md border border-line-muted bg-paper-muted p-3 dark:bg-zinc-900"
                >
                  <ManagerAvatar
                    id={participant.manager_id ?? participant.display_name}
                    name={participant.display_name}
                    className="h-9 w-9 text-xs"
                  />
                  <div className="min-w-0 truncate text-sm font-semibold text-ink dark:text-zinc-50">
                    {capitalizeFirstLetter(participant.display_name)}
                  </div>
                </div>
              ))}
            </div>
          </>
        ) : (
          <p className="text-[15px] leading-[1.7] text-ink-muted">
            Season 1's Participants — the league's active managers — will
            appear here once the season is set up.
          </p>
        )}
      </section>
    </FantasyMain>
  );
}
