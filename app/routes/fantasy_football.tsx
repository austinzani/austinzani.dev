import { json } from "@remix-run/node";
import { Outlet, useLoaderData, useLocation, useOutletContext } from "@remix-run/react";
import type { ShouldRevalidateFunction } from "@remix-run/react";

import type { LoaderFunctionArgs } from "@remix-run/node";
import type { Database } from "../../db_types";
import { getLeagueStats } from "~/utils/league-stats.server";
import { getFantasyMemberStatus } from "~/utils/fantasy-auth.server";
import {
    FantasyBackBar,
    FantasyHero,
    FantasyMenu,
    FantasyMenuBar,
} from "~/components/FantasyFootballUI";
import { TDS_SPORT_NAMES } from "~/utils/tour_de_sport/scoreboard";

export const loader = async ({ request }: LoaderFunctionArgs) => {
    const [leagueStats, memberStatus] = await Promise.all([
        getLeagueStats(),
        getFantasyMemberStatus(request),
    ]);
    if (leagueStats.error) {
        return json({
            error: leagueStats.error,
            managers: [],
            allTime: [],
            years: [],
            seasonCount: 0,
            activeTeamCount: 0,
            teamSeasonCount: 0,
            matchupCount: 0,
            latestChampionFirstName: null,
            isMember: memberStatus.isMember,
        }, { headers: memberStatus.headers })
    }

    return json({
        error: null,
        managers: leagueStats.managers,
        allTime: leagueStats.allTime,
        years: leagueStats.years,
        seasonCount: leagueStats.seasonCount,
        activeTeamCount: leagueStats.activeTeamCount,
        teamSeasonCount: leagueStats.teamSeasonCount,
        matchupCount: leagueStats.matchupCount,
        latestChampionFirstName: leagueStats.latestChampionFirstName,
        isMember: memberStatus.isMember,
    }, { headers: memberStatus.headers })
}

export const shouldRevalidate: ShouldRevalidateFunction = ({
    formAction,
    defaultShouldRevalidate,
}) => {
    if (formAction) {
        return defaultShouldRevalidate;
    }

    return false;
}
type ContextType = { managers: {id: number, name: string}[], allTime: Database["public"]["CompositeTypes"]["all_time_object"][], years: {key: string, value: string}[], latestChampionFirstName: string | null }

function getFantasyHeroCopy(pathname: string, latestChampionFirstName: string | null) {
    if (pathname.includes("/season/")) {
        const year = pathname.split("/season/")[1]?.split("/")[0];
        return {
            eyebrow: "Season Archive",
            title: `${year} Season`,
            subtitle: "Standings, scoring notes, and week-by-week matchup history.",
            showBack: true,
        };
    }

    if (pathname.includes("/manager/")) {
        return {
            eyebrow: "Manager File",
            title: "Manager Ledger",
            subtitle: "Season history, all-time profile, and rivalry records.",
            showBack: true,
        };
    }

    if (pathname.includes("/head_to_head")) {
        return {
            eyebrow: "Head-to-Head",
            title: "Rivalry Report",
            subtitle: "All-time comparison plus the complete matchup history.",
            showBack: true,
        };
    }

    if (pathname.includes("/matchups")) {
        return {
            eyebrow: "Weekly Scorecard",
            title: "Matchup Archive",
            subtitle: "Every game card for the selected week.",
            showBack: true,
        };
    }

    if (pathname.includes("/tour_de_sport/admin")) {
        return {
            eyebrow: "Commissioner Console",
            title: "The Admin Desk",
            subtitle: "Sport status flips, manual score overrides, and emergency reassignments. Every change lands flagged on the public board.",
            showBack: true,
        };
    }

    if (pathname.includes("/tour_de_sport/draw")) {
        return {
            eyebrow: "Commissioner Console",
            title: "The Draw",
            subtitle: "Season Lock and the live sport-by-sport Draw. Commissioner only — everything run from here is final.",
            showBack: true,
        };
    }

    // Per-sport detail pages: the hero switch is pathname-only, so the sport
    // name comes from the frozen key → name map; unknown keys fall through to
    // the generic Tour de Sport hero (which the 404 boundary renders under).
    const tourDeSportSegment = pathname
        .split("/tour_de_sport/")[1]
        ?.split("/")[0];
    if (tourDeSportSegment && TDS_SPORT_NAMES[tourDeSportSegment]) {
        return {
            eyebrow: "Tour de Sport — Season 1",
            title: TDS_SPORT_NAMES[tourDeSportSegment],
            subtitle:
                "One Sport's full board — every Participant's Entity, its real-world standing, and the points it pays toward the season total.",
            showBack: true,
        };
    }

    if (pathname.includes("/tour_de_sport")) {
        return {
            eyebrow: "Season 1 — 2027",
            title: "Tour de Sport",
            subtitle: "Fourteen participants, twelve sports, one entity apiece — assigned by a live Draw and scored off real-world results all year.",
            showBack: true,
        };
    }

    if (pathname.includes("/constitution")) {
        return {
            eyebrow: "League Governance",
            title: "The Constitution",
            subtitle: "The league's living rulebook. Fees, rosters, scoring, and the rules of play, amended each spring at the Town Hall.",
            showBack: true,
        };
    }

    if (pathname.includes("/all_time")) {
        return {
            eyebrow: "Established 2011 — All-Time League",
            title: `${latestChampionFirstName ?? "Zak"}'s League to Lose`,
            subtitle: "Every season, every matchup, every grudge since 2011.",
            showBack: false,
        };
    }

    return {
        eyebrow: "Established 2011 — All-Time League",
        title: `${latestChampionFirstName ?? "Zak"}'s League to Lose`,
        subtitle: "Every season, every matchup, every grudge since 2011.",
        showBack: false,
    };
}

export default function Index() {
    const {
        managers,
        allTime,
        years,
        seasonCount,
        matchupCount,
        latestChampionFirstName,
        isMember,
    } = useLoaderData<typeof loader>()
    const location = useLocation();
    const hero = getFantasyHeroCopy(location.pathname, latestChampionFirstName);
    const isArchiveRoot = location.pathname === "/fantasy_football" || location.pathname === "/fantasy_football/";
    const shouldUseArchiveShell = !(
        location.pathname.includes("/login") ||
        location.pathname.includes("/town_hall") ||
        location.pathname.includes("/rule_submission")
    );

    return (
        <div className="w-full">
            {shouldUseArchiveShell ? (
                <>
                    <FantasyHero
                        eyebrow={
                            isArchiveRoot
                                ? `Established 2011 — ${seasonCount} Seasons — ${managers.length} Managers`
                                : hero.eyebrow
                        }
                        title={hero.title}
                        subtitle={hero.subtitle}
                        metrics={isArchiveRoot ? [
                            { label: "Seasons", value: seasonCount },
                            { label: "Managers", value: managers.length },
                            { label: "Matchups", value: matchupCount },
                            { label: "Reigning Champ", value: latestChampionFirstName ?? "TBD", highlight: true },
                        ] : undefined}
                        menu={<FantasyMenu isMember={isMember} />}
                    />
                    {hero.showBack ? (
                        <FantasyBackBar to="/fantasy_football">
                            All-Time League
                        </FantasyBackBar>
                    ) : null}
                </>
            ) : (
                <FantasyMenuBar>
                    <FantasyMenu isMember={isMember} />
                </FantasyMenuBar>
            )}
            <Outlet context={{
                managers,
                allTime,
                years,
                latestChampionFirstName
            }} />
        </div>

    );
}

export const useFootballContext = () => {
    return useOutletContext<ContextType>();
}
