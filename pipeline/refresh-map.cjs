/* refresh-map.cjs — recalcula as contagens do mapa "De onde vêm os candidatos"
 * a partir dos dados ATUAIS do guia (DEP_DETAIL + majoritários de PROFILES),
 * pra rodar junto de todo "checar updates" e não acumular defasagem.
 *
 * Uso:  node pipeline/refresh-map.cjs          (dry-run: só relatório)
 *       node pipeline/refresh-map.cjs write     (grava o novo número de cada cidade)
 *
 * O QUE FAZ (write): (1) atualiza o <text> do número de cada cidade que JÁ está
 *   no mapa (o aria-label deriva do número em runtime, sincroniza sozinho); e
 *   (2) atualiza a nota "Fora do PR" (top-3 estados por contagem) — assim TODAS
 *   as origens ficam em dia, dentro E fora do mapa. NÃO mexe em font-size/fill/
 *   posição nem em QUAIS cidades aparecem no mapa.
 * O QUE APENAS REPORTA (decisão humana, ver [[project_rotina_checagem_updates]]):
 *   - |delta|>2 numa cidade  -> sugere novo font-size/fill (rebalancear rótulo);
 *   - qualquer origem FORA do mapa com contagem >= a menor DO mapa -> revisar
 *     curadoria (Parte C). Lista TODAS, inclusive fora do PR (ex.: São Paulo).
 * Fonte única = dados do próprio index.html (regra do projeto: nada inventado).
 */
const fs=require('fs'),path=require('path');
const F=path.join(__dirname,'..','index.html');
const WRITE=process.argv.includes('write');
let h=fs.readFileSync(F,'utf8');

function grab(decl,o,c){const i=h.indexOf(decl);if(i<0)return null;const s=h.indexOf(o,i);let d=0,j=s,st=false;for(;j<h.length;j++){const ch=h[j];if(st){if(ch=='\\')j++;else if(ch=='"')st=false;continue;}if(ch=='"')st=true;else if(ch===o)d++;else if(ch===c){d--;if(d===0)return h.slice(s,j+1);}}return null;}
function norm(s){return (s||'').split('/')[0].toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g,'').trim();}

const DD=JSON.parse(grab('var DEP_DETAIL = ','{','}'));
const PROF=JSON.parse(grab('var PROFILES = ','[',']'));
// só majoritários (Presidente/Governador) — os demais de PROFILES são "destaques"
// que também estão no DEP_DETAIL; contá-los duplicaria (ver histórico do projeto).
const maj=PROF.filter(d=>d.cargo==='Presidente'||d.cargo==='Governador');

// contagem por cidade (chave normalizada) + total fora do PR por UF
const cnt={}, uf={}; let total=0, foraPR=0;
function add(nat){ if(!nat)return; total++; const k=norm(nat); if(k)cnt[k]=(cnt[k]||0)+1;
  const u=((nat.split('/')[1]||'').trim().toUpperCase()); if(u&&u!=='PR'){foraPR++; uf[u]=(uf[u]||0)+1;} }
Object.values(DD).forEach(d=>d&&d.nat&&add(d.nat));
maj.forEach(d=>d&&d.nat&&add(d.nat));

// escala (pra SUGESTÃO quando |delta|>2) — mesma curva das bolhas atuais
function nameFSof(n){ return Math.round((14+2.4*Math.sqrt(n))*10)/10; }
function fillOf(n){ // interpola rgb(78,85,179)@5  ->  rgb(38,36,74)@238
  const t=Math.max(0,Math.min(1,(Math.sqrt(n)-Math.sqrt(5))/(Math.sqrt(238)-Math.sqrt(5))));
  const L=(a,b)=>Math.round(a+(b-a)*t);
  return 'rgb('+L(78,38)+','+L(85,36)+','+L(179,74)+')'; }

// cidades no mapa
const reCity=/<g class="mcity" data-city="([^"]+)"[^>]*>([\s\S]*?)<\/g>/g;
let m, changes=[], warnsFS=[], mapKeys=new Set(), min=Infinity;
const mapEntries=[];
while((m=reCity.exec(h))){
  const city=m[1], inner=m[2];
  const nums=[...inner.matchAll(/font-size="([\d.]+)"[^>]*>(\d+)<\/text>/g)];
  const last=nums[nums.length-1]; if(!last)continue;
  const cur=+last[2], real=cnt[norm(city)]||0;
  mapKeys.add(norm(city)); mapEntries.push({city,cur,real}); if(real<min)min=real;
  if(cur!==real){ changes.push({city,cur,real,tag:'>'+cur+'</text>',rep:'>'+real+'</text>'});
    if(Math.abs(real-cur)>2) warnsFS.push('  '+city+': '+cur+'->'+real+'  (sugerido nameFS='+nameFSof(real)+' numFS='+Math.round(nameFSof(real)*0.8*10)/10+' fill='+fillOf(real)+')'); }
}

console.log('=== refresh-map ('+(WRITE?'WRITE':'dry-run')+') ===');
console.log('candidatos: '+total+' | fora do PR: '+foraPR+'\n');
console.log('cidades no mapa (atual -> real):');
mapEntries.sort((a,b)=>b.real-a.real).forEach(e=>console.log('  '+(e.cur===e.real?'ok ':'** ')+e.city+': '+e.cur+' -> '+e.real));

if(warnsFS.length){ console.log('\n[ATENÇÃO] |delta|>2 — rebalancear font-size/fill (manual):'); warnsFS.forEach(w=>console.log(w)); }

// curadoria: alguma cidade fora do mapa passou a menor do mapa?
const foraMaiores=Object.entries(cnt).filter(([k,v])=>!mapKeys.has(k)&&v>=min).sort((a,b)=>b[1]-a[1]);
if(foraMaiores.length){ console.log('\n[CURADORIA] origens FORA do mapa com contagem >= a menor do mapa ('+min+') — revisar Parte C:');
  foraMaiores.slice(0,10).forEach(([k,v])=>console.log('  '+k+': '+v)); }

// nota "Fora do PR"
const UFNOME={SP:'São Paulo',RS:'Rio Grande do Sul',SC:'Santa Catarina',RJ:'Rio de Janeiro',MG:'Minas Gerais',MS:'Mato Grosso do Sul',MT:'Mato Grosso',GO:'Goiás',BA:'Bahia',DF:'Distrito Federal',PE:'Pernambuco',CE:'Ceará',MA:'Maranhão',PB:'Paraíba',PA:'Pará',ES:'Espírito Santo',SE:'Sergipe',AL:'Alagoas',RN:'Rio Grande do Norte',PI:'Piauí',AM:'Amazonas',AC:'Acre',RO:'Rondônia',RR:'Roraima',AP:'Amapá',TO:'Tocantins'};
const top3=Object.entries(uf).sort((a,b)=>b[1]-a[1]).slice(0,3);
function fmtList(arr){ return arr.length<2?arr.join(''):arr.slice(0,-1).join(', ')+' e '+arr[arr.length-1]; }
const notaNova=fmtList(top3.map(([u,v])=>(UFNOME[u]||u)+' ('+v+')'))+'.';
// nota atual no HTML
let notaAtual=null; const mNota=h.match(/<b>Fora do PR:<\/b>\s*([^<]*?)<\/p>/);
if(mNota) notaAtual=mNota[1].trim();
const notaMuda = notaAtual!==null && notaAtual!==notaNova;
console.log('\nnota "Fora do PR": '+(notaAtual===null?'(não encontrada)':notaMuda?('"'+notaAtual+'" -> "'+notaNova+'"'):'ok ("'+notaNova+'")'));

if(WRITE){
  if(!changes.length && !notaMuda){ console.log('\nnada a gravar (mapa e nota já batem).'); process.exit(0); }
  changes.forEach(c=>{ const i=h.indexOf('data-city="'+c.city+'"'); const e=h.indexOf('</g>',i); const seg=h.slice(i,e); h=h.slice(0,i)+seg.replace(c.tag,c.rep)+h.slice(e); });
  if(notaMuda) h=h.replace(/(<b>Fora do PR:<\/b>\s*)[^<]*?(<\/p>)/, '$1'+notaNova+'$2');
  fs.writeFileSync(F,h);
  console.log('\nGRAVADO: '+changes.length+' número(s) de cidade'+(notaMuda?' + nota "Fora do PR"':'')+'. Sincronize as pastas e verifique no navegador.');
} else if(changes.length || notaMuda){ console.log('\n[DRY-RUN] rode com "write" pra gravar '+changes.length+' número(s)'+(notaMuda?' + a nota':'')+'.'); }
