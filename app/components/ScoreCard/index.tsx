import React from 'react';
import { Database } from "../../../db_types";
import { capitalizeFirstLetter } from "~/utils/helpers";
import Icon from "~/components/Icon";

const ScoreCard = ({
    matchup,
    showDate
}: {
    matchup: Database['public']['CompositeTypes']['game_details'],
    showDate?: boolean
}) => {
    const playoffMatchup = matchup.is_winners_bracket && matchup.is_playoffs;
    const toiletBowl = matchup.is_toilet_bowl;
    const highPoint = matchup.high_point;
    const lowPoint = matchup.low_point;
    
    const homeTeamIcon = matchup.home_manager_name === highPoint ? "🚀" : matchup.home_manager_name === lowPoint ? "🚽" : "";
    const awayTeamIcon = matchup.is_bye_week ? "" : matchup.away_manager_name === highPoint ? "🚀" : matchup.away_manager_name === lowPoint ? "🚽" : "";
    
    const isHomeWinner = matchup.home_score > (matchup.away_score ?? 0);
    const isAwayWinner = !matchup.is_bye_week && (matchup.away_score ?? 0) > matchup.home_score;

    return (
        <div className="max-w-md w-full mb-3">
            {showDate && (
                <div className="mb-1.5 px-3">
                    <span className="text-sm font-medium">
                        Week {matchup.week}, {matchup.year}
                    </span>
                    {(playoffMatchup || toiletBowl) && (
                        <span className={`ml-2 text-xs px-2 py-0.5 rounded-full ${
                            playoffMatchup ? 'bg-amber-100 dark:bg-amber-900 text-amber-800 dark:text-amber-100' : 
                            'bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-200'
                        }`}>
                            {playoffMatchup ? 'Playoffs' : 'Toilet Bowl'}
                        </span>
                    )}
                </div>
            )}
            
            <div className="flex flex-col gap-2 p-3 rounded-lg bg-gray-50 dark:bg-zinc-900 shadow-sm dark:shadow-none">
                {/* Home Team */}
                <div className="flex items-center justify-between group">
                    <div className="flex items-center gap-2">
                        <div className="relative">
                            {matchup.home_seed && (
                                <div className="absolute -top-1 -left-1 w-4 h-4 bg-amber-100 dark:bg-amber-900 rounded-full flex items-center justify-center text-xs font-medium text-amber-800 dark:text-amber-100">
                                    {matchup.home_seed}
                                </div>
                            )}
                            <div className="w-10 h-10 flex items-center justify-center">
                                {matchup.home_logo ? (
                                    <img 
                                        className="w-10 h-10 rounded-lg object-cover" 
                                        src={matchup.home_logo} 
                                        alt={`${matchup.home_team} logo`}
                                    />
                                ) : (
                                    <div className="w-10 h-10 rounded-lg bg-gray-100 dark:bg-zinc-800 flex items-center justify-center">
                                        <Icon 
                                            name="football-ball" 
                                            className="w-6 h-6"
                                        />
                                    </div>
                                )}
                            </div>
                        </div>
                        <div className="flex flex-col">
                            <div className="flex items-center gap-2">
                                <span className={`font-medium ${isHomeWinner ? 'text-emerald-600 dark:text-emerald-400' : ''}`}>
                                    {matchup.home_team}
                                </span>
                                {homeTeamIcon && (
                                    <span className="text-sm">{homeTeamIcon}</span>
                                )}
                            </div>
                            <span className="text-sm text-gray-600 dark:text-gray-400">
                                {capitalizeFirstLetter(matchup.home_manager_name)}
                            </span>
                        </div>
                    </div>
                    <div className={`text-2xl tabular-nums font-medium ${
                        isHomeWinner ? 'text-emerald-600 dark:text-emerald-400' : ''
                    }`}>
                        {matchup.home_score?.toFixed(2)}
                    </div>
                </div>

                {/* Divider */}
                <div className="border-t border-gray-100 dark:border-zinc-800" />

                {/* Away Team */}
                <div className="flex items-center justify-between group">
                    <div className="flex items-center gap-2">
                        <div className="relative">
                            {matchup.away_seed && !matchup.is_bye_week && (
                                <div className="absolute -top-1 -left-1 w-4 h-4 bg-amber-100 dark:bg-amber-900 rounded-full flex items-center justify-center text-xs font-medium text-amber-800 dark:text-amber-100">
                                    {matchup.away_seed}
                                </div>
                            )}
                            <div className="w-10 h-10 flex items-center justify-center">
                                {matchup.away_logo && !matchup.is_bye_week ? (
                                    <img 
                                        className="w-10 h-10 rounded-lg object-cover" 
                                        src={matchup.away_logo} 
                                        alt={`${matchup.away_team} logo`}
                                    />
                                ) : (
                                    <div className="w-10 h-10 rounded-lg bg-gray-100 dark:bg-zinc-800 flex items-center justify-center">
                                        <Icon 
                                            name="football-ball" 
                                            className="w-6 h-6"
                                        />
                                    </div>
                                )}
                            </div>
                        </div>
                        <div className="flex flex-col">
                            <div className="flex items-center gap-2">
                                <span className={`font-medium ${isAwayWinner ? 'text-emerald-600 dark:text-emerald-400' : ''}`}>
                                    {matchup.is_bye_week ? "Bye Week" : matchup.away_team}
                                </span>
                                {awayTeamIcon && (
                                    <span className="text-sm">{awayTeamIcon}</span>
                                )}
                            </div>
                            <span className="text-sm text-gray-600 dark:text-gray-400">
                                {capitalizeFirstLetter(matchup.is_bye_week ? "Bye Week" : matchup.away_manager_name)}
                            </span>
                        </div>
                    </div>
                    <div className={`text-2xl tabular-nums font-medium ${
                        isAwayWinner ? 'text-emerald-600 dark:text-emerald-400' : ''
                    }`}>
                        {matchup.is_bye_week ? "-" : matchup.away_score?.toFixed(2)}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ScoreCard;

export const ScoreCardGroup = ({
    matchups,
    showDate = false
}: {
    matchups: Database['public']['CompositeTypes']['game_details'][],
    showDate?: boolean
}) => {
    return (
        <div className="flex flex-wrap justify-around gap-3 p-3">
            {matchups.map((matchup, index: number) => (
                <ScoreCard 
                    key={`${matchup.home_team}-${matchup.away_team}-${index}`} 
                    matchup={matchup} 
                    showDate={showDate}
                />
            ))}
            {!!(matchups.length % 2) && <div className="flex-none max-w-md w-full mb-2"/>}
        </div>
    );
};