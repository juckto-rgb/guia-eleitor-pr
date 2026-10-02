// Bandeiras dos deputados (e re-cálculo dos senadores com mandato) por fonte oficial, sem inferência.
// Site declarado ao TSE: tema com >=2 termos distintos (só se o site citar o nome do candidato).
// Mandato (Câmara/Senado/ALEP): tema com >=2 proposições normativas NÃO cerimoniais.
const fs = require('fs'); const S = __dirname + '/';
const R = require(__dirname + '/../rules.js'); R.saude = R.saude.map(p => p === 'sus' ? '\\bsus\\b' : p);
const RX = Object.fromEntries(Object.entries(R).map(([k, v]) => [k, v.map(p => new RegExp(p, 'g'))]));
const norm = s => (s || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/cnpj:? ?[\d./-]{8,}/g, ' ').replace(/\s+/g, ' ');
const inv = JSON.parse(fs.readFileSync(S + 'dep-inventario.json', 'utf8'));
const sites = JSON.parse(fs.readFileSync(S + 'dep-sites-texto2.json', 'utf8'));
const leg = JSON.parse(fs.readFileSync(S + 'leg-bruto.json', 'utf8'));
let alep = {}; try { alep = JSON.parse(fs.readFileSync(S + 'alep-por-pi.json', 'utf8')); } catch (e) {}
// cerimonial = não é plano de trabalho (decisão de 02/10/2026)
const CER = /^(denomina|da denominacao|atribui (a )?denominacao|altera (a )?denominacao|confere|concede (o )?titulo|declara de utilidade publica|considera de utilidade publica|reconhece (como )?de utilidade publica)|utilidade publica|titulo de cidada|cidadao (honorario|benemerito)|cidadania honoraria|titulo honorifico|honra ao merito|comenda|medalha|institui (o|a) (dia|semana|mes|ano)\b|\bdia (estadual|nacional|municipal|mundial) d|semana (estadual|nacional) d|calendario oficial|data comemorativa|inclui no calendario|capital (estadual|nacional|paranaense|brasileira) d|\bpatrono\b|\bpatrona\b|livro dos herois|heroi(na)? da patria|panteao/;
const isCer = e => CER.test(norm(e).trim());
const STOP = new Set(['doutor', 'doutora', 'professor', 'professora', 'pastor', 'pastora', 'delegado', 'delegada', 'sargento', 'cabo', 'soldado', 'coronel', 'capitao', 'tenente', 'irmao', 'irma', 'coletivo', 'mandato', 'coletiva', 'enfermeira', 'enfermeiro', 'vereador', 'vereadora', 'prefeito', 'deputado', 'deputada', 'bispo', 'padre', 'missionario', 'missionaria', 'dona', 'seu', 'tio', 'tia', 'do', 'da', 'de', 'dos', 'das', 'e', 'pr', 'filho', 'junior', 'neto', 'sobrinho']);
const nameTokens = n => norm(n).replace(/[^a-z\s]/g, ' ').split(' ').filter(t => t.length >= 4 && !STOP.has(t));
function siteCausas(pi, nome) {
  const s = sites[pi]; if (!s || !s.pages) return { ok: false, motivo: s ? s.err : 'sem leitura' };
  const t = norm(s.pages.map(p => p.text).join(' '));
  const tk = nameTokens(nome); if (tk.length && !tk.some(x => t.includes(x))) return { ok: false, motivo: 'site não cita o nome do candidato (' + s.dom + ')' };
  if (t.length < 300) return { ok: false, motivo: 'site sem texto legível (' + s.dom + ')' };
  const c = {}; for (const k in RX) { const n = RX[k].filter(re => { re.lastIndex = 0; return re.test(t); }).length; if (n >= 2) c[k] = n; }
  return { ok: true, dom: s.dom, url: s.pages[0].url, c };
}
function legCausas(list) {
  const valid = list.filter(p => !isCer(p.ementa) && !/UTILIDADE P|HONOR[IÍ]F|DENOMINA|^DATA$/i.test(p.assunto || '')); const c = {};
  for (const p of valid) { const t = norm(p.ementa); for (const k in RX) if (RX[k].some(re => { re.lastIndex = 0; return re.test(t); })) c[k] = (c[k] || 0) + 1; }
  for (const k in c) if (c[k] < 2) delete c[k];
  const anos = valid.map(p => +p.ano).filter(Boolean);
  return { total: list.length, validas: valid.length, cer: list.length - valid.length, anos: anos.length ? (Math.min(...anos) === Math.max(...anos) ? '' + anos[0] : Math.min(...anos) + '–' + Math.max(...anos)) : '', c };
}
const CAM = id => 'https://www.camara.leg.br/deputados/' + id;
const out = {}; const st = { comBandeira: 0, semFonte: 0, site: 0, camara: 0, senado: 0, alep: 0, siteRecusado: 0 };
const alvos = inv.concat([22, 23, 25, 28, 29].map(pi => ({ pi, nome: { 22: 'GLEISI HOFFMANN', 23: 'ALEXANDRE CURI', 25: 'FILIPE BARROS', 28: 'ROSINHA', 29: 'DELTAN DALLAGNOL' }[pi], sites: [], senadorMaj: true })));
for (const r of alvos) {
  const sc = {}, fl = [], notas = [];
  if (!r.senadorMaj && r.sites.length) { const s = siteCausas(r.pi, r.nome);
    if (s.ok) { st.site++; for (const k in s.c) sc[k] = (sc[k] || 0) + s.c[k]; fl.push(['site declarado ao TSE', s.url]); } else { notas.push(s.motivo); if (/nome/.test(s.motivo)) st.siteRecusado++; } }
  const L = leg[r.pi];
  if (L && L.camara.length) { const x = legCausas(L.camara); st.camara++; for (const k in x.c) sc[k] = (sc[k] || 0) + x.c[k]; fl.push(['proposições na Câmara (' + x.anos + ')', CAM((inv.find(i => i.pi === r.pi) || {}).camara || { 22: 107283, 25: 204411, 28: 73459, 29: 220705 }[r.pi])]); notas.push(`Câmara: ${x.total} normativas, ${x.cer} cerimoniais fora`); }
  if (L && L.senado.length) { const x = legCausas(L.senado); st.senado++; for (const k in x.c) sc[k] = (sc[k] || 0) + x.c[k]; fl.push(['matérias no Senado (' + x.anos + ')', 'https://www25.senado.leg.br/web/senadores/senador/-/perfil/' + ((inv.find(i => i.pi === r.pi) || {}).senado || '5006')]); notas.push(`Senado: ${x.total} normativas, ${x.cer} cerimoniais fora`); }
  if (alep[r.pi]) { const x = legCausas(alep[r.pi].lista); st.alep++; for (const k in x.c) sc[k] = (sc[k] || 0) + x.c[k]; fl.push(['proposições na ALEP (' + x.anos + ')', 'https://transparencia.assembleia.pr.leg.br/plenario/atividade-por-parlamentar']); notas.push(`ALEP: ${x.total} normativas, ${x.cer} cerimoniais fora`); }
  const c = Object.keys(sc).sort((a, b) => sc[b] - sc[a]);
  if (c.length) st.comBandeira++; else st.semFonte++;
  out[r.pi] = { nome: r.nome, cargo: r.cargo || 'senador', c, fl, notas, pend: !r.senadorMaj && r.alep && !alep[r.pi] };
}
fs.writeFileSync(S + 'dep-bandeiras.json', JSON.stringify(out));
console.log(st, 'ALEP pendentes:', Object.values(out).filter(x => x.pend).length);
for (const pi of [22, 23, 25, 28, 29]) console.log(pi, out[pi].nome, out[pi].c.join(','), '|', out[pi].notas.join(' · '));
const amostra = Object.entries(out).filter(([pi]) => +pi >= 30).slice(0, 12);
amostra.forEach(([pi, x]) => console.log(pi, x.nome, '→', x.c.join(',') || '(sem)', '|', x.notas.join(' · ')));
