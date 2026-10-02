// ALEP — API de Dados Abertos oficial (http://webservices.assembleia.pr.leg.br/api/public, documentada em
// transparencia.assembleia.pr.leg.br/servicos/dados-abertos). Proposições normativas por tipo e ano.
const fs = require('fs'); const S = __dirname + '/';
const URL = 'http://webservices.assembleia.pr.leg.br/api/public/proposicao/filtrar';
const TIPOS = { 1: 'PL', 2: 'PLC', 3: 'PDL', 6: 'PEC' };
const OUT = S + 'alep-bruto.json'; let out = {}; try { out = JSON.parse(fs.readFileSync(OUT, 'utf8')); } catch (e) {}
async function post(body) { for (let t = 0; t < 4; t++) { try { const r = await fetch(URL, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) }); if (r.ok) return r.json(); console.log('http', r.status); } catch (e) { console.log('erro', e.message); } await new Promise(r => setTimeout(r, 2000)); } throw new Error('falhou ' + JSON.stringify(body)); }
(async () => {
  for (const [cod, sig] of Object.entries(TIPOS)) for (let ano = 1995; ano <= 2026; ano++) {
    const k = sig + ano; if (out[k]) continue;
    const j = await post({ codigoTipoProposicao: +cod, ano: String(ano), numeroMaximoRegistro: 10000 });
    out[k] = (j.lista || []).map(p => ({ t: sig, n: p.numero, a: p.ano, au: p.autor, as: p.assunto, e: p.ementa }));
    if (out[k].length >= 10000) console.log('ATENÇÃO: limite atingido em', k);
    console.log(k, out[k].length); fs.writeFileSync(OUT, JSON.stringify(out));
    await new Promise(r => setTimeout(r, 400)); // gentil com o servidor
  }
  console.log('FIM', Object.values(out).reduce((a, l) => a + l.length, 0));
})();
