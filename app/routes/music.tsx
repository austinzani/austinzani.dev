import React from "react";
import {LoaderFunctionArgs, MetaFunction} from "@remix-run/node";
import supabase from "~/utils/supabase";
import {useLoaderData} from "@remix-run/react";
import RecentMusicCard from "~/components/RecentMusicCard";
import AlbumOfTheYearListCard from "~/components/AlbumOfTheYearListCard";
import {Tabs} from "~/components/Tabs";
import {Item} from 'react-stately';
import {Database} from "../../db_types";

export const meta: MetaFunction = ({ matches }) => {
    const parentMeta = matches.flatMap(match => match.meta ?? []) //@ts-ignore
        .filter((meta) => !['og:title', 'og:image', 'og:description'].includes(meta.name) && !("title" in meta))
    return [
        { title: "Austin's Music" },
        { name: "og:title", content: "Austin's Music" },
        { name: "og:image", content: "https://is1-ssl.mzstatic.com/image/thumb/Music116/v4/4d/4b/00/4d4b00b8-f6ca-df80-cd7d-a00ba23530ed/075679673930.jpg/632x632bb.webp" },
        { name: "og:description", content: "Some of the music that I love" },
        ...parentMeta
    ];
};

export const loader = async ({params}: LoaderFunctionArgs) => {
    const offset = params.offset;
    const parsedOffset = parseInt(offset ?? "0");
    const year = params.year || "";
    const parsedYear = parseInt(year);
    const album = params.album || "";
    const parsedAlbum = parseInt(album);
    if (isNaN(parsedOffset)) {
        return {
            error: "Invalid Offset",
            music: null,
            year: null,
            album: null,
            yearList: null
        }
    }

    // TODO: add a fetch for all years of top music and check year against that


    const {data: music_response, error: music_error} = await supabase.from('music_history')
        .select('*')
        .order('created_at', {ascending: false})
        .limit(10)
        .range(parsedOffset, parsedOffset + 10)

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
        [key: number]: Array<Database['public']['Tables']['albums_of_the_year']['Row']>
    } = {}

    console.log(year_response)

    year_response?.forEach((album) => {
        if (topAlbums[album.year]) {
            topAlbums[album.year].push(album)
        } else {
            topAlbums[album.year] = [album]
        }
    })

    // Sort each year's albums by rank from lowest to highest
    Object.keys(topAlbums).forEach((year) => {
        topAlbums[parseInt(year)] = topAlbums[parseInt(year)].sort((a, b) => a.rank - b.rank)
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
    const [mainTab, setMainTab] = React.useState(year ? 'feed' : 'year')
    const [yearTab, setYearTab] = React.useState(year ? year.toString() : '2021')

    // @ts-ignore
    return (
        <div className={'flex justify-center w-full px-2'}>
            <div className={'flex m-3 flex-col w-full max-w-[64rem]'}>
                <h1 className={"text-4xl font-['Outfit'] font-medium mb-2"}>Music</h1>
                {/*@ts-ignore*/}
                <Tabs
                    selectedKey={mainTab} // @ts-ignore
                    onSelectionChange={(key) => setMainTab(key)}
                    aria-label="Music"
                >
                    <Item key="feed" title="Feed">
                        <p className={"font-['Outfit'] py-2 font-light"}>Some recent tunes I have been vibing with.</p>
                        <div className={"flex flex-col items-center"}>
                            {music?.map((song, index) => {
                                return <RecentMusicCard recentObject={song} key={index}/>
                            })}
                        </div>
                    </Item>
                    <Item key="year" title="Yearly List">
                        <p className={"font-['Outfit'] py-2 font-light"}>My top 25 albums from the end of every
                            year.</p>
                        {/*@ts-ignore*/}
                        <Tabs>
                            {Object.keys(yearList!).map((year) => {
                                return <Item key={year} title={year}>
                                    <div className={"flex flex-col items-center w-full"}>
                                        {yearList![parseInt(year)].map((album) => {
                                            return <AlbumOfTheYearListCard key={album.album} album={album} number={album.rank}/>
                                        })}
                                    </div>
                                </Item>
                            })}
                        </Tabs>
                    </Item>
                </Tabs>
            </div>
        </div>
    )
}

export default Music