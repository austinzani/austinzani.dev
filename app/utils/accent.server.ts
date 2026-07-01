import { createCookieSessionStorage } from "@remix-run/node";

import { Accent, isAccent } from "./accent-provider";

const sessionSecret = process.env.SESSION_SECRET;
if (!sessionSecret) {
  throw new Error("SESSION_SECRET must be set");
}

const accentStorage = createCookieSessionStorage({
  cookie: {
    name: "austinzani_accent",
    secure: true,
    secrets: [sessionSecret],
    sameSite: "lax",
    path: "/",
    httpOnly: true,
  },
});

async function getAccentSession(request: Request) {
  const session = await accentStorage.getSession(request.headers.get("Cookie"));
  return {
    getAccent: () => {
      const accentValue = session.get("accent");
      return isAccent(accentValue) ? accentValue : null;
    },
    setAccent: (accent: Accent) => session.set("accent", accent),
    commit: () => accentStorage.commitSession(session),
  };
}

export { getAccentSession };
