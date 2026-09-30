const fs=require('fs');
const F='guia-eleitor-pr.html';
let h=fs.readFileSync(F,'utf8');
const before=(h.match(/<article class="card/g)||[]).length;
// contagens
h=h.replace('5 de 414 candidatos a deputado federal no PR · exemplos reais','414 candidatos a deputado federal');
h=h.replace('5 de 606 candidatos a deputado estadual no PR · exemplos reais','606 candidatos a deputado estadual');
// trocar grids de Câmara e Assembleia por grids vazios com data-grid
h=h.replace(/(<h2>Câmara Federal<\/h2>[\s\S]*?)<div class="grid">[\s\S]*?<\/div>\s*<\/section>/,'$1<div class="grid" data-grid="federal"></div>\n  </section>');
h=h.replace(/(<h2>Assembleia Legislativa<\/h2>[\s\S]*?)<div class="grid">[\s\S]*?<\/div>\s*<\/section>/,'$1<div class="grid" data-grid="estadual"></div>\n  </section>');
fs.writeFileSync(F,h);
const after=(h.match(/<article class="card/g)||[]).length;
console.log('cards antes:',before,'-> depois:',after,'| grids vazios:',(h.match(/data-grid="/g)||[]).length);
