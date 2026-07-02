import { Link, useLoaderData } from "@remix-run/react";
import { getLeagueStats } from "~/utils/league-stats.server";

export const loader = async () => {
  const leagueStats = await getLeagueStats();
  return {
    seasonCount: leagueStats.seasonCount,
  };
};

const sectionCards = [
  {
    to: "/about",
    eyebrow: "01 — About",
    title: "Who I Am",
    description: "Family, apps I’m building, and the story so far.",
    action: "Read More →",
    className: "border-line-muted bg-paper-muted text-ink",
    mutedClassName: "text-zinc-500",
    actionClassName: "text-accent",
  },
  {
    to: "/fantasy_football",
    eyebrow: "02 — League",
    title: "Fantasy Football",
    description: "seasons of standings, records & grudges.",
    action: "Enter The Archive →",
    className: "border-zinc-700 bg-black text-white",
    mutedClassName: "text-zinc-400",
    actionClassName: "text-[#ffa64d]",
    usesSeasonCount: true,
  },
  {
    to: "/music",
    eyebrow: "03 — Crate",
    title: "Music",
    description: "Top 100 albums & the annual countdown.",
    action: "Browse The Crate →",
    className: "border-[#a35300] bg-accent text-[#ffe8cc]",
    mutedClassName: "text-[#ffd199]",
    actionClassName: "text-white",
  },
];

export default function Index() {
  const { seasonCount } = useLoaderData<typeof loader>();

  return (
    <div className="w-full px-[clamp(18px,5vw,64px)] py-[clamp(56px,8vw,110px)] pb-[clamp(60px,8vw,100px)]">
      <div>
        <p className="zine-kicker mb-[18px]">
          Vol. 01 — Cincinnati, OH
        </p>
        <h1 className="zine-page-title mb-1">
          Austin Zani
        </h1>
        <h2 className="zine-subtitle mb-[30px]">
          Husband. Father. Bearcat. Builder.
        </h2>
        <p className="zine-lede mb-11 max-w-3xl">
          Software developer in Cincinnati raising three kids, chasing a fantasy
          football title I never win, and ranking every album I’ve ever loved.
          This site is the record of all of it.
        </p>

        <div className="mb-14 grid grid-cols-1 gap-[18px] md:grid-cols-2">
          {sectionCards.map((card) => (
            <Link
              key={card.to}
              to={card.to}
              prefetch="intent"
              className={`group relative min-h-[214px] rounded border border-dashed p-6 pt-[26px] transition hover:-translate-y-1 ${card.className}`}
            >
              <span className="absolute left-[-9px] top-1/2 h-[18px] w-[18px] -translate-y-1/2 rounded-full bg-paper" />
              <span className="absolute right-[-9px] top-1/2 h-[18px] w-[18px] -translate-y-1/2 rounded-full bg-paper" />
              <p
                className={`mb-3.5 font-mono text-xs font-semibold uppercase tracking-[0.1em] ${card.mutedClassName}`}
              >
                {card.eyebrow}
              </p>
              <h3 className="zine-ticket-title mb-2.5">
                {card.title}
              </h3>
              <p className="mb-[18px] max-w-sm text-[13.5px] leading-[1.55]">
                {card.usesSeasonCount
                  ? `${seasonCount} ${card.description}`
                  : card.description}
              </p>
              <p
                className={`font-mono text-xs font-semibold uppercase tracking-[0.08em] ${card.actionClassName}`}
              >
                {card.action}
              </p>
            </Link>
          ))}
        </div>

        <footer className="flex flex-wrap items-center gap-x-7 gap-y-4 border-t border-dashed border-line-muted pt-[22px]">
          <a className="home-footer-link" href="https://mastodon.social/@zaniad">
            Mastodon
          </a>
          <a className="home-footer-link" href="https://github.com/austinzani">
            Github
          </a>
          <a
            className="home-footer-link"
            href="https://www.linkedin.com/in/zaniad/"
          >
            LinkedIn
          </a>
          <a className="home-footer-link" href="mailto:austinzani@gmail.com">
            Email
          </a>
          <span className="ml-auto font-mono text-[11px] text-zinc-500">
            Cincinnati, OH
          </span>
        </footer>
      </div>
    </div>
  );
}
