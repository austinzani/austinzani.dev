import { json, redirect } from "@remix-run/node";
import type { ActionFunctionArgs, LoaderFunctionArgs } from "@remix-run/node";
import {
  Form,
  Link,
  useActionData,
  useLoaderData,
  useSubmit,
} from "@remix-run/react";
import { useEffect, useRef, useState } from "react";

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
  googleEnabled: boolean;
  redirectTo: string;
  userEmail: string | null;
};

type ActionData = {
  email?: string;
  error?: string;
  message?: string;
  redirectTo: string;
};

type AuthExternalProviders = {
  [provider: string]: boolean | undefined;
  google?: boolean;
};

function GoogleMarkIcon() {
  return (
    <svg aria-hidden="true" className="h-5 w-5" viewBox="0 0 18 18">
      <path
        d="M17.64 9.2045c0-.6382-.0573-1.2518-.1636-1.8409H9v3.4818h4.8436c-.2086 1.125-.8427 2.0795-1.7972 2.7177v2.2586h2.9086c1.7018-1.5668 2.685-3.8741 2.685-6.6172z"
        fill="#4285F4"
      />
      <path
        d="M9 18c2.43 0 4.4673-.8068 5.9564-2.1782l-2.9086-2.2586c-.8068.5409-1.84.8591-3.0477.8591-2.3441 0-4.3286-1.5832-5.0377-3.7105H.9573v2.3318C2.4382 15.9832 5.4818 18 9 18z"
        fill="#34A853"
      />
      <path
        d="M3.9627 10.7118c-.18-.5409-.2823-1.1186-.2823-1.7118 0-.5932.1023-1.1709.2823-1.7118V4.9568H.9573C.3477 6.1718 0 7.5482 0 9s.3477 2.8282.9573 4.0432l3.0054-2.3314z"
        fill="#FBBC05"
      />
      <path
        d="M9 3.5773c1.3214 0 2.5082.4541 3.4418 1.3459l2.5814-2.5814C13.4632.8918 11.4259 0 9 0 5.4818 0 2.4382 2.0168.9573 4.9568l3.0054 2.3318C4.6714 5.1605 6.6559 3.5773 9 3.5773z"
        fill="#EA4335"
      />
    </svg>
  );
}

function normalizeOrigin(rawOrigin: string | null) {
  if (!rawOrigin) {
    return null;
  }

  try {
    const url = new URL(rawOrigin);
    if (url.protocol !== "http:" && url.protocol !== "https:") {
      return null;
    }

    return url.origin;
  } catch {
    return null;
  }
}

/**
 * Uses the submitting browser origin for auth redirects when available.
 * Falls back to forwarded headers/request URL for non-JS clients or proxies.
 */
function resolveAuthOrigin(request: Request, submittedOrigin: string | null) {
  const normalizedSubmittedOrigin = normalizeOrigin(submittedOrigin);
  if (normalizedSubmittedOrigin) {
    return normalizedSubmittedOrigin;
  }

  const requestUrl = new URL(request.url);
  const forwardedProto = request.headers
    .get("x-forwarded-proto")
    ?.split(",")[0]
    ?.trim();
  const forwardedHost = request.headers
    .get("x-forwarded-host")
    ?.split(",")[0]
    ?.trim();
  const host = request.headers
    .get("host")
    ?.split(",")[0]
    ?.trim();

  const protocol = forwardedProto || requestUrl.protocol.replace(":", "");
  const hostname = forwardedHost || host;

  if (hostname) {
    return `${protocol}://${hostname}`;
  }

  return requestUrl.origin;
}

/**
 * Reads Supabase auth provider availability from the hosted auth settings API.
 */
async function getAuthExternalProviders(): Promise<AuthExternalProviders> {
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    return {};
  }

  try {
    const settingsResponse = await fetch(`${supabaseUrl}/auth/v1/settings`, {
      headers: {
        apikey: supabaseAnonKey,
        authorization: `Bearer ${supabaseAnonKey}`,
      },
    });

    if (!settingsResponse.ok) {
      return {};
    }

    const settings = (await settingsResponse.json()) as {
      external?: AuthExternalProviders;
    };

    return settings.external ?? {};
  } catch {
    return {};
  }
}

async function isGoogleAuthEnabled() {
  const externalProviders = await getAuthExternalProviders();
  return Boolean(externalProviders.google);
}

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
  const googleEnabled = await isGoogleAuthEnabled();

  if (auth.user && errorCode !== "not_member") {
    throw redirect(redirectTo, {
      headers: auth.headers,
    });
  }

  return json<LoaderData>(
    {
      errorCode,
      googleEnabled,
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

  if (intent === "oauth_google") {
    const googleEnabled = await isGoogleAuthEnabled();
    if (!googleEnabled) {
      return json<ActionData>(
        {
          error:
            "Google sign-in is not enabled yet. Use email + password for now.",
          redirectTo,
        },
        { status: 400 }
      );
    }

    const submittedOrigin = String(formData.get("origin") ?? "");
    const authOrigin = resolveAuthOrigin(request, submittedOrigin);
    const callbackUrl = new URL("/fantasy_football/login", authOrigin);
    callbackUrl.searchParams.set("redirectTo", redirectTo);

    const { data, error } = await supabase.auth.signInWithOAuth({
      options: {
        redirectTo: callbackUrl.toString(),
        skipBrowserRedirect: true,
      },
      provider: "google",
    });

    if (error) {
      const normalizedError = error.message.toLowerCase();
      const isProviderNotConfigured =
        normalizedError.includes("provider is not enabled") ||
        normalizedError.includes("unsupported provider");

      return json<ActionData>(
        {
          error: isProviderNotConfigured
            ? "Google sign-in is not configured yet. Use email + password for now."
            : error.message,
          redirectTo,
        },
        { status: 400 }
      );
    }

    if (!data.url) {
      return json<ActionData>(
        {
          error: "Unable to start Google sign-in right now.",
          redirectTo,
        },
        { status: 500 }
      );
    }

    return redirect(data.url);
  }

  if (intent === "password_sign_in") {
    const email = String(formData.get("email") ?? "").trim().toLowerCase();
    const password = String(formData.get("password") ?? "");

    if (!email || !password) {
      return json<ActionData>(
        {
          email,
          error: "Enter both email and password.",
          redirectTo,
        },
        { status: 400 }
      );
    }

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error || !data.session) {
      const normalizedError = error.message.toLowerCase();
      const isInvalidCredentials =
        normalizedError.includes("invalid login credentials") ||
        normalizedError.includes("email not confirmed");

      return json<ActionData>(
        {
          email,
          error: isInvalidCredentials
            ? "Invalid email/password or email not confirmed."
            : error.message,
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

  if (intent === "password_sign_up") {
    const email = String(formData.get("email") ?? "").trim().toLowerCase();
    const password = String(formData.get("password") ?? "");
    const submittedOrigin = String(formData.get("origin") ?? "");
    const authOrigin = resolveAuthOrigin(request, submittedOrigin);
    const callbackUrl = new URL("/fantasy_football/login", authOrigin);
    callbackUrl.searchParams.set("redirectTo", redirectTo);

    if (!email || !password) {
      return json<ActionData>(
        {
          email,
          error: "Enter both email and password to create an account.",
          redirectTo,
        },
        { status: 400 }
      );
    }

    if (password.length < 6) {
      return json<ActionData>(
        {
          email,
          error: "Password must be at least 6 characters.",
          redirectTo,
        },
        { status: 400 }
      );
    }

    const { data, error } = await supabase.auth.signUp({
      email,
      options: {
        emailRedirectTo: callbackUrl.toString(),
      },
      password,
    });

    if (error) {
      const normalizedError = error.message.toLowerCase();
      const isRateLimitError = normalizedError.includes("rate limit");

      return json<ActionData>(
        {
          email,
          error: isRateLimitError
            ? "Too many auth emails sent recently. Please wait and try again."
            : error?.message ?? "Unable to create account right now.",
          redirectTo,
        },
        { status: 400 }
      );
    }

    if (data.session) {
      const setCookie = await commitSupabaseAuthSession(request, data.session);
      return redirect(redirectTo, {
        headers: {
          "Set-Cookie": setCookie,
        },
      });
    }

    return json<ActionData>({
      email,
      message:
        "Account created. Check your email to confirm your account, then sign in.",
      redirectTo,
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
  const { errorCode, googleEnabled, isAuthenticated, redirectTo, userEmail } =
    useLoaderData<typeof loader>();
  const actionData = useActionData<typeof action>();
  const submit = useSubmit();
  const hashConsumptionTriggered = useRef(false);
  const [browserOrigin, setBrowserOrigin] = useState("");

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    setBrowserOrigin(window.location.origin);
  }, []);

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
          {googleEnabled
            ? "Continue with Google or use email + password."
            : "Use email + password to sign in."}
        </p>

        {errorCode === "not_member" ? (
          <p className="mt-4 text-sm text-red-500">
            You are signed in, but your league access is pending commissioner
            approval.
          </p>
        ) : null}

        {errorCode === "magic_link_failed" ? (
          <p className="mt-4 text-sm text-red-500">
            Sign-in callback failed. Start a new sign-in attempt and try again.
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
          <div className="mt-6 space-y-6">
            {googleEnabled ? (
              <>
                <Form method="post" className="space-y-3">
                  <input type="hidden" name="intent" value="oauth_google" />
                  <input type="hidden" name="redirectTo" value={redirectTo} />
                  <input type="hidden" name="origin" value={browserOrigin} />
                  <button
                    type="submit"
                    className="w-full rounded-lg bg-white border border-[#DADCE0] text-[#3C4043] py-2.5 px-4 font-semibold transition-colors hover:bg-gray-50 flex items-center justify-center gap-3"
                  >
                    <GoogleMarkIcon />
                    <span>Sign in with Google</span>
                  </button>
                </Form>

                <div className="flex items-center gap-3">
                  <span className="h-px flex-1 bg-gray-300 dark:bg-zinc-700" />
                  <span className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">
                    Or
                  </span>
                  <span className="h-px flex-1 bg-gray-300 dark:bg-zinc-700" />
                </div>
              </>
            ) : (
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Google sign-in is currently unavailable for this project.
              </p>
            )}

            <Form method="post" className="space-y-3">
              <input type="hidden" name="redirectTo" value={redirectTo} />
              <input type="hidden" name="origin" value={browserOrigin} />
              <label className="block text-sm font-medium" htmlFor="auth-email">
                Email
              </label>
              <input
                id="auth-email"
                name="email"
                type="email"
                autoComplete="email"
                defaultValue={actionData?.email ?? ""}
                className="w-full rounded-lg border border-gray-300 dark:border-zinc-700 bg-white dark:bg-zinc-950 px-3 py-2"
                required
              />
              <label className="block text-sm font-medium" htmlFor="auth-password">
                Password
              </label>
              <input
                id="auth-password"
                name="password"
                type="password"
                autoComplete="current-password"
                className="w-full rounded-lg border border-gray-300 dark:border-zinc-700 bg-white dark:bg-zinc-950 px-3 py-2"
                minLength={6}
                required
              />

              <div className="grid gap-3 sm:grid-cols-2">
                <button
                  name="intent"
                  value="password_sign_in"
                  type="submit"
                  className="w-full rounded-lg bg-orange-600 hover:bg-orange-700 text-white py-2 font-semibold transition-colors"
                >
                  Sign In
                </button>
                <button
                  name="intent"
                  value="password_sign_up"
                  type="submit"
                  className="w-full rounded-lg border border-orange-500 text-orange-600 dark:text-orange-400 hover:bg-orange-500 hover:text-white py-2 font-semibold transition-colors"
                >
                  Create Account
                </button>
              </div>
            </Form>
          </div>
        ) : (
          <p className="mt-6 text-sm text-gray-600 dark:text-gray-400">
            Your account is signed in, but league access is pending commissioner
            approval.
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
