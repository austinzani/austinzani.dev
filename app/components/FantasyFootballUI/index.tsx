import { Link } from "@remix-run/react";
import type { ReactNode } from "react";
import { useEffect, useRef, useState } from "react";
import Icon from "../Icon";

type FantasyHeroMetric = {
  label: string;
  value: ReactNode;
  highlight?: boolean;
};

type FantasyHeroProps = {
  eyebrow: string;
  title: ReactNode;
  subtitle: ReactNode;
  metrics?: FantasyHeroMetric[];
  menu?: ReactNode;
};

export const fantasyContentClass =
  "mx-auto w-full max-w-[1080px] px-[clamp(18px,5vw,64px)]";

type FantasyMenuItem = {
  label: string;
  to: string;
};

const baseMenuItems: FantasyMenuItem[] = [
  { label: "Tour de Sport", to: "/fantasy_football/tour_de_sport" },
];

// The Constitution page is members-only, so its menu entry is too — outsiders
// never see a link that just bounces them to login (decided 2026-08-29).
const memberMenuItems: FantasyMenuItem[] = [
  { label: "Constitution", to: "/fantasy_football/constitution" },
  { label: "Town Hall", to: "/fantasy_football/town_hall" },
  { label: "Rule Submission", to: "/fantasy_football/rule_submission" },
];

const signedOutMenuItems: FantasyMenuItem[] = [
  { label: "Sign In", to: "/fantasy_football/login" },
];

export const FantasyMenu = ({ isMember }: { isMember: boolean }) => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const menuItems = [
    ...baseMenuItems,
    ...(isMember ? memberMenuItems : signedOutMenuItems),
  ];

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
    <div className="relative" ref={menuRef}>
      <button
        type="button"
        aria-label={
          isMenuOpen ? "Close fantasy football menu" : "Open fantasy football menu"
        }
        aria-expanded={isMenuOpen}
        aria-controls="fantasy-football-menu"
        onClick={() => setIsMenuOpen((isOpen) => !isOpen)}
        className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-zinc-700 text-white transition hover:border-[#ffa64d] hover:text-[#ffa64d] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#ffa64d]"
      >
        <Icon name="ellipsis" className="h-4 w-4" />
      </button>
      {isMenuOpen ? (
        <nav
          id="fantasy-football-menu"
          className="absolute right-0 top-12 z-20 w-[min(82vw,15rem)] rounded-lg border border-line-muted bg-surface p-2 shadow-xl"
          aria-label="Fantasy football"
        >
          {menuItems.map((item) => (
            <Link
              key={item.to}
              to={item.to}
              prefetch="intent"
              className="block rounded-md px-3 py-2 font-mono text-sm font-semibold uppercase tracking-[0.1em] text-ink transition hover:bg-paper-muted hover:text-accent"
              onClick={() => setIsMenuOpen(false)}
            >
              {item.label}
            </Link>
          ))}
        </nav>
      ) : null}
    </div>
  );
};

export const FantasyMenuBar = ({ children }: { children: ReactNode }) => (
  <section className="bg-black text-white dark:bg-[#050505]">
    <div className={`${fantasyContentClass} flex justify-end py-4`}>
      {children}
    </div>
  </section>
);

export const FantasyHero = ({
  eyebrow,
  title,
  subtitle,
  metrics,
  menu,
}: FantasyHeroProps) => (
  <section className="bg-black text-white dark:bg-[#050505]">
    <div className={`${fantasyContentClass} py-[clamp(32px,6vw,56px)] pb-8`}>
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="mb-3.5 font-mono text-xs font-semibold uppercase leading-none tracking-[0.14em] text-[#ffa64d]">
            {eyebrow}
          </p>
          <h1 className="mb-2.5 font-display text-[clamp(38px,6.5vw,80px)] leading-none">
            {title}
          </h1>
          <p className="max-w-xl text-sm leading-[1.6] text-zinc-300">
            {subtitle}
          </p>
        </div>
        {menu ? <div className="shrink-0">{menu}</div> : null}
      </div>

      {metrics?.length ? (
        <div className="mt-[26px] flex flex-wrap border-t border-dashed border-zinc-700">
          {metrics.map((metric) => (
            <div
              key={metric.label}
              className="min-w-[120px] flex-1 border-zinc-700 px-5 pb-1 pt-[18px] sm:border-r last:border-r-0"
            >
              <div
                className={`font-mono text-[34px] font-semibold leading-none ${
                  metric.highlight ? "text-[#ffa64d]" : "text-white"
                }`}
              >
                {metric.value}
              </div>
              <div className="mt-1 font-mono text-[11px] font-medium uppercase tracking-[0.06em] text-zinc-400">
                {metric.label}
              </div>
            </div>
          ))}
        </div>
      ) : null}
    </div>
  </section>
);

export const FantasyBackBar = ({ to, children }: { to: string; children: ReactNode }) => (
  <div className="border-b border-dashed border-line-muted bg-zinc-200 dark:bg-zinc-900">
    <div className={`${fantasyContentClass} py-3.5`}>
      <Link
        to={to}
        prefetch="intent"
        className="inline-flex items-center gap-2 font-mono text-[12.5px] font-semibold uppercase tracking-[0.05em] text-ink no-underline hover:text-accent dark:text-zinc-100"
      >
        <span aria-hidden="true">←</span>
        {children}
      </Link>
    </div>
  </div>
);

export const FantasyMain = ({ children }: { children: ReactNode }) => (
  <div className={`${fantasyContentClass} py-9 pb-[100px]`}>{children}</div>
);

export const FantasyPanel = ({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) => (
  <div
    className={`rounded-md border border-line-muted bg-paper-muted p-4 dark:bg-zinc-900 ${className}`}
  >
    {children}
  </div>
);

export const FantasyStatCard = ({
  label,
  value,
  subtitle,
}: {
  label: string;
  value: ReactNode;
  subtitle?: ReactNode;
}) => (
  <div className="rounded-md border-[1.5px] border-line bg-paper p-4 dark:bg-zinc-950">
    <div className="mb-1.5 font-mono text-[11px] font-normal uppercase tracking-[0.06em] text-zinc-500 dark:text-zinc-400">
      {label}
    </div>
    <div className="font-display text-2xl leading-none text-ink dark:text-zinc-50">
      {value}
    </div>
    {subtitle ? (
      <div className="mt-1.5 text-xs text-ink-muted dark:text-zinc-400">
        {subtitle}
      </div>
    ) : null}
  </div>
);

export const FantasySectionHeading = ({ children }: { children: ReactNode }) => (
  <h2 className="mb-3 font-mono text-xs font-semibold uppercase tracking-[0.06em] text-zinc-500 dark:text-zinc-400">
    {children}
  </h2>
);

export const fantasyTableShellClass =
  "relative overflow-x-auto overscroll-x-contain [-webkit-overflow-scrolling:touch] md:overflow-x-visible";

export const fantasyTableHeadRowClass =
  "border-b-[1.5px] border-line bg-[color:color-mix(in_srgb,var(--color-surface)_58%,transparent)] font-mono text-[11px] font-semibold uppercase tracking-[0.06em] text-zinc-500 backdrop-blur-[1px] dark:border-zinc-500 dark:text-zinc-400";

export const fantasyTableBodyClass = "divide-y divide-dashed divide-line-muted";

export const fantasyTableRowClass =
  "group cursor-pointer bg-[color:color-mix(in_srgb,var(--color-surface)_34%,transparent)] transition hover:bg-[color:color-mix(in_srgb,var(--color-accent-soft)_55%,transparent)]";

export const fantasyTableFrozenColWrapClass = "w-[230px] shrink-0";

export const fantasyTableHeadHeightClass = "h-11 align-middle";

export const fantasyTableRowHeightClass = "h-[52px] align-middle";

export const HighLowPair = ({ high, low }: { high: ReactNode; low: ReactNode }) => (
  <div className="inline-grid min-w-[86px] grid-cols-[auto_auto] gap-x-2 gap-y-0.5 rounded bg-[color:color-mix(in_srgb,var(--color-paper-muted)_70%,transparent)] px-2 py-1 text-right font-mono text-[11px] font-semibold uppercase tracking-[0.04em] text-ink-muted">
    <span>{high}</span>
    <span>High</span>
    <span>{low}</span>
    <span>Low</span>
  </div>
);
