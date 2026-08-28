/** @type {import('@remix-run/dev').AppConfig} */
module.exports = {
  serverBuildTarget: "vercel",
  // When running locally in development mode, we use the built in remix
  // server. This does not understand the vercel lambda module format,
  // so we default back to the standard build output.
  server: process.env.NODE_ENV === "development" ? undefined : "./server.js",
  ignoredRouteFiles: ["**/.*"],
  // appDirectory: "app",
  // assetsBuildDirectory: "public/build",
  // serverBuildPath: "api/index.js",
  // publicPath: "/build/"
  serverModuleFormat: "cjs",
  // react-markdown and the unified/remark ecosystem it sits on are ESM-only;
  // bundle them into the CJS server build instead of require()-ing them.
  serverDependenciesToBundle: [
    // vfile's internal package-relative "#..." subpath imports look like bare
    // module ids to the compiler, so they must be listed to be bundled too.
    /^#min(path|proc|url)$/,
    /^react-markdown$/,
    /^remark-/,
    /^rehype-/,
    /^micromark/,
    /^mdast-/,
    /^unist-/,
    /^unified$/,
    /^hast-/,
    /^vfile/,
    /^bail$/,
    /^trough$/,
    /^zwitch$/,
    /^ccount$/,
    /^devlop$/,
    /^is-plain-obj$/,
    /^longest-streak$/,
    /^markdown-table$/,
    /^property-information$/,
    /^html-url-attributes$/,
    /^space-separated-tokens$/,
    /^comma-separated-tokens$/,
    /^character-entities/,
    /^decode-named-character-reference$/,
    /^escape-string-regexp$/,
    /^trim-lines$/,
    /^estree-util-is-identifier-name$/,
    /^style-to-object$/,
    /^inline-style-parser$/,
    /^@ungap\/structured-clone$/,
  ]
};
