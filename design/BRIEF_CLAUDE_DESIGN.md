# Brief per Claude Design – tema di Bordo Vasca

Come usarlo: apri Claude Design, carica la cartella `anteprima` (o lo zip `bordovasca_per_claude_design.zip`) e
`CONTRATTO_CSS.md`, poi incolla il testo qui sotto. Quando il design ti piace, chiedi il file `tema.css` finale (più
eventuali font `woff2`) e mettili in `public/` del repository: al primo push il sito cambia aspetto.

---

Devo rifare l'aspetto di **Bordo Vasca** (bordovasca.statocritico.it), il blog di **Flavio Bianco**, termotecnico con più di trent'anni
di esperienza nel mondo delle piscine. Sottotitolo: «Pensieri di un tecnico in controcorrente». Contiene **pensieri**
(testi brevi, divisi per categoria) e **articoli** tecnici più lunghi.

Ti allego le pagine HTML del sito con contenuti di esempio (cartella `anteprima`, apri `index.html`) e il file
`CONTRATTO_CSS.md`, che elenca tutte le classi e la struttura.

**Cosa ti chiedo**
1. Proponi 2–3 direzioni visive diverse, mostrate sulle pagine vere: home, elenco pensieri con le categorie, un pensiero,
   un articolo con immagine, tabella e citazione, «Chi sono». Su schermo largo e su telefono.
2. Sulla direzione che sceglierò, consegna **un unico file `tema.css`** che sostituisce quello attuale.

**Vincoli tecnici (non negoziabili)**
- **Non posso cambiare l'HTML**: lavora solo sul CSS, con le classi del contratto. Se una cosa è impossibile senza
  toccare l'HTML, dimmelo e proponi l'aggiunta minima, a parte.
- Nessuna risorsa da server esterni (niente Google Fonts o CDN). Se vuoi un font, deve avere licenza libera (SIL OFL o
  simile); consegnami i file `woff2` da mettere in `font/` e usa percorsi relativi (`url("font/…")`).
- Nessun JavaScript.
- Tema chiaro e **tema scuro** (`prefers-color-scheme`), stampa leggibile.
- Accessibilità: testo principale almeno 18 px, contrasto AA, focus visibile, righe non troppo lunghe. Molti lettori
  sono over 60 e leggono da telefono.

**Tono**
Tecnico ma caldo, competente, un po' ironico («controcorrente»). Acqua, vasche, impianti, cantiere: niente cliché da
villaggio vacanze (palme, ombrelloni, azzurro piscina saturo). Deve sembrare il quaderno di un professionista esperto,
non una brochure commerciale. Il logo attuale è una vasca stilizzata con un'onda (un piccolo SVG con le classi
`logo-vasca` e `logo-onda`): puoi ridisegnarlo solo con il CSS o proporne uno nuovo come SVG a parte.

Il blog è ospitato da Stato Critico ma ha un'identità sua: non deve somigliare per forza a Stato Critico.
