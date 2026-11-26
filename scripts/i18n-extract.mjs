/**
 * Lista os textos do app que passam por tx('...') e mostra o que ainda falta traduzir em cada idioma.
 *
 * Uso (na raiz do projeto):
 *   node scripts/i18n-extract.mjs                    # resumo de cobertura por idioma
 *   node scripts/i18n-extract.mjs --missing en-US    # lista, em JSON, os textos sem tradução em inglês
 *
 * Como funciona: o app escreve os textos em português do Brasil dentro de tx('Texto'). Cada idioma tem
 * um arquivo lib/i18n/translations/<idioma>.json com { "Texto": "Translation" }. Texto sem tradução
 * aparece em português (nada some da tela).
 *
 * Além dos tx('...') diretos, entram os rótulos de listas (label: 'Texto') nos arquivos que exibem
 * rótulos com tx(item.label), porque esses textos são traduzidos só na hora de exibir.
 */
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const LANGS = ['en-US', 'es', 'pt-PT'];

const files = [];
const walk = (dir) => {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    if (e.name === 'node_modules' || e.name === '.next') continue;
    const full = path.join(dir, e.name);
    if (e.isDirectory()) walk(full);
    else if (/\.tsx?$/.test(e.name)) files.push(full);
  }
};
['views', 'components', 'app'].forEach((d) => fs.existsSync(path.join(root, d)) && walk(path.join(root, d)));

const unescape = (s) => s.replace(/\\'/g, "'").replace(/\\\\/g, '\\');
const hasLetters = (s) => /[A-Za-zÀ-ú]{2,}/.test(s);

// Listas de texto fora dos componentes cujos itens são exibidos com tx(...).
const LIST_CONSTANTS = /\bconst\s+[A-Z_]+(?:_TABS|_OPTIONS|_FILTERS|_CATEGORIES|_TYPES)\s*=\s*\[([^\]]*)\]/g;

const keys = new Set();
for (const file of files) {
  const src = fs.readFileSync(file, 'utf8');
  if (!/\btx\(/.test(src)) continue;
  for (const m of src.matchAll(/\btx\('((?:[^'\\]|\\.)*)'\)/g)) keys.add(unescape(m[1]));
  for (const m of src.matchAll(/\blabel:\s*'((?:[^'\\]|\\.)*)'/g)) if (hasLetters(m[1])) keys.add(unescape(m[1]));
  for (const m of src.matchAll(LIST_CONSTANTS)) {
    for (const item of m[1].matchAll(/'((?:[^'\\]|\\.)*)'/g)) if (hasLetters(item[1])) keys.add(unescape(item[1]));
  }
}
const catalog = [...keys].sort((a, b) => a.localeCompare(b, 'pt-BR'));

const load = (lang) => {
  const file = path.join(root, 'lib/i18n/translations', `${lang}.json`);
  return fs.existsSync(file) ? JSON.parse(fs.readFileSync(file, 'utf8')) : {};
};

const missingArg = process.argv.indexOf('--missing');
if (missingArg >= 0) {
  const lang = process.argv[missingArg + 1];
  const dict = load(lang);
  console.log(JSON.stringify(catalog.filter((text) => !(text in dict)), null, 1));
} else {
  console.log(`Textos no app: ${catalog.length}`);
  for (const lang of LANGS) {
    const dict = load(lang);
    const done = catalog.filter((text) => text in dict).length;
    // pt-PT só precisa das diferenças em relação ao português do Brasil.
    const note = lang === 'pt-PT' ? ' (só as diferenças em relação ao pt-BR)' : '';
    console.log(`${lang.padEnd(6)} ${String(done).padStart(5)} / ${catalog.length}  (${Math.round((done / catalog.length) * 100)}%)${note}`);
  }
}
