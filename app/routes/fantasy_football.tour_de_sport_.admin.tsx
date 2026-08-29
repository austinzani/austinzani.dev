import { json } from "@remix-run/node";
import type {
  ActionFunctionArgs,
  HeadersFunction,
  LoaderFunctionArgs,
  MetaFunction,
} from "@remix-run/node";
import { Form, Link, useActionData, useLoaderData, useNavigation } from "@remix-run/react";

import {
  FantasyMain,
  FantasyPanel,
  FantasySectionHeading,
  fantasyTableBodyClass,
  fantasyTableHeadRowClass,
  fantasyTableShellClass,
} from "~/components/FantasyFootballUI";
import { capitalizeFirstLetter } from "~/utils/helpers";
import { requireFantasyMember } from "~/utils/fantasy-auth.server";
import { formatPoints } from "~/utils/tour_de_sport/scoreboard";

// Commissioner console: never cached, anywhere.
const CACHE_CONTROL = "no-store";

const SEASON_YEAR = 2027;

export const meta: MetaFunction = () => [{ title: "Admin | Tour de Sport" }];

export const headers: HeadersFunction = () => ({
  "Cache-Control": CACHE_CONTROL,
});

type SportStatus = "pending" | "counting" | "final";

const SPORT_STATUSES: SportStatus[] = ["pending", "counting", "final"];

type AdminSport = {
  id: number;
  sport_key: string;
  name: string;
  sport_index: number;
  status: SportStatus;
  revealed_at: string | null;
  tiers: unknown[] | null;
};

type AdminParticipant = { id: number; display_name: string };

type AdminAssignment = {
  id: number;
  sport_id: number;
  participant_id: number;
  entity_id: number;
  reassigned_at: string | null;
  reassignment_reason: string | null;
};

type AdminEntity = { id: number; sport_id: number; name: string };

type AdminOverride = {
  id: number;
  sport_id: number;
  participant_id: number;
  points: number;
  reason: string;
};

type LoaderData =
  | { denied: true }
  | {
      denied: false;
      season: { id: number; name: string; year: number; locked_at: string | null } | null;
      sports: AdminSport[];
      participants: AdminParticipant[];
      assignments: AdminAssignment[];
      entities: AdminEntity[];
      overrides: AdminOverride[];
    };

export const loader = async ({ request }: LoaderFunctionArgs) => {
  // Membership only (no role restriction) so a non-commissioner member gets a
  // deliberate, styled denial below instead of requireFantasyMember's bare
  // 403 Response. Logged-out / non-member users keep the existing login
  // redirect.
  const member = await requireFantasyMember(request);
  member.headers.set("Cache-Control", CACHE_CONTROL);

  if (member.role !== "commissioner") {
    // Returned (not thrown) so the styled component renders; the document
    // still reports 403.
    return json<LoaderData>(
      { denied: true },
      { status: 403, headers: member.headers }
    );
  }

  const { data: season } = await member.supabase
    .from("tds_seasons")
    .select("id, name, year, locked_at")
    .eq("year", SEASON_YEAR)
    .maybeSingle();

  let sports: AdminSport[] = [];
  let participants: AdminParticipant[] = [];
  let assignments: AdminAssignment[] = [];
  let entities: AdminEntity[] = [];
  let overrides: AdminOverride[] = [];

  if (season) {
    const [sportsResult, participantsResult] = await Promise.all([
      member.supabase
        .from("tds_sports")
        .select("id, sport_key, name, sport_index, status, revealed_at, tiers")
        .eq("season_id", season.id)
        .order("sport_index", { ascending: true }),
      member.supabase
        .from("tds_participants")
        .select("id, display_name")
        .eq("season_id", season.id)
        .order("display_name", { ascending: true }),
    ]);
    sports = (sportsResult.data ?? []) as AdminSport[];
    participants = (participantsResult.data ?? []) as AdminParticipant[];

    const sportIds = sports.map((sport) => sport.id);
    if (sportIds.length > 0) {
      const [assignmentsResult, overridesResult] = await Promise.all([
        member.supabase
          .from("tds_assignments")
          .select(
            "id, sport_id, participant_id, entity_id, reassigned_at, reassignment_reason"
          )
          .in("sport_id", sportIds),
        member.supabase
          .from("tds_manual_scores")
          .select("id, sport_id, participant_id, points, reason")
          .in("sport_id", sportIds),
      ]);
      assignments = (assignmentsResult.data ?? []) as AdminAssignment[];
      overrides = (overridesResult.data ?? []) as AdminOverride[];

      // Entity pickers only exist for drawn sports.
      const drawnSportIds = [
        ...new Set(assignments.map((assignment) => assignment.sport_id)),
      ];
      if (drawnSportIds.length > 0) {
        const { data: entityRows } = await member.supabase
          .from("tds_entities")
          .select("id, sport_id, name")
          .in("sport_id", drawnSportIds)
          .order("name", { ascending: true });
        entities = (entityRows ?? []) as AdminEntity[];
      }
    }
  }

  return json<LoaderData>(
    {
      denied: false,
      season: season ?? null,
      sports,
      participants,
      assignments,
      entities,
      overrides,
    },
    { headers: member.headers }
  );
};

type ActionData = {
  intent: string;
  ok: boolean;
  error?: string;
  notice?: string;
  sportId?: number;
};

function failure(
  intent: string,
  error: string,
  headers: Headers,
  sportId?: number
) {
  return json<ActionData>(
    { intent, ok: false, error, sportId },
    { status: 400, headers }
  );
}

export const action = async ({ request }: ActionFunctionArgs) => {
  const member = await requireFantasyMember(request);
  member.headers.set("Cache-Control", CACHE_CONTROL);

  if (member.role !== "commissioner") {
    return failure("denied", "Commissioner only.", member.headers);
  }

  const formData = await request.formData();
  const intent = String(formData.get("intent") ?? "");

  if (intent === "set_status") {
    const sportId = Number(formData.get("sport_id"));
    const status = String(formData.get("status") ?? "") as SportStatus;
    if (!Number.isInteger(sportId) || sportId <= 0) {
      return failure(intent, "Missing sport.", member.headers);
    }
    if (!SPORT_STATUSES.includes(status)) {
      return failure(intent, "Unknown status.", member.headers);
    }
    const { data: updated, error } = await member.supabase
      .from("tds_sports")
      .update({ status })
      .eq("id", sportId)
      .select("id");
    // RLS failures surface as a silent zero-row update — treat as denial.
    if (error || (updated ?? []).length !== 1) {
      return failure(
        intent,
        error?.message ?? "Status update was not permitted.",
        member.headers
      );
    }
    return json<ActionData>(
      { intent, ok: true, notice: `Status set to ${status}.`, sportId },
      { headers: member.headers }
    );
  }

  if (intent === "save_override") {
    const sportId = Number(formData.get("sport_id"));
    const participantId = Number(formData.get("participant_id"));
    const points = Number(formData.get("points"));
    const reason = String(formData.get("reason") ?? "").trim();
    if (!Number.isInteger(sportId) || sportId <= 0) {
      return failure(intent, "Pick a sport.", member.headers);
    }
    if (!Number.isInteger(participantId) || participantId <= 0) {
      return failure(intent, "Pick a participant.", member.headers);
    }
    if (String(formData.get("points") ?? "").trim() === "" || !Number.isFinite(points)) {
      return failure(intent, "Points must be a number.", member.headers);
    }
    if (reason === "") {
      return failure(
        intent,
        "A reason is required — overrides are always flagged publicly.",
        member.headers
      );
    }
    const { data: saved, error } = await member.supabase
      .from("tds_manual_scores")
      .upsert(
        [
          {
            sport_id: sportId,
            participant_id: participantId,
            points,
            reason,
            created_by: member.user.id,
          },
        ],
        { onConflict: "sport_id,participant_id" }
      )
      .select("id");
    if (error || (saved ?? []).length !== 1) {
      return failure(
        intent,
        error?.message ?? "Override was not saved.",
        member.headers
      );
    }
    return json<ActionData>(
      { intent, ok: true, notice: "Override saved." },
      { headers: member.headers }
    );
  }

  if (intent === "remove_override") {
    const overrideId = Number(formData.get("override_id"));
    if (!Number.isInteger(overrideId) || overrideId <= 0) {
      return failure(intent, "Missing override.", member.headers);
    }
    const { data: removed, error } = await member.supabase
      .from("tds_manual_scores")
      .delete()
      .eq("id", overrideId)
      .select("id");
    if (error || (removed ?? []).length !== 1) {
      return failure(
        intent,
        error?.message ?? "Override was not removed.",
        member.headers
      );
    }
    return json<ActionData>(
      { intent, ok: true, notice: "Override removed — score is computed again." },
      { headers: member.headers }
    );
  }

  if (intent === "reassign_entity") {
    const assignmentId = Number(formData.get("assignment_id"));
    const entityId = Number(formData.get("entity_id"));
    const sportId = Number(formData.get("sport_id"));
    const reason = String(formData.get("reason") ?? "").trim();
    if (!Number.isInteger(assignmentId) || assignmentId <= 0) {
      return failure(intent, "Pick an assignment.", member.headers, sportId);
    }
    if (!Number.isInteger(entityId) || entityId <= 0) {
      return failure(intent, "Pick a replacement entity.", member.headers, sportId);
    }
    if (reason === "") {
      return failure(
        intent,
        "A reason is required — reassignments are always flagged publicly.",
        member.headers,
        sportId
      );
    }

    const [{ data: assignment }, { data: entity }] = await Promise.all([
      member.supabase
        .from("tds_assignments")
        .select("id, sport_id, entity_id")
        .eq("id", assignmentId)
        .maybeSingle(),
      member.supabase
        .from("tds_entities")
        .select("id, sport_id")
        .eq("id", entityId)
        .maybeSingle(),
    ]);
    if (!assignment) {
      return failure(intent, "Assignment not found.", member.headers, sportId);
    }
    if (!entity || entity.sport_id !== assignment.sport_id) {
      return failure(
        intent,
        "The replacement entity must belong to the same sport.",
        member.headers,
        sportId
      );
    }
    if (entity.id === assignment.entity_id) {
      return failure(
        intent,
        "That is already this assignment's entity.",
        member.headers,
        sportId
      );
    }

    const { data: updated, error } = await member.supabase
      .from("tds_assignments")
      .update({
        entity_id: entityId,
        // Both provenance fields land together — a reassignment is loud.
        reassigned_at: new Date().toISOString(),
        reassignment_reason: reason,
      })
      .eq("id", assignmentId)
      .select("id");
    if (error) {
      // 23505 = the (sport_id, entity_id) unique constraint: the replacement
      // is already assigned to another participant.
      const message =
        error.code === "23505"
          ? "That entity is already assigned to another participant in this sport."
          : error.message;
      return failure(intent, message, member.headers, assignment.sport_id);
    }
    if ((updated ?? []).length !== 1) {
      return failure(
        intent,
        "Reassignment was not permitted.",
        member.headers,
        assignment.sport_id
      );
    }
    return json<ActionData>(
      {
        intent,
        ok: true,
        notice: "Entity reassigned — the row is now flagged on the public board.",
        sportId: assignment.sport_id,
      },
      { headers: member.headers }
    );
  }

  return failure("unknown", "Unsupported action.", member.headers);
};

// min-w-0/max-w-full keep a select from inheriting its widest option's
// intrinsic width and dragging the page past the viewport on phones.
const controlClass =
  "min-w-0 max-w-full rounded-md border border-line-muted bg-paper px-2.5 py-1.5 text-sm text-ink focus:border-accent focus:outline-none dark:bg-zinc-900 dark:text-zinc-50";

const primaryButtonClass =
  "rounded-md border border-accent px-4 py-1.5 font-mono text-xs font-semibold uppercase tracking-[0.06em] text-accent transition-colors hover:bg-accent hover:text-white disabled:cursor-wait disabled:opacity-60";

const quietButtonClass =
  "rounded-md border border-line-muted px-2.5 py-1 font-mono text-[11px] font-semibold uppercase tracking-[0.06em] text-ink-muted transition-colors hover:border-accent hover:text-accent disabled:cursor-wait disabled:opacity-60 dark:text-zinc-400";

const tableHeadCellClass =
  "h-11 whitespace-nowrap px-3 text-left align-middle font-mono text-[11px] font-semibold uppercase tracking-[0.06em]";

const labelClass =
  "font-mono text-[11px] font-semibold uppercase tracking-[0.06em] text-ink-muted dark:text-zinc-400";

const statusToneClass: Record<SportStatus, string> = {
  pending: "text-ink-muted dark:text-zinc-400",
  counting: "text-accent",
  final: "text-ink dark:text-zinc-50",
};

function ActionFeedback({
  actionData,
  intent,
  sportId,
}: {
  actionData: ActionData | undefined;
  intent: string | string[];
  sportId?: number;
}) {
  const intents = Array.isArray(intent) ? intent : [intent];
  if (!actionData || !intents.includes(actionData.intent)) return null;
  if (sportId !== undefined && actionData.sportId !== sportId) return null;
  return actionData.ok ? (
    <p className="mt-2 text-xs font-semibold leading-[1.5] text-accent">
      {actionData.notice}
    </p>
  ) : (
    <p className="mt-2 text-xs font-semibold leading-[1.5] text-red-600 dark:text-red-400">
      {actionData.error}
    </p>
  );
}

export default function TourDeSportAdmin() {
  const data = useLoaderData<typeof loader>();
  const actionData = useActionData<typeof action>() as ActionData | undefined;
  const navigation = useNavigation();
  const busy = navigation.state === "submitting";

  if (data.denied) {
    return (
      <FantasyMain>
        <FantasyPanel>
          <div className="mb-1.5 font-mono text-[11px] font-semibold uppercase tracking-[0.06em] text-accent">
            Commissioner only
          </div>
          <p className="mb-3 max-w-[640px] text-[15px] leading-[1.7] text-ink">
            The admin desk is where scores get overridden and entities get
            reassigned — it belongs to the commissioner alone. Everything done
            here shows up flagged on the public board, which you can browse
            like everyone else.
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

  const { season, sports, participants, assignments, entities, overrides } =
    data;

  if (!season) {
    return (
      <FantasyMain>
        <p className="text-[15px] leading-[1.7] text-ink-muted">
          The 2027 season is not set up in this environment yet.
        </p>
      </FantasyMain>
    );
  }

  const participantById = new Map(
    participants.map((participant) => [participant.id, participant])
  );
  const entityById = new Map(entities.map((entity) => [entity.id, entity]));
  const sportById = new Map(sports.map((sport) => [sport.id, sport]));
  const assignmentsBySport = new Map<number, AdminAssignment[]>();
  for (const assignment of assignments) {
    const list = assignmentsBySport.get(assignment.sport_id) ?? [];
    list.push(assignment);
    assignmentsBySport.set(assignment.sport_id, list);
  }
  const revealedSports = sports.filter((sport) => sport.revealed_at !== null);
  const drawnSports = sports.filter((sport) =>
    assignmentsBySport.has(sport.id)
  );

  const participantName = (id: number) =>
    capitalizeFirstLetter(participantById.get(id)?.display_name ?? `#${id}`);

  return (
    <FantasyMain>
      {/* ------------------------------------------------ Sport status ---- */}
      <section className="mb-9">
        <FantasySectionHeading>Sport Status</FantasySectionHeading>
        <p className="mb-4 max-w-[640px] text-[15px] leading-[1.7] text-ink-muted">
          Pending contributes zero; counting and final feed the season totals.
          Flips take effect immediately on the scoreboard — the public pages
          just cache for a few minutes.
        </p>
        <div className={fantasyTableShellClass}>
          <table className="w-full min-w-[720px] border-collapse text-sm">
            <thead>
              <tr className={fantasyTableHeadRowClass}>
                <th className={tableHeadCellClass}>Sport</th>
                <th className={tableHeadCellClass}>Status</th>
                <th className={tableHeadCellClass}>Revealed</th>
                <th className={tableHeadCellClass}>Tiers</th>
                <th className={tableHeadCellClass}>Assigned</th>
                <th className={tableHeadCellClass}>Set status</th>
              </tr>
            </thead>
            <tbody className={fantasyTableBodyClass}>
              {sports.map((sport) => {
                const assigned = assignmentsBySport.get(sport.id)?.length ?? 0;
                return (
                  <tr key={sport.id} className="align-middle">
                    <td className="px-3 py-2.5 font-semibold text-ink dark:text-zinc-50">
                      <span className="mr-2 font-mono text-xs text-ink-muted dark:text-zinc-400">
                        {String(sport.sport_index + 1).padStart(2, "0")}
                      </span>
                      {sport.name}
                    </td>
                    <td
                      className={`px-3 py-2.5 font-mono text-xs font-semibold uppercase tracking-[0.06em] ${statusToneClass[sport.status]}`}
                    >
                      {sport.status}
                    </td>
                    <td className="px-3 py-2.5 text-xs text-ink-muted dark:text-zinc-400">
                      {sport.revealed_at ? "Revealed" : "Hidden"}
                    </td>
                    <td className="px-3 py-2.5 text-xs text-ink-muted dark:text-zinc-400">
                      {sport.tiers === null
                        ? "Pre-lock"
                        : sport.tiers.length === 0
                          ? "None"
                          : `${sport.tiers.length} tiers`}
                    </td>
                    <td className="px-3 py-2.5 text-xs text-ink-muted dark:text-zinc-400">
                      {assigned > 0 ? `${assigned} drawn` : "Not drawn"}
                    </td>
                    <td className="px-3 py-2.5">
                      <span className="flex flex-wrap gap-1.5">
                        {SPORT_STATUSES.filter(
                          (status) => status !== sport.status
                        ).map((status) => (
                          <Form method="post" key={status}>
                            <input
                              type="hidden"
                              name="intent"
                              value="set_status"
                            />
                            <input
                              type="hidden"
                              name="sport_id"
                              value={sport.id}
                            />
                            <input type="hidden" name="status" value={status} />
                            <button
                              type="submit"
                              disabled={busy}
                              className={quietButtonClass}
                            >
                              → {status}
                            </button>
                          </Form>
                        ))}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <ActionFeedback actionData={actionData} intent="set_status" />
      </section>

      {/* ------------------------------------------------ Manual scores --- */}
      <section className="mb-9">
        <FantasySectionHeading>Manual Score Overrides</FantasySectionHeading>
        <p className="mb-4 max-w-[640px] text-[15px] leading-[1.7] text-ink-muted">
          An override fully replaces the computed points for one participant in
          one sport, and renders flagged — with its reason — on the scoreboard
          and the sport detail page. Removing it returns the score to the
          computed value.
        </p>

        {overrides.length > 0 ? (
          <div className={`${fantasyTableShellClass} mb-4`}>
            <table className="w-full min-w-[640px] border-collapse text-sm">
              <thead>
                <tr className={fantasyTableHeadRowClass}>
                  <th className={tableHeadCellClass}>Sport</th>
                  <th className={tableHeadCellClass}>Participant</th>
                  <th className={tableHeadCellClass}>Points</th>
                  <th className={tableHeadCellClass}>Reason</th>
                  <th className={tableHeadCellClass}>Remove</th>
                </tr>
              </thead>
              <tbody className={fantasyTableBodyClass}>
                {overrides.map((override) => (
                  <tr key={override.id} className="align-middle">
                    <td className="px-3 py-2.5 font-semibold text-ink dark:text-zinc-50">
                      {sportById.get(override.sport_id)?.name ??
                        `#${override.sport_id}`}
                    </td>
                    <td className="px-3 py-2.5 text-ink dark:text-zinc-50">
                      {participantName(override.participant_id)}
                    </td>
                    <td className="px-3 py-2.5 font-mono font-semibold text-amber-600 dark:text-amber-400">
                      {formatPoints(override.points)}
                    </td>
                    <td className="max-w-[280px] px-3 py-2.5 text-xs leading-[1.5] text-ink-muted dark:text-zinc-400">
                      {override.reason}
                    </td>
                    <td className="px-3 py-2.5">
                      <Form method="post">
                        <input
                          type="hidden"
                          name="intent"
                          value="remove_override"
                        />
                        <input
                          type="hidden"
                          name="override_id"
                          value={override.id}
                        />
                        <button
                          type="submit"
                          disabled={busy}
                          className={quietButtonClass}
                        >
                          Remove
                        </button>
                      </Form>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="mb-4 text-sm text-ink-muted dark:text-zinc-400">
            No overrides in place — every score is computed.
          </p>
        )}

        {revealedSports.length > 0 ? (
          <FantasyPanel>
            <Form method="post" className="flex flex-wrap items-end gap-3">
              <input type="hidden" name="intent" value="save_override" />
              <label className="flex min-w-0 max-w-full flex-col gap-1">
                <span className={labelClass}>Sport</span>
                <select name="sport_id" required className={controlClass}>
                  {revealedSports.map((sport) => (
                    <option key={sport.id} value={sport.id}>
                      {sport.name}
                    </option>
                  ))}
                </select>
              </label>
              <label className="flex min-w-0 max-w-full flex-col gap-1">
                <span className={labelClass}>Participant</span>
                <select name="participant_id" required className={controlClass}>
                  {participants.map((participant) => (
                    <option key={participant.id} value={participant.id}>
                      {capitalizeFirstLetter(participant.display_name)}
                    </option>
                  ))}
                </select>
              </label>
              <label className="flex min-w-0 max-w-full flex-col gap-1">
                <span className={labelClass}>Points</span>
                <input
                  type="number"
                  name="points"
                  step="any"
                  required
                  className={`${controlClass} w-24`}
                />
              </label>
              <label className="flex min-w-[240px] flex-1 flex-col gap-1">
                <span className={labelClass}>Reason (required)</span>
                <input
                  type="text"
                  name="reason"
                  required
                  placeholder="Shown publicly next to the flag"
                  className={controlClass}
                />
              </label>
              <button type="submit" disabled={busy} className={primaryButtonClass}>
                Save override
              </button>
            </Form>
            <ActionFeedback actionData={actionData} intent="save_override" />
          </FantasyPanel>
        ) : (
          <p className="text-sm text-ink-muted dark:text-zinc-400">
            Overrides become available once a sport is revealed.
          </p>
        )}
        <ActionFeedback actionData={actionData} intent="remove_override" />
      </section>

      {/* ------------------------------------------------ Reassignment ---- */}
      <section>
        <FantasySectionHeading>Entity Reassignment</FantasySectionHeading>
        <p className="mb-4 max-w-[640px] text-[15px] leading-[1.7] text-ink-muted">
          The emergency escape hatch: swap one assignment's entity for an
          unassigned entity of the same sport. The draw record itself is never
          rewritten silently — the row is flagged as reassigned, with the
          reason, on the public board.
        </p>
        {drawnSports.length === 0 ? (
          <p className="text-sm text-ink-muted dark:text-zinc-400">
            Nothing to reassign — no sport has been drawn yet.
          </p>
        ) : (
          drawnSports.map((sport) => {
            const sportAssignments = (
              assignmentsBySport.get(sport.id) ?? []
            ).slice();
            sportAssignments.sort((a, b) =>
              participantName(a.participant_id).localeCompare(
                participantName(b.participant_id)
              )
            );
            const assignedEntityIds = new Set(
              sportAssignments.map((assignment) => assignment.entity_id)
            );
            const availableEntities = entities.filter(
              (entity) =>
                entity.sport_id === sport.id &&
                !assignedEntityIds.has(entity.id)
            );
            const reassigned = sportAssignments.filter(
              (assignment) => assignment.reassigned_at !== null
            );
            return (
              <div key={sport.id} className="mb-6">
                <h3 className="mb-2 font-mono text-[12.5px] font-semibold uppercase tracking-[0.05em] text-ink dark:text-zinc-100">
                  {sport.name}
                </h3>
                {reassigned.length > 0 ? (
                  <ul className="mb-3 space-y-1">
                    {reassigned.map((assignment) => (
                      <li
                        key={assignment.id}
                        className="text-xs leading-[1.6] text-amber-600 dark:text-amber-400"
                      >
                        <span className="mr-1.5 rounded border border-amber-500 px-1 py-0.5 font-mono text-[9px] font-semibold uppercase tracking-[0.06em]">
                          Reassigned
                        </span>
                        {participantName(assignment.participant_id)} now has{" "}
                        {entityById.get(assignment.entity_id)?.name ??
                          `entity #${assignment.entity_id}`}
                        {assignment.reassignment_reason
                          ? ` — ${assignment.reassignment_reason}`
                          : ""}
                      </li>
                    ))}
                  </ul>
                ) : null}
                <FantasyPanel>
                  <Form method="post" className="flex flex-wrap items-end gap-3">
                    <input
                      type="hidden"
                      name="intent"
                      value="reassign_entity"
                    />
                    <input type="hidden" name="sport_id" value={sport.id} />
                    <label className="flex min-w-0 max-w-full flex-col gap-1">
                      <span className={labelClass}>Assignment</span>
                      <select
                        name="assignment_id"
                        required
                        className={controlClass}
                      >
                        {sportAssignments.map((assignment) => (
                          <option key={assignment.id} value={assignment.id}>
                            {participantName(assignment.participant_id)} —{" "}
                            {entityById.get(assignment.entity_id)?.name ??
                              `entity #${assignment.entity_id}`}
                            {assignment.reassigned_at ? " (reassigned)" : ""}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label className="flex min-w-0 max-w-full flex-col gap-1">
                      <span className={labelClass}>Replacement entity</span>
                      <select name="entity_id" required className={controlClass}>
                        {availableEntities.map((entity) => (
                          <option key={entity.id} value={entity.id}>
                            {entity.name}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label className="flex min-w-[240px] flex-1 flex-col gap-1">
                      <span className={labelClass}>Reason (required)</span>
                      <input
                        type="text"
                        name="reason"
                        required
                        placeholder="Shown publicly next to the flag"
                        className={controlClass}
                      />
                    </label>
                    <button
                      type="submit"
                      disabled={busy || availableEntities.length === 0}
                      className={primaryButtonClass}
                    >
                      Reassign
                    </button>
                  </Form>
                  {availableEntities.length === 0 ? (
                    <p className="mt-2 text-xs text-ink-muted dark:text-zinc-400">
                      Every entity in this sport is already assigned.
                    </p>
                  ) : null}
                  <ActionFeedback
                    actionData={actionData}
                    intent="reassign_entity"
                    sportId={sport.id}
                  />
                </FantasyPanel>
              </div>
            );
          })
        )}
      </section>
    </FantasyMain>
  );
}
