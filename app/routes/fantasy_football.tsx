import {Outlet, useLoaderData, useOutletContext} from "@remix-run/react";
import React from "react";
import supabase from "~/utils/supabase";

import type { LoaderFunctionArgs } from "@remix-run/node";
import type { Database } from "../../db_types";

export const loader = async ({ request }: LoaderFunctionArgs) => {
    // Fetch all manager names and ids for use in all FF pages
    const {data: managerData, error: managerError} = await supabase
        .from('manager')
        .select('id, name')

    // Fetch all years for use in all FF pages
    const {data:yearsData, error:yearsError} = await supabase
        .from('season')
        .select( 'year')
        .order('year', {ascending: false})


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
    allTimeResponse?.sort((a, b) => (b.total_wins / b.total_games) - (a.total_wins / a.total_games))

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
        allTime: allTimeResponse ?? [],
        years: years ?? []
    }
}
type ContextType = { managers: {id: number, name: string}[], allTime: Database["public"]["CompositeTypes"]["all_time_object"][], years: {key: string, value: string}[] }


export default function Index() {
    const {managers, allTime, years} = useLoaderData<typeof loader>()

    return (
        <div className="flex">
            <div className="flex justify-center w-full">
                <div className="w-full max-w-[64rem] mx-auto px-3">
                    <Outlet context={{
                        managers,
                        allTime,
                        years
                    }} />
                </div>
            </div>
        </div>

    );
}

export const useFootballContext = () => {
    return useOutletContext<ContextType>();
}