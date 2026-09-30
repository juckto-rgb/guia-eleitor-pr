# Guia Eleitor PR — Candidatos das Eleições 2026 no Paraná

Ferramenta **gratuita, apartidária e não comercial** que reúne, em um só lugar, os dados oficiais dos candidatos às Eleições 2026 no Paraná — para o eleitor pesquisar, comparar e decidir com base em **fato com fonte**.

- **No ar:** https://guiaeleitorpr.sorttie.com.br
- **Reúso de dados abertos homologado:** [dados.gov.br/dados/reuso/212](https://dados.gov.br/dados/reuso/212) (concorrendo no 2º Concurso de Reúso de Dados)
- **Iniciativa:** [Sorttie](https://www.sorttie.com.br) — Marketing & Conteúdo

---

## O que é

Um guia do eleitor que mostra, para cada candidatura: situação no TSE, patrimônio declarado, histórico eleitoral, atuação no mandato (proposições, projetos de lei, emendas), votos da última eleição para quem está em mandato vigente, bandeiras/causas (das propostas registradas), cidade natal e redes declaradas. Inclui **"Minha Cola"** (lista pessoal para levar na hora de votar, salva só no aparelho), **mapa de origem** dos candidatos, **infográficos** demográficos e **acessibilidade** (leitor de áudio, alto contraste, texto ampliável, VLibras).

## Princípios (neutralidade)

1. **Nada inventado** — apenas dados oficiais (TSE, Câmara, Senado, ALEP, Portal da Transparência). Sem estimativa ou inferência sem fonte.
2. **Linguagem factual** — proibido adjetivo qualificador na descrição de candidato; só dado e termo técnico legislativo.
3. **Sem ranking, sem recomendação** — ordem dos candidatos é sorteada a cada acesso; o guia não indica voto.
4. **Não imita a Justiça Eleitoral** — identidade visual própria; deixa claro que é iniciativa independente.
5. **Zero coleta de dados do eleitor** — nada é enviado a servidor; a "Minha Cola" e o local de votação ficam só no navegador.

## Fontes de dados (oficiais e abertas)

| Fonte | Uso |
|---|---|
| **TSE** — Divulgação de Candidaturas | candidaturas, situação, patrimônio, histórico, redes, foto |
| **TSE** — Resultados de eleições | votos (2018/2022/2024) de quem está em mandato vigente |
| **Câmara dos Deputados** — Dados Abertos | proposições e projetos de lei do mandato atual |
| **Senado Federal** — Dados Abertos | atuação de senadores |
| **ALEP** — Assembleia Legislativa do PR | atuação de deputados estaduais |
| **Portal da Transparência / CGU** | emendas parlamentares (valor pago) |
| **IBGE / TSE** | códigos de UF e municípios |

## Arquitetura

- **Página única, autossuficiente** (`index.html`, ~1,6 MB): HTML + CSS inline + JavaScript vanilla, **sem build e sem back-end**. Deploy é só publicar o arquivo.
- Dados embutidos como variáveis JS; cards gerados em runtime; fotos carregadas por link do TSE (lazy).
- Segurança: CSP via `<meta>`; hospedagem no Vercel (HSTS).
- **Acessibilidade:** auditada com Google Lighthouse — mobile **Acessibilidade 97 · Boas Práticas 100 · SEO 100** (ver `auditoria/`).

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

**Nota importante:** o portal do TSE (`divulgacandcontas.tse.jus.br`) bloqueia robôs (WAF); as consultas de candidatura rodam por **XHR no navegador**, no próprio domínio do TSE. Câmara, Senado, ALEP e Portal da Transparência têm APIs/arquivos abertos acessíveis diretamente. As fontes brutas usadas ficam em [`pipeline/fontes/`](pipeline/fontes/) (ver o `LEIA-ME-fontes.txt`).

## Auditoria

A pasta [`auditoria/`](auditoria/) traz os relatórios oficiais do **Google Lighthouse** (mobile e desktop, antes e depois das melhorias de acessibilidade), como evidência de qualidade e replicabilidade.

## Estrutura do repositório

```
index.html            # o guia (app completo)
favicon.png, og-image.png
LEIA-ME.txt           # nota rápida de publicação (Vercel)
pipeline/             # scripts de coleta/atualização + dados intermediários + docs
  README.md, ROTINA-CHECAGEM.md
  fontes/             # dados brutos das fontes oficiais (+ LEIA-ME-fontes.txt)
auditoria/            # relatórios Lighthouse (evidência)
```

## Publicação (deploy)

Arraste o `index.html` no projeto do Vercel (fluxo manual). Após publicar, force o recarregamento (Ctrl+Shift+R) para furar o cache.

## Licença

Código-fonte sob **[licença MIT](LICENSE)** — livre para reusar e adaptar, com atribuição. O **nome "Guia Eleitor PR", a marca Sorttie e a linha editorial não são licenciados** (ver [`NOTICE.md`](NOTICE.md)). Os **dados** são públicos e oficiais das fontes citadas. O código é aberto justamente para tornar o método **auditável** — reforçando a imparcialidade do projeto.

## Créditos

Desenvolvido pela **Sorttie** como contribuição cívica não comercial. Sem vínculo com candidatos, partidos ou com a Justiça Eleitoral.
