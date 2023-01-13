import React, { useState } from "react";
import { useNavigate } from "@remix-run/react";

import { capitalizeFirstLetter } from "~/utils/helpers";

import type { allTimeObject } from "../../../db_types";

import { Item, Select } from "~/components/Select";

import Switch from "~/components/Switch";
import SideNavigation from "~/components/SideNavigation";

import { useFootballContext } from "~/routes/fantasy_football";

const AllTimeTable = ({allTime}: {allTime: allTimeObject[]}) => {
    let [selected, setSelected] = useState(false);

    return (
        <div className={'flex flex-col'}>
            <Switch onChange={setSelected}>Show All Managers</Switch>
            <table className={'table-fixed flex-1'}>
                <thead>
                    <tr>
                        <th className={'px-4 w-[155px] whitespace-nowrap cursor-default font-medium text-left'}>Manager</th>
                        <th className={'px-4 whitespace-nowrap cursor-default font-medium text-right'}>Winning %</th>
                        <th className={'px-4 whitespace-nowrap cursor-default font-medium text-right'}>Titles</th>
                        <th className={'px-4 hidden sm:table-cell whitespace-nowrap cursor-default font-medium text-right'}>Playoff Births</th>
                        <th className={'px-4 hidden sm:table-cell whitespace-nowrap cursor-default font-medium text-right'}>Playoff Record</th>
                        <th className={'px-4 hidden lg:table-cell whitespace-nowrap cursor-default font-medium text-right'}>PF</th>
                        <th className={'px-4 hidden lg:table-cell whitespace-nowrap cursor-default font-medium text-right'}>PA</th>
                        <th className={'px-4 hidden lg:table-cell whitespace-nowrap cursor-default font-medium text-right'}>HP</th>
                        <th className={'px-4 hidden lg:table-cell whitespace-nowrap cursor-default font-medium text-right'}>LP</th>
                    </tr>
                </thead>
                <tbody>
                    {allTime?.map((manager) => {
                        const row = (<tr className={'border-b border-b-orange-500'} key={manager.name}>
                            <td className={'px-4 whitespace-nowrap py-1 cursor-default font-light text-left'}>{capitalizeFirstLetter(manager.name)}</td>
                            <td className={'px-4 tabular-nums whitespace-nowrap py-1 cursor-default font-light text-right'}>{(manager.total_wins / manager.total_games).toFixed(3)}</td>
                            <td className={'px-4 tabular-nums whitespace-nowrap py-1 cursor-default font-light text-right'}>{manager.championships}</td>
                            <td className={'px-4 tabular-nums hidden sm:table-cell whitespace-nowrap py-1 cursor-default font-light text-right'}>{manager.playoff_births}</td>
                            <td className={'px-4 tabular-nums hidden sm:table-cell whitespace-nowrap py-1 cursor-default font-light text-right'}>{manager.playoff_wins} - {manager.playoff_games - manager.playoff_wins}</td>
                            <td className={'px-4 tabular-nums hidden lg:table-cell whitespace-nowrap py-1 cursor-default font-light text-right'}>{manager.total_points_for.toFixed(2)}</td>
                            <td className={'px-4 tabular-nums hidden lg:table-cell whitespace-nowrap py-1 cursor-default font-light text-right'}>{manager.total_points_against.toFixed(2)}</td>
                            <td className={'px-4 tabular-nums hidden lg:table-cell whitespace-nowrap py-1 cursor-default font-light text-right'}>{manager.high_point_weeks}</td>
                            <td className={'px-4 tabular-nums hidden lg:table-cell whitespace-nowrap py-1 cursor-default font-light text-right'}>{manager.low_point_weeks}</td>
                        </tr>)
                        if(selected || (!selected && manager.is_active)) {
                            return row;
                        } else {
                            return null;
                        }
                    })}
                </tbody>
            </table>
        </div>
    )
}

export default function Index() {
    const { allTime, years } = useFootballContext();
    const navigate = useNavigate();
    const [selectedYear, setSelectedYear] = useState("all_time");
    const navOptions = years.map((year) => {
        if(year.key === "all_time") {
            return {
                label: "All Time",
                route: "/fantasy_football",
            }
        } else {
            return {
                label: year.value,
                route: `/fantasy_football/season/${year.key}`,
            }
        }
    })

    return (
    <div className={"mx-3 flex flex-row ap"}>
        <SideNavigation options={navOptions}/>
        <div className="flex flex-col">
        <Select
            label="Pick Year"
            items={years}
            selectedKey={selectedYear}
            onSelectionChange={(selection) => {
                let yearString = selection as string;
                setSelectedYear(yearString);
                console.log(yearString)
                if (yearString !== "all_time") {
                    navigate(`/fantasy_football/season/${selection}`)
                }
            }}
        >
            {years.map(year => <Item key={year.key}>{year.value}</Item>)}
        </Select>
            <div className={"w-fit"}>
        {allTime.length > 0 && <AllTimeTable allTime={allTime} />}
            </div>
        </div>
    </div>
  );
}