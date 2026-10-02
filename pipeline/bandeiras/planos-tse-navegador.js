/* Planos de governo (presidente e governador) — leitura no NAVEGADOR, colando no console de
 * https://divulgacandcontas.tse.jus.br/divulga/ (o TSE bloqueia robôs; só funciona no próprio domínio).
 * 1) lista os candidatos; 2) no detalhe, arquivos com codTipo "5" = plano de governo;
 * 3) baixa o PDF em /divulga/rest/arquivo/doc/{idArquivo}; 4) extrai o texto com pdf.js;
 * 5) classifica com as regras de ../rules.js: tema entra com >= 2 termos distintos, sem limite.
 * Resultado usado no guia: planos.json (termos distintos e ocorrências por tema). */
(async () => {
  const pj = await import('https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.0.379/pdf.min.mjs');
  pj.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.0.379/pdf.worker.min.mjs';
  const RULES = /* cole aqui o conteúdo de ../rules.js como JSON (com 'sus' -> '\\bsus\\b') */ {};
  const norm = s => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/cnpj:? ?[\d./-]{8,}/g, ' ').replace(/\s+/g, ' ');
  const out = {};
  for (const [cargo, uf, cod] of [['pres', 'BR', 1], ['gov', 'PR', 3]]) {
    const lista = await (await fetch(`/divulga/rest/v1/candidatura/listar/2026/${uf}/20322002026/${cod}/candidatos`)).json();
    for (const c of (lista.candidatos || lista)) {
      const d = await (await fetch(`/divulga/rest/v1/candidatura/buscar/2026/${uf}/20322002026/candidato/${c.id}`)).json();
      const arqs = (d.arquivos || []).filter(a => a.codTipo === '5'); let text = '', p = 0;
      for (const a of arqs) {
        const buf = await (await fetch('/divulga/rest/arquivo/doc/' + a.idArquivo)).arrayBuffer();
        const doc = await pj.getDocument({ data: buf }).promise; p += doc.numPages;
        for (let i = 1; i <= doc.numPages; i++) text += (await (await doc.getPage(i)).getTextContent()).items.map(x => x.str).join(' ') + '\n';
      }
      const t = norm(text), cs = {};
      for (const k in RULES) { let n = 0, h = 0; for (const rx of RULES[k]) { const m = t.match(new RegExp(rx, 'g')); if (m) { n++; h += m.length; } } if (n >= 2) cs[k] = [n, h]; }
      out[cargo + ':' + c.nomeUrna] = { p, a: arqs.map(a => a.nome), c: cs };
    }
  }
  console.log(JSON.stringify(out));
})();
