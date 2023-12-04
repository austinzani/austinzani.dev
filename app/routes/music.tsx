import React, {SetStateAction} from "react";
import {LoaderFunctionArgs, MetaFunction} from "@remix-run/node";
import supabase from "~/utils/supabase";
import {useLoaderData} from "@remix-run/react";
import RecentMusicCard from "~/components/RecentMusicCard";
import AlbumOfTheYearListCard from "~/components/AlbumOfTheYearListCard";
import {Tabs} from "~/components/Tabs";
import {Item} from 'react-stately';
import {Database} from "../../db_types";
import six from '~/images/memoji_6.png'
import { createNewDateInTimeZone } from "~/utils/helpers";


export const meta: MetaFunction<typeof loader> = ({ matches, data }) => {
    const parentMeta = matches.flatMap(match => match.meta ?? []) //@ts-ignore
        .filter((meta) => !['og:title', 'og:image', 'og:description'].includes(meta.name) && !("title" in meta))

    let title = "Austin's Music"
    let description = "Some of the music that I love"
    let image
    // If we have a year and album, we can use that to generate the title, description, and image
    if(data && data.year && data.album) {
        if(data.year in data.yearList) {
            const year = data.year
            const album = data.yearList[parseInt(year)].find((album) => album.rank === parseInt(data.album!))
            if(album && 'artist' in album) {
                title = `#${album.rank} - ${album.album} by ${album.artist}`
                image = album.album_art_url
                if(album.blurb) {
                    description = album.blurb
                }
            }
        }

    }

    return [
        { title: title },
        { name: "og:title", content: title },
        { name: "og:image", content: image || six },
        { name: "og:description", content: description },
        ...parentMeta
    ];
};

type UpcomingAlbum = {
    upcoming: true,
    rank: number,
    reveal_date: string,
    year: number
}

const hideUpcomingAlbums = (album: Database['public']['Tables']['albums_of_the_year']['Row']):
    Database['public']['Tables']['albums_of_the_year']['Row'] | UpcomingAlbum => {
    const today = createNewDateInTimeZone('America/New_York')
    const todayDelta = 25 - today.getDate()
    if(album.rank > todayDelta) {
        return album
    } else {
        return {
            upcoming: true,
            rank: album.rank,
            reveal_date: `Dec ${26 - album.rank}`,
            year: album.year
        }
    }

}

export const loader = async ({request}: LoaderFunctionArgs) => {
    // parse the search params for `?q=`
    const url = new URL(request.url);
    const year = url.searchParams.get("year") || "";
    const parsedYear = parseInt(year);
    const album = url.searchParams.get("album") || "";
    const parsedAlbum = parseInt(album);

    const {data: music_response, error: music_error} = await supabase.from('music_history')
        .select('*')
        .order('created_at', {ascending: false})
        .limit(10)
        .range(0, 100)

    const {data: year_response, error: year_error} = await supabase.from('albums_of_the_year')
        .select('*')
        .order('rank', {ascending: true})
        .limit(1000)

    if (music_error) {
        return {
            error: music_error,
            music: null,
            year: null,
            album: null,
            yearList: null
        }
    }
    if (year_error) {
        return {
            error: year_error,
            music: null,
            year: null,
            album: null,
            yearList: null
        }
    }

    const topAlbums: {
        [key: number]: Array<Database['public']['Tables']['albums_of_the_year']['Row'] | UpcomingAlbum>
    } = {}

    year_response?.forEach((album) => {
        const today = new Date()
        const year = today.getFullYear()
        const filteredAlbum = album.year === year ? hideUpcomingAlbums(album) : album
        if (topAlbums[album.year]) {
            topAlbums[album.year].push(filteredAlbum)
        } else {
            topAlbums[album.year] = [filteredAlbum]
        }
    })

    // Sort each year's albums by rank from lowest to highest
    Object.keys(topAlbums).forEach((year) => {
        topAlbums[parseInt(year)] = topAlbums[parseInt(year)].sort((a, b) => b.rank - a.rank)
    })

    return {
        error: null,
        music: music_response,
        year: parsedYear ? year : null,
        album: parsedAlbum && parsedAlbum < 26 ? album : null,
        yearList: topAlbums
    }
}

const Music = () => {
    const {music, year, yearList} = useLoaderData<typeof loader>()
    const yearTabs = Object.keys(yearList!).sort((a, b) => parseInt(b) - parseInt(a))
    const [yearTab, setYearTab] = React.useState(year ? year : yearTabs[0])


    // @ts-ignore
    return (
        <div className={'flex justify-center w-full px-2'}>
            <div className={'flex m-3 flex-col w-full max-w-[64rem]'}>
                <h1 className={"text-4xl font-['Outfit'] font-medium mb-2"}>Music</h1>
                {/*@ts-ignore*/}
                <Tabs
                    aria-label="Music"
                >
                    <Item key="year" title="Yearly List">
                        <p className={"font-['Outfit'] py-2 font-light"}>My top 25 albums from the end of every
                            year.</p>
                        {/*@ts-ignore*/}
                        <Tabs
                            selectedKey={yearTab}
                            onSelectionChange={key => setYearTab(key as SetStateAction<string>)}
                        >
                            {yearTabs.map((year) => {
                                return <Item key={year} title={year}>
                                    <div className={"flex flex-col items-center w-full"}>
                                        {yearList![parseInt(year)].map((album) => {
                                            return <AlbumOfTheYearListCard key={`${album.year}-${album.rank}`} album={album} number={album.rank}/>
                                        })}
                                    </div>
                                </Item>
                            })}
                        </Tabs>
                    </Item>
                    <Item key="feed" title="Feed">
                        <p className={"font-['Outfit'] py-2 font-light"}>Some recent tunes I have been vibing with.</p>
                        <div className={"flex flex-col items-center"}>
                            {music?.map((song, index) => {
                                return <RecentMusicCard recentObject={song} key={index}/>
                            })}
                        </div>
                    </Item>
                </Tabs>
            </div>
        </div>
    )
}

export default Music