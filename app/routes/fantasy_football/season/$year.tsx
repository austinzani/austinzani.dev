import {useLoaderData, useNavigate} from "@remix-run/react";
import React, {useState} from "react";
import supabase from "~/utils/supabase";

import {capitalizeFirstLetter} from "~/utils/helpers";

import type {LoaderArgs} from "@remix-run/node";
import type {seasonDetailsObject} from "../../../../db_types";

import {useFootballContext} from "~/routes/fantasy_football";

import {Item, Select} from "~/components/Select";

import {mapYearNav} from "~/routes/fantasy_football/all_time";
import SideNavigation from "~/components/SideNavigation";

export const loader = async ({params}: LoaderArgs) => {
    const season = params.year;
    console.log(season)
    if (season) {
        const seasonInt = parseInt(season);
        if (!seasonInt) {
            return {
                error: "Invalid season",
                season: [],
                year: seasonInt
            }
        }

        const {data: seasonResponse, error: seasonError} = await supabase
            .rpc('season_details', {season_year: seasonInt})

        seasonResponse?.sort((a, b) => b.total_wins - a.total_wins);

        if (seasonError) {
            return {
                error: seasonError,
                season: [],
                year: seasonInt
            }
        } else {
            return {
                error: null,
                season: seasonResponse,
                year: seasonInt
            }
        }
    } else {
        // TODO: Route them back to the all time page
    }
}

const SeasonTable = ({season}: { season: seasonDetailsObject[] }) => {
    return (
        <table className='table-auto'>
            <thead>
            <tr>
                <th className={'px-4 cursor-default font-medium text-left'}>Manager</th>
                <th className={'px-4 cursor-default font-medium text-right'}>Record</th>
                <th className={'px-4 cursor-default hidden sm:table-cell font-medium text-right'}>PF</th>
                <th className={'px-4 cursor-default hidden sm:table-cell font-medium text-right'}>PA</th>
                <th className={'px-4 cursor-default hidden lg:table-cell font-medium text-right'}>HP</th>
                <th className={'px-4 cursor-default hidden lg:table-cell font-medium text-right'}>LP</th>
                <th className={'px-4 cursor-default hidden lg:table-cell font-medium text-right'}>Playoff Record</th>
            </tr>
            </thead>
            <tbody>
            {season?.map((manager) => (
                <tr className={'hover:bg-orange-500/60 rounded-md'} key={manager.manager_name}>
                    <td className={'px-4 tabular-nums py-1 cursor-default font-light text-left rounded-l-lg'}>{capitalizeFirstLetter(manager.manager_name)}{manager.championships ? " 🏆" : ""}</td>
                    <td className={'px-4 tabular-nums py-1 cursor-default font-light text-right rounded-r-lg sm:rounded-none'}>{manager.total_wins} - {manager.total_games - manager.total_wins}</td>
                    <td className={'px-4 tabular-nums hidden sm:table-cell py-1 cursor-default font-light text-right'}>{manager.total_points_for.toFixed(2)}</td>
                    <td className={'px-4 tabular-nums hidden sm:table-cell py-1 cursor-default font-light text-right sm:rounded-r-lg lg:rounded-none'}>{manager.total_points_against.toFixed(2)}</td>
                    <td className={'px-4 tabular-nums hidden lg:table-cell py-1 cursor-default font-light text-right'}>{manager.high_point_weeks}</td>
                    <td className={'px-4 tabular-nums hidden lg:table-cell py-1 cursor-default font-light text-right'}>{manager.low_point_weeks}</td>
                    <td className={'px-4 tabular-nums hidden lg:table-cell py-1 cursor-default font-light text-right rounded-r-lg'}>{manager.playoff_wins} - {manager.playoff_games - manager.playoff_wins}</td>
                </tr>
            ))}
            </tbody>
        </table>
    )
}

export default function Year() {
    const {error, season, year} = useLoaderData<typeof loader>()
    const {years} = useFootballContext();
    const navigate = useNavigate();
    let [selectedYear, setSelectedYear] = useState(`${year}`);
    const navOptions = mapYearNav(years);

    return (
        <React.Fragment>
            <SideNavigation options={navOptions} className={'hidden lg:flex'}/>
            <main className="absolute lg:pl-64 flex flex-col w-full">
                <h2 className={"text-xl mx-3 mt-3 border-b w-fit"}>{`League History ${year}`}</h2>
                <div className={'lg:hidden mx-3 mb-2'}>
                    <Select
                        label="Pick Year"
                        items={years}
                        selectedKey={selectedYear}
                        onSelectionChange={(selection) => {
                            let yearString = selection as string;
                            setSelectedYear(yearString);
                            if (yearString === "all_time") {
                                navigate(`/fantasy_football/all_time`)
                            } else if (yearString !== `${year}`) {
                                navigate(`/fantasy_football/season/${selection}`)
                            }
                        }}
                    >
                        {years.map(year => <Item key={year.key}>{year.value}</Item>)}
                    </Select>
                </div>
                {season.length > 0 && <SeasonTable season={season}/>}
            </main>
        </React.Fragment>
    );
}