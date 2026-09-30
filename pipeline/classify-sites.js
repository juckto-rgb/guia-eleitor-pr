const fs=require('fs');
const texts=JSON.parse(fs.readFileSync('dep-texts.json','utf8'));
// pi já classificados à mão (override — pipeline não mexe)
const MANUAL={0:1,3:1,4:1,6:1,9:1,11:1,14:1,15:1,18:1,19:1,22:1,28:1,48:1,64:1,142:1,145:1,287:1,312:1,486:1};
const norm=s=>s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g,'');
// cada bandeira = lista de padrões (já sem acento). Específicos p/ política pública.
const RULES={
 saude:['saude publica','sus','hospital','postos? de saude','\\bupa\\b','\\bubs\\b','vacina','cancer','oncolog','farmaceut','medicament','santa casa','\\bsamu\\b','enfermeir','pronto.?socorro','saude '],
 educacao:['educacao','escola','professor','ensino','universidad','creche','alfabetiz','magisterio','merenda','bolsa de estudo','aluno','estudante'],
 seguranca:['seguranca publica','\\bpolicia','policial','violenc','\\bcrime','criminal','delegad','guarda municipal','combate ao crime','trafico','penitenci','\\bbandid','armament'],
 economia:['empreend','desburocra','\\bcnpj\\b','geracao de emprego','desenvolvimento economic','\\bcomercio\\b','industria','imposto','tributari','livre mercado','abertura de empresa','microempre','investimento','pequenos negocios'],
 agro:['agroneg','agricultura','agricultor','produtor rural','pecuar','\\brural\\b','cooperativ','agricultura familiar','\\bcampo\\b','safra','\\bagro\\b'],
 animal:['causa animal','protecao animal','castraca','maus.?tratos','bem.?estar animal','abandono de animais','direito dos animais'],
 cultura:['\\bcultura','cultural','artist','\\bmusic','teatro','patrimonio historic','audiovisual','festival','\\bcarnaval'],
 social:['assistencia social','vulnerab','\\bpobreza','\\bfome','desigualdad','inclusao social','direitos das mulheres','\\bnegr','indigen','quilombol','\\blgbt','refugiad','migrant','\\bidoso','povos','periferia','direitos human'],
 transparencia:['transparenc','\\bcorrupca','anticorrupca','fiscalizaca','prestacao de contas','lava jato','improbidade','ficha limpa','combate a corrupca','\\bhonest'],
 esporte:['\\besporte','esportiv','\\batleta','olimpic','\\bfutebol','ginasio','quadra esportiva','paralimpic'],
 inclusao:['pessoa com deficienc','\\bpcd\\b','acessibilidad','\\bautis','\\blibras\\b','cadeirante','deficiente','inclus'],
 infra:['infraestrutura','pavimenta','asfalt','rodovi','\\bestrada','saneament','\\bobras\\b','\\bponte','\\bbr-','drenagem','iluminacao publica'],
 inovacao:['inovaca','tecnolog','\\bdigital','startup','internet','inteligencia artificial','conectividade','\\b5g\\b','transformacao digital'],
 juventude:['juventude','\\bjovens\\b','\\bjovem\\b','primeiro emprego','estudantil','protagonismo juvenil'],
 ambiente:['meio ambiente','\\bambient','sustentab','\\bclima','climatic','reciclag','\\bfloresta','desmatament','energia renovavel','preservaca','\\bnascentes','recursos hidric'],
 mobilidade:['mobilidade','transporte public','transporte coletiv','ciclovi','\\bonibus\\b','\\btransito\\b','\\bpedestre'],
 moradia:['moradia','habitaca','casa propria','deficit habitacional','regularizacao fundiaria','\\baluguel'],
 trabalho:['trabalhador','sindicat','direitos trabalhista','\\bclt\\b','\\bsalario','servidor public','categoria profissional','emprego formal']
};
const compiled={};for(const k in RULES)compiled[k]=RULES[k].map(p=>new RegExp(p,'g'));
function classify(text){const t=norm(text);const score={};for(const k in compiled){let sig=0,hits=0;for(const re of compiled[k]){const m=t.match(re);if(m){sig++;hits+=m.length;}}if(sig>=2)score[k]={sig,hits};}
 return Object.keys(score).sort((a,b)=>score[b].sig-score[a].sig||score[b].hits-score[a].hits).slice(0,6);}
const results=[],skipped=[];
for(const d of texts){
 if(MANUAL[d.pi]) continue;
 if(d.len<=300){skipped.push(d);continue;}
 const c=classify(d.text);
 if(c.length){const host=(d.url||'').replace(/^https?:\/\//i,'').split('/')[0];results.push({pi:d.pi,nome:d.nome,cargo:d.cargo,c,src:host});}
 else skipped.push(d);
}
results.sort((a,b)=>a.pi-b.pi);
fs.writeFileSync('classify-out.json',JSON.stringify(results,null,1));
console.log('== PIPELINE: classificados automaticamente:',results.length,'| sem texto/sem sinal:',skipped.length,'==\n');
results.forEach(r=>console.log(`pi${r.pi} [${r.cargo}] ${r.nome}: ${r.c.join(' · ')}  (${r.src})`));
console.log('\n-- amostra dos pulados (sem 2 sinais) --');
skipped.slice(0,20).forEach(s=>console.log(`pi${s.pi} ${s.nome} (len ${s.len})`));
