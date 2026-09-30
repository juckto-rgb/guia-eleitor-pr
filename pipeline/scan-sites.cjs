/* scan-sites.cjs — FASE 2 (bandeiras): acha candidatos SEM bandeira que TÊM site
 * próprio já registrado no guia (no TSE), muitas vezes em strings MALFORMADAS
 * (ex.: "https://SITE: DEPUTADOROMANELLI.COM.BR") que o pipeline original não
 * conseguiu abrir/classificar. Gera _alvos-site-proprio.json p/ processar.
 *
 * Uso: node pipeline/scan-sites.cjs   (lê ../index.html)
 * Depois: buscar cada domínio (WebFetch/navegador) + classificar com rules.js,
 * montar {bandeiras:{sq:{c:[...],src:"dominio"}}} e aplicar com apply-changes.cjs.
 * Registrar resultado em _bandeira-progress.json p/ não repetir entre lotes.
 * REGRA: só entra bandeira com propostas EXPLÍCITAS no site oficial (nada de
 * notícia/rede social/slogan). Sem sinal claro => fica em branco. */
const fs=require('fs'),path=require('path');
let h=fs.readFileSync(path.join(__dirname,'..','index.html'),'utf8');
function grab(decl,o,c){const i=h.indexOf(decl);if(i<0)return null;const s=h.indexOf(o,i);let d=0,j=s,st=false;for(;j<h.length;j++){const ch=h[j];if(st){if(ch=='\\')j++;else if(ch=='"')st=false;continue;}if(ch=='"')st=true;else if(ch===o)d++;else if(ch===c){d--;if(d===0)return h.slice(s,j+1);}}return null;}
function grabAny(decl){const i=h.indexOf(decl);const s=h.indexOf('[',i);let d=0,j=s,q=0;for(;j<h.length;j++){const ch=h[j];if(q){if(ch=='\\'){j++;continue;}if(ch===q)q=0;continue;}if(ch=="'"||ch=='"'){q=ch;continue;}if(ch=='[')d++;else if(ch==']'){d--;if(d===0)return h.slice(s,j+1);}}}
const SITE=JSON.parse(grab('var SITE_CAUSAS = ','{','}')),ALEP=JSON.parse(grab('var ALEP = ','{','}')),CAMFED=JSON.parse(grab('var CAMFED = ','{','}')),SENADO=JSON.parse(grab('var SENADO = ','{','}'));
const DEPS=JSON.parse(grab('var DEPS = ','[',']')),DD=JSON.parse(grab('var DEP_DETAIL = ','{','}'));
const OCC2CAUSA=eval(grabAny('var OCC2CAUSA = '));
function ordem(deps){const s=deps.filter(d=>d.cargo==='senador'),f=deps.filter(d=>d.cargo==='federal'),e=deps.filter(d=>d.cargo==='estadual');return s.concat(f).concat(e);}
const ord=ordem(DEPS);
function causas(pi,ocup){if(SITE[pi])return SITE[pi].c;if(ALEP[pi])return ALEP[pi].c;if(CAMFED[pi])return CAMFED[pi].c;if(SENADO[pi])return SENADO[pi].c;var s={},o=(ocup||'').toLowerCase();OCC2CAUSA.forEach(m=>{if(o.indexOf(m[0])>-1)s[m[1]]=1;});return Object.keys(s);}
const SOCIAL=/instagram|facebook|fb\.com|fb\.me|tiktok|youtube|youtu\.be|twitter|x\.com|kwai|linkedin|t\.me|wa\.me|whatsapp|threads|flickr|spotify|deezer|music\.amazon|linktr|beacons|campsite|bit\.ly|about\.me|goo\.gl|maps\.app|gmail\.com|hotmail|outlook|queroapoiar/i;
function domains(str){if(!str)return[];var out=[];var re=/([a-z0-9][a-z0-9-]*\.(?:com\.br|org\.br|net\.br|com|org|net))/gi,m;while((m=re.exec(str))){var dom=m[1].toLowerCase();if(!SOCIAL.test(dom)&&out.indexOf(dom)<0)out.push(dom);}return out;}
let alvos=[];
ord.forEach((d,idx)=>{const pi=21+idx;if(causas(pi,d.ocup).length)return;const det=DD[d.sq]||{};var doms=[];(det.sites||[]).forEach(u=>domains(u).forEach(x=>{if(doms.indexOf(x)<0)doms.push(x);}));if(doms.length)alvos.push({sq:d.sq,nome:d.nome,cargo:d.cargo,part:d.part,dom:doms});});
fs.writeFileSync(path.join(__dirname,'_alvos-site-proprio.json'),JSON.stringify(alvos,null,1));
// exclui já processados (tracker)
let prog={};try{prog=JSON.parse(fs.readFileSync(path.join(__dirname,'_bandeira-progress.json'),'utf8'));}catch(e){}
const novos=alvos.filter(a=>!prog[a.sq]);
console.log('sem bandeira COM site próprio no guia:',alvos.length,'| já processados:',alvos.length-novos.length,'| A PROCESSAR:',novos.length);
novos.forEach(a=>console.log('  '+a.nome+' ['+a.cargo.slice(0,3)+' '+a.part+'] -> '+a.dom.join(', ')));
