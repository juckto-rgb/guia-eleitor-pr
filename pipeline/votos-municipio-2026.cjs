// Votos de cada eleito do PR por município (1º turno 2026), direto dos arquivos oficiais do TSE (resultados.tse.jus.br).
// Só cargos com totalização concluída (tf = "s"). Saída: pipeline/_votos-mun-2026.json
// Uso: node pipeline/resultados-2026.cjs && node pipeline/votos-municipio-2026.cjs
const fs = require('fs');
const path = require('path');
const B = 'https://resultados.tse.jus.br/oficial/ele2026/';
const ELE = '6259';
const CARGOS = { governador: '0003', senador: '0005', federal: '0006', estadual: '0007' };
const RES = JSON.parse(fs.readFileSync(path.join(__dirname, '_resultados-2026.json'), 'utf8')).cargos;

const get = async (u, t = 0) => {
  try { const r = await fetch(u + '?t=' + Date.now()); if (!r.ok) throw new Error(r.status + ' ' + u); return await r.json(); }
  catch (e) { if (t < 3) { await new Promise(s => setTimeout(s, 1500 * (t + 1))); return get(u, t + 1); } throw e; }
};
const pool = async (itens, n, fn) => { let i = 0; const out = []; await Promise.all(Array.from({ length: n }, async () => { while (i < itens.length) { const k = i++; out[k] = await fn(itens[k], k); } })); return out; };

(async () => {
  const cfg = await get(B + ELE + '/config/mun-e' + ELE.padStart(6, '0') + '-cm.json');
  const pr = cfg.abr.find(a => a.cd === 'pr');
  const mun = pr.mu.map(m => [m.cdi, m.nm, m.cd]).sort((a, b) => a[0].localeCompare(b[0]));
  console.log('municípios do PR no TSE:', mun.length);
  const out = { at: '', fonte: 'TSE · resultados.tse.jus.br · arquivos por município (1º turno, 04/10/2026)', mun: mun.map(m => [m[0], m[1]]), c: {}, sq: {} };
  for (const [cg, cc] of Object.entries(CARGOS)) {
    const x = RES[cg];
    if (!x || x.tf !== 's') { console.log(cg + ': totalização ainda não concluída no TSE, fica de fora'); continue; }
    const eleitos = x.cands.filter(k => /^eleit/i.test(k.st || '')).map(k => k.sq);
    const vv = new Array(mun.length).fill(0);
    eleitos.forEach(sq => { out.sq[sq] = { c: cg, v: new Array(mun.length).fill(0), p: new Array(mun.length).fill(0) }; });
    let ok = 0;
    await pool(mun, 8, async (m, idx) => {
      const j = await get(B + ELE + '/dados/pr/pr' + m[2] + '-c' + cc + '-e' + ELE.padStart(6, '0') + '-u.json');
      vv[idx] = +((j.v || {}).vv || 0);
      (j.carg || []).forEach(c => (c.agr || []).forEach(a => (a.par || []).forEach(p => (p.cand || []).forEach(k => { if (out.sq[k.sqcand]) { out.sq[k.sqcand].v[idx] = +k.vap || 0; out.sq[k.sqcand].p[idx] = Math.round(parseFloat(String(k.pvap || '0').replace(',', '.')) * 100) || 0; /* % dos válidos como o TSE publica, em centésimos */ } }))));
      if (++ok % 100 === 0) console.log('  ' + cg + ': ' + ok + '/' + mun.length);
    });
    out.c[cg] = { vv };
    // conferência: soma por município = total estadual do TSE
    eleitos.forEach(sq => { const soma = out.sq[sq].v.reduce((a, b) => a + b, 0); const tot = +(x.cands.find(k => k.sq === sq) || {}).vap; if (soma !== tot) console.log('  ATENÇÃO soma difere', cg, sq, soma, tot); });
    console.log(cg + ': ' + eleitos.length + ' eleitos, ' + mun.length + ' municípios');
  }
  const b = new Date(Date.now() - 3 * 3600e3), p = n => String(n).padStart(2, '0');
  out.at = p(b.getUTCDate()) + '/' + p(b.getUTCMonth() + 1) + '/' + b.getUTCFullYear() + ' ' + p(b.getUTCHours()) + ':' + p(b.getUTCMinutes());
  fs.writeFileSync(path.join(__dirname, '_votos-mun-2026.json'), JSON.stringify(out));
  console.log('gravado _votos-mun-2026.json · leitura ' + out.at);
})().catch(e => { console.error('ERRO', e.message); process.exit(1); });
