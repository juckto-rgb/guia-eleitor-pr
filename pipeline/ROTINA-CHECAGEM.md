# Rotina de checagem de atualizações — Guia Eleitor PR

**Como usar:** é só me dizer **"checar updates"** (ou algo assim) numa sessão do Claude.
Eu rodo a checagem no TSE e te entrego um **relatório do que mudou** — você aprova antes de eu publicar. Nada vai ao ar automaticamente.

## Por que não roda sozinho num agendador
O TSE bloqueia acessos automáticos (WAF) — a consulta só funciona por um **navegador real**.
Por isso a rotina é **sob comando**: você dispara, eu executo pelo navegador em ~2 minutos.

## O que a checagem cobre
1. **TSE** (prioridade): renúncias, novos candidatos e mudanças de situação — comparando por candidato (não só por contagem), em todos os cargos (presidente, governador, senador, dep. federal e estadual).
2. **Fase 2** (quando você quiser): varrer os sites/redes oficiais dos candidatos **sem bandeira**, para sugerir causas — sempre como sugestão para você revisar, nunca automático.

## Scripts (pra referência técnica)
- `check-updates.cjs` — gera a consulta do TSE a partir do guia atual.
- `apply-changes.cjs` — aplica remoções/adições preservando todo o enriquecimento.

Detalhes completos estão nos comentários no topo de cada script.
