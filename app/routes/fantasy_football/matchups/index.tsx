import {Link, useLoaderData, useNavigate} from "@remix-run/react";
import React, {useState} from "react";
import supabase from "~/utils/supabase";

import {capitalizeFirstLetter} from "~/utils/helpers";
import type {LoaderArgs} from "@remix-run/node";
import {useFootballContext} from "~/routes/fantasy_football";
import {Database} from "../../../../db_types";
import ScoreCard from "~/components/ScoreCard";

interface loaderData {
    error: string | null,
    matchups: null | Database['public']['CompositeTypes']['game_details'][],
    season: null | Database['public']['Tables']['season']['Row']
    year: number,
    week: number
}

export const loader = async ({request}: LoaderArgs): Promise<loaderData> => {
    const url = new URL(request.url);
    const year = url.searchParams.get("year");
    const week = url.searchParams.get("week");
    if (year && week) {
        const year_int = parseInt(year);
        const week_int = parseInt(week);
        if (!year_int || !week_int) {
            // TODO: Route them back to the all time page
        }
        const [matchups, season] = await Promise.all([
            supabase.rpc('week_matchups', {selected_week: week_int, season_year: year_int}),
            supabase.from('season').select().eq('year', year_int)
        ])
        const {data: weekResponse, error: weekError} = matchups
        const {data: seasonResponse, error: seasonError } = season
        if (weekError || seasonError) {
            console.log(weekError)
            // Todo: Route them back to the all time page
        }
        return {
            error: null,
            matchups: weekResponse,
            season: seasonResponse ? seasonResponse[0] : null,
            year: year_int,
            week: week_int
        }
    }
    console.log(year, week, "No good")
    return {
        error: "Invalid Year or Week",
        matchups: null,
        season: null,
        year: 0,
        week: 0
    }
}

export default function WeekMatchups() {
    const {error, matchups, year, week, season} = useLoaderData<loaderData>()
    const {managers} = useFootballContext();
    return (
        <div className={'flex justify-center w-full'}>
            <div className={'flex m-3 flex-col w-full max-w-[64rem]'}>
                <div className={"flex flex-col mb-2 w-full justify-between items-baseline"}>
                    <h1 className={"pt-4 pb-2 text-2xl"}>{`${year} Season: Week ${week}`}</h1>
                    <h1>{"🚀= High Point    🚽= Low Point"}</h1>
                </div>
                <div className={"flex flex-wrap justify-around"}>
                    {matchups && matchups.map((matchup) => {
                        return <ScoreCard matchup={matchup} showDate/>
                    })
                    }
                </div>
            </div>
        </div>
    );
}