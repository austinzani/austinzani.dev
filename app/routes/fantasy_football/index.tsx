import React from "react";
import { Link } from "@remix-run/react";
import Icon from "~/components/Icon";

export default function Football() {

    return (
        <div className="w-full py-20 flex flex-col items-center md:justify-center md:flex-row">
            <div className={"w-11/12 mb-12 md:w-1/2 max-w-xl md:mb-0 md:mr-12 flex flex-col justify-center"}>
                <img className={"max-w-full h-auto transform rounded-xl"}
                     src={"https://bvaxppgdleypbyzyjchu.supabase.co/storage/v1/object/public/images/league_pic.JPG"}/>
            </div>
            <div className={"w-11/12 md:w-1/3 flex flex-col justify-center"}>
                <h1 className="font-['Outfit'] mb-2 w-fit font-medium text-4xl">Tony's League to Lose</h1>
                <h2 className="font-['Outfit'] mb-2 w-full font-light text-l flex-wrap">This league has been
                    going on in some form since 2009. We have seen managers come and go but for
                    the most part the members have been the same. The first few seasons have been lost to time
                    somewhere on a server at ESPN even though they said it is deleted. I don't buy it. Regardless I have
                    collected most of the league data from ESPN and Sleeper so we can compare records, head to head stats, and
                    championships. </h2>
                <Link to={"/fantasy_football/all_time"} prefetch="intent" className={"p-2 mt-4 text-center rounded-xl border border-orange-500 text-orange-500 hover:cursor-pointer"}>
                    View League Data
                    <Icon className={"pl-3"} name={"chevron-right"}/>
                </Link>
            </div>
        </div>
    );
}