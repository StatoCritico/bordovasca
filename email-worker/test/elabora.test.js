import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  leggiOggetto, trovaCategoria, collocaImmagini, pulisciTesto, daHtml, nomeLibero, fileDelPensiero,
  mittenteAutorizzato, autenticazioneFallita, immaginiDaPubblicare, oggiRoma, slug,
} from '../src/elabora.js';
import { idCategoria } from '../../src/lib/slug.js';

const CAT = ['progettazione', 'costruzione-e-cantiere', 'trattamento-dell-acqua', 'impianti-e-filtrazione',
  'gestione-e-manutenzione', 'normativa-e-sicurezza', 'esperienze-dal-campo', 'varie'];

test('slug come Pages CMS', () => {
  assert.equal(slug("Trattamento dell'acqua"), 'trattamento-dell-acqua');
  assert.equal(slug('Perché il pH è più importante'), 'perche-il-ph-e-piu-importante');
  assert.equal(idCategoria('src/content/categorie/varie.md'), 'varie');
  assert.equal(idCategoria("Trattamento dell'acqua"), 'trattamento-dell-acqua');
  assert.equal(idCategoria(''), 'varie');
});

test('categoria e titolo dall\'oggetto', () => {
  assert.deepEqual(leggiOggetto("Trattamento dell'acqua – Il cloro non è il nemico", CAT).categoria, 'trattamento-dell-acqua');
  const o = leggiOggetto('acqua - Il cloro non è il nemico', CAT);
  assert.equal(o.categoria, 'trattamento-dell-acqua');
  assert.equal(o.titolo, 'Il cloro non è il nemico');
  assert.equal(leggiOggetto('Impianti — La pompa giusta', CAT).categoria, 'impianti-e-filtrazione');
  assert.equal(leggiOggetto('Re: Normativa - Bagnino sì o no', CAT).categoria, 'normativa-e-sicurezza');
});

test('senza categoria: varie, e i due punti restano nel titolo', () => {
  const o = leggiOggetto('Sfioro: istruzioni per l\'uso', CAT);
  assert.equal(o.categoria, 'varie');
  assert.equal(o.titolo, 'Sfioro: istruzioni per l\'uso');
  assert.equal(o.categoriaNuova, null);
  assert.equal(leggiOggetto('', CAT).titolo, 'Un pensiero');
});

test('categoria nuova se breve, altrimenti tutto titolo', () => {
  const o = leggiOggetto('Piscine pubbliche - Chi paga il riscaldamento', CAT);
  assert.equal(o.categoria, 'piscine-pubbliche');
  assert.equal(o.categoriaNuova, 'piscine-pubbliche');
  assert.equal(o.nomeCategoriaNuova, 'Piscine pubbliche');
  const lungo = leggiOggetto('Una frase lunga con tante parole - e un trattino in mezzo', CAT);
  assert.equal(lungo.categoria, 'varie');
  assert.equal(lungo.titolo, 'Una frase lunga con tante parole - e un trattino in mezzo');
});

test('bozza nell\'oggetto', () => {
  const o = leggiOggetto('BOZZA Impianti - Pompe a velocità variabile', CAT);
  assert.equal(o.bozza, true);
  assert.equal(o.categoria, 'impianti-e-filtrazione');
  assert.equal(o.titolo, 'Pompe a velocità variabile');
  assert.equal(leggiOggetto('[Bozza] Prova', CAT).bozza, true);
});

test('categoria ambigua non viene indovinata', () => {
  assert.equal(trovaCategoria('e', CAT), null);
  assert.equal(trovaCategoria('Gestione', CAT), 'gestione-e-manutenzione');
});

test('pulizia del testo', () => {
  const t = 'Primo paragrafo.\n\nSecondo.\n\nInviato da iPhone\n\nIl giorno lun 10 nov 2026 alle 10:00 Paolo ha scritto:\n> vecchio';
  assert.equal(pulisciTesto(t), 'Primo paragrafo.\n\nSecondo.');
  assert.equal(pulisciTesto('Ciao\r\n-- \r\nFirma'), 'Ciao');
  assert.equal(daHtml('<div>Uno <b>forte</b></div><div>Due<br>tre</div>'), 'Uno **forte**\n\nDue\ntre');
});

test('nomi dei file, data, intestazione', () => {
  assert.equal(nomeLibero('2026-11-15-prova', ['2026-11-15-prova.md']), '2026-11-15-prova-2.md');
  assert.equal(oggiRoma(new Date('2026-11-15T23:30:00Z')), '2026-11-16');
  const f = fileDelPensiero({ titolo: 'Il "vero" pH', data: '2026-11-15', categoria: 'varie', bozza: false, testo: 'Testo', immagini: [{ url: '/media/pensieri/a.jpg' }] });
  assert.match(f, /^---\ntitolo: "Il \\"vero\\" pH"\ndata: 2026-11-15\ncategoria: src\/content\/categorie\/varie.md\nbozza: false\nfonte: email\n---\n\nTesto\n\n!\[\]\(\/media\/pensieri\/a.jpg\)\n$/);
});

test('mittenti e autenticazione', () => {
  assert.equal(mittenteAutorizzato('Papa@Example.com', 'papa@example.com, altro@example.com'), true);
  assert.equal(mittenteAutorizzato('intruso@example.com', 'papa@example.com'), false);
  assert.equal(mittenteAutorizzato('papa@example.com', ''), false);
  assert.equal(autenticazioneFallita('mx.cloudflare.net; dkim=pass header.d=gmail.com; dmarc=pass'), false);
  assert.equal(autenticazioneFallita('mx.cloudflare.net; dkim=fail; spf=fail; dmarc=fail'), true);
  assert.equal(autenticazioneFallita(null), false);
});

test('immagini: solo formati web e non troppo grandi', () => {
  const sel = immaginiDaPubblicare([
    { mimeType: 'image/jpeg', content: new Uint8Array(10) },
    { mimeType: 'application/pdf', content: new Uint8Array(10) },
    { mimeType: 'image/heic', content: new Uint8Array(10) },
    { mimeType: 'image/png', content: new Uint8Array(11 * 1024 * 1024) },
  ]);
  assert.equal(sel.length, 1);
  assert.equal(sel[0].estensione, 'jpg');
});

test('segnaposto delle foto di Gmail', () => {
  const r = collocaImmagini('[image: DSCN9087.JPG]\nTesto.\n[image: altra.png]', [
    { nome: 'DSCN9087.JPG', url: '/media/pensieri/a-1.jpg' },
    { nome: 'altra.png', url: '/media/pensieri/a-2.png' },
    { nome: 'terza.jpg', url: '/media/pensieri/a-3.jpg' },
  ]);
  assert.equal(r.testo, '![](/media/pensieri/a-1.jpg)\n\nTesto.\n\n![](/media/pensieri/a-2.png)');
  assert.deepEqual(r.restanti.map((x) => x.url), ['/media/pensieri/a-3.jpg']);
  assert.equal(collocaImmagini('[image: x.jpg] ciao', []).testo, 'ciao');
});
