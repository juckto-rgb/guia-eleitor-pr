# Guia Eleitor PR — Candidatos das Eleições 2026 no Paraná

Ferramenta **gratuita, apartidária e não comercial** que reúne, em um só lugar, os dados oficiais dos candidatos às Eleições 2026 no Paraná — para o eleitor pesquisar, comparar e decidir com base em **fato com fonte**.

- **No ar:** https://guiaeleitorpr.sorttie.com.br
- **Reúso de dados abertos homologado:** [dados.gov.br/dados/reuso/212](https://dados.gov.br/dados/reuso/212) (concorrendo no 2º Concurso de Reúso de Dados)
- **Iniciativa:** [Sorttie](https://www.sorttie.com.br) — Marketing & Conteúdo

---

## O que é

Um guia do eleitor que mostra, para cada candidatura: situação no TSE, patrimônio declarado, histórico eleitoral, atuação no mandato (proposições, projetos de lei, emendas), votos da última eleição para quem está em mandato vigente, bandeiras/temas (só de fonte oficial: plano de governo, site declarado ao TSE ou mandato), cidade natal e redes declaradas. Inclui **"Minha Cola"** (lista pessoal para levar na hora de votar, salva só no aparelho), **mapa de origem** dos candidatos, **infográficos** demográficos e **acessibilidade** (leitor de áudio, alto contraste, texto ampliável, VLibras).

## Princípios (neutralidade)

1. **Nada inventado** — apenas dados oficiais (TSE, Câmara, Senado, ALEP, Portal da Transparência). Sem estimativa ou inferência sem fonte.
2. **Linguagem factual** — proibido adjetivo qualificador na descrição de candidato; só dado e termo técnico legislativo.
3. **Sem ranking, sem recomendação** — ordem dos candidatos é sorteada a cada acesso; o guia não indica voto.
4. **Não imita a Justiça Eleitoral** — identidade visual própria; deixa claro que é iniciativa independente.
5. **Zero coleta de dados do eleitor** — nada é enviado a servidor; a "Minha Cola" e o local de votação ficam só no navegador.

## Fontes de dados (oficiais e abertas)

| Fonte | Uso |
|---|---|
| **TSE** — Divulgação de Candidaturas | candidaturas, situação, patrimônio, histórico, redes, foto, **planos de governo** (presidente e governador) |
| **Sites declarados ao TSE** pelos candidatos | propostas usadas nas bandeiras (só o site que cita o nome do candidato) |
| **TSE** — Resultados de eleições | votos (2018/2022/2024) de quem está em mandato vigente |
| **Câmara dos Deputados** — Dados Abertos | proposições e projetos de lei do mandato atual |
| **Senado Federal** — Dados Abertos | atuação de senadores |
| **ALEP** — API de Dados Abertos (`webservices.assembleia.pr.leg.br/api/public`) | proposições de deputados estaduais (atuação e bandeiras) |
| **Portal da Transparência / CGU** | emendas parlamentares (valor pago) |
| **TSE** — Resultados 2026 (`resultados.tse.jus.br`) | resultado oficial do 1º turno: votos, situação (eleito, 2º turno) e votos de cada eleito por município |
| **IBGE** — API de malhas v3 | contorno dos 399 municípios do PR (mapa "Onde os eleitos tiveram votos") |
| **IBGE / TSE** | códigos de UF e municípios |

## Arquitetura

- **Página única, autossuficiente** (`index.html`, ~1,7 MB): HTML + CSS inline + JavaScript vanilla, **sem build e sem back-end**. Deploy é só publicar o arquivo.
- Dados embutidos como variáveis JS; cards gerados em runtime; fotos carregadas por link do TSE (lazy).
- Segurança: CSP via `<meta>`; hospedagem no Vercel (HSTS).
- **Acessibilidade:** auditada com Google Lighthouse — mobile **Acessibilidade 97 · Boas Práticas 100 · SEO 100** (ver `auditoria/`).
- **Encontrabilidade (SEO):** dados estruturados JSON-LD (`WebApplication` + `Dataset`), `sitemap.xml` e `robots.txt`; propriedade verificada no Google Search Console.

## Bandeiras (temas): como são definidas

Só entram temas encontrados em **fonte oficial**. Nada é deduzido de profissão, nome de urna, partido ou rede social. Cada ficha mostra de qual fonte veio o tema, com link.

| Cargo | Fonte | Regra |
|---|---|---|
| Presidente e governador | Plano de governo registrado no TSE (obrigatório para cargo executivo) | tema com **2 ou mais termos diferentes** no plano, sem limite de quantidade |
| Senador e deputado | Página de propostas do site declarado ao TSE | tema com 2 ou mais termos diferentes; o site precisa citar o nome do candidato |
| Senador e deputado com mandato | Proposições normativas (PL, PLP, PEC, PDL) na Câmara, no Senado ou na ALEP | tema com **2 ou mais proposições**; projetos **cerimoniais** (utilidade pública, título honorário, nome de rua, data comemorativa) **não contam** |

Os termos de cada tema estão em [`pipeline/rules.js`](pipeline/rules.js). Quem não tem nenhuma dessas fontes aparece como **"sem proposta registrada em fonte oficial"**. As bandeiras são exibidas em ordem alfabética. Scripts e resultados em [`pipeline/bandeiras/`](pipeline/bandeiras/).

## Como rodar localmente

Por ser um arquivo único, basta um servidor estático (o navegador bloqueia alguns recursos via `file://`):

```bash
npx serve .        # ou: python -m http.server 8000
# abra http://localhost:8000/index.html
```

## Como os dados são atualizados (pipeline)

Os scripts ficam em [`pipeline/`](pipeline/) e são documentados em [`pipeline/README.md`](pipeline/README.md) e [`pipeline/ROTINA-CHECAGEM.md`](pipeline/ROTINA-CHECAGEM.md). Resumo:

| Script | Função |
|---|---|
| `check-updates.cjs` | gera a sondagem do TSE (o que entrou/saiu/mudou de situação) |
| `apply-changes.cjs` | aplica adições/remoções preservando o enriquecimento (re-key por perfil) |
| `camara.cjs` | recomputa proposições e projetos de lei (Câmara, legislatura atual) |
| `emendas.cjs` | recomputa emendas a partir do arquivo oficial do Portal da Transparência |
| `votos.cjs` / `inject-votos.cjs` | votos do mandato vigente (resultados oficiais do TSE) |
| `refresh-map.cjs` | recalcula o mapa de origem dos candidatos |
| `build-demo.cjs` | monta os infográficos demográficos |
| `resultados-2026.cjs` / `inject-resultados-2026.cjs` | resultado oficial do 1º turno (TSE): "Quem ganhou", selos e perfil dos eleitos; só mostra eleito quando o TSE informa a situação |
| `votos-municipio-2026.cjs` / `inject-votos-mun-2026.cjs` | votos de cada eleito por município (arquivos do TSE por município, com o % publicado pelo TSE); confere que a soma bate com o total estadual |
| `geo-pr-municipios.cjs` | contorno dos municípios do PR (IBGE) para o mapa de votos |
| `bandeiras/` | bandeiras por fonte oficial: planos do TSE, sites declarados, Câmara, Senado e ALEP (ver o README da pasta) |

**Nota importante:** o portal do TSE (`divulgacandcontas.tse.jus.br`) bloqueia robôs (WAF); as consultas de candidatura rodam por **XHR no navegador**, no próprio domínio do TSE. Câmara, Senado, ALEP e Portal da Transparência têm APIs/arquivos abertos acessíveis diretamente. As fontes brutas usadas ficam em [`pipeline/fontes/`](pipeline/fontes/) (ver o `LEIA-ME-fontes.txt`).

## Auditoria

A pasta [`auditoria/`](auditoria/) traz os relatórios oficiais do **Google Lighthouse** (mobile e desktop, antes e depois das melhorias de acessibilidade), como evidência de qualidade e replicabilidade.

## Pesquisa com usuários (usabilidade)

A pasta [`pesquisa/`](pesquisa/) traz o kit de teste **moderado**: `teste-usabilidade.html` (roteiro de 8 tarefas, questionário validado **UEQ** de 26 itens, termo de consentimento LGPD, ficha de coleta). A aplicação online do teste é um projeto à parte, fora deste repositório. O resultado técnico agregado (método, sucesso por tarefa, SEQ, UEQ e as mudanças feitas) está em [`pesquisa/RESULTADO-TESTE-2026-10.md`](pesquisa/RESULTADO-TESTE-2026-10.md).

## Estrutura do repositório

```
index.html            # o guia (app completo)
sitemap.xml, robots.txt
favicon.png, og-image.png
LEIA-ME.txt           # nota rápida de publicação (Vercel)
pipeline/             # scripts de coleta/atualização + dados intermediários + docs
  README.md, ROTINA-CHECAGEM.md
  fontes/             # dados brutos das fontes oficiais (+ LEIA-ME-fontes.txt)
  bandeiras/          # bandeiras por fonte oficial (scripts + resultados)
auditoria/            # relatórios Lighthouse (evidência)
pesquisa/             # kit de teste de usabilidade (moderado)
```

## Publicação (deploy)

Publique **todos os arquivos estáticos juntos** (`index.html`, `og-image.png`, `favicon.png`, `robots.txt`, `sitemap.xml`): no Vercel, o deploy por arrastar substitui o projeto inteiro, então arrastar só o `index.html` derruba os demais. Após publicar, force o recarregamento (Ctrl+Shift+R) para furar o cache.

## Licença

Código-fonte sob **[licença MIT](LICENSE)** — livre para reusar e adaptar, com atribuição. O **nome "Guia Eleitor PR", a marca Sorttie e a linha editorial não são licenciados** (ver [`NOTICE.md`](NOTICE.md)). Os **dados** são públicos e oficiais das fontes citadas. O código é aberto justamente para tornar o método **auditável** — reforçando a imparcialidade do projeto.

## Créditos

Desenvolvido pela **Sorttie** como contribuição cívica não comercial. Sem vínculo com candidatos, partidos ou com a Justiça Eleitoral.
