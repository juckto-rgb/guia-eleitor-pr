const https = require('https');
const fs = require('fs');
const HTML = 'guia-eleitor-pr.html';
const idE = '20322002026';
// [SQ, UF] — Presidente(BR) primeiro, depois Governador/Senador/Dep(PR)
const order = [
  ['280002542548','BR'],['280002551544','BR'],['280002539826','BR'],['280002551932','BR'],
  ['280002551547','BR'],['280002538811','BR'],['280002540694','BR'],['280002548139','BR'],
  ['280002541457','BR'],['280002551975','BR'],['280002552484','BR'],['280002552487','BR'],
  // Governador (8)
  ['160002548010','PR'],['160002547594','PR'],['160002547666','PR'],['160002551353','PR'],['160002549553','PR'],['160002550997','PR'],['160002540833','PR'],['160002552560','PR'],
  // Senador (2), Dep Federal (5), Dep Estadual (5)
  ['160002547656','PR'],['160002547661','PR'],['160002532604','PR'],['160002532618','PR'],['160002532617','PR'],
  ['160002532877','PR'],['160002536504','PR'],['160002533441','PR'],['160002533449','PR'],['160002533452','PR'],['160002533454','PR'],['160002533470','PR']
];
function get(sq,uf){
  const path = `/divulga/rest/v1/candidatura/buscar/2026/${uf}/${idE}/candidato/${sq}`;
  return new Promise((res,rej)=>{ https.get({host:'divulgacandcontas.tse.jus.br',path,headers:{'User-Agent':'Mozilla/5.0','Accept':'application/json'}},r=>{let d='';r.on('data',c=>d+=c);r.on('end',()=>{try{res(JSON.parse(d));}catch(e){rej(new Error(sq+' '+e.message));}});}).on('error',rej); });
}
const cut=(s,n)=> s==null?'':String(s).slice(0,n);
const age=(d)=>{ if(!d) return null; const b=new Date(d), r=new Date('2026-08-16'); let a=r.getFullYear()-b.getFullYear(); if(r.getMonth()<b.getMonth()||(r.getMonth()===b.getMonth()&&r.getDate()<b.getDate())) a--; return a; };
const platf=(u)=>{u=(u||'').toLowerCase(); if(u.includes('instagram'))return'IG';if(u.includes('facebook'))return'FB';if(u.includes('x.com')||u.includes('twitter'))return'X';if(u.includes('youtube'))return'YT';if(u.includes('tiktok'))return'TT';if(u.includes('kwai'))return'KW';if(u.includes('linkedin'))return'LI';if(u.includes('threads'))return'TH';if(u.includes('spotify'))return'SP';if(u.includes('whatsapp')||u.includes('wa.me')||u.includes('t.me'))return'MSG';return'SITE';};

(async ()=>{
  const arr=[];
  for(const [sq,uf] of order){
    const j = await get(sq,uf);
    arr.push({
      nome:j.nomeUrna, nomeComp:cut(j.nomeCompleto,60), num:j.numero, part:j.partido&&j.partido.sigla, cargo:j.cargo&&j.cargo.nome,
      sit:cut(j.descricaoSituacao,40), ocup:cut(j.ocupacao,60), grau:cut(j.grauInstrucao,40), idade:age(j.dataDeNascimento),
      nat:(j.nomeMunicipioNascimento||'')+'/'+(j.sgUfNascimento||''), tot:j.totalDeBens||0,
      proc:(j.processosCassacao||[]).length+(j.processosDesconstituicao||[]).length,
      col:cut(j.composicaoColigacao||j.nomeColigacao,220),
      bens:(j.bens||[]).slice(0,8).map(b=>({t:cut(b.descricaoDeTipoDeBem||b.descricao,48), v:b.valor})),
      hist:(j.eleicoesAnteriores||[]).filter(e=>e.nrAno!==2026).map(e=>({a:e.nrAno, c:cut(e.cargo,30), r:cut(e.situacaoTotalizacao,26), l:cut(e.local,30)})),
      sup:(j.vices||[]).map(v=>({n:cut(v.nm_URNA,42), p:v.sg_PARTIDO||'', c:cut(v.ds_CARGO,18)})),
      sites:(j.sites||[]), atual:cut(j.dataUltimaAtualizacao,10)
    });
    process.stdout.write('.');
  }
  console.log('\n== PRESIDENTE (para os cards) ==');
  arr.slice(0,12).forEach(g=>{ const plats=[...new Set((g.sites||[]).map(platf))].filter(p=>p!=='MSG'); console.log(`${g.nome} | nº${g.num} | ${g.part} | ${g.ocup} | ${g.idade}a | R$${g.tot} | ${g.atual} | ${plats.join(',')}`); });
  const newLine = '  var PROFILES = ' + JSON.stringify(arr) + ';';
  const lines = fs.readFileSync(HTML,'utf8').split('\n');
  let done=0; for(let i=0;i<lines.length;i++){ if(lines[i].trim().startsWith('var PROFILES =')){ lines[i]=newLine; done++; } }
  fs.writeFileSync(HTML, lines.join('\n'));
  console.log('\nProfiles:', arr.length, '| PROFILES substituído:', done);
})().catch(e=>{ console.error('ERRO:', e.message); process.exit(1); });
