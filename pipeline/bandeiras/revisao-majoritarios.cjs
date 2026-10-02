// Monta a proposta de revisão das bandeiras dos 30 majoritários (somente fontes oficiais, sem inferência)
const fs = require('fs'); const D = __dirname + '/';
const R = require(__dirname + '/../rules.js'); R.saude = R.saude.map(p => p === 'sus' ? '\\bsus\\b' : p);
const norm = s => s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/cnpj:? ?[\d./-]{8,}/g, ' ').replace(/\s+/g, ' ');
const planos = JSON.parse(fs.readFileSync(D + 'planos.json', 'utf8'));
const sites = JSON.parse(fs.readFileSync(D + 'sites-sen.json', 'utf8'));
const cam = JSON.parse(fs.readFileSync(D + 'leg-camara.json', 'utf8'));
const sen = JSON.parse(fs.readFileSync(D + 'leg-senado.json', 'utf8'));
const ORDER = ['saude','educacao','seguranca','economia','agro','social','trabalho','infra','inovacao','ambiente','transparencia','cultura','inclusao','moradia','mobilidade','esporte','juventude','animal'];
// o que o guia publicado mostra hoje (lido do site em 02/10)
const ANTES = {0:'social,economia,educacao,saude,seguranca',1:'seguranca,saude,social,economia',2:'economia',3:'saude,agro,seguranca,economia,transparencia',4:'economia,social,saude,transparencia',5:'saude',6:'economia,transparencia,juventude,cultura',7:'saude',8:'educacao',9:'trabalho,social,agro,juventude',10:'',11:'trabalho,social,agro,economia',12:'economia',13:'educacao',14:'',15:'educacao,trabalho,social,agro,economia',16:'economia,transparencia',17:'',18:'cultura',19:'seguranca,transparencia,economia,educacao,saude,infra,agro',20:'trabalho,social,agro,economia',21:'cultura',22:'seguranca,economia,mobilidade',23:'agro,economia',24:'trabalho',25:'',26:'',27:'economia',28:'saude,economia,educacao',29:'transparencia,seguranca'};
const ORIG_ANTES = {2:'ocupação',5:'ocupação',7:'ocupação',8:'ocupação',12:'ocupação',13:'ocupação',18:'ocupação',21:'ocupação',27:'ocupação'};
const EXEC = [[0,'LULA','Presidente','PT'],[1,'FLAVIO BOLSONARO','Presidente','PL'],[2,'ZEMA','Presidente','NOVO'],[3,'RONALDO CAIADO','Presidente','PSD'],[4,'ESCRITOR AUGUSTO CURY','Presidente','AVANTE'],[5,'SAMARA','Presidente','UP'],[6,'RENAN SANTOS','Presidente','MISSÃO'],[7,'VETERINÁRIO WILSON GRASSI','Presidente','DEMOCRATA'],[8,'HERTZ DIAS','Presidente','PSTU'],[9,'EDMILSON COSTA','Presidente','PCB'],[10,'CLARIANA BARAO','Presidente','DC'],[11,'RUI COSTA PIMENTA','Presidente','PCO'],[12,'PABLO MARÇAL','Presidente','PRTB'],
  [13,'SAMUEL DE MATTOS','Governador','PSTU'],[14,'DOUTOR ALEXANDRE SALOMÃO','Governador','MOBILIZA'],[15,'REQUIÃO FILHO','Governador','PDT'],[16,'LUIZ FRANÇA','Governador','MISSÃO'],[17,'SANDRO ALEX','Governador','PSD'],[18,'TAYNÁ MIESSA','Governador','UP'],[19,'SERGIO MORO','Governador','PL'],[20,'ADRIANO FUNILEIRO','Governador','PCO']];
const rows = [];
for (const [pi, nome, cargo, part] of EXEC) {
  const k = (cargo === 'Presidente' ? 'pres:' : 'gov:') + nome; const p = planos[k];
  const depois = ORDER.filter(c => p.c[c]);
  rows.push({ pi, nome, cargo, part, antes: ANTES[pi] ? ANTES[pi].split(',') : [], origAntes: ORIG_ANTES[pi] || (ANTES[pi] ? 'site' : '—'), depois,
    ev: Object.fromEntries(depois.map(c => [c, `${p.c[c][0]} termos · ${p.c[c][1]} ocorrências`])),
    fonte: `Plano de governo registrado no TSE (${p.p} págs.)`, arquivos: p.a, notas: [] });
}
// senadores
const SEL = {21:/cristinagraeml\.com\.br\/$/,22:/propostasgleisi/,23:/\/(propostas|leis-e-projetos)\/$/,24:/marcelo-marcelino/,25:/filipebarros\.com\.br\/$/,28:/drrosinha132\.com\.br\/$/,29:/deltandallagnol\.com\.br\/mandato\/$/};
const SEN = [[21,'CRISTINA GRAEML','PSD'],[22,'GLEISI','PT'],[23,'ALEXANDRE CURI','REPUBLICANOS'],[24,'MARCELO MARCELINO','PCO'],[25,'FILIPE BARROS','PL'],[26,'JOAQUIM DO MLB','UP'],[27,'KAREN GUERREIRO','MISSÃO'],[28,'DR ROSINHA','PT'],[29,'DELTAN DALLAGNOL','NOVO']];
const ALEP23 = ['inclusao','saude','seguranca'];
for (const [pi, nome, part] of SEN) {
  const ev = {}; const add = (c, s) => { (ev[c] = ev[c] || []).push(s); };
  const fontes = [];
  if (SEL[pi]) { let t = '', urls = []; for (const s of sites[pi] || []) for (const pg of (s.pages || [])) if (SEL[pi].test(pg.url)) { t += ' ' + pg.text; urls.push(pg.url.replace(/^https?:\/\/(www\.)?/, '')); }
    t = norm(t); for (const c in R) { const n = R[c].filter(rx => new RegExp(rx).test(t)).length; if (n >= 2) add(c, `site: ${n} termos`); }
    if (urls.length) fontes.push('Site declarado ao TSE: ' + urls.join(' + ')); }
  for (const L of [cam[pi] && { ...cam[pi], casa: 'Câmara' }, sen[pi] && { ...sen[pi], casa: 'Senado' }].filter(Boolean)) {
    fontes.push(`${L.casa} ${L.anos}: ${L.total} proposições normativas (PL/PEC/PLP/PDL…) de autoria ou coautoria`);
    for (const [c, v] of Object.entries(L.por)) if (v.length >= 2) add(c, `${L.casa}: ${v.length} proposições`);
  }
  if (pi === 23) { fontes.push('ALEP 2003–2026 (dado já no guia; só as 3 principais causas estão guardadas)'); ALEP23.forEach(c => add(c, 'ALEP: entre as 3 principais')); }
  const notas = [];
  if (pi === 24) { delete ev.educacao; notas.push('"educação" aparece só na biografia ("dá aula na educação básica"), não é proposta. Retirada. As propostas do texto (fim do Senado, cancelamento das dívidas, imposto sobre grandes fortunas) têm 1 termo cada, abaixo da regra de 2.'); }
  if (pi === 25) notas.push('Site sem seção de propostas (texto biográfico). Bandeiras vêm do mandato na Câmara.');
  if (pi === 26 || pi === 27) { fontes.push('Declarou ao TSE apenas redes sociais; sem site, sem plano e sem mandato.'); notas.push('Sem fonte oficial com propostas: fica sem bandeira (o guia mostra "sem informação" em vez de inferir pela ocupação).'); }
  if (pi === 28) notas.push('O site tem seções explícitas "Agricultura, meio ambiente e reforma agrária" e "Direitos humanos e segurança da mulher". A regra de 2 termos só pega Meio ambiente. Agro e Social ficam para sua decisão (marcados como "a decidir").');
  if (pi === 21) notas.push('Pautas numeradas no site: 01 Transparência e Liberdade, 02 Força aos Municípios, 03 Voz Feminina e Família, 04 Produção e Desenvolvimento (agronegócio), 05 Cidadania e Participação. 02, 03 e 05 não correspondem a nenhuma das 18 bandeiras.');
  if (pi === 22) notas.push('Sites gleisisenadora.com fora do ar; usado gleisi131.com.br/propostasgleisi.');
  if (pi === 29) notas.push('meusenadorassina.com.br (abaixo-assinado) não foi usado: não é página de propostas.');
  const depois = ORDER.filter(c => ev[c]);
  const decidir = pi === 28 ? ['agro', 'social'] : [];
  rows.push({ pi, nome, cargo: 'Senador', part, antes: ANTES[pi] ? ANTES[pi].split(',') : [], origAntes: ORIG_ANTES[pi] || (ANTES[pi] ? ({22:'Senado (top 3)',23:'site',24:'site do partido',28:'Câmara (top 3)',29:'site'}[pi]) : '—'),
    depois, decidir, ev: Object.fromEntries(depois.map(c => [c, ev[c].join(' · ')])), fonte: fontes.join(' | ') || '—', notas });
}
fs.writeFileSync(D + 'revisao-bandeiras.json', JSON.stringify(rows, null, 1));
for (const r of rows) console.log(String(r.pi).padStart(2), r.nome.padEnd(26), `antes ${r.antes.length} (${r.origAntes}) → depois ${r.depois.length}${r.decidir && r.decidir.length ? ' +' + r.decidir.length + ' a decidir' : ''}  [${r.depois.join(',')}]`);
