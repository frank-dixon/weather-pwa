#!/usr/bin/env node
/** Re-minify a src/js file every time it is saved. */
const chokidar = require("chokidar");
const path = require("path");
const { buildOne, ENTRIES } = require("./build-js");

const srcDir = path.join(__dirname, "..", "src", "js");
ENTRIES.forEach((f) => buildOne(f).catch((e) => console.error(e.message)));
chokidar.watch(srcDir, { ignoreInitial: true }).on("all", (_evt, file) => {
  const name = path.basename(file);
  if (ENTRIES.includes(name)) buildOne(name).catch((e) => console.error(e.message));
});
console.log("watching src/js ...");
