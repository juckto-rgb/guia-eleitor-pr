// Alexandre Curi: bandeiras do site + ALEP completa (consulta feita em 02/10/2026 pela interface da ALEP)
// ALEP: 1.481 proposições (2003–2026); 553 normativas (PL 525, PLC 14, PEC 9, PDL 5); regra: tema com >=2 proposições
const fs = require('fs');
const FILE = __dirname + '/../../index.html';
let h = fs.readFileSync(FILE, 'utf8');
function rep(desc, from, to) { const n = h.split(from).length - 1; if (n !== 1) { console.error(`FALHOU [${desc}]: achou ${n}`); process.exit(1); } h = h.replace(from, to); console.log('ok ', desc); }
const i0 = h.indexOf('var SITE_CAUSAS = '); const k = h.indexOf('"23":{', i0); const e = h.indexOf('}', h.indexOf('"fl":', k)); // fl termina em ]]}
const old23 = h.slice(k, h.indexOf(']]}', k) + 3);
if (!old23.startsWith('"23":{"c":[') || !old23.includes('alexandrecuri')) { console.error('trecho 23 inesperado:', old23); process.exit(1); }
const novo = { c: ['educacao','infra','economia','esporte','cultura','seguranca','saude','agro','social','inclusao','inovacao','ambiente','mobilidade','animal','transparencia','moradia'],
  src: 'fontes oficiais', of: 1, fl: [['página de propostas do site', 'https://alexandrecuri.com.br/propostas/'], ['proposições na ALEP (2003–2026)', 'https://transparencia.assembleia.pr.leg.br/plenario/atividade-por-parlamentar']] };
rep('SITE_CAUSAS 23', old23, '"23":' + JSON.stringify(novo));
rep('ALEP 23', '"23":{"c":["inclusao","saude","seguranca"],"total":1472,"pl":536,"tematicas":331,"anos":"2003-2026"}',
  '"23":{"c":["educacao","infra","esporte"],"total":1481,"pl":525,"tematicas":179,"anos":"2003-2026"}');
fs.writeFileSync(FILE, h); console.log('GRAVADO', Buffer.byteLength(h));
