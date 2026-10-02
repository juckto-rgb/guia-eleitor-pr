// Compara a lista atual do TSE (02/10/2026) com o guia: situação, renúncias, ausentes e candidatos novos
const fs = require('fs'); const S = __dirname + '/';
const h = fs.readFileSync(__dirname + '/../../index.html', 'utf8');
function grab(decl, o, c) { const i = h.indexOf(decl); const s = h.indexOf(o, i); let d = 0, j = s, st = false; for (; j < h.length; j++) { const ch = h[j]; if (st) { if (ch == '\\') j++; else if (ch == '"') st = false; continue; } if (ch == '"') st = true; else if (ch === o) d++; else if (ch === c) { d--; if (d === 0) return JSON.parse(h.slice(s, j + 1)); } } }
const DEPS = grab('var DEPS = ', '[', ']'), DD = grab('var DEP_DETAIL = ', '{', '}'), P = grab('var PROFILES = ', '[', ']');
const lines = fs.readFileSync(S + 'render-out.jsonl', 'utf8').trim().split('\n'); const T = JSON.parse(lines[lines.length - 1]);
fs.writeFileSync(S + 'tse-2026-10-02.json', JSON.stringify(T));
const rel = { mudouSit: [], saiu: [], novo: [], majoritarios: [] };
for (const cg of ['senador', 'federal', 'estadual']) {
  const tse = Object.fromEntries(T[cg].map(x => [x[0], x])); const guia = DEPS.filter(d => d.cargo === cg);
  const gset = new Set(guia.map(d => d.sq));
  for (const d of guia) { const t = tse[d.sq]; const sitG = (DD[d.sq] || {}).sit;
    if (!t) rel.saiu.push([cg, d.nome, 'ausente no TSE']);
    else if (/renúncia|falecid|cassad|cancelad/i.test(t[1])) rel.saiu.push([cg, d.nome, t[1]]);
    else if (t[1] !== sitG) rel.mudouSit.push([cg, d.sq, d.nome, sitG + ' → ' + t[1]]); }
  for (const t of T[cg]) if (!gset.has(t[0]) && !/renúncia|falecid|cassad|cancelad/i.test(t[1])) rel.novo.push([cg, t[0], t[2], t[3], t[4], t[1]]);
}
for (const [cg, lst] of [['presidente', T.presidente], ['governador', T.governador]]) for (const t of lst) {
  const p = P.find(p => p.cargo.toLowerCase() === cg && String(p.num) === String(t[3]));
  if (!p) rel.majoritarios.push([cg, t[2], 'não está no guia', t[1]]); else if (p.sit !== t[1]) rel.majoritarios.push([cg, t[2], p.sit + ' → ' + t[1]]);
}
fs.writeFileSync(S + 'tse-compara.json', JSON.stringify(rel, null, 1));
console.log('mudou situação:', rel.mudouSit.length); rel.mudouSit.forEach(x => console.log('  ', x.join(' | ')));
console.log('saiu (renúncia/ausente):', rel.saiu.length); rel.saiu.forEach(x => console.log('  ', x.join(' | ')));
console.log('novos válidos no TSE fora do guia:', rel.novo.length); rel.novo.forEach(x => console.log('  ', x.join(' | ')));
console.log('majoritários:', rel.majoritarios.length); rel.majoritarios.forEach(x => console.log('  ', x.join(' | ')));
