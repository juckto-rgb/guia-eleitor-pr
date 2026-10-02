// Casa os autores da ALEP com os candidatos que o guia já marca com mandato na ALEP (ALEP[pi]) + Curi (23)
const fs = require('fs'); const S = __dirname + '/';
const norm = s => (s || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z\s]/g, ' ').replace(/\s+/g, ' ').trim();
const bruto = JSON.parse(fs.readFileSync(S + 'alep-bruto.json', 'utf8'));
const inv = JSON.parse(fs.readFileSync(S + 'dep-inventario.json', 'utf8'));
const h = fs.readFileSync(__dirname + '/../../index.html', 'utf8');
const i0 = h.indexOf('var ALEP = '); const ALEP = JSON.parse(h.slice(h.indexOf('{', i0), h.indexOf('};', i0) + 1));
const all = Object.values(bruto).flat();
const byAut = {}; // autor -> lista
for (const p of all) for (const a of (p.au || '').split(',')) { const k = norm(a).replace(/^(deputad[oa]|dep) /, '').trim(); if (k) (byAut[k] = byAut[k] || []).push(p); }
const STOP = new Set(['doutor', 'doutora', 'dr', 'dra', 'professor', 'professora', 'pastor', 'pastora', 'delegado', 'delegada', 'sargento', 'cabo', 'soldado', 'coronel', 'capitao', 'tenente', 'irmao', 'irma', 'coletivo', 'mandato', 'enfermeira', 'enfermeiro', 'vereador', 'vereadora', 'prefeito', 'deputado', 'deputada', 'bispo', 'padre', 'do', 'da', 'de', 'dos', 'das', 'e', 'pr', 'filho', 'junior', 'jr', 'neto']);
const toks = s => norm(s).split(' ').filter(t => t.length >= 3 && !STOP.has(t));
const alvos = inv.filter(r => r.alep).map(r => ({ pi: r.pi, nome: r.nome, anos: r.alepAnos })).concat([{ pi: 23, nome: 'ALEXANDRE CURI', anos: '2003-2026' }]);
const res = {}, rel = [];
for (const r of alvos) {
  const ALIAS = { 695: 'professor lemos', 952: 'cesar silvestri filho' }; // nome de urna ≠ nome na ALEP (conferido por idade/período)
  if (r.pi === 186) { rel.push('186 SARGENTO DOS SANTOS → descartado: 41 anos, sem mandato na ALEP (casamento antigo do guia estava errado)'); continue; }
  const ct = toks(r.nome);
  let cands = ALIAS[r.pi] ? [ALIAS[r.pi]].filter(a => byAut[a]) : Object.keys(byAut).filter(a => { const at = new Set(a.split(' ')); return ct.length && ct.every(t => at.has(t)); });
  if (!ALIAS[r.pi] && ct.length === 1) cands = cands.filter(a => toks(a).join(' ') === ct[0]); // nome de uma palavra só: exige nome idêntico
  // mais de um autor casando: fica o que tem proposições dentro do período que o guia já registra
  const [a0, a1] = (r.anos || '').split('-').map(Number);
  const score = a => byAut[a].filter(p => !a0 || (p.a >= a0 && p.a <= a1)).length;
  cands.sort((x, y) => score(y) - score(x));
  const pick = cands[0];
  if (pick) res[r.pi] = { autor: pick, lista: byAut[pick].map(p => ({ tipo: p.t, num: p.n, ano: p.a, ementa: p.e, assunto: p.as })) };
  const anos = pick ? byAut[pick].map(p => p.a) : [];
  rel.push(`${r.pi} ${r.nome} [guia ALEP ${r.anos}] → ${pick || 'SEM CASAMENTO'}${cands.length > 1 ? ' (outros: ' + cands.slice(1, 4).join(' | ') + ')' : ''} · ${anos.length} normativas ${anos.length ? Math.min(...anos) + '-' + Math.max(...anos) : ''}`);
}
fs.writeFileSync(S + 'alep-por-pi.json', JSON.stringify(res));
console.log(rel.join('\n'));
console.log('casados:', Object.keys(res).length, 'de', alvos.length);
