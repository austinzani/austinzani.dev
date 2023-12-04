import React from 'react';
import {Database} from "../../../db_types";
import Icon from "../Icon";
import Modal from "../Modal";


export type UpcomingAlbum = {
    upcoming: true,
    rank: number,
    reveal_date: string,
    year: number
}

const AlbumOfTheYearListCard = ({album, number}: {
    album: Database['public']['Tables']['albums_of_the_year']['Row'] | UpcomingAlbum,
    number: number
}) => {
    let canShare = false
    let shareObject = {}
    try {
       if('album' in album) {
           shareObject = {
               title: `${album.album} by ${album.artist}`,
               text: album.blurb ? album.blurb : `Check out ${album.album} by ${album.artist}!`,
               url: `https://austinzani.dev/music?year=${album.year}&album=${album.rank}`
           }
           canShare = navigator?.canShare(shareObject)
       }
    } catch {
        canShare = false
    }

    if (!('upcoming' in album)) {
        return (
            <div className={'flex flex-col sm:flex-row w-full max-w-full sm:max-w-[40rem] relative border border-gray-300 dark:border-zinc-700 py-2 px-5 rounded bg-gray-100 dark:bg-zinc-800 m-2'}>
                <div className={'pt-4 sm:pb-2'}>
                    <div className={"sm:w-48 w-full min-w-[12rem] relative"}>
                        <img className={"min-h-48 min-w-48"} src={album.album_art_url}/>
                        <h1 className={'absolute -top-2 -left-2 w-8 h-8 text-xl bg-orange-500 rounded-full flex items-center justify-center text-white'}>{number}</h1>
                    </div>
                    <div className={'flex flex-row justify-center mt-2'}>
                        <a target="_blank" rel="noopener noreferrer" href={album.apple_link}
                           className={"h-10 text-2xl w-10 p-2.5 mx-1 flex items-center justify-center hover:bg-orange-500/60 hover:cursor-pointer rounded-md"}>
                            <Icon name={'apple'} prefix={'fab'}/>
                        </a>
                        <a target="_blank" rel="noopener noreferrer" href={album.spotify_link}
                           className={"h-10 text-2xl w-10 p-2.5 mx-1 flex items-center justify-center hover:bg-orange-500/60 hover:cursor-pointer rounded-md"}>
                            <Icon name={'spotify'} prefix={"fab"}/>
                        </a>
                        {album.vinyl_link &&
                            <a target="_blank" rel="noopener noreferrer" href={album.vinyl_link}
                               className={"h-10 text-2xl w-10 p-2.5 mx-1 flex items-center justify-center hover:bg-orange-500/60 hover:cursor-pointer rounded-md"}>
                                <Icon name={'record-vinyl'}/>
                            </a>
                        }
                        {
                            canShare &&
                            <a target="_blank" rel="noopener noreferrer" onClick={() => {
                                navigator.share(shareObject)
                            }}
                               className={"h-10 text-2xl w-10 p-2.5 mx-1 flex items-center justify-center hover:bg-orange-500/60 hover:cursor-pointer rounded-md"}>
                                <Icon name={'share'}/>
                            </a>
                        }
                    </div>
                </div>
                <div className={'flex flex-col sm: p-4'}>
                    <h1 className={"text-2xl"}>{album.album}</h1>
                    <h3 className={"text-md text-zinc-400"}>{album.artist}</h3>
                    {album.blurb && <p className={"text-sm mt-3 dark:text-gray-400"}>{album.blurb}</p>}
                </div>
            </div>)
    } else {
        return (
            <div className={'flex flex-col w-full sm:flex-row max-w-full sm:max-w-[40rem] relative border border-gray-300 dark:border-zinc-700 py-2 px-5 rounded bg-gray-100 dark:bg-zinc-800 m-2'}>
                <div className={'pt-4 sm:pb-2'}>
                    <div className={"sm:w-48 w-full min-w-[12rem] relative"}>
                        <img className={"min-h-48 min-w-48"} src={'https://bvaxppgdleypbyzyjchu.supabase.co/storage/v1/object/public/images/gift.jpg'}/>
                        <h1 className={'absolute -top-2 -left-2 w-8 h-8 text-xl bg-orange-500 rounded-full flex items-center justify-center text-white'}>{number}</h1>
                    </div>
                </div>
                <div className={'flex flex-col sm: p-4'}>
                    <h1 className={"text-2xl"}>Coming Soon!</h1>
                    <h3 className={"text-md text-zinc-400"}>{album.reveal_date}</h3>
                </div>
            </div>
        )
    }
};

export default AlbumOfTheYearListCard;

