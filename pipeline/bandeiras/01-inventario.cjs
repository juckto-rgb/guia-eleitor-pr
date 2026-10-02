// Inventário das fontes oficiais de bandeira dos deputados (pi >= 30)
const fs = require('fs');
const h = fs.readFileSync(__dirname + '/../../index.html', 'utf8');
function grab(decl, o, c) { const i = h.indexOf(decl); if (i < 0) return null; const s = h.indexOf(o, i); let d = 0, j = s, st = false; for (; j < h.length; j++) { const ch = h[j]; if (st) { if (ch == '\\') j++; else if (ch == '"') st = false; continue; } if (ch == '"') st = true; else if (ch === o) d++; else if (ch === c) { d--; if (d === 0) return h.slice(s, j + 1); } } return null; }
const SITE = JSON.parse(grab('var SITE_CAUSAS = ', '{', '}')), ALEP = JSON.parse(grab('var ALEP = ', '{', '}')), CAMFED = JSON.parse(grab('var CAMFED = ', '{', '}')), SENADO = JSON.parse(grab('var SENADO = ', '{', '}')), CAMARA = JSON.parse(grab('var CAMARA = ', '{', '}')), VER = JSON.parse(grab('var VER_MUN = ', '{', '}'));
const DEPS = JSON.parse(grab('var DEPS = ', '[', ']')), DD = JSON.parse(grab('var DEP_DETAIL = ', '{', '}'));
const ord = ['senador', 'federal', 'estadual'].flatMap(c => DEPS.filter(d => d.cargo === c));
const SOCIAL = /instagram|facebook|fb\.com|fb\.me|tiktok|youtube|youtu\.be|twitter|x\.com|kwai|linkedin|t\.me|wa\.me|whatsapp|threads|flickr|spotify|deezer|linktr|beacons|bit\.ly|about\.me|goo\.gl|maps\.app|gmail\.com|hotmail|outlook|queroapoiar|giphy|pinterest|rumble|gettr|truthsocial|frameyu|docs\.google|forms\.gle|kwai/i;
const doms = str => { const out = []; const re = /([a-z0-9][a-z0-9-]*(?:\.[a-z0-9-]+)*\.(?:com\.br|org\.br|net\.br|adv\.br|med\.br|blog\.br|com|org|net|br|app|site|online|info))/gi; let m; while ((m = re.exec(str || ''))) { const d = m[1].toLowerCase().replace(/^www\./, ''); if (!SOCIAL.test(d) && !out.includes(d)) out.push(d); } return out; };
const rows = []; const st = { total: 0, fed: 0, est: 0, site: 0, camara: 0, alep: 0, senado: 0, ver: 0, nenhuma: 0, siteSocialAtual: 0, ocupAtual: 0, semAtual: 0 };
ord.forEach((d, idx) => {
  const pi = 21 + idx; if (pi < 30) return;
  const det = DD[d.sq] || {}; const ds = []; (det.sites || []).forEach(u => doms(u).forEach(x => { if (!ds.includes(x)) ds.push(x); }));
  const cam = (CAMFED[pi] && CAMFED[pi].cid) || (CAMARA[pi] && CAMARA[pi].camaraId) || null;
  const r = { pi, sq: d.sq, nome: d.nome, cargo: d.cargo, part: d.part, ocup: d.ocup, sites: ds, camara: cam, alep: !!ALEP[pi], alepAnos: ALEP[pi] && ALEP[pi].anos, senado: SENADO[pi] && SENADO[pi].cod, ver: VER[pi] || null,
    atual: SITE[pi] ? { c: SITE[pi].c, src: SITE[pi].src } : ALEP[pi] ? { c: ALEP[pi].c, src: 'ALEP' } : CAMFED[pi] ? { c: CAMFED[pi].c, src: 'CAMFED' } : SENADO[pi] ? { c: SENADO[pi].c, src: 'SENADO' } : { c: [], src: 'ocupação/nada' } };
  rows.push(r); st.total++; st[d.cargo === 'federal' ? 'fed' : 'est']++;
  if (ds.length) st.site++; if (cam) st.camara++; if (r.alep) st.alep++; if (r.senado) st.senado++; if (r.ver) st.ver++;
  if (!ds.length && !cam && !r.alep && !r.senado) st.nenhuma++;
  if (SITE[pi] && /rede social|nome/i.test(SITE[pi].src)) st.siteSocialAtual++;
});
fs.writeFileSync(__dirname + '/dep-inventario.json', JSON.stringify(rows));
console.log(st);
console.log('sem fonte oficial (só redes / nada), mas com vereança:', rows.filter(r => !r.sites.length && !r.camara && !r.alep && !r.senado && r.ver).length);
console.log('exemplo:', JSON.stringify(rows.slice(0, 3)));
