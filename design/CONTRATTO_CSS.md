# Contratto tra l'HTML e il tema (tema.css)

Il sito ha **un solo foglio di stile**, `public/tema.css`. L'HTML lo genera Astro e **non cambia** quando si cambia il
tema: un nuovo aspetto si ottiene sostituendo il file. Questo documento elenca tutto quello che il tema può (e deve)
vestire. Le pagine di prova sono in `design/anteprima/` (`npm run anteprima` le rigenera).

## Regole per un nuovo tema

1. **Un file**, `tema.css`. Niente `@import` o font da server esterni (Google Fonts, CDN): il sito promette nessun
   tracciamento. Font propri in formato `woff2` nella cartella `font/` accanto al file, con percorsi **relativi**:
   `src: url("font/nome.woff2")` (vale sia per il sito, dove diventa `/font/…`, sia per l'anteprima).
2. Immagini decorative: dentro il CSS come `data:` URI (SVG), oppure file in `font/` o `img/` con percorsi relativi.
3. Nessun JavaScript nel tema. Il sito ne ha uno solo, l'interruttore chiaro/scuro (vedi sotto), che funziona con
   qualsiasi tema purché il tema scuro stia in regole `@media (prefers-color-scheme: dark)`.
4. **Tema scuro**: va mantenuto `@media (prefers-color-scheme: dark)`.
5. **Leggibilità**: testo principale almeno 17–18 px, contrasto WCAG AA (4,5:1), righe di 60–75 caratteri.
   Chi scrive ha una certa età e così buona parte dei lettori.
6. Il **focus** da tastiera (`:focus-visible`) deve restare visibile; `.salta` visibile solo quando ha il focus.
7. Tenere le regole di stampa (`@media print`).
8. Si possono usare `body[data-pagina="…"]` per dare un aspetto diverso a una pagina.

## Struttura di ogni pagina

```html
<body data-pagina="home | pensieri | categoria | pensiero | articoli | articolo | famiglia | pagina | errore">
  <a class="salta" href="#contenuto">Vai al contenuto</a>
  <header class="testata">
    <div class="contenitore">
      <a class="marchio" href="/">
        <span class="nome"><svg class="logo">…<rect class="logo-vasca"/><path class="logo-onda"/></svg><span class="nome-testo">Bordo Vasca</span></span>
        <span class="motto">Pensieri di un tecnico in controcorrente</span>
      </a>
      <nav class="menu"><a aria-current="page">Pensieri</a><a>Articoli</a><a>Di famiglia</a><a>Chi sono</a><button class="interruttore-tema">…</button></nav>
    </div>
  </header>
  <div class="onda"></div>                    <!-- vuoto: decorazione disegnata dal CSS (si può nascondere) -->
  <main id="contenuto" class="principale">
    <div class="contenitore"> … contenuto della pagina … </div>
  </main>
  <footer class="piede"><div class="contenitore"><p>…</p><p>…</p></div></footer>
</body>
```

## Contenuto per tipo di pagina

**Home** (`data-pagina="home"`)
```html
<p class="presentazione">…</p>
<section class="sezione sezione-pensieri">
  <h2 class="etichetta">Ultimi pensieri</h2>
  <div class="elenco elenco-pensieri"> VOCE-PENSIERO × 5 </div>
  <a class="altro">Tutti i pensieri</a>          <!-- la freccia la aggiunge il CSS (::after) -->
</section>
<section class="sezione sezione-articoli">
  <h2 class="etichetta">Articoli</h2>
  <div class="elenco elenco-articoli"> VOCE-ARTICOLO × 3 </div>
  <a class="altro">Tutti gli articoli</a>
</section>
```
Se non c'è nulla, al posto dell'elenco: `<p class="vuoto">…</p>`.

**Elenco pensieri** (`pensieri`) e **categoria** (`categoria`)
```html
<header class="intestazione">
  <p class="sopratitolo"><a>Pensieri</a></p>   <!-- solo nella pagina di categoria -->
  <h1>…</h1>
  <p class="intro">…</p>
</header>
<nav class="categorie"><ul class="chips">
  <li><a class="chip" aria-current="page">Tutti</a></li>
  <li><a class="chip">Impianti e filtrazione <span class="conteggio">3</span></a></li>   <!-- parentesi dal CSS -->
</ul></nav>
<div class="elenco elenco-pensieri"> VOCE-PENSIERO … </div>
```

**Elenco articoli** (`articoli`): `header.intestazione` (h1, `.intro`) + `div.elenco.elenco-articoli`.

**VOCE-PENSIERO**
```html
<article class="voce voce-pensiero">
  <p class="meta"><time>14 novembre 2026</time><a class="chip">Trattamento dell'acqua</a><span class="bozza">bozza</span></p>
  <h3 class="voce-titolo"><a>Il cloro non è il nemico</a></h3>
  <p class="voce-estratto">Prime righe del testo…</p>
</article>
```

**VOCE-ARTICOLO** (classe `con-immagine` se c'è la copertina)
```html
<article class="voce voce-articolo con-immagine">
  <img class="voce-immagine">                       <!-- solo se c'è la copertina -->
  <p class="meta"><time>…</time><span class="lettura">4 min di lettura</span></p>
  <h3 class="voce-titolo"><a>…</a></h3>
  <p class="voce-estratto">Sommario…</p>
</article>
```

**Pensiero** (`pensiero`), **articolo** (`articolo`), **Chi sono** (`pagina`)
```html
<article class="scheda scheda-pensiero | scheda-articolo | scheda-pagina">
  <header class="intestazione">
    <p class="meta"><time>…</time><a class="chip">…</a> | <span class="autore">…</span><span class="lettura">…</span></p>
    <h1>…</h1>
    <p class="sommario">…</p>                         <!-- solo articoli, se presente -->
  </header>
  <figure class="copertina"><img><figcaption>…</figcaption></figure>   <!-- solo articoli, se presente -->
  <div class="testo"> h2, h3, p, strong, em, a, ul, ol, li, blockquote, table, th, td, img, figure, hr, code </div>
</article>
<nav class="navigazione">
  <a class="prec"><span class="dir">Precedente</span> Titolo</a>   <!-- oppure <span class="prec"></span> vuoto -->
  <a class="succ"><span class="dir">Successivo</span> Titolo</a>
</nav>
```
Nella riga `.meta` i separatori «·» li mette il CSS: un nuovo tema può toglierli o cambiarli.

**Di famiglia** (`famiglia`): `header.intestazione` (h1, `.intro`), poi una `section.sezione.sezione-articoli` e una
`section.sezione.sezione-pensieri` come in home (solo quelle non vuote).

**Errore 404** (`errore`): `header.intestazione` con h1 e `.intro`.

## Interruttore chiaro/scuro (15/11/2026)

Ultimo elemento di `nav.menu`, dopo «Chi sono»: `<button class="interruttore-tema">` con un SVG yin/yang
(`.yy-chiaro`, `.yy-scuro`, `.yy-bordo`), piccolo (1,6 rem). La sua posizione sui telefoni la decide tema.css. Ha già uno stile di base a specificità zero (`:where`), con i colori presi da
`--carta`, `--inchiostro`, `--linea`: un tema può ridisegnarlo senza `!important`. Lo script accende o spegne le regole
`@media (prefers-color-scheme: dark)` di tema.css e mette `data-tema="chiaro|scuro"` su `<html>`; la scelta resta nel
browser del visitatore.

## Stati
- `.bozza`: etichetta che si vede solo in anteprima locale (mai sul sito pubblicato).
- `aria-current="page"`: voce di menu attiva e categoria selezionata.
- `.vuoto`: messaggio quando non c'è ancora nulla.

## Variabili del tema attuale
Il tema attuale definisce in `:root` colori (`--carta`, `--carta-2`, `--inchiostro`, `--tenue`, `--acqua`,
`--acqua-chiara`, `--linea`, `--evidenza`), caratteri (`--testo-font`, `--titoli-font`, `--ui-font`) e misure
(`--base`, `--colonna`, `--spazio`, `--raggio`). Un tema nuovo può usarne altre: nessun file fuori da tema.css le legge.

## Fuori dal tema
`public/favicon.svg` (icona della scheda del browser) è un file a parte: se il nuovo logo cambia, va rifatta anche lei.
