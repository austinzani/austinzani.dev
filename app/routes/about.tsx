const facts = [
  {
    label: "Family",
    value: "Cath, Anderson, Quinn & Callan",
  },
  {
    label: "Employer",
    value: "Pay Theory",
  },
  {
    label: "Collecting",
    value: "Vinyl, 10+ yrs",
  },
];

const teams = [
  "Boston Celtics",
  "Cincinnati Bengals",
  "UC Bearcats",
  "UT Vols",
  "FC Cincinnati",
  "Cincinnati Reds",
  "Newcastle United",
];

const tags = [
  { label: "Cincinnati, OH", className: "-rotate-2 border-ink text-ink" },
  { label: "Pay Theory", className: "rotate-[1.5deg] border-ink text-ink" },
  { label: "Music Lover", className: "-rotate-1 border-accent text-accent" },
  { label: "Avid Sports Fan", className: "rotate-2 border-ink text-ink" },
];

const sideProjects = [
  {
    catalog: "Cat. 01",
    name: "Spritz",
    description:
      "Discover cocktails, generate recipes with AI, and mix with what you already have.",
    href: "https://apps.apple.com/app/id6748970457",
    icon: "https://www.usespritz.app/assets/brand/app-icon-320.png",
  },
  {
    catalog: "Cat. 02",
    name: "Tides",
    description:
      "A beautifully simple journal that helps you reflect, grow, and understand your emotional journey.",
    href: "https://apps.apple.com/app/id6746660968",
    icon: "https://www.usetides.app/app-icon.png",
  },
];

const About = () => {
  return (
    <div className="w-full px-[clamp(18px,5vw,64px)] pb-[100px] pt-[clamp(36px,7vw,96px)]">
      <article className="max-w-[1196px]">
        <p className="zine-kicker mb-3.5">
          File No. 001 — Subject
        </p>
        <h1 className="zine-page-title mb-5">
          Austin Zani
        </h1>

        <div className="mb-[46px] flex flex-wrap gap-2.5">
          {tags.map((tag) => (
            <span
              key={tag.label}
              className={`zine-tag ${tag.className}`}
            >
              {tag.label}
            </span>
          ))}
        </div>

        <div className="mb-[60px] flex flex-wrap gap-[clamp(24px,4vw,56px)] lg:grid lg:grid-cols-[430px_minmax(0,730px)] lg:gap-10">
          <div className="flex w-full flex-col gap-3.5 lg:w-auto lg:gap-5">
            {facts.map((fact) => (
              <div
                key={fact.label}
                className="flex justify-between gap-2 border-b border-dotted border-line-muted pb-2 lg:pb-3"
              >
                <span className="zine-ledger-label">
                  {fact.label}
                </span>
                <span className="zine-ledger-value text-right">
                  {fact.value}
                </span>
              </div>
            ))}
            <div className="flex justify-between gap-2">
              <span className="zine-ledger-label flex-shrink-0">
                Teams
              </span>
              <div className="flex flex-col gap-1.5 text-right lg:gap-2">
                {teams.map((team) => (
                  <span key={team} className="zine-ledger-value">
                    {team}
                  </span>
                ))}
              </div>
            </div>
          </div>

          <div className="min-w-[280px] flex-1">
            <p className="zine-lede mb-[18px]">
              I&apos;m a software developer based in Cincinnati — husband to
              Cath, dad to Anderson, Quinn, and Callan. I worked the Apple
              Store floor back when the original iPhone still felt like magic,
              which is what pulled me into building software in the first place.
            </p>
            <p className="zine-lede">
              These days I build payment tooling at Pay Theory, and everything
              else — the league, the music ranking, the two apps below — happens
              after the kids are asleep. When I&apos;m not building, I&apos;m
              rooting for the UC Bearcats, holding season tickets for the
              Bengals, and never missing a Celtics game.
            </p>
          </div>
        </div>

        <section className="border-t border-dashed border-line-muted pt-2">
          <h2 className="zine-catalog-heading py-3.5">
            Side Projects — Catalog
          </h2>

          {sideProjects.map((project) => (
            <div
              key={project.name}
              className="grid grid-cols-[64px_54px_minmax(0,1fr)] items-center gap-x-4 gap-y-3 border-b border-dashed border-line-muted py-[22px] md:flex md:flex-wrap md:gap-5 lg:py-9"
            >
              <span className="zine-catalog-heading flex-shrink-0 text-accent">
                {project.catalog}
              </span>
              <img
                src={project.icon}
                alt={`${project.name} app icon`}
                className="h-[54px] w-[54px] flex-shrink-0 rounded-[13px] object-cover lg:h-24 lg:w-24 lg:rounded-[22px]"
              />
              <div className="min-w-[200px] flex-1">
                <h3 className="zine-catalog-title mb-1">
                  {project.name}
                </h3>
                <p className="zine-catalog-body">
                  {project.description}
                </p>
              </div>
              <a
                href={project.href}
                target="_blank"
                rel="noopener noreferrer"
                className="zine-catalog-action col-start-3 w-fit flex-shrink-0 md:col-start-auto"
              >
                App Store →
              </a>
            </div>
          ))}
        </section>
      </article>
    </div>
  );
};

export default About;
