# Pipeline de Bandeiras — Guia do Eleitor · PR 2026

Runbook para **reprocessar as bandeiras (causas) dos candidatos** quando os dados
maturarem (ex.: setembro/2026, com sites/planos publicados e candidaturas deferidas).

App: https://guiaeleitorpr.netlify.app · Fonte: `index.html` (na pasta acima) ·
Iniciativa **não comercial** da Sorttie.

---

## Princípio inegociável: NADA INVENTADO

Toda bandeira tem que ter **fonte**. A ordem de qualidade das fontes:

1. **Site oficial do candidato** (conteúdo lido) — melhor.
2. **Plano de governo registrado no TSE** (só majoritárias; ver gotcha do WAF).
3. **Ocupação declarada** (proxy: médico→saúde) — automático, via `OCC2CAUSA`.
4. **Bio de rede social** — quase sempre slogan, **rende pouquíssimo** (ver nota).

Se nenhuma fonte diz a causa, o candidato fica **sem bandeira** — e o app mostra a
nota "Bandeiras não identificadas…". **Não force** (advogado/aposentado/"outros"
não indicam causa).

---

## Pré-requisitos

```bash
# Node 18+ ; e, para renderizar sites em JS (SPA), o Playwright:
npm install playwright
npx playwright install chromium
```

Tudo roda com `node <script>.js` DENTRO desta pasta `pipeline/`.
Os scripts trabalham num arquivo chamado **`guia-eleitor-pr.html`** nesta pasta.
Como a cópia oficial se chama `index.html` (um nível acima), a ponte é simples —
**copie antes de começar e devolva no fim:**

```bash
cp "../index.html" guia-eleitor-pr.html     # traz a versão atual pra cá
#   ... roda os passos do fluxo abaixo ...
cp guia-eleitor-pr.html "../index.html"     # devolve pronta pra publicar
```

---

## Fluxo de reprocessamento (na ordem)

### 0. Baixar os dados novos do TSE
- Bulk CSV (nome/número/partido/situação/ocupação): `consulta_cand_2026.zip` de
  `https://cdn.tse.jus.br/estatistica/sead/odsele/consulta_cand/` → usar
  `consulta_cand_2026_PR.csv` (deputados/senadores) e `..._BRASIL.csv` (presidente).
  - **latin1, separador `;`, aspas MISTAS** → `split(';')` + strip aspas por campo.
- Detalhe (foto/redes/bens/histórico) vem da API, não do CSV.

### 1. `build-deps.js` → atualiza `var DEPS` no index.html
Extrai os ~1.029 deputados/senadores do CSV. Ordem: senador, federal, estadual.

### 2. `fetch-all-detail.js` → gera `dep-detail.json` e embute `var DEP_DETAIL`
Puxa histórico eleitoral, patrimônio, redes, naturalidade e situação de TODOS via
API. Sem isso, o perfil do deputado abre vazio. (Foto carrega por LINK, não precisa.)

### 3. `scan-dep-sites.js` → `dep-sites.json`
Varre `sites[]` de todos e filtra **site real** (descarta rede social/linktree/etc).
Baseline desta rodada: **299 com site real**.

### 4. `fetch-all-sites.js` → `dep-texts.json`
Fetch HTTP simples do texto dos sites. **Só lê ~20%** (o resto é SPA em JS).

### 5. `fetch-headless.js` → `headless-texts.json`  ⭐ o pulo do gato
Renderiza em Chromium os sites que o fetch simples não leu (SPA). Baseline:
recuperou **107 de 228**. **Depende do Playwright instalado.**

### 6. (opcional) `diag-failed.js` → `recovered-texts.json`
Tenta gzip/brotli nos que ainda falharam (recupera poucos).

### 7. `reclassify2.js` (+ `rules.js`) → `reclassified2.json` e reescreve `SITE_CAUSAS`
Classificador por palavra-chave. **Regra: ≥2 sinais distintos** por bandeira
(evita falso positivo de menu). **PRESERVA os revisados à mão** (entries sem
`auto:1` e as de rede social). Mostra o diff antes/depois.

### 8. `check-evidence.js` / `audit-bandeiras.js` → AUDITORIA (obrigatória)
Mostra qual palavra disparou cada bandeira e flag as suspeitas (só evidência
ambígua). **Revise antes de publicar.** Foi assim que achamos os falsos positivos
`digital`→inovação e `inclusiva`→inclusão.

### 9. Manual: majoritárias e casos flagrados
Presidente/governador/senador e qualquer caso que o cliente apontar: **ler o site
à mão** e setar em `SITE_CAUSAS` **sem** `auto:1` (vira "Inferidas do conteúdo do
site oficial", e o reprocessamento não sobrescreve).

### 10. Verificar local e publicar
- `node serve.js` sobe em :8899. (No ambiente de dev use `preview_start`, pois
  localhost é bloqueado no navegador embutido; o `serve.js` precisa de caminho
  ABSOLUTO pro html.)
- Confira: perfis com histórico, fotos ao trocar de aba, notas de fonte, caixa.
- Publicar = **arrastar o `index.html` na aba Deploys** do Netlify (site
  `guiaeleitorpr`). Deploy manual; não há CI.

---

## Baseline desta rodada (ago/2026) — ponto de partida

- **150 classificados por conteúdo** (site/rede/mão) + ocupação para os demais.
- **~379 sem bandeira** (irredutível): advogado (90), "outros" (103), vereador
  (41), deputado (28), aposentado, servidor — ocupação não indica causa.
- Distribuição: educação 60, saúde 50, economia 40, segurança 35, agro 29…

---

## Gotchas que custam tempo (não redescobrir)

- **PowerShell 5.1 `ConvertFrom-Json` QUEBRA** nos dados do TSE (chaves duplicadas
  case-insensitive, ex. `DT_`/`dt_` em `vices`). Use **node** (`https`+`JSON.parse`).
- **Plano de governo do TSE é fonte de ouro (majoritárias) mas BLOQUEADO:** a API
  `arquivos[]` lista o PDF (`...PlanodeGoverno...pdf`, codTipo 5), mas o download dá
  **403 (WAF)** em todas as URLs testadas. Não craqueado. Se conseguir a URL real
  (capturar no app divulga), é a melhor fonte pras majoritárias.
- **Site DECLARADO ≠ site real:** muitos são parqueados/mortos/agregadores. Checar
  TODOS os `sites[]`, não só o primeiro (ex.: Moro, Caiado, Lula tinham o real
  escondido no meio de linktrees).
- **SPA precisa de headless.** Fetch simples lê só ~20% dos sites.
- **Rede social NÃO resolve o branco.** Bio de IG fica no meta `description`
  (não no og:description, que é genérico "X seguidores"), mas é slogan ("gente que
  cuida da gente"), não pauta. IG/FB/X nos ~350 blanks rendeu ~0. Baixar pra 1
  sinal só gera falso positivo. **Fonte seca — provado 2×.**
- **Fotos "somem" em aba não-ativa:** seção fica `display:none` e imagem `lazy` não
  carrega. Fix já no app: ao mostrar a seção, `img.loading='eager'`.
- **Caixa:** dado do TSE vem TUDO MAIÚSCULO. Helpers `titc()`/`natFmt()` no app
  padronizam ocupação/formação/cidade-natal/histórico/bens/nome/situação.

---

## Arquivos

| Script | Faz |
|---|---|
| build-deps.js | CSV → `var DEPS` |
| fetch-profiles.js | detalhe das majoritárias |
| fetch-all-detail.js | detalhe dos 1.029 → `DEP_DETAIL` |
| scan-dep-sites.js | acha sites reais → dep-sites.json |
| fetch-all-sites.js | texto via fetch simples → dep-texts.json |
| fetch-headless.js | texto via Chromium (SPA) → headless-texts.json |
| diag-failed.js | recupera via gzip/br |
| rules.js | dicionário palavra→bandeira |
| reclassify2.js | classifica (≥2 sinais), preserva mão |
| check-evidence.js / audit-bandeiras.js | auditoria de qualidade |
| harvest-ig.js | bio de rede (baixo rendimento; referência) |
| serve.js | servidor estático local :8899 |
| strip-sample-cards.js | troca cards de exemplo por grids vazios |

> Gerado com apoio do Claude Code, ago/2026.
