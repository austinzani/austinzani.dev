import { Link } from "@remix-run/react";
import type { ReactNode } from "react";

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
};

export const fantasyContentClass =
  "mx-auto w-full max-w-[1080px] px-[clamp(18px,5vw,64px)]";

export const FantasyHero = ({
  eyebrow,
  title,
  subtitle,
  metrics,
}: FantasyHeroProps) => (
  <section className="bg-black text-white dark:bg-[#050505]">
    <div className={`${fantasyContentClass} py-[clamp(32px,6vw,56px)] pb-8`}>
      <p className="mb-3.5 font-mono text-xs font-semibold uppercase leading-none tracking-[0.14em] text-[#ffa64d]">
        {eyebrow}
      </p>
      <h1 className="mb-2.5 font-display text-[clamp(38px,6.5vw,80px)] leading-none">
        {title}
      </h1>
      <p className="max-w-xl text-sm leading-[1.6] text-zinc-300">
        {subtitle}
      </p>

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
