// Sostituisce il modulo «cloudflare:email» (esiste solo su Cloudflare) con una classe finta, per le prove in Node.
export async function resolve(spec, ctx, next) {
  if (spec === 'cloudflare:email') return { url: 'data:text/javascript,export class EmailMessage{constructor(f,t,r){this.from=f;this.to=t;this.raw=r}}', shortCircuit: true };
  return next(spec, ctx);
}
