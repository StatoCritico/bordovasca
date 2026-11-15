# Bordo Vasca

*Pensieri di un tecnico in controcorrente.* Blog di pensieri e articoli sul mondo delle piscine, ospitato da
[Stato Critico](https://statocritico.it) su **bordovasca.statocritico.it**.

Tutto open source e gratuito:

| Pezzo | Strumento | Dove gira |
|---|---|---|
| Sito | [Astro](https://astro.build) 7, statico | Cloudflare Pages |
| Editor per chi scrive | [Pages CMS](https://pagescms.org) (`.pages.yml`), accesso per email senza account GitHub | app.pagescms.org |
| Pubblicazione per email | Cloudflare Email Worker (`email-worker/`) | Cloudflare Workers + Email Routing |
| Testi e immagini | file Markdown in questo repository | GitHub |

Ogni salvataggio dall'editor o ogni email diventa un commit su `main`; Cloudflare Pages ricostruisce il sito in un paio di
minuti. Niente database, niente server da mantenere, nessun cookie.

## Contenuti

```
src/content/
  pensieri/      testi brevi, uno per file (AAAA-MM-GG-titolo.md), con una categoria
  articoli/      testi lunghi, con sommario e immagine di copertina facoltativi
  categorie/     una scheda per categoria (il nome del file è l'identificativo)
  pagine/        «Chi sono»
  impostazioni.json   nome del blog, sottotitolo, autore, presentazione, email pubblica
public/media/    immagini caricate dall'editor o arrivate per email
```

Intestazione di un pensiero:

```yaml
---
titolo: "Il cloro non è il nemico"
data: 2026-11-15
categoria: src/content/categorie/trattamento-dell-acqua.md   # anche solo trattamento-dell-acqua
bozza: false
---
Testo in Markdown…
```

Le **bozze** (`bozza: true`) non compaiono sul sito pubblicato; si vedono solo in locale con `npm run dev`.

## Aspetto: un solo file, `public/tema.css`

Tutto lo stile sta in **`public/tema.css`**; l'HTML (in `src/layouts`, `src/components`, `src/pages`) non contiene stili.
Per cambiare aspetto si sostituisce quel file, per esempio con quello prodotto da **Claude Design**:

- `design/CONTRATTO_CSS.md` – tutte le classi e la struttura delle pagine, con le regole per un tema nuovo (nessuna
  risorsa esterna, tema scuro, accessibilità, font `woff2` in `public/font/` con percorsi relativi);
- `design/BRIEF_CLAUDE_DESIGN.md` – il testo da dare a Claude Design;
- `npm run anteprima` – costruisce il sito con i contenuti di esempio (`design/contenuti-esempio/`) in
  `design/anteprima/`: pagine che si aprono dal disco e usano tutte `design/anteprima/tema.css`. Si prova un tema
  nuovo copiandolo lì e aprendo `index.html`.

Tema attuale: **Corsia** (Claude Design, 15/11/2026), font Atkinson Hyperlegible e Archivo (SIL OFL) in `public/font/`.
In basso a destra c'è l'interruttore **chiaro/scuro** (yin/yang, `src/components/InterruttoreTema.astro`): l'unico
JavaScript del sito; la scelta resta nel browser del visitatore.

Il link al foglio di stile ha un `?v=` che cambia a ogni pubblicazione, così il tema nuovo si vede subito.

## Pagine

`/` (presentazione, ultimi pensieri e articoli) · `/pensieri/` · `/pensieri/categoria/<id>/` · `/pensieri/<id>/` ·
`/articoli/` · `/articoli/<id>/` · `/chi-sono/` · `/rss.xml` · `/sitemap-index.xml`.

## Pubblicare per email

Chi è autorizzato scrive all'indirizzo (non pubblico) del blog:

- **oggetto** `Categoria - Titolo` (trattino con uno spazio prima e dopo; vanno bene anche – e —). Categorie: Acqua, Aria, Energia,
  Progetti, Manutenzione, Dal bordo, Di famiglia, Varie. Una categoria che non esiste (al massimo 4 parole) viene creata.
  Senza trattino: categoria *Varie*. `BOZZA` all'inizio dell'oggetto salva senza pubblicare;
- **testo** dell'email = testo del pensiero (firme, «Inviato da iPhone» e messaggi citati vengono tolti);
- **foto allegate** (jpg, png, webp, gif; fino a 6, massimo 10 MB l'una) in fondo al pensiero.

Il worker risponde con il link del pensiero. Se qualcosa va storto risponde che il testo non è perso e inoltra l'email a
`INOLTRO_ERRORI`. Dettagli in `email-worker/` e nella guida di messa online.

Sicurezza: indirizzo di ricezione non pubblicato, mittente (busta e intestazione) in `MITTENTI_AUTORIZZATI`, rifiuto se
Cloudflare segnala DMARC/DKIM falliti, token GitHub limitato a questo repository e al solo permesso *Contents*.

## Sviluppo

```bash
npm install
npm run dev        # http://localhost:4321, con le bozze
npm run build      # sito in dist/
npm run anteprima  # pagine di prova per il design in design/anteprima/
cd email-worker && npm install && npm test   # prove del worker email (14)
```

Node 22.23 o successivo (`.node-version`).

## Articoli da Word

`strumenti/word_in_articolo.py` trasforma un `.docx` in articolo: testo in Markdown, titoletti, didascalie, tabelle
incollate da Excel (EMF) convertite in immagini leggibili, foto ridotte a 1600 px.

```bash
python3 strumenti/word_in_articolo.py "materiali/Articolo.docx" --titolo "Titolo" --data 2026-11-15 --sommario "…"
```

Serve pandoc, LibreOffice e ImageMagick (in WSL: `sudo apt install pandoc libreoffice-core imagemagick poppler-utils`).
Il risultato va riletto prima di pubblicare. I Word originali stanno in `materiali/`, fuori da git.

## Licenze

Il **codice** è distribuito con licenza MIT (`LICENSE`). I **testi e le immagini** in `src/content/` e `public/media/`
appartengono a Flavio Bianco: tutti i diritti riservati, salvo diversa indicazione.
