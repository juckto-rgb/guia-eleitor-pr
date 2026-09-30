const fs=require('fs');
const text=fs.readFileSync('cand_2026_PR.csv').toString('latin1');
const lines=text.split(/\r?\n/).filter(Boolean);
const header=lines[0].split(';').map(x=>x.replace(/^"|"$/g,''));
const ix=n=>header.indexOf(n);
const iNome=ix('NM_URNA_CANDIDATO'),iNum=ix('NR_CANDIDATO'),iPart=ix('SG_PARTIDO'),iCargo=ix('DS_CARGO'),
  iOcup=ix('DS_OCUPACAO'),iGrau=ix('DS_GRAU_INSTRUCAO'),iNasc=ix('DT_NASCIMENTO'),iSq=ix('SQ_CANDIDATO');
const age=d=>{const m=/(\d{2})\/(\d{2})\/(\d{4})/.exec(d||'');if(!m)return null;const b=new Date(+m[3],+m[2]-1,+m[1]),r=new Date(2026,7,16);let a=r.getFullYear()-b.getFullYear();if(r.getMonth()<b.getMonth()||(r.getMonth()===b.getMonth()&&r.getDate()<b.getDate()))a--;return a;};
const deps=[];
for(let i=1;i<lines.length;i++){
  const f=lines[i].split(';').map(x=>x.replace(/^"|"$/g,''));
  const cargo=f[iCargo];
  if(cargo!=='SENADOR'&&cargo!=='DEPUTADO FEDERAL'&&cargo!=='DEPUTADO ESTADUAL')continue;
  deps.push({sq:f[iSq],nome:f[iNome],num:+f[iNum],part:f[iPart],cargo:cargo==='SENADOR'?'senador':(cargo==='DEPUTADO FEDERAL'?'federal':'estadual'),
    ocup:(f[iOcup]||'').slice(0,60),grau:(f[iGrau]||'').slice(0,40),idade:age(f[iNasc])});
}
console.log('total:',deps.length,'| federal:',deps.filter(d=>d.cargo==='federal').length,'| estadual:',deps.filter(d=>d.cargo==='estadual').length);
const HTML='guia-eleitor-pr.html';
const line='  var DEPS = '+JSON.stringify(deps)+';';
const h=fs.readFileSync(HTML,'utf8').split('\n');
let done=0;
for(let i=0;i<h.length;i++){if(h[i].trim().startsWith('var DEPS =')){h[i]=line;done++;}}
if(!done){for(let i=0;i<h.length;i++){if(h[i].trim().startsWith('var PROFILES =')){h.splice(i+1,0,line);done=1;break;}}}
fs.writeFileSync(HTML,h.join('\n'));
console.log('DEPS injetado:',done,'| tamanho:',Math.round(line.length/1024),'KB');
