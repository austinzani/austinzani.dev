import type {LinksFunction, MetaFunction, LoaderFunction} from "@remix-run/node";
import React from "react";
import {NonFlashOfWrongThemeEls, Theme, useTheme} from "~/utils/Theme/theme_provider";
import {getThemeSession} from "~/utils/Theme/theme.server";
import styles from './styles/app.css'
import {ThemeProvider} from "~/utils/Theme/theme_provider";
import {Links, LiveReload, Meta, Outlet, Scripts, ScrollRestoration, useLoaderData} from "@remix-run/react";
import NavHeader from "~/components/NavHeader";

export const meta: MetaFunction = () => ({
    charset: "utf-8",
    title: "austinzani.dev",
    viewport: "width=device-width,initial-scale=1",
});

// @ts-ignore
export const links: LinksFunction = () => {
    return [
        {rel: "stylesheet", href: styles},
        {rel: "stylesheet", href: "https://fonts.googleapis.com/css2?family=Outfit:wght@100;400;700&display=swap"},
        {rel: "preconnect", href: "https://fonts.googleapis.com"},
        {rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "true"},
        {
            rel: "preload",
            as: "image",
            href: "https://bvaxppgdleypbyzyjchu.supabase.co/storage/v1/object/public/images/league_pic.JPG"
        },
        {rel: "me", href: "https://mastodon.social/@zaniad"},
    ]
}

export type LoaderData = {
    theme: Theme | null;
};

export const loader: LoaderFunction = async ({request}) => {
    const themeSession = await getThemeSession(request);

    const data: LoaderData = {
        theme: themeSession.getTheme(),
    };

    return data;
};

function App() {
    const [theme] = useTheme();
    const data = useLoaderData<LoaderData>();

    return (
        <html lang="en" className={`w-full h-full ${theme ?? ""}`}>
        <head>
            <Meta/>
            <Links/>
            <NonFlashOfWrongThemeEls ssrTheme={Boolean(data?.theme)}/>
            <script src="https://kit.fontawesome.com/84ef1ed513.js" crossOrigin="anonymous"></script>
        </head>
        <body className={"w-full h-full dark:bg-black dark:text-white font-['Outfit']"}>
        <NavHeader/>
        <div className={"h-[calc(100%_-_3.5rem)] w-full"}>
            <Outlet/>
        </div>
        <ScrollRestoration/>
        <Scripts/>
        <LiveReload/>
        </body>
        </html>
    );
}

export default function AppWithThemeProvider() {
    const data = useLoaderData<LoaderData>();
    return (
        <ThemeProvider specifiedTheme={data.theme}>
            <App/>
        </ThemeProvider>
    );
}
