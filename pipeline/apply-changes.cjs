/* apply-changes.cjs — aplica remoções/adições no guia com RE-KEY (preserva o
 * enriquecimento por pi: ALEP, CAMFED, SENADO, CAMARA, VER_MUN, SITE_CAUSAS).
 *
 * Uso:
 *   node pipeline/apply-changes.cjs <changes.json>          # DRY-RUN (só relatório)
 *   node pipeline/apply-changes.cjs <changes.json> write    # grava ../index.html
 *
 * changes.json:
 *   { "remover": ["<sq>", ...],
 *     "deps":    [ {sq,nome,num,part,cargo,ocup,grau,idade}, ... ],   // novos (opcional)
 *     "detail":  { "<sq>": {nc,sit,nat,tot,proc,col,bens,hist,sup,sites,atual}, ... } } // detalhe dos novos
 *
 * pi = ordem DOM dos deputados (senador -> federal -> estadual), começando em 20.
 * Detalhe dos novos vem do TSE (browser). Depois: atualizar contagem/rodapé,
 * sincronizar pastas de deploy e subir index.html.
 */
const fs=require('fs'), path=require('path');
const FILE=process.argv[2], WRITE=process.argv[3]==='write';
if(!FILE){console.log('uso: node apply-changes.cjs <changes.json> [write]');process.exit(1);}
const upd=JSON.parse(fs.readFileSync(FILE,'utf8'));
upd.remover=upd.remover||[]; upd.deps=upd.deps||[]; upd.detail=upd.detail||{};
const HTML=path.join(__dirname,'..','index.html');
let h=fs.readFileSync(HTML,'utf8');

function grab(decl,o,c){const i=h.indexOf(decl);if(i<0)return null;const s=h.indexOf(o,i);let d=0,j=s,st=false;for(;j<h.length;j++){const ch=h[j];if(st){if(ch=='\\')j++;else if(ch=='"')st=false;continue;}if(ch=='"')st=true;else if(ch===o)d++;else if(ch===c){d--;if(d===0){return h.slice(s,j+1);}}}return null;}
const rawDEPS=grab('var DEPS = ','[',']'), DEPS=JSON.parse(rawDEPS);
const rawDD=grab('var DEP_DETAIL = ','{','}'), DD=JSON.parse(rawDD);
const raw={}; function readObj(n){const s=grab('var '+n+' = ','{','}');raw[n]=s;return s?JSON.parse(s):{};}
const ALEP=readObj('ALEP'),CAMFED=readObj('CAMFED'),SENADO=readObj('SENADO'),CAMARA=readObj('CAMARA'),VER_MUN=readObj('VER_MUN');
const rawSITE=grab('var SITE_CAUSAS = ','{','}'), SITE=JSON.parse(rawSITE);

function ordem(deps){const s=deps.filter(d=>d.cargo==='senador'),f=deps.filter(d=>d.cargo==='federal'),e=deps.filter(d=>d.cargo==='estadual');return s.concat(f).concat(e);}
const ordOld=ordem(DEPS);
const piToSq={}; ordOld.forEach((d,k)=>piToSq[20+k]=d.sq);
console.log('deputados atuais:',ordOld.length);

const removeSet=new Set(upd.remover);
upd.remover.forEach(sq=>{const d=DEPS.find(x=>x.sq===sq);console.log('  remover:',sq,d?('['+d.cargo+'] '+d.nome):'!! NÃO ESTÁ NO GUIA');});
const existSq=new Set(DEPS.map(d=>d.sq));
const add=upd.deps.filter(d=>!existSq.has(d.sq));
add.forEach(d=>console.log('  adicionar:',d.sq,'['+d.cargo+'] '+d.nome));

const DEPS2=DEPS.filter(d=>!removeSet.has(d.sq)).concat(add);
const ordNew=ordem(DEPS2);
const sqToNewPi={}; ordNew.forEach((d,k)=>sqToNewPi[d.sq]=20+k);
console.log('removidos:',DEPS.length-DEPS.filter(d=>!removeSet.has(d.sq)).length,'| adicionados:',add.length,'| deputados agora:',ordNew.length);

function rekey(obj,nome){const out={};let ok=0,perd=0;Object.keys(obj).forEach(k=>{const pi=+k;if(pi<20){out[pi]=obj[k];return;}const sq=piToSq[pi];if(!sq)return;if(removeSet.has(sq)){perd++;return;}const np=sqToNewPi[sq];if(np==null)return;out[np]=obj[k];ok++;});console.log('  '+nome+': re-keyed '+ok+' | descartado '+perd);return out;}
const ALEP2=rekey(ALEP,'ALEP'),CAMFED2=rekey(CAMFED,'CAMFED'),SENADO2=rekey(SENADO,'SENADO'),CAMARA2=rekey(CAMARA,'CAMARA'),VER2=rekey(VER_MUN,'VER_MUN'),SITE2=rekey(SITE,'SITE_CAUSAS');

// bandeiras novas (Fase 2): {sq:{c:[...],src:"..."}} -> injeta em SITE_CAUSAS no pi do DOM.
// ATENÇÃO ao off-by-one: sqToNewPi usa base 20 (20+idx), mas o pi do card no DOM é 21+idx
// (majoritários ocupam 0-20 = 21 cards; deputados começam em 21). No re-key as bases se
// cancelam (lê e grava em 20+k), então o enriquecimento existente fica DOM-alinhado sozinho;
// mas a INJEÇÃO é posição absoluta -> precisa +1 para bater com o data-pi do card.
const band=upd.bandeiras||{};
Object.keys(band).forEach(sq=>{ const base=sqToNewPi[sq]; if(base==null){console.log('  !! bandeira p/ sq fora do guia:',sq);return;} const domPi=base+1; SITE2[domPi]=band[sq]; const d=DEPS2.find(x=>x.sq===sq); console.log('  +bandeira: '+(d?d.nome:sq)+' -> pi'+domPi+' ['+band[sq].c.join(',')+'] ('+band[sq].src+')'); });

function verify(re,vOld,vNew,label){const d=ordOld.find(x=>new RegExp(re,'i').test(x.nome));if(!d)return;const o=20+ordOld.indexOf(d),n=sqToNewPi[d.sq];const a=JSON.stringify(vOld[o]||null),b=JSON.stringify(vNew[n]||null);console.log('  '+(a===b?'OK':'!!DIFERE')+' '+d.nome+' ['+label+']');}
console.log('\n--- verificação (dado por sq preservado) ---');
verify('ALEXANDRE CURI',ALEP,ALEP2,'ALEP');verify('LUISA CANZIANI',CAMFED,CAMFED2,'CAMFED');verify('DELTAN',CAMFED,CAMFED2,'CAMFED');

const cFed=DEPS2.filter(d=>d.cargo==='federal').length,cEst=DEPS2.filter(d=>d.cargo==='estadual').length,cSen=DEPS2.filter(d=>d.cargo==='senador').length;
console.log('\ncontagens: senador',cSen,'| federal',cFed,'| estadual',cEst);

if(!WRITE){console.log('\n[DRY-RUN] rode com "write" para gravar.');process.exit(0);}
const DD2=Object.assign({},DD,upd.detail); upd.remover.forEach(sq=>{delete DD2[sq];});
function repl(o,n,l){if(h.indexOf(o)<0){console.log('!! não achou '+l);process.exit(1);}h=h.split(o).join(JSON.stringify(n));}
repl(rawDEPS,DEPS2,'DEPS');repl(rawDD,DD2,'DEP_DETAIL');
repl(raw.ALEP,ALEP2,'ALEP');repl(raw.CAMFED,CAMFED2,'CAMFED');repl(raw.SENADO,SENADO2,'SENADO');repl(raw.CAMARA,CAMARA2,'CAMARA');repl(raw.VER_MUN,VER2,'VER_MUN');repl(rawSITE,SITE2,'SITE_CAUSAS');
fs.writeFileSync(HTML,h);
console.log('\nGRAVADO em ../index.html. DEPS:'+DEPS2.length+' | senador '+cSen+' federal '+cFed+' estadual '+cEst);
console.log('LEMBRE: atualizar contagem/rodapé, sincronizar pastas e subir index.html.');
