/* resultados-2026.cjs — apuração oficial do 1º turno de 04/10/2026 (TSE), por cargo.
 *
 * Fonte: serviço oficial de divulgação de resultados do TSE (o mesmo do app Resultados):
 *   config:  https://resultados.tse.jus.br/oficial/comum/config/ele-c.json
 *            pleito 3220 (ele2026): eleição 6257 = Presidente (2º turno 6258)
 *                                   eleição 6259 = Governador/Senador/Dep. Federal/Dep. Estadual (2º turno 6260)
 *   dados:   https://resultados.tse.jus.br/oficial/ele2026/{ele}/dados/{uf}/{uf}-c{cargo 4 dígitos}-e{ele 6 dígitos}-u.json
 *            presidente = br/br-c0001-e006257-u.json · governador c0003 · senador c0005 · dep. federal c0006 · dep. estadual c0007 (uf pr)
 *   Cada candidato traz sqcand (= código do candidato no guia), vap (votos), pvap (%), e (eleito s/n) e st (situação: "Eleito",
 *   "Eleito por QP", "Eleito por média", "2º turno", "Não eleito", "Suplente"). tf = "s" quando a totalização terminou.
 *   O % de seções apuradas fica em "s.pst" (arquivo -u) quando presente.
 *
 * REGRA: o guia só mostra situação de resultado quando o próprio TSE a informa (campo st preenchido). Nada de projeção.
 * Uso: node pipeline/resultados-2026.cjs   → grava pipeline/_resultados-2026.json e mostra o resumo.
 */
const fs = require('fs'), path = require('path');
const BASE = 'https://resultados.tse.jus.br/oficial/ele2026';
const ALVOS = [
  ['presidente', 6257, 'br', 1], ['governador', 6259, 'pr', 3], ['senador', 6259, 'pr', 5],
  ['federal', 6259, 'pr', 6], ['estadual', 6259, 'pr', 7],
];
const pad = (n, k) => String(n).padStart(k, '0');
async function baixar(cargo, ele, uf, cd) {
  const url = `${BASE}/${ele}/dados/${uf}/${uf}-c${pad(cd, 4)}-e${pad(ele, 6)}-u.json`;
  const r = await fetch(url + '?t=' + Date.now(), { headers: { 'user-agent': 'Mozilla/5.0' } });
  if (!r.ok) throw new Error(cargo + ' HTTP ' + r.status + ' ' + url);
  return { url, j: await r.json() };
}
function cands(j) { // percorre carg → agr → par → cand
  const out = [];
  for (const c of j.carg || []) for (const a of c.agr || []) for (const p of a.par || []) for (const k of p.cand || [])
    out.push({ sq: k.sqcand, n: k.n, nmu: k.nmu, sg: p.sg, vap: +k.vap || 0, pvap: k.pvap, e: k.e, st: k.st || '' });
  return out;
}
(async () => {
  const res = { geradoEm: new Date().toISOString(), cargos: {} };
  for (const [cargo, ele, uf, cd] of ALVOS) {
    try {
      const { url, j } = await baixar(cargo, ele, uf, cd);
      const lst = cands(j);
      const s = j.s || {};
      res.cargos[cargo] = { url, dg: j.dg, hg: j.hg, tf: j.tf, dt: j.dt, ht: j.ht, pst: s.pst || null, cands: lst };
      const comSt = lst.filter(x => x.st).length, eleitos = lst.filter(x => /eleito/i.test(x.st) && !/não/i.test(x.st)).length;
      console.log(`${cargo.padEnd(11)} ${lst.length} candidatos · seções apuradas ${s.pst || '?'}% · totalização final: ${j.tf} · com situação: ${comSt} · eleitos: ${eleitos} · 2º turno: ${lst.filter(x => /2º turno/.test(x.st)).length} · gerado ${j.dg} ${j.hg}`);
    } catch (e) { console.log(cargo, 'ERRO', e.message); }
  }
  fs.writeFileSync(path.join(__dirname, '_resultados-2026.json'), JSON.stringify(res));
})();
