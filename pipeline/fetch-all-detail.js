const https=require('https'),fs=require('fs');
const idE='20322002026';
const h=fs.readFileSync('guia-eleitor-pr.html','utf8');
const DEPS=JSON.parse(h.match(/var DEPS = (\[[\s\S]*?\]);/)[1]);
const cut=(s,n)=> s==null?'':String(s).slice(0,n);
const age=d=>{if(!d)return null;const b=new Date(d),r=new Date('2026-08-16');let a=r.getFullYear()-b.getFullYear();if(r.getMonth()<b.getMonth()||(r.getMonth()===b.getMonth()&&r.getDate()<b.getDate()))a--;return a;};
function get(sq){const path=`/divulga/rest/v1/candidatura/buscar/2026/PR/${idE}/candidato/${sq}`;return new Promise(res=>{const rq=https.get({host:'divulgacandcontas.tse.jus.br',path,headers:{'User-Agent':'Mozilla/5.0','Accept':'application/json'}},r=>{let d='';r.on('data',c=>d+=c);r.on('end',()=>{try{res(JSON.parse(d))}catch(e){res(null)}})});rq.on('error',()=>res(null));rq.setTimeout(15000,()=>{rq.destroy();res(null)});});}
const guard=p=>Promise.race([p,new Promise(r=>setTimeout(()=>r(null),18000))]);
const log=m=>fs.appendFileSync('detail.log',m+'\n');
process.on('unhandledRejection',()=>{});process.on('uncaughtException',()=>{});
(async()=>{
 fs.writeFileSync('detail.log','start '+DEPS.length+'\n');
 const ka=setInterval(()=>{},1000);
 const map={}; let done=0,ok=0,withHist=0; const CONC=8;
 for(let i=0;i<DEPS.length;i+=CONC){
  await Promise.all(DEPS.slice(i,i+CONC).map(async d=>{
   const j=await guard(get(d.sq)); done++;
   if(!j){map[d.sq]={};return;}
   ok++;
   const hist=(j.eleicoesAnteriores||[]).filter(e=>e.nrAno!==2026).map(e=>({a:e.nrAno,c:cut(e.cargo,30),r:cut(e.situacaoTotalizacao,26),l:cut(e.local,30)}));
   if(hist.length)withHist++;
   map[d.sq]={
    nc:cut(j.nomeCompleto,60), sit:cut(j.descricaoSituacao,40),
    nat:(j.nomeMunicipioNascimento||'')+'/'+(j.sgUfNascimento||''), tot:j.totalDeBens||0,
    proc:(j.processosCassacao||[]).length+(j.processosDesconstituicao||[]).length,
    bens:(j.bens||[]).slice(0,8).map(b=>({t:cut(b.descricaoDeTipoDeBem||b.descricao,48),v:b.valor})),
    hist:hist,
    sites:(j.sites||[]), atual:cut(j.dataUltimaAtualizacao,10)
   };
  }));
  if(done%80<CONC){fs.writeFileSync('dep-detail.json',JSON.stringify(map));log(done+'/'+DEPS.length+' ok:'+ok+' comHist:'+withHist);}
 }
 fs.writeFileSync('dep-detail.json',JSON.stringify(map));
 log('DONE '+done+'/'+DEPS.length+' ok:'+ok+' comHist:'+withHist+' bytes:'+JSON.stringify(map).length);
 clearInterval(ka);
})();
