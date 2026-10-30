/*
 * Gera docs/VALIDACAO.md a partir das simulações, para que as tabelas do
 * relatório saiam diretamente do código validado.
 *   node tools/validation-report.js
 */
'use strict';
const fs = require('node:fs');
const path = require('node:path');

const root = path.join(__dirname, '..', 'js');
['core/complex', 'core/network', 'core/shortcircuit', 'core/protection', 'core/selfhealing', 'core/simulator',
  'data/aquiraz_tcc2015', 'data/aquiraz_nobre2013', 'data/lab_tests'].forEach((f) => require(path.join(root, `${f}.js`)));
const SH = globalThis.SH;
const N = SH.network;
const SC = SH.shortcircuit;

const nf = (v, d = 1) => (v == null || !isFinite(v) ? '-' : v.toLocaleString('pt-BR', { minimumFractionDigits: d, maximumFractionDigits: d }));
const out = [];
const p = (s = '') => out.push(s);

p('# Validação do simulador');
p();
p('Documento gerado automaticamente por `node tools/validation-report.js` a partir do código do simulador.');
p('Os mesmos casos são verificados pela suíte `npm test` (`tests/validation.test.js`).');
p();

// ---------------------------------------------------------------- Tab 4.7
const tcc = N.buildModel(SH.scenarios.tcc2015);
p('## 1. Curto-circuito: Tabela 4.7 do TCC (Rodrigues, 2015)');
p();
p('Barras da configuração de alcance máximo de cada alimentador (Fig. 4.6), alimentadas pela SE AQZ. Correntes em A.');
p();
p('| Alimentador | Barra | Icc3F sim. | Icc3F TCC | Icc2F sim. | Icc2F TCC | IccFT sim. | IccFT TCC | IccFTm sim. | IccFTm TCC | Maior erro |');
p('|---|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|');
let worst47 = 0;
SH.scenarios.tcc2015.validation.tab47.forEach((v) => {
  const r = SC.pathFault(tcc, 'AQZ', v.path);
  const sim = [r.i3f, r.i2f, r.ift, r.iftm];
  const errs = sim.map((x, i) => Math.abs((x - v.tcc[4 + i]) / v.tcc[4 + i]) * 100);
  const e = Math.max(...errs);
  worst47 = Math.max(worst47, e);
  p(`| ${v.feeder} | ${v.bus} | ${sim.map((x, i) => `${nf(x)} | ${nf(v.tcc[4 + i])}`).join(' | ')} | ${nf(e, 3)}% |`);
});
p();
p(`Maior erro relativo: **${nf(worst47, 3)}%** (arredondamento das impedâncias publicadas).`);
p();

// ---------------------------------------------------------------- Tab 3.6 Nobre
const nob = N.buildModel(SH.scenarios.nobre2013);
p('## 2. Curto-circuito: Tabela 3.6 de Nobre (2013), primeira topologia');
p();
p('| Trecho | Fonte | Icc3F sim. | Icc3F ref. | Icc2F sim. | Icc2F ref. | IccFT sim. | IccFT ref. | IccFTm sim. | IccFTm ref. | Maior erro |');
p('|---|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|');
let worst36 = 0;
SH.scenarios.nobre2013.validation.tab36.forEach((v) => {
  const r = SC.pathFault(nob, v.source, v.path);
  const sim = [r.i3f, r.i2f, r.ift, r.iftm];
  const e = Math.max(...sim.map((x, i) => Math.abs((x - v.tcc[4 + i]) / v.tcc[4 + i]) * 100));
  worst36 = Math.max(worst36, e);
  p(`| ${v.seg} | ${v.source} | ${sim.map((x, i) => `${nf(x, 2)} | ${nf(v.tcc[4 + i], 2)}`).join(' | ')} | ${nf(e, 4)}% |`);
});
p();
p(`Maior erro relativo: **${nf(worst36, 4)}%**.`);
p();

// ---------------------------------------------------------------- Recomposição
// manobras do SRA como "Verbo DISPOSITIVO" (dispositivo lido do evento, não do texto)
const sraActs = (res, model = tcc) => res.log.filter((e) => e.cat === 'sra' && e.dev && /^(Abrir|Fechar|Religar)/.test(e.text))
  .map((e) => `${e.text.split(' ')[0]} ${model.switches[e.dev].label || e.dev}`);
p('## 3. Recomposição automática: Tabela 4.2 de Nobre (2013)');
p();
p('Falta trifásica permanente no meio de cada trecho, configuração normal, esquema convencional, self-healing ligado.');
p();
p('| Falta | Bloqueio (proteção) | Manobras do SRA (simulador) | Esperado (Nobre, Tab. 4.2) | Confere |');
p('|---|---|---|---|:---:|');
SH.scenarios.nobre2013.validation.tab42.forEach((v) => {
  const seg = nob.segments[v.fault] ? v.fault : `${v.fault}a`;
  const res = SH.simulator.run(nob, { script: [{ t: 0, type: 'fault', spec: { kind: 'segment', seg, x: 0.5, type: '3F' } }] });
  const blk = res.log.filter((e) => e.cat === 'bloqueio').map((e) => nob.switches[e.dev].label || e.dev).join(', ');
  const acts = sraActs(res, nob);
  const opened = acts.filter((a) => a.startsWith('Abrir')).map((a) => a.slice(6));
  const closed = acts.filter((a) => a.startsWith('Fechar')).map((a) => a.slice(7));
  const reclosed = acts.filter((a) => a.startsWith('Religar')).map((a) => a.slice(8));
  const okOpen = JSON.stringify(opened.slice().sort()) === JSON.stringify(v.open.slice().sort());
  const okClose = JSON.stringify(closed.slice().sort()) === JSON.stringify(v.close.slice().sort());
  const exp = v.open.length || v.close.length ? `abre ${v.open.join(', ') || '-'}; fecha ${v.close.join(', ') || '-'}` : 'nenhuma';
  const sim = acts.length ? acts.join('; ') : 'nenhuma';
  p(`| ${v.fault} | ${blk} | ${sim} | ${exp} | ${okOpen && okClose ? 'sim' : 'não'}${reclosed.length ? '¹' : ''} |`);
});
p();
p('¹ Com os ajustes de Nobre (instantâneos sem atraso intencional), uma falta no meio de T8 (3,3 kA) supera o pickup instantâneo de 21I5 (2,5 kA) e de RS3 (1,72 kA): os dois abrem. O SRA isola a falta e religa 21I5, manobra que não aparece na Tab. 4.2 porque aquela tabela supõe atuação seletiva.');
p();

p('## 4. Recomposição na rede atual (TCC, Fig. 4.2)');
p();
p('| Caso | Manobras do SRA | Carga sem suprimento ao final | Observação |');
p('|---|---|---:|---|');
const tccCases = [
  ['Falta em T1 (Fig. 4.3)', { script: [{ t: 0, type: 'fault', spec: { kind: 'segment', seg: 'T1', x: 0.5, type: '3F' } }] }, 'reproduz a Fig. 4.3 do TCC'],
  ['Falta em T5', { script: [{ t: 0, type: 'fault', spec: { kind: 'segment', seg: 'T5', x: 0.5, type: '3F' } }] }, ''],
  ['Falta em T8', { script: [{ t: 0, type: 'fault', spec: { kind: 'segment', seg: 'T8', x: 0.5, type: '3F' } }] }, ''],
  ['Falta em T12', { script: [{ t: 0, type: 'fault', spec: { kind: 'segment', seg: 'T12', x: 0.5, type: '3F' } }] }, 'T13+T14 levaria T16 a 454 A > 438 A: só T14 é recomposto'],
  ['Falta em T16', { script: [{ t: 0, type: 'fault', spec: { kind: 'segment', seg: 'T16', x: 0.5, type: '3F' } }] }, ''],
  ['Perda da SE ESB', { script: [{ t: 0, type: 'sourceLoss', source: 'ESB' }] }, ''],
  ['Falta no barramento 13,8 kV da SE AQZ', { script: [{ t: 0, type: 'fault', spec: { kind: 'bus', node: 'AQZ', type: '3F' } }] }, 'coerente com Vieira (2015): parte de 21I4 não cabe na SE AGF'],
];
tccCases.forEach(([name, input, obs]) => {
  const res = SH.simulator.run(tcc, input);
  const acts = sraActs(res);
  const last = res.snaps[res.snaps.length - 1];
  p(`| ${name} | ${acts.join('; ') || 'nenhuma'} | ${nf(last.unserved, 0)} A | ${obs} |`);
});
p();

// ---------------------------------------------------------------- Ensaios
p('## 5. Ensaios do Capítulo 5 do TCC');
p();
p('Ajustes da Tab. 4.13 (alimentador 21I5), disjuntor com 50 ms de interrupção e GOOSE com 3 ms. Os valores do TCC são os medidos com a mala de testes CE-6006, que incluem o processamento interno dos relés e o tempo de abertura simulado pela mala; por isso os totais simulados ficam algumas dezenas de milissegundos abaixo.');
p();
p('| Ensaio | Medida | TCC | Simulador |');
p('|---|---|---|---:|');
SH.labs.tests.forEach((t) => {
  const res = SH.simulator.run(tcc, SH.labs.buildInput(tcc, t));
  t.measures.forEach((m, i) => {
    const v = SH.labs.measure(res, m);
    const txt = typeof v === 'number' ? (m.unit === 'ms' ? `${nf(v, 1)} ms` : nf(v, 0)) : String(v);
    p(`| ${i === 0 ? `${t.ref.split(',')[0]}: ${t.title}` : ''} | ${m.label} | ${m.tcc} | ${txt} |`);
  });
});
p();
p('Leitura qualitativa: os três comportamentos relatados no TCC aparecem na simulação. (i) Com seletividade lógica e 50BF, a retaguarda atua cerca de 200 ms após o trip do relé a jusante; (ii) sem 50BF, a retaguarda espera a própria curva (NI ou MI); (iii) sem seletividade lógica, os dois instantâneos atuam juntos. No par RL1/RL2 a curva 51 de RS4 vence o 50BF por menos de 1 ms (232,2 ms contra 233 ms), o problema relatado na seção 5.7.3, e a solução com bloqueio do 51 e retaguarda de +200 ms o corrige.');
p();
fs.writeFileSync(path.join(__dirname, '..', 'docs', 'VALIDACAO.md'), `${out.join('\n')}\n`);
console.log(`docs/VALIDACAO.md gerado (${out.length} linhas).`);
