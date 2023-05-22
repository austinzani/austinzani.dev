import React from 'react';
import {Database} from "../../../db_types";
import {capitalizeFirstLetter} from "~/utils/helpers";
import Icon from "~/components/Icon";

const ScoreCard = ({matchup, showDate}: {
    matchup: Database['public']['CompositeTypes']['game_details'],
    showDate?: boolean
}) => {
    const playoffMatchup = matchup.is_winners_bracket && matchup.is_playoffs
    const highPoint = matchup.high_point
    const lowPoint = matchup.low_point
    const homeTeamIcon = matchup.home_manager_name === highPoint ? " 🚀" : matchup.home_manager_name === lowPoint ? " 🚽" : ""
    const awayTeamIcon = matchup.is_bye_week ? "" : matchup.away_manager_name === highPoint ? " 🚀" : matchup.away_manager_name === lowPoint ? " 🚽" : ""
    return (
        <div className={"max-w-md w-full mb-2"}>
            {showDate &&
                <h1 className={'text-md font-light'}>{`Week ${matchup.week}, ${matchup.year}${playoffMatchup ? " (Playoffs)" : ""}`}</h1>}
            <div className={'flex flex-col mb-2 shadow-xl dark:shadow-white/20 rounded'}>
                <div className={'flex flex-row justify-between items-center p-1'}>
                    <div className={'flex flex-row items-center'}>
                        {matchup.home_logo ? <img className="w-10 h-10 mr-2 p-0.5 rounded" src={matchup.home_logo}
                                                  alt="Team Icon"/> : <Icon name={"football-ball"} className={"w-8 h-8 mr-2 p-0.5 rounded"}/>}
                        <div className={'flex flex-col'}>
                            <h1>{matchup.home_team}{homeTeamIcon}</h1>
                            <h4 className={'font-light text-sm'}>{capitalizeFirstLetter(matchup.home_manager_name)}</h4>
                        </div>
                    </div>
                    <h1 className={"text-2xl tabular-nums mr-2"}>{matchup.home_score}</h1>
                </div>
                <div className={'flex flex-row justify-between items-center p-1'}>
                    <div className={'flex flex-row items-center'}>
                        {matchup.away_logo ? <img className="w-10 h-10 mr-2 p-0.5 rounded" src={matchup.away_logo}
                                                    alt="Team Icon"/> : <Icon name={"football-ball"} className={"w-8 h-8 mr-2 p-0.5 rounded"}/>}
                        <div className={'flex flex-col'}>
                            <h1>{matchup.away_team}{awayTeamIcon}</h1>
                            <h4 className={'font-light text-sm'}>{capitalizeFirstLetter(matchup.is_bye_week ? "Bye Week" : matchup.away_manager_name)}</h4>
                        </div>
                    </div>
                    <h1 className={"text-2xl tabular-nums mr-2"}>{matchup.away_score ?? "-"}</h1>
                </div>
            </div>
        </div>
    );
};

export default ScoreCard;

export const ScoreCardGroup = ({matchups, showDate = false}: {matchups: Database['public']['CompositeTypes']['game_details'][], showDate?: boolean}) => {
    return (
        <div className={"flex flex-wrap justify-around"}>
            {matchups.map((matchup, index: number) => {

                return <ScoreCard key={`${matchup.home_team}-${matchup.away_team}-${index}`} matchup={matchup} showDate={showDate}/>
            })}
            {!!(matchups.length % 2) && <div className={"flex-none max-w-md w-full mb-2"}/> }
        </div>
    )
}

