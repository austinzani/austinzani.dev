import React, {useState} from "react";
import {useNavigate} from "@remix-run/react";

import {capitalizeFirstLetter} from "~/utils/helpers";

import type {Database} from "../../db_types";

import {Item, Select} from "~/components/Select";

import Switch from "~/components/Switch";
import SideNavigation from "~/components/SideNavigation";

import {useFootballContext} from "~/routes/fantasy_football";
import {id} from "postcss-selector-parser";
import {Breadcrumbs, BreadcrumbItem} from "~/components/Breadcrumb";

const AllTimeTable = ({
    allTime,
    showAll
}: {
    allTime: Database["public"]["CompositeTypes"]["all_time_object"][],
    showAll: boolean
}) => {
    const navigate = useNavigate();
    const { managers } = useFootballContext();

    return (
        <div className="relative">
            <table className="table-fixed w-full">
                <thead>
                    <tr className="border-b border-gray-200 dark:border-gray-700">
                        <th className="px-4 w-[155px] whitespace-nowrap cursor-default font-medium text-left">Manager</th>
                        <th className="px-4 whitespace-nowrap cursor-default font-medium text-right">Record</th>
                        <th className="px-4 whitespace-nowrap cursor-default font-medium text-right min-w-32">
                            Playoffs
                        </th>
                        <th className="px-4 hidden sm:table-cell whitespace-nowrap cursor-default font-medium text-right">
                            High/Low Points
                        </th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                    {allTime?.map((manager) => {
                        const managerId = managers.find((m) => m.name === manager.name)?.id;
                        const row = (
                            <tr
                                key={manager.name}
                                onClick={() => navigate(`/fantasy_football/manager/${managerId}`)}
                                className="hover:bg-orange-500/60 rounded-md group"
                            >
                                <td className="px-4 cursor-pointer whitespace-nowrap py-1 font-light text-left rounded-l-lg">
                                    <div className="h-6">{capitalizeFirstLetter(manager.name)}</div>
                                    <div className="h-5 text-amber-400 text-sm">
                                        {manager.championships > 0 
                                            ? Array(manager.championships).fill('🏆').join(' ')
                                            : '\u00A0'}
                                    </div>
                                </td>
                                <td className="px-4 cursor-pointer tabular-nums whitespace-nowrap py-1 text-right">
                                    <div className="h-6 font-medium">
                                        {(manager.total_wins / manager.total_games).toFixed(3)}
                                    </div>
                                    <div className="h-5 text-gray-400 text-sm">
                                        {manager.total_wins}-{manager.total_games - manager.total_wins}
                                    </div>
                                </td>
                                <td className="px-4 cursor-pointer whitespace-nowrap py-1 text-right">
                                    <div className="h-6 font-medium">
                                        {manager.playoff_births} Berths
                                    </div>
                                    <div className="h-5 text-gray-400 text-sm">
                                        {manager.playoff_wins}-{manager.playoff_games - manager.playoff_wins}
                                    </div>
                                </td>
                                <td className="px-4 cursor-pointer hidden sm:table-cell whitespace-nowrap py-1 text-right rounded-r-lg">
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
                        
                        if (showAll || (!showAll && manager.is_active)) {
                            return row;
                        }
                        return null;
                    })}
                </tbody>
            </table>
        </div>
    );
};


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

export default function Fantasy_footballAll_time() {
    const {allTime, years} = useFootballContext();
    const navigate = useNavigate();
    const [selectedYear, setSelectedYear] = useState("all_time");
    const [selected, setSelected] = useState(false);
    const navOptions = mapYearNav(years);

    return (
        <React.Fragment>
            <SideNavigation options={navOptions} className={'hidden lg:flex'}/>
            <main className="absolute lg:pl-64 flex flex-col w-full">
                <Breadcrumbs className={"pl-3 pt-3"}>
                    <BreadcrumbItem href={"/fantasy_football/all_time"}>Season History</BreadcrumbItem>
                </Breadcrumbs>
                <h2 className={"text-xl m-3 mt-3 border-b w-fit"}>{`League History All Time`}</h2>
                <div className={"mx-3 flex items-center"}>
                    <div className={'lg:hidden my-3 '}>
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
                <div className={"my-3 w-fit"}>
                    {allTime.length > 0 && <AllTimeTable allTime={allTime} showAll={selected}/>}
                </div>
            </main>
        </React.Fragment>
    );
}