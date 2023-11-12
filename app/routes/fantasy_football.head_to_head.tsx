import {Link, useLoaderData, useNavigate} from "@remix-run/react";
import React, {useState} from "react";
import supabase from "~/utils/supabase";

import {capitalizeFirstLetter} from "~/utils/helpers";
import type {LoaderFunctionArgs} from "@remix-run/node";
import {useFootballContext} from "~/routes/fantasy_football";
import {Database} from "../../db_types";
import {ScoreCardGroup} from "~/components/ScoreCard";
import {BreadcrumbItem, Breadcrumbs} from "~/components/Breadcrumb";

interface loaderData {
    error: string | null,
    headToHead: null | Database['public']['CompositeTypes']['head_to_head_object'][],
    matchups: null | Database['public']['CompositeTypes']['game_details'][],
    team_one_id: number,
    team_two_id: number
}

export const loader = async ({request}: LoaderFunctionArgs): Promise<loaderData> => {
    const url = new URL(request.url);
    const team_one = url.searchParams.get("team_one");
    const team_two = url.searchParams.get("team_two");
    if (team_one && team_two) {
        const team_one_int = parseInt(team_one);
        const team_two_int = parseInt(team_two);
        if (!team_one_int || !team_two_int) {
            // TODO: Route them back to the all time page
        }
        const [headToHead, matchups] = await Promise.all([
            supabase.rpc('head_to_head', {team_one: team_one_int, team_two: team_two_int}),
            supabase.rpc('head_to_head_matchups', {team_one: team_one_int, team_two: team_two_int})])
        const {data: headToHeadResponse, error: headToHeadError} = headToHead
        const {data: matchupsResponse, error: matchupsError} = matchups
        if (headToHeadError || matchupsError) {
            // Todo: Route them back to the all time page
        }
        // Sort the matchups by year then week
        const sortedMatchups = matchupsResponse?.sort((a, b) => {
            if (a.year === b.year) {
                return b.week - a.week;
            }
            return b.year - a.year;
        }) ?? null
        return {
            error: null,
            headToHead: headToHeadResponse,
            matchups: sortedMatchups,
            team_one_id: team_one_int,
            team_two_id: team_two_int
        }
    }
    return {
        error: "Invalid manager id",
        headToHead: null,
        matchups: null,
        team_one_id: 0,
        team_two_id: 0
    }
}

type HeadToHeadAlt = Database['public']['CompositeTypes']['head_to_head_object'] & {
    record: string,
    playoff_record: string
}
type statKey = keyof HeadToHeadAlt
const StatRow = (props: { stat_key: statKey, head_to_head: HeadToHeadAlt[], stat: string, stat_helper?: string }) => {
    const {stat_key, head_to_head, stat_helper, stat} = props;

    return (<tr className={"hover:bg-orange-500/60"}>
        <td className={'px-4 rounded-l-lg text-left font-light'}>{head_to_head[0][stat_key]}</td>
        <td className={'px-4 text-center'}>{stat}</td>
        <td className={'px-4 rounded-r-lg text-right font-light'}>{head_to_head[1][stat_key]}</td>
    </tr>)
}

const HeadToHeadStats = ({head_to_head}: {
    head_to_head: Database['public']['CompositeTypes']['head_to_head_object'][]
}) => {
    const team_one_manager = capitalizeFirstLetter(head_to_head[0].name)
    const team_two_manager = capitalizeFirstLetter(head_to_head[1].name)
    const {managers} = useFootballContext();
    const team_one_id = managers.find((manager) => manager.name.toLowerCase() === team_one_manager.toLowerCase())?.id ?? 0;
    const team_two_id = managers.find((manager) => manager.name.toLowerCase() === team_two_manager.toLowerCase())?.id ?? 0;
    const head_to_head_alt: HeadToHeadAlt[] = head_to_head.map((manager) => {
        return {
            ...manager,
            record: `${manager.total_wins} - ${manager.total_games - manager.total_wins}`,
            playoff_record: `${manager.playoff_wins} - ${manager.playoff_games - manager.playoff_wins}`
        }
    })


    return (
        <div>
            <div className={"flex justify-between items-center"}>
                <Link className={"px-2 text-2xl hover:text-orange-500 max-w-[45%] min-w-[45%] hover:underline text-left"} to={`/fantasy_football/manager/${team_one_id}`} prefetch={"intent"}>
                    {team_one_manager}
                </Link>
                <div className={"text-xl max-w-[10%] min-w-[10%] italic text-center"}>vs.</div>
                <Link className={"px-2 text-2xl hover:text-orange-500 max-w-[45%] min-w-[45%] hover:underline text-right"} to={`/fantasy_football/manager/${team_two_id}`} prefetch={"intent"}>
                    {team_two_manager}
                </Link>
            </div>
        <table className='table-auto'>
            <thead>
            <tr>
                <th className={'overflow-x-hidden w-[45%] px-2 text-2xl text-left'}></th>
                <th className={'overflow-x-hidden w-[10%] px-2 text-2xl text-center italic'}></th>
                <th className={'overflow-x-hidden w-[45%] px-2 text-2xl text-right'}></th>
            </tr>
            </thead>
            <tbody>
            <StatRow stat_key={'record'} head_to_head={head_to_head_alt} stat={"Record"}/>
            <StatRow stat_key={'playoff_record'} head_to_head={head_to_head_alt} stat={"Playoff Record"}/>
            <StatRow stat_key={'total_points_for'} head_to_head={head_to_head_alt} stat={"PF"}/>
            <StatRow stat_key={'total_points_against'} head_to_head={head_to_head_alt} stat={"PA"}/>
            <StatRow stat_key={'high_point_weeks'} head_to_head={head_to_head_alt} stat={"HP"}/>
            <StatRow stat_key={'low_point_weeks'} head_to_head={head_to_head_alt} stat={"LP"}/>
            <StatRow stat_key={'total_seasons'} head_to_head={head_to_head_alt} stat={"Seasons"}/>
            <StatRow stat_key={'playoff_births'} head_to_head={head_to_head_alt} stat={"Playoff Berths"}/>
            <StatRow stat_key={"championships"} head_to_head={head_to_head_alt} stat={"Championships"}/>
            </tbody>
        </table>
        </div>
    )
}

export default function Manager() {
    const {error, matchups, headToHead, team_one_id, team_two_id} = useLoaderData<loaderData>()
    const {managers} = useFootballContext();
    const team_one_manager = managers.find((manager) => manager.id === team_one_id)?.name ?? "";
    const team_two_manager = managers.find((manager) => manager.id === team_two_id)?.name ?? "";
    return (
        <div className={'flex justify-center w-full'}>
            <div className={'flex m-3 flex-col w-full max-w-[64rem]'}>
                <Breadcrumbs className={"pb-3"}>
                    <BreadcrumbItem href={`/fantasy_football/all_time`}>Season History</BreadcrumbItem>
                    <BreadcrumbItem href={`/fantasy_football/manager/${team_one_id}`}>{capitalizeFirstLetter(team_one_manager)}</BreadcrumbItem>
                    <BreadcrumbItem>{`vs. ${capitalizeFirstLetter(team_two_manager)}`}</BreadcrumbItem>
                </Breadcrumbs>
                {headToHead && <HeadToHeadStats head_to_head={headToHead}/>}
                <h1 className={"pt-4 pb-2 text-2xl"}>Matchup History</h1>
                <div className={"flex flex-wrap justify-around"}>
                {matchups && <ScoreCardGroup matchups={matchups} showDate={true}/>}
                </div>
            </div>
        </div>
    );
}