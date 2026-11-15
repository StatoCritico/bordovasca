// Scrive su GitHub con un solo commit (testo + immagini), così il sito si ripubblica una volta sola.
const API = 'https://api.github.com';

export class GitHub {
  constructor({ token, repo, ramo = 'main', fetchFn = fetch }) {
    if (!token) throw new Error('Manca il segreto GITHUB_TOKEN');
    if (!/^[\w.-]+\/[\w.-]+$/.test(repo ?? '')) throw new Error('GITHUB_REPO deve essere «proprietario/nome»');
    this.token = token;
    this.repo = repo;
    this.ramo = ramo;
    this.fetch = fetchFn;
  }

  async chiama(metodo, percorso, corpo) {
    const r = await this.fetch(`${API}/repos/${this.repo}${percorso}`, {
      method: metodo,
      headers: {
        Authorization: `Bearer ${this.token}`,
        Accept: 'application/vnd.github+json',
        'X-GitHub-Api-Version': '2022-11-28',
        'User-Agent': 'bordovasca-email-worker',
        ...(corpo ? { 'Content-Type': 'application/json' } : {}),
      },
      body: corpo ? JSON.stringify(corpo) : undefined,
    });
    if (r.status === 404 && metodo === 'GET') return null;
    if (!r.ok) {
      const testo = await r.text().catch(() => '');
      throw new Error(`GitHub ${metodo} ${percorso}: ${r.status} ${testo.slice(0, 300)}`);
    }
    return r.status === 204 ? null : r.json();
  }

  /** Nomi dei file in una cartella del repository (vuoto se la cartella non c'è). */
  async elenco(cartella) {
    const voci = await this.chiama('GET', `/contents/${cartella}?ref=${encodeURIComponent(this.ramo)}`);
    return Array.isArray(voci) ? voci.filter((v) => v.type === 'file').map((v) => v.name) : [];
  }

  /**
   * @param {string} messaggio
   * @param {{ percorso: string, testo?: string, base64?: string }[]} file
   */
  async commit(messaggio, file) {
    const ref = await this.chiama('GET', `/git/ref/heads/${encodeURIComponent(this.ramo)}`);
    if (!ref) throw new Error(`Il ramo ${this.ramo} non esiste`);
    const ultimo = ref.object.sha;
    const commitPrec = await this.chiama('GET', `/git/commits/${ultimo}`);

    const albero = [];
    for (const f of file) {
      if (f.base64 !== undefined) {
        const blob = await this.chiama('POST', '/git/blobs', { content: f.base64, encoding: 'base64' });
        albero.push({ path: f.percorso, mode: '100644', type: 'blob', sha: blob.sha });
      } else {
        albero.push({ path: f.percorso, mode: '100644', type: 'blob', content: f.testo });
      }
    }
    const tree = await this.chiama('POST', '/git/trees', { base_tree: commitPrec.tree.sha, tree: albero });
    const nuovo = await this.chiama('POST', '/git/commits', { message: messaggio, tree: tree.sha, parents: [ultimo] });
    await this.chiama('PATCH', `/git/refs/heads/${encodeURIComponent(this.ramo)}`, { sha: nuovo.sha, force: false });
    return nuovo.sha;
  }
}

/** Da ArrayBuffer/Uint8Array a base64, a pezzi per non superare i limiti di String.fromCharCode. */
export function inBase64(contenuto) {
  if (typeof contenuto === 'string') return btoa(unescape(encodeURIComponent(contenuto)));
  const byte = contenuto instanceof Uint8Array ? contenuto : new Uint8Array(contenuto);
  let bin = '';
  for (let i = 0; i < byte.length; i += 0x8000) bin += String.fromCharCode(...byte.subarray(i, i + 0x8000));
  return btoa(bin);
}
