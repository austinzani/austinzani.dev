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

const SeasonTable = ({seasons}: { seasons: Database['public']['CompositeTypes']['manager_season_object'][] }) => {
    const navigate = useNavigate();
    return (
        <table className='table-auto'>
            <thead>
            <tr>
                <th className={'px-4 cursor-default font-medium text-left'}>Year</th>
                <th className={'px-4 cursor-default font-medium text-right'}>Record</th>
                <th className={'px-4 cursor-default hidden sm:table-cell font-medium text-right'}>PF</th>
                <th className={'px-4 cursor-default hidden sm:table-cell font-medium text-right'}>PA</th>
                <th className={'px-4 cursor-default hidden lg:table-cell font-medium text-right'}>HP</th>
                <th className={'px-4 cursor-default hidden lg:table-cell font-medium text-right'}>LP</th>
                <th className={'px-4 cursor-default hidden lg:table-cell font-medium text-right'}>Playoff Record</th>
            </tr>
            </thead>
            <tbody>
            {seasons?.map((year) => (
                <tr onClick={() => navigate(`/fantasy_football/season/${year.year}`)}
                    className={'hover:bg-orange-500/60 rounded-md'} key={year.year}>
                    <td className={'px-4 cursor-pointer tabular-nums py-1 font-light text-left rounded-l-lg'}>{year.year}{(year.playoff_wins === year.playoff_games) && year.playoff_games > 0 ? " 🏆" : ""}</td>
                    <td className={'px-4 cursor-pointer tabular-nums py-1 font-light text-right rounded-r-lg sm:rounded-none'}>{year.total_wins} - {year.total_games - year.total_wins}</td>
                    <td className={'px-4 cursor-pointer tabular-nums hidden sm:table-cell py-1 font-light text-right'}>{year.total_points_for.toFixed(2)}</td>
                    <td className={'px-4 cursor-pointer tabular-nums hidden sm:table-cell py-1 font-light text-right sm:rounded-r-lg lg:rounded-none'}>{year.total_points_against.toFixed(2)}</td>
                    <td className={'px-4 cursor-pointer tabular-nums hidden lg:table-cell py-1 font-light text-right'}>{year.high_point_weeks}</td>
                    <td className={'px-4 cursor-pointer tabular-nums hidden lg:table-cell py-1 font-light text-right'}>{year.low_point_weeks}</td>
                    <td className={'px-4 cursor-pointer tabular-nums hidden lg:table-cell py-1 font-light text-right rounded-r-lg'}>{year.playoff_wins} - {year.playoff_games - year.playoff_wins}</td>
                </tr>
            ))}
            </tbody>
        </table>
    )
}

const StatBlock = (props: { title: string, value: string | number }) => {
    const {title, value} = props;
    return (<div className={'flex flex-row items-center justify-between w-full md:w-60'}>
        <h2 className={'text-lg'}>{title}:</h2>
        <div className={'flex flex-row items-center ml-2'}>
            <h3 className={'text-lg font-light'}>{value}</h3>
        </div>
    </div>)
}

const ManagerStats = ({all_time_stats}: {
    all_time_stats: Database['public']['CompositeTypes']['all_time_object']
}) => {
    return (
        <div className={'w-0.5 flex flex-row flex-grow justify-between flex-wrap max-w-[32rem]'}>
            <h1 className={"w-full text-xl font-bold mt-4 md:mt-0"}>All Time Stats</h1>
            <StatBlock
                title={"Record"}
                value={`${all_time_stats?.total_wins} - ${(all_time_stats?.total_games ?? 0) - (all_time_stats?.total_wins ?? 0)}`}
            />
            <StatBlock
                title={"Points For"}
                value={all_time_stats?.total_points_for.toFixed(2)}
            />
            <StatBlock
                title={"Points Against"}
                value={all_time_stats?.total_points_against.toFixed(2)}
            />
            <StatBlock
                title={"High Point Weeks"}
                value={all_time_stats?.high_point_weeks}
            />
            <StatBlock
                title={"Low Point Weeks"}
                value={all_time_stats?.low_point_weeks}
            />
            <StatBlock
                title={"Playoff Berths"}
                value={all_time_stats?.playoff_births}
            />
            <StatBlock
                title={"Playoff Record"}
                value={`${all_time_stats?.playoff_wins} - ${(all_time_stats?.playoff_games ?? 0) - (all_time_stats?.playoff_wins ?? 0)}`}
            />
            <StatBlock
                title={"Championships"}
                value={all_time_stats?.championships}
            />
        </div>
    )
}

const OpponentTable = ({opponents, manager_id}: {
    opponents: Database['public']['CompositeTypes']['opponents_object'][],
    manager_id: number
}) => {
    const navigate = useNavigate();
    return (
        <table className='table-auto'>
            <thead>
            <tr>
                <th className={'px-4 cursor-default font-medium text-left'}>Opponent</th>
                <th className={'px-4 cursor-default font-medium text-right'}>Record Against</th>
            </tr>
            </thead>
            <tbody>
            {opponents?.map((opponent) => (
                <tr onClick={() => navigate(`/fantasy_football/head_to_head?team_one=${manager_id}&team_two=${opponent.id}`)}
                    className={'hover:bg-orange-500/60 rounded-md'} key={opponent.id}>
                    <td className={'px-4 cursor-pointer tabular-nums py-1 font-light text-left rounded-l-lg'}>{capitalizeFirstLetter(opponent.name)}</td>
                    <td className={'px-4 cursor-pointer tabular-nums py-1 font-light text-right rounded-r-lg'}>{opponent.total_wins} - {opponent.total_games - opponent.total_wins}</td>
                </tr>
            ))}
            </tbody>
        </table>
    )
}

export default function Manager() {
    const {error, seasons, opponents, manager_id} = useLoaderData<loaderData>()
    const {allTime, managers} = useFootballContext();
    const manager_name = capitalizeFirstLetter(managers?.find((manager) => manager.id === manager_id)?.name ?? "")
    const all_time_stats = allTime?.find((manager) => manager.name.toLowerCase() === manager_name.toLowerCase());
    return (
        <div className={'flex justify-center w-full'}>
            <div className={'flex m-3 flex-col w-full max-w-[64rem]'}>
                <Breadcrumbs className={"pb-3"}>
                    <BreadcrumbItem href={`/fantasy_football/all_time`}>Season History</BreadcrumbItem>
                    <BreadcrumbItem>{capitalizeFirstLetter(all_time_stats?.name ?? "")}</BreadcrumbItem>
                </Breadcrumbs>
                <div className={"flex justify-around items-center flex-wrap"}>
                    <div className={"w-full md:w-auto"}>
                        <h1 className={'text-2xl font-bold'}>{manager_name}</h1>
                        <p className={"text-md font-light"}>{all_time_stats?.total_seasons} Seasons</p>
                    </div>
                    {all_time_stats && <ManagerStats all_time_stats={all_time_stats}/>}
                </div>
                {seasons && (
                    <React.Fragment>
                        <h2 className={'text-xl font-bold mt-4'}>Seasons</h2>
                        <SeasonTable seasons={seasons}/>
                    </React.Fragment>
                )}
                {opponents && (
                    <React.Fragment>
                        <h2 className={'text-xl font-bold mt-4'}>Opponents</h2>
                        <OpponentTable opponents={opponents} manager_id={manager_id}/>
                    </React.Fragment>
                )}
            </div>
        </div>
    );
}