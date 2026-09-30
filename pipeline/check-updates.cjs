/* check-updates.cjs — ROTINA "SOB COMANDO" de checagem de atualizações (TSE)
 *
 * Por que existe: o TSE tem WAF que bloqueia curl/node (403). A checagem só
 * funciona por um NAVEGADOR real no domínio divulgacandcontas.tse.jus.br.
 * Este script NÃO fala com o TSE — ele lê o guia atual (../index.html),
 * extrai os sq's por cargo e GERA o payload JS (_probe.js) que deve ser
 * COLADO no console do navegador (aba aberta no domínio do TSE).
 *
 * Fluxo da rotina:
 *   1) node pipeline/check-updates.cjs        -> gera pipeline/_probe.js
 *   2) Abrir https://divulgacandcontas.tse.jus.br/divulga/ no navegador
 *   3) Colar o conteúdo de _probe.js (XHR síncrono) -> retorna o relatório JSON
 *   4) Ler o relatório: adicionar[] / remover[] por cargo
 *      - remover: aplicar com apply-changes.cjs (re-key preserva enriquecimento)
 *      - adicionar: puxar detalhe do TSE (browser) e aplicar com apply-changes.cjs
 *   5) Atualizar contagem/rodapé, sincronizar pastas, avisar p/ subir index.html
 *
 * Códigos de cargo TSE: 1=Presidente(UF BR), 3=Governador, 5=Senador,
 *   6=Dep.Federal, 7=Dep.Estadual. Eleição PR: 20322002026.
 * Status "válidos" (que ENTRAM no guia): "Aguardando julgamento", "Deferido".
 *   Qualquer outro (Renúncia, Indeferido, Falecido, Cassado...) = fora do guia.
 */
const fs=require('fs'), path=require('path');
const HTML=path.join(__dirname,'..','index.html');
let h=fs.readFileSync(HTML,'utf8');

function grab(decl,o,c){const i=h.indexOf(decl);if(i<0)return null;const s=h.indexOf(o,i);let d=0,j=s,st=false;for(;j<h.length;j++){const ch=h[j];if(st){if(ch=='\\')j++;else if(ch=='"')st=false;continue;}if(ch=='"')st=true;else if(ch===o)d++;else if(ch===c){d--;if(d===0){return h.slice(s,j+1);}}}return null;}
const DEPS=JSON.parse(grab('var DEPS = ','[',']'));
const g={
  senador: DEPS.filter(d=>d.cargo==='senador').map(d=>d.sq),
  federal: DEPS.filter(d=>d.cargo==='federal').map(d=>d.sq),
  estadual:DEPS.filter(d=>d.cargo==='estadual').map(d=>d.sq)
};
console.log('guia atual -> senador:'+g.senador.length+' federal:'+g.federal.length+' estadual:'+g.estadual.length);

const probe =
'(function(){\n'+
'  var G='+JSON.stringify(g)+';\n'+
'  var VALID={"Aguardando julgamento":1,"Deferido":1};\n'+
'  function f(uf,cargo){var x=new XMLHttpRequest();x.open("GET","/divulga/rest/v1/candidatura/listar/2026/"+uf+"/20322002026/"+cargo+"/candidatos",false);x.send(null);var r=JSON.parse(x.responseText);return r.candidatos||r;}\n'+
'  var rep={geradoEm:new Date().toISOString(),cargos:{}};\n'+
'  [["senador","PR",5],["federal","PR",6],["estadual","PR",7]].forEach(function(c){\n'+
'    var arr=f(c[1],c[2]), gset={}; (G[c[0]]||[]).forEach(function(s){gset[s]=1;});\n'+
'    var byId={}; arr.forEach(function(x){byId[String(x.id)]={sit:x.descricaoSituacao,nome:x.nomeUrna,num:x.numero,part:(x.partido&&x.partido.sigla)};});\n'+
'    var add=arr.filter(function(x){return !gset[String(x.id)] && VALID[x.descricaoSituacao];}).map(function(x){return {sq:String(x.id),nome:x.nomeUrna,num:x.numero,part:(x.partido&&x.partido.sigla),sit:x.descricaoSituacao};});\n'+
'    var rem=(G[c[0]]||[]).filter(function(sq){var b=byId[sq];return !b||!VALID[b.sit];}).map(function(sq){var b=byId[sq];return {sq:sq,nome:b?b.nome:"(sumiu do TSE)",sit:b?b.sit:"AUSENTE"};});\n'+
'    rep.cargos[c[0]]={tseTotal:arr.length,guiaTotal:(G[c[0]]||[]).length,adicionar:add,remover:rem};\n'+
'  });\n'+
'  [["presidente","BR",1],["governador","PR",3]].forEach(function(c){\n'+
'    var arr=f(c[1],c[2]); var nv=arr.filter(function(x){return !VALID[x.descricaoSituacao];}).map(function(x){return {nome:x.nomeUrna,sit:x.descricaoSituacao};});\n'+
'    rep.cargos[c[0]]={tseTotal:arr.length,statusNaoPadrao:nv};\n'+
'  });\n'+
'  window.__rep=rep;\n'+
'  return JSON.stringify({senador:rep.cargos.senador,presidente:rep.cargos.presidente,governador:rep.cargos.governador,federal:{tse:rep.cargos.federal.tseTotal,addN:rep.cargos.federal.adicionar.length,remN:rep.cargos.federal.remover.length},estadual:{tse:rep.cargos.estadual.tseTotal,addN:rep.cargos.estadual.adicionar.length,remN:rep.cargos.estadual.remover.length}});\n'+
'})();\n'+
'/* detalhes (se houver): window.__rep.cargos.federal.adicionar / .remover ; idem estadual */';

fs.writeFileSync(path.join(__dirname,'_probe.js'),probe);
console.log('gerado: pipeline/_probe.js  ('+probe.length+' bytes) — colar no navegador na aba do TSE.');
