import supabase from "~/utils/supabase";

/**
 * Fetches the shared Fantasy Football summary used by the league shell and Home.
 */
async function getLeagueStats() {
  const { data: managerData, error: managerError } = await supabase
    .from("manager")
    .select("id, name");

  const { data: yearsData, error: yearsError } = await supabase
    .from("season")
    .select("year, champ")
    .order("year", { ascending: false });

  const { data: allTimeResponse, error: allTimeError } = await supabase.rpc(
    "all_time"
  );

  const { count: matchupCount, error: matchupCountError } = await supabase
    .from("game")
    .select("*", { count: "exact", head: true })
    .eq("is_bye_week", false);

  if (managerError || yearsError || allTimeError || matchupCountError) {
    return {
      error: managerError || yearsError || allTimeError || matchupCountError,
      managers: [],
      allTime: [],
      years: [],
      seasonCount: 0,
      activeTeamCount: 0,
      teamSeasonCount: 0,
      matchupCount: 0,
      latestChampionFirstName: null,
    };
  }

  allTimeResponse?.sort(
    (a, b) => b.total_wins / b.total_games - a.total_wins / a.total_games
  );

  const latestChamp = yearsData?.[0];
  const latestChampManager = latestChamp
    ? managerData?.find((manager) => manager.id === latestChamp.champ)
    : null;
  const rawFirstName = latestChampManager?.name?.trim().split(/\s+/)[0] ?? null;
  const latestChampionFirstName = rawFirstName
    ? rawFirstName.charAt(0).toUpperCase() + rawFirstName.slice(1)
    : null;

  const years =
    yearsData?.map((year) => {
      return {
        key: `${year.year}`,
        value: `${year.year}`,
      };
    }) ?? [];
  years.unshift({ key: "all_time", value: "All Time" });

  return {
    error: null,
    managers: managerData ?? [],
    allTime: allTimeResponse ?? [],
    years,
    seasonCount: yearsData?.length ?? 0,
    activeTeamCount:
      allTimeResponse?.filter((manager) => manager.is_active).length ?? 0,
    teamSeasonCount:
      allTimeResponse?.reduce(
        (total, manager) => total + (manager.total_seasons ?? 0),
        0
      ) ?? 0,
    matchupCount: matchupCount ?? 0,
    latestChampionFirstName,
  };
}

export { getLeagueStats };
