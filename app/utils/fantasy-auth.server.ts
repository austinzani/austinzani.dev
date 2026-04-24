import { redirect } from "@remix-run/node";

import {
  requireAuthenticatedUser,
  sanitizeRedirectPath,
} from "~/utils/auth.server";
import { createSupabaseServerClient } from "~/utils/supabase.server";

export type LeagueRole = "commissioner" | "manager";

type LeagueRecord = {
  id: number;
  name: string;
  slug: string;
};

type MembershipRecord = {
  id: number;
  league_id: number;
  manager_id: number;
  role: LeagueRole;
};

export type FantasyMemberContext = {
  headers: Headers;
  isCommissioner: boolean;
  league: LeagueRecord;
  membership: MembershipRecord;
  role: LeagueRole;
  supabase: any;
  user: {
    email: string | null;
    id: string;
  };
};

const DEFAULT_LEAGUE_SLUG =
  process.env.FANTASY_LEAGUE_SLUG ?? "zaks-league-to-lose";

/**
 * Resolves the current user as a league member and enforces optional roles.
 */
export async function requireFantasyMember(
  request: Request,
  allowedRoles?: LeagueRole[]
): Promise<FantasyMemberContext> {
  const auth = await requireAuthenticatedUser(request);
  const supabase = createSupabaseServerClient(auth.accessToken);
  // Resolve membership first so non-members are redirected cleanly instead of
  // hitting a false 500 from league RLS filtering.
  const { data: membershipRow, error: membershipError } = await supabase
    .from("league_memberships")
    .select("id, league_id, manager_id, role, league:leagues!inner(id, name, slug)")
    .eq("user_id", auth.user.id)
    .eq("leagues.slug", DEFAULT_LEAGUE_SLUG)
    .maybeSingle();

  if (membershipError) {
    throw new Response("Unable to verify fantasy league membership.", {
      status: 500,
      headers: auth.headers,
    });
  }

  if (!membershipRow) {
    const requestUrl = new URL(request.url);
    const redirectTo = sanitizeRedirectPath(
      `${requestUrl.pathname}${requestUrl.search}`
    );

    throw redirect(
      `/fantasy_football/login?redirectTo=${encodeURIComponent(
        redirectTo
      )}&error=not_member`,
      {
        headers: auth.headers,
      }
    );
  }

  const leagueValue = Array.isArray((membershipRow as any).league)
    ? (membershipRow as any).league[0]
    : (membershipRow as any).league;

  if (!leagueValue) {
    throw new Response("League configuration is missing for this membership.", {
      status: 500,
      headers: auth.headers,
    });
  }

  const role = membershipRow.role as LeagueRole;

  if (allowedRoles && !allowedRoles.includes(role)) {
    throw new Response("You do not have access to this page.", {
      status: 403,
      headers: auth.headers,
    });
  }

  return {
    headers: auth.headers,
    isCommissioner: role === "commissioner",
    league: leagueValue as LeagueRecord,
    membership: membershipRow as MembershipRecord,
    role,
    supabase,
    user: {
      email: auth.user.email ?? null,
      id: auth.user.id,
    },
  };
}
