import { json, redirect } from "@remix-run/node";
import type { ActionFunctionArgs, LoaderFunctionArgs } from "@remix-run/node";
import {
  Form,
  useActionData,
  useLoaderData,
  useNavigation,
} from "@remix-run/react";
import { useEffect, useRef, useState, type ReactNode } from "react";

import { requireFantasyMember } from "~/utils/fantasy-auth.server";
import { BreadcrumbItem, Breadcrumbs } from "~/components/Breadcrumb";
import Icon from "~/components/Icon";

type Submission = {
  content: string;
  created_at: string;
  id: number;
  manager_name: string | null;
  manager_id: number;
  updated_at: string;
  user_id: string;
};

type LoaderData = {
  currentUserId: string;
  isCommissioner: boolean;
  submissions: Submission[];
  userEmail: string | null;
};

type ActionData = {
  error?: string;
};

function formatDate(dateString: string | null) {
  if (!dateString) {
    return "Not set";
  }

  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(dateString));
}

type ModalProps = {
  children: ReactNode;
  dismissDisabled?: boolean;
  maxWidthClassName?: string;
  onDismiss: () => void;
  titleId: string;
};

function Modal({
  children,
  dismissDisabled = false,
  maxWidthClassName = "max-w-xl",
  onDismiss,
  titleId,
}: ModalProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <button
        type="button"
        onClick={() => {
          if (dismissDisabled) {
            return;
          }
          onDismiss();
        }}
        aria-label="Close modal"
        className="absolute inset-0 bg-black/35 backdrop-blur-sm"
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className={`relative z-10 w-full ${maxWidthClassName} rounded-xl border border-gray-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-6 shadow-2xl`}
      >
        {children}
      </div>
    </div>
  );
}

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const member = await requireFantasyMember(request);

  const submissionQuery = member.supabase
    .from("rule_submissions")
    .select("id, content, created_at, updated_at, user_id, manager_id, manager:manager(name)")
    .eq("league_id", member.league.id)
    .is("deleted_at", null)
    .order("created_at", { ascending: false });

  if (!member.isCommissioner) {
    submissionQuery.eq("user_id", member.user.id);
  }

  const { data: submissionRows, error: submissionError } = await submissionQuery;

  if (submissionError) {
    throw new Response("Unable to load rule submissions.", {
      status: 500,
      headers: member.headers,
    });
  }

  const submissions: Submission[] = (submissionRows ?? []).map((row: any) => {
    const managerName = Array.isArray(row.manager)
      ? row.manager[0]?.name ?? null
      : row.manager?.name ?? null;

    return {
      content: row.content,
      created_at: row.created_at,
      id: row.id,
      manager_id: row.manager_id,
      manager_name: managerName,
      updated_at: row.updated_at,
      user_id: row.user_id,
    };
  });

  return json<LoaderData>(
    {
      currentUserId: member.user.id,
      isCommissioner: member.isCommissioner,
      submissions,
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

  if (intent === "create_submission") {
    const content = String(formData.get("content") ?? "").trim();

    if (!content) {
      return json<ActionData>(
        {
          error: "Rule submission cannot be empty.",
        },
        {
          headers: member.headers,
          status: 400,
        }
      );
    }

    const { error } = await member.supabase.from("rule_submissions").insert({
      content,
      league_id: member.league.id,
      manager_id: member.membership.manager_id,
      user_id: member.user.id,
    });

    if (error) {
      return json<ActionData>(
        {
          error: "Unable to save your submission right now.",
        },
        {
          headers: member.headers,
          status: 500,
        }
      );
    }

    return redirect("/fantasy_football/rule_submission", {
      headers: member.headers,
    });
  }

  if (intent === "update_submission") {
    const submissionId = Number(formData.get("submissionId"));
    const content = String(formData.get("content") ?? "").trim();

    if (!submissionId || !content) {
      return json<ActionData>(
        {
          error: "A valid submission and content are required.",
        },
        {
          headers: member.headers,
          status: 400,
        }
      );
    }

    const updateQuery = member.supabase
      .from("rule_submissions")
      .update({
        content,
      })
      .eq("id", submissionId)
      .eq("league_id", member.league.id)
      .is("deleted_at", null);

    if (!member.isCommissioner) {
      updateQuery.eq("user_id", member.user.id);
    }

    const { error } = await updateQuery;

    if (error) {
      return json<ActionData>(
        {
          error: "Unable to update that submission.",
        },
        {
          headers: member.headers,
          status: 500,
        }
      );
    }

    return redirect("/fantasy_football/rule_submission", {
      headers: member.headers,
    });
  }

  if (intent === "delete_submission") {
    const submissionId = Number(formData.get("submissionId"));

    if (!submissionId) {
      return json<ActionData>(
        {
          error: "A valid submission is required.",
        },
        {
          headers: member.headers,
          status: 400,
        }
      );
    }

    const deleteQuery = member.supabase
      .from("rule_submissions")
      .update({
        deleted_at: new Date().toISOString(),
      })
      .eq("id", submissionId)
      .eq("league_id", member.league.id)
      .is("deleted_at", null);

    if (!member.isCommissioner) {
      deleteQuery.eq("user_id", member.user.id);
    }

    const { error } = await deleteQuery;

    if (error) {
      return json<ActionData>(
        {
          error: "Unable to delete that submission.",
        },
        {
          headers: member.headers,
          status: 500,
        }
      );
    }

    return redirect("/fantasy_football/rule_submission", {
      headers: member.headers,
    });
  }

  return json<ActionData>(
    {
      error: "Unsupported action.",
    },
    {
      headers: member.headers,
      status: 400,
    }
  );
};

export default function FantasyFootballRuleSubmissionRoute() {
  const data = useLoaderData<typeof loader>();
  const actionData = useActionData<typeof action>();
  const navigation = useNavigation();
  const [newSubmissionContent, setNewSubmissionContent] = useState("");
  const [editingSubmission, setEditingSubmission] = useState<Submission | null>(
    null
  );
  const [editContent, setEditContent] = useState("");
  const [deletingSubmission, setDeletingSubmission] = useState<Submission | null>(
    null
  );
  const [createSubmitInFlight, setCreateSubmitInFlight] = useState(false);
  const createSubmitPendingRef = useRef(false);
  const updateSubmitPendingRef = useRef(false);
  const deleteSubmitPendingRef = useRef(false);

  const navigationIntent = navigation.formData?.get("intent")?.toString();
  const navigationSubmissionId = Number(
    navigation.formData?.get("submissionId") ?? "0"
  );
  const isCreatingSubmission =
    createSubmitInFlight ||
    (navigation.state !== "idle" && navigationIntent === "create_submission");
  const isUpdatingSubmission =
    navigation.state !== "idle" && navigationIntent === "update_submission";
  const isDeletingSubmission =
    navigation.state !== "idle" && navigationIntent === "delete_submission";

  useEffect(() => {
    if (navigation.state === "submitting") {
      if (navigationIntent === "create_submission") {
        createSubmitPendingRef.current = true;
      }

      if (navigationIntent === "update_submission") {
        updateSubmitPendingRef.current = true;
      }

      if (navigationIntent === "delete_submission") {
        deleteSubmitPendingRef.current = true;
      }

      return;
    }

    if (navigation.state !== "idle") {
      return;
    }

    if (createSubmitPendingRef.current) {
      if (!actionData?.error) {
        setNewSubmissionContent("");
      }
      setCreateSubmitInFlight(false);
      createSubmitPendingRef.current = false;
    }

    if (updateSubmitPendingRef.current) {
      if (!actionData?.error) {
        setEditingSubmission(null);
      }
      updateSubmitPendingRef.current = false;
    }

    if (deleteSubmitPendingRef.current) {
      if (!actionData?.error) {
        setDeletingSubmission(null);
      }
      deleteSubmitPendingRef.current = false;
    }
  }, [actionData?.error, navigation.state, navigationIntent]);

  useEffect(() => {
    if (!editingSubmission && !deletingSubmission) {
      return;
    }

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key !== "Escape") {
        return;
      }

      if (navigation.state !== "idle") {
        return;
      }

      setEditingSubmission(null);
      setDeletingSubmission(null);
    };

    window.addEventListener("keydown", handleEscape);
    return () => window.removeEventListener("keydown", handleEscape);
  }, [deletingSubmission, editingSubmission, navigation.state]);

  return (
    <div className="w-full flex justify-center px-3 pb-8">
      <div className="w-full max-w-[64rem]">
        <Breadcrumbs className="pt-3">
          <BreadcrumbItem href="/fantasy_football">Fantasy Football</BreadcrumbItem>
          <BreadcrumbItem href="/fantasy_football/rule_submission">
            Rule Submission
          </BreadcrumbItem>
        </Breadcrumbs>

        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between mt-2">
          <div>
            <h1 className="text-2xl font-bold">Rule Submission</h1>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
              Submit ideas throughout the year so they can be folded into next
              season's town hall ballot.
            </p>
          </div>
          <Form method="post" action="/fantasy_football/login" className="flex items-center gap-3">
            <p className="text-sm text-gray-600 dark:text-gray-400">
              {data.userEmail ?? "Signed in"}
            </p>
            <input type="hidden" name="intent" value="sign_out" />
            <input
              type="hidden"
              name="redirectTo"
              value="/fantasy_football/rule_submission"
            />
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

        <Form
          method="post"
          onSubmit={() => setCreateSubmitInFlight(true)}
          className="mt-6 rounded-xl bg-gray-100 dark:bg-zinc-900 p-6 space-y-3"
        >
          <input type="hidden" name="intent" value="create_submission" />
          <label htmlFor="rule-content" className="text-sm font-medium block">
            New rule proposal
          </label>
          <textarea
            id="rule-content"
            name="content"
            rows={5}
            value={newSubmissionContent}
            onChange={(event) => setNewSubmissionContent(event.target.value)}
            disabled={isCreatingSubmission}
            className="w-full rounded-lg border border-gray-300 dark:border-zinc-700 bg-white dark:bg-zinc-950 px-3 py-2"
            placeholder="Describe your rule change idea..."
            required
          />
          <button
            type="submit"
            disabled={isCreatingSubmission}
            className={`rounded-lg bg-orange-600 hover:bg-orange-700 text-white px-4 py-2 font-semibold transition-colors ${
              isCreatingSubmission ? "cursor-wait opacity-80" : ""
            }`}
          >
            {isCreatingSubmission ? (
              <span className="inline-flex items-center gap-2">
                <span
                  aria-hidden="true"
                  className="h-4 w-4 rounded-full border-2 border-white/70 border-t-transparent animate-spin"
                />
                Submitting...
              </span>
            ) : (
              "Submit Rule Change"
            )}
          </button>
        </Form>

        <div className="mt-8">
          <h2 className="text-lg font-semibold">Your Current Rule Change Submissions</h2>
          <div className="mt-3 space-y-4">
            {data.submissions.length === 0 ? (
              <div className="rounded-xl bg-gray-100 dark:bg-zinc-900 p-6 text-sm text-gray-600 dark:text-gray-400">
                No submissions yet.
              </div>
            ) : (
              data.submissions.map((submission) => {
                const canManage =
                  data.isCommissioner || submission.user_id === data.currentUserId;

                return (
                  <article
                    key={submission.id}
                    className="rounded-xl border border-gray-200 dark:border-zinc-800 bg-gray-100 dark:bg-zinc-900 p-6"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          Submitted {formatDate(submission.created_at)}
                        </p>
                        {data.isCommissioner ? (
                          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                            Manager: {submission.manager_name ?? `#${submission.manager_id}`}
                          </p>
                        ) : null}
                      </div>
                      {submission.updated_at !== submission.created_at ? (
                        <p className="text-xs text-gray-500 dark:text-gray-500">
                          Edited {formatDate(submission.updated_at)}
                        </p>
                      ) : null}

                      {canManage ? (
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            aria-label="Edit submission"
                            onClick={() => {
                              setEditingSubmission(submission);
                              setEditContent(submission.content);
                            }}
                            className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-gray-300 dark:border-zinc-700 text-gray-600 dark:text-gray-300 hover:border-orange-500 hover:text-orange-600 dark:hover:border-orange-400 dark:hover:text-orange-400 transition-colors"
                          >
                            <Icon name="pen-to-square" className="h-4 w-4" />
                          </button>
                          <button
                            type="button"
                            aria-label="Delete submission"
                            onClick={() => setDeletingSubmission(submission)}
                            className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-gray-300 dark:border-zinc-700 text-gray-600 dark:text-gray-300 hover:border-red-500 hover:text-red-500 dark:hover:border-red-400 dark:hover:text-red-400 transition-colors"
                          >
                            <Icon name="trash-can" className="h-4 w-4" />
                          </button>
                        </div>
                      ) : null}
                    </div>

                    <div className="mt-4 rounded-lg border border-gray-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 p-4">
                      <p className="whitespace-pre-wrap">{submission.content}</p>
                    </div>
                  </article>
                );
              })
            )}
          </div>
        </div>

        {editingSubmission ? (
          <Modal
            dismissDisabled={isUpdatingSubmission}
            maxWidthClassName="max-w-2xl"
            onDismiss={() => setEditingSubmission(null)}
            titleId={`edit-submission-title-${editingSubmission.id}`}
          >
              <h2
                id={`edit-submission-title-${editingSubmission.id}`}
                className="text-lg font-semibold"
              >
                Edit rule submission
              </h2>
              <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
                Update your submission text, then save your changes.
              </p>

              <Form method="post" className="mt-4 space-y-3">
                <input type="hidden" name="intent" value="update_submission" />
                <input
                  type="hidden"
                  name="submissionId"
                  value={editingSubmission.id}
                />
                <label htmlFor="edit-rule-content" className="text-sm font-medium block">
                  Rule proposal
                </label>
                <textarea
                  id="edit-rule-content"
                  name="content"
                  rows={5}
                  value={editContent}
                  onChange={(event) => setEditContent(event.target.value)}
                  className="w-full rounded-lg border border-gray-300 dark:border-zinc-700 bg-white dark:bg-zinc-950 px-3 py-2"
                  required
                />
                <div className="flex items-center justify-end gap-3 pt-1">
                  <button
                    type="button"
                    onClick={() => setEditingSubmission(null)}
                    disabled={isUpdatingSubmission}
                    className="rounded-lg border border-gray-300 dark:border-zinc-700 px-4 py-2 text-sm font-semibold text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-zinc-800 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isUpdatingSubmission}
                    className="rounded-lg bg-orange-600 hover:bg-orange-700 text-white px-4 py-2 text-sm font-semibold transition-colors"
                  >
                    {isUpdatingSubmission &&
                    navigationSubmissionId === editingSubmission.id
                      ? "Saving..."
                      : "Save"}
                  </button>
                </div>
              </Form>
          </Modal>
        ) : null}

        {deletingSubmission ? (
          <Modal
            dismissDisabled={isDeletingSubmission}
            maxWidthClassName="max-w-lg"
            onDismiss={() => setDeletingSubmission(null)}
            titleId={`delete-submission-title-${deletingSubmission.id}`}
          >
              <h2
                id={`delete-submission-title-${deletingSubmission.id}`}
                className="text-lg font-semibold"
              >
                Delete rule submission?
              </h2>
              <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
                This action cannot be undone.
              </p>
              <p className="mt-3 rounded-lg bg-gray-100 dark:bg-zinc-800 px-3 py-2 text-sm text-gray-700 dark:text-gray-200 whitespace-pre-wrap">
                {deletingSubmission.content}
              </p>

              <Form method="post" className="mt-5 flex items-center justify-end gap-3">
                <input type="hidden" name="intent" value="delete_submission" />
                <input
                  type="hidden"
                  name="submissionId"
                  value={deletingSubmission.id}
                />
                <button
                  type="button"
                  onClick={() => setDeletingSubmission(null)}
                  disabled={isDeletingSubmission}
                  className="rounded-lg border border-gray-300 dark:border-zinc-700 px-4 py-2 text-sm font-semibold text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-zinc-800 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isDeletingSubmission}
                  className="rounded-lg bg-red-600 hover:bg-red-700 text-white px-4 py-2 text-sm font-semibold transition-colors"
                >
                  {isDeletingSubmission &&
                  navigationSubmissionId === deletingSubmission.id
                    ? "Deleting..."
                    : "Delete"}
                </button>
              </Form>
          </Modal>
        ) : null}
      </div>
    </div>
  );
}
