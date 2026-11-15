// Prova completa del worker: email finta in ingresso, GitHub finto, controllo dei file scritti e della risposta.
import { test, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import worker from '../src/index.js';

const PAPA = 'papa@example.com';
const ENV = { GITHUB_TOKEN: 'finto', GITHUB_REPO: 'statocritico/bordovasca', GITHUB_BRANCH: 'main', MITTENTI_AUTORIZZATI: PAPA, SITO: 'https://bordovasca.statocritico.it', INOLTRO_ERRORI: 'paolo@example.com' };
let chiamate, alberi, guasto;

beforeEach(() => {
  chiamate = []; alberi = []; guasto = false;
  // Come su Cloudflare: fetch chiamata come metodo di un altro oggetto dà «Illegal invocation».
  const finto = async (url, init = {}) => {
    const p = new URL(url).pathname.replace('/repos/statocritico/bordovasca', '');
    const metodo = init.method ?? 'GET';
    chiamate.push(`${metodo} ${p}`);
    const json = (o, s = 200) => new Response(JSON.stringify(o), { status: s, headers: { 'Content-Type': 'application/json' } });
    if (guasto && metodo === 'PATCH') return new Response('conflict', { status: 422 });
    if (p === '/contents/src/content/categorie') return json([{ type: 'file', name: 'varie.md' }, { type: 'file', name: 'impianti-e-filtrazione.md' }]);
    if (p === '/contents/src/content/pensieri') return json([{ type: 'file', name: '2026-01-01-vecchio.md' }]);
    if (p === '/contents/public/media/pensieri') return json([], 404);
    if (p === '/git/ref/heads/main') return json({ object: { sha: 'aaa' } });
    if (p === '/git/commits/aaa') return json({ tree: { sha: 'ttt' } });
    if (p === '/git/blobs') return json({ sha: 'blob1' }, 201);
    if (p === '/git/trees') { alberi.push(JSON.parse(init.body)); return json({ sha: 'tree2' }, 201); }
    if (p === '/git/commits') return json({ sha: 'ccc' }, 201);
    if (p === '/git/refs/heads/main') return json({}, 200);
    return json({ message: 'non previsto ' + p }, 500);
  };
  globalThis.fetch = function (url, init) {
    if (this !== undefined && this !== globalThis) throw new TypeError('Illegal invocation');
    return finto(url, init);
  };
});

function email({ da = PAPA, oggetto, corpo, allegato = false }) {
  const confine = 'XYZ';
  const parti = allegato
    ? [`--${confine}`, 'Content-Type: text/plain; charset=utf-8', '', corpo, `--${confine}`,
       'Content-Type: image/jpeg', 'Content-Disposition: attachment; filename="foto.jpg"', 'Content-Transfer-Encoding: base64', '', Buffer.from('JPEGFINTO').toString('base64'), `--${confine}--`]
    : null;
  const testo = [
    `From: Papà <${da}>`, 'To: bordovasca-segreto@statocritico.it', `Subject: =?utf-8?B?${Buffer.from(oggetto).toString('base64')}?=`,
    'Message-ID: <abc@mail.gmail.com>', 'MIME-Version: 1.0',
    allegato ? `Content-Type: multipart/mixed; boundary="${confine}"` : 'Content-Type: text/plain; charset=utf-8',
    '', ...(parti ?? [corpo]), '',
  ].join('\r\n');
  const m = {
    from: da, to: 'bordovasca-segreto@statocritico.it', raw: new Response(testo).body,
    headers: new Headers({ 'Message-ID': '<abc@mail.gmail.com>', Subject: '=?utf-8?B?' + Buffer.from(oggetto).toString('base64') + '?=' }),
    rifiuto: null, risposte: [], inoltri: [],
    setReject(r) { this.rifiuto = r; }, async reply(e) { this.risposte.push(e); }, async forward(a) { this.inoltri.push(a); },
  };
  return m;
}

test('pubblica un pensiero con categoria e foto, e risponde con il link', async () => {
  const m = email({ oggetto: 'Impianti – La pompa giusta', corpo: 'Una pompa troppo grande consuma e fa rumore.\n\nInviato da iPhone', allegato: true });
  await worker.email(m, ENV, {});
  assert.equal(m.rifiuto, null);
  assert.equal(alberi.length, 1);
  const voci = alberi[0].tree;
  const pensiero = voci.find((v) => v.path.startsWith('src/content/pensieri/'));
  assert.match(pensiero.path, /^src\/content\/pensieri\/\d{4}-\d{2}-\d{2}-la-pompa-giusta\.md$/);
  assert.match(pensiero.content, /categoria: src\/content\/categorie\/impianti-e-filtrazione\.md/);
  assert.match(pensiero.content, /titolo: "La pompa giusta"/);
  assert.doesNotMatch(pensiero.content, /iPhone/);
  assert.match(pensiero.content, /!\[\]\(\/media\/pensieri\/\d{4}-\d{2}-\d{2}-la-pompa-giusta-1\.jpg\)/);
  assert.ok(voci.some((v) => v.path.endsWith('-1.jpg') && v.sha === 'blob1'));
  assert.equal(m.risposte.length, 1);
  const raw = m.risposte[0].raw;
  assert.match(raw, /In-Reply-To: <abc@mail\.gmail\.com>/);
  assert.equal(m.risposte[0].to, PAPA);
});

test('crea la categoria nuova insieme al pensiero', async () => {
  const m = email({ oggetto: 'Piscine pubbliche - Chi paga il riscaldamento', corpo: 'Testo.' });
  await worker.email(m, ENV, {});
  const percorsi = alberi[0].tree.map((v) => v.path);
  assert.ok(percorsi.includes('src/content/categorie/piscine-pubbliche.md'));
});

test('rifiuta un mittente non autorizzato senza toccare GitHub', async () => {
  const m = email({ da: 'intruso@example.com', oggetto: 'Varie - Spam', corpo: 'x' });
  await worker.email(m, ENV, {});
  assert.ok(m.rifiuto);
  assert.equal(chiamate.length, 0);
});

test('se GitHub non risponde: avvisa il mittente e inoltra a Paolo', async () => {
  guasto = true;
  const m = email({ oggetto: 'Varie - Prova', corpo: 'x' });
  await worker.email(m, ENV, {});
  assert.equal(m.risposte.length, 1);
  assert.deepEqual(m.inoltri, ['paolo@example.com']);
});
