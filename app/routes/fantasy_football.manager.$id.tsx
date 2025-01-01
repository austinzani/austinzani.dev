import {Link, useLoaderData, useNavigate} from "@remix-run/react";
import React, {useState} from "react";
import supabase from "~/utils/supabase";

import {capitalizeFirstLetter} from "~/utils/helpers";

import type {LoaderFunctionArgs} from "@remix-run/node";

import {useFootballContext} from "~/routes/fantasy_football";
import {Database} from "../../db_types";
import {BreadcrumbItem, Breadcrumbs} from "~/components/Breadcrumb";

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
        <div className="relative">
            <table className="table-fixed w-full">
                <thead className="sticky top-0 z-[5] bg-white dark:bg-black">
                    <tr className="border-b border-gray-200 dark:border-gray-700">
                        <th className="px-4 w-24 whitespace-nowrap cursor-default font-medium text-left">Year</th>
                        <th className="px-4 whitespace-nowrap cursor-default font-medium text-right">Record</th>
                        <th className="px-4 whitespace-nowrap cursor-default font-medium text-right">Points</th>
                        <th className="px-4 hidden sm:table-cell whitespace-nowrap cursor-default font-medium text-right">Weekly Records</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                    {seasons?.map((year) => (
                        <tr
                            key={year.year}
                            onClick={() => navigate(`/fantasy_football/season/${year.year}`)}
                            className="hover:bg-orange-500/60 rounded-md"
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
                                <div className="h-5 text-gray-400 text-sm">
                                    {year.playoff_games ? `${year.playoff_wins}-${year.playoff_games - year.playoff_wins} Playoffs` : "\u00A0"}
                                </div>
                            </td>
                            <td className="px-4 cursor-pointer whitespace-nowrap py-1 text-right">
                                <div className="h-6 font-medium">
                                    PF: {year.total_points_for.toFixed(2)}
                                </div>
                                <div className="h-5 text-gray-400 text-sm">
                                    PA: {year.total_points_against.toFixed(2)}
                                </div>
                            </td>
                            <td className="px-4 cursor-pointer hidden sm:table-cell whitespace-nowrap py-1 text-right rounded-r-lg">
                                <div className="h-6">
                                    <span className="text-emerald-400 font-medium">{year.high_point_weeks} High</span>
                                </div>
                                <div className="h-5">
                                    <span className="text-red-400 font-medium">{year.low_point_weeks} Low</span>
                                </div>
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
        <div className="relative">
            <table className="table-fixed w-full">
                <thead className="sticky top-0 z-[5] bg-white dark:bg-black">
                    <tr className="border-b border-gray-200 dark:border-gray-700">
                        <th className="px-4 w-48 whitespace-nowrap cursor-default font-medium text-left">Opponent</th>
                        <th className="px-4 whitespace-nowrap cursor-default font-medium text-right">History</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                    {opponents?.map((opponent) => (
                        <tr
                            key={opponent.id}
                            onClick={() => navigate(`/fantasy_football/head_to_head?team_one=${manager_id}&team_two=${opponent.id}`)}
                            className="hover:bg-orange-500/60 rounded-md"
                        >
                            <td className="px-4 cursor-pointer whitespace-nowrap py-1 text-left rounded-l-lg">
                                <div className="h-6 font-medium">{capitalizeFirstLetter(opponent.name)}</div>
                                <div className="h-5 text-gray-400 text-sm">{opponent.total_games} matchups</div>
                            </td>
                            <td className="px-4 cursor-pointer tabular-nums whitespace-nowrap py-1 text-right rounded-r-lg">
                                <div className="h-6 font-medium">
                                    {opponent.total_wins}-{opponent.total_games - opponent.total_wins}
                                </div>
                                <div className="h-5 text-gray-400 text-sm">
                                    {((opponent.total_wins / opponent.total_games) * 100).toFixed(1)}% win rate
                                </div>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
};

const StatCard = ({
    title,
    value,
    subtitle
}: {
    title: string;
    value: string | number;
    subtitle?: string;
}) => (
    <div className="flex flex-col items-center p-3 rounded-lg bg-gray-50 dark:bg-zinc-800">
        <div className="text-sm text-gray-600 dark:text-gray-400">{title}</div>
        <div className="text-xl font-medium mt-1">{value}</div>
        {subtitle && <div className="text-xs text-gray-500 dark:text-gray-500 mt-1">{subtitle}</div>}
    </div>
);

const ManagerStats = ({
    all_time_stats
}: {
    all_time_stats: Database['public']['CompositeTypes']['all_time_object']
}) => {
    const winPercentage = ((all_time_stats.total_wins / all_time_stats.total_games) * 100).toFixed(1);
    const playoffWinPercentage = ((all_time_stats.playoff_wins / all_time_stats.playoff_games) * 100).toFixed(1);

    return (
        <div className="w-full bg-gray-100 dark:bg-zinc-900 rounded-xl p-4 mt-4">
            <h2 className="text-xl font-bold mb-4">All Time Stats</h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                <StatCard
                    title="Record"
                    value={`${all_time_stats.total_wins}-${all_time_stats.total_games - all_time_stats.total_wins}`}
                    subtitle={`${winPercentage}% win rate`}
                />
                <StatCard
                    title="Championships"
                    value={all_time_stats.championships}
                    subtitle={`${all_time_stats.playoff_births} playoff appearances`}
                />
                <StatCard
                    title="Playoff Record"
                    value={`${all_time_stats.playoff_wins}-${all_time_stats.playoff_games - all_time_stats.playoff_wins}`}
                    subtitle={`${playoffWinPercentage}% playoff win rate`}
                />
                <StatCard
                    title="Weekly Records"
                    value={`${all_time_stats.high_point_weeks}H / ${all_time_stats.low_point_weeks}L`}
                    subtitle="High/Low point weeks"
                />
                <StatCard
                    title="Points For"
                    value={all_time_stats.total_points_for.toFixed(2)}
                    subtitle={`${(all_time_stats.total_points_for / all_time_stats.total_seasons).toFixed(2)} Avg Per Season`}
                />
                <StatCard
                    title="Points Against"
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
        <div className="flex justify-center w-full">
            <div className="flex m-3 flex-col w-full max-w-[64rem]">
                <Breadcrumbs className="pb-3">
                    <BreadcrumbItem href="/fantasy_football/all_time">League History</BreadcrumbItem>
                    <BreadcrumbItem>{capitalizeFirstLetter(all_time_stats?.name ?? "")}</BreadcrumbItem>
                </Breadcrumbs>
                
                <div className="flex flex-col md:flex-row justify-between items-start md:items-end">
                    <div>
                        <h1 className="text-2xl font-bold">{manager_name}</h1>
                        <p className="text-md font-light">{all_time_stats?.total_seasons} Seasons</p>
                    </div>
                </div>

                {all_time_stats && <ManagerStats all_time_stats={all_time_stats} />}

                {seasons && (
                    <div className="mt-6">
                        <h2 className="text-xl font-bold mb-3">Season History</h2>
                        <SeasonTable seasons={seasons} />
                    </div>
                )}

                {opponents && (
                    <div className="mt-6">
                        <h2 className="text-xl font-bold mb-3">Head-to-Head Records</h2>
                        <OpponentTable opponents={opponents} manager_id={manager_id} />
                    </div>
                )}
            </div>
        </div>
    );
}