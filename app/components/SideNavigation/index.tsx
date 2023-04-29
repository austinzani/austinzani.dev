import { NavLink } from "@remix-run/react";
import {className} from "postcss-selector-parser";

type SideNavigationProps = {
    options: {route: string, label: string}[],
    className?: string,
}

const SideNavigation = (props: SideNavigationProps) => {

    return (
        <nav className={`w-64 z-10 min-w-64 mr-1 pt-4 absolute ${props.className}`} aria-label="Sidebar">
            <div className="w-full">
                <ul className="w-full">
                {props.options.map((option) => {
                    return (
                        <li className={"h-8 flex items-center"} key={option.route}>
                            <NavLink
                                to={option.route}
                                prefetch="intent"
                                end
                                className={({ isActive }) => {
                                    return isActive ?
                                        "ml-2 pl-3 font-bold w-60 bg-orange-500/60 rounded-md" :
                                        "ml-2 font-light pl-3 w-60 hover:bg-orange-500/60 rounded-md"
                                }}
                            >{option.label}</NavLink>
                        </li>
                    )
                })
                }
                </ul>
            </div>
        </nav>

    );
}

export default SideNavigation;