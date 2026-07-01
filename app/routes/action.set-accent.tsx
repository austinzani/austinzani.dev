import { json, redirect } from "@remix-run/node";
import type { ActionFunction, LoaderFunction } from "@remix-run/node";

import { getAccentSession } from "~/utils/accent.server";
import { isAccent } from "~/utils/accent-provider";

export const action: ActionFunction = async ({ request }) => {
  const accentSession = await getAccentSession(request);
  const requestText = await request.text();
  const form = new URLSearchParams(requestText);
  const accent = form.get("accent");

  if (!isAccent(accent)) {
    return json({
      success: false,
      message: `accent value of ${accent} is not a valid accent`,
    });
  }

  accentSession.setAccent(accent);
  return json(
    { success: true },
    { headers: { "Set-Cookie": await accentSession.commit() } }
  );
};

export const loader: LoaderFunction = () => redirect("/", { status: 404 });
