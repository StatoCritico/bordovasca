import { getCollection, getEntry, type CollectionEntry } from 'astro:content';

/** Categoria con una voce propria nel menu e fuori dalla pagina iniziale. */
export const CATEGORIA_FAMIGLIA = 'di-famiglia';

// Le bozze si vedono solo in anteprima sul computer (npm run dev), mai sul sito pubblicato.
const mostraBozze = import.meta.env.DEV;

const perData = <T extends { data: { data: Date } }>(a: T, b: T) =>
  b.data.data.getTime() - a.data.data.getTime();

export async function pensieri() {
  const tutti = await getCollection('pensieri', ({ data }) => mostraBozze || !data.bozza);
  return tutti.sort(perData);
}

export async function articoli() {
  const tutti = await getCollection('articoli', ({ data }) => mostraBozze || !data.bozza);
  return tutti.sort(perData);
}

export async function categorie() {
  const tutte = await getCollection('categorie');
  return tutte.sort((a, b) => a.data.ordine - b.data.ordine || a.data.nome.localeCompare(b.data.nome, 'it'));
}

/** Categorie con almeno un pensiero pubblicato, con il conteggio. */
export async function categorieUsate() {
  const [cats, ps] = await Promise.all([categorie(), pensieri()]);
  const usate = cats
    .map((c) => ({ id: c.id, data: c.data, conteggio: ps.filter((p) => p.data.categoria === c.id).length }))
    .filter((c) => c.conteggio > 0);
  // Pensieri con una categoria che non ha ancora il suo file: la mostriamo lo stesso, in fondo.
  const note = new Set(cats.map((c) => c.id));
  for (const id of new Set(ps.map((p) => p.data.categoria))) {
    if (note.has(id)) continue;
    const nome = id.charAt(0).toUpperCase() + id.slice(1).replace(/-/g, ' ');
    usate.push({ id, data: { nome, descrizione: undefined, ordine: 1000 }, conteggio: ps.filter((p) => p.data.categoria === id).length });
  }
  return usate;
}

/** Categorie con almeno un articolo pubblicato, con il conteggio. */
export async function categorieArticoli() {
  const [cats, as] = await Promise.all([categorie(), articoli()]);
  const ids = new Set(as.map((a) => a.data.categoria));
  const elenco = cats.filter((c) => ids.has(c.id)).map((c) => ({ id: c.id, data: c.data, conteggio: 0 }));
  for (const id of ids) {
    if (!elenco.some((c) => c.id === id)) {
      elenco.push({ id, data: { nome: id.charAt(0).toUpperCase() + id.slice(1).replace(/-/g, ' '), descrizione: undefined, ordine: 1000 }, conteggio: 0 });
    }
  }
  for (const c of elenco) c.conteggio = as.filter((a) => a.data.categoria === c.id).length;
  return elenco;
}

export async function nomeCategoria(id: string) {
  const c = await getEntry('categorie', id);
  return c?.data.nome ?? id.replace(/-/g, ' ');
}

export async function impostazioni() {
  const s = await getEntry('impostazioni', 'sito');
  if (!s) throw new Error('Manca src/content/impostazioni.json');
  return s.data;
}

const formatoData = new Intl.DateTimeFormat('it-IT', { day: 'numeric', month: 'long', year: 'numeric' });
export const dataEstesa = (d: Date) => formatoData.format(d);
export const dataIso = (d: Date) => d.toISOString().slice(0, 10);

/** Minuti di lettura (circa 200 parole al minuto). */
export function minutiLettura(testo = '') {
  const parole = testo.replace(/[#*_>`\[\]()!-]/g, ' ').split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.round(parole / 200));
}

/** Prima immagine del testo (Markdown ![](...) o HTML <img>), per la miniatura negli elenchi. */
export function primaImmagine(testo = ''): string | undefined {
  const md = testo.match(/!\[[^\]]*\]\(\s*([^)\s]+)/);
  if (md) return md[1];
  const html = testo.match(/<img[^>]+src="([^"]+)"/i);
  return html?.[1];
}

/** Prime righe del testo, senza formattazione, per anteprime e descrizioni. */
export function estratto(testo = '', lunghezza = 180) {
  const pulito = testo
    .replace(/!\[[^\]]*\]\([^)]*\)/g, '')
    .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/\[image: [^\]]*\]/gi, '')
    .replace(/<[^>]+>/g, '')
    .replace(/[#*_>`]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
  if (pulito.length <= lunghezza) return pulito;
  return pulito.slice(0, pulito.lastIndexOf(' ', lunghezza)) + '…';
}

export type Pensiero = CollectionEntry<'pensieri'>;
export type Articolo = CollectionEntry<'articoli'>;
