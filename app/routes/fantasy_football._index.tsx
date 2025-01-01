import Icon from "~/components/Icon";
import { useFootballContext } from "~/routes/fantasy_football";
import { Link } from "@remix-run/react";

export default function Football() {
  const { years, managers, allTime } = useFootballContext();
  const activeMembers = allTime.filter((manager) => manager.is_active);

  return (
    <div className="min-h-screen flex justify-center ">
      <div className={"flex m-3 flex-col w-full max-w-[64rem]"}>
        {/* Header and Image Section */}
        <div className="mb-8">
          <h1 className="text-4xl md:text-5xl font-bold mb-6">
            Zak's League to Lose
          </h1>
          <div className="relative w-full aspect-[3/2]">
            <img
              className="w-full h-full rounded-xl shadow-sm dark:shadow-none absolute inset-0 object-cover"
              src="https://bvaxppgdleypbyzyjchu.supabase.co/storage/v1/object/public/images/league_pic.JPG"
              alt="League Members"
            />
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <div className="bg-gray-100 dark:bg-zinc-900 rounded-lg p-6 flex items-center shadow-sm dark:shadow-none">
            <Icon name="house" className="w-8 h-8 text-orange-500 mr-4" />
            <div>
              <p className="text-gray-600 dark:text-gray-400">Established</p>
              <p className="text-xl font-bold">2009</p>
            </div>
          </div>

          <div className="bg-gray-100 dark:bg-zinc-900 rounded-lg p-6 flex items-center shadow-sm dark:shadow-none">
            <Icon name="user" className="w-8 h-8 text-orange-500 mr-4" />
            <div>
              <p className="text-gray-600 dark:text-gray-400">League Members</p>
              <p className="text-xl font-bold">{activeMembers.length} Teams</p>
            </div>
          </div>

          <div className="bg-gray-100 dark:bg-zinc-900 rounded-lg p-6 flex items-center shadow-sm dark:shadow-none">
            <Icon name="football" className="w-8 h-8 text-orange-500 mr-4" />
            <div>
              <p className="text-gray-600 dark:text-gray-400">Seasons</p>
              <p className="text-xl font-bold">{years.length}</p>
            </div>
          </div>

          <div className="bg-gray-100 dark:bg-zinc-900 rounded-lg p-6 flex items-center shadow-sm dark:shadow-none">
            <Icon name="share" className="w-8 h-8 text-orange-500 mr-4" />
            <div>
              <p className="text-gray-600 dark:text-gray-400">Data Source</p>
              <p className="text-xl font-bold">ESPN + Sleeper</p>
            </div>
          </div>
        </div>

        {/* Description */}
        <div className="bg-gray-100 dark:bg-zinc-900 rounded-lg p-6 shadow-sm dark:shadow-none">
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

          <Link
            to={"/fantasy_football/all_time"}
            prefetch="intent"
            className="bg-orange-600 hover:bg-orange-700 text-white font-bold py-3 px-6 rounded-lg flex items-center justify-center w-full md:w-auto transition-colors"
          >
            View League Data
            <Icon className={"pl-3"} name={"chevron-right"} />
          </Link>
        </div>
      </div>
    </div>
  );
}
