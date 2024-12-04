import {Link, useLoaderData, useNavigate} from "@remix-run/react";
import React, {useState} from "react";
import supabase from "~/utils/supabase";

import {capitalizeFirstLetter} from "~/utils/helpers";

import type {LoaderFunctionArgs} from "@remix-run/node";
import type {Database} from "../../db_types";

import {useFootballContext} from "~/routes/fantasy_football";

import {Item, Select} from "~/components/Select";

import {mapYearNav} from "~/routes/fantasy_football.all_time";
import SideNavigation from "~/components/SideNavigation";
import Icon from "~/components/Icon";
import {BreadcrumbItem, Breadcrumbs} from "~/components/Breadcrumb";

export const loader = async ({params}: LoaderFunctionArgs) => {
    const season = params.year;
    if (season) {
        const seasonInt = parseInt(season);
        if (!seasonInt) {
            return {
                error: "Invalid season",
                season: null,
                year: seasonInt
            }
        }

        const {data: seasonResponse, error: seasonError} = await supabase
            .rpc('season_details', {season_year: seasonInt})

        // Sort by total wins descending and use most points for as tie breaker
        seasonResponse?.sort((a, b) => {
            if (b.total_wins !== a.total_wins) {
                return b.total_wins - a.total_wins;
            }
            return b.total_points_for - a.total_points_for;
        })

        if (seasonError) {
            return {
                error: seasonError,
                season: null,
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

const SeasonTable = ({season}: { season: Database["public"]["CompositeTypes"]["season_details_object"][] }) => {
    const navigate = useNavigate();
    const {managers} = useFootballContext();

    return (
        <div className="relative">
            <table className="table-fixed w-full">
                <thead>
                    <tr className="border-b border-gray-200 dark:border-gray-700">
                        <th className="px-4 w-[155px] whitespace-nowrap cursor-default font-medium text-left">Manager</th>
                        <th className="px-4 whitespace-nowrap cursor-default font-medium text-right">Record</th>
                        <th className="px-4 whitespace-nowrap cursor-default font-medium text-right min-w-32">Points</th>
                        <th className="px-4 hidden lg:table-cell whitespace-nowrap cursor-default font-medium text-right">High/Low Points</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                    {season?.map((manager) => {
                        const managerId = managers.find((m) => m.name === manager.manager_name)?.id;
                        return (
                            <tr
                                key={manager.manager_name}
                                onClick={() => navigate(`/fantasy_football/manager/${managerId}`)}
                                className="hover:bg-orange-500/60 rounded-md"
                            >
                                <td className="px-4 cursor-pointer whitespace-nowrap py-1 font-light text-left rounded-l-lg">
                                    <div className="h-6">{capitalizeFirstLetter(manager.manager_name)}</div>
                                    <div className="h-5 text-amber-400 text-sm">
                                        {manager.championships ? "🏆" : "\u00A0"}
                                    </div>
                                </td>
                                <td className="px-4 cursor-pointer tabular-nums whitespace-nowrap py-1 text-right">
                                    <div className="h-6 font-medium">
                                        {manager.total_wins}-{manager.total_games - manager.total_wins}
                                    </div>
                                    {manager.playoff_wins > 0 || manager.playoff_games > 0 ? (
                                        <div className="h-5 text-gray-400 text-sm">
                                            Playoffs: {manager.playoff_wins}-{manager.playoff_games - manager.playoff_wins}
                                        </div>
                                    ) : (
                                        <div className="h-5">{"\u00A0"}</div>
                                    )}
                                </td>
                                <td className="px-4 cursor-pointer whitespace-nowrap py-1 text-right">
                                    <div className="h-6 font-medium">
                                        PF: {manager.total_points_for.toFixed(2)}
                                    </div>
                                    <div className="h-5 text-gray-400 text-sm">
                                        PA: {manager.total_points_against.toFixed(2)}
                                    </div>
                                </td>
                                <td className="px-4 cursor-pointer hidden lg:table-cell whitespace-nowrap py-1 text-right rounded-r-lg">
                                    <div className="h-6">
                                        <span className="text-emerald-400 font-medium">
                                            {manager.high_point_weeks} High
                                        </span>
                                    </div>
                                    <div className="h-5">
                                        <span className="text-red-400 font-medium">
                                            {manager.low_point_weeks} Low
                                        </span>
                                    </div>
                                </td>
                            </tr>
                        );
                    })}
                </tbody>
            </table>
        </div>
    );
};

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
                <Breadcrumbs className={"pl-3 pt-3"}>
                    <BreadcrumbItem href={"/fantasy_football/all_time"}>Season History</BreadcrumbItem>
                </Breadcrumbs>
                <div className={'flex items-baseline'}>
                <h2 className={"text-xl m-3 mt-3 border-b w-fit"}>{`League History ${year}`}</h2>
                <Link to={`/fantasy_football/matchups?year=${year}&week=1`} className={'mx-3 px-3 p-1 border rounded-xl border-orange-500 text-orange-500'}>{`View Schedule`}<Icon className={"ml-2"} name={"chevron-right"} /></Link>
                </div>
                <div className={'lg:hidden m-3 '}>
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
                {(season?.length && season.length > 0) && <SeasonTable season={season}/>}
            </main>
        </React.Fragment>
    );
}