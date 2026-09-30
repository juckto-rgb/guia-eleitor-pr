/* emendas.cjs — RECONSTRÓI o bloco de emendas (var EMENDAS) do guia.
 *
 * Fonte REPRODUZÍVEL: arquivo estático do Portal da Transparência
 *   https://portaldatransparencia.gov.br/download-de-dados/emendas-parlamentares/UNICO
 *   (ZIP ~32MB -> EmendasParlamentares.csv, latin1, separador ';', 28 colunas).
 * A API "ao vivo" NÃO é reproduzível (somava valores diferentes a cada chamada);
 * o arquivo estático é estável -> use SEMPRE ele.
 *
 * Metodologia (mandato atual = Ano da Emenda 2023-2026, autoria por Nome do Autor):
 *   pago    = Σ Valor Pago (col 24) de todas as UFs           <- EXIBIDO no guia
 *   n       = nº de Códigos de Emenda distintos (col 0)        <- EXIBIDO no guia
 *   prPago  = Σ Valor Pago onde UF (col 10) = PARANÁ            (não exibido hoje)
 *   prPct   = round(prPago/pago*100)                            (não exibido hoje)
 *   areas   = top-3 funções (col 13) por valor pago ao PR       (não exibido hoje)
 * (Verificado 20/09: pago/n batem exatos com o build de 09/10 p/ Filipe Barros.)
 *
 * Casamento por NOME normalizado (maiúsculas, sem acento) == nomeParlamentar do guia.
 * Preserva as chaves pi atuais de EMENDAS e o próprio "nome" (trava anti-troca do guia:
 * emendasBlock só renderiza se _emNorm(em.nome)===_emNorm(cam.nomeParlamentar)).
 *
 * Uso:
 *   node pipeline/emendas.cjs <caminho/EmendasParlamentares.csv>          # DRY-RUN + _emendas-<data>.json
 *   node pipeline/emendas.cjs <caminho/EmendasParlamentares.csv> write    # grava ../index.html
 */
const fs=require('fs'), path=require('path');
const CSV=process.argv[2], WRITE=process.argv[3]==='write';
if(!CSV){console.log('uso: node emendas.cjs <EmendasParlamentares.csv> [write]');process.exit(1);}
const HTML=path.join(__dirname,'..','index.html');
let h=fs.readFileSync(HTML,'utf8');
function ms(s,st,o,c){let d=0,q=false,e=false;for(let i=st;i<s.length;i++){const ch=s[i];if(q){if(e)e=false;else if(ch=='\\')e=true;else if(ch=='"')q=false;continue;}if(ch=='"'){q=true;continue;}if(ch===o)d++;else if(ch===c){d--;if(d===0)return i+1;}}return -1;}
const i0=h.indexOf('var EMENDAS = '), s0=h.indexOf('{',i0), e0=ms(h,s0,'{','}');
const EMold=JSON.parse(h.slice(s0,e0));

const norm=s=>(s||'').normalize('NFD').replace(/[̀-ͯ]/g,'').toUpperCase().replace(/\s+/g,' ').trim();
const num=s=>parseFloat((s||'0').replace(/^"|"$/g,'').replace(/\./g,'').replace(',','.'))||0;
const cell=(a,i)=>(a[i]||'').replace(/^"|"$/g,'');

// alvos: pi -> nome (dos EMENDAS atuais)
const alvos={}; Object.keys(EMold).forEach(pi=>{alvos[norm(EMold[pi].nome)]={pi,nome:EMold[pi].nome};});
const acc={}; Object.keys(alvos).forEach(k=>acc[k]={pago:0,pr:0,cods:new Set(),areas:{}});

const txt=fs.readFileSync(CSV).toString('latin1');
const lines=txt.split(/\r?\n/); lines.shift();
let rows=0;
for(const ln of lines){ if(!ln)continue; const a=ln.split(';');
  const key=norm(cell(a,4)); const t=alvos[key]; if(!t) continue;
  const ano=+cell(a,1); if(ano<2023||ano>2026) continue;
  const uf=cell(a,10), pago=num(cell(a,24)), fun=cell(a,13), cod=cell(a,0);
  const A=acc[key]; A.pago+=pago; A.cods.add(cod);
  if(/PARAN/i.test(uf)){ A.pr+=pago; A.areas[fun]=(A.areas[fun]||0)+pago; }
  rows++;
}

const EMnew={}; const diffs=[]; const semDados=[];
Object.keys(EMold).forEach(pi=>{
  const nome=EMold[pi].nome, key=norm(nome), A=acc[key];
  if(!A || A.cods.size===0){ EMnew[pi]=EMold[pi]; semDados.push(nome); return; }
  const pago=Math.round(A.pago), prPago=Math.round(A.pr), n=A.cods.size;
  const prPct=pago>0?Math.round(prPago/pago*100):0;
  const areas=Object.entries(A.areas).sort((x,y)=>y[1]-x[1]).slice(0,3).map(x=>[x[0],Math.round(x[1])]);
  EMnew[pi]={nome,pago,prPago,prPct,n,areas};
  const o=EMold[pi];
  if(o.pago!==pago||o.n!==n) diffs.push(nome+': valor R$'+(o.pago/1e6).toFixed(1)+'M->'+(pago/1e6).toFixed(1)+'M | n '+o.n+'->'+n);
});

console.log('linhas casadas:',rows,'| deputados alvo:',Object.keys(EMold).length);
console.log('SEM dados no CSV (mantidos como estavam):',semDados.length, semDados.length?JSON.stringify(semDados):'');
console.log('\n=== mudanças (valor pago / nº) ===',diffs.length);
diffs.forEach(d=>console.log('  '+d));
const stamp=new Date(Date.now()-3*3600e3).toISOString().slice(0,10);
const outf=path.join(__dirname,'_emendas-'+stamp+'.json');
fs.writeFileSync(outf,JSON.stringify(EMnew,null,0));
console.log('\nsalvo:',path.basename(outf));
if(!WRITE){console.log('[DRY-RUN] rode com "write" para gravar em ../index.html.');return;}
const bak=HTML.replace('index.html','index.backup-'+stamp+'-pre-emendas.html');
if(!fs.existsSync(bak))fs.writeFileSync(bak,h);
h=h.slice(0,s0)+JSON.stringify(EMnew)+h.slice(e0);
fs.writeFileSync(HTML,h);
console.log('GRAVADO em ../index.html. LEMBRE: sincronizar as 4 cópias + carimbo.');
