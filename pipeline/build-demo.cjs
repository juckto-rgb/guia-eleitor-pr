/* build-demo.cjs — monta o dataset demográfico do P4 (infográficos) a partir de:
 *  - DEPS (guia): sq -> part, cargo(sen/fed/est)
 *  - _majmap.json: sq -> part, cargo(presidente/governador)  [da lista do TSE]
 *  - _enrich-2026-09-09.json: sq -> cor, sexo, grau, nasc     [detalhe do TSE]
 * Saída: pipeline/_demo.json = array compacto {c,p,s,r,e,f} p/ embutir no guia.
 */
const fs=require('fs'),path=require('path');
const R=p=>path.join(__dirname,p);
let h=fs.readFileSync(R('../index.html'),'utf8');
function grab(decl,o,c){const i=h.indexOf(decl);const s=h.indexOf(o,i);let d=0,j=s,st=false;for(;j<h.length;j++){const ch=h[j];if(st){if(ch=='\\')j++;else if(ch=='"')st=false;continue;}if(ch=='"')st=true;else if(ch===o)d++;else if(ch===c){d--;if(d===0)return h.slice(s,j+1);}}return null;}
const DEPS=JSON.parse(grab('var DEPS = ','[',']'));
const MAJ=JSON.parse(fs.readFileSync(R('_majmap.json'),'utf8'));
const E=JSON.parse(fs.readFileSync(R('_enrich-2026-09-09.json'),'utf8'));

const CARGOMAP={presidente:'pres',governador:'gov',senador:'sen',federal:'fed',estadual:'est'};
const COR={BRANCA:'Branca',PARDA:'Parda',PRETA:'Preta',AMARELA:'Amarela','INDÍGENA':'Indígena'};
function faixa(nasc){ if(!nasc)return null; const b=new Date(nasc), ref=new Date('2026-10-04'); let a=ref.getFullYear()-b.getFullYear(); const m=ref.getMonth()-b.getMonth(); if(m<0||(m===0&&ref.getDate()<b.getDate()))a--; if(a<30)return'18–29'; if(a<45)return'30–44'; if(a<60)return'45–59'; return'60+'; }
function esc(g){ if(!g)return null; g=g.toLowerCase(); if(g.indexOf('superior')>-1)return'Superior'; if(g.indexOf('médio')>-1||g.indexOf('medio')>-1)return'Médio'; if(g.indexOf('fundamental')>-1)return'Fundamental'; if(g.indexOf('lê e escreve')>-1||g.indexOf('le e escreve')>-1)return'Lê e escreve'; return'Outro'; }

const DEMO=[]; let miss=0;
function push(sq, part, cargoSlug){ const e=E[sq]; if(!e){miss++;return;} DEMO.push({c:cargoSlug, p:part||'?', s:e.sexo==='FEM.'?'F':'M', r:COR[e.cor]||e.cor, e:esc(e.grau), f:faixa(e.nasc)}); }

DEPS.forEach(d=>push(String(d.sq), d.part, CARGOMAP[d.cargo]||d.cargo));
Object.keys(MAJ).forEach(sq=>push(sq, MAJ[sq].part, CARGOMAP[MAJ[sq].cargo]));

fs.writeFileSync(R('_demo.json'), JSON.stringify(DEMO));
// relatório
function dist(f){const d={};DEMO.forEach(x=>d[x[f]]=(d[x[f]]||0)+1);return d;}
console.log('DEMO total:',DEMO.length,'| sem enrich:',miss);
console.log('cargo:',JSON.stringify(dist('c')));
console.log('sexo:',JSON.stringify(dist('s')));
console.log('cor:',JSON.stringify(dist('r')));
console.log('escol:',JSON.stringify(dist('e')));
console.log('faixa:',JSON.stringify(dist('f')));
const parts=[...new Set(DEMO.map(x=>x.p))].sort();
console.log('partidos ('+parts.length+'):',parts.join(', '));
