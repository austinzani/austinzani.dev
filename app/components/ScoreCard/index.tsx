import React from 'react';
import FootballHelmet from "../../icons/football-helmet-thin.svg";
import {Database} from "../../../db_types";
import {capitalizeFirstLetter} from "~/utils/helpers";

const ScoreCard = ({matchup, showDate}: {
    matchup: Database['public']['CompositeTypes']['game_details'],
    showDate: boolean
}) => {
    const playoffMatchup = matchup.is_winners_bracket && matchup.is_playoffs
    const highPoint = matchup.high_point
    const lowPoint = matchup.low_point
    const homeTeamIcon = matchup.home_manager_name === highPoint ? " 🚀" : matchup.home_manager_name === lowPoint ? " 🚽" : ""
    const awayTeamIcon = matchup.away_manager_name === highPoint ? " 🚀" : matchup.away_manager_name === lowPoint ? " 🚽" : ""
    return (
        <div className={"max-w-md w-full mb-2"}>
            {showDate &&
                <h1 className={'text-md font-light'}>{`Week ${matchup.week}, ${matchup.year}${playoffMatchup ? " (Playoffs)" : ""}`}</h1>}
            <div className={'flex flex-col mb-2 border border-white rounded'}>
                <div className={'flex flex-row justify-between items-center p-1'}>
                    <div className={'flex flex-row items-center'}>
                        <img className="w-10 h-10 mr-2 p-0.5 rounded bg-white" src={matchup.home_logo ?? FootballHelmet}
                             alt="Team Icon"/>
                        <div className={'flex flex-col'}>
                            <h1>{matchup.home_team}{homeTeamIcon}</h1>
                            <h4 className={'font-light text-sm'}>{capitalizeFirstLetter(matchup.home_manager_name)}</h4>
                        </div>
                    </div>
                    <h1 className={"text-2xl tabular-nums mr-2"}>{matchup.home_score}</h1>
                </div>
                <div className={'flex flex-row justify-between items-center p-1'}>
                    <div className={'flex flex-row items-center'}>
                        <img className="w-10 h-10 mr-2 p-0.5 rounded bg-white" src={matchup.away_logo ?? FootballHelmet}
                             alt="Team Icon"/>
                        <div className={'flex flex-col'}>
                            <h1>{matchup.away_team}{awayTeamIcon}</h1>
                            <h4 className={'font-light text-sm'}>{capitalizeFirstLetter(matchup.away_manager_name)}</h4>
                        </div>
                    </div>
                    <h1 className={"text-2xl tabular-nums mr-2"}>{matchup.away_score}</h1>
                </div>
            </div>
        </div>
    );
};

export default ScoreCard;

