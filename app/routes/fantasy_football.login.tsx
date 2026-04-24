import { json, redirect } from "@remix-run/node";
import type { ActionFunctionArgs, LoaderFunctionArgs } from "@remix-run/node";
import {
  Form,
  Link,
  useActionData,
  useLoaderData,
  useSubmit,
} from "@remix-run/react";
import { useEffect, useRef } from "react";

import {
  clearSupabaseAuthSession,
  commitSupabaseAuthSession,
  getAuthenticatedUser,
  sanitizeRedirectPath,
} from "~/utils/auth.server";
import { createSupabaseServerClient } from "~/utils/supabase.server";

type LoaderData = {
  isAuthenticated: boolean;
  errorCode: string | null;
  redirectTo: string;
  userEmail: string | null;
};

type ActionData = {
  email?: string;
  error?: string;
  message?: string;
  redirectTo: string;
};

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const url = new URL(request.url);
  const redirectTo = sanitizeRedirectPath(url.searchParams.get("redirectTo"));
  const errorCode = url.searchParams.get("error");
  const authCode = url.searchParams.get("code");
  const tokenHash = url.searchParams.get("token_hash");
  const tokenType = url.searchParams.get("type");

  // Handle PKCE callback links that return ?code=... in the URL.
  if (authCode) {
    const supabase = createSupabaseServerClient();
    const { data, error } = await supabase.auth.exchangeCodeForSession(authCode);

    if (error || !data.session) {
      throw redirect(
        `/fantasy_football/login?error=magic_link_failed&redirectTo=${encodeURIComponent(
          redirectTo
        )}`
      );
    }

    const setCookie = await commitSupabaseAuthSession(request, data.session);
    throw redirect(redirectTo, {
      headers: {
        "Set-Cookie": setCookie,
      },
    });
  }

  // Handle Supabase magic-link callbacks directly on this route.
  if (tokenHash && tokenType) {
    const supabase = createSupabaseServerClient();
    const { data, error } = await supabase.auth.verifyOtp({
      token_hash: tokenHash,
      type: tokenType as any,
    });

    if (error || !data.session) {
      throw redirect(
        `/fantasy_football/login?error=magic_link_failed&redirectTo=${encodeURIComponent(
          redirectTo
        )}`
      );
    }

    const setCookie = await commitSupabaseAuthSession(request, data.session);
    throw redirect(redirectTo, {
      headers: {
        "Set-Cookie": setCookie,
      },
    });
  }

  const auth = await getAuthenticatedUser(request);

  if (auth.user && errorCode !== "not_member") {
    throw redirect(redirectTo, {
      headers: auth.headers,
    });
  }

  return json<LoaderData>(
    {
      errorCode,
      isAuthenticated: Boolean(auth.user),
      redirectTo,
      userEmail: auth.user?.email ?? null,
    },
    {
      headers: auth.headers,
    }
  );
};

export const action = async ({ request }: ActionFunctionArgs) => {
  const formData = await request.formData();
  const intent = String(formData.get("intent") ?? "");
  const redirectTo = sanitizeRedirectPath(
    String(formData.get("redirectTo") ?? "/fantasy_football/town_hall")
  );

  if (intent === "sign_out") {
    const setCookie = await clearSupabaseAuthSession(request);
    return redirect(
      `/fantasy_football/login?redirectTo=${encodeURIComponent(redirectTo)}`,
      {
        headers: {
          "Set-Cookie": setCookie,
        },
      }
    );
  }

  const supabase = createSupabaseServerClient();

  if (intent === "send_code") {
    const email = String(formData.get("email") ?? "").trim().toLowerCase();
    const requestUrl = new URL(request.url);
    const emailRedirect = new URL("/fantasy_football/login", requestUrl.origin);
    emailRedirect.searchParams.set("redirectTo", redirectTo);

    if (!email) {
      return json<ActionData>(
        {
          error: "Enter the email tied to your league account.",
          redirectTo,
        },
        { status: 400 }
      );
    }

    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: emailRedirect.toString(),
        shouldCreateUser: false,
      },
    });

    if (error) {
      // Business rule: unknown league emails should show a commissioner-directed message.
      const normalizedError = error.message.toLowerCase();
      const isUnknownLeagueEmail =
        normalizedError.includes("signups not allowed for otp") ||
        normalizedError.includes("user not found");

      return json<ActionData>(
        {
          email,
          error: isUnknownLeagueEmail
            ? "Unknown email. Reach out to commissioner with questions."
            : error.message,
          redirectTo,
        },
        { status: 400 }
      );
    }

    return json<ActionData>({
      email,
      message:
        "Sign-in link sent. Check your email and click the magic link to continue.",
      redirectTo,
    });
  }

  if (intent === "verify_code") {
    const email = String(formData.get("email") ?? "").trim().toLowerCase();
    const token = String(formData.get("token") ?? "").trim();

    if (!email || !token) {
      return json<ActionData>(
        {
          email,
          error: "Enter both email and the code from your email.",
          redirectTo,
        },
        { status: 400 }
      );
    }

    const { data, error } = await supabase.auth.verifyOtp({
      email,
      token,
      type: "email",
    });

    if (error || !data.session) {
      return json<ActionData>(
        {
          email,
          error: error?.message ?? "Unable to verify code.",
          redirectTo,
        },
        { status: 400 }
      );
    }

    const setCookie = await commitSupabaseAuthSession(request, data.session);

    return redirect(redirectTo, {
      headers: {
        "Set-Cookie": setCookie,
      },
    });
  }

  // Handle implicit-flow callbacks where Supabase sends tokens in URL hash.
  if (intent === "consume_hash_session") {
    const accessToken = String(formData.get("accessToken") ?? "").trim();
    const refreshToken = String(formData.get("refreshToken") ?? "").trim();

    if (!accessToken || !refreshToken) {
      return json<ActionData>(
        {
          error: "Magic link callback was missing token data.",
          redirectTo,
        },
        { status: 400 }
      );
    }

    const { data, error } = await supabase.auth.setSession({
      access_token: accessToken,
      refresh_token: refreshToken,
    });

    if (error || !data.session) {
      return json<ActionData>(
        {
          error: error?.message ?? "Unable to complete magic link sign-in.",
          redirectTo,
        },
        { status: 400 }
      );
    }

    const setCookie = await commitSupabaseAuthSession(request, data.session);
    return redirect(redirectTo, {
      headers: {
        "Set-Cookie": setCookie,
      },
    });
  }

  return json<ActionData>(
    {
      error: "Unknown form action.",
      redirectTo,
    },
    { status: 400 }
  );
};

export default function FantasyFootballLoginRoute() {
  const { errorCode, isAuthenticated, redirectTo, userEmail } =
    useLoaderData<typeof loader>();
  const actionData = useActionData<typeof action>();
  const submit = useSubmit();
  const hashConsumptionTriggered = useRef(false);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    if (hashConsumptionTriggered.current) {
      return;
    }

    const hash = window.location.hash.startsWith("#")
      ? window.location.hash.slice(1)
      : window.location.hash;
    if (!hash) {
      return;
    }

    const hashParams = new URLSearchParams(hash);
    const accessToken = hashParams.get("access_token");
    const refreshToken = hashParams.get("refresh_token");

    if (!accessToken || !refreshToken) {
      return;
    }

    hashConsumptionTriggered.current = true;
    // Remove sensitive tokens from URL immediately before posting.
    window.history.replaceState(
      {},
      document.title,
      `${window.location.pathname}${window.location.search}`
    );

    const formData = new FormData();
    formData.set("intent", "consume_hash_session");
    formData.set("redirectTo", redirectTo);
    formData.set("accessToken", accessToken);
    formData.set("refreshToken", refreshToken);
    submit(formData, { method: "post" });
  }, [redirectTo, submit]);

  return (
    <div className="min-h-[calc(100vh-3.5rem)] w-full flex items-center justify-center px-3 py-8">
      <div className="w-full max-w-xl bg-gray-100 dark:bg-zinc-900 rounded-xl p-6 shadow-sm dark:shadow-none">
        <h1 className="text-2xl font-bold">Fantasy Football Login</h1>
        <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">
          Sign in with your league email to access Town Hall and Rule Submission.
        </p>
        <p className="text-xs text-gray-500 dark:text-gray-500 mt-2">
          Enter your email and we will send you a secure login link.
        </p>

        {errorCode === "not_member" ? (
          <p className="mt-4 text-sm text-red-500">
            Your account is authenticated but not mapped to a league membership
            yet.
          </p>
        ) : null}

        {errorCode === "magic_link_failed" ? (
          <p className="mt-4 text-sm text-red-500">
            Magic link verification failed. Request a new code or link and try
            again.
          </p>
        ) : null}

        {isAuthenticated && errorCode === "not_member" ? (
          <Form method="post" className="mt-4">
            <input type="hidden" name="intent" value="sign_out" />
            <input type="hidden" name="redirectTo" value={redirectTo} />
            <button
              type="submit"
              className="rounded-lg border border-orange-500 px-3 py-1.5 text-sm text-orange-600 dark:text-orange-400 hover:bg-orange-500 hover:text-white transition-colors"
            >
              Sign out {userEmail ? `(${userEmail})` : ""}
            </button>
          </Form>
        ) : null}

        {actionData?.error ? (
          <p className="mt-4 text-sm text-red-500">{actionData.error}</p>
        ) : null}

        {actionData?.message ? (
          <p className="mt-4 text-sm text-emerald-500">{actionData.message}</p>
        ) : null}

        {!isAuthenticated ? (
          <Form method="post" className="mt-6 space-y-3">
            <input type="hidden" name="intent" value="send_code" />
            <input type="hidden" name="redirectTo" value={redirectTo} />
            <label className="block text-sm font-medium" htmlFor="send-email">
              Email
            </label>
            <input
              id="send-email"
              name="email"
              type="email"
              defaultValue={actionData?.email ?? ""}
              className="w-full rounded-lg border border-gray-300 dark:border-zinc-700 bg-white dark:bg-zinc-950 px-3 py-2"
              required
            />
            <button
              type="submit"
              className="w-full rounded-lg bg-orange-600 hover:bg-orange-700 text-white py-2 font-semibold transition-colors"
            >
              Send Sign-In Link
            </button>
          </Form>
        ) : (
          <p className="mt-6 text-sm text-gray-600 dark:text-gray-400">
            Ask the commissioner to add your user to `league_memberships`, then
            sign in again.
          </p>
        )}

        <div className="mt-6 pt-4 border-t border-gray-200 dark:border-zinc-800">
          <Link
            className="text-sm text-orange-600 dark:text-orange-400 hover:underline"
            to="/fantasy_football"
          >
            Return to Fantasy Football home
          </Link>
        </div>
      </div>
    </div>
  );
}
