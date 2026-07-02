import React, {useState} from "react";
import {useNavigate} from "@remix-run/react";
import {redirect} from "@remix-run/node";

import {capitalizeFirstLetter} from "~/utils/helpers";

import type {Database} from "../../db_types";

import {useFootballContext} from "~/routes/fantasy_football";
import ScrollablePills from "~/components/ScrollablePills";
import ManagerAvatar from "~/components/ManagerAvatar";
import {
    FantasyMain,
    FantasySectionHeading,
    HighLowPair,
    fantasyTableBodyClass,
    fantasyTableHeadRowClass,
    fantasyTableRowClass,
    fantasyTableShellClass,
} from "~/components/FantasyFootballUI";

export const loader = async () => redirect("/fantasy_football");

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
    const transactionsPerSeason = (item: typeof allTime[0]) =>
        item.total_seasons ? (item.transactions ?? 0) / item.total_seasons : 0;
    const byChampionships = [...allTime].sort((a, b) => (b.championships ?? 0) - (a.championships ?? 0)).slice(0, 5);
    const byTransactionsPerSeason = [...allTime].sort((a, b) => transactionsPerSeason(b) - transactionsPerSeason(a));
    const byPlayoffs = [...allTime].sort((a, b) => (b.playoff_births ?? 0) - (a.playoff_births ?? 0)).slice(0, 5);
    const byHighPoints = [...allTime].sort((a, b) => (b.high_point_weeks ?? 0) - (a.high_point_weeks ?? 0)).slice(0, 5);
    const byLowPoints = [...allTime].sort((a, b) => (b.low_point_weeks ?? 0) - (a.low_point_weeks ?? 0)).slice(0, 5);

    const StatList = ({ title, data, getValue, getSubtitle }: {
        title: string,
        data: typeof allTime,
        getValue: (item: typeof data[0]) => string,
        getSubtitle: (item: typeof data[0]) => string
    }) => (
        <div>
            <div className="mb-1 border-b-[1.5px] border-line pb-2 font-mono text-xs font-semibold uppercase tracking-[0.06em] text-zinc-500 dark:border-zinc-500">{title}</div>
            {data.map((item, index) => (
                <div key={item.name} className="flex items-center justify-between border-b border-dotted border-line-muted py-2 last:border-b-0">
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
        <div className="mb-7 w-full">
            <FantasySectionHeading>League Records</FantasySectionHeading>
            <div className="grid grid-cols-1 gap-7 md:grid-cols-3">
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
                    getSubtitle={(item) => `${transactionsPerSeason(item).toFixed(2)}`}
                />
                <StatList
                    title="Least Transactions Per Season"
                    data={byTransactionsPerSeason.slice(-5).reverse()}
                    getValue={(item) => capitalizeFirstLetter(item.name)}
                    getSubtitle={(item) => `${transactionsPerSeason(item).toFixed(2)}`}
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
        <div className={fantasyTableShellClass}>
            <table className="w-full min-w-[42rem] table-fixed">
                <thead>
                    <tr className={fantasyTableHeadRowClass}>
                        <th className="px-4 w-[185px] whitespace-nowrap cursor-default font-medium text-left">Manager</th>
                        <th className="px-4 whitespace-nowrap cursor-default font-medium text-right">Manager Record</th>
                        <th className="px-4 whitespace-nowrap cursor-default font-medium text-right min-w-32">
                            Playoffs
                        </th>
                        <th className="px-4 whitespace-nowrap cursor-default font-medium text-right">
                            Titles
                        </th>
                        <th className="px-4 hidden sm:table-cell whitespace-nowrap cursor-default font-medium text-right">
                            High/Low Points
                        </th>
                    </tr>
                </thead>
                <tbody className={fantasyTableBodyClass}>
                    {allTime?.map((manager) => {
                        const managerId = managers.find((m) => m.name.toLowerCase() === manager.name.toLowerCase())?.id;
                        const winPercentage = manager.total_games > 0
                            ? (manager.total_wins / manager.total_games).toFixed(3)
                            : ".000";
                        const row = (
                            <tr
                                key={manager.name}
                                onClick={() => navigate(`/fantasy_football/manager/${managerId}`)}
                                className={fantasyTableRowClass}
                            >
                                <td className="px-4 cursor-pointer whitespace-nowrap py-2 font-light text-left">
                                    <div className="flex items-center gap-3">
                                        <ManagerAvatar id={managerId} name={manager.name} className="h-9 w-9 text-xs" />
                                        <div>
                                            <div className="h-6 font-semibold">{capitalizeFirstLetter(manager.name)}</div>
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
                                <td className="px-4 cursor-pointer whitespace-nowrap py-1 text-right font-mono text-sm font-semibold text-accent">
                                    {manager.championships > 0 ? "★".repeat(manager.championships) : "—"}
                                </td>
                                <td className="px-4 cursor-pointer hidden sm:table-cell whitespace-nowrap py-1 text-right rounded-r-lg">
                                    <HighLowPair
                                        high={manager.high_point_weeks}
                                        low={manager.low_point_weeks}
                                    />
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

export function AllTimeArchiveContent() {
    const {allTime, years} = useFootballContext();
    const navigate = useNavigate();
    const [showAll, setShowAll] = useState(false);
    const [selectedView, setSelectedView] = useState<"standings" | "records">("standings");
    const seasonYears = years.filter((year) => year.key !== "all_time");

    const handleYearChange = (yearKey: string) => {
        navigate(`/fantasy_football/season/${yearKey}`);
    };

    return (
        <FantasyMain>
            <ScrollablePills 
                items={seasonYears}
                selectedKey=""
                onSelectionChange={handleYearChange}
            />

            <div className="mb-[26px] inline-flex rounded-full bg-zinc-200 p-1 dark:bg-zinc-900">
                <button
                    type="button"
                    onClick={() => setSelectedView("standings")}
                    className={`rounded-full px-[18px] py-2.5 font-mono text-[11.5px] font-semibold uppercase tracking-[0.05em] ${
                        selectedView === "standings"
                            ? "bg-black text-white dark:bg-zinc-50 dark:text-black"
                            : "text-ink dark:text-zinc-100"
                    }`}
                >
                    Standings
                </button>
                <button
                    type="button"
                    onClick={() => setSelectedView("records")}
                    className={`rounded-full px-[18px] py-2.5 font-mono text-[11.5px] font-semibold uppercase tracking-[0.05em] ${
                        selectedView === "records"
                            ? "bg-black text-white dark:bg-zinc-50 dark:text-black"
                            : "text-ink dark:text-zinc-100"
                    }`}
                >
                    Records
                </button>
            </div>

            {selectedView === "records" ? (
                <AllTimeSummary allTime={allTime} showAll={showAll} />
            ) : (
                <>
                    <AllTimeTable allTime={allTime} showAll={showAll}/>
                    {!showAll && allTime.length > 10 && (
                        <button
                            onClick={() => setShowAll(true)}
                            className="mx-auto my-4 border border-dashed border-accent px-4 py-2 font-mono text-xs font-semibold uppercase tracking-wide text-accent transition-colors hover:bg-accent hover:text-accent-ink"
                        >
                            Show All Teams
                        </button>
                    )}
                </>
            )}
        </FantasyMain>
    );
}

export default function Fantasy_footballAll_time() {
    return (
        <div className={'flex justify-center w-full'}>
            <AllTimeArchiveContent />
        </div>
    );
}
