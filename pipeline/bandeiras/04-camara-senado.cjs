// Ementas brutas de proposições normativas de autoria/coautoria: Câmara (PL/PLP/PEC/PDL) e Senado (PLS/PL/PEC/PLP/PDS/PDL/PRS)
// Saída: leg-bruto.json {pi:{camara:[{tipo,num,ano,ementa}], senado:[...]}}
const fs = require('fs'); const S = __dirname + '/';
const inv = JSON.parse(fs.readFileSync(S + 'dep-inventario.json', 'utf8'));
const ALVOS = {}; // pi -> {cam:[ids], sen:[cods]}
inv.forEach(r => { if (r.camara || r.senado) ALVOS[r.pi] = { cam: r.camara ? [r.camara] : [], sen: r.senado ? [r.senado] : [] }; });
Object.assign(ALVOS, { 22: { cam: [107283], sen: ['5006'] }, 25: { cam: [204411], sen: [] }, 28: { cam: [73459], sen: [] }, 29: { cam: [220705], sen: [] } });
const B = 'https://dadosabertos.camara.leg.br/api/v2';
const getJ = async u => { for (let t = 0; t < 4; t++) { try { const r = await fetch(u, { headers: { accept: 'application/json' } }); if (r.ok) return r.json(); } catch (e) {} await new Promise(r => setTimeout(r, 1500)); } throw new Error('falhou ' + u); };
async function camara(id) { const out = [];
  for (const tipo of ['PL', 'PLP', 'PEC', 'PDL']) for (let pg = 1; pg < 80; pg++) {
    const j = await getJ(`${B}/proposicoes?idDeputadoAutor=${id}&siglaTipo=${tipo}&dataApresentacaoInicio=1990-01-01&itens=100&pagina=${pg}&ordem=ASC&ordenarPor=id`);
    out.push(...j.dados.map(d => ({ id: d.id, tipo: d.siglaTipo, num: d.numero, ano: d.ano, ementa: d.ementa }))); if (j.dados.length < 100) break; }
  const seen = new Set(); return out.filter(p => !seen.has(p.id) && seen.add(p.id)); }
async function senado(cod) { const j = await getJ(`https://legis.senado.leg.br/dadosabertos/senador/${cod}/autorias?v=7`);
  const A = j.MateriasAutoriaParlamentar.Parlamentar.Autorias; if (!A) return [];
  return [].concat(A.Autoria).map(a => a.Materia).filter(m => /^(PLS|PL|PEC|PLP|PDS|PDL|PRS|PLC)$/.test(m.Sigla)).map(m => ({ tipo: m.Sigla, num: m.Numero, ano: m.Ano, ementa: m.Ementa })); }
(async () => {
  const out = {};
  for (const [pi, a] of Object.entries(ALVOS)) {
    out[pi] = { camara: [], senado: [] };
    try { for (const id of a.cam) out[pi].camara.push(...await camara(id)); for (const c of a.sen) out[pi].senado.push(...await senado(c)); }
    catch (e) { out[pi].err = e.message; }
    console.log(pi, 'câmara', out[pi].camara.length, 'senado', out[pi].senado.length, out[pi].err || '');
    fs.writeFileSync(S + 'leg-bruto.json', JSON.stringify(out));
  }
  console.log('FIM');
})();
