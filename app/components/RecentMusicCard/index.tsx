import React from 'react';
import {Database} from "../../../db_types";
import Icon from "../Icon";

const RecentMusicCard = ({recentObject}: {
    recentObject: Database['public']['Tables']['music_history']['Row']}) => {
    const isAlbum = recentObject.type === "ALBUM"
    return (
            <div className={'max-w-md w-full flex mb-2 border border-gray-300 dark:border-zinc-700 p-2 items-center rounded bg-gray-100 dark:bg-zinc-800'}>
                <img className={"h-28 w-28"} src={recentObject.album_art_url}/>
                <div className={'h-full flex justify-between w-full p-1'}>
                <div className={'h-full flex flex-col p-1'}>
                    <h1 className={"text-2xl font-medium"}>{recentObject.title}</h1>
                    <h3 className={"text-sm"}>{recentObject.artist}</h3>
                    <h5 className={"text-xs text-gray-400 font-light"}>{isAlbum ? "album" : "song"}</h5>
                </div>
                    <a href={recentObject.apple_music_url} target={"_blank"} rel={"noopener noreferrer"} className={"text-gray-400 flex items-center"}>
                        <Icon name={'apple'} prefix={"fab"} className={"text-xl flex items-center"}/>
                    </a>
                </div>
            </div>
    );
};

export default RecentMusicCard;

