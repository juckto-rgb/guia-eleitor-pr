// Renderiza (executa o JavaScript) os sites que o robô simples não leu: Chrome headless com perfil TEMPORÁRIO próprio.
// Junta o texto em dep-sites-texto2.json (substitui a leitura anterior só se a renderizada tiver mais texto).
const fs = require('fs'), { execFile } = require('child_process'); const S = __dirname + '/';
const CHROME = process.env.CHROME || 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const L = JSON.parse(fs.readFileSync(S + 'render-lista.json', 'utf8'));
const src = fs.readFileSync(S + '02-sites-ler.cjs', 'utf8'); eval(src.match(/const ENT[\s\S]*?const strip = [^\n]*\n/)[0].replace(/const /g, 'var '));
const TXT = S + 'dep-sites-texto2.json'; const out = JSON.parse(fs.readFileSync(TXT, 'utf8'));
const dump = (url, k) => new Promise(res => execFile(CHROME, ['--headless=new', '--disable-gpu', '--no-first-run', '--mute-audio', '--user-data-dir=' + process.env.TEMP + '\\chrome-headless-guia-' + k, '--virtual-time-budget=9000', '--timeout=25000', '--dump-dom', url],
  { timeout: 45000, maxBuffer: 30e6, windowsHide: true }, (e, so) => res(e && !so ? '' : (so || ''))));
(async () => {
  let melhorou = 0; const CONC = 3;
  for (let i = 0; i < L.length; i += CONC) {
    await Promise.all(L.slice(i, i + CONC).map(async ([pi, nome, url], j) => {
      const html = await dump(url, j); const text = strip(html);
      const antes = out[pi] && out[pi].pages ? out[pi].pages.reduce((a, p) => a + p.text.length, 0) : 0;
      if (text.length > Math.max(300, antes)) { out[pi] = { dom: url.replace(/^https?:\/\//, ''), pages: [{ url, text: text.slice(0, 80000) }], render: 1 }; melhorou++; }
      console.log(pi, nome, url, 'texto', text.length, 'antes', antes);
    }));
    fs.writeFileSync(TXT, JSON.stringify(out));
  }
  console.log('FIM; sites com texto melhor:', melhorou);
})();
