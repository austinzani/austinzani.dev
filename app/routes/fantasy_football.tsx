import { Outlet, useLoaderData, useLocation, useOutletContext } from "@remix-run/react";

import type { LoaderFunctionArgs } from "@remix-run/node";
import type { Database } from "../../db_types";
import { getLeagueStats } from "~/utils/league-stats.server";
import {
    FantasyBackBar,
    FantasyHero,
} from "~/components/FantasyFootballUI";

export const loader = async (_: LoaderFunctionArgs) => {
    const leagueStats = await getLeagueStats();
    if (leagueStats.error) {
        return {
            error: leagueStats.error,
            managers: [],
            allTime: [],
            years: [],
            seasonCount: 0,
            activeTeamCount: 0,
            teamSeasonCount: 0,
            matchupCount: 0,
            latestChampionFirstName: null,
        }
    }

    return {
        error: null,
        managers: leagueStats.managers,
        allTime: leagueStats.allTime,
        years: leagueStats.years,
        seasonCount: leagueStats.seasonCount,
        activeTeamCount: leagueStats.activeTeamCount,
        teamSeasonCount: leagueStats.teamSeasonCount,
        matchupCount: leagueStats.matchupCount,
        latestChampionFirstName: leagueStats.latestChampionFirstName,
    }
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
                    />
                    {hero.showBack ? (
                        <FantasyBackBar to="/fantasy_football">
                            All-Time League
                        </FantasyBackBar>
                    ) : null}
                </>
            ) : null}
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
