/* votos.cjs — RECONSTRÓI o campo "votos da eleição do mandato vigente" (var vv) do guia.
 *
 * O QUE MOSTRA: no Histórico eleitoral do perfil, na linha da eleição que deu o
 * mandato ATUAL do candidato, aparece "N votos" (destaque). Só para quem está em
 * CARGO VIGENTE (mandato em curso em 2026):
 *   - Presidente/Governador/Dep.Federal/Dep.Estadual eleitos em 2022 (mandato 2023-2026)
 *   - Senadores eleitos em 2018 (2019-2027) ou 2022 (2023-2031)
 *   - Prefeito/Vice/Vereador eleitos em 2024 (2025-2028)
 * Mandatos ENCERRADOS (ex.: vereador 2020, dep 2018) NÃO recebem a linha.
 *
 * FONTES OFICIAIS (votos apurados):
 *   - 2022 gerais: resultados.tse.jus.br/oficial/ele2022/{544 pres BR | 546 estados}
 *       /dados/{uf}/{uf}-c{cargo}-e{cod}-v.json  (cargo 0001/0003/0005/0006/0007; campo vap por 'n'=número)
 *   - 2024 municipal: CSV estático cdn.tse.jus.br/.../votacao_candidato_munzona_2024.zip
 *       -> votacao_candidato_munzona_2024_PR.csv (latin1, ';'). Soma QT_VOTOS_NOMINAIS_VALIDOS
 *       por CD_MUNICIPIO|CD_CARGO(11 pref/13 ver)|NR_CANDIDATO, turno 1 (vereador) ou 2>1 (pref/vice).
 *   - 2018 senado: CSV estático votacao_candidato_munzona_2018.zip -> _RJ.csv etc. (2018 saiu do
 *       resultados ao vivo; só via CSV bulk nacional ~395MB, extrair a UF com System.IO.Compression).
 *
 * CASAMENTO SEGURO (nada de embaralhar): por NÚMERO DE URNA dentro de UF/município+cargo.
 * O número de 2022/2024/2018 de cada candidato vem do `eleicoesAnteriores[]` do detalhe do TSE
 * (só pelo NAVEGADOR em divulgacandcontas.tse.jus.br — WAF; ver rotina). Guardado em
 * _votos-win2022.json e _votos-win-2024-2018.json (sq,ano,cargo,sgUe,num). O mapa final
 * sq->{n:votos,a:ano} fica em _votos-vigente-*.json.
 *
 * INJEÇÃO: inject-votos.cjs grava `vv:{n,a}` em DEP_DETAIL[sq] e PROFILES[0..20] (majoritários
 * via _majmap), adiciona `vv:x.vv||null` no rebuild de runtime, e o render mostra na linha do
 * histórico onde `+h.a===d.vv.a` e resultado "Eleito". Depois: sincronizar as 4 cópias + carimbo.
 *
 * COBERTURA 2026-09-23: 208/209 vigentes (82 de 2022 + 125 municipais de 2024 + Flavio/senado 2018).
 * FORA: Bruno Secco (Curitiba/vereador 2024) — candidatura substituída, 0 votos no resultado.
 *
 * REEXECUTAR: (1) montar a lista de vigentes do guia (hist com "Eleito" e ano do mandato em curso);
 * (2) puxar número/uf/município no navegador (eleicoesAnteriores); (3) somar votos das fontes acima;
 * (4) rodar inject-votos.cjs; (5) sincronizar + carimbo. Este arquivo é referência de metodologia.
 */
console.log('Referência de metodologia — ver comentários. Dados: _votos-vigente-*.json; injeção: inject-votos.cjs');
