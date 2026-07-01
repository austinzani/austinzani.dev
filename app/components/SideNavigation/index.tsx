import { NavLink } from "@remix-run/react";

type SideNavigationProps = {
    options: { route: string; label: string }[];
    className?: string;
    onNavigate?: () => void;
}

const SideNavigation = (props: SideNavigationProps) => {

    return (
        <nav className={`w-64 z-10 min-w-64 mr-1 pt-4 ${props.className}`} aria-label="Sidebar">
            <div className="w-full">
                <ul className="w-full">
                {props.options.map((option) => {
                    return (
                        <li className={"flex items-center"} key={option.route}>
                            <NavLink
                                to={option.route}
                                prefetch="intent"
                                end
                                onClick={props.onNavigate}
                                className={({ isActive }) => {
                                    return isActive ?
                                        "mx-2 my-1 w-60 rounded-md border border-dashed border-accent bg-accent-soft px-3 py-2 font-bold text-ink" :
                                        "mx-2 my-1 w-60 rounded-md border border-transparent px-3 py-2 font-light text-ink-muted hover:border-accent hover:text-ink"
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
