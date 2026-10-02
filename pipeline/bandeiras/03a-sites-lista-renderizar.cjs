// Lista os sites que precisam de renderização (JavaScript) ou não responderam ao leitor simples
const fs = require('fs'); const S = __dirname + '/';
const b = JSON.parse(fs.readFileSync(S + 'dep-bandeiras.json', 'utf8')), s = JSON.parse(fs.readFileSync(S + 'dep-sites-texto2.json', 'utf8')), inv = JSON.parse(fs.readFileSync(S + 'dep-inventario.json', 'utf8'));
const NAO = /missaoparana|pco\.org|bsky|telegram|snapchat|vakinha|change\.org|cnpq|instagran|adventistas|leiloes|leilotech/i; // partido/movimento, rede social, vaquinha, terceiros
const L = [];
for (const r of inv) { if (!r.sites.length) continue; const x = s[r.pi]; const bx = b[r.pi];
  if (x && x.pages) { const len = x.pages.reduce((a, p) => a + p.text.length, 0); const rec = bx.notas.some(n => /nome/.test(n));
    if (NAO.test(x.dom)) continue;
    if (rec || (!bx.c.length && len < 4000) || /redirecion|em breve|{{/i.test(x.pages[0].text.slice(0, 300))) L.push([r.pi, r.nome, 'https://' + x.dom, 'js']); }
  else { for (const d of r.sites) { if (!NAO.test(d)) { L.push([r.pi, r.nome, 'https://' + d, 'morto']); break; } } } }
fs.writeFileSync(S + 'render-lista.json', JSON.stringify(L)); console.log(L.length, 'sites para renderizar');
