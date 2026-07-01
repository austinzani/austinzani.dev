import type { LinksFunction, MetaFunction } from "@remix-run/node";
import {
  Links,
  LiveReload,
  Meta,
  Outlet,
  Scripts,
  ScrollRestoration,
  useLoaderData,
} from "@remix-run/react";
import React from "react";
import { Theme } from "~/utils/theme-provider";
import { getThemeSession } from "~/utils/theme.server";
import { LoaderFunction } from "@remix-run/node";
import { Accent, AccentProvider, useAccent } from "~/utils/accent-provider";
import { getAccentSession } from "~/utils/accent.server";

import {
  useTheme,
  ThemeProvider,
  NonFlashOfWrongThemeEls,
} from "~/utils/theme-provider";
import one from "./images/memoji_1.png";

import styles from "./styles/app.css";
import globalStyles from "./styles/global.css";
import NavHeader from "./components/NavHeader";

export type LoaderData = {
  theme: Theme | null;
  accent: Accent | null;
};

export const meta: MetaFunction = () => {
  return [
    { title: "austinzani.dev" },
    {
      name: "og:title",
      content: "austinzani.dev",
    },
    {
      name: "description",
      content: "Austin Zani's personal website",
    },
    {
      name: "og:image",
      content: one,
    },
  ];
};

export const loader: LoaderFunction = async ({ request }) => {
  const themeSession = await getThemeSession(request);
  const accentSession = await getAccentSession(request);

  const data: LoaderData = {
    theme: themeSession.getTheme(),
    accent: accentSession.getAccent(),
  };

  return data;
};

// @ts-ignore
export const links: LinksFunction = () => {
  return [
    { rel: "stylesheet", href: styles },
    { rel: "stylesheet", href: globalStyles },
    {
      rel: "stylesheet",
      href: "https://fonts.googleapis.com/css2?family=Outfit:wght@100;400;700&display=swap",
    },
    {
      rel: "stylesheet",
      href: "https://fonts.googleapis.com/css2?family=Noto+Sans:ital,wght@0,100..900;1,100..900&display=swap",
    },
    { rel: "preconnect", href: "https://fonts.googleapis.com" },
    {
      rel: "preconnect",
      href: "https://fonts.gstatic.com",
      crossOrigin: "true",
    },
    {
      rel: "preload",
      as: "image",
      href: "https://bvaxppgdleypbyzyjchu.supabase.co/storage/v1/object/public/images/league_pic.JPG",
    },
    { rel: "me", href: "https://mastodon.social/@zaniad" },
  ];
};

function App() {
  const [theme] = useTheme();
  const [accent] = useAccent();
  const data = useLoaderData<LoaderData>();

  return (
    <html
      lang="en"
      data-accent={accent}
      className={`w-full h-full ${theme || ""}`}
    >
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width,initial-scale=1" />
        <Meta />
        <Links />
        <NonFlashOfWrongThemeEls ssrTheme={Boolean(data.theme)} />
        <script
          src="https://kit.fontawesome.com/84ef1ed513.js"
          crossOrigin="anonymous"
        ></script>
      </head>
      <body
        className={
          "zine-page min-h-screen w-full bg-paper text-ink font-body transition-colors"
        }
      >
        <NavHeader />
        <main className="w-full">
          <Outlet />
        </main>
        <ScrollRestoration />
        <Scripts />
        <LiveReload />
      </body>
    </html>
  );
}

export default function AppWithProviders() {
  const data = useLoaderData<LoaderData>();

  return (
    <ThemeProvider specifiedTheme={data.theme}>
      <AccentProvider specifiedAccent={data.accent}>
        <App />
      </AccentProvider>
    </ThemeProvider>
  );
}
