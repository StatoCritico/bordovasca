// Usato sia dal sito sia dal worker email: deve dare lo stesso risultato di Pages CMS
// per i nomi dei file ("Trattamento dell'acqua" → "trattamento-dell-acqua").
export function slug(testo = '') {
  return String(testo)
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80)
    .replace(/-+$/g, '');
}

/** Riduce il valore del campo categoria (nome file, percorso o nome) all'identificativo della categoria. */
export function idCategoria(valore = '') {
  const ultimo = String(valore).trim().split('/').pop() ?? '';
  return slug(ultimo.replace(/\.md$/i, '')) || 'varie';
}
