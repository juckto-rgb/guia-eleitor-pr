const fs=require('fs');
const texts=JSON.parse(fs.readFileSync('dep-texts.json','utf8'));
const out=JSON.parse(fs.readFileSync('classify-out.json','utf8'));
const byPi={};texts.forEach(t=>byPi[t.pi]=t);
const norm=s=>s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g,'');
const RULES=require('./rules.js');
const compiled={};for(const k in RULES)compiled[k]=RULES[k].map(p=>new RegExp(p,'g'));
for(const r of out){
 const t=norm(byPi[r.pi].text);
 const parts=r.c.map(slug=>{
   const terms=[];for(const re of compiled[slug]){const m=t.match(re);if(m)terms.push(re.source+'×'+m.length);}
   return slug+'{'+terms.join(', ')+'}';
 });
 console.log('pi'+r.pi+' '+r.nome+' ('+r.src+')\n   '+parts.join('\n   '));
}
