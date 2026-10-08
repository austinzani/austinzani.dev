import type { MetaFunction } from "@remix-run/node";
import { useEffect, useRef, useState } from "react";

// Keep the event copy and destinations together so the lineup is easy to update.
const event = {
  title: "Hot Wings & Hard Truths: Stop Waiting for Permission",
  subtitle: "StartupCincy Week 2026",
  description:
    "Meet the Hot Wings & Hard Truths panel and follow the five-sauce lineup at StartupCincy Week 2026.",
  url: "https://austinzani.dev/hot-wings",
  shareImage: "https://austinzani.dev/images/hot-wings/share.jpg",
  shareImageAlt:
    "Hot Wings & Hard Truths graphic with portraits of Austin Zani, Paul Ehlinger, Chris Bergman, and Christin Godale",
  panelists: [
    {
      name: "Chris Bergman",
      initials: "CB",
      role: "Founder & CEO",
      company: "Gylee Games",
      url: "https://gyleegames.com",
      image: "/images/hot-wings/chris-bergman.jpg",
      imageAlt: "Headshot of Chris Bergman",
      moderator: false,
    },
    {
      name: "Christin Godale, PhD",
      initials: "CG",
      role: "Executive Director",
      company: "LifeSciKY",
      url: "https://lifesciky.com",
      image: "/images/hot-wings/christin-godale.jpg",
      imageAlt: "Headshot of Christin Godale",
      moderator: false,
    },
    {
      name: "Paul Ehlinger",
      initials: "PE",
      role: "Co-Founder & CEO",
      company: "Flamel.ai",
      url: "https://flamel.ai",
      image: "/images/hot-wings/paul-ehlinger.jpg",
      imageAlt: "Headshot of Paul Ehlinger",
      moderator: false,
    },
    {
      name: "Austin Zani",
      initials: "AZ",
      role: "Lead Engineer",
      company: "Pay Theory",
      url: "https://paytheory.com",
      image: "/images/hot-wings/austin-zani.jpg",
      imageAlt: "Headshot of Austin Zani",
      moderator: true,
    },
  ],
  sauces: [
    {
      name: "Kentucky Tang",
      brand: "Farmer Nate's",
      location: "Covington, KY",
      heatLabel: "Mild",
      heat: 1,
      url: "https://www.farmernatessauce.com",
      image: "/images/hot-wings/sauce-1.jpg",
    },
    {
      name: "Columbus Lemon Drop",
      brand: "Flavor & Fire",
      location: "Westerville, OH",
      heatLabel: "Medium",
      heat: 2,
      url: "https://flavorandfire.com/products/columbus-lemon-drop",
      image: "/images/hot-wings/sauce-2.jpg",
    },
    {
      name: "Chili Fury",
      brand: "Fire Heaven",
      location: "Cincinnati, OH",
      heatLabel: "Hot",
      heat: 3,
      url: "https://fireheaven.com/shop/",
      image: "/images/hot-wings/sauce-3.jpg",
    },
    {
      name: "La Jefa (Fierce Garlic Scorpion)",
      brand: "Sauce Boss Gang",
      location: "Columbus, OH",
      heatLabel: "Very hot",
      heat: 4,
      url: "https://saucebossgang.com/products/sauce-boss-gang-scorpion-pepper-mustardseed-hot-sauce",
      image: "/images/hot-wings/sauce-4.jpg",
    },
    {
      name: "Green Ghost and Friends",
      brand: "Peppers-R-Paradise",
      location: "Radcliff, KY",
      heatLabel: "Extremely hot",
      heat: 5,
      url: "https://www.peppersrparadise.com/product-page/green-ghost-and-friends",
      image: "/images/hot-wings/sauce-5.jpg",
    },
  ],
} as const;

/** Provide the event title and share copy for this standalone route. */
export const meta: MetaFunction = () => [
  { title: `${event.title} | ${event.subtitle}` },
  { name: "description", content: event.description },
  { property: "og:title", content: event.title },
  { property: "og:description", content: event.description },
  { property: "og:type", content: "website" },
  { property: "og:url", content: event.url },
  { property: "og:image", content: event.shareImage },
  { property: "og:image:type", content: "image/jpeg" },
  { property: "og:image:width", content: "1600" },
  { property: "og:image:height", content: "900" },
  { property: "og:image:alt", content: event.shareImageAlt },
  { name: "twitter:card", content: "summary_large_image" },
  { name: "twitter:title", content: event.title },
  { name: "twitter:description", content: event.description },
  { name: "twitter:image", content: event.shareImage },
  { name: "twitter:image:alt", content: event.shareImageAlt },
];

type Panelist = (typeof event.panelists)[number];
type Sauce = (typeof event.sauces)[number];

function useImageFailure() {
  const [imageFailed, setImageFailed] = useState(false);
  const imageRef = useRef<HTMLImageElement>(null);

  useEffect(() => {
    // A cached 404 can finish before hydration attaches React's error handler.
    const image = imageRef.current;
    if (image?.complete && image.naturalWidth === 0) setImageFailed(true);
  }, []);

  return { imageFailed, imageRef, markImageFailed: () => setImageFailed(true) };
}

function PanelistPhoto({ panelist }: { panelist: Panelist }) {
  const { imageFailed, imageRef, markImageFailed } = useImageFailure();

  return (
    <div className="relative flex h-[72px] w-[72px] shrink-0 items-center justify-center overflow-hidden rounded border border-line-muted bg-accent-soft font-display text-3xl text-accent-ink min-[700px]:aspect-square min-[700px]:h-auto min-[700px]:w-full min-[700px]:text-6xl">
      <span aria-hidden="true">{panelist.initials}</span>
      {!imageFailed && (
        <img
          ref={imageRef}
          src={panelist.image}
          alt={panelist.imageAlt}
          width="800"
          height="800"
          loading="lazy"
          decoding="async"
          onError={markImageFailed}
          className="absolute inset-0 h-full w-full object-cover grayscale"
        />
      )}
    </div>
  );
}

function SaucePhoto({ sauce }: { sauce: Sauce }) {
  const { imageFailed, imageRef, markImageFailed } = useImageFailure();

  // Remove the image slot as well as the broken image, leaving a text-only card.
  if (imageFailed) return null;

  return (
    <div className="flex h-20 w-14 shrink-0 items-center justify-center overflow-hidden rounded border border-line-muted bg-paper-muted sm:h-24 sm:w-20">
      <img
        ref={imageRef}
        src={sauce.image}
        alt={`${sauce.name} hot sauce bottle`}
        width="80"
        height="96"
        loading="lazy"
        decoding="async"
        onError={markImageFailed}
        className="h-full w-full object-contain"
      />
    </div>
  );
}

function HeatIndicator({ sauce }: { sauce: Sauce }) {
  return (
    <span
      role="img"
      aria-label={`Heat level ${sauce.heat} of 5: ${sauce.heatLabel}`}
      className="inline-flex gap-1.5"
    >
      {Array.from({ length: 5 }, (_, index) => (
        <span
          key={index}
          aria-hidden="true"
          className={`h-2 w-5 rounded-sm border border-accent ${
            index < sauce.heat ? "bg-accent" : "bg-transparent"
          }`}
        />
      ))}
    </span>
  );
}

/** Show the panel and sauce order on a static event page. */
export default function HotWings() {
  return (
    <div className="w-full px-[clamp(18px,5vw,64px)] pb-[clamp(64px,9vw,120px)] pt-[clamp(36px,7vw,88px)]">
      <article className="mx-auto max-w-[1196px]">
        <header className="mb-14 max-w-4xl sm:mb-20">
          <p className="zine-kicker mb-5">{event.subtitle}</p>
          <h1 className="zine-page-title max-w-4xl">
            {event.title}
          </h1>
        </header>

        <section aria-labelledby="panel-heading" className="mb-16 sm:mb-20">
          <div className="mb-5 border-t border-dashed border-line-muted pt-3">
            <h2 id="panel-heading" className="zine-catalog-heading">
              The panel
            </h2>
          </div>
          {/* Switch directly from a list to one row of four cards at 700px. */}
          <div className="grid gap-3 min-[700px]:grid-cols-4">
            {event.panelists.map((panelist) => (
              <div
                key={panelist.name}
                className="flex min-w-0 gap-4 rounded border border-dashed border-line-muted bg-paper-muted p-4 min-[700px]:flex-col min-[700px]:p-3 lg:p-4 xl:p-5"
              >
                <PanelistPhoto panelist={panelist} />
                <div className="flex min-w-0 flex-1 flex-col items-start">
                  {panelist.moderator && (
                    <span className="mb-1 font-mono text-[10px] font-semibold uppercase tracking-[0.1em] text-accent">
                      Moderator
                    </span>
                  )}
                  <h3 className="zine-catalog-title leading-tight">
                    {panelist.name}
                  </h3>
                  <p className="mt-1 text-sm text-ink-muted">{panelist.role}</p>
                  <a
                    href={panelist.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="zine-catalog-action mt-3 inline-flex min-h-11 items-center break-words text-xs focus:outline-none focus-visible:ring-2 focus-visible:ring-accent"
                    aria-label={`Visit ${panelist.company} website, opens in a new tab`}
                  >
                    {panelist.company} ↗
                  </a>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section aria-labelledby="sauce-heading">
          <div className="mb-5 border-t border-dashed border-line-muted pt-3">
            <h2 id="sauce-heading" className="zine-catalog-heading">
              Sauce lineup <span className="text-accent">/ Mild to hot</span>
            </h2>
          </div>
          <ol className="grid gap-3 lg:grid-cols-2">
            {event.sauces.map((sauce, index) => (
              <li
                key={sauce.name}
                className="flex min-w-0 gap-3 rounded border border-dashed border-line-muted bg-paper-muted p-4 sm:gap-5 sm:p-5"
              >
                <span className="w-9 shrink-0 pt-1 font-mono text-lg font-semibold text-accent sm:w-11">
                  {String(index + 1).padStart(2, "0")}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex min-w-0 items-start gap-3">
                    <div className="min-w-0 flex-1">
                      <h3 className="zine-catalog-title leading-tight">
                        {sauce.name}
                      </h3>
                      <p className="mt-1 text-sm text-ink-muted">
                        {sauce.brand} · {sauce.location}
                      </p>
                    </div>
                    <SaucePhoto sauce={sauce} />
                  </div>
                  <div className="mt-4 flex flex-wrap items-center gap-x-3 gap-y-2">
                    <span className="font-mono text-[11px] font-semibold uppercase tracking-[0.08em] text-ink">
                      {sauce.heatLabel}
                    </span>
                    <HeatIndicator sauce={sauce} />
                  </div>
                  <a
                    href={sauce.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="zine-catalog-action mt-2 inline-flex min-h-11 items-center text-xs focus:outline-none focus-visible:ring-2 focus-visible:ring-accent"
                    aria-label={`Visit ${sauce.brand} website, opens in a new tab`}
                  >
                    Visit {sauce.brand} ↗
                  </a>
                </div>
              </li>
            ))}
          </ol>
        </section>
      </article>
    </div>
  );
}
