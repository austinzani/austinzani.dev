import React, {useState} from "react";
import {useNavigate} from "@remix-run/react";

import {capitalizeFirstLetter} from "~/utils/helpers";

import type {Database} from "../../db_types";

import {useFootballContext} from "~/routes/fantasy_football";
import {Breadcrumbs, BreadcrumbItem} from "~/components/Breadcrumb";
import ScrollablePills from "~/components/ScrollablePills";
import ManagerAvatar from "~/components/ManagerAvatar";

const AllTimeSummary = ({
    allTime,
    showAll
}: {
    allTime: Database["public"]["CompositeTypes"]["all_time_object"][]
    showAll: boolean
}) => {
    if (!showAll) {
        allTime = allTime.filter((item) => item.is_active);
    }
    // Sort players by different categories
    const byChampionships = [...allTime].sort((a, b) => b.championships - a.championships).slice(0, 5);
    const byTransactionsPerSeason = [...allTime].sort((a, b) => (b.transactions / b.total_seasons) - (a.transactions / a.total_seasons));
    const byPlayoffs = [...allTime].sort((a, b) => b.playoff_births - a.playoff_births).slice(0, 5);
    const byHighPoints = [...allTime].sort((a, b) => b.high_point_weeks - a.high_point_weeks).slice(0, 5);
    const byLowPoints = [...allTime].sort((a, b) => b.low_point_weeks - a.low_point_weeks).slice(0, 5);

    const StatList = ({ title, data, getValue, getSubtitle }: {
        title: string,
        data: typeof allTime,
        getValue: (item: typeof data[0]) => string,
        getSubtitle: (item: typeof data[0]) => string
    }) => (
        <div className="flex flex-col border border-dashed border-line-muted bg-surface p-3">
            <div className="mb-2 font-mono text-xs font-semibold uppercase tracking-wide text-accent">{title}</div>
            {data.map((item, index) => (
                <div key={item.name} className="flex justify-between items-center mb-1 last:mb-0">
                    <div className="flex items-center">
                        <span className="w-4 font-mono text-xs text-ink-muted">{index + 1}.</span>
                        <span className="text-sm font-medium ml-2">{capitalizeFirstLetter(item.name)}</span>
                    </div>
                    <span className="text-sm text-ink-muted">{getSubtitle(item)}</span>
                </div>
            ))}
        </div>
    );

    return (
        <div className="mb-4 w-full border-2 border-dashed border-line bg-paper-muted p-4">
            <h2 className="mb-4 font-display text-4xl italic">League Records</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <StatList
                    title="Championships"
                    data={byChampionships}
                    getValue={(item) => capitalizeFirstLetter(item.name)}
                    getSubtitle={(item) => `${item.championships} titles`}
                />
                <StatList
                    title="Playoff Appearances"
                    data={byPlayoffs}
                    getValue={(item) => capitalizeFirstLetter(item.name)}
                    getSubtitle={(item) => `${item.playoff_births} times`}
                />
                <StatList
                    title="High Points"
                    data={byHighPoints}
                    getValue={(item) => capitalizeFirstLetter(item.name)}
                    getSubtitle={(item) => `${item.high_point_weeks} weeks`}
                />
                <StatList
                    title="Low Points"
                    data={byLowPoints}
                    getValue={(item) => capitalizeFirstLetter(item.name)}
                    getSubtitle={(item) => `${item.low_point_weeks} weeks`}
                />
                <StatList
                    title="Most Transactions Per Season"
                    data={byTransactionsPerSeason.slice(0, 5)}
                    getValue={(item) => capitalizeFirstLetter(item.name)}
                    getSubtitle={(item) => `${(item.transactions / item.total_seasons).toFixed(2)}`}
                />
                <StatList
                    title="Least Transactions Per Season"
                    data={byTransactionsPerSeason.slice(-5).reverse()}
                    getValue={(item) => capitalizeFirstLetter(item.name)}
                    getSubtitle={(item) => `${(item.transactions / item.total_seasons).toFixed(2)}`}
                />
            </div>
        </div>
    );
};

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
        <div className="relative overflow-x-auto border-2 border-dashed border-line bg-surface p-2">
            <table className="table-fixed w-full min-w-[42rem]">
                <thead>
                    <tr className="border-b border-dashed border-line-muted font-mono text-xs uppercase tracking-wide text-ink-muted">
                        <th className="px-4 w-[185px] whitespace-nowrap cursor-default font-medium text-left">Manager</th>
                        <th className="px-4 whitespace-nowrap cursor-default font-medium text-right">Record</th>
                        <th className="px-4 whitespace-nowrap cursor-default font-medium text-right min-w-32">
                            Playoffs
                        </th>
                        <th className="px-4 hidden sm:table-cell whitespace-nowrap cursor-default font-medium text-right">
                            High/Low Points
                        </th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-dashed divide-line-muted">
                    {allTime?.map((manager) => {
                        const managerId = managers.find((m) => m.name === manager.name)?.id;
                        const winPercentage = manager.total_games > 0
                            ? (manager.total_wins / manager.total_games).toFixed(3)
                            : ".000";
                        const row = (
                            <tr
                                key={manager.name}
                                onClick={() => navigate(`/fantasy_football/manager/${managerId}`)}
                                className="group hover:bg-accent-soft"
                            >
                                <td className="px-4 cursor-pointer whitespace-nowrap py-2 font-light text-left">
                                    <div className="flex items-center gap-3">
                                        <ManagerAvatar id={managerId} name={manager.name} className="h-9 w-9 text-xs" />
                                        <div>
                                            <div className="h-6 font-semibold">{capitalizeFirstLetter(manager.name)}</div>
                                            <div className="h-5 text-amber-500 text-sm">
                                                {manager.championships > 0 
                                                    ? `${manager.championships} titles`
                                                    : '\u00A0'}
                                            </div>
                                        </div>
                                    </div>
                                </td>
                                <td className="px-4 cursor-pointer tabular-nums whitespace-nowrap py-1 text-right">
                                    <div className="h-6 font-medium">
                                        {winPercentage}
                                    </div>
                                    <div className="h-5 text-ink-muted text-sm">
                                        {manager.total_wins}-{manager.total_games - manager.total_wins}
                                    </div>
                                </td>
                                <td className="px-4 cursor-pointer whitespace-nowrap py-1 text-right">
                                    <div className="h-6 font-medium">
                                        {manager.playoff_births} Berths
                                    </div>
                                    <div className="h-5 text-ink-muted text-sm">
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
    const [showAll, setShowAll] = useState(false);
    const navOptions = mapYearNav(years);

    const handleYearChange = (yearKey: string) => {
        setSelectedYear(yearKey);
        if (yearKey === "all_time") {
            navigate(`/fantasy_football/all_time`);
        } else {
            navigate(`/fantasy_football/season/${yearKey}`);
        }
    };

    return (
        <div className={'flex justify-center w-full'}>
            <div className={'flex flex-col w-full max-w-[64rem]'}>
                <Breadcrumbs className={"pt-3"}>
                    <BreadcrumbItem href={"/fantasy_football/all_time"}>League History</BreadcrumbItem>
                </Breadcrumbs>
                <div className={'flex mb-2'}>
                    <h1 className="font-display text-5xl italic">All Time</h1>
                </div>
                
                <ScrollablePills 
                    items={years}
                    selectedKey={selectedYear}
                    onSelectionChange={handleYearChange}
                />

                <div>
                    <AllTimeSummary allTime={allTime} showAll={showAll} />
                </div>
                <AllTimeTable allTime={allTime} showAll={showAll}/>
                {!showAll && allTime.length > 10 && (
                    <button
                        onClick={() => setShowAll(true)}
                        className="mx-auto my-4 border border-dashed border-accent px-4 py-2 font-mono text-xs font-semibold uppercase tracking-wide text-accent transition-colors hover:bg-accent hover:text-accent-ink"
                    >
                        Show All Teams
                    </button>
                )}
            </div>
        </div>
    );
}
