// Bordo Vasca – pubblicazione dei pensieri per email.
// Email Routing di Cloudflare consegna qui i messaggi inviati all'indirizzo (segreto) del blog;
// il worker controlla il mittente, scrive il pensiero nel repository GitHub e risponde con il link.
import PostalMime from 'postal-mime';
import { EmailMessage } from 'cloudflare:email';
import { createMimeMessage } from 'mimetext';
import { GitHub, inBase64 } from './github.js';
import {
  autenticazioneFallita,
  daHtml,
  fileDellaCategoria,
  fileDelPensiero,
  immaginiDaPubblicare,
  leggiOggetto,
  mittenteAutorizzato,
  nomeLibero,
  oggiRoma,
  pulisciTesto,
  slug,
  collocaImmagini,
} from './elabora.js';

const CARTELLA_PENSIERI = 'src/content/pensieri';
const CARTELLA_CATEGORIE = 'src/content/categorie';
const CARTELLA_IMMAGINI = 'public/media/pensieri';

export default {
  async email(message, env, ctx) {
    // 1. Chi scrive? Mittente della busta e mittente dell'intestazione devono essere entrambi autorizzati.
    const busta = message.from;
    const email = await PostalMime.parse(message.raw);
    const intestazione = email.from?.address ?? '';
    if (!mittenteAutorizzato(busta, env.MITTENTI_AUTORIZZATI) || !mittenteAutorizzato(intestazione, env.MITTENTI_AUTORIZZATI)) {
      console.log(`Rifiutato: mittente non autorizzato (${busta})`);
      message.setReject('Indirizzo non abilitato a pubblicare su Bordo Vasca');
      return;
    }
    if (autenticazioneFallita(message.headers.get('Authentication-Results'))) {
      console.log(`Rifiutato: autenticazione fallita (${busta})`);
      message.setReject('Messaggio non autenticato');
      return;
    }

    const oggetto = email.subject ?? message.headers.get('Subject') ?? '';
    try {
      const esito = await pubblica(email, oggetto, env);
      await rispondi(message, oggetto, testoConferma(esito, env));
    } catch (errore) {
      console.error('Pubblicazione non riuscita:', errore);
      await rispondi(
        message,
        oggetto,
        'Non sono riuscito a pubblicare questo pensiero. Non è colpa tua: ho avvisato chi gestisce il sito, che lo sistemerà.\n\nIl testo non è andato perso.',
      );
      if (env.INOLTRO_ERRORI) {
        try {
          await message.forward(env.INOLTRO_ERRORI);
        } catch (e) {
          console.error('Inoltro non riuscito:', e);
        }
      }
    }
  },
};

async function pubblica(email, oggetto, env) {
  const gh = new GitHub({ token: env.GITHUB_TOKEN, repo: env.GITHUB_REPO, ramo: env.GITHUB_BRANCH || 'main' });
  const [categorie, pensieri, immaginiEsistenti] = await Promise.all([
    gh.elenco(CARTELLA_CATEGORIE),
    gh.elenco(CARTELLA_PENSIERI),
    gh.elenco(CARTELLA_IMMAGINI),
  ]);
  const idCategorie = categorie.filter((n) => n.endsWith('.md')).map((n) => n.slice(0, -3));

  const o = leggiOggetto(oggetto, idCategorie);
  const testo = pulisciTesto(email.text?.trim() ? email.text : daHtml(email.html));
  const data = oggiRoma();
  const base = `${data}-${slug(o.titolo) || 'pensiero'}`;
  const nomeFile = nomeLibero(base, pensieri);
  const id = nomeFile.slice(0, -3);

  const file = [];
  const immagini = [];
  const usati = [...immaginiEsistenti];
  for (const [i, a] of immaginiDaPubblicare(email.attachments).entries()) {
    const nome = nomeLibero(`${id}-${i + 1}`, usati, `.${a.estensione}`);
    usati.push(nome);
    file.push({ percorso: `${CARTELLA_IMMAGINI}/${nome}`, base64: inBase64(a.content) });
    immagini.push({ nome: a.filename ?? '', url: `/media/pensieri/${nome}` });
  }
  if (!testo && immagini.length === 0) throw new Error('Email senza testo');

  if (o.categoriaNuova && !idCategorie.includes(o.categoriaNuova)) {
    file.push({ percorso: `${CARTELLA_CATEGORIE}/${o.categoriaNuova}.md`, testo: fileDellaCategoria({ nome: o.nomeCategoriaNuova }) });
  }
  file.push({
    percorso: `${CARTELLA_PENSIERI}/${nomeFile}`,
    testo: fileDelPensiero({ titolo: o.titolo, data, categoria: o.categoria, bozza: o.bozza, ...conFoto(testo, immagini) }),
  });

  await gh.commit(`Pensiero via email: ${o.titolo}`, file);
  return { ...o, id, immagini: immagini.length, categoriaCreata: Boolean(o.categoriaNuova) };
}

function conFoto(testo, immagini) {
  const { testo: t, restanti } = collocaImmagini(testo, immagini);
  return { testo: t, immagini: restanti };
}

function testoConferma(esito, env) {
  const sito = (env.SITO || 'https://bordovasca.statocritico.it').replace(/\/$/, '');
  const righe = [];
  if (esito.bozza) {
    righe.push(`Ho salvato «${esito.titolo}» come BOZZA: non è visibile sul sito.`);
    righe.push('Per pubblicarla, aprila nell\'editor e togli la spunta «Bozza».');
  } else {
    righe.push(`Pubblicato: «${esito.titolo}».`);
    righe.push('', `Sarà online tra un paio di minuti a questo indirizzo:`, `${sito}/pensieri/${esito.id}/`);
  }
  righe.push('', `Categoria: ${esito.nomeCategoriaNuova ?? esito.categoria.replace(/-/g, ' ')}${esito.categoriaCreata ? ' (nuova)' : ''}`);
  if (esito.immagini) righe.push(`Foto: ${esito.immagini}`);
  righe.push('', 'Per correggere o cancellare usa l\'editor, oppure chiedi a Paolo.');
  return righe.join('\n');
}

async function rispondi(message, oggetto, testo) {
  try {
    const r = createMimeMessage();
    const id = message.headers.get('Message-ID');
    if (id) {
      r.setHeader('In-Reply-To', id);
      r.setHeader('References', id);
    }
    r.setSender({ name: 'Bordo Vasca', addr: message.to });
    r.setRecipient(message.from);
    r.setSubject(`Re: ${oggetto}`.slice(0, 200));
    r.addMessage({ contentType: 'text/plain', data: testo });
    await message.reply(new EmailMessage(message.to, message.from, r.asRaw()));
  } catch (e) {
    // La risposta è una cortesia: se non parte (per esempio DMARC non valido), il pensiero resta pubblicato.
    console.error('Risposta non inviata:', e);
  }
}
