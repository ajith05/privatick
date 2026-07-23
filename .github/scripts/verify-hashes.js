// Checks that every inline <style>/<script> block pinned by a Content-Security-
// Policy hash actually matches the hash listed for it — in the page's own meta
// CSP and in the _headers file the host sends. Because the browser enforces the
// intersection of the meta and header policies, a stale copy in either place
// silently breaks the page on hosts that serve _headers while still working
// locally. This script turns that latent, host-dependent breakage into a loud
// failure. It has no dependencies and is not needed to run the app itself; it
// exists only so CI (and contributors) can catch a desynced or forgotten hash.
//
// Run it from anywhere: `node .github/scripts/verify-hashes.js`.

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

// Resolve everything from the repo root so the script works regardless of the
// current working directory (CI checks out to a different path than a laptop).
const root = path.resolve(__dirname, '..', '..');
const cache = {};
const read = (file) => (cache[file] ??= fs.readFileSync(path.join(root, file), 'utf8'));

// Hash the single inline block for a tag exactly as a browser would: over the
// UTF-8 text content between the tags. HTML comments are stripped first so that
// a literal <style>/<script> mentioned inside a comment is not mistaken for a
// real element (the parser ignores comments too).
function blockHash(source, tag) {
  const bare = read(source).replace(/<!--[\s\S]*?-->/g, '');
  const open = `<${tag}>`;
  const close = `</${tag}>`;
  const count = bare.split(open).length - 1;
  if (count !== 1) {
    throw new Error(`${source}: expected exactly one <${tag}> block, found ${count}`);
  }
  const start = bare.indexOf(open) + open.length;
  const end = bare.indexOf(close, start);
  const digest = crypto.createHash('sha256').update(bare.slice(start, end), 'utf8').digest('base64');
  return `'sha256-${digest}'`;
}

// Each block's freshly computed hash must appear verbatim in every file that
// pins it: the page's own meta CSP, plus the shared _headers CSP.
const checks = [
  { source: 'index.html', tag: 'style', mustAppearIn: ['index.html', '_headers'] },
  { source: 'index.html', tag: 'script', mustAppearIn: ['index.html', '_headers'] },
  { source: '404.html', tag: 'style', mustAppearIn: ['404.html', '_headers'] },
];

let failed = false;
for (const { source, tag, mustAppearIn } of checks) {
  const hash = blockHash(source, tag);
  const missing = mustAppearIn.filter((file) => !read(file).includes(hash));
  if (missing.length) {
    failed = true;
    console.error(`MISMATCH: ${source} <${tag}> hash ${hash} is missing from: ${missing.join(', ')}`);
  } else {
    console.log(`ok: ${source} <${tag}> ${hash}`);
  }
}

if (failed) {
  console.error('\nCSP hash check failed. Recompute the block hash and update every file that pins it.');
  process.exit(1);
}
console.log('\nAll CSP hashes are in sync.');
