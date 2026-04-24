import { createCookieSessionStorage, redirect } from "@remix-run/node";
import type { Session } from "@remix-run/node";
import type {
  Session as SupabaseSession,
  User,
} from "@supabase/supabase-js";

import { createSupabaseServerClient } from "~/utils/supabase.server";

const sessionSecret = process.env.SESSION_SECRET;
if (!sessionSecret) {
  throw new Error("SESSION_SECRET must be set");
}

const ACCESS_TOKEN_KEY = "access_token";
const REFRESH_TOKEN_KEY = "refresh_token";
const USER_ID_KEY = "user_id";
const USER_EMAIL_KEY = "user_email";

const authStorage = createCookieSessionStorage({
  cookie: {
    name: "__ff_auth",
    secure: process.env.NODE_ENV === "production",
    secrets: [sessionSecret],
    sameSite: "lax",
    path: "/",
    httpOnly: true,
    maxAge: 60 * 60 * 24 * 30,
  },
});

export type AuthenticatedUser = {
  accessToken: string;
  headers: Headers;
  refreshToken: string;
  user: User;
};

/**
 * Restricts a redirect target to local paths to avoid open redirects.
 */
export function sanitizeRedirectPath(redirectTo: string | null | undefined) {
  if (!redirectTo || !redirectTo.startsWith("/") || redirectTo.startsWith("//")) {
    return "/fantasy_football/town_hall";
  }

  return redirectTo;
}

async function getAuthSession(request: Request) {
  return authStorage.getSession(request.headers.get("Cookie"));
}

function storeSessionValues(session: Session, supabaseSession: SupabaseSession) {
  session.set(ACCESS_TOKEN_KEY, supabaseSession.access_token);
  session.set(REFRESH_TOKEN_KEY, supabaseSession.refresh_token);
  session.set(USER_ID_KEY, supabaseSession.user.id);
  session.set(USER_EMAIL_KEY, supabaseSession.user.email ?? null);
}

/**
 * Stores a Supabase auth session in an httpOnly cookie.
 */
export async function commitSupabaseAuthSession(
  request: Request,
  supabaseSession: SupabaseSession
) {
  const session = await getAuthSession(request);
  storeSessionValues(session, supabaseSession);
  return authStorage.commitSession(session);
}

/**
 * Removes the fantasy-football auth cookie for the current request.
 */
export async function clearSupabaseAuthSession(request: Request) {
  const session = await getAuthSession(request);
  return authStorage.destroySession(session);
}

/**
 * Returns the authenticated user when a valid auth cookie is present.
 *
 * If the access token expired, this attempts a refresh and emits a new cookie
 * in returned headers.
 */
export async function getAuthenticatedUser(request: Request): Promise<{
  accessToken: string | null;
  headers: Headers;
  refreshToken: string | null;
  user: User | null;
}> {
  const authSession = await getAuthSession(request);
  const headers = new Headers();

  const accessToken = authSession.get(ACCESS_TOKEN_KEY) as string | undefined;
  const refreshToken = authSession.get(REFRESH_TOKEN_KEY) as string | undefined;

  if (!accessToken || !refreshToken) {
    return {
      accessToken: null,
      headers,
      refreshToken: null,
      user: null,
    };
  }

  const supabase = createSupabaseServerClient();
  const userResult = await supabase.auth.getUser(accessToken);

  if (userResult.data.user) {
    return {
      accessToken,
      headers,
      refreshToken,
      user: userResult.data.user,
    };
  }

  const refreshResult = await supabase.auth.refreshSession({
    refresh_token: refreshToken,
  });

  if (refreshResult.error || !refreshResult.data.session) {
    headers.append("Set-Cookie", await authStorage.destroySession(authSession));
    return {
      accessToken: null,
      headers,
      refreshToken: null,
      user: null,
    };
  }

  storeSessionValues(authSession, refreshResult.data.session);
  headers.append("Set-Cookie", await authStorage.commitSession(authSession));

  const refreshedUser =
    refreshResult.data.user ??
    (await supabase.auth.getUser(refreshResult.data.session.access_token)).data.user;

  if (!refreshedUser) {
    headers.set("Set-Cookie", await authStorage.destroySession(authSession));
    return {
      accessToken: null,
      headers,
      refreshToken: null,
      user: null,
    };
  }

  return {
    accessToken: refreshResult.data.session.access_token,
    headers,
    refreshToken: refreshResult.data.session.refresh_token,
    user: refreshedUser,
  };
}

/**
 * Enforces an authenticated user and redirects to login when absent.
 */
export async function requireAuthenticatedUser(
  request: Request
): Promise<AuthenticatedUser> {
  const auth = await getAuthenticatedUser(request);

  if (!auth.user || !auth.accessToken || !auth.refreshToken) {
    const requestUrl = new URL(request.url);
    const redirectTo = sanitizeRedirectPath(
      `${requestUrl.pathname}${requestUrl.search}`
    );

    throw redirect(`/fantasy_football/login?redirectTo=${encodeURIComponent(redirectTo)}`, {
      headers: auth.headers,
    });
  }

  return {
    accessToken: auth.accessToken,
    headers: auth.headers,
    refreshToken: auth.refreshToken,
    user: auth.user,
  };
}
