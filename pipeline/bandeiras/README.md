# Bandeiras por fonte oficial

Scripts e resultados que definem as bandeiras (temas) de cada candidato do guia. Rodada de 02/10/2026.

**Regra geral:** só entra tema encontrado em fonte oficial. Nada vem de profissão, nome de urna, partido ou rede social. Os termos de cada tema estão em [`../rules.js`](../rules.js).

## Fontes e regras

| Quem | Fonte | Entra o tema quando |
|---|---|---|
| Presidente e governador | Plano de governo registrado no TSE | aparecem 2 ou mais termos diferentes do tema no plano |
| Senador e deputado | Site declarado ao TSE (página inicial e páginas de propostas, atuação e biografia) | aparecem 2 ou mais termos diferentes; o site precisa citar o nome do candidato |
| Quem tem ou teve mandato | Proposições normativas (PL, PLP, PEC, PDL) de autoria ou coautoria na Câmara, no Senado ou na ALEP | o tema aparece em 2 ou mais proposições; as **cerimoniais** não contam |

**Cerimonial** é o projeto que não é plano de trabalho: utilidade pública, título de cidadão honorário ou comenda, denominação (nome de rua, prédio, rodovia), data comemorativa, "capital de" e patrono. Na ALEP, também pelo campo `assunto` (Utilidade pública, Títulos honoríficos, Denominação, Data).

Correções de método nesta rodada: o termo `sus` passou a exigir a palavra inteira (casava com "sustentável"); o CNPJ do rodapé dos sites deixou de contar como Economia; acentos codificados em HTML (`&#231;`) são decodificados antes da leitura.

## Ordem de execução

| Script | O que faz |
|---|---|
| `planos-tse-navegador.js` | lê os planos de governo no navegador, na aba do TSE (o TSE bloqueia robôs). Resultado: `planos.json` |
| `revisao-majoritarios.cjs` | monta a revisão dos 30 majoritários (planos + sites + mandato). Resultado: `revisao-bandeiras.json` |
| `01-inventario.cjs` | lista as fontes de cada deputado a partir do `index.html` |
| `02-sites-ler.cjs` | lê os sites declarados (página inicial + até 6 páginas de propostas) |
| `03a-sites-lista-renderizar.cjs` / `03b-sites-renderizar.cjs` | sites montados por JavaScript: renderiza com o Chrome em modo headless (perfil temporário) |
| `04-camara-senado.cjs` | baixa as proposições normativas pela API da Câmara e do Senado |
| `05a-alep-baixar.cjs` / `05b-alep-casar-autores.cjs` | baixa as proposições normativas pela API de Dados Abertos da ALEP e casa os autores com os candidatos |
| `06-classificar.cjs` | aplica as regras e gera `dep-bandeiras.json` (temas + fontes de cada candidato) |
| `aplicar-*.cjs` | aplicaram os resultados no `index.html` em 02/10/2026 (registro do que foi feito; cada um confere o trecho exato antes de alterar) |
| `tse-compara-situacao.cjs` | compara a situação das candidaturas no TSE com o guia |

Os dados brutos (textos dos sites, ementas da Câmara, Senado e ALEP) não ficam no repositório: são grandes e os textos dos sites pertencem aos candidatos. Os scripts geram tudo de novo a partir das fontes oficiais.

## Resultado de 02/10/2026

- 21 presidentes e governadores com bandeira tirada do plano de governo.
- 9 senadores: 6 com bandeira (site e/ou mandato), 3 sem fonte oficial.
- 995 deputados: 221 com bandeira (site e/ou mandato), 774 sem fonte oficial, exibidos como "sem proposta registrada em fonte oficial".
