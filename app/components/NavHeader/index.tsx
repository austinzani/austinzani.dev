import Football from "../../icons/football-solid.svg";
import House from "../../icons/house-solid.svg";
import Music from "../../icons/music-solid.svg";
import User from "../../icons/user-solid.svg";
import {Link} from "@remix-run/react";

const NavHeader = () => {
    return (
        <header className={"flex justify-between h-14 bg-black items-center px-4"}>
            <p className={"text-2xl h-10 w-10 font-medium flex justify-center items-center p-2 border-orange-500 border text-orange-500 rounded-lg h-10"}>{"AZ"}</p>
            <div className={"w-fit flex items-center"}>
                <Link to={"/"} prefetch="intent" className={"h-10 w-10 p-2.5 mx-1 hover: hover:border-orange-500 border-black border hover:cursor-pointer rounded-md"}>
                    <img className={"invert"}
                         src={House}
                         alt={"house-icon"}/>
                </Link>
                <Link to={"/fantasy_football"} prefetch="intent" className={"h-10 w-10 p-2.5 mx-1 hover: hover:border-orange-500 border-black border hover:cursor-pointer rounded-md"}>
                    <img className={"invert"}
                         src={Football}
                         alt={"football-icon"}/>
                </Link>
                <Link to={"/music"} prefetch="intent" className={"h-10 w-10 p-2.5 mx-1 hover: hover:border-orange-500 border-black border hover:cursor-pointer rounded-md"}>
                    <img className={"invert"}
                         src={Music}
                         alt={"music-icon"}/>
                </Link>
                <Link to={"about"} prefetch="intent" className={"h-10 w-10 p-2.5 mx-1 hover: hover:border-orange-500 border-black border hover:cursor-pointer rounded-md"}>
                    <img className={"invert"}
                         src={User}
                         alt={"user-icon"}/>
                </Link>
            </div>
        </header>
    )
}

export default NavHeader