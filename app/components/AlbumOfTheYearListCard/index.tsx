import React from 'react';
import {Database} from "../../../db_types";
import Icon from "../Icon";

const RecentMusicCard = ({album, number, reveal_date}: {
    album: Database['public']['Tables']['albums_of_the_year']['Row'],
    number: number,
    reveal_date?: string
}) => {
    return (
        <div className={'max-w-md w-full flex mb-2 border border-gray-300 dark:border-zinc-700 p-2 items-center rounded bg-gray-100 dark:bg-zinc-800 relative'}>
            <h1 className={'absolute top-1 left-1 w-8 h-8 text-xl bg-orange-500 rounded-full flex items-center justify-center text-white'}>{number}</h1>
            <img className={"h-28 w-28"} src={album.album_art_url}/>
            <div className={'h-full flex justify-between w-full p-1'}>
                <div className={'h-full flex flex-col p-1'}>
                    <h1 className={"text-2xl font-medium"}>{album.album}</h1>
                    <h3 className={"text-sm"}>{album.artist}</h3>
                </div>
            </div>
        </div>
    );
};

export default RecentMusicCard;

