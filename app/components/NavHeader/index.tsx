import Football from "../../icons/football-solid.svg";
import House from "../../icons/house-solid.svg";
import Music from "../../icons/music-solid.svg";
import User from "../../icons/user-solid.svg";
import {Link} from "@remix-run/react";
import Icon from "../Icon";

const NavHeader = () => {
    return (
        <header className={"flex justify-between h-14 bg-black items-center px-4"}>
            <p className={"text-2xl h-10 w-10 font-medium flex justify-center items-center p-2 border-orange-500 border text-orange-500 rounded-lg"}>{"AZ"}</p>
            <div className={"w-fit flex items-center"}>
                <Link to={"/"} prefetch="intent" className={"h-10 w-10 p-2.5 mx-1 flex items-center justify-center hover:bg-orange-500/60 border-black border hover:cursor-pointer rounded-md"}>
                    <Icon name={'house'}/>
                </Link>
                <Link to={"/fantasy_football"} prefetch="intent" className={"h-10 w-10 p-2.5 mx-1 flex items-center justify-center hover:bg-orange-500/60 border-black border hover:cursor-pointer rounded-md"}>
                    <Icon name={'football'}/>
                </Link>
                <Link to={"/music"} prefetch="intent" className={"h-10 w-10 p-2.5 mx-1 flex items-center justify-center hover:bg-orange-500/60 border-black border hover:cursor-pointer rounded-md"}>
                   <Icon name={'music'}/>
                </Link>
                <Link to={"about"} prefetch="intent" className={"h-10 w-10 p-2.5 mx-1 flex items-center justify-center hover:bg-orange-500/60 border-black border hover:cursor-pointer rounded-md"}>
                    <Icon name={'user'}/>
                </Link>
            </div>
        </header>
    )
}

export default NavHeader