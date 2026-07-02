import { NavLink } from "@remix-run/react";
import Icon from "../Icon";
import { Theme, useTheme } from "~/utils/theme-provider";

const navigationOptions = [
  { route: "/", label: "Home" },
  { route: "/about", label: "About" },
  { route: "/fantasy_football", label: "Fantasy Football" },
  { route: "/music", label: "Music" },
] as const;

const iconTransformOrigin = { transformOrigin: "50% 100px" };
const DarkModeToggle = () => {
  const [, setTheme] = useTheme();
  return (
    <button
      type="button"
      aria-label="Toggle color scheme"
      onClick={() => {
        setTheme((previousTheme) =>
          previousTheme === Theme.DARK ? Theme.LIGHT : Theme.DARK
        );
      }}
      className="inline-flex h-10 w-10 items-center justify-center overflow-hidden rounded-full border border-line-muted bg-white p-1 transition hover:border-accent focus:outline-none focus-visible:ring-2 focus-visible:ring-accent"
    >
      <div className="relative h-8 w-8">
        <span
          className="absolute inset-0 rotate-90 transform text-ink transition duration-500 motion-reduce:duration-[0s] dark:rotate-0"
          style={iconTransformOrigin}
        >
          <Icon name={"moon"} className={"p-2"} />
        </span>
        <span
          className="absolute inset-0 rotate-0 transform text-ink transition duration-500 motion-reduce:duration-[0s] dark:-rotate-90"
          style={iconTransformOrigin}
        >
          <Icon name={"sun"} className={"p-1 pt-2"} />
        </span>
      </div>
    </button>
  );
};

const NavHeader = () => {
  return (
      <header className="sticky top-0 z-30 border-b border-dashed border-line-muted bg-white px-[clamp(18px,4vw,48px)]">
        <div className="flex min-h-[120px] flex-wrap items-center justify-between gap-4 py-4">
          <NavLink
            to="/"
            prefetch="intent"
            className="flex items-center gap-4"
            aria-label="Home"
          >
            <span className="flex h-16 w-16 -rotate-[8deg] items-center justify-center rounded-full bg-black font-display text-3xl font-bold italic leading-none text-white">
              <span className="rotate-[8deg]">AZ</span>
            </span>
            <span className="font-mono text-xl font-semibold uppercase tracking-[0.14em] text-ink">
              Austin Zani
            </span>
          </NavLink>

          <nav
            className="order-3 flex w-full flex-wrap items-center gap-x-2 gap-y-5 md:order-none md:w-auto md:gap-8"
            aria-label="Primary"
          >
            {navigationOptions.map((option) => (
              <NavLink
                key={option.route}
                to={option.route}
                prefetch="intent"
                end={option.route === "/"}
                className={({ isActive }) =>
                  `border-b pb-1 font-mono text-[15px] font-medium uppercase tracking-[0.12em] transition md:text-base ${
                    isActive
                      ? "border-accent text-ink"
                      : "border-transparent text-ink hover:border-accent"
                  }`
                }
              >
                <span>{option.label}</span>
              </NavLink>
            ))}
          </nav>
          <DarkModeToggle />
        </div>
      </header>
  );
};

export default NavHeader;
