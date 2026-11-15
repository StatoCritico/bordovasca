import { defineCollection } from 'astro:content';
import { glob, file } from 'astro/loaders';
import { z } from 'astro/zod';
import { idCategoria } from './lib/slug.js';

// Le date arrivano dall'editor (Pages CMS) o dal worker email come "AAAA-MM-GG".
const data = z.coerce.date();

// La categoria si scrive come nome del file della categoria ("trattamento-acqua")
// oppure come percorso completo ("src/content/categorie/trattamento-acqua.md"),
// che è quello che salva il campo "reference" di Pages CMS, o anche il nome ("Trattamento dell'acqua"):
// qui li riduciamo tutti all'identificativo (il nome del file senza .md).
const categoria = z.string().transform(idCategoria);

const pensieri = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/pensieri' }),
  schema: z.object({
    titolo: z.string(),
    data,
    categoria: categoria.default('varie'),
    bozza: z.boolean().default(false),
    fonte: z.enum(['editor', 'email']).optional(),
  }),
});

const articoli = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/articoli' }),
  schema: z.object({
    titolo: z.string(),
    data,
    sommario: z.string().optional(),
    // categoria (stesse categorie dei pensieri, sempre mostrata; se manca: Varie) e serie facoltativa
    categoria: categoria.default('varie'),
    serie: z.string().optional(),
    immagine: z.string().optional(),
    didascalia: z.string().optional(),
    bozza: z.boolean().default(false),
  }),
});

const categorie = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/categorie' }),
  schema: z.object({
    nome: z.string(),
    descrizione: z.string().optional(),
    ordine: z.number().default(100),
  }),
});

const pagine = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/pagine' }),
  schema: z.object({
    titolo: z.string(),
  }),
});

const impostazioni = defineCollection({
  loader: file('./src/content/impostazioni.json', {
    parser: (testo) => [{ id: 'sito', ...JSON.parse(testo) }],
  }),
  schema: z.object({
    titolo: z.string(),
    sottotitolo: z.string(),
    autore: z.string(),
    presentazione: z.string(),
    email_contatti: z.string().optional(),
  }),
});

export const collections = { pensieri, articoli, categorie, pagine, impostazioni };
