const fs=require('fs');
const RULES=require('./rules.js');const comp={};for(const k in RULES)comp[k]=RULES[k].map(p=>new RegExp(p,'g'));
const norm=s=>s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g,'');
function classify(text){const t=norm(text);const sc={};for(const k in comp){let sig=0,h=0;for(const re of comp[k]){const m=t.match(re);if(m){sig++;h+=m.length;}}if(sig>=2)sc[k]={sig,h};}return Object.keys(sc).sort((a,b)=>sc[b].sig-sc[a].sig||sc[b].h-sc[a].h).slice(0,6);}
const texts={};for(const f of ['dep-texts.json','headless-texts.json','recovered-texts.json']){try{JSON.parse(fs.readFileSync(f,'utf8')).forEach(r=>{if(r.len>300&&(!texts[r.pi]||r.len>texts[r.pi].len))texts[r.pi]=r;});}catch(e){}}
const cur=eval('('+fs.readFileSync('guia-eleitor-pr.html','utf8').match(/var SITE_CAUSAS = (\{[\s\S]*?\n  \});/)[1]+')');
const PRESERVE={};Object.keys(cur).forEach(k=>{if(!cur[k].auto||/rede social/.test(cur[k].src||''))PRESERVE[k]=1;});
const auto=[];const diff={added:[],removed:[],changed:[]};
Object.keys(texts).map(Number).sort((a,b)=>a-b).forEach(pi=>{
  if(PRESERVE[pi])return;
  const r=texts[pi];const c=classify(r.text);
  const before=cur[pi]?cur[pi].c.join(','):null;
  if(!c.length){ if(before)diff.removed.push('pi'+pi+' '+r.nome+' ('+before+')'); return; }
  const host=(r.url||'').replace(/^https?:\/\//i,'').split('/')[0];
  auto.push({pi,c,src:host});
  const after=c.join(',');
  if(before===null)diff.added.push('pi'+pi+' '+r.nome+' → '+after);
  else if(before!==after)diff.changed.push('pi'+pi+' '+r.nome+': '+before+' → '+after);
});
fs.writeFileSync('reclassified2.json',JSON.stringify(auto));
console.log('AUTO recomputados:',auto.length,'| preservados (mão/social):',Object.keys(PRESERVE).length,'| TOTAL:',auto.length+Object.keys(PRESERVE).length);
console.log('\n== NOVOS ('+diff.added.length+') ==');diff.added.forEach(x=>console.log('  +',x));
console.log('\n== REMOVIDOS ('+diff.removed.length+') ==');diff.removed.forEach(x=>console.log('  -',x));
console.log('\n== ALTERADOS ('+diff.changed.length+') ==');diff.changed.forEach(x=>console.log('  ~',x));
