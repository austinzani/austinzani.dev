import {Link} from "@remix-run/react";
import Icon from "../Icon";
import {Theme, useTheme} from "~/utils/theme-provider";

const iconTransformOrigin = {transformOrigin: '50% 100px'}
const DarkModeToggle = () => {
    const [, setTheme] = useTheme()
    return (
        <button
            onClick={() => {
                setTheme(previousTheme =>
                    previousTheme === Theme.DARK ? Theme.LIGHT : Theme.DARK,
                )
            }}
            className={`border-secondary hover:border-primary focus:border-primary inline-flex h-10 items-center justify-center overflow-hidden rounded-full border-2 p-1 transition focus:outline-none w-10`}
        >
            {/* note that the duration is longer then the one on body, controlling the bg-color */}
            <div className="relative h-8 w-8">
        <span
            className="absolute inset-0 rotate-90 transform text-black transition duration-500 motion-reduce:duration-[0s] dark:rotate-0 dark:text-white"
            style={iconTransformOrigin}
        >
          <Icon name={'moon'} className={"p-2"}/>
        </span>
        <span
            className="absolute inset-0 rotate-0 transform text-black transition duration-500 motion-reduce:duration-[0s] dark:-rotate-90 dark:text-white"
            style={iconTransformOrigin}
        >
          <Icon name={'sun'} className={"p-1 pt-2"}/>
        </span>
            </div>
        </button>
    )
}


const NavHeader = () => {
    return (
        <header className={"flex justify-between h-14 items-center px-4"}>
            <p className={"text-2xl h-10 w-10 font-medium flex justify-center items-center p-2 border border-black dark:border-orange-500 dark:text-orange-500 rounded-lg"}>{"AZ"}</p>
            <div className={"w-fit flex items-center"}>
                <DarkModeToggle/>
                <Link to={"/"} prefetch="intent" className={"h-10 w-10 p-2.5 mx-1 flex items-center justify-center hover:bg-orange-500/60 hover:cursor-pointer rounded-md"}>
                    <Icon name={'house'}/>
                </Link>
                <Link to={"/fantasy_football"} prefetch="intent" className={"h-10 w-10 p-2.5 mx-1 flex items-center justify-center hover:bg-orange-500/60 hover:cursor-pointer rounded-md"}>
                    <Icon name={'football'}/>
                </Link>
                <Link to={"/music"} prefetch="intent" className={"h-10 w-10 p-2.5 mx-1 flex items-center justify-center hover:bg-orange-500/60 hover:cursor-pointer rounded-md"}>
                   <Icon name={'music'}/>
                </Link>
                <Link to={"about"} prefetch="intent" className={"h-10 w-10 p-2.5 mx-1 flex items-center justify-center hover:bg-orange-500/60 hover:cursor-pointer rounded-md"}>
                    <Icon name={'user'}/>
                </Link>
            </div>
        </header>
    )
}

export default NavHeader