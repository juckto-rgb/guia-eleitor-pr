// Contorno dos 399 municípios do PR para o mapa "Onde os eleitos tiveram votos".
// Fonte: IBGE, API de malhas v3 (servicodados.ibge.gov.br), qualidade mínima. Saída: pipeline/_pr-mun-svg.json (paths SVG por código IBGE).
const fs = require('fs');
const path = require('path');
(async () => {
  const u = 'https://servicodados.ibge.gov.br/api/v3/malhas/estados/41?intrarregiao=municipio&qualidade=minima&formato=application/vnd.geo+json';
  const g = await (await fetch(u, { headers: { Accept: 'application/vnd.geo+json' } })).json();
  let x0 = 1e9, x1 = -1e9, y0 = 1e9, y1 = -1e9;
  const rings = f => (f.geometry.type === 'Polygon' ? [f.geometry.coordinates] : f.geometry.coordinates).flat();
  g.features.forEach(f => rings(f).forEach(r => r.forEach(([lo, la]) => { x0 = Math.min(x0, lo); x1 = Math.max(x1, lo); y0 = Math.min(y0, la); y1 = Math.max(y1, la); })));
  const k = Math.cos(((y0 + y1) / 2) * Math.PI / 180), W = 1000, s = W / ((x1 - x0) * k), H = Math.ceil((y1 - y0) * s);
  const P = ([lo, la]) => [Math.round((lo - x0) * k * s), Math.round((y1 - la) * s)];
  const d = {};
  g.features.forEach(f => {
    d[f.properties.codarea] = rings(f).map(r => { const pts = r.map(P).filter((p, i, a) => !i || p[0] !== a[i - 1][0] || p[1] !== a[i - 1][1]); return 'M' + pts.map(p => p.join(' ')).join('L') + 'Z'; }).join('');
  });
  fs.writeFileSync(path.join(__dirname, '_pr-mun-svg.json'), JSON.stringify({ fonte: 'IBGE · malha municipal (API de malhas v3)', vb: '0 0 ' + W + ' ' + H, d }));
  console.log('municípios:', Object.keys(d).length, '· viewBox 0 0', W, H, '· bytes', JSON.stringify(d).length);
})().catch(e => { console.error('ERRO', e.message); process.exit(1); });
