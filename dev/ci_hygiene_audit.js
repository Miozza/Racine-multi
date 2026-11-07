#!/usr/bin/env node
'use strict';
// Read-only repository hygiene audit. Does not read local user profiles.
const fs = require('node:fs');
const cp = require('node:child_process');
const errors = [];
const warnings = [];
const tracked = cp.execFileSync('git', ['ls-files', '-z'], {encoding:'utf8'}).split('\0').filter(Boolean);
for (const path of tracked) {
  if (/(^|\/)(\.env(?:\..+)?|id_rsa|id_ed25519|[^/]+\.(?:pem|p12|pfx))$/i.test(path) &&
      !/\.example$|\.sample$/i.test(path)) errors.push('Potential secret file tracked: ' + path);
  if (/^data\/.*\.json$/i.test(path)) {
    const raw = fs.readFileSync(path, 'utf8');
    if (raw.length > 100000) warnings.push('Review unusually large data JSON: ' + path);
  }
}
const read = p => fs.readFileSync(p,'utf8');
const readme = read('README.md').match(/Version\s*:\s*`?(V\d+\.\d+(?:\.\d+)?)/i);
const pkg = JSON.parse(read('package.json'));
if (!readme) warnings.push('README version not found');
if (readme && pkg.description && /V\d+\.\d+(?:\.\d+)?/.test(pkg.description) &&
    !pkg.description.includes(readme[1])) warnings.push('package.json description version differs from README: ' + pkg.description + ' vs ' + readme[1]);
for (const line of warnings) console.log('::warning::' + line);
for (const line of errors) console.log('::error::' + line);
console.log('Audit: ' + tracked.length + ' tracked files, ' + warnings.length + ' warnings, ' + errors.length + ' errors');
if (errors.length) process.exitCode = 1;
