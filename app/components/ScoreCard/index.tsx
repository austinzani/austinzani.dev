import React from 'react';
import { Database } from "../../../db_types";
import { capitalizeFirstLetter } from "~/utils/helpers";
import ManagerAvatar from "~/components/ManagerAvatar";

const TeamLogoOrAvatar = ({
    logo,
    teamName,
    managerName,
}: {
    logo?: string | null;
    teamName: string | null | undefined;
    managerName: string | null | undefined;
}) => {
    const [hasLogoError, setHasLogoError] = React.useState(false);

    if (logo && !hasLogoError) {
        return (
            <img
                className="h-10 w-10 rounded-full object-cover"
                src={logo}
                alt={`${teamName ?? managerName ?? "Team"} logo`}
                onError={() => setHasLogoError(true)}
            />
        );
    }

    return (
        <ManagerAvatar
            name={managerName}
            className="h-10 w-10 text-sm"
        />
    );
};

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
        <div className="w-full">
            {showDate && (
                <div className="mb-2 flex flex-wrap items-center gap-2">
                    <span className="font-mono text-[11px] font-semibold uppercase tracking-[0.06em] text-zinc-600 dark:text-zinc-400">
                        Week {matchup.week}, {matchup.year}
                    </span>
                    {(playoffMatchup || toiletBowl) && (
                        <span className={`rounded-full px-2 py-0.5 font-mono text-[10px] font-semibold uppercase tracking-[0.06em] ${
                            playoffMatchup ? 'bg-amber-100 dark:bg-amber-900 text-amber-800 dark:text-amber-100' : 
                            'bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-200'
                        }`}>
                            {playoffMatchup ? 'Playoffs' : 'Toilet Bowl'}
                        </span>
                    )}
                </div>
            )}
            
            <div className="flex flex-col gap-2 rounded-lg border-[1.5px] border-line-muted bg-paper-muted p-3 dark:bg-zinc-900">
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
                                <TeamLogoOrAvatar
                                    logo={matchup.home_logo}
                                    teamName={matchup.home_team}
                                    managerName={matchup.home_manager_name}
                                />
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
                            <span className="text-sm text-zinc-600 dark:text-zinc-400">
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
                <div className="border-t border-dashed border-line-muted" />

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
                                <TeamLogoOrAvatar
                                    logo={matchup.is_bye_week ? null : matchup.away_logo}
                                    teamName={matchup.is_bye_week ? "Bye Week" : matchup.away_team}
                                    managerName={matchup.is_bye_week ? "Bye Week" : matchup.away_manager_name}
                                />
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
                            <span className="text-sm text-zinc-600 dark:text-zinc-400">
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
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {matchups.map((matchup, index: number) => (
                <ScoreCard 
                    key={`${matchup.home_team}-${matchup.away_team}-${index}`} 
                    matchup={matchup} 
                    showDate={showDate}
                />
            ))}
        </div>
    );
};
