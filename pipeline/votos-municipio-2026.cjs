// Votos de cada eleito do PR por município (1º turno 2026), direto dos arquivos oficiais do TSE (resultados.tse.jus.br).
// Presidente (eleição nacional 6257): entram os que foram ao 2º turno, com os votos do 1º turno nos municípios do PR.
// Só cargos com totalização concluída (tf = "s"). Saída: pipeline/_votos-mun-2026.json
// Uso: node pipeline/resultados-2026.cjs && node pipeline/votos-municipio-2026.cjs
const fs = require('fs');
const path = require('path');
const B = 'https://resultados.tse.jus.br/oficial/ele2026/';
const CARGOS = {
  presidente: { cc: '0001', ele: '6257', quem: /^(eleit|2º turno)/i },
  governador: { cc: '0003', ele: '6259', quem: /^eleit/i },
  senador: { cc: '0005', ele: '6259', quem: /^eleit/i },
  federal: { cc: '0006', ele: '6259', quem: /^eleit/i },
  estadual: { cc: '0007', ele: '6259', quem: /^eleit/i }
};
const RES = JSON.parse(fs.readFileSync(path.join(__dirname, '_resultados-2026.json'), 'utf8')).cargos;

const get = async (u, t = 0) => {
  try { const r = await fetch(u + '?t=' + Date.now()); if (!r.ok) throw new Error(r.status + ' ' + u); return await r.json(); }
  catch (e) { if (t < 3) { await new Promise(s => setTimeout(s, 1500 * (t + 1))); return get(u, t + 1); } throw e; }
};
const pool = async (itens, n, fn) => { let i = 0; const out = []; await Promise.all(Array.from({ length: n }, async () => { while (i < itens.length) { const k = i++; out[k] = await fn(itens[k], k); } })); return out; };
// candidatos em qualquer nível do arquivo (estaduais: carg→agr→par→cand; presidente: carg→fed→…)
const cands = (o, f) => { if (Array.isArray(o)) o.forEach(x => cands(x, f)); else if (o && typeof o === 'object') { if (o.sqcand && o.vap !== undefined) f(o); Object.values(o).forEach(x => cands(x, f)); } };
const e6 = ele => ele.padStart(6, '0');

(async () => {
  // municípios do PR na ordem do código IBGE; o código TSE de cada eleição é lido do config dela
  const cdTse = {};
  for (const ele of [...new Set(Object.values(CARGOS).map(x => x.ele))]) {
    const cfg = await get(B + ele + '/config/mun-e' + e6(ele) + '-cm.json');
    cdTse[ele] = {}; cfg.abr.find(a => a.cd === 'pr').mu.forEach(m => { cdTse[ele][m.cdi] = { cd: m.cd, nm: m.nm }; });
  }
  const mun = Object.keys(cdTse['6259']).sort().map(cdi => [cdi, cdTse['6259'][cdi].nm]);
  console.log('municípios do PR no TSE:', mun.length);
  const out = { at: '', fonte: 'TSE · resultados.tse.jus.br · arquivos por município (1º turno, 04/10/2026)', mun, c: {}, sq: {} };
  for (const [cg, { cc, ele, quem }] of Object.entries(CARGOS)) {
    const x = RES[cg];
    if (!x || x.tf !== 's') { console.log(cg + ': totalização ainda não concluída no TSE, fica de fora'); continue; }
    const sel = x.cands.filter(k => quem.test(k.st || '')).map(k => k.sq);
    const vv = new Array(mun.length).fill(0);
    sel.forEach(sq => { out.sq[sq] = { c: cg, v: new Array(mun.length).fill(0), p: new Array(mun.length).fill(0) }; });
    let ok = 0;
    await pool(mun, 8, async (m, idx) => {
      const t = cdTse[ele][m[0]]; if (!t) throw new Error(cg + ': município ' + m[1] + ' sem código na eleição ' + ele);
      const j = await get(B + ele + '/dados/pr/pr' + t.cd + '-c' + cc + '-e' + e6(ele) + '-u.json');
      vv[idx] = +((j.v || {}).vv || 0);
      cands(j.carg, k => { if (out.sq[k.sqcand]) { out.sq[k.sqcand].v[idx] = +k.vap || 0; out.sq[k.sqcand].p[idx] = Math.round(parseFloat(String(k.pvap || '0').replace(',', '.')) * 100) || 0; /* % dos válidos como o TSE publica, em centésimos */ } });
      if (++ok % 100 === 0) console.log('  ' + cg + ': ' + ok + '/' + mun.length);
    });
    out.c[cg] = { vv };
    // conferência: soma por município = total do PR no TSE (presidente: arquivo estadual do PR, não o total nacional)
    const totPR = {};
    if (cg === 'presidente') cands((await get(B + ele + '/dados/pr/pr-c' + cc + '-e' + e6(ele) + '-u.json')).carg, k => { totPR[k.sqcand] = +k.vap; });
    else x.cands.forEach(k => { totPR[k.sq] = +k.vap; });
    sel.forEach(sq => { const soma = out.sq[sq].v.reduce((a, b) => a + b, 0); if (soma !== totPR[sq]) console.log('  ATENÇÃO soma difere', cg, sq, soma, totPR[sq]); });
    console.log(cg + ': ' + sel.length + ' candidatos, ' + mun.length + ' municípios');
  }
  const b = new Date(Date.now() - 3 * 3600e3), p = n => String(n).padStart(2, '0');
  out.at = p(b.getUTCDate()) + '/' + p(b.getUTCMonth() + 1) + '/' + b.getUTCFullYear() + ' ' + p(b.getUTCHours()) + ':' + p(b.getUTCMinutes());
  fs.writeFileSync(path.join(__dirname, '_votos-mun-2026.json'), JSON.stringify(out));
  console.log('gravado _votos-mun-2026.json · leitura ' + out.at);
})().catch(e => { console.error('ERRO', e.message); process.exit(1); });
