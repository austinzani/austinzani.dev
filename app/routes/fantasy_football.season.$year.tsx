import {useLoaderData, useNavigate, useSearchParams} from "@remix-run/react";
import React, {useState} from "react";
import supabase from "~/utils/supabase";

import {capitalizeFirstLetter} from "~/utils/helpers";

import type {LoaderFunctionArgs} from "@remix-run/node";
import type {Database} from "../../db_types";

import {useFootballContext} from "~/routes/fantasy_football";

import {BreadcrumbItem, Breadcrumbs} from "~/components/Breadcrumb";
import ScrollablePills from "~/components/ScrollablePills";
import ManagerAvatar from "~/components/ManagerAvatar";
import {ScoreCardGroup} from "~/components/ScoreCard";
import EmptyState from "~/components/EmptyState";
import ErrorState from "~/components/ErrorState";
import {
    FantasyMain,
    FantasySectionHeading,
    FantasyStatCard,
    HighLowPair,
    fantasyTableBodyClass,
    fantasyTableFrozenColWrapClass,
    fantasyTableHeadHeightClass,
    fantasyTableHeadRowClass,
    fantasyTableRowClass,
    fantasyTableRowHeightClass,
    fantasyTableShellClass,
} from "~/components/FantasyFootballUI";

type SeasonWeek = {
    week: number;
    isPlayoffs: boolean;
    matchups: Database["public"]["CompositeTypes"]["game_details"][];
};

export const loader = async ({params}: LoaderFunctionArgs) => {
    const season = params.year;
    if (season) {
        const seasonInt = parseInt(season);
        if (!seasonInt) {
            return {
                error: "Invalid season",
                season: null,
                year: seasonInt
            }
        }

        const [standingsResult, seasonMetaResult] = await Promise.all([
            supabase.rpc('season_details', {season_year: seasonInt}),
            supabase.from('season').select().eq('year', seasonInt).maybeSingle(),
        ]);

        const {data: seasonResponse, error: seasonError} = standingsResult;
        const {data: seasonMeta, error: seasonMetaError} = seasonMetaResult;

        // Sort by total wins descending and use most points for as tie breaker
        seasonResponse?.sort((a, b) => {
            if ((b.total_wins ?? 0) !== (a.total_wins ?? 0)) {
                return (b.total_wins ?? 0) - (a.total_wins ?? 0);
            }
            return (b.total_points_for ?? 0) - (a.total_points_for ?? 0);
        })

        if (seasonError || seasonMetaError) {
            return {
                error: seasonError ?? seasonMetaError,
                season: null,
                year: seasonInt,
                weeks: []
            }
        }

        const totalWeeks = seasonMeta?.total_weeks ?? 0;
        const matchupResults = await Promise.all(
            Array.from({length: totalWeeks}, (_, index) => {
                const selectedWeek = index + 1;
                return supabase.rpc('week_matchups', {
                    selected_week: selectedWeek,
                    season_year: seasonInt,
                });
            })
        );

        const firstMatchupError = matchupResults.find((result) => result.error)?.error;
        if (firstMatchupError) {
            return {
                error: firstMatchupError,
                season: null,
                year: seasonInt,
                weeks: []
            }
        }

        return {
            error: null,
            season: seasonResponse,
            year: seasonInt,
            weeks: matchupResults.map((result, index) => ({
                week: index + 1,
                isPlayoffs: index + 1 > (seasonMeta?.regular_season_weeks ?? 13),
                matchups: result.data ?? [],
            })),
        }
    } else {
        // TODO: Route them back to the all time page
    }
}

const SeasonSummary = ({
    season
}: {
    season: Database["public"]["CompositeTypes"]["season_details_object"][]
}) => {
    if (!season.length) {
        return (
            <div className="mb-4 w-full border-2 border-dashed border-line bg-paper-muted p-4">
                <h2 className="font-display text-4xl italic">Season Summary</h2>
                <p className="mt-2 text-ink-muted">No season data is available.</p>
            </div>
        );
    }

    // Find champion (player with championship = 1)
    const champion = season.find(player => player.championships === 1);
    
    // Find highest scoring player
    const highestScorer = season.reduce((prev, current) => 
        prev.total_points_for > current.total_points_for ? prev : current
    );

    return (
        <div className="mb-7 w-full">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                <FantasyStatCard
                    label="Champion"
                    value={capitalizeFirstLetter(champion?.manager_name ?? "Unknown")}
                />
                <FantasyStatCard
                    label="Top Scorer"
                    value={capitalizeFirstLetter(highestScorer.manager_name ?? "Unknown")}
                    subtitle={`${highestScorer.total_points_for.toFixed(2)} points`}
                />
                <FantasyStatCard
                    label="League Avg PF"
                    value={(season.reduce((sum, player) => sum + player.total_points_for, 0) / season.length).toFixed(2)}
                />
            </div>
        </div>
    );
};

const SeasonTable = ({season}: { season: Database["public"]["CompositeTypes"]["season_details_object"][] }) => {
    const navigate = useNavigate();
    const {managers} = useFootballContext();

    return (
        <div className="flex items-start">
            <table className={fantasyTableFrozenColWrapClass}>
                <thead>
                    <tr className={fantasyTableHeadRowClass}>
                        <th className={`px-4 whitespace-nowrap cursor-default font-medium text-left ${fantasyTableHeadHeightClass}`}>Manager</th>
                    </tr>
                </thead>
                <tbody className={fantasyTableBodyClass}>
                    {season?.map((manager) => {
                        const managerId = managers.find((m) => m.name.toLowerCase() === manager.manager_name.toLowerCase())?.id;
                        return (
                            <tr
                                key={manager.manager_name}
                                onClick={() => navigate(`/fantasy_football/manager/${managerId}`)}
                                className={fantasyTableRowClass}
                            >
                                <td className={`px-4 cursor-pointer whitespace-nowrap font-light text-left ${fantasyTableRowHeightClass}`}>
                                    <div className="flex items-center gap-3">
                                        <ManagerAvatar id={managerId} name={manager.manager_name} className="h-9 w-9 text-xs" />
                                        <div>
                                            <div className="font-semibold">{capitalizeFirstLetter(manager.manager_name)}</div>
                                            <div className="text-accent text-sm">
                                                {manager.championships ? "Champion" : "\u00A0"}
                                            </div>
                                        </div>
                                    </div>
                                </td>
                            </tr>
                        );
                    })}
                </tbody>
            </table>
            <div className={`${fantasyTableShellClass} min-w-0 flex-1 pr-4 md:pr-0`}>
                <table className="w-full">
                    <thead>
                        <tr className={fantasyTableHeadRowClass}>
                            <th className={`px-5 whitespace-nowrap cursor-default font-medium text-right ${fantasyTableHeadHeightClass}`}>Record</th>
                            <th className={`px-5 whitespace-nowrap cursor-default font-medium text-right ${fantasyTableHeadHeightClass}`}>Points</th>
                            <th className={`px-4 hidden lg:table-cell whitespace-nowrap cursor-default font-medium text-right ${fantasyTableHeadHeightClass}`}>High/Low Points</th>
                        </tr>
                    </thead>
                    <tbody className={fantasyTableBodyClass}>
                        {season?.map((manager) => {
                            const managerId = managers.find((m) => m.name.toLowerCase() === manager.manager_name.toLowerCase())?.id;
                            return (
                                <tr
                                    key={manager.manager_name}
                                    onClick={() => navigate(`/fantasy_football/manager/${managerId}`)}
                                    className={fantasyTableRowClass}
                                >
                                    <td className={`px-5 cursor-pointer tabular-nums whitespace-nowrap text-right ${fantasyTableRowHeightClass}`}>
                                        <div className="font-medium">
                                            {manager.total_wins}-{manager.total_games - manager.total_wins}
                                        </div>
                                        {manager.playoff_wins > 0 || manager.playoff_games > 0 ? (
                                            <div className="text-ink-muted text-sm">
                                                Playoffs: {manager.playoff_wins}-{manager.playoff_games - manager.playoff_wins}
                                            </div>
                                        ) : (
                                            <div className="text-sm">{"\u00A0"}</div>
                                        )}
                                    </td>
                                    <td className={`px-5 cursor-pointer whitespace-nowrap text-right ${fantasyTableRowHeightClass}`}>
                                        <div className="font-medium">
                                            PF: {manager.total_points_for.toFixed(2)}
                                        </div>
                                        <div className="text-ink-muted text-sm">
                                            PA: {manager.total_points_against.toFixed(2)}
                                        </div>
                                    </td>
                                    <td className={`px-4 cursor-pointer hidden lg:table-cell whitespace-nowrap text-right ${fantasyTableRowHeightClass}`}>
                                        <HighLowPair
                                            high={manager.high_point_weeks}
                                            low={manager.low_point_weeks}
                                        />
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

const WeekByWeekSection = ({
    weeks,
    selectedWeek,
    onSelectWeek,
}: {
    weeks: SeasonWeek[];
    selectedWeek: number;
    onSelectWeek: (week: number) => void;
}) => {
    const activeWeek = weeks.find((week) => week.week === selectedWeek) ?? weeks[0];
    const winnersBracket = activeWeek?.matchups.filter(
        (matchup) => matchup.is_winners_bracket && matchup.is_playoffs && !matchup.is_bye_week
    ) ?? [];
    const losersBracket = activeWeek?.matchups.filter(
        (matchup) => (!matchup.is_winners_bracket || !matchup.is_playoffs) && !matchup.is_bye_week
    ) ?? [];

    return (
        <div>
            <div className="mb-4 flex gap-2 overflow-x-auto border-b border-dashed border-line-muted pb-3">
                {weeks.map((week) => (
                    <button
                        key={week.week}
                        type="button"
                        onClick={() => onSelectWeek(week.week)}
                        className={`flex-shrink-0 rounded-full border-[1.5px] px-3.5 py-2 font-mono text-xs font-semibold uppercase transition ${
                            week.week === activeWeek?.week
                                ? "border-black bg-black text-white dark:border-zinc-50 dark:bg-zinc-50 dark:text-black"
                                : "border-line-muted bg-paper-muted text-ink-muted hover:border-accent hover:text-ink dark:bg-zinc-900 dark:text-zinc-300"
                        }`}
                    >
                        Week {week.week}
                    </button>
                ))}
            </div>

            {!activeWeek ? (
                <EmptyState title="No weeks" message="No matchup weeks are available for this season." />
            ) : activeWeek.matchups.length === 0 ? (
                <EmptyState title="No matchups" message="No games are available for this week." />
            ) : activeWeek.isPlayoffs ? (
                <div className="space-y-6">
                    <div>
                        <FantasySectionHeading>Winners Bracket</FantasySectionHeading>
                        <ScoreCardGroup matchups={winnersBracket} />
                    </div>
                    <div>
                        <FantasySectionHeading>Consolation Matches</FantasySectionHeading>
                        <ScoreCardGroup matchups={losersBracket} />
                    </div>
                </div>
            ) : (
                <ScoreCardGroup matchups={activeWeek.matchups} />
            )}
        </div>
    );
};

export default function Year() {
    const {error, season, year, weeks} = useLoaderData<typeof loader>();
    const {years} = useFootballContext();
    const navigate = useNavigate();
    const [searchParams, setSearchParams] = useSearchParams();
    const [selectedYear, setSelectedYear] = useState(`${year}`);
    const seasonYears = years.filter((yearItem) => yearItem.key !== "all_time");
    const selectedTab = searchParams.get("view") === "week-by-week" ? "week-by-week" : "overview";
    const selectedWeekParam = Number(searchParams.get("week"));
    const selectedWeek = selectedWeekParam > 0 ? selectedWeekParam : 1;

    const handleYearChange = (yearKey: string) => {
        setSelectedYear(yearKey);
        navigate(`/fantasy_football/season/${yearKey}`);
    };

    const handleTabChange = (tab: "overview" | "week-by-week") => {
        const nextParams = new URLSearchParams(searchParams);
        if (tab === "overview") {
            nextParams.delete("view");
            nextParams.delete("week");
        } else {
            nextParams.set("view", "week-by-week");
            nextParams.set("week", `${selectedWeek}`);
        }
        setSearchParams(nextParams);
    };

    const handleWeekChange = (week: number) => {
        const nextParams = new URLSearchParams(searchParams);
        nextParams.set("view", "week-by-week");
        nextParams.set("week", `${week}`);
        setSearchParams(nextParams);
    };

    return (
        <div className={'flex justify-center w-full'}>
            <FantasyMain>
                <Breadcrumbs className="mb-3">
                    <BreadcrumbItem href={"/fantasy_football"}>League History</BreadcrumbItem>
                </Breadcrumbs>
                <ScrollablePills 
                    items={seasonYears}
                    selectedKey={selectedYear}
                    onSelectionChange={handleYearChange}
                />

                <div className="mb-[26px] inline-flex rounded-full bg-zinc-200 p-1 dark:bg-zinc-900">
                    <button
                        type="button"
                        onClick={() => handleTabChange("overview")}
                        className={`rounded-full px-[18px] py-2.5 font-mono text-[11.5px] font-semibold uppercase tracking-[0.05em] ${
                            selectedTab === "overview"
                                ? "bg-black text-white dark:bg-zinc-50 dark:text-black"
                                : "text-ink dark:text-zinc-100"
                        }`}
                    >
                        Overview
                    </button>
                    <button
                        type="button"
                        onClick={() => handleTabChange("week-by-week")}
                        className={`rounded-full px-[18px] py-2.5 font-mono text-[11.5px] font-semibold uppercase tracking-[0.05em] ${
                            selectedTab === "week-by-week"
                                ? "bg-black text-white dark:bg-zinc-50 dark:text-black"
                                : "text-ink dark:text-zinc-100"
                        }`}
                    >
                        Week-by-Week
                    </button>
                </div>

                {(error || !season) ? (
                    <ErrorState message={typeof error === "string" ? error : "No season data found."} />
                ) : season.length === 0 ? (
                    <EmptyState title="No season data" message="This season does not have standings data yet." />
                ) : selectedTab === "week-by-week" ? (
                    <WeekByWeekSection
                        weeks={weeks}
                        selectedWeek={selectedWeek}
                        onSelectWeek={handleWeekChange}
                    />
                ) : (
                    <>
                        <div>
                            <FantasySectionHeading>Overview</FantasySectionHeading>
                            <SeasonSummary season={season} />
                        </div>
                        <SeasonTable season={season}/>
                    </>
                )}
            </FantasyMain>
        </div>
    );
}
