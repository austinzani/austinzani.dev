// Shared adapter contract for Tour de Sport ingestion.
//
// Every adapter's fetch() must resolve to this exact shape. The orchestrator
// (run.mjs) validates the result against this schema BEFORE any database
// write — a contract violation is an adapter failure and records a failed
// snapshot, never partial data.
import { z } from "zod";

export const adapterResultSchema = z
  .object({
    // Must match the tds_sports.sport_key the adapter is registered under.
    sportKey: z.string().min(1),
    // Source URL(s) actually fetched, for provenance in the snapshot payload.
    fetchedFrom: z.array(z.string().url()).min(1),
    entities: z
      .array(
        z.object({
          // Upsert conflict target is (sport_id, name) — names must be unique.
          name: z.string().min(1),
          // Cross-source ID map merged into tds_entities.source_ids,
          // e.g. { nhl: "COL" }.
          sourceIds: z
            .record(z.union([z.string().min(1), z.number()]))
            .refine((ids) => Object.keys(ids).length > 0, {
              message: "sourceIds must contain at least one source id",
            }),
          imageUrl: z.string().url().optional(),
          // Raw 1-based standings position as the source presents it.
          // Ties are NOT averaged here — the scoring function averages later.
          rank: z.number().int().min(1),
          // The metric behind the rank (points, wins, ranking value...).
          metricValue: z.number().finite().optional(),
        }),
      )
      .min(1),
  })
  .superRefine((result, ctx) => {
    const names = new Set();
    for (const entity of result.entities) {
      if (names.has(entity.name)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `duplicate entity name "${entity.name}" — names must be unique within a sport`,
          path: ["entities"],
        });
      }
      names.add(entity.name);
    }
  });

/**
 * Validate an adapter result. Returns the parsed result or throws an Error
 * whose message lists every zod issue (that message lands on the failed
 * snapshot's error column).
 */
export function validateAdapterResult(sportKey, result) {
  const parsed = adapterResultSchema.safeParse(result);
  if (!parsed.success) {
    const issues = parsed.error.issues
      .map((issue) => `${issue.path.join(".") || "(root)"}: ${issue.message}`)
      .join("; ");
    throw new Error(`adapter contract violation for "${sportKey}": ${issues}`);
  }
  if (parsed.data.sportKey !== sportKey) {
    throw new Error(
      `adapter contract violation for "${sportKey}": result.sportKey is "${parsed.data.sportKey}"`,
    );
  }
  return parsed.data;
}
