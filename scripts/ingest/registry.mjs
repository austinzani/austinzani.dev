// Adapter registry, keyed by tds_sports.sport_key.
//
// To add a sport: write scripts/ingest/adapters/<key>.mjs default-exporting
// { sportKey: "<key>", fetch: async () => <adapter contract shape> } and add
// one import + one entry here. Zero orchestrator changes required — run.mjs
// silently skips any sport row without a registry entry (those sports are
// simply still 'pending').
import nhl from "./adapters/nhl.mjs";

export const adapters = {
  [nhl.sportKey]: nhl,
};
