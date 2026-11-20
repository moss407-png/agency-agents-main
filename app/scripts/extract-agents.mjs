// Reads agent markdown files from an agency-agents checkout and writes
// src/data/agents.json for the app.
// Usage: node scripts/extract-agents.mjs <path-to-agency-agents-repo>
import fs from 'node:fs';
import path from 'node:path';
import * as yaml from 'js-yaml';

const repo = process.argv[2];
if (!repo) {
  console.error('Usage: node scripts/extract-agents.mjs <path-to-agency-agents-repo>');
  process.exit(1);
}

const divisionsFile = JSON.parse(fs.readFileSync(path.join(repo, 'divisions.json'), 'utf8'));
const divisions = divisionsFile.divisions;

// Strip stray control characters (a few source files contain mangled emoji).
const clean = (s) => s.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, '');

function walk(dir) {
  const out = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...walk(p));
    else if (entry.name.endsWith('.md') && !/^README/i.test(entry.name)) out.push(p);
  }
  return out;
}

const agents = [];
const seen = new Set();
for (const division of Object.keys(divisions)) {
  const dir = path.join(repo, division);
  if (!fs.existsSync(dir)) continue;
  for (const file of walk(dir)) {
    const raw = clean(fs.readFileSync(file, 'utf8'));
    const m = raw.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/);
    if (!m) continue; // not an agent file
    let fm;
    try {
      fm = yaml.load(m[1]) ?? {};
    } catch {
      continue;
    }
    if (!fm.name) continue;
    let id = path.basename(file, '.md');
    while (seen.has(id)) id += '-2';
    seen.add(id);
    agents.push({
      id,
      division,
      name: String(fm.name).trim(),
      description: String(fm.description ?? '').trim(),
      emoji: fm.emoji ? String(fm.emoji) : '',
      vibe: fm.vibe ? String(fm.vibe).trim() : '',
      color: fm.color ? String(fm.color) : '',
      path: path.relative(repo, file),
      body: m[2].trim(),
    });
  }
}

agents.sort((a, b) => a.name.localeCompare(b.name));
const divisionList = Object.entries(divisions)
  .map(([id, d]) => ({ id, label: d.label, color: d.color, count: agents.filter((a) => a.division === id).length }))
  .filter((d) => d.count > 0);

const outDir = path.join(path.dirname(new URL(import.meta.url).pathname), '..', 'src', 'data');
fs.mkdirSync(outDir, { recursive: true });
fs.writeFileSync(path.join(outDir, 'agents.json'), JSON.stringify({ divisions: divisionList, agents }));
console.log(`Wrote ${agents.length} agents across ${divisionList.length} divisions`);
