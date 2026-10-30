/*
 * Gera uma versão do simulador em arquivo HTML único (CSS e JS embutidos),
 * útil para enviar por e-mail ou abrir sem servidor.
 *
 *   node tools/build-standalone.js                 -> dist/aquiraz-self-healing.html
 *   node tools/build-standalone.js --fragment out  -> só o conteúdo (sem <html>/<head>/<body>)
 */
'use strict';
const fs = require('node:fs');
const path = require('node:path');

const root = path.join(__dirname, '..');
const args = process.argv.slice(2);
const fragIdx = args.indexOf('--fragment');
const fragment = fragIdx >= 0;
const outFile = fragment ? path.resolve(args[fragIdx + 1]) : path.join(root, 'dist', 'aquiraz-self-healing.html');

let html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const css = fs.readFileSync(path.join(root, 'css', 'style.css'), 'utf8');
html = html.replace('<link rel="stylesheet" href="css/style.css">', () => `<style>\n${css}\n</style>`);
html = html.replace(/<script src="(js\/[^"]+)"><\/script>/g, (m, src) => {
  const code = fs.readFileSync(path.join(root, src), 'utf8').replace(/<\/script/gi, '<\\/script');
  return `<script>\n/* ${src} */\n${code}\n</script>`;
});

if (fragment) {
  const head = html.match(/<head>([\s\S]*?)<\/head>/)[1]
    .replace(/<meta charset[^>]*>\s*/i, '')
    .replace(/<meta name="viewport"[^>]*>\s*/i, '');
  const body = html.match(/<body>([\s\S]*?)<\/body>/)[1];
  html = `${head.trim()}\n${body.trim()}\n`;
}
fs.mkdirSync(path.dirname(outFile), { recursive: true });
fs.writeFileSync(outFile, html);
console.log(`${path.relative(root, outFile) || outFile}: ${(html.length / 1024).toFixed(0)} KiB`);
