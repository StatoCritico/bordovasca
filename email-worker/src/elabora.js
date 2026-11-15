// Trasforma un'email in un pensiero di Bordo Vasca. Solo funzioni pure: si provano con `npm test`.
import { slug } from '../../src/lib/slug.js';

export { slug };

const PREFISSI_RISPOSTA = /^\s*((re|r|fwd|fw|i|inoltra|rif)\s*:\s*)+/i;
// La categoria si separa dal titolo con un trattino circondato da spazi: «Impianti – La pompa giusta».
// I due punti restano nel titolo («Sfioro: istruzioni per l'uso» è un titolo, non una categoria).
const SEPARATORE = /\s+[-–—]\s+/;

/**
 * Legge l'oggetto dell'email.
 * @param {string} oggetto
 * @param {string[]} categorie identificativi delle categorie esistenti (nomi dei file senza .md)
 * @returns {{ titolo: string, categoria: string, categoriaNuova: string|null, nomeCategoriaNuova: string|null, bozza: boolean }}
 */
export function leggiOggetto(oggetto, categorie) {
  let s = String(oggetto ?? '').replace(PREFISSI_RISPOSTA, '').replace(/\s+/g, ' ').trim();
  let bozza = false;
  const b = s.match(/^\s*\[?\s*bozza\s*\]?\s*[:\-–—]?\s*/i);
  if (b) {
    bozza = true;
    s = s.slice(b[0].length).trim();
  }

  const m = s.match(SEPARATORE);
  if (m && m.index > 0) {
    const prima = s.slice(0, m.index).trim();
    const dopo = s.slice(m.index + m[0].length).trim();
    const trovata = trovaCategoria(prima, categorie);
    if (dopo && trovata) return { titolo: dopo, categoria: trovata, categoriaNuova: null, nomeCategoriaNuova: null, bozza };
    // Categoria che non esiste ancora: la creiamo, purché sia un nome breve (al massimo 4 parole).
    if (dopo && prima.split(' ').length <= 4 && slug(prima)) {
      const id = slug(prima);
      return { titolo: dopo, categoria: id, categoriaNuova: id, nomeCategoriaNuova: maiuscolaIniziale(prima), bozza };
    }
  }
  return { titolo: s || 'Un pensiero', categoria: 'varie', categoriaNuova: null, nomeCategoriaNuova: null, bozza };
}

/** Cerca la categoria scritta nell'oggetto tra quelle esistenti, perdonando articoli e abbreviazioni. */
export function trovaCategoria(scritta, categorie) {
  const s = slug(scritta);
  if (!s) return null;
  if (categorie.includes(s)) return s;
  const parole = s.split('-').filter((p) => p.length > 2);
  // «acqua» → trattamento-dell-acqua; «impianti» → impianti-e-filtrazione; «trattamento acqua» → trattamento-dell-acqua
  const candidate = categorie.filter((c) => {
    const pc = c.split('-');
    return parole.length > 0 && parole.every((p) => pc.some((x) => x === p || x.startsWith(p)));
  });
  return candidate.length === 1 ? candidate[0] : null;
}

const maiuscolaIniziale = (t) => t.charAt(0).toUpperCase() + t.slice(1);

/**
 * Ripulisce il testo dell'email: firme, «Inviato da iPhone», messaggi citati nelle risposte.
 * @param {string} testo
 */
export function pulisciTesto(testo) {
  const righe = String(testo ?? '').replace(/\r\n?/g, '\n').split('\n');
  const fuori = [];
  for (const riga of righe) {
    const r = riga.trimEnd();
    if (r === '--' || r === '-- ') break; // firma standard
    if (/^(il giorno|on) .+(ha scritto|wrote)\s*:\s*$/i.test(r.trim())) break; // inizio della citazione
    if (/^-{2,}\s*(messaggio originale|original message|forwarded message|messaggio inoltrato)/i.test(r.trim())) break;
    if (/^>/.test(r)) continue; // righe citate
    if (/^(inviato|sent) (da|dal|dall'|from|with) /i.test(r.trim()) && r.trim().length < 60) continue;
    fuori.push(r);
  }
  return fuori.join('\n').replace(/\n{3,}/g, '\n\n').trim();
}

/** Da HTML (se l'email non ha la versione solo testo) a testo semplice con i paragrafi. */
export function daHtml(html) {
  return String(html ?? '')
    .replace(/<(style|script|head)[\s\S]*?<\/\1>/gi, '')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/(p|div|li|h\d|blockquote)>/gi, '\n\n')
    .replace(/<li[^>]*>/gi, '- ')
    .replace(/<(b|strong)>([\s\S]*?)<\/\1>/gi, '**$2**')
    .replace(/<(i|em)>([\s\S]*?)<\/\1>/gi, '*$2*')
    .replace(/<a [^>]*href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/gi, '[$2]($1)')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

/** Data di oggi a Roma, AAAA-MM-GG. */
export function oggiRoma(adesso = new Date()) {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Rome', year: 'numeric', month: '2-digit', day: '2-digit' }).format(adesso);
}

/** Nome del file libero: aggiunge -2, -3… se esiste già. */
export function nomeLibero(base, esistenti, estensione = '.md') {
  const set = new Set(esistenti);
  let nome = `${base}${estensione}`;
  for (let i = 2; set.has(nome); i++) nome = `${base}-${i}${estensione}`;
  return nome;
}

const ESTENSIONI = { 'image/jpeg': 'jpg', 'image/jpg': 'jpg', 'image/png': 'png', 'image/webp': 'webp', 'image/gif': 'gif', 'image/heic': 'heic' };
export const MAX_IMMAGINI = 6;
export const MAX_BYTE_IMMAGINE = 10 * 1024 * 1024;
/** Con la riduzione (Cloudflare Images) si accettano foto più grandi e anche le HEIC degli iPhone. */
export const MAX_BYTE_DA_RIDURRE = 20 * 1024 * 1024;
export const LATO_MAX = 1600;

/** Sceglie le immagini allegate da pubblicare (le altre vengono ignorate). */
export function immaginiDaPubblicare(allegati, { riduzione = false } = {}) {
  const max = riduzione ? MAX_BYTE_DA_RIDURRE : MAX_BYTE_IMMAGINE;
  return (allegati ?? [])
    .filter((a) => ESTENSIONI[String(a.mimeType).toLowerCase()] && (riduzione || ESTENSIONI[String(a.mimeType).toLowerCase()] !== 'heic'))
    .filter((a) => dimensione(a.content) > 0 && dimensione(a.content) <= max)
    .slice(0, MAX_IMMAGINI)
    .map((a) => ({ ...a, estensione: ESTENSIONI[String(a.mimeType).toLowerCase()] }));
}

const dimensione = (c) => (typeof c === 'string' ? c.length : c?.byteLength ?? 0);

/**
 * Gmail mette nel testo semplice un segnaposto «[image: NOME.JPG]» dove c'era la foto.
 * Lo sostituiamo con la foto stessa; le foto senza segnaposto vanno in fondo.
 * @param {string} testo
 * @param {{ nome?: string, url: string }[]} immagini
 * @returns {{ testo: string, restanti: { url: string }[] }}
 */
export function collocaImmagini(testo, immagini) {
  const usate = new Set();
  const nuovo = String(testo ?? '').replace(/\[image:\s*([^\]]*)\]/gi, (_, nome) => {
    const n = nome.trim().toLowerCase();
    const i = immagini.findIndex((im, k) => !usate.has(k) && (im.nome ?? '').toLowerCase() === n);
    const k = i >= 0 ? i : immagini.findIndex((_, k2) => !usate.has(k2));
    if (k < 0) return '';
    usate.add(k);
    return `\n\n![](${immagini[k].url})\n\n`;
  });
  return {
    testo: nuovo.replace(/\n{3,}/g, '\n\n').trim(),
    restanti: immagini.filter((_, k) => !usate.has(k)),
  };
}

/** Testo del file del pensiero, con l'intestazione (frontmatter) letta dal sito e dall'editor. */
export function fileDelPensiero({ titolo, data, categoria, bozza, testo, immagini = [] }) {
  const righe = [
    '---',
    `titolo: ${JSON.stringify(titolo)}`,
    `data: ${data}`,
    `categoria: src/content/categorie/${categoria}.md`,
    `bozza: ${bozza ? 'true' : 'false'}`,
    'fonte: email',
    '---',
    '',
    testo.trim(),
  ];
  for (const im of immagini) righe.push('', `![](${im.url})`);
  return righe.join('\n') + '\n';
}

export function fileDellaCategoria({ nome }) {
  return ['---', `nome: ${JSON.stringify(nome)}`, 'descrizione: ""', 'ordine: 500', '---', ''].join('\n');
}

/** Il mittente è autorizzato? `elenco` è separato da virgole; confronto senza maiuscole. */
export function mittenteAutorizzato(mittente, elenco) {
  const m = String(mittente ?? '').trim().toLowerCase();
  return Boolean(m) && String(elenco ?? '').split(',').map((x) => x.trim().toLowerCase()).filter(Boolean).includes(m);
}

/**
 * Se Cloudflare ha aggiunto i risultati dei controlli (SPF/DKIM/DMARC), un «fail» blocca il messaggio.
 * Se l'intestazione manca non si blocca: la protezione principale è l'indirizzo segreto più il mittente.
 */
export function autenticazioneFallita(intestazione) {
  const h = String(intestazione ?? '').toLowerCase();
  return /\bdmarc=fail\b/.test(h) || (/\bdkim=fail\b/.test(h) && !/\bdkim=pass\b/.test(h));
}
