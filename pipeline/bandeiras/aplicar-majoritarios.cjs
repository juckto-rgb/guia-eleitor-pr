// Bandeiras dos 30 majoritários por fonte oficial (aprovado por Juliana em 02/10/2026)
// - pres/gov: plano de governo do TSE; senadores: site declarado + mandato (Câmara/Senado/ALEP)
// - ordem: do tema mais citado ao menos citado; sem ocupação; cria a bandeira Moradia
const fs = require('fs'); const S = __dirname + '/';
const FILE = __dirname + '/../../index.html';
let h = fs.readFileSync(FILE, 'utf8');
function rep(desc, from, to, expected = 1) {
  const n = h.split(from).length - 1;
  if (n !== expected) { console.error(`FALHOU [${desc}]: esperado ${expected}, achou ${n}`); process.exit(1); }
  h = h.split(from).join(to); console.log(`ok  ${desc} (${n}x)`);
}
const rows = JSON.parse(fs.readFileSync(S + 'revisao-bandeiras.json', 'utf8'));
const planos = JSON.parse(fs.readFileSync(S + 'planos.json', 'utf8'));
const PDF = id => 'https://divulgacandcontas.tse.jus.br/divulga/rest/arquivo/doc/' + id;
const PLANO_ID = { 0:'280017016005',1:'280017104726',2:'280016919931',3:'280017106566',4:'280017104778',5:'280017119534',6:'280017002789',7:'280017075366',8:'280016998007',9:'280017107286',10:'280017113380',11:'280017113417',12:'280017134368',
  13:'160017064155',14:'160017066734',15:'160017104577',16:'160017103411',17:'160017084909',18:'160017099452',19:'160017127485',20:'160017114109' };
const CAM = id => 'https://www.camara.leg.br/deputados/' + id;
const FONTES_SEN = {
  21: [['site declarado ao TSE', 'https://cristinagraeml.com.br']],
  22: [['página de propostas do site', 'https://gleisi131.com.br/propostasgleisi'], ['proposições na Câmara (2019–2026)', CAM(107283)], ['matérias no Senado (2011–2018)', 'https://www25.senado.leg.br/web/senadores/senador/-/perfil/5006']],
  23: [['página de propostas do site', 'https://alexandrecuri.com.br/propostas/'], ['proposições na ALEP (2003–2026)', 'https://consultas.assembleia.pr.leg.br/']],
  25: [['proposições na Câmara (2019–2026)', CAM(204411)]],
  28: [['página de propostas do site', 'https://www.drrosinha132.com.br'], ['proposições na Câmara (1999–2014)', CAM(73459)]],
  29: [['página do mandato no site', 'https://deltandallagnol.com.br/mandato/'], ['proposições na Câmara (2023)', CAM(220705)]],
};
const NOVO = {};
for (const r of rows) {
  let c;
  if (r.cargo !== 'Senador') {
    const k = (r.cargo === 'Presidente' ? 'pres:' : 'gov:') + r.nome; const p = planos[k].c;
    c = r.depois.slice().sort((a, b) => p[b][1] - p[a][1]);
    NOVO[r.pi] = { c, src: 'plano de governo (TSE)', of: 1, fl: [['plano de governo registrado no TSE', PDF(PLANO_ID[r.pi])]] };
  } else {
    const score = x => (r.ev[x].match(/\d+/g) || []).reduce((a, n) => a + +n, 0);
    c = r.depois.slice().sort((a, b) => score(b) - score(a));
    if (r.pi === 28) c.push('agro', 'social'); // decisão de 02/10: títulos explícitos no site
    NOVO[r.pi] = { c, src: c.length ? 'fontes oficiais' : 'sem fonte oficial', of: 1, fl: FONTES_SEN[r.pi] || [] };
  }
}
// 1) substitui as chaves 0..29 de SITE_CAUSAS
const i0 = h.indexOf('var SITE_CAUSAS = '); const s0 = h.indexOf('{', i0);
let d = 0, j = s0, st = false; for (; j < h.length; j++) { const ch = h[j]; if (st) { if (ch == '\\') j++; else if (ch == '"') st = false; continue; } if (ch == '"') st = true; else if (ch == '{') d++; else if (ch == '}') { d--; if (d === 0) break; } }
const SITE = JSON.parse(h.slice(s0, j + 1)); const nAntes = Object.keys(SITE).length;
for (let pi = 0; pi <= 29; pi++) delete SITE[pi];
const merged = {}; for (let pi = 0; pi <= 29; pi++) merged[pi] = NOVO[pi]; Object.assign(merged, SITE);
for (let pi = 0; pi <= 29; pi++) if (!merged[pi]) { console.error('faltou pi', pi); process.exit(1); }
h = h.slice(0, s0) + JSON.stringify(merged) + h.slice(j + 1);
console.log('ok  SITE_CAUSAS', nAntes, '→', Object.keys(merged).length, 'entradas');
// 2) causasOf leva o tipo "oficial" e os links das fontes
rep('causasOf', `if(SITE_CAUSAS[i]) return {list:SITE_CAUSAS[i].c.slice(), src:SITE_CAUSAS[i].src, auto:!!SITE_CAUSAS[i].auto};`,
  `if(SITE_CAUSAS[i]) return {list:SITE_CAUSAS[i].c.slice(), src:SITE_CAUSAS[i].src, auto:!!SITE_CAUSAS[i].auto, of:!!SITE_CAUSAS[i].of, fl:SITE_CAUSAS[i].fl||[]};`);
// 3) nota de fonte na ficha (só para fonte oficial)
rep('ficha bandeiras+nota',
  `    var bandeiras = _cz.list.length
      ? '<div class="prof-bandeiras"><div class="flags">'
        + _cz.list.map(function(s){ var mt=CAUSA_META[s]; return mt?'<span class="flag"><svg class="ico"><use href="'+mt[0]+'"/></svg>'+mt[1]+'</span>':''; }).join('')
        + '</div></div>'`,
  `    var _ofNote = '';
    if(_cz.of){
      var _fl = _cz.fl.map(function(f){ return '<a class="src-link" href="'+esc2(f[1])+'" target="_blank" rel="noopener nofollow">'+esc2(f[0])+(f[1].indexOf('/arquivo/doc/')>-1?' (PDF)':'')+'</a>'; });
      _ofNote = _cz.list.length
        ? '<p class="bandeira-src"><svg class="ico"><use href="#shield"/></svg><span>Temas presentes '+(_fl.length>1?'nas fontes oficiais: ':'no ')+_fl.join(', ')+'. Do mais citado ao menos citado.</span></p>'
        : '<p class="bandeira-src"><svg class="ico"><use href="#shield"/></svg><span>Sem proposta registrada em fonte oficial (plano de governo, site declarado ao TSE ou mandato). O guia não deduz bandeira pela profissão.</span></p>';
    }
    var bandeiras = (_cz.of && !_cz.list.length) ? '<div class="prof-bandeiras">'+_ofNote+'</div>' : _cz.list.length
      ? '<div class="prof-bandeiras"><div class="flags">'
        + _cz.list.map(function(s){ var mt=CAUSA_META[s]; return mt?'<span class="flag"><svg class="ico"><use href="'+mt[0]+'"/></svg>'+mt[1]+'</span>':''; }).join('')
        + '</div>'+_ofNote+'</div>'`);
// 4) bandeira Moradia (ícone c-moradia já existe no sprite)
rep('CAUSA_META moradia', `mobilidade:['#c-mobilidade','Mobilidade'],`, `mobilidade:['#c-mobilidade','Mobilidade'],moradia:['#c-moradia','Moradia'],`);
rep('filtro moradia', `      <button class="flag" data-causa="mobilidade"><svg class="ico"><use href="#c-mobilidade"/></svg>Mobilidade</button>\n`,
  `      <button class="flag" data-causa="mobilidade"><svg class="ico"><use href="#c-mobilidade"/></svg>Mobilidade</button>\n      <button class="flag" data-causa="moradia"><svg class="ico"><use href="#c-moradia"/></svg>Moradia</button>\n`);
fs.writeFileSync(FILE, h);
console.log('GRAVADO. bytes:', Buffer.byteLength(h));
for (let pi = 0; pi <= 29; pi++) console.log(pi, merged[pi].c.join(','));
