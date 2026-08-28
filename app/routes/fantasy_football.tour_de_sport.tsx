import { json } from "@remix-run/node";
import type { HeadersFunction, MetaFunction } from "@remix-run/node";
import { useLoaderData } from "@remix-run/react";

import ManagerAvatar from "~/components/ManagerAvatar";
import {
  FantasyMain,
  FantasySectionHeading,
  FantasyStatCard,
} from "~/components/FantasyFootballUI";
import { capitalizeFirstLetter } from "~/utils/helpers";
import { createSupabaseServerClient } from "~/utils/supabase.server";
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

    const [sportsResult, participantsResult] = await Promise.all([
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
    ]);

    const sports = sportsResult.data ?? [];
    const participants = participantsResult.data ?? [];

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

const metricModeLabel: Record<TourDeSportSport["metric_mode"], string> = {
  live: "Live standings through the cutoff",
  final_prior: "Most recent completed season",
};

const howItWorksBlocks = [
  {
    index: "01",
    title: "The Draw",
    body: "Assignments happen live at the 2027 draft party. The commissioner runs the Draw one Sport at a time from a projected screen — every Participant has equal odds, and each Sport's assignments go public the moment they hit the screen. Not a second before.",
  },
  {
    index: "02",
    title: "Tiers",
    body: "Before anything is drawable, each Sport's entities are banded into strength Tiers built from real-world standings. The Draw mixes Tiers so every portfolio lands at roughly equal expected strength. Luck lives inside a Tier — you might pull its best Entity or its worst.",
  },
  {
    index: "03",
    title: "Verifiably Fair",
    body: "Season Lock freezes the Tiers and the RNG seed before the party, and the seed is published after the reveal. Anyone can re-run the Draw from the frozen inputs and get identical assignments. Rigging it isn't hard to catch — it's impossible to hide.",
  },
  {
    index: "04",
    title: "Scoring",
    body: "Every Sport pays out the same 105-point pool, first place to last, ties averaging their ranks. Your total is your twelve entities' real-world results — nothing else. The Cutoff Date decides whether a Sport counts live standings or its most recent completed season.",
  },
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
          assignments — if you don't, shout.
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
 * The board filling in as sports reveal: for every revealed sport (RLS only
 * returns assignment rows once revealed_at is stamped), the participant →
 * entity pairs in pick-slot order. Names come from the frozen inputs — the
 * public record matches what Season Lock published. The full scoreboard is a
 * later chapter (AUS-849); this is just the assignments.
 */
function RevealedAssignmentsSection({
  sports,
  participants,
  assignments,
}: {
  sports: TourDeSportSport[];
  participants: TourDeSportParticipant[];
  assignments: TourDeSportAssignment[];
}) {
  const participantNameById = new Map(
    participants.map((participant) => [participant.id, participant.display_name])
  );
  const revealedSports = sports.filter((sport) =>
    assignments.some((assignment) => assignment.sport_id === sport.id)
  );

  return (
    <section className="mb-9">
      <FantasySectionHeading>Assignments</FantasySectionHeading>
      <p className="mb-4 max-w-[640px] text-[15px] leading-[1.7] text-ink-muted">
        {revealedSports.length} of {sports.length} Sports revealed. Each
        Sport's assignments appear here the moment the Draw reveals it — the
        rest stay hidden until their turn.
      </p>
      <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
        {revealedSports.map((sport) => {
          const entityNameById = new Map(
            (sport.tiers ?? [])
              .flat()
              .map((entity) => [entity.id, entity.name])
          );
          return (
            <div
              key={sport.id}
              className="rounded-md border border-line-muted bg-paper-muted p-4 dark:bg-zinc-900"
            >
              <div className="mb-3 flex items-baseline gap-2 border-b-[1.5px] border-line pb-2 dark:border-zinc-500">
                <span className="font-mono text-xs font-semibold text-accent">
                  {String(sport.sport_index + 1).padStart(2, "0")}
                </span>
                <span className="font-display text-lg leading-tight text-ink dark:text-zinc-50">
                  {sport.name}
                </span>
              </div>
              <ul className="space-y-1.5">
                {assignments
                  .filter((assignment) => assignment.sport_id === sport.id)
                  .map((assignment) => (
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
            </div>
          );
        })}
      </div>
    </section>
  );
}

export default function TourDeSport() {
  const { season, sports, participants, assignments } =
    useLoaderData<typeof loader>();
  const cutoffLabel = formatCutoffDate(season?.cutoff_date);

  return (
    <FantasyMain>
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
          label="Point Pool Per Sport"
          value={105}
          subtitle="First to last, ties averaged"
        />
        <FantasyStatCard
          label="Cutoff Date"
          value={cutoffLabel}
          subtitle="Live vs. completed season"
        />
      </div>

      <section className="mb-9">
        <FantasySectionHeading>How It Works</FantasySectionHeading>
        <div className="grid grid-cols-1 gap-7 md:grid-cols-2">
          {howItWorksBlocks.map((block) => (
            <div key={block.index}>
              <div className="mb-2 flex items-baseline gap-2 border-b-[1.5px] border-line pb-2 dark:border-zinc-500">
                <span className="font-mono text-xs font-semibold text-accent">
                  {block.index}
                </span>
                <span className="font-mono text-xs font-semibold uppercase tracking-[0.06em] text-zinc-500 dark:text-zinc-400">
                  {block.title}
                </span>
              </div>
              <p className="text-[15px] leading-[1.7] text-ink">{block.body}</p>
            </div>
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
              The board is empty on purpose. Nothing is drawable until Season
              Lock, and no assignment shows here until the Draw reveals its
              Sport — live, in front of the league. Once a Sport is revealed,
              its assignments are public and final.
            </p>
          </div>
        </section>
      ) : (
        <RevealedAssignmentsSection
          sports={sports}
          participants={participants}
          assignments={assignments}
        />
      )}

      <section className="mb-9">
        <FantasySectionHeading>The Sports</FantasySectionHeading>
        {sports.length > 0 ? (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {sports.map((sport) => (
              <div
                key={sport.id}
                className="rounded-md border border-line-muted bg-paper-muted p-4 dark:bg-zinc-900"
              >
                <div className="mb-1.5 font-mono text-[11px] font-semibold text-accent">
                  {String(sport.sport_index + 1).padStart(2, "0")}
                </div>
                <div className="font-display text-lg leading-tight text-ink dark:text-zinc-50">
                  {sport.name}
                </div>
                <div className="mt-1.5 text-xs leading-[1.5] text-ink-muted dark:text-zinc-400">
                  {metricModeLabel[sport.metric_mode]}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-[15px] leading-[1.7] text-ink-muted">
            The Season 1 slate — twelve sports, one Entity per Participant in
            each — will be published here once the season is set up.
          </p>
        )}
      </section>

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
