import {Outlet, useLoaderData, useOutletContext} from "@remix-run/react";

import type { LoaderFunctionArgs } from "@remix-run/node";
import type { Database } from "../../db_types";
import { getLeagueStats } from "~/utils/league-stats.server";

export const loader = async ({ request }: LoaderFunctionArgs) => {
    const leagueStats = await getLeagueStats();
    if (leagueStats.error) {
        return {
            error: leagueStats.error,
            managers: [],
            allTime: [],
            years: [],
            latestChampionFirstName: null,
        }
    }

    return {
        error: null,
        managers: leagueStats.managers,
        allTime: leagueStats.allTime,
        years: leagueStats.years,
        latestChampionFirstName: leagueStats.latestChampionFirstName,
    }
}
type ContextType = { managers: {id: number, name: string}[], allTime: Database["public"]["CompositeTypes"]["all_time_object"][], years: {key: string, value: string}[], latestChampionFirstName: string | null }


export default function Index() {
    const {managers, allTime, years, latestChampionFirstName} = useLoaderData<typeof loader>()

    return (
        <div className="flex">
            <div className="flex justify-center w-full">
                <div className="w-full max-w-[64rem] mx-auto px-3">
                    <Outlet context={{
                        managers,
                        allTime,
                        years,
                        latestChampionFirstName
                    }} />
                </div>
            </div>
        </div>

    );
}

export const useFootballContext = () => {
    return useOutletContext<ContextType>();
}
