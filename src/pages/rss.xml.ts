import rss from '@astrojs/rss';
import type { APIContext } from 'astro';
import { pensieri, articoli, impostazioni, estratto, nomeCategoria } from '../lib/contenuti';

export async function GET(context: APIContext) {
  const sito = await impostazioni();
  const ps = await pensieri();
  const as = await articoli();
  const voci = [
    ...(await Promise.all(
      ps.map(async (p) => ({
        title: p.data.titolo,
        pubDate: p.data.data,
        description: estratto(p.body, 300),
        link: `/pensieri/${p.id}/`,
        categories: ['Pensieri', await nomeCategoria(p.data.categoria)],
      })),
    )),
    ...(await Promise.all(
      as.map(async (a) => ({
        title: a.data.titolo,
        pubDate: a.data.data,
        description: a.data.sommario || estratto(a.body, 300),
        link: `/articoli/${a.id}/`,
        categories: ['Articoli', await nomeCategoria(a.data.categoria)],
      })),
    )),
  ].sort((x, y) => y.pubDate.getTime() - x.pubDate.getTime());

  return rss({
    title: sito.titolo,
    description: sito.sottotitolo,
    site: context.site!,
    items: voci.slice(0, 50),
    customData: '<language>it-it</language>',
  });
}
