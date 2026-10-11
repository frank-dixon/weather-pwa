#!/usr/bin/env node
/** Minify commented sources in src/js/ to the repo root, which GitHub Pages serves. */
const esbuild = require("esbuild");
const path = require("path");

const root = path.join(__dirname, "..");
const ENTRIES = ["app.js"];

async function buildOne(file) {
  await esbuild.build({
    entryPoints: [path.join(root, "src", "js", file)],
    outfile: path.join(root, file),
    bundle: false,
    minify: true,
    target: ["es2018"],
    legalComments: "none",
    logLevel: "silent",
  });
  console.log("minified", file);
}

module.exports = { buildOne, ENTRIES };

if (require.main === module) {
  Promise.all(ENTRIES.map(buildOne)).catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
