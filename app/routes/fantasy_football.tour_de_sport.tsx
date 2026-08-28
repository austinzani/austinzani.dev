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
};

type TourDeSportSport = {
  id: number;
  name: string;
  sport_index: number;
  metric_mode: "live" | "final_prior";
};

type TourDeSportParticipant = {
  id: number;
  display_name: string;
  manager_id: number | null;
};

const emptyState = {
  season: null as TourDeSportSeason | null,
  sports: [] as TourDeSportSport[],
  participants: [] as TourDeSportParticipant[],
  assignmentCount: 0,
};

export const loader = async () => {
  // The tds_ tables ship in their own migration and may not exist in every
  // environment yet — this public page degrades to its explainer instead of
  // ever throwing over missing data.
  try {
    const supabase = createSupabaseServerClient();

    const { data: season, error: seasonError } = await supabase
      .from("tds_seasons")
      .select("id, name, year, cutoff_date")
      .eq("year", 2027)
      .maybeSingle();

    if (seasonError || !season) {
      return json(emptyState, { headers: { "Cache-Control": CACHE_CONTROL } });
    }

    const [sportsResult, participantsResult] = await Promise.all([
      supabase
        .from("tds_sports")
        .select("id, name, sport_index, metric_mode")
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
    // zero until the Draw reveals a sport — the "coming at the draft party"
    // state keys off this count.
    let assignmentCount = 0;
    if (sports.length > 0) {
      const { count } = await supabase
        .from("tds_assignments")
        .select("id", { count: "exact", head: true })
        .in(
          "sport_id",
          sports.map((sport) => sport.id)
        );
      assignmentCount = count ?? 0;
    }

    return json(
      { season, sports, participants, assignmentCount },
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

export default function TourDeSport() {
  const { season, sports, participants, assignmentCount } =
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

      {assignmentCount === 0 ? (
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
      ) : null}

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
