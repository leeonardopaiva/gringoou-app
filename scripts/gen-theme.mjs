// Gera app/theme.css (paletas clara e escura) a partir dos valores originais do Tailwind.
// Uso: node scripts/gen-theme.mjs
// Para mudar uma cor do tema escuro, edite os mapas abaixo e rode o script de novo.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const tw = fs.readFileSync(path.join(root, 'node_modules/tailwindcss/theme.css'), 'utf8');

const get = (hue, shade) => {
  const match = tw.match(new RegExp(`--color-${hue}-${shade}:\\s*([^;]+);`));
  if (!match) throw new Error(`Cor ausente no Tailwind: ${hue}-${shade}`);
  return match[1].trim();
};

const SHADES = [50, 100, 200, 300, 400, 500, 600, 700, 800, 900, 950];
const HUES = [
  'red', 'rose', 'emerald', 'green', 'amber', 'orange', 'yellow', 'blue', 'sky',
  'indigo', 'violet', 'purple', 'lime', 'teal', 'cyan', 'fuchsia', 'pink',
];

// Claro = valores originais (também usado para reiniciar trechos `.theme-light`, como a landing).
const light = {};
// Escuro = valores remapeados.
const dark = {};

// Neutros (slate). Os valores claros são os do próprio Tailwind.
for (const shade of SHADES) light[`--color-slate-${shade}`] = get('slate', shade);
Object.assign(dark, {
  '--color-slate-50': '#141e28',
  '--color-slate-100': '#1a2733',
  '--color-slate-200': '#263543',
  '--color-slate-300': '#364859',
  '--color-slate-400': '#6a8195',
  '--color-slate-500': '#8da2b5',
  '--color-slate-600': '#a9bac9',
  '--color-slate-700': '#c5d2dd',
  '--color-slate-800': '#dde6ee',
  '--color-slate-900': '#eef3f7',
  '--color-slate-950': '#f7fafc',
});

// Cores de status: fundos suaves (50/100/200) viram tons escuros e textos (700/800/900/950) viram claros.
// Os tons 300 a 600 ficam como estão, para botões e selos sólidos manterem o contraste com texto branco.
const swap = { 50: 950, 100: 900, 200: 800, 700: 300, 800: 200, 900: 100, 950: 50 };
for (const hue of HUES) {
  for (const shade of SHADES) light[`--color-${hue}-${shade}`] = get(hue, shade);
  for (const [to, from] of Object.entries(swap)) dark[`--color-${hue}-${to}`] = get(hue, from);
}

// Marca.
Object.assign(light, {
  '--color-brand-100': '#e6f3ff',
  '--color-brand-200': '#b3dbff',
  '--color-brand-300': '#80c2ff',
  '--color-brand-600': '#006ed4',
  '--color-brand-700': '#0057a8',
  '--color-brand-800': '#003f7a',
  '--color-brand-900': '#00284d',
});
Object.assign(dark, {
  '--color-brand-100': '#0c2a47',
  '--color-brand-200': '#123a63',
  '--color-brand-300': '#1c568f',
  '--color-brand-600': '#4da6ff',
  '--color-brand-700': '#7bbcff',
  '--color-brand-800': '#a3d1ff',
  '--color-brand-900': '#cbe4ff',
});

// Tokens semânticos (declarados no @theme de globals.css e sobrescritos aqui).
Object.assign(light, {
  '--color-text': '#0f2b3d',
  '--color-foreground': '#0f2b3d',
  '--color-bg': '#f9f9f9',
  '--color-surface': '#ffffff',
  '--color-muted-foreground': '#4a7a96',
  '--color-border': '#f3f4f6',
  '--color-input': '#dbe6ec',
  '--color-navy': '#0f2b3d',
  '--color-brand-strong': '#006ed4',
  '--color-brand-strong-hover': '#0057a8',
  '--color-ink': '#132f40',
  '--color-ink-2': '#243b53',
  '--color-ink-3': '#0f2b63',
  '--color-ink-4': '#173247',
  '--color-ink-5': '#4a5672',
  '--color-ink-6': '#6b7a9e',
  '--color-ink-7': '#8a94a8',
  '--color-wash-1': '#f8fafc',
  '--color-wash-2': '#f7f8fb',
  '--color-wash-3': '#f5f7f9',
  '--color-wash-4': '#fbfcfd',
  '--color-wash-5': '#eaf1ff',
  '--color-wash-6': '#e4eaf6',
  '--color-line-soft': '#dde3ef',
});
Object.assign(dark, {
  '--color-text': '#e8eff5',
  '--color-foreground': '#e8eff5',
  '--color-bg': '#0b1117',
  '--color-surface': '#111a23',
  '--color-muted-foreground': '#8fb0c6',
  '--color-border': '#1f2c38',
  '--color-input': '#2c3d4c',
  '--color-navy': '#1b3a52',
  '--color-brand-strong': '#0a6fd0',
  '--color-brand-strong-hover': '#0b5db0',
  '--color-ink': '#e6eef5',
  '--color-ink-2': '#c9d7e3',
  '--color-ink-3': '#d3e2f5',
  '--color-ink-4': '#d9e6f0',
  '--color-ink-5': '#a9b8cb',
  '--color-ink-6': '#8b9ab8',
  '--color-ink-7': '#7f8ba0',
  '--color-wash-1': '#141e28',
  '--color-wash-2': '#131d27',
  '--color-wash-3': '#16212b',
  '--color-wash-4': '#101922',
  '--color-wash-5': '#0f2740',
  '--color-wash-6': '#14283d',
  '--color-line-soft': '#2a3a4a',
});

const block = (selector, vars, first) =>
  `${selector} {\n${first}${Object.entries(vars)
    .map(([name, value]) => `  ${name}: ${value};`)
    .join('\n')}\n}\n`;

const css = `/* Tema claro/escuro do Gringoou.
 *
 * ARQUIVO GERADO por scripts/gen-theme.mjs a partir dos valores originais do Tailwind.
 * Para mudar uma cor, edite o script e rode: node scripts/gen-theme.mjs
 *
 * - O tema claro é o padrão (valores do @theme em globals.css e a paleta do Tailwind).
 * - html[data-theme='dark'] sobrescreve os neutros (slate), os tons da marca e dos status,
 *   e os tokens semânticos (surface, text, border...).
 * - .theme-light força o tema claro em um trecho da página (ex.: a landing, que usa muitas imagens).
 */

${block("html[data-theme='dark']", dark, '  color-scheme: dark;\n')}
${block('.theme-light', light, '  color-scheme: light;\n')}
/* Acentos do app-shell (gradientes, anéis de foco e superfícies suaves). */
html[data-theme='dark'] .app-shell {
  --accent-soft: #0c2a47;
  --accent-soft-border: #123a63;
  --accent-text-soft: rgba(77, 170, 255, 0.85);
  --accent-shadow: rgba(0, 0, 0, 0.45);
}

html[data-theme='dark'] .app-shell[data-persona='professional'] {
  --accent: #1f5a8c;
  --accent-strong: #0f3d66;
  --accent-soft: #0c2236;
  --accent-soft-border: #1a3a57;
  --accent-ring: rgba(120, 180, 235, 0.28);
  --accent-text-soft: rgba(160, 200, 235, 0.85);
  --accent-gradient-start: rgba(31, 90, 140, 0.25);
  --accent-gradient-end: rgba(15, 61, 102, 0.2);
}

html[data-theme='dark'] .glass-card {
  background: rgba(17, 26, 35, 0.92);
}

html[data-theme='dark'] .theme-shadow {
  box-shadow: 0 10px 22px rgba(0, 0, 0, 0.4);
}

/* Logo: a variante escura só é carregada quando o tema escuro está ativo. */
.logo-on-dark {
  display: none;
}

html[data-theme='dark'] .logo-on-light {
  display: none;
}

html[data-theme='dark'] .logo-on-dark {
  display: inline-block;
}

html[data-theme='dark'] .theme-light .logo-on-light {
  display: inline-block;
}

html[data-theme='dark'] .theme-light .logo-on-dark {
  display: none;
}
`;

fs.writeFileSync(path.join(root, 'app/theme.css'), css);
console.log(`app/theme.css gerado (${Object.keys(light).length} claras, ${Object.keys(dark).length} escuras)`);
