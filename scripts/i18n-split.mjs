/**
 * Separa as traduções em dois pacotes por idioma, para cada tela carregar só o que usa:
 *   - núcleo  (lib/i18n/generated/core.<idioma>.json): textos do app e da landing, sempre carregado;
 *   - painéis (lib/i18n/generated/panels.<idioma>.json): textos usados SÓ no admin e nos anúncios.
 *
 * A fonte da verdade continua sendo lib/i18n/translations/<idioma>.json (um arquivo por idioma).
 * Depois de editar as traduções, rode:  node scripts/i18n-split.mjs
 *
 * Um texto vai para "painéis" apenas se aparece exclusivamente em arquivos de admin/anúncios.
 * Texto usado também no app (ou que não aparece no código) fica no núcleo.
 */
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const LANGS = ['en-US', 'es', 'pt-PT'];
const outDir = path.join(root, 'lib/i18n/generated');

const PANEL_PREFIXES = ['components/admin/', 'components/ads/', 'views/AdminPanel.tsx', 'components/app/workspaces/AdminWorkspace.tsx', 'app/ads/', 'app/admin/'];
const isPanelFile = (rel) => PANEL_PREFIXES.some((prefix) => rel.startsWith(prefix));

const files = [];
const walk = (dir) => {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    if (e.name === 'node_modules' || e.name === '.next') continue;
    const full = path.join(dir, e.name);
    if (e.isDirectory()) walk(full);
    else if (/\.tsx?$/.test(e.name)) files.push(full);
  }
};
['views', 'components', 'app', 'lib'].forEach((d) => fs.existsSync(path.join(root, d)) && walk(path.join(root, d)));

const unescape = (s) => s.replace(/\\'/g, "'").replace(/\\\\/g, '\\');
const hasLetters = (s) => /[A-Za-zÀ-ú]{2,}/.test(s);
const LIST_CONSTANTS = /\bconst\s+[A-Z_]+(?:_TABS|_OPTIONS|_FILTERS|_CATEGORIES|_TYPES)\s*=\s*\[([^\]]*)\]/g;

// texto -> { core: bool, panels: bool }
const usage = new Map();
const mark = (text, panel) => {
  const entry = usage.get(text) ?? { core: false, panels: false };
  if (panel) entry.panels = true;
  else entry.core = true;
  usage.set(text, entry);
};

for (const file of files) {
  const rel = path.relative(root, file).replace(/\\/g, '/');
  const panel = isPanelFile(rel);
  const src = fs.readFileSync(file, 'utf8');
  if (!/\btx\(/.test(src) && !rel.startsWith('lib/')) continue;
  for (const m of src.matchAll(/\btx\('((?:[^'\\]|\\.)*)'\)/g)) mark(unescape(m[1]), panel);
  if (/\btx\(/.test(src)) {
    for (const m of src.matchAll(/\blabel:\s*'((?:[^'\\]|\\.)*)'/g)) if (hasLetters(m[1])) mark(unescape(m[1]), panel);
    for (const m of src.matchAll(LIST_CONSTANTS)) {
      for (const item of m[1].matchAll(/'((?:[^'\\]|\\.)*)'/g)) if (hasLetters(item[1])) mark(unescape(item[1]), panel);
    }
  }
}

fs.mkdirSync(outDir, { recursive: true });
const sortObj = (o) => Object.fromEntries(Object.entries(o).sort(([a], [b]) => a.localeCompare(b, 'pt-BR')));

for (const lang of LANGS) {
  const source = JSON.parse(fs.readFileSync(path.join(root, 'lib/i18n/translations', `${lang}.json`), 'utf8'));
  const core = {};
  const panels = {};
  for (const [text, translation] of Object.entries(source)) {
    const entry = usage.get(text);
    if (entry && entry.panels && !entry.core) panels[text] = translation;
    else core[text] = translation;
  }
  fs.writeFileSync(path.join(outDir, `core.${lang}.json`), JSON.stringify(sortObj(core)) + '\n');
  fs.writeFileSync(path.join(outDir, `panels.${lang}.json`), JSON.stringify(sortObj(panels)) + '\n');
  const size = (o) => Buffer.byteLength(JSON.stringify(o));
  console.log(`${lang.padEnd(6)} núcleo: ${String(Object.keys(core).length).padStart(4)} textos (${Math.round(size(core) / 1024)} KB)  painéis: ${String(Object.keys(panels).length).padStart(4)} textos (${Math.round(size(panels) / 1024)} KB)`);
}
