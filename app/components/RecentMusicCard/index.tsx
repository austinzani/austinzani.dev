import React from 'react';
import { Database } from "../../../db_types";
import Icon from "../Icon";
import IconButton from "../IconButton";

const RecentMusicCard = ({ recentObject }: {
    recentObject: Database['public']['Tables']['music_history']['Row']
}) => {
    const isAlbum = recentObject.type === "ALBUM";
    
    return (
        <div className="max-w-md w-full mb-2 p-3 rounded-lg bg-gray-50 dark:bg-zinc-900 shadow-sm dark:shadow-none">
            <div className="flex items-center">
                <img 
                    className="h-28 w-28 rounded-lg shadow-sm" 
                    src={recentObject.album_art_url}
                    alt={`${recentObject.title} artwork`}
                />
                <div className="h-full flex justify-between w-full pl-4">
                    <div className="h-full flex flex-col">
                        <h1 className="text-xl font-medium">{recentObject.title}</h1>
                        <h3 className="text-sm text-gray-600 dark:text-gray-400">{recentObject.artist}</h3>
                        <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                            {isAlbum ? "Album" : "Song"}
                        </p>
                    </div>
                    <div className="flex items-start">
                        <IconButton
                            link={recentObject.apple_music_url}
                            icon="apple"
                            iconPrefix="fab"
                            label="Apple Music"
                        />
                    </div>
                </div>
            </div>
        </div>
    );
};

export default RecentMusicCard;

