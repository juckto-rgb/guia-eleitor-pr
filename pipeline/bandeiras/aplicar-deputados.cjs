// Bandeiras dos deputados por fonte oficial (02/10/2026) + senadores com mandato recalculados sem cerimoniais
const fs = require('fs'); const S = __dirname + '/';
const FILE = __dirname + '/../../index.html';
let h = fs.readFileSync(FILE, 'utf8');
function rep(desc, from, to, expected = 1) { const n = h.split(from).length - 1; if (n !== expected) { console.error(`FALHOU [${desc}]: esperado ${expected}, achou ${n}`); process.exit(1); } h = h.split(from).join(to); console.log(`ok  ${desc} (${n}x)`); }
function grabObj(decl) { const i0 = h.indexOf(decl); const s0 = h.indexOf('{', i0); let d = 0, j = s0, st = false; for (; j < h.length; j++) { const ch = h[j]; if (st) { if (ch == '\\') j++; else if (ch == '"') st = false; continue; } if (ch == '"') st = true; else if (ch == '{') d++; else if (ch == '}') { d--; if (d === 0) break; } } return { s0, e: j + 1, obj: JSON.parse(h.slice(s0, j + 1)) }; }
const dep = JSON.parse(fs.readFileSync(S + 'dep-bandeiras.json', 'utf8'));
const rev = JSON.parse(fs.readFileSync(S + 'revisao-bandeiras.json', 'utf8'));
const SITE_SEN = { 22: ['página de propostas do site', 'https://gleisi131.com.br/propostasgleisi'], 23: ['página de propostas do site', 'https://alexandrecuri.com.br/propostas/'], 28: ['página de propostas do site', 'https://www.drrosinha132.com.br'], 29: ['página do mandato no site', 'https://deltandallagnol.com.br/mandato/'] };
const sc = grabObj('var SITE_CAUSAS = '); const SITE = sc.obj; const old = JSON.parse(JSON.stringify(SITE));
const st = { comBandeira: 0, semBandeira: 0, mantidoSiteAntigo: 0 };
for (const [pi, x] of Object.entries(dep)) {
  const p = +pi; const score = {}; x.c.forEach((k, i) => score[k] = 1000 - i); // ordem já vem por força da evidência
  let fl = x.fl.slice();
  if ([22, 23, 25, 28, 29].includes(p)) { // senadores: soma a parte do site (já revisada) ao mandato recalculado
    const r = rev.find(r => r.pi === p); for (const [k, ev] of Object.entries(r.ev)) { const m = ev.match(/site: (\d+)/); if (m) score[k] = (score[k] || 0) + +m[1]; }
    if (SITE_SEN[p]) fl = [SITE_SEN[p]].concat(fl);
    if (p === 28) { score.agro = score.agro || 1; score.social = score.social || 1; } // títulos explícitos no site (decisão 02/10)
  }
  let c = Object.keys(score).sort((a, b) => score[b] - score[a]);
  if (!c.length && old[p] && old[p].src && !old[p].auto && !/rede social|nome|partido|fontes oficiais|plano/i.test(old[p].src) && p >= 30) {
    c = old[p].c.slice(); fl = [['site declarado ao TSE', 'https://' + old[p].src.replace(/^https?:\/\//i, '')]]; st.mantidoSiteAntigo++; // site saiu do ar depois da leitura anterior
  }
  SITE[p] = { c, src: c.length ? 'fontes oficiais' : 'sem fonte oficial', of: 1, fl: c.length ? fl : [] };
  if (p >= 30) c.length ? st.comBandeira++ : st.semBandeira++;
}
h = h.slice(0, sc.s0) + JSON.stringify(SITE) + h.slice(sc.e);
console.log('SITE_CAUSAS', Object.keys(old).length, '→', Object.keys(SITE).length, st);
// ALEP: remove o bloco atribuído por engano ao Sargento dos Santos (41 anos, nunca foi deputado estadual)
const al = grabObj('var ALEP = '); if (!al.obj['186']) { console.error('ALEP 186 não encontrado'); process.exit(1); }
delete al.obj['186']; h = h.slice(0, al.s0) + JSON.stringify(al.obj) + h.slice(al.e); console.log('ok  ALEP 186 removido');
// nota da ficha: avisa que cerimoniais não contam quando há mandato
rep('nota cerimoniais', `+'. Do mais citado ao menos citado.</span></p>'`,
  `+'. Do mais citado ao menos citado.'+(_cz.fl.some(function(f){return /proposi|matérias/.test(f[0]);})?' Projetos cerimoniais (título, nome de rua, data comemorativa) não contam.':'')+'</span></p>'`);
rep('texto ALEP', `As bandeiras acima vêm do assunto/ementa dessas proposições.`, `As bandeiras acima consideram as ementas dessas proposições, sem as cerimoniais.`, 2);
rep('texto Senado', `As bandeiras acima vêm da ementa dessas matérias`, `As bandeiras acima consideram a ementa dessas matérias, sem as cerimoniais`);
fs.writeFileSync(FILE, h); console.log('GRAVADO. bytes:', Buffer.byteLength(h));
