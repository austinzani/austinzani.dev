import { json, redirect } from "@remix-run/node";
import type { ActionFunctionArgs, LoaderFunctionArgs } from "@remix-run/node";
import {
  Form,
  isRouteErrorResponse,
  useActionData,
  useLoaderData,
  useNavigation,
  useRouteError,
} from "@remix-run/react";
import type { FormEvent } from "react";
import { useMemo, useState } from "react";

import { requireFantasyMember } from "~/utils/fantasy-auth.server";
import { BreadcrumbItem, Breadcrumbs } from "~/components/Breadcrumb";

type BallotStatus = "upcoming" | "open" | "finished";

type Ballot = {
  closes_at: string | null;
  created_at: string;
  id: number;
  opens_at: string | null;
  published_at: string | null;
  status: BallotStatus;
  title: string;
};

type QuestionOption = {
  display_order: number;
  id: number;
  is_status_quo: boolean;
  label: string;
  question_id: number;
};

type Question = {
  display_order: number;
  id: number;
  is_required: boolean;
  options: QuestionOption[];
  prompt: string;
  section: string;
};

type UserResponse = {
  created_at: string;
  option_id: number;
  question_id: number;
};

type BallotResponse = {
  ballot_id: number;
  option_id: number;
  question_id: number;
};

type QuestionResults = {
  options: Array<{
    count: number;
    id: number;
    isStatusQuo: boolean;
    label: string;
    percentage: number;
  }>;
  questionId: number;
  questionPrompt: string;
  questionSection: string;
  totalVotes: number;
};

type FinishedHistoryItem = {
  ballot: Ballot;
  questionResults: QuestionResults[];
  userSelectedOptionsByQuestion: Record<number, number>;
};

type LoaderData = {
  currentBallot: Ballot | null;
  currentMode: BallotStatus | "none";
  finishedHistory: FinishedHistoryItem[];
  hasSubmittedCurrentOpenBallot: boolean;
  isCommissioner: boolean;
  leagueName: string;
  openBallotQuestions: Question[];
  selectedOptionsByQuestion: Record<number, number>;
  submittedAt: string | null;
  userEmail: string | null;
};

type ActionData = {
  error?: string;
  missingQuestionIds?: number[];
};

const PIE_COLORS = [
  "#2563eb",
  "#f97316",
  "#22c55e",
  "#ef4444",
  "#a855f7",
  "#06b6d4",
  "#eab308",
  "#ec4899",
];

function getPassThreshold(totalVotes: number) {
  return Math.floor(totalVotes / 2) + 2;
}

function getWinningOption(result: QuestionResults) {
  const threshold = getPassThreshold(result.totalVotes);

  const winners = result.options
    .filter((option) => !option.isStatusQuo && option.count >= threshold)
    .sort((a, b) => b.count - a.count || a.id - b.id);

  return winners[0] ?? null;
}

function getDecisionSummary(result: QuestionResults) {
  const winningChangeOption = getWinningOption(result);
  if (winningChangeOption) {
    return {
      badge: "Passed",
      badgeClass:
        "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300",
      kind: "passed" as const,
      winningOptionId: winningChangeOption.id,
    };
  }

  return {
    badge: "No Change",
    badgeClass:
      "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300",
    kind: "no_change" as const,
    winningOptionId: null,
  };
}

/**
 * Maps each ballot's responses into a question->option lookup for quick UI reads.
 */
function toSelectedOptionMapByBallot(
  responses: Array<{ ballot_id: number; option_id: number; question_id: number }>
) {
  const selectedByBallot = new Map<number, Record<number, number>>();

  for (const response of responses) {
    const existing = selectedByBallot.get(response.ballot_id) ?? {};
    existing[response.question_id] = response.option_id;
    selectedByBallot.set(response.ballot_id, existing);
  }

  return selectedByBallot;
}

/**
 * Normalizes legacy status values so the UI can use one lifecycle vocabulary.
 */
function normalizeBallotStatus(rawStatus: string | null): BallotStatus | null {
  if (!rawStatus) {
    return null;
  }

  if (rawStatus === "upcoming" || rawStatus === "open" || rawStatus === "finished") {
    return rawStatus;
  }

  if (rawStatus === "draft") {
    return "upcoming";
  }

  if (rawStatus === "closed") {
    return "finished";
  }

  return null;
}

function formatDate(dateString: string | null) {
  if (!dateString) {
    return null;
  }

  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(dateString));
}

function toQuestions(
  questionRows: Array<{
    ballot_id: number;
    display_order: number;
    id: number;
    is_required: boolean;
    prompt: string;
    section: string | null;
  }>,
  optionRows: QuestionOption[]
): Question[] {
  const optionsByQuestion = new Map<number, QuestionOption[]>();

  for (const option of optionRows) {
    const current = optionsByQuestion.get(option.question_id) ?? [];
    current.push(option);
    optionsByQuestion.set(option.question_id, current);
  }

  return questionRows.map((question) => {
    const options = optionsByQuestion.get(question.id) ?? [];
    options.sort((a, b) => a.display_order - b.display_order || a.id - b.id);

    return {
      display_order: question.display_order,
      id: question.id,
      is_required: question.is_required,
      options,
      prompt: question.prompt,
      section: question.section?.trim() || "General",
    };
  });
}

function groupQuestionsBySection(questions: Question[]) {
  const grouped = new Map<string, Question[]>();

  for (const question of questions) {
    const current = grouped.get(question.section) ?? [];
    current.push(question);
    grouped.set(question.section, current);
  }

  return Array.from(grouped.entries()).map(([section, sectionQuestions]) => ({
    questions: sectionQuestions,
    section,
  }));
}

function computeQuestionResults(
  questions: Question[],
  ballotResponses: Array<{ option_id: number; question_id: number }>
): QuestionResults[] {
  return questions.map((question) => {
    const responsesForQuestion = ballotResponses.filter(
      (response) => response.question_id === question.id
    );

    const counts = new Map<number, number>();
    for (const response of responsesForQuestion) {
      counts.set(response.option_id, (counts.get(response.option_id) ?? 0) + 1);
    }

    const totalVotes = responsesForQuestion.length;

    return {
      options: question.options.map((option) => {
        const count = counts.get(option.id) ?? 0;
        const percentage = totalVotes > 0 ? (count / totalVotes) * 100 : 0;

        return {
          count,
          id: option.id,
          isStatusQuo: option.is_status_quo,
          label: option.label,
          percentage,
        };
      }),
      questionId: question.id,
      questionPrompt: question.prompt,
      questionSection: question.section,
      totalVotes,
    };
  });
}

function collectMissingRequiredQuestionIds(
  questions: Array<{ id: number; is_required: boolean }>,
  formData: FormData
) {
  return questions
    .filter((question) => {
      if (!question.is_required) {
        return false;
      }

      const answer = formData.get(`question_${question.id}`);
      return !answer;
    })
    .map((question) => question.id);
}

function getBallotPhaseSubtitle(mode: LoaderData["currentMode"]) {
  if (mode === "upcoming") {
    return "Upcoming Vote";
  }

  if (mode === "open") {
    return "Voting In Progress";
  }

  if (mode === "finished") {
    return "Vote Completed";
  }

  return "Town Hall";
}

function PieChart({ result }: { result: QuestionResults }) {
  if (result.totalVotes === 0) {
    return (
      <div className="w-28 aspect-square flex-none rounded-full border-8 border-gray-300 dark:border-zinc-700 flex items-center justify-center text-xs text-gray-500 dark:text-gray-400">
        No votes
      </div>
    );
  }

  let runningPercent = 0;
  const stops = result.options.map((option, index) => {
    const start = runningPercent;
    runningPercent += option.percentage;

    const color = PIE_COLORS[index % PIE_COLORS.length];
    return `${color} ${(start * 3.6).toFixed(2)}deg ${(runningPercent * 3.6).toFixed(
      2
    )}deg`;
  });

  return (
    <div
      className="w-28 aspect-square flex-none rounded-full border border-gray-200 dark:border-zinc-700 overflow-hidden"
      style={{
        backgroundImage: `conic-gradient(${stops.join(", ")})`,
      }}
    />
  );
}

function ResultCards({
  isCommissioner,
  questionResults,
  userSelectedOptionsByQuestion,
}: {
  isCommissioner: boolean;
  questionResults: QuestionResults[];
  userSelectedOptionsByQuestion?: Record<number, number>;
}) {
  const resultsWithDecision = questionResults.map((result) => ({
    decisionSummary: getDecisionSummary(result),
    result,
  }));

  const passedResults = resultsWithDecision.filter(
    (entry) => entry.decisionSummary.kind === "passed"
  );
  const noChangeResults = resultsWithDecision.filter(
    (entry) => entry.decisionSummary.kind === "no_change"
  );

  return (
    <div className="space-y-8">
      {passedResults.length > 0 ? (
        <div className="space-y-4">
          <h3 className="text-xl font-semibold">Passed</h3>
          {passedResults.map(({ decisionSummary, result }) => {
            const passThreshold = getPassThreshold(result.totalVotes);
            const userSelectedOptionId =
              userSelectedOptionsByQuestion?.[result.questionId];

            return (
              <div
                key={result.questionId}
                className="rounded-xl bg-gray-100 dark:bg-zinc-900 p-6"
              >
                <p className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">
                  {result.questionSection}
                </p>
                <h4 className="mt-1 text-lg font-semibold">{result.questionPrompt}</h4>
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                  Total votes: {result.totalVotes}
                  {isCommissioner ? " (commissioner access)" : ""}
                </p>
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                  Pass threshold: {passThreshold}+ votes
                </p>
                <div className="mt-2">
                  <span
                    className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold ${decisionSummary.badgeClass}`}
                  >
                    {decisionSummary.badge}
                  </span>
                </div>
                <div className="mt-4 flex flex-col gap-4 md:flex-row md:items-center">
                  <PieChart result={result} />
                  <ul className="space-y-2 w-full">
                    {result.options.map((option, index) => {
                      const isPassedOption =
                        decisionSummary.kind === "passed" &&
                        decisionSummary.winningOptionId === option.id;
                      const isNoChangeOption =
                        decisionSummary.kind === "no_change" && option.isStatusQuo;
                      const isUserVote = option.id === userSelectedOptionId;

                      return (
                        <li
                          key={option.id}
                          className={`flex items-center justify-between gap-3 rounded-lg border px-3 py-2 ${
                            isNoChangeOption
                              ? "border-red-400 bg-red-50 dark:border-red-700 dark:bg-red-950/20"
                              : isPassedOption
                                ? "border-emerald-400 bg-emerald-50 dark:border-emerald-700 dark:bg-emerald-950/20"
                              : "border-gray-200 bg-white dark:border-zinc-800 dark:bg-zinc-950"
                          }`}
                        >
                          <div className="flex items-center gap-2">
                            <span
                              className="h-3 w-3 rounded-full"
                              style={{
                                backgroundColor: PIE_COLORS[index % PIE_COLORS.length],
                              }}
                            />
                            <span>{option.label}</span>
                            {isUserVote ? (
                              <span
                                className="inline-flex items-center rounded-full bg-orange-100 px-2 py-0.5 text-xs font-semibold text-orange-700 dark:bg-orange-900/40 dark:text-orange-300"
                              >
                                Your Vote
                              </span>
                            ) : null}
                          </div>
                          <span className="text-sm text-gray-600 dark:text-gray-400 tabular-nums">
                            {option.count} ({option.percentage.toFixed(1)}%)
                          </span>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              </div>
            );
          })}
        </div>
      ) : null}

      {noChangeResults.length > 0 ? (
        <div className="space-y-4">
          <h3 className="text-xl font-semibold">No Change</h3>
          {noChangeResults.map(({ decisionSummary, result }) => {
            const passThreshold = getPassThreshold(result.totalVotes);
            const userSelectedOptionId =
              userSelectedOptionsByQuestion?.[result.questionId];

            return (
              <div
                key={result.questionId}
                className="rounded-xl bg-gray-100 dark:bg-zinc-900 p-6"
              >
                <p className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">
                  {result.questionSection}
                </p>
                <h4 className="mt-1 text-lg font-semibold">{result.questionPrompt}</h4>
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                  Total votes: {result.totalVotes}
                  {isCommissioner ? " (commissioner access)" : ""}
                </p>
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                  Pass threshold: {passThreshold}+ votes
                </p>
                <div className="mt-2">
                  <span
                    className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold ${decisionSummary.badgeClass}`}
                  >
                    {decisionSummary.badge}
                  </span>
                </div>
                <div className="mt-4 flex flex-col gap-4 md:flex-row md:items-center">
                  <PieChart result={result} />
                  <ul className="space-y-2 w-full">
                    {result.options.map((option, index) => {
                      const isPassedOption =
                        decisionSummary.kind === "passed" &&
                        decisionSummary.winningOptionId === option.id;
                      const isNoChangeOption =
                        decisionSummary.kind === "no_change" && option.isStatusQuo;
                      const isUserVote = option.id === userSelectedOptionId;

                      return (
                        <li
                          key={option.id}
                          className={`flex items-center justify-between gap-3 rounded-lg border px-3 py-2 ${
                            isNoChangeOption
                              ? "border-red-400 bg-red-50 dark:border-red-700 dark:bg-red-950/20"
                              : isPassedOption
                                ? "border-emerald-400 bg-emerald-50 dark:border-emerald-700 dark:bg-emerald-950/20"
                              : "border-gray-200 bg-white dark:border-zinc-800 dark:bg-zinc-950"
                          }`}
                        >
                          <div className="flex items-center gap-2">
                            <span
                              className="h-3 w-3 rounded-full"
                              style={{
                                backgroundColor: PIE_COLORS[index % PIE_COLORS.length],
                              }}
                            />
                            <span>{option.label}</span>
                            {isUserVote ? (
                              <span
                                className="inline-flex items-center rounded-full bg-orange-100 px-2 py-0.5 text-xs font-semibold text-orange-700 dark:bg-orange-900/40 dark:text-orange-300"
                              >
                                Your Vote
                              </span>
                            ) : null}
                          </div>
                          <span className="text-sm text-gray-600 dark:text-gray-400 tabular-nums">
                            {option.count} ({option.percentage.toFixed(1)}%)
                          </span>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              </div>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}

type BallotOptionControlMode = "preview" | "vote" | "locked";

function BallotOptionControl({
  disabled = false,
  mode,
  option,
  questionId,
  invalid = false,
  selected = false,
}: {
  disabled?: boolean;
  mode: BallotOptionControlMode;
  option: QuestionOption;
  invalid?: boolean;
  questionId: number;
  selected?: boolean;
}) {
  if (mode === "vote") {
    return (
      <label className={`block ${disabled ? "cursor-default" : "cursor-pointer"}`}>
        <input
          className="peer sr-only"
          disabled={disabled}
          name={`question_${questionId}`}
          type="radio"
          value={option.id}
        />
        <span
          className={`flex items-center gap-3 rounded-lg border px-3 py-2 text-sm font-medium transition-colors peer-checked:border-orange-500 peer-checked:bg-orange-50 peer-checked:[&_.radio-indicator]:border-orange-500 peer-checked:[&_.radio-dot]:bg-orange-500 peer-focus-visible:ring-2 peer-focus-visible:ring-orange-300 dark:peer-checked:border-orange-500 dark:peer-checked:bg-zinc-900 ${
            invalid
              ? "border-red-300 bg-white text-red-800 dark:border-red-700 dark:bg-zinc-950 dark:text-zinc-100"
              : "border-gray-200 bg-white text-gray-800 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-100"
          }`}
        >
          <span className="radio-indicator flex h-5 w-5 items-center justify-center rounded-full border border-gray-400 dark:border-zinc-500">
            <span className="radio-dot h-2.5 w-2.5 rounded-full bg-transparent" />
          </span>
          <span>{option.label}</span>
        </span>
      </label>
    );
  }

  const readonlyIsSelected = mode === "locked" && selected;
  const isPreview = mode === "preview";

  const disabledCardClass = readonlyIsSelected
    ? "border-orange-400 bg-orange-100/80 text-orange-900 ring-1 ring-orange-300 dark:border-orange-500 dark:bg-zinc-900 dark:text-orange-300 dark:ring-orange-800"
    : isPreview
      ? "border-gray-300 border-dashed bg-gray-50 text-gray-500 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-400"
      : "border-gray-300 bg-gray-100 text-gray-600 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300";

  return (
    <div
      aria-disabled={true}
      className={`w-full cursor-default rounded-lg border px-3 py-2 text-left text-sm font-medium transition-colors ${disabledCardClass}`}
      role="presentation"
    >
      <span className="flex items-center gap-3">
        <span
          className={`flex h-5 w-5 items-center justify-center rounded-full border ${
            readonlyIsSelected
              ? "border-orange-500"
              : "border-gray-400 dark:border-zinc-500"
          }`}
        >
          <span
            className={`h-2.5 w-2.5 rounded-full ${
              readonlyIsSelected ? "bg-orange-500" : "bg-transparent"
            }`}
          />
        </span>
        <span>{option.label}</span>
      </span>
    </div>
  );
}

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const member = await requireFantasyMember(request);

  const { data: ballotRows, error: ballotError } = await member.supabase
    .from("town_hall_ballots")
    .select("id, title, status, opens_at, closes_at, published_at, created_at")
    .eq("league_id", member.league.id)
    .order("created_at", { ascending: false })
    .limit(100);

  if (ballotError) {
    throw new Response("Failed to load town hall ballots.", {
      status: 500,
      headers: member.headers,
    });
  }

  const ballots: Ballot[] = (ballotRows ?? [])
    .map((ballot: any) => {
      const normalizedStatus = normalizeBallotStatus(ballot.status);
      if (!normalizedStatus) {
        return null;
      }

      return {
        closes_at: ballot.closes_at,
        created_at: ballot.created_at,
        id: ballot.id,
        opens_at: ballot.opens_at,
        published_at: ballot.published_at,
        status: normalizedStatus,
        title: ballot.title ?? "Town Hall Vote",
      } as Ballot;
    })
    .filter((ballot: Ballot | null): ballot is Ballot => Boolean(ballot));

  const openBallot = ballots.find((ballot) => ballot.status === "open") ?? null;
  const upcomingBallot = ballots.find((ballot) => ballot.status === "upcoming") ?? null;
  const finishedBallots = ballots.filter((ballot) => ballot.status === "finished");

  const currentMode: LoaderData["currentMode"] = openBallot
    ? "open"
    : upcomingBallot
      ? "upcoming"
      : finishedBallots.length > 0
        ? "finished"
        : "none";

  const currentBallot =
    openBallot ?? upcomingBallot ?? (finishedBallots.length > 0 ? finishedBallots[0] : null);

  let openBallotQuestions: Question[] = [];
  let selectedOptionsByQuestion: Record<number, number> = {};
  let hasSubmittedCurrentOpenBallot = false;
  let submittedAt: string | null = null;

  if (currentBallot && (currentMode === "open" || currentMode === "upcoming")) {
    const { data: questionRows, error: questionError } = await member.supabase
      .from("town_hall_questions")
      .select("id, ballot_id, prompt, display_order, is_required, section")
      .eq("ballot_id", currentBallot.id)
      .order("display_order", { ascending: true })
      .order("id", { ascending: true });

    if (questionError) {
      throw new Response("Failed to load town hall questions.", {
        status: 500,
        headers: member.headers,
      });
    }

    const questionIds = (questionRows ?? []).map((question: any) => question.id);

    const { data: optionRows, error: optionError } = await member.supabase
      .from("town_hall_answer_options")
      .select("id, question_id, label, display_order, is_status_quo")
      .in("question_id", questionIds.length > 0 ? questionIds : [-1])
      .order("display_order", { ascending: true })
      .order("id", { ascending: true });

    if (optionError) {
      throw new Response("Failed to load town hall answer options.", {
        status: 500,
        headers: member.headers,
      });
    }

    openBallotQuestions = toQuestions(questionRows ?? [], optionRows ?? []);

    if (currentMode === "open") {
      const { data: responseRows, error: responseError } = await member.supabase
        .from("town_hall_responses")
        .select("question_id, option_id, created_at")
        .eq("ballot_id", currentBallot.id)
        .eq("user_id", member.user.id)
        .order("created_at", { ascending: false });

      if (responseError) {
        throw new Response("Failed to load your ballot response.", {
          status: 500,
          headers: member.headers,
        });
      }

      const responses = (responseRows ?? []) as UserResponse[];
      hasSubmittedCurrentOpenBallot = responses.length > 0;
      selectedOptionsByQuestion = Object.fromEntries(
        responses.map((response) => [response.question_id, response.option_id])
      );
      submittedAt = responses.length > 0 ? responses[0].created_at : null;
    }
  }

  const finishedHistory: FinishedHistoryItem[] = [];

  if (finishedBallots.length > 0) {
    const finishedBallotIds = finishedBallots.map((ballot) => ballot.id);

    const { data: questionRows, error: questionError } = await member.supabase
      .from("town_hall_questions")
      .select("id, ballot_id, prompt, display_order, is_required, section")
      .in("ballot_id", finishedBallotIds)
      .order("display_order", { ascending: true })
      .order("id", { ascending: true });

    if (questionError) {
      throw new Response("Failed to load finished town hall questions.", {
        status: 500,
        headers: member.headers,
      });
    }

    const questionIds = (questionRows ?? []).map((question: any) => question.id);

    const { data: optionRows, error: optionError } = await member.supabase
      .from("town_hall_answer_options")
      .select("id, question_id, label, display_order, is_status_quo")
      .in("question_id", questionIds.length > 0 ? questionIds : [-1])
      .order("display_order", { ascending: true })
      .order("id", { ascending: true });

    if (optionError) {
      throw new Response("Failed to load finished town hall answer options.", {
        status: 500,
        headers: member.headers,
      });
    }

    const { data: responseRows, error: responseError } = await member.supabase
      .from("town_hall_responses")
      .select("ballot_id, question_id, option_id")
      .in("ballot_id", finishedBallotIds);

    if (responseError) {
      throw new Response("Failed to load finished town hall responses.", {
        status: 500,
        headers: member.headers,
      });
    }

    const { data: userResponseRows, error: userResponseError } = await member.supabase
      .from("town_hall_responses")
      .select("ballot_id, question_id, option_id")
      .in("ballot_id", finishedBallotIds)
      .eq("user_id", member.user.id);

    if (userResponseError) {
      throw new Response("Failed to load your finished town hall responses.", {
        status: 500,
        headers: member.headers,
      });
    }

    const questionsByBallot = new Map<number, Question[]>();
    const questionRowsByBallot = new Map<number, any[]>();

    for (const question of questionRows ?? []) {
      const current = questionRowsByBallot.get(question.ballot_id) ?? [];
      current.push(question);
      questionRowsByBallot.set(question.ballot_id, current);
    }

    for (const ballot of finishedBallots) {
      const rows = questionRowsByBallot.get(ballot.id) ?? [];
      questionsByBallot.set(ballot.id, toQuestions(rows, optionRows ?? []));
    }

    const responsesByBallot = new Map<number, BallotResponse[]>();
    for (const response of (responseRows ?? []) as BallotResponse[]) {
      const current = responsesByBallot.get(response.ballot_id) ?? [];
      current.push(response);
      responsesByBallot.set(response.ballot_id, current);
    }

    const userSelectionsByBallot = toSelectedOptionMapByBallot(
      (userResponseRows ?? []) as BallotResponse[]
    );

    for (const ballot of finishedBallots) {
      const questionSet = questionsByBallot.get(ballot.id) ?? [];
      const ballotResponses = responsesByBallot.get(ballot.id) ?? [];

      finishedHistory.push({
        ballot,
        questionResults: computeQuestionResults(questionSet, ballotResponses),
        userSelectedOptionsByQuestion: userSelectionsByBallot.get(ballot.id) ?? {},
      });
    }
  }

  return json<LoaderData>(
    {
      currentBallot,
      currentMode,
      finishedHistory,
      hasSubmittedCurrentOpenBallot,
      isCommissioner: member.isCommissioner,
      leagueName: member.league.name,
      openBallotQuestions,
      selectedOptionsByQuestion,
      submittedAt,
      userEmail: member.user.email,
    },
    {
      headers: member.headers,
    }
  );
};

export const action = async ({ request }: ActionFunctionArgs) => {
  const member = await requireFantasyMember(request);
  const formData = await request.formData();
  const intent = String(formData.get("intent") ?? "");

  if (intent !== "submit_ballot") {
    return json<ActionData>(
      {
        error: "Unsupported action.",
      },
      {
        headers: member.headers,
        status: 400,
      }
    );
  }

  const ballotId = Number(formData.get("ballotId"));
  if (!ballotId) {
    return json<ActionData>(
      {
        error: "Ballot is missing.",
      },
      {
        headers: member.headers,
        status: 400,
      }
    );
  }

  const { data: ballotRow, error: ballotError } = await member.supabase
    .from("town_hall_ballots")
    .select("id, status, league_id")
    .eq("id", ballotId)
    .eq("league_id", member.league.id)
    .maybeSingle();

  if (ballotError || !ballotRow) {
    return json<ActionData>(
      {
        error: "Town hall ballot was not found.",
      },
      {
        headers: member.headers,
        status: 404,
      }
    );
  }

  const normalizedStatus = normalizeBallotStatus(ballotRow.status);
  if (normalizedStatus !== "open") {
    return json<ActionData>(
      {
        error: "Voting is not open for this ballot.",
      },
      {
        headers: member.headers,
        status: 400,
      }
    );
  }

  const { data: existingRows, error: existingError } = await member.supabase
    .from("town_hall_responses")
    .select("id")
    .eq("ballot_id", ballotId)
    .eq("user_id", member.user.id)
    .limit(1);

  if (existingError) {
    return json<ActionData>(
      {
        error: "Unable to verify your previous submission state.",
      },
      {
        headers: member.headers,
        status: 500,
      }
    );
  }

  if ((existingRows ?? []).length > 0) {
    return json<ActionData>(
      {
        error: "Your vote is already submitted and locked for this ballot.",
      },
      {
        headers: member.headers,
        status: 400,
      }
    );
  }

  const { data: questionRows, error: questionsError } = await member.supabase
    .from("town_hall_questions")
    .select("id, is_required")
    .eq("ballot_id", ballotId)
    .order("display_order", { ascending: true })
    .order("id", { ascending: true });

  if (questionsError) {
    return json<ActionData>(
      {
        error: "Failed to load ballot questions.",
      },
      {
        headers: member.headers,
        status: 500,
      }
    );
  }

  const questionIds = (questionRows ?? []).map((question: any) => question.id);

  const { data: optionRows, error: optionsError } = await member.supabase
    .from("town_hall_answer_options")
    .select("id, question_id")
    .in("question_id", questionIds.length > 0 ? questionIds : [-1]);

  if (optionsError) {
    return json<ActionData>(
      {
        error: "Failed to load ballot answer options.",
      },
      {
        headers: member.headers,
        status: 500,
      }
    );
  }

  const validOptionsByQuestion = new Map<number, Set<number>>();
  for (const option of optionRows ?? []) {
    const current = validOptionsByQuestion.get(option.question_id) ?? new Set<number>();
    current.add(option.id);
    validOptionsByQuestion.set(option.question_id, current);
  }

  const rows = [] as Array<{
    ballot_id: number;
    league_id: number;
    manager_id: number;
    option_id: number;
    question_id: number;
    user_id: string;
  }>;
  const missingRequiredQuestionIds: number[] = [];

  for (const question of questionRows ?? []) {
    const rawValue = formData.get(`question_${question.id}`);
    const selectedOptionId = Number(rawValue);

    if (!selectedOptionId) {
      if (question.is_required) {
        missingRequiredQuestionIds.push(question.id);
      }

      continue;
    }

    const validForQuestion = validOptionsByQuestion.get(question.id);
    if (!validForQuestion || !validForQuestion.has(selectedOptionId)) {
      return json<ActionData>(
        {
          error: "One of the selected answers is invalid.",
        },
        {
          headers: member.headers,
          status: 400,
        }
      );
    }

    rows.push({
      ballot_id: ballotId,
      league_id: member.league.id,
      manager_id: member.membership.manager_id,
      option_id: selectedOptionId,
      question_id: question.id,
      user_id: member.user.id,
    });
  }

  if (missingRequiredQuestionIds.length > 0) {
    return json<ActionData>(
      {
        error: "Please choose an answer for every required question before you submit.",
        missingQuestionIds: missingRequiredQuestionIds,
      },
      {
        headers: member.headers,
        status: 400,
      }
    );
  }

  if (rows.length === 0) {
    return json<ActionData>(
      {
        error: "No answers were submitted.",
      },
      {
        headers: member.headers,
        status: 400,
      }
    );
  }

  const { error: insertError } = await member.supabase
    .from("town_hall_responses")
    .insert(rows);

  if (insertError) {
    const isDuplicate =
      insertError.message?.toLowerCase().includes("duplicate") ||
      insertError.code === "23505";

    return json<ActionData>(
      {
        error: isDuplicate
          ? "Your vote is already submitted and locked for this ballot."
          : "Unable to save your vote. Try again in a moment.",
      },
      {
        headers: member.headers,
        status: isDuplicate ? 400 : 500,
      }
    );
  }

  return redirect("/fantasy_football/town_hall", {
    headers: member.headers,
  });
};

export default function FantasyFootballTownHallRoute() {
  const data = useLoaderData<typeof loader>();
  const actionData = useActionData<typeof action>();
  const navigation = useNavigation();
  const groupedOpenQuestions = groupQuestionsBySection(data.openBallotQuestions);
  const [clientMissingQuestionIds, setClientMissingQuestionIds] = useState<number[]>([]);
  const isSubmittingBallot =
    navigation.state === "submitting" &&
    navigation.formData?.get("intent") === "submit_ballot";
  const ballotPhaseSubtitle = getBallotPhaseSubtitle(data.currentMode);

  const missingQuestionIds = useMemo(() => {
    const ids = new Set<number>();
    for (const id of actionData?.missingQuestionIds ?? []) {
      ids.add(Number(id));
    }
    for (const id of clientMissingQuestionIds) {
      ids.add(Number(id));
    }
    return ids;
  }, [actionData?.missingQuestionIds, clientMissingQuestionIds]);

  function handleVoteSubmitValidation(event: FormEvent<HTMLFormElement>) {
    const missingIds = collectMissingRequiredQuestionIds(
      data.openBallotQuestions,
      new FormData(event.currentTarget)
    );

    if (missingIds.length > 0) {
      event.preventDefault();
      setClientMissingQuestionIds(missingIds);
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }

    setClientMissingQuestionIds([]);
  }

  function handleVoteFormChange(event: FormEvent<HTMLFormElement>) {
    if (clientMissingQuestionIds.length === 0) {
      return;
    }

    const missingIds = collectMissingRequiredQuestionIds(
      data.openBallotQuestions,
      new FormData(event.currentTarget)
    );
    setClientMissingQuestionIds(missingIds);
  }

  return (
    <div className="w-full flex justify-center px-3 pb-8">
      <div className="w-full max-w-[64rem]">
        <Breadcrumbs className="pt-3">
          <BreadcrumbItem href="/fantasy_football">Fantasy Football</BreadcrumbItem>
          <BreadcrumbItem href="/fantasy_football/town_hall">Town Hall</BreadcrumbItem>
        </Breadcrumbs>

        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between mt-2">
          <div>
            <h1 className="text-2xl font-bold">Town Hall</h1>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">{data.leagueName}</p>
          </div>
          <Form method="post" action="/fantasy_football/login" className="flex items-center gap-3">
            <p className="text-sm text-gray-600 dark:text-gray-400">
              {data.userEmail ?? "Signed in"}
            </p>
            <input type="hidden" name="intent" value="sign_out" />
            <input type="hidden" name="redirectTo" value="/fantasy_football/town_hall" />
            <button
              type="submit"
              className="rounded-lg border border-orange-500 px-3 py-1.5 text-sm text-orange-600 dark:text-orange-400 hover:bg-orange-500 hover:text-white transition-colors"
            >
              Sign Out
            </button>
          </Form>
        </div>

        {actionData?.error ? (
          <p className="mt-4 text-sm text-red-500">{actionData.error}</p>
        ) : null}

        {data.currentMode === "none" || !data.currentBallot ? (
          <div className="mt-6 rounded-xl bg-gray-100 dark:bg-zinc-900 p-6">
            <p className="text-lg font-semibold">No town hall ballot is available.</p>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">
              Create a ballot in Supabase and set status to `upcoming`, `open`, or
              `finished`.
            </p>
          </div>
        ) : (
          <>
            <div className="mt-6 rounded-xl bg-gray-100 dark:bg-zinc-900 p-6">
              {data.currentMode === "finished" ? (
                <div>
                  <h2 className="text-xl font-semibold">{data.currentBallot.title}</h2>
                  <p className="mt-1 text-sm font-semibold text-orange-600 dark:text-orange-400">
                    Voting complete
                  </p>
                </div>
              ) : (
                <div className="flex flex-col gap-3 md:flex-row md:justify-between md:items-start">
                  <div>
                    <p className="text-sm font-semibold uppercase tracking-wide text-orange-600 dark:text-orange-400">
                      {ballotPhaseSubtitle}
                    </p>
                    <h2 className="text-xl font-semibold">{data.currentBallot.title}</h2>
                  </div>
                  <div className="text-sm text-gray-600 dark:text-gray-400 space-y-1">
                    {data.currentBallot.opens_at ? (
                      <p>Opened: {formatDate(data.currentBallot.opens_at)}</p>
                    ) : null}
                    {data.currentBallot.closes_at ? (
                      <p>Closed: {formatDate(data.currentBallot.closes_at)}</p>
                    ) : null}
                    {data.currentBallot.published_at ? (
                      <p>Published: {formatDate(data.currentBallot.published_at)}</p>
                    ) : null}
                  </div>
                </div>
              )}
            </div>

            {data.currentMode === "upcoming" ? (
              <div className="mt-6 rounded-xl bg-gray-100 dark:bg-zinc-900 p-6 space-y-6">
                <div>
                  <h3 className="text-lg font-semibold">Upcoming Vote</h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">
                    You can review the planned questions now. Voting becomes available
                    after the ballot status is set to open.
                  </p>
                </div>

                {groupedOpenQuestions.map((sectionGroup) => (
                  <div key={sectionGroup.section} className="space-y-3">
                    <h4 className="text-lg font-semibold">{sectionGroup.section}</h4>
                    {sectionGroup.questions.map((question) => (
                      <div
                        key={question.id}
                        className="rounded-lg bg-white dark:bg-zinc-950 border border-gray-200 dark:border-zinc-800 p-4"
                      >
                        <p className="font-semibold">{question.prompt}</p>
                        <div className="mt-3 space-y-2">
                          {question.options.map((option) => (
                            <BallotOptionControl
                              key={option.id}
                              mode="preview"
                              option={option}
                              questionId={question.id}
                            />
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            ) : null}

            {data.currentMode === "open" && !data.hasSubmittedCurrentOpenBallot ? (
              <Form
                noValidate
                method="post"
                onChange={handleVoteFormChange}
                onSubmit={handleVoteSubmitValidation}
                className="mt-6 rounded-xl bg-gray-100 dark:bg-zinc-900 p-6 space-y-6"
              >
                <input type="hidden" name="intent" value="submit_ballot" />
                <input type="hidden" name="ballotId" value={data.currentBallot.id} />

                {missingQuestionIds.size > 0 ? (
                  <p className="rounded-lg border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-700 dark:bg-red-950/30 dark:text-red-300">
                    Please choose an answer for every required question before you submit.
                  </p>
                ) : null}

                {groupedOpenQuestions.map((sectionGroup) => (
                  <div key={sectionGroup.section} className="space-y-4">
                    <h4 className="text-lg font-semibold">{sectionGroup.section}</h4>
                    {sectionGroup.questions.map((question) => {
                      const isMissing = missingQuestionIds.has(question.id);

                      return (
                        <div
                          key={question.id}
                          className={`rounded-lg border p-4 ${
                            isMissing
                              ? "border-red-400 bg-red-50/50 shadow-sm dark:border-red-700 dark:bg-red-950/20"
                              : "border-gray-200 bg-white/70 shadow-sm dark:border-zinc-800 dark:bg-zinc-950/40"
                          }`}
                        >
                        <p className="text-base font-semibold">{question.prompt}</p>
                        {isMissing ? (
                          <p className="mt-1 text-sm text-red-600 dark:text-red-400">
                            Please select one option.
                          </p>
                        ) : null}
                        <div className="mt-3 space-y-2">
                          {question.options.map((option) => (
                            <BallotOptionControl
                              disabled={isSubmittingBallot}
                              invalid={isMissing}
                              key={option.id}
                              mode="vote"
                              option={option}
                              questionId={question.id}
                            />
                          ))}
                        </div>
                        </div>
                      );
                    })}
                  </div>
                ))}

                <button
                  disabled={isSubmittingBallot}
                  type="submit"
                  className="inline-flex items-center gap-2 rounded-lg bg-orange-600 px-4 py-2 font-semibold text-white transition-colors hover:bg-orange-700 disabled:cursor-not-allowed disabled:opacity-70"
                >
                  {isSubmittingBallot ? (
                    <>
                      <span className="h-4 w-4 rounded-full border-2 border-white/70 border-t-transparent animate-spin" />
                      Submitting Vote...
                    </>
                  ) : (
                    "Submit Town Hall Vote"
                  )}
                </button>
              </Form>
            ) : null}

            {data.currentMode === "open" && data.hasSubmittedCurrentOpenBallot ? (
              <div className="mt-6 rounded-xl bg-gray-100 dark:bg-zinc-900 p-6 space-y-4">
                <div>
                  <h3 className="text-lg font-semibold">Vote Received</h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                    {data.submittedAt
                      ? `Received ${formatDate(data.submittedAt)}`
                      : "Your vote has been submitted and locked."}
                  </p>
                </div>

                {groupedOpenQuestions.map((sectionGroup) => (
                  <div key={sectionGroup.section} className="space-y-3">
                    <h4 className="text-lg font-semibold">{sectionGroup.section}</h4>
                    {sectionGroup.questions.map((question) => {
                      const selectedOptionId = data.selectedOptionsByQuestion[question.id];
                      const selectedOption = question.options.find(
                        (option) => option.id === selectedOptionId
                      );

                      return (
                        <div
                          key={question.id}
                          className="rounded-lg bg-white dark:bg-zinc-950 border border-gray-200 dark:border-zinc-800 p-4"
                        >
                          <p className="font-semibold">{question.prompt}</p>
                          <div className="mt-3 space-y-2">
                            {question.options.map((option) => (
                              <BallotOptionControl
                                key={option.id}
                                mode="locked"
                                option={option}
                                questionId={question.id}
                                selected={option.id === selectedOptionId}
                              />
                            ))}
                          </div>
                          {!selectedOption ? (
                            <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">
                              No answer recorded.
                            </p>
                          ) : null}
                        </div>
                      );
                    })}
                  </div>
                ))}
              </div>
            ) : null}

            {data.currentMode === "finished" && data.finishedHistory.length > 0 ? (
              <div className="mt-6">
                <ResultCards
                  isCommissioner={data.isCommissioner}
                  questionResults={data.finishedHistory[0].questionResults}
                  userSelectedOptionsByQuestion={
                    data.finishedHistory[0].userSelectedOptionsByQuestion
                  }
                />
              </div>
            ) : null}
          </>
        )}
      </div>
    </div>
  );
}

/**
 * Shows actionable route errors instead of the default generic Remix 500 page.
 */
export function ErrorBoundary() {
  const error = useRouteError();

  if (isRouteErrorResponse(error)) {
    const details =
      typeof error.data === "string" && error.data.trim().length > 0
        ? error.data
        : error.statusText;

    return (
      <div className="w-full flex justify-center px-3 pb-8">
        <div className="w-full max-w-[64rem] mt-6 rounded-xl bg-gray-100 dark:bg-zinc-900 p-6">
          <h1 className="text-2xl font-bold">Town Hall Unavailable</h1>
          <p className="mt-3 text-sm text-gray-700 dark:text-gray-300">
            Status: {error.status}
          </p>
          <p className="mt-2 text-sm text-red-600 dark:text-red-400">{details}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full flex justify-center px-3 pb-8">
      <div className="w-full max-w-[64rem] mt-6 rounded-xl bg-gray-100 dark:bg-zinc-900 p-6">
        <h1 className="text-2xl font-bold">Town Hall Unavailable</h1>
        <p className="mt-3 text-sm text-red-600 dark:text-red-400">
          An unexpected error occurred while loading the Town Hall page.
        </p>
      </div>
    </div>
  );
}
