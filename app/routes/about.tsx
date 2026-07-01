const sideProjects = [
  {
    name: "Spritz",
    description:
      "An iOS cocktail companion for tracking a home bar, matching available recipes, and getting unstuck with an AI mixologist.",
    href: "https://apps.apple.com/us/search?term=Spritz%20Austin%20Zani",
  },
  {
    name: "Tides",
    description:
      "A daily reflection app for noticing emotional rhythms through simple, intentional check-ins.",
    href: "https://apps.apple.com/us/search?term=Tides%20Journal%20Austin%20Zani",
  },
];

const teams = [
  "Celtics",
  "Bengals",
  "Bearcats",
  "UT Vols",
  "FC Cincinnati",
  "Reds",
  "Newcastle United",
];

const About = () => {
  return (
    <div className="flex w-full justify-center px-4 py-12">
      <article className="grid w-full max-w-5xl gap-8 lg:grid-cols-[0.75fr_1fr]">
        <aside className="h-fit border-2 border-dashed border-line bg-accent-soft p-6">
          <p className="font-mono text-xs font-semibold uppercase tracking-wide text-accent">
            About
          </p>
          <h1 className="mt-4 font-display text-6xl italic leading-none md:text-7xl">
            Hello, I&apos;m Austin Zani.
          </h1>
          <p className="mt-6 text-lg leading-relaxed text-ink-muted">
            Software developer in Cincinnati, husband to Cath, and dad to
            Anderson, Quinn, and Callan.
          </p>
        </aside>

        <div className="space-y-6">
          <section className="border-2 border-dashed border-line bg-surface p-6">
            <h2 className="font-mono text-sm font-semibold uppercase tracking-wide text-accent">
              Life
            </h2>
            <div className="mt-4 space-y-4 text-lg leading-relaxed text-ink-muted">
              <p>
                I&apos;m a software developer based in Cincinnati, Ohio. I care
                about building useful products with clear interfaces, durable
                systems, and enough personality to feel made by a person.
              </p>
              <p>
                Music is a big part of my life. I love discovering new artists,
                going to concerts, and collecting vinyl.
              </p>
            </div>
          </section>

          <section className="border-2 border-dashed border-line bg-surface p-6">
            <h2 className="font-mono text-sm font-semibold uppercase tracking-wide text-accent">
              Teams
            </h2>
            <div className="mt-4 flex flex-wrap gap-2">
              {teams.map((team) => (
                <span
                  key={team}
                  className="rounded-full border border-dashed border-line-muted bg-paper-muted px-3 py-1 font-mono text-xs uppercase tracking-wide text-ink"
                >
                  {team}
                </span>
              ))}
            </div>
          </section>

          <section className="border-2 border-dashed border-line bg-surface p-6">
            <h2 className="font-mono text-sm font-semibold uppercase tracking-wide text-accent">
              Work
            </h2>
            <div className="mt-4 space-y-4 text-lg leading-relaxed text-ink-muted">
              <p>
                I completed Tech Elevator in 2020 and have worked across
                JavaScript, TypeScript, React, Python, AWS, Swift, and SwiftUI.
              </p>
              <p>
                I currently work as a Developer at Pay Theory, building payment
                tools that help platforms support more inclusive ways to pay.
              </p>
            </div>
          </section>

          <section className="border-2 border-dashed border-line bg-surface p-6">
            <h2 className="font-mono text-sm font-semibold uppercase tracking-wide text-accent">
              Side Projects
            </h2>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              {sideProjects.map((project) => (
                <a
                  key={project.name}
                  href={project.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group block border border-dashed border-line-muted bg-paper p-4 transition hover:border-accent hover:bg-accent-soft"
                >
                  <h3 className="font-display text-3xl italic text-ink">
                    {project.name}
                  </h3>
                  <p className="mt-2 text-sm leading-relaxed text-ink-muted">
                    {project.description}
                  </p>
                  <p className="mt-4 font-mono text-xs font-semibold uppercase tracking-wide text-accent">
                    App Store
                  </p>
                </a>
              ))}
            </div>
          </section>
        </div>
      </article>
    </div>
  );
};

export default About;
