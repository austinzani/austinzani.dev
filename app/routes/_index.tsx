import one from "../images/memoji_1.png";
import two from "../images/memoji_2.png";
import three from "../images/memoji_3.png";
import four from "../images/memoji_4.png";
import five from "../images/memoji_5.png";
import six from "../images/memoji_6.png";
const memojis = [one, two, three, four, five, six];
import IconButton from "~/components/IconButton";
import Icon from "~/components/Icon";
import { Link, useLoaderData } from "@remix-run/react";
import { getLeagueStats } from "~/utils/league-stats.server";

export const loader = async () => {
  const leagueStats = await getLeagueStats();
  return {
    seasonCount: leagueStats.seasonCount,
    activeTeamCount: leagueStats.activeTeamCount,
    memojiIndex: Math.floor(Math.random() * memojis.length),
  };
};

export default function _index() {
  const { seasonCount, activeTeamCount, memojiIndex } = useLoaderData<typeof loader>();
  return (
    <div className="flex min-h-[calc(100vh-4rem)] w-full items-center justify-center px-4 py-12">
      <div className="grid w-full max-w-6xl gap-10 lg:grid-cols-[minmax(0,0.9fr)_minmax(22rem,1fr)] lg:items-center">
        <section className="flex flex-col items-center text-center lg:items-start lg:text-left">
      <img
        className="mb-5 h-52 w-52 rounded-full border-2 border-dashed border-line bg-accent-soft object-contain p-2"
        src={memojis[memojiIndex]}
        alt="Random MeMoji of the site owner Austin Zani"
      />
      <p className="mb-3 font-mono text-xs font-semibold uppercase tracking-wide text-accent">
        austinzani.dev
      </p>
      <h1 className="w-fit font-display text-6xl italic leading-none md:text-7xl">
        Austin Zani
      </h1>
      <h2 className="mt-4 max-w-xl px-4 text-lg font-normal text-ink-muted sm:text-xl lg:px-0">
        Husband, Father, <br className="sm:hidden" />
        Sports Addict, Software Developer
      </h2>
      <div className="mt-6 flex w-fit items-center space-x-2">
        <IconButton
          link="https://mastodon.social/@zaniad"
          icon="mastodon"
          internal={false}
          iconPrefix="fab"
          label="Mastodon"
        />
        <IconButton
          link="https://github.com/austinzani"
          icon="github"
          internal={false}
          iconPrefix="fab"
          label="Github"
        />
        <IconButton
          link="https://www.linkedin.com/in/zaniad/"
          icon="linkedin"
          internal={false}
          iconPrefix="fab"
          label="LinkedIn"
        />
        <IconButton
          link="mailto:austinzani@gmail.com"
          icon="envelope"
          internal={false}
          label="Email"
        />
      </div>
        </section>

        <section className="grid gap-4 sm:grid-cols-2">
          <Link
            to="/fantasy_football"
            prefetch="intent"
            className="group rounded-lg border-2 border-dashed border-line bg-surface p-5 transition hover:-translate-y-1 hover:border-accent hover:bg-accent-soft"
          >
            <div className="mb-8 flex items-center justify-between">
              <Icon name="football" className="h-6 w-6 text-accent" />
              <Icon
                name="chevron-right"
                className="h-4 w-4 text-ink-muted transition group-hover:translate-x-1 group-hover:text-accent"
              />
            </div>
            <h3 className="font-display text-4xl italic">Fantasy Football</h3>
            <p className="mt-3 font-mono text-xs uppercase tracking-wide text-ink-muted">
              {seasonCount} seasons / {activeTeamCount} teams
            </p>
          </Link>

          <Link
            to="/music"
            prefetch="intent"
            className="group rounded-lg border-2 border-dashed border-line bg-surface p-5 transition hover:-translate-y-1 hover:border-accent hover:bg-accent-soft"
          >
            <div className="mb-8 flex items-center justify-between">
              <Icon name="record-vinyl" className="h-6 w-6 text-accent" />
              <Icon
                name="chevron-right"
                className="h-4 w-4 text-ink-muted transition group-hover:translate-x-1 group-hover:text-accent"
              />
            </div>
            <h3 className="font-display text-4xl italic">Music</h3>
            <p className="mt-3 font-mono text-xs uppercase tracking-wide text-ink-muted">
              Albums, countdowns, and listening history
            </p>
          </Link>

          <Link
            to="/about"
            prefetch="intent"
            className="group rounded-lg border-2 border-dashed border-line bg-surface p-5 transition hover:-translate-y-1 hover:border-accent hover:bg-accent-soft sm:col-span-2"
          >
            <div className="mb-8 flex items-center justify-between">
              <Icon name="user" className="h-6 w-6 text-accent" />
              <Icon
                name="chevron-right"
                className="h-4 w-4 text-ink-muted transition group-hover:translate-x-1 group-hover:text-accent"
              />
            </div>
            <h3 className="font-display text-4xl italic">About</h3>
            <p className="mt-3 font-mono text-xs uppercase tracking-wide text-ink-muted">
              Family, work, teams, and side projects
            </p>
          </Link>
        </section>
      </div>
    </div>
  );
}
