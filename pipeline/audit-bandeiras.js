const fs=require('fs');
const RULES=require('./rules.js');const comp={};for(const k in RULES)comp[k]=RULES[k].map(p=>({re:new RegExp(p,'g'),src:p}));
const norm=s=>s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g,'');
// padrões AMBÍGUOS (disparam fácil fora de contexto)
const WEAK=new Set(['saude ','inclus','\\bdigital','internet','\\bcampo\\b','\\bobras\\b','\\bambient','\\bcrime','investimento','\\bcultura','industria','\\brural\\b','\\bidoso','estudante','aluno']);
// textos em cache (maior len por pi)
const texts={};for(const f of ['dep-texts.json','headless-texts.json','recovered-texts.json']){try{JSON.parse(fs.readFileSync(f,'utf8')).forEach(r=>{if(r.len>300&&(!texts[r.pi]||r.len>texts[r.pi].len))texts[r.pi]=r;});}catch(e){}}
const cur=eval('('+fs.readFileSync('guia-eleitor-pr.html','utf8').match(/var SITE_CAUSAS = (\{[\s\S]*?\n  \});/)[1]+')');
// distribuição
const freq={};Object.keys(cur).forEach(pi=>cur[pi].c.forEach(s=>freq[s]=(freq[s]||0)+1));
console.log('== DISTRIBUIÇÃO (149 classificados) ==');
Object.entries(freq).sort((a,b)=>b[1]-a[1]).forEach(([s,n])=>console.log('  '+s.padEnd(14),n));
// evidência por classificação AUTO (que tem texto)
console.log('\n== BANDEIRAS SUSPEITAS (só evidência fraca/ambígua) ==');
const suspects=[];
Object.keys(cur).map(Number).forEach(pi=>{
  const e=cur[pi]; if(!e.auto||/rede social/.test(e.src||'')) return; const t=texts[pi]; if(!t) return; const nt=norm(t.text);
  e.c.forEach(slug=>{
    const hits=[];(comp[slug]||[]).forEach(p=>{const m=nt.match(p.re);if(m)hits.push({src:p.src,n:m.length});});
    const allWeak=hits.length>0 && hits.every(h=>WEAK.has(h.src));
    const totalHits=hits.reduce((a,h)=>a+h.n,0);
    if(allWeak || (hits.length<=2 && totalHits<=2)) suspects.push({pi,nome:t.nome,slug,ev:hits.map(h=>h.src+'×'+h.n).join(','),allWeak});
  });
});
suspects.sort((a,b)=>(b.allWeak-a.allWeak));
suspects.slice(0,40).forEach(s=>console.log((s.allWeak?'⚠ ':'  ')+'pi'+s.pi+' '+s.nome+' → '+s.slug+'  ['+s.ev+']'));
console.log('\ntotal bandeiras suspeitas:',suspects.length,'| só-ambíguas:',suspects.filter(s=>s.allWeak).length);
