import Icon from "~/components/Icon";
import { useFootballContext } from "~/routes/fantasy_football";
import { Link } from "@remix-run/react";

export default function Football() {
  const { years, managers, allTime, latestChampionFirstName } = useFootballContext();
  const activeMembers = allTime.filter((manager) => manager.is_active);
  const titleHolder = latestChampionFirstName ?? "Zak";

  return (
    <div className="min-h-screen flex justify-center">
      <div className={"flex m-3 flex-col w-full max-w-[64rem]"}>
        <div className="mb-8">
          <p className="mb-3 font-mono text-xs font-semibold uppercase tracking-wide text-accent">
            Fantasy Football
          </p>
          <h1 className="mb-6 font-display text-6xl italic leading-none md:text-7xl">
            {titleHolder}&apos;s League to Lose
          </h1>
          <div className="relative w-full aspect-[3/2] border-2 border-dashed border-line bg-surface p-2">
            <img
              className="h-full w-full object-cover"
              src="https://bvaxppgdleypbyzyjchu.supabase.co/storage/v1/object/public/images/league_pic.JPG"
              alt="League Members"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <div className="border-2 border-dashed border-line bg-surface p-6 flex items-center">
            <Icon name="house" className="w-8 h-8 text-orange-500 mr-4" />
            <div>
              <p className="font-mono text-xs uppercase tracking-wide text-ink-muted">Established</p>
              <p className="font-display text-3xl italic">2009</p>
            </div>
          </div>

          <div className="border-2 border-dashed border-line bg-surface p-6 flex items-center">
            <Icon name="user" className="w-8 h-8 text-orange-500 mr-4" />
            <div>
              <p className="font-mono text-xs uppercase tracking-wide text-ink-muted">League Members</p>
              <p className="font-display text-3xl italic">{activeMembers.length} Teams</p>
            </div>
          </div>

          <div className="border-2 border-dashed border-line bg-surface p-6 flex items-center">
            <Icon name="football" className="w-8 h-8 text-orange-500 mr-4" />
            <div>
              <p className="font-mono text-xs uppercase tracking-wide text-ink-muted">Seasons</p>
              <p className="font-display text-3xl italic">{Math.max(years.length - 1, 0)}</p>
            </div>
          </div>

          <div className="border-2 border-dashed border-line bg-surface p-6 flex items-center">
            <Icon name="share" className="w-8 h-8 text-orange-500 mr-4" />
            <div>
              <p className="font-mono text-xs uppercase tracking-wide text-ink-muted">Data Source</p>
              <p className="font-display text-3xl italic">ESPN + Sleeper</p>
            </div>
          </div>
        </div>

        <div className="border-2 border-dashed border-line bg-paper-muted p-6">
          <p className="text-lg mb-6">
            This league has been going strong since 2009, with a core group of
            dedicated managers who've stuck together through the years. While
            we've welcomed new faces along the way, our community's competitive
            spirit has remained unchanged.
          </p>
          <p className="text-lg mb-6">
            We've preserved our league's history by collecting comprehensive
            data from both ESPN and Sleeper platforms, enabling us to track
            records, analyze head-to-head stats, and celebrate our league.
          </p>

          <div className="grid grid-cols-1 gap-3">
            <Link
              to={"/fantasy_football/all_time"}
              prefetch="intent"
              className="flex items-center justify-center border-2 border-dashed border-accent bg-accent px-6 py-3 font-mono text-xs font-bold uppercase tracking-wide text-accent-ink transition-colors hover:bg-accent-soft hover:text-ink"
            >
              View League Data
              <Icon className={"pl-3"} name={"chevron-right"} />
            </Link>
          </div>
        </div>

        <div className="mt-4 flex flex-wrap justify-end gap-3 border-t-2 border-dashed border-line-muted pt-3 pr-1 font-mono text-xs uppercase tracking-wide text-ink-muted">
          <span className="text-ink">austinzani.dev</span>
          <Link className="hover:text-accent hover:underline" to="/privacy">
            Privacy
          </Link>
          <Link className="hover:text-accent hover:underline" to="/terms">
            Terms
          </Link>
        </div>
      </div>
    </div>
  );
}
