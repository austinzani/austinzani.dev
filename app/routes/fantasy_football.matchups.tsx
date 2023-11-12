import {Link, useLoaderData} from "@remix-run/react";
import React from "react";
import supabase from "~/utils/supabase";

import type {LoaderFunctionArgs} from "@remix-run/node";
import {Database} from "../../db_types";
import {ScoreCardGroup} from "~/components/ScoreCard";
import {ChevronLeftIcon, ChevronRightIcon} from "@heroicons/react/24/solid";
import { Breadcrumbs, BreadcrumbItem} from "~/components/Breadcrumb";

interface loaderData {
    error: string | null,
    matchups: null | Database['public']['CompositeTypes']['game_details'][],
    season: null | Database['public']['Tables']['season']['Row']
    year: number,
    week: number
}

export const loader = async ({request}: LoaderFunctionArgs): Promise<loaderData> => {
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
            supabase.from('season').select().eq('year', year_int).maybeSingle()])

        const {data: weekResponse, error: weekError} = matchups
        const {data: seasonResponse, error: seasonError} = season
        if (weekError || seasonError) {
            // Todo: Route them back to the all time page
        }
        return {
            error: null,
            matchups: weekResponse,
            season: seasonResponse,
            year: year_int,
            week: week_int
        }
    }
    return {
        error: "Invalid Year or Week",
        matchups: null,
        season: null,
        year: 0,
        week: 0
    }
}

type paginationButtonProps = {
    to: string,
    disabled: boolean,
    children: JSX.Element
}

const PaginationButton = ({to, disabled, children}: paginationButtonProps) => {
    if(disabled) return children
    return <Link to={to} prefetch={"intent"}>{children}</Link>
}

export default function WeekMatchups() {
    const {error, matchups, year, week, season} = useLoaderData<loaderData>()
    const isPlayoffs = week > (season?.regular_season_weeks ?? 13)
    const winnersBracket = matchups?.filter(matchup => matchup.is_winners_bracket && matchup.is_playoffs && !matchup.is_bye_week)
    const losersBracket = matchups?.filter(matchup => (!matchup.is_winners_bracket || !matchup.is_playoffs) && !matchup.is_bye_week)
    return (
        <div className={'flex justify-center w-full'}>
            <div className={'flex m-3 flex-col w-full max-w-[64rem]'}>
                <Breadcrumbs className={"pb-3"}>
                    <BreadcrumbItem href={`/fantasy_football/season/${year}`}>Season History</BreadcrumbItem>
                    <BreadcrumbItem href={`/fantasy_football/season/${year}`}>Matchups</BreadcrumbItem>
                </Breadcrumbs>
                <div className={"flex flex-col sm:flex-row mb-2 w-full justify-between items-baseline"}>
                    <div className={"flex w-full justify-between sm:justify-start sm:w-auto items-center"}>
                        <h1 className={"text-2xl pr-2"}>{`${year}: Week ${week}`}</h1>
                        <div className={"flex"}>
                            <PaginationButton to={`?year=${year}&week=${week - 1}`} disabled={week === 1}><ChevronLeftIcon
                                className={`h-10 w-10 p-2 rounded-xl ${week === 1 ? "dark:text-gray-700 text-gray-200" : "hover:bg-orange-500/60 dark:text-white"}`}/></PaginationButton>
                            <PaginationButton to={`?year=${year}&week=${week + 1}`} disabled={week === season?.total_weeks}><ChevronRightIcon
                                className={`h-10 w-10 p-2 rounded-xl ${week === season?.total_weeks ? "dark:text-gray-700 text-gray-200" : "hover:bg-orange-500/60 dark:text-white"}`}/></PaginationButton>
                        </div>
                    </div>
                    <h1>{"🚀= High Point    🚽= Low Point"}</h1>
                </div>
                    {(matchups && !isPlayoffs) && <ScoreCardGroup matchups={matchups}/>}
                    {(matchups && isPlayoffs) && (
                        <div>
                            <div>
                                <h1>Winners Bracket</h1>
                                <ScoreCardGroup matchups={winnersBracket!} />
                            </div>
                            <div>
                                <h1>Consolation Matches</h1>
                                <ScoreCardGroup matchups={losersBracket!}/>
                            </div>
                        </div>
                    )}
            </div>
        </div>
    );
}