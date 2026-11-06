// Grava no guia o dinheiro de campanha lido por gastos-2026.cjs.
// Uso: node pipeline/gastos-2026.cjs && node pipeline/inject-gastos-2026.cjs write
const fs = require('fs');
const path = require('path');
const FILE = path.join(__dirname, '..', 'index.html');
const G = JSON.parse(fs.readFileSync(path.join(__dirname, '_gastos-2026.json'), 'utf8'));
const A = '/*GASTOS*/', Z = '/*FIM_GASTOS*/', ANTES = '/*VOTOS_MUN*/';
let h = fs.readFileSync(FILE, 'utf8');
const novo = A + 'var GASTOS_2026 = ' + JSON.stringify(G) + ';' + Z;
const i = h.indexOf(A), j = h.indexOf(Z);
if (i >= 0 && j >= 0) h = h.slice(0, i) + novo + h.slice(j + Z.length);
else { const k = h.indexOf(ANTES); if (k < 0) { console.error('marcador ' + ANTES + ' não encontrado no index.html'); process.exit(1); } h = h.slice(0, k) + novo + '\n  ' + h.slice(k); }
console.log('candidatos com prestação final:', Object.keys(G.sq).length, '· leitura', G.at, '· +' + Math.round(novo.length / 1024) + ' KB');
if (process.argv[2] === 'write') { fs.writeFileSync(FILE, h); console.log('GRAVADO no guia'); }
else console.log('(simulação; use "write" para gravar)');
