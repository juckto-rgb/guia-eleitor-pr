/* inject-resultados-2026.cjs — grava no guia (var RES_2026) a apuração oficial do 1º turno lida por resultados-2026.cjs.
 *
 * Uso:  node pipeline/resultados-2026.cjs && node pipeline/inject-resultados-2026.cjs [write]
 *
 * RES_2026 = { at: "dd/mm/aaaa hh:mm" (hora da leitura, Brasília),
 *              c:  { cargo: { pst: "% seções apuradas", tf: "s"|"n" (totalização final), hg: "hora TSE" } },
 *              sq: { sqcand: [votos, "%", "situação TSE"] }   // senador, deputados (código do candidato)
 *              n:  { presidente: { numero: [...] }, governador: { numero: [...] } } }   // majoritários pelo número
 * Só a situação informada pelo TSE (campo st) é exibida; nada de projeção.
 */
const fs = require('fs'), path = require('path');
const WRITE = process.argv.includes('write');
const R = JSON.parse(fs.readFileSync(path.join(__dirname, '_resultados-2026.json'), 'utf8'));
const F = path.join(__dirname, '..', 'index.html');
let h = fs.readFileSync(F, 'utf8');
const brt = new Date(Date.now() - 3 * 3600e3); const p2 = n => String(n).padStart(2, '0');
const RES = { at: `${p2(brt.getUTCDate())}/${p2(brt.getUTCMonth() + 1)}/${brt.getUTCFullYear()} ${p2(brt.getUTCHours())}:${p2(brt.getUTCMinutes())}`, c: {}, sq: {}, n: { presidente: {}, governador: {} } };
for (const [cargo, x] of Object.entries(R.cargos)) {
  RES.c[cargo] = { pst: x.pst || '0,00', tf: x.tf || 'n', hg: x.hg || '', dg: x.dg || '' };
  for (const k of x.cands) {
    const v = [k.vap, k.pvap, k.st || '', k.sq]; // 4º campo: código do candidato (cruza com o perfil dos eleitos)
    if (cargo === 'presidente' || cargo === 'governador') RES.n[cargo][k.n] = v; else RES.sq[k.sq] = v;
  }
}
const resumo = Object.entries(RES.c).map(([c, x]) => `${c}: ${x.pst}% apurado, final=${x.tf}, eleitos=${(R.cargos[c].cands || []).filter(k => /^eleito/i.test(k.st)).length}, 2º turno=${(R.cargos[c].cands || []).filter(k => /2º turno/.test(k.st)).length}`);
console.log(resumo.join('\n'));
const decl = 'var RES_2026 = ';
const i = h.indexOf(decl); if (i < 0) { console.error('marcador var RES_2026 não encontrado no guia'); process.exit(1); }
const s = h.indexOf('{', i); let d = 0, j = s, st = false;
for (; j < h.length; j++) { const ch = h[j]; if (st) { if (ch == '\\') j++; else if (ch == '"') st = false; continue; } if (ch == '"') st = true; else if (ch == '{') d++; else if (ch == '}') { d--; if (!d) break; } }
h = h.slice(0, s) + JSON.stringify(RES) + h.slice(j + 1);
if (WRITE) { fs.writeFileSync(F, h); console.log('GRAVADO no guia · leitura', RES.at); } else console.log('[dry-run] rode com "write" para gravar');
