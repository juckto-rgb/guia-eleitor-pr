const https=require('https'), fs=require('fs');
const idE='20322002026';
const h=fs.readFileSync('guia-eleitor-pr.html','utf8');
const DEPS=JSON.parse(h.match(/var DEPS = (\[[\s\S]*?\]);/)[1]);
const sen=DEPS.filter(d=>d.cargo==='senador'), fed=DEPS.filter(d=>d.cargo==='federal'), est=DEPS.filter(d=>d.cargo==='estadual');
const ordered=sen.concat(fed).concat(est).map((d,i)=>({pi:20+i, sq:d.sq, nome:d.nome, cargo:d.cargo, part:d.part, num:d.num}));
console.error('deputados:',ordered.length,'(sen',sen.length,'fed',fed.length,'est',est.length,')');
function realSite(u){u=(u||'').toLowerCase().trim();
  if(/(instagram|facebook|tiktok|youtube|kwai|threads|linkedin|spotify|whatsapp|wa\.me|t\.me|x\.com|twitter|linktr|apoio\.top|sticker|music\.amazon|queroapoiar|flickr|bsky|bluesky|deezer|twitch|gettr|truthsocial|discord|telegram|fleekus|campsite|beacons|bio\.link|linkbio|linkx|linkk|about\.me)/.test(u))return false;
  return /^https?:\/\/[^\s]+\.[^\s]+/i.test(u.replace(/^https?:\/\//,'https://'));}
function get(sq){const path=`/divulga/rest/v1/candidatura/buscar/2026/PR/${idE}/candidato/${sq}`;
  return new Promise(res=>{const req=https.get({host:'divulgacandcontas.tse.jus.br',path,headers:{'User-Agent':'Mozilla/5.0','Accept':'application/json'}},r=>{let d='';r.on('data',c=>d+=c);r.on('end',()=>{try{res(JSON.parse(d).sites||[])}catch(e){res(null)}})});req.on('error',()=>res(null));req.setTimeout(15000,()=>{req.destroy();res(null)});});}
(async()=>{
  const found=[]; let done=0, errors=0; const CONC=8;
  for(let i=0;i<ordered.length;i+=CONC){
    const batch=ordered.slice(i,i+CONC);
    await Promise.all(batch.map(async d=>{
      const sites=await get(d.sq); done++;
      if(sites===null){errors++;return;}
      const reals=sites.filter(realSite);
      if(reals.length) found.push(Object.assign({},d,{sites:reals}));
    }));
    if(done%80<CONC) process.stderr.write(`\r${done}/${ordered.length} (com site real: ${found.length}, err ${errors})`);
  }
  process.stderr.write(`\rDONE ${done}/${ordered.length} | com site real: ${found.length} | erros: ${errors}\n`);
  found.sort((a,b)=>a.pi-b.pi);
  fs.writeFileSync('dep-sites.json',JSON.stringify(found,null,1));
  console.log('== DEPUTADOS COM SITE REAL DECLARADO ('+found.length+') ==');
  found.forEach(d=>console.log(`pi${d.pi} [${d.cargo}] ${d.nome} (${d.part} ${d.num}): ${d.sites.join(' | ')}`));
})();
