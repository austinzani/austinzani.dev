import { NavLink } from "@remix-run/react";
import { useEffect, useRef, useState } from "react";
import Icon from "../Icon";
import { Theme, useTheme } from "~/utils/theme-provider";
import memoji1 from "~/images/memoji_1.png";
import memoji2 from "~/images/memoji_2.png";
import memoji3 from "~/images/memoji_3.png";
import memoji4 from "~/images/memoji_4.png";
import memoji5 from "~/images/memoji_5.png";
import memoji6 from "~/images/memoji_6.png";
import memoji7 from "~/images/memoji_7.png";

const navigationOptions = [
  { route: "/", label: "Home" },
  { route: "/about", label: "About" },
  { route: "/fantasy_football", label: "Fantasy Football" },
  { route: "/music", label: "Music" },
] as const;

const memojis = [
  memoji1,
  memoji2,
  memoji3,
  memoji4,
  memoji5,
  memoji6,
  memoji7,
];

const DarkModeToggle = () => {
  const [theme, setTheme] = useTheme();
  const isDark = theme === Theme.DARK;

  return (
    <button
      type="button"
      aria-label="Toggle color scheme"
      aria-pressed={isDark}
      onClick={() => {
        setTheme((previousTheme) =>
          previousTheme === Theme.DARK ? Theme.LIGHT : Theme.DARK
        );
      }}
      className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-line-muted bg-surface text-ink shadow-sm transition hover:border-accent hover:text-accent focus:outline-none focus-visible:ring-2 focus-visible:ring-accent"
    >
      <span className="flex h-5 w-5 items-center justify-center leading-none">
        <Icon name={isDark ? "moon" : "sun"} className="h-4 w-4" />
      </span>
    </button>
  );
};

const navigationLinkClassName = ({ isActive }: { isActive: boolean }) =>
  `border-b pb-1 font-mono text-[15px] font-medium uppercase tracking-[0.12em] transition md:text-base ${
    isActive
      ? "border-accent text-ink"
      : "border-transparent text-ink hover:border-accent hover:text-accent"
  }`;

const mobileNavigationLinkClassName = ({ isActive }: { isActive: boolean }) =>
  `block rounded-md px-3 py-2 font-mono text-sm font-semibold uppercase tracking-[0.1em] transition ${
    isActive
      ? "bg-accent text-accent-ink"
      : "text-ink hover:bg-paper-muted hover:text-accent"
  }`;

const NavHeader = ({ memojiIndex }: { memojiIndex: number }) => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const memoji = memojis[memojiIndex] ?? memoji1;

  useEffect(() => {
    if (!isMenuOpen) return;

    const handlePointerDown = (event: PointerEvent) => {
      if (!menuRef.current?.contains(event.target as Node)) {
        setIsMenuOpen(false);
      }
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsMenuOpen(false);
      }
    };

    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isMenuOpen]);

  return (
    <header className="sticky top-0 z-30 border-b border-dashed border-line-muted bg-surface px-[clamp(18px,4vw,48px)] text-ink shadow-sm/0 transition-colors">
      <div className="flex min-h-24 items-center justify-between gap-4 py-4">
        <NavLink
          to="/"
          prefetch="intent"
          className="flex min-w-0 items-center gap-4"
          aria-label="Home"
          onClick={() => setIsMenuOpen(false)}
        >
          <span className="flex h-14 w-14 shrink-0 -rotate-[8deg] items-center justify-center sm:h-16 sm:w-16">
            <img
              src={memoji}
              alt=""
              aria-hidden="true"
              className="h-full w-full rotate-[8deg] object-contain"
            />
          </span>
          <span className="truncate font-mono text-lg font-semibold uppercase tracking-[0.14em] text-ink sm:text-xl">
            Austin Zani
          </span>
        </NavLink>

        <div className="flex shrink-0 items-center justify-end gap-2 lg:gap-6">
          <nav className="hidden items-center gap-8 lg:flex" aria-label="Primary">
            {navigationOptions.map((option) => (
              <NavLink
                key={option.route}
                to={option.route}
                prefetch="intent"
                end={option.route === "/"}
                className={navigationLinkClassName}
              >
                <span>{option.label}</span>
              </NavLink>
            ))}
          </nav>
          <DarkModeToggle />
          <div className="relative lg:hidden" ref={menuRef}>
            <button
              type="button"
              aria-label={isMenuOpen ? "Close navigation menu" : "Open navigation menu"}
              aria-expanded={isMenuOpen}
              aria-controls="mobile-navigation"
              onClick={() => setIsMenuOpen((isOpen) => !isOpen)}
              className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-line-muted bg-surface text-ink shadow-sm transition hover:border-accent hover:text-accent focus:outline-none focus-visible:ring-2 focus-visible:ring-accent"
            >
              <Icon name={isMenuOpen ? "xmark" : "bars"} className="h-4 w-4" />
            </button>
            {isMenuOpen ? (
              <nav
                id="mobile-navigation"
                className="absolute right-0 top-12 w-[min(82vw,18rem)] rounded-lg border border-line-muted bg-surface p-2 shadow-xl"
                aria-label="Primary"
              >
                {navigationOptions.map((option) => (
                  <NavLink
                    key={option.route}
                    to={option.route}
                    prefetch="intent"
                    end={option.route === "/"}
                    className={mobileNavigationLinkClassName}
                    onClick={() => setIsMenuOpen(false)}
                  >
                    {option.label}
                  </NavLink>
                ))}
              </nav>
            ) : null}
          </div>
        </div>
      </div>
    </header>
  );
};

export default NavHeader;
