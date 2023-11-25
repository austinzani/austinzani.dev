import React from "react";
import {LoaderFunctionArgs} from "@remix-run/node";
import supabase from "~/utils/supabase";
import {useLoaderData} from "@remix-run/react";
import RecentMusicCard from "~/components/RecentMusicCard";
import {Tabs} from "~/components/Tabs";
import {Item} from 'react-stately';


export const loader = async ({params}: LoaderFunctionArgs) => {
    const offset = params.offset;
    const parsedOffset = parseInt(offset ?? "0");
    if (isNaN(parsedOffset)) {
        return {
            error: "Invalid Offset",
            music: null
        }
    }

    const {data: music_response, error: music_error} = await supabase.from('music_history')
        .select('*')
        .order('created_at', {ascending: false})
        .limit(10)
        .range(parsedOffset, parsedOffset + 10)

    if (music_error) {
        return {
            error: music_error,
            music: null
        }
    }

    return {
        error: null,
        music: music_response
    }
}

const Music = () => {
    const {music} = useLoaderData<typeof loader>()

    return (
        <div className={'flex justify-center w-full'}>
            <div className={'flex m-3 flex-col w-full max-w-[64rem]'}>
                <h1 className={"text-4xl font-['Outfit'] font-medium mb-2"}>Music</h1>
                {/*@ts-ignore*/}
                <Tabs>
                    <Item key="feed" title="Feed">
                        <p className={"font-['Outfit'] py-2 font-light"}>Some recent tunes I have been vibing with.</p>
                        <div className={"flex flex-col items-center"}>
                        {music?.map((song, index) => {
                            return <RecentMusicCard recentObject={song} key={index}/>
                        })}
                    </div>
                    </Item>
                    <Item key="year" title="Yearly List">
                        <p className={"font-['Outfit'] py-2 font-light"}>My top 25 albums from the end of every year.</p>

                    </Item>
                </Tabs>
            </div>
        </div>
    )
}

export default Music