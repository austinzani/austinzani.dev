import React, {useState} from "react";
import {useNavigate} from "@remix-run/react";

import {capitalizeFirstLetter} from "~/utils/helpers";

import type {Database} from "../../../db_types";

import {Item, Select} from "~/components/Select";

import Switch from "~/components/Switch";
import SideNavigation from "~/components/SideNavigation";

import {useFootballContext} from "~/routes/fantasy_football";
import {id} from "postcss-selector-parser";

const AllTimeTable = ({allTime, showAll}: { allTime: Database["public"]["CompositeTypes"]["all_time_object"][], showAll: boolean }) => {
    const navigate = useNavigate();
    const {managers} = useFootballContext();
    return (
        <table className={'table-fixed w-full'}>
            <thead>
            <tr>
                <th className={'px-4 w-[155px] whitespace-nowrap cursor-default font-medium text-left'}>Manager</th>
                <th className={'px-4 whitespace-nowrap cursor-default font-medium text-right'}>Winning %</th>
                <th className={'px-4 whitespace-nowrap cursor-default font-medium text-right'}>Titles</th>
                <th className={'px-4 hidden sm:table-cell whitespace-nowrap cursor-default font-medium text-right min-w-32'}>Playoff
                    Births
                </th>
                <th className={'px-4 hidden sm:table-cell whitespace-nowrap cursor-default font-medium text-right min-w-32'}>Playoff
                    Record
                </th>
                <th className={'px-4 hidden lg:table-cell whitespace-nowrap cursor-default font-medium text-right'}>HP</th>
                <th className={'px-4 hidden lg:table-cell whitespace-nowrap cursor-default font-medium text-right'}>LP</th>
            </tr>
            </thead>
            <tbody>
            {allTime?.map((manager) => {
                const managerId = managers.find((m) => m.name === manager.name)?.id;
                const row = (<tr onClick={() => navigate(`/fantasy_football/manager/${managerId}`)} className={'hover:bg-orange-500/60 rounded-md'} key={manager.name}>
                    <td className={'px-4 cursor-pointer whitespace-nowrap py-1 cursor-default font-light text-left rounded-l-lg'}>{capitalizeFirstLetter(manager.name)}</td>
                    <td className={'px-4 cursor-pointer tabular-nums whitespace-nowrap py-1 cursor-default font-light text-right'}>{(manager.total_wins / manager.total_games).toFixed(3)}</td>
                    <td className={'px-4 cursor-pointer tabular-nums whitespace-nowrap py-1 cursor-default font-light text-right rounded-r-lg sm:rounded-none'}>{manager.championships}</td>
                    <td className={'px-4 cursor-pointer tabular-nums hidden sm:table-cell whitespace-nowrap py-1 cursor-default font-light text-right'}>{manager.playoff_births}</td>
                    <td className={'px-4 cursor-pointer tabular-nums hidden sm:table-cell whitespace-nowrap py-1 cursor-default font-light text-right sm:rounded-r-lg lg:rounded-none'}>{manager.playoff_wins} - {manager.playoff_games - manager.playoff_wins}</td>
                    <td className={'px-4 cursor-pointer tabular-nums hidden lg:table-cell whitespace-nowrap py-1 cursor-default font-light text-right'}>{manager.high_point_weeks}</td>
                    <td className={'px-4 cursor-pointer tabular-nums hidden lg:table-cell whitespace-nowrap py-1 cursor-default font-light text-right rounded-r-lg'}>{manager.low_point_weeks}</td>
                </tr>)
                if (showAll || (!showAll && manager.is_active)) {
                    return row;
                } else {
                    return null;
                }
            })}
            </tbody>
        </table>
    )
}


export const mapYearNav = (years: { key: string, value: string }[]) => {
    return years.map((year) => {
        if (year.key === "all_time") {
            return {
                label: "All Time",
                route: "/fantasy_football/all_time",
            }
        } else {
            return {
                label: year.value,
                route: `/fantasy_football/season/${year.key}`,
            }
        }
    })
}

export default function All_time() {
    const {allTime, years} = useFootballContext();
    const navigate = useNavigate();
    const [selectedYear, setSelectedYear] = useState("all_time");
    const [selected, setSelected] = useState(false);
    const navOptions = mapYearNav(years);

    return (
        <React.Fragment>
            <SideNavigation options={navOptions} className={'hidden lg:flex'}/>
            <main className="absolute lg:pl-64 flex flex-col w-full">
                <h2 className={"text-xl mx-3 mt-3 border-b w-fit"}>{`League History All Time`}</h2>
                <div className={"mx-3 flex items-center"}>
                    <div className={'lg:hidden mb-2 mr-2'}>
                        <Select
                            label="Pick Year"
                            items={years}
                            selectedKey={selectedYear}
                            onSelectionChange={(selection) => {
                                let yearString = selection as string;
                                setSelectedYear(yearString);
                                if (yearString !== "all_time") {
                                    navigate(`/fantasy_football/season/${selection}`)
                                }
                            }}
                        >
                            {years.map(year => <Item key={year.key}>{year.value}</Item>)}
                        </Select>
                    </div>
                    <Switch onChange={setSelected}>Show All Managers</Switch>
                </div>
                <div className={"w-fit"}>
                    {allTime.length > 0 && <AllTimeTable allTime={allTime} showAll={selected}/>}
                </div>
            </main>
        </React.Fragment>
    );
}