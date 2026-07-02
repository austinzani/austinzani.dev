import { redirect, type LoaderFunctionArgs } from "@remix-run/node";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const url = new URL(request.url);
  const year = url.searchParams.get("year");
  const week = url.searchParams.get("week") ?? "1";

  if (!year) {
    return redirect("/fantasy_football");
  }

  return redirect(`/fantasy_football/season/${year}?view=week-by-week&week=${week}`);
};

export default function WeekMatchupsRedirect() {
  return null;
}
