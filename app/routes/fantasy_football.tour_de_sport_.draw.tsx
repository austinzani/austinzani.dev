import { json } from "@remix-run/node";
import type {
  ActionFunctionArgs,
  HeadersFunction,
  LoaderFunctionArgs,
  MetaFunction,
} from "@remix-run/node";
import {
  Form,
  useActionData,
  useFetcher,
  useLoaderData,
  useNavigation,
} from "@remix-run/react";
import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useMemo, useRef, useState } from "react";

import {
  FantasyMain,
  FantasyPanel,
  FantasySectionHeading,
} from "~/components/FantasyFootballUI";
import { capitalizeFirstLetter } from "~/utils/helpers";
import { requireFantasyMember } from "~/utils/fantasy-auth.server";
import {
  drawSportForSeason,
  type DrawSportResult,
} from "~/utils/tour_de_sport/draw-sport.server";
import { lockSeason } from "~/utils/tour_de_sport/season-lock.server";
import type { LockedInputs, SportTiers } from "~/utils/tour_de_sport/tiers";

// Commissioner console: never cached, anywhere.
const CACHE_CONTROL = "no-store";

export const meta: MetaFunction = () => [
  { title: "Draw Console | Tour de Sport" },
];

export const headers: HeadersFunction = () => ({
  "Cache-Control": CACHE_CONTROL,
});

type ConsoleSeason = {
  id: number;
  name: string;
  year: number;
  rng_seed: string | null;
  locked_at: string | null;
  locked_inputs: LockedInputs | null;
};

type ConsoleSport = {
  id: number;
  sport_key: string;
  name: string;
  sport_index: number;
  tiers: SportTiers | null;
  revealed_at: string | null;
};

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const member = await requireFantasyMember(request, ["commissioner"]);
  member.headers.set("Cache-Control", CACHE_CONTROL);

  const { data: season } = await member.supabase
    .from("tds_seasons")
    .select("id, name, year, rng_seed, locked_at, locked_inputs")
    .eq("year", 2027)
    .maybeSingle();

  let sports: ConsoleSport[] = [];
  let drawnSportIds: number[] = [];
  if (season) {
    const { data } = await member.supabase
      .from("tds_sports")
      .select("id, sport_key, name, sport_index, tiers, revealed_at")
      .eq("season_id", season.id)
      .order("sport_index", { ascending: true });
    sports = data ?? [];

    // Saved assignments are the truth for "drawn" (revealed_at is stamped a
    // beat later; the draw action heals a gap between the two).
    if (sports.length > 0) {
      const { data: assignmentRows } = await member.supabase
        .from("tds_assignments")
        .select("sport_id")
        .in(
          "sport_id",
          sports.map((sport: ConsoleSport) => sport.id)
        );
      drawnSportIds = [
        ...new Set(
          ((assignmentRows ?? []) as Array<{ sport_id: number }>).map(
            (row) => row.sport_id
          )
        ),
      ];
    }
  }

  return json(
    { season: (season ?? null) as ConsoleSeason | null, sports, drawnSportIds },
    { headers: member.headers }
  );
};

export const action = async ({ request }: ActionFunctionArgs) => {
  const member = await requireFantasyMember(request, ["commissioner"]);
  member.headers.set("Cache-Control", CACHE_CONTROL);

  const formData = await request.formData();
  const intent = String(formData.get("intent") ?? "");

  if (intent === "lock_season") {
    const result = await lockSeason(member.supabase);
    return json(
      { result },
      { headers: member.headers, status: result.ok ? 200 : 400 }
    );
  }

  if (intent === "draw_sport") {
    const sportId = Number(formData.get("sport_id"));
    if (!Number.isInteger(sportId) || sportId <= 0) {
      return json(
        { result: { ok: false as const, error: "Missing sport." } },
        { headers: member.headers, status: 400 }
      );
    }
    // Persists (or re-reads) BEFORE returning: the client only ever animates
    // rows that are already saved. Double-submits and re-clicks land on the
    // saved result — never a re-roll.
    const result = await drawSportForSeason(member.supabase, sportId);
    return json(
      { result },
      { headers: member.headers, status: result.ok ? 200 : 400 }
    );
  }

  return json(
    { result: { ok: false as const, error: "Unsupported action." } },
    { headers: member.headers, status: 400 }
  );
};

function formatUtc(value: string) {
  return `${new Date(value).toISOString().replace("T", " ").slice(0, 16)} UTC`;
}

type RevealResult = Extract<DrawSportResult, { ok: true }>;

/**
 * The projected-screen reveal: a dark theater overlay that plays an
 * anticipation beat, then lands assignments one at a time — weakest pick slot
 * first, building to the sport's strongest entity. Always driven by SAVED
 * rows; "Reveal all" is the recovery valve for pacing.
 */
function DrawRevealOverlay({
  result,
  onClose,
}: {
  result: RevealResult;
  onClose: () => void;
}) {
  // Weakest slot revealed first; each new row enters at the top and pushes
  // earlier picks down, so the board ends in strongest-first order.
  const ordered = useMemo(
    () =>
      [...result.assignments].sort(
        (a, b) => (b.tier_slot ?? -1) - (a.tier_slot ?? -1)
      ),
    [result]
  );
  const [phase, setPhase] = useState<"suspense" | "reveal">("suspense");
  const [shown, setShown] = useState(0);
  const total = ordered.length;
  const done = phase === "reveal" && shown >= total;

  useEffect(() => {
    if (phase !== "suspense") return;
    const timer = setTimeout(() => setPhase("reveal"), 2600);
    return () => clearTimeout(timer);
  }, [phase]);

  useEffect(() => {
    if (phase !== "reveal" || shown >= total) return;
    const timer = setTimeout(
      () => setShown((count) => count + 1),
      shown === 0 ? 350 : 1400
    );
    return () => clearTimeout(timer);
  }, [phase, shown, total]);

  const revealAll = () => {
    setPhase("reveal");
    setShown(total);
  };

  return (
    <div className="fixed inset-0 z-[100] overflow-y-auto bg-zinc-950/[.97] px-4 py-8 sm:px-8">
      <div className="mx-auto flex min-h-full w-full max-w-3xl flex-col">
        <div className="mb-6 flex items-start justify-between gap-4">
          <div>
            <div className="font-mono text-[11px] font-semibold uppercase tracking-[0.06em] text-accent">
              The Draw{result.alreadyDrawn ? " — saved result" : ""}
            </div>
            <h2 className="font-display text-5xl leading-none text-zinc-50 sm:text-6xl">
              {result.sportName}
            </h2>
            {result.alreadyDrawn ? (
              <p className="mt-2 max-w-[480px] text-xs leading-[1.6] text-zinc-400">
                Re-displaying the assignments already saved on the server —
                nothing was re-rolled, nothing can change.
              </p>
            ) : null}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md border border-zinc-700 px-3 py-1.5 font-mono text-xs font-semibold uppercase tracking-[0.06em] text-zinc-300 transition-colors hover:border-zinc-400 hover:text-zinc-50"
          >
            Close
          </button>
        </div>

        {phase === "suspense" ? (
          <div className="flex flex-1 flex-col items-center justify-center py-24">
            <motion.div
              animate={{ opacity: [0.25, 1, 0.25] }}
              transition={{ duration: 1.3, repeat: Infinity, ease: "easeInOut" }}
              className="font-mono text-sm font-semibold uppercase tracking-[0.3em] text-accent"
            >
              Drawing
            </motion.div>
            <motion.div
              initial={{ scaleX: 0 }}
              animate={{ scaleX: 1 }}
              transition={{ duration: 2.4, ease: "easeInOut" }}
              className="mt-4 h-px w-48 origin-left bg-accent"
            />
            <p className="mt-6 max-w-[380px] text-center text-xs leading-[1.6] text-zinc-500">
              {total} assignments are saved on the server. Revealing weakest
              slot first.
            </p>
          </div>
        ) : (
          <div className="flex-1">
            <ul className="space-y-2">
              <AnimatePresence initial={false}>
                {ordered
                  .slice(0, shown)
                  .reverse()
                  .map((assignment) => (
                    <motion.li
                      key={assignment.id}
                      layout
                      initial={{ opacity: 0, y: -28, scale: 0.97 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      transition={{ type: "spring", stiffness: 320, damping: 28 }}
                      className="flex items-baseline justify-between gap-4 rounded-md border border-zinc-800 bg-zinc-900/80 px-4 py-3"
                    >
                      <span className="min-w-0 truncate font-display text-2xl leading-tight text-zinc-50 sm:text-3xl">
                        {capitalizeFirstLetter(assignment.participant_name)}
                      </span>
                      <span className="flex shrink-0 items-baseline gap-3 text-right">
                        <span className="text-base font-semibold text-accent sm:text-xl">
                          {assignment.entity_name}
                        </span>
                        {assignment.tier_index !== null ? (
                          <span className="rounded border border-zinc-700 px-1.5 py-0.5 font-mono text-[10px] font-semibold uppercase tracking-[0.06em] text-zinc-400">
                            Tier {assignment.tier_index + 1}
                          </span>
                        ) : null}
                      </span>
                    </motion.li>
                  ))}
              </AnimatePresence>
            </ul>
          </div>
        )}

        <div className="mt-8 flex items-center justify-between gap-4 border-t border-zinc-800 pt-4">
          <span className="font-mono text-xs font-semibold uppercase tracking-[0.06em] text-zinc-500">
            {done
              ? "Revealed — final."
              : `${phase === "reveal" ? shown : 0} / ${total} revealed`}
          </span>
          <div className="flex gap-3">
            {!done ? (
              <button
                type="button"
                onClick={revealAll}
                className="rounded-md border border-zinc-700 px-3 py-1.5 font-mono text-xs font-semibold uppercase tracking-[0.06em] text-zinc-300 transition-colors hover:border-zinc-400 hover:text-zinc-50"
              >
                Reveal all
              </button>
            ) : (
              <button
                type="button"
                onClick={onClose}
                className="rounded-md border border-accent px-3 py-1.5 font-mono text-xs font-semibold uppercase tracking-[0.06em] text-accent transition-colors hover:bg-accent hover:text-white"
              >
                Done
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * One sport's console card. Owns its own fetcher so draws never collide; a
 * successful draw (fresh or saved) hands the result up to open the reveal.
 */
function SportCard({
  sport,
  locked,
  drawn,
  onResult,
}: {
  sport: ConsoleSport;
  locked: boolean;
  drawn: boolean;
  onResult: (result: RevealResult) => void;
}) {
  const fetcher = useFetcher<typeof action>();
  const handled = useRef<unknown>(null);

  useEffect(() => {
    const data = fetcher.data;
    if (!data || fetcher.state !== "idle" || handled.current === data) return;
    handled.current = data;
    if (data.result.ok && "assignments" in data.result) {
      onResult(data.result as RevealResult);
    }
  }, [fetcher.data, fetcher.state, onResult]);

  const tierCount = sport.tiers?.length ?? 0;
  const drawable = locked && tierCount > 0;
  const busy = fetcher.state !== "idle";
  const error =
    fetcher.data && !fetcher.data.result.ok ? fetcher.data.result.error : null;

  const submitDraw = () =>
    fetcher.submit(
      { intent: "draw_sport", sport_id: String(sport.id) },
      { method: "post" }
    );

  return (
    <FantasyPanel>
      <div className="mb-1.5 flex items-baseline justify-between">
        <span className="font-mono text-[11px] font-semibold text-accent">
          {String(sport.sport_index + 1).padStart(2, "0")}
        </span>
        {drawn ? (
          <span
            className="font-mono text-[11px] font-semibold uppercase tracking-[0.06em] text-accent"
            title="Assignments saved and revealed"
          >
            ✓ Drawn
          </span>
        ) : null}
      </div>
      <div className="font-display text-lg leading-tight text-ink dark:text-zinc-50">
        {sport.name}
      </div>
      <div className="mt-1.5 text-xs leading-[1.5] text-ink-muted dark:text-zinc-400">
        {!locked
          ? "Awaiting Season Lock"
          : tierCount === 0
            ? "No usable standings were frozen — not drawable"
            : drawn
              ? "Saved on the server — replay is display-only"
              : `${tierCount} tiers frozen — ready to draw`}
      </div>
      {locked ? (
        <div className="mt-3">
          {drawn ? (
            <button
              type="button"
              onClick={submitDraw}
              disabled={busy}
              className={`rounded-md border border-line-muted px-3 py-1.5 font-mono text-xs font-semibold uppercase tracking-[0.06em] text-ink-muted transition-colors hover:border-accent hover:text-accent dark:text-zinc-400 ${
                busy ? "cursor-wait opacity-60" : ""
              }`}
            >
              {busy ? "Loading…" : "View reveal again"}
            </button>
          ) : (
            <button
              type="button"
              onClick={submitDraw}
              disabled={!drawable || busy}
              className={`rounded-md border border-accent px-4 py-1.5 font-mono text-xs font-semibold uppercase tracking-[0.06em] text-accent transition-colors hover:bg-accent hover:text-white disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent disabled:hover:text-accent ${
                busy ? "cursor-wait opacity-60" : ""
              }`}
            >
              {busy ? "Drawing…" : "Draw"}
            </button>
          )}
        </div>
      ) : null}
      {error ? (
        <p className="mt-2 text-xs font-semibold leading-[1.5] text-red-600 dark:text-red-400">
          {error}
        </p>
      ) : null}
    </FantasyPanel>
  );
}

export default function DrawConsole() {
  const { season, sports, drawnSportIds } = useLoaderData<typeof loader>();
  const actionData = useActionData<typeof action>();
  const navigation = useNavigation();
  const isLocking = navigation.state === "submitting";
  const [reveal, setReveal] = useState<RevealResult | null>(null);

  if (!season) {
    return (
      <FantasyMain>
        <p className="text-[15px] leading-[1.7] text-ink-muted">
          The 2027 season is not set up in this environment yet.
        </p>
      </FantasyMain>
    );
  }

  const locked = Boolean(season.locked_at);
  const error =
    actionData?.result && !actionData.result.ok
      ? actionData.result.error
      : null;

  return (
    <FantasyMain>
      <section className="mb-9">
        <FantasySectionHeading>Season Lock</FantasySectionHeading>
        {locked ? (
          <FantasyPanel>
            <div className="mb-1.5 font-mono text-[11px] font-semibold uppercase tracking-[0.06em] text-accent">
              Locked {season.locked_at ? formatUtc(season.locked_at) : ""}
            </div>
            <p className="mb-2 text-[15px] leading-[1.7] text-ink">
              Tiers and the RNG seed are frozen. The published seed:
            </p>
            <code className="block break-all rounded-md border border-line-muted bg-paper-muted px-3 py-2 font-mono text-sm text-ink dark:bg-zinc-900">
              {season.rng_seed}
            </code>
          </FantasyPanel>
        ) : (
          <div className="rounded-md border border-dashed border-accent p-5">
            <div className="mb-1.5 font-mono text-[11px] font-semibold uppercase tracking-[0.06em] text-accent">
              Not locked
            </div>
            <p className="mb-4 max-w-[640px] text-[15px] leading-[1.7] text-ink">
              Locking freezes each Sport's strength tiers from the latest
              ingested standings, generates the published RNG seed, and freezes
              the participant order. Nothing is drawable before lock; locking
              is one-way — there is no unlock button.
            </p>
            <Form method="post">
              <input type="hidden" name="intent" value="lock_season" />
              <button
                type="submit"
                disabled={isLocking}
                className={`rounded-md border border-accent px-4 py-2 font-mono text-xs font-semibold uppercase tracking-[0.06em] text-accent transition-colors hover:bg-accent hover:text-white ${
                  isLocking ? "cursor-wait opacity-60" : ""
                }`}
              >
                {isLocking ? "Locking…" : "Lock Season"}
              </button>
            </Form>
          </div>
        )}
        {error ? (
          <p className="mt-3 text-sm font-semibold text-red-600 dark:text-red-400">
            {error}
          </p>
        ) : null}
      </section>

      <section>
        <FantasySectionHeading>The Sports</FantasySectionHeading>
        {locked ? (
          <p className="mb-4 max-w-[640px] text-[15px] leading-[1.7] text-ink-muted">
            Draw in any order — each Sport's result depends only on the frozen
            inputs, never on sequence. Every draw is saved on the server before
            it animates, and re-clicking a drawn Sport replays the saved
            result.
          </p>
        ) : null}
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {sports.map((sport) => (
            <SportCard
              key={sport.id}
              sport={sport}
              locked={locked}
              drawn={drawnSportIds.includes(sport.id)}
              onResult={setReveal}
            />
          ))}
        </div>
      </section>

      {reveal ? (
        <DrawRevealOverlay result={reveal} onClose={() => setReveal(null)} />
      ) : null}
    </FantasyMain>
  );
}
