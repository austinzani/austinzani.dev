import type {LinksFunction, MetaFunction} from "@remix-run/node";
import {
  Links,
  LiveReload,
  Meta,
  Outlet,
  Scripts,
  ScrollRestoration,
} from "@remix-run/react";
import React from "react";

import styles from './styles/app.css'
import NavHeader from './components/NavHeader'

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

export default function App() {
  return (
    <html lang="en" className={"w-full h-full"}>
      <head>
        <Meta />
        <Links />
        <script src="https://kit.fontawesome.com/84ef1ed513.js" crossOrigin="anonymous"></script>
      </head>
      <body className={"w-full h-full bg-black text-white font-['Outfit']"}>
        <NavHeader />
        <Outlet />
        <ScrollRestoration />
        <Scripts />
        <LiveReload />
      </body>
    </html>
  );
}
