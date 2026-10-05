// Grava no guia os votos dos eleitos por município (TSE) e o contorno dos municípios (IBGE).
// Uso: node pipeline/votos-municipio-2026.cjs && node pipeline/inject-votos-mun-2026.cjs write
const fs = require('fs');
const path = require('path');
const FILE = path.join(__dirname, '..', 'index.html');
const V = JSON.parse(fs.readFileSync(path.join(__dirname, '_votos-mun-2026.json'), 'utf8'));
const G = JSON.parse(fs.readFileSync(path.join(__dirname, '_pr-mun-svg.json'), 'utf8'));
const falta = V.mun.filter(m => !G.d[m[0]]);
if (falta.length) { console.error('municípios sem contorno:', falta.map(m => m[1]).join(', ')); process.exit(1); }
const c = {}; Object.keys(V.c).forEach(k => { c[k] = 1; });
const sq = {}; Object.keys(V.sq).forEach(k => { sq[k] = { c: V.sq[k].c, v: V.sq[k].v, p: V.sq[k].p }; });
const data = { at: V.at, mun: V.mun.map(m => m[1]), c, sq };
const geo = { vb: G.vb, d: V.mun.map(m => G.d[m[0]]) };
const A = '/*VOTOS_MUN*/', Z = '/*FIM_VOTOS_MUN*/';
let h = fs.readFileSync(FILE, 'utf8');
const i = h.indexOf(A), j = h.indexOf(Z);
if (i < 0 || j < 0) { console.error('marcadores ' + A + ' / ' + Z + ' não encontrados no index.html'); process.exit(1); }
const novo = A + 'var VOTOS_MUN = ' + JSON.stringify(data) + '; var PR_MUN_SVG = ' + JSON.stringify(geo) + ';' + Z;
const eleitos = Object.keys(V.sq).length, cargos = Object.keys(V.c).join(', ');
console.log('eleitos:', eleitos, '· cargos:', cargos, '· municípios:', V.mun.length, '· leitura TSE', V.at, '· +' + Math.round(novo.length / 1024) + ' KB');
if (process.argv[2] === 'write') { h = h.slice(0, i) + novo + h.slice(j + Z.length); fs.writeFileSync(FILE, h); console.log('GRAVADO no guia'); }
else console.log('(simulação; use "write" para gravar)');
