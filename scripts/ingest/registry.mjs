// Adapter registry, keyed by tds_sports.sport_key.
//
// To add a sport: write scripts/ingest/adapters/<key>.mjs default-exporting
// { sportKey: "<key>", fetch: async () => <adapter contract shape> } and add
// one import + one entry here. Zero orchestrator changes required — run.mjs
// silently skips any sport row without a registry entry (those sports are
// simply still 'pending').
import atp from "./adapters/atp.mjs";
import espnAdapters from "./adapters/espn.mjs";
import f1 from "./adapters/f1.mjs";
import mlb from "./adapters/mlb.mjs";
import nascar from "./adapters/nascar.mjs";
import nhl from "./adapters/nhl.mjs";
import pga from "./adapters/pga.mjs";

export const adapters = {
  [atp.sportKey]: atp,
  [f1.sportKey]: f1,
  [mlb.sportKey]: mlb,
  [nascar.sportKey]: nascar,
  [nhl.sportKey]: nhl,
  [pga.sportKey]: pga,
  // The config-driven ESPN family: nfl, nba, mls, epl, cfb, cbb.
  ...espnAdapters,
};
