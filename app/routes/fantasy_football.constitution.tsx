import { json } from "@remix-run/node";
import type { LoaderFunctionArgs, MetaFunction } from "@remix-run/node";
import type { Components } from "react-markdown";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

import { FantasyMain } from "~/components/FantasyFootballUI";
import { constitutionMarkdown } from "~/content/constitution";
import { requireFantasyMember } from "~/utils/fantasy-auth.server";

export const meta: MetaFunction = () => [
  { title: "League Constitution | Fantasy Football" },
];

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { headers } = await requireFantasyMember(request);
  return json(null, { headers });
};

const markdownComponents: Components = {
  h1: ({ node, ...props }) => (
    <h1
      className="mb-8 border-b-[1.5px] border-line pb-4 font-display text-[clamp(28px,4.5vw,40px)] leading-tight text-ink"
      {...props}
    />
  ),
  h2: ({ node, ...props }) => (
    <h2
      className="mb-4 mt-12 border-b border-dashed border-line-muted pb-2 font-display text-2xl leading-tight text-ink first:mt-0"
      {...props}
    />
  ),
  h3: ({ node, ...props }) => (
    <h3
      className="mb-3 mt-8 font-mono text-[13px] font-semibold uppercase tracking-[0.08em] text-accent"
      {...props}
    />
  ),
  h4: ({ node, ...props }) => (
    <h4
      className="mb-3 mt-6 font-mono text-xs font-semibold uppercase tracking-[0.08em] text-zinc-500 dark:text-zinc-400"
      {...props}
    />
  ),
  p: ({ node, ...props }) => (
    <p className="mb-4 text-[15px] leading-[1.7] text-ink" {...props} />
  ),
  ul: ({ node, ...props }) => (
    <ul
      className="mb-4 list-disc space-y-1.5 pl-5 text-[15px] leading-[1.6] text-ink marker:text-accent"
      {...props}
    />
  ),
  ol: ({ node, ...props }) => (
    <ol
      className="mb-4 list-decimal space-y-1.5 pl-5 text-[15px] leading-[1.6] text-ink marker:text-accent"
      {...props}
    />
  ),
  li: ({ node, ...props }) => <li className="pl-1" {...props} />,
  a: ({ node, ...props }) => (
    <a
      className="font-medium text-accent underline decoration-dotted underline-offset-2 hover:decoration-solid"
      target="_blank"
      rel="noreferrer"
      {...props}
    />
  ),
  strong: ({ node, ...props }) => (
    <strong className="font-semibold text-ink" {...props} />
  ),
  table: ({ node, ...props }) => (
    <div className="mb-4 overflow-x-auto">
      <table className="w-full border-collapse text-center" {...props} />
    </div>
  ),
  thead: ({ node, ...props }) => (
    <thead
      className="border-b-[1.5px] border-line font-mono text-[11px] font-semibold uppercase tracking-[0.06em] text-zinc-500 dark:border-zinc-500 dark:text-zinc-400"
      {...props}
    />
  ),
  tbody: ({ node, ...props }) => (
    <tbody className="divide-y divide-dashed divide-line-muted" {...props} />
  ),
  th: ({ node, ...props }) => (
    <th className="whitespace-nowrap px-3 py-2" {...props} />
  ),
  td: ({ node, ...props }) => (
    <td className="whitespace-nowrap px-3 py-2 font-mono text-sm text-ink" {...props} />
  ),
};

export default function Constitution() {
  return (
    <FantasyMain>
      <article className="mx-auto max-w-[760px]">
        <ReactMarkdown remarkPlugins={[remarkGfm]} components={markdownComponents}>
          {constitutionMarkdown}
        </ReactMarkdown>
      </article>
    </FantasyMain>
  );
}
