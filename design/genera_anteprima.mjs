// Genera design/anteprima/: il sito costruito con i contenuti di esempio, in pagine HTML che si aprono
// anche dal disco (link relativi) e che usano tutte un solo foglio di stile, design/anteprima/tema.css.
// È il materiale da dare a Claude Design. Uso: npm run anteprima
import { cpSync, existsSync, mkdtempSync, readdirSync, readFileSync, rmSync, statSync, symlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, relative, dirname, posix } from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const radice = join(dirname(fileURLToPath(import.meta.url)), '..');
// --reali: usa i contenuti veri del sito (simulazione prima della pubblicazione) e scrive in design/simulazione
const reali = process.argv.includes('--reali');
const esempi = join(radice, 'design', 'contenuti-esempio');
const uscita = join(radice, 'design', reali ? 'simulazione' : 'anteprima');
const lavoro = mkdtempSync(join(tmpdir(), 'bordovasca-anteprima-'));

try {
  // 1. Copia del progetto con i contenuti di esempio al posto di quelli veri
  for (const voce of ['astro.config.mjs', 'package.json', 'tsconfig.json', 'src', 'public']) {
    cpSync(join(radice, voce), join(lavoro, voce), { recursive: true });
  }
  symlinkSync(join(radice, 'node_modules'), join(lavoro, 'node_modules'), 'dir');
  if (!reali) {
    rmSync(join(lavoro, 'src', 'content'), { recursive: true, force: true });
    cpSync(join(esempi, 'content'), join(lavoro, 'src', 'content'), { recursive: true });
    cpSync(join(esempi, 'media'), join(lavoro, 'public', 'media'), { recursive: true });
  }

  // 2. Costruzione
  execFileSync(process.execPath, [join(radice, 'node_modules', 'astro', 'bin', 'astro.mjs'), 'build'], { cwd: lavoro, stdio: 'inherit' });

  // 3. Copia in design/anteprima con link relativi (le pagine si aprono con un doppio clic)
  rmSync(uscita, { recursive: true, force: true });
  cpSync(join(lavoro, 'dist'), uscita, { recursive: true });
  for (const file of tutti(uscita).filter((f) => f.endsWith('.html'))) {
    const dir = posix.dirname(relative(uscita, file).split('\\').join('/'));
    const suRadice = dir === '.' ? '' : dir.split('/').map(() => '..').join('/') + '/';
    let html = readFileSync(file, 'utf8');
    html = html.replace(/(href|src)="\/(?!\/)([^"#?]*)(\?[^"#]*)?(#[^"]*)?"/g, (_, attr, perc, _q, hash = '') => {
      let p = perc;
      if (p === '' || p.endsWith('/')) p += 'index.html';
      if (attr === 'href' && p === 'tema.css') return `href="${suRadice}tema.css"`;
      return `${attr}="${suRadice}${p}${hash}"`;
    });
    writeFileSync(file, html);
  }
  for (const f of ['sitemap-index.xml', 'sitemap-0.xml', 'robots.txt']) rmSync(join(uscita, f), { force: true });
  console.log(`\nAnteprima pronta: ${relative(radice, uscita)}/index.html (${tutti(uscita).filter((f) => f.endsWith('.html')).length} pagine)`);
} finally {
  rmSync(lavoro, { recursive: true, force: true });
}

function tutti(cartella) {
  return readdirSync(cartella).flatMap((n) => {
    const p = join(cartella, n);
    return statSync(p).isDirectory() ? tutti(p) : [p];
  });
}
