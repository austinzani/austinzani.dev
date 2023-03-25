import {Outlet, useLoaderData, useOutletContext} from "@remix-run/react";
import React from "react";
import supabase from "~/utils/supabase";

import type { LoaderArgs } from "@remix-run/node";
import type { allTimeObject } from "../../db_types";

export const loader = async ({ request }: LoaderArgs) => {
    // Fetch all manager names and ids for use in all FF pages
    const {data: managerData, error: managerError} = await supabase
        .from('manager')
        .select('id, name')

    // Fetch all years for use in all FF pages
    const {data:yearsData, error:yearsError} = await supabase
        .from('season')
        .select( 'year')
        .order('year', {ascending: false})

    let allTimeData: allTimeObject[] | null = null;

    const {data: allTimeResponse, error: allTimeError} = await supabase
        .rpc('all_time')

    if (managerError || allTimeError) {
        return {
            error: managerError || allTimeError,
            managers: [],
            allTime: [],
            years: [],
        }
    }

    allTimeData = allTimeResponse;
    allTimeData?.sort((a, b) => (b.total_wins / b.total_games) - (a.total_wins / a.total_games))

    // Adding key to years data and All Time as an option
    const years = yearsData?.map(year => {
        return {
            key: `${year.year}`,
            value: `${year.year}`
        }
    })
    years?.unshift({key: 'all_time', value: 'All Time'})

    return {
        error: null,
        managers: managerData ?? [],
        allTime: allTimeData ?? [],
        years: years ?? []
    }
}
type ContextType = { managers: {id: string, name: string}[], allTime: allTimeObject[], years: {key: string, value: string}[] }


export default function Index() {
    const {managers, allTime, years} = useLoaderData<typeof loader>()

    return (
        <Outlet context={{
            managers,
            allTime,
            years
        }} />
    );
}

export const useFootballContext = () => {
    return useOutletContext<ContextType>();
}