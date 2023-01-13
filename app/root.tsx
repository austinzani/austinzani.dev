import type {LinksFunction, MetaFunction} from "@remix-run/node";
import {
  Links,
  LiveReload,
  Meta,
  Outlet,
  Scripts,
  ScrollRestoration,
} from "@remix-run/react";

import styles from './styles/app.css'

export const meta: MetaFunction = () => ({
  charset: "utf-8",
  title: "New Remix App",
  viewport: "width=device-width,initial-scale=1",
});

// @ts-ignore
export const links: LinksFunction = () => {
  return [
      { rel: "stylesheet", href: styles },
      { rel: "stylesheet", href: "https://fonts.googleapis.com/css2?family=Outfit:wght@100;400;700&display=swap" },
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "true" },
  ]
}

const NavHeader = () => {
    return (
        <div className={"flex justify-between h-[54px] border-b border-b-orange-500 "}>
            <h3 className={"text-2xl p-2 text-teal-600"}>{"{ Austin Zani }"}</h3>
            <h3 className={"text-2xl p-2 text-teal-600"}>Menu Items</h3>
        </div>
    )
}

export default function App() {
  return (
    <html lang="en">
      <head>
        <Meta />
        <Links />
      </head>
      <body className={"bg-gray-700 text-white font-['Outfit']"}>
        <NavHeader />
        <Outlet />
        <ScrollRestoration />
        <Scripts />
        <LiveReload />
      </body>
    </html>
  );
}
