import { NavLink } from "@remix-run/react";
import { useState } from "react";
import Icon from "../Icon";
import { Theme, useTheme } from "~/utils/theme-provider";
import AccentSwatchPicker from "../AccentSwatchPicker";
import SideNavigation from "../SideNavigation";

const navigationOptions = [
  { route: "/", label: "Home", icon: "house" },
  { route: "/fantasy_football", label: "Fantasy Football", icon: "football" },
  { route: "/music", label: "Music", icon: "music" },
  { route: "/about", label: "About", icon: "user" },
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
      className="inline-flex h-10 w-10 items-center justify-center overflow-hidden rounded-full border border-dashed border-line-muted bg-surface p-1 transition hover:border-accent focus:outline-none focus-visible:ring-2 focus-visible:ring-accent"
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
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  return (
    <>
      <header className="sticky top-0 z-30 border-b-2 border-dashed border-line bg-paper/90 px-4 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4">
          <NavLink
            to="/"
            prefetch="intent"
            className="flex h-11 w-11 items-center justify-center rounded-full border-2 border-dashed border-line bg-accent-soft font-mono text-sm font-bold text-ink"
            aria-label="Home"
          >
            AZ
          </NavLink>

          <nav className="hidden items-center gap-1 md:flex" aria-label="Primary">
            {navigationOptions.map((option) => (
              <NavLink
                key={option.route}
                to={option.route}
                prefetch="intent"
                end={option.route === "/"}
                className={({ isActive }) =>
                  `inline-flex items-center gap-2 rounded-full border border-dashed px-3 py-2 text-sm font-semibold transition ${
                    isActive
                      ? "border-accent bg-accent-soft text-ink"
                      : "border-transparent text-ink-muted hover:border-line-muted hover:text-ink"
                  }`
                }
              >
                <Icon name={option.icon} className="h-4 w-4" />
                <span>{option.label}</span>
              </NavLink>
            ))}
          </nav>

          <div className="flex items-center gap-2">
            <AccentSwatchPicker />
            <DarkModeToggle />
            <button
              type="button"
              aria-label={isMenuOpen ? "Close navigation" : "Open navigation"}
              aria-expanded={isMenuOpen}
              onClick={() => setIsMenuOpen((value) => !value)}
              className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-dashed border-line-muted bg-surface text-ink transition hover:border-accent focus:outline-none focus-visible:ring-2 focus-visible:ring-accent md:hidden"
            >
              <Icon name={isMenuOpen ? "xmark" : "bars"} className="h-4 w-4" />
            </button>
          </div>
        </div>
      </header>

      {isMenuOpen ? (
        <div className="fixed inset-0 z-20 bg-ink/25 md:hidden">
          <button
            type="button"
            className="absolute inset-0 h-full w-full cursor-default"
            aria-label="Close navigation"
            onClick={() => setIsMenuOpen(false)}
          />
          <SideNavigation
            options={navigationOptions}
            onNavigate={() => setIsMenuOpen(false)}
            className="absolute right-3 top-20 rounded-lg border-2 border-dashed border-line bg-surface pb-4 shadow-xl"
          />
        </div>
      ) : null}
    </>
  );
};

export default NavHeader;
