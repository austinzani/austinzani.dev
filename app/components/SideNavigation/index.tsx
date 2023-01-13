import { NavLink } from "@remix-run/react";

type SideNavigationProps = {
    options: {route: string, label: string}[]
}

const SideNavigation = (props: SideNavigationProps) => {

    return (
        <aside className="w-64 min-w-64" aria-label="Sidebar">
            <div className="px-3 py-4 overflow-y-auto rounded">
                <ul className="space-y-2">
                {props.options.map((option) => {
                    return (
                        <li key={option.route}>
                            <NavLink
                                to={option.route}
                                className={({ isActive }) => {
                                    return isActive ?
                                        "text-gray-900" :
                                        "text-gray-500";
                                }}
                            >{option.label}</NavLink>
                        </li>
                    )
                })
                }
                </ul>
            </div>
        </aside>

    );
}

export default SideNavigation;