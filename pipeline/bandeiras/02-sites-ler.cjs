// Lê os sites declarados ao TSE pelos deputados: home + até 6 páginas internas de propostas/atuação.
// Saída: dep-sites-texto.json  {pi:{dom, pages:[{url,text}], err}}
const fs = require('fs'); const S = __dirname + '/';
const inv = JSON.parse(fs.readFileSync(S + 'dep-inventario.json', 'utf8')).filter(r => r.sites.length);
const OUT = S + 'dep-sites-texto2.json';
let out = {}; try { out = JSON.parse(fs.readFileSync(OUT, 'utf8')); } catch (e) {}
const UA = { 'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/128 Safari/537.36', accept: 'text/html' };
// decodifica acentos codificados (&#231; &ccedil; &#xE7; ç) — antes viravam espaço e quebravam as palavras
const ENT = { aacute: 'á', eacute: 'é', iacute: 'í', oacute: 'ó', uacute: 'ú', atilde: 'ã', otilde: 'õ', ccedil: 'ç', acirc: 'â', ecirc: 'ê', ocirc: 'ô', agrave: 'à',
  Aacute: 'Á', Eacute: 'É', Iacute: 'Í', Oacute: 'Ó', Uacute: 'Ú', Atilde: 'Ã', Otilde: 'Õ', Ccedil: 'Ç', Acirc: 'Â', Ecirc: 'Ê', Ocirc: 'Ô', nbsp: ' ', amp: '&', ndash: '-', mdash: '-' };
const cp = n => { try { return String.fromCodePoint(n); } catch (e) { return ' '; } };
const dec = t => t.replace(/&#x([0-9a-f]+);/gi, (m, x) => cp(parseInt(x, 16))).replace(/&#(\d+);/g, (m, d) => cp(+d))
  .replace(/&([a-z]+);/gi, (m, n) => ENT[n] !== undefined ? ENT[n] : ' ').replace(/\\u([0-9a-f]{4})/gi, (m, x) => cp(parseInt(x, 16)));
const strip = h => dec(h.replace(/<script[\s\S]*?<\/script>/gi, ' ').replace(/<style[\s\S]*?<\/style>/gi, ' ').replace(/<noscript[\s\S]*?<\/noscript>/gi, ' ').replace(/<[^>]+>/g, ' ')).replace(/\s+/g, ' ').trim();
async function get(u) { try { const c = new AbortController(); const t = setTimeout(() => c.abort(), 15000);
  const r = await fetch(u, { headers: UA, redirect: 'follow', signal: c.signal }); clearTimeout(t);
  const ct = r.headers.get('content-type') || ''; if (!r.ok || !/html/i.test(ct)) return { err: r.status + ' ' + ct.slice(0, 20) };
  const html = (await r.text()).slice(0, 600000); return { url: r.url, html }; } catch (e) { return { err: String(e.message || e).slice(0, 60) }; } }
const KEY = /propost|bandeira|pauta|plano|compromiss|ideia|causa|atuac|mandato|projeto|trabalho|sobre|quem-?sou|conheca|biografia|trajetoria|defend|luta|metas|programa/i;
const SKIP = /\.(jpg|jpeg|png|gif|pdf|webp|svg|css|js|xml|ico|mp4|zip)(\?|$)|wp-json|feed|wp-content|wp-admin|xmlrpc|\/tag\/|\/author\/|\/categor|privacidade|privacy|cookies|termos|login|carrinho|cart|whatsapp|mailto:|tel:/i;
async function one(r) {
  for (const dom of r.sites) {
    for (const root of ['https://' + dom, 'https://www.' + dom, 'http://' + dom]) {
      const home = await get(root); if (home.err) continue;
      const host = new URL(home.url).host;
      const links = [...new Set([...home.html.matchAll(/href=["']([^"'#]+)["']/g)].map(m => { try { return new URL(m[1], home.url).href.split('#')[0]; } catch (e) { return null; } })
        .filter(u => u && new URL(u).host === host && !SKIP.test(u) && u !== home.url && KEY.test(new URL(u).pathname)))].slice(0, 6);
      const pages = [{ url: home.url, text: strip(home.html) }];
      for (const l of links) { const p = await get(l); if (!p.err) pages.push({ url: p.url, text: strip(p.html).slice(0, 60000) }); }
      return { dom, pages };
    }
  }
  return { err: 'nenhum domínio respondeu: ' + r.sites.join(', ') };
}
(async () => {
  const todo = inv.filter(r => !out[r.pi]); let n = 0; const CONC = 8;
  console.log('a ler:', todo.length, 'de', inv.length);
  for (let i = 0; i < todo.length; i += CONC) {
    const batch = todo.slice(i, i + CONC);
    const res = await Promise.all(batch.map(r => Promise.race([one(r), new Promise(z => setTimeout(() => z({ err: 'timeout total' }), 90000))])));
    batch.forEach((r, k) => { out[r.pi] = res[k]; });
    n += batch.length; fs.writeFileSync(OUT, JSON.stringify(out));
    console.log(`${n}/${todo.length}`, 'ok:', Object.values(out).filter(x => x.pages).length);
  }
  console.log('FIM');
})();
