// Dinheiro de campanha: receitas e despesas contratadas da prestação de contas FINAL de cada candidato da urna, direto dos dados abertos do TSE.
// Só entra prestação marcada como final; parcial e relatório financeiro ficam de fora. Não guarda doador, fornecedor nem CPF, só totais por origem e por tipo.
// Saída: pipeline/_gastos-2026.json
// Uso: node pipeline/resultados-2026.cjs && node pipeline/gastos-2026.cjs [pasta com os csv já extraídos]
const fs = require('fs');
const os = require('os');
const path = require('path');
const { execFileSync } = require('child_process');
const ZIP = 'https://cdn.tse.jus.br/estatistica/sead/odsele/prestacao_contas/prestacao_de_contas_eleitorais_candidatos_2026.zip';
const ARQS = ['receitas_candidatos_2026_PR.csv', 'receitas_candidatos_2026_BR.csv', 'despesas_contratadas_candidatos_2026_PR.csv', 'despesas_contratadas_candidatos_2026_BR.csv'];
const TOP_DESP = 5; // tipos de despesa mostrados na ficha; o restante vira "Outras despesas"
const AVISO_2T = { ate: '14/11/2026', quando: Date.UTC(2026, 10, 15, 3) }; // prazo da prestação de quem foi ao 2º turno (Lei 9.504, art. 29)

const baixa = () => {
  const d = path.join(os.tmpdir(), 'guia-contas-2026'); fs.mkdirSync(d, { recursive: true });
  const z = path.join(d, 'contas.zip');
  console.log('baixando a base do TSE (cerca de 375 MB)...');
  execFileSync('curl', ['-sL', ZIP, '-o', z]);
  execFileSync('unzip', ['-o', '-q', z, ...ARQS, '-d', d]);
  fs.unlinkSync(z);
  return d;
};
const DIR = process.argv[2] || baixa();
const R = JSON.parse(fs.readFileSync(path.join(__dirname, '_resultados-2026.json'), 'utf8')).cargos;
const urna = {};
for (const cg of ['presidente', 'governador', 'senador', 'federal', 'estadual']) R[cg].cands.forEach(k => { urna[k.sq] = { cg, st: k.st || '' }; });

// csv do TSE: latin1, separador ";", campos entre aspas
const parse = l => { const o = []; let c = '', q = false; for (let i = 0; i < l.length; i++) { const h = l[i]; if (q) { if (h === '"') { if (l[i + 1] === '"') { c += '"'; i++; } else q = false; } else c += h; } else if (h === '"') q = true; else if (h === ';') { o.push(c); c = ''; } else c += h; } o.push(c); return o; };
const num = s => Math.round((parseFloat(String(s).replace(/\./g, '').replace(',', '.')) || 0) * 100); // centavos, para somar sem erro de arredondamento
const ler = (f, cb) => { const t = fs.readFileSync(path.join(DIR, f), 'latin1').split(/\r?\n/); const cab = parse(t[0]); for (let i = 1; i < t.length; i++) { if (!t[i]) continue; const v = parse(t[i]), o = {}; cab.forEach((c, k) => { o[c] = v[k]; }); cb(o); } };

const D = {}, outros = {};
let gerado = '';
const base = (o) => { gerado = o.DT_GERACAO + ' ' + o.HH_GERACAO; const sq = o.SQ_CANDIDATO; if (!urna[sq]) return null; if (!/final/i.test(o.TP_PRESTACAO_CONTAS)) { outros[sq] = o.TP_PRESTACAO_CONTAS; return null; } const d = D[sq] = D[sq] || { rec: {}, desp: {}, dts: new Set(), tur: new Set(), ids: {} }; d.dts.add(o.DT_PRESTACAO_CONTAS); d.tur.add(o.ST_TURNO); d.ids = { cargo: o.CD_CARGO, part: o.NR_PARTIDO, num: o.NR_CANDIDATO, uf: o.SG_UE, ele: o.CD_ELEICAO }; return d; };
for (const uf of ['PR', 'BR']) {
  ler('receitas_candidatos_2026_' + uf + '.csv', o => { const d = base(o); if (d) { const k = o.DS_ORIGEM_RECEITA; d.rec[k] = (d.rec[k] || 0) + num(o.VR_RECEITA); } });
  ler('despesas_contratadas_candidatos_2026_' + uf + '.csv', o => { const d = base(o); if (d) { const k = o.DS_ORIGEM_DESPESA; d.desp[k] = (d.desp[k] || 0) + num(o.VR_DESPESA_CONTRATADA); } });
}

const O = [], T = [], ix = (L, s) => { let i = L.indexOf(s); if (i < 0) { L.push(s); i = L.length - 1; } return i; };
const brl = c => c / 100;
const data = (d) => [...d].sort((a, b) => a.split('/').reverse().join('').localeCompare(b.split('/').reverse().join(''))).pop();
const b = new Date(Date.now() - 3 * 3600e3), p = n => String(n).padStart(2, '0');
const out = { at: p(b.getUTCDate()) + '/' + p(b.getUTCMonth() + 1) + '/' + b.getUTCFullYear(), gerado, o: O, t: T, sq: {} };
const amostra = [], nuloDesp = [];
let semFim = 0;
for (const sq of Object.keys(urna)) {
  const d = D[sq];
  if (!d) { semFim++; continue; }
  if (d.tur.size > 1 || d.dts.size > 1) console.log('ATENÇÃO mais de uma prestação final', sq, [...d.tur], [...d.dts]);
  // valor zero não vira linha na ficha; "#NULO" é campo vazio na base do TSE
  const lista = (m, vazio) => Object.entries(m).filter(x => x[1] !== 0).map(x => [x[0] === '#NULO' ? vazio : x[0], x[1]]).sort((x, y) => y[1] - x[1]);
  Object.entries(d.desp).forEach(x => { if (x[0] === '#NULO') nuloDesp.push([sq, x[1]]); });
  const rec = lista(d.rec, 'Origem não informada');
  const desp = lista(d.desp, 'Tipo não informado');
  const totR = rec.reduce((a, x) => a + x[1], 0), totD = desp.reduce((a, x) => a + x[1], 0);
  const outras = desp.slice(TOP_DESP).reduce((a, x) => a + x[1], 0);
  out.sq[sq] = [brl(totR), rec.map(x => [ix(O, x[0]), brl(x[1])]), brl(totD), desp.slice(0, TOP_DESP).map(x => [ix(T, x[0]), brl(x[1])]), brl(outras), data(d.dts)];
  amostra.push({ sq, cg: urna[sq].cg, st: urna[sq].st, ...d.ids, rec: brl(totR), desp: brl(totD) });
}
// quem foi ao 2º turno ainda pode entregar até o prazo: a ficha avisa até lá
if (Date.now() < AVISO_2T.quando) { out.t2 = { ate: AVISO_2T.ate, sq: {} }; Object.keys(urna).filter(s => /2º turno/i.test(urna[s].st)).forEach(s => { out.t2.sq[s] = 1; }); }

fs.writeFileSync(path.join(__dirname, '_gastos-2026.json'), JSON.stringify(out));
console.log('candidatos da urna:', Object.keys(urna).length, '· com prestação final:', Object.keys(out.sq).length, '· sem:', semFim, '· base do TSE gerada em', gerado);
console.log('origens:', O.length, '· tipos de despesa:', T.length, '· despesas sem tipo no TSE:', nuloDesp.length, 'candidatos, R$', brl(nuloDesp.reduce((a, x) => a + x[1], 0)), '· com valor:', nuloDesp.filter(x => x[1] !== 0).length);
if (process.env.AMOSTRA) fs.writeFileSync(process.env.AMOSTRA, JSON.stringify(amostra));
