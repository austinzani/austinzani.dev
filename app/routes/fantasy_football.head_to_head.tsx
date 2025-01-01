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

type StatRowProps = {
    leftValue: string | number;
    rightValue: string | number;
    label: string;
    isHigherBetter?: boolean;
}

const StatRow = ({ leftValue, rightValue, label, isHigherBetter = true }: StatRowProps) => {
    const leftNum = typeof leftValue === 'string' ? parseFloat(leftValue) : leftValue;
    const rightNum = typeof rightValue === 'string' ? parseFloat(rightValue) : rightValue;
    const leftWins = !isNaN(leftNum) && !isNaN(rightNum) && 
        ((isHigherBetter && leftNum > rightNum) || (!isHigherBetter && leftNum < rightNum));
    const rightWins = !isNaN(leftNum) && !isNaN(rightNum) && 
        ((isHigherBetter && rightNum > leftNum) || (!isHigherBetter && rightNum < leftNum));

    return (
        <div className="flex items-center py-2 hover:bg-orange-500/10 rounded-lg transition-colors">
            <div className={`flex-1 text-right ${leftWins ? 'font-medium text-emerald-600 dark:text-emerald-400' : 'text-gray-600 dark:text-gray-400'}`}>
                {leftValue}
            </div>
            <div className="w-32 text-center text-sm text-gray-600 dark:text-gray-400 px-2">
                {label}
            </div>
            <div className={`flex-1 text-left ${rightWins ? 'font-medium text-emerald-600 dark:text-emerald-400' : 'text-gray-600 dark:text-gray-400'}`}>
                {rightValue}
            </div>
        </div>
    );
};

const HeadToHeadStats = ({ head_to_head }: {
    head_to_head: Database['public']['CompositeTypes']['head_to_head_object'][]
}) => {
    const team_one_manager = capitalizeFirstLetter(head_to_head[0].name);
    const team_two_manager = capitalizeFirstLetter(head_to_head[1].name);
    const { managers } = useFootballContext();
    
    const team_one_id = managers.find((manager) => manager.name.toLowerCase() === team_one_manager.toLowerCase())?.id ?? 0;
    const team_two_id = managers.find((manager) => manager.name.toLowerCase() === team_two_manager.toLowerCase())?.id ?? 0;
    
    const head_to_head_alt: HeadToHeadAlt[] = head_to_head.map((manager) => ({
        ...manager,
        record: `${manager.total_wins}-${manager.total_games - manager.total_wins}`,
        playoff_record: `${manager.playoff_wins}-${manager.playoff_games - manager.playoff_wins}`
    }));

    const [team1, team2] = head_to_head_alt;
    const calculateWinRate = (wins: number, games: number) => 
        games > 0 ? ((wins / games) * 100).toFixed(1) + '%' : '0%';

    return (
        <div className="bg-gray-50 dark:bg-zinc-900 rounded-xl p-6">
            {/* Manager Headers */}
            <div className="flex items-center mb-4">
                <Link 
                    to={`/fantasy_football/manager/${team_one_id}`}
                    className="flex-1 text-2xl font-bold hover:text-orange-500 transition-colors hover:underline text-right pr-4"
                    prefetch="intent"
                >
                    {team_one_manager}
                </Link>
                <div className="w-16 text-xl font-light text-gray-600 dark:text-gray-400 text-center">
                    vs
                </div>
                <Link 
                    to={`/fantasy_football/manager/${team_two_id}`}
                    className="flex-1 text-2xl font-bold hover:text-orange-500 transition-colors hover:underline text-left pl-4"
                    prefetch="intent"
                >
                    {team_two_manager}
                </Link>
            </div>

            {/* Records Section */}
            <div className="space-y-1 mb-6">
                <StatRow
                    leftValue={team1.record}
                    rightValue={team2.record}
                    label="Record"
                />
                <div className="flex items-center text-sm text-gray-500 dark:text-gray-500">
                    <div className="flex-1 text-right">
                        {calculateWinRate(team1.total_wins, team1.total_games)} win rate
                    </div>
                    <div className="w-32" />
                    <div className="flex-1 text-left">
                        {calculateWinRate(team2.total_wins, team2.total_games)} win rate
                    </div>
                </div>
            </div>

            {/* Points Section */}
            <div className="space-y-1 mb-6">
                <StatRow
                    leftValue={team1.total_points_for.toFixed(2)}
                    rightValue={team2.total_points_for.toFixed(2)}
                    label="Points Scored"
                />
                <StatRow
                    leftValue={team1.high_point_weeks}
                    rightValue={team2.high_point_weeks}
                    label="High Points"
                />
                <StatRow
                    leftValue={team1.low_point_weeks}
                    rightValue={team2.low_point_weeks}
                    label="Low Points"
                    isHigherBetter={false}
                />
                <StatRow
                    leftValue={team1.playoff_record}
                    rightValue={team2.playoff_record}
                    label="Playoffs"
                />
                <StatRow
                    leftValue={team1.playoff_births}
                    rightValue={team2.playoff_births}
                    label="Berths"
                />
                <StatRow
                    leftValue={team1.championships}
                    rightValue={team2.championships}
                    label="Titles"
                />
                <StatRow
                    leftValue={team1.total_seasons}
                    rightValue={team2.total_seasons}
                    label="Seasons"
                />
            </div>
        </div>
    );
};

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