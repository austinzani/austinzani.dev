import {Link, useLoaderData, useNavigate} from "@remix-run/react";
import React, {useState} from "react";
import supabase from "~/utils/supabase";

import {capitalizeFirstLetter} from "~/utils/helpers";

import type {LoaderFunctionArgs} from "@remix-run/node";

import {useFootballContext} from "~/routes/fantasy_football";
import {Database} from "../../db_types";
import {BreadcrumbItem, Breadcrumbs} from "~/components/Breadcrumb";
import ManagerAvatar from "~/components/ManagerAvatar";
import {
    FantasyMain,
    FantasySectionHeading,
    FantasyStatCard,
    HighLowPair,
    fantasyTableBodyClass,
    fantasyTableHeadRowClass,
    fantasyTableRowClass,
    fantasyTableShellClass,
} from "~/components/FantasyFootballUI";

interface loaderData {
    error: string | null,
    seasons: null | Database['public']['CompositeTypes']['manager_season_object'][],
    opponents: null | Database['public']['CompositeTypes']['opponents_object'][],
    manager_id: number
}

export const loader = async ({params}: LoaderFunctionArgs): Promise<loaderData> => {
    const manager_id = params.id;
    if (manager_id) {
        const id = parseInt(manager_id);
        if (!id) {
            // TODO: Route them back to the all time page
        }
        const [seasons, opponents] = await Promise.all([
            supabase.rpc('manager_seasons', {manager_id: id}),
            supabase.rpc('opponents', {manager_id: id})])
        const {data: seasonResponse, error: seasonError} = seasons
        const {data: opponentResponse, error: opponentError} = opponents
        if (seasonError || opponentError) {
            // Todo: Route them back to the all time page
        }
        const sortedOpponents = opponentResponse?.sort((a, b) => b.total_games - a.total_games) ?? null;
        const sortedSeasons = seasonResponse?.sort((a, b) => b.year - a.year) ?? null;
        return {
            error: null,
            seasons: sortedSeasons,
            opponents: sortedOpponents,
            manager_id: id
        }
    }
    return {
        error: "Invalid manager id",
        seasons: null,
        opponents: null,
        manager_id: 0
    }
}

const SeasonTable = ({ seasons }: { seasons: Database['public']['CompositeTypes']['manager_season_object'][] }) => {
    const navigate = useNavigate();
    return (
        <div className={fantasyTableShellClass}>
            <table className="w-full min-w-[42rem] table-fixed">
                <thead className="sticky top-0 z-[5] bg-paper dark:bg-zinc-950">
                    <tr className={fantasyTableHeadRowClass}>
                        <th className="px-4 w-24 whitespace-nowrap cursor-default font-medium text-left">Year</th>
                        <th className="px-4 whitespace-nowrap cursor-default font-medium text-right">Record</th>
                        <th className="px-4 whitespace-nowrap cursor-default font-medium text-right">Points</th>
                        <th className="px-4 hidden sm:table-cell whitespace-nowrap cursor-default font-medium text-right">Weekly Records</th>
                    </tr>
                </thead>
                <tbody className={fantasyTableBodyClass}>
                    {seasons?.map((year) => (
                        <tr
                            key={year.year}
                            onClick={() => navigate(`/fantasy_football/season/${year.year}`)}
                            className={fantasyTableRowClass}
                        >
                            <td className="px-4 cursor-pointer whitespace-nowrap py-1 text-left rounded-l-lg">
                                <div className="h-6 font-medium">{year.year}</div>
                                <div className="h-5 text-amber-400 text-sm">
                                    {year.playoff_wins === year.playoff_games && year.playoff_games > 0 ? "🏆" : "\u00A0"}
                                </div>
                            </td>
                            <td className="px-4 cursor-pointer tabular-nums whitespace-nowrap py-1 text-right">
                                <div className="h-6 font-medium">
                                    {year.total_wins}-{year.total_games - year.total_wins}
                                </div>
                                <div className="h-5 text-ink-muted text-sm">
                                    {year.playoff_games ? `${year.playoff_wins}-${year.playoff_games - year.playoff_wins} Playoffs` : "\u00A0"}
                                </div>
                            </td>
                            <td className="px-4 cursor-pointer whitespace-nowrap py-1 text-right">
                                <div className="h-6 font-medium">
                                    PF: {year.total_points_for.toFixed(2)}
                                </div>
                                <div className="h-5 text-ink-muted text-sm">
                                    PA: {year.total_points_against.toFixed(2)}
                                </div>
                            </td>
                            <td className="px-4 cursor-pointer hidden sm:table-cell whitespace-nowrap py-1 text-right rounded-r-lg">
                                <HighLowPair
                                    high={year.high_point_weeks}
                                    low={year.low_point_weeks}
                                />
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
};

const OpponentTable = ({
    opponents,
    manager_id
}: {
    opponents: Database['public']['CompositeTypes']['opponents_object'][],
    manager_id: number
}) => {
    const navigate = useNavigate();
    return (
        <div className={fantasyTableShellClass}>
            <table className="w-full min-w-[32rem] table-fixed">
                <thead className="sticky top-0 z-[5] bg-paper dark:bg-zinc-950">
                    <tr className={fantasyTableHeadRowClass}>
                        <th className="px-4 w-48 whitespace-nowrap cursor-default font-medium text-left">Opponent</th>
                        <th className="px-4 whitespace-nowrap cursor-default font-medium text-right">History</th>
                    </tr>
                </thead>
                <tbody className={fantasyTableBodyClass}>
                    {opponents?.map((opponent) => (
                        <tr
                            key={opponent.id}
                            onClick={() => navigate(`/fantasy_football/head_to_head?team_one=${manager_id}&team_two=${opponent.id}`)}
                            className={fantasyTableRowClass}
                        >
                            <td className="px-4 cursor-pointer whitespace-nowrap py-1 text-left rounded-l-lg">
                                <div className="h-6 font-medium">{capitalizeFirstLetter(opponent.name)}</div>
                                <div className="h-5 text-ink-muted text-sm">{opponent.total_games} matchups</div>
                            </td>
                            <td className="px-4 cursor-pointer tabular-nums whitespace-nowrap py-1 text-right rounded-r-lg">
                                <div className="h-6 font-medium">
                                    {opponent.total_wins}-{opponent.total_games - opponent.total_wins}
                                </div>
                                <div className="h-5 text-ink-muted text-sm">
                                    {opponent.total_games > 0 ? ((opponent.total_wins / opponent.total_games) * 100).toFixed(1) : "0.0"}% win rate
                                </div>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
};

const ManagerStats = ({
    all_time_stats
}: {
    all_time_stats: Database['public']['CompositeTypes']['all_time_object']
}) => {
    const winPercentage = all_time_stats.total_games > 0 ? ((all_time_stats.total_wins / all_time_stats.total_games) * 100).toFixed(1) : "0.0";
    const playoffWinPercentage = all_time_stats.playoff_games > 0 ? ((all_time_stats.playoff_wins / all_time_stats.playoff_games) * 100).toFixed(1) : "0.0";

    return (
        <div className="mt-4 w-full">
            <FantasySectionHeading>All-Time Stats</FantasySectionHeading>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                <FantasyStatCard
                    label="Record"
                    value={`${all_time_stats.total_wins}-${all_time_stats.total_games - all_time_stats.total_wins}`}
                    subtitle={`${winPercentage}% win rate`}
                />
                <FantasyStatCard
                    label="Championships"
                    value={all_time_stats.championships}
                    subtitle={`${all_time_stats.playoff_births} playoff appearances`}
                />
                <FantasyStatCard
                    label="Playoff Record"
                    value={`${all_time_stats.playoff_wins}-${all_time_stats.playoff_games - all_time_stats.playoff_wins}`}
                    subtitle={`${playoffWinPercentage}% playoff win rate`}
                />
                <FantasyStatCard
                    label="High / Low Weeks"
                    value={`${all_time_stats.high_point_weeks}H / ${all_time_stats.low_point_weeks}L`}
                />
                <FantasyStatCard
                    label="Points For"
                    value={all_time_stats.total_points_for.toFixed(2)}
                    subtitle={`${(all_time_stats.total_points_for / all_time_stats.total_seasons).toFixed(2)} Avg Per Season`}
                />
                <FantasyStatCard
                    label="Points Against"
                    value={all_time_stats.total_points_against.toFixed(2)}
                    subtitle={`${(all_time_stats.total_points_against / all_time_stats.total_seasons).toFixed(2)} Avg Per Season`}
                />
            </div>
        </div>
    );
};

export default function Manager() {
    const { error, seasons, opponents, manager_id } = useLoaderData<loaderData>();
    const { allTime, managers } = useFootballContext();
    const manager_name = capitalizeFirstLetter(managers?.find((manager) => manager.id === manager_id)?.name ?? "");
    const all_time_stats = allTime?.find((manager) => manager.name.toLowerCase() === manager_name.toLowerCase());

    return (
        <div className="w-full">
            <FantasyMain>
                <Breadcrumbs className="mb-3">
                    <BreadcrumbItem href="/fantasy_football">League History</BreadcrumbItem>
                    <BreadcrumbItem>{capitalizeFirstLetter(all_time_stats?.name ?? "")}</BreadcrumbItem>
                </Breadcrumbs>
                
                <div className="mb-7 flex flex-col items-start justify-between gap-4 md:flex-row md:items-end">
                    <div className="flex items-center gap-4">
                        <ManagerAvatar id={manager_id} name={manager_name} className="h-14 w-14 text-lg" />
                        <div>
                            <h1 className="font-display text-[32px] leading-none">{manager_name}</h1>
                            <p className="font-mono text-xs uppercase tracking-wide text-ink-muted">{all_time_stats?.total_seasons} Seasons</p>
                        </div>
                    </div>
                </div>

                {all_time_stats && <ManagerStats all_time_stats={all_time_stats} />}

                {seasons && (
                    <div className="mt-9">
                        <FantasySectionHeading>Season History</FantasySectionHeading>
                        <SeasonTable seasons={seasons} />
                    </div>
                )}

                {opponents && (
                    <div className="mt-9">
                        <FantasySectionHeading>Head-to-Head Records</FantasySectionHeading>
                        <OpponentTable opponents={opponents} manager_id={manager_id} />
                    </div>
                )}
            </FantasyMain>
        </div>
    );
}
