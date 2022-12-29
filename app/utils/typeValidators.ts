import z from "zod";

export const seasonObject = z.object({
    manager_name: z.string(),
    total_games: z.number(),
    total_wins: z.number(),
    playoff_games: z.number(),
    playoff_wins: z.number(),
    total_points_for: z.number(),
    total_points_against: z.number(),
    high_point_weeks: z.number(),
    low_point_weeks: z.number(),
    championships: z.number(),
});

export const allTimeObject = z.object({
    name: z.string(),
    total_games: z.number(),
    total_wins: z.number(),
    playoff_games: z.number(),
    playoff_wins: z.number(),
    total_points_for: z.number(),
    total_points_against: z.number(),
    high_point_weeks: z.number(),
    low_point_weeks: z.number(),
    transactions: z.number(),
    trades: z.number(),
    championships: z.number(),
    playoff_births: z.number(),
    total_seasons: z.number(),
});

export const managerObject = z.object({
    name: z.string(),
    id: z.number(),
});